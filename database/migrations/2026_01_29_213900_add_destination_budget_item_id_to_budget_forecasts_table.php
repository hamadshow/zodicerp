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
        if (Schema::hasTable('budget_forecasts')) {
            Schema::table('budget_forecasts', function (Blueprint $table) {
                if (! Schema::hasColumn('budget_forecasts', 'destination_budget_item_id')) {
                    $table->foreignId('destination_budget_item_id')->nullable()->after('reference_budget_item_id');
                    // Skip constraint if budget_items table doesn't exist (likely in tests)
                    if (Schema::hasTable('budget_items')) {
                        $table->foreign('destination_budget_item_id')->references('id')->on('budget_items')->nullOnDelete();
                    }
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('budget_forecasts')) {
            Schema::table('budget_forecasts', function (Blueprint $table) {
                if (Schema::hasColumn('budget_forecasts', 'destination_budget_item_id')) {
                    // Check foreign key existence is hard in SQLite, just drop column usually works
                    // $table->dropForeign(['destination_budget_item_id']);
                    $table->dropColumn('destination_budget_item_id');
                }
            });
        }
    }
};
