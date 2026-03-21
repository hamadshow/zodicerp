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
        Schema::create('purchase_quotation_items', function (Blueprint $table) {
            $table->id();

            // Link to main quotation
            $table->foreignId('quotation_id')->constrained('purchase_quotations')->onDelete('cascade');

            // Sequence
            $table->integer('line_number');

            // Item Type
            $table->enum('item_type', ['product', 'service', 'material', 'asset', 'expense', 'other'])->default('product');

            // Product/Service
            $table->unsignedBigInteger('product_id')->nullable(); // Can be constrained if products table guaranteed
            $table->unsignedBigInteger('service_id')->nullable();

            // Description
            $table->string('item_code', 100)->nullable();
            $table->string('item_name_ar', 500);
            $table->string('item_name_en', 500)->nullable();
            $table->text('description_ar')->nullable();
            $table->text('description_en')->nullable();

            // Quantities
            $table->decimal('quantity', 12, 3)->default(1.000);
            $table->unsignedBigInteger('unit_id'); // item_units
            $table->decimal('received_quantity', 12, 3)->default(0.000);

            // Generated: pending_quantity = quantity - received_quantity
            $table->decimal('pending_quantity', 12, 3)->storedAs('quantity - received_quantity');

            // Prices
            $table->decimal('unit_price', 15, 4)->default(0.0000);
            $table->decimal('discount_percent', 5, 2)->default(0.00);
            $table->decimal('discount_amount', 15, 4)->default(0.0000);

            // Generated: net_price = unit_price - discount_amount
            $table->decimal('net_price', 15, 4)->storedAs('unit_price - discount_amount');

            // Generated: line_total = quantity * net_price
            $table->decimal('line_total', 15, 2)->storedAs('quantity * net_price');

            // Tax
            $table->unsignedBigInteger('tax_id')->nullable();
            $table->decimal('tax_amount', 15, 4)->default(0.0000);

            // Generated: tax_total = line_total * tax_amount / 100
            $table->decimal('tax_total', 15, 2)->storedAs('line_total * tax_amount / 100');

            // Dates
            $table->date('required_date')->nullable();
            $table->date('promised_delivery_date')->nullable();

            // Warehouse & Accounts
            $table->unsignedBigInteger('warehouse_id')->nullable();
            $table->unsignedBigInteger('inventory_account_id')->nullable();

            // Cost Centers & Projects
            $table->unsignedBigInteger('cost_center_id')->nullable();
            $table->unsignedBigInteger('project_id')->nullable();
            $table->unsignedBigInteger('budget_item_id')->nullable();

            // Attributes
            $table->json('attributes')->nullable();

            // Quality
            $table->text('quality_requirements')->nullable();
            $table->boolean('inspection_required')->default(false);

            // Approval
            $table->boolean('is_approved')->default(false);
            $table->text('approval_notes')->nullable();
            $table->unsignedBigInteger('approved_by')->nullable();
            $table->date('approved_date')->nullable();

            // Technical Review
            $table->text('technical_specifications')->nullable();
            $table->boolean('technical_approved')->default(false);
            $table->unsignedBigInteger('technical_approver')->nullable();
            $table->date('technical_approval_date')->nullable();

            // Notes
            $table->text('notes')->nullable();
            $table->text('internal_comments')->nullable();

            // Engine & Charset
            $table->charset = 'utf8mb4';
            $table->collation = 'utf8mb4_unicode_ci';
            $table->engine = 'InnoDB';
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('purchase_quotation_items');
    }
};
