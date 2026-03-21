<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('companies') && ! Schema::hasTable('companies_shares')) {
            Schema::rename('companies', 'companies_shares');
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('companies_shares') && ! Schema::hasTable('companies')) {
            Schema::rename('companies_shares', 'companies');
        }
    }
};
