<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('salary_receipts', function (Blueprint $table): void {
            $table->foreignId('payroll_result_id')
                ->nullable()
                ->after('employee_id')
                ->constrained('payroll_results')
                ->nullOnDelete();
            $table->unique('payroll_result_id');
        });
    }

    public function down(): void
    {
        Schema::table('salary_receipts', function (Blueprint $table): void {
            $table->dropUnique(['payroll_result_id']);
            $table->dropForeign(['payroll_result_id']);
            $table->dropColumn('payroll_result_id');
        });
    }
};
