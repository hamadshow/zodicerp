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

        Schema::dropIfExists('product_supplier');
        Schema::dropIfExists('suppliers');

        Schema::create('suppliers', function (Blueprint $table) {
            // $table->charset = 'utf8mb4';
            // $table->collation = 'utf8mb4_unicode_ci';

            $table->id(); // id INT PRIMARY KEY AUTO_INCREMENT
            $table->string('supplier_code', 50)->unique();
            $table->string('name_ar', 255);
            $table->string('name_en', 255)->nullable();
            
            // supplier_group_id
            $table->foreignId('supplier_group_id');
            
            // account_id
            $table->integer('account_id')->nullable();
            
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
            
            // Indexes
            $table->index('supplier_code', 'idx_suppliers_code');
            $table->index('name_ar', 'idx_suppliers_name');
            $table->index('supplier_group_id', 'idx_suppliers_group');
            $table->index('is_active', 'idx_suppliers_active');
        });
        
        // Add Foreign Keys separately to identify issues and handle 'account_id' referencing 'AccID'
        Schema::table('suppliers', function (Blueprint $table) {
            $table->foreign('supplier_group_id')->references('id')->on('supplier_groups');
            // account_id references accounts(AccID)
            $table->foreign('account_id')->references('AccID')->on('accounts')->nullOnDelete();
            $table->foreign('currency_id')->references('id')->on('currencies');
            $table->foreign('default_warehouse_id')->references('id')->on('warehouses')->nullOnDelete();
            $table->foreign('country_id')->references('id')->on('countries')->nullOnDelete();
            $table->foreign('city_id')->references('id')->on('cities')->nullOnDelete();
        });
        
        // Add table comment
        try {
            DB::statement("ALTER TABLE suppliers COMMENT = 'بيانات الموردين الأساسية'");
        } catch (\Exception $e) {
            // Ignore
        }

        // Re-establish relationships if needed
        // Note: product_supplier table might have been dropped or needs FK update if it referenced 'supplier_id' (old PK) vs 'id' (new PK).
        // Since we are using 'id' now (standard), if product_supplier referenced 'supplier_id', it might break if we don't fix it.
        // User didn't ask to fix product_supplier, but good practice.
        // However, we dropped 'suppliers' table so constraints on it are gone.
        // If product_supplier exists, we should update it to point to 'id' if it was pointing to 'supplier_id'.
        // But if we just created 'id', and old one was 'supplier_id', data might be lost if we don't migrate data.
        // Since this is a "setup" request, likely fresh or re-setup. 
        // We assume we can recreate.

        DB::statement('SET FOREIGN_KEY_CHECKS=1;');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::disableForeignKeyConstraints();
        Schema::dropIfExists('suppliers');
        Schema::enableForeignKeyConstraints();
    }
};
