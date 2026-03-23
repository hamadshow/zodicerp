<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('stock_movements')) {
            return;
        }

        $hasFrom = Schema::hasColumn('stock_movements', 'from_warehouse_id');
        $hasTo = Schema::hasColumn('stock_movements', 'to_warehouse_id');

        if ($hasFrom && $hasTo) {
            return;
        }

        Schema::table('stock_movements', function (Blueprint $table) use ($hasFrom, $hasTo) {
            if (! $hasFrom) {
                $table->unsignedBigInteger('from_warehouse_id')->nullable();
            }

            if (! $hasTo) {
                $table->unsignedBigInteger('to_warehouse_id')->nullable();
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('stock_movements')) {
            return;
        }

        $hasFrom = Schema::hasColumn('stock_movements', 'from_warehouse_id');
        $hasTo = Schema::hasColumn('stock_movements', 'to_warehouse_id');

        if (! $hasFrom && ! $hasTo) {
            return;
        }

        Schema::table('stock_movements', function (Blueprint $table) use ($hasFrom, $hasTo) {
            if ($hasFrom) {
                $table->dropColumn('from_warehouse_id');
            }

            if ($hasTo) {
                $table->dropColumn('to_warehouse_id');
            }
        });
    }
};
