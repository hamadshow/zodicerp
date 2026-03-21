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
        Schema::create('budget_allocation_logs', function (Blueprint $table) {
            $table->id();
            $table->date('allocation_date');
            $table->string('from_source', 100)->nullable();
            $table->string('to_destination', 100)->nullable();

            $table->decimal('allocated_amount', 20, 4);
            $table->string('allocation_method', 50)->nullable();
            $table->text('allocation_reason')->nullable();

            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();

            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('budget_allocation_logs');
    }
};
