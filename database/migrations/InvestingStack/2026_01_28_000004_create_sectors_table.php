<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::disableForeignKeyConstraints();

        // Ensure dependency exists
        if (!Schema::hasTable('financial_instruments')) {
            Schema::create('financial_instruments', function (Blueprint $table) {
                $table->id();
                $table->string('name_ar')->nullable();
                $table->string('name_en')->nullable();
                $table->timestamps();
            });
        }

        // Drop existing sectors table (from dependencies migration) to recreate with full schema
        Schema::dropIfExists('sectors');

        Schema::create('sectors', function (Blueprint $table) {
            $table->id();

            // Identifiers
            $table->string('sector_code', 50)->unique();
            $table->string('gics_sector_code', 10)->nullable()->index('idx_gics_code');
            $table->string('trbc_sector_code', 10)->nullable();

            // Names
            $table->string('sector_name_ar', 200);
            $table->string('sector_name_en', 200);
            $table->text('description_ar')->nullable();
            $table->text('description_en')->nullable();

            // Classification
            $table->foreignId('parent_sector_id')->nullable()->constrained('sectors');
            $table->integer('level')->default(1);
            $table->string('path', 500)->nullable();

            // Indicators
            $table->foreignId('benchmark_index_id')->nullable()->constrained('financial_instruments');
            $table->decimal('average_pe_ratio', 10, 4)->nullable();
            $table->decimal('average_dividend_yield', 10, 4)->nullable();
            $table->enum('growth_outlook', ['high', 'medium', 'low'])->default('medium');

            // System
            $table->boolean('is_active')->default(true);
            $table->integer('display_order')->default(0);

            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamps();

            // Additional Indexes
            $table->index('sector_code', 'idx_sector_code');
            // path index with length
            $table->index(['level', DB::raw('path(255)')], 'idx_level_path');
        });

        Schema::enableForeignKeyConstraints();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::disableForeignKeyConstraints();
        Schema::dropIfExists('sectors');
        // We generally don't drop the dependency table created here as it might be used by others now, 
        // but strict down would remove it if it was created here. 
        // For safety in this dev flow, I'll leave financial_instruments.
        Schema::enableForeignKeyConstraints();
    }
};
