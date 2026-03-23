<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('opening_stocks', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->date('movement_date')->nullable();
            $table->unsignedBigInteger('warehouse_id')->index();
            $table->unsignedBigInteger('company_id')->index();
            $table->unsignedBigInteger('created_by')->nullable()->index();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('warehouse_id', 'opening_stocks_warehouse_id_fk')
                ->references('id')->on('warehouses')
                ->restrictOnDelete();

            $table->foreign('company_id', 'opening_stocks_company_id_fk')
                ->references('id')->on('company')
                ->cascadeOnDelete();

            $table->foreign('created_by', 'opening_stocks_created_by_fk')
                ->references('id')->on('users')
                ->nullOnDelete();
        });

        Schema::create('opening_stock_items', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('opening_stock_id')->index();
            $table->unsignedBigInteger('product_id')->index();
            $table->unsignedBigInteger('unit_id')->index();
            $table->decimal('quantity', 15, 3);
            $table->decimal('cost_price', 15, 3)->default(0);
            $table->timestamps();

            $table->foreign('opening_stock_id', 'opening_stock_items_opening_stock_id_fk')
                ->references('id')->on('opening_stocks')
                ->cascadeOnDelete();

            $table->foreign('product_id', 'opening_stock_items_product_id_fk')
                ->references('id')->on('products')
                ->restrictOnDelete();

            $table->foreign('unit_id', 'opening_stock_items_unit_id_fk')
                ->references('id')->on('item_units')
                ->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::disableForeignKeyConstraints();
        Schema::dropIfExists('opening_stock_items');
        Schema::dropIfExists('opening_stocks');
        Schema::enableForeignKeyConstraints();
    }
};
