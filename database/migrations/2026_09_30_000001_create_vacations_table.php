<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vacations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('employees')->onDelete('cascade');
            $table->enum('leave_type', ['annual', 'sick', 'maternity', 'unpaid']);
            $table->date('start_date');
            $table->date('end_date');
            $table->unsignedInteger('total_days')->default(0);
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->text('notes')->nullable();
            $table->unsignedBigInteger('company_id')->nullable();
            $table->timestamps();

            $table->index(['employee_id', 'start_date', 'end_date']);
            $table->index(['company_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vacations');
    }
};
