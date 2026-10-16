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
        Schema::table('assets', function (Blueprint $table) {
            // The Assets register dropdown lists employees.id, Asset::employee()
            // resolves the Employee model, and every other employee_id FK in the
            // app references employees — but this FK was created against
            // users(id), where none of the 45 employee rows exist, so selecting
            // any employee failed on save with foreign key error 1452.
            $table->dropForeign(['employee_id']);

            $table->foreign('employee_id')
                ->references('id')
                ->on('employees')
                ->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('assets', function (Blueprint $table) {
            $table->dropForeign(['employee_id']);

            $table->foreign('employee_id')
                ->references('id')
                ->on('users')
                ->nullOnDelete();
        });
    }
};
