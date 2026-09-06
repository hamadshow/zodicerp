<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('migrations')) {
            return;
        }

        $column = DB::selectOne(
            "SELECT COLUMN_TYPE, IS_NULLABLE, EXTRA
             FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = 'migrations'
               AND COLUMN_NAME = 'id'"
        );

        if (! $column || str_contains(strtolower((string) $column->EXTRA), 'auto_increment')) {
            return;
        }

        $type = strtoupper((string) $column->COLUMN_TYPE);
        $nullability = strtoupper((string) $column->IS_NULLABLE) === 'YES' ? 'NULL' : 'NOT NULL';

        DB::statement("ALTER TABLE `migrations` MODIFY COLUMN `id` {$type} {$nullability} AUTO_INCREMENT");
    }

    public function down(): void
    {
        // Removing auto-increment would make the migration ledger unsafe again.
    }
};