<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('locations')) {
            Schema::create('locations', function (Blueprint $table) {
                $table->id();
                $table->foreignId('parent_id')->nullable()->constrained('locations')->onDelete('cascade');
                $table->json('name_json');
                $table->enum('location_type', ['country', 'state', 'city', 'district', 'area']);
                $table->string('code', 100)->unique();
                $table->boolean('status')->default(true);
                $table->integer('sort_order')->default(0);
                $table->json('metadata')->nullable();
                $table->unsignedBigInteger('company_id')->nullable()->index();
                $table->timestamps();
                $table->softDeletes();

                $table->index('parent_id');
                $table->index('location_type');
                $table->index('status');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('locations');
    }
};
