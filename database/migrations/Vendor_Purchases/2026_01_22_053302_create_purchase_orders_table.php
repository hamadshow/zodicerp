<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('purchase_orders', function (Blueprint $table) {
            $table->charset = 'utf8mb4';
            $table->collation = 'utf8mb4_unicode_ci';

            $table->id();
            $table->string('order_number', 50)->unique();
            
            // supplier_id REFERENCES suppliers(id)
            $table->foreignId('supplier_id')->constrained('suppliers');
            
            // quotation_id REFERENCES purchase_quotations(id)
            $table->foreignId('quotation_id')->nullable()->constrained('purchase_quotations');
            
            // currency_id REFERENCES currencies(id)
            $table->foreignId('currency_id')->constrained('currencies');
            
            $table->decimal('exchange_rate', 15, 6)->default(1.000000);
            $table->date('order_date');
            $table->date('expected_delivery_date')->nullable();
            $table->date('actual_delivery_date')->nullable();
            
            // warehouse_id REFERENCES warehouses(id)
            $table->foreignId('warehouse_id')->constrained('warehouses');
            
            $table->decimal('subtotal', 15, 2)->default(0);
            $table->decimal('discount_amount', 15, 2)->default(0)->nullable();
            $table->decimal('tax_amount', 15, 2)->default(0)->nullable();
            $table->decimal('shipping_cost', 15, 2)->default(0)->nullable();
            $table->decimal('total_amount', 15, 2)->default(0);
            
            // base_total GENERATED ALWAYS AS (total_amount * exchange_rate) STORED
            $table->decimal('base_total', 15, 2)->storedAs('total_amount * exchange_rate');
            
            $table->decimal('advance_payment', 15, 2)->default(0)->nullable();
            
            $table->enum('status', ['draft', 'pending', 'approved', 'partially_received', 'completed', 'cancelled', 'closed'])->default('draft');
            $table->enum('priority', ['low', 'normal', 'high', 'urgent'])->default('normal');
            
            $table->string('shipping_method', 100)->nullable();
            $table->string('shipping_terms', 255)->nullable();
            $table->string('payment_terms', 255)->nullable();
            
            $table->text('notes')->nullable();
            $table->text('internal_notes')->nullable();
            
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('approved_by')->nullable();
            $table->timestamp('approved_at')->nullable();
            
            $table->timestamps();
            $table->softDeletes();
            
            // Indexes
            $table->index('order_number', 'idx_orders_number');
            $table->index('order_date', 'idx_orders_date');
            $table->index('status', 'idx_orders_status');
            $table->index('supplier_id', 'idx_orders_supplier');
            $table->index('warehouse_id', 'idx_orders_warehouse');
        });

        // Add table comment
        try {
            DB::statement("ALTER TABLE purchase_orders COMMENT = 'أوامر الشراء للموردين'");
        } catch (\Exception $e) {
            // Ignore if driver doesn't support it
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('purchase_orders');
    }
};
