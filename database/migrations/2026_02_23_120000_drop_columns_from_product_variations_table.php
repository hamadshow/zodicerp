<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('product_variations', function (Blueprint $table) {
            if (Schema::hasColumn('product_variations', 'sku')) {
                $table->dropColumn('sku');
            }
            if (Schema::hasColumn('product_variations', 'price')) {
                $table->dropColumn('price');
            }
            if (Schema::hasColumn('product_variations', 'stock')) {
                $table->dropColumn('stock');
            }
            if (Schema::hasColumn('product_variations', 'image')) {
                $table->dropColumn('image');
            }
            if (Schema::hasColumn('product_variations', 'created_at')) {
                $table->dropColumn('created_at');
            }
            if (Schema::hasColumn('product_variations', 'updated_at')) {
                $table->dropColumn('updated_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('product_variations', function (Blueprint $table) {
            if (!Schema::hasColumn('product_variations', 'sku')) {
                $table->string('sku', 150)->nullable()->after('is_default');
            }
            if (!Schema::hasColumn('product_variations', 'price')) {
                $table->decimal('price', 12, 2)->nullable()->after('sku');
            }
            if (!Schema::hasColumn('product_variations', 'stock')) {
                $table->integer('stock')->default(0)->after('price');
            }
            if (!Schema::hasColumn('product_variations', 'image')) {
                $table->string('image')->nullable()->after('stock');
            }
            if (!Schema::hasColumn('product_variations', 'created_at') && !Schema::hasColumn('product_variations', 'updated_at')) {
                $table->timestamps();
            }
        });
    }
};

