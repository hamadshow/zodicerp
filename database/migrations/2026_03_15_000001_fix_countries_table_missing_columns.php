<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $isSqlite = DB::getDriverName() === 'sqlite';

        Schema::table('countries', function (Blueprint $table) use ($isSqlite) {
            if (!Schema::hasColumn('countries', 'currency')) {
                if ($isSqlite) {
                    $table->string('currency')->nullable();
                } else {
                    $table->string('currency')->nullable()->after('code');
                }
            }

            if (!Schema::hasColumn('countries', 'timezone')) {
                if ($isSqlite) {
                    $table->string('timezone')->nullable();
                } else {
                    $table->string('timezone')->nullable()->after(Schema::hasColumn('countries', 'currency') ? 'currency' : 'code');
                }
            }

            if (!Schema::hasColumn('countries', 'phone_code')) {
                if ($isSqlite) {
                    $table->string('phone_code')->nullable();
                } else {
                    $table->string('phone_code')->nullable()->after(Schema::hasColumn('countries', 'timezone') ? 'timezone' : (Schema::hasColumn('countries', 'currency') ? 'currency' : 'code'));
                }
            }
        });

        Schema::table('countries', function (Blueprint $table) use ($isSqlite) {
            if (!Schema::hasColumn('countries', 'currency_id') && Schema::hasTable('currencies')) {
                if ($isSqlite) {
                    $table->unsignedBigInteger('currency_id')->nullable();
                } else {
                    $table->foreignId('currency_id')->nullable()->after(Schema::hasColumn('countries', 'currency') ? 'currency' : 'code')->constrained('currencies')->nullOnDelete();
                }
            }

            if (!Schema::hasColumn('countries', 'default_language')) {
                if ($isSqlite) {
                    $table->string('default_language', 5)->default('ar');
                } else {
                    $table->string('default_language', 5)->default('ar')->after(Schema::hasColumn('countries', 'currency_id') ? 'currency_id' : (Schema::hasColumn('countries', 'currency') ? 'currency' : 'code'));
                }
            }
        });

        if ($isSqlite) {
            return;
        }

        $columnsToDrop = array_values(array_filter([
            Schema::hasColumn('countries', 'latitude') ? 'latitude' : null,
            Schema::hasColumn('countries', 'longitude') ? 'longitude' : null,
        ]));

        if (count($columnsToDrop) > 0) {
            Schema::table('countries', function (Blueprint $table) use ($columnsToDrop) {
                $table->dropColumn($columnsToDrop);
            });
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            return;
        }

        Schema::table('countries', function (Blueprint $table) {
            $columnsToDrop = array_values(array_filter([
                Schema::hasColumn('countries', 'default_language') ? 'default_language' : null,
                Schema::hasColumn('countries', 'currency_id') ? 'currency_id' : null,
                Schema::hasColumn('countries', 'phone_code') ? 'phone_code' : null,
                Schema::hasColumn('countries', 'timezone') ? 'timezone' : null,
                Schema::hasColumn('countries', 'currency') ? 'currency' : null,
            ]));

            if (count($columnsToDrop) > 0) {
                $table->dropColumn($columnsToDrop);
            }
        });
    }
};
