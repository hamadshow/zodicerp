<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('accounts', function (Blueprint $table) {
            $table->increments('AccID');
            $table->integer('AccCode');
            $table->string('AccName', 50);
            $table->tinyInteger('AccType')->nullable();
            $table->decimal('AccParent', 18, 0)->nullable();
            $table->tinyInteger('AccDmType')->nullable();
            $table->tinyInteger('AccFinal')->nullable();
            $table->integer('AccMaxLimt')->nullable();
            $table->smallInteger('AccMaxDuration')->nullable();
            $table->tinyInteger('AccBranch')->nullable();
            $table->tinyInteger('AddUser')->nullable();
            $table->date('AddDate')->nullable();
            $table->tinyInteger('EditUser')->nullable();
            $table->date('EditDate')->nullable();
            $table->tinyInteger('NumOfEdit')->default(0);
            $table->boolean('AccStopped')->default(false);
            $table->longText('AccNote')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('accounts');
    }
};

