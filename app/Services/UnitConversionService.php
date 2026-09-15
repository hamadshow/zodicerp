<?php

namespace App\Services;

use App\Models\ItemUnit;
use App\Models\ItemUnitConversion;
use App\Models\Products;
use App\Services\CompanyContext;
use RuntimeException;

class UnitConversionService
{
    private const SCALE = 6;

    public function __construct(private ?CompanyContext $companyContext = null)
    {
        $this->companyContext ??= app(CompanyContext::class);
    }

    public function getBaseUnitId(int $productId): int
    {
        $product = Products::query()->findOrFail($productId);
        $productUnitId = (int) $product->unit_id;
        if ($productUnitId <= 0) {
            throw new RuntimeException("Product #{$productId} has no unit configured; cannot determine base unit.");
        }

        return $this->resolveBaseUnitId($productUnitId, $this->companyId());
    }

    public function toBase(int $productId, int $unitId, string $quantity): array
    {
        $this->assertNumeric($quantity, 'quantity');
        $companyId = $this->companyId();

        $baseUnitId = $this->getBaseUnitId($productId);

        if ($unitId === $baseUnitId) {
            return [
                'base_quantity' => $this->norm($quantity),
                'conversion_factor' => '1.000000',
                'original_unit_id' => $unitId,
                'base_unit_id' => $baseUnitId,
            ];
        }

        $factor = $this->resolveFactor($unitId, $baseUnitId, $companyId);

        return [
            'base_quantity' => self::multiply($quantity, $factor),
            'conversion_factor' => $factor,
            'original_unit_id' => $unitId,
            'base_unit_id' => $baseUnitId,
        ];
    }

    public function fromBase(int $productId, int $targetUnitId, string $baseQuantity): array
    {
        $this->assertNumeric($baseQuantity, 'base_quantity');
        $companyId = $this->companyId();

        $baseUnitId = $this->getBaseUnitId($productId);

        if ($targetUnitId === $baseUnitId) {
            return [
                'quantity' => $this->norm($baseQuantity),
                'conversion_factor' => '1.000000',
                'target_unit_id' => $targetUnitId,
                'base_unit_id' => $baseUnitId,
            ];
        }

        $forwardFactor = $this->resolveFactor($targetUnitId, $baseUnitId, $companyId);
        if (self::compare($forwardFactor, '0') === 0) {
            throw new RuntimeException("Unit conversion factor for unit #{$targetUnitId} to base #{$baseUnitId} is zero.");
        }

        $reverseFactor = self::divide('1.000000', $forwardFactor);

        return [
            'quantity' => self::multiply($baseQuantity, $reverseFactor),
            'conversion_factor' => $reverseFactor,
            'target_unit_id' => $targetUnitId,
            'base_unit_id' => $baseUnitId,
        ];
    }

    private function resolveBaseUnitId(int $startUnitId, int $companyId): int
    {
        $visited = [];
        $currentId = $startUnitId;

        while (true) {
            if (isset($visited[$currentId])) {
                throw new RuntimeException("Circular base_unit chain detected for item_unit #{$startUnitId}.");
            }
            $visited[$currentId] = true;

            $unit = ItemUnit::query()
                ->where(function ($q) use ($companyId) {
                    $q->whereNull('company_id')->orWhere('company_id', $companyId);
                })
                ->where('id', $currentId)
                ->first();

            if (! $unit) {
                throw new RuntimeException("Item unit #{$currentId} not found or not accessible for company #{$companyId}.");
            }

            if (! $unit->active) {
                throw new RuntimeException("Item unit #{$currentId} is inactive; cannot use for conversion.");
            }

            $basePointer = $unit->base_unit;
            if ($basePointer === null || (int) $basePointer === 0 || (int) $basePointer === $currentId) {
                return $currentId;
            }

            $currentId = (int) $basePointer;
        }
    }

    private function resolveFactor(int $fromUnitId, int $toUnitId, int $companyId): string
    {
        $fromUnit = ItemUnit::query()
            ->where(function ($q) use ($companyId) {
                $q->whereNull('company_id')->orWhere('company_id', $companyId);
            })
            ->where('id', $fromUnitId)
            ->first();

        if (! $fromUnit) {
            throw new RuntimeException("Item unit #{$fromUnitId} not found for company #{$companyId}.");
        }

        if ($fromUnit && (int) $fromUnit->base_unit === $toUnitId) {
            $factor = (string) ($fromUnit->conversion_factor ?? '1');
            if (self::compare($factor, '0') <= 0) {
                throw new RuntimeException("Item unit #{$fromUnitId} has invalid non-positive conversion_factor ({$factor}).");
            }

            return $this->norm($factor);
        }

        $direct = ItemUnitConversion::query()
            ->active()
            ->where(function ($q) use ($companyId) {
                $q->whereNull('company_id')->orWhere('company_id', $companyId);
            })
            ->where('from_unit_id', $fromUnitId)
            ->where('to_unit_id', $toUnitId)
            ->first();

        if ($direct) {
            $factor = (string) $direct->conversion_factor;
            if (self::compare($factor, '0') <= 0) {
                throw new RuntimeException("ItemUnitConversion #{$direct->id} has non-positive conversion_factor ({$factor}).");
            }

            return $this->norm($factor);
        }

        $reverse = ItemUnitConversion::query()
            ->active()
            ->where(function ($q) use ($companyId) {
                $q->whereNull('company_id')->orWhere('company_id', $companyId);
            })
            ->where('from_unit_id', $toUnitId)
            ->where('to_unit_id', $fromUnitId)
            ->first();

        if ($reverse) {
            $factor = (string) $reverse->conversion_factor;
            if (self::compare($factor, '0') <= 0) {
                throw new RuntimeException("ItemUnitConversion #{$reverse->id} has non-positive conversion_factor ({$factor}).");
            }

            return self::divide('1.000000', $factor);
        }

        throw new RuntimeException(
            "No active unit conversion available from unit #{$fromUnitId} to base unit #{$toUnitId} for company #{$companyId}. " .
            "Ensure ItemUnit.base_unit or an ItemUnitConversion record exists and is active."
        );
    }

    private function companyId(): int
    {
        try {
            return (int) $this->companyContext->id();
        } catch (RuntimeException $e) {
            return 0;
        }
    }

    private function norm(string $value): string
    {
        $value = trim($value);
        if ($value === '' || $value === '-' || $value === '.') {
            return '0.000000';
        }

        return bcadd($value, '0', self::SCALE);
    }

    private function assertNumeric(string $value, string $name): void
    {
        if (! is_numeric($value)) {
            throw new RuntimeException("Invalid numeric value for {$name}: '{$value}'.");
        }
    }

    private static function multiply(string $a, string $b): string { return bcmul($a, $b, self::SCALE); }
    private static function divide(string $a, string $b): string
    {
        if (bccomp($b, '0', self::SCALE) === 0) {
            throw new RuntimeException('Division by zero in UnitConversionService.');
        }

        return bcdiv($a, $b, self::SCALE);
    }
    private static function compare(string $a, string $b): int { return bccomp($a, $b, self::SCALE); }
}
