<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::disableForeignKeyConstraints();
        if (Schema::hasTable('stock_movements_details')) {
            Schema::drop('stock_movements_details');
        }
        if (Schema::hasTable('stock_movements')) {
            Schema::drop('stock_movements');
        }
        Schema::enableForeignKeyConstraints();

        Schema::create('stock_movements', function (Blueprint $table) {
            $table->bigIncrements('id');
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
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('company_id', 'stock_movements_company_id_fk')
                ->references('id')->on('company')
                ->cascadeOnDelete();

            $table->foreign('from_warehouse_id', 'stock_movements_from_warehouse_id_fk')
                ->references('id')->on('warehouses')
                ->nullOnDelete();

            $table->foreign('to_warehouse_id', 'stock_movements_to_warehouse_id_fk')
                ->references('id')->on('warehouses')
                ->nullOnDelete();

            $table->foreign('warehouse_id', 'stock_movements_warehouse_id_fk')
                ->references('id')->on('warehouses')
                ->nullOnDelete();
        });

        Schema::create('stock_movements_details', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('stock_movement_id')->index();
            $table->unsignedBigInteger('product_id')->index();
            $table->unsignedBigInteger('unit_id')->index();
            $table->decimal('quantity', 15, 3);
            $table->decimal('cost_price', 15, 3)->default(0);
            $table->timestamps();

            $table->foreign('stock_movement_id', 'stock_movements_details_stock_movement_id_fk')
                ->references('id')->on('stock_movements')
                ->cascadeOnDelete();

            $table->foreign('product_id', 'stock_movements_details_product_id_fk')
                ->references('id')->on('products')
                ->restrictOnDelete();

            $table->foreign('unit_id', 'stock_movements_details_unit_id_fk')
                ->references('id')->on('item_units')
                ->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::disableForeignKeyConstraints();
        Schema::dropIfExists('stock_movements_details');
        Schema::dropIfExists('stock_movements');
        Schema::enableForeignKeyConstraints();
    }
};
