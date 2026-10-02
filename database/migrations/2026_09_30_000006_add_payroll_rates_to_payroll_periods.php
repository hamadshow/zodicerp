<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Phase 6: explicit, optional payroll rate configuration per period.
     *
     * No business rules are invented: all rates default to NULL and the
     * calculation service treats NULL as "rule not configured" (0.00,
     * preserving current behavior). The company decides the amounts.
     */
    public function up(): void
    {
        Schema::table('payroll_periods', function (Blueprint $table) {
            $table->decimal('overtime_rate_per_hour', 15, 2)->nullable()->after('company_id');
            $table->decimal('absence_deduction_per_day', 15, 2)->nullable()->after('overtime_rate_per_hour');
            $table->decimal('late_deduction_per_incident', 15, 2)->nullable()->after('absence_deduction_per_day');
            $table->decimal('unpaid_leave_deduction_per_day', 15, 2)->nullable()->after('late_deduction_per_incident');
        });
    }

    public function down(): void
    {
        Schema::table('payroll_periods', function (Blueprint $table) {
            $table->dropColumn([
                'overtime_rate_per_hour',
                'absence_deduction_per_day',
                'late_deduction_per_incident',
                'unpaid_leave_deduction_per_day',
            ]);
        });
    }
};
