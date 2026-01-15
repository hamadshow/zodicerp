<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('accounts', function (Blueprint $table) {
            if (!Schema::hasColumn('accounts', 'AccCode')) {
                return;
            }

            $table->unique('AccCode');
            $table->index('AccParent');
        });
    }

    public function down(): void
    {
        Schema::table('accounts', function (Blueprint $table) {
            if (Schema::hasColumn('accounts', 'AccCode')) {
                $table->dropUnique('accounts_acccode_unique');
            }
            if (Schema::hasColumn('accounts', 'AccParent')) {
                $table->dropIndex('accounts_accparent_index');
            }
        });
    }
};
