<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customer_payments', function (Blueprint $table) {
            $table->charset = 'utf8mb4';
            $table->collation = 'utf8mb4_unicode_ci';
            $table->increments('id');
            $table->string('payment_number', 50)->unique();
            $table->unsignedInteger('customer_id'); // Match customers.id (increments)
            $table->unsignedBigInteger('currency_id'); // Match currencies.id (bigint unsigned)
            $table->decimal('exchange_rate', 15, 6)->default(1.000000);
            $table->date('payment_date');
            $table->enum('payment_method', ['cash', 'check', 'credit_card', 'bank_transfer', 'credit_note', 'other']);
            $table->decimal('amount', 15, 2)->default(0);
            $table->decimal('base_amount', 15, 2)->storedAs('amount * exchange_rate');
            $table->enum('payment_type', ['invoice_payment', 'advance_payment', 'credit_payment', 'adjustment'])->default('invoice_payment');
            $table->unsignedBigInteger('bank_account_id')->nullable(); // Match bank_accounts.id (bigint unsigned)
            $table->string('check_number', 50)->nullable();
            $table->date('check_date')->nullable();
            $table->date('check_due_date')->nullable();
            $table->string('credit_card_last_four', 4)->nullable();
            $table->string('credit_card_type', 50)->nullable();
            $table->string('transaction_id', 100)->nullable();
            $table->string('reference_number', 100)->nullable();
            $table->text('description')->nullable();
            $table->enum('status', ['draft', 'posted', 'reconciled', 'cancelled', 'bounced'])->default('draft');
            $table->boolean('is_posted')->default(false);
            $table->timestamp('posted_at')->nullable();
            $table->integer('posted_by')->nullable();
            $table->timestamp('reconciled_at')->nullable();
            $table->integer('reconciled_by')->nullable();
            $table->text('customer_notes')->nullable();
            $table->text('internal_notes')->nullable();
            $table->integer('created_by')->nullable();
            $table->timestamps();

            // Foreign keys
            $table->foreign('customer_id')->references('id')->on('customers');
            $table->foreign('currency_id')->references('id')->on('currencies');
            $table->foreign('bank_account_id')->references('id')->on('bank_accounts');

            // Indexes
            $table->index('payment_number');
            $table->index('payment_date');
            $table->index('customer_id');
            $table->index('payment_method');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customer_payments');
    }
};
