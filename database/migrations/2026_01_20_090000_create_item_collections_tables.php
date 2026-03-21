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
        // Table: item_collections
        Schema::create('item_collections', function (Blueprint $table) {
            $table->charset = 'utf8mb4';
            $table->collation = 'utf8mb4_unicode_ci';

            $table->id();
            $table->string('name', 191);
            $table->string('slug', 191);
            $table->string('description', 400)->nullable();
            $table->string('image', 191)->nullable();
            $table->string('status', 60)->default('published');
            $table->unsignedTinyInteger('is_featured')->default(0);

            // Parent ID for hierarchy (relationships: parent, children)
            $table->unsignedBigInteger('parent_id')->nullable();

            $table->timestamps();
            $table->softDeletes(); // Enable soft deletes

            // Indexes and Foreign Keys
            $table->index('parent_id');
            $table->foreign('parent_id')
                ->references('id')
                ->on('item_collections')
                ->onDelete('set null');
        });

        // Table: item_collection_product (Pivot table for Many-to-Many relationship)
        // Assumed as the 2nd table for "full setup"
        Schema::create('item_collection_product', function (Blueprint $table) {
            $table->charset = 'utf8mb4';
            $table->collation = 'utf8mb4_unicode_ci';

            $table->id();
            $table->unsignedBigInteger('item_collection_id');
            $table->unsignedBigInteger('product_id');
            $table->timestamps();

            // Foreign Keys
            $table->foreign('item_collection_id')
                ->references('id')
                ->on('item_collections')
                ->onDelete('cascade');

            // Assuming 'products' is the table name for Products model
            $table->foreign('product_id')
                ->references('id')
                ->on('products')
                ->onDelete('cascade');

            // Unique constraint to prevent duplicates
            $table->unique(['item_collection_id', 'product_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('item_collection_product');
        Schema::dropIfExists('item_collections');
    }
};
