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
        Schema::dropIfExists('product_collections_translations');
        
        Schema::create('product_collections_translations', function (Blueprint $table) {
            $table->id();
            $table->string('lang_code', 10)->index();
            $table->unsignedBigInteger('ec_product_collections_id');
            $table->string('name');
            $table->text('description')->nullable();

            // Foreign key constraint with custom shorter name
            $table->foreign('ec_product_collections_id', 'fk_pct_ec_id')
                  ->references('id')
                  ->on('product_collections')
                  ->onDelete('cascade');

            // Unique constraint to prevent duplicate translations for the same language
            $table->unique(['ec_product_collections_id', 'lang_code'], 'unique_collection_translation');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('product_collections_translations');
    }
};
