<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customer_opening_balances', function (Blueprint $table) {
            $table->charset = 'utf8mb4';
            $table->collation = 'utf8mb4_unicode_ci';

            $table->increments('id');
            $table->unsignedInteger('customer_id'); // Matches customers.id (increments)
            $table->integer('financial_year');
            $table->date('opening_date');
            $table->unsignedBigInteger('currency_id'); // Matches currencies.id (bigInt)
            $table->decimal('exchange_rate', 15, 6);
            $table->decimal('debit_amount', 15, 2)->default(0);
            $table->decimal('credit_amount', 15, 2)->default(0);

            // Generated columns
            $table->decimal('base_debit_amount', 15, 2)->storedAs('debit_amount * exchange_rate');
            $table->decimal('base_credit_amount', 15, 2)->storedAs('credit_amount * exchange_rate');
            $table->decimal('net_balance', 15, 2)->storedAs('debit_amount - credit_amount');

            $table->text('notes')->nullable();

            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('approved_by')->nullable();
            $table->timestamp('approved_at')->nullable();

            $table->timestamps();
            $table->softDeletes();

            // Foreign Keys
            $table->foreign('customer_id')->references('id')->on('customers')->onDelete('cascade');
            $table->foreign('currency_id')->references('id')->on('currencies');

            // Indexes
            $table->index('customer_id', 'idx_customer_opening_balances_customer');
            $table->index('financial_year', 'idx_customer_opening_balances_year');

            // Unique Key
            $table->unique(['customer_id', 'financial_year'], 'unique_customer_year');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customer_opening_balances');
    }
};
