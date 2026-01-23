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
        Schema::create('purchase_discounts', function (Blueprint $table) {
            $table->charset = 'utf8mb4';
            $table->collation = 'utf8mb4_unicode_ci';

            $table->id();
            $table->string('discount_code', 50)->unique();
            $table->string('name_ar', 100);
            $table->string('name_en', 100)->nullable();
            
            $table->enum('discount_type', ['percentage', 'fixed_amount', 'buy_x_get_y']);
            $table->decimal('value', 10, 2);
            $table->decimal('min_purchase_amount', 15, 2)->default(0);
            $table->decimal('max_discount_amount', 15, 2)->nullable();
            
            $table->enum('applicable_to', ['all', 'specific_suppliers', 'specific_categories', 'specific_products'])->default('all');
            
            $table->date('start_date');
            $table->date('end_date')->nullable();
            
            $table->integer('max_uses')->nullable();
            $table->integer('current_uses')->default(0);
            
            $table->boolean('is_active')->default(true);
            $table->boolean('is_compound')->default(false);
            
            $table->text('notes')->nullable();
            
            $table->unsignedBigInteger('created_by')->nullable();
            
            $table->timestamps();
            $table->softDeletes();
            
            $table->index('discount_code', 'idx_purchase_discounts_code');
            $table->index(['is_active', 'start_date', 'end_date'], 'idx_purchase_discounts_active');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('purchase_discounts');
    }
};
