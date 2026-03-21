<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('company')) {
            return;
        }

        if (Schema::hasColumn('company', 'user_id')) {
            return;
        }

        Schema::table('company', function (Blueprint $table) {
            $table->foreignId('user_id')->nullable()->after('id')->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('company')) {
            return;
        }

        if (! Schema::hasColumn('company', 'user_id')) {
            return;
        }

        try {
            Schema::table('company', function (Blueprint $table) {
                $table->dropForeign(['user_id']);
            });
        } catch (\Throwable $e) {
        }

        Schema::table('company', function (Blueprint $table) {
            $table->dropColumn('user_id');
        });
    }
};
