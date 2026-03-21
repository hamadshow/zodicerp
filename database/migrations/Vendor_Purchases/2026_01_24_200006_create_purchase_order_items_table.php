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
        if (! Schema::hasTable('purchase_order_items')) {
            Schema::create('purchase_order_items', function (Blueprint $table) {
                $table->id();

                // Relationships
                $table->foreignId('purchase_order_id')->constrained('purchase_orders')->cascadeOnDelete();
                $table->foreignId('quotation_item_id')->nullable()->constrained('purchase_quotation_items')->nullOnDelete();

                // Sequence & Type
                $table->integer('line_number');
                $table->enum('item_type', ['product', 'service', 'expense', 'asset'])->default('product');

                // Item Reference
                $table->foreignId('product_id')->nullable()->constrained('products')->nullOnDelete();
                $table->unsignedBigInteger('service_id')->nullable();

                // Details
                $table->string('item_code', 100)->nullable();
                $table->string('item_name_ar');
                $table->string('item_name_en')->nullable();
                $table->text('description_ar')->nullable();
                $table->text('description_en')->nullable();

                // Quantities
                $table->decimal('ordered_quantity', 15, 4)->default(0.0000);
                $table->decimal('received_quantity', 15, 4)->default(0.0000);
                // Generated: pending = ordered - received
                $table->decimal('pending_quantity', 15, 4)->storedAs('ordered_quantity - received_quantity');

                $table->foreignId('unit_id')->nullable()->constrained('item_units')->nullOnDelete();

                // Pricing
                $table->decimal('unit_price', 15, 4)->default(0.0000);
                $table->decimal('discount_percent', 5, 2)->default(0.00);
                $table->decimal('discount_amount', 15, 4)->default(0.0000); // Per unit

                // Generated: net_price = unit_price - discount_amount
                $table->decimal('net_price', 15, 4)->storedAs('unit_price - discount_amount');

                // Generated: line_total = ordered_quantity * net_price
                $table->decimal('line_total', 15, 2)->storedAs('ordered_quantity * (unit_price - discount_amount)');

                // Tax
                $table->foreignId('tax_id')->nullable()->constrained('taxes')->nullOnDelete();
                $table->decimal('tax_percent', 5, 2)->default(0.00);

                // Generated: tax_total = line_total * tax_percent / 100
                $table->decimal('tax_total', 15, 2)->storedAs('(ordered_quantity * (unit_price - discount_amount)) * tax_percent / 100');

                // Logistics
                $table->date('required_date')->nullable();
                $table->date('promised_delivery_date')->nullable();

                // Cost Allocation
                $table->foreignId('warehouse_id')->nullable()->constrained('warehouses')->nullOnDelete();
                $table->unsignedBigInteger('cost_center_id')->nullable();
                $table->unsignedBigInteger('project_id')->nullable();

                $table->text('notes')->nullable();

                $table->timestamps();
                $table->softDeletes();

                // Indexes
                $table->index('purchase_order_id');
                $table->index('quotation_item_id');
                $table->index('product_id');
                $table->index('warehouse_id');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('purchase_order_items');
    }
};
