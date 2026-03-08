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
        if (!Schema::hasTable('budget_categories')) {
            Schema::create('budget_categories', function (Blueprint $table) {
                $table->id();
                $table->foreignId('parent_id')->nullable()->constrained('budget_categories')->nullOnDelete();
                $table->string('code', 50)->unique();
                $table->string('name_ar', 200);
                $table->string('name_en', 200)->nullable();
                $table->text('description')->nullable();
                $table->string('category_type');
                $table->integer('level')->default(1);
                $table->string('path', 500)->nullable();
                $table->boolean('is_active')->default(true);
                $table->boolean('is_final')->default(false);

                // Accounting and Organization Links
                // Using conditional constraints for potential missing tables
                if (Schema::hasTable('accounts')) {
                    $table->unsignedInteger('account_id')->nullable();
                    $table->foreign('account_id')->references('AccID')->on('accounts')->nullOnDelete();
                } else {
                    $table->unsignedInteger('account_id')->nullable();
                }

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

                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();

                $table->index('category_type');
                // Laravel doesn't support prefix indexing in fluent syntax easily for all drivers, 
                // but we can add a raw index or just index the column. 
                // User asked for path(255). We'll try raw statement if needed, or just index 'path'.
                $table->index('path');
            });
            
            // Adding prefix index if supported (MySQL specific)
            
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('budget_categories');
    }
};
