<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasTable('buy_shares')) {
            Schema::create('buy_shares', function (Blueprint $table) {
                $table->id();
                $table->string('stock_symbol', 20);
                $table->string('company_name', 100)->nullable();
                $table->integer('quantity');
                $table->decimal('price_per_share', 10, 2);
                $table->decimal('total_amount', 12, 2)->generatedAs('quantity * price_per_share')->stored();
                $table->unsignedBigInteger('currency_id')->nullable();
                $table->datetime('purchase_date')->default(DB::raw('CURRENT_TIMESTAMP'));
                $table->text('notes')->nullable();
                $table->timestamps();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('buy_shares');
    }
};
