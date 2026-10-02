<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * GL Audit Phase 2 — the real posting timestamp.
 *
 * journal_entries.date is the ACCOUNTING date, created_at/updated_at are
 * record-keeping timestamps; none of them is the actual posting time. This
 * migration adds the missing concept:
 *
 *   posted_at = the timestamp of the most recent transition to Posted.
 *
 * Deliberately NOT backfilled: created_at/updated_at cannot reconstruct
 * when a historical journal was actually posted (creation time is not
 * posting time), so fabricating values from them would corrupt the audit
 * trail. Historical rows keep posted_at = NULL until they are really
 * posted again by the application. The column is presented by the General
 * Ledger as "Posted At" with an em-dash for NULL rows.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('journal_entries', function (Blueprint $table) {
            $table->timestamp('posted_at')->nullable()->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('journal_entries', function (Blueprint $table) {
            $table->dropColumn('posted_at');
        });
    }
};
