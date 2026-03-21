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
        Schema::create('tax_payments', function (Blueprint $table) {
            $table->id(); // BigInt by default in Laravel, compatible with INT PK requirement conceptually
            $table->string('payment_number', 100)->unique();

            // Foreign Keys - using unsignedBigInteger to match referenced tables which use id()
            $table->unsignedBigInteger('tax_return_id')->nullable();

            // Payment Details
            $table->date('payment_date');
            $table->enum('payment_method', ['bank_transfer', 'cheque', 'cash', 'credit_card', 'online']);
            $table->decimal('payment_amount', 20, 4);
            $table->unsignedBigInteger('currency_id');
            $table->decimal('exchange_rate', 20, 6)->default(1);

            // Bank Reference
            $table->unsignedBigInteger('bank_account_id')->nullable();
            $table->string('reference_number', 100)->nullable();
            $table->string('transaction_id', 200)->nullable();

            // Status
            $table->enum('status', ['pending', 'processing', 'completed', 'failed', 'reversed'])->default('pending');
            $table->date('clearance_date')->nullable();

            // Charges
            $table->decimal('bank_charges', 20, 4)->default(0);
            $table->decimal('late_fees', 20, 4)->default(0);
            $table->decimal('interest_amount', 20, 4)->default(0);

            // System
            $table->unsignedBigInteger('payment_by')->nullable();
            $table->unsignedBigInteger('verified_by')->nullable();
            $table->date('verified_date')->nullable();

            $table->timestamps();

            // Constraints
            $table->foreign('tax_return_id')->references('id')->on('tax_returns');
            $table->foreign('currency_id')->references('id')->on('currencies');
            $table->foreign('bank_account_id')->references('id')->on('bank_accounts');

            // Indexes
            $table->index('payment_date', 'idx_payment_date');
            $table->index('status', 'idx_payment_status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tax_payments');
    }
};
