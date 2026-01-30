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
        Schema::table('budget_forecasts', function (Blueprint $table) {
            $table->foreignId('destination_budget_item_id')->nullable()->after('reference_budget_item_id')->constrained('budget_items')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('budget_forecasts', function (Blueprint $table) {
            $table->dropForeign(['destination_budget_item_id']);
            $table->dropColumn('destination_budget_item_id');
        });
    }
};
