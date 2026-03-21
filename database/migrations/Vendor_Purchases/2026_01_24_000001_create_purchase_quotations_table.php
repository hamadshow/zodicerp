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
        Schema::create('purchase_quotations', function (Blueprint $table) {
            $table->id();

            // Basic Info
            $table->string('quotation_number', 50)->unique();
            $table->date('quotation_date');
            $table->date('expiry_date');

            // Issuer (Company)
            $table->unsignedBigInteger('company_id'); // Assuming companies table or handled logically
            $table->unsignedBigInteger('department_id');
            $table->unsignedBigInteger('prepared_by');

            // Vendor
            // Mapping vendor_id to suppliers table as per project convention
            $table->foreignId('vendor_id')->constrained('suppliers');
            $table->string('vendor_contact_person', 150)->nullable();
            $table->string('vendor_phone', 30)->nullable();
            $table->string('vendor_email', 150)->nullable();

            // Status
            $table->enum('status', [
                'draft',            // مسودة
                'pending_approval', // قيد الموافقة
                'approved',         // معتمد
                'sent_to_vendor',   // تم الإرسال للمورد
                'vendor_replied',   // رد المورد
                'converted_to_po',  // تحول لأمر شراء
                'rejected',         // مرفوض
                'cancelled',        // ملغي
                'expired',           // منتهي
            ])->default('draft');

            $table->enum('priority', ['low', 'medium', 'high', 'urgent'])->default('medium');

            // Amounts
            $table->decimal('subtotal', 15, 2)->default(0.00);
            $table->decimal('discount_amount', 15, 2)->default(0.00);
            $table->decimal('discount_percent', 5, 2)->default(0.00);
            $table->decimal('tax_amount', 15, 2)->default(0.00);
            $table->decimal('shipping_charges', 15, 2)->default(0.00);
            $table->decimal('other_charges', 15, 2)->default(0.00);
            $table->decimal('grand_total', 15, 2)->default(0.00);

            // Currency
            $table->foreignId('currency_id')->constrained('currencies');
            $table->decimal('exchange_rate', 10, 6)->default(1.000000);

            // Terms
            $table->unsignedInteger('payment_terms_id')->nullable();
            $table->unsignedInteger('delivery_terms_id')->nullable();
            $table->string('shipping_method', 100)->nullable();
            $table->text('shipping_address')->nullable();

            // Attachments & Notes
            $table->json('attachments')->nullable();
            $table->text('notes')->nullable();
            $table->text('terms_and_conditions')->nullable();
            $table->text('internal_notes')->nullable();

            // Links
            $table->unsignedBigInteger('converted_to_po_id')->nullable(); // Can link to purchase_orders
            $table->unsignedInteger('quotation_template_id')->nullable();

            // System
            $table->unsignedBigInteger('created_by');
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->unsignedBigInteger('approved_by')->nullable();
            $table->date('approved_date')->nullable();
            $table->date('sent_date')->nullable();
            $table->date('converted_date')->nullable();

            $table->timestamps();
            $table->softDeletes();

            // Engine & Charset
            $table->charset = 'utf8mb4';
            $table->collation = 'utf8mb4_unicode_ci';
            $table->engine = 'InnoDB';
        });

        // Add table comment if supported
        try {
            DB::statement("ALTER TABLE purchase_quotations COMMENT = 'عروض أسعار الشراء'");
        } catch (\Exception $e) {
            // Ignore
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('purchase_quotations');
    }
};
