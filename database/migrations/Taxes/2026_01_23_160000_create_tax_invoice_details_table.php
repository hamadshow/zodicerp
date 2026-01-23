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
        Schema::create('tax_invoice_details', function (Blueprint $table) {
            $table->id(); // INT PRIMARY KEY AUTO_INCREMENT
            
            $table->unsignedBigInteger('tax_invoice_id');
            $table->integer('line_number');
            
            $table->enum('item_type', ['product', 'service', 'other']);
            $table->unsignedBigInteger('item_id')->nullable();
            
            $table->string('description_ar', 500)->nullable();
            $table->string('description_en', 500)->nullable();
            
            $table->decimal('quantity', 15, 3)->default(1);
            $table->decimal('unit_price', 20, 4);
            $table->decimal('unit_discount', 20, 4)->default(0);
            $table->decimal('line_total', 20, 4);
            
            $table->unsignedBigInteger('tax_id')->nullable();
            $table->decimal('tax_rate', 10, 4)->nullable();
            $table->decimal('tax_amount', 20, 4)->default(0);
            $table->decimal('taxable_amount', 20, 4);
            
            // Conditional Unit FK
            if (Schema::hasTable('units')) {
                $table->foreignId('unit_id')->nullable()->constrained('units')->nullOnDelete();
            } elseif (Schema::hasTable('item_units')) {
                $table->foreignId('unit_id')->nullable()->constrained('item_units')->nullOnDelete();
            } else {
                $table->unsignedBigInteger('unit_id')->nullable();
            }
            
            $table->unsignedBigInteger('currency_id');
            
            $table->unsignedBigInteger('tax_exemption_id')->nullable();
            $table->text('exemption_reason')->nullable();
            
            $table->timestamp('created_at')->useCurrent();
            
            // Foreign Keys
            $table->foreign('tax_invoice_id')->references('id')->on('tax_invoices')->onDelete('cascade');
            $table->foreign('tax_id')->references('id')->on('taxes');
            $table->foreign('currency_id')->references('id')->on('currencies');
            $table->foreign('tax_exemption_id')->references('id')->on('tax_exemptions');
            
            // Indexes
            $table->index(['tax_invoice_id', 'line_number'], 'idx_invoice_line');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tax_invoice_details');
    }
};
