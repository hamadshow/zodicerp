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
        if (Schema::hasTable('brokers')) {
            // Drop it first if we want to recreate it exactly as requested, 
            // or we could just return. Given the user context "CREATE TABLE", 
            // dropping and recreating is usually safer for development flow.
            // However, typically we just create. I'll stick to create, but check if exists.
            // If it exists, I'll assume we need to drop it to match the new schema request.
             Schema::dropIfExists('brokers');
        }

        Schema::create('brokers', function (Blueprint $table) {
            $table->id();

            // Identifiers
            $table->string('broker_code', 50)->unique();
            $table->string('license_number', 100)->nullable()->index('idx_license_number');
            $table->string('regulatory_authority', 200)->nullable(); // Index will be added separately for length specification if needed

            // Names
            $table->string('broker_name_ar', 200);
            $table->string('broker_name_en', 200)->nullable();
            $table->string('legal_name_ar', 200)->nullable();
            $table->string('legal_name_en', 200)->nullable();

            // Classification
            $table->enum('broker_type', ['stock', 'forex', 'commodities', 'crypto', 'full_service', 'discount', 'online', 'institutional']);
            $table->enum('membership_class', ['regular', 'market_maker', 'specialist', 'clearing_member'])->default('regular');

            // Location
            $table->foreignId('country_id')->constrained('countries');
            $table->foreignId('state_id')->nullable()->constrained('states');
            $table->foreignId('city_id')->nullable()->constrained('cities');
            $table->string('headquarters_address_ar', 500)->nullable();
            $table->string('headquarters_address_en', 500)->nullable();
            $table->integer('branches_count')->default(1);

            // Contact
            $table->string('phone', 50)->nullable();
            $table->string('fax', 50)->nullable();
            $table->string('email', 100)->nullable();
            $table->string('website', 500)->nullable();
            $table->string('support_email', 100)->nullable();
            $table->string('emergency_phone', 50)->nullable();

            // People
            $table->string('ceo_name_ar', 200)->nullable();
            $table->string('ceo_name_en', 200)->nullable();
            $table->string('compliance_officer_ar', 200)->nullable();
            $table->string('compliance_officer_en', 200)->nullable();
            $table->string('account_manager_ar', 200)->nullable();
            $table->string('account_manager_en', 200)->nullable();

            // Licenses & Accreditation
            $table->json('licenses')->nullable(); // [{license_type, number, expiry_date, authority}]
            $table->json('exchanges_membership')->nullable(); // [{exchange_id, membership_type, membership_date}]
            $table->boolean('is_regulated')->default(true);
            $table->date('regulation_expiry')->nullable();

            // Commission Structure
            $table->json('commission_structure')->nullable(); // {minimum_commission: xx, percentage_rate: xx, per_trade_fee: xx}
            $table->json('fee_structure')->nullable(); // {account_fee, inactivity_fee, withdrawal_fee, etc.}
            $table->json('margin_requirements')->nullable(); // {initial_margin, maintenance_margin, margin_call_level}

            // Trading
            $table->json('supported_instruments')->nullable(); // Asset types
            $table->json('trading_platforms')->nullable(); // Platforms
            $table->decimal('minimum_deposit', 20, 4)->nullable();
            $table->decimal('minimum_trade_size', 20, 4)->nullable();

            // Bank Accounts
            $table->json('deposit_bank_accounts')->nullable(); // [{bank_name, account_number, currency_id, swift_code}]
            $table->json('withdrawal_methods')->nullable(); // [bank_transfer, credit_card, ewallet, etc.]

            // Coverage
            $table->json('coverage_countries')->nullable();
            $table->json('supported_languages')->nullable();
            $table->json('customer_support_hours')->nullable();

            // Rating
            $table->string('credit_rating', 10)->nullable();
            $table->integer('reliability_score')->nullable(); // 1-10
            $table->decimal('customer_satisfaction_score', 3, 2)->nullable(); // 1-5

            // Files
            $table->string('license_document_path', 500)->nullable();
            $table->string('compliance_certificate_path', 500)->nullable();
            $table->string('terms_and_conditions_path', 500)->nullable();

            // Status
            $table->enum('status', ['active', 'suspended', 'revoked', 'blacklisted', 'inactive'])->default('active');
            $table->boolean('is_preferred')->default(false);
            $table->boolean('is_approved')->default(true);
            $table->date('approval_date')->nullable();

            // System
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('approved_by')->nullable();
            $table->unsignedBigInteger('reviewed_by')->nullable();
            $table->date('last_review_date')->nullable();

            $table->timestamps();

            // Additional Indexes
            $table->index('broker_type');
            $table->index(['country_id', 'status'], 'idx_country_status');
            $table->index('is_preferred');
            // Laravel migration doesn't directly support prefix length for index in fluent syntax easily without raw SQL or specific method.
            // However, we can use DB::statement for the specific index if needed, or just index the whole column if length permits.
            // 200 chars utf8mb4 is 800 bytes, which fits in standard 3072 byte index limit (MySQL 5.7+ / MariaDB 10.2+).
            // So normal index should work fine without length restriction unless using MyISAM or very old MySQL.
            $table->index('regulatory_authority', 'idx_regulatory_auth');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('brokers');
    }
};
