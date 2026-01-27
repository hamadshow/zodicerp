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
            $table->renameColumn('telegram', 'email');
        });

        Schema::table('supplier_contacts', function (Blueprint $table) {
            $table->renameColumn('telegram', 'email');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('suppliers', function (Blueprint $table) {
            $table->renameColumn('email', 'telegram');
        });

        Schema::table('supplier_contacts', function (Blueprint $table) {
            $table->renameColumn('email', 'telegram');
        });
    }
};
