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
        Schema::create('careers', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('location')->nullable();
            $table->string('type')->default('full-time');
            $table->text('description')->nullable();
            $table->text('requirements')->nullable();
            $table->text('responsibilities')->nullable();
            $table->string('salary_range')->nullable();
            $table->boolean('is_active')->default(true);
            $table->unsignedBigInteger('company_id')->nullable();
            $table->timestamps();

            // If you have a companies table, you can add a foreign key
            // $table->foreign('company_id')->references('id')->on('companies')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('careers');
    }
};
