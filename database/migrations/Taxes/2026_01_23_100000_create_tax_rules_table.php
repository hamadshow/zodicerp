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
        Schema::create('tax_rules', function (Blueprint $table) {
            $table->id();
            $table->string('rule_code', 100)->unique();
            $table->string('name_ar', 200);
            $table->string('name_en', 200);

            // Scope
            $table->foreignId('location_id')->constrained('locations');

            // Application
            $table->enum('apply_to', ['customer', 'vendor', 'product', 'service', 'category', 'all']);
            $table->enum('customer_type', ['business', 'individual', 'government', 'foreign', 'all'])->default('all');
            $table->enum('vendor_type', ['local', 'foreign', 'tax_registered', 'non_registered', 'all'])->default('all');

            // Targeted Entities
            if (Schema::hasTable('customers')) {
                $table->unsignedInteger('customer_id')->nullable();
                $table->foreign('customer_id')->references('id')->on('customers');
            } else {
                $table->unsignedInteger('customer_id')->nullable();
            }

            // Vendor/Supplier Logic
            if (Schema::hasTable('vendors')) {
                $table->foreignId('vendor_id')->nullable()->constrained('vendors');
            } elseif (Schema::hasTable('suppliers')) {
                $table->foreignId('vendor_id')->nullable()->references('id')->on('suppliers');
            } else {
                $table->unsignedBigInteger('vendor_id')->nullable();
            }

            // Product Categories Logic
            if (Schema::hasTable('product_categories')) {
                $table->foreignId('product_category_id')->nullable()->constrained('product_categories');
            } elseif (Schema::hasTable('categories')) {
                $table->foreignId('product_category_id')->nullable()->references('id')->on('categories');
            } else {
                $table->unsignedBigInteger('product_category_id')->nullable();
            }

            if (Schema::hasTable('products')) {
                $table->foreignId('product_id')->nullable()->constrained('products');
            } else {
                $table->unsignedBigInteger('product_id')->nullable();
            }

            $table->unsignedBigInteger('service_id')->nullable(); // Assuming services table might not exist or handled differently

            // Applied Tax
            $table->foreignId('tax_id')->nullable()->constrained('taxes');
            $table->foreignId('tax_group_id')->nullable()->constrained('tax_groups');

            // Priority and Conditions
            $table->integer('priority')->default(1);
            $table->boolean('is_exclusive')->default(false);
            $table->decimal('minimum_amount', 20, 4)->nullable();
            $table->decimal('maximum_amount', 20, 4)->nullable();

            // Dates
            $table->date('effective_from');
            $table->date('effective_to')->nullable();

            // System
            $table->boolean('is_active')->default(true);
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamps();

            // Indexes
            $table->index('location_id', 'idx_rule_scope');
            $table->index(['effective_from', 'effective_to'], 'idx_effective_dates');
            $table->index('priority');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tax_rules');
    }
};
