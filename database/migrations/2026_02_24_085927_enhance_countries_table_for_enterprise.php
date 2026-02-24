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
        Schema::table('countries', function (Blueprint $table) {
            if (!Schema::hasColumn('countries', 'currency_id')) {
                $table->foreignId('currency_id')->nullable()->after('currency')->constrained('currencies')->onDelete('set null');
            }
            if (!Schema::hasColumn('countries', 'default_language')) {
                $table->string('default_language', 5)->default('ar')->after('currency_id');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('countries', function (Blueprint $table) {
            $table->dropForeign(['currency_id']);
            $table->dropColumn(['currency_id', 'default_language']);
        });
    }
};
