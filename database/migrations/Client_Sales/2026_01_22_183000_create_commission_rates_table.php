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
