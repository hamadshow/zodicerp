<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customer_addresses', function (Blueprint $table) {
            $table->charset = 'utf8mb4';
            $table->collation = 'utf8mb4_unicode_ci';
            $table->increments('id');
            $table->unsignedInteger('customer_id'); // Match customers.id (increments/unsignedInteger)
            $table->enum('address_type', ['home', 'billing', 'shipping', 'work', 'other'])->default('home');
            $table->string('address_name', 100)->nullable();

            $table->unsignedBigInteger('location_id')->nullable();

            $table->string('district', 100)->nullable();
            $table->string('street', 255)->nullable();
            $table->string('building_number', 50)->nullable();
            $table->string('postal_code', 20)->nullable();
            $table->string('po_box', 50)->nullable();

            $table->string('phone', 20)->nullable();
            $table->string('mobile', 20)->nullable();
            $table->string('email', 100)->nullable();

            $table->boolean('is_default')->default(false);
            $table->boolean('is_default_billing')->default(false);
            $table->boolean('is_default_shipping')->default(false);

            $table->decimal('latitude', 10, 8)->nullable();
            $table->decimal('longitude', 11, 8)->nullable();

            $table->text('notes')->nullable();

            $table->timestamps();
            $table->softDeletes();

            // Foreign Keys
            $table->foreign('customer_id')->references('id')->on('customers')->onDelete('cascade');
            $table->foreign('location_id')->references('id')->on('locations')->nullOnDelete();

            // Indexes
            $table->index('customer_id', 'idx_customer_addresses_customer');
            $table->index('address_type', 'idx_customer_addresses_type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customer_addresses');
    }
};
