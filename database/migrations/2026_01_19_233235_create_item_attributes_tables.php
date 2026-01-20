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
        // Table: item_attributes
        Schema::create('item_attributes', function (Blueprint $table) {
            $table->charset = 'utf8mb4';
            $table->collation = 'utf8mb4_unicode_ci';

            $table->id();
            $table->string('title', 120);
            $table->string('slug', 120)->nullable();
            $table->string('display_layout', 191)->default('dropdown');
            $table->unsignedTinyInteger('is_searchable')->default(1);
            $table->unsignedTinyInteger('is_comparable')->default(1);
            $table->unsignedTinyInteger('is_use_in_product_listing')->default(0);
            $table->string('status', 60)->default('published');
            $table->unsignedTinyInteger('order')->default(0);
            $table->unsignedTinyInteger('use_image_from_product_variation')->default(0);
            
            $table->timestamps();
            $table->softDeletes();
        });

        // Table: item_attributes_details
        Schema::create('item_attributes_details', function (Blueprint $table) {
            $table->charset = 'utf8mb4';
            $table->collation = 'utf8mb4_unicode_ci';

            $table->id();
            // Foreign Key to item_attributes
            // Using attribute_set_id as requested, referencing item_attributes(id)
            $table->unsignedBigInteger('attribute_set_id');
            $table->string('title', 120);
            $table->string('slug', 120)->nullable();
            $table->string('color', 120)->nullable();
            $table->string('image', 191)->nullable();
            $table->unsignedTinyInteger('is_default')->default(0);
            $table->unsignedTinyInteger('order')->default(0);
            
            $table->timestamps();
            $table->softDeletes(); // Enabled as per general requirement

            // Indexes and Constraints
            $table->index('attribute_set_id', 'attribute_set_id_index');
            $table->foreign('attribute_set_id')
                  ->references('id')
                  ->on('item_attributes')
                  ->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('item_attributes_details');
        Schema::dropIfExists('item_attributes');
    }
};
