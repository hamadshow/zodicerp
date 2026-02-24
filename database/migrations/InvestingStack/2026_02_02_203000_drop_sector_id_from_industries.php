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
        Schema::disableForeignKeyConstraints();
        if (Schema::hasTable('industries')) {
            Schema::table('industries', function (Blueprint $table) {
                if (Schema::hasColumn('industries', 'sector_id')) {
                    // Drop foreign key first if it exists
                    // Note: The exact name depends on Laravel's generation, usually industries_sector_id_foreign
                    // We'll try to drop it using array syntax which guesses the name
                    try {
                        $table->dropForeign(['sector_id']);
                    } catch (\Exception $e) {
                        // Foreign key might not exist or have different name, ignore
                    }
                    
                    try {
                         $table->dropIndex('idx_sector_industry');
                    } catch (\Exception $e) {
                    }
    
                    $table->dropColumn('sector_id');
                }
            });
        }
        Schema::enableForeignKeyConstraints();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // We cannot easily reverse this since sectors table is gone
    }
};
