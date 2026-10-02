<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Phase 17 — journal_reversals link table.
 *
 * 'Which journal entry is the LIVE one for a document reference' was
 * answered by probing for a '<entry_code>-REV' sibling (code-suffix
 * convention). This table makes the original → reversal relationship a
 * real edge: the live entry is a join, not a convention. Legacy -REV
 * entries (created before this table existed) are backfilled here on
 * first read, so suffix probing can be retired everywhere.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('journal_reversals', function (Blueprint $table) {
            $table->id();
            $table->string('original_entry_code', 50);
            $table->string('reversal_entry_code', 50);
            $table->unsignedBigInteger('company_id')->nullable()->index();
            $table->timestamps();

            $table->unique('reversal_entry_code');
            $table->index('original_entry_code');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('journal_reversals');
    }
};
