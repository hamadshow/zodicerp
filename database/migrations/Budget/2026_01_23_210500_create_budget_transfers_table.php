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
        if (!Schema::hasTable('budget_transfers')) {
            Schema::create('budget_transfers', function (Blueprint $table) {
                $table->id();
                $table->string('transfer_number', 50)->unique();
                $table->date('transfer_date');

                // From
                $table->foreignId('from_budget_id')->constrained('budgets');
                $table->foreignId('from_budget_item_id')->constrained('budget_items');
                $table->decimal('from_amount', 20, 4);

                // To
                $table->foreignId('to_budget_id')->constrained('budgets');
                $table->foreignId('to_budget_item_id')->constrained('budget_items');
                $table->decimal('to_amount', 20, 4);

                // Details
                $table->enum('transfer_type', ['internal', 'interdepartmental', 'supplemental']);
                $table->text('reason');
                $table->text('justification')->nullable();

                // Attachments
                $table->string('reference_document', 500)->nullable();
                $table->text('notes')->nullable();

                // Status
                $table->enum('status', ['draft', 'pending_approval', 'approved', 'rejected', 'completed'])->default('draft');

                // Approvals
                if (Schema::hasTable('users')) {
                    $table->foreignId('requested_by')->nullable()->constrained('users')->nullOnDelete();
                    $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
                    $table->foreignId('processed_by')->nullable()->constrained('users')->nullOnDelete();
                } else {
                    $table->unsignedBigInteger('requested_by')->nullable();
                    $table->unsignedBigInteger('approved_by')->nullable();
                    $table->unsignedBigInteger('processed_by')->nullable();
                }

                $table->date('approved_date')->nullable();
                $table->date('processed_date')->nullable();

                $table->timestamps();
                $table->softDeletes();

                $table->index('status', 'idx_transfer_status');
                $table->index('transfer_date', 'idx_transfer_date');
                
                $table->charset = 'utf8mb4';
                $table->collation = 'utf8mb4_unicode_ci';
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('budget_transfers');
    }
};
