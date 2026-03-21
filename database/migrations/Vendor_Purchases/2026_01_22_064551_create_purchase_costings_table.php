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
        Schema::create('purchase_costings', function (Blueprint $table) {
            $table->charset = 'utf8mb4';
            $table->collation = 'utf8mb4_unicode_ci';

            $table->id();
            $table->foreignId('product_id')->constrained('products');
            $table->foreignId('warehouse_id')->nullable()->constrained('warehouses');
            $table->date('purchase_date');
            $table->foreignId('invoice_detail_id')->nullable()->constrained('purchase_invoice_details');
            $table->decimal('quantity', 12, 4);
            $table->foreignId('unit_id')->constrained('item_units'); // Assuming item_units based on existing model
            $table->decimal('purchase_price', 15, 4);
            $table->decimal('landed_cost_per_unit', 15, 4)->default(0);
            $table->decimal('additional_costs', 15, 4)->default(0);

            // Generated columns
            // total_unit_cost = purchase_price + landed_cost_per_unit + additional_costs
            $table->decimal('total_unit_cost', 15, 4)->storedAs('purchase_price + landed_cost_per_unit + additional_costs');

            // total_cost = quantity * total_unit_cost
            // Note: In some MySQL versions, you might need to repeat the expression if referring to another generated column isn't supported directly in the definition order,
            // but usually it works if defined after. To be safe and portable, we can repeat the expression or just try referring.
            // However, referencing generated column is supported in MySQL 5.7.6+. Assuming modern MySQL.
            $table->decimal('total_cost', 15, 2)->storedAs('quantity * (purchase_price + landed_cost_per_unit + additional_costs)');

            $table->decimal('average_cost', 15, 4)->nullable();
            $table->enum('costing_method', ['fifo', 'lifo', 'weighted_average', 'specific_identification'])->default('weighted_average');
            $table->string('batch_number', 100)->nullable();
            $table->date('expiry_date')->nullable();
            $table->boolean('is_allocated')->default(false);
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes(); // Requested

            $table->index('product_id', 'idx_purchase_costing_product');
            $table->index('purchase_date', 'idx_purchase_costing_date');
            $table->index('batch_number', 'idx_purchase_costing_batch');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('purchase_costings');
    }
};
