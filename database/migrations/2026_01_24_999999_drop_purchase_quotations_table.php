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
        // First, modify purchase_orders to drop the column
        if (Schema::hasTable('purchase_orders')) {
            Schema::table('purchase_orders', function (Blueprint $table) {
                // Drop the column if it exists
                if (Schema::hasColumn('purchase_orders', 'quotation_id')) {
                    // We attempt to drop the column. 
                    // If there was a FK, this might fail, but our check script showed no FK.
                    $table->dropColumn('quotation_id');
                }
            });
        }

        // Now drop the purchase_quotations table
        Schema::dropIfExists('purchase_quotations');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
    }
};
