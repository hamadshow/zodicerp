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
        Schema::create('tax_group_details', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tax_group_id')->constrained('tax_groups')->onDelete('cascade');
            $table->foreignId('tax_id')->constrained('taxes');
            
            // Order and Calculation
            $table->integer('sequence_number');
            $table->boolean('is_compound_on_previous')->default(false);
            $table->json('compound_base_tax_ids')->nullable(); // Previous taxes to calculate tax on
            
            // Application
            $table->boolean('apply_to_subtotal')->default(true);
            $table->boolean('include_in_total')->default(true);
            
            // System
            $table->timestamps();

            // Constraints and Indexes
            $table->unique(['tax_group_id', 'tax_id'], 'unique_tax_group_tax');
            $table->index(['tax_group_id', 'sequence_number'], 'idx_sequence');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tax_group_details');
    }
};
