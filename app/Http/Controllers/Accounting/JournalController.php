<?php

namespace App\Http\Controllers\Accounting;

use App\Http\Controllers\Controller;
use App\Http\Requests\Accounting\StoreJournalRequest;
use App\Http\Requests\Accounting\UpdateJournalRequest;
use App\Models\Accounting\JournalEntry;
use App\Models\Accounting\JournalEntryLine;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class JournalController extends Controller
{
    protected string $journalCodePrefix = 'QID-';
    protected int $journalCodeStart = 10001;

    public function nextCode()
    {
        $prefix = $this->journalCodePrefix;
        $start = $this->journalCodeStart;

        $lastCode = JournalEntry::whereNotNull('entry_code')
            ->where('entry_code', '!=', '')
            ->orderByDesc('id')
            ->value('entry_code');

        $nextNumber = $this->nextNumericPart($lastCode ?? '', $start);

        return response()->json(['next_code' => $prefix . $nextNumber]);
    }

    public function index(Request $request)
    {
        $query = JournalEntry::orderByDesc('date')->orderByDesc('id');

        if ($request->filled('search')) {
            $search = $request->string('search')->toString();
            $query->where(function ($q) use ($search) {
                $q->where('entry_code', 'like', '%' . $search . '%')
                    ->orWhere('entry_type', 'like', '%' . $search . '%')
                    ->orWhere('reference', 'like', '%' . $search . '%')
                    ->orWhere('description', 'like', '%' . $search . '%');
            });
        }

        $journals = $query->get();

        return response()->json($journals);
    }

    public function store(StoreJournalRequest $request)
    {
        $data = $request->validated();
        $lines = $data['lines'] ?? [];

        $this->ensureAccountsPostable($lines);
        $this->ensureBalanced($lines);

        return DB::transaction(function () use ($data, $lines) {
            $code = $this->generateNextEntryCode();
            
            $total = 0;
            foreach ($lines as $line) {
                $total += (float) ($line['debit'] ?? 0);
            }

            $journalEntry = JournalEntry::create([
                'entry_code' => $code,
                'entry_type' => $data['entry_type'] ?? 'Manual', // Default type
                'reference' => $data['reference'] ?? null,
                'date' => $data['date'],
                'description' => $data['description'] ?? null,
                'total_amount' => $total,
                'status' => $data['status'] ?? 'UnPost',
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
        if (!$header) {
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

        if (!empty($numericIds)) {
            $accountsQuery->whereIn('AccID', $numericIds);
        }

        if (!empty($codeValues)) {
            if (!empty($numericIds)) {
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
            'header' => $header,
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
                    'message' => 'Journal entry is not balanced. Total Debit: ' . $totalDebit . ', Total Credit: ' . $totalCredit,
                ], 422)
            );
        }
    }

    protected function ensureAccountsPostable(array $lines): void
    {
        $accountIds = [];
        foreach ($lines as $line) {
            if (!array_key_exists('account_id', $line)) {
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
            if (!array_key_exists($id, $byId)) {
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

        $lastCode = JournalEntry::whereNotNull('entry_code')
            ->where('entry_code', '!=', '')
            ->orderByDesc('id')
            ->lockForUpdate()
            ->value('entry_code');

        $nextNumber = $this->nextNumericPart($lastCode ?? '', $start);

        return $prefix . $nextNumber;
    }

    public function update(UpdateJournalRequest $request, string $entryCode)
    {
        $header = JournalEntry::where('entry_code', $entryCode)->first();
        if (!$header) {
            return response()->json(['message' => 'Journal entry not found.'], 404);
        }

        if ($header->status === 'Post' || $header->status === 'Posted') {
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
            JournalEntry::where('entry_code', $entryCode)
                ->update([
                    'reference' => $data['reference'] ?? null,
                    'date' => $data['date'],
                    'description' => $data['description'] ?? null,
                    'total_amount' => $total,
                    'status' => $data['status'],
                ]);

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

            return response()->json([
                'success' => true,
                'message' => 'Journal entry updated successfully.',
            ]);
        });
    }

    public function destroy(string $entryCode)
    {
        $header = JournalEntry::where('entry_code', $entryCode)->first();
        if (!$header) {
            return response()->json(['message' => 'Journal entry not found.'], 404);
        }

        if ($header->status === 'Post' || $header->status === 'Posted') {
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

    public function generalLedger(Request $request)
    {
        $validated = $request->validate([
            'account_id' => 'required|integer',
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date',
            'status' => 'nullable|string|in:all,posted,unposted',
        ]);

        $accountId = (int) $validated['account_id'];
        $dateFrom = $validated['date_from'] ?? null;
        $dateTo = $validated['date_to'] ?? null;
        $status = $validated['status'] ?? 'posted';

        $account = DB::table('accounts')
            ->where('AccID', $accountId)
            ->first(['AccID', 'AccCode', 'AccName', 'AccDmType']);

        if (!$account) {
            return response()->json(['message' => 'Account not found.'], 404);
        }

        $nature = (int) ($account->AccDmType ?? 0);

        $statusPostedValues = ['Post', 'Posted'];

        $applyAccountFilter = function ($query) use ($account) {
            $query->where(function ($q) use ($account) {
                $q->where('b.account_id', $account->AccID)
                    ->orWhere('b.account_id', $account->AccCode);
            });
        };

        $applyStatusFilter = function ($query) use ($status, $statusPostedValues) {
            if ($status === 'posted') {
                $query->whereIn('h.status', $statusPostedValues);
            } elseif ($status === 'unposted') {
                $query->whereNotIn('h.status', $statusPostedValues);
            }
        };

        $openingDebit = 0.0;
        $openingCredit = 0.0;

        if ($dateFrom) {
            $openingTotals = DB::table('journal_entry_lines as b')
                ->join('journal_entries as h', 'h.entry_code', '=', 'b.journal_entry_code')
                ->tap($applyAccountFilter)
                ->tap($applyStatusFilter)
                ->where('h.date', '<', $dateFrom)
                ->selectRaw('COALESCE(SUM(b.debit),0) as total_debit, COALESCE(SUM(b.credit),0) as total_credit')
                ->first();

            if ($openingTotals) {
                $openingDebit = (float) $openingTotals->total_debit;
                $openingCredit = (float) $openingTotals->total_credit;
            }
        }

        $openingBalance = $nature === 0
            ? $openingDebit - $openingCredit
            : $openingCredit - $openingDebit;

        $entriesQuery = DB::table('journal_entry_lines as b')
            ->join('journal_entries as h', 'h.entry_code', '=', 'b.journal_entry_code')
            ->tap($applyAccountFilter)
            ->tap($applyStatusFilter);

        if ($dateFrom) {
            $entriesQuery->where('h.date', '>=', $dateFrom);
        }

        if ($dateTo) {
            $entriesQuery->where('h.date', '<=', $dateTo);
        }

        $entries = $entriesQuery
            ->orderBy('h.date')
            ->orderBy('h.entry_code')
            ->orderBy('b.id')
            ->get([
                'h.date as date',
                'h.entry_code as journal_code',
                'h.reference as reference',
                'h.description as header_description',
                'b.description as line_description',
                'b.debit as debit',
                'b.credit as credit',
                'h.status as status',
            ]);

        $runningBalance = $openingBalance;
        $totalDebit = 0.0;
        $totalCredit = 0.0;

        $mappedEntries = $entries->map(function ($row) use (&$runningBalance, &$totalDebit, &$totalCredit, $nature) {
            $debit = (float) ($row->debit ?? 0);
            $credit = (float) ($row->credit ?? 0);

            $totalDebit += $debit;
            $totalCredit += $credit;

            $delta = $nature === 0 ? $debit - $credit : $credit - $debit;
            $runningBalance += $delta;

            $row->debit = round($debit, 2);
            $row->credit = round($credit, 2);
            $row->running_balance = round($runningBalance, 2);
            $row->description = $row->line_description ?: $row->header_description;
            unset($row->header_description, $row->line_description);

            return $row;
        });

        $closingBalance = $runningBalance;

        return response()->json([
            'account' => [
                'id' => $account->AccID,
                'code' => $account->AccCode,
                'name' => $account->AccName,
                'dm_type' => $nature,
                'dm_label' => $nature === 0 ? 'Debit' : 'Credit',
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
        ]);
    }
}
