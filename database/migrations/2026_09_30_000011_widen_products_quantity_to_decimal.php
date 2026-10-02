<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Phase 3 — products.quantity must be able to hold BASE-unit quantities.
 *
 * The movement engine converts every document quantity to the product's base
 * unit with scale 6 (UnitConversionService / WAC bcmath). The ledgers store
 * decimals (inventory_movement_lines DECIMAL(15,3),
 * inventory_cost_transactions DECIMAL(18,4)), and WAC balances carry
 * DECIMAL(18,4). But products.quantity was INT(11): every fractional base
 * quantity written by ANY flow (GRN, transfers with box->piece conversion,
 * opening stock) was silently truncated — 12.345 became 12 — making the
 * derived cache structurally unable to reconcile with the movement ledger.
 *
 * This widens the column to DECIMAL(16,4) (matching the WAC quantity scale)
 * and backfills nothing: existing integer values are preserved exactly.
 * Non-destructive and reversible.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->decimal('quantity', 16, 4)->default(0)->change();
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->integer('quantity')->default(0)->change();
        });
    }
};
