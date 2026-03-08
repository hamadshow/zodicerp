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
        if (!Schema::hasTable('budget_items')) {
            Schema::create('budget_items', function (Blueprint $table) {
                $table->id();
                $table->foreignId('budget_id')->constrained('budgets')->onDelete('cascade');
                $table->foreignId('category_id')->constrained('budget_categories');
                
                if (Schema::hasTable('accounts')) {
                    $table->unsignedInteger('account_id');
                    $table->foreign('account_id')->references('AccID')->on('accounts');
                } else {
                    $table->unsignedInteger('account_id');
                }

                // Allocation
                $table->enum('period_type', ['monthly', 'quarterly', 'yearly', 'custom'])->default('monthly');

                // Annual Amounts
                $table->decimal('annual_amount', 20, 4);
                $table->decimal('annual_actual', 20, 4)->default(0);
                $table->decimal('annual_variance', 20, 4)->default(0);
                $table->decimal('annual_variance_percent', 10, 2)->default(0);

                // Monthly Allocation
                $table->decimal('jan_amount', 20, 4)->default(0);
                $table->decimal('feb_amount', 20, 4)->default(0);
                $table->decimal('mar_amount', 20, 4)->default(0);
                $table->decimal('apr_amount', 20, 4)->default(0);
                $table->decimal('may_amount', 20, 4)->default(0);
                $table->decimal('jun_amount', 20, 4)->default(0);
                $table->decimal('jul_amount', 20, 4)->default(0);
                $table->decimal('aug_amount', 20, 4)->default(0);
                $table->decimal('sep_amount', 20, 4)->default(0);
                $table->decimal('oct_amount', 20, 4)->default(0);
                $table->decimal('nov_amount', 20, 4)->default(0);
                $table->decimal('dec_amount', 20, 4)->default(0);

                // Monthly Actuals
                $table->decimal('jan_actual', 20, 4)->default(0);
                $table->decimal('feb_actual', 20, 4)->default(0);
                $table->decimal('mar_actual', 20, 4)->default(0);
                $table->decimal('apr_actual', 20, 4)->default(0);
                $table->decimal('may_actual', 20, 4)->default(0);
                $table->decimal('jun_actual', 20, 4)->default(0);
                $table->decimal('jul_actual', 20, 4)->default(0);
                $table->decimal('aug_actual', 20, 4)->default(0);
                $table->decimal('sep_actual', 20, 4)->default(0);
                $table->decimal('oct_actual', 20, 4)->default(0);
                $table->decimal('nov_actual', 20, 4)->default(0);
                $table->decimal('dec_actual', 20, 4)->default(0);

                // Analysis
                $table->enum('calculation_method', ['fixed', 'formula', 'historical', 'percentage'])->default('fixed');
                $table->text('calculation_formula')->nullable();
                $table->decimal('basis_amount', 20, 4)->nullable();
                $table->decimal('percentage_rate', 10, 2)->nullable();

                // Taxes
                if (Schema::hasTable('taxes')) {
                    $table->foreignId('tax_id')->nullable()->constrained('taxes')->nullOnDelete();
                } else {
                    $table->unsignedBigInteger('tax_id')->nullable();
                }
                $table->boolean('tax_included')->default(false);
                $table->decimal('tax_amount', 20, 4)->default(0);

                // Details
                $table->text('notes')->nullable();
                $table->text('assumptions')->nullable();

                // System
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();

                $table->unique(['budget_id', 'account_id', 'category_id'], 'unique_budget_account');
                $table->index(['budget_id', 'period_type']);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('budget_items');
    }
};
