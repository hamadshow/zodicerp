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
        Schema::create('traffic_violations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('employees')->onDelete('cascade');
            $table->string('vehicle_plate');
            $table->string('vehicle_type');
            $table->string('driver_license')->nullable();
            $table->string('violation_type');
            $table->enum('severity', ['low', 'medium', 'high'])->default('medium');
            $table->dateTime('violation_date');
            $table->decimal('fine_amount', 15, 2)->default(0);
            $table->string('location');
            $table->string('officer_id')->nullable();
            $table->string('status')->default('pending');
            $table->integer('points')->default(0);
            $table->text('description')->nullable();
            $table->text('evidence_notes')->nullable();
            $table->unsignedBigInteger('company_id')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('traffic_violations');
    }
};
