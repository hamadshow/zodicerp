<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('products', 'category_id')) {
            if (Schema::hasTable('category_product')) {
                DB::table('products')
                    ->select('id', 'category_id')
                    ->whereNotNull('category_id')
                    ->orderBy('id')
                    ->chunkById(500, function ($rows) {
                        foreach ($rows as $row) {
                            DB::table('category_product')->updateOrInsert(
                                [
                                    'category_id' => $row->category_id,
                                    'product_id' => $row->id,
                                ],
                                [
                                    'created_at' => now(),
                                    'updated_at' => now(),
                                ]
                            );
                        }
                    });
            }

            if (DB::getDriverName() !== 'sqlite') {
                $database = DB::getDatabaseName();
                $fk = DB::selectOne(
                    "SELECT CONSTRAINT_NAME as name
                     FROM information_schema.KEY_COLUMN_USAGE
                     WHERE TABLE_SCHEMA = ?
                       AND TABLE_NAME = 'products'
                       AND COLUMN_NAME = 'category_id'
                       AND REFERENCED_TABLE_NAME IS NOT NULL
                     LIMIT 1",
                    [$database]
                );

                if ($fk && ! empty($fk->name)) {
                    DB::statement("ALTER TABLE `products` DROP FOREIGN KEY `{$fk->name}`");
                }
            } else {
                // For SQLite, try standard dropForeign, though dropColumn usually handles it by table rebuild
                try {
                    Schema::table('products', function (Blueprint $table) {
                        $table->dropForeign(['category_id']);
                    });
                } catch (\Exception $e) {
                    // Ignore if not found
                }
            }

            Schema::table('products', function (Blueprint $table) {
                $table->dropColumn('category_id');
            });
        }
    }

    public function down(): void
    {
        if (! Schema::hasColumn('products', 'category_id')) {
            Schema::table('products', function (Blueprint $table) {
                $table->foreignId('category_id')->nullable()->constrained('categories')->nullOnDelete();
            });
        }
    }
};
