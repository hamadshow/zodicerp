<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Rename tables
        if (Schema::hasTable('tblqaid')) {
            Schema::rename('tblqaid', 'journal_entries');
        }
        if (Schema::hasTable('tblqaidbody')) {
            Schema::rename('tblqaidbody', 'journal_entry_lines');
        }

        // Rename columns in journal_entries
        if (Schema::hasTable('journal_entries')) {
            Schema::table('journal_entries', function (Blueprint $table) {
                // Rename columns if they exist with old names
                if (Schema::hasColumn('journal_entries', 'QaidID')) {
                    $table->renameColumn('QaidID', 'id');
                }
                if (Schema::hasColumn('journal_entries', 'QaidCode')) {
                    $table->renameColumn('QaidCode', 'entry_code');
                }
                if (Schema::hasColumn('journal_entries', 'QaidType')) {
                    $table->renameColumn('QaidType', 'entry_type');
                }
                if (Schema::hasColumn('journal_entries', 'QaidRef')) {
                    $table->renameColumn('QaidRef', 'reference');
                }
                if (Schema::hasColumn('journal_entries', 'QaidDate')) {
                    $table->renameColumn('QaidDate', 'date');
                }
                if (Schema::hasColumn('journal_entries', 'QaidDetails')) {
                    $table->renameColumn('QaidDetails', 'description');
                }
                if (Schema::hasColumn('journal_entries', 'QaidTotal')) {
                    $table->renameColumn('QaidTotal', 'total_amount');
                }
                if (Schema::hasColumn('journal_entries', 'QaidStatus')) {
                    $table->renameColumn('QaidStatus', 'status');
                }

                // Add timestamps if not exists (Models expect them)
                if (! Schema::hasColumn('journal_entries', 'created_at')) {
                    $table->timestamps();
                }
            });
        }

        // Rename columns in journal_entry_lines
        if (Schema::hasTable('journal_entry_lines')) {
            Schema::table('journal_entry_lines', function (Blueprint $table) {
                if (Schema::hasColumn('journal_entry_lines', 'QaidBodyID')) {
                    $table->renameColumn('QaidBodyID', 'id');
                }
                if (Schema::hasColumn('journal_entry_lines', 'QaidCode')) {
                    $table->renameColumn('QaidCode', 'journal_entry_code');
                }
                if (Schema::hasColumn('journal_entry_lines', 'QaidBodyAccID')) {
                    $table->renameColumn('QaidBodyAccID', 'account_id');
                }
                if (Schema::hasColumn('journal_entry_lines', 'QaidDebit')) {
                    $table->renameColumn('QaidDebit', 'debit');
                }
                if (Schema::hasColumn('journal_entry_lines', 'QaidCredit')) {
                    $table->renameColumn('QaidCredit', 'credit');
                }
                if (Schema::hasColumn('journal_entry_lines', 'idName')) {
                    $table->renameColumn('idName', 'related_id_name');
                }
                if (Schema::hasColumn('journal_entry_lines', 'NameDetails')) {
                    $table->renameColumn('NameDetails', 'related_name_details');
                }
                if (Schema::hasColumn('journal_entry_lines', 'QaidBodyDetails')) {
                    $table->renameColumn('QaidBodyDetails', 'description');
                }
                if (Schema::hasColumn('journal_entry_lines', 'copCode')) {
                    $table->renameColumn('copCode', 'cost_center_code');
                }

                // Add timestamps if not exists
                if (! Schema::hasColumn('journal_entry_lines', 'created_at')) {
                    $table->timestamps();
                }
            });
        }
    }

    public function down(): void
    {
        // Rename columns back in journal_entry_lines
        if (Schema::hasTable('journal_entry_lines')) {
            Schema::table('journal_entry_lines', function (Blueprint $table) {
                if (Schema::hasColumn('journal_entry_lines', 'id')) {
                    $table->renameColumn('id', 'QaidBodyID');
                }
                if (Schema::hasColumn('journal_entry_lines', 'journal_entry_code')) {
                    $table->renameColumn('journal_entry_code', 'QaidCode');
                }
                if (Schema::hasColumn('journal_entry_lines', 'account_id')) {
                    $table->renameColumn('account_id', 'QaidBodyAccID');
                }
                if (Schema::hasColumn('journal_entry_lines', 'debit')) {
                    $table->renameColumn('debit', 'QaidDebit');
                }
                if (Schema::hasColumn('journal_entry_lines', 'credit')) {
                    $table->renameColumn('credit', 'QaidCredit');
                }
                if (Schema::hasColumn('journal_entry_lines', 'related_id_name')) {
                    $table->renameColumn('related_id_name', 'idName');
                }
                if (Schema::hasColumn('journal_entry_lines', 'related_name_details')) {
                    $table->renameColumn('related_name_details', 'NameDetails');
                }
                if (Schema::hasColumn('journal_entry_lines', 'description')) {
                    $table->renameColumn('description', 'QaidBodyDetails');
                }
                if (Schema::hasColumn('journal_entry_lines', 'cost_center_code')) {
                    $table->renameColumn('cost_center_code', 'copCode');
                }

                $table->dropTimestamps();
            });
        }

        // Rename columns back in journal_entries
        if (Schema::hasTable('journal_entries')) {
            Schema::table('journal_entries', function (Blueprint $table) {
                if (Schema::hasColumn('journal_entries', 'id')) {
                    $table->renameColumn('id', 'QaidID');
                }
                if (Schema::hasColumn('journal_entries', 'entry_code')) {
                    $table->renameColumn('entry_code', 'QaidCode');
                }
                if (Schema::hasColumn('journal_entries', 'entry_type')) {
                    $table->renameColumn('entry_type', 'QaidType');
                }
                if (Schema::hasColumn('journal_entries', 'reference')) {
                    $table->renameColumn('reference', 'QaidRef');
                }
                if (Schema::hasColumn('journal_entries', 'date')) {
                    $table->renameColumn('date', 'QaidDate');
                }
                if (Schema::hasColumn('journal_entries', 'description')) {
                    $table->renameColumn('description', 'QaidDetails');
                }
                if (Schema::hasColumn('journal_entries', 'total_amount')) {
                    $table->renameColumn('total_amount', 'QaidTotal');
                }
                if (Schema::hasColumn('journal_entries', 'status')) {
                    $table->renameColumn('status', 'QaidStatus');
                }

                $table->dropTimestamps();
            });
        }

        // Rename tables back
        if (Schema::hasTable('journal_entries')) {
            Schema::rename('journal_entries', 'tblqaid');
        }
        if (Schema::hasTable('journal_entry_lines')) {
            Schema::rename('journal_entry_lines', 'tblqaidbody');
        }
    }
};
