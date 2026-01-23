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
        Schema::create('assets', function (Blueprint $table) {
            $table->id();
            $table->string('asset_number', 50)->unique();
            $table->string('serial_number', 100)->nullable();
            $table->string('barcode', 100)->nullable();
            
            // Basic Info
            $table->string('name_ar', 200);
            $table->string('name_en', 200)->nullable();
            $table->text('description')->nullable();
            $table->foreignId('category_id')->constrained('asset_categories');
            
            // Units and Currencies
            // Linking to item_units table as 'units' table does not exist
            $table->foreignId('unit_id')->constrained('item_units');
            $table->foreignId('currency_id')->constrained('currencies');
            
            $table->decimal('quantity', 15, 3)->default(1);
            $table->decimal('unit_cost', 20, 4);
            $table->decimal('total_cost', 20, 4);
            
            // Dates
            $table->date('purchase_date');
            $table->date('activation_date')->nullable();
            $table->date('warranty_expiry')->nullable();
            
            // Value
            $table->decimal('salvage_value', 20, 4)->default(0);
            $table->decimal('current_value', 20, 4)->nullable();
            $table->decimal('accumulated_depreciation', 20, 4)->default(0);
            $table->decimal('net_book_value', 20, 4)->nullable();
            
            // Location
            $table->foreignId('warehouse_id')->nullable()->constrained('warehouses')->nullOnDelete();
            $table->foreignId('department_id')->nullable()->constrained('departments')->nullOnDelete();
            $table->foreignId('employee_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('location_description', 500)->nullable();
            
            // Status
            $table->enum('status', ['active', 'idle', 'under_maintenance', 'disposed', 'sold', 'transferred'])->default('active');
            $table->enum('condition', ['excellent', 'good', 'fair', 'poor', 'critical'])->default('good');
            
            // Inventory and Tax
            // Linking to accounts(AccID) which is integer
            $table->integer('inventory_account_id')->nullable();
            
            // Linking to purchase_taxes table as generic 'taxes' table does not exist
            $table->foreignId('tax_id')->nullable()->constrained('purchase_taxes')->nullOnDelete();
            $table->decimal('tax_amount', 20, 4)->default(0);
            
            // Attachments and Attributes
            $table->string('image_path', 500)->nullable();
            $table->json('specifications')->nullable();
            
            // Accounting / Depreciation
            $table->date('depreciation_start_date')->nullable();
            $table->boolean('is_depreciable')->default(true);
            $table->enum('depreciation_method', ['straight_line', 'declining_balance', 'units_of_production'])->default('straight_line');
            $table->decimal('useful_life_years', 10, 2)->nullable();
            $table->decimal('depreciation_rate', 5, 2)->nullable();
            
            // System
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            
            $table->timestamps();
            
            $table->charset = 'utf8mb4';
            $table->collation = 'utf8mb4_unicode_ci';
            
            // Indexes
            $table->index('asset_number');
            $table->index('category_id');
            $table->index('warehouse_id');
            $table->index('department_id');
            $table->index('employee_id');
            $table->index('status');
            $table->index('inventory_account_id');
            
            // Foreign Key for inventory_account_id (referencing accounts.AccID)
            if (Schema::hasTable('accounts')) {
                $table->foreign('inventory_account_id')->references('AccID')->on('accounts')->nullOnDelete();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('assets');
    }
};
