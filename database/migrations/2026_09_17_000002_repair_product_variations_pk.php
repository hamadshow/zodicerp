<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Phase 1 — Product Domain stabilization.
 *
 * Repair the product_variations primary key: `id` was created as an INT PK
 * WITHOUT auto_increment, so every ProductVariation::create() fails with
 * "Field 'id' doesn't have a default value". Variable product families
 * (parent + variation child SKUs) cannot be created until this is fixed.
 *
 * The repair mirrors the house pattern used by
 * 2026_09_15_000002_repair_price_list_auto_increment.
 *
 * Idempotent: only alters the column when auto_increment is missing.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('product_variations')) {
            return;
        }

        $column = DB::selectOne("SHOW COLUMNS FROM product_variations WHERE Field = 'id'");

        if ($column !== null && stripos((string) ($column->Extra ?? ''), 'auto_increment') === false) {
            DB::statement(
                'ALTER TABLE product_variations MODIFY id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT'
            );
        }
    }

    public function down(): void
    {
        // Intentionally a no-op: never re-break a primary key.
    }
};
