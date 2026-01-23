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
        Schema::create('supplier_payments', function (Blueprint $table) {
            $table->charset = 'utf8mb4';
            $table->collation = 'utf8mb4_unicode_ci';

            $table->id();
            $table->string('payment_number', 50)->unique();
            
            // Foreign Keys
            // supplier_id REFERENCES suppliers(id)
            $table->foreignId('supplier_id')->constrained('suppliers');
            
            // currency_id REFERENCES currencies(id)
            $table->foreignId('currency_id')->constrained('currencies');
            
            $table->decimal('exchange_rate', 15, 6)->default(1.000000);
            $table->date('payment_date');
            
            $table->enum('payment_method', ['cash', 'check', 'bank_transfer', 'credit_card', 'credit_note', 'other']);
            
            $table->decimal('amount', 15, 2)->default(0);
            
            // base_amount GENERATED ALWAYS AS (amount * exchange_rate) STORED
            $table->decimal('base_amount', 15, 2)->storedAs('amount * exchange_rate');
            
            $table->enum('payment_type', ['invoice_payment', 'advance_payment', 'credit_payment', 'adjustment'])->default('invoice_payment');
            
            // bank_account_id REFERENCES bank_accounts(id)
            $table->foreignId('bank_account_id')->nullable()->constrained('bank_accounts');
            
            $table->string('check_number', 50)->nullable();
            $table->date('check_date')->nullable();
            $table->date('check_due_date')->nullable();
            $table->string('reference_number', 100)->nullable();
            $table->text('description')->nullable();
            
            $table->enum('status', ['draft', 'posted', 'reconciled', 'cancelled'])->default('draft');
            
            $table->boolean('is_posted')->default(false);
            $table->timestamp('posted_at')->nullable();
            $table->unsignedBigInteger('posted_by')->nullable();
            
            $table->timestamp('reconciled_at')->nullable();
            $table->unsignedBigInteger('reconciled_by')->nullable();
            
            $table->text('notes')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            
            $table->timestamps();
            $table->softDeletes();
            
            // Indexes
            $table->index('payment_number', 'idx_payments_number');
            $table->index('payment_date', 'idx_payments_date');
            $table->index('supplier_id', 'idx_payments_supplier');
            $table->index('payment_method', 'idx_payments_method');
            $table->index('status', 'idx_payments_status');
        });

        // Add table comment
        try {
            DB::statement("ALTER TABLE supplier_payments COMMENT = 'مدفوعات الموردين'");
        } catch (\Exception $e) {
            // Ignore if driver doesn't support it
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('supplier_payments');
    }
};
