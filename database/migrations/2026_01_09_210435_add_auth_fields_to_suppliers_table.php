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
        Schema::table('suppliers', function (Blueprint $table) {
            $table->string('company_name')->nullable()->after('supplier_name');
            $table->string('password')->after('email');
            $table->string('email')->nullable(false)->change();
            $table->unique('email');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('suppliers', function (Blueprint $table) {
            $table->dropColumn(['company_name', 'password']);
            $table->dropUnique(['email']);
            $table->string('email')->nullable()->change();
        });
    }
};
