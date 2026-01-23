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
        Schema::create('supplier_opening_balances', function (Blueprint $table) {
            $table->charset = 'utf8mb4';
            $table->collation = 'utf8mb4_unicode_ci';

            $table->id();
            
            $table->foreignId('supplier_id')->constrained('suppliers');
            
            $table->integer('financial_year');
            $table->date('opening_date');
            
            $table->foreignId('currency_id')->constrained('currencies');
            
            $table->decimal('exchange_rate', 15, 6);
            $table->decimal('debit_amount', 15, 2)->default(0);
            $table->decimal('credit_amount', 15, 2)->default(0);
            
            $table->decimal('base_debit_amount', 15, 2)->storedAs('debit_amount * exchange_rate');
            $table->decimal('base_credit_amount', 15, 2)->storedAs('credit_amount * exchange_rate');
            $table->decimal('net_balance', 15, 2)->storedAs('credit_amount - debit_amount');
            
            $table->text('notes')->nullable();
            
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('approved_by')->nullable();
            $table->timestamp('approved_at')->nullable();
            
            $table->timestamps();
            $table->softDeletes();
            
            $table->index('supplier_id', 'idx_opening_balances_supplier');
            $table->index('financial_year', 'idx_opening_balances_year');
            $table->unique(['supplier_id', 'financial_year'], 'unique_supplier_year');
        });

        \Illuminate\Support\Facades\DB::statement("ALTER TABLE supplier_opening_balances COMMENT = 'الأرصدة الافتتاحية للموردين لكل سنة مالية'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('supplier_opening_balances');
    }
};
