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
        Schema::create('supplier_statement_details', function (Blueprint $table) {
            $table->charset = 'utf8mb4';
            $table->collation = 'utf8mb4_unicode_ci';

            $table->id();
            
            // statement_id REFERENCES supplier_statements(id) ON DELETE CASCADE
            $table->foreignId('statement_id')->constrained('supplier_statements')->onDelete('cascade');
            
            $table->date('transaction_date');
            
            $table->enum('document_type', ['invoice', 'payment', 'credit_note', 'debit_note', 'adjustment']);
            
            $table->unsignedBigInteger('document_id');
            $table->string('document_number', 50)->nullable();
            $table->text('description')->nullable();
            
            $table->decimal('debit_amount', 15, 2)->default(0);
            $table->decimal('credit_amount', 15, 2)->default(0);
            $table->decimal('balance', 15, 2)->nullable();
            
            // Indexes
            $table->index('statement_id', 'idx_statement_details_statement');
            $table->index(['document_type', 'document_id'], 'idx_statement_details_document');
            
            $table->timestamps();
            
            // Enable soft deletes as requested by "Requirements: Enable soft deletes" generally.
            // Also consistent with parent having soft deletes.
            $table->softDeletes();
        });

        // Add table comment
        try {
            DB::statement("ALTER TABLE supplier_statement_details COMMENT = 'تفاصيل حركات كشف حساب المورد'");
        } catch (\Exception $e) {
            // Ignore
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('supplier_statement_details');
    }
};
