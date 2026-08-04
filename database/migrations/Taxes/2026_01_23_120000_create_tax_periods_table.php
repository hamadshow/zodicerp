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
        Schema::create('tax_periods', function (Blueprint $table) {
            $table->id();
            $table->string('period_code', 50)->unique();

            // Scope
            $table->foreignId('country_id')->constrained('locations');

            $table->foreignId('tax_type_id')->constrained('tax_types');

            // Period
            $table->enum('period_type', ['monthly', 'quarterly', 'semi_annual', 'annual', 'custom']);
            $table->integer('period_year');
            $table->integer('period_number')->nullable();
            $table->string('period_name_ar', 100);
            $table->string('period_name_en', 100)->nullable();

            // Dates
            $table->date('start_date');
            $table->date('end_date');
            $table->date('due_date');
            $table->date('filing_deadline');

            // Status
            $table->enum('status', ['open', 'closed', 'locked', 'extended'])->default('open');
            $table->boolean('is_extended')->default(false);
            $table->integer('extension_days')->default(0);

            // System
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('closed_by')->nullable();
            $table->date('closed_date')->nullable();

            $table->timestamps();

            // Constraints and Indexes
            $table->unique(['country_id', 'tax_type_id', 'period_year', 'period_number'], 'unique_tax_period');
            $table->index(['start_date', 'end_date'], 'idx_period_dates');
            $table->index('due_date', 'idx_due_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tax_periods');
    }
};
