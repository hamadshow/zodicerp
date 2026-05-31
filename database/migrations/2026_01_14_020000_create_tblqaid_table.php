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
        Schema::create('journal_entries', function (Blueprint $table) {
            $table->id();
            $table->string('entry_code', 50)->unique();
            $table->string('entry_type', 50)->nullable();
            $table->string('reference', 50)->nullable();
            $table->dateTime('date')->nullable();
            $table->string('description', 400)->nullable();
            $table->decimal('total_amount', 15, 3)->default(0);
            $table->string('status', 20)->default('UnPost');
            $table->foreignId('company_id')->nullable()->constrained('company')->nullOnDelete();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('journal_entries');
    }
};
