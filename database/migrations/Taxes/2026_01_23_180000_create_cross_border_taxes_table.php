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
        Schema::create('cross_border_taxes', function (Blueprint $table) {
            $table->id();
            $table->enum('transaction_type', ['export', 'import', 'intra_community', 'reverse_charge']);

            // Locations
            $table->foreignId('source_location_id')->constrained('locations');
            $table->foreignId('destination_location_id')->constrained('locations');

            // Tax
            $table->unsignedBigInteger('applicable_tax_id')->nullable();
            $table->decimal('tax_rate', 10, 4)->nullable();
            $table->enum('tax_treatment', ['exempt', 'zero_rated', 'standard', 'reduced', 'special']);

            // Documents
            $table->json('required_documents')->nullable();
            $table->text('certificate_requirements')->nullable();

            // System
            $table->boolean('is_active')->default(true);
            $table->date('effective_from');
            $table->date('effective_to')->nullable();

            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamps();

            // Foreign Keys
            $table->foreign('applicable_tax_id')->references('id')->on('taxes');

            // Constraints & Indexes
            $table->unique(['source_location_id', 'destination_location_id', 'transaction_type'], 'unique_border_tax');
            $table->index('transaction_type', 'idx_transaction_type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cross_border_taxes');
    }
};
