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
        if (Schema::hasTable('industries')) {
            Schema::table('industries', function (Blueprint $table) {
                if (Schema::hasColumn('industries', 'sector_id')) {
                    // Drop foreign key first if it exists (ignoring error if not)
                    try {
                        $table->dropForeign(['sector_id']);
                    } catch (\Exception $e) {
                        // FK might already be gone if table was dropped with cascade or disabled checks
                    }
                    $table->dropColumn('sector_id');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('industries')) {
            Schema::table('industries', function (Blueprint $table) {
                if (!Schema::hasColumn('industries', 'sector_id')) {
                    if (Schema::hasTable('sectors')) {
                        $table->foreignId('sector_id')->nullable()->constrained('sectors');
                    } else {
                        $table->unsignedBigInteger('sector_id')->nullable();
                    }
                }
            });
        }
    }
};
