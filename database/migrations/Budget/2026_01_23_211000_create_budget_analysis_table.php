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
        Schema::create('budget_analysis', function (Blueprint $table) {
            $table->id();
            $table->date('analysis_date');
            $table->string('kpi_code', 50);
            $table->string('kpi_name_ar', 200);
            $table->string('kpi_name_en', 200)->nullable();

            $table->decimal('actual_value', 20, 4)->nullable();
            $table->decimal('target_value', 20, 4)->nullable();
            $table->decimal('variance_value', 20, 4)->nullable();
            $table->decimal('variance_percent', 10, 2)->nullable();

            $table->enum('analysis_period', ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'])->nullable();
            $table->text('analysis_notes')->nullable();

            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('budget_analysis');
    }
};
