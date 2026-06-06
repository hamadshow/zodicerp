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
        Schema::table('bank_accounts', function (Blueprint $table) {
            $table->enum('account_type', ['bank', 'cash'])->default('bank')->after('id');
            $table->unsignedBigInteger('bank_id')->nullable()->change();
        });

        // Create a default "Cash" bank entity to house cash accounts in the UI if needed
        $cashBankId = DB::table('banks')->insertGetId([
            'bank_code' => 'CASH',
            'name' => 'Cash Treasury',
            'short_name' => 'Cash',
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Migrate existing cash_accounts to bank_accounts if table exists
        if (Schema::hasTable('cash_accounts')) {
            $cashAccounts = DB::table('cash_accounts')->get();
            foreach ($cashAccounts as $cash) {
                DB::table('bank_accounts')->insert([
                    'account_type' => 'cash',
                    'bank_id' => $cashBankId, // Link to the virtual "Cash" bank for UI visibility
                    'account_name' => $cash->name,
                    'account_number' => $cash->code ?? $cash->account_code ?? 'CASH-' . $cash->id,
                    'currency' => $cash->currency_id ?? $cash->currency ?? 'EGP',
                    'opening_balance' => $cash->opening_balance,
                    'current_balance' => $cash->current_balance,
                    'gl_account_id' => $cash->gl_account_id,
                    'status' => ($cash->is_active ?? ($cash->status === 'active')) ? 'active' : 'inactive',
                    'created_at' => $cash->created_at,
                    'updated_at' => $cash->updated_at,
                    'deleted_at' => $cash->deleted_at ?? null,
                ]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('bank_accounts', function (Blueprint $table) {
            $table->dropColumn('account_type');
            $table->unsignedBigInteger('bank_id')->nullable(false)->change();
        });
    }
};
