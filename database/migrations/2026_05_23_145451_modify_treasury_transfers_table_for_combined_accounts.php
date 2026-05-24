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
        Schema::table('treasury_transfers', function (Blueprint $table) {
            $table->dropForeign(['from_treasury_id']);
            $table->dropForeign(['to_treasury_id']);
        });

        Schema::table('treasury_transfers', function (Blueprint $table) {
            $table->string('from_treasury_id')->change();
            $table->string('to_treasury_id')->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('treasury_transfers', function (Blueprint $table) {
            $table->unsignedBigInteger('from_treasury_id')->change();
            $table->unsignedBigInteger('to_treasury_id')->change();
            
            $table->foreign('from_treasury_id')->references('id')->on('cash_accounts');
            $table->foreign('to_treasury_id')->references('id')->on('cash_accounts');
        });
    }
};
