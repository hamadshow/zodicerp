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
        Schema::table('cash_accounts', function (Blueprint $table) {
            $table->unsignedInteger('gl_account_id')->nullable()->after('currency');
            $table->foreign('gl_account_id')->references('AccID')->on('accounts')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('cash_accounts', function (Blueprint $table) {
            $table->dropForeign(['gl_account_id']);
            $table->dropColumn('gl_account_id');
        });
    }
};
