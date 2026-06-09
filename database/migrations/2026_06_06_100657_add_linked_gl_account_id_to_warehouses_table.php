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
        Schema::table('warehouses', function (Blueprint $table) {
            // Drop existing column if it exists to ensure correct type (bigint -> int unsigned)
            if (Schema::hasColumn('warehouses', 'linked_gl_account_id')) {
                $table->dropColumn('linked_gl_account_id');
            }
        });

        Schema::table('warehouses', function (Blueprint $table) {
            $table->integer('linked_gl_account_id')->unsigned()->nullable()->after('branch_id');
        });
        
        // Add foreign key separately
        Schema::table('warehouses', function (Blueprint $table) {
             $table->foreign('linked_gl_account_id', 'wh_linked_gl_acc_fk')
                  ->references('AccID')
                  ->on('accounts')
                  ->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('warehouses', function (Blueprint $table) {
            $table->dropForeign('wh_linked_gl_acc_fk');
            $table->dropColumn('linked_gl_account_id');
        });
    }
};
