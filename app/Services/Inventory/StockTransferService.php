<?php

namespace App\Services\Inventory;

use App\Models\TransferStock;
use App\Models\TransferStockItem;
use App\Services\CompanyContext;
use App\Services\UnitConversionService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use RuntimeException;

/**
 * Phase 5 — Stock Transfer engine.
 *
 * One stock transfer document is a PAIRED pair of movement headers sharing a
 * voucher number: the source header (direction 'out', reference_type
 * 'stock_transfer') and the destination header (direction 'in',
 * reference_type 'stock_transfer_destination', reference_id = source id).
 *
 * Ratified contract (Phase 0/2, pinned by InventoryMovementContractTest
 * FLOW 5): the ledger applies at SAVE time — WAC moves from the source
 * warehouse to the destination at the outbound unit cost (no gain/loss), no
 * journal is posted, and global products.quantity is untouched.
 *
 * Phase 5 additions:
 * - the engine lives in the service (the controller no longer owns ledger
 *   arithmetic) and fixes the items()->latest('id') write race by keeping the
 *   created line models;
 * - CANCELLATION via WeightedAverageCostService::reverse(): every original
 *   ICT is negated (source_type 'stock_transfer_cancellation',
 *   reversal_of_id set), mirrored reversal movement documents are written for
 *   audit, and the original documents are stamped [CANCELLED date]. Cancel is
 *   refused (whole transaction rolls back) when the transferred stock was
 *   already consumed at the destination — the exact mirror of the adjustment
 *   cancel rule;
 * - edit/delete stay blocked once cost transactions exist (nothing that ever
 *   touched the ledger may be rewritten in place).
 */
class StockTransferService
{
    public function __construct(
        private CompanyContext $companyContext,
        private WeightedAverageCostService $wac,
        private UnitConversionService $unitConversion,
    ) {}

    /* ---------------------------------------------------------------------
     |  Create (ledger applies at save — ratified contract)
     --------------------------------------------------------------------- */

    public function createTransfer(array $data): object
    {
        return DB::transaction(function () use ($data) {
            $companyId = $this->companyContext->id();
            $fromWarehouseId = (int) $data['from_warehouse_id'];
            $toWarehouseId = (int) $data['to_warehouse_id'];
            $movementDate = (string) $data['movement_date'];

            if ($fromWarehouseId === $toWarehouseId) {
                throw ValidationException::withMessages([
                    'to_warehouse_id' => 'Source and destination warehouses must differ.',
                ]);
            }

            $this->assertOwnership($companyId, $fromWarehouseId, $toWarehouseId, $data['items']);

            $notes = $this->buildNotes($data['notes'] ?? null);

            $voucherNum = 'TR-'.date('Ymd').'-'.strtoupper(substr(uniqid(), -4));

            $transfer = TransferStock::create([
                'movement_date' => $movementDate,
                'type' => 'transfer',
                'direction' => 'out',
                'voucher_num' => $voucherNum,
                'warehouse_id' => $fromWarehouseId,
                'from_warehouse_id' => $fromWarehouseId,
                'to_warehouse_id' => $toWarehouseId,
                'company_id' => $companyId,
                'created_by' => Auth::id(),
                'reference_id' => null,
                'reference_type' => 'stock_transfer',
                'notes' => $notes,
            ]);
            $transfer->update(['reference_id' => $transfer->id]);

            $destination = TransferStock::create([
                'movement_date' => $movementDate,
                'type' => 'transfer',
                'direction' => 'in',
                'voucher_num' => $voucherNum.'-IN',
                'warehouse_id' => $toWarehouseId,
                'from_warehouse_id' => $fromWarehouseId,
                'to_warehouse_id' => $toWarehouseId,
                'company_id' => $companyId,
                'created_by' => Auth::id(),
                'reference_id' => $transfer->id,
                'reference_type' => 'stock_transfer_destination',
                'notes' => $notes,
            ]);

            $this->applyItems($transfer, $destination, $companyId, $movementDate, $data['items']);

            return DB::table('inventory_movement_headers')->where('id', $transfer->id)->first();
        });
    }

    /**
     * Convert, price and apply every line. The created line MODEL is kept so
     * the ICT source_id never depends on a latest('id') race.
     */
    private function applyItems(TransferStock $transfer, TransferStock $destination, int $companyId, string $movementDate, array $items): void
    {
        foreach ($items as $item) {
            $conversion = $this->unitConversion->toBase(
                (int) $item['product_id'],
                (int) $item['unit_id'],
                (string) $item['quantity']
            );
            $baseQuantity = $conversion['base_quantity'];

            $sourceLine = TransferStockItem::create([
                'stock_movement_id' => $transfer->id,
                'product_id' => (int) $item['product_id'],
                'unit_id' => (int) $item['unit_id'],
                'quantity' => $baseQuantity,
                'original_quantity' => $item['quantity'],
                'conversion_factor_snapshot' => $conversion['conversion_factor'],
                'cost_price' => 0,
            ]);

            $outbound = $this->wac->applyOutbound(
                (int) $item['product_id'],
                (int) $transfer->from_warehouse_id,
                (string) $baseQuantity,
                'stock_transfer_source',
                (int) $sourceLine->id,
                $movementDate,
                (int) $transfer->id,
                (int) $sourceLine->id,
            );

            // Source line carries the ACTUAL applied WAC (never cost_per_item).
            $sourceLine->update(['cost_price' => $outbound->unit_cost]);

            $destinationLine = TransferStockItem::create([
                'stock_movement_id' => $destination->id,
                'product_id' => (int) $item['product_id'],
                'unit_id' => (int) $item['unit_id'],
                'quantity' => $baseQuantity,
                'original_quantity' => $item['quantity'],
                'conversion_factor_snapshot' => $conversion['conversion_factor'],
                'cost_price' => $outbound->unit_cost,
            ]);

            $this->wac->applyInbound(
                (int) $item['product_id'],
                (int) $transfer->to_warehouse_id,
                (string) $baseQuantity,
                (string) $outbound->unit_cost,
                'stock_transfer_destination',
                (int) $destinationLine->id,
                $movementDate,
                (int) $destination->id,
                (int) $destinationLine->id,
            );
        }
    }

    /* ---------------------------------------------------------------------
     |  Edit (only while no cost transaction exists)
     --------------------------------------------------------------------- */

    public function isPosted(object|int $transfer): bool
    {
        $transferId = is_object($transfer) ? (int) $transfer->id : $transfer;

        $viaHeader = DB::table('inventory_cost_transactions')
            ->where('movement_header_id', $transferId)
            ->exists();

        if ($viaHeader) {
            return true;
        }

        // Legacy guard: ICTs linked only through the movement lines.
        return DB::table('inventory_cost_transactions')
            ->whereIn('source_id', DB::table('inventory_movement_lines')
                ->where('stock_movement_id', $transferId)
                ->pluck('id'))
            ->exists();
    }

    public function updateTransfer(int $transferId, array $data): object
    {
        return DB::transaction(function () use ($transferId, $data) {
            $companyId = $this->companyContext->id();

            $transfer = TransferStock::query()
                ->where('company_id', $companyId)
                ->where(function ($q) {
                    $q->whereNull('reference_type')->orWhere('reference_type', 'stock_transfer');
                })
                ->findOrFail($transferId);

            if ($this->isPosted($transfer)) {
                throw new RuntimeException('Posted stock transfers cannot be edited. Cancel the transfer instead.');
            }

            // Same boundary as creation: the replacement warehouses/products
            // must belong to the active company.
            $this->assertOwnership($companyId, (int) $data['from_warehouse_id'], (int) $data['to_warehouse_id'], $data['items']);

            $transfer->update([
                'movement_date' => (string) $data['movement_date'],
                'warehouse_id' => (int) $data['from_warehouse_id'],
                'from_warehouse_id' => (int) $data['from_warehouse_id'],
                'to_warehouse_id' => (int) $data['to_warehouse_id'],
                'notes' => $this->buildNotes($data['notes'] ?? null),
            ]);

            // Nothing ever touched the ledger: lines can be rewritten in place.
            $transfer->items()->delete();

            foreach ($data['items'] as $item) {
                $conversion = $this->unitConversion->toBase(
                    (int) $item['product_id'],
                    (int) $item['unit_id'],
                    (string) $item['quantity']
                );

                $transfer->items()->create([
                    'product_id' => (int) $item['product_id'],
                    'unit_id' => (int) $item['unit_id'],
                    'quantity' => $conversion['base_quantity'],
                    'original_quantity' => $item['quantity'],
                    'conversion_factor_snapshot' => $conversion['conversion_factor'],
                    'cost_price' => 0,
                ]);
            }

            return $transfer->refresh();
        });
    }

    /* ---------------------------------------------------------------------
     |  Cancel (exact reversal via the WAC primitive)
     --------------------------------------------------------------------- */

    /**
     * Reverse an applied transfer exactly.
     *
     * Every original ICT is negated through WAC::reverse (source_type
     * 'stock_transfer_cancellation', reversal_of_id = original ICT id), two
     * mirrored movement documents record the physical move-back for audit,
     * and both original headers are stamped [CANCELLED date]. Global
     * products.quantity is never touched (transfers do not move it).
     *
     * Refused (whole cancel rolls back) when any transferred quantity was
     * already consumed at the destination warehouse.
     */
    public function cancelTransfer(int $transferId, ?string $reason = null): object
    {
        return DB::transaction(function () use ($transferId, $reason) {
            $companyId = $this->companyContext->id();

            $transfer = TransferStock::query()
                ->where('company_id', $companyId)
                ->where('reference_type', 'stock_transfer')
                ->findOrFail($transferId);

            $outboundTxs = DB::table('inventory_cost_transactions')
                ->where('company_id', $companyId)
                ->where('movement_header_id', $transfer->id)
                ->where('source_type', 'stock_transfer_source')
                ->orderBy('id')
                ->get();

            if ($outboundTxs->isEmpty()) {
                throw new RuntimeException(
                    'This transfer has no cost transactions to reverse (legacy pre-engine row). Use reconciliation instead.'
                );
            }

            // Idempotent cancel: any existing reversal for these ICTs means
            // the transfer was already cancelled — return unchanged.
            $alreadyCancelled = DB::table('inventory_cost_transactions')
                ->where('company_id', $companyId)
                ->where('source_type', 'stock_transfer_cancellation')
                ->whereIn('reversal_of_id', $outboundTxs->merge(
                    DB::table('inventory_cost_transactions')
                        ->where('company_id', $companyId)
                        ->where('source_type', 'stock_transfer_destination')
                        ->where('movement_header_id', $this->destinationIdFor($transfer))
                        ->pluck('id')
                )->pluck('id'))
                ->exists();
            if ($alreadyCancelled) {
                return $transfer->refresh();
            }

            $destinationId = $this->destinationIdFor($transfer);
            $inboundTxs = $destinationId
                ? DB::table('inventory_cost_transactions')
                    ->where('company_id', $companyId)
                    ->where('movement_header_id', $destinationId)
                    ->where('source_type', 'stock_transfer_destination')
                    ->orderBy('id')
                    ->get()
                : collect();

            if ($inboundTxs->isEmpty()) {
                throw new RuntimeException('Transfer destination has no inbound cost transactions to reverse.');
            }

            $today = now()->toDateString();
            $reverseDate = max((string) $transfer->movement_date, $today);

            // Refuse when the transferred stock was consumed downstream —
            // identical rule to the stock-adjustment cancel.
            foreach ($inboundTxs as $tx) {
                $balance = DB::table('inventory_cost_balances')
                    ->where('company_id', $companyId)
                    ->where('product_id', $tx->product_id)
                    ->where('warehouse_id', $tx->warehouse_id)
                    ->first();

                $onHand = $balance ? (float) $balance->quantity : 0.0;
                if ($onHand + 0.000001 < (float) $tx->quantity_delta) {
                    throw new RuntimeException(
                        'Cannot cancel the transfer: transferred stock has already been consumed at the destination warehouse.'
                    );
                }
            }

            // 1) Negate every ICT (destination first so the source side never
            //    sees a transient negative; reverse() itself refuses negative
            //    balances as a hard backstop).
            foreach ($inboundTxs as $tx) {
                $this->wac->reverse((int) $tx->id, $reverseDate, 'stock_transfer_cancellation', (int) $tx->id);
            }
            foreach ($outboundTxs as $tx) {
                $this->wac->reverse((int) $tx->id, $reverseDate, 'stock_transfer_cancellation', (int) $tx->id);
            }

            // 2) Mirrored movement documents for audit: back to source ('in'
            //    at the source warehouse) and out of destination ('out' at the
            //    destination warehouse).
            $this->writeReversalDocuments($transfer, $destinationId, $outboundTxs, $inboundTxs, $reverseDate, $reason);

            // 3) Stamp both original documents.
            $stamp = ' [CANCELLED '.$reverseDate.']';
            foreach (array_filter([$transfer->id, $destinationId]) as $headerId) {
                $row = DB::table('inventory_movement_headers')->where('id', $headerId)->first();
                if ($row && ! str_contains((string) $row->notes, '[CANCELLED')) {
                    DB::table('inventory_movement_headers')
                        ->where('id', $headerId)
                        ->update(['notes' => ($row->notes !== null && $row->notes !== '' ? $row->notes : 'TransferStock').$stamp]);
                }
            }

            return $transfer->refresh();
        });
    }

    private function destinationIdFor(object $transfer): ?int
    {
        $id = DB::table('inventory_movement_headers')
            ->where('company_id', $transfer->company_id)
            ->where('reference_type', 'stock_transfer_destination')
            ->where('reference_id', $transfer->id)
            ->value('id');

        return $id ? (int) $id : null;
    }

    private function writeReversalDocuments(object $transfer, ?int $destinationId, $outboundTxs, $inboundTxs, string $reverseDate, ?string $reason): void
    {
        $userId = Auth::id() ?: $transfer->created_by;
        $baseNotes = $this->buildNotes($reason !== null && trim($reason) !== '' ? $reason : 'Transfer cancelled — stock returned');

        // Back to source: direction 'in' at the SOURCE warehouse.
        $backHeaderId = DB::table('inventory_movement_headers')->insertGetId([
            'movement_date' => $reverseDate,
            'type' => 'transfer',
            'direction' => 'in',
            'voucher_num' => $transfer->voucher_num.'-REV',
            'warehouse_id' => $transfer->from_warehouse_id,
            'from_warehouse_id' => $transfer->to_warehouse_id,
            'to_warehouse_id' => $transfer->from_warehouse_id,
            'company_id' => $transfer->company_id,
            'created_by' => $userId,
            'reference_id' => $transfer->id,
            'reference_type' => 'stock_transfer_cancellation',
            'notes' => $baseNotes,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        foreach ($outboundTxs as $tx) {
            $originalLine = $tx->movement_line_id
                ? DB::table('inventory_movement_lines')->where('id', $tx->movement_line_id)->first()
                : null;

            DB::table('inventory_movement_lines')->insert([
                'stock_movement_id' => $backHeaderId,
                'product_id' => $tx->product_id,
                'unit_id' => $originalLine->unit_id ?? $this->baseUnitIdFor((int) $tx->product_id),
                'quantity' => abs((float) $tx->quantity_delta),
                'original_quantity' => $originalLine->original_quantity ?? abs((float) $tx->quantity_delta),
                'conversion_factor_snapshot' => $originalLine->conversion_factor_snapshot ?? 1,
                'cost_price' => $tx->unit_cost,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        if (! $destinationId) {
            return;
        }

        // Out of destination: direction 'out' at the DESTINATION warehouse.
        $outHeaderId = DB::table('inventory_movement_headers')->insertGetId([
            'movement_date' => $reverseDate,
            'type' => 'transfer',
            'direction' => 'out',
            'voucher_num' => $transfer->voucher_num.'-REV-OUT',
            'warehouse_id' => $transfer->to_warehouse_id,
            'from_warehouse_id' => $transfer->to_warehouse_id,
            'to_warehouse_id' => $transfer->from_warehouse_id,
            'company_id' => $transfer->company_id,
            'created_by' => $userId,
            'reference_id' => $transfer->id,
            'reference_type' => 'stock_transfer_cancellation',
            'notes' => $baseNotes,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        foreach ($inboundTxs as $tx) {
            $originalLine = $tx->movement_line_id
                ? DB::table('inventory_movement_lines')->where('id', $tx->movement_line_id)->first()
                : null;

            DB::table('inventory_movement_lines')->insert([
                'stock_movement_id' => $outHeaderId,
                'product_id' => $tx->product_id,
                'unit_id' => $originalLine->unit_id ?? $this->baseUnitIdFor((int) $tx->product_id),
                'quantity' => abs((float) $tx->quantity_delta),
                'original_quantity' => $originalLine->original_quantity ?? abs((float) $tx->quantity_delta),
                'conversion_factor_snapshot' => $originalLine->conversion_factor_snapshot ?? 1,
                'cost_price' => $tx->unit_cost,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    private function baseUnitIdFor(int $productId): ?int
    {
        return DB::table('products')->where('id', $productId)->value('unit_id');
    }

    /* ---------------------------------------------------------------------
     |  Ownership (fail closed)
     --------------------------------------------------------------------- */

    private function assertOwnership(int $companyId, int $fromWarehouseId, int $toWarehouseId, array $items): void
    {
        $warehouseOwners = DB::table('warehouses')
            ->whereIn('id', array_unique([$fromWarehouseId, $toWarehouseId]))
            ->pluck('company_id', 'id');

        // The boundary rejects the request itself with 404 semantics (the WAC
        // service would refuse later, but master data must never be usable
        // cross-company) — same convention as the pre-Phase-5 controller.
        abort_unless((int) ($warehouseOwners[$fromWarehouseId] ?? 0) === $companyId, 404, 'Source warehouse not found.');
        abort_unless((int) ($warehouseOwners[$toWarehouseId] ?? 0) === $companyId, 404, 'Destination warehouse not found.');

        $productIds = array_map(static fn ($item) => (int) $item['product_id'], $items);
        $productOwners = DB::table('products')
            ->whereIn('id', array_unique($productIds))
            ->pluck('company_id', 'id');

        foreach (array_unique($productIds) as $productId) {
            abort_unless((int) ($productOwners[$productId] ?? 0) === $companyId, 404, 'Product not found.');
        }
    }

    private function buildNotes(?string $userNotes): string
    {
        $trimmed = trim((string) $userNotes);

        return $trimmed !== '' ? 'TransferStock | '.$trimmed : 'TransferStock';
    }
}
