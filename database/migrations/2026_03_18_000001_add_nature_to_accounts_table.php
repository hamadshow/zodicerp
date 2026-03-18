<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('accounts')) {
            return;
        }

        if (Schema::hasColumn('accounts', 'Nature')) {
            return;
        }

        Schema::table('accounts', function (Blueprint $table) {
            $table->string('Nature', 50)->nullable()->after('AccParent');
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('accounts')) {
            return;
        }

        if (!Schema::hasColumn('accounts', 'Nature')) {
            return;
        }

        Schema::table('accounts', function (Blueprint $table) {
            $table->dropColumn('Nature');
        });
    }
};
