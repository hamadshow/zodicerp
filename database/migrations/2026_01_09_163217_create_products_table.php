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
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->string('product_code')->unique(); // Internal system code
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->longText('content')->nullable();
            $table->enum('status', ['active', 'inactive', 'draft', 'pending'])->default('draft');

            // Media
            $table->json('images')->nullable(); // Gallery
            $table->string('image')->nullable(); // Main image
            $table->string('video_media')->nullable();

            // Identification
            $table->string('sku')->unique()->nullable();
            $table->string('barcode')->unique()->nullable();
            $table->string('supplier_code', 50)->nullable();

            // Organization
            $table->foreignId('parent_id')->nullable()->constrained('products')->nullOnDelete();
            $table->foreignId('brand_id')->nullable()->constrained('brands')->nullOnDelete();
            $table->foreignId('unit_id')->nullable()->constrained('item_units')->nullOnDelete();
            $table->integer('order')->default(0);

            // Stats
            $table->integer('views')->default(0);

            // Inventory
            $table->integer('quantity')->default(0);
            $table->string('stock_status')->default('in_stock'); // in_stock, out_of_stock, on_backorder
            $table->boolean('allow_checkout_when_out_of_stock')->default(false);
            $table->boolean('with_storehouse_management')->default(false);
            $table->integer('minimum_order_quantity')->default(1);
            $table->integer('maximum_order_quantity')->nullable();

            // Pricing
            $table->decimal('cost_per_item', 15, 2)->nullable();
            $table->decimal('price', 15, 2)->nullable();
            $table->decimal('sale_price', 15, 2)->nullable();
            $table->string('sale_type')->nullable(); // fixed, percent?
            $table->timestamp('start_date')->nullable();
            $table->timestamp('end_date')->nullable();
            $table->boolean('price_includes_tax')->default(false);
            $table->unsignedBigInteger('tax_id')->nullable();

            // Product Details
            $table->enum('product_type', ['simple', 'variable'])->default('simple');
            $table->boolean('is_featured')->default(false);
            $table->boolean('is_variation')->default(false);
            $table->integer('variations_count')->default(0);

            // Shipping
            $table->decimal('length', 8, 2)->nullable();
            $table->decimal('wide', 8, 2)->nullable();
            $table->decimal('height', 8, 2)->nullable();
            $table->decimal('weight', 8, 2)->nullable();

            // Reviews
            $table->integer('reviews_count')->default(0);
            $table->decimal('reviews_avg', 3, 2)->default(0);

            // SEO
            $table->string('meta_title')->nullable();
            $table->text('meta_description')->nullable();

            // Digital / Advanced
            $table->boolean('generate_license_code')->default(false);
            $table->string('license_code_type')->nullable();
            $table->boolean('notify_attachment_updated')->default(false);
            $table->unsignedBigInteger('specification_table_id')->nullable();

            // Audit
            $table->unsignedBigInteger('approved_by')->nullable();
            $table->unsignedBigInteger('created_by_id')->nullable();
            $table->string('created_by_type')->nullable();
            $table->foreignId('company_id')->nullable()->constrained('company')->nullOnDelete();

            $table->softDeletes();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
