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
        Schema::create('tax_withholdings', function (Blueprint $table) {
            $table->id();
            $table->string('withholding_code', 100)->unique();
            
            // Country
            $table->foreignId('country_id')->constrained('countries');
            
            // Information
            $table->string('name_ar', 200);
            $table->string('name_en', 200);
            $table->text('description')->nullable();
            
            // Rates
            $table->decimal('withholding_rate', 10, 4);
            $table->enum('withholding_type', ['percentage', 'fixed', 'tiered'])->default('percentage');
            $table->json('tier_details')->nullable();
            
            // Application
            $table->enum('apply_to', ['payments', 'invoices', 'salaries', 'contracts', 'all']);
            $table->decimal('minimum_amount', 20, 4)->nullable();
            $table->decimal('maximum_amount', 20, 4)->nullable();
            
            // Accounts
            // User requested FOREIGN KEY to chart_of_accounts(id). 
            // In this system, the main accounts table is 'accounts' with PK 'AccID'.
            $table->unsignedInteger('withholding_account_id');
            $table->unsignedInteger('payable_account_id');
            
            // System
            $table->boolean('is_active')->default(true);
            $table->date('effective_from');
            $table->date('effective_to')->nullable();
            
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamps();
            
            // Foreign Keys
            if (Schema::hasTable('accounts')) {
                $table->foreign('withholding_account_id')->references('AccID')->on('accounts');
                $table->foreign('payable_account_id')->references('AccID')->on('accounts');
            }
            
            // Indexes
            $table->index(['country_id', 'is_active'], 'idx_country_active');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tax_withholdings');
    }
};
