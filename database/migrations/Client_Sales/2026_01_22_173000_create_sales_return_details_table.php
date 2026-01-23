<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('sales_return_details', function (Blueprint $table) {
            $table->id();
            
            $table->foreignId('return_id')->constrained('sales_returns')->onDelete('cascade');
            
            $table->foreignId('invoice_detail_id')->constrained('sales_invoice_details');
            
            $table->foreignId('product_id')->constrained('products');
            
            $table->decimal('quantity', 12, 4);
            
            $table->unsignedBigInteger('unit_id');
            $table->foreign('unit_id')->references('id')->on('item_units');
            
            $table->decimal('unit_price', 15, 4);
            $table->decimal('tax_percentage', 5, 2)->default(0);
            $table->decimal('tax_amount', 15, 2)->default(0);
            
            // Generated column
            $table->decimal('line_total', 15, 2)->storedAs('(quantity * unit_price) + tax_amount');
            
            $table->string('batch_number', 100)->nullable();
            $table->string('serial_number', 100)->nullable();
            
            $table->text('return_reason_details')->nullable();
            $table->enum('condition', ['new', 'used', 'damaged', 'defective', 'opened'])->nullable();
            
            $table->text('inspection_notes')->nullable();
            $table->text('notes')->nullable();
            
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sales_return_details');
    }
};
