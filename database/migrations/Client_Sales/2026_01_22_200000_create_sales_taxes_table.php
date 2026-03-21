<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sales_taxes', function (Blueprint $table) {
            $table->charset = 'utf8mb4';
            $table->collation = 'utf8mb4_unicode_ci';
            $table->increments('id');
            $table->string('tax_code', 20)->unique();
            $table->string('name_ar', 100);
            $table->string('name_en', 100)->nullable();
            $table->decimal('tax_rate', 5, 2);
            $table->enum('tax_type', ['vat', 'sales_tax', 'excise', 'withholding', 'other'])->default('vat');
            $table->enum('calculation_method', ['on_total', 'on_subtotal', 'exclusive', 'inclusive'])->default('on_subtotal');
            $table->boolean('is_collectable')->default(true);
            $table->unsignedInteger('account_id')->nullable();
            $table->boolean('is_active')->default(true);
            $table->text('notes')->nullable();
            $table->integer('created_by')->nullable();
            $table->softDeletes();
            $table->timestamps();

            // Foreign key to accounts table (AccID is the primary key)
            $table->foreign('account_id')->references('AccID')->on('accounts');

            $table->index('is_active');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sales_taxes');
    }
};
