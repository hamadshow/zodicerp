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
        Schema::create('asset_inspections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('asset_id')->constrained('assets')->cascadeOnDelete();
            $table->date('inspection_date');
            $table->string('inspector_name', 200)->nullable();

            $table->enum('condition_before', ['excellent', 'good', 'fair', 'poor', 'critical'])->nullable();
            $table->enum('condition_after', ['excellent', 'good', 'fair', 'poor', 'critical'])->nullable();

            $table->text('findings')->nullable();
            $table->text('recommendations')->nullable();
            $table->date('next_inspection_date')->nullable();

            $table->boolean('is_maintenance_required')->default(false);
            $table->foreignId('maintenance_id')->nullable()->constrained('asset_maintenance')->nullOnDelete();

            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('asset_inspections');
    }
};
