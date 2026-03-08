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
        Schema::create('sales_quotation_details', function (Blueprint $table) {
            $table->id();
            $table->foreignId('quotation_id')->constrained('sales_quotations')->onDelete('cascade');
            $table->foreignId('product_id')->constrained('products');
            $table->decimal('quantity', 12, 4)->default(0);
            $table->foreignId('unit_id')->constrained('item_units'); // Using item_units as per project convention
            $table->decimal('unit_price', 15, 4);
            $table->decimal('discount_percentage', 5, 2)->default(0);
            $table->decimal('discount_amount', 15, 2)->default(0);
            $table->unsignedBigInteger('tax_id')->nullable();
            $table->decimal('tax_amount', 15, 2)->default(0);
            
            // Generated column
            $table->decimal('line_total', 15, 2)->storedAs('(quantity * unit_price) - discount_amount + tax_amount');

            $table->date('delivery_date')->nullable();
            $table->text('notes')->nullable();
            $table->softDeletes();
            $table->timestamps();

            $table->charset = 'utf8mb4';
            $table->collation = 'utf8mb4_unicode_ci';

            $table->index('quotation_id', 'idx_quotation_details_quotation');
            $table->index('product_id', 'idx_quotation_details_product');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sales_quotation_details');
    }
};
