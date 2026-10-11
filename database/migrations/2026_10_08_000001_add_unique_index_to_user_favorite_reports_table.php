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
        Schema::table('user_favorite_reports', function (Blueprint $table) {
            $columns = ['user_id', 'report_id'];

            if (Schema::hasColumn('user_favorite_reports', 'company_id')) {
                $columns[] = 'company_id';
            }

            $table->unique($columns, 'user_favorite_reports_user_report_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('user_favorite_reports', function (Blueprint $table) {
            $table->dropUnique('user_favorite_reports_user_report_unique');
        });
    }
};
