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
        Schema::create('sales_commissions', function (Blueprint $table) {
            $table->id();
            $table->string('commission_number', 50)->unique();

            $table->unsignedInteger('sales_agent_id');
            $table->foreign('sales_agent_id')->references('id')->on('sales_agents');

            $table->foreignId('invoice_id')->constrained('sales_invoices');

            $table->date('commission_date');

            $table->decimal('sales_amount', 15, 2);
            $table->decimal('commission_rate', 5, 2);

            // Generated column
            $table->decimal('commission_amount', 15, 2)->storedAs('sales_amount * commission_rate / 100');

            $table->enum('commission_type', ['percentage', 'fixed', 'tiered'])->default('percentage');
            $table->integer('tier_level')->default(1);

            $table->boolean('is_paid')->default(false);
            $table->date('paid_date')->nullable();
            $table->string('payment_reference', 100)->nullable();

            $table->enum('status', ['pending', 'calculated', 'approved', 'paid', 'cancelled'])->default('pending');

            $table->text('notes')->nullable();

            $table->integer('calculated_by')->nullable();
            $table->timestamp('calculated_at')->nullable();

            $table->integer('approved_by')->nullable();
            $table->timestamp('approved_at')->nullable();

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sales_commissions');
    }
};
