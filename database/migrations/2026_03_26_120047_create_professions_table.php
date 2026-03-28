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
        // Drop table if it exists to fix migration failure
        Schema::dropIfExists('professions');

        Schema::create('professions', function (Blueprint $table) {
            $table->id();
            // Use unsignedBigInteger for company_id to handle existing 'company' table FK
            $table->unsignedBigInteger('company_id');
            $table->string('profession_name');
            $table->string('profession_code', 100)->unique();
            $table->string('category', 150)->nullable();
            $table->text('description')->nullable();
            $table->decimal('min_salary', 12, 2)->default(0);
            $table->decimal('max_salary', 12, 2)->default(0);
            $table->integer('required_experience')->default(0); // عدد السنوات
            $table->enum('education_level', [
                'High School',
                'Diploma',
                'Bachelor',
                'Master',
                'PhD'
            ])->default('Bachelor');
            $table->text('key_skills')->nullable(); // comma separated
            $table->integer('employees')->nullable(); // number of employees in this category
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            // Check if 'company' table exists and add FK manually
            if (Schema::hasTable('company')) {
                $table->foreign('company_id')->references('id')->on('company')->onDelete('cascade');
            } elseif (Schema::hasTable('companies')) {
                $table->foreign('company_id')->references('id')->on('companies')->onDelete('cascade');
            } elseif (Schema::hasTable('companies_shares')) {
                $table->foreign('company_id')->references('id')->on('companies_shares')->onDelete('cascade');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('professions');
    }
};
