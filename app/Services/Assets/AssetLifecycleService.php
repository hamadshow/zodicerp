<?php

namespace App\Services\Assets;

use App\Traits\EnsuresFiscalPeriod;
use App\Models\Account;
use App\Models\Accounting\JournalEntry;
use App\Models\Accounting\JournalEntryLine;
use App\Services\Accounting\PostingService;
use Illuminate\Support\Facades\DB;

/**
 * Asset lifecycle service — depreciation, disposal, movement.
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
     * Calculate depreciation for an asset up to asOfDate.
     * Returns the computed amounts without writing to the database.
     */
    public function calculateDepreciation(array $data): array
    {
        $assetId = $data['asset_id'];
        $asOfDate = $data['as_of_date'] ?? now()->toDateString();

        $asset = DB::table('assets')->where('id', $assetId)->first();
        if (!$asset) {
            throw new \Exception('Asset not found.');
        }

        $depreciationMethod = $asset->depreciation_method ?? 'straight_line';
        $cost = (float) ($asset->total_cost ?? $asset->unit_cost ?? 0);
        $residualValue = (float) ($asset->residual_value ?? 0);
        $usefulLife = (int) ($asset->useful_life ?? 1);
        $startDate = $asset->depreciation_start_date ?? $asset->acquisition_date ?? $asset->purchase_date;

        if (!$startDate) {
            throw new \Exception('Asset has no depreciation start date.');
        }

        $depreciableAmount = $cost - $residualValue;
        $annualDepreciation = $depreciableAmount / max($usefulLife, 1);

        $start = new \DateTime($startDate);
        $end = new \DateTime($asOfDate);
        $interval = $start->diff($end);
        $monthsElapsed = ($interval->y * 12) + $interval->m;

        // Cap at useful life in months
        $totalMonths = $usefulLife * 12;
        $monthsToDepreciate = min($monthsElapsed, $totalMonths);

        $totalDepreciation = round(($annualDepreciation / 12) * $monthsToDepreciate, 2);
        $totalDepreciation = min($totalDepreciation, $depreciableAmount);

        // Already posted accumulated depreciation
        $accumulatedDepreciation = (float) DB::table('asset_depreciation')
            ->where('asset_id', $assetId)
            ->where('is_posted', true)
            ->sum('depreciation_amount');

        $remainingToDepreciate = $totalDepreciation - $accumulatedDepreciation;
        if ($remainingToDepreciate < 0.01) {
            $remainingToDepreciate = 0;
        }

        $currentBookValue = $cost - $accumulatedDepreciation;

        return [
            'asset_id' => $assetId,
            'cost' => $cost,
            'residual_value' => $residualValue,
            'depreciable_amount' => $depreciableAmount,
            'depreciation_method' => $depreciationMethod,
            'useful_life_years' => $usefulLife,
            'months_elapsed' => $monthsElapsed,
            'total_depreciation_to_date' => $totalDepreciation,
            'accumulated_depreciation_posted' => $accumulatedDepreciation,
            'remaining_to_post' => $remainingToDepreciate,
            'book_value' => round($currentBookValue - $remainingToDepreciate, 2),
        ];
    }

    /**
     * Post depreciation entries for an asset up to asOfDate.
     * Uses the asset_depreciation table (singular, per migration).
     */
    public function postDepreciation(array $data): array
    {
        return DB::transaction(function () use ($data) {
            $calc = $this->calculateDepreciation($data);
            $assetId = $data['asset_id'];
            $asOfDate = $data['as_of_date'] ?? now()->toDateString();
            $remaining = $calc['remaining_to_post'];

            if ($remaining <= 0) {
                return ['message' => 'No depreciation to post.', 'calculation' => $calc];
            }

            $postingDate = new \DateTime($asOfDate);
            $periodYear = (int) $postingDate->format('Y');
            $periodMonth = (int) $postingDate->format('n');
            $fiscalYear = $periodYear;

            // Check for duplicate posting (unique constraint: asset_id + period_month + period_year)
            $existing = DB::table('asset_depreciation')
                ->where('asset_id', $assetId)
                ->where('period_month', $periodMonth)
                ->where('period_year', $periodYear)
                ->first();

            // Idempotent: if already posted for this period, return existing record
            if ($existing) {
                return [
                    'asset_id' => $assetId,
                    'depreciation_id' => $existing->id,
                    'depreciation_amount' => $existing->depreciation_amount,
                    'journal_entry_id' => $existing->journal_entry_id,
                ];
            }

            $cost = $calc['cost'];
            $accumulatedAfter = $calc['accumulated_depreciation_posted'] + $remaining;
            $bookValueBefore = $cost - $calc['accumulated_depreciation_posted'];
            $bookValueAfter = $bookValueBefore - $remaining;

            $depreciationId = DB::table('asset_depreciation')->insertGetId([
                'asset_id' => $assetId,
                'fiscal_year' => $fiscalYear,
                'period_month' => $periodMonth,
                'period_year' => $periodYear,
                'depreciation_date' => $asOfDate,
                'depreciation_amount' => round($remaining, 4),
                'accumulated_depreciation' => round($accumulatedAfter, 4),
                'net_book_value_before' => round($bookValueBefore, 4),
                'net_book_value_after' => round($bookValueAfter, 4),
                'is_posted' => true,
                'posted_date' => $asOfDate,
                'notes' => "Straight-line depreciation for {$periodMonth}/{$periodYear}",
                'created_by' => auth()->id(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // Create GL entry: Dr Depreciation Expense, Cr Accumulated Depreciation
            $journalEntryId = $this->createDepreciationJournalEntry($assetId, $remaining, $asOfDate, $periodMonth, $periodYear);

            // Link journal entry to depreciation record
            DB::table('asset_depreciation')
                ->where('id', $depreciationId)
                ->update(['journal_entry_id' => $journalEntryId]);

            return [
                'depreciation_id' => $depreciationId,
                'amount_posted' => $remaining,
                'calculation' => $calc,
            ];
        });
    }

    /**
     * Generate depreciation schedule for an asset (yearly projection).
     */
    public function getDepreciationSchedule(array $data): array
    {
        $asset = DB::table('assets')->where('id', $data['asset_id'])->first();
        if (!$asset) {
            throw new \Exception('Asset not found.');
        }

        $cost = (float) ($asset->total_cost ?? $asset->unit_cost ?? 0);
        $residualValue = (float) ($asset->residual_value ?? 0);
        $usefulLife = (int) ($asset->useful_life ?? 1);
        $depreciableAmount = $cost - $residualValue;
        $annualDepreciation = round($depreciableAmount / max($usefulLife, 1), 2);

        $schedule = [];
        $accumulated = 0;
        $bookValue = $cost;

        for ($year = 1; $year <= $usefulLife; $year++) {
            if ($year === $usefulLife) {
                $dep = round($depreciableAmount - $accumulated, 2);
            } else {
                $dep = $annualDepreciation;
            }

            $accumulated += $dep;
            $bookValue -= $dep;

            $schedule[] = [
                'year' => $year,
                'opening_book_value' => round($bookValue + $dep, 2),
                'depreciation' => $dep,
                'accumulated_depreciation' => $accumulated,
                'closing_book_value' => round(max(0, $bookValue), 2),
            ];
        }

        return $schedule;
    }

    /**
     * Run bulk depreciation for all active assets.
     */
    public function runBulkDepreciation(array $data): array
    {
        $asOfDate = $data['as_of_date'] ?? now()->toDateString();
        $assets = DB::table('assets')
            ->where('status', 'active')
            ->where(function ($q) {
                $q->whereNotNull('depreciation_start_date')
                  ->orWhereNotNull('acquisition_date');
            })
            ->get();

        $results = [];
        foreach ($assets as $asset) {
            try {
                $result = $this->postDepreciation([
                    'asset_id' => $asset->id,
                    'as_of_date' => $asOfDate,
                ]);
                $results[] = ['asset_id' => $asset->id, 'status' => 'posted', ...$result];
            } catch (\Exception $e) {
                $results[] = ['asset_id' => $asset->id, 'status' => 'skipped', 'message' => $e->getMessage()];
            }
        }

        return $results;
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

            $cost = (float) ($asset->total_cost ?? $asset->unit_cost ?? 0);
            $accumulatedDepreciation = (float) DB::table('asset_depreciation')
                ->where('asset_id', $asset->id)
                ->where('is_posted', true)
                ->sum('depreciation_amount');

            $netBookValue = $cost - $accumulatedDepreciation;
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
                'created_by' => auth()->id(),
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
     * Create GL entry for depreciation:
     *   Dr Depreciation Expense
     *   Cr Accumulated Depreciation
     */
    private function createDepreciationJournalEntry(int $assetId, float $amount, string $asOfDate, int $periodMonth, int $periodYear): ?int
    {
        $expenseAccountId = $this->resolveDepreciationExpenseAccountId();
        $accumDeprAccountId = $this->resolveAccumulatedDepreciationAccountId();

        if (!$expenseAccountId || !$accumDeprAccountId) {
            return null;
        }

        $this->ensureOpenFiscalPeriod($asOfDate);

        $entryCode = $this->generateNextEntryCode();
        $reference = "DEPR-{$assetId}-{$periodYear}-{$periodMonth}";

        $header = JournalEntry::create([
            'entry_code' => $entryCode,
            'entry_type' => 'Depreciation',
            'reference' => $reference,
            'date' => $asOfDate,
            'description' => "Asset depreciation for period {$periodMonth}/{$periodYear}",
            'total_amount' => round($amount, 2),
            'status' => 'Post',
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

        // Sync account_postings cache for Trial Balance consistency
        $companyId = auth()->user()?->company_id ?? 1;
        app(PostingService::class)->recalculatePostings($companyId);

        return $header->id;
    }

    /**
     * Create GL entry for asset disposal:
     *   Dr Cash/Receivable (proceeds)
     *   Dr Accumulated Depreciation
     *   Cr Fixed Asset Cost
     *   Gain/Loss balancing
     */
    private function createDisposalJournalEntry(object $asset, float $cost, float $accumulatedDepreciation, float $proceeds, float $gainLoss, string $disposalDate): ?int
    {
        $assetAccountId = $this->resolveFixedAssetAccountId($asset);
        $accumDeprAccountId = $this->resolveAccumulatedDepreciationAccountId();
        $cashAccountId = $this->resolveCashAccountId();
        $gainLossAccountId = $gainLoss >= 0
            ? $this->resolveGainOnDisposalAccountId()
            : $this->resolveLossOnDisposalAccountId();

        if (!$assetAccountId || !$accumDeprAccountId) {
            return null;
        }

        $this->ensureOpenFiscalPeriod($disposalDate);

        // Upsert pattern (idempotent)
        $reference = "DISPOSAL-{$asset->id}-" . substr($disposalDate, 0, 10);
        $existingHeader = JournalEntry::where('reference', $reference)
            ->where('entry_type', 'AssetDisposal')
            ->first();

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
        app(PostingService::class)->recalculatePostings($companyId);

        return $existingHeader?->id ?? JournalEntry::where('entry_code', $entryCode)->value('id');
    }

    private function resolveFixedAssetAccountId(object $asset): ?int
    {
        // Try asset's own account, then category account, then generic fixed asset
        if (!empty($asset->inventory_account_id)) {
            return $asset->inventory_account_id;
        }
        // Prefer the four-digit fixed-asset account used by the chart.
        return Account::where('AccCode', 1210)
            ->value('AccID')
            ?? Account::where('AccCode', 121)
                ->value('AccID')
            ?? Account::where('AccCode', '>=', 1200)
                ->where('AccCode', '<=', 1299)
                ->orderBy('AccCode')
                ->value('AccID');
    }

    private function resolveCashAccountId(): ?int
    {
        // Prefer the four-digit cash account used by the chart.
        return Account::where('AccCode', 1001)
            ->value('AccID')
            ?? Account::where('AccCode', 111)
                ->value('AccID')
            ?? Account::where('AccCode', '>=', 1110)
                ->where('AccCode', '<=', 1119)
                ->orderBy('AccCode')
                ->value('AccID');
    }

    private function resolveGainOnDisposalAccountId(): ?int
    {
        // Gain on disposal — use revenue/income accounts (4xxx range)
        return Account::where('AccCode', '>=', 4100)
            ->where('AccCode', '<=', 4999)
            ->orderBy('AccCode')
            ->value('AccID');
    }

    private function resolveLossOnDisposalAccountId(): ?int
    {
        // Loss on disposal — use expense accounts (6xxx range)
        return Account::where('AccCode', '>=', 6100)
            ->where('AccCode', '<=', 6999)
            ->orderBy('AccCode')
            ->value('AccID');
    }

    private function resolveDepreciationExpenseAccountId(): ?int
    {
        // Depreciation Expense: AccCode 612 (مصروفات استهلاك اصول)
        return Account::where('AccCode', 612)
            ->value('AccID')
            ?? Account::where('AccCode', '>=', 6100)
                ->where('AccCode', '<=', 6199)
                ->orderBy('AccCode')
                ->value('AccID');
    }

    private function resolveAccumulatedDepreciationAccountId(): ?int
    {
        // Prefer the chart's dedicated accumulated-depreciation range.
        return Account::where('AccCode', 1220)
            ->value('AccID')
            ?? Account::where('AccCode', '>=', 1220)
                ->where('AccCode', '<=', 1229)
                ->orderBy('AccCode')
                ->value('AccID');
    }

    private function generateNextEntryCode(): string
    {
        $nextNumber = 10001;
        foreach (JournalEntry::whereNotNull('entry_code')->pluck('entry_code') as $entryCode) {
            if (preg_match('/(\d+)$/', $entryCode, $matches)) {
                $nextNumber = max($nextNumber, (int) $matches[1] + 1);
            }
        }

        return 'QID-' . $nextNumber;
    }
}
