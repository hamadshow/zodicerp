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
        Schema::create('tax_settlements', function (Blueprint $table) {
            $table->id();
            $table->string('settlement_number', 100)->unique();

            $table->unsignedBigInteger('tax_period_id');
            $table->unsignedBigInteger('entity_id');

            // Settlement Info
            $table->date('settlement_date');
            $table->enum('settlement_type', ['payment', 'refund', 'adjustment', 'carry_forward']);

            // Amounts
            $table->decimal('tax_due', 20, 4);
            $table->decimal('tax_paid', 20, 4);
            $table->decimal('tax_refundable', 20, 4)->default(0);
            $table->decimal('carry_forward_amount', 20, 4)->default(0);

            // Detailed Taxes
            $table->decimal('vat_payable', 20, 4)->default(0);
            $table->decimal('vat_recoverable', 20, 4)->default(0);
            $table->decimal('net_vat', 20, 4)->default(0);
            $table->decimal('withholding_tax', 20, 4)->default(0);

            // Status
            $table->enum('status', ['calculated', 'reviewed', 'approved', 'settled'])->default('calculated');

            // System
            $table->unsignedBigInteger('calculated_by')->nullable();
            $table->unsignedBigInteger('reviewed_by')->nullable();
            $table->unsignedBigInteger('approved_by')->nullable();

            $table->timestamps();

            // Foreign Keys
            $table->foreign('tax_period_id')->references('id')->on('tax_periods');

            // Entity FK (companies or company_infos)
            if (Schema::hasTable('companies_shares')) {
                $table->foreign('entity_id')->references('id')->on('companies_shares');
            } elseif (Schema::hasTable('companies')) {
                $table->foreign('entity_id')->references('id')->on('companies');
            } elseif (Schema::hasTable('company_infos')) {
                $table->foreign('entity_id')->references('id')->on('company_infos');
            }

            // Indexes
            $table->index('settlement_date', 'idx_settlement_date');
            $table->index('settlement_type', 'idx_settlement_type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tax_settlements');
    }
};
