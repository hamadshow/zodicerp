<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sales_discounts', function (Blueprint $table) {
            $table->charset = 'utf8mb4';
            $table->collation = 'utf8mb4_unicode_ci';
            $table->increments('id');
            $table->string('discount_code', 50)->unique();
            $table->string('name_ar', 100);
            $table->string('name_en', 100)->nullable();
            $table->enum('discount_type', ['percentage', 'fixed_amount', 'buy_x_get_y', 'seasonal']);
            $table->decimal('value', 10, 2);
            $table->decimal('min_purchase_amount', 15, 2)->default(0);
            $table->decimal('max_discount_amount', 15, 2)->nullable();
            $table->enum('applicable_to', ['all', 'specific_customers', 'specific_groups', 'specific_products'])->default('all');
            $table->date('start_date');
            $table->date('end_date')->nullable();
            $table->integer('max_uses')->nullable();
            $table->integer('current_uses')->default(0);
            $table->integer('max_uses_per_customer')->nullable();
            $table->boolean('is_active')->default(true);
            $table->boolean('is_compound')->default(false);
            $table->text('notes')->nullable();
            $table->integer('created_by')->nullable();
            $table->softDeletes();
            $table->timestamps();

            $table->index(['is_active', 'start_date', 'end_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sales_discounts');
    }
};
