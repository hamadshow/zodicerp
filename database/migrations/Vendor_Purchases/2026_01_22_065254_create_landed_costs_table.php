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
        Schema::create('landed_costs', function (Blueprint $table) {
            $table->id();
            $table->string('reference_number', 50)->unique();
            $table->enum('allocation_method', ['value', 'quantity', 'weight', 'manual']);
            $table->enum('status', ['draft', 'allocated', 'posted', 'cancelled'])->default('draft');
            $table->decimal('total_amount', 15, 2)->default(0.00);
            $table->foreignId('currency_id')->nullable()->constrained('currencies');
            $table->decimal('exchange_rate', 15, 6)->default(1.000000);
            $table->decimal('allocated_amount', 15, 2)->default(0.00);
            $table->decimal('remaining_to_allocate', 15, 2)->storedAs('total_amount - allocated_amount');
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users');
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
        Schema::dropIfExists('landed_costs');
    }
};
