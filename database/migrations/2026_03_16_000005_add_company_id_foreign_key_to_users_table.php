<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('users')) {
            return;
        }

        if (! Schema::hasColumn('users', 'company_id')) {
            Schema::table('users', function (Blueprint $table) {
                $table->unsignedBigInteger('company_id')->nullable()->index();
            });
        }

        $companyTable = null;
        if (Schema::hasTable('company')) {
            $companyTable = 'company';
        }

        if (! $companyTable) {
            return;
        }

        $dbName = DB::getDatabaseName();
        $hasFk = DB::table('information_schema.KEY_COLUMN_USAGE')
            ->where('TABLE_SCHEMA', $dbName)
            ->where('TABLE_NAME', 'users')
            ->where('COLUMN_NAME', 'company_id')
            ->whereNotNull('REFERENCED_TABLE_NAME')
            ->exists();

        if ($hasFk) {
            return;
        }

        try {
            Schema::table('users', function (Blueprint $table) use ($companyTable) {
                $table
                    ->foreign('company_id', 'users_company_id_fk')
                    ->references('id')
                    ->on($companyTable)
                    ->nullOnDelete();
            });
        } catch (\Throwable $e) {
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('users')) {
            return;
        }

        if (! Schema::hasColumn('users', 'company_id')) {
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
