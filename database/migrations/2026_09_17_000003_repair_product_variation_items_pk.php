<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Phase 1 final fix — Product Domain integrity.
 *
 * Repair the product_variation_items primary key: `id` was created as a PK
 * WITHOUT auto_increment, so every ProductVariationItem::create() fails with
 * "Field 'id' doesn't have a default value" and variation attribute combos
 * can never be persisted. Same defect class as the product_variations.id
 * repair (2026_09_17_000002), same house pattern
 * (2026_09_15_000002_repair_price_list_auto_increment).
 *
 * Idempotent: only alters the column when auto_increment is missing.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('product_variation_items')) {
            return;
        }

        $column = DB::selectOne("SHOW COLUMNS FROM product_variation_items WHERE Field = 'id'");

        if ($column !== null && stripos((string) ($column->Extra ?? ''), 'auto_increment') === false) {
            DB::statement(
                'ALTER TABLE product_variation_items MODIFY id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT'
            );
        }
    }

    public function down(): void
    {
        // Intentionally a no-op: never re-break a primary key.
    }
};
