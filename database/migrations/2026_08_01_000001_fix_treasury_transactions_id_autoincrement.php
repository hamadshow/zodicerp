<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('treasury_transactions')) {
            $columns = Schema::getColumns('treasury_transactions');
            $idColumn = collect($columns)->firstWhere('name', 'id');

            if ($idColumn && !str_contains(strtolower($idColumn['extra'] ?? ''), 'auto_increment')) {
                DB::statement('ALTER TABLE treasury_transactions MODIFY COLUMN id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT');
            }
        }
    }

    public function down(): void
    {
    }
};
