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
        // 1. Create permissions table if not exists
        if (!Schema::hasTable('permissions')) {
            Schema::create('permissions', function (Blueprint $table) {
                $table->id();
                $table->string('name')->unique();
                $table->string('display_name')->nullable();
                $table->string('description')->nullable();
                $table->string('group')->nullable();
                $table->string('status')->default('active');
                $table->timestamps();
            });
        }

        // 2. Create role_permissions pivot table if not exists
        if (!Schema::hasTable('role_permissions')) {
            Schema::create('role_permissions', function (Blueprint $table) {
                $table->unsignedBigInteger('role_id');
                $table->unsignedBigInteger('permission_id');
                $table->primary(['role_id', 'permission_id']);
                
                $table->foreign('role_id')->references('id')->on('roles')->onDelete('cascade');
                $table->foreign('permission_id')->references('id')->on('permissions')->onDelete('cascade');
            });
        }

        // 3. Create employee_roles pivot table if not exists
        if (!Schema::hasTable('employee_roles')) {
            Schema::create('employee_roles', function (Blueprint $table) {
                $table->unsignedBigInteger('employee_id');
                $table->unsignedBigInteger('role_id');
                $table->primary(['employee_id', 'role_id']);

                $table->foreign('employee_id')->references('id')->on('employees')->onDelete('cascade');
                $table->foreign('role_id')->references('id')->on('roles')->onDelete('cascade');
            });
        }

        // 4. Safely add status to roles table if it doesn't exist
        Schema::table('roles', function (Blueprint $table) {
            if (!Schema::hasColumn('roles', 'status')) {
                $table->string('status')->default('active')->after('is_default');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('employee_roles');
        Schema::dropIfExists('role_permissions');
        Schema::dropIfExists('permissions');
        
        Schema::table('roles', function (Blueprint $table) {
            if (Schema::hasColumn('roles', 'status')) {
                $table->dropColumn('status');
            }
        });
    }
};
