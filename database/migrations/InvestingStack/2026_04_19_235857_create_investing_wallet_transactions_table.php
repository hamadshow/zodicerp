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
        Schema::create('investing_wallet_transactions', function (Blueprint $table) {
            $table->id();
            $table->enum('transaction_type', ['DEPOSIT', 'WITHDRAW']);
            $table->decimal('amount', 12, 2);
            $table->foreignId('currency_id')->nullable()->constrained('currencies');
            $table->decimal('exchange_rate', 10, 4)->default(1);
            $table->string('reference_id', 100)->nullable();
            $table->text('description')->nullable();
            $table->enum('status', ['PENDING', 'COMPLETED', 'CANCELLED'])->default('COMPLETED');
            $table->dateTime('transaction_date')->useCurrent();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('investing_wallet_transactions');
    }
};
