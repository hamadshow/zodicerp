<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * End-of-service records (Phase 9).
     *
     * NOTE ON LEGAL FORMULAS: the indemnity `amount` is intentionally a
     * user-entered value. No labor-law calculation is implemented because
     * no authoritative rule set exists in the project. A future phase can
     * add a calculator once the business defines the rules.
     */
    public function up(): void
    {
        Schema::create('end_of_service_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('employees')->onDelete('cascade');
            $table->enum('type', ['resignation', 'termination', 'contract_end', 'retirement']);
            $table->date('date');
            $table->text('reason')->nullable();
            $table->decimal('amount', 15, 2)->default(0);
            $table->enum('status', ['pending', 'processed', 'cancelled'])->default('pending');
            $table->unsignedBigInteger('company_id')->nullable();
            $table->timestamps();

            $table->index(['company_id', 'status']);
            $table->index('employee_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('end_of_service_records');
    }
};
