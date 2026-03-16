<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    protected array $skipTables = [
        'migrations',
        'failed_jobs',
        'password_reset_tokens',
        'personal_access_tokens',
    ];

    protected function isBaseTable(string $table): bool
    {
        $row = DB::selectOne(
            'SELECT TABLE_TYPE FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?',
            [$table]
        );

        return ($row?->TABLE_TYPE ?? null) === 'BASE TABLE';
    }

    protected function listTables(): array
    {
        $rows = DB::select('SHOW TABLES');
        $dbName = DB::getDatabaseName();
        $key = 'Tables_in_' . $dbName;

        $tables = [];
        foreach ($rows as $row) {
            $tables[] = $row->$key ?? (array_values((array) $row)[0] ?? null);
        }

        return array_values(array_filter($tables));
    }

    public function up(): void
    {
        foreach ($this->listTables() as $table) {
            if (in_array($table, $this->skipTables, true)) {
                continue;
            }

            if (!$this->isBaseTable($table)) {
                continue;
            }

            if (!Schema::hasTable($table)) {
                continue;
            }

            if (Schema::hasColumn($table, 'company_id')) {
                continue;
            }

            Schema::table($table, function (Blueprint $tableBlueprint) {
                $tableBlueprint->unsignedBigInteger('company_id')->nullable()->index();
            });
        }
    }

    public function down(): void
    {
        foreach ($this->listTables() as $table) {
            if (in_array($table, $this->skipTables, true)) {
                continue;
            }

            if (!$this->isBaseTable($table)) {
                continue;
            }

            if (!Schema::hasTable($table)) {
                continue;
            }

            if (!Schema::hasColumn($table, 'company_id')) {
                continue;
            }

            try {
                Schema::table($table, function (Blueprint $tableBlueprint) {
                    $tableBlueprint->dropIndex(['company_id']);
                });
            } catch (\Throwable $e) {
            }

            Schema::table($table, function (Blueprint $tableBlueprint) {
                $tableBlueprint->dropColumn('company_id');
            });
        }
    }
};

