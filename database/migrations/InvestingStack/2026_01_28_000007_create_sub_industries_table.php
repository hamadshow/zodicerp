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
        Schema::disableForeignKeyConstraints();

        Schema::dropIfExists('sub_industries');

        Schema::create('sub_industries', function (Blueprint $table) {
            $table->id();

            // Identifiers
            $table->string('sub_industry_code', 50)->unique();
            $table->string('gics_sub_industry_code', 10)->nullable();
            $table->string('trbc_sub_industry_code', 10)->nullable();

            // Names
            $table->string('sub_industry_name_ar', 200);
            $table->string('sub_industry_name_en', 200);
            $table->text('description_ar')->nullable();
            $table->text('description_en')->nullable();

            // Classification
            $table->foreignId('industry_id')->constrained('industries');
            $table->foreignId('parent_sub_industry_id')->nullable()->constrained('sub_industries');
            $table->integer('level')->default(3);
            $table->string('path', 500)->nullable();

            // Properties
            $table->decimal('growth_rate', 10, 4)->nullable();
            $table->decimal('market_size', 20, 4)->nullable();
            $table->enum('competitive_intensity', ['high', 'medium', 'low'])->default('medium');
            $table->enum('technology_intensity', ['high_tech', 'medium_tech', 'low_tech'])->default('medium_tech');

            // Indicators
            $table->decimal('average_market_share_concentration', 10, 4)->nullable();
            $table->decimal('average_innovation_rate', 10, 4)->nullable();
            $table->enum('average_customer_switching_costs', ['high', 'medium', 'low'])->default('medium');

            // System
            $table->boolean('is_active')->default(true);
            $table->integer('display_order')->default(0);

            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamps();

            // Indexes
            $table->index('sub_industry_code', 'idx_sub_industry_code');
            $table->index(['industry_id', 'sub_industry_code'], 'idx_industry_sub');
            $table->index('gics_sub_industry_code', 'idx_gics_sub');
            $table->index('parent_sub_industry_id', 'idx_parent_sub');
        });

        Schema::enableForeignKeyConstraints();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::disableForeignKeyConstraints();
        Schema::dropIfExists('sub_industries');
        Schema::enableForeignKeyConstraints();
    }
};
