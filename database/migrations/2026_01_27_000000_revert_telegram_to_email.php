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
        if (Schema::hasTable('suppliers')) {
            Schema::table('suppliers', function (Blueprint $table) {
                if (Schema::hasColumn('suppliers', 'telegram')) {
                    $table->renameColumn('telegram', 'email');
                }
            });
        }

        if (Schema::hasTable('supplier_contacts')) {
            Schema::table('supplier_contacts', function (Blueprint $table) {
                if (Schema::hasColumn('supplier_contacts', 'telegram')) {
                    $table->renameColumn('telegram', 'email');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('suppliers')) {
            Schema::table('suppliers', function (Blueprint $table) {
                if (Schema::hasColumn('suppliers', 'email')) {
                    $table->renameColumn('email', 'telegram');
                }
            });
        }

        if (Schema::hasTable('supplier_contacts')) {
            Schema::table('supplier_contacts', function (Blueprint $table) {
                if (Schema::hasColumn('supplier_contacts', 'email')) {
                    $table->renameColumn('email', 'telegram');
                }
            });
        }
    }
};
