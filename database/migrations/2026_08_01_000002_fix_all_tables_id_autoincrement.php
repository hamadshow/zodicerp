<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $dbName = DB::connection()->getDatabaseName();
        $tableKey = 'Tables_in_' . $dbName;
        $tables = DB::select('SHOW TABLES');

        $skipTables = ['sessions'];

        foreach ($tables as $t) {
            $tableName = $t->$tableKey;

            if (in_array($tableName, $skipTables, true)) {
                continue;
            }

            if (!Schema::hasTable($tableName)) {
                continue;
            }

            $cols = DB::select("SHOW COLUMNS FROM `{$tableName}` WHERE Field = 'id'");
            if (empty($cols)) {
                continue;
            }

            $extra = strtolower($cols[0]->Extra ?? '');
            if (str_contains($extra, 'auto_increment')) {
                continue;
            }

            $type = $cols[0]->Type;
            $nullable = $cols[0]->Null;
            $nullClause = strtoupper($nullable) === 'YES' ? 'NULL' : 'NOT NULL';

            $normalizedType = $this->normalizeIdColumnType($type);

            $sql = "ALTER TABLE `{$tableName}` MODIFY COLUMN id {$normalizedType} {$nullClause} AUTO_INCREMENT";

            try {
                DB::statement($sql);
            } catch (\Throwable $e) {
                report("Fix AI failed for {$tableName}: " . $e->getMessage());
            }
        }
    }

    public function down(): void
    {
    }

    protected function normalizeIdColumnType(string $rawType): string
    {
        $raw = strtolower(trim($rawType));

        if (str_contains($raw, 'bigint')) {
            return str_contains($raw, 'unsigned')
                ? 'BIGINT UNSIGNED'
                : 'BIGINT';
        }

        if (str_contains($raw, 'int')) {
            return str_contains($raw, 'unsigned')
                ? 'INT UNSIGNED'
                : 'INT';
        }

        if (str_contains($raw, 'smallint')) {
            return str_contains($raw, 'unsigned')
                ? 'SMALLINT UNSIGNED'
                : 'SMALLINT';
        }

        if (str_contains($raw, 'tinyint')) {
            return str_contains($raw, 'unsigned')
                ? 'TINYINT UNSIGNED'
                : 'TINYINT';
        }

        if (str_contains($raw, 'mediumint')) {
            return str_contains($raw, 'unsigned')
                ? 'MEDIUMINT UNSIGNED'
                : 'MEDIUMINT';
        }

        return 'BIGINT UNSIGNED';
    }
};
