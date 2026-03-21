<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('users')) {
            return;
        }

        if (Schema::hasColumn('users', 'fullname')) {
            return;
        }

        if (! Schema::hasColumn('users', 'first_name')) {
            return;
        }

        DB::statement('ALTER TABLE `users` CHANGE `first_name` `fullname` VARCHAR(255) NULL');

        if (Schema::hasColumn('users', 'name') && Schema::hasColumn('users', 'fullname')) {
            DB::table('users')
                ->whereNotNull('name')
                ->where('name', '!=', '')
                ->update(['fullname' => DB::raw('`name`')]);
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('users')) {
            return;
        }

        if (Schema::hasColumn('users', 'first_name')) {
            return;
        }

        if (! Schema::hasColumn('users', 'fullname')) {
            return;
        }

        DB::statement('ALTER TABLE `users` CHANGE `fullname` `first_name` VARCHAR(255) NULL');
    }
};
