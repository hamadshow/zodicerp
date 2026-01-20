<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('cheque_transactions')) {
            return;
        }

        DB::statement("ALTER TABLE `cheque_transactions` MODIFY `action` ENUM('issue','receive','deposit','clear','return','cancel','created','updated','status_updated') NOT NULL");
    }

    public function down(): void
    {
        if (!Schema::hasTable('cheque_transactions')) {
            return;
        }

        DB::statement("ALTER TABLE `cheque_transactions` MODIFY `action` ENUM('issue','receive','deposit','clear','return','cancel') NOT NULL");
    }
};
