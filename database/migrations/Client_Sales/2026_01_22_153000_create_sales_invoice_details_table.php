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
        Schema::create('sales_invoice_details', function (Blueprint $table) {
            $table->id();

            $table->foreignId('invoice_id')->constrained('sales_invoices')->onDelete('cascade');
            $table->foreignId('order_detail_id')->nullable()->constrained('sales_order_details');
            $table->foreignId('product_id')->constrained('products');
            $table->foreignId('warehouse_id')->constrained('warehouses');

            $table->decimal('quantity', 12, 4)->default(0);
            $table->decimal('delivered_quantity', 12, 4)->default(0);

            $table->foreignId('unit_id')->constrained('item_units');

            $table->decimal('unit_price', 15, 4);
            $table->decimal('discount_percentage', 5, 2)->default(0);
            $table->decimal('discount_amount', 15, 2)->default(0);

            $table->unsignedBigInteger('tax_id')->nullable();
            $table->decimal('tax_amount', 15, 2)->default(0);

            // Generated column
            $table->decimal('line_total', 15, 2)->storedAs('(quantity * unit_price) - discount_amount + tax_amount');

            $table->decimal('base_line_total', 15, 2)->nullable();

            $table->string('batch_number', 100)->nullable();
            $table->string('serial_number', 100)->nullable();
            $table->date('expiry_date')->nullable();
            $table->string('shelf_location', 50)->nullable();
            $table->json('attribute_data')->nullable();
            $table->text('notes')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->charset = 'utf8mb4';
            $table->collation = 'utf8mb4_unicode_ci';

            $table->index('invoice_id', 'idx_invoice_details_invoice');
            $table->index('product_id', 'idx_invoice_details_product');
            $table->index('batch_number', 'idx_invoice_details_batch');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sales_invoice_details');
    }
};
