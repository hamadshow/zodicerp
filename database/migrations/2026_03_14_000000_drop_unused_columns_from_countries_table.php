<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $columnsToDrop = array_values(array_filter([
            Schema::hasColumn('countries', 'latitude') ? 'latitude' : null,
            Schema::hasColumn('countries', 'longitude') ? 'longitude' : null,
        ]));

        if (count($columnsToDrop) > 0) {
            Schema::table('countries', function (Blueprint $table) use ($columnsToDrop) {
                $table->dropColumn($columnsToDrop);
            });
        }
    }

    public function down(): void
    {
        Schema::table('countries', function (Blueprint $table) {
            if (!Schema::hasColumn('countries', 'latitude')) {
                $table->decimal('latitude', 10, 7)->nullable();
            }

            if (!Schema::hasColumn('countries', 'longitude')) {
                $table->decimal('longitude', 10, 7)->nullable();
            }
        });
    }
};
