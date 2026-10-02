<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Attendance uniqueness (Phase 4.2).
     *
     * Pre-checked live data: 0 duplicate (employee_id, date) groups across
     * 13,200 rows, so the unique index is safe to apply without any data
     * resolution step. The non-unique employee_id index is dropped because
     * the new unique index's leftmost column (employee_id) fully covers it.
     */
    public function up(): void
    {
        Schema::table('attendances', function (Blueprint $table) {
            // MySQL refuses to drop an index that backs a live foreign key
            // (error 1553). Drop the FK constraint first, then the redundant
            // single-column index it created.
            $table->dropForeign('attendances_employee_id_foreign');
            $table->dropIndex('attendances_employee_id_foreign');
            $table->unique(['employee_id', 'date'], 'uq_attendances_employee_date');
        });
    }

    public function down(): void
    {
        Schema::table('attendances', function (Blueprint $table) {
            $table->dropUnique('uq_attendances_employee_date');
            $table->index('employee_id', 'attendances_employee_id_foreign');
            $table->foreign('employee_id')->references('id')->on('employees')->cascadeOnDelete();
        });
    }
};
