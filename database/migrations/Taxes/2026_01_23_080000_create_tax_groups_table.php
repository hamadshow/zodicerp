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
        Schema::create('tax_groups', function (Blueprint $table) {
            $table->id();
            $table->string('group_code', 50)->unique();
            $table->string('name_ar', 200);
            $table->string('name_en', 200);
            $table->text('description')->nullable();

            // Scope
            $table->foreignId('country_id')->nullable()->constrained('locations')->nullOnDelete();

            $table->enum('apply_to', ['sales', 'purchases', 'both', 'specific'])->default('both');

            // Characteristics
            $table->boolean('is_compound')->default(false);
            $table->integer('calculation_order')->default(1);
            $table->boolean('is_active')->default(true);

            // System
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamps();

            // Indexes
            $table->index('country_id', 'idx_group_location');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tax_groups');
    }
};
