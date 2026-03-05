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
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');

        // Drop tables if they exist to ensure clean state
        Schema::dropIfExists('product_supplier');
        Schema::dropIfExists('suppliers');

        // Recreate suppliers table
        Schema::create('suppliers', function (Blueprint $table) {
            $table->id(); // id INT PRIMARY KEY AUTO_INCREMENT
            $table->string('supplier_code', 50)->unique();
            $table->string('name_ar', 255);
            $table->string('name_en', 255)->nullable();
            
            // supplier_group_id
            $table->foreignId('supplier_group_id');
            
            // account_id
            $table->unsignedInteger('account_id')->nullable();
            
            $table->string('password', 255);
            
            // currency_id
            $table->foreignId('currency_id')->default(1);
            
            $table->string('tax_number', 100)->nullable();
            $table->string('commercial_register', 100)->nullable();
            $table->string('tax_file_number', 100)->nullable();
            
            $table->decimal('credit_limit', 15, 2)->default(0);
            $table->decimal('current_balance', 15, 2)->default(0);
            $table->decimal('available_credit', 15, 2)->storedAs('credit_limit - current_balance');
            
            $table->integer('payment_terms')->default(30);
            $table->enum('default_payment_method', ['cash', 'check', 'transfer', 'credit'])->default('cash');
            
            // default_warehouse_id
            $table->foreignId('default_warehouse_id')->nullable();
            
            // country_id
            $table->foreignId('country_id')->nullable();
            
            // city_id
            $table->foreignId('city_id')->nullable();
            
            $table->string('primary_phone', 20)->nullable();
            $table->string('secondary_phone', 20)->nullable();
            $table->string('fax', 20)->nullable();
            $table->string('email', 100)->nullable();
            $table->string('website', 255)->nullable();
            
            $table->boolean('is_vendor')->default(true);
            $table->boolean('is_manufacturer')->default(false);
            $table->boolean('is_active')->default(true);
            
            $table->tinyInteger('rating')->nullable();
            
            $table->text('notes')->nullable();
            
            $table->unsignedBigInteger('created_by')->nullable();
            
            $table->timestamps();
            $table->softDeletes();
            
            // JSON columns added by later migrations (adding them here to be up to date)
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
        
        // Add Foreign Keys separately
        Schema::table('suppliers', function (Blueprint $table) {
             // We comment out constraints that might fail if referenced tables don't exist yet
             // But for stability we try to add them if possible. 
             // Assuming accounts, currencies, warehouses, countries, cities exist.
            
            // account_id references accounts(AccID)
            if (Schema::hasTable('accounts')) {
                 $table->foreign('account_id')->references('AccID')->on('accounts')->nullOnDelete();
            }
            if (Schema::hasTable('currencies')) {
                $table->foreign('currency_id')->references('id')->on('currencies');
            }
            if (Schema::hasTable('warehouses')) {
                $table->foreign('default_warehouse_id')->references('id')->on('warehouses')->nullOnDelete();
            }
            if (Schema::hasTable('countries')) {
                $table->foreign('country_id')->references('id')->on('countries')->nullOnDelete();
            }
            if (Schema::hasTable('cities')) {
                $table->foreign('city_id')->references('id')->on('cities')->nullOnDelete();
            }
        });

        // Recreate product_supplier table
        Schema::create('product_supplier', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained('products')->onDelete('cascade');
            $table->foreignId('supplier_id')->constrained('suppliers')->onDelete('cascade');
            $table->decimal('cost_price', 10, 2)->nullable();
            $table->string('supplier_sku')->nullable();
            $table->timestamps();
        });

        DB::statement('SET FOREIGN_KEY_CHECKS=1;');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        Schema::dropIfExists('product_supplier');
        Schema::dropIfExists('suppliers');
        DB::statement('SET FOREIGN_KEY_CHECKS=1;');
    }
};
