<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tblqaid', function (Blueprint $table) {
            $table->bigIncrements('QaidID');
            $table->string('QaidCode', 50)->nullable();
            $table->string('QaidType', 50)->nullable();
            $table->string('QaidRef', 500)->nullable();
            $table->date('QaidDate')->nullable();
            $table->string('QaidDetails', 500)->nullable();
            $table->double('QaidTotal', 10, 0);
            $table->string('QaidStatus', 50)->default('UnPost');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tblqaid');
    }
};
