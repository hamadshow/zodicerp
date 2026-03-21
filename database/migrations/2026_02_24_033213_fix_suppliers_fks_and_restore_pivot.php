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
        // 1. Add foreign key to suppliers table for supplier_group_id
        if (Schema::hasTable('suppliers') && Schema::hasTable('supplier_groups') && Schema::hasColumn('suppliers', 'supplier_group_id')) {
            Schema::table('suppliers', function (Blueprint $table) {
                // Add the foreign key
                $table->foreign('supplier_group_id', 'fk_suppliers_group_id')
                    ->references('id')
                    ->on('supplier_groups')
                    ->onDelete('restrict');
            });
        }

        // 2. Restore product_supplier table if it doesn't exist
        if (! Schema::hasTable('product_supplier')) {
            Schema::create('product_supplier', function (Blueprint $table) {
                $table->id();

                $table->foreignId('product_id')->constrained('products')->onDelete('cascade');
                $table->foreignId('supplier_id')->constrained('suppliers')->onDelete('cascade');

                $table->decimal('cost_price', 10, 2)->nullable();
                $table->string('supplier_sku')->nullable();
                $table->timestamps();

                // Add unique constraint to prevent duplicates
                $table->unique(['product_id', 'supplier_id']);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // 1. Drop product_supplier table
        Schema::dropIfExists('product_supplier');

        // 2. Drop foreign key from suppliers table
        if (Schema::hasTable('suppliers')) {
            Schema::table('suppliers', function (Blueprint $table) {
                $table->dropForeign('fk_suppliers_group_id');
            });
        }
    }
};
