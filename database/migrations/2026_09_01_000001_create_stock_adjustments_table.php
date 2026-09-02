<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_adjustments', function (Blueprint $table) {
            $table->id();
            $table->string('adjustment_number', 50)->unique();
            $table->foreignId('warehouse_id')->constrained('warehouses');
            $table->date('adjustment_date');
            $table->enum('reason', ['correction', 'damage', 'expiring', 'found', 'lost', 'theft', 'count差异', 'other'])->default('correction');
            $table->text('description')->nullable();
            $table->enum('status', ['draft', 'approved', 'cancelled'])->default('draft');
            $table->unsignedBigInteger('company_id');
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('approved_by')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();

            $table->index('adjustment_number');
            $table->index('warehouse_id');
            $table->index('status');
        });

        Schema::create('stock_adjustment_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('adjustment_id')->constrained('stock_adjustments')->onDelete('cascade');
            $table->foreignId('product_id')->constrained('products');
            $table->foreignId('unit_id')->constrained('item_units');
            $table->decimal('quantity_before', 15, 3)->default(0);
            $table->decimal('adjustment_quantity', 15, 3);
            $table->decimal('quantity_after', 15, 3)->default(0);
            $table->decimal('unit_cost', 15, 4)->default(0);
            $table->text('reason')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('adjustment_id');
            $table->index('product_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_adjustment_items');
        Schema::dropIfExists('stock_adjustments');
    }
};
