<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

/**
 * Normalize legacy product-type enums without dropping values during conversion.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('products') || ! Schema::hasColumn('products', 'product_type')) {
            return;
        }

        $this->assertKnownValues();

        DB::statement(
            "ALTER TABLE products MODIFY product_type VARCHAR(16) NOT NULL DEFAULT 'simple'"
        );

        $legacyVariableCount = DB::table('products')
            ->whereRaw('BINARY product_type = ?', ['variable'])
            ->update(['product_type' => 'variation']);
        DB::table('products')
            ->whereRaw('BINARY product_type = ?', ['Service'])
            ->update(['product_type' => 'service']);

        if ($legacyVariableCount > 0) {
            logger()->info("Normalized {$legacyVariableCount} legacy configurable product type value(s).");
        }

        // 1.5. Normalize contradictory variation state: any child (parent_id set)
        //      must carry is_variation = true so legacy readers stay correct.
        $fixedFlags = DB::table('products')
            ->whereNotNull('parent_id')
            ->where(function ($query) {
                $query->where('is_variation', '!=', 1)->orWhereNull('is_variation');
            })
            ->update(['is_variation' => 1]);

        if ($fixedFlags > 0) {
            Log::info("Phase 1: corrected is_variation on {$fixedFlags} variation child(ren).");
        }

        DB::statement(
            "ALTER TABLE products MODIFY product_type ENUM('simple','variation','service') NOT NULL DEFAULT 'simple'"
        );
    }

    public function down(): void
    {
        if (! Schema::hasTable('products') || ! Schema::hasColumn('products', 'product_type')) {
            return;
        }

        $this->assertKnownValues();

        DB::statement(
            "ALTER TABLE products MODIFY product_type VARCHAR(16) NOT NULL DEFAULT 'simple'"
        );
        DB::table('products')
            ->whereRaw('BINARY product_type = ?', ['variation'])
            ->update(['product_type' => 'variable']);
        DB::table('products')
            ->whereRaw('BINARY product_type = ?', ['service'])
            ->update(['product_type' => 'Service']);

        DB::statement(
            "ALTER TABLE products MODIFY product_type ENUM('simple','variable','Service') NOT NULL DEFAULT 'simple'"
        );
    }

    private function assertKnownValues(): void
    {
        $acceptedValues = ['simple', 'variation', 'service', 'variable', 'Service'];
        $placeholders = implode(',', array_fill(0, count($acceptedValues), '?'));
        $invalidRows = DB::table('products')
            ->select(['id', 'product_type'])
            ->where(function ($query) use ($placeholders, $acceptedValues) {
                $query->whereNull('product_type')
                    ->orWhereRaw(
                        "BINARY product_type NOT IN ({$placeholders})",
                        $acceptedValues
                    );
            })
            ->limit(20)
            ->get();

        if ($invalidRows->isNotEmpty()) {
            $invalid = $invalidRows
                ->map(fn ($row) => "id={$row->id}, product_type=".var_export($row->product_type, true))
                ->implode('; ');

            throw new \RuntimeException(
                'Cannot normalize products.product_type: reconcile blank or unsupported values before migrating. '
                .'Sample rows: '.$invalid
            );
        }
    }
};
