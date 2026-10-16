<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Prepaid & accrued expense adjustments (report-driven adjusting entries).
 *
 * Mirrors the existing accounting architecture instead of duplicating it:
 *
 * - Accounts stay in `accounts` (PK `AccID`) — we reference AccIDs, never
 *   invent or copy account rows. `expense_account_id`, `prepaid_account_id`
 *   and `accrued_account_id` are nullable unsigned integers with
 *   `nullOnDelete`, matching `journal_entry_lines.account_id`.
 * - Generated journals are NOT stored here — they live in the existing
 *   `journal_entries` / `journal_entry_lines` tables. `expense_adjustment_entries`
 *   is a link table (pattern of `payroll_period_journal`: one row per
 *   generation event) that ties each generated entry to its source
 *   adjustment AND its report date.
 *   - UNIQUE (expense_adjustment_id, report_date) makes regeneration for the
 *     same report date idempotent: the generator looks up the link row and
 *     updates the existing entry instead of creating a duplicate.
 *   - The link row only ever points at entries the system created, so
 *     manual `journal_entries` rows are never touched or overwritten.
 *   - The link table doubles as the generation audit trail: every
 *     generated / updated / cancelled generation leaves its own historical
 *     row (snapshot amounts at generation time, generated_by / updated_by).
 * - Money uses decimal(15,3), the precision of `journal_entries.total_amount`
 *   so recognized/remaining amounts reconcile exactly against journals.
 * - Recognition method is config-not-baked: the column is nullable with NO
 *   default so the application must resolve an explicit method
 *   (accounting.expense_adjustments.recognition_method) — the schema never
 *   silently assumes monthly or daily proration.
 * - CHECK constraints (MySQL 8.0.16+ enforces them): period ordering,
 *   positive/valid amounts, reconciliation (recognized + remaining = total),
 *   and type-specific account requirements (rows are level-constrained, not
 *   invented GL types — chart-of-accounts typing is app-level, via AccType).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('expense_adjustments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->nullable()->constrained('company')->nullOnDelete();
            $table->enum('adjustment_type', ['prepayment', 'accrual']);
            $table->string('description', 400);
            $table->date('period_start');
            $table->date('period_end');

            // Configurable recognition basis; resolved by the application
            // (`accounting.expense_adjustments.recognition_method`). Nullable
            // with no DB default on purpose: the schema must not pick a
            // proration method by itself.
            $table->enum('recognition_method', ['monthly', 'daily_proration'])->nullable();

            // Report/adjustment date the latest snapshot was taken through.
            $table->date('report_date')->nullable();

            $table->decimal('total_amount', 15, 3)->default(0);
            $table->decimal('recognized_amount', 15, 3)->default(0);
            $table->decimal('remaining_balance', 15, 3)->default(0);

            // FKs onto the real chart of accounts (accounts.AccID).
            $table->unsignedInteger('expense_account_id')->nullable();
            $table->unsignedInteger('prepaid_account_id')->nullable();
            $table->unsignedInteger('accrued_account_id')->nullable();

            $table->enum('entry_status', ['generated', 'updated', 'cancelled'])->default('generated');
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['company_id', 'adjustment_type', 'entry_status'], 'idx_exp_adj_company_type_status');
            $table->index(['period_start', 'period_end'], 'idx_exp_adj_period');
            $table->index('report_date', 'idx_exp_adj_report_date');

            $table->foreign('expense_account_id')->references('AccID')->on('accounts')->nullOnDelete();
            $table->foreign('prepaid_account_id')->references('AccID')->on('accounts')->nullOnDelete();
            $table->foreign('accrued_account_id')->references('AccID')->on('accounts')->nullOnDelete();

            // Link-table audit trail rows dangle back to the adjustment; keep
            // them referentially clean on soft-delete flows too (hard deletes
            // via down() remove children first).
        });

        Schema::create('expense_adjustment_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('expense_adjustment_id')->constrained('expense_adjustments')->onDelete('cascade');
            $table->date('report_date');

            // The journal generated by the system for this adjustment+date.
            // Only system-generated entries are referenced — the generator
            // resolves this id when updating on regeneration, so manual
            // journal entries can never be a regeneration target.
            $table->unsignedBigInteger('journal_entry_id')->nullable();

            // Amount snapshot at generation time.
            $table->decimal('recognized_through', 15, 3)->default(0);
            $table->decimal('remaining_after', 15, 3)->default(0);

            $table->unsignedBigInteger('generated_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamps();

            // One system entry per (adjustment, report date) — idempotent
            // regeneration for the same report date.
            $table->unique(['expense_adjustment_id', 'report_date'], 'uq_expense_adjustment_entries');
            $table->index('journal_entry_id', 'idx_exp_adj_entry_journal_entry');

            $table->foreign('journal_entry_id')->references('id')->on('journal_entries')->nullOnDelete();
        });

        $checks = [
            'chk_expense_adjustments_period'     => 'period_end >= period_start',
            'chk_expense_adjustments_total'      => 'total_amount > 0',
            'chk_expense_adjustments_amounts'    => 'recognized_amount >= 0 AND recognized_amount <= total_amount AND remaining_balance >= 0',
            'chk_expense_adjustments_reconcile'  => 'recognized_amount + remaining_balance = total_amount',
            // Type-specific accounts: prepayment must carry its prepaid
            // (asset) account and not an accrued one; accrual the reverse.
            'chk_expense_adjustments_accounts'   => "(adjustment_type <> 'prepayment' OR prepaid_account_id IS NOT NULL)".
                " AND (adjustment_type <> 'prepayment' OR accrued_account_id IS NULL)".
                " AND (adjustment_type <> 'accrual' OR accrued_account_id IS NOT NULL)".
                " AND (adjustment_type <> 'accrual' OR prepaid_account_id IS NULL)",
            'chk_expense_adjustments_history'    => 'report_date IS NULL OR report_date >= period_start',
        ];

        foreach ($checks as $name => $expression) {
            DB::statement("ALTER TABLE `expense_adjustments` ADD CONSTRAINT `{$name}` CHECK ({$expression})");
        }
    }

    public function down(): void
    {
        foreach ([
            'chk_expense_adjustments_period',
            'chk_expense_adjustments_total',
            'chk_expense_adjustments_amounts',
            'chk_expense_adjustments_reconcile',
            'chk_expense_adjustments_accounts',
            'chk_expense_adjustments_history',
        ] as $name) {
            DB::statement("ALTER TABLE `expense_adjustments` DROP CONSTRAINT `{$name}`");
        }

        Schema::dropIfExists('expense_adjustment_entries');
        Schema::dropIfExists('expense_adjustments');
    }
};
