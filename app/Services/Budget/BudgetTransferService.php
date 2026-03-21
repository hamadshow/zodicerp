<?php

namespace App\Services\Budget;

use App\Models\Budget\BudgetItem;
use App\Models\Budget\BudgetTransfer;
use Exception;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class BudgetTransferService
{
    /**
     * Create a new budget transfer draft.
     */
    public function createTransfer(array $data)
    {
        return DB::transaction(function () use ($data) {
            $data['transfer_number'] = 'TRF-'.time(); // Simple generation, can be improved
            $data['status'] = 'draft';
            $data['requested_by'] = Auth::id();

            return BudgetTransfer::create($data);
        });
    }

    /**
     * Update a draft transfer.
     */
    public function updateTransfer(BudgetTransfer $transfer, array $data)
    {
        if ($transfer->status !== 'draft' && $transfer->status !== 'rejected') {
            throw new Exception('Only draft or rejected transfers can be updated.');
        }

        return $transfer->update($data);
    }

    /**
     * Submit transfer for approval.
     */
    public function submitForApproval(BudgetTransfer $transfer)
    {
        if ($transfer->status !== 'draft' && $transfer->status !== 'rejected') {
            throw new Exception('Invalid status for submission.');
        }

        $this->validateBalance($transfer);

        $transfer->update(['status' => 'pending_approval']);

        return $transfer;
    }

    /**
     * Approve the transfer.
     */
    public function approveTransfer(BudgetTransfer $transfer)
    {
        if ($transfer->status !== 'pending_approval') {
            throw new Exception('Transfer is not pending approval.');
        }

        $transfer->update([
            'status' => 'approved',
            'approved_by' => Auth::id(),
            'approved_date' => now(),
        ]);

        return $transfer;
    }

    /**
     * Reject the transfer.
     */
    public function rejectTransfer(BudgetTransfer $transfer)
    {
        if ($transfer->status !== 'pending_approval') {
            throw new Exception('Transfer is not pending approval.');
        }

        $transfer->update(['status' => 'rejected']);

        return $transfer;
    }

    /**
     * Complete the transfer and update budget balances.
     */
    public function completeTransfer(BudgetTransfer $transfer)
    {
        if ($transfer->status !== 'approved') {
            throw new Exception('Transfer must be approved before completion.');
        }

        return DB::transaction(function () use ($transfer) {
            // Re-validate balance before execution
            $this->validateBalance($transfer);

            $fromItem = BudgetItem::findOrFail($transfer->from_budget_item_id);
            $toItem = BudgetItem::findOrFail($transfer->to_budget_item_id);

            // Deduct from source
            $fromItem->annual_amount -= $transfer->from_amount;
            // Also adjust monthly if needed? For now, we just adjust annual.
            // Ideally we should ask user which month, but for annual budget it's fine.
            $fromItem->save();

            // Add to destination
            $toItem->annual_amount += $transfer->to_amount;
            $toItem->save();

            // Mark as completed
            $transfer->update([
                'status' => 'completed',
                'processed_by' => Auth::id(),
                'processed_date' => now(),
            ]);

            return $transfer;
        });
    }

    /**
     * Delete a draft transfer.
     */
    public function deleteTransfer(BudgetTransfer $transfer)
    {
        if ($transfer->status !== 'draft' && $transfer->status !== 'rejected') {
            throw new Exception('Only draft or rejected transfers can be deleted.');
        }

        return $transfer->delete();
    }

    /**
     * Validate sufficient funds.
     */
    private function validateBalance(BudgetTransfer $transfer)
    {
        $fromItem = BudgetItem::findOrFail($transfer->from_budget_item_id);

        // Calculate available balance (Annual Amount - Actuals - Commitments usually,
        // but here we just check if we have enough Budget Amount to move)
        // If the user wants to move "Budget", we check `annual_amount`.
        // If we move "Available Funds", we should check `annual_amount - annual_actual`.
        // Prompt says "Available budget balance" and "from_budget_item must have sufficient balance".
        // I'll check `annual_amount` vs `from_amount` as a baseline,
        // but robust systems check `remaining_balance`.
        // Let's assume `annual_amount` is the limit for now, or `annual_amount - annual_actual`.

        $available = $fromItem->annual_amount - $fromItem->annual_actual;

        if ($transfer->from_amount > $available) {
            throw new Exception("Insufficient budget balance. Available: {$available}");
        }
    }
}
