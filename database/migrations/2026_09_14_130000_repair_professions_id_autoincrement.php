<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The imported `professions` schema can carry a primary key without
     * AUTO_INCREMENT, which makes every Profession::create() fail with
     * SQLSTATE[HY000] 1364 ("Field 'id' doesn't have a default value").
     * Align the live column with the schema the migrations describe.
     */
    public function up(): void
    {
        if (! Schema::hasTable('professions')) {
            return;
        }

        $column = DB::selectOne(
            "SELECT COLUMN_TYPE, IS_NULLABLE, EXTRA
             FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = 'professions'
               AND COLUMN_NAME = 'id'"
        );

        if (! $column || str_contains(strtolower((string) $column->EXTRA), 'auto_increment')) {
            return;
        }

        $type = strtoupper((string) $column->COLUMN_TYPE);
        $nullability = strtoupper((string) $column->IS_NULLABLE) === 'YES' ? 'NULL' : 'NOT NULL';

        DB::statement("ALTER TABLE `professions` MODIFY COLUMN `id` {$type} {$nullability} AUTO_INCREMENT");
    }

    public function down(): void
    {
        // Removing auto-increment would break primary key generation for profession records.
    }
};
