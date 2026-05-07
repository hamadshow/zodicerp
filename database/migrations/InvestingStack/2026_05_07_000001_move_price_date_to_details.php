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
        // 1. Add price_date to market_prices_details
        Schema::table('market_prices_details', function (Blueprint $table) {
            $table->date('price_date')->after('market_price_id')->nullable();
        });

        // 2. Data Migration: Copy price_date from master to details
        DB::statement("
            UPDATE market_prices_details d
            JOIN market_prices m ON d.market_price_id = m.id
            SET d.price_date = m.price_date
        ");

        // 3. Make price_date non-nullable in details after data copy
        Schema::table('market_prices_details', function (Blueprint $table) {
            $table->date('price_date')->nullable(false)->change();
            $table->index('price_date');
        });

        // 4. Remove price_date from market_prices
        Schema::table('market_prices', function (Blueprint $table) {
            $table->dropColumn('price_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // 1. Add price_date back to market_prices
        Schema::table('market_prices', function (Blueprint $table) {
            $table->date('price_date')->after('company_id')->nullable();
        });

        // 2. Data Migration back: Copy latest date from details to master
        DB::statement("
            UPDATE market_prices m
            SET m.price_date = (
                SELECT price_date 
                FROM market_prices_details d 
                WHERE d.market_price_id = m.id 
                ORDER BY price_timestamp DESC 
                LIMIT 1
            )
        ");

        // 3. Remove price_date from market_prices_details
        Schema::table('market_prices_details', function (Blueprint $table) {
            $table->dropColumn('price_date');
        });
    }
};
