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
        Schema::table('product_variation_items', function (Blueprint $table) {
            // Drop the incorrect foreign key
            $table->dropForeign(['attribute_id']);
            
            // Add the correct foreign key referencing item_attributes
            $table->foreign('attribute_id')
                ->references('id')
                ->on('item_attributes')
                ->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('product_variation_items', function (Blueprint $table) {
            $table->dropForeign(['attribute_id']);
            
            // Revert to the incorrect foreign key (if needed for exact rollback)
            // Note: 'attributes' table might not exist, so this might fail if rolled back.
            // For safety, we just leave it dropped or try to restore if we knew the original state was valid.
            // Since the original state was invalid (referencing non-existent table or wrong table), 
            // we probably don't want to restore it exactly. 
            // But to be consistent with migration patterns:
            
             $table->foreign('attribute_id')
                ->references('id')
                ->on('attributes')
                ->onDelete('cascade');
        });
    }
};
