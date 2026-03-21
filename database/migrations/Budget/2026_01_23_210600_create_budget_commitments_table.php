<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('budget_commitments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('budget_id')->constrained('budgets');
            $table->foreignId('budget_item_id')->constrained('budget_items');

            // Reference
            $table->enum('reference_type', ['purchase_order', 'contract', 'invoice', 'requisition']);
            $table->unsignedBigInteger('reference_id');
            $table->string('reference_number', 100)->nullable();

            // Amounts
            $table->decimal('committed_amount', 20, 4);
            $table->decimal('utilized_amount', 20, 4)->default(0);
            $table->decimal('remaining_amount', 20, 4);

            // Period
            $table->date('commitment_date');
            $table->date('expected_expense_date')->nullable();
            $table->date('expiry_date')->nullable();

            // Status
            $table->enum('status', ['active', 'partially_utilized', 'fully_utilized', 'expired', 'cancelled'])->default('active');

            // Details
            $table->text('description')->nullable();
            $table->unsignedBigInteger('vendor_id')->nullable();

            // System
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            // Indexes
            $table->index('status', 'idx_commitment_status');
            $table->index(['reference_type', 'reference_id'], 'idx_reference');

            // Conditional Foreign Keys
            if (Schema::hasTable('vendors')) {
                $table->foreign('vendor_id')->references('id')->on('vendors');
            } elseif (Schema::hasTable('suppliers')) {
                $table->foreign('vendor_id')->references('id')->on('suppliers');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('budget_commitments');
    }
};
