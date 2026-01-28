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

        Schema::dropIfExists('industries');

        Schema::create('industries', function (Blueprint $table) {
            $table->id();

            // Identifiers
            $table->string('industry_code', 50)->unique();
            $table->string('gics_industry_code', 10)->nullable();
            $table->string('trbc_industry_code', 10)->nullable();

            // Names
            $table->string('industry_name_ar', 200);
            $table->string('industry_name_en', 200);
            $table->text('description_ar')->nullable();
            $table->text('description_en')->nullable();

            // Classification
            $table->foreignId('sector_id')->constrained('sectors');
            $table->foreignId('parent_industry_id')->nullable()->constrained('industries');
            $table->integer('level')->default(2);
            $table->string('path', 500)->nullable();

            // Properties
            $table->enum('capital_intensity', ['high', 'medium', 'low'])->default('medium');
            $table->enum('cyclicality', ['cyclical', 'defensive', 'growth', 'speculative'])->default('cyclical');
            $table->enum('regulatory_environment', ['highly_regulated', 'moderately_regulated', 'lightly_regulated'])->default('moderately_regulated');

            // Indicators
            $table->decimal('average_profit_margin', 10, 4)->nullable();
            $table->decimal('average_roa', 10, 4)->nullable();
            $table->decimal('average_roe', 10, 4)->nullable();

            // System
            $table->boolean('is_active')->default(true);
            $table->integer('display_order')->default(0);

            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamps();

            // Indexes
            $table->index('industry_code', 'idx_industry_code');
            $table->index(['sector_id', 'industry_code'], 'idx_sector_industry');
            $table->index('gics_industry_code', 'idx_gics_industry');
            $table->index('parent_industry_id', 'idx_parent_industry');
        });

        Schema::enableForeignKeyConstraints();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::disableForeignKeyConstraints();
        Schema::dropIfExists('industries');
        Schema::enableForeignKeyConstraints();
    }
};
