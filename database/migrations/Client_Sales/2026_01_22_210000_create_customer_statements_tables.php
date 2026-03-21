<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customer_statements', function (Blueprint $table) {
            $table->charset = 'utf8mb4';
            $table->collation = 'utf8mb4_unicode_ci';
            $table->increments('id');
            $table->string('statement_number', 50)->unique();
            $table->unsignedInteger('customer_id'); // Match customers.id (increments)
            $table->unsignedBigInteger('currency_id'); // Match currencies.id (bigint unsigned)
            $table->date('statement_date');
            $table->date('period_from');
            $table->date('period_to');
            $table->decimal('opening_balance', 15, 2)->default(0);
            $table->decimal('total_invoices', 15, 2)->default(0);
            $table->decimal('total_payments', 15, 2)->default(0);
            $table->decimal('total_credit_notes', 15, 2)->default(0);
            $table->decimal('total_debit_notes', 15, 2)->default(0);
            $table->decimal('total_adjustments', 15, 2)->default(0);

            // Generated column for closing balance
            $table->decimal('closing_balance', 15, 2)->storedAs('opening_balance + total_invoices - total_payments - total_credit_notes + total_debit_notes + total_adjustments');

            $table->decimal('base_closing_balance', 15, 2)->nullable();
            $table->text('notes')->nullable();
            $table->boolean('is_sent')->default(false);
            $table->date('sent_date')->nullable();
            $table->enum('sent_method', ['email', 'print', 'both'])->nullable();
            $table->integer('created_by')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->nullable(); // Adding updated_at for standard Laravel timestamps

            // Foreign keys
            $table->foreign('customer_id')->references('id')->on('customers');
            $table->foreign('currency_id')->references('id')->on('currencies');

            // Indexes
            $table->index('statement_number');
            $table->index('customer_id');
            $table->index('statement_date');
        });

        Schema::create('customer_statement_details', function (Blueprint $table) {
            $table->charset = 'utf8mb4';
            $table->collation = 'utf8mb4_unicode_ci';
            $table->increments('id');
            $table->unsignedInteger('statement_id'); // Match customer_statements.id (increments)
            $table->date('transaction_date');
            $table->enum('document_type', ['invoice', 'payment', 'credit_note', 'debit_note', 'adjustment']);
            $table->unsignedBigInteger('document_id'); // Using BigInt to support sales_invoices.id (BigIncrements)
            $table->string('document_number', 50)->nullable();
            $table->text('description')->nullable();
            $table->decimal('debit_amount', 15, 2)->default(0);
            $table->decimal('credit_amount', 15, 2)->default(0);
            $table->decimal('balance', 15, 2)->nullable();

            // Foreign keys
            $table->foreign('statement_id')->references('id')->on('customer_statements')->onDelete('cascade');

            // Indexes
            $table->index('statement_id');
            $table->index(['document_type', 'document_id']);
            $table->timestamps(); // Adding timestamps for standard Laravel model behavior
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customer_statement_details');
        Schema::dropIfExists('customer_statements');
    }
};
