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
        Schema::create('buy_share_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('buy_share_id')->constrained('buy_shares')->onDelete('cascade');
            $table->string('stock_symbol', 20);
            $table->string('company_name', 100)->nullable();
            $table->integer('quantity');
            $table->decimal('price_per_share', 10, 2);
            $table->decimal('total_amount', 12, 2);
            $table->timestamps();
        });

        // Also update buy_shares table to handle invoice-level fields if needed
        Schema::table('buy_shares', function (Blueprint $table) {
            $table->string('stock_symbol', 20)->nullable()->change();
            $table->integer('quantity')->nullable()->change();
            $table->decimal('price_per_share', 10, 2)->nullable()->change();
            $table->decimal('total_amount', 12, 2)->nullable()->change();
            $table->decimal('commission', 10, 2)->default(0);
            $table->decimal('tax_total', 10, 2)->default(0);
            $table->decimal('grand_total', 12, 2)->default(0);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('buy_share_items');
    }
};
