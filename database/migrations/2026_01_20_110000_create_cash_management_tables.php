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
        // Cash Accounts
        Schema::create('cash_accounts', function (Blueprint $table) {
            $table->id();
            $table->string('account_code', 50)->unique();
            $table->string('name', 150);
            $table->enum('type', ['cash', 'bank'])->default('cash');
            $table->foreignId('bank_id')->nullable()->constrained('banks')->nullOnDelete();
            $table->string('currency', 10)->default('USD');
            $table->decimal('opening_balance', 18, 2)->default(0);
            $table->decimal('current_balance', 18, 2)->default(0);
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->boolean('is_default')->default(false);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->softDeletes();
            $table->timestamps();

            $table->charset = 'utf8mb4';
            $table->collation = 'utf8mb4_unicode_ci';
        });

        // Cash Payments
        Schema::create('cash_payments', function (Blueprint $table) {
            $table->id();
            $table->string('voucher_no', 50)->unique();
            $table->foreignId('account_id')->constrained('cash_accounts')->cascadeOnDelete();
            $table->nullableMorphs('payee'); // creates payee_type and payee_id
            $table->decimal('amount', 18, 2);
            $table->date('payment_date');
            $table->string('reference_no', 100)->nullable();
            $table->text('notes')->nullable();
            $table->enum('status', ['draft', 'posted', 'cancelled'])->default('posted');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->softDeletes();
            $table->timestamps();

            $table->charset = 'utf8mb4';
            $table->collation = 'utf8mb4_unicode_ci';
        });

        // Cash Receipts
        Schema::create('cash_receipts', function (Blueprint $table) {
            $table->id();
            $table->string('voucher_no', 50)->unique();
            $table->foreignId('account_id')->constrained('cash_accounts')->cascadeOnDelete();
            $table->nullableMorphs('payer'); // creates payer_type and payer_id
            $table->decimal('amount', 18, 2);
            $table->date('receipt_date');
            $table->string('reference_no', 100)->nullable();
            $table->text('notes')->nullable();
            $table->enum('status', ['draft', 'posted', 'cancelled'])->default('posted');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->softDeletes();
            $table->timestamps();

            $table->charset = 'utf8mb4';
            $table->collation = 'utf8mb4_unicode_ci';
        });

        // Transfers
        Schema::create('transfers', function (Blueprint $table) {
            $table->id();
            $table->string('transfer_no', 50)->unique();
            $table->foreignId('from_account_id')->constrained('cash_accounts')->cascadeOnDelete();
            $table->foreignId('to_account_id')->constrained('cash_accounts')->cascadeOnDelete();
            $table->decimal('amount', 18, 2);
            $table->date('transfer_date');
            $table->enum('method', ['cash', 'bank', 'internal'])->default('internal');
            $table->text('notes')->nullable();
            $table->enum('status', ['draft', 'posted', 'cancelled'])->default('posted');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->softDeletes();
            $table->timestamps();

            $table->charset = 'utf8mb4';
            $table->collation = 'utf8mb4_unicode_ci';
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('transfers');
        Schema::dropIfExists('cash_receipts');
        Schema::dropIfExists('cash_payments');
        Schema::dropIfExists('cash_accounts');
    }
};
