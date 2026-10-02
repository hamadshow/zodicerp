<?php

namespace Tests\Feature;

use App\Http\Controllers\Backend\Accounting\FinancialReportController;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Balance Sheet equilibrium regression tests.
 *
 * Root cause fixed here: fetchBalanceSheetData() looked up journal activity
 * with `get($id) ?? get($code)` — the $code fallback collided with AccID
 * (equity root '3' pulled in AccID=3 = cash 1001), inflating Assets and
 * deflating Equity. Additionally, net income (P&L accounts 4/5/6) was never
 * added to Equity, so the sheet could never balance on an unclosed ledger.
 *
 * Fix: AccID-only lookup + net income (income − cogs − expenses) added to
 * total_equity. These tests pin both properties.
 */
class BalanceSheetEquilibriumTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        if (config('database.default') !== 'mysql') {
            $this->markTestSkipped('Requires MySQL/MariaDB');
        }
    }

    private function fetchSheet(string $date): array
    {
        $request = Request::create('/api/reports/balance-sheet', 'GET', ['date' => $date]);
        $request->setUserResolver(fn () => User::first());

        $payload = json_decode(
            app(FinancialReportController::class)->getBalanceSheetData($request)->getContent(),
            true
        );

        return $payload['main'] ?? $payload;
    }

    private function totals(array $sheet): array
    {
        return [
            'assets' => (float) $sheet['total_assets'],
            'liabilities' => (float) $sheet['total_liabilities'],
            'equity' => (float) $sheet['total_equity'],
        ];
    }

    private function createAccount(string $suffix): array
    {
        // The balance sheet classifies accounts by AccCode prefix ('10%'/'11%'
        // assets); a fully random 8-digit code lands in random classes and
        // flakes the equation. Keep the fixture in the asset-code family.
        $code = '114'.(string) random_int(1000000, 9999999);
        $id = DB::table('accounts')->insertGetId([
            'AccCode' => $code,
            'AccName' => 'JEBST-TMP-'.$suffix.'-'.uniqid(),
            'AccType' => 1,
            'AccParent' => null,
            'AccDmType' => 1,
            'AccFinal' => 1,
            'Nature' => 'asset',
            'AccStopped' => 0,
            'company_id' => 1,
        ]);

        return ['id' => (int) $id, 'code' => $code];
    }

    public function test_balance_sheet_equation_holds(): void
    {
        $sheet = $this->fetchSheet('2025-12-31');
        $t = $this->totals($sheet);

        // The equation must hold exactly on the corrected dataset.
        $this->assertEqualsWithDelta(
            0.0,
            $t['assets'] - $t['liabilities'] - $t['equity'],
            0.01,
            'Assets must equal Liabilities + Equity (incl. net income).'
        );

        // Net income must be present and equal to the P&L ledger content.
        $expected = DB::selectOne(
            "SELECT
                SUM(CASE WHEN a.AccCode LIKE '4%' THEN l.credit - l.debit ELSE 0 END)
              - SUM(CASE WHEN a.AccCode LIKE '5%' THEN l.debit - l.credit ELSE 0 END)
              - SUM(CASE WHEN a.AccCode LIKE '6%' THEN l.debit - l.credit ELSE 0 END) AS ni
             FROM journal_entry_lines l
             JOIN journal_entries e ON e.entry_code = l.journal_entry_code
             JOIN accounts a ON a.AccID = l.account_id
             WHERE e.status IN ('Post','posted') AND e.date <= '2025-12-31' AND a.company_id = 1"
        )->ni ?? 0.0;

        $this->assertEqualsWithDelta(
            (float) $expected,
            (float) ($sheet['net_income'] ?? 0),
            0.01,
            'Reported net income must match the P&L ledger content.'
        );
    }

    /** Self-balanced fixtures must keep the equation at zero (delta-safe). */
    public function test_self_balanced_fixture_keeps_equation(): void
    {
        $a = $this->createAccount('A');
        $b = $this->createAccount('B');

        $before = $this->totals($this->fetchSheet('2025-12-31'));

        DB::table('journal_entries')->insert([
            'entry_code' => 'JEBST-'.uniqid(),
            'entry_type' => 'Regular',
            'reference' => 'JEBST-REF-'.uniqid(),
            'date' => '2025-07-01',
            'description' => 'BS equilibrium fixture',
            'total_amount' => 7777,
            'status' => 'Post',
            'company_id' => 1,
        ]);
        $code = DB::table('journal_entries')->where('reference', 'like', 'JEBST-REF-%')->where('total_amount', 7777)->value('entry_code');
        DB::table('journal_entry_lines')->insert([
            ['journal_entry_code' => $code, 'account_id' => $a['id'], 'debit' => 7777, 'credit' => 0],
            ['journal_entry_code' => $code, 'account_id' => $b['id'], 'debit' => 0, 'credit' => 7777],
        ]);

        $after = $this->totals($this->fetchSheet('2025-12-31'));

        $this->assertEqualsWithDelta(
            0.0,
            $after['assets'] - $after['liabilities'] - $after['equity'],
            0.01,
            'A balanced fixture must keep the Balance Sheet equation at zero.'
        );
        $this->assertEqualsWithDelta(
            ($before['assets'] - $before['liabilities'] - $before['equity']),
            ($after['assets'] - $after['liabilities'] - $after['equity']),
            0.01,
            'The imbalance delta introduced by a balanced fixture must be zero.'
        );

        DB::table('journal_entry_lines')->where('journal_entry_code', $code)->delete();
        DB::table('journal_entries')->where('entry_code', $code)->delete();
        DB::table('accounts')->whereIn('AccID', [$a['id'], $b['id']])->delete();
    }

    protected function tearDown(): void
    {
        DB::table('journal_entry_lines')
            ->whereIn('journal_entry_code', function ($q) {
                $q->select('entry_code')->from('journal_entries')->where('entry_code', 'like', 'JEBST-%');
            })->delete();
        DB::table('journal_entries')->where('entry_code', 'like', 'JEBST-%')->delete();
        DB::table('accounts')->where('AccName', 'like', 'JEBST-TMP-%')->delete();

        parent::tearDown();
    }
}
