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
        Schema::create('market_price_sync_logs', function (Blueprint $table) {
            $table->id();
            $table->string('symbol', 50);
            $table->string('status', 20); // success, error, fallback
            $table->text('message')->nullable();
            $table->json('response_data')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('market_price_sync_logs');
    }
};
