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
        // 1. Sectors
        if (! Schema::hasTable('sectors')) {
            Schema::create('sectors', function (Blueprint $table) {
                $table->id();
                $table->string('name_ar');
                $table->string('name_en')->nullable();
                $table->timestamps();
            });
        }

        // 2. Industries
        if (! Schema::hasTable('industries')) {
            Schema::create('industries', function (Blueprint $table) {
                $table->id();
                $table->string('name_ar');
                $table->string('name_en')->nullable();
                $table->foreignId('sector_id')->nullable()->constrained('sectors')->nullOnDelete();
                $table->timestamps();
            });
        }

        // 3. Sub-industries
        if (! Schema::hasTable('sub_industries')) {
            Schema::create('sub_industries', function (Blueprint $table) {
                $table->id();
                $table->string('name_ar');
                $table->string('name_en')->nullable();
                $table->foreignId('industry_id')->nullable()->constrained('industries')->nullOnDelete();
                $table->timestamps();
            });
        }


        // 5. Exchanges (Stock Exchanges)
        if (! Schema::hasTable('exchanges')) {
            Schema::create('exchanges', function (Blueprint $table) {
                $table->id();
                $table->string('name_ar');
                $table->string('name_en')->nullable();
                $table->string('code')->nullable();
                $table->string('country')->nullable();
                $table->timestamps();
            });
        }

        // 6. Credit Ratings
        if (! Schema::hasTable('credit_ratings')) {
            Schema::create('credit_ratings', function (Blueprint $table) {
                $table->id();
                $table->string('agency_name');
                $table->string('rating_code'); // AAA, AA+, etc.
                $table->string('description')->nullable();
                $table->integer('score_value')->nullable(); // For numeric comparison
                $table->timestamps();
            });
        }

        // 7. Payment Terms
        if (! Schema::hasTable('payment_terms')) {
            Schema::create('payment_terms', function (Blueprint $table) {
                $table->id();
                $table->string('name_ar');
                $table->string('name_en')->nullable();
                $table->integer('days')->default(0);
                $table->timestamps();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payment_terms');
        Schema::dropIfExists('credit_ratings');
        Schema::dropIfExists('exchanges');
        Schema::dropIfExists('states');
        Schema::dropIfExists('sub_industries');
        Schema::dropIfExists('industries');
        Schema::dropIfExists('sectors');
    }
};
