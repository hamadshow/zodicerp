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
        Schema::table('companies_shares', function (Blueprint $table) {
            $table->unsignedBigInteger('market_index_id')->nullable()->after('exchange_id');
            $table->foreign('market_index_id')->references('id')->on('market_indices')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('companies_shares', function (Blueprint $table) {
            $table->dropForeign(['market_index_id']);
            $table->dropColumn('market_index_id');
        });
    }
};
