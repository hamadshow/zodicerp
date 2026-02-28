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
        Schema::dropIfExists('item_collection_product');
        Schema::dropIfExists('item_collections');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::create('item_collections', function (Blueprint $table) {
            $table->id();
            $table->string('name', 191);
            $table->string('slug', 191);
            $table->string('description', 400)->nullable();
            $table->string('image', 191)->nullable();
            $table->string('status', 60)->default('published');
            $table->unsignedTinyInteger('is_featured')->default(0);
            $table->unsignedBigInteger('parent_id')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('item_collection_product', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('item_collection_id');
            $table->unsignedBigInteger('product_id');
            $table->timestamps();
        });
    }
};
