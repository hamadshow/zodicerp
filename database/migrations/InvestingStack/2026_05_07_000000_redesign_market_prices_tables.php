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
        // Drop existing table to redesign
        Schema::dropIfExists('market_prices');

        // 1. Primary Table: market_prices (Session/Day Record)
        Schema::create('market_prices', function (Blueprint $table) {
            $table->id();
            
            // Foreign Keys
            $table->foreignId('instrument_id')->constrained('companies_shares')->onDelete('cascade');
            $table->foreignId('company_id')->constrained('company')->onDelete('cascade');
            
            // Session Data
            $table->date('price_date');
            $table->string('data_source', 100)->nullable();
            
            // Flags
            $table->boolean('is_eod')->default(false);
            $table->boolean('is_intraday')->default(false);
            
            $table->timestamp('created_at')->useCurrent();
            
            // Index for faster lookups
            $table->index(['instrument_id', 'price_date']);
        });

        // 2. Detailed Table: market_prices_details (Time Series / OHLCV)
        Schema::create('market_prices_details', function (Blueprint $table) {
            $table->id();
            $table->foreignId('market_price_id')->constrained('market_prices')->onDelete('cascade');
            
            // Time Data
            $table->time('price_time');
            $table->timestamp('price_timestamp');
            
            // Price Data (High Precision)
            $table->decimal('bid_price', 20, 4)->nullable();
            $table->decimal('ask_price', 20, 4)->nullable();
            $table->decimal('last_price', 20, 4)->nullable();
            $table->decimal('open_price', 20, 4)->nullable();
            $table->decimal('high_price', 20, 4)->nullable();
            $table->decimal('low_price', 20, 4)->nullable();
            $table->decimal('close_price', 20, 4)->nullable();
            
            // Volumes
            $table->decimal('bid_volume', 20, 2)->nullable();
            $table->decimal('ask_volume', 20, 2)->nullable();
            $table->decimal('volume', 20, 2)->nullable();
            
            // Changes
            $table->decimal('change_amount', 20, 4)->nullable();
            $table->decimal('change_percent', 10, 4)->nullable();
            
            // Index for time-series analysis
            $table->index(['market_price_id', 'price_timestamp']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('market_prices_details');
        Schema::dropIfExists('market_prices');
    }
};
