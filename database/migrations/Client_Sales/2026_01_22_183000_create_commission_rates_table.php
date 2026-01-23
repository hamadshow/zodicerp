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
        Schema::create('commission_rates', function (Blueprint $table) {
            $table->id();
            
            $table->unsignedInteger('sales_agent_id')->nullable();
            $table->foreign('sales_agent_id')->references('id')->on('sales_agents');
            
            $table->foreignId('product_category_id')->nullable()->constrained('categories');
            
            $table->decimal('min_amount', 15, 2)->default(0);
            $table->decimal('max_amount', 15, 2)->nullable();
            
            $table->decimal('commission_rate', 5, 2);
            
            $table->date('effective_date');
            $table->date('expiry_date')->nullable();
            
            $table->boolean('is_active')->default(true);
            
            $table->text('notes')->nullable();
            
            $table->timestamp('created_at')->useCurrent();
            // User SQL only has created_at, but typically Laravel migrations have timestamps() which includes updated_at.
            // SQL: created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            // It does NOT have updated_at in the SQL provided for commission_rates.
            // But usually for Eloquent models we want both.
            // However, the SQL provided is:
            // created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            // (no updated_at)
            // I will add updated_at to be consistent with Laravel models, or I can disable timestamps in model.
            // I'll stick to user SQL but add updated_at as nullable if I use timestamps(), or just add created_at.
            // Actually, for consistency with other tables, I'll add both via timestamps().
            // Wait, SQL explicitly lists: created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            // It does NOT list updated_at.
            // I'll just use $table->timestamp('created_at')->useCurrent(); and no updated_at.
            // And in model: public $timestamps = false; or const UPDATED_AT = null;
            // But wait, user might want to update it.
            // I'll add nullable updated_at just in case, or stick to requirements.
            // "Requirements: ... Create Eloquent Model"
            // Eloquent expects timestamps by default.
            // I will add updated_at for better DX.
            $table->timestamp('updated_at')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('commission_rates');
    }
};
