<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customers', function (Blueprint $table) {
            $table->charset = 'utf8mb4';
            $table->collation = 'utf8mb4_unicode_ci';
            $table->increments('id');
            $table->string('customer_code', 50)->unique();
            $table->string('name_ar', 255);
            $table->string('name_en', 255)->nullable();

            // Foreign keys definitions
            $table->unsignedInteger('customer_group_id');
            $table->unsignedInteger('account_id')->nullable();
            $table->unsignedBigInteger('currency_id')->default(1);
            $table->unsignedInteger('price_list_id')->nullable();

            $table->string('tax_number', 100)->nullable();
            $table->string('commercial_register', 100)->nullable();

            $table->decimal('credit_limit', 15, 2)->default(0);
            $table->decimal('current_balance', 15, 2)->default(0);
            $table->decimal('available_credit', 15, 2)->storedAs('credit_limit - current_balance');

            $table->integer('credit_days')->default(30);
            $table->integer('payment_terms')->default(30);
            $table->enum('default_payment_method', ['cash', 'check', 'credit_card', 'bank_transfer', 'credit'])->default('cash');

            $table->unsignedBigInteger('default_warehouse_id')->nullable();
            $table->unsignedInteger('sales_agent_id')->nullable();
            $table->unsignedBigInteger('location_id')->nullable();

            $table->string('primary_phone', 20)->nullable();
            $table->string('secondary_phone', 20)->nullable();
            $table->string('mobile', 20)->nullable();
            $table->string('fax', 20)->nullable();
            $table->string('email', 100)->nullable();
            $table->string('website', 255)->nullable();

            $table->enum('customer_type', ['individual', 'company', 'government', 'reseller', 'wholesaler', 'retailer'])->default('individual');
            $table->enum('customer_class', ['A', 'B', 'C', 'D'])->default('C');
            $table->boolean('is_active')->default(true);
            $table->tinyInteger('rating')->nullable();

            $table->date('registration_date')->nullable();
            $table->date('last_sale_date')->nullable();
            $table->text('notes')->nullable();

            $table->unsignedInteger('created_by')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->useCurrentOnUpdate()->useCurrent();
            $table->softDeletes();

            // Foreign Key Constraints
            $table->foreign('customer_group_id')->references('id')->on('customer_groups');
            $table->foreign('account_id')->references('AccID')->on('accounts')->nullOnDelete();
            $table->foreign('currency_id')->references('id')->on('currencies');
            $table->foreign('price_list_id')->references('id')->on('price_lists')->nullOnDelete();
            $table->foreign('default_warehouse_id')->references('id')->on('warehouses')->nullOnDelete();
            $table->foreign('sales_agent_id')->references('id')->on('sales_agents')->nullOnDelete();
            $table->foreign('location_id')->references('id')->on('locations')->nullOnDelete();

            // Indexes
            $table->index('customer_code', 'idx_customers_code');
            $table->index('name_ar', 'idx_customers_name');
            $table->index('customer_group_id', 'idx_customers_group');
            $table->index('customer_type', 'idx_customers_type');
            $table->index('is_active', 'idx_customers_active');
        });

        // Add CHECK constraint for rating
        DB::statement('ALTER TABLE customers ADD CONSTRAINT chk_customers_rating CHECK (rating BETWEEN 1 AND 5)');
    }

    public function down(): void
    {
        Schema::dropIfExists('customers');
    }
};
