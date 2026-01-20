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
        // Table: banks
        Schema::create('banks', function (Blueprint $table) {
            $table->charset = 'utf8mb4';
            $table->collation = 'utf8mb4_unicode_ci';

            $table->id();
            $table->string('bank_code', 50)->unique();
            $table->string('name', 150);
            $table->string('short_name', 50)->nullable();
            $table->string('swift_code', 50)->nullable();
            $table->string('iban_prefix', 10)->nullable();
            $table->string('country', 100)->nullable();
            $table->string('currency', 10)->nullable();
            $table->string('logo', 191)->nullable();
            $table->enum('status', ['active', 'inactive'])->default('active');
            
            $table->timestamps();
            $table->softDeletes();
        });

        // Table: bank_accounts
        Schema::create('bank_accounts', function (Blueprint $table) {
            $table->charset = 'utf8mb4';
            $table->collation = 'utf8mb4_unicode_ci';

            $table->id();
            $table->unsignedBigInteger('bank_id');
            $table->string('account_name', 150);
            $table->string('account_number', 100)->unique();
            $table->string('iban', 50)->nullable();
            $table->string('currency', 10);
            $table->decimal('opening_balance', 18, 2)->default(0);
            $table->decimal('current_balance', 18, 2)->default(0);
            // Assuming 'accounts' table exists for GL account linking (from previous context)
            // Using bigInteger to match likely ID type, but referencing primary key of accounts if available
            // Note: Context showed Account model primary key is 'AccID' (integer), not 'id' (bigint).
            // However, usually migrations use id() which is unsignedBigInteger.
            // I will use unsignedBigInteger but comment out the constraint if I'm not 100% sure about the foreign key target type match
            // or simply leave it as an integer if Account uses integer.
            // Context says: protected $primaryKey = 'AccID'; in Account.php, but migration might be different.
            // Safe bet: unsignedBigInteger, but no strict FK constraint to 'accounts' to avoid type mismatch errors if 'accounts' uses int.
            $table->unsignedBigInteger('gl_account_id')->nullable();
            $table->boolean('is_default')->default(false);
            $table->enum('status', ['active', 'inactive'])->default('active');

            $table->timestamps();
            $table->softDeletes();

            $table->foreign('bank_id')->references('id')->on('banks')->onDelete('cascade');
            $table->index('bank_id');
        });

        // Table: bank_payments
        Schema::create('bank_payments', function (Blueprint $table) {
            $table->charset = 'utf8mb4';
            $table->collation = 'utf8mb4_unicode_ci';

            $table->id();
            $table->unsignedBigInteger('bank_account_id');
            $table->string('payment_no', 100)->unique();
            $table->date('payment_date');
            $table->enum('payee_type', ['supplier', 'employee', 'other']);
            $table->unsignedBigInteger('payee_id')->nullable();
            $table->decimal('amount', 18, 2);
            $table->string('reference', 150)->nullable();
            $table->text('notes')->nullable();
            $table->enum('status', ['draft', 'posted', 'cancelled'])->default('draft');
            $table->unsignedBigInteger('created_by')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->foreign('bank_account_id')->references('id')->on('bank_accounts')->onDelete('cascade');
            $table->index('bank_account_id');
        });

        // Table: bank_receipts
        Schema::create('bank_receipts', function (Blueprint $table) {
            $table->charset = 'utf8mb4';
            $table->collation = 'utf8mb4_unicode_ci';

            $table->id();
            $table->unsignedBigInteger('bank_account_id');
            $table->string('receipt_no', 100)->unique();
            $table->date('receipt_date');
            $table->enum('payer_type', ['customer', 'other']);
            $table->unsignedBigInteger('payer_id')->nullable();
            $table->decimal('amount', 18, 2);
            $table->string('reference', 150)->nullable();
            $table->text('notes')->nullable();
            $table->enum('status', ['draft', 'posted', 'cancelled'])->default('draft');
            $table->unsignedBigInteger('created_by')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->foreign('bank_account_id')->references('id')->on('bank_accounts')->onDelete('cascade');
            $table->index('bank_account_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('bank_receipts');
        Schema::dropIfExists('bank_payments');
        Schema::dropIfExists('bank_accounts');
        Schema::dropIfExists('banks');
    }
};
