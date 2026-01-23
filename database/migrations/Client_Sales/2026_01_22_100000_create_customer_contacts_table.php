<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('customer_contacts', function (Blueprint $table) {
            $table->charset = 'utf8mb4';
            $table->collation = 'utf8mb4_unicode_ci';
            $table->increments('id');
            $table->unsignedInteger('customer_id'); // Match customers.id (increments/unsignedInteger)
            
            $table->string('name_ar', 255);
            $table->string('name_en', 255)->nullable();
            
            $table->string('position_ar', 100)->nullable();
            $table->string('position_en', 100)->nullable();
            $table->string('department', 100)->nullable();
            
            $table->string('phone', 20)->nullable();
            $table->string('mobile', 20)->nullable();
            $table->string('email', 100)->nullable();
            $table->string('whatsapp', 20)->nullable();
            
            $table->boolean('is_primary')->default(false);
            $table->boolean('is_decision_maker')->default(false);
            $table->boolean('receive_statements')->default(false);
            $table->boolean('receive_marketing')->default(false);
            
            $table->text('notes')->nullable();
            
            $table->date('birthday')->nullable();
            $table->date('anniversary')->nullable();
            
            $table->timestamps();
            $table->softDeletes();

            // Foreign Keys
            $table->foreign('customer_id')->references('id')->on('customers')->onDelete('cascade');

            // Indexes
            $table->index('customer_id', 'idx_customer_contacts_customer');
            $table->index('is_primary', 'idx_customer_contacts_primary');
        });
    }

    public function down(): void {
        Schema::dropIfExists('customer_contacts');
    }
};
