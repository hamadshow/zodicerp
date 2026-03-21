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
        Schema::create('supplier_addresses', function (Blueprint $table) {
            $table->charset = 'utf8mb4';
            $table->collation = 'utf8mb4_unicode_ci';

            $table->id();

            $table->foreignId('supplier_id')->constrained('suppliers')->onDelete('cascade');

            $table->enum('address_type', ['main', 'billing', 'shipping', 'returns'])->default('main');
            $table->string('address_name', 100)->nullable();

            $table->foreignId('country_id')->nullable()->constrained('countries');
            $table->foreignId('city_id')->nullable()->constrained('cities');

            $table->string('district', 100)->nullable();
            $table->string('street', 255)->nullable();
            $table->string('building_number', 50)->nullable();
            $table->string('postal_code', 20)->nullable();
            $table->string('po_box', 50)->nullable();

            $table->string('phone', 20)->nullable();
            $table->string('mobile', 20)->nullable();
            $table->string('email', 100)->nullable();

            $table->boolean('is_default')->default(false);

            $table->decimal('latitude', 10, 8)->nullable();
            $table->decimal('longitude', 11, 8)->nullable();

            $table->text('notes')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->index('supplier_id', 'idx_supplier_addresses_supplier');
            $table->index('address_type', 'idx_supplier_addresses_type');
        });

        try {
            DB::statement("ALTER TABLE supplier_addresses COMMENT = 'عناوين الموردين المتعددة'");
        } catch (\Exception $e) {
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('supplier_addresses');
    }
};
