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
        Schema::create('tax_invoices', function (Blueprint $table) {
            $table->id(); // BigInt
            $table->string('invoice_number', 100)->unique();
            $table->unsignedBigInteger('original_invoice_id')->nullable();

            // Basics
            $table->enum('document_type', ['tax_invoice', 'simplified_invoice', 'credit_note', 'debit_note']);
            $table->enum('transaction_type', ['sale', 'purchase', 'expense', 'receipt']);

            // Parties
            $table->unsignedBigInteger('issuer_id');
            $table->enum('issuer_type', ['customer', 'vendor', 'company']);

            $table->unsignedBigInteger('recipient_id');
            $table->enum('recipient_type', ['customer', 'vendor', 'company']);

            // Tax
            $table->unsignedBigInteger('tax_group_id')->nullable();
            $table->decimal('tax_amount', 20, 4)->default(0);
            $table->decimal('taxable_amount', 20, 4)->default(0);
            $table->decimal('total_amount', 20, 4)->default(0);

            // Dates
            $table->date('invoice_date');
            $table->date('due_date')->nullable();
            $table->date('tax_point_date')->nullable();

            // Legal Info
            $table->string('tax_authority_number', 100)->nullable();
            $table->text('qr_code_data')->nullable();
            $table->string('digital_signature', 500)->nullable();

            // Status
            $table->enum('status', ['draft', 'issued', 'cancelled', 'reversed', 'archived'])->default('draft');
            $table->boolean('is_export')->default(false);
            $table->boolean('is_reverse_charge')->default(false);

            // System
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('issued_by')->nullable();
            $table->date('issued_date')->nullable();

            $table->timestamps();

            // Constraints
            $table->foreign('tax_group_id')->references('id')->on('tax_groups');
            $table->foreign('original_invoice_id')->references('id')->on('tax_invoices');

            // Indexes
            $table->index('invoice_date', 'idx_invoice_date');
            $table->index('document_type', 'idx_document_type');
            $table->index('tax_authority_number', 'idx_tax_authority');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tax_invoices');
    }
};
