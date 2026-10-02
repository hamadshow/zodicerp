<?php

namespace App\Services\Assets;

use App\Models\Account;
use App\Models\Accounting\JournalEntry;
use App\Models\Accounting\JournalEntryLine;
use App\Models\Assets\Asset;
use App\Services\Accounting\JournalReversalService;
use App\Services\Accounting\PostingService;
use App\Traits\EnsuresFiscalPeriod;
use Illuminate\Support\Facades\DB;
use Throwable;

/**
 * Asset lifecycle service — unified depreciation engine, disposal, movement.
 *
 * Depreciation source of truth:
 *   All schedule / preview / posting / bulk / report paths share
 *   calculateDepreciation(), buildMonthlySchedule() and buildYearlySchedule().
 *   Field mapping uses the REAL assets columns: salvage_value,
 *   useful_life_years, depreciation_start_date, purchase_date.
 *
 * Table schema references (from existing migrations):
 *   asset_depreciation (singular): fiscal_year, period_month, period_year,
 *       depreciation_date, depreciation_amount, accumulated_depreciation,
 *       net_book_value_before, net_book_value_after, journal_entry_id, is_posted, posted_date
 *   asset_disposals: disposal_method, original_cost, accumulated_depreciation,
 *       net_book_value, disposal_amount, gain_loss_amount, is_posted
 *   asset_movements: movement_type, from/to warehouse/department/employee
 */
class AssetLifecycleService
{
    use EnsuresFiscalPeriod;

    /**
     * Company id for the authenticated user (consistent with sibling services).
     */
    private function companyId(): int
    {
        return (int) (auth()->user()->company_id ?? 1);
    }

    // =========================================================================
    // Asset validation
    // =========================================================================

    /**
     * Load an asset scoped to the current company, enforcing depreciation
     * eligibility. Returns a stdClass asset row (joined with its category).
     *
     * @throws \Exception with a user-presentable message on any failure.
     */
    public function getDepreciableAsset(int $assetId): object
    {
        $asset = DB::table('assets')
            ->leftJoin('asset_categories', 'asset_categories.id', '=', 'assets.category_id')
            ->where('assets.id', $assetId)
            ->where('assets.company_id', $this->companyId())
            ->select(
                'assets.*',
                'asset_categories.account_depreciation_id',
                'asset_categories.account_accumulated_depreciation_id'
            )
            ->first();

        if (!$asset) {
            throw new \Exception('Asset not found for your company.');
        }

        $this->assertDepreciable($asset);

        return $asset;
    }

    /**
     * Business guards: an asset must be depreciable and not retired from use.
     * Uses the existing project status semantics (status ENUM) only.
     */
    private function assertDepreciable(object $asset): void
    {
        if (isset($asset->is_depreciable) && !$asset->is_depreciable) {
            throw new \Exception("Asset '{$asset->name_en}' is not depreciable.");
        }

        if (in_array($asset->status ?? '', ['disposed', 'sold'])) {
            throw new \Exception("Asset '{$asset->name_en}' has been {$asset->status} and can no longer be depreciated.");
        }
    }

    // =========================================================================
    // UNIFIED DEPRECIATION ENGINE — single source of truth
    // =========================================================================

    /**
     * Core calculation for one asset as of a date. NO database writes.
     *
     * Straight-line only: the assets/asset_categories schema supports other
     * method enum values, but no authoritative business rules for them exist
     * in the project, so unsupported methods are rejected explicitly instead
     * of being silently computed as straight-line.
     *
     * The engine distinguishes:
     *   total_depreciation_to_date   — calculated requirement to asOfDate
     *   accumulated_depreciation_posted — sum of posted asset_depreciation rows
     *   remaining_to_post            — the difference (never negative)
     */
    public function calculateDepreciation(array $data): array
    {
        $asset = $this->getDepreciableAsset((int) $data['asset_id']);

        return $this->runCalculation($asset, $data['as_of_date'] ?? now()->toDateString());
    }

    /**
     * Internal calculation against an already-validated asset row.
     */
    private function runCalculation(object $asset, string $asOfDate): array
    {
        $cost = $this->assetCostBasis($asset);
        $salvage = max(0.0, (float) ($asset->salvage_value ?? 0));
        $usefulLife = (int) ceil(max(1.0, (float) ($asset->useful_life_years ?? 1)));

        if ($salvage >= $cost) {
            throw new \Exception('Salvage value must be less than the asset cost.');
        }

        $method = $asset->depreciation_method ?? 'straight_line';
        if ($method !== 'straight_line') {
            throw new \Exception("Depreciation method '{$method}' is not supported yet. Only straight_line is implemented.");
        }

        $startDate = $this->depreciationStartDate($asset);
        if (!$startDate) {
            throw new \Exception('Asset has no depreciation start date.');
        }

        $start = new \DateTimeImmutable($startDate);
        $asOf = new \DateTimeImmutable($asOfDate);

        $depreciableAmount = round($cost - $salvage, 4);
        $annualDepreciation = $depreciableAmount / max($usefulLife, 1);
        $monthlyDepreciation = $depreciableAmount / max($usefulLife * 12, 1);

        // Full months elapsed from the depreciation start date (the fractional
        // month of the start day itself is intentionally not counted, matching
        // the established $start->diff() behaviour).
        $interval = $start->diff($asOf);
        $monthsElapsed = max(0, ($interval->y * 12) + $interval->m);
        if ($asOf < $start) {
            $monthsElapsed = 0;
        }

        $totalMonths = $usefulLife * 12;
        $monthsToDepreciate = min($monthsElapsed, $totalMonths);

        $totalDepreciation = round($monthlyDepreciation * $monthsToDepreciate, 2);
        $totalDepreciation = min($totalDepreciation, $depreciableAmount);

        // Already posted accumulated depreciation (posted rows only).
        $accumulatedPosted = (float) DB::table('asset_depreciation')
            ->where('asset_id', $asset->id)
            ->where('is_posted', true)
            ->sum('depreciation_amount');

        $remainingToPost = round($totalDepreciation - $accumulatedPosted, 2);
        if ($remainingToPost < 0.01) {
            $remainingToPost = 0.0;
        }

        return [
            'asset_id' => $asset->id,
            'cost' => $cost,
            'salvage_value' => $salvage,
            'depreciable_amount' => $depreciableAmount,
            'depreciation_method' => $method,
            'useful_life_years' => $usefulLife,
            'depreciation_start_date' => $startDate,
            'as_of_date' => $asOfDate,
            'months_elapsed' => $monthsElapsed,
            'months_to_depreciate' => $monthsToDepreciate,
            'annual_depreciation' => round($annualDepreciation, 2),
            'monthly_depreciation' => round($monthlyDepreciation, 2),
            'total_depreciation_to_date' => $totalDepreciation,
            'accumulated_depreciation_posted' => round($accumulatedPosted, 2),
            'remaining_to_post' => $remainingToPost,
            'book_value' => round($cost - $accumulatedPosted, 2),
            'projected_book_value' => round($cost - $totalDepreciation, 2),
        ];
    }

    /**
     * Asset cost basis — the established project convention
     * (identical to createRevaluationFromAsset / calculateDisposalSnapshot):
     *   total_cost if populated, otherwise unit_cost × quantity.
     */
    private function assetCostBasis(object $asset): float
    {
        if (!empty($asset->total_cost) && (float) $asset->total_cost > 0) {
            return (float) $asset->total_cost;
        }

        return (float) ($asset->unit_cost ?? 0) * (float) ($asset->quantity ?? 1);
    }

    /**
     * Depreciation start date precedence — the existing project rule
     * (depreciation_start_date ?? purchase_date; "acquisition_date" does not
     * exist in this schema).
     */
    private function depreciationStartDate(object $asset): ?string
    {
        if (!empty($asset->depreciation_start_date)) {
            return (string) $asset->depreciation_start_date;
        }

        return !empty($asset->purchase_date) ? (string) $asset->purchase_date : null;
    }

    /**
     * Which month does an asset's depreciation start in?
     * Depreciation begins in the month AFTER the start date (the start month
     * itself is not depreciated — consistent with the full-months diff logic).
     */
    private function firstDepreciationMonth(\DateTimeImmutable $start): array
    {
        $first = $start->modify('first day of next month');

        return [(int) $first->format('Y'), (int) $first->format('n')];
    }

    /**
     * Monthly projection for one asset as of a date, generated from the SAME
     * engine inputs as calculateDepreciation() (never a separate formula).
     *
     * Rows carry `source` = 'posted' (persisted asset_depreciation row),
     * 'projected' (future/expected month, not yet posted) or 'gap' (a past
     * engine month with no posted row — calculated but not yet posted).
     *
     * The final row is the terminal state: depreciable amount fully consumed.
     */
    public function buildMonthlySchedule(object $asset, string $asOfDate): array
    {
        $calc = $this->runCalculation($asset, $asOfDate);

        $cost = $calc['cost'];
        $monthly = $calc['monthly_depreciation'];
        $depreciable = $calc['depreciable_amount'];

        $start = new \DateTimeImmutable($calc['depreciation_start_date']);
        [$startYear, $startMonth] = $this->firstDepreciationMonth($start);

        $postedRows = DB::table('asset_depreciation')
            ->where('asset_id', $asset->id)
            ->where('is_posted', true)
            ->orderBy('period_year')
            ->orderBy('period_month')
            ->get()
            ->keyBy(fn ($r) => $r->period_year . '-' . str_pad((string) $r->period_month, 2, '0', STR_PAD_LEFT));

        $asOf = new \DateTimeImmutable($asOfDate);
        $monthsToDepreciate = $calc['months_to_depreciate'];
        $totalMonths = $calc['useful_life_years'] * 12;

        $schedule = [];
        $accumulated = 0.0;

        // The projection covers the asset's FULL useful life: months up to the
        // as-of date appear as posted/gap, later months as pure projections.
        for ($i = 0; $i < $totalMonths; $i++) {
            // Advance one month from the first depreciation month.
            if ($i === 0) {
                $cursor = new \DateTimeImmutable("{$startYear}-{$startMonth}-01");
            } else {
                $cursor = $cursor->modify('+1 month');
            }

            $year = (int) $cursor->format('Y');
            $month = (int) $cursor->format('n');
            $key = $year . '-' . str_pad((string) $month, 2, '0', STR_PAD_LEFT);

            $amount = $monthly;
            $isTerminalMonth = ($i === $totalMonths - 1);
            if ($isTerminalMonth) {
                // Final month absorbs rounding so accumulated == depreciable.
                $amount = round($depreciable - $accumulated, 2);
            }

            $posted = $postedRows->get($key);
            $source = $posted ? 'posted' : ($cursor <= $asOf ? 'gap' : 'projected');

            $bookValueBefore = round($cost - $accumulated, 2);
            $accumulated = round($accumulated + $amount, 2);
            $bookValueAfter = round($cost - $accumulated, 2);

            $row = [
                'year' => $year,
                'month' => $month,
                'depreciation_date' => $cursor->format('Y-m-d'),
                'depreciation_amount' => $amount,
                'accumulated_depreciation' => $accumulated,
                'net_book_value_before' => $bookValueBefore,
                'net_book_value_after' => $bookValueAfter,
                'source' => $source,
                'is_posted' => (bool) $posted,
                'journal_entry_id' => $posted?->journal_entry_id,
                'depreciation_id' => $posted?->id,
                'posted_date' => $posted?->posted_date,
            ];

            if ($posted) {
                $row['posted_amount'] = (float) $posted->depreciation_amount;
                $row['posted_accumulated'] = (float) $posted->accumulated_depreciation;
                $row['posted_book_value_after'] = (float) $posted->net_book_value_after;
            }

            $schedule[] = $row;
        }

        // Sort by period ascending (posted rows may have been created for
        // arbitrary periods and the cursor walk is already ascending).
        usort($schedule, fn ($a, $b) => ($a['year'] <=> $b['year']) ?: ($a['month'] <=> $b['month']));

        return [
            'asset' => [
                'id' => $asset->id,
                'asset_number' => $asset->asset_number,
                'name' => $asset->name_en ?: $asset->name_ar,
                'status' => $asset->status,
                'cost' => $cost,
                'salvage_value' => $calc['salvage_value'],
                'useful_life_years' => $calc['useful_life_years'],
                'depreciation_start_date' => $calc['depreciation_start_date'],
                'depreciation_method' => $calc['depreciation_method'],
            ],
            'summary' => [
                'cost' => $cost,
                'salvage_value' => $calc['salvage_value'],
                'depreciable_amount' => $depreciable,
                'monthly_depreciation' => $monthly,
                'annual_depreciation' => $calc['annual_depreciation'],
                'months_elapsed' => $calc['months_elapsed'],
                'months_to_depreciate' => $monthsToDepreciate,
                'total_depreciation_to_date' => $calc['total_depreciation_to_date'],
                'accumulated_depreciation_posted' => $calc['accumulated_depreciation_posted'],
                'remaining_to_post' => $calc['remaining_to_post'],
                'book_value' => $calc['book_value'],
                'projected_book_value' => $calc['projected_book_value'],
                'posted_months' => $postedRows->count(),
                'fully_depreciated' => $calc['remaining_to_post'] <= 0 && $calc['months_to_depreciate'] >= $totalMonths,
            ],
            'rows' => $schedule,
        ];
    }

    /**
     * Yearly aggregation built from the monthly projection (no second engine).
     */
    public function buildYearlySchedule(object $asset, string $asOfDate): array
    {
        $monthly = $this->buildMonthlySchedule($asset, $asOfDate);

        $byYear = [];
        foreach ($monthly['rows'] as $row) {
            $year = $row['year'];
            if (!isset($byYear[$year])) {
                $byYear[$year] = [
                    'year' => $year,
                    'opening_book_value' => $row['net_book_value_before'],
                    'depreciation' => 0.0,
                    'accumulated_depreciation' => 0.0,
                    'closing_book_value' => 0.0,
                    'months_posted' => 0,
                    'months_projected' => 0,
                    'fully_posted' => true,
                ];
            }

            $byYear[$year]['depreciation'] = round($byYear[$year]['depreciation'] + $row['depreciation_amount'], 2);
            $byYear[$year]['accumulated_depreciation'] = $row['accumulated_depreciation'];
            $byYear[$year]['closing_book_value'] = $row['net_book_value_after'];

            if ($row['source'] === 'posted') {
                $byYear[$year]['months_posted']++;
            } else {
                $byYear[$year]['months_projected']++;
                if ($row['source'] !== 'gap') {
                    $byYear[$year]['fully_posted'] = false;
                } else {
                    $byYear[$year]['fully_posted'] = false;
                }
            }
        }

        return [
            'asset' => $monthly['asset'],
            'summary' => $monthly['summary'],
            'rows' => array_values($byYear),
        ];
    }

    // =========================================================================
    // Posting
    // =========================================================================

    /**
     * Post depreciation for one asset as of a date.
     *
     * The engine decides the target period: the latest engine month that is
     * calculated-but-not-posted as of asOfDate (i.e. the first 'gap' month).
     * This keeps every posting on the strict monthly timeline and prevents
     * out-of-sequence or future postings.
     *
     * Transactional: asset_depreciation row + journal + lines + postings cache
     * all succeed together, or everything rolls back.
     */
    public function postDepreciation(array $data): array
    {
        try {
            return DB::transaction(function () use ($data) {
                $asOfDate = $data['as_of_date'] ?? now()->toDateString();
                $asset = $this->getDepreciableAsset((int) $data['asset_id']);
                $calc = $this->runCalculation($asset, $asOfDate);

                if ($calc['remaining_to_post'] <= 0) {
                    throw new \Exception('No depreciation due to post for this asset as of ' . $asOfDate . '.');
                }

                // Target period = first gap month in the projection.
                $projection = $this->buildMonthlySchedule($asset, $asOfDate);
                $targetRow = null;
                foreach ($projection['rows'] as $row) {
                    if ($row['source'] === 'gap') {
                        $targetRow = $row;
                        break;
                    }
                }

                if (!$targetRow) {
                    throw new \Exception('No unposted depreciation month was found as of ' . $asOfDate . '.');
                }

                $periodYear = $targetRow['year'];
                $periodMonth = $targetRow['month'];
                $postingDate = $targetRow['depreciation_date'];

                // Idempotency safeguard (also enforced by the DB unique index).
                // A posted row blocks the period; an UNPOSTED row (e.g. left by a
                // reversal) is reused: the month is legitimately not posted yet.
                $existing = DB::table('asset_depreciation')
                    ->where('asset_id', $asset->id)
                    ->where('period_month', $periodMonth)
                    ->where('period_year', $periodYear)
                    ->first();
                if ($existing && (bool) $existing->is_posted) {
                    throw new \Exception("Depreciation for period {$periodMonth}/{$periodYear} was already posted for this asset.");
                }

                // Fiscal period gate — before any write.
                $this->ensureOpenFiscalPeriod($postingDate);

                // Account mapping must resolve or nothing is written.
                [$expenseAccountId, $accumAccountId] = $this->resolveDepreciationAccounts($asset);

                $amount = $targetRow['depreciation_amount'];
                $accumulatedAfter = $calc['accumulated_depreciation_posted'] + $amount;
                $bookValueBefore = $calc['cost'] - $calc['accumulated_depreciation_posted'];
                $bookValueAfter = $bookValueBefore - $amount;

                $depreciationValues = [
                    'asset_id' => $asset->id,
                    'company_id' => $this->companyId(),
                    'fiscal_year' => $periodYear,
                    'period_month' => $periodMonth,
                    'period_year' => $periodYear,
                    'depreciation_date' => $postingDate,
                    'depreciation_amount' => round($amount, 4),
                    'accumulated_depreciation' => round($accumulatedAfter, 4),
                    'net_book_value_before' => round($bookValueBefore, 4),
                    'net_book_value_after' => round($bookValueAfter, 4),
                    'is_posted' => true,
                    'posted_date' => $asOfDate,
                    'notes' => 'Straight-line depreciation for ' . sprintf('%02d/%d', $periodMonth, $periodYear),
                    'created_by' => auth()->id(),
                    'updated_at' => now(),
                ];

                if ($existing) {
                    // Reuse the unposted row (unique slot owner) for this month.
                    DB::table('asset_depreciation')
                        ->where('id', $existing->id)
                        ->update($depreciationValues);
                    $depreciationId = (int) $existing->id;
                } else {
                    $depreciationValues['created_at'] = now();
                    $depreciationId = DB::table('asset_depreciation')->insertGetId($depreciationValues);
                }

                $journalEntryId = $this->createDepreciationJournalEntry(
                    $asset,
                    $amount,
                    $postingDate,
                    $periodMonth,
                    $periodYear,
                    $expenseAccountId,
                    $accumAccountId
                );

                DB::table('asset_depreciation')
                    ->where('id', $depreciationId)
                    ->update(['journal_entry_id' => $journalEntryId]);

                return [
                    'depreciation_id' => $depreciationId,
                    'asset_id' => $asset->id,
                    'period_month' => $periodMonth,
                    'period_year' => $periodYear,
                    'depreciation_amount' => round($amount, 2),
                    'accumulated_after' => round($accumulatedAfter, 2),
                    'book_value_after' => round($bookValueAfter, 2),
                    'journal_entry_id' => $journalEntryId,
                    'calculation' => $calc,
                ];
            });
        } catch (Throwable $e) {
            // Surface a clean, user-presentable message for expected business
            // failures; unexpected exceptions propagate unchanged.
            if (str_starts_with($e->getMessage(), 'Depreciation for period')
                || str_starts_with($e->getMessage(), 'No ')
                || str_starts_with($e->getMessage(), 'Asset ')
                || str_starts_with($e->getMessage(), 'Salvage ')
                || str_starts_with($e->getMessage(), "Depreciation method ")
                || str_starts_with($e->getMessage(), 'No open accounting period')
                || str_starts_with($e->getMessage(), 'Depreciation accounts are not configured')) {
                throw new \Exception($e->getMessage(), 0, $e);
            }
            throw $e;
        }
    }

    /**
     * Resolve depreciation accounts for an asset.
     *
     * Primary source: the asset's category account mapping columns
     * (account_depreciation_id / account_accumulated_depreciation_id),
     * inherited from the nearest configured ancestor when categories nest.
     *
     * No silent fallback to arbitrary accounts: if the mapping is missing,
     * a clear exception blocks the posting.
     *
     * @return int[] [expenseAccountId, accumulatedDepreciationAccountId]
     */
    private function resolveDepreciationAccounts(object $asset): array
    {
        $companyId = $this->companyId();

        $expenseId = $asset->account_depreciation_id ?? null;
        $accumId = $asset->account_accumulated_depreciation_id ?? null;

        // Inherit from ancestors when the direct category has no mapping.
        if (!$expenseId || !$accumId) {
            $categoryId = $asset->category_id ?? null;
            while ($categoryId && (!$expenseId || !$accumId)) {
                $category = DB::table('asset_categories')
                    ->where('id', $categoryId)
                    ->first(['id', 'parent_id', 'account_depreciation_id', 'account_accumulated_depreciation_id']);
                if (!$category) {
                    break;
                }
                $expenseId = $expenseId ?: $category->account_depreciation_id;
                $accumId = $accumId ?: $category->account_accumulated_depreciation_id;
                $categoryId = $category->parent_id;
            }
        }

        if (!$expenseId || !$accumId) {
            throw new \Exception(
                'Depreciation accounts are not configured for this asset category. ' .
                'Set the Depreciation Expense and Accumulated Depreciation accounts on the asset category before posting.'
            );
        }

        // Both accounts must exist and belong to the current company.
        $accounts = Account::whereIn('AccID', [(int) $expenseId, (int) $accumId])
            ->get(['AccID', 'company_id']);
        if ($accounts->count() < 2) {
            throw new \Exception('Configured depreciation accounts were not found in the chart of accounts.');
        }
        foreach ($accounts as $account) {
            if (!empty($account->company_id) && (int) $account->company_id !== $companyId) {
                throw new \Exception('Configured depreciation accounts do not belong to your company.');
            }
        }

        return [(int) $expenseId, (int) $accumId];
    }

    /**
     * GL entry: Dr Depreciation Expense, Cr Accumulated Depreciation.
     */
    private function createDepreciationJournalEntry(
        object $asset,
        float $amount,
        string $asOfDate,
        int $periodMonth,
        int $periodYear,
        int $expenseAccountId,
        int $accumDeprAccountId
    ): ?int {
        $entryCode = $this->generateNextEntryCode();
        $reference = "DEPR-{$asset->id}-{$periodYear}-{$periodMonth}";

        $header = JournalEntry::create([
            'entry_code' => $entryCode,
            'entry_type' => 'Depreciation',
            'reference' => $reference,
            'date' => $asOfDate,
            'description' => 'Asset depreciation for period ' . sprintf('%02d/%d', $periodMonth, $periodYear),
            'total_amount' => round($amount, 2),
            'status' => 'Post',
            'company_id' => $this->companyId(),
        ]);

        JournalEntryLine::create([
            'journal_entry_code' => $entryCode,
            'account_id' => $expenseAccountId,
            'debit' => round($amount, 2),
            'credit' => 0,
            'related_id_name' => 'Depreciation',
            'related_name_details' => $reference,
            'description' => 'Depreciation Expense',
        ]);

        JournalEntryLine::create([
            'journal_entry_code' => $entryCode,
            'account_id' => $accumDeprAccountId,
            'debit' => 0,
            'credit' => round($amount, 2),
            'related_id_name' => 'Depreciation',
            'related_name_details' => $reference,
            'description' => 'Accumulated Depreciation',
        ]);

        // Sync account_postings cache for Trial Balance consistency.
        app(PostingService::class)->recalculatePostings($this->companyId());

        return $header->id;
    }

    /**
     * Next journal entry code.
     *
     * The concurrency-safe variant scans only the numeric tail of the highest
     * existing code ordered by id (a bounded single query) instead of loading
     * every entry_code into memory. Uniqueness itself is still ultimately
     * enforced by JournalEntry::creating, which throws on duplicates.
     */
    private function generateNextEntryCode(): string
    {
        $lastNumeric = JournalEntry::query()
            ->selectRaw("CAST(SUBSTRING(entry_code, 5) AS UNSIGNED) AS n")
            ->where('entry_code', 'like', 'QID-%')
            ->orderByDesc('n')
            ->limit(1)
            ->value('n');

        return 'QID-' . (max(10000, (int) $lastNumeric) + 1);
    }

    // =========================================================================
    // Bulk posting
    // =========================================================================

    /**
     * Run depreciation posting for every eligible asset of the current
     * company as of a date. Company-scoped; skips non-depreciable/disposed
     * assets; per-asset failures never abort the run and are reported.
     */
    public function runBulkDepreciation(array $data): array
    {
        $asOfDate = $data['as_of_date'] ?? now()->toDateString();

        $assets = DB::table('assets')
            ->where('company_id', $this->companyId())
            ->where('status', 'active')
            ->where('is_depreciable', true)
            ->get(['id', 'name_en', 'name_ar']);

        $posted = [];
        $skipped = [];
        $failed = [];

        foreach ($assets as $asset) {
            try {
                $result = $this->postDepreciation([
                    'asset_id' => $asset->id,
                    'as_of_date' => $asOfDate,
                ]);
                $posted[] = [
                    'asset_id' => $asset->id,
                    'asset_name' => $asset->name_en ?: $asset->name_ar,
                    'period' => sprintf('%02d/%d', $result['period_month'], $result['period_year']),
                    'amount' => $result['depreciation_amount'],
                    'journal_entry_id' => $result['journal_entry_id'],
                ];
            } catch (\Exception $e) {
                $message = $e->getMessage();
                if (str_starts_with($message, 'No depreciation due')
                    || str_starts_with($message, 'No unposted depreciation month')
                    || str_starts_with($message, 'No depreciation to post')) {
                    $skipped[] = ['asset_id' => $asset->id, 'asset_name' => $asset->name_en ?: $asset->name_ar, 'reason' => $message];
                } else {
                    $failed[] = ['asset_id' => $asset->id, 'asset_name' => $asset->name_en ?: $asset->name_ar, 'reason' => $message];
                }
            }
        }

        return [
            'as_of_date' => $asOfDate,
            'posted' => $posted,
            'skipped' => $skipped,
            'failed' => $failed,
            'posted_count' => count($posted),
            'skipped_count' => count($skipped),
            'failed_count' => count($failed),
        ];
    }

    // =========================================================================
    // Reversal
    // =========================================================================

    /**
     * Reverse one posted depreciation record using the shared
     * JournalReversalService (original journal is preserved; a {code}-REV
     * journal is created). The asset_depreciation schedule row is then
     * removed inside the same transaction: the accounting history of the
     * posting lives entirely in the original + reversal journal pair, and
     * removing the row frees the (asset, month, year) unique slot so the
     * month can be posted again (e.g. after correcting the asset data).
     */
    public function reverseDepreciation(array $data): array
    {
        return DB::transaction(function () use ($data) {
            $depreciationId = (int) $data['depreciation_id'];

            $record = DB::table('asset_depreciation')
                ->join('assets', 'assets.id', '=', 'asset_depreciation.asset_id')
                ->where('asset_depreciation.id', $depreciationId)
                ->where('assets.company_id', $this->companyId())
                ->select('asset_depreciation.*')
                ->first();

            if (!$record) {
                throw new \Exception('Depreciation record not found for your company.');
            }

            if (!$record->is_posted) {
                throw new \Exception('Only posted depreciation can be reversed.');
            }

            if (!$record->journal_entry_id) {
                throw new \Exception('This depreciation record has no linked journal entry to reverse.');
            }

            /** @var JournalEntry|null $journal */
            $journal = JournalEntry::find($record->journal_entry_id);
            if (!$journal) {
                throw new \Exception('The linked journal entry no longer exists.');
            }

            // Fiscal-period rules for the reversal date.
            $reversalDate = $data['reversal_date'] ?? now()->toDateString();
            $this->ensureOpenFiscalPeriod($reversalDate);

            // Reversal through the existing accounting infrastructure.
            $reversal = app(JournalReversalService::class)->createReversal(
                $journal->entry_code,
                'Depreciation reversal for period ' . sprintf('%02d/%d', $record->period_month, $record->period_year),
                $reversalDate
            );

            // Consistent depreciation state: the schedule row is removed (its
            // accounting history is preserved in the journal pair above), so
            // the unified engine sees the month as simply not posted.
            DB::table('asset_depreciation')
                ->where('id', $record->id)
                ->delete();

            app(PostingService::class)->recalculatePostings($this->companyId());

            return [
                'depreciation_id' => $record->id,
                'reversed_journal_entry_id' => $journal->id,
                'reversal_journal_entry_id' => $reversal?->id,
            ];
        });
    }

    // =========================================================================
    // Disposal / Movement / Revaluation (existing behaviour preserved)
    // =========================================================================

    /**
     * Snapshot the accounting values of an asset at disposal time:
     * original cost, accumulated depreciation (from posted depreciation)
     * and the resulting net book value.
     *
     * Shared by the lifecycle posting flow and the disposal CRUD page so both
     * use exactly the same rules.
     */
    public function calculateDisposalSnapshot(object $asset): array
    {
        $cost = $this->assetCostBasis($asset);

        $accumulatedDepreciation = (float) DB::table('asset_depreciation')
            ->where('asset_id', $asset->id)
            ->where('is_posted', true)
            ->sum('depreciation_amount');

        return [
            'original_cost' => round($cost, 4),
            'accumulated_depreciation' => round($accumulatedDepreciation, 4),
            'net_book_value' => round($cost - $accumulatedDepreciation, 4),
        ];
    }

    /**
     * Dispose an asset with gain/loss calculation.
     * Uses the asset_disposals table per the existing migration schema.
     */
    public function disposeAsset(array $data): array
    {
        return DB::transaction(function () use ($data) {
            $asset = DB::table('assets')->where('id', $data['asset_id'])->first();
            if (!$asset) {
                throw new \Exception('Asset not found.');
            }

            // Prevent duplicate disposal
            if (($asset->status ?? 'active') === 'disposed') {
                throw new \Exception('Asset has already been disposed.');
            }

            // Prevent duplicate disposal record for same date
            $existingDisposal = DB::table('asset_disposals')
                ->where('asset_id', $asset->id)
                ->where('disposal_date', $data['disposal_date'] ?? now()->toDateString())
                ->first();
            if ($existingDisposal) {
                throw new \Exception('This asset has already been disposed on this date.');
            }

            $snapshot = $this->calculateDisposalSnapshot($asset);
            $cost = $snapshot['original_cost'];
            $accumulatedDepreciation = $snapshot['accumulated_depreciation'];
            $netBookValue = $snapshot['net_book_value'];
            $proceeds = (float) ($data['disposal_proceeds'] ?? $data['disposal_amount'] ?? 0);
            $gainLoss = $proceeds - $netBookValue;

            // Map common disposal type names to the migration enum
            $disposalTypeMap = [
                'sale' => 'sale',
                'scrap' => 'scrap',
                'donation' => 'donation',
                'loss' => 'loss',
                'theft' => 'theft',
                'exchange' => 'exchange',
                'destroyed' => 'scrap',
            ];
            $disposalMethod = $disposalTypeMap[$data['disposal_type'] ?? 'sale'] ?? 'sale';

            DB::table('asset_disposals')->insert([
                'asset_id' => $asset->id,
                'disposal_date' => $data['disposal_date'],
                'disposal_method' => $disposalMethod,
                'original_cost' => round($cost, 4),
                'accumulated_depreciation' => round($accumulatedDepreciation, 4),
                'net_book_value' => round($netBookValue, 4),
                'disposal_amount' => round($proceeds, 4),
                'gain_loss_amount' => round($gainLoss, 4),
                'is_posted' => true,
                'notes' => $data['notes'] ?? $data['reason'] ?? null,
                'created_by' => auth()->id(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // Create GL entry for disposal
            $journalEntryId = $this->createDisposalJournalEntry($asset, $cost, $accumulatedDepreciation, $proceeds, $gainLoss, $data['disposal_date'] ?? now()->toDateString());

            // Store journal_entry_id on disposal record
            DB::table('asset_disposals')
                ->where('asset_id', $asset->id)
                ->where('disposal_date', $data['disposal_date'] ?? now()->toDateString())
                ->update(['journal_entry_id' => $journalEntryId]);

            // Mark asset as disposed
            DB::table('assets')->where('id', $asset->id)->update([
                'status' => 'disposed',
                'updated_at' => now(),
            ]);

            return [
                'asset_id' => $asset->id,
                'cost' => $cost,
                'accumulated_depreciation' => $accumulatedDepreciation,
                'net_book_value' => $netBookValue,
                'disposal_proceeds' => $proceeds,
                'gain_loss' => $gainLoss,
            ];
        });
    }

    /**
     * Record an asset movement (transfer between locations/departments).
     * Uses the asset_movements table per the existing migration schema.
     */
    public function moveAsset(array $data): array
    {
        return DB::transaction(function () use ($data) {
            $asset = DB::table('assets')->where('id', $data['asset_id'])->first();
            if (!$asset) {
                throw new \Exception('Asset not found.');
            }

            // Map to migration enum values
            $typeMap = [
                'transfer' => 'transfer',
                'loan' => 'loan',
                'return' => 'return',
                'adjustment' => 'adjustment',
            ];
            $movementType = $typeMap[$data['movement_type'] ?? 'transfer'] ?? 'transfer';

            DB::table('asset_movements')->insert([
                'asset_id' => $asset->id,
                'movement_type' => $movementType,
                'movement_date' => $data['movement_date'],
                'from_warehouse_id' => $asset->warehouse_id ?? null,
                'to_warehouse_id' => $data['to_warehouse_id'] ?? null,
                'from_department_id' => $asset->department_id ?? null,
                'to_department_id' => $data['to_department_id'] ?? null,
                'from_employee_id' => $data['from_employee_id'] ?? null,
                'to_employee_id' => $data['to_employee_id'] ?? null,
                'reason' => $data['reason'] ?? null,
                'notes' => $data['notes'] ?? null,
                'status' => 'completed',
                'company_id' => auth()->user()->company_id ?? 1,
                'requested_by' => auth()->id(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // Update asset location
            $updateData = ['updated_at' => now()];
            if (!empty($data['to_warehouse_id'])) {
                $updateData['warehouse_id'] = $data['to_warehouse_id'];
            }
            if (!empty($data['to_department_id'])) {
                $updateData['department_id'] = $data['to_department_id'];
            }
            DB::table('assets')->where('id', $asset->id)->update($updateData);

            return ['message' => 'Asset movement recorded successfully.', 'asset_id' => $asset->id];
        });
    }

    /**
     * Create GL entry for asset disposal (upsert pattern, idempotent).
     */
    private function createDisposalJournalEntry(object $asset, float $cost, float $accumulatedDepreciation, float $proceeds, float $gainLoss, string $disposalDate): ?int
    {
        $assetAccountId = $this->resolveFixedAssetAccountId($asset);
        $accumDeprAccountId = $this->resolveAccountForDisposal($asset->account_accumulated_depreciation_id ?? null);
        $cashAccountId = $this->resolveCashAccountId();
        $gainLossAccountId = $gainLoss >= 0
            ? $this->resolveGainOnDisposalAccountId()
            : $this->resolveLossOnDisposalAccountId();

        if (!$assetAccountId || !$accumDeprAccountId) {
            return null;
        }

        $this->ensureOpenFiscalPeriod($disposalDate);

        // Upsert pattern (idempotent).
        $reference = "DISPOSAL-{$asset->id}-" . substr($disposalDate, 0, 10);

        // Phase 19: the unreversed live entry via the journal_reversals link
        // table — a fully reversed disposal posts a FRESH entry.
        $existingHeader = app(JournalReversalService::class)
            ->unreversedEntryFor($reference, 'AssetDisposal');

        if ($existingHeader) {
            JournalEntryLine::where('journal_entry_code', $existingHeader->entry_code)->delete();
            $existingHeader->update([
                'date' => $disposalDate,
                'total_amount' => round($cost, 2),
                'status' => 'Post',
            ]);
            $entryCode = $existingHeader->entry_code;
        } else {
            $entryCode = $this->generateNextEntryCode();
            JournalEntry::create([
                'entry_code' => $entryCode,
                'entry_type' => 'AssetDisposal',
                'reference' => $reference,
                'date' => $disposalDate,
                'description' => 'Asset Disposal: ' . ($asset->name ?? $asset->id),
                'total_amount' => round($cost, 2),
                'status' => 'Post',
                'company_id' => $this->companyId(),
            ]);
        }

        // Dr Cash/Receivable (proceeds)
        if ($proceeds > 0 && $cashAccountId) {
            JournalEntryLine::create([
                'journal_entry_code' => $entryCode,
                'account_id' => $cashAccountId,
                'debit' => round($proceeds, 2),
                'credit' => 0,
                'related_id_name' => 'AssetDisposal',
                'related_name_details' => $reference,
                'description' => 'Disposal proceeds',
            ]);
        }

        // Dr Accumulated Depreciation
        if ($accumulatedDepreciation > 0) {
            JournalEntryLine::create([
                'journal_entry_code' => $entryCode,
                'account_id' => $accumDeprAccountId,
                'debit' => round($accumulatedDepreciation, 2),
                'credit' => 0,
                'related_id_name' => 'AssetDisposal',
                'related_name_details' => $reference,
                'description' => 'Remove accumulated depreciation',
            ]);
        }

        // Cr Fixed Asset Cost
        JournalEntryLine::create([
            'journal_entry_code' => $entryCode,
            'account_id' => $assetAccountId,
            'debit' => 0,
            'credit' => round($cost, 2),
            'related_id_name' => 'AssetDisposal',
            'related_name_details' => $reference,
            'description' => 'Remove asset cost',
        ]);

        // Gain or Loss balancing entry
        if ($gainLoss != 0 && $gainLossAccountId) {
            if ($gainLoss > 0) {
                // Gain: Cr Gain account
                JournalEntryLine::create([
                    'journal_entry_code' => $entryCode,
                    'account_id' => $gainLossAccountId,
                    'debit' => 0,
                    'credit' => round(abs($gainLoss), 2),
                    'related_id_name' => 'AssetDisposal',
                    'related_name_details' => $reference,
                    'description' => 'Gain on disposal',
                ]);
            } else {
                // Loss: Dr Loss account
                JournalEntryLine::create([
                    'journal_entry_code' => $entryCode,
                    'account_id' => $gainLossAccountId,
                    'debit' => round(abs($gainLoss), 2),
                    'credit' => 0,
                    'related_id_name' => 'AssetDisposal',
                    'related_name_details' => $reference,
                    'description' => 'Loss on disposal',
                ]);
            }
        }

        // Sync account_postings cache
        $companyId = $asset->company_id ?? auth()->user()?->company_id ?? 1;
        app(PostingService::class)->recalculatePostings((int) $companyId);

        return $existingHeader?->id ?? JournalEntry::where('entry_code', $entryCode)->value('id');
    }

    private function resolveFixedAssetAccountId(object $asset): ?int
    {
        // Try asset's own account, then category account, then generic fixed asset
        if (!empty($asset->inventory_account_id)) {
            return (int) $asset->inventory_account_id;
        }
        return $this->resolveAccountForDisposal($asset->account_purchase_id ?? null)
            ?? Account::where('AccCode', 1101)->value('AccID');
    }

    private function resolveAccountForDisposal($categoryIdMapped): ?int
    {
        return $categoryIdMapped ? (int) $categoryIdMapped : null;
    }

    private function resolveCashAccountId(): ?int
    {
        return Account::where('AccCode', 1001)->value('AccID');
    }

    private function resolveGainOnDisposalAccountId(): ?int
    {
        return Account::where('AccCode', 4003)->value('AccID')
            ?? Account::where('AccCode', 'like', '41%')->orderBy('AccCode')->value('AccID');
    }

    private function resolveLossOnDisposalAccountId(): ?int
    {
        return Account::where('AccCode', 6004)->value('AccID')
            ?? Account::where('AccCode', 'like', '60%')->orderBy('AccCode')->value('AccID');
    }
}
