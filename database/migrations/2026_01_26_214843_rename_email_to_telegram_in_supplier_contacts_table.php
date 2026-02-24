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
        if (Schema::hasTable('supplier_contacts')) {
            Schema::table('supplier_contacts', function (Blueprint $table) {
                $table->renameColumn('email', 'telegram');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('supplier_contacts')) {
            Schema::table('supplier_contacts', function (Blueprint $table) {
                $table->renameColumn('telegram', 'email');
            });
        }
    }
};
