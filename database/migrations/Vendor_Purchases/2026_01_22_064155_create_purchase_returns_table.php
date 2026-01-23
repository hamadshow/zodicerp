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
        Schema::create('purchase_returns', function (Blueprint $table) {
            $table->charset = 'utf8mb4';
            $table->collation = 'utf8mb4_unicode_ci';

            $table->id();
            $table->string('return_number', 50)->unique();
            $table->foreignId('invoice_id')->constrained('purchase_invoices');
            $table->foreignId('supplier_id')->constrained('suppliers');
            $table->foreignId('warehouse_id')->constrained('warehouses');
            $table->date('return_date');
            $table->enum('return_reason', ['damaged', 'defective', 'wrong_item', 'excess_quantity', 'quality_issue', 'expired', 'other']);
            $table->enum('return_type', ['full_return', 'partial_return', 'exchange'])->default('partial_return');
            $table->decimal('subtotal', 15, 2)->default(0);
            $table->decimal('tax_amount', 15, 2)->default(0);
            $table->decimal('restocking_fee', 15, 2)->default(0);
            $table->decimal('total_amount', 15, 2)->default(0);
            $table->decimal('refund_amount', 15, 2)->default(0);
            $table->enum('refund_status', ['pending', 'partial', 'completed', 'cancelled'])->default('pending');
            $table->enum('status', ['draft', 'requested', 'approved', 'completed', 'cancelled'])->default('draft');
            $table->text('approval_notes')->nullable();
            $table->foreignId('received_by')->nullable()->constrained('users'); // Assuming 'users' table for received_by
            $table->date('received_date')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users');
            $table->timestamps();
            $table->softDeletes();

            $table->index('return_number', 'idx_purchase_returns_number');
            $table->index('return_date', 'idx_purchase_returns_date');
            $table->index('invoice_id', 'idx_purchase_returns_invoice');
            $table->index('status', 'idx_purchase_returns_status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('purchase_returns');
    }
};
