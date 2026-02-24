<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            if (!Schema::hasColumn('products', 'supplier_code')) {
                $table->string('supplier_code', 50)->nullable()->after('category_id');
            }
        });

        try {
            DB::statement('UPDATE products SET supplier_code = CAST(store_id AS CHAR) WHERE store_id IS NOT NULL AND supplier_code IS NULL');
        } catch (\Throwable $e) {
            // ignore copy failures; proceed with schema change
        }

        Schema::table('products', function (Blueprint $table) {
            if (Schema::hasColumn('products', 'store_id')) {
                $table->dropColumn('store_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            if (!Schema::hasColumn('products', 'store_id')) {
                $table->foreignId('store_id')->nullable()->after('category_id');
            }
        });

        try {
            DB::statement("UPDATE products SET store_id = CASE WHEN supplier_code REGEXP '^[0-9]+$' THEN CAST(supplier_code AS UNSIGNED) ELSE NULL END");
        } catch (\Throwable $e) {
            // ignore
        }

        Schema::table('products', function (Blueprint $table) {
            if (Schema::hasColumn('products', 'supplier_code')) {
                $table->dropColumn('supplier_code');
            }
        });
    }
};
