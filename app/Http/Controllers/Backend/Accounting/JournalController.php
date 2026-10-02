<?php

namespace App\Http\Controllers\Backend\Accounting;

use App\Http\Controllers\Controller;
use App\Support\AccountNature;
use App\Support\JournalStatus;
use App\Http\Requests\Accounting\StoreJournalRequest;
use App\Http\Requests\Accounting\UpdateJournalRequest;
use App\Models\Accounting\JournalEntry;
use App\Models\Accounting\JournalEntryLine;
use App\Models\Accounting\AccountPosting;
use App\Imports\JournalImport;
use App\Exports\JournalExport;
use App\Services\Accounting\JournalImportService;
use App\Services\Accounting\PostingService;
use App\Services\Accounting\FiscalPeriodService;
use Maatwebsite\Excel\Facades\Excel;
use Illuminate\Support\Facades\Storage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

class JournalController extends Controller
{
    protected string $journalCodePrefix = 'QID-';

    protected int $journalCodeStart = 10001;

    public function __construct(
        protected PostingService $postingService,
        protected FiscalPeriodService $periodService
    ) {}

    public function nextCode()
    {
        $prefix = $this->journalCodePrefix;
        $start = $this->journalCodeStart;

        $nextNumber = $start;
        foreach (JournalEntry::whereNotNull('entry_code')->pluck('entry_code') as $entryCode) {
            $nextNumber = max($nextNumber, (int) $this->nextNumericPart($entryCode, $start));
        }

        return response()->json(['next_code' => $prefix.$nextNumber]);
    }

    /**
     * Export all journals to Excel.
     */
    public function export()
    {
        return Excel::download(new JournalExport, 'journals_export_' . now()->format('Y-m-d_His') . '.xlsx');
    }

    public function index(Request $request)
    {
        $query = JournalEntry::query();

        if ($request->filled('search')) {
            $search = $request->string('search')->toString();
            $query->where(function ($q) use ($search) {
                $q->where('entry_code', 'like', '%'.$search.'%')
                    ->orWhere('entry_type', 'like', '%'.$search.'%')
                    ->orWhere('reference', 'like', '%'.$search.'%')
                    ->orWhere('description', 'like', '%'.$search.'%');
            });
        }

        if ($request->filled('date_from')) {
            $query->whereDate('date', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('date', '<=', $request->date_to);
        }

        if ($request->filled('status') && $request->status !== 'all') {
            $status = JournalStatus::normalize($request->status);
            $query->where('status', $status);
        }

        if ($request->filled('balance_status') && $request->balance_status !== 'all') {
            $isBalanced = $request->balance_status === 'balanced';
            $query->whereHas('lines', function ($q) use ($isBalanced) {
                $q->select('journal_entry_code')
                    ->groupBy('journal_entry_code')
                    ->havingRaw('ABS(SUM(debit) - SUM(credit)) ' . ($isBalanced ? '<' : '>=') . ' 0.001');
            });
        }

        // Server-side sorting: the client sends a sort KEY, never a raw column name.
        // Only whitelisted columns may reach ORDER BY (SQL-injection guard), and ordering
        // is applied BEFORE paginate() so the entire dataset is sorted, not just the
        // records of the current page.
        $allowedSorts = [
            'entry_code'   => 'entry_code',
            'entry_type'   => 'entry_type',
            'description'  => 'description',
            'date'         => 'date',
            'total_amount' => 'total_amount',
            'status'       => 'status',
            'reference'    => 'reference',
            'created_at'   => 'created_at',
        ];

        $requestedSort = $request->string('sort_column')->toString();
        $direction = $request->string('sort_direction')->toString() === 'asc' ? 'asc' : 'desc';

        if ($requestedSort !== '' && isset($allowedSorts[$requestedSort])) {
            $query->orderBy($allowedSorts[$requestedSort], $direction)
                // Deterministic tiebreaker so pagination stays stable across pages.
                ->orderByDesc('id');
        } else {
            $query->orderByDesc('date')->orderByDesc('id');
        }

        if ($request->boolean('with_lines')) {
            $query->with(['lines.account:AccID,AccCode,AccName']);
        }
        
        $query->withSum('lines as total_debit', 'debit')
              ->withSum('lines as total_credit', 'credit');

        if ($request->boolean('all')) {
            $journals = $query->get();
        } else {
            $perPage = $request->integer('per_page', 10);
            $journals = $query->paginate($perPage);
        }

        return response()->json($journals);
    }

    public function store(StoreJournalRequest $request)
    {
        $data = $request->validated();
        $lines = $data['lines'] ?? [];

        $this->ensureAccountsPostable($lines);
        $this->ensureBalanced($lines);

        return DB::transaction(function () use ($data, $lines) {
            // Fiscal period validation — block posting into closed periods.
            $targetStatus = JournalStatus::normalize($data['status'] ?? 'UnPost');
            if (JournalStatus::isPosted($targetStatus)) {
                $this->periodService->validatePostingDate($data['date']);
            }

            // Audit Phase 7: journals are stamped with the creator's company
            // (postAll/unpostAll and the General Ledger already scope by
            // company_id — a NULL-stamped new row would be invisible to the
            // GL's scoped queries and to bulk posting).
            $companyId = (int) (request()->user()->company_id ?? 1);

            $code = $this->generateNextEntryCode();

            $total = 0;
            foreach ($lines as $line) {
                $total += (float) ($line['debit'] ?? 0);
            }

            $journalEntry = JournalEntry::create([
                'entry_code' => $code,
                // Canonical entry_type semantics: 'Opening' is reserved for
                // opening-balance entries only. Normal in-year entries are
                // classified 'Regular'. The API contract does not carry an
                // explicit entry_type today (dropped by StoreJournalRequest
                // validation), so every manual/API entry defaults to Regular.
                'entry_type' => $data['entry_type'] ?? 'Regular',
                'reference' => $data['reference'] ?? null,
                'date' => $data['date'],
                'description' => $data['description'] ?? null,
                'total_amount' => $total,
                'status' => JournalStatus::normalize($data['status'] ?? 'UnPost'),
                'company_id' => $companyId,
            ]);

            foreach ($lines as $line) {
                JournalEntryLine::create([
                    'journal_entry_code' => $code,
                    'account_id' => $line['account_id'],
                    'debit' => $line['debit'] ?? 0,
                    'credit' => $line['credit'] ?? 0,
                    'related_id_name' => $line['related_id_name'] ?? null,
                    'related_name_details' => $line['related_name_details'] ?? null,
                    'description' => $line['description'] ?? null,
                    'cost_center_code' => $line['cost_center_code'] ?? null,
                ]);
            }

            // Automatically recalculate postings if status is Post.
            if (JournalStatus::isPosted($journalEntry->status)) {
                $this->postingService->recalculatePostings(request()->user()->company_id);
            }

            return response()->json([
                'success' => true,
                'message' => 'Journal entry created successfully.',
                'data' => $journalEntry,
            ]);
        });
    }

    public function show(string $entryCode)
    {
        $header = JournalEntry::where('entry_code', $entryCode)->first();
        if (! $header) {
            return response()->json(['message' => 'Journal entry not found.'], 404);
        }

        $lines = JournalEntryLine::where('journal_entry_code', $entryCode)
            ->orderBy('id')
            ->get();

        if ($lines->isEmpty()) {
            return response()->json([
                'header' => $header,
                'lines' => [],
            ]);
        }

        // Keep existing logic for flexible account ID handling but updated for new column names
        $numericIds = [];
        $codeValues = [];

        foreach ($lines as $line) {
            $value = $line->account_id;
            if ($value === null || $value === '') {
                continue;
            }
            // Always treat as potential code
            $codeValues[] = (string) $value;

            if (is_numeric($value)) {
                $numericIds[] = (int) $value;
            }
        }

        $numericIds = array_values(array_unique($numericIds));
        $codeValues = array_values(array_unique($codeValues));

        $accountsQuery = DB::table('accounts');

        if (! empty($numericIds)) {
            $accountsQuery->whereIn('AccID', $numericIds);
        }

        if (! empty($codeValues)) {
            if (! empty($numericIds)) {
                $accountsQuery->orWhereIn('AccCode', $codeValues);
            } else {
                $accountsQuery->whereIn('AccCode', $codeValues);
            }
        }

        $accounts = $accountsQuery->get(['AccID', 'AccCode']);

        $accountsById = [];
        $accountsByCode = [];

        foreach ($accounts as $account) {
            $accountsById[$account->AccID] = $account;
            $accountsByCode[$account->AccCode] = $account;
        }

        $mappedLines = $lines->map(function ($line) use ($accountsById, $accountsByCode) {
            $value = $line->account_id;
            $mappedAccID = null;

            if ($value !== null && $value !== '') {
                // Try to match as AccID first
                if (is_numeric($value)) {
                    $key = (int) $value;
                    if (array_key_exists($key, $accountsById)) {
                        $mappedAccID = $accountsById[$key]->AccID;
                    }
                }

                // If not found as ID, try to match as AccCode
                if ($mappedAccID === null) {
                    $key = (string) $value;
                    if (array_key_exists($key, $accountsByCode)) {
                        $mappedAccID = $accountsByCode[$key]->AccID;
                    }
                }
            }

            // Append mapped AccountAccID for frontend use
            $line->AccountAccID = $mappedAccID;

            return $line;
        });

        return response()->json([
            'header' => [
                'entry_code' => $header->entry_code,
                'date' => $header->date ? substr($header->date, 0, 10) : null,
                'reference' => $header->reference,
                'description' => $header->description,
                'status' => $header->status,
            ],
            'lines' => $mappedLines,
        ]);
    }

    protected function ensureBalanced(array $lines): void
    {
        $totalDebit = 0;
        $totalCredit = 0;

        foreach ($lines as $line) {
            $totalDebit += (float) ($line['debit'] ?? 0);
            $totalCredit += (float) ($line['credit'] ?? 0);
        }

        // Allow small floating point differences
        if (abs($totalDebit - $totalCredit) > 0.01) {
            abort(
                response()->json([
                    'message' => 'Journal entry is not balanced. Total Debit: '.$totalDebit.', Total Credit: '.$totalCredit,
                ], 422)
            );
        }
    }

    protected function ensureAccountsPostable(array $lines): void
    {
        $accountIds = [];
        foreach ($lines as $line) {
            if (! array_key_exists('account_id', $line)) {
                continue;
            }
            $accountIds[] = (int) $line['account_id'];
        }

        $accountIds = array_values(array_unique(array_filter($accountIds)));
        if (empty($accountIds)) {
            return;
        }

        $accounts = DB::table('accounts')
            ->whereIn('AccID', $accountIds)
            ->get(['AccID', 'AccFinal', 'AccStopped']);

        $byId = [];
        foreach ($accounts as $account) {
            $byId[$account->AccID] = $account;
        }

        foreach ($accountIds as $id) {
            if (! array_key_exists($id, $byId)) {
                abort(
                    response()->json([
                        'message' => 'One or more accounts used in journal lines no longer exist.',
                    ], 422)
                );
            }
            $account = $byId[$id];
            $isStopped = (bool) ($account->AccStopped ?? false);

            if ($isStopped) {
                abort(
                    response()->json([
                        'message' => 'Journal lines cannot be posted to stopped accounts.',
                    ], 422)
                );
            }
        }
    }

    protected function nextNumericPart(string $lastCode, int $start): string
    {
        if (preg_match('/(\d+)$/', $lastCode, $matches)) {
            return (string) ((int) $matches[1] + 1);
        }

        return (string) $start;
    }

    protected function generateNextEntryCode(): string
    {
        $prefix = $this->journalCodePrefix;
        $start = $this->journalCodeStart;

        $nextNumber = $start;
        foreach (JournalEntry::whereNotNull('entry_code')->pluck('entry_code') as $entryCode) {
            $nextNumber = max($nextNumber, (int) $this->nextNumericPart($entryCode, $start));
        }

        return $prefix.$nextNumber;
    }

    public function update(UpdateJournalRequest $request, string $entryCode)
    {
        $header = JournalEntry::where('entry_code', $entryCode)->first();
        if (! $header) {
            return response()->json(['message' => 'Journal entry not found.'], 404);
        }

        if (JournalStatus::isPosted($header->status)) {
            return response()->json(['message' => 'Posted journal entries cannot be edited.'], 422);
        }

        $data = $request->validated();
        $lines = $data['lines'] ?? [];

        $this->ensureAccountsPostable($lines);
        $this->ensureBalanced($lines);

        $total = 0;
        foreach ($lines as $line) {
            $total += (float) ($line['debit'] ?? 0);
        }

        return DB::transaction(function () use ($entryCode, $data, $lines, $total) {
            // GL Audit Phase 2: this endpoint only edits UNPOSTED journals
            // (posted headers are refused above), so a posted target status
            // is always a real draft→Posted transition and records the
            // actual posting time. Editing a draft (UnPost) must NOT set
            // posted_at — the attribute is simply not written. (This mass
            // update bypasses the model's transition hook, hence explicit.)
            $attributes = [
                'reference' => $data['reference'] ?? null,
                'date' => $data['date'],
                'description' => $data['description'] ?? null,
                'total_amount' => $total,
                'status' => JournalStatus::normalize($data['status']),
                // Audit Phase 7: heal/stamp ownership on edit — an edited
                // NULL-company draft becomes visible to its editor's company
                // (same convention as the Phase 9 company-stamp heal).
                'company_id' => (int) (request()->user()->company_id ?? 1),
            ];
            if (JournalStatus::isPosted($attributes['status'])) {
                $attributes['posted_at'] = now();
            }

            JournalEntry::where('entry_code', $entryCode)
                ->update($attributes);

            JournalEntryLine::where('journal_entry_code', $entryCode)->delete();

            foreach ($lines as $line) {
                JournalEntryLine::create([
                    'journal_entry_code' => $entryCode,
                    'account_id' => $line['account_id'],
                    'debit' => $line['debit'] ?? 0,
                    'credit' => $line['credit'] ?? 0,
                    'related_id_name' => $line['related_id_name'] ?? null,
                    'related_name_details' => $line['related_name_details'] ?? null,
                    'description' => $line['description'] ?? null,
                    'cost_center_code' => $line['cost_center_code'] ?? null,
                ]);
            }

            // Automatically recalculate postings.
            if (JournalStatus::isPosted($data['status'] ?? 'UnPost')) {
                $this->postingService->recalculatePostings(request()->user()->company_id);
            }

            return response()->json([
                'success' => true,
                'message' => 'Journal entry updated successfully.',
            ]);
        });
    }

    public function destroy(string $entryCode)
    {
        $header = JournalEntry::where('entry_code', $entryCode)->first();
        if (! $header) {
            return response()->json(['message' => 'Journal entry not found.'], 404);
        }

        if (JournalStatus::isPosted($header->status)) {
            return response()->json(['message' => 'Posted journal entries cannot be deleted.'], 422);
        }

        return DB::transaction(function () use ($entryCode) {
            JournalEntryLine::where('journal_entry_code', $entryCode)->delete();
            JournalEntry::where('entry_code', $entryCode)->delete();

            return response()->json([
                'success' => true,
                'message' => 'Journal entry deleted successfully.',
            ]);
        });
    }

    public function bulkImport(Request $request, JournalImportService $importService)
    {
        // Increase execution time for large imports
        set_time_limit(600);
        ini_set('memory_limit', '1024M');

        Log::info('Bulk Import Request Received', [
            'has_file' => $request->hasFile('file'),
            'rows_count' => count($request->input('rows', [])),
        ]);

        // Scenario 1: File-based import (Excel/CSV)
        if ($request->hasFile('file')) {
            try {
                // Since JournalImport implements ShouldQueue, this will be handled in background
                Excel::import(new JournalImport, $request->file('file'));
                
                return response()->json([
                    'success' => true,
                    'message' => 'The file has been uploaded and is being processed in the background. You will see the results shortly.',
                ]);
            } catch (\Exception $e) {
                Log::error('Excel Import Error: ' . $e->getMessage());
                return response()->json([
                    'success' => false,
                    'message' => 'Excel import failed: ' . $e->getMessage(),
                ], 500);
            }
        }

        // Scenario 2: JSON/Array-based import (from DataGridView)
        $rows = $request->input('rows', []);
        if (empty($rows)) {
            return response()->json(['success' => false, 'message' => 'No data to import'], 400);
        }

        try {
            $summary = $importService->importRows($rows);
            
            return response()->json([
                'success' => $summary['imported'] > 0 || $summary['total'] === 0,
                'message' => "Processed {$summary['total']} entries. {$summary['imported']} success, {$summary['failed']} failed.",
                'summary' => $summary
            ]);
        } catch (\Throwable $e) {
            Log::error('Bulk Import Error: ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return response()->json([
                'success' => false,
                'message' => 'Bulk import failed: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function postAll(Request $request)
    {
        $companyId = $request->user()?->company_id;
        if (!$companyId) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        // Optional row-selection support: when the UI sends specific journal ids,
        // ONLY those ids are posted (company scope still applies). Without ids the
        // historical "post everything unposted" behavior is preserved untouched.
        $ids = collect((array) $request->input('ids', []))
            ->map(fn ($v) => (int) $v)
            ->filter(fn ($v) => $v > 0)
            ->unique()
            ->values()
            ->all();

        return DB::transaction(function () use ($companyId, $ids) {
            $selected = fn ($q) => $ids ? $q->whereIn('id', $ids) : $q;

            // 1. Validate fiscal periods for all journals about to be posted
            $unpostedJournals = JournalEntry::where('company_id', $companyId)
                ->where($selected)
                ->where(function ($q) {
                    $q->where('status', 'UnPost')
                      ->orWhere('status', 'unposted')
                      ->orWhereNull('status')
                      ->orWhere('status', '');
                })->get();

            foreach ($unpostedJournals as $journal) {
                if ($journal->date) {
                    try {
                        $this->periodService->validatePostingDate($journal->date);
                    } catch (\Exception $e) {
                        return response()->json([
                            'success' => false,
                            'message' => "Cannot post journal {$journal->entry_code}: " . $e->getMessage(),
                        ], 422);
                    }
                }
            }

            // 2. Update status of the selected (or all) unposted journals for this company
            JournalEntry::where('company_id', $companyId)
                ->where($selected)
                ->where(function ($q) {
                    $q->where('status', 'UnPost')
                      ->orWhere('status', 'unposted')
                      ->orWhereNull('status')
                      ->orWhere('status', '');
                })
                // GL Audit Phase 2: a real transition to Posted records the
                // actual posting time for every journal in the batch. The
                // selected set is guaranteed unposted by the filter above,
                // so every updated row is a genuine transition.
                ->update(['status' => 'Post', 'posted_at' => now()]);

            // 3. Recalculate account postings
            $this->postingService->recalculatePostings($companyId);

            return response()->json([
                'success' => true,
                'message' => 'All journals posted successfully.',
            ]);
        });
    }

    public function unpostAll(Request $request)
    {
        $companyId = $request->user()?->company_id;
        if (!$companyId) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        // Optional row-selection support: same contract as postAll().
        $ids = collect((array) $request->input('ids', []))
            ->map(fn ($v) => (int) $v)
            ->filter(fn ($v) => $v > 0)
            ->unique()
            ->values()
            ->all();

        return DB::transaction(function () use ($companyId, $ids) {
            $selected = fn ($q) => $ids ? $q->whereIn('id', $ids) : $q;

            // 1. Update status of the selected (or all) posted journals for this company
            JournalEntry::where('company_id', $companyId)
                ->where($selected)
                ->where(function ($q) {
                    $q->where('status', 'Post')
                      ->orWhere('status', 'posted');
                })
                ->update(['status' => 'UnPost']);

            // 2. Recalculate account postings
            $this->postingService->recalculatePostings($companyId);

            return response()->json([
                'success' => true,
                'message' => 'All journals unposted successfully.',
            ]);
        });
    }



    public function generalLedger(Request $request)
    {
        $validated = $request->validate([
            'account_id' => 'required|integer',
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date',
            'status' => 'nullable|string|in:all,posted,unposted',
            // Audit Phase 9: real server-side pagination. per_page = -1 is
            // the export contract: the FULL ledger, no slicing.
            'page' => 'nullable|integer|min:1',
            'per_page' => 'nullable|integer|min:-1|max:5000',
        ]);

        $accountId = (int) $validated['account_id'];
        $dateFrom = $validated['date_from'] ?? null;
        $dateTo = $validated['date_to'] ?? null;
        $status = $validated['status'] ?? 'posted';
        $page = max(1, (int) ($validated['page'] ?? 1));
        $perPage = (int) ($validated['per_page'] ?? 15);
        $isExport = $perPage === -1;

        // Audit Phase 7: the whole ledger is scoped to the caller's company.
        $companyId = (int) ($request->user()->company_id ?? 1);

        // The account itself must belong to the caller's company — NULL
        // company_id rows are SHARED master data (the documented convention,
        // see the posting resolvers) and stay visible. A foreign company's
        // account is invisible: 404, exactly like the other multi-company
        // boundaries.
        $account = DB::table('accounts')
            ->where('AccID', $accountId)
            ->where(function ($q) use ($companyId) {
                $q->whereNull('company_id')->orWhere('company_id', $companyId);
            })
            ->first(['AccID', 'AccCode', 'AccName', 'AccDmType']);

        if (! $account) {
            return response()->json(['message' => 'Account not found.'], 404);
        }

        // Audit Phase 6: the canonical Debit/Credit convention lives in
        // App\Support\AccountNature (credit iff AccDmType == 1; the legacy
        // 0 rows, the explicit 2 rows and null are all Debit). Replacing
        // the local `(int)$x === 0` rule, which misclassified the 46
        // AccDmType=2 (Debit, expense-family) accounts as Credit.
        $isCredit = AccountNature::isCredit($account->AccDmType);

        $statusPostedValues = JournalStatus::postedValues();

        $applyAccountFilter = function ($query) use ($account) {
            $query->where(function ($q) use ($account) {
                $q->where('b.account_id', $account->AccID)
                    ->orWhere('b.account_id', $account->AccCode);
            });
        };

        $applyStatusFilter = function ($query) use ($status, $statusPostedValues) {
            $normalizedStatus = JournalStatus::normalize($status);
            if (JournalStatus::isPosted($normalizedStatus)) {
                $query->whereIn('h.status', $statusPostedValues);
            } elseif (JournalStatus::isUnposted($normalizedStatus)) {
                $query->whereNotIn('h.status', $statusPostedValues);
            }
        };

        // Audit Phase 7: only the caller's company's journals (plus the
        // NULL-stamped pre-stamping legacy rows) can contribute — this
        // guards opening balance, movement rows, totals and closing
        // balance alike, because they all run through these queries.
        $applyCompanyFilter = function ($query) use ($companyId) {
            $query->where(function ($q) use ($companyId) {
                $q->whereNull('h.company_id')->orWhere('h.company_id', $companyId);
            });
        };

        $openingDebit = 0.0;
        $openingCredit = 0.0;

        if ($dateFrom) {
            $openingTotals = DB::table('journal_entry_lines as b')
                ->join('journal_entries as h', 'h.entry_code', '=', 'b.journal_entry_code')
                ->tap($applyAccountFilter)
                ->tap($applyStatusFilter)
                ->tap($applyCompanyFilter)
                ->where('h.date', '<', $dateFrom)
                ->selectRaw('COALESCE(SUM(b.debit),0) as total_debit, COALESCE(SUM(b.credit),0) as total_credit')
                ->first();

            if ($openingTotals) {
                $openingDebit = (float) $openingTotals->total_debit;
                $openingCredit = (float) $openingTotals->total_credit;
            }
        }

        $openingBalance = $isCredit
            ? $openingCredit - $openingDebit
            : $openingDebit - $openingCredit;

        $entriesQuery = DB::table('journal_entry_lines as b')
            ->join('journal_entries as h', 'h.entry_code', '=', 'b.journal_entry_code')
            ->tap($applyAccountFilter)
            ->tap($applyStatusFilter)
            ->tap($applyCompanyFilter);

        if ($dateFrom) {
            $entriesQuery->where('h.date', '>=', $dateFrom);
        }

        if ($dateTo) {
            // Audit Phase 4 (HIGH): journal_entries.date is DATETIME while
            // the UI (and the validation contract) supplies date_to as a
            // plain date. `h.date <= '2025-12-31'` casts to 2025-12-31
            // 00:00:00 and silently EXCLUDED every same-day journal posted
            // after midnight. A date-only bound now includes the ENTIRE
            // final day via an exclusive next-day-midnight comparison:
            //   h.date < 2026-01-01 00:00:00  (includes 23:59:59.999999,
            //   excludes 2026-01-01 00:00:00 itself).
            // A caller that explicitly supplies a time component keeps the
            // exact inclusive second-precision bound it asked for. Totals
            // and the closing balance derive from these movement rows, so
            // they stay consistent by construction; the opening calculation
            // only uses date_from and is untouched.
            $bound = \Carbon\Carbon::parse($dateTo);
            if ($bound->format('H:i:s') !== '00:00:00') {
                $entriesQuery->where('h.date', '<=', $bound);
            } else {
                $entriesQuery->where('h.date', '<', $bound->addDay());
            }
        }

        // Audit Phase 9: count + page-independent aggregates are taken from
        // a clean clone BEFORE the balance_check join is applied — joining
        // the grouped subquery and then aggregating at the outer level is
        // rejected by MySQL (error 1140, mixing of GROUP columns).
        $totalRecords = (clone $entriesQuery)->count();

        // Totals and the closing balance are PAGE-INDEPENDENT — an
        // aggregate over the WHOLE filtered movement — so page 2 shows the
        // same totals as page 1 and the closing balance is the true period
        // closing. The running balance stays continuous because rows up to
        // the end of the requested page are accumulated in order.
        $aggregate = (clone $entriesQuery)
            ->selectRaw('COALESCE(SUM(b.debit),0) as total_debit, COALESCE(SUM(b.credit),0) as total_credit')
            ->first();
        $totalDebit = (float) ($aggregate->total_debit ?? 0);
        $totalCredit = (float) ($aggregate->total_credit ?? 0);
        $closingBalance = $openingBalance + ($isCredit
            ? $totalCredit - $totalDebit
            : $totalDebit - $totalCredit);

        $selects = [
            'h.date as date',
            'h.entry_code as journal_code',
            'h.reference as reference',
            'h.description as header_description',
            'b.description as line_description',
            'b.debit as debit',
            'b.credit as credit',
            'h.status as status',
            Schema::hasColumn('journal_entries', 'posted_at') ? 'h.posted_at as posted_at' : DB::raw('NULL as posted_at'),
            DB::raw('ABS(COALESCE(balance_check.journal_total_debit, 0) - COALESCE(balance_check.journal_total_credit, 0)) < 0.01 as is_balanced'),
        ];

        $entries = $entriesQuery
            // Audit Phase 8 (ported from the dead duplicate before its
            // removal): per-JOURNAL debit/credit equality, surfaced to the
            // UI (the unbalanced-icon/status-column contract reads it).
            ->leftJoin(DB::raw('(SELECT journal_entry_code, SUM(debit) as journal_total_debit, SUM(credit) as journal_total_credit FROM journal_entry_lines GROUP BY journal_entry_code) as balance_check'), 'balance_check.journal_entry_code', '=', 'h.entry_code')
            // Audit Phase 9: rows are fetched up to the END of the requested
            // page so the running balance is continuous across pages, while
            // the payload carries only the page's slice. The export path
            // (per_page = -1) fetches the whole ledger.
            ->when(! $isExport, fn ($q) => $q->limit($page * $perPage))
            ->orderBy('h.date')
            ->orderBy('h.entry_code')
            ->orderBy('b.id')
            ->get($selects);

        $runningBalance = $openingBalance;

        $mappedEntries = $entries->map(function ($row) use (&$runningBalance, $isCredit) {
            $debit = (float) ($row->debit ?? 0);
            $credit = (float) ($row->credit ?? 0);

            $delta = $isCredit ? $credit - $debit : $debit - $credit;
            $runningBalance += $delta;

            $row->debit = round($debit, 2);
            $row->credit = round($credit, 2);
            $row->running_balance = round($runningBalance, 2);
            // Audit Phase 1: `date` is the ACCOUNTING/_journal date and is
            // presented DATE-ONLY (YYYY-MM-DD). The underlying DATETIME of
            // journal_entries.date keeps driving SQL filtering and ordering
            // above; only the API presentation is truncated here so the
            // screen DATE column and the Excel export stay identical.
            $row->date = $row->date !== null ? substr((string) $row->date, 0, 10) : null;
            // Audit Phase 3: POSTED AT is the actual posting timestamp
            // (Phase 2 column), presented as YYYY-MM-DD HH:mm:ss. Historical
            // rows keep NULL — the UI shows an em-dash, never a fabricated
            // value. Ledger ordering still runs on the ACCOUNTING date
            // (ORDER BY h.date above); posting order is a different concept
            // and is deliberately not substituted here.
            $row->posted_at = $row->posted_at !== null
                ? \Carbon\Carbon::parse($row->posted_at)->format('Y-m-d H:i:s')
                : null;
            $row->is_balanced = (int) $row->is_balanced;
            $row->description = $row->line_description ?: $row->header_description;
            unset($row->header_description, $row->line_description);

            return $row;
        });

        // Audit Phase 9: slice the page out of the accumulated ledger. The
        // export path keeps every row (full-ledger contract).
        if (! $isExport) {
            $mappedEntries = $mappedEntries->slice(($page - 1) * $perPage, $perPage)->values();
        }

        // The project's existing pagination payload shape (same keys the
        // frontend's Table/pagination contract and the former duplicate
        // implementation already speak).
        $effectivePerPage = $isExport ? ($totalRecords ?: 1000) : $perPage;

        return response()->json([
            'account' => [
                'id' => $account->AccID,
                'code' => $account->AccCode,
                'name' => $account->AccName,
                'dm_type' => (int) ($account->AccDmType ?? 0),
                'dm_label' => $isCredit ? 'Credit' : 'Debit',
            ],
            'filters' => [
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
                'status' => $status,
            ],
            'opening_balance' => round($openingBalance, 2),
            'closing_balance' => round($closingBalance, 2),
            'total_debit' => round($totalDebit, 2),
            'total_credit' => round($totalCredit, 2),
            'entries' => $mappedEntries,
            'pagination' => [
                'total' => $totalRecords,
                'per_page' => $effectivePerPage,
                'current_page' => $page,
                'last_page' => (int) ceil($totalRecords / $effectivePerPage),
            ],
        ]);
    }
}
