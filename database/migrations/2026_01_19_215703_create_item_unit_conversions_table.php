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
        Schema::create('item_unit_conversions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('from_unit_id');
            $table->unsignedBigInteger('to_unit_id');
            $table->decimal('conversion_factor', 15, 6)->comment('e.g., 1000 means 1 from = 1000 to');
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->foreign('from_unit_id')->references('id')->on('item_units')->onDelete('cascade');
            $table->foreign('to_unit_id')->references('id')->on('item_units')->onDelete('cascade');

            $table->unique(['from_unit_id', 'to_unit_id'], 'unique_conversion');

            $table->charset = 'utf8mb4';
            $table->collation = 'utf8mb4_unicode_ci';
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('item_unit_conversions');
    }
};
