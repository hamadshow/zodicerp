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
        Schema::create('sales_invoices', function (Blueprint $table) {
            $table->id();
            $table->string('invoice_number', 50)->unique();

            $table->unsignedInteger('customer_id');
            $table->foreign('customer_id')->references('id')->on('customers');

            $table->foreignId('order_id')->nullable()->constrained('sales_orders');
            $table->foreignId('quotation_id')->nullable()->constrained('sales_quotations');

            $table->foreignId('currency_id')->constrained('currencies');
            $table->decimal('exchange_rate', 15, 6)->default(1.000000);

            $table->date('invoice_date');
            $table->date('due_date')->nullable();
            $table->date('posting_date')->nullable();

            $table->unsignedInteger('price_list_id')->nullable();
            $table->foreign('price_list_id')->references('id')->on('price_lists');

            $table->foreignId('warehouse_id')->constrained('warehouses');

            $table->decimal('subtotal', 15, 2)->default(0);
            $table->decimal('discount_amount', 15, 2)->default(0);
            $table->decimal('tax_amount', 15, 2)->default(0);
            $table->decimal('shipping_cost', 15, 2)->default(0);
            $table->decimal('other_charges', 15, 2)->default(0);
            $table->decimal('total_amount', 15, 2)->default(0);

            // Generated columns
            $table->decimal('base_total', 15, 2)->storedAs('total_amount * exchange_rate');

            $table->decimal('paid_amount', 15, 2)->default(0);
            $table->decimal('base_paid', 15, 2)->storedAs('paid_amount * exchange_rate');
            $table->decimal('balance_amount', 15, 2)->storedAs('total_amount - paid_amount');

            $table->enum('payment_status', ['unpaid', 'partial', 'paid', 'overdue'])->default('unpaid');
            $table->enum('invoice_type', ['standard', 'proforma', 'credit_note', 'debit_note'])->default('standard');

            $table->unsignedInteger('sales_agent_id')->nullable();
            $table->foreign('sales_agent_id')->references('id')->on('sales_agents');

            $table->unsignedInteger('shipping_address_id')->nullable();
            $table->foreign('shipping_address_id')->references('id')->on('customer_addresses');

            $table->string('payment_terms', 255)->nullable();
            $table->string('delivery_terms', 255)->nullable();
            $table->text('customer_notes')->nullable();
            $table->text('internal_notes')->nullable();

            $table->boolean('is_posted')->default(false);
            $table->timestamp('posted_at')->nullable();
            $table->unsignedBigInteger('posted_by')->nullable();

            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->charset = 'utf8mb4';
            $table->collation = 'utf8mb4_unicode_ci';

            $table->index('invoice_number', 'idx_sales_invoices_number');
            $table->index('invoice_date', 'idx_sales_invoices_date');
            $table->index('payment_status', 'idx_sales_invoices_status');
            $table->index('customer_id', 'idx_sales_invoices_customer');
            $table->index('due_date', 'idx_sales_invoices_due_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sales_invoices');
    }
};
