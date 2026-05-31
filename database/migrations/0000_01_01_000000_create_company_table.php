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
        Schema::create('company', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id')->nullable();
            // Basic Information
            $table->string('company_code')->nullable();
            $table->string('company_name');
            $table->string('english_name')->nullable();
            $table->string('company_type')->nullable();
            $table->string('job_title')->nullable();
            $table->string('mobile')->nullable();
            $table->string('country')->nullable();
            $table->string('city')->nullable();
            $table->string('area')->nullable();
            $table->text('address')->nullable();
            $table->string('logo')->nullable();

            // Government Information
            $table->string('accountant_name')->nullable();
            $table->string('commercial_registration')->nullable();
            $table->string('tax_number')->nullable();
            $table->string('vat_number')->nullable();
            $table->date('date_of_establishment')->nullable();
            $table->string('social_insurance_number')->nullable();
            $table->text('annual_goals')->nullable();
            $table->string('storage')->nullable();
            $table->string('work_center')->nullable(); // Corrected typo from "word center"
            $table->string('subsidiary_company')->nullable();

            // Contact Information
            $table->string('email_address')->nullable();
            $table->string('official_email')->nullable();
            $table->string('facebook')->nullable();
            $table->string('telegram')->nullable();
            $table->string('youtube')->nullable();
            $table->string('instagram')->nullable();

            // Financial Information
            $table->string('account_holder_name')->nullable();
            $table->string('bank_name')->nullable();
            $table->string('iban')->nullable();
            $table->string('branch_name')->nullable();
            $table->string('swift_bic')->nullable();
            $table->text('bank_address')->nullable();

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('company');
    }
};
