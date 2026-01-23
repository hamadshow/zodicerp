<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('price_list_items', function (Blueprint $table) {
            $table->charset = 'utf8mb4';
            $table->collation = 'utf8mb4_unicode_ci';
            
            $table->increments('id');
            $table->unsignedInteger('price_list_id'); // Matches price_lists.id
            $table->unsignedBigInteger('product_id'); // Matches products.id (bigInt)
            $table->unsignedBigInteger('unit_id'); // Matches item_units.id (bigInt)
            
            $table->decimal('min_quantity', 12, 4)->default(1);
            $table->decimal('unit_price', 15, 4);
            $table->decimal('discount_percentage', 5, 2)->default(0);
            $table->decimal('discount_amount', 15, 2)->default(0);
            
            // Generated column
            $table->decimal('final_price', 15, 4)->storedAs('unit_price - (unit_price * discount_percentage / 100) - discount_amount');
            
            $table->date('effective_date')->nullable();
            $table->date('expiry_date')->nullable();
            $table->text('notes')->nullable();
            
            // Foreign Keys
            $table->foreign('price_list_id')->references('id')->on('price_lists')->onDelete('cascade');
            $table->foreign('product_id')->references('id')->on('products');
            $table->foreign('unit_id')->references('id')->on('item_units'); // Using item_units table

            // Indexes
            $table->index('price_list_id', 'idx_price_list_items_price_list');
            $table->index('product_id', 'idx_price_list_items_product');
            
            // Unique Key
            $table->unique(['price_list_id', 'product_id', 'unit_id', 'min_quantity'], 'unique_price_list_product');
        });
    }

    public function down(): void {
        Schema::dropIfExists('price_list_items');
    }
};
