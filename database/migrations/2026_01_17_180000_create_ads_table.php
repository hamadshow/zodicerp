<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('ads', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('name', 191);
            $table->dateTime('expired_at')->nullable();
            $table->string('location', 120)->nullable();
            $table->string('key', 120);
            $table->string('image', 191)->nullable();
            $table->string('url', 191)->nullable();
            $table->bigInteger('clicked')->default(0);
            $table->integer('order')->default(0);
            $table->string('status', 60)->default('published');
            $table->timestamps();
            $table->boolean('open_in_new_tab')->default(true);
            $table->string('tablet_image', 191)->nullable();
            $table->string('mobile_image', 191)->nullable();
            $table->string('ads_type', 191)->nullable();
            $table->string('google_adsense_slot_id', 191)->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ads');
    }
};

