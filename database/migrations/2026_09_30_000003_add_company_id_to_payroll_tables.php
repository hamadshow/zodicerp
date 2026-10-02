<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Adds company ownership to the payroll tables (audit Phase 2.6).
     *
     * Backfill strategy: every existing payroll row was created by users of
     * the single operating company in this database, so rows are attributed
     * to the lowest existing company id. If no company exists, the column
     * stays NULL (still indexable, and scoping code treats NULL as legacy).
     */
    public function up(): void
    {
        $companyId = DB::table('company')->orderBy('id')->value('id');

        Schema::table('payroll_periods', function (Blueprint $table) {
            $table->unsignedBigInteger('company_id')->nullable()->after('status');
            $table->index(['company_id', 'status']);
        });

        Schema::table('payroll_results', function (Blueprint $table) {
            $table->unsignedBigInteger('company_id')->nullable()->after('payroll_period_id');
            $table->index(['company_id', 'employee_id']);
        });

        if ($companyId) {
            DB::table('payroll_periods')->whereNull('company_id')->update(['company_id' => $companyId]);
            DB::table('payroll_results')->whereNull('company_id')->update(['company_id' => $companyId]);
        }
    }

    public function down(): void
    {
        Schema::table('payroll_periods', function (Blueprint $table) {
            $table->dropIndex(['company_id', 'status']);
            $table->dropColumn('company_id');
        });

        Schema::table('payroll_results', function (Blueprint $table) {
            $table->dropIndex(['company_id', 'employee_id']);
            $table->dropColumn('company_id');
        });
    }
};
