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
        Schema::create('asset_categories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('parent_id')->nullable()->constrained('asset_categories')->nullOnDelete();
            
            $table->string('code', 50)->unique();
            $table->string('name_ar', 100);
            $table->string('name_en', 100)->nullable();
            $table->text('description')->nullable();
            
            $table->enum('depreciation_method', ['straight_line', 'declining_balance', 'units_of_production'])->default('straight_line');
            $table->decimal('useful_life_years', 10, 2);
            $table->decimal('salvage_value_rate', 5, 2)->default(0);
            
            // Account Foreign Keys
            // Other migrations (sales_taxes, purchase_taxes) use integer (signed) to reference AccID.
            // We will follow that pattern to ensure compatibility.
            
            $table->integer('account_purchase_id')->nullable();
            $table->integer('account_depreciation_id')->nullable();
            $table->integer('account_accumulated_depreciation_id')->nullable();
            $table->integer('account_disposal_gain_id')->nullable();
            $table->integer('account_disposal_loss_id')->nullable();
            
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
            
            $table->charset = 'utf8mb4';
            $table->collation = 'utf8mb4_unicode_ci';
            
            // Indexes
            $table->index('is_active');
            $table->index('account_purchase_id');
            $table->index('account_depreciation_id');
            $table->index('account_accumulated_depreciation_id');
            $table->index('account_disposal_gain_id');
            $table->index('account_disposal_loss_id');
            
            // Foreign Key Constraints
            // We attempt to link to 'accounts' table if it exists.
            if (Schema::hasTable('accounts')) {
                $table->foreign('account_purchase_id')->references('AccID')->on('accounts')->nullOnDelete();
                $table->foreign('account_depreciation_id')->references('AccID')->on('accounts')->nullOnDelete();
                $table->foreign('account_accumulated_depreciation_id')->references('AccID')->on('accounts')->nullOnDelete();
                $table->foreign('account_disposal_gain_id')->references('AccID')->on('accounts')->nullOnDelete();
                $table->foreign('account_disposal_loss_id')->references('AccID')->on('accounts')->nullOnDelete();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('asset_categories');
    }
};
