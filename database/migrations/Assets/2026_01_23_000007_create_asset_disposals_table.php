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
        Schema::create('asset_disposals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('asset_id')->constrained('assets')->cascadeOnDelete();
            $table->date('disposal_date');
            $table->enum('disposal_method', ['sale', 'scrap', 'donation', 'loss', 'theft', 'exchange']);
            
            // Accounting Values
            $table->decimal('net_book_value', 20, 4);
            $table->decimal('accumulated_depreciation', 20, 4);
            $table->decimal('original_cost', 20, 4);
            
            // Disposal Details
            $table->decimal('disposal_amount', 20, 4)->nullable();
            
            // Currency FK
            // Assuming currencies table exists as per previous context (referenced in assets table)
            $table->unsignedBigInteger('disposal_currency_id')->nullable();
            
            $table->decimal('gain_loss_amount', 20, 4)->nullable();
            
            // Buyer/Recipient Info
            $table->string('buyer_name', 200)->nullable();
            $table->string('buyer_contact', 500)->nullable();
            $table->string('invoice_number', 100)->nullable();
            
            // Accounting Link
            $table->unsignedBigInteger('journal_entry_id')->nullable();
            $table->boolean('is_posted')->default(false);
            
            $table->text('notes')->nullable();
            
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('approved_by')->nullable();
            
            $table->timestamps();
            
            // Foreign Keys
            if (Schema::hasTable('currencies')) {
                $table->foreign('disposal_currency_id')->references('id')->on('currencies')->nullOnDelete();
            }
            
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
        Schema::dropIfExists('asset_disposals');
    }
};
