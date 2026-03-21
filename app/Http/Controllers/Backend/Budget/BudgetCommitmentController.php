<?php

namespace App\Http\Controllers\Backend\Budget;

use App\Http\Controllers\Controller;
use App\Http\Requests\Budget\StoreBudgetCommitmentRequest;
use App\Models\Budget\Budget;
use App\Models\Budget\BudgetCommitment;
use App\Models\Budget\BudgetItem;
use App\Services\Budget\BudgetCommitmentService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class BudgetCommitmentController extends Controller
{
    protected $commitmentService;

    public function __construct(BudgetCommitmentService $commitmentService)
    {
        $this->commitmentService = $commitmentService;
    }

    public function index(Request $request)
    {
        $query = BudgetCommitment::with(['budget', 'budgetItem.category', 'budgetItem.account', 'vendor', 'creator'])
            ->latest();

        if ($request->has('status') && $request->status) {
            $query->where('status', $request->status);
        }

        if ($request->has('reference_number') && $request->reference_number) {
            $query->where('reference_number', 'like', '%'.$request->reference_number.'%');
        }

        if ($request->has('vendor_id') && $request->vendor_id) {
            $query->where('vendor_id', $request->vendor_id);
        }

        $commitments = $query->paginate(10)->withQueryString();

        // Load active budgets
        $budgets = Budget::where('status', 'active')
            ->orWhere('status', 'approved')
            ->select('id', 'budget_name_en', 'budget_number')
            ->get();

        // We might need vendors list too, or load via API
        // For now, let's assume we load vendors via a separate API or pass basic ones if small list
        // Since vendors can be large, better to have an autocomplete API, but for MVP let's pass empty or use existing if small

        return Inertia::render('Backend/Budget/BudgetCommitment', [
            'commitments' => $commitments,
            'budgets' => $budgets,
            'filters' => $request->only(['status', 'reference_number', 'vendor_id']),
        ]);
    }

    public function store(StoreBudgetCommitmentRequest $request)
    {
        try {
            $this->commitmentService->createCommitment($request->validated());

            return redirect()->back()->with('success', 'Commitment created successfully.');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', $e->getMessage());
        }
    }

    public function update(Request $request, BudgetCommitment $commitment)
    {
        try {
            // Re-validate needed fields. For simplicity using same rules but relaxing some if needed
            // Ideally use UpdateBudgetCommitmentRequest
            $data = $request->validate([
                'committed_amount' => 'required|numeric|min:0.01',
                'description' => 'nullable|string',
                'expiry_date' => 'nullable|date',
                'expected_expense_date' => 'nullable|date',
            ]);

            $this->commitmentService->updateCommitment($commitment, $data);

            return redirect()->back()->with('success', 'Commitment updated successfully.');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', $e->getMessage());
        }
    }

    public function destroy(BudgetCommitment $commitment)
    {
        try {
            $this->commitmentService->cancelCommitment($commitment);

            return redirect()->back()->with('success', 'Commitment cancelled successfully.');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', $e->getMessage());
        }
    }

    public function markUtilized(Request $request, BudgetCommitment $commitment)
    {
        try {
            $request->validate(['amount' => 'required|numeric|min:0.01']);
            $this->commitmentService->utilizeCommitment($commitment, $request->amount);

            return redirect()->back()->with('success', 'Commitment utilized successfully.');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', $e->getMessage());
        }
    }

    public function close(BudgetCommitment $commitment)
    {
        try {
            $this->commitmentService->closeCommitment($commitment);

            return redirect()->back()->with('success', 'Commitment closed and remaining funds released.');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', $e->getMessage());
        }
    }

    // Helper to get items for a budget
    public function getBudgetItems($budgetId)
    {
        $items = BudgetItem::where('budget_id', $budgetId)
            ->with(['account:AccID,AccName', 'category:id,name_en'])
            ->get()
            ->map(function ($item) {
                // Calculate real available balance including commitments
                $available = $this->commitmentService->getAvailableBalance($item);

                return [
                    'id' => $item->id,
                    'name' => ($item->category ? $item->category->name_en.' - ' : '').($item->account ? $item->account->AccName : 'Unknown'),
                    'available_balance' => $available,
                    'annual_amount' => $item->annual_amount,
                ];
            });

        return response()->json($items);
    }

    // Helper to get vendors (simple search)
    public function getVendors(Request $request)
    {
        if (class_exists(\App\Models\Vendor_Purchases\Supplier::class)) {
            $query = \App\Models\Vendor_Purchases\Supplier::query();
            if ($request->has('search')) {
                $query->where('name_ar', 'like', '%'.$request->search.'%');
            }

            return response()->json($query->limit(20)->get(['id', 'name_ar']));
        }

        return response()->json([]);
    }
}
