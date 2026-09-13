<?php

namespace App\Services\Inventory;

use App\Models\InventoryCostBalance;
use App\Models\InventoryCostTransaction;
use App\Services\CompanyContext;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class WeightedAverageCostService
{
    private const SCALE = 6;

    public function __construct(private CompanyContext $companyContext) {}

    public function applyInbound(
        int $productId,
        int $warehouseId,
        string $quantity,
        string $unitCost,
        string $sourceType,
        int $sourceId,
        string $transactionDate,
        ?int $movementHeaderId = null,
        ?int $movementLineId = null,
        ?int $landedCostId = null,
    ): InventoryCostTransaction {
        if (self::compare($quantity, '0') <= 0 || self::compare($unitCost, '0') < 0) {
            throw new RuntimeException('Inbound quantity must be positive and unit cost cannot be negative.');
        }

        return $this->applyDelta(
            $productId,
            $warehouseId,
            $quantity,
            self::multiply($quantity, $unitCost),
            $unitCost,
            $sourceType,
            $sourceId,
            $transactionDate,
            $movementHeaderId,
            $movementLineId,
            $landedCostId,
        );
    }

    public function applyOutbound(
        int $productId,
        int $warehouseId,
        string $quantity,
        string $sourceType,
        int $sourceId,
        string $transactionDate,
        ?int $movementHeaderId = null,
        ?int $movementLineId = null,
    ): InventoryCostTransaction {
        return DB::transaction(function () use ($productId, $warehouseId, $quantity, $sourceType, $sourceId, $transactionDate, $movementHeaderId, $movementLineId) {
            $companyId = $this->companyContext->id();
            $this->assertScopeOwnership($companyId, $productId, $warehouseId);
            $existing = InventoryCostTransaction::query()
                ->where('company_id', $companyId)
                ->where('product_id', $productId)
                ->where('warehouse_id', $warehouseId)
                ->where('source_type', $sourceType)
                ->where('source_id', $sourceId)
                ->first();
            if ($existing) {
                return $existing;
            }

            $balance = $this->lockedBalance($companyId, $productId, $warehouseId);
            $existing = InventoryCostTransaction::query()
                ->where('company_id', $companyId)
                ->where('product_id', $productId)
                ->where('warehouse_id', $warehouseId)
                ->where('source_type', $sourceType)
                ->where('source_id', $sourceId)
                ->first();
            if ($existing) {
                return $existing;
            }
            $this->assertChronological($companyId, $productId, $warehouseId, $transactionDate);

            $available = (string) $balance->quantity;
            if (self::compare($quantity, $available) > 0) {
                throw new RuntimeException('Insufficient weighted-average inventory for product '.$productId.'.');
            }

            $value = self::multiply($quantity, (string) $balance->average_cost);

            return $this->persistDelta(
                $balance,
                self::negate($quantity),
                self::negate($value),
                (string) $balance->average_cost,
                $sourceType,
                $sourceId,
                $transactionDate,
                $movementHeaderId,
                $movementLineId,
                null,
                $companyId,
            );
        });
    }

    public function current(int $productId, int $warehouseId): InventoryCostBalance
    {
        return $this->lockedBalance($this->companyContext->id(), $productId, $warehouseId);
    }

    public function applyValueAdjustment(
        int $productId,
        int $warehouseId,
        string $value,
        string $unitCost,
        string $sourceType,
        int $sourceId,
        string $transactionDate,
        ?int $landedCostId = null,
    ): InventoryCostTransaction {
        return $this->applyDelta(
            $productId,
            $warehouseId,
            '0',
            $value,
            $unitCost,
            $sourceType,
            $sourceId,
            $transactionDate,
            null,
            null,
            $landedCostId,
        );
    }

    private function applyDelta(
        int $productId,
        int $warehouseId,
        string $quantity,
        string $value,
        string $unitCost,
        string $sourceType,
        int $sourceId,
        string $transactionDate,
        ?int $movementHeaderId,
        ?int $movementLineId,
        ?int $landedCostId,
    ): InventoryCostTransaction {
        return DB::transaction(function () use ($productId, $warehouseId, $quantity, $value, $unitCost, $sourceType, $sourceId, $transactionDate, $movementHeaderId, $movementLineId, $landedCostId) {
            $companyId = $this->companyContext->id();
            $this->assertScopeOwnership($companyId, $productId, $warehouseId);
            $existing = InventoryCostTransaction::query()
                ->where('company_id', $companyId)
                ->where('product_id', $productId)
                ->where('warehouse_id', $warehouseId)
                ->where('source_type', $sourceType)
                ->where('source_id', $sourceId)
                ->first();

            if ($existing) {
                return $existing;
            }

            $balance = $this->lockedBalance($companyId, $productId, $warehouseId);
            $existing = InventoryCostTransaction::query()
                ->where('company_id', $companyId)
                ->where('product_id', $productId)
                ->where('warehouse_id', $warehouseId)
                ->where('source_type', $sourceType)
                ->where('source_id', $sourceId)
                ->first();
            if ($existing) {
                return $existing;
            }
            $this->assertChronological($companyId, $productId, $warehouseId, $transactionDate);

            return $this->persistDelta(
                $balance,
                $quantity,
                $value,
                $unitCost,
                $sourceType,
                $sourceId,
                $transactionDate,
                $movementHeaderId,
                $movementLineId,
                $landedCostId,
                $companyId,
            );
        });
    }

    private function lockedBalance(int $companyId, int $productId, int $warehouseId): InventoryCostBalance
    {
        DB::table('inventory_cost_balances')->insertOrIgnore([
            'company_id' => $companyId,
            'product_id' => $productId,
            'warehouse_id' => $warehouseId,
            'quantity' => '0',
            'inventory_value' => '0',
            'average_cost' => '0',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return InventoryCostBalance::query()
            ->where('company_id', $companyId)
            ->where('product_id', $productId)
            ->where('warehouse_id', $warehouseId)
            ->lockForUpdate()
            ->firstOrFail();
    }

    private function persistDelta(
        InventoryCostBalance $balance,
        string $quantityDelta,
        string $valueDelta,
        string $unitCost,
        string $sourceType,
        int $sourceId,
        string $transactionDate,
        ?int $movementHeaderId,
        ?int $movementLineId,
        ?int $landedCostId,
        int $companyId,
    ): InventoryCostTransaction {
        $previousQuantity = (string) $balance->quantity;
        $previousValue = (string) $balance->inventory_value;
        $previousAverage = (string) $balance->average_cost;
        $newQuantity = self::add($previousQuantity, $quantityDelta);
        $newValue = self::add($previousValue, $valueDelta);

        if (self::compare($newQuantity, '0') < 0 || self::compare($newValue, '0') < 0) {
            throw new RuntimeException('Weighted-average inventory cannot become negative.');
        }

        $newAverage = self::compare($newQuantity, '0') === 0
            ? '0.000000'
            : self::divide($newValue, $newQuantity);

        $balance->forceFill([
            'quantity' => $newQuantity,
            'inventory_value' => $newValue,
            'average_cost' => $newAverage,
        ])->save();

        return InventoryCostTransaction::create([
            'company_id' => $companyId,
            'product_id' => $balance->product_id,
            'warehouse_id' => $balance->warehouse_id,
            'movement_header_id' => $movementHeaderId,
            'movement_line_id' => $movementLineId,
            'source_type' => $sourceType,
            'source_id' => $sourceId,
            'quantity_delta' => $quantityDelta,
            'value_delta' => $valueDelta,
            'unit_cost' => $unitCost,
            'previous_quantity' => $previousQuantity,
            'previous_value' => $previousValue,
            'previous_average_cost' => $previousAverage,
            'new_quantity' => $newQuantity,
            'new_value' => $newValue,
            'new_average_cost' => $newAverage,
            'transaction_date' => $transactionDate,
            'posting_date' => now()->toDateString(),
            'landed_cost_id' => $landedCostId,
            'created_by' => auth()->id(),
        ]);
    }

    private function assertChronological(int $companyId, int $productId, int $warehouseId, string $transactionDate): void
    {
        $latest = InventoryCostTransaction::query()
            ->where('company_id', $companyId)
            ->where('product_id', $productId)
            ->where('warehouse_id', $warehouseId)
            ->max('transaction_date');

        if ($latest && $transactionDate < (string) $latest) {
            throw new RuntimeException('Backdated weighted-average costing transactions are not supported.');
        }
    }

    private function assertScopeOwnership(int $companyId, int $productId, int $warehouseId): void
    {
        $productCompany = DB::table('products')->where('id', $productId)->value('company_id');
        $warehouseCompany = DB::table('warehouses')->where('id', $warehouseId)->value('company_id');

        if ((int) $productCompany !== $companyId || (int) $warehouseCompany !== $companyId) {
            throw new RuntimeException('Product and warehouse must belong to the active company.');
        }
    }

    private static function add(string $left, string $right): string { return bcadd($left, $right, self::SCALE); }
    private static function multiply(string $left, string $right): string { return bcmul($left, $right, self::SCALE); }
    private static function divide(string $left, string $right): string { return bcdiv($left, $right, self::SCALE); }
    private static function negate(string $value): string { return bcsub('0', $value, self::SCALE); }
    private static function compare(string $left, string $right): int { return bccomp($left, $right, self::SCALE); }
}