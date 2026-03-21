<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('cities')) {
            return;
        }

        if (Schema::hasColumn('cities', 'company_id')) {
            return;
        }

        Schema::table('cities', function (Blueprint $table) {
            $table->unsignedBigInteger('company_id')->nullable()->after('id');

            if (Schema::hasTable('company')) {
                $table->foreign('company_id')->references('id')->on('company')->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('cities')) {
            return;
        }

        if (! Schema::hasColumn('cities', 'company_id')) {
            return;
        }

        try {
            Schema::table('cities', function (Blueprint $table) {
                $table->dropForeign(['company_id']);
            });
        } catch (\Throwable $e) {
        }

        Schema::table('cities', function (Blueprint $table) {
            $table->dropColumn('company_id');
        });
    }
};
