<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (
            Schema::hasTable('inventory_cost_balances')
            && Schema::hasTable('inventory_cost_transactions')
            && Schema::hasColumn('inventory_movement_lines', 'goods_receipt_detail_id')
            && Schema::hasColumn('inventory_movement_lines', 'purchase_invoice_detail_id')
            && Schema::hasColumn('landed_costs', 'purchase_invoice_id')
            && Schema::hasColumn('landed_cost_allocations', 'inventory_movement_line_id')
        ) {
            return;
        }

        if (Schema::hasTable('goods_receipt_details') && Schema::hasColumn('goods_receipt_details', 'invoice_detail_id')) {
            Schema::table('goods_receipt_details', function (Blueprint $table) {
                $table->foreign('invoice_detail_id', 'grd_invoice_detail_fk')
                    ->references('id')
                    ->on('purchase_invoice_details');
            });
        }

        if (Schema::hasTable('inventory_movement_lines')) {
            Schema::table('inventory_movement_lines', function (Blueprint $table) {
                $table->unsignedBigInteger('goods_receipt_detail_id')->nullable()->after('stock_movement_id');
                $table->unsignedBigInteger('purchase_invoice_detail_id')->nullable()->after('goods_receipt_detail_id');
                $table->index('goods_receipt_detail_id', 'iml_goods_receipt_detail_idx');
                $table->index('purchase_invoice_detail_id', 'iml_purchase_invoice_detail_idx');
                $table->foreign('goods_receipt_detail_id', 'iml_goods_receipt_detail_fk')
                    ->references('id')
                    ->on('goods_receipt_details');
                $table->foreign('purchase_invoice_detail_id', 'iml_purchase_invoice_detail_fk')
                    ->references('id')
                    ->on('purchase_invoice_details');
            });
        }

        if (Schema::hasTable('landed_costs')) {
            Schema::table('landed_costs', function (Blueprint $table) {
                $table->unsignedBigInteger('purchase_invoice_id')->nullable()->after('id');
                $table->string('credit_source_type', 30)->nullable()->after('allocated_amount');
                $table->unsignedInteger('credit_account_id')->nullable()->after('credit_source_type');
                $table->date('posting_date')->nullable()->after('credit_account_id');
                $table->string('posted_journal_entry_code', 50)->nullable()->after('posting_date');
                $table->string('reversal_journal_entry_code', 50)->nullable()->after('posted_journal_entry_code');
                $table->index('purchase_invoice_id', 'landed_costs_purchase_invoice_idx');
                $table->index('credit_account_id', 'landed_costs_credit_account_idx');
                $table->foreign('purchase_invoice_id', 'landed_costs_purchase_invoice_fk')
                    ->references('id')
                    ->on('purchase_invoices');
                $table->foreign('credit_account_id', 'landed_costs_credit_account_fk')
                    ->references('AccID')
                    ->on('accounts');
            });
        }

        if (Schema::hasTable('landed_cost_allocations')) {
            Schema::table('landed_cost_allocations', function (Blueprint $table) {
                $table->unsignedBigInteger('inventory_movement_line_id')->nullable()->after('purchase_invoice_detail_id');
                $table->index('inventory_movement_line_id', 'lca_inventory_movement_line_idx');
                $table->foreign('inventory_movement_line_id', 'lca_inventory_movement_line_fk')
                    ->references('id')
                    ->on('inventory_movement_lines');
            });
        }

        Schema::create('inventory_cost_balances', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('company_id');
            $table->unsignedBigInteger('product_id');
            $table->unsignedBigInteger('warehouse_id');
            $table->decimal('quantity', 18, 4)->default(0);
            $table->decimal('inventory_value', 18, 6)->default(0);
            $table->decimal('average_cost', 18, 6)->default(0);
            $table->timestamps();

            $table->unique(['company_id', 'product_id', 'warehouse_id'], 'icb_scope_unique');
            $table->foreign('company_id', 'icb_company_fk')->references('id')->on('company');
            $table->foreign('product_id', 'icb_product_fk')->references('id')->on('products');
            $table->foreign('warehouse_id', 'icb_warehouse_fk')->references('id')->on('warehouses');
        });

        Schema::create('inventory_cost_transactions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('company_id');
            $table->unsignedBigInteger('product_id');
            $table->unsignedBigInteger('warehouse_id');
            $table->unsignedBigInteger('movement_header_id')->nullable();
            $table->unsignedBigInteger('movement_line_id')->nullable();
            $table->string('source_type', 50);
            $table->unsignedBigInteger('source_id');
            $table->decimal('quantity_delta', 18, 4);
            $table->decimal('value_delta', 18, 6);
            $table->decimal('unit_cost', 18, 6);
            $table->decimal('previous_quantity', 18, 4);
            $table->decimal('previous_value', 18, 6);
            $table->decimal('previous_average_cost', 18, 6);
            $table->decimal('new_quantity', 18, 4);
            $table->decimal('new_value', 18, 6);
            $table->decimal('new_average_cost', 18, 6);
            $table->date('transaction_date');
            $table->date('posting_date');
            $table->unsignedBigInteger('landed_cost_id')->nullable();
            $table->unsignedBigInteger('reversal_of_id')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();

            $table->index(['company_id', 'product_id', 'warehouse_id'], 'ict_scope_idx');
            $table->index(['source_type', 'source_id'], 'ict_source_idx');
            $table->index('movement_header_id', 'ict_movement_header_idx');
            $table->index('movement_line_id', 'ict_movement_line_idx');
            $table->index('landed_cost_id', 'ict_landed_cost_idx');
            $table->index('reversal_of_id', 'ict_reversal_idx');
            $table->foreign('company_id', 'ict_company_fk')->references('id')->on('company');
            $table->foreign('product_id', 'ict_product_fk')->references('id')->on('products');
            $table->foreign('warehouse_id', 'ict_warehouse_fk')->references('id')->on('warehouses');
            $table->foreign('movement_header_id', 'ict_movement_header_fk')
                ->references('id')
                ->on('inventory_movement_headers');
            $table->foreign('movement_line_id', 'ict_movement_line_fk')
                ->references('id')
                ->on('inventory_movement_lines');
            $table->foreign('landed_cost_id', 'ict_landed_cost_fk')
                ->references('id')
                ->on('landed_costs');
            $table->foreign('reversal_of_id', 'ict_reversal_of_fk')
                ->references('id')
                ->on('inventory_cost_transactions');
            $table->foreign('created_by', 'ict_created_by_fk')
                ->references('id')
                ->on('users');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inventory_cost_transactions');
        Schema::dropIfExists('inventory_cost_balances');

        if (Schema::hasTable('landed_cost_allocations')) {
            Schema::table('landed_cost_allocations', function (Blueprint $table) {
                $table->dropForeign('lca_inventory_movement_line_fk');
                $table->dropIndex('lca_inventory_movement_line_idx');
                $table->dropColumn('inventory_movement_line_id');
            });
        }

        if (Schema::hasTable('landed_costs')) {
            Schema::table('landed_costs', function (Blueprint $table) {
                $table->dropForeign('landed_costs_credit_account_fk');
                $table->dropForeign('landed_costs_purchase_invoice_fk');
                $table->dropIndex('landed_costs_credit_account_idx');
                $table->dropIndex('landed_costs_purchase_invoice_idx');
                $table->dropColumn([
                    'purchase_invoice_id',
                    'credit_source_type',
                    'credit_account_id',
                    'posting_date',
                    'posted_journal_entry_code',
                    'reversal_journal_entry_code',
                ]);
            });
        }

        if (Schema::hasTable('inventory_movement_lines')) {
            Schema::table('inventory_movement_lines', function (Blueprint $table) {
                $table->dropForeign('iml_purchase_invoice_detail_fk');
                $table->dropForeign('iml_goods_receipt_detail_fk');
                $table->dropIndex('iml_purchase_invoice_detail_idx');
                $table->dropIndex('iml_goods_receipt_detail_idx');
                $table->dropColumn(['purchase_invoice_detail_id', 'goods_receipt_detail_id']);
            });
        }

        if (Schema::hasTable('goods_receipt_details')) {
            Schema::table('goods_receipt_details', function (Blueprint $table) {
                $table->dropForeign('grd_invoice_detail_fk');
            });
        }
    }
};