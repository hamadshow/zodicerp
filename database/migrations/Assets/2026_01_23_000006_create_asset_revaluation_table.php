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
        Schema::create('asset_revaluation', function (Blueprint $table) {
            $table->id();
            $table->foreignId('asset_id')->constrained('assets')->cascadeOnDelete();
            $table->date('revaluation_date');
            
            // Previous Values
            $table->decimal('previous_cost', 20, 4);
            $table->decimal('previous_accumulated_depreciation', 20, 4);
            $table->decimal('previous_net_book_value', 20, 4);
            
            // New Values
            $table->decimal('new_cost', 20, 4);
            $table->decimal('new_accumulated_depreciation', 20, 4);
            $table->decimal('new_net_book_value', 20, 4);
            
            // Differences
            $table->decimal('cost_increase', 20, 4)->nullable();
            $table->decimal('cost_decrease', 20, 4)->nullable();
            $table->decimal('revaluation_surplus', 20, 4)->nullable();
            $table->decimal('revaluation_deficit', 20, 4)->nullable();
            
            // Reasons and Notes
            $table->text('reason')->nullable();
            $table->text('notes')->nullable();
            
            // Accounting
            // User requested FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id)
            // We'll add the column and conditional constraint.
            $table->unsignedBigInteger('journal_entry_id')->nullable();
            $table->boolean('is_posted')->default(false);
            
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('approved_by')->nullable();
            
            $table->timestamps();
            
            // Foreign Keys
            if (Schema::hasTable('journal_entries')) {
                $table->foreign('journal_entry_id')->references('id')->on('journal_entries')->nullOnDelete();
            }
            
            if (Schema::hasTable('users')) {
                 $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();
                 $table->foreign('approved_by')->references('id')->on('users')->nullOnDelete();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('asset_revaluation');
    }
};
