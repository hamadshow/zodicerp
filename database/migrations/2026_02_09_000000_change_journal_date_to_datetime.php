<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (Schema::hasTable('journal_entries')) {
             // Using raw SQL to ensure compatibility without doctrine/dbal
             DB::statement('ALTER TABLE journal_entries MODIFY date DATETIME NULL');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('journal_entries')) {
            DB::statement('ALTER TABLE journal_entries MODIFY date DATE NULL');
        }
    }
};
