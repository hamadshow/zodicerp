<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('stock_movements') || ! Schema::hasColumn('stock_movements', 'company_id')) {
            return;
        }

        if (! Schema::hasTable('company')) {
            return;
        }

        $dbName = DB::getDatabaseName();

        $fk = DB::table('information_schema.KEY_COLUMN_USAGE')
            ->select(['CONSTRAINT_NAME', 'REFERENCED_TABLE_NAME'])
            ->where('TABLE_SCHEMA', $dbName)
            ->where('TABLE_NAME', 'stock_movements')
            ->where('COLUMN_NAME', 'company_id')
            ->whereNotNull('REFERENCED_TABLE_NAME')
            ->first();

        if ($fk && ($fk->REFERENCED_TABLE_NAME ?? null) !== 'company') {
            $constraintName = (string) ($fk->CONSTRAINT_NAME ?? '');
            if ($constraintName !== '') {
                try {
                    Schema::table('stock_movements', function (Blueprint $table) use ($constraintName) {
                        $table->dropForeign($constraintName);
                    });
                } catch (\Throwable $e) {
                }
            }
        }

        $hasCompanyFk = DB::table('information_schema.KEY_COLUMN_USAGE')
            ->where('TABLE_SCHEMA', $dbName)
            ->where('TABLE_NAME', 'stock_movements')
            ->where('COLUMN_NAME', 'company_id')
            ->where('REFERENCED_TABLE_NAME', 'company')
            ->exists();

        if ($hasCompanyFk) {
            return;
        }

        try {
            Schema::table('stock_movements', function (Blueprint $table) {
                $table
                    ->foreign('company_id', 'stock_movements_company_id_fk')
                    ->references('id')
                    ->on('company')
                    ->cascadeOnDelete();
            });
        } catch (\Throwable $e) {
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('stock_movements') || ! Schema::hasColumn('stock_movements', 'company_id')) {
            return;
        }

        try {
            Schema::table('stock_movements', function (Blueprint $table) {
                $table->dropForeign('stock_movements_company_id_fk');
            });
        } catch (\Throwable $e) {
            try {
                Schema::table('stock_movements', function (Blueprint $table) {
                    $table->dropForeign(['company_id']);
                });
            } catch (\Throwable $e) {
            }
        }
    }
};
