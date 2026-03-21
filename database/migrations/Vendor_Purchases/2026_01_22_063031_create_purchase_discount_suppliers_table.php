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
        Schema::create('purchase_discount_suppliers', function (Blueprint $table) {
            $table->charset = 'utf8mb4';
            $table->collation = 'utf8mb4_unicode_ci';

            $table->id();

            $table->foreignId('discount_id')->constrained('purchase_discounts')->onDelete('cascade');
            // Using supplier_id as per previous discussions if it's not 'id' but the table definition used 'id'
            // The previous 'suppliers' table has 'id' as PK (from recent task).
            // But verify if we should use 'supplier_id' column name in FK referencing 'id'.
            // The user SQL says: supplier_id INT NOT NULL, FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
            $table->foreignId('supplier_id')->constrained('suppliers')->onDelete('cascade');

            $table->unique(['discount_id', 'supplier_id'], 'unique_discount_supplier');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('purchase_discount_suppliers');
    }
};
