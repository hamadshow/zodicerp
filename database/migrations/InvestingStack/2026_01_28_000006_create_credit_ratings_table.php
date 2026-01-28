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

        Schema::dropIfExists('credit_ratings');

        Schema::create('credit_ratings', function (Blueprint $table) {
            $table->id();

            // Identifiers
            $table->foreignId('rating_agency_id')->constrained('credit_rating_agencies');
            $table->string('rating_scale', 20); // e.g. "Long Term", "Short Term", "Financial Strength"

            // Rating
            $table->string('rating_symbol', 10); // e.g. AAA, AA+, B-, etc.
            $table->string('rating_description_ar', 200);
            $table->string('rating_description_en', 200);

            // Interpretation
            $table->enum('risk_level', ['minimal', 'low', 'moderate', 'high', 'substantial', 'default'])->default('moderate');
            $table->boolean('investment_grade')->default(true);
            $table->enum('outlook', ['positive', 'stable', 'negative', 'developing', 'n.m.'])->default('stable');

            // Probabilities
            $table->decimal('probability_of_default', 10, 8)->nullable(); // Probability of default
            $table->decimal('expected_loss_given_default', 10, 4)->nullable();
            $table->decimal('recovery_rate', 10, 4)->nullable();

            // Analytics
            $table->integer('financial_strength_score')->nullable(); // 1-100
            $table->integer('business_risk_score')->nullable(); // 1-100
            $table->integer('industry_position_score')->nullable(); // 1-100

            // Equivalents
            $table->string('equivalent_moody_rating', 10)->nullable();
            $table->string('equivalent_sp_rating', 10)->nullable();
            $table->string('equivalent_fitch_rating', 10)->nullable();

            // System
            $table->date('effective_date');
            $table->date('expiry_date')->nullable();
            $table->boolean('is_active')->default(true);
            $table->boolean('is_default_scale')->default(false);

            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamps();

            // Indexes & Unique Constraints
            $table->unique(['rating_agency_id', 'rating_scale', 'rating_symbol'], 'unique_agency_rating');
            $table->index('rating_symbol', 'idx_rating_symbol');
            $table->index('investment_grade', 'idx_investment_grade');
            $table->index('risk_level', 'idx_risk_level');
            $table->index(['effective_date', 'expiry_date'], 'idx_effective_date');
        });

        Schema::enableForeignKeyConstraints();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::disableForeignKeyConstraints();
        Schema::dropIfExists('credit_ratings');
        Schema::enableForeignKeyConstraints();
    }
};
