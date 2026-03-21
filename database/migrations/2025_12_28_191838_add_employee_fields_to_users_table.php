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
        Schema::table('users', function (Blueprint $table) {
            $table->string('first_name')->nullable()->after('name');
            $table->string('last_name')->nullable()->after('first_name');
            $table->string('phone')->nullable()->after('email');
            $table->string('department')->nullable()->after('phone');
            $table->string('position')->nullable()->after('department');
            $table->date('hire_date')->nullable()->after('position');
            $table->decimal('salary', 10, 2)->nullable()->after('hire_date');
            $table->string('nationality')->nullable()->after('salary');
            $table->enum('status', ['active', 'inactive', 'on-leave', 'terminated'])->default('active')->after('nationality');
            $table->text('address')->nullable()->after('status');
            $table->text('notes')->nullable()->after('address');
            $table->string('avatar')->nullable()->after('notes');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'first_name',
                'last_name',
                'phone',
                'department',
                'position',
                'hire_date',
                'salary',
                'nationality',
                'status',
                'address',
                'notes',
                'avatar',
            ]);
        });
    }
};
