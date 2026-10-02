<?php

namespace Tests\Feature;

use App\Http\Controllers\Backend\Accounting\FinancialReportController;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Profit & Loss report regression tests.
 *
 * Root cause fixed alongside these tests: fetchProfitLossData() looked journal
 * activity up with `get($id) ?? get($code)`. $activity is keyed by
 * journal_entry_lines.account_id (= accounts.AccID), and PHP normalizes
 * numeric-string collection keys to ints — so for a P&L root whose AccCode is
 * '5' (AccID 154) the $code fallback resolved to the activity of the unrelated
 * AccID=5 account, inflating COGS ('6' inflated Expenses the same way) and
 * corrupting gross/net profit. fetchBalanceSheetData() had already dropped the
 * identical fallback (BalanceSheetEquilibriumTest pins that); the tests below
 * pin the same property for the Profit & Loss report.
 */
class ProfitLossReportTest extends TestCase
{
    private const COMPANY_ID = 1;
    private const ENTRY_PREFIX = 'PLTEST-';
    private const ACCOUNT_PREFIX = 'PLTEST-TMP-';

    // Explicit, collision-proof IDs. accounts.AccCode is an INT column that the
    // report uses as the account key, so the P&L expenses root's code
    // deliberately equals the decoy (non-P&L) account's AccID: that equality is
    // exactly the collision the removed fallback used to exploit.
    private const PNL_EXPENSE_ID = 600002;      // P&L expenses root
    private const PNL_EXPENSE_CODE = '600001';  // starts with '6' => in the report
    private const DECOY_ACCOUNT_ID = 600001;    // code 900001 => NOT in the report
    private const OFFSET_ACCOUNT_ID = 600003;   // code 900003 => NOT in the report
    private const PNL_INCOME_ID = 600004;       // P&L income root
    private const PNL_INCOME_CODE = '400002';   // starts with '4' => in the report

    protected function setUp(): void
    {
        parent::setUp();

        if (config('database.default') !== 'mysql') {
            $this->markTestSkipped('Requires MySQL/MariaDB');
        }

        $this->cleanFixtures();
    }

    protected function tearDown(): void
    {
        $this->cleanFixtures();

        parent::tearDown();
    }

    private function cleanFixtures(): void
    {
        DB::table('journal_entry_lines')
            ->whereIn('journal_entry_code', function ($query) {
                $query->select('entry_code')
                    ->from('journal_entries')
                    ->where('entry_code', 'like', self::ENTRY_PREFIX.'%');
            })
            ->delete();

        DB::table('journal_entries')
            ->where('entry_code', 'like', self::ENTRY_PREFIX.'%')
            ->delete();

        DB::table('accounts')
            ->whereIn('AccID', [
                self::PNL_EXPENSE_ID,
                self::DECOY_ACCOUNT_ID,
                self::OFFSET_ACCOUNT_ID,
                self::PNL_INCOME_ID,
            ])
            ->delete();
    }

    private function actingUser(): User
    {
        return User::firstOrCreate(
            ['email' => 'admin-pl-test@zodicerp-test.com'],
            [
                'username' => 'admin-pl-test',
                'password' => bcrypt('password'),
                'role' => 'admin',
                'company_id' => self::COMPANY_ID,
            ]
        );
    }

    private function fetchProfitLoss(string $start, string $end): array
    {
        $request = Request::create('/api/reports/profit-loss', 'GET', [
            'start_date' => $start,
            'end_date' => $end,
        ]);
        $request->setUserResolver(fn () => $this->actingUser());

        $payload = json_decode(
            app(FinancialReportController::class)->getProfitLossData($request)->getContent(),
            true
        );

        return $payload['main'] ?? $payload;
    }

    /** Seed the four fixture accounts: two P&L roots plus the decoy pair. */
    private function seedAccounts(): void
    {
        DB::table('accounts')->insert([
            [
                'AccID' => self::PNL_EXPENSE_ID,
                'AccCode' => self::PNL_EXPENSE_CODE,
                'AccName' => self::ACCOUNT_PREFIX.'EXPENSES-ROOT',
                'AccType' => 0,
                'AccParent' => null,
                'AccFinal' => 0,
                'Nature' => 'expenses',
                'AccStopped' => 0,
                'company_id' => self::COMPANY_ID,
            ],
            [
                'AccID' => self::DECOY_ACCOUNT_ID,
                'AccCode' => '900001',
                'AccName' => self::ACCOUNT_PREFIX.'DECOY-ASSET',
                'AccType' => 1,
                'AccParent' => null,
                'AccFinal' => 1,
                'Nature' => 'asset',
                'AccStopped' => 0,
                'company_id' => self::COMPANY_ID,
            ],
            [
                'AccID' => self::OFFSET_ACCOUNT_ID,
                'AccCode' => '900003',
                'AccName' => self::ACCOUNT_PREFIX.'OFFSET-ASSET',
                'AccType' => 1,
                'AccParent' => null,
                'AccFinal' => 1,
                'Nature' => 'asset',
                'AccStopped' => 0,
                'company_id' => self::COMPANY_ID,
            ],
            [
                'AccID' => self::PNL_INCOME_ID,
                'AccCode' => self::PNL_INCOME_CODE,
                'AccName' => self::ACCOUNT_PREFIX.'INCOME-ROOT',
                'AccType' => 0,
                'AccParent' => null,
                'AccFinal' => 0,
                'Nature' => 'income',
                'AccStopped' => 0,
                'company_id' => self::COMPANY_ID,
            ],
        ]);
    }

    /** Post a POSTED, self-balanced entry touching only the given accounts. */
    private function postEntry(string $date, int $debitAccountId, int $creditAccountId, float $amount): void
    {
        $entryCode = self::ENTRY_PREFIX.uniqid();

        DB::table('journal_entries')->insert([
            'entry_code' => $entryCode,
            'entry_type' => 'Regular',
            'reference' => self::ENTRY_PREFIX.'REF-'.uniqid(),
            'date' => $date,
            'description' => 'P&L report fixture',
            'total_amount' => $amount,
            'status' => 'Post',
            'company_id' => self::COMPANY_ID,
        ]);

        DB::table('journal_entry_lines')->insert([
            [
                'journal_entry_code' => $entryCode,
                'account_id' => $debitAccountId,
                'debit' => $amount,
                'credit' => 0,
                'company_id' => self::COMPANY_ID,
            ],
            [
                'journal_entry_code' => $entryCode,
                'account_id' => $creditAccountId,
                'debit' => 0,
                'credit' => $amount,
                'company_id' => self::COMPANY_ID,
            ],
        ]);
    }

    /**
     * The route must return the HTTP contract the Profit&Loss.jsx page consumes.
     */
    public function test_profit_loss_endpoint_returns_expected_shape(): void
    {
        $response = $this->actingAs($this->actingUser(), 'sanctum')
            ->getJson('/api/reports/profit-loss?start_date=2025-01-01&end_date=2025-12-31');

        $response->assertStatus(200);

        $data = $response->json('main');

        $this->assertIsArray($data['income']);
        $this->assertIsArray($data['cogs']);
        $this->assertIsArray($data['expenses']);

        foreach (['total_income', 'total_cogs', 'total_expenses', 'gross_profit', 'net_income'] as $key) {
            $this->assertArrayHasKey($key, $data);
            $this->assertIsNumeric($data[$key]);
        }

        $this->assertEqualsWithDelta(
            $data['total_income'] - $data['total_cogs'],
            $data['gross_profit'],
            0.01,
            'Gross profit must equal total income minus total COGS.'
        );

        $this->assertEqualsWithDelta(
            $data['gross_profit'] - $data['total_expenses'],
            $data['net_income'],
            0.01,
            'Net income must equal gross profit minus total expenses.'
        );
    }

    /**
     * Regression: activity booked on a NON-P&L account must never reach the
     * P&L, even when its AccID numerically equals a P&L root's AccCode.
     */
    public function test_profit_loss_ignores_foreign_account_activity(): void
    {
        $this->seedAccounts();

        $before = $this->fetchProfitLoss('2025-01-01', '2025-12-31');

        // Balanced entry that touches ONLY non-P&L accounts. With the removed
        // `get($code)` fallback, the expenses root (AccCode '600001') resolved
        // to the decoy's AccID 600001 and total_expenses was inflated by 6,000.
        $this->postEntry('2025-07-01', self::DECOY_ACCOUNT_ID, self::OFFSET_ACCOUNT_ID, 6000);

        $after = $this->fetchProfitLoss('2025-01-01', '2025-12-31');

        $this->assertEqualsWithDelta(
            (float) $before['total_expenses'],
            (float) $after['total_expenses'],
            0.01,
            'Activity on a non-P&L account must never leak into P&L expenses.'
        );

        $this->assertEqualsWithDelta(
            (float) $before['net_income'],
            (float) $after['net_income'],
            0.01,
            'A balanced entry on non-P&L accounts must not change net income.'
        );
    }

    /**
     * The period filter must be the only thing deciding which activity counts:
     * an entry dated outside the range is excluded, and the very same entry is
     * included once the range covers its date.
     */
    public function test_profit_loss_respects_the_period_filter(): void
    {
        $this->seedAccounts();

        $beforeCurrent = $this->fetchProfitLoss('2025-01-01', '2025-12-31');
        $beforeFuture = $this->fetchProfitLoss('2026-01-01', '2026-12-31');

        // Credit the income root so the movement is a genuine P&L movement.
        $this->postEntry('2026-01-15', self::OFFSET_ACCOUNT_ID, self::PNL_INCOME_ID, 4321);

        $afterCurrent = $this->fetchProfitLoss('2025-01-01', '2025-12-31');
        $afterFuture = $this->fetchProfitLoss('2026-01-01', '2026-12-31');

        $this->assertEqualsWithDelta(
            (float) $beforeCurrent['total_income'],
            (float) $afterCurrent['total_income'],
            0.01,
            'An entry dated after end_date must not appear in the period totals.'
        );

        $this->assertEqualsWithDelta(
            (float) $beforeFuture['total_income'] + 4321,
            (float) $afterFuture['total_income'],
            0.01,
            'The same entry must be included once the period covers its date.'
        );
    }
}
