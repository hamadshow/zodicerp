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
        // Drop if exists to ensure fresh schema matching user request
        Schema::dropIfExists('companies_shares');

        Schema::create('companies_shares', function (Blueprint $table) {
            $table->id();

            // Identifiers
            $table->string('company_code', 50)->unique();
            $table->string('tax_id', 50)->nullable()->index('idx_tax_id');
            $table->string('commercial_registration', 100)->nullable()->index('idx_commercial_reg');
            $table->enum('legal_form', ['llc', 'joint_stock', 'partnership', 'sole_proprietorship', 'branch', 'subsidiary', 'government', 'non_profit'])->default('llc');

            // Names
            $table->string('legal_name_ar', 200);
            $table->string('legal_name_en', 200)->nullable();
            $table->string('trade_name_ar', 200)->nullable();
            $table->string('trade_name_en', 200)->nullable();

            // Classification
            $table->foreignId('industry_id')->nullable()->constrained('industries');
            $table->foreignId('sub_industry_id')->nullable()->constrained('sub_industries');
            $table->enum('company_size', ['micro', 'small', 'medium', 'large', 'enterprise'])->default('medium');

            // Location
            $table->foreignId('location_id')->constrained('locations');
            $table->string('address_ar', 500)->nullable();
            $table->string('address_en', 500)->nullable();

            // Contact
            $table->string('phone', 50)->nullable();
            $table->string('email', 100)->nullable();
            $table->string('website', 500)->nullable();

            // People
            $table->string('ceo_name_ar', 200)->nullable();
            $table->string('ceo_name_en', 200)->nullable();
            $table->string('chairman_name_ar', 200)->nullable();
            $table->string('chairman_name_en', 200)->nullable();

            // Financial Info
            $table->foreignId('reporting_currency_id')->nullable()->constrained('currencies');
            $table->decimal('paid_up_capital', 20, 4)->nullable();
            $table->decimal('authorized_capital', 20, 4)->nullable();
            $table->decimal('annual_revenue', 20, 4)->nullable();

            // Exchange & Listing
            $table->foreignId('exchange_id')->nullable()->constrained('exchanges');
            $table->string('ticker_symbol', 20)->nullable();
            $table->string('isin_code', 20)->nullable();
            $table->date('ipo_date')->nullable();
            $table->decimal('market_cap', 20, 4)->nullable();

            // Credit Rating
            $table->foreignId('credit_rating_id')->nullable()->constrained('credit_ratings');
            $table->integer('credit_score')->nullable();
            $table->enum('rating_outlook', ['positive', 'stable', 'negative', 'watch'])->default('stable');

            // Status
            $table->enum('status', ['active', 'inactive', 'suspended', 'bankrupt', 'dissolved'])->default('active');

            // Description
            $table->text('description')->nullable();
            $table->text('notes')->nullable();
            $table->enum('internal_rating', ['A', 'B', 'C', 'D'])->default('B');

            // System
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->date('verified_at')->nullable();
            $table->unsignedBigInteger('verified_by')->nullable();

            $table->timestamps();

            // Indexes
            $table->index(['status', 'company_size'], 'idx_status_size');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('companies_shares');
    }
};
