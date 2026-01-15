<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Ensure data integrity before adding the unique constraint
        // We'll re-sequence all categories to have unique order values starting from 1
        $categories = DB::table('categories')->orderBy('order')->orderBy('id')->get();
        $order = 1;
        foreach ($categories as $category) {
             DB::table('categories')
                ->where('id', $category->id)
                ->update(['order' => $order++]);
        }

        // 2. Add the unique constraint
        Schema::table('categories', function (Blueprint $table) {
            $table->unique('order');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('categories', function (Blueprint $table) {
            $table->dropUnique(['order']);
        });
    }
};
