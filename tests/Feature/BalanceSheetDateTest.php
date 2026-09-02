<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class BalanceSheetDateTest extends TestCase
{
    private int $companyId = 1;

    protected function setUp(): void
    {
        parent::setUp();

        if (DB::connection()->getDriverName() === 'sqlite') {
            $this->markTestSkipped('This test requires a MySQL database (SQLite in-memory cannot run full middleware stack).');
        }

        // Clean test data from previous runs
        DB::table('journal_entry_lines')->where('company_id', $this->companyId)->delete();
        DB::table('journal_entries')->where('company_id', $this->companyId)->delete();

        // Seed accounts if they don't exist
        $cashExists = DB::table('accounts')->where('AccID', 1001)->where('company_id', $this->companyId)->exists();
        if (!$cashExists) {
            DB::table('accounts')->insert([
                ['AccID' => 1001, 'AccCode' => '1001', 'AccName' => 'Cash', 'AccType' => 1, 'AccParent' => null, 'AccFinal' => 0, 'company_id' => $this->companyId],
                ['AccID' => 2001, 'AccCode' => '2001', 'AccName' => 'Accounts Payable', 'AccType' => 2, 'AccParent' => null, 'AccFinal' => 0, 'company_id' => $this->companyId],
                ['AccID' => 3001, 'AccCode' => '3001', 'AccName' => 'Owner Equity', 'AccType' => 3, 'AccParent' => null, 'AccFinal' => 0, 'company_id' => $this->companyId],
            ]);
        }
    }

    private function createJournalEntry(string $code, string $date, string $status, array $lines): void
    {
        DB::table('journal_entries')->insert([
            'entry_code' => $code,
            'description' => "Journal {$code}",
            'date' => $date,
            'status' => $status,
            'company_id' => $this->companyId,
        ]);

        foreach ($lines as $line) {
            DB::table('journal_entry_lines')->insert([
                'journal_entry_code' => $code,
                'account_id' => $line['account_id'],
                'debit' => $line['debit'] ?? 0,
                'credit' => $line['credit'] ?? 0,
                'company_id' => $this->companyId,
            ]);
        }
    }

    private function actingAsAdmin(): void
    {
        $user = User::firstOrCreate(
            ['email' => 'admin-bs-test@zodicerp-test.com'],
            [
                'username' => 'admin-bs-test',
                'password' => bcrypt('password'),
                'role' => 'admin',
                'company_id' => $this->companyId,
            ]
        );

        $this->actingAs($user, 'sanctum');
    }

    // ========================================
    // DATE FILTERING TESTS
    // ========================================

    /** @test */
    public function balance_sheet_excludes_entries_after_as_of_date()
    {
        $this->actingAsAdmin();

        $this->createJournalEntry('QID-10001', '2026-01-15', 'Post', [
            ['account_id' => 1001, 'debit' => 5000, 'credit' => 0],
            ['account_id' => 3001, 'debit' => 0, 'credit' => 5000],
        ]);

        $this->createJournalEntry('QID-10002', '2026-12-31', 'Post', [
            ['account_id' => 1001, 'debit' => 500, 'credit' => 0],
            ['account_id' => 3001, 'debit' => 0, 'credit' => 500],
        ]);

        $response = $this->getJson('/api/reports/balance-sheet?date=2026-06-30');
        $response->assertStatus(200);
        $data = $response->json('main');

        $cashAccount = collect($data['assets'])->firstWhere('AccCode', '1001');
        $this->assertNotNull($cashAccount);
        $this->assertEqualsWithDelta(5000, $cashAccount['balance'], 0.01, 'Balance Sheet as of 2026-06-30 should not include 2026-12-31 entry');
    }

    /** @test */
    public function balance_sheet_includes_all_posted_entries_before_as_of_date()
    {
        $this->actingAsAdmin();

        $this->createJournalEntry('QID-10001', '2026-01-15', 'Post', [
            ['account_id' => 1001, 'debit' => 5000, 'credit' => 0],
            ['account_id' => 3001, 'debit' => 0, 'credit' => 5000],
        ]);

        $this->createJournalEntry('QID-10002', '2026-03-01', 'Post', [
            ['account_id' => 1001, 'debit' => 0, 'credit' => 2000],
            ['account_id' => 2001, 'debit' => 2000, 'credit' => 0],
        ]);

        $response = $this->getJson('/api/reports/balance-sheet?date=2026-06-30');
        $response->assertStatus(200);
        $data = $response->json('main');

        $cashAccount = collect($data['assets'])->firstWhere('AccCode', '1001');
        $this->assertNotNull($cashAccount);
        $this->assertEqualsWithDelta(3000, $cashAccount['balance'], 0.01);
    }

    /** @test */
    public function balance_sheet_excludes_unposted_entries()
    {
        $this->actingAsAdmin();

        $this->createJournalEntry('QID-10001', '2026-01-15', 'Post', [
            ['account_id' => 1001, 'debit' => 5000, 'credit' => 0],
            ['account_id' => 3001, 'debit' => 0, 'credit' => 5000],
        ]);

        $this->createJournalEntry('QID-10002', '2026-03-01', 'Post', [
            ['account_id' => 1001, 'debit' => 0, 'credit' => 2000],
            ['account_id' => 2001, 'debit' => 2000, 'credit' => 0],
        ]);

        $this->createJournalEntry('QID-10003', '2026-05-01', 'UnPost', [
            ['account_id' => 1001, 'debit' => 1000, 'credit' => 0],
            ['account_id' => 2001, 'debit' => 0, 'credit' => 1000],
        ]);

        $response = $this->getJson('/api/reports/balance-sheet?date=2026-06-30');
        $response->assertStatus(200);
        $data = $response->json('main');

        $cashAccount = collect($data['assets'])->firstWhere('AccCode', '1001');
        $this->assertNotNull($cashAccount);
        $this->assertEqualsWithDelta(3000, $cashAccount['balance'], 0.01, 'Unposted entries should be excluded from Balance Sheet');
    }

    /** @test */
    public function balance_sheet_with_posted_unposted_then_posted_sequence()
    {
        $this->actingAsAdmin();

        $this->createJournalEntry('QID-10001', '2026-01-15', 'Post', [
            ['account_id' => 1001, 'debit' => 5000, 'credit' => 0],
            ['account_id' => 3001, 'debit' => 0, 'credit' => 5000],
        ]);

        $this->createJournalEntry('QID-10002', '2026-03-01', 'Post', [
            ['account_id' => 1001, 'debit' => 0, 'credit' => 2000],
            ['account_id' => 2001, 'debit' => 2000, 'credit' => 0],
        ]);

        $this->createJournalEntry('QID-10003', '2026-06-01', 'UnPost', [
            ['account_id' => 1001, 'debit' => 1000, 'credit' => 0],
            ['account_id' => 2001, 'debit' => 0, 'credit' => 1000],
        ]);

        $this->createJournalEntry('QID-10004', '2026-12-31', 'Post', [
            ['account_id' => 1001, 'debit' => 500, 'credit' => 0],
            ['account_id' => 3001, 'debit' => 0, 'credit' => 500],
        ]);

        // As of 2026-05-31: Cash = 5000 - 2000 = 3000
        $response1 = $this->getJson('/api/reports/balance-sheet?date=2026-05-31');
        $response1->assertStatus(200);
        $cash1 = collect($response1->json('main.assets'))->firstWhere('AccCode', '1001');
        $this->assertEqualsWithDelta(3000, $cash1['balance'], 0.01, 'As of 2026-05-31 should be 3000');

        // As of 2026-06-30: Cash = 3000 (QID-10003 is unposted)
        $response2 = $this->getJson('/api/reports/balance-sheet?date=2026-06-30');
        $response2->assertStatus(200);
        $cash2 = collect($response2->json('main.assets'))->firstWhere('AccCode', '1001');
        $this->assertEqualsWithDelta(3000, $cash2['balance'], 0.01, 'As of 2026-06-30 should be 3000 (unposted excluded)');

        // As of 2026-12-31: Cash = 5000 - 2000 + 500 = 3500
        $response3 = $this->getJson('/api/reports/balance-sheet?date=2026-12-31');
        $response3->assertStatus(200);
        $cash3 = collect($response3->json('main.assets'))->firstWhere('AccCode', '1001');
        $this->assertEqualsWithDelta(3500, $cash3['balance'], 0.01, 'As of 2026-12-31 should be 3500');
    }

    /** @test */
    public function balance_sheet_individual_account_balances_are_correct()
    {
        $this->actingAsAdmin();

        $this->createJournalEntry('QID-10001', '2026-01-15', 'Post', [
            ['account_id' => 1001, 'debit' => 10000, 'credit' => 0],
            ['account_id' => 3001, 'debit' => 0, 'credit' => 10000],
        ]);

        $this->createJournalEntry('QID-10002', '2026-03-01', 'Post', [
            ['account_id' => 1001, 'debit' => 0, 'credit' => 3000],
            ['account_id' => 2001, 'debit' => 3000, 'credit' => 0],
        ]);

        $response = $this->getJson('/api/reports/balance-sheet?date=2026-06-30');
        $response->assertStatus(200);
        $data = $response->json('main');

        $cashAccount = collect($data['assets'])->firstWhere('AccCode', '1001');
        $this->assertEqualsWithDelta(7000, $cashAccount['balance'], 0.01);

        $apAccount = collect($data['liabilities'])->firstWhere('AccCode', '2001');
        $this->assertEqualsWithDelta(3000, $apAccount['balance'], 0.01);

        $equityAccount = collect($data['equity'])->firstWhere('AccCode', '3001');
        $this->assertEqualsWithDelta(10000, $equityAccount['balance'], 0.01);
    }

    /** @test */
    public function balance_sheet_opening_comparison_uses_year_start()
    {
        $this->actingAsAdmin();

        $this->createJournalEntry('QID-10001', '2026-01-15', 'Post', [
            ['account_id' => 1001, 'debit' => 5000, 'credit' => 0],
            ['account_id' => 3001, 'debit' => 0, 'credit' => 5000],
        ]);

        $this->createJournalEntry('QID-10002', '2026-06-01', 'Post', [
            ['account_id' => 1001, 'debit' => 2000, 'credit' => 0],
            ['account_id' => 3001, 'debit' => 0, 'credit' => 2000],
        ]);

        $response = $this->getJson('/api/reports/balance-sheet?date=2026-12-31&compare_to_opening=true');
        $response->assertStatus(200);
        $data = $response->json();

        $mainCash = collect($data['main']['assets'])->firstWhere('AccCode', '1001');
        $this->assertEqualsWithDelta(7000, $mainCash['balance'], 0.01);

        $compCash = collect($data['comparison']['assets'])->firstWhere('AccCode', '1001');
        $this->assertEqualsWithDelta(0, $compCash['balance'], 0.01, 'Opening comparison at 2026-01-01 should be 0');
    }

    /** @test */
    public function balance_sheet_future_dated_entry_excluded_from_current_date()
    {
        $this->actingAsAdmin();

        $this->createJournalEntry('QID-10001', '2026-01-15', 'Post', [
            ['account_id' => 1001, 'debit' => 5000, 'credit' => 0],
            ['account_id' => 3001, 'debit' => 0, 'credit' => 5000],
        ]);

        $this->createJournalEntry('QID-10002', '2027-01-01', 'Post', [
            ['account_id' => 1001, 'debit' => 99999, 'credit' => 0],
            ['account_id' => 3001, 'debit' => 0, 'credit' => 99999],
        ]);

        $response = $this->getJson('/api/reports/balance-sheet?date=2026-12-31');
        $response->assertStatus(200);
        $cashAccount = collect($response->json('main.assets'))->firstWhere('AccCode', '1001');
        $this->assertEqualsWithDelta(5000, $cashAccount['balance'], 0.01, 'Future dated entry should not appear in current balance sheet');
    }
}
