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
        Schema::create('supplier_groups', function (Blueprint $table) {
            $table->id();
            $table->string('code', 20);
            $table->string('name_ar', 100);
            $table->string('name_en', 100)->nullable();
            $table->unsignedBigInteger('parent_id')->nullable();
            $table->unsignedInteger('account_id')->nullable();
            $table->integer('payment_terms')->default(30);
            $table->decimal('default_credit_limit', 15, 2)->default(0.00);
            $table->integer('default_tax_id')->nullable();
            $table->text('notes')->nullable();
            $table->boolean('is_active')->default(true);
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('supplier_groups');
    }
};
