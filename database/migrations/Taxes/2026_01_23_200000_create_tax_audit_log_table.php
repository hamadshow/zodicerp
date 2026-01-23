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
        Schema::create('tax_audit_log', function (Blueprint $table) {
            $table->id();
            $table->dateTime('log_date');
            $table->unsignedBigInteger('user_id')->nullable();
            
            // Action
            $table->enum('action_type', ['create', 'update', 'delete', 'calculate', 'submit', 'approve', 'reject']);
            $table->string('table_name', 100);
            $table->unsignedBigInteger('record_id');
            
            // Changes
            $table->json('old_values')->nullable();
            $table->json('new_values')->nullable();
            $table->json('changed_fields')->nullable();
            
            // Context
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->string('session_id', 100)->nullable();
            
            $table->timestamp('created_at')->useCurrent();
            
            // Indexes
            $table->index('log_date', 'idx_log_date');
            $table->index('action_type', 'idx_action_type');
            $table->index(['table_name', 'record_id'], 'idx_table_record');
            
            // User FK if exists
            if (Schema::hasTable('users')) {
                $table->foreign('user_id')->references('id')->on('users')->nullOnDelete();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tax_audit_log');
    }
};
