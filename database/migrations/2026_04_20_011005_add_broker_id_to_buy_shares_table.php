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
        Schema::table('buy_shares', function (Blueprint $table) {
            $table->unsignedBigInteger('broker_id')->nullable()->after('currency_id');
            $table->foreign('broker_id')->references('id')->on('brokers');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('buy_shares', function (Blueprint $table) {
            $table->dropForeign(['broker_id']);
            $table->dropColumn('broker_id');
        });
    }
};
