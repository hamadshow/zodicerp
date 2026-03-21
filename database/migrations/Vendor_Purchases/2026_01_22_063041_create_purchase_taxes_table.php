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
        Schema::create('purchase_taxes', function (Blueprint $table) {
            $table->charset = 'utf8mb4';
            $table->collation = 'utf8mb4_unicode_ci';

            $table->id();
            $table->string('tax_code', 20)->unique();
            $table->string('name_ar', 100);
            $table->string('name_en', 100)->nullable();

            $table->decimal('tax_rate', 5, 2);
            $table->enum('tax_type', ['vat', 'sales_tax', 'withholding', 'excise', 'customs', 'other'])->default('vat');
            $table->enum('calculation_method', ['on_total', 'on_subtotal', 'exclusive', 'inclusive'])->default('on_subtotal');

            $table->boolean('is_recoverable')->default(true);
            $table->decimal('recoverable_percentage', 5, 2)->default(100);

            // account_id references accounts(AccID) based on previous knowledge of Account model
            // But user SQL says accounts(id).
            // Account model says primaryKey = 'AccID'.
            // So we must reference 'AccID'.
            $table->unsignedInteger('account_id')->nullable();
            $table->foreign('account_id')->references('AccID')->on('accounts')->nullOnDelete();

            $table->boolean('is_active')->default(true);
            $table->text('notes')->nullable();

            $table->unsignedBigInteger('created_by')->nullable();

            $table->timestamps();

            // No soft deletes requested in SQL but general requirement says "Enable soft deletes"
            // Wait, "Enable soft deletes" is in requirements list.
            $table->softDeletes();

            $table->index('tax_code', 'idx_purchase_taxes_code');
            $table->index('is_active', 'idx_purchase_taxes_active');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('purchase_taxes');
    }
};
