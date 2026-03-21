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

        if (Schema::hasColumn('users', 'username')) {
            return;
        }

        if (! Schema::hasColumn('users', 'name')) {
            return;
        }

        DB::statement('ALTER TABLE `users` CHANGE `name` `username` VARCHAR(255) NOT NULL');
    }

    public function down(): void
    {
        if (! Schema::hasTable('users')) {
            return;
        }

        if (Schema::hasColumn('users', 'name')) {
            return;
        }

        if (! Schema::hasColumn('users', 'username')) {
            return;
        }

        DB::statement('ALTER TABLE `users` CHANGE `username` `name` VARCHAR(255) NOT NULL');
    }
};
