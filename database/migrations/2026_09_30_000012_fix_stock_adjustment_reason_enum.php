<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Phase 4 — fix the stock adjustment reason enum.
 *
 * The original migration shipped a Chinese enum value ('count差异', intended
 * as "count difference"). No code writes it (the controller validation was
 * already normalized to 'count' in Phase 1 and the create form never offered
 * it), but any historical row holding it would break enum redefinition. This
 * migration rewrites any such row to 'other' before swapping the enum.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('stock_adjustments')) {
            return;
        }

        // Safety net: normalize the legacy Chinese value if any row has it.
        DB::table('stock_adjustments')
            ->where('reason', 'count差异')
            ->update(['reason' => 'other']);

        DB::statement(
            "ALTER TABLE stock_adjustments MODIFY reason ENUM('correction','damage','expiring','found','lost','theft','count','other') NOT NULL DEFAULT 'correction'"
        );
    }

    public function down(): void
    {
        if (! Schema::hasTable('stock_adjustments')) {
            return;
        }

        DB::table('stock_adjustments')
            ->where('reason', 'count')
            ->update(['reason' => 'other']);

        DB::statement(
            "ALTER TABLE stock_adjustments MODIFY reason ENUM('correction','damage','expiring','found','lost','theft','count差异','other') NOT NULL DEFAULT 'correction'"
        );
    }
};
