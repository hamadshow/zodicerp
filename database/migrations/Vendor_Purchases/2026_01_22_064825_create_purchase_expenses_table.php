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
        Schema::create('purchase_expenses', function (Blueprint $table) {
            $table->charset = 'utf8mb4';
            $table->collation = 'utf8mb4_unicode_ci';

            $table->id();
            $table->string('expense_number', 50)->unique();
            $table->date('expense_date');
            $table->foreignId('supplier_id')->nullable()->constrained('suppliers');
            $table->foreignId('invoice_id')->nullable()->constrained('purchase_invoices');
            $table->enum('expense_type', ['shipping', 'freight', 'customs', 'insurance', 'handling', 'storage', 'installation', 'other']);
            $table->string('description_ar', 255)->nullable();
            $table->string('description_en', 255)->nullable();
            $table->decimal('amount', 15, 2)->default(0);
            $table->foreignId('currency_id')->constrained('currencies');
            $table->decimal('exchange_rate', 15, 6)->default(1.000000);
            
            // Generated column: base_amount = amount * exchange_rate
            $table->decimal('base_amount', 15, 2)->storedAs('amount * exchange_rate');
            
            $table->foreignId('tax_id')->nullable()->constrained('purchase_taxes');
            $table->decimal('tax_amount', 15, 2)->default(0);
            
            // Generated column: total_amount = amount + tax_amount
            $table->decimal('total_amount', 15, 2)->storedAs('amount + tax_amount');
            
            $table->enum('allocation_status', ['not_allocated', 'partially_allocated', 'fully_allocated'])->default('not_allocated');
            $table->decimal('allocated_amount', 15, 2)->default(0);
            $table->boolean('is_posted')->default(false);
            $table->timestamp('posted_at')->nullable();
            $table->foreignId('posted_by')->nullable()->constrained('users'); // Assuming 'users' table
            $table->enum('payment_status', ['unpaid', 'partial', 'paid'])->default('unpaid');
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users');
            $table->timestamps();
            $table->softDeletes();

            $table->index('expense_number', 'idx_purchase_expenses_number');
            $table->index('expense_date', 'idx_purchase_expenses_date');
            $table->index('invoice_id', 'idx_purchase_expenses_invoice');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('purchase_expenses');
    }
};
