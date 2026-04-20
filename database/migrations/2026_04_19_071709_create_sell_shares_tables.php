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
        Schema::create('sell_shares', function (Blueprint $table) {
            $table->id();
            $table->datetime('sell_date');
            $table->unsignedBigInteger('currency_id')->nullable();
            $table->string('stock_symbol', 20)->nullable();
            $table->string('company_name', 100)->nullable();
            $table->integer('quantity')->nullable();
            $table->decimal('price_per_share', 10, 2)->nullable();
            $table->decimal('total_amount', 12, 2)->nullable();
            $table->decimal('commission', 10, 2)->default(0);
            $table->decimal('tax_total', 10, 2)->default(0);
            $table->decimal('grand_total', 12, 2)->default(0);
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('sell_share_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sell_share_id')->constrained('sell_shares')->onDelete('cascade');
            $table->string('stock_symbol', 20);
            $table->string('company_name', 100)->nullable();
            $table->integer('quantity');
            $table->decimal('price_per_share', 10, 2);
            $table->decimal('total_amount', 12, 2);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sell_shares_tables');
    }
};
