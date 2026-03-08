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
        Schema::create('goods_receipts', function (Blueprint $table) {
            $table->charset = 'utf8mb4';
            $table->collation = 'utf8mb4_unicode_ci';

            $table->id();
            $table->string('receipt_number', 50)->unique();
            
            $table->foreignId('order_id');
            $table->foreignId('invoice_id')->nullable()->constrained('purchase_invoices');
            
            // warehouse_id: 'warehouses' table exists.
            $table->foreignId('warehouse_id')->constrained('warehouses');
            
            $table->date('receipt_date');
            $table->time('receipt_time')->nullable();
            
            $table->unsignedBigInteger('received_by');
            $table->unsignedBigInteger('checked_by')->nullable();
            $table->unsignedBigInteger('approved_by')->nullable();
            
            $table->enum('receipt_type', ['full', 'partial', 'return_receipt'])->default('partial');
            
            $table->integer('total_items')->default(0);
            $table->decimal('total_quantity', 12, 4)->default(0);
            $table->decimal('total_value', 15, 2)->default(0);
            
            $table->enum('status', ['draft', 'received', 'checked', 'approved', 'cancelled'])->default('draft');
            $table->enum('quality_status', ['pending', 'passed', 'failed', 'partial'])->default('pending');
            
            $table->text('notes')->nullable();
            $table->text('inspection_notes')->nullable();
            
            $table->unsignedBigInteger('created_by')->nullable();
            
            $table->timestamps();
            $table->softDeletes(); // Requirement says enable soft deletes
            
            $table->index('receipt_number', 'idx_goods_receipts_number');
            $table->index('receipt_date', 'idx_goods_receipts_date');
            $table->index('order_id', 'idx_goods_receipts_order');
            $table->index('status', 'idx_goods_receipts_status');
        });

        if (Schema::hasTable('purchase_orders')) {
            Schema::table('goods_receipts', function (Blueprint $table) {
                $table->foreign('order_id')->references('id')->on('purchase_orders');
            });
        }

        // Add table comment
        try {
            DB::statement("ALTER TABLE goods_receipts COMMENT = 'إيصالات استلام البضائع من الموردين'");
        } catch (\Exception $e) {
            // Ignore
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('goods_receipts');
    }
};
