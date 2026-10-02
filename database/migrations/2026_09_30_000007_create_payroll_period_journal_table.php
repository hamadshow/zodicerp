<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Links posted payroll periods to their accounting journal entries
     * (one journal per period posting). Enables idempotent posting and
     * traceable reversal via JournalReversalService.
     */
    public function up(): void
    {
        Schema::create('payroll_period_journal', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('payroll_period_id')->nullable();
            $table->unsignedBigInteger('journal_entry_id');
            $table->unsignedBigInteger('posted_by')->nullable();
            $table->timestamps();

            $table->unique('payroll_period_id', 'uq_payroll_period_journal');
            $table->index('journal_entry_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payroll_period_journal');
    }
};
