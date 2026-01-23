<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('price_lists', function (Blueprint $table) {
            $table->charset = 'utf8mb4';
            $table->collation = 'utf8mb4_unicode_ci';
            
            $table->increments('id');
            $table->string('code', 20)->unique();
            $table->string('name_ar', 100);
            $table->string('name_en', 100)->nullable();
            
            $table->unsignedBigInteger('currency_id'); // Matches currencies.id (bigInt)
            
            $table->date('valid_from');
            $table->date('valid_to')->nullable();
            
            $table->boolean('is_default')->default(false);
            $table->enum('price_type', ['retail', 'wholesale', 'special', 'promotional', 'contract'])->default('retail');
            $table->enum('rounding_method', ['none', 'normal', 'up', 'down'])->default('none');
            $table->decimal('rounding_factor', 5, 2)->default(0.05);
            
            $table->boolean('is_active')->default(true);
            $table->text('notes')->nullable();
            
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();
            $table->softDeletes();
            
            // Foreign Keys
            $table->foreign('currency_id')->references('id')->on('currencies');

            // Indexes
            $table->index('code', 'idx_price_lists_code');
            $table->index(['valid_from', 'valid_to'], 'idx_price_lists_validity');
            $table->index('is_active', 'idx_price_lists_active');
        });
    }

    public function down(): void {
        Schema::dropIfExists('price_lists');
    }
};
