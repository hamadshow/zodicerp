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
        Schema::create('market_prices', function (Blueprint $table) {
            $table->id();

            // Foreign Key
            // User requested: FOREIGN KEY (instrument_id) REFERENCES companies(company_code)
            // However, company_code is VARCHAR(50) and instrument_id is requested as INT.
            // We assume referencing the 'id' column of companies table is the intended behavior for an INT column.
            $table->foreignId('instrument_id')->constrained('companies_shares')->onDelete('cascade');

            // Price Data
            $table->decimal('bid_price', 20, 4);
            $table->decimal('ask_price', 20, 4);
            $table->decimal('last_price', 20, 4);

            $table->decimal('open_price', 20, 4)->nullable();
            $table->decimal('high_price', 20, 4)->nullable();
            $table->decimal('low_price', 20, 4)->nullable();
            $table->decimal('close_price', 20, 4)->nullable();

            // Date & Time
            $table->date('price_date');
            $table->time('price_time');
            $table->timestamp('price_timestamp');

            // Volume / Liquidity
            $table->decimal('bid_volume', 20, 2)->nullable();
            $table->decimal('ask_volume', 20, 2)->nullable();
            $table->decimal('volume', 20, 2)->nullable();

            // Change
            $table->decimal('change_amount', 20, 4)->nullable();
            $table->decimal('change_percent', 10, 4)->nullable();

            // System / Metadata
            $table->string('data_source', 100)->nullable();
            $table->boolean('is_eod')->default(false);
            $table->boolean('is_intraday')->default(false);

            $table->timestamp('created_at')->useCurrent();
            // Optional: $table->updatedAt(); // Not requested in SQL, but often useful.
            // Leaving out to strictly match SQL "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP"
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('market_prices');
    }
};
