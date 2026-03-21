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
        Schema::create('sales_orders', function (Blueprint $table) {
            $table->id();
            $table->string('order_number', 50)->unique();

            $table->unsignedInteger('customer_id');
            $table->foreign('customer_id')->references('id')->on('customers');

            $table->foreignId('quotation_id')->nullable()->constrained('sales_quotations');

            $table->foreignId('currency_id')->constrained('currencies');
            $table->decimal('exchange_rate', 15, 6)->default(1.000000);

            $table->date('order_date');
            $table->date('delivery_date')->nullable();
            $table->date('actual_delivery_date')->nullable();

            $table->unsignedInteger('price_list_id')->nullable();
            $table->foreign('price_list_id')->references('id')->on('price_lists');

            $table->foreignId('warehouse_id')->constrained('warehouses');

            $table->decimal('subtotal', 15, 2)->default(0);
            $table->decimal('discount_amount', 15, 2)->default(0);
            $table->decimal('tax_amount', 15, 2)->default(0);
            $table->decimal('shipping_cost', 15, 2)->default(0);
            $table->decimal('total_amount', 15, 2)->default(0);

            // Generated column
            $table->decimal('base_total', 15, 2)->storedAs('total_amount * exchange_rate');

            $table->decimal('advance_payment', 15, 2)->default(0);

            $table->enum('status', ['draft', 'pending', 'confirmed', 'processing', 'ready_for_delivery', 'partially_delivered', 'completed', 'cancelled'])->default('draft');

            $table->unsignedInteger('sales_agent_id')->nullable();
            $table->foreign('sales_agent_id')->references('id')->on('sales_agents');

            $table->enum('priority', ['low', 'normal', 'high', 'urgent'])->default('normal');
            $table->string('shipping_method', 100)->nullable();

            // Fixed: customer_addresses uses increments (unsignedInteger)
            $table->unsignedInteger('shipping_address_id')->nullable();
            $table->foreign('shipping_address_id')->references('id')->on('customer_addresses');

            $table->string('payment_terms', 255)->nullable();
            $table->text('customer_notes')->nullable();
            $table->text('internal_notes')->nullable();

            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('confirmed_by')->nullable();
            $table->timestamp('confirmed_at')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->charset = 'utf8mb4';
            $table->collation = 'utf8mb4_unicode_ci';

            $table->index('order_number', 'idx_sales_orders_number');
            $table->index('order_date', 'idx_sales_orders_date');
            $table->index('status', 'idx_sales_orders_status');
            $table->index('customer_id', 'idx_sales_orders_customer');
            $table->index('delivery_date', 'idx_sales_orders_delivery');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sales_orders');
    }
};
