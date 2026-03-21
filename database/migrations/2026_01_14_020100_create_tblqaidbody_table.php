<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tblqaidbody', function (Blueprint $table) {
            $table->bigIncrements('QaidBodyID');
            $table->string('QaidCode', 100);
            $table->integer('QaidBodyAccID');
            $table->double('QaidDebit');
            $table->double('QaidCredit');
            $table->string('idName', 30)->nullable();
            $table->string('NameDetails', 100)->nullable();
            $table->string('QaidBodyDetails', 500)->nullable();
            $table->string('copCode', 50)->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tblqaidbody');
    }
};
