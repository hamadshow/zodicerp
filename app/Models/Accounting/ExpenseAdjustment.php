<?php

namespace App\Models\Accounting;

use App\Models\Account;
use App\Models\Company;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Config;

/**
 * Prepaid & accrued expense adjustments.
 *
 * Stores the parameters of an adjustment (period, accounts, total) and the
 * latest balance snapshot (report_date, recognized_amount,
 * remaining_balance). The actual adjusting journals are NOT duplicated
 * here — they are created in the existing journal_entries /
 * journal_entry_lines tables, and every generation event is linked back
 * from expense_adjustment_entries (see payroll_period_journal pattern).
 *
 * Recognition method: the row's recognition_method column, falling back to
 * config('accounting.expense_adjustments.recognition_method'). The schema
 * never applies a method by itself — call recognizedThrough() explicitly.
 */
class ExpenseAdjustment extends Model
{
    use HasFactory;
    use SoftDeletes;

    public const TYPE_PREPAYMENT = 'prepayment';
    public const TYPE_ACCRUAL = 'accrual';

    public const METHOD_MONTHLY = 'monthly';
    public const METHOD_DAILY_PRORATION = 'daily_proration';

    public const METHODS = [self::METHOD_MONTHLY, self::METHOD_DAILY_PRORATION];

    /** Status of the latest generation event (see expense_adjustment_entries). */
    public const STATUS_GENERATED = 'generated';
    public const STATUS_UPDATED = 'updated';
    public const STATUS_CANCELLED = 'cancelled';

    public const STATUSES = [
        self::STATUS_GENERATED,
        self::STATUS_UPDATED,
        self::STATUS_CANCELLED,
    ];

    protected $table = 'expense_adjustments';

    protected $fillable = [
        'company_id',
        'adjustment_type',
        'description',
        'period_start',
        'period_end',
        'recognition_method',
        'report_date',
        'total_amount',
        'recognized_amount',
        'remaining_balance',
        'expense_account_id',
        'prepaid_account_id',
        'accrued_account_id',
        'entry_status',
        'created_by',
    ];

    protected $casts = [
        'period_start' => 'date',
        'period_end' => 'date',
        'report_date' => 'date',
        'total_amount' => 'decimal:3',
        'recognized_amount' => 'decimal:3',
        'remaining_balance' => 'decimal:3',
        'deleted_at' => 'datetime',
    ];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function expenseAccount(): BelongsTo
    {
        return $this->belongsTo(Account::class, 'expense_account_id', 'AccID');
    }

    public function prepaidAccount(): BelongsTo
    {
        return $this->belongsTo(Account::class, 'prepaid_account_id', 'AccID');
    }

    public function accruedAccount(): BelongsTo
    {
        return $this->belongsTo(Account::class, 'accrued_account_id', 'AccID');
    }

    /** Generation audit trail / system-entry links, oldest report date first. */
    public function entries(): HasMany
    {
        return $this->hasMany(ExpenseAdjustmentEntry::class, 'expense_adjustment_id')
            ->orderBy('report_date');
    }

    public function latestEntry(): HasMany
    {
        return $this->entries()->latestOfMany('report_date');
    }

    /**
     * The recognition basis actually in effect: explicit per-row value, else
     * the configurable default. Never assumed inside the schema itself.
     */
    public function resolveRecognitionMethod(): string
    {
        return $this->recognition_method
            ?? Config::get('accounting.expense_adjustments.recognition_method', self::METHOD_MONTHLY);
    }

    /**
     * Expense recognized through $asOf and the balancing remaining balance
     * (recognized + remaining = total_amount, both at 2-decimal money
     * precision used across journal posting).
     *
     * - monthly: one calendar month is recognized in full once its month-end
     *   has passed on or before $asOf.
     * - daily_proration: inclusive day-count basis, clamped to the period.
     *
     * @return array{recognized: string, remaining: string} decimal strings
     */
    public function recognizedThrough(?Carbon $asOf = null): array
    {
        $asOf ??= Carbon::today();
        $total = $this->total_amount;

        if ($asOf->lt($this->period_start)) {
            return ['recognized' => '0.00', 'remaining' => $this->formatMoney($total)];
        }

        $recognized = match ($this->resolveRecognitionMethod()) {
            self::METHOD_MONTHLY => $this->recognizedMonthly($asOf),
            default => $this->recognizedDaily($asOf),
        };

        if (bccomp($recognized, (string) $total, 2) > 0) {
            $recognized = (string) $total;
        }

        $recognized = $this->formatMoney($recognized);

        // Scale 3 (the schema's money precision) so a 3rd-decimal total
        // reconciles exactly: recognized + remaining = total_amount.
        return [
            'recognized' => $recognized,
            'remaining' => $this->formatMoney(bcsub((string) $total, $recognized, 3)),
        ];
    }

    /**
     * Normalize to an exact money literal: at least 2 decimals, and never
     * rounded — a genuine 3rd decimal (schema allows decimal(15,3)) is kept
     * so the DB reconcile CHECK holds on every write.
     */
    private function formatMoney(float|int|string $amount): string
    {
        $value = rtrim(bcadd((string) $amount, '0', 3), '0');
        $fraction = strlen(substr(strrchr($value, '.') ?: '.', 1));

        return $value.str_repeat('0', max(0, 2 - $fraction));
    }

    private function recognizedMonthly(Carbon $asOf): string
    {
        $start = $this->period_start->copy()->startOfMonth();
        $end = $this->period_end->copy()->startOfMonth();
        $totalMonths = (int) $start->diffInMonths($end) + 1;

        // Count calendar months whose month-end already passed on/before $asOf.
        $elapsed = max(0, min($totalMonths, (int) $start->diffInMonths($asOf) + 1));
        if ($asOf->lt($start->copy()->endOfMonth())) {
            $elapsed = 0;
        }

        if ($elapsed === 0) {
            return '0.00';
        }
        if ($elapsed >= $totalMonths) {
            return (string) $this->total_amount;
        }

        return (string) round((float) bcmul((string) $this->total_amount, (string) ($elapsed / $totalMonths), 6), 2);
    }

    private function recognizedDaily(Carbon $asOf): string
    {
        $totalDays = (int) $this->period_start->diffInDays($this->period_end) + 1;
        // Carbon 3: $a->diffInDays($b) is signed B−A; the period start must be
        // the receiver so elapsed days through $asOf is positive.
        $elapsedDays = (int) min($totalDays, $this->period_start->diffInDays($asOf) + 1);

        if ($elapsedDays <= 0) {
            return '0.00';
        }
        if ($elapsedDays >= $totalDays) {
            return (string) $this->total_amount;
        }

        return (string) round((float) bcmul((string) $this->total_amount, (string) ($elapsedDays / $totalDays), 6), 2);
    }
}
