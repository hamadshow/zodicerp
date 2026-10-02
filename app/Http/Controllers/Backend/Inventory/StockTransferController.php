<?php

namespace App\Http\Controllers\Backend\Inventory;

use App\Models\ItemUnit;
use App\Models\Products;
use App\Models\TransferStock;
use App\Models\Warehouses;
use App\Http\Controllers\Controller;
use App\Services\CompanyContext;
use App\Services\Inventory\StockTransferService;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class StockTransferController extends Controller
{
    public function __construct(
        private CompanyContext $companyContext,
        private StockTransferService $transferService,
    ) {}

    public function index(): Response
    {
        $companyId = $this->companyContext->id();

        $query = TransferStock::query()
            ->with(['fromWarehouse:id,name', 'toWarehouse:id,name', 'creator:id,fullname'])
            ->where('type', 'transfer')
            ->where('company_id', $companyId)
            ->where(function ($q) {
                $q->whereNull('reference_type')->orWhere('reference_type', 'stock_transfer');
            })
            ->orderByDesc('id');

        $perPage = max(5, min(100, (int) request()->input('per_page', 15)));
        $transfers = $query->paginate($perPage)->withQueryString();

        // Per-row posted flag drives the action buttons: posted transfers can
        // only be cancelled (reversed); unposted ones stay editable/deletable.
        $postedIds = DB::table('inventory_cost_transactions')
            ->whereIn('movement_header_id', $transfers->getCollection()->pluck('id'))
            ->distinct()
            ->pluck('movement_header_id')
            ->flip();
        $transfers->getCollection()->each(function ($row) use ($postedIds) {
            $row->posted = $postedIds->has($row->id);
        });

        [$warehouses, $products, $units] = $this->scopedOptionLists($companyId);

        // View-modal support: the page modal loads this prop via an Inertia
        // partial reload (only=['transferView']) — no raw fetch, CSRF handled
        // by Inertia itself (same pattern as the stock-adjustment stock card).
        $transferView = null;
        if (request()->filled('transfer_view_id')) {
            request()->validate(['transfer_view_id' => ['required', 'integer']]);

            $viewTransfer = TransferStock::query()
                ->where('company_id', $companyId)
                ->where(function ($q) {
                    $q->whereNull('reference_type')->orWhere('reference_type', 'stock_transfer');
                })
                ->find((int) request()->input('transfer_view_id'));
            abort_unless($viewTransfer, 404);

            $transferView = [
                'transfer' => $viewTransfer,
                'lines' => DB::table('inventory_movement_lines')
                    ->where('stock_movement_id', $viewTransfer->id)
                    ->get(),
                'posted' => $this->transferService->isPosted($viewTransfer),
                'cancelled' => str_contains((string) $viewTransfer->notes, '[CANCELLED'),
            ];
        }

        return Inertia::render('Backend/03-Inventory/TransferStock', [
            'transfers' => [
                'data' => $transfers->items(),
                'current_page' => $transfers->currentPage(),
                'per_page' => $transfers->perPage(),
                'total' => $transfers->total(),
            ],
            'warehouses' => $warehouses,
            'products' => $products,
            'units' => $units,
            'filters' => request()->only(['search']),
            'transferView' => $transferView,
        ]);
    }

    /**
     * JSON endpoint for the view modal (company-scoped, 404 semantics).
     */
    public function show($id)
    {
        $companyId = $this->companyContext->id();

        $transfer = TransferStock::query()
            ->where('company_id', $companyId)
            ->where(function ($q) {
                $q->whereNull('reference_type')->orWhere('reference_type', 'stock_transfer');
            })
            ->findOrFail($id);

        $lines = DB::table('inventory_movement_lines')
            ->where('stock_movement_id', $transfer->id)
            ->get();

        return response()->json([
            'transfer' => $transfer,
            'lines' => $lines,
            'posted' => $this->transferService->isPosted($transfer),
            'cancelled' => str_contains((string) $transfer->notes, '[CANCELLED'),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'movement_date' => ['required', 'date'],
            'from_warehouse_id' => ['required', 'integer', 'exists:warehouses,id'],
            'to_warehouse_id' => ['required', 'integer', 'exists:warehouses,id', 'different:from_warehouse_id'],
            'notes' => ['nullable', 'string'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'integer', 'exists:products,id'],
            'items.*.unit_id' => ['required', 'integer', 'exists:item_units,id'],
            'items.*.quantity' => ['required', 'numeric', 'gt:0'],
        ]);

        try {
            $transfer = $this->transferService->createTransfer($validated);

            return redirect()
                ->route('admin.inventory.stock-transfers.index', [
                    'country' => $request->route('country'),
                    'lang' => $request->route('lang'),
                ])
                ->with('success', "Stock transfer {$transfer->voucher_num} saved — stock moved and costs applied.");
        } catch (ValidationException $e) {
            throw $e;
        } catch (\Symfony\Component\HttpKernel\Exception\HttpExceptionInterface $e) {
            throw $e; // ownership aborts keep their HTTP status (404)
        } catch (Throwable $e) {
            return back()->withErrors(['general' => 'Transfer failed: '.$e->getMessage()])->withInput();
        }
    }

    public function update(Request $request, $id)
    {
        $validated = $request->validate([
            'movement_date' => ['required', 'date'],
            'from_warehouse_id' => ['required', 'integer', 'exists:warehouses,id'],
            'to_warehouse_id' => ['required', 'integer', 'exists:warehouses,id', 'different:from_warehouse_id'],
            'notes' => ['nullable', 'string'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'integer', 'exists:products,id'],
            'items.*.unit_id' => ['required', 'integer', 'exists:item_units,id'],
            'items.*.quantity' => ['required', 'numeric', 'gt:0'],
        ]);

        try {
            $this->transferService->updateTransfer((int) $id, $validated);

            return redirect()
                ->route('admin.inventory.stock-transfers.index', [
                    'country' => $request->route('country'),
                    'lang' => $request->route('lang'),
                ])
                ->with('success', 'Stock transfer updated.');
        } catch (ValidationException $e) {
            throw $e;
        } catch (\Symfony\Component\HttpKernel\Exception\HttpExceptionInterface $e) {
            throw $e; // ownership aborts keep their HTTP status (404)
        } catch (ModelNotFoundException $e) {
            // 404 semantics would leak existence; this module's convention is
            // redirect + validation error (same for delete below).
            return back()->withErrors(['general' => 'Transfer not found.']);
        } catch (Throwable $e) {
            return back()->withErrors(['general' => 'Update failed: '.$e->getMessage()])->withInput();
        }
    }

    public function destroy($id)
    {
        $companyId = $this->companyContext->id();

        try {
            $transfer = TransferStock::query()
                ->where('company_id', $companyId)
                ->where(function ($q) {
                    $q->whereNull('reference_type')->orWhere('reference_type', 'stock_transfer');
                })
                ->findOrFail($id);

            if ($this->transferService->isPosted($transfer)) {
                return back()->withErrors([
                    'general' => 'Posted transfers cannot be deleted. Cancel the transfer instead — it reverses the ledger exactly.',
                ]);
            }

            DB::transaction(function () use ($transfer) {
                $transfer->items()->delete();
                DB::table('inventory_movement_headers')
                    ->where('reference_id', $transfer->id)
                    ->where('reference_type', 'stock_transfer_destination')
                    ->delete();
                $transfer->delete();
            });

            return back()->with('success', 'Draft transfer deleted.');
        } catch (ModelNotFoundException $e) {
            return back()->withErrors(['general' => 'Transfer not found.']);
        }
    }

    public function cancel(Request $request, $id)
    {
        try {
            $this->companyContext->id(); // fail closed without company context

            $this->transferService->cancelTransfer((int) $id, $request->input('reason'));

            return back()->with('success', 'Transfer cancelled — stock returned and costs reversed.');
        } catch (Throwable $e) {
            return back()->withErrors(['general' => $e->getMessage()]);
        }
    }

    /* ---------------------------------------------------------------------
     |  Company-scoped option lists (Phase 1 convention)
     --------------------------------------------------------------------- */

    private function scopedOptionLists(int $companyId): array
    {
        $warehouses = Warehouses::query()
            ->where('company_id', $companyId)
            ->select(['id', 'name'])
            ->orderBy('id')
            ->get();

        $products = Products::query()
            ->where('company_id', $companyId)
            ->select(['id', 'name', 'sku'])
            ->orderBy('id', 'desc')
            ->limit(2000)
            ->get();

        $units = ItemUnit::query()
            ->where(function ($q) use ($companyId) {
                $q->where('company_id', $companyId)->orWhereNull('company_id');
            })
            ->select(['id', 'name'])
            ->where('active', true)
            ->where('unit_type', 1)
            ->orderBy('id')
            ->get();

        return [$warehouses, $products, $units];
    }
}
