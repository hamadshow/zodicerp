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
        Schema::create('purchase_return_details', function (Blueprint $table) {
            $table->charset = 'utf8mb4';
            $table->collation = 'utf8mb4_unicode_ci';

            $table->id();
            $table->foreignId('return_id')->constrained('purchase_returns')->onDelete('cascade');
            $table->foreignId('invoice_detail_id')->constrained('purchase_invoice_details');
            $table->foreignId('product_id')->constrained('products');
            $table->decimal('quantity', 12, 4);
            $table->foreignId('unit_id')->constrained('item_units'); // Assuming item_units based on existing model
            $table->decimal('unit_price', 15, 4);
            $table->decimal('tax_percentage', 5, 2)->default(0);
            $table->decimal('tax_amount', 15, 2)->default(0);
            $table->decimal('line_total', 15, 2)->storedAs('((quantity * unit_price) + tax_amount)');
            $table->string('batch_number', 100)->nullable();
            $table->string('serial_number', 100)->nullable();
            $table->text('return_reason_details')->nullable();
            $table->enum('condition', ['new', 'used', 'damaged', 'defective'])->nullable();
            $table->text('inspection_notes')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes(); // Global requirement says enable soft deletes

            $table->index('return_id', 'idx_return_details_return');
            $table->index('product_id', 'idx_return_details_product');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('purchase_return_details');
    }
};
