<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('stock_movements')) {
            return;
        }

        Schema::create('stock_movements', function (Blueprint $table) {
            $table->bigIncrements('id');

            $table->unsignedBigInteger('product_id');
            $table->unsignedBigInteger('unit_id');

            $table->enum('type', [
                'opening',
                'purchase',
                'sale',
                'sale_return',
                'purchase_return',
                'adjustment',
                'transfer',
            ]);

            $table->decimal('quantity', 15, 3);
            $table->decimal('cost_price', 15, 3)->default(0);
            $table->enum('direction', ['in', 'out']);

            $table->unsignedBigInteger('reference_id')->nullable();
            $table->string('reference_type', 50)->nullable();

            $table->unsignedBigInteger('warehouse_id')->nullable();
            $table->unsignedBigInteger('to_warehouse_id')->nullable();

            $table->string('batch_no', 100)->nullable();
            $table->date('expiry_date')->nullable();

            $table->unsignedBigInteger('company_id');

            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('product_id', 'idx_product');
            $table->index('company_id', 'idx_company');

            $table->foreign('product_id')->references('id')->on('products')->cascadeOnDelete();
            $table->foreign('unit_id')->references('id')->on('item_units')->restrictOnDelete();
            $table->foreign('warehouse_id')->references('id')->on('warehouses')->nullOnDelete();
            $table->foreign('to_warehouse_id')->references('id')->on('warehouses')->nullOnDelete();

            if (Schema::hasTable('company')) {
                $table->foreign('company_id')->references('id')->on('company')->cascadeOnDelete();
            } elseif (Schema::hasTable('companies_shares')) {
                $table->foreign('company_id')->references('id')->on('companies_shares')->cascadeOnDelete();
            } elseif (Schema::hasTable('companies')) {
                $table->foreign('company_id')->references('id')->on('companies')->cascadeOnDelete();
            }
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_movements');
    }
};
