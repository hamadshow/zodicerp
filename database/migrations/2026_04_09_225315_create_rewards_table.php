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
        Schema::create('rewards', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('employees')->onDelete('cascade');
            $table->string('reward_type');
            $table->decimal('reward_value', 15, 2)->default(0);
            $table->string('category')->nullable();
            $table->date('award_date');
            $table->string('status')->default('pending');
            $table->string('badge')->nullable();
            $table->text('reason');
            $table->string('awarded_by')->nullable();
            $table->integer('points')->default(0);
            $table->text('notes')->nullable();
            $table->unsignedBigInteger('company_id')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('rewards');
    }
};
