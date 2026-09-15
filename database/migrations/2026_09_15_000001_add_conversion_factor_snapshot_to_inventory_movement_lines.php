<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('inventory_movement_lines', function (Blueprint $table) {
            $table->decimal('conversion_factor_snapshot', 16, 6)
                ->nullable()
                ->comment('Unit conversion factor at transaction time for historical reproducibility')
                ->after('quantity');
            $table->decimal('original_quantity', 15, 4)
                ->nullable()
                ->comment('Quantity expressed in the source document unit')
                ->after('conversion_factor_snapshot');
        });
    }

    public function down(): void
    {
        Schema::table('inventory_movement_lines', function (Blueprint $table) {
            $table->dropColumn('conversion_factor_snapshot');
            $table->dropColumn('original_quantity');
        });
    }
};
