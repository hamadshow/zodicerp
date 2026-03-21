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
        Schema::create('supplier_contacts', function (Blueprint $table) {
            $table->charset = 'utf8mb4';
            $table->collation = 'utf8mb4_unicode_ci';

            $table->id();

            $table->foreignId('supplier_id')->constrained('suppliers')->onDelete('cascade');

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
            $table->boolean('receive_statements')->default(false);
            $table->boolean('receive_notifications')->default(false);

            $table->text('notes')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->index('supplier_id', 'idx_supplier_contacts_supplier');
            $table->index('is_primary', 'idx_supplier_contacts_primary');
        });

        if (DB::getDriverName() !== 'sqlite') {
            DB::statement("ALTER TABLE supplier_contacts COMMENT = 'جهات الاتصال الخاصة بالموردين'");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('supplier_contacts');
    }
};
