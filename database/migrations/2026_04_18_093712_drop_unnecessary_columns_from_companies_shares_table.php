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
        Schema::table('companies_shares', function (Blueprint $table) {
            // Drop foreign keys using correct constraint names
            $table->dropForeign('companies_sector_id_foreign');
            $table->dropForeign('companies_tax_group_id_foreign');
            $table->dropForeign('companies_default_bank_account_id_foreign');
            $table->dropForeign('companies_payment_terms_id_foreign');

            // Drop columns
            $table->dropColumn([
                'sector_id',
                'postal_code',
                'fax',
                'contact_person_ar',
                'contact_person_en',
                'fiscal_year_end_month',
                'number_of_employees',
                'is_public',
                'tax_group_id',
                'vat_registration_number',
                'is_vat_registered',
                'default_bank_account_id',
                'payment_terms_id',
                'is_customer',
                'is_vendor',
                'is_competitor',
                'logo_path',
                'registration_certificate_path',
                'tax_certificate_path'
            ]);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('companies_shares', function (Blueprint $table) {
            // Restore columns if needed (optional for this specific task)
        });
    }
};
