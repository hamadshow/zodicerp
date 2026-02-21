<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_variations', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('product_id')->index();
            $table->unsignedBigInteger('configurable_product_id')->nullable()->index();
            $table->boolean('is_default')->default(false);
            $table->string('sku', 150)->nullable();
            $table->decimal('price', 12, 2)->nullable();
            $table->integer('stock')->default(0);
            $table->timestamps();
            $table->charset = 'utf8mb4';
            $table->collation = 'utf8mb4_unicode_ci';
            $table->engine = 'InnoDB';
            $table->foreign('product_id')
                ->references('id')
                ->on('products')
                ->onDelete('cascade');
            $table->foreign('configurable_product_id')
                ->references('id')
                ->on('products')
                ->onDelete('cascade');
        });

        Schema::create('product_variation_items', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('variation_id')->index();
            $table->unsignedBigInteger('attribute_id')->index();
            $table->string('attribute_value', 255);
            $table->timestamps();
            $table->charset = 'utf8mb4';
            $table->collation = 'utf8mb4_unicode_ci';
            $table->engine = 'InnoDB';
            $table->foreign('variation_id')
                ->references('id')
                ->on('product_variations')
                ->onDelete('cascade');
            $table->foreign('attribute_id')
                ->references('id')
                ->on('attributes')
                ->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_variation_items');
        Schema::dropIfExists('product_variations');
    }
};
