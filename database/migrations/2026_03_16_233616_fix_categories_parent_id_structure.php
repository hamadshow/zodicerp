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
        Schema::table('categories', function (Blueprint $table) {
            // Drop foreign key if it exists
            $table->dropForeign(['parent_id']);

            // Change parent_id to default 0 and not nullable if we want 0 as root
            // Or just set default 0 and allow null if needed, but the user wants 0 as main account.
            $table->unsignedBigInteger('parent_id')->default(0)->change();
        });

        // Update existing null parent_ids to 0
        \Illuminate\Support\Facades\DB::table('categories')
            ->whereNull('parent_id')
            ->update(['parent_id' => 0]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('categories', function (Blueprint $table) {
            $table->foreignId('parent_id')->nullable()->constrained('categories')->onDelete('set null')->change();
        });
    }
};
