<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('inventory_movement_lines', function (Blueprint $table) {
            $table->boolean('is_current')->default(true)->after('stock_movement_id');
        });

        $reversedOpeningIds = DB::table('inventory_movement_headers')
            ->where('type', 'opening')
            ->where('direction', 'out')
            ->select('id');

        DB::table('inventory_movement_lines')
            ->whereIn('stock_movement_id', $reversedOpeningIds)
            ->update(['is_current' => false]);
    }

    public function down(): void
    {
        Schema::table('inventory_movement_lines', function (Blueprint $table) {
            $table->dropColumn('is_current');
        });
    }
};
