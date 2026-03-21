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
        Schema::create('asset_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('asset_id')->constrained('assets')->cascadeOnDelete();
            $table->enum('movement_type', ['transfer', 'loan', 'return', 'adjustment']);
            $table->date('movement_date');

            // From
            $table->foreignId('from_warehouse_id')->nullable()->constrained('warehouses')->nullOnDelete();
            $table->foreignId('from_department_id')->nullable()->constrained('departments')->nullOnDelete();
            $table->foreignId('from_employee_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('from_location', 500)->nullable();

            // To
            $table->foreignId('to_warehouse_id')->nullable()->constrained('warehouses')->nullOnDelete();
            $table->foreignId('to_department_id')->nullable()->constrained('departments')->nullOnDelete();
            $table->foreignId('to_employee_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('to_location', 500)->nullable();

            // Quantity
            $table->decimal('quantity', 15, 3)->default(1);

            // Details
            $table->string('reference_number', 100)->nullable();
            $table->text('reason')->nullable();
            $table->text('notes')->nullable();

            // Status
            $table->enum('status', ['pending', 'approved', 'completed', 'cancelled'])->default('pending');

            // System
            $table->foreignId('requested_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('received_by')->nullable()->constrained('users')->nullOnDelete();

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('asset_movements');
    }
};
