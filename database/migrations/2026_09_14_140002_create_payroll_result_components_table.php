<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payroll_result_components', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('payroll_result_id')->constrained('payroll_results')->cascadeOnDelete();
            $table->string('component_key', 150);
            $table->string('component_type', 20);
            $table->string('source_type', 150);
            $table->unsignedBigInteger('source_id');
            $table->string('description')->nullable();
            $table->decimal('amount', 15, 2)->default(0);
            $table->json('source_snapshot')->nullable();
            $table->timestamp('source_updated_at')->nullable();
            $table->timestamps();

            $table->unique(['payroll_result_id', 'component_key']);
            $table->unique(['source_type', 'source_id']);
            $table->index('payroll_result_id');
            $table->index(['source_type', 'source_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payroll_result_components');
    }
};
