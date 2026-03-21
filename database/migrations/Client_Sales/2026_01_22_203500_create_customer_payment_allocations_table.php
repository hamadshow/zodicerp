<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customer_payment_allocations', function (Blueprint $table) {
            $table->charset = 'utf8mb4';
            $table->collation = 'utf8mb4_unicode_ci';
            $table->increments('id');
            $table->unsignedInteger('payment_id'); // Match customer_payments.id (increments)
            $table->unsignedBigInteger('invoice_id'); // Match sales_invoices.id (bigIncrements)
            $table->decimal('allocated_amount', 15, 2)->default(0);
            $table->decimal('base_allocated_amount', 15, 2)->nullable();
            $table->decimal('discount_given', 15, 2)->default(0);
            $table->text('notes')->nullable();
            $table->timestamps();

            // Foreign keys
            $table->foreign('payment_id')->references('id')->on('customer_payments')->onDelete('cascade');
            $table->foreign('invoice_id')->references('id')->on('sales_invoices');

            // Indexes
            $table->index('payment_id');
            $table->index('invoice_id');
            $table->unique(['payment_id', 'invoice_id'], 'unique_payment_invoice');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customer_payment_allocations');
    }
};
