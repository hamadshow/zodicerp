<?php

/*
 * POSTING DIAGNOSTIC RUNNER.
 *
 * Uses the REAL application logic only:
 *  - per-journal matrix: FiscalPeriodService::validatePostingDate() (exactly what postAll runs)
 *  - bulk post: JournalController::postAll() via an actual authenticated request
 *
 * Run:  php artisan tinker --execute="require 'scripts/posting_diagnostic.php';"
 */

use App\Http\Controllers\Backend\Accounting\JournalController;
use App\Models\User;
use App\Services\Accounting\FiscalPeriodService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

$companyId = 1;

$user = User::where('company_id', $companyId)->where('role', 'admin')->first();
if (! $user) {
    $user = User::where('company_id', $companyId)->first();
}
auth()->login($user);
echo 'ACTING AS: user id='.$user->id.' company='.$user->company_id.' role='.$user->role.PHP_EOL;

$journals = DB::table('journal_entries')
    ->where('company_id', $companyId)
    ->orderBy('id')
    ->get(['id', 'entry_code', 'company_id', 'date', 'status']);

$service = app(FiscalPeriodService::class);

// Grouped counters.
$failReasons = [];
$matrix = [];

foreach ($journals as $j) {
    $result = [
        'id' => $j->id,
        'code' => $j->entry_code,
        'company_id' => $j->company_id,
        'date' => $j->date,
        'status' => $j->status,
        'outcome' => 'PASS',
        'stage' => '',
        'error' => '',
        'period_id' => null,
        'period_start' => null,
        'period_end' => null,
        'period_status' => null,
    ];

    try {
        $service->validatePostingDate((string) $j->date);
    } catch (\Throwable $e) {
        $result['outcome'] = 'FAIL';
        $result['stage'] = 'fiscal_period_validation';
        $result['error'] = $e->getMessage();

        // Independent DB lookup for WHY, using the same columns the service uses.
        $why = DB::table('accounting_periods as ap')
            ->join('fiscal_years as fy', 'fy.id', '=', 'ap.fiscal_year_id')
            ->where('fy.company_id', $j->company_id)
            ->where('ap.start_date', '<=', substr((string) $j->date, 0, 10))
            ->where('ap.end_date', '>=', substr((string) $j->date, 0, 10))
            ->first(['ap.id', 'ap.start_date', 'ap.end_date', 'ap.status', 'fy.company_id']);

        if ($why) {
            $result['period_id'] = $why->id;
            $result['period_start'] = $why->start_date;
            $result['period_end'] = $why->end_date;
            $result['period_status'] = $why->status;
            $failReasons[$why->status === 'open' ? 'period_open_but_rejected(other)' : 'period_exists_but_status_'.$why->status] = ($failReasons[$why->status === 'open' ? 'period_open_but_rejected(other)' : 'period_exists_but_status_'.$why->status] ?? 0) + 1;
        } else {
            $failReasons['no_matching_period_for_date'] = ($failReasons['no_matching_period_for_date'] ?? 0) + 1;
        }
    }

    $matrix[] = $result;
}

// ---- Print matrix (compact per-line) ----
echo PHP_EOL.'=== RESULT MATRIX ==='.PHP_EOL;
foreach ($matrix as $m) {
    echo sprintf(
        '%s | %s | %s | %s | %s | %s | %s | %s',
        str_pad((string) $m['id'], 3),
        $m['code'],
        $m['date'],
        $m['status'],
        $m['outcome'],
        $m['stage'] ?: '-',
        $m['period_id'] ? ('period#'.$m['period_id'].' '.$m['period_start'].'→'.$m['period_end'].' ('.$m['period_status'].')') : 'no-period',
        substr($m['error'], 0, 70)
    ).PHP_EOL;
}

// ---- Grouped patterns ----
$byMonth = [];
foreach ($matrix as $m) {
    $key = ($m['outcome'] === 'PASS' ? 'PASS' : 'FAIL:'.($m['stage'] ?: 'unknown')).'|'.substr($m['date'], 0, 7);
    $byMonth[$key] = ($byMonth[$key] ?? 0) + 1;
}
echo PHP_EOL.'=== GROUPED: outcome x month ==='.PHP_EOL;
ksort($byMonth);
foreach ($byMonth as $k => $v) {
    echo "$k => $v".PHP_EOL;
}

echo PHP_EOL.'=== FAILURE REASONS (independent lookup) ==='.PHP_EOL;
foreach ($failReasons as $k => $v) {
    echo "$k => $v".PHP_EOL;
}

$pass = count(array_filter($matrix, fn ($m) => $m['outcome'] === 'PASS'));
echo PHP_EOL.sprintf('SUMMARY: total=%d pass=%d fail=%d', count($matrix), $pass, count($matrix) - $pass).PHP_EOL;
