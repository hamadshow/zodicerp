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
        if (!Schema::hasTable('budget_forecasts')) {
            Schema::create('budget_forecasts', function (Blueprint $table) {
                $table->id();
                $table->foreignId('budget_id')->constrained('budgets')->onDelete('cascade');
                $table->string('forecast_number', 50)->unique();

                // Basis
                $table->enum('forecast_type', ['revision', 'forecast', 'adjustment', 'transfer']);
                $table->text('revision_reason')->nullable();
                $table->foreignId('reference_budget_item_id')->nullable()->constrained('budget_items')->nullOnDelete();

                // Period
                $table->date('forecast_date');
                $table->date('effective_date');

                // Amounts
                $table->decimal('original_amount', 20, 4);
                $table->decimal('revised_amount', 20, 4);
                $table->decimal('difference_amount', 20, 4);
                $table->decimal('difference_percent', 10, 2)->nullable();

                // Status
                $table->enum('status', ['draft', 'pending_approval', 'approved', 'rejected', 'implemented'])->default('draft');

                // Approval
                $table->decimal('approved_amount', 20, 4)->nullable();
                
                if (Schema::hasTable('users')) {
                    $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
                    $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                    $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
                    $table->foreignId('implemented_by')->nullable()->constrained('users')->nullOnDelete();
                } else {
                    $table->unsignedBigInteger('approved_by')->nullable();
                    $table->unsignedBigInteger('created_by')->nullable();
                    $table->unsignedBigInteger('reviewed_by')->nullable();
                    $table->unsignedBigInteger('implemented_by')->nullable();
                }

                $table->date('approved_date')->nullable();
                $table->date('implemented_date')->nullable();

                $table->timestamps();
                $table->softDeletes();

                $table->index('status', 'idx_forecast_status');
                $table->index('forecast_date', 'idx_forecast_date');
                
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
        Schema::dropIfExists('budget_forecasts');
    }
};
