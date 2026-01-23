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
        Schema::create('taxes', function (Blueprint $table) {
            $table->id();
            
            // Foreign key to tax_types
            $table->foreignId('tax_type_id')->constrained('tax_types')->onDelete('cascade');
            
            // Identifiers
            $table->string('tax_code', 50)->unique();
            $table->string('name_ar', 200);
            $table->string('name_en', 200);
            $table->text('description_ar')->nullable();
            $table->text('description_en')->nullable();
            
            // Geographic Application
            $table->foreignId('country_id')->constrained('countries')->onDelete('cascade');
            
            // state_id: check if states table exists, otherwise just integer
            if (Schema::hasTable('states')) {
                $table->foreignId('state_id')->nullable()->constrained('states')->nullOnDelete();
            } else {
                $table->unsignedBigInteger('state_id')->nullable();
            }
            
            // city_id: check if cities table exists
            if (Schema::hasTable('cities')) {
                $table->foreignId('city_id')->nullable()->constrained('cities')->nullOnDelete();
            } else {
                $table->unsignedBigInteger('city_id')->nullable();
            }
            
            $table->string('jurisdiction_code', 100)->nullable();
            
            // Tax Rate
            $table->decimal('tax_rate', 10, 4); // Percentage
            $table->decimal('tax_amount', 20, 4)->nullable(); // Fixed amount
            $table->enum('calculation_method', ['percentage', 'fixed', 'tiered', 'formula'])->default('percentage');
            
            // Tax Calculation
            $table->enum('calculation_basis', ['exclusive', 'inclusive', 'mixed'])->default('exclusive');
            $table->enum('rounding_method', ['normal', 'up', 'down', 'commercial'])->default('normal');
            $table->integer('rounding_precision')->default(2);
            
            // Tax Limits
            $table->decimal('minimum_amount', 20, 4)->nullable();
            $table->decimal('maximum_amount', 20, 4)->nullable();
            $table->decimal('threshold_amount', 20, 4)->nullable();
            
            // Recovery and Withholding
            $table->decimal('recoverable_percentage', 5, 2)->default(100.00);
            $table->decimal('withholding_rate', 10, 4)->nullable();
            
            // Accounting Coding
            // Using accounts(AccID) based on project context (integer increments)
            // User requested references to chart_of_accounts(id), mapped to accounts(AccID)
            $table->integer('tax_account_id'); 
            $table->integer('expense_account_id')->nullable();
            $table->integer('payable_account_id')->nullable();
            $table->integer('receivable_account_id')->nullable();
            
            // Status
            $table->boolean('is_active')->default(true);
            $table->boolean('is_default')->default(false);
            
            // Dates
            $table->date('effective_from');
            $table->date('effective_to')->nullable();
            
            // System
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamps();
            
            // Foreign Keys for Accounts
            // Checking if accounts table exists to avoid migration errors
            if (Schema::hasTable('accounts')) {
                $table->foreign('tax_account_id')->references('AccID')->on('accounts');
                $table->foreign('expense_account_id')->references('AccID')->on('accounts');
                $table->foreign('payable_account_id')->references('AccID')->on('accounts');
                $table->foreign('receivable_account_id')->references('AccID')->on('accounts');
            }

            // Indexes
            $table->index('tax_code', 'idx_tax_code');
            $table->index(['country_id', 'state_id'], 'idx_country_state');
            $table->index(['effective_from', 'effective_to'], 'idx_effective_dates');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('taxes');
    }
};
