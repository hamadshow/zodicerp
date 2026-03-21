<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('supplier_statements', function (Blueprint $table) {
            $table->charset = 'utf8mb4';
            $table->collation = 'utf8mb4_unicode_ci';

            $table->id();
            $table->string('statement_number', 50)->unique();

            // Foreign Keys
            // supplier_id REFERENCES suppliers(id)
            $table->foreignId('supplier_id')->constrained('suppliers');

            // currency_id REFERENCES currencies(id)
            $table->foreignId('currency_id')->constrained('currencies');

            $table->date('statement_date');
            $table->date('period_from');
            $table->date('period_to');

            $table->decimal('opening_balance', 15, 2)->default(0);
            $table->decimal('total_invoices', 15, 2)->default(0);
            $table->decimal('total_payments', 15, 2)->default(0);
            $table->decimal('total_adjustments', 15, 2)->default(0);
            $table->decimal('total_credit_notes', 15, 2)->default(0);

            // closing_balance GENERATED ALWAYS AS (opening_balance + total_invoices - total_payments + total_adjustments - total_credit_notes) STORED
            $table->decimal('closing_balance', 15, 2)->storedAs('opening_balance + total_invoices - total_payments + total_adjustments - total_credit_notes');

            $table->decimal('base_closing_balance', 15, 2)->nullable();

            $table->text('notes')->nullable();

            $table->boolean('is_sent')->default(false);
            $table->date('sent_date')->nullable();
            $table->enum('sent_method', ['email', 'print', 'both'])->nullable();

            $table->unsignedBigInteger('created_by')->nullable();

            $table->timestamps();
            $table->softDeletes();

            // Indexes
            $table->index('statement_number', 'idx_statements_number');
            $table->index('supplier_id', 'idx_statements_supplier');
            $table->index('statement_date', 'idx_statements_date');
        });

        // Add table comment
        try {
            DB::statement("ALTER TABLE supplier_statements COMMENT = 'كشوفات حساب الموردين'");
        } catch (\Exception $e) {
            // Ignore
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('supplier_statements');
    }
};
