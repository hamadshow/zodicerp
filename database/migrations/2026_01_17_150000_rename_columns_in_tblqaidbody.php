<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('tblqaidbody')) {
            return;
        }

        Schema::table('tblqaidbody', function (Blueprint $table) {
            if (Schema::hasColumn('tblqaidbody', 'QaidBodyM1')) {
                try {
                    $table->renameColumn('QaidBodyM1', 'QaidDebit');
                } catch (\Throwable $e) {
                    if (DB::getDriverName() !== 'sqlite') {
                        DB::statement('ALTER TABLE `tblqaidbody` CHANGE `QaidBodyM1` `QaidDebit` DOUBLE NOT NULL');
                    }
                }
            }

            if (Schema::hasColumn('tblqaidbody', 'QaidBodyD1')) {
                try {
                    $table->renameColumn('QaidBodyD1', 'QaidCredit');
                } catch (\Throwable $e) {
                    if (DB::getDriverName() !== 'sqlite') {
                        DB::statement('ALTER TABLE `tblqaidbody` CHANGE `QaidBodyD1` `QaidCredit` DOUBLE NOT NULL');
                    }
                }
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('tblqaidbody')) {
            return;
        }

        Schema::table('tblqaidbody', function (Blueprint $table) {
            if (Schema::hasColumn('tblqaidbody', 'QaidDebit')) {
                try {
                    $table->renameColumn('QaidDebit', 'QaidBodyM1');
                } catch (\Throwable $e) {
                    DB::statement('ALTER TABLE `tblqaidbody` CHANGE `QaidDebit` `QaidBodyM1` DOUBLE NOT NULL');
                }
            }

            if (Schema::hasColumn('tblqaidbody', 'QaidCredit')) {
                try {
                    $table->renameColumn('QaidCredit', 'QaidBodyD1');
                } catch (\Throwable $e) {
                    DB::statement('ALTER TABLE `tblqaidbody` CHANGE `QaidCredit` `QaidBodyD1` DOUBLE NOT NULL');
                }
            }
        });
    }
};
