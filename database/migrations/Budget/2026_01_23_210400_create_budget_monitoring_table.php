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
        if (!Schema::hasTable('budget_monitoring')) {
            Schema::create('budget_monitoring', function (Blueprint $table) {
                $table->id();
                $table->foreignId('budget_id')->constrained('budgets')->onDelete('cascade');
                $table->foreignId('budget_item_id')->constrained('budget_items')->onDelete('cascade');
                $table->date('monitoring_date');

                // Actual Values
                $table->decimal('actual_amount', 20, 4);
                $table->decimal('committed_amount', 20, 4)->default(0);
                $table->decimal('encumbered_amount', 20, 4)->default(0);
                $table->decimal('available_amount', 20, 4);

                // Analysis
                $table->enum('period_type', ['monthly', 'quarterly', 'year_to_date', 'full_year']);
                $table->integer('period_month')->nullable();
                $table->integer('period_quarter')->nullable();
                $table->integer('period_year')->nullable();

                // Variances
                $table->decimal('variance_amount', 20, 4);
                $table->decimal('variance_percent', 10, 2);
                $table->enum('variance_status', ['favorable', 'unfavorable', 'neutral']);

                // Alerts
                $table->boolean('threshold_breached')->default(false);
                $table->enum('alert_level', ['low', 'medium', 'high', 'critical'])->default('low');

                // Comments
                $table->text('comments')->nullable();
                $table->text('action_required')->nullable();
                $table->date('follow_up_date')->nullable();

                // System
                if (Schema::hasTable('users')) {
                    $table->foreignId('monitored_by')->nullable()->constrained('users')->nullOnDelete();
                    $table->foreignId('acknowledged_by')->nullable()->constrained('users')->nullOnDelete();
                } else {
                    $table->unsignedBigInteger('monitored_by')->nullable();
                    $table->unsignedBigInteger('acknowledged_by')->nullable();
                }
                
                $table->date('acknowledged_date')->nullable();

                $table->timestamps();
                $table->softDeletes();

                $table->unique(['budget_item_id', 'monitoring_date', 'period_type'], 'unique_monitoring');
                $table->index('monitoring_date', 'idx_monitoring_date');
                $table->index('variance_status', 'idx_variance_status');
                
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
        Schema::dropIfExists('budget_monitoring');
    }
};
