<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('opening_stocks')) {
            return;
        }

        Schema::disableForeignKeyConstraints();

        if (Schema::hasTable('stock_movements')) {
            if (Schema::hasTable('stock_movements_details')) {
                Schema::rename('stock_movements_details', 'inventory_movement_lines');
            }
            Schema::rename('stock_movements', 'inventory_movement_headers');
        }

        Schema::rename('opening_stocks', 'stock_movements');

        if (Schema::hasTable('opening_stock_items')) {
            Schema::table('opening_stock_items', function (Blueprint $table) {
                $table->dropForeign('opening_stock_items_opening_stock_id_fk');
            });

            Schema::rename('opening_stock_items', 'stock_movements_items');

            Schema::table('stock_movements_items', function (Blueprint $table) {
                $table->renameColumn('opening_stock_id', 'stock_movement_id');
            });

            Schema::table('stock_movements_items', function (Blueprint $table) {
                $table->foreign('stock_movement_id', 'stock_movements_items_stock_movement_id_fk')
                    ->references('id')->on('stock_movements')
                    ->cascadeOnDelete();
            });
        }

        Schema::enableForeignKeyConstraints();
    }

    public function down(): void
    {
        if (! Schema::hasTable('stock_movements') || Schema::hasTable('opening_stocks')) {
            return;
        }

        Schema::disableForeignKeyConstraints();

        if (Schema::hasTable('stock_movements_items')) {
            Schema::table('stock_movements_items', function (Blueprint $table) {
                $table->dropForeign('stock_movements_items_stock_movement_id_fk');
            });
        }

        Schema::rename('stock_movements', 'opening_stocks');

        if (Schema::hasTable('stock_movements_items')) {
            Schema::rename('stock_movements_items', 'opening_stock_items');

            Schema::table('opening_stock_items', function (Blueprint $table) {
                $table->renameColumn('stock_movement_id', 'opening_stock_id');
            });

            Schema::table('opening_stock_items', function (Blueprint $table) {
                $table->foreign('opening_stock_id', 'opening_stock_items_opening_stock_id_fk')
                    ->references('id')->on('opening_stocks')
                    ->cascadeOnDelete();
            });
        }

        if (Schema::hasTable('inventory_movement_headers')) {
            Schema::rename('inventory_movement_headers', 'stock_movements');
        }

        if (Schema::hasTable('inventory_movement_lines')) {
            Schema::rename('inventory_movement_lines', 'stock_movements_details');
        }

        Schema::enableForeignKeyConstraints();
    }
};
