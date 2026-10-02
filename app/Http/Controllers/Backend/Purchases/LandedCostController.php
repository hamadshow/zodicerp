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

        // Multi-company boundary: the invoice must belong to the active
        // company (404, do not leak other companies' records).
        $invoiceCompanyId = (int) (PurchaseInvoice::query()->whereKey($data['purchase_invoice_id'])->value('company_id') ?? 0);
        abort_unless($invoiceCompanyId === app(CompanyContext::class)->id(), 404, 'Purchase invoice not found.');

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
        $this->assertOwned($landedCost);

        return response()->json($this->service->preview((int) $landedCost->purchase_invoice_id));
    }

    public function allocate(LandedCost $landedCost)
    {
        try {
            $this->service->allocate($landedCost);
        } catch (\Symfony\Component\HttpKernel\Exception\HttpExceptionInterface $e) {
            throw $e;
        } catch (\Throwable $e) {
            return redirect()->back()->with('error', $e->getMessage());
        }

        return redirect()->back()->with('success', 'Landed Cost allocated.');
    }

    public function post(LandedCost $landedCost)
    {
        try {
            $this->service->post($landedCost);
        } catch (\Symfony\Component\HttpKernel\Exception\HttpExceptionInterface $e) {
            throw $e;
        } catch (\Throwable $e) {
            return redirect()->back()->with('error', $e->getMessage());
        }

        return redirect()->back()->with('success', 'Landed Cost posted.');
    }

    public function cancel(LandedCost $landedCost)
    {
        try {
            $this->service->cancel($landedCost);
        } catch (\Symfony\Component\HttpKernel\Exception\HttpExceptionInterface $e) {
            throw $e;
        } catch (\Throwable $e) {
            return redirect()->back()->with('error', $e->getMessage());
        }

        return redirect()->back()->with('success', 'Landed Cost cancelled.');
    }

    public function reverse(LandedCost $landedCost)
    {
        try {
            $this->service->reverse($landedCost);
        } catch (\Symfony\Component\HttpKernel\Exception\HttpExceptionInterface $e) {
            throw $e;
        } catch (\Throwable $e) {
            return redirect()->back()->with('error', $e->getMessage());
        }

        return redirect()->back()->with('success', 'Landed Cost reversed.');
    }

    /**
     * Multi-company boundary for route-model actions the service does not
     * re-check (preview reads by invoice id).
     */
    private function assertOwned(LandedCost $landedCost): void
    {
        abort_unless((int) $landedCost->company_id === app(CompanyContext::class)->id(), 404, 'Landed Cost not found.');
    }
}