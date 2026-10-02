<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Repairs live-schema drift: the original create migration declares
     * `reason` as nullable text, but the live table has it as NOT NULL,
     * which breaks deduction creation when no reason is provided.
     */
    public function up(): void
    {
        Schema::table('deductions', function (Blueprint $table) {
            $table->text('reason')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('deductions', function (Blueprint $table) {
            $table->text('reason')->nullable(false)->change();
        });
    }
};
