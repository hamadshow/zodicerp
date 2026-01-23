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
        Schema::create('purchase_quotations', function (Blueprint $table) {
            $table->charset = 'utf8mb4';
            $table->collation = 'utf8mb4_unicode_ci';

            $table->id();
            $table->string('quotation_number', 50)->unique();
            
            // supplier_id REFERENCES suppliers(id)
            $table->foreignId('supplier_id')->constrained('suppliers');
            
            // currency_id REFERENCES currencies(id)
            $table->foreignId('currency_id')->constrained('currencies');
            
            $table->decimal('exchange_rate', 15, 6)->default(1.000000);
            $table->date('quotation_date');
            $table->date('expiry_date')->nullable();
            $table->integer('valid_days')->nullable();
            
            // warehouse_id REFERENCES warehouses(id)
            $table->foreignId('warehouse_id')->nullable()->constrained('warehouses');
            
            $table->decimal('subtotal', 15, 2)->default(0);
            $table->decimal('discount_percentage', 5, 2)->default(0)->nullable();
            $table->decimal('discount_amount', 15, 2)->default(0)->nullable();
            $table->decimal('tax_amount', 15, 2)->default(0)->nullable();
            $table->decimal('shipping_cost', 15, 2)->default(0)->nullable();
            $table->decimal('total_amount', 15, 2)->default(0);
            
            // base_total GENERATED ALWAYS AS (total_amount * exchange_rate) STORED
            $table->decimal('base_total', 15, 2)->storedAs('total_amount * exchange_rate');
            
            $table->enum('status', ['draft', 'sent', 'under_review', 'approved', 'rejected', 'expired', 'converted'])->default('draft');
            $table->text('approval_notes')->nullable();
            $table->date('sent_date')->nullable();
            $table->enum('sent_method', ['email', 'fax', 'hand', 'other'])->nullable();
            $table->text('notes')->nullable();
            
            $table->unsignedBigInteger('created_by')->nullable();
            
            $table->timestamps();
            $table->softDeletes();
            
            // Indexes
            $table->index('quotation_number', 'idx_quotations_number');
            $table->index('quotation_date', 'idx_quotations_date');
            $table->index('status', 'idx_quotations_status');
            $table->index('supplier_id', 'idx_quotations_supplier');
        });

        // Add table comment
        try {
            DB::statement("ALTER TABLE purchase_quotations COMMENT = 'عروض أسعار الشراء من الموردين'");
        } catch (\Exception $e) {
            // Ignore if driver doesn't support it
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('purchase_quotations');
    }
};
