<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Phase 10: minimal employee contracts (audit: module absent entirely).
     * One active contract per employee is enforced at the application layer
     * via status handling; expiry tracking via end_date + computed status.
     */
    public function up(): void
    {
        Schema::create('employee_contracts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('employees')->onDelete('cascade');
            $table->string('contract_type', 50)->default('full_time');
            $table->date('start_date');
            $table->date('end_date')->nullable();
            $table->decimal('salary', 15, 2)->nullable();
            $table->enum('status', ['active', 'expired', 'terminated'])->default('active');
            $table->text('notes')->nullable();
            $table->unsignedBigInteger('company_id')->nullable();
            $table->timestamps();

            $table->index(['company_id', 'status']);
            $table->index('end_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('employee_contracts');
    }
};
