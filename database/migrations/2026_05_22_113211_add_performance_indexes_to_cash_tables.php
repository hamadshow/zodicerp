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
        if (Schema::hasTable('bank_receipts')) {
            Schema::table('bank_receipts', function (Blueprint $table) {
                $table->index(['receipt_date', 'status']);
            });
        }

        if (Schema::hasTable('bank_payments')) {
            Schema::table('bank_payments', function (Blueprint $table) {
                $table->index(['payment_date', 'status']);
            });
        }

        Schema::table('cash_receipts', function (Blueprint $table) {
            $table->index(['receipt_date', 'status']);
        });

        Schema::table('cash_payments', function (Blueprint $table) {
            $table->index(['payment_date', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('bank_receipts')) {
            Schema::table('bank_receipts', function (Blueprint $table) {
                $table->dropIndex(['receipt_date', 'status']);
            });
        }

        if (Schema::hasTable('bank_payments')) {
            Schema::table('bank_payments', function (Blueprint $table) {
                $table->dropIndex(['payment_date', 'status']);
            });
        }

        Schema::table('cash_receipts', function (Blueprint $table) {
            $table->dropIndex(['receipt_date', 'status']);
        });

        Schema::table('cash_payments', function (Blueprint $table) {
            $table->dropIndex(['payment_date', 'status']);
        });
    }
};
