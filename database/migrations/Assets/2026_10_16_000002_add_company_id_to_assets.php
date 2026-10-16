<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * AssetLifecycleController and AssetLifecycleService scope `assets` with
 * `where('company_id', ...)` in ~12 places (depreciation schedule/report,
 * disposals, revaluations, posting engine), and the sibling tables
 * (asset_disposals, asset_revaluation, asset_depreciation, asset_movements)
 * all carry company_id — but the assets table was created without it, so
 * every one of those queries failed with SQLSTATE 42S22 "Unknown column
 * 'company_id'".
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('assets', 'company_id')) {
            return;
        }

        Schema::table('assets', function (Blueprint $table) {
            // Default 1 mirrors the application fallback used everywhere:
            // auth()->user()->company_id ?? 1. MySQL back-fills existing rows
            // with the default when the column is added.
            $table->unsignedBigInteger('company_id')->default(1);
            $table->index('company_id');
        });

        // Correct the back-fill for rows created by a user of another company.
        if (DB::getDriverName() === 'mysql') {
            DB::statement(
                'UPDATE assets a
                 INNER JOIN users u ON u.id = a.created_by
                 SET a.company_id = COALESCE(u.company_id, 1)'
            );
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('assets', 'company_id')) {
            Schema::table('assets', function (Blueprint $table) {
                $table->dropIndex(['company_id']);
                $table->dropColumn('company_id');
            });
        }
    }
};
