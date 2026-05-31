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
        Schema::create('warehouses', function (Blueprint $table) {
            $table->id();
            $table->string('warehouse_code')->unique();
            $table->string('name');
            $table->foreignId('branch_id')->constrained('branches')->onDelete('cascade');
            $table->foreignId('company_id')->nullable()->constrained('company')->nullOnDelete();
            $table->string('manager')->nullable();
            $table->string('location')->nullable();
            $table->integer('capacity')->default(0);
            $table->integer('used_capacity')->default(0);
            $table->enum('status', ['active', 'inactive', 'maintenance'])->default('active');
            $table->string('icon')->default('warehouse');
            $table->string('color')->default('#3b82f6');
            $table->text('description')->nullable();
            $table->softDeletes();
            $table->timestamps();

            // Enforce unique name per branch
            $table->unique(['branch_id', 'name']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('warehouses');
    }
};
