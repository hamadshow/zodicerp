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
        Schema::create('purchase_invoices', function (Blueprint $table) {
            $table->charset = 'utf8mb4';
            $table->collation = 'utf8mb4_unicode_ci';

            $table->id();
            $table->string('invoice_number', 50)->unique();
            
            // supplier_id REFERENCES suppliers(id)
            $table->foreignId('supplier_id')->constrained('suppliers');
            
            // order_id REFERENCES purchase_orders(id)
            $table->foreignId('order_id')->nullable()->constrained('purchase_orders');
            
            // currency_id REFERENCES currencies(id)
            $table->foreignId('currency_id')->constrained('currencies');
            
            $table->decimal('exchange_rate', 15, 6)->default(1.000000);
            $table->date('invoice_date');
            $table->date('due_date')->nullable();
            $table->date('posting_date')->nullable();
            
            // warehouse_id REFERENCES warehouses(id)
            $table->foreignId('warehouse_id')->constrained('warehouses');
            
            $table->decimal('subtotal', 15, 2)->default(0);
            $table->decimal('discount_amount', 15, 2)->default(0)->nullable();
            $table->decimal('tax_amount', 15, 2)->default(0)->nullable();
            $table->decimal('shipping_cost', 15, 2)->default(0)->nullable();
            $table->decimal('other_costs', 15, 2)->default(0)->nullable();
            $table->decimal('total_amount', 15, 2)->default(0);
            
            // base_total GENERATED ALWAYS AS (total_amount * exchange_rate) STORED
            $table->decimal('base_total', 15, 2)->storedAs('total_amount * exchange_rate');
            
            $table->decimal('paid_amount', 15, 2)->default(0)->nullable();
            
            // base_paid GENERATED ALWAYS AS (paid_amount * exchange_rate) STORED
            $table->decimal('base_paid', 15, 2)->storedAs('paid_amount * exchange_rate');
            
            // balance_amount GENERATED ALWAYS AS (total_amount - paid_amount) STORED
            $table->decimal('balance_amount', 15, 2)->storedAs('total_amount - paid_amount');
            
            $table->enum('payment_status', ['unpaid', 'partial', 'paid', 'overdue'])->default('unpaid');
            $table->enum('invoice_type', ['standard', 'proforma', 'credit_note', 'debit_note'])->default('standard');
            
            $table->string('payment_terms', 255)->nullable();
            $table->text('notes')->nullable();
            $table->text('internal_notes')->nullable();
            
            $table->boolean('is_posted')->default(false);
            $table->timestamp('posted_at')->nullable();
            $table->unsignedBigInteger('posted_by')->nullable();
            
            $table->unsignedBigInteger('created_by')->nullable();
            
            $table->timestamps();
            $table->softDeletes();
            
            // Indexes
            $table->index('invoice_number', 'idx_invoices_number');
            $table->index('invoice_date', 'idx_invoices_date');
            $table->index('payment_status', 'idx_invoices_status');
            $table->index('supplier_id', 'idx_invoices_supplier');
            $table->index('due_date', 'idx_invoices_due_date');
        });

        // Add table comment
        try {
            DB::statement("ALTER TABLE purchase_invoices COMMENT = 'فواتير الشراء من الموردين'");
        } catch (\Exception $e) {
            // Ignore if driver doesn't support it
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('purchase_invoices');
    }
};
