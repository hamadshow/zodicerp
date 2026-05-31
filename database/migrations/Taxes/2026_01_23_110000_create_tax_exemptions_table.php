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
        Schema::create('tax_exemptions', function (Blueprint $table) {
            $table->id();
            $table->string('exemption_code', 100)->unique();
            $table->string('name_ar', 200);
            $table->string('name_en', 200);

            // Scope
            $table->foreignId('location_id')->constrained('locations');

            $table->enum('exemption_type', ['customer', 'product', 'service', 'document', 'special']);

            // Details
            // customer_id (unsigned integer in customers table)
            if (Schema::hasTable('customers')) {
                $table->unsignedInteger('customer_id')->nullable();
                $table->foreign('customer_id')->references('id')->on('customers');
            } else {
                $table->unsignedInteger('customer_id')->nullable();
            }

            // product_id (unsigned big integer in products table)
            if (Schema::hasTable('products')) {
                $table->foreignId('product_id')->nullable()->constrained('products');
            } else {
                $table->unsignedBigInteger('product_id')->nullable();
            }

            $table->unsignedBigInteger('service_id')->nullable();
            $table->enum('document_type', ['invoice', 'receipt', 'credit_note', 'debit_note', 'all'])->nullable();

            // Exempted Taxes
            $table->json('exempted_tax_ids')->nullable(); // List of tax IDs
            $table->decimal('exemption_percentage', 5, 2)->default(100.00);

            // Legal Basis
            $table->string('legal_basis', 500)->nullable();
            $table->string('certificate_number', 100)->nullable();
            $table->date('certificate_expiry')->nullable();

            // Dates
            $table->date('effective_from');
            $table->date('effective_to')->nullable();

            // System
            $table->boolean('is_active')->default(true);
            $table->boolean('requires_certificate')->default(false);
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('approved_by')->nullable();
            $table->date('approved_date')->nullable();

            $table->timestamps();

            // Indexes
            $table->index('exemption_type', 'idx_exemption_type');
            $table->index('certificate_number', 'idx_certificate');
            $table->index(['effective_from', 'effective_to'], 'idx_effective');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tax_exemptions');
    }
};
