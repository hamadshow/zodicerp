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
        Schema::create('journal_entry_lines', function (Blueprint $table) {
            $table->id();
            $table->string('journal_entry_code', 50)->index();
            $table->unsignedInteger('account_id')->nullable();
            $table->decimal('debit', 15, 3)->default(0);
            $table->decimal('credit', 15, 3)->default(0);
            $table->string('related_id_name', 50)->nullable();
            $table->string('related_name_details', 255)->nullable();
            $table->string('description', 400)->nullable();
            $table->string('cost_center_code', 50)->nullable();
            $table->timestamps();

            $table->foreign('journal_entry_code')->references('entry_code')->on('journal_entries')->onDelete('cascade');
            if (Schema::hasTable('accounts')) {
                $table->foreign('account_id')->references('AccID')->on('accounts')->onDelete('set null');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('journal_entry_lines');
    }
};
