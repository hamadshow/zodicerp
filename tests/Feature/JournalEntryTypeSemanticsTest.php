<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Canonical entry_type semantics for journal_entries:
 *
 *   Opening = opening balance / opening entry only
 *   Regular = normal transaction occurring during the fiscal year
 *
 * Domain types (SalesInvoice, SupplierPayment, CustomerReceipt,
 * PurchaseInvoice, ...) are the existing classification of normal in-year
 * entries created by their modules and are verified here NOT to have been
 * repointed to 'Regular' (create/lookup coupling would break otherwise).
 *
 * The API create path (JournalController@store) has no entry_type in its
 * validation contract — StoreJournalRequest drops it — so the controller
 * default defines the semantics of every manual/API entry. That default is
 * asserted to be 'Regular' (previously 'Manual').
 *
 * These tests run against the application database and clean up after
 * themselves (same pattern as AccountDmTypeUpdateTest).
 */
class JournalEntryTypeSemanticsTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        if (config('database.default') !== 'mysql') {
            $this->markTestSkipped('Requires MySQL/MariaDB');
        }
    }

    private function actingUserId(): int
    {
        $id = DB::table('users')->value('id');
        if (! $id) {
            $this->fail('No users exist to authenticate the request.');
        }

        return (int) $id;
    }

    private function createAccount(string $suffix): int
    {
        return (int) DB::table('accounts')->insertGetId([
            // AccCode is numeric in this schema.
            'AccCode' => random_int(10000000, 99999999),
            'AccName' => 'JET-TMP-ACC-'.$suffix.'-'.uniqid(),
            'AccType' => 1,
            'AccParent' => null,
            'AccDmType' => 1,
            'AccFinal' => 1,
            'Nature' => 'asset',
            'AccStopped' => 0,
            'company_id' => 1,
        ]);
    }

    private function deleteEntryChain(string $entryCode): void
    {
        DB::table('journal_entry_lines')->where('journal_entry_code', $entryCode)->delete();
        DB::table('journal_entries')->where('entry_code', $entryCode)->delete();
    }

    private function cleanupFixtures(): void
    {
        DB::table('journal_entry_lines')
            ->whereIn('journal_entry_code', function ($q) {
                $q->select('entry_code')->from('journal_entries')
                    ->where('entry_type', 'like', 'JET-TMP-%')
                    ->orWhere('entry_code', 'like', '%-JETTMP%');
            })->delete();

        DB::table('journal_entries')
            ->where('entry_type', 'like', 'JET-TMP-%')
            ->orWhere('entry_code', 'like', '%JETTMP%')
            ->orWhere('entry_code', 'like', 'JE-IMP-%')
            ->orWhere('entry_code', 'like', 'JE-TMP-%')
            ->orWhere('reference', 'like', 'JET-%')
            ->delete();

        DB::table('accounts')->where('AccName', 'like', 'JET-TMP-ACC-%')->delete();
    }

    private function postJournal(array $payload): \Illuminate\Testing\TestResponse
    {
        $user = \App\Models\User::find($this->actingUserId());

        $code = $this->actingAs($user)
            ->getJson('/api/journals/next-code')
            ->assertOk()
            ->json('next_code');

        $this->assertNotEmpty($code, 'next-code must return an entry code.');

        return $this->actingAs($user)->postJson('/api/journals', array_merge([
            'entry_code_unused' => $code, // store() generates its own code
            'date' => '2026-06-15',
            'status' => 'UnPost',
            'reference' => 'JET-TMP-REF-'.uniqid(),
        ], $payload));
    }

    /** Test 2: normal manual journal during the fiscal year → Regular. */
    public function test_manual_api_entry_defaults_to_regular(): void
    {
        $a = $this->createAccount('DR');
        $b = $this->createAccount('CR');

        $response = $this->postJournal([
            'lines' => [
                ['account_id' => $a, 'debit' => 500, 'credit' => 0],
                ['account_id' => $b, 'debit' => 0, 'credit' => 500],
            ],
        ])->assertOk();

        $code = $response->json('data.entry_code');
        $this->assertNotEmpty($code);

        $this->assertSame(
            'Regular',
            DB::table('journal_entries')->where('entry_code', $code)->value('entry_type'),
            'A normal manual API entry created during the fiscal year must be Regular.'
        );

        $this->deleteEntryChain($code);
    }

    /** Test 1: an explicit opening-balance entry remains Opening. */
    public function test_existing_opening_entry_remains_opening(): void
    {
        $a = $this->createAccount('DR');
        $b = $this->createAccount('CR');

        $code = 'JE-TMP-OPENING-'.uniqid();
        DB::table('journal_entries')->insert([
            'entry_code' => $code,
            'entry_type' => 'Opening',
            'reference' => 'OPENING-JETTMP-'.uniqid(),
            'date' => '2026-01-01',
            'description' => 'Opening balance (fixture)',
            'total_amount' => 800,
            'status' => 'UnPost',
            'company_id' => 1,
        ]);
        DB::table('journal_entry_lines')->insert([
            ['journal_entry_code' => $code, 'account_id' => $a, 'debit' => 800, 'credit' => 0],
            ['journal_entry_code' => $code, 'account_id' => $b, 'debit' => 0, 'credit' => 800],
        ]);

        // Legitimate Opening row is untouched by the create-path correction.
        $this->assertSame(
            'Opening',
            DB::table('journal_entries')->where('entry_code', $code)->value('entry_type')
        );

        // API edit path must not overwrite a preserved entry_type.
        $this->actingAs(\App\Models\User::find($this->actingUserId()))
            ->putJson("/api/journals/{$code}", [
                'date' => '2026-01-01',
                'status' => 'UnPost',
                'lines' => [
                    ['account_id' => $a, 'debit' => 900, 'credit' => 0],
                    ['account_id' => $b, 'debit' => 0, 'credit' => 900],
                ],
            ])->assertOk();

        $this->assertSame(
            'Opening',
            DB::table('journal_entries')->where('entry_code', $code)->value('entry_type'),
            'The API update path must not change entry_type.'
        );

        $this->deleteEntryChain($code);
    }

    /**
     * Architectural guard: normal in-year transactions are classified by
     * their module domain types — the create/lookup pairing in every module
     * depends on those literals. They must NOT be repointed to 'Regular'.
     */
    public function test_module_sources_keep_domain_entry_types(): void
    {
        $allSource = '';
        $it = new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator(base_path('app')));
        foreach ($it as $file) {
            if (substr($file->getFilename(), -4) === '.php') {
                $allSource .= file_get_contents($file->getPathname());
            }
        }

        $domainTypeAssignments = [
            "\$entryType = 'SalesInvoice';", // SalesInvoiceController assigns via variable
            "'entry_type' => 'PurchaseInvoice',",
            "'entry_type' => 'SupplierPayment',",
            "'entry_type' => 'CustomerReceipt',",
            "'entry_type' => 'SalesReturn',",
            "'entry_type' => 'PurchaseReturn',",
            "'entry_type' => 'StockAdjustment',",
            "'entry_type' => 'Depreciation',",
            "'entry_type' => 'AssetDisposal',",
            "'entry_type' => 'LandedCost',",
            "'entry_type' => \$qaidType,",
        ];

        foreach ($domainTypeAssignments as $needle) {
            $this->assertStringContainsString(
                $needle,
                $allSource,
                "Domain entry_type assignment {$needle} must remain — modules pair create with lookup on it."
            );
        }

        // Reversal inherits the original entry type (existing contract).
        $this->assertStringContainsString(
            "'entry_type' => \$original->entry_type,",
            $allSource,
            'JournalReversalService must keep inheriting the original entry_type.'
        );
    }

    /**
     * Import path: an explicit entry_type in the file is honored (so an
     * opening-balance import can declare Opening), and an empty cell now
     * defaults to Regular instead of Manual.
     */
    public function test_import_honors_explicit_type_and_defaults_to_regular(): void
    {
        $service = new \App\Services\Accounting\JournalImportService();

        $a = $this->createAccount('IMP');
        $b = $this->createAccount('IMP2');
        $accCode = (string) DB::table('accounts')->where('AccID', $a)->value('AccCode');
        $accCodeB = (string) DB::table('accounts')->where('AccID', $b)->value('AccCode');
        $openCode = 'JE-IMP-OPEN-'.uniqid();
        $regCode = 'JE-IMP-REG-'.uniqid();
        $rows = [
            [
                'entry_code' => $openCode,
                'date' => '2026-01-01',
                'reference' => 'JET-IMP-OPEN',
                'header_description' => 'Imported opening balance',
                'status' => 'UnPost',
                'entry_type' => 'Opening',
                'account_id' => $accCode,
                'debit' => 250,
                'credit' => 0,
            ],
            [
                'entry_code' => $openCode,
                'date' => '2026-01-01',
                'reference' => 'JET-IMP-OPEN',
                'header_description' => 'Imported opening balance',
                'status' => 'UnPost',
                'entry_type' => 'Opening',
                'account_id' => $accCodeB,
                'debit' => 0,
                'credit' => 250,
            ],
            [
                'entry_code' => $regCode,
                'date' => '2026-06-20',
                'reference' => 'JET-IMP-REG',
                'header_description' => 'Imported normal entry',
                'status' => 'UnPost',
                'entry_type' => '',
                'account_id' => $accCode,
                'debit' => 120,
                'credit' => 0,
            ],
            [
                'entry_code' => $regCode,
                'date' => '2026-06-20',
                'reference' => 'JET-IMP-REG',
                'header_description' => 'Imported normal entry',
                'status' => 'UnPost',
                'entry_type' => '',
                'account_id' => $accCode,
                'debit' => 0,
                'credit' => 120,
            ],
        ];

        $result = $service->importRows($rows);

        $importedOpen = DB::table('journal_entries')
            ->where('entry_code', $openCode)->value('entry_type');
        $importedReg = DB::table('journal_entries')
            ->where('entry_code', $regCode)->value('entry_type');

        $this->assertSame(2, $result['imported'] ?? 0, 'Both grouped entries must import successfully.');
        $this->assertSame(0, $result['failed'] ?? -1, 'No entry may fail: '.json_encode($result['errors'] ?? []));
        $this->assertSame('Opening', $importedOpen, 'Explicit Opening in an import file must be honored.');
        $this->assertSame('Regular', $importedReg, 'Empty entry_type cells must default to Regular.');

        foreach ([$openCode, $regCode] as $code) {
            $this->deleteEntryChain($code);
        }
    }

    /**
     * Reversal of a fixture journal inherits its entry_type (existing
     * contract in JournalReversalService) — verified for the Regular type.
     */
    public function test_reversal_of_regular_entry_inherits_type(): void
    {
        $a = $this->createAccount('RV');
        $b = $this->createAccount('RV2');

        $code = 'JE-TMP-REV-'.uniqid();
        DB::table('journal_entries')->insert([
            'entry_code' => $code,
            'entry_type' => 'Regular',
            'reference' => 'JET-REV-'.uniqid(),
            'date' => '2026-06-15',
            'description' => 'Regular entry to reverse',
            'total_amount' => 300,
            'status' => 'Post',
            'company_id' => 1,
        ]);
        DB::table('journal_entry_lines')->insert([
            ['journal_entry_code' => $code, 'account_id' => $a, 'debit' => 300, 'credit' => 0],
            ['journal_entry_code' => $code, 'account_id' => $b, 'debit' => 0, 'credit' => 300],
        ]);

        app(\App\Services\Accounting\JournalReversalService::class)
            ->createReversal($code, 'JETTMP reversal test');

        $revCode = $code.'-REV';
        $this->assertSame(
            'Regular',
            DB::table('journal_entries')->where('entry_code', $revCode)->value('entry_type'),
            'Reversal must inherit the original entry_type.'
        );

        $this->deleteEntryChain($revCode);
        $this->deleteEntryChain($code);
    }

    protected function tearDown(): void
    {
        $this->cleanupFixtures();
        parent::tearDown();
    }
}
