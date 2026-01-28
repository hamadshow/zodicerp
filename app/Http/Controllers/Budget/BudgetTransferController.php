<?php

namespace App\Http\Controllers\Budget;

use App\Http\Controllers\Controller;
use App\Http\Requests\Budget\StoreBudgetTransferRequest;
use App\Models\Budget\Budget;
use App\Models\Budget\BudgetItem;
use App\Models\Budget\BudgetTransfer;
use App\Services\Budget\BudgetTransferService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class BudgetTransferController extends Controller
{
    protected $transferService;

    public function __construct(BudgetTransferService $transferService)
    {
        $this->transferService = $transferService;
    }

    public function index(Request $request)
    {
        $query = BudgetTransfer::with(['fromBudget', 'toBudget', 'requester', 'approver'])
            ->latest();

        if ($request->has('status') && $request->status) {
            $query->where('status', $request->status);
        }

        if ($request->has('transfer_number') && $request->transfer_number) {
            $query->where('transfer_number', 'like', '%' . $request->transfer_number . '%');
        }

        $transfers = $query->paginate(10)->withQueryString();
        
        // Load active budgets for the dropdowns
        $budgets = Budget::where('status', 'active')->orWhere('status', 'approved')->select('id', 'budget_name_en', 'budget_number')->get();

        return Inertia::render('Backend/Budget/BudgetTransfer', [
            'transfers' => $transfers,
            'budgets' => $budgets,
            'filters' => $request->only(['status', 'transfer_number']),
        ]);
    }

    public function store(StoreBudgetTransferRequest $request)
    {
        try {
            $data = $request->validated();
            if ($request->hasFile('reference_document')) {
                $data['reference_document'] = $request->file('reference_document')->store('budget-transfers', 'public');
            }
            
            $this->transferService->createTransfer($data);
            return redirect()->back()->with('success', 'Transfer draft created successfully.');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', $e->getMessage());
        }
    }

    public function update(Request $request, BudgetTransfer $transfer)
    {
        try {
            // Basic validation for update - strictly speaking should use a FormRequest
            $data = $request->validate([
                'transfer_date' => 'required|date',
                'transfer_type' => 'required|in:internal,interdepartmental,supplemental',
                'reason' => 'required|string',
                'justification' => 'nullable|string',
                'from_budget_id' => 'required|exists:budgets,id',
                'from_budget_item_id' => 'required|exists:budget_items,id',
                'from_amount' => 'required|numeric|min:0.01',
                'to_amount' => 'required|numeric|min:0.01',
                'to_budget_id' => 'required|exists:budgets,id',
                'to_budget_item_id' => 'required|exists:budget_items,id|different:from_budget_item_id',
                'notes' => 'nullable|string',
                'reference_document' => 'nullable|file|mimes:pdf,jpg,png,doc,docx|max:10240',
            ]);

            if ($request->hasFile('reference_document')) {
                $data['reference_document'] = $request->file('reference_document')->store('budget-transfers', 'public');
            }

            $this->transferService->updateTransfer($transfer, $data);
            return redirect()->back()->with('success', 'Transfer updated successfully.');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', $e->getMessage());
        }
    }

    public function destroy(BudgetTransfer $transfer)
    {
        try {
            $this->transferService->deleteTransfer($transfer);
            return redirect()->back()->with('success', 'Transfer deleted successfully.');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', $e->getMessage());
        }
    }

    public function submit(BudgetTransfer $transfer)
    {
        try {
            $this->transferService->submitForApproval($transfer);
            return redirect()->back()->with('success', 'Transfer submitted for approval.');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', $e->getMessage());
        }
    }

    public function approve(BudgetTransfer $transfer)
    {
        try {
            $this->transferService->approveTransfer($transfer);
            return redirect()->back()->with('success', 'Transfer approved.');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', $e->getMessage());
        }
    }

    public function reject(BudgetTransfer $transfer)
    {
        try {
            $this->transferService->rejectTransfer($transfer);
            return redirect()->back()->with('success', 'Transfer rejected.');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', $e->getMessage());
        }
    }

    public function complete(BudgetTransfer $transfer)
    {
        try {
            $this->transferService->completeTransfer($transfer);
            return redirect()->back()->with('success', 'Transfer completed and balances updated.');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', $e->getMessage());
        }
    }

    // Helper to get items for a budget (API)
    public function getBudgetItems($budgetId)
    {
        $items = BudgetItem::where('budget_id', $budgetId)
            ->with(['account:AccID,AccName', 'category:id,name_en'])
            ->get()
            ->map(function ($item) {
                return [
                    'id' => $item->id,
                    'name' => ($item->category ? $item->category->name_en . ' - ' : '') . ($item->account ? $item->account->AccName : 'Unknown'),
                    'available_balance' => $item->annual_amount - $item->annual_actual, // Simplified logic
                    'annual_amount' => $item->annual_amount,
                ];
            });

        return response()->json($items);
    }
}
