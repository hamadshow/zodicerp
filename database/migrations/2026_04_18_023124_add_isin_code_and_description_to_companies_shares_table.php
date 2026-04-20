<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('companies_shares', function (Blueprint $table) {
            if (!Schema::hasColumn('companies_shares', 'isin_code')) {
                $table->string('isin_code', 20)->nullable()->after('ticker_symbol');
            }
            if (!Schema::hasColumn('companies_shares', 'description')) {
                $table->text('description')->nullable()->after('isin_code');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('companies_shares', function (Blueprint $table) {
            $table->dropColumn(['isin_code', 'description']);
        });
    }
};
