<?php

namespace App\Services\Accounting;

use App\Models\Accounting\JournalEntry;
use App\Models\Accounting\JournalEntryLine;
use App\Models\Account;
use App\Services\Accounting\PostingService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Carbon\Carbon;

/**
 * Service to handle Journal Entry Imports with high reliability and performance.
 */
class JournalImportService
{
    protected array $resolvedAccounts = [];
    protected float $balanceTolerance = 0.01;

    /**
     * Import a collection of rows (from JSON or Excel).
     * 
     * @param array $rows
     * @return array Summary of the import process.
     */
    public function importRows(array $rows): array
    {
        $summary = [
            'total' => 0,
            'imported' => 0,
            'failed' => 0,
            'skipped' => 0,
            'errors' => [],
            'warnings' => [],
        ];

        if (empty($rows)) {
            return $summary;
        }

        // 1. Pre-resolve accounts for performance
        $this->preResolveAccounts($rows);

        // 2. Group rows by entry_code
        $groups = $this->groupRowsByEntry($rows);
        $summary['total'] = count($groups);

        // 3. Process each group
        foreach ($groups as $entryCode => $entryData) {
            try {
                $result = $this->processEntry($entryCode, $entryData);
                
                if ($result['success']) {
                    $summary['imported']++;
                } else {
                    $summary['failed']++;
                    $summary['errors'][] = [
                        'entry_code' => $entryCode,
                        'message' => $result['message'],
                        'details' => $result['errors'] ?? []
                    ];
                }
                
                if (!empty($result['warnings'])) {
                    $summary['warnings'] = array_merge($summary['warnings'], $result['warnings']);
                }
            } catch (\Exception $e) {
                Log::error("Failed to process entry {$entryCode}: " . $e->getMessage());
                $summary['failed']++;
                $summary['errors'][] = [
                    'entry_code' => $entryCode,
                    'message' => "System error: " . $e->getMessage()
                ];
            }
        }

        // Clear resolved accounts to free memory
        $this->resolvedAccounts = [];

        // Sync account_postings cache if any entries were successfully imported
        if ($summary['imported'] > 0) {
            $companyId = auth()->user()?->company_id ?? 1;
            app(PostingService::class)->recalculatePostings($companyId);
        }

        return $summary;
    }

    /**
     * Process a single grouped journal entry.
     */
    protected function processEntry(string $code, array $data): array
    {
        $header = $data['header'];
        $lines = $data['lines'];

        // Basic validation
        if (empty($lines)) {
            return ['success' => false, 'message' => 'Entry has no valid lines.'];
        }

        // Balance Check
        $totalDebit = 0;
        $totalCredit = 0;
        foreach ($lines as $line) {
            $totalDebit += (float)($line['debit'] ?? 0);
            $totalCredit += (float)($line['credit'] ?? 0);
        }

        if (abs($totalDebit - $totalCredit) > $this->balanceTolerance) {
            return [
                'success' => false, 
                'message' => "Unbalanced entry (Debit: {$totalDebit}, Credit: {$totalCredit})."
            ];
        }

        $formattedDate = $this->transformDate($header['date']);
        
        if (!$formattedDate) {
            return [
                'success' => false,
                'message' => "Invalid date format: '{$header['date']}'."
            ];
        }

        return DB::transaction(function () use ($code, $header, $lines, $totalDebit, $formattedDate) {
            // Update or Create Header
            $journal = JournalEntry::updateOrCreate(
                ['entry_code' => $code],
                [
                    'entry_type'   => $header['entry_type'] ?? 'Manual',
                    'reference'    => $header['reference'] ?? null,
                    'date'         => $formattedDate,
                    'description'  => $header['header_description'] ?? $header['description'] ?? null,
                    'total_amount' => $totalDebit,
                    'status'       => $header['status'] ?? 'Unposted',
                ]
            );

            // Clear existing lines to prevent duplicates on update
            $journal->lines()->delete();

            // Prepare and insert lines
            $linesToInsert = [];
            foreach ($lines as $line) {
                $linesToInsert[] = [
                    'journal_entry_code' => $code,
                    'account_id'         => $line['account_id'],
                    'debit'              => (float)$line['debit'],
                    'credit'             => (float)$line['credit'],
                    'description'        => $line['line_description'] ?? null,
                    'related_id_name'    => $line['related_id_name'] ?? null,
                    'cost_center_code'   => $line['cost_center_code'] ?? null,
                    'created_at'         => now(),
                    'updated_at'         => now(),
                ];
            }

            if (!empty($linesToInsert)) {
                DB::table('journal_entry_lines')->insert($linesToInsert);
            }

            // Sync account_postings cache for imported journals
            // PostingService is called after transaction commits in importRows()
            return ['success' => true, 'entry_code' => $code];
        });
    }

    /**
     * Group flat rows into header + lines structure.
     */
    protected function groupRowsByEntry(array $rows): array
    {
        $groups = [];
        foreach ($rows as $row) {
            $code = trim($row['entry_code'] ?? '');
            if (!$code) continue;

            if (!isset($groups[$code])) {
                $groups[$code] = [
                    'header' => $row, // First row defines the header
                    'lines' => []
                ];
            }

            // Resolve Account
            $rawAcc = trim((string)($row['account_id'] ?? ''));
            $account = $this->resolvedAccounts[$rawAcc] ?? null;

            if ($account && !$account->AccStopped) {
                $groups[$code]['lines'][] = array_merge($row, [
                    'account_id' => $account->AccID
                ]);
            }
        }
        return $groups;
    }

    /**
     * Pre-fetch all accounts mentioned in the import to avoid N+1.
     */
    protected function preResolveAccounts(array $rows): void
    {
        $identifiers = array_unique(array_filter(array_column($rows, 'account_id')));
        if (empty($identifiers)) return;

        $accounts = DB::table('accounts')
            ->whereIn('AccID', $identifiers)
            ->orWhereIn('AccCode', $identifiers)
            ->orWhereIn('AccName', $identifiers)
            ->get(['AccID', 'AccCode', 'AccName', 'AccStopped']);

        foreach ($accounts as $acc) {
            $this->resolvedAccounts[trim((string)$acc->AccID)] = $acc;
            $this->resolvedAccounts[trim((string)$acc->AccCode)] = $acc;
            $this->resolvedAccounts[trim((string)$acc->AccName)] = $acc;
        }
    }

    /**
     * Safe date transformation.
     */
    public function transformDate($value): ?string
    {
        if (empty($value)) return null;
        
        // If it's already a Carbon or DateTime object
        if ($value instanceof \DateTimeInterface) {
            return $value->format('Y-m-d');
        }

        try {
            $val = trim((string)$value);

            // Handle numeric values (Excel serials)
            if (is_numeric($val) && (float)$val > 10000 && (float)$val < 100000) {
                return \PhpOffice\PhpSpreadsheet\Shared\Date::excelToDateTimeObject($val)->format('Y-m-d');
            }

            // Handle DD/MM/YYYY or DD-MM-YYYY or MM/DD/YYYY
            // Use regex for precise extraction before Carbon
            if (preg_match('/^(\d{1,2})[\/\- ](\d{1,2})[\/\- ](\d{2,4})$/', $val, $matches)) {
                $p1 = (int)$matches[1];
                $p2 = (int)$matches[2];
                $year = (int)$matches[3];

                if ($year < 100) $year += 2000;

                // Case 1: dd/mm/yyyy (p1 <= 31, p2 <= 12)
                // Case 2: mm/dd/yyyy (p1 <= 12, p2 <= 31)
                // We prefer dd/mm/yyyy as per user requirements
                
                // If p1 > 12, it must be dd/mm/yyyy
                if ($p1 > 12) {
                    return sprintf("%04d-%02d-%02d", $year, $p2, $p1);
                }
                
                // If p2 > 12, it must be mm/dd/yyyy
                if ($p2 > 12) {
                    return sprintf("%04d-%02d-%02d", $year, $p1, $p2);
                }

                // If both are <= 12, default to dd/mm/yyyy
                return sprintf("%04d-%02d-%02d", $year, $p2, $p1);
            }

            // Handle YYYY-MM-DD
            if (preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $val, $matches)) {
                $y = (int)$matches[1];
                $m = (int)$matches[2];
                $d = (int)$matches[3];
                if (checkdate($m, $d, $y)) {
                    return $val;
                }
            }

            // Try common formats as fallback
            $formats = ['d/m/Y', 'd-m-Y', 'Y/m/d', 'm/d/Y', 'Y-m-d'];
            foreach ($formats as $format) {
                try {
                    $d = Carbon::createFromFormat($format, $val);
                    if ($d->year < 100) $d->year += 2000;
                    if ($d->year > 1970) {
                        return $d->format('Y-m-d');
                    }
                } catch (\Exception $e) {
                    continue;
                }
            }
            
            // Last resort: Carbon::parse
            $parsed = Carbon::parse($val);
            if ($parsed->year < 100) $parsed->year += 2000;
            if ($parsed->year > 1970) {
                return $parsed->format('Y-m-d');
            }
            
            return null;
        } catch (\Exception $e) {
            Log::warning("Date transformation failed for '{$value}': " . $e->getMessage());
            return null;
        }
    }
}
