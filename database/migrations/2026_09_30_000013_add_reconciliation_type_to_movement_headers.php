<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Phase 7 — allow 'reconciliation' movement documents.
 *
 * Reconciliation corrections are real ledger-recorded documents (header +
 * line + ICT, source_type 'reconciliation_correction'), so the shared
 * movement-header type enum needs the new value.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('inventory_movement_headers')) {
            return;
        }

        DB::statement(
            "ALTER TABLE inventory_movement_headers MODIFY type ENUM('opening','purchase','sale','sale_return','purchase_return','adjustment','transfer','reconciliation') NOT NULL"
        );
    }

    public function down(): void
    {
        if (! Schema::hasTable('inventory_movement_headers')) {
            return;
        }

        // Remap reconciliation rows before shrinking the enum.
        DB::table('inventory_movement_headers')
            ->where('type', 'reconciliation')
            ->update(['type' => 'adjustment']);

        DB::statement(
            "ALTER TABLE inventory_movement_headers MODIFY type ENUM('opening','purchase','sale','sale_return','purchase_return','adjustment','transfer') NOT NULL"
        );
    }
};
