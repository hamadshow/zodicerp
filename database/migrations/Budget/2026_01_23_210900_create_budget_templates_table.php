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
        Schema::create('budget_templates', function (Blueprint $table) {
            $table->id();
            $table->string('template_code', 50)->unique();
            $table->string('template_name_ar', 200);
            $table->string('template_name_en', 200)->nullable();
            $table->text('description')->nullable();

            // Classification
            $table->enum('template_type', ['department', 'project', 'product', 'service', 'general']);
            $table->string('industry_type', 100)->nullable();

            // Structure
            $table->json('category_structure')->nullable();
            $table->json('default_percentages')->nullable();
            $table->json('calculation_rules')->nullable();

            // Attachments
            $table->string('documentation_path', 500)->nullable();
            $table->string('sample_file_path', 500)->nullable();

            // System
            $table->boolean('is_active')->default(true);
            $table->boolean('is_system_template')->default(false);

            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();

            $table->timestamps();
            $table->softDeletes();

            // Indexes
            $table->index('template_type', 'idx_template_type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('budget_templates');
    }
};
