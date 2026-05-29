<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('treasury_transactions', function (Blueprint $table) {
            if (! Schema::hasColumn('treasury_transactions', 'legacy_source_table')) {
                $table->string('legacy_source_table', 50)->nullable()->after('id');
            }

            if (! Schema::hasColumn('treasury_transactions', 'legacy_id')) {
                $table->unsignedBigInteger('legacy_id')->nullable()->after('legacy_source_table');
            }

            if (! Schema::hasColumn('treasury_transactions', 'legacy_code')) {
                $table->string('legacy_code', 100)->nullable()->after('legacy_id');
            }
        });

        Schema::table('treasury_transactions', function (Blueprint $table) {
            $table->index(['legacy_source_table', 'legacy_id'], 'treasury_legacy_lookup_idx');
            $table->unique(['legacy_source_table', 'legacy_id'], 'treasury_legacy_unique');
            $table->index(['company_id', 'transaction_date'], 'treasury_company_date_idx');
            $table->index(['transaction_type', 'status', 'transaction_date'], 'treasury_type_status_date_idx');
        });

        $this->backfillLegacyMapping();
    }

    protected function backfillLegacyMapping(): void
    {
        if (! Schema::hasTable('treasury_transactions')) {
            return;
        }

        if (Schema::hasTable('bank_receipts')) {
            DB::statement("
                UPDATE treasury_transactions tt
                JOIN bank_receipts br ON (tt.transaction_no = br.receipt_no OR tt.transaction_no LIKE CONCAT(br.receipt_no, '-%'))
                SET tt.legacy_source_table = 'bank_receipts',
                    tt.legacy_id = br.id,
                    tt.legacy_code = br.receipt_no
                WHERE tt.legacy_source_table IS NULL
                  AND tt.transaction_type = 'deposit'
                  AND tt.destination_account_type = 'bank'
            ");
        }

        if (Schema::hasTable('bank_payments')) {
            DB::statement("
                UPDATE treasury_transactions tt
                JOIN bank_payments bp ON (tt.transaction_no = bp.payment_no OR tt.transaction_no LIKE CONCAT(bp.payment_no, '-%'))
                SET tt.legacy_source_table = 'bank_payments',
                    tt.legacy_id = bp.id,
                    tt.legacy_code = bp.payment_no
                WHERE tt.legacy_source_table IS NULL
                  AND tt.transaction_type = 'withdrawal'
                  AND tt.source_account_type = 'bank'
            ");
        }

        if (Schema::hasTable('cash_receipts')) {
            DB::statement("
                UPDATE treasury_transactions tt
                JOIN cash_receipts cr ON (tt.transaction_no = cr.voucher_no OR tt.transaction_no LIKE CONCAT(cr.voucher_no, '-%'))
                SET tt.legacy_source_table = 'cash_receipts',
                    tt.legacy_id = cr.id,
                    tt.legacy_code = cr.voucher_no
                WHERE tt.legacy_source_table IS NULL
                  AND tt.transaction_type = 'deposit'
                  AND tt.destination_account_type = 'cash'
            ");
        }

        if (Schema::hasTable('cash_payments')) {
            DB::statement("
                UPDATE treasury_transactions tt
                JOIN cash_payments cp ON (tt.transaction_no = cp.voucher_no OR tt.transaction_no LIKE CONCAT(cp.voucher_no, '-%'))
                SET tt.legacy_source_table = 'cash_payments',
                    tt.legacy_id = cp.id,
                    tt.legacy_code = cp.voucher_no
                WHERE tt.legacy_source_table IS NULL
                  AND tt.transaction_type = 'withdrawal'
                  AND tt.source_account_type = 'cash'
            ");
        }

        if (Schema::hasTable('transfers')) {
            DB::statement("
                UPDATE treasury_transactions tt
                JOIN transfers tr ON (tt.transaction_no = tr.transfer_no OR tt.transaction_no LIKE CONCAT(tr.transfer_no, '-%'))
                SET tt.legacy_source_table = 'transfers',
                    tt.legacy_id = tr.id,
                    tt.legacy_code = tr.transfer_no
                WHERE tt.legacy_source_table IS NULL
                  AND tt.transaction_type = 'transfer'
            ");
        }
    }

    public function down(): void
    {
        Schema::table('treasury_transactions', function (Blueprint $table) {
            $table->dropIndex('treasury_legacy_lookup_idx');
            $table->dropUnique('treasury_legacy_unique');
            $table->dropIndex('treasury_company_date_idx');
            $table->dropIndex('treasury_type_status_date_idx');

            $table->dropColumn(['legacy_source_table', 'legacy_id', 'legacy_code']);
        });
    }
};
