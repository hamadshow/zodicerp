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
        Schema::create('tax_returns', function (Blueprint $table) {
            $table->id();
            $table->string('return_number', 100)->unique();
            $table->foreignId('tax_period_id')->constrained('tax_periods');
            
            // Entity
            // entity_id (company or branch)
            // Assuming companies table exists from 2026_01_09_105954_create_company_info_table.php but usually it is company_infos. 
            // The prompt says "FOREIGN KEY (entity_id) REFERENCES companies(id)". 
            // Let's check the migration for company_info to see the table name.
            // If table name is 'company_infos', we'll use that. If 'companies', we use that.
            // I'll assume 'company_infos' based on file name, but will use conditional logic or generic integer if unsure.
            // However, the user explicitly asked for "REFERENCES companies(id)". I should check if 'companies' exists.
            
            if (Schema::hasTable('companies')) {
                $table->foreignId('entity_id')->constrained('companies');
            } elseif (Schema::hasTable('company_infos')) {
                 $table->unsignedBigInteger('entity_id');
                 $table->foreign('entity_id')->references('id')->on('company_infos');
            } else {
                $table->unsignedBigInteger('entity_id');
            }

            $table->enum('entity_type', ['company', 'branch', 'division'])->default('company');
            
            // Return Details
            $table->enum('return_type', ['original', 'amendment', 'supplementary'])->default('original');
            $table->date('filing_date')->nullable();
            $table->enum('filing_method', ['electronic', 'manual', 'portal'])->default('electronic');
            
            // Amounts
            $table->decimal('taxable_amount', 20, 4)->default(0);
            $table->decimal('tax_amount', 20, 4)->default(0);
            $table->decimal('tax_paid', 20, 4)->default(0);
            $table->decimal('tax_due', 20, 4)->default(0);
            $table->decimal('tax_refund', 20, 4)->default(0);
            
            // Tax Details
            $table->json('tax_details')->nullable();
            
            // Status
            $table->enum('status', ['draft', 'submitted', 'accepted', 'rejected', 'under_review', 'processed'])->default('draft');
            $table->string('assessment_number', 100)->nullable();
            $table->date('assessment_date')->nullable();
            
            // Attachments & Notes
            $table->string('document_path', 500)->nullable();
            $table->string('reference_number', 100)->nullable();
            $table->text('notes')->nullable();
            
            // System
            $table->unsignedBigInteger('prepared_by')->nullable();
            $table->unsignedBigInteger('reviewed_by')->nullable();
            $table->unsignedBigInteger('approved_by')->nullable();
            $table->unsignedBigInteger('submitted_by')->nullable();
            
            $table->timestamps();

            // Indexes
            $table->index('status', 'idx_return_status');
            $table->index('filing_date', 'idx_filing_date');
            $table->index('tax_period_id', 'idx_tax_period');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tax_returns');
    }
};
