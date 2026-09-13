<?php

namespace App\Http\Controllers\Backend\Purchases;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\Vendor_Purchases\LandedCost;
use App\Models\Vendor_Purchases\PurchaseInvoice;
use App\Services\Vendor_Purchases\LandedCostService;
use App\Services\CompanyContext;
use Illuminate\Http\Request;
use Inertia\Inertia;

class LandedCostController extends Controller
{
    public function __construct(private LandedCostService $service) {}

    public function index(Request $request)
    {
        return Inertia::render('Backend/04-Purchases/LandedCost', [
            'landedCosts' => LandedCost::query()
                ->where('company_id', app(CompanyContext::class)->id())
                ->with(['purchaseInvoice.supplier', 'creditAccount'])
                ->latest()
                ->paginate(15)
                ->withQueryString(),
            'invoices' => PurchaseInvoice::query()
                ->with(['supplier', 'items.product'])
                ->where('is_posted', true)
                ->where('company_id', app(CompanyContext::class)->id())
                ->latest('invoice_date')
                ->limit(100)
                ->get(),
            'sourceAccounts' => Account::query()
                ->where('AccType', 1)
                ->whereIn('Nature', ['asset', 'bank', 'cash', 'liability'])
                ->orderBy('AccCode')
                ->get(['AccID', 'AccCode', 'AccName', 'Nature']),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'purchase_invoice_id' => 'required|exists:purchase_invoices,id',
            'reference_number' => 'nullable|string|max:50',
            'total_amount' => 'required|numeric|min:0.01',
            'currency_id' => 'nullable|exists:currencies,id',
            'exchange_rate' => 'nullable|numeric|min:0.000001',
            'credit_source_type' => 'required|in:ap,cash,bank,payment_source',
            'credit_account_id' => 'required|integer|exists:accounts,AccID',
            'posting_date' => 'nullable|date',
            'notes' => 'nullable|string',
        ]);

        $landedCost = LandedCost::create([
            ...$data,
            'reference_number' => $data['reference_number'] ?? 'LC-'.now()->format('YmdHis'),
            'allocation_method' => 'value',
            'status' => 'draft',
            'exchange_rate' => $data['exchange_rate'] ?? 1,
            'created_by' => auth()->id(),
            'company_id' => app(CompanyContext::class)->id(),
        ]);

        return redirect()->back()->with('success', "Landed Cost {$landedCost->reference_number} created.");
    }

    public function preview(LandedCost $landedCost)
    {
        return response()->json($this->service->preview((int) $landedCost->purchase_invoice_id));
    }

    public function allocate(LandedCost $landedCost)
    {
        $this->service->allocate($landedCost);
        return redirect()->back()->with('success', 'Landed Cost allocated.');
    }

    public function post(LandedCost $landedCost)
    {
        $this->service->post($landedCost);
        return redirect()->back()->with('success', 'Landed Cost posted.');
    }

    public function cancel(LandedCost $landedCost)
    {
        $this->service->cancel($landedCost);
        return redirect()->back()->with('success', 'Landed Cost cancelled.');
    }

    public function reverse(LandedCost $landedCost)
    {
        $this->service->reverse($landedCost);
        return redirect()->back()->with('success', 'Landed Cost reversed.');
    }
}