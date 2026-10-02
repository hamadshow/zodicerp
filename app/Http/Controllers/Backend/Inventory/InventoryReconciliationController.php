<?php

namespace App\Http\Controllers\Backend\Inventory;

use App\Http\Controllers\Controller;
use App\Models\Warehouses;
use App\Services\CompanyContext;
use App\Services\Inventory\ReconciliationService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class InventoryReconciliationController extends Controller
{
    public function __construct(
        private CompanyContext $companyContext,
        private ReconciliationService $reconciliationService,
    ) {}

    /**
     * Reconciliation dashboard: option list always; the report itself is a
     * query-string-triggered partial reload (only=['report']) so the "Run"
     * action never remounts the page.
     */
    public function index(Request $request): Response
    {
        $companyId = $this->companyContext->id();

        $warehouses = Warehouses::query()
            ->where('company_id', $companyId)
            ->select('id', 'name')
            ->orderBy('id')
            ->get();

        $report = null;
        if ($request->boolean('run')) {
            $report = $this->reconciliationService->report(
                $request->filled('warehouse_id') ? (int) $request->input('warehouse_id') : null
            );
        }

        return Inertia::render('Backend/03-Inventory/InventoryReports', [
            'warehouses' => $warehouses,
            'report' => $report,
            'filters' => $request->only(['warehouse_id', 'run']),
        ]);
    }

    /**
     * Bring the WAC balance back in line with the movement ledger by posting
     * a ledger-recorded correction document.
     */
    public function resyncBalance(Request $request)
    {
        $validated = $request->validate([
            'product_id' => ['required', 'integer'],
            'warehouse_id' => ['required', 'integer'],
        ]);

        try {
            $result = $this->reconciliationService->resyncBalance(
                (int) $validated['product_id'],
                (int) $validated['warehouse_id']
            );

            return back()->with(
                'success',
                $result['changed']
                    ? "Correction posted ({$result['voucher_num']}): delta {$result['delta']} applied."
                    : 'Balance already in line with the movement ledger.'
            );
        } catch (Throwable $e) {
            return back()->withErrors(['general' => 'Resync failed: '.$e->getMessage()]);
        }
    }

    /**
     * Rewrite products.quantity from the movement ledger (pure cache write).
     */
    public function resyncDerived(Request $request)
    {
        $validated = $request->validate([
            'product_id' => ['required', 'integer'],
        ]);

        try {
            $result = $this->reconciliationService->resyncDerivedQuantity((int) $validated['product_id']);

            return back()->with(
                'success',
                $result['changed']
                    ? "Derived quantity resynced to {$result['derived_quantity']} (was {$result['previous']})."
                    : 'Derived quantity already matches the movement ledger.'
            );
        } catch (Throwable $e) {
            return back()->withErrors(['general' => 'Resync failed: '.$e->getMessage()]);
        }
    }
}
