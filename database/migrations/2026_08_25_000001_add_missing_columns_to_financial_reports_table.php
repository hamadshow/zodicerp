<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('financial_reports', function (Blueprint $table) {
            if (!Schema::hasColumn('financial_reports', 'company_id')) {
                $table->unsignedBigInteger('company_id')->nullable()->after('id');
                $table->foreign('company_id')->references('id')->on('companies')->onDelete('cascade');
            }
            if (!Schema::hasColumn('financial_reports', 'report_name_ar')) {
                $table->string('report_name_ar', 255)->nullable()->after('report_name');
            }
            if (!Schema::hasColumn('financial_reports', 'description_ar')) {
                $table->text('description_ar')->nullable()->after('description');
            }
            if (!Schema::hasColumn('financial_reports', 'category_ar')) {
                $table->string('category_ar', 150)->nullable()->after('category');
            }
        });
    }

    public function down(): void
    {
        Schema::table('financial_reports', function (Blueprint $table) {
            if (Schema::hasColumn('financial_reports', 'category_ar')) {
                $table->dropColumn('category_ar');
            }
            if (Schema::hasColumn('financial_reports', 'description_ar')) {
                $table->dropColumn('description_ar');
            }
            if (Schema::hasColumn('financial_reports', 'report_name_ar')) {
                $table->dropColumn('report_name_ar');
            }
            if (Schema::hasColumn('financial_reports', 'company_id')) {
                $table->dropForeign(['company_id']);
                $table->dropColumn('company_id');
            }
        });
    }
};
