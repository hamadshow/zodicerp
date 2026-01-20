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
        Schema::create('cheques', function (Blueprint $table) {
            $table->id();
            $table->string('cheque_no', 100)->unique();
            $table->string('bank_name', 150);
            $table->foreignId('account_id')->nullable()->index(); // Intentionally loosely coupled or linked to cash_accounts
            $table->string('owner_name', 150)->nullable();
            $table->enum('cheque_type', ['received', 'issued']);
            $table->decimal('amount', 18, 2);
            $table->date('issue_date');
            $table->date('due_date');
            $table->enum('status', ['pending', 'cleared', 'returned', 'cancelled', 'deposited'])->default('pending');
            $table->string('reference_no', 100)->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->softDeletes();
            $table->timestamps();

            $table->charset = 'utf8mb4';
            $table->collation = 'utf8mb4_unicode_ci';
        });

        Schema::create('cheque_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cheque_id')->constrained('cheques')->cascadeOnDelete();
            $table->enum('action', ['issue', 'receive', 'deposit', 'clear', 'return', 'cancel']);
            $table->date('action_date');
            $table->foreignId('account_id')->nullable()->index();
            $table->decimal('amount', 18, 2);
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('created_at')->nullable();

            $table->charset = 'utf8mb4';
            $table->collation = 'utf8mb4_unicode_ci';
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cheque_transactions');
        Schema::dropIfExists('cheques');
    }
};
