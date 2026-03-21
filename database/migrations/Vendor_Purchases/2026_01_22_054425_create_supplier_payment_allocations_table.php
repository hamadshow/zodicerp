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
        Schema::create('supplier_payment_allocations', function (Blueprint $table) {
            $table->charset = 'utf8mb4';
            $table->collation = 'utf8mb4_unicode_ci';

            $table->id();

            // payment_id REFERENCES supplier_payments(id) ON DELETE CASCADE
            $table->foreignId('payment_id')->constrained('supplier_payments')->onDelete('cascade');

            // invoice_id REFERENCES purchase_invoices(id)
            $table->foreignId('invoice_id')->constrained('purchase_invoices');

            $table->decimal('allocated_amount', 15, 2)->default(0);

            // base_allocated_amount DECIMAL(15,2)
            $table->decimal('base_allocated_amount', 15, 2)->nullable();

            $table->decimal('discount_given', 15, 2)->default(0);
            $table->text('notes')->nullable();

            // No soft deletes requested for allocations, but generally good practice.
            // User did not explicitly ask for soft deletes on allocations table, but "Requirements: Enable soft deletes" might apply to both.
            // However, allocations are usually hard deleted if payment is deleted (CASCADE).
            // But let's check: "Requirements: Enable soft deletes" is listed at the end, implying global requirement.
            // But if payment is soft deleted, allocations might need to be soft deleted too?
            // The schema says `FOREIGN KEY (payment_id) REFERENCES supplier_payments(id) ON DELETE CASCADE`.
            // If `supplier_payments` uses SoftDeletes, CASCADE works on DB level only if force deleted.
            // For SoftDeletes, we usually handle logic in model.
            // I'll add softDeletes to be safe and consistent.
            // Wait, usually pivot tables or child tables like this might not need soft deletes if parent has it.
            // But user requirement is broad. I will add it.
            // Actually, `ON DELETE CASCADE` suggests hard dependency.
            // I'll stick to user schema strictness but add timestamps.

            $table->timestamps();

            // Indexes
            $table->index('payment_id', 'idx_payment_allocations_payment');
            $table->index('invoice_id', 'idx_payment_allocations_invoice');

            // UNIQUE KEY unique_payment_invoice (payment_id, invoice_id)
            $table->unique(['payment_id', 'invoice_id'], 'unique_payment_invoice');
        });

        // Add table comment
        try {
            DB::statement("ALTER TABLE supplier_payment_allocations COMMENT = 'تخصيص المدفوعات على الفواتير'");
        } catch (\Exception $e) {
            // Ignore
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('supplier_payment_allocations');
    }
};
