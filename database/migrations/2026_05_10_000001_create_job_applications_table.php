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
        Schema::create('job_applications', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email')->index();
            $table->string('phone')->index();
            $table->unsignedBigInteger('career_id')->index();
            
            // Personal Info
            $table->enum('gender', ['male', 'female']);
            $table->integer('age');
            $table->string('nationality');
            
            // Address Info
            $table->string('country');
            $table->string('city');
            $table->string('area')->nullable();
            
            // Education & Experience
            $table->string('qualification');
            $table->string('specialization')->nullable();
            $table->string('experience_years');
            
            // Job Specifics
            $table->string('shift_type')->nullable(); // stored as comma separated string
            $table->decimal('expected_salary', 12, 2)->nullable();
            $table->string('availability_date')->nullable();
            
            // Files
            $table->string('cv_path');
            $table->string('certificates_path')->nullable();
            
            $table->text('message')->nullable();
            $table->string('status')->default('pending');
            $table->timestamps();

            $table->foreign('career_id')->references('id')->on('careers')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('job_applications');
    }
};
