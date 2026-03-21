<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('sales_quotations', function (Blueprint $table) {
            $table->id();
            $table->string('quotation_number', 50)->unique();

            // Foreign Keys
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

            // Generated column
            $table->decimal('base_total', 15, 2)->storedAs('total_amount * exchange_rate');

            $table->enum('status', ['draft', 'sent', 'under_review', 'accepted', 'rejected', 'expired', 'converted'])->default('draft');

            $table->unsignedInteger('sales_agent_id')->nullable();
            $table->foreign('sales_agent_id')->references('id')->on('sales_agents');

            $table->decimal('probability_percentage', 5, 2)->default(0)->comment('احتمال التحويل');
            $table->date('followup_date')->nullable();
            $table->date('sent_date')->nullable();
            $table->enum('sent_method', ['email', 'whatsapp', 'hand', 'other'])->nullable();
            $table->text('customer_notes')->nullable();
            $table->text('internal_notes')->nullable();
            $table->unsignedBigInteger('created_by')->nullable(); // users table
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

        DB::statement("ALTER TABLE sales_quotations COMMENT = 'عروض أسعار المبيعات للعملاء'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sales_quotations');
    }
};
