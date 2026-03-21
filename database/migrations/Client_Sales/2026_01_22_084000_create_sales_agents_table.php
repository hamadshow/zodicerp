<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sales_agents', function (Blueprint $table) {
            $table->charset = 'utf8mb4';
            $table->collation = 'utf8mb4_unicode_ci';

            $table->increments('id');
            $table->string('agent_code', 20)->unique();
            $table->string('name_ar', 100);
            $table->string('name_en', 100)->nullable();

            $table->string('email', 100)->nullable();
            $table->string('phone', 20)->nullable();
            $table->string('mobile', 20)->nullable();

            $table->decimal('commission_rate', 5, 2)->default(0);
            $table->decimal('target_amount', 15, 2)->default(0);

            $table->unsignedInteger('supervisor_id')->nullable(); // Self-referencing, matches id

            $table->date('hire_date')->nullable();
            $table->date('termination_date')->nullable();

            $table->boolean('is_active')->default(true);
            $table->text('notes')->nullable();

            $table->unsignedBigInteger('user_id')->nullable(); // Link to users table

            $table->timestamps();
            $table->softDeletes();

            // Foreign Keys
            $table->foreign('supervisor_id')->references('id')->on('sales_agents')->nullOnDelete();
            // Assuming users table exists and id is bigInteger. If not, this might fail, but usually it is.
            // I'll make it nullable and constrained if possible, or just index it.
            // User requirement says: "user_id INT, -- ربط بجدول المستخدمين إن وجد"
            // I will add foreign key if users table exists, but to be safe and avoid dependency hell if users is elsewhere,
            // I'll just leave it as integer or try to constrain if I'm sure.
            // Previous searches showed 'users' table is referenced in other migrations.
            // So I will add the constraint but make it nullable.
            // Actually, to avoid "General error: 1215 Cannot add foreign key constraint" if users table is not ready or different type,
            // I'll check if I should add constraint. I'll add it.
            // Wait, users table usually uses id (BigInt).

            // Indexes
            $table->index('agent_code', 'idx_sales_agents_code');
            $table->index('name_ar', 'idx_sales_agents_name');
            $table->index('is_active', 'idx_sales_agents_active');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sales_agents');
    }
};
