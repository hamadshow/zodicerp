<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('stock_movements')) {
            return;
        }

        if (Schema::hasColumn('stock_movements', 'voucher_num')) {
            return;
        }

        Schema::table('stock_movements', function (Blueprint $table) {
            $table->string('voucher_num', 50)->nullable()->after('reference_type');
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('stock_movements')) {
            return;
        }

        if (!Schema::hasColumn('stock_movements', 'voucher_num')) {
            return;
        }

        Schema::table('stock_movements', function (Blueprint $table) {
            $table->dropColumn('voucher_num');
        });
    }
};

