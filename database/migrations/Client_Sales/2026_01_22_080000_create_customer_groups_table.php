<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customer_groups', function (Blueprint $table) {
            $table->charset = 'utf8mb4';
            $table->collation = 'utf8mb4_unicode_ci';
            $table->increments('id');
            $table->string('code', 20)->unique()->nullable(false);
            $table->string('name_ar', 100)->nullable(false);
            $table->string('name_en', 100)->nullable();
            $table->unsignedInteger('parent_id')->nullable();
            $table->unsignedInteger('account_id')->nullable();
            $table->unsignedInteger('price_list_id')->nullable();
            $table->decimal('credit_limit', 15, 2)->default(0);
            $table->integer('payment_terms')->default(30);
            $table->decimal('discount_percentage', 5, 2)->default(0);
            $table->boolean('is_active')->default(true);
            $table->text('notes')->nullable();
            $table->unsignedInteger('created_by')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->useCurrentOnUpdate()->useCurrent();
            $table->softDeletes();

            $table->foreign('parent_id')->references('id')->on('customer_groups')->nullOnDelete();
            // Referencing 'AccID' in 'accounts' table as verified in existing migration
            $table->foreign('account_id')->references('AccID')->on('accounts')->nullOnDelete();

            $table->index('code', 'idx_customer_groups_code');
            $table->index('name_ar', 'idx_customer_groups_name');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customer_groups');
    }
};
