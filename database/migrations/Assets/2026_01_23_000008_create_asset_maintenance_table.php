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
        Schema::create('asset_maintenance', function (Blueprint $table) {
            $table->id();
            $table->foreignId('asset_id')->constrained('assets')->cascadeOnDelete();
            
            $table->enum('maintenance_type', ['preventive', 'corrective', 'predictive', 'emergency']);
            
            // Dates
            $table->date('request_date');
            $table->date('schedule_date')->nullable();
            $table->date('start_date')->nullable();
            $table->date('completion_date')->nullable();
            
            // Info
            $table->string('maintenance_code', 50)->nullable()->unique();
            $table->string('title_ar', 200);
            $table->string('title_en', 200)->nullable();
            $table->text('description')->nullable();
            
            // Technician and Cost
            $table->string('assigned_to', 200)->nullable();
            
            // Vendor FK
            // Assuming vendors are stored in 'suppliers' table (typical in ERPs, or specific 'vendors' table).
            // Based on previous search, 'suppliers' table exists. 
            // User SQL asks for 'vendors(id)'. 
            // We will add the column 'vendor_id'.
            // If 'vendors' table exists, we link it. If 'suppliers' is the intended table for vendors, we might need to link there.
            // But since user explicitly wrote 'vendors', and we don't have a 'vendors' table in recent search (only suppliers),
            // I will assume 'vendors' might be created later OR user meant 'suppliers'.
            // However, to be safe, I will create the column and conditionally link to 'suppliers' if 'vendors' doesn't exist, 
            // OR just link to 'vendors' if it exists.
            // Actually, in many systems vendor = supplier.
            // I'll add the column `vendor_id`.
            $table->unsignedBigInteger('vendor_id')->nullable();
            
            $table->decimal('estimated_cost', 20, 4)->nullable();
            $table->decimal('actual_cost', 20, 4)->nullable();
            
            // Currency FK
            $table->unsignedBigInteger('currency_id')->nullable();
            
            // Status
            $table->enum('status', ['pending', 'approved', 'in_progress', 'completed', 'cancelled'])->default('pending');
            $table->enum('priority', ['low', 'medium', 'high', 'critical'])->default('medium');
            
            // Findings
            $table->text('findings')->nullable();
            $table->text('actions_taken')->nullable();
            $table->text('parts_replaced')->nullable();
            $table->date('next_maintenance_date')->nullable();
            
            // Approvals
            $table->unsignedBigInteger('requested_by')->nullable();
            $table->unsignedBigInteger('approved_by')->nullable();
            $table->unsignedBigInteger('completed_by')->nullable();
            
            $table->timestamps();
            
            // Foreign Keys
            if (Schema::hasTable('currencies')) {
                $table->foreign('currency_id')->references('id')->on('currencies')->nullOnDelete();
            }
            
            // Check for vendors or suppliers
            if (Schema::hasTable('vendors')) {
                $table->foreign('vendor_id')->references('id')->on('vendors')->nullOnDelete();
            } elseif (Schema::hasTable('suppliers')) {
                // Fallback to suppliers if vendors table is missing, assuming they are same entity
                $table->foreign('vendor_id')->references('id')->on('suppliers')->nullOnDelete();
            }
            
            if (Schema::hasTable('users')) {
                 $table->foreign('requested_by')->references('id')->on('users')->nullOnDelete();
                 $table->foreign('approved_by')->references('id')->on('users')->nullOnDelete();
                 $table->foreign('completed_by')->references('id')->on('users')->nullOnDelete();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('asset_maintenance');
    }
};
