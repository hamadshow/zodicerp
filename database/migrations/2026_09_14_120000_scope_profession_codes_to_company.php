<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $duplicates = DB::table('professions')
            ->select('company_id', 'profession_code')
            ->groupBy('company_id', 'profession_code')
            ->havingRaw('COUNT(*) > 1')
            ->get();

        if ($duplicates->isNotEmpty()) {
            throw new \RuntimeException('Cannot scope profession codes: duplicate codes exist within a company. Resolve the data before migrating.');
        }

        Schema::table('professions', function (Blueprint $table): void {
            $table->dropUnique(['profession_code']);
            $table->unique(['company_id', 'profession_code'], 'professions_company_code_unique');
        });
    }

    public function down(): void
    {
        Schema::table('professions', function (Blueprint $table): void {
            $table->dropUnique('professions_company_code_unique');
            $table->unique('profession_code');
        });
    }
};
