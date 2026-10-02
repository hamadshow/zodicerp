<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Phase 2 — Movement Engine Integrity (D6 ruling).
 *
 * Sales movements were the only flow writing a PascalCase reference_type
 * ('SalesInvoice') into inventory_movement_headers; every other flow uses
 * snake_case (goods_receipt, sales_return, purchase_return,
 * stock_adjustment, stock_transfer, opening). This normalizes the stored
 * values so the movement ledger has one consistent reference vocabulary.
 *
 * Scope is intentionally exact: only the legacy value is rewritten, the
 * change is fully reversible, and journal_entries.entry_type = 'SalesInvoice'
 * (the accounting domain) is NOT touched.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('inventory_movement_headers')) {
            return;
        }

        DB::table('inventory_movement_headers')
            ->where('reference_type', 'SalesInvoice')
            ->update(['reference_type' => 'sales_invoice']);
    }

    public function down(): void
    {
        if (! Schema::hasTable('inventory_movement_headers')) {
            return;
        }

        DB::table('inventory_movement_headers')
            ->where('reference_type', 'sales_invoice')
            ->update(['reference_type' => 'SalesInvoice']);
    }
};
