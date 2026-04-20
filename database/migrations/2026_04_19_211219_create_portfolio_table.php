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
        Schema::create('portfolio', function (Blueprint $table) {
            $table->id();
            $table->foreignId('stock_id')->constrained('companies_shares')->onDelete('cascade');
            $table->decimal('quantity', 18, 4)->default(0);
            $table->decimal('avg_price', 18, 4)->default(0);
            $table->decimal('last_price', 18, 4)->default(0);
            $table->decimal('profit', 18, 4)->default(0);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('portfolio');
    }
};
