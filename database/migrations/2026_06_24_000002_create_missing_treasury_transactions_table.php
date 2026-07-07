<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('treasury_transactions')) {
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
                
                // Counterparty (Polymorphic)
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
                $table->unsignedBigInteger('company_id')->nullable()->index();
                
                // Legacy Mapping
                $table->string('legacy_source_table', 50)->nullable();
                $table->unsignedBigInteger('legacy_id')->nullable();
                $table->string('legacy_code', 100)->nullable();

                $table->timestamps();
                $table->softDeletes();

                // Indexes
                $table->index(['source_account_type', 'source_account_id'], 'source_account_idx');
                $table->index(['destination_account_type', 'destination_account_id'], 'destination_account_idx');
                $table->index(['related_invoice_type', 'related_invoice_id'], 'related_invoice_idx');
                $table->index(['legacy_source_table', 'legacy_id'], 'treasury_legacy_lookup_idx');
                $table->index(['transaction_type', 'status', 'transaction_date'], 'treasury_type_status_date_idx');
                $table->index('transaction_date');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('treasury_transactions');
    }
};
