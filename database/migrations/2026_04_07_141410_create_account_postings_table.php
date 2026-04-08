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
        Schema::create('account_postings', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('account_id');
            $table->unsignedBigInteger('company_id');
            $table->date('period_start');
            $table->date('period_end');
            $table->decimal('opening_debit', 18, 2)->default(0);
            $table->decimal('opening_credit', 18, 2)->default(0);
            $table->decimal('current_debit', 18, 2)->default(0);
            $table->decimal('current_credit', 18, 2)->default(0);
            
            // Generated Columns (STORED)
            $table->decimal('ending_debit', 18, 2)
                ->storedAs('opening_debit + current_debit - opening_credit - current_credit');
            
            $table->decimal('ending_credit', 18, 2)
                ->storedAs('opening_credit + current_credit - opening_debit - current_debit');
            
            $table->timestamps();
            
            // Adding indexes for performance
            $table->index(['account_id', 'company_id']);
            $table->index(['period_start', 'period_end']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('account_postings');
    }
};
