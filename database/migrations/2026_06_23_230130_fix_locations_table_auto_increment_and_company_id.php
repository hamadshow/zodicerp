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
        Schema::table('locations', function (Blueprint $table) {
            // Add company_id column if it doesn't exist
            if (!Schema::hasColumn('locations', 'company_id')) {
                $table->unsignedBigInteger('company_id')->nullable()->index()->after('metadata');
            }
            
            // Make id auto increment
            $table->bigIncrements('id')->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('locations', function (Blueprint $table) {
            $table->dropColumn('company_id');
        });
    }
};
