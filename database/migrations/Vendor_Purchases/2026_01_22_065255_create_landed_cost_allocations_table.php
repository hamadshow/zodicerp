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
        Schema::create('landed_cost_allocations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('landed_cost_id')->constrained('landed_costs')->onDelete('cascade');
            $table->foreignId('purchase_invoice_detail_id')->constrained('purchase_invoice_details');
            $table->decimal('allocated_amount', 15, 2);
            $table->decimal('allocated_per_unit', 15, 6)->default(0);
            $table->timestamps();
            $table->softDeletes();
            $table->charset = 'utf8mb4';
            $table->collation = 'utf8mb4_unicode_ci';
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('landed_cost_allocations');
    }
};
