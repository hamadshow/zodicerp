<?php

namespace App\Http\Controllers\Backend\Cash;

use App\Http\Controllers\Controller;
use App\Http\Requests\Cash\StoreTreasuryTransferRequest;
use App\Http\Resources\Cash\TreasuryTransferResource;
use App\Models\CashAccount;
use App\Services\TreasuryTransferService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Exception;

use App\Models\BankAccount;
use App\Models\Account;

class TreasuryTransferController extends Controller
{
    protected $service;

    public function __construct(TreasuryTransferService $service)
    {
        $this->service = $service;
    }

    public function index(Request $request)
    {
        // Spatie permission check (example)
        // $this->authorize('treasury-transfers.view');

        $filters = $request->only(['search', 'status', 'date_from', 'date_to', 'per_page']);
        $transfers = $this->service->getAll($filters);

        $bankAccounts = BankAccount::with(['bank', 'glAccount'])
            ->whereHas('glAccount', function ($query) {
                $query->where(function ($q) {
                    $q->where('Nature', 'bank')
                      ->orWhere('Nature', 'cash');
                })
                ->where('AccType', 1);
            })
            ->where('status', 'active')
            ->get(['id', 'bank_id', 'account_name', 'account_number', 'gl_account_id', 'currency']);

        $cashAccountsList = CashAccount::with(['bank', 'glAccount'])
            ->whereHas('glAccount', function ($query) {
                $query->where(function ($q) {
                    $q->where('Nature', 'cash');
                })
                ->where('AccType', 1);
            })
            ->where('status', 'active')
            ->get();

        $combinedAccounts = $bankAccounts->map(function ($account) {
            return [
                'id' => $account->id,
                'account_name' => $account->account_name,
                'account_number' => $account->account_number,
                'currency' => $account->currency,
                'bank_name' => $account->bank?->name,
            ];
        })->concat($cashAccountsList->map(function ($account) {
            return [
                'id' => 'cash_' . $account->id,
                'account_name' => $account->name,
                'account_number' => $account->account_code,
                'currency' => $account->currency,
                'bank_name' => 'Cash Account',
            ];
        }))->sortBy('account_name')->values()->all();

        return Inertia::render('Backend/06-Cash/TreasuryTransfer', [
            'transfers' => TreasuryTransferResource::collection($transfers),
            'filters' => $filters,
            'cashAccounts' => $combinedAccounts,
        ]);
    }

    public function store(StoreTreasuryTransferRequest $request)
    {
        try {
            $this->service->createTransfer($request->validated());
            return redirect()->back()->with('success', __('TreasuryTransfer.messages.created'));
        } catch (Exception $e) {
            return redirect()->back()->with('error', $e->getMessage());
        }
    }

    public function update(StoreTreasuryTransferRequest $request, $id)
    {
        try {
            $this->service->updateTransfer($id, $request->validated());
            return redirect()->back()->with('success', __('TreasuryTransfer.messages.updated'));
        } catch (Exception $e) {
            return redirect()->back()->with('error', $e->getMessage());
        }
    }

    public function approve(Request $request, $id)
    {
        try {
            $this->service->approveTransfer($id);
            return redirect()->back()->with('success', __('TreasuryTransfer.messages.approved'));
        } catch (Exception $e) {
            return redirect()->back()->with('error', $e->getMessage());
        }
    }

    public function reject(Request $request, $id)
    {
        $request->validate([
            'reason' => 'required|string|max:500',
        ]);

        try {
            $this->service->rejectTransfer($id, $request->reason);
            return redirect()->back()->with('success', __('TreasuryTransfer.messages.rejected'));
        } catch (Exception $e) {
            return redirect()->back()->with('error', $e->getMessage());
        }
    }
}
