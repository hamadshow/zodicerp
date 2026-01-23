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
        Schema::create('budget_approvals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('budget_id')->constrained('budgets');
            $table->enum('approval_type', ['budget', 'transfer', 'forecast', 'over_budget']);
            $table->unsignedBigInteger('reference_id')->nullable();
            
            // Process
            $table->integer('approval_stage')->default(1);
            $table->integer('total_stages')->default(1);
            $table->integer('sequence_number')->default(1);
            
            // Approval
            $table->foreignId('approver_id')->constrained('users');
            $table->date('approval_date')->nullable();
            $table->enum('approval_status', ['pending', 'approved', 'rejected', 'delegated'])->default('pending');
            $table->text('approval_notes')->nullable();
            
            // Conditions
            $table->decimal('minimum_amount', 20, 4)->nullable();
            $table->decimal('maximum_amount', 20, 4)->nullable();
            
            // System
            $table->date('due_date')->nullable();
            $table->boolean('is_mandatory')->default(true);
            $table->boolean('is_completed')->default(false);
            
            $table->timestamps();
            $table->softDeletes();
            
            // Indexes
            $table->index('approval_status', 'idx_approval_status');
            $table->index(['approval_type', 'reference_id'], 'idx_approval_type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('budget_approvals');
    }
};
