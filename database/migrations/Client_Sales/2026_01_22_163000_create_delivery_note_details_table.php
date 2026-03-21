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
        Schema::create('delivery_note_details', function (Blueprint $table) {
            $table->id();
            $table->foreignId('delivery_note_id')->constrained('delivery_notes')->onDelete('cascade');

            $table->foreignId('invoice_detail_id')->nullable()->constrained('sales_invoice_details');

            $table->foreignId('product_id')->constrained('products');

            $table->decimal('quantity_delivered', 12, 4);

            $table->unsignedBigInteger('unit_id');
            $table->foreign('unit_id')->references('id')->on('item_units'); // Assuming item_units is the table

            $table->string('batch_number', 100)->nullable();
            $table->string('serial_number', 100)->nullable();
            $table->date('expiry_date')->nullable();

            $table->enum('condition', ['good', 'damaged', 'expired'])->default('good');
            $table->text('quality_notes')->nullable();
            $table->text('notes')->nullable();

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('delivery_note_details');
    }
};
