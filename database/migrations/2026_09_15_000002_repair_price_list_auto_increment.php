<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Reconciles drift in the existing price list tables.
 *
 * The `price_lists` / `price_list_items` migrations were never recorded as run
 * while the tables themselves were created out-of-band, so their `id` columns
 * ended up as plain `int unsigned` PRIMARY KEY without AUTO_INCREMENT. Reads
 * worked (ProductPriceResolver only reads), but every INSERT failed with MySQL
 * error 1364 ("Field 'id' doesn't have a default value").
 *
 * This migration is idempotent:
 *  - creates the tables from the original migration definition only if missing;
 *  - restores AUTO_INCREMENT on `id` when it is missing;
 *  - records the two drifted migrations as applied so a later `php artisan
 *    migrate` does not try to re-create tables that already exist.
 *
 * No pricing column, index, foreign key or row is modified.
 */
return new class extends Migration
{
    private const DRIFTED_MIGRATIONS = [
        '2026_01_22_083000_create_price_lists_table',
        '2026_01_22_120000_create_price_list_items_table',
    ];

    public function up(): void
    {
        if (! Schema::hasTable('price_lists')) {
            $this->createPriceListsTable();
        }

        if (! Schema::hasTable('price_list_items')) {
            $this->createPriceListItemsTable();
        }

        $this->ensureAutoIncrement('price_lists');
        $this->ensureAutoIncrement('price_list_items');

        $this->recordDriftedMigrations();
    }

    /**
     * Deliberately not reversible: removing AUTO_INCREMENT again (or un-recording
     * the reconciled migrations) would restore a state in which price list rows
     * cannot be inserted at all.
     */
    public function down(): void
    {
        //
    }

    private function createPriceListsTable(): void
    {
        Schema::create('price_lists', function (Blueprint $table) {
            $table->charset = 'utf8mb4';
            $table->collation = 'utf8mb4_unicode_ci';

            $table->increments('id');
            $table->string('code', 20)->unique();
            $table->string('name_ar', 100);
            $table->string('name_en', 100)->nullable();

            $table->unsignedBigInteger('currency_id');

            $table->date('valid_from');
            $table->date('valid_to')->nullable();

            $table->boolean('is_default')->default(false);
            $table->enum('price_type', ['retail', 'wholesale', 'special', 'promotional', 'contract'])->default('retail');
            $table->enum('rounding_method', ['none', 'normal', 'up', 'down'])->default('none');
            $table->decimal('rounding_factor', 5, 2)->default(0.05);

            $table->boolean('is_active')->default(true);
            $table->text('notes')->nullable();

            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('currency_id')->references('id')->on('currencies');

            $table->index('code', 'idx_price_lists_code');
            $table->index(['valid_from', 'valid_to'], 'idx_price_lists_validity');
            $table->index('is_active', 'idx_price_lists_active');
        });
    }

    private function createPriceListItemsTable(): void
    {
        Schema::create('price_list_items', function (Blueprint $table) {
            $table->charset = 'utf8mb4';
            $table->collation = 'utf8mb4_unicode_ci';

            $table->increments('id');
            $table->unsignedInteger('price_list_id');
            $table->unsignedBigInteger('product_id');
            $table->unsignedBigInteger('unit_id');

            $table->decimal('min_quantity', 12, 4)->default(1);
            $table->decimal('unit_price', 15, 4);
            $table->decimal('discount_percentage', 5, 2)->default(0);
            $table->decimal('discount_amount', 15, 2)->default(0);

            $table->decimal('final_price', 15, 4)->storedAs('unit_price - (unit_price * discount_percentage / 100) - discount_amount');

            $table->date('effective_date')->nullable();
            $table->date('expiry_date')->nullable();
            $table->text('notes')->nullable();

            $table->foreign('price_list_id')->references('id')->on('price_lists')->onDelete('cascade');
            $table->foreign('product_id')->references('id')->on('products');
            $table->foreign('unit_id')->references('id')->on('item_units');

            $table->index('price_list_id', 'idx_price_list_items_price_list');
            $table->index('product_id', 'idx_price_list_items_product');

            $table->unique(['price_list_id', 'product_id', 'unit_id', 'min_quantity'], 'unique_price_list_product');
        });
    }

    private function ensureAutoIncrement(string $table): void
    {
        if (DB::getDriverName() !== 'mysql') {
            return;
        }

        $extra = (string) DB::table('information_schema.columns')
            ->where('table_schema', DB::getDatabaseName())
            ->where('table_name', $table)
            ->where('column_name', 'id')
            ->selectRaw('EXTRA as extra')
            ->value('extra');

        if (stripos($extra, 'auto_increment') !== false) {
            return;
        }

        DB::statement("ALTER TABLE `{$table}` MODIFY `id` INT UNSIGNED NOT NULL AUTO_INCREMENT");
    }

    private function recordDriftedMigrations(): void
    {
        if (! Schema::hasTable('migrations')) {
            return;
        }

        $batch = ((int) DB::table('migrations')->max('batch')) + 1;

        foreach (self::DRIFTED_MIGRATIONS as $migration) {
            $recorded = DB::table('migrations')->where('migration', $migration)->exists();

            if (! $recorded) {
                DB::table('migrations')->insert([
                    'migration' => $migration,
                    'batch' => $batch,
                ]);
            }
        }
    }
};
