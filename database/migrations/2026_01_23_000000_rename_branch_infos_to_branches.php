<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (Schema::hasTable('branch_infos')) {
            Schema::rename('branch_infos', 'branches');
        }

        // Also rename foreign key in other tables if they were constrained with 'branch_infos'
        // Warehouses table has foreignId('branch_id')->constrained('branch_infos')
        // Usually MySQL handles table rename automatically for foreign keys, but let's be safe.
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('branches')) {
            Schema::rename('branches', 'branch_infos');
        }
    }
};
