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
        Schema::create('treasury_transactions', function (Blueprint $table) {
            $table->id();
            $table->string('transaction_no', 100)->unique();
            $table->enum('transaction_type', ['deposit', 'withdrawal', 'transfer']);
            
            // Source Account (Polymorphic: BankAccount or CashAccount)
            $table->string('source_account_type')->nullable();
            $table->unsignedBigInteger('source_account_id')->nullable();
            
            // Destination Account (Polymorphic: BankAccount or CashAccount)
            $table->string('destination_account_type')->nullable();
            $table->unsignedBigInteger('destination_account_id')->nullable();
            
            // Related Invoice (Polymorphic)
            $table->unsignedBigInteger('related_invoice_id')->nullable();
            $table->string('related_invoice_type')->nullable();
            
            // Counterparty (Polymorphic or simple reference)
            $table->string('counterparty_type')->nullable();
            $table->unsignedBigInteger('counterparty_id')->nullable();
            
            $table->decimal('amount', 18, 2);
            $table->string('currency', 3)->default('USD');
            $table->decimal('exchange_rate', 18, 6)->default(1.0);
            
            $table->string('reference', 150)->nullable();
            $table->text('notes')->nullable();
            $table->date('transaction_date');
            $table->enum('status', ['draft', 'posted', 'cancelled'])->default('draft');
            
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('company_id')->nullable();
            
            $table->timestamps();
            $table->softDeletes();

            $table->index(['source_account_type', 'source_account_id'], 'source_account_idx');
            $table->index(['destination_account_type', 'destination_account_id'], 'destination_account_idx');
            $table->index(['related_invoice_type', 'related_invoice_id'], 'related_invoice_idx');
            $table->index('transaction_date');
            $table->index('company_id');
        });

        $this->migrateExistingData();
    }

    private function migrateExistingData()
    {
        // 1. Migrate Bank Receipts (Deposits) that are NOT transfers
        if (Schema::hasTable('bank_receipts')) {
            $bankReceipts = DB::table('bank_receipts')
                ->where('notes', 'not like', 'TRANSFER_FROM:%')
                ->get();

            foreach ($bankReceipts as $receipt) {
                $no = $receipt->receipt_no;
                if (DB::table('treasury_transactions')->where('transaction_no', $no)->exists()) {
                    $no .= '-R';
                }
                DB::table('treasury_transactions')->insert([
                    'transaction_no' => $no,
                    'transaction_type' => 'deposit',
                    'destination_account_type' => 'bank',
                    'destination_account_id' => $receipt->bank_account_id,
                    'counterparty_type' => $receipt->payer_type,
                    'counterparty_id' => $receipt->payer_id,
                    'amount' => $receipt->amount,
                    'reference' => $receipt->reference,
                    'notes' => $receipt->notes,
                    'transaction_date' => $receipt->receipt_date,
                    'status' => $receipt->status,
                    'created_by' => $receipt->created_by,
                    'company_id' => $receipt->company_id ?? 1,
                    'created_at' => $receipt->created_at,
                    'updated_at' => $receipt->updated_at,
                    'deleted_at' => $receipt->deleted_at,
                ]);
            }
        }

        // 2. Migrate Bank Payments (Withdrawals) that are NOT transfers
        if (Schema::hasTable('bank_payments')) {
            $bankPayments = DB::table('bank_payments')
                ->where('notes', 'not like', 'TRANSFER_TO:%')
                ->get();

            foreach ($bankPayments as $payment) {
                $no = $payment->payment_no;
                if (DB::table('treasury_transactions')->where('transaction_no', $no)->exists()) {
                    $no .= '-P';
                }
                DB::table('treasury_transactions')->insert([
                    'transaction_no' => $no,
                    'transaction_type' => 'withdrawal',
                    'source_account_type' => 'bank',
                    'source_account_id' => $payment->bank_account_id,
                    'counterparty_type' => $payment->payee_type,
                    'counterparty_id' => $payment->payee_id,
                    'amount' => $payment->amount,
                    'reference' => $payment->reference,
                    'notes' => $payment->notes,
                    'transaction_date' => $payment->payment_date,
                    'status' => $payment->status,
                    'created_by' => $payment->created_by,
                    'company_id' => $payment->company_id ?? 1,
                    'created_at' => $payment->created_at,
                    'updated_at' => $payment->updated_at,
                    'deleted_at' => $payment->deleted_at,
                ]);
            }
        }

        // 3. Migrate Transfers (Merged Bank Pairs)
        if (Schema::hasTable('bank_payments')) {
            $transferPayments = DB::table('bank_payments')
                ->where('notes', 'like', 'TRANSFER_TO:%')
                ->get();

            foreach ($transferPayments as $payment) {
                // Extract destination account ID from notes: "TRANSFER_TO:ID|ORIGINAL_NOTES"
                $parts = explode('|', str_replace('TRANSFER_TO:', '', $payment->notes));
                $toAccountId = $parts[0];
                $originalNotes = $parts[1] ?? '';

                $no = $payment->payment_no;
                if (DB::table('treasury_transactions')->where('transaction_no', $no)->exists()) {
                    $no .= '-T';
                }

                DB::table('treasury_transactions')->insert([
                    'transaction_no' => $no,
                    'transaction_type' => 'transfer',
                    'source_account_type' => 'bank',
                    'source_account_id' => $payment->bank_account_id,
                    'destination_account_type' => 'bank',
                    'destination_account_id' => $toAccountId,
                    'amount' => $payment->amount,
                    'reference' => $payment->reference,
                    'notes' => $originalNotes,
                    'transaction_date' => $payment->payment_date,
                    'status' => $payment->status,
                    'created_by' => $payment->created_by,
                    'company_id' => $payment->company_id ?? 1,
                    'created_at' => $payment->created_at,
                    'updated_at' => $payment->updated_at,
                    'deleted_at' => $payment->deleted_at,
                ]);
            }
        }

        // 4. Migrate Cash Receipts
        if (Schema::hasTable('cash_receipts')) {
            $cashReceipts = DB::table('cash_receipts')->get();
            foreach ($cashReceipts as $receipt) {
                $no = $receipt->voucher_no;
                if (DB::table('treasury_transactions')->where('transaction_no', $no)->exists()) {
                    $no .= '-CR';
                }
                DB::table('treasury_transactions')->insert([
                    'transaction_no' => $no,
                    'transaction_type' => 'deposit',
                    'destination_account_type' => 'cash',
                    'destination_account_id' => $receipt->account_id,
                    'counterparty_type' => $receipt->payer_type ?? 'other',
                    'counterparty_id' => $receipt->payer_id ?? 0,
                    'amount' => $receipt->amount,
                    'reference' => $receipt->reference_no,
                    'notes' => $receipt->notes,
                    'transaction_date' => $receipt->receipt_date,
                    'status' => $receipt->status,
                    'created_by' => $receipt->created_by,
                    'company_id' => $receipt->company_id ?? 1,
                    'created_at' => $receipt->created_at,
                    'updated_at' => $receipt->updated_at,
                    'deleted_at' => $receipt->deleted_at,
                ]);
            }
        }

        // 5. Migrate Cash Payments
        if (Schema::hasTable('cash_payments')) {
            $cashPayments = DB::table('cash_payments')->get();
            foreach ($cashPayments as $payment) {
                $no = $payment->voucher_no;
                if (DB::table('treasury_transactions')->where('transaction_no', $no)->exists()) {
                    $no .= '-CP';
                }
                DB::table('treasury_transactions')->insert([
                    'transaction_no' => $no,
                    'transaction_type' => 'withdrawal',
                    'source_account_type' => 'cash',
                    'source_account_id' => $payment->account_id,
                    'counterparty_type' => $payment->payee_type ?? 'other',
                    'counterparty_id' => $payment->payee_id ?? 0,
                    'amount' => $payment->amount,
                    'reference' => $payment->reference_no,
                    'notes' => $payment->notes,
                    'transaction_date' => $payment->payment_date,
                    'status' => $payment->status,
                    'created_by' => $payment->created_by,
                    'company_id' => $payment->company_id ?? 1,
                    'created_at' => $payment->created_at,
                    'updated_at' => $payment->updated_at,
                    'deleted_at' => $payment->deleted_at,
                ]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('treasury_transactions');
    }
};
