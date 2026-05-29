<?php

namespace App\Services;

use App\Models\TreasuryTransfer;
use App\Models\CashAccount;
use App\Models\BankAccount;
use App\Models\Accounting\JournalEntry;
use App\Models\Accounting\JournalEntryLine;
use App\Repositories\TreasuryTransferRepository;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;
use Exception;

class TreasuryTransferService extends BaseService
{
    protected $repository;

    public function __construct(TreasuryTransferRepository $repository)
    {
        $this->repository = $repository;
    }

    protected function resolveAccount($id)
    {
        if (str_starts_with($id, 'cash_')) {
            $actualId = str_replace('cash_', '', $id);
            return CashAccount::with('glAccount')->findOrFail($actualId);
        }
        return BankAccount::with('glAccount')->findOrFail($id);
    }

    public function getAll($filters = [])
    {
        return $this->repository->getAll($filters);
    }

    public function createTransfer(array $data)
    {
        return DB::transaction(function () use ($data) {
            $fromTreasury = $this->resolveAccount($data['from_treasury_id']);
            
            // 1. Validation: Different treasuries
            if ($data['from_treasury_id'] == $data['to_treasury_id']) {
                throw new Exception(__('TreasuryTransfer.errors.same_treasury'));
            }

            // 2. Validation: Sufficient balance (Optional/Disabled for now due to sync issues)
            /*
            if ($fromTreasury->current_balance < $data['amount']) {
                throw new Exception(__('TreasuryTransfer.errors.insufficient_balance'));
            }
            */

            $data['reference_number'] = $this->generateReferenceNumber();
            $data['status'] = 'pending';
            $data['created_by'] = Auth::id();
            $data['company_id'] = Auth::user()->company_id;

            return $this->repository->create($data);
        });
    }

    public function updateTransfer($id, array $data)
    {
        return DB::transaction(function () use ($id, $data) {
            $transfer = $this->repository->findById($id);
            
            if ($transfer->status !== 'pending') {
                throw new Exception(__('TreasuryTransfer.errors.cannot_edit_completed_transfer'));
            }

            $fromTreasury = $this->resolveAccount($data['from_treasury_id']);
            
            if ($data['from_treasury_id'] == $data['to_treasury_id']) {
                throw new Exception(__('TreasuryTransfer.errors.same_treasury'));
            }

            /*
            if ($fromTreasury->current_balance < $data['amount']) {
                throw new Exception(__('TreasuryTransfer.errors.insufficient_balance'));
            }
            */

            $data['updated_by'] = Auth::id();

            return $this->repository->update($id, $data);
        });
    }

    public function approveTransfer($id)
    {
        return DB::transaction(function () use ($id) {
            $transfer = $this->repository->findById($id);

            if ($transfer->status !== 'pending' && $transfer->status !== 'approved') {
                throw new Exception(__('TreasuryTransfer.errors.invalid_status_for_approval'));
            }

            $fromTreasury = $this->resolveAccount($transfer->from_treasury_id);
            $toTreasury = $this->resolveAccount($transfer->to_treasury_id);

            // Check balance again before completion
            /*
            if ($fromTreasury->current_balance < $transfer->amount) {
                throw new Exception(__('TreasuryTransfer.errors.insufficient_balance'));
            }
            */

            // 1. Update Treasuries Balances
            $fromTreasury->decrement('current_balance', $transfer->amount);
            $toTreasury->increment('current_balance', $transfer->amount);

            // 2. Create Journal Entry
            $this->createJournalEntry($transfer, $fromTreasury, $toTreasury);

            // 3. Update Transfer Status
            return $this->repository->update($id, [
                'status' => 'completed',
                'approved_by' => Auth::id(),
                'approved_at' => now(),
            ]);
        });
    }

    public function rejectTransfer($id, string $reason)
    {
        return $this->repository->update($id, [
            'status' => 'rejected',
            'rejected_by' => Auth::id(),
            'rejected_at' => now(),
            'rejection_reason' => $reason,
        ]);
    }

    protected function generateReferenceNumber()
    {
        $date = Carbon::now()->format('Ymd');
        $lastTransfer = TreasuryTransfer::whereDate('created_at', Carbon::today())
            ->orderBy('id', 'desc')
            ->first();

        $sequence = $lastTransfer ? (int) substr($lastTransfer->reference_number, -4) + 1 : 1;
        return 'TRF-' . $date . '-' . str_pad($sequence, 4, '0', STR_PAD_LEFT);
    }

    protected function createJournalEntry(TreasuryTransfer $transfer, $fromTreasury, $toTreasury)
    {
        $entryCode = 'JE-' . Carbon::now()->format('Ymd') . '-' . rand(1000, 9999);
        
        $fromName = $fromTreasury instanceof CashAccount ? $fromTreasury->name : $fromTreasury->account_name;
        $toName = $toTreasury instanceof CashAccount ? $toTreasury->name : $toTreasury->account_name;

        $journalEntry = JournalEntry::create([
            'entry_code' => $entryCode,
            'entry_type' => 'transfer',
            'reference' => $transfer->reference_number,
            'date' => $transfer->transfer_date,
            'description' => "Treasury Transfer: {$transfer->reference_number} from {$fromName} to {$toName}",
            'total_amount' => $transfer->amount,
            'status' => 'Posted',
        ]);

        // Debit Target Treasury (Increase)
        JournalEntryLine::create([
            'journal_entry_code' => $entryCode,
            'account_id' => $toTreasury->gl_account_id,
            'debit' => $transfer->amount,
            'credit' => 0,
            'description' => "Received from {$fromName}",
        ]);

        // Credit Source Treasury (Decrease)
        JournalEntryLine::create([
            'journal_entry_code' => $entryCode,
            'account_id' => $fromTreasury->gl_account_id,
            'debit' => 0,
            'credit' => $transfer->amount,
            'description' => "Transferred to {$toName}",
        ]);
    }
}
