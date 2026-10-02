<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Leave balances (Phase 5.3) — minimal structure.
     * One row per employee per leave type per year:
     * entitlement days granted, consumed via approved vacations.
     * No labor-law defaults are invented; entitlement must be set explicitly.
     */
    public function up(): void
    {
        Schema::create('vacation_balances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('employees')->onDelete('cascade');
            $table->enum('leave_type', ['annual', 'sick', 'maternity', 'unpaid']);
            $table->unsignedSmallInteger('year');
            $table->decimal('entitlement_days', 6, 1)->default(0);
            $table->unsignedBigInteger('company_id')->nullable();
            $table->timestamps();

            $table->unique(['employee_id', 'leave_type', 'year'], 'uq_vacation_balance');
            $table->index(['company_id', 'year']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vacation_balances');
    }
};
