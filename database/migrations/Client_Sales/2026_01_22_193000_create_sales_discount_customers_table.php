<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sales_discount_customers', function (Blueprint $table) {
            $table->charset = 'utf8mb4';
            $table->collation = 'utf8mb4_unicode_ci';
            $table->increments('id');
            $table->unsignedInteger('discount_id');
            $table->unsignedInteger('customer_id');
            $table->timestamps();

            $table->foreign('discount_id')->references('id')->on('sales_discounts')->onDelete('cascade');
            $table->foreign('customer_id')->references('id')->on('customers')->onDelete('cascade');

            $table->unique(['discount_id', 'customer_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sales_discount_customers');
    }
};
