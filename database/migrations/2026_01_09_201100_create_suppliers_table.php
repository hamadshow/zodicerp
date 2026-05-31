<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::disableForeignKeyConstraints();

        Schema::create('suppliers', function (Blueprint $table) {
            $table->id();
            $table->string('supplier_code', 50)->unique();
            $table->string('name_ar', 255);
            $table->string('name_en', 255)->nullable();
            $table->foreignId('supplier_group_id')->nullable();
            $table->unsignedInteger('account_id')->nullable();
            $table->string('password', 255)->nullable();
            $table->foreignId('currency_id')->default(1);
            $table->string('tax_number', 100)->nullable();
            $table->string('commercial_register', 100)->nullable();
            $table->string('tax_file_number', 100)->nullable();
            $table->decimal('credit_limit', 15, 2)->default(0);
            $table->decimal('current_balance', 15, 2)->default(0);
            $table->decimal('available_credit', 15, 2)->storedAs('credit_limit - current_balance');
            $table->integer('payment_terms')->default(30);
            $table->enum('default_payment_method', ['cash', 'check', 'transfer', 'credit'])->default('cash');
            $table->foreignId('default_warehouse_id')->nullable();
            $table->foreignId('country_id')->nullable();
            $table->foreignId('city_id')->nullable();
            $table->string('primary_phone', 20)->nullable();
            $table->string('secondary_phone', 20)->nullable();
            $table->string('fax', 20)->nullable();
            $table->string('email', 100)->nullable();
            $table->string('website', 255)->nullable();
            $table->boolean('is_vendor')->default(true);
            $table->boolean('is_manufacturer')->default(false);
            $table->boolean('is_active')->default(true);
            $table->boolean('is_favorite')->default(false);
            $table->tinyInteger('rating')->nullable();
            $table->text('notes')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->foreignId('company_id')->nullable()->constrained('company')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            // Extra fields from later fixes
            $table->json('store_name_json')->nullable();
            $table->json('store_description_json')->nullable();
            $table->decimal('commission_rate', 5, 2)->default(0);
            $table->string('verification_status')->default('unverified');

            // Indexes
            $table->index('supplier_code', 'idx_suppliers_code');
            $table->index('name_ar', 'idx_suppliers_name');
            $table->index('supplier_group_id', 'idx_suppliers_group');
            $table->index('is_active', 'idx_suppliers_active');
        });

        Schema::create('product_supplier', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->nullable();
            $table->foreignId('supplier_id')->constrained('suppliers')->onDelete('cascade');
            $table->decimal('cost_price', 10, 2)->nullable();
            $table->string('supplier_sku')->nullable();
            $table->timestamps();
        });

        Schema::enableForeignKeyConstraints();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('product_supplier');
        Schema::dropIfExists('suppliers');
    }
};
