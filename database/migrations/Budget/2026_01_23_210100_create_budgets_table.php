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
        if (! Schema::hasTable('budgets')) {
            Schema::create('budgets', function (Blueprint $table) {
                $table->id();
                $table->string('budget_number', 50)->unique();
                $table->string('budget_name_ar', 200);
                $table->string('budget_name_en', 200)->nullable();
                $table->text('description')->nullable();

                // Time Scope
                $table->enum('budget_type', ['annual', 'quarterly', 'monthly', 'project', 'rolling']);
                $table->integer('fiscal_year');
                $table->date('start_date');
                $table->date('end_date');

                // Organizational Scope
                $table->enum('scope_type', ['company', 'department', 'project', 'cost_center', 'branch']);

                if (Schema::hasTable('departments')) {
                    $table->foreignId('department_id')->nullable()->constrained('departments')->nullOnDelete();
                } else {
                    $table->unsignedBigInteger('department_id')->nullable();
                }

                if (Schema::hasTable('projects')) {
                    $table->foreignId('project_id')->nullable()->constrained('projects')->nullOnDelete();
                } else {
                    $table->unsignedBigInteger('project_id')->nullable();
                }

                if (Schema::hasTable('cost_centers')) {
                    $table->foreignId('cost_center_id')->nullable()->constrained('cost_centers')->nullOnDelete();
                } else {
                    $table->unsignedBigInteger('cost_center_id')->nullable();
                }

                if (Schema::hasTable('branches')) {
                    $table->foreignId('branch_id')->nullable()->constrained('branches')->nullOnDelete();
                } else {
                    $table->unsignedBigInteger('branch_id')->nullable();
                }

                // Currency
                if (Schema::hasTable('currencies')) {
                    $table->foreignId('currency_id')->constrained('currencies');
                } else {
                    $table->unsignedBigInteger('currency_id');
                }
                $table->decimal('exchange_rate', 20, 6)->default(1);

                // Status
                $table->enum('status', ['draft', 'under_review', 'approved', 'active', 'closed', 'archived'])->default('draft');
                $table->integer('version')->default(1);
                $table->boolean('is_current')->default(false);
                $table->boolean('is_template')->default(false);

                // Totals
                $table->decimal('total_revenue', 20, 4)->default(0);
                $table->decimal('total_expense', 20, 4)->default(0);
                $table->decimal('total_capital', 20, 4)->default(0);
                $table->decimal('net_surplus_deficit', 20, 4)->default(0);

                // Controls
                $table->decimal('variance_threshold', 5, 2)->default(10.00);
                $table->boolean('allow_over_budget')->default(false);
                $table->boolean('require_approval_over_budget')->default(true);

                // Documentation
                $table->string('reference_document', 500)->nullable();
                $table->text('notes')->nullable();

                // System
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
                $table->date('approved_date')->nullable();
                $table->foreignId('closed_by')->nullable()->constrained('users')->nullOnDelete();
                $table->date('closed_date')->nullable();

                $table->timestamps();

                $table->index('fiscal_year');
                $table->index('status');
                $table->index(['start_date', 'end_date'], 'idx_dates');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('budgets');
    }
};
