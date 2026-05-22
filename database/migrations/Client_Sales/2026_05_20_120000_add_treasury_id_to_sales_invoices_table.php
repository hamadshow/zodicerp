<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('sales_invoices')) {
            return;
        }

        if (! Schema::hasColumn('sales_invoices', 'treasury_id')) {
            Schema::table('sales_invoices', function (Blueprint $table) {
                $table->unsignedBigInteger('treasury_id')->nullable()->after('warehouse_id');
                $table->index('treasury_id', 'idx_sales_invoices_treasury');
            });
        }

        if (! Schema::hasTable('accounts')) {
            return;
        }

        $targetColumn = null;

        if (Schema::hasColumn('accounts', 'id')) {
            $targetColumn = 'id';
        } elseif (Schema::hasColumn('accounts', 'AccID')) {
            $col = DB::selectOne(
                "SELECT DATA_TYPE as data_type, COLUMN_TYPE as column_type
                 FROM INFORMATION_SCHEMA.COLUMNS
                 WHERE TABLE_SCHEMA = DATABASE()
                   AND TABLE_NAME = 'accounts'
                   AND COLUMN_NAME = 'AccID'"
            );

            $dataType = strtolower((string) ($col->data_type ?? ''));
            $columnType = strtolower((string) ($col->column_type ?? ''));

            if ($dataType === 'bigint' && str_contains($columnType, 'unsigned')) {
                $targetColumn = 'AccID';
            }
        }

        if (! $targetColumn) {
            return;
        }

        $fkExists = DB::selectOne(
            "SELECT CONSTRAINT_NAME
             FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = 'sales_invoices'
               AND COLUMN_NAME = 'treasury_id'
               AND REFERENCED_TABLE_NAME = 'accounts'
             LIMIT 1"
        );

        if ($fkExists) {
            return;
        }

        Schema::table('sales_invoices', function (Blueprint $table) use ($targetColumn) {
            $table->foreign('treasury_id', 'fk_sales_invoices_treasury')
                ->references($targetColumn)
                ->on('accounts')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('sales_invoices')) {
            return;
        }

        if (! Schema::hasColumn('sales_invoices', 'treasury_id')) {
            return;
        }

        $fkExists = DB::selectOne(
            "SELECT CONSTRAINT_NAME
             FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = 'sales_invoices'
               AND CONSTRAINT_TYPE = 'FOREIGN KEY'
               AND CONSTRAINT_NAME = 'fk_sales_invoices_treasury'
             LIMIT 1"
        );

        Schema::table('sales_invoices', function (Blueprint $table) use ($fkExists) {
            if ($fkExists) {
                $table->dropForeign('fk_sales_invoices_treasury');
            }

            $table->dropIndex('idx_sales_invoices_treasury');
            $table->dropColumn('treasury_id');
        });
    }
};
