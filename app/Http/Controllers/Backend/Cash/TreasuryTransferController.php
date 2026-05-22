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

        return Inertia::render('Backend/06-Cash/TreasuryTransfer', [
            'transfers' => TreasuryTransferResource::collection($transfers),
            'filters' => $filters,
            'cashAccounts' => CashAccount::where('status', 'active')->get(['id', 'name', 'account_code', 'current_balance']),
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
