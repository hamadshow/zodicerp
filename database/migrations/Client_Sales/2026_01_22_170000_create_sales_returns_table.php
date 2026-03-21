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
        Schema::create('sales_returns', function (Blueprint $table) {
            $table->id();
            $table->string('return_number', 50)->unique();

            $table->foreignId('invoice_id')->constrained('sales_invoices');

            $table->unsignedInteger('customer_id');
            $table->foreign('customer_id')->references('id')->on('customers');

            $table->foreignId('warehouse_id')->constrained('warehouses');

            $table->date('return_date');

            $table->enum('return_reason', [
                'damaged', 'defective', 'wrong_item', 'excess_quantity',
                'quality_issue', 'expired', 'changed_mind', 'other',
            ]);

            $table->enum('return_type', ['full_return', 'partial_return', 'exchange'])->default('partial_return');

            $table->decimal('subtotal', 15, 2)->default(0);
            $table->decimal('tax_amount', 15, 2)->default(0);
            $table->decimal('restocking_fee', 15, 2)->default(0);
            $table->decimal('total_amount', 15, 2)->default(0);

            $table->decimal('refund_amount', 15, 2)->default(0);
            $table->enum('refund_status', ['pending', 'partial', 'completed', 'credited'])->default('pending');

            $table->enum('status', ['draft', 'requested', 'approved', 'received', 'completed', 'cancelled'])->default('draft');

            $table->text('approval_notes')->nullable();

            $table->integer('received_by')->nullable();
            $table->date('received_date')->nullable();

            $table->text('inspection_notes')->nullable();
            $table->text('customer_notes')->nullable();
            $table->text('internal_notes')->nullable();

            $table->integer('created_by')->nullable();

            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sales_returns');
    }
};
