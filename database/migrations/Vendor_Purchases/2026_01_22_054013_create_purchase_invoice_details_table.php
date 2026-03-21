<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('purchase_invoice_details', function (Blueprint $table) {
            $table->charset = 'utf8mb4';
            $table->collation = 'utf8mb4_unicode_ci';

            $table->id();

            // invoice_id REFERENCES purchase_invoices(id) ON DELETE CASCADE
            $table->foreignId('invoice_id')->constrained('purchase_invoices')->onDelete('cascade');

            // product_id REFERENCES products(id)
            $table->foreignId('product_id')->constrained('products');

            // warehouse_id REFERENCES warehouses(id)
            $table->foreignId('warehouse_id')->constrained('warehouses');

            $table->decimal('quantity', 12, 4)->default(0);
            $table->decimal('received_quantity', 12, 4)->default(0)->nullable();

            // pending_quantity GENERATED ALWAYS AS (quantity - received_quantity) STORED
            $table->decimal('pending_quantity', 12, 4)->storedAs('quantity - received_quantity');

            // unit_id REFERENCES item_units(id) (User said units, but table is item_units)
            $table->foreignId('unit_id')->constrained('item_units');

            $table->decimal('unit_price', 15, 4)->default(0);
            $table->decimal('discount_percentage', 5, 2)->default(0)->nullable();
            $table->decimal('discount_amount', 15, 2)->default(0)->nullable();
            $table->decimal('tax_percentage', 5, 2)->default(0)->nullable();
            $table->decimal('tax_amount', 15, 2)->default(0)->nullable();

            // line_total GENERATED ALWAYS AS ((quantity * unit_price) - discount_amount + tax_amount) STORED
            $table->decimal('line_total', 15, 2)->storedAs('(quantity * unit_price) - discount_amount + tax_amount');

            $table->decimal('base_line_total', 15, 2)->nullable(); // Calculated via trigger/logic

            $table->string('batch_number', 100)->nullable();
            $table->string('serial_number', 100)->nullable();
            $table->date('expiry_date')->nullable();
            $table->date('production_date')->nullable();
            $table->string('shelf_location', 50)->nullable();

            $table->json('attribute_data')->nullable();
            $table->text('notes')->nullable();

            $table->timestamps();
            $table->softDeletes();

            // Indexes
            $table->index('invoice_id', 'idx_invoice_details_invoice');
            $table->index('product_id', 'idx_invoice_details_product');
            $table->index('batch_number', 'idx_invoice_details_batch');
            $table->index('expiry_date', 'idx_invoice_details_expiry');
        });

        // Add table comment
        try {
            DB::statement("ALTER TABLE purchase_invoice_details COMMENT = 'تفاصيل بنود فواتير الشراء'");
        } catch (\Exception $e) {
            // Ignore if driver doesn't support it
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('purchase_invoice_details');
    }
};
