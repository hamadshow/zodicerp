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
        Schema::create('sales_order_details', function (Blueprint $table) {
            $table->id();

            $table->foreignId('order_id')->constrained('sales_orders')->onDelete('cascade');
            $table->foreignId('product_id')->constrained('products');

            $table->decimal('quantity', 12, 4)->default(0);
            $table->decimal('delivered_quantity', 12, 4)->default(0);

            // Generated column
            $table->decimal('pending_quantity', 12, 4)->storedAs('quantity - delivered_quantity');

            $table->foreignId('unit_id')->constrained('item_units');

            $table->decimal('unit_price', 15, 4);
            $table->decimal('discount_percentage', 5, 2)->default(0);
            $table->decimal('discount_amount', 15, 2)->default(0);

            $table->unsignedBigInteger('tax_id')->nullable();
            $table->decimal('tax_amount', 15, 2)->default(0);

            // Generated column
            $table->decimal('line_total', 15, 2)->storedAs('(quantity * unit_price) - discount_amount + tax_amount');

            $table->date('requested_delivery_date')->nullable();
            $table->text('notes')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->charset = 'utf8mb4';
            $table->collation = 'utf8mb4_unicode_ci';

            $table->index('order_id', 'idx_order_details_order');
            $table->index('product_id', 'idx_order_details_product');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sales_order_details');
    }
};
