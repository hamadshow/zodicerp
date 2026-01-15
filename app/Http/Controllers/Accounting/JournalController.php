<?php

namespace App\Http\Controllers\Accounting;

use App\Http\Controllers\Controller;
use App\Http\Requests\Accounting\StoreJournalRequest;
use App\Http\Requests\Accounting\UpdateJournalRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class JournalController extends Controller
{
    public function index(Request $request)
    {
        $query = DB::table('tblqaid')->orderByDesc('QaidDate')->orderByDesc('QaidID');

        if ($request->filled('search')) {
            $search = $request->string('search')->toString();
            $query->where(function ($q) use ($search) {
                $q->where('QaidCode', 'like', '%' . $search . '%')
                    ->orWhere('QaidType', 'like', '%' . $search . '%')
                    ->orWhere('QaidRef', 'like', '%' . $search . '%')
                    ->orWhere('QaidDetails', 'like', '%' . $search . '%');
            });
        }

        $journals = $query->get();

        return response()->json($journals);
    }

    public function nextCode(Request $request)
    {
        $maxCode = DB::table('tblqaid')->max(DB::raw('CAST(QaidCode AS UNSIGNED)'));

        return response()->json([
            'next_code' => $maxCode ? (string) ($maxCode + 1) : '1',
        ]);
    }

    public function show(string $qaidCode)
    {
        $header = DB::table('tblqaid')->where('QaidCode', $qaidCode)->first();
        if (!$header) {
            return response()->json(['message' => 'Journal entry not found.'], 404);
        }

        $lines = DB::table('tblqaidbody')
            ->where('QaidCode', $qaidCode)
            ->orderBy('QaidBodyID')
            ->get();

        if ($lines->isEmpty()) {
            return response()->json([
                'header' => $header,
                'lines' => [],
            ]);
        }

        $numericIds = [];
        $codeValues = [];

        foreach ($lines as $line) {
            $value = $line->QaidBodyAccID;
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
            $value = $line->QaidBodyAccID;
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
            $debit = (float) ($line['QaidBodyD1'] ?? 0);
            $credit = (float) ($line['QaidBodyM1'] ?? 0);

            if ($debit > 0 && $credit > 0) {
                abort(
                    response()->json([
                        'message' => 'Each journal line must have either debit or credit, not both.',
                    ], 422)
                );
            }

            $totalDebit += (float) ($line['QaidBodyD1'] ?? 0);
            $totalCredit += (float) ($line['QaidBodyM1'] ?? 0);
        }

        if (round($totalDebit, 2) !== round($totalCredit, 2)) {
            abort(
                response()->json([
                    'message' => 'Journal entry is not balanced. Total Debit must equal Total Credit.',
                ], 422)
            );
        }
    }

    protected function ensureAccountsPostable(array $lines): void
    {
        $accountIds = [];
        foreach ($lines as $line) {
            if (!array_key_exists('QaidBodyAccID', $line)) {
                continue;
            }
            $accountIds[] = (int) $line['QaidBodyAccID'];
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
            $isFinal = (int) ($account->AccFinal ?? 0) === 1;
            $isStopped = (bool) ($account->AccStopped ?? false);

            if (!$isFinal) {
                abort(
                    response()->json([
                        'message' => 'Journal lines can only be posted to final (leaf) accounts.',
                    ], 422)
                );
            }

            if ($isStopped) {
                abort(
                    response()->json([
                        'message' => 'Journal lines cannot be posted to stopped accounts.',
                    ], 422)
                );
            }
        }
    }

    public function store(StoreJournalRequest $request)
    {
        $data = $request->validated();
        $lines = $data['lines'] ?? [];

        $this->ensureAccountsPostable($lines);
        $this->ensureBalanced($lines);

        $total = 0;
        foreach ($lines as $line) {
            $total += (float) ($line['QaidBodyD1'] ?? 0);
        }

        return DB::transaction(function () use ($data, $lines, $total) {
            DB::table('tblqaid')->insert([
                'QaidCode' => $data['QaidCode'],
                'QaidType' => $data['QaidType'],
                'QaidRef' => $data['QaidRef'] ?? null,
                'QaidDate' => $data['QaidDate'],
                'QaidDetails' => $data['QaidDetails'] ?? null,
                'QaidTotal' => $total,
                'QaidStatus' => $data['QaidStatus'],
            ]);

            foreach ($lines as $line) {
                DB::table('tblqaidbody')->insert([
                    'QaidCode' => $data['QaidCode'],
                    'QaidBodyAccID' => $line['QaidBodyAccID'],
                    'QaidBodyM1' => $line['QaidBodyM1'],
                    'QaidBodyD1' => $line['QaidBodyD1'],
                    'idName' => $line['idName'] ?? null,
                    'NameDetails' => $line['NameDetails'] ?? null,
                    'QaidBodyDetails' => $line['QaidBodyDetails'] ?? null,
                    'copCode' => $line['copCode'] ?? null,
                ]);
            }

            return response()->json([
                'success' => true,
                'message' => 'Journal entry created successfully.',
            ]);
        });
    }

    public function update(UpdateJournalRequest $request, string $qaidCode)
    {
        $header = DB::table('tblqaid')->where('QaidCode', $qaidCode)->first();
        if (!$header) {
            return response()->json(['message' => 'Journal entry not found.'], 404);
        }

        if ($header->QaidStatus === 'Post' || $header->QaidStatus === 'Posted') {
            return response()->json(['message' => 'Posted journal entries cannot be edited.'], 422);
        }

        $data = $request->validated();
        $lines = $data['lines'] ?? [];

        $this->ensureAccountsPostable($lines);
        $this->ensureBalanced($lines);

        $total = 0;
        foreach ($lines as $line) {
            $total += (float) ($line['QaidBodyD1'] ?? 0);
        }

        return DB::transaction(function () use ($qaidCode, $data, $lines, $total) {
            DB::table('tblqaid')
                ->where('QaidCode', $qaidCode)
                ->update([
                    'QaidType' => $data['QaidType'],
                    'QaidRef' => $data['QaidRef'] ?? null,
                    'QaidDate' => $data['QaidDate'],
                    'QaidDetails' => $data['QaidDetails'] ?? null,
                    'QaidTotal' => $total,
                    'QaidStatus' => $data['QaidStatus'],
                ]);

            DB::table('tblqaidbody')->where('QaidCode', $qaidCode)->delete();

            foreach ($lines as $line) {
                DB::table('tblqaidbody')->insert([
                    'QaidCode' => $qaidCode,
                    'QaidBodyAccID' => $line['QaidBodyAccID'],
                    'QaidBodyM1' => $line['QaidBodyM1'],
                    'QaidBodyD1' => $line['QaidBodyD1'],
                    'idName' => $line['idName'] ?? null,
                    'NameDetails' => $line['NameDetails'] ?? null,
                    'QaidBodyDetails' => $line['QaidBodyDetails'] ?? null,
                    'copCode' => $line['copCode'] ?? null,
                ]);
            }

            return response()->json([
                'success' => true,
                'message' => 'Journal entry updated successfully.',
            ]);
        });
    }

    public function destroy(string $qaidCode)
    {
        $header = DB::table('tblqaid')->where('QaidCode', $qaidCode)->first();
        if (!$header) {
            return response()->json(['message' => 'Journal entry not found.'], 404);
        }

        if ($header->QaidStatus === 'Post' || $header->QaidStatus === 'Posted') {
            return response()->json(['message' => 'Posted journal entries cannot be deleted.'], 422);
        }

        return DB::transaction(function () use ($qaidCode) {
            DB::table('tblqaidbody')->where('QaidCode', $qaidCode)->delete();
            DB::table('tblqaid')->where('QaidCode', $qaidCode)->delete();

            return response()->json([
                'success' => true,
                'message' => 'Journal entry deleted successfully.',
            ]);
        });
    }
}
