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
        Schema::create('budget_reports', function (Blueprint $table) {
            $table->id();
            $table->string('report_number', 50)->unique();
            $table->string('report_name_ar', 200);
            $table->string('report_name_en', 200)->nullable();
            
            // Scope
            $table->enum('report_type', ['variance', 'performance', 'forecast', 'consolidation', 'custom']);
            $table->foreignId('budget_id')->nullable()->constrained('budgets');
            $table->foreignId('department_id')->nullable()->constrained('departments');
            $table->unsignedBigInteger('project_id')->nullable();
            
            // Period
            $table->date('report_date');
            $table->date('period_start')->nullable();
            $table->date('period_end')->nullable();
            
            // Format
            $table->enum('report_format', ['summary', 'detailed', 'comparative', 'graphical'])->default('summary');
            $table->boolean('include_details')->default(true);
            $table->boolean('include_comments')->default(true);
            $table->boolean('include_recommendations')->default(true);
            
            // Files
            $table->string('file_path', 500)->nullable();
            $table->integer('file_size')->nullable();
            $table->string('generated_file_name', 255)->nullable();
            
            // System
            $table->foreignId('generated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            
            $table->timestamps();
            $table->timestamp('generated_at')->nullable();
            
            // Indexes
            $table->index('report_type', 'idx_report_type');
            $table->index('report_date', 'idx_report_date');
            
            // Conditional Foreign Key
            if (Schema::hasTable('projects')) {
                $table->foreign('project_id')->references('id')->on('projects');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('budget_reports');
    }
};
