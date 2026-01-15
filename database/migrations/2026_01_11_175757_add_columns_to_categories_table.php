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
        Schema::table('categories', function (Blueprint $table) {
            $table->text('description')->nullable()->after('name');
            $table->string('icon')->nullable()->after('description');
            $table->boolean('is_featured')->default(false)->after('icon');
            $table->boolean('is_default')->default(false)->after('is_featured');
            $table->unsignedBigInteger('author_id')->nullable()->after('is_default');
            $table->string('author_type')->nullable()->after('author_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('categories', function (Blueprint $table) {
            $table->dropColumn(['description', 'icon', 'is_featured', 'is_default', 'author_id', 'author_type']);
        });
    }
};
