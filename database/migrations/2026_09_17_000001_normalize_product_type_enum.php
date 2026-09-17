<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

/**
 * Phase 1 — Product Domain stabilization.
 *
 * The live database carries enum('simple','variable','Service') while the original
 * migration declared enum('simple','variable') (schema drift). This migration:
 *
 *   1. Normalizes the value 'Service' to the lowercase semantic 'service'.
 *   2. Re-aligns the migration-defined enum with the real business domain:
 *      enum('simple','variable','service') — all lowercase.
 *
 * Both steps are idempotent and safe to re-run. A tiny window of read queries
 * could still see 'Service' while the data update below runs; that is handled
 * by the case-insensitive model helpers rather than risky locking.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('products') || ! Schema::hasColumn('products', 'product_type')) {
            return;
        }

        // 1. Normalize existing 'Service' rows (case-insensitive match, idempotent).
        $affected = DB::table('products')
            ->whereRaw('LOWER(product_type) = ?', ['service'])
            ->where('product_type', '!=', 'service')
            ->update(['product_type' => 'service']);

        if ($affected > 0) {
            Log::info("Phase 1: normalized {$affected} product(s) from 'Service' to 'service'.");
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

        // 2. Align the enum definition (skipped when already correct).
        $type = DB::selectOne("SHOW COLUMNS FROM products WHERE Field = 'product_type'")->Type ?? null;

        if ($type !== "enum('simple','variable','service')") {
            DB::statement(
                "ALTER TABLE products MODIFY product_type ENUM('simple','variable','service') NOT NULL DEFAULT 'simple'"
            );
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('products') || ! Schema::hasColumn('products', 'product_type')) {
            return;
        }

        // Restore the pre-Phase-1 enum casing and convert lowercase services back.
        $affected = DB::table('products')
            ->where('product_type', 'service')
            ->update(['product_type' => 'Service']);

        DB::statement(
            "ALTER TABLE products MODIFY product_type ENUM('simple','variable','Service') NOT NULL DEFAULT 'simple'"
        );

        if ($affected > 0) {
            Log::info("Phase 1 rollback: reverted {$affected} product(s) from 'service' to 'Service'.");
        }
    }
};
