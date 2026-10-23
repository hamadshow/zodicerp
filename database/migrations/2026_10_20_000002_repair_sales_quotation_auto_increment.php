<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Reconciles drift in the sales quotation tables.
 *
 * The `sales_quotations` / `sales_quotation_details` migrations were never
 * recorded as run while the tables themselves were created out-of-band, so
 * their `id` columns ended up as plain `bigint unsigned` PRIMARY KEY without
 * AUTO_INCREMENT. Everything read fine, but every INSERT failed with MySQL
 * error 1364 ("Field 'id' doesn't have a default value"), which made it
 * impossible to save a sales quotation at all (store and update both abort
 * before committing).
 *
 * This migration is idempotent:
 *  - creates the tables from the original migration definitions only if missing;
 *  - restores AUTO_INCREMENT on `id` when it is missing;
 *  - records the two drifted migrations as applied so a later `php artisan
 *    migrate` does not try to re-create tables that already exist.
 *
 * No column, index, foreign key or row is modified beyond adding the
 * AUTO_INCREMENT attribute, and both tables are empty on affected databases,
 * so no id value can collide. Mirrors
 * 2026_09_15_000002_repair_price_list_auto_increment.
 */
return new class extends Migration
{
    private const DRIFTED_MIGRATIONS = [
        '2026_01_22_130000_create_sales_quotations_table' => 'sales_quotations',
        '2026_01_22_133000_create_sales_quotation_details_table' => 'sales_quotation_details',
    ];

    public function up(): void
    {
        if (! Schema::hasTable('sales_quotations')) {
            $this->createSalesQuotationsTable();
        }

        if (! Schema::hasTable('sales_quotation_details')) {
            $this->createSalesQuotationDetailsTable();
        }

        $this->ensureAutoIncrement('sales_quotations');
        $this->ensureAutoIncrement('sales_quotation_details');

        $this->recordDriftedMigrations();
    }

    /**
     * Deliberately not reversible: removing AUTO_INCREMENT again (or
     * un-recording the reconciled migrations) would restore a state in which
     * quotation rows cannot be inserted at all.
     */
    public function down(): void
    {
        //
    }

    private function createSalesQuotationsTable(): void
    {
        Schema::create('sales_quotations', function (Blueprint $table) {
            $table->id();

            $table->string('quotation_number', 50)->unique();

            $table->unsignedInteger('customer_id');
            $table->foreign('customer_id')->references('id')->on('customers');

            $table->foreignId('currency_id')->constrained('currencies');
            $table->decimal('exchange_rate', 15, 6)->default(1.000000);
            $table->date('quotation_date');
            $table->date('expiry_date')->nullable();
            $table->integer('valid_days')->nullable();

            $table->unsignedInteger('price_list_id')->nullable();
            $table->foreign('price_list_id')->references('id')->on('price_lists');

            $table->foreignId('warehouse_id')->nullable()->constrained('warehouses');

            $table->decimal('subtotal', 15, 2)->default(0);
            $table->decimal('discount_percentage', 5, 2)->default(0);
            $table->decimal('discount_amount', 15, 2)->default(0);
            $table->decimal('tax_amount', 15, 2)->default(0);
            $table->decimal('shipping_cost', 15, 2)->default(0);
            $table->decimal('total_amount', 15, 2)->default(0);

            $table->decimal('base_total', 15, 2)->storedAs('total_amount * exchange_rate');

            $table->enum('status', ['draft', 'sent', 'under_review', 'accepted', 'rejected', 'expired', 'converted'])->default('draft');

            $table->unsignedInteger('sales_agent_id')->nullable();
            $table->foreign('sales_agent_id')->references('id')->on('sales_agents');

            $table->decimal('probability_percentage', 5, 2)->default(0);
            $table->date('followup_date')->nullable();
            $table->date('sent_date')->nullable();
            $table->enum('sent_method', ['email', 'whatsapp', 'hand', 'other'])->nullable();
            $table->text('customer_notes')->nullable();
            $table->text('internal_notes')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->softDeletes();
            $table->timestamps();

            $table->charset = 'utf8mb4';
            $table->collation = 'utf8mb4_unicode_ci';

            $table->index('quotation_number', 'idx_sales_quotations_number');
            $table->index('quotation_date', 'idx_sales_quotations_date');
            $table->index('status', 'idx_sales_quotations_status');
            $table->index('customer_id', 'idx_sales_quotations_customer');
            $table->index('sales_agent_id', 'idx_sales_quotations_agent');
        });
    }

    private function createSalesQuotationDetailsTable(): void
    {
        Schema::create('sales_quotation_details', function (Blueprint $table) {
            $table->id();
            $table->foreignId('quotation_id')->constrained('sales_quotations')->onDelete('cascade');
            $table->foreignId('product_id')->constrained('products');
            $table->decimal('quantity', 12, 4)->default(0);
            $table->foreignId('unit_id')->constrained('item_units');
            $table->decimal('unit_price', 15, 4);
            $table->decimal('discount_percentage', 5, 2)->default(0);
            $table->decimal('discount_amount', 15, 2)->default(0);
            $table->unsignedBigInteger('tax_id')->nullable();
            $table->decimal('tax_amount', 15, 2)->default(0);

            $table->decimal('line_total', 15, 2)->storedAs('(quantity * unit_price) - discount_amount + tax_amount');

            $table->date('delivery_date')->nullable();
            $table->text('notes')->nullable();
            $table->softDeletes();
            $table->timestamps();

            $table->charset = 'utf8mb4';
            $table->collation = 'utf8mb4_unicode_ci';

            $table->index('quotation_id', 'idx_quotation_details_quotation');
            $table->index('product_id', 'idx_quotation_details_product');
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

        // Keep the original column type from the create migration ($table->id()
        // = BIGINT UNSIGNED); only the missing AUTO_INCREMENT attribute is added.
        DB::statement("ALTER TABLE `{$table}` MODIFY `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT");
    }

    private function recordDriftedMigrations(): void
    {
        if (! Schema::hasTable('migrations')) {
            return;
        }

        $batch = ((int) DB::table('migrations')->max('batch')) + 1;

        foreach (self::DRIFTED_MIGRATIONS as $migration => $table) {
            if (! Schema::hasTable($table)) {
                continue;
            }

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
