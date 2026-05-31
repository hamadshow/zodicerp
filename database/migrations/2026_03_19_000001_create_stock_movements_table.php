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
        Schema::create('inventory_movement_headers', function (Blueprint $table) {
            $table->id();
            $table->date('movement_date')->nullable();
            $table->enum('type', ['opening', 'purchase', 'sale', 'sale_return', 'purchase_return', 'adjustment', 'transfer'])->index();
            $table->enum('direction', ['in', 'out'])->index();
            $table->unsignedBigInteger('reference_id')->nullable();
            $table->string('reference_type', 50)->nullable()->index();
            $table->string('voucher_num', 50)->nullable();
            $table->unsignedBigInteger('warehouse_id')->nullable()->index();
            $table->unsignedBigInteger('from_warehouse_id')->nullable()->index();
            $table->unsignedBigInteger('to_warehouse_id')->nullable()->index();
            $table->unsignedBigInteger('company_id')->index();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('company_id')->references('id')->on('company')->cascadeOnDelete();
            $table->foreign('warehouse_id')->references('id')->on('warehouses')->nullOnDelete();
            $table->foreign('from_warehouse_id')->references('id')->on('warehouses')->nullOnDelete();
            $table->foreign('to_warehouse_id')->references('id')->on('warehouses')->nullOnDelete();
        });

        Schema::create('inventory_movement_lines', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('stock_movement_id')->index();
            $table->unsignedBigInteger('product_id')->index();
            $table->unsignedBigInteger('unit_id')->index();
            $table->decimal('quantity', 15, 3);
            $table->decimal('cost_price', 15, 3)->default(0);
            $table->timestamps();

            $table->foreign('stock_movement_id')->references('id')->on('inventory_movement_headers')->cascadeOnDelete();
            $table->foreign('product_id')->references('id')->on('products')->restrictOnDelete();
            $table->foreign('unit_id')->references('id')->on('item_units')->restrictOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('inventory_movement_lines');
        Schema::dropIfExists('inventory_movement_headers');
    }
};
