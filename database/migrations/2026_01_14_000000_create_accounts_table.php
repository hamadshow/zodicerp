<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('accounts', function (Blueprint $table) {
            $table->increments('AccID');
            $table->string('AccCode', 50)->unique();
            $table->string('AccName', 100);
            $table->tinyInteger('AccType')->nullable();
            $table->string('AccParent', 50)->nullable()->index();
            $table->tinyInteger('AccDmType')->nullable();
            $table->tinyInteger('AccFinal')->nullable();
            $table->decimal('AccMaxLimt', 15, 3)->nullable();
            $table->smallInteger('AccMaxDuration')->nullable();
            $table->tinyInteger('AccBranch')->nullable();
            $table->tinyInteger('AddUser')->nullable();
            $table->date('AddDate')->nullable();
            $table->tinyInteger('EditUser')->nullable();
            $table->date('EditDate')->nullable();
            $table->tinyInteger('NumOfEdit')->default(0);
            $table->boolean('AccStopped')->default(false);
            $table->longText('AccNote')->nullable();
            $table->string('Nature', 50)->nullable(); // bank, cash, revenue, etc.
            $table->foreignId('company_id')->nullable()->constrained('company')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('accounts');
    }
};
