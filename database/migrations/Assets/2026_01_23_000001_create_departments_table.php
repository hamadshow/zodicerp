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
        Schema::disableForeignKeyConstraints();
        Schema::dropIfExists('departments');

        Schema::create('departments', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('parent_id')->nullable()->index();
            $table->string('name_ar', 100);
            $table->string('name_en', 100)->nullable();
            $table->text('description')->nullable();
            $table->foreignId('manager_id')->nullable()->constrained('users')->nullOnDelete();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
            $table->unsignedBigInteger('company_id')->nullable()->index();

            // Self-referencing relationship
            $table->foreign('parent_id')
                ->references('id')
                ->on('departments')
                ->onDelete('set null');
        });
        Schema::enableForeignKeyConstraints();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::disableForeignKeyConstraints();
        Schema::dropIfExists('departments');
        Schema::enableForeignKeyConstraints();
    }
};

/*
-- BONUS: SQL UPDATE STRATEGY --
-- 1. Reset all to roots
UPDATE departments SET parent_id = NULL;

-- 2. Assign parents based on name hierarchy (e.g., "Parent > Child")
UPDATE departments d_child
JOIN departments d_parent ON d_child.name_en LIKE CONCAT(d_parent.name_en, ' > %')
SET d_child.parent_id = d_parent.id;
*/
