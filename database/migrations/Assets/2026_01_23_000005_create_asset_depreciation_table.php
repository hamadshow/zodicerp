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
        Schema::create('asset_depreciation', function (Blueprint $table) {
            $table->id();
            $table->foreignId('asset_id')->constrained('assets')->cascadeOnDelete();
            
            $table->integer('fiscal_year');
            $table->integer('period_month');
            $table->integer('period_year');
            $table->date('depreciation_date');
            
            $table->decimal('depreciation_amount', 20, 4);
            $table->decimal('accumulated_depreciation', 20, 4);
            $table->decimal('net_book_value_before', 20, 4);
            $table->decimal('net_book_value_after', 20, 4);
            
            // Journal Entry Link
            // User SQL references 'journal_entries(id)'. 
            // We'll add the column. If table exists, we add constraint.
            $table->unsignedBigInteger('journal_entry_id')->nullable();
            
            $table->boolean('is_posted')->default(false);
            $table->date('posted_date')->nullable();
            $table->text('notes')->nullable();
            
            $table->unsignedBigInteger('created_by')->nullable();
            
            $table->timestamps();
            
            // Unique constraint for period per asset
            $table->unique(['asset_id', 'period_month', 'period_year'], 'unique_asset_period_depreciation');
            
            // Indexes
            $table->index('fiscal_year');
            $table->index('period_year');
            $table->index('period_month');
            
            // Foreign Keys
            if (Schema::hasTable('journal_entries')) {
                $table->foreign('journal_entry_id')->references('id')->on('journal_entries')->nullOnDelete();
            }
            
            // Link created_by to users if exists
            if (Schema::hasTable('users')) {
                 $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('asset_depreciation');
    }
};
