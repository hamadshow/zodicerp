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
        if (! Schema::hasTable('purchase_orders')) {
            Schema::create('purchase_orders', function (Blueprint $table) {
                $table->id();

                // Identification
                $table->string('po_number')->unique();
                $table->date('po_date');
                $table->date('expected_delivery_date')->nullable();

                // Relationships
                $table->foreignId('quotation_id')->nullable()->constrained('purchase_quotations')->nullOnDelete();
                $table->foreignId('vendor_id')->constrained('suppliers')->restrictOnDelete();

                // Vendor Snapshot (Audit)
                $table->string('vendor_contact_person')->nullable();
                $table->string('vendor_phone')->nullable();
                $table->string('vendor_email')->nullable();

                // Status & Workflow
                $table->enum('status', [
                    'draft',
                    'pending_approval',
                    'approved',
                    'sent_to_vendor',
                    'partially_received',
                    'fully_received',
                    'invoiced',
                    'closed',
                    'cancelled',
                ])->default('draft')->index();

                $table->enum('priority', ['low', 'medium', 'high', 'urgent'])->default('medium');

                // Currency
                $table->foreignId('currency_id')->constrained('currencies')->restrictOnDelete();
                $table->decimal('exchange_rate', 15, 6)->default(1.000000);

                // Financials
                $table->decimal('subtotal', 15, 2)->default(0.00);
                $table->decimal('discount_amount', 15, 2)->default(0.00);
                $table->decimal('tax_amount', 15, 2)->default(0.00);
                $table->decimal('shipping_charges', 15, 2)->default(0.00);
                $table->decimal('other_charges', 15, 2)->default(0.00);
                $table->decimal('grand_total', 15, 2)->default(0.00);

                // Terms
                $table->unsignedBigInteger('payment_terms_id')->nullable()->index();
                $table->unsignedBigInteger('delivery_terms_id')->nullable()->index();
                $table->string('shipping_method')->nullable();
                $table->text('shipping_address')->nullable();

                // Notes
                $table->text('notes')->nullable();
                $table->text('internal_notes')->nullable();

                // Audit Trail
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
                $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamp('approved_date')->nullable();
                $table->timestamp('sent_date')->nullable();

                $table->timestamps();
                $table->softDeletes();

                // Indexes
                $table->index('po_date');
                $table->index('vendor_id');
                $table->index('quotation_id');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('purchase_orders');
    }
};
