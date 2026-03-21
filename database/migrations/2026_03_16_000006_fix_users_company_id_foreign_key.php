<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('users') || ! Schema::hasColumn('users', 'company_id')) {
            return;
        }

        if (! Schema::hasTable('company')) {
            return;
        }
        $desiredCompanyTable = 'company';

        $dbName = DB::getDatabaseName();

        $fk = DB::table('information_schema.KEY_COLUMN_USAGE')
            ->select(['CONSTRAINT_NAME', 'REFERENCED_TABLE_NAME'])
            ->where('TABLE_SCHEMA', $dbName)
            ->where('TABLE_NAME', 'users')
            ->where('COLUMN_NAME', 'company_id')
            ->whereNotNull('REFERENCED_TABLE_NAME')
            ->first();

        if ($fk && ($fk->REFERENCED_TABLE_NAME ?? null) !== $desiredCompanyTable) {
            $constraintName = (string) ($fk->CONSTRAINT_NAME ?? '');
            if ($constraintName !== '') {
                try {
                    Schema::table('users', function (Blueprint $table) use ($constraintName) {
                        $table->dropForeign($constraintName);
                    });
                } catch (\Throwable $e) {
                }
            }
        }

        $hasCorrectFk = DB::table('information_schema.KEY_COLUMN_USAGE')
            ->where('TABLE_SCHEMA', $dbName)
            ->where('TABLE_NAME', 'users')
            ->where('COLUMN_NAME', 'company_id')
            ->where('REFERENCED_TABLE_NAME', $desiredCompanyTable)
            ->exists();

        if ($hasCorrectFk) {
            return;
        }

        try {
            Schema::table('users', function (Blueprint $table) use ($desiredCompanyTable) {
                $table
                    ->foreign('company_id', 'users_company_id_fk')
                    ->references('id')
                    ->on($desiredCompanyTable)
                    ->nullOnDelete();
            });
        } catch (\Throwable $e) {
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('users') || ! Schema::hasColumn('users', 'company_id')) {
            return;
        }

        try {
            Schema::table('users', function (Blueprint $table) {
                $table->dropForeign('users_company_id_fk');
            });
        } catch (\Throwable $e) {
            try {
                Schema::table('users', function (Blueprint $table) {
                    $table->dropForeign(['company_id']);
                });
            } catch (\Throwable $e) {
            }
        }
    }
};
