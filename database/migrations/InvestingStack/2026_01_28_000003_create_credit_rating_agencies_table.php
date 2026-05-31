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
        if (Schema::hasTable('credit_rating_agencies')) {
            Schema::dropIfExists('credit_rating_agencies');
        }

        Schema::create('credit_rating_agencies', function (Blueprint $table) {
            $table->id();

            // Identifiers
            $table->string('agency_code', 20)->unique();
            $table->string('global_identifier', 50)->nullable(); // e.g. NRSRO number
            $table->string('acronym', 20)->nullable()->index('idx_acronym');

            // Names
            $table->string('agency_name_ar', 200);
            $table->string('agency_name_en', 200);
            $table->string('legal_name_ar', 200)->nullable();
            $table->string('legal_name_en', 200)->nullable();

            // Classification
            $table->enum('agency_type', ['global', 'regional', 'national', 'specialized'])->default('global');
            $table->enum('recognition_status', ['recognized', 'registered', 'unregulated', 'blacklisted'])->default('recognized');
            $table->string('regulatory_authority', 200)->nullable();

            // Location
            $table->foreignId('location_id')->constrained('locations');
            $table->string('headquarters_address_ar', 500)->nullable();
            $table->string('headquarters_address_en', 500)->nullable();
            $table->integer('global_offices_count')->default(1);

            // Contact
            $table->string('phone', 50)->nullable();
            $table->string('fax', 50)->nullable();
            $table->string('email', 100)->nullable();
            $table->string('website', 500)->nullable();
            $table->string('media_contact', 200)->nullable();

            // People
            $table->string('ceo_name_ar', 200)->nullable();
            $table->string('ceo_name_en', 200)->nullable();
            $table->string('chairman_name_ar', 200)->nullable();
            $table->string('chairman_name_en', 200)->nullable();
            $table->string('head_of_ratings_ar', 200)->nullable();
            $table->string('head_of_ratings_en', 200)->nullable();

            // Licenses & Accreditation
            $table->json('licenses')->nullable(); // Licenses in various countries
            $table->json('jurisdictions')->nullable(); // Geographic jurisdictions allowed to rate
            $table->date('recognition_date')->nullable();
            $table->date('recognition_expiry')->nullable();

            // Rating Standards
            $table->json('rating_scales')->nullable(); // {AAA: {description_ar, description_en, probability_of_default}, ...}
            $table->text('rating_methodology')->nullable();
            $table->enum('surveillance_frequency', ['continuous', 'monthly', 'quarterly', 'semi_annual', 'annual'])->default('continuous');

            // Specialties
            $table->json('specialties')->nullable(); // [sovereign, corporate, financial_institutions, structured_finance, etc.]
            $table->json('coverage_countries')->nullable(); // Countries covered
            $table->json('sectors_covered')->nullable(); // Sectors covered

            // Statistics
            $table->integer('number_of_rated_entities')->default(0);
            $table->integer('number_of_rating_actions')->default(0);
            $table->decimal('market_share_percent', 5, 2)->nullable();

            // Governance
            $table->text('independence_statement')->nullable();
            $table->text('conflict_of_interest_policy')->nullable();
            $table->string('code_of_conduct_path', 500)->nullable();

            // Files
            $table->string('license_document_path', 500)->nullable();
            $table->string('recognition_certificate_path', 500)->nullable();
            $table->string('methodology_document_path', 500)->nullable();

            // Ratings
            $table->string('external_rating', 10)->nullable(); // Rating of the agency itself
            $table->integer('reliability_score')->nullable(); // 1-10
            $table->decimal('accuracy_rate', 5, 2)->nullable(); // Historical accuracy percentage

            // Status
            $table->enum('status', ['active', 'suspended', 'revoked', 'derecognized', 'inactive'])->default('active');
            $table->boolean('is_accepted')->default(true); // Accepted for use in the institution
            $table->boolean('is_default')->default(false);

            // System
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('approved_by')->nullable();
            $table->unsignedBigInteger('accepted_by')->nullable();
            $table->date('acceptance_date')->nullable();

            $table->timestamps();

            // Additional Indexes
            $table->index(['location_id', 'agency_type'], 'idx_location_type');
            $table->index('recognition_status', 'idx_recognition_status');
            $table->index('is_accepted', 'idx_is_accepted');
            $table->index(['status', 'is_accepted'], 'idx_status_active');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('credit_rating_agencies');
    }
};
