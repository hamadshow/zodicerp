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
        // Disable foreign key checks to allow dropping referenced table
        Schema::disableForeignKeyConstraints();

        // Drop the table if it exists to ensure we create it with the correct schema
        Schema::dropIfExists('tax_types');

        Schema::create('tax_types', function (Blueprint $table) {
            $table->id(); // INT PRIMARY KEY AUTO_INCREMENT
            $table->string('code', 50)->unique();
            $table->string('name_ar', 200);
            $table->string('name_en', 200);
            
            // Classification
            $table->enum('tax_category', ['sales', 'purchase', 'income', 'withholding', 'excise', 'customs', 'property', 'other']);
            $table->enum('tax_level', ['federal', 'state', 'provincial', 'county', 'city', 'municipal', 'special']);
            
            // Tax System
            $table->string('tax_system_code', 50)->nullable(); // e.g. VAT, GST
            
            $table->foreignId('country_id')->constrained('countries')->onDelete('cascade');
            
            // Legal Info
            $table->string('legal_reference', 500)->nullable();
            $table->date('effective_date');
            $table->date('expiry_date')->nullable();
            
            // Account Properties
            $table->boolean('is_recoverable')->default(true);
            $table->boolean('is_withholding')->default(false);
            $table->boolean('is_compound')->default(false);
            $table->boolean('is_active')->default(true);
            
            // System
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamps(); // created_at, updated_at

            // Indexes
            $table->index('tax_category', 'idx_tax_category');
            $table->index('country_id', 'idx_country');
            $table->index('tax_system_code', 'idx_tax_system');
        });

        Schema::enableForeignKeyConstraints();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tax_types');
    }
};
