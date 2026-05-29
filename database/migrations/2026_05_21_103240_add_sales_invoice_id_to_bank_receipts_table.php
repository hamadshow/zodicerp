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
        if (! Schema::hasTable('bank_receipts')) {
            return;
        }

        Schema::table('bank_receipts', function (Blueprint $table) {
            if (! Schema::hasColumn('bank_receipts', 'sales_invoice_id')) {
                $table->unsignedBigInteger('sales_invoice_id')->nullable()->after('id');
                $table->foreign('sales_invoice_id')->references('id')->on('sales_invoices')->onDelete('cascade');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (! Schema::hasTable('bank_receipts')) {
            return;
        }

        if (! Schema::hasColumn('bank_receipts', 'sales_invoice_id')) {
            return;
        }

        Schema::table('bank_receipts', function (Blueprint $table) {
            $table->dropForeign(['sales_invoice_id']);
            $table->dropColumn('sales_invoice_id');
        });
    }
};
