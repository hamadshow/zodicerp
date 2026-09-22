<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Regression tests for the "Debit / Credit Nature not persisting" bug.
 *
 * Root cause: AccountsController@tree nulled AccDmType for main accounts
 * (AccType != 1). The Edit modal hydrated `account.AccDmType ?? 1` (fake
 * Credit), and any subsequent PUT wrote that fake value back — the UI
 * change to Debit was silently overwritten by stale hydrate data.
 *
 * The API domain uses canonical backend values: 1 = Credit, 2 = Debit.
 */
class AccountDmTypeUpdateTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        if (config('database.default') !== 'mysql') {
            $this->markTestSkipped('Requires MySQL/MariaDB');
        }
    }

    private function actingUser(): User
    {
        $user = User::first();
        if (! $user) {
            $this->fail('No users exist to authenticate the request.');
        }

        return $user;
    }

    private function putAccount(int $accountId, array $payload): \Illuminate\Testing\TestResponse
    {
        // The UI always sends Nature alongside AccDmType; root accounts
        // (no parent) require it per validation rules.
        $payload = array_merge([
            'Nature' => 'asset',
        ], $payload);

        return $this->actingAs($this->actingUser())
            ->putJson("/api/accounts/{$accountId}", $payload);
    }

    private function createAccount(array $overrides = []): int
    {
        $row = array_merge([
            'AccCode' => '99' . random_int(1000, 9999),
            'AccName' => 'DMTYPE-TMP-' . uniqid(),
            'AccType' => 0,
            'AccParent' => null,
            'AccDmType' => 1,
            'AccFinal' => 0,
        ], $overrides);

        return (int) DB::table('accounts')->insertGetId($row);
    }

    private function cleanupAccountsLike(string $prefix): void
    {
        Account::where('AccName', 'like', $prefix.'%')->forceDelete();
    }

    /** Test A: main account Credit(1) → Debit(2) persists and reloads. */
    public function test_main_account_credit_to_debit_persists(): void
    {
        $this->cleanupAccountsLike('DMTYPE-TMP-');
        $id = $this->createAccount(['AccDmType' => 1]);

        $this->putAccount($id, [
            'AccName' => 'DMTYPE-TMP-credit-to-debit',
            'AccType' => 0,
            'AccParent' => null,
            'AccDmType' => 2, // UI Debit
            'AccFinal' => false,
        ])->assertOk();

        $this->assertSame(
            2,
            (int) DB::table('accounts')->where('AccID', $id)->value('AccDmType'),
            'PUT AccDmType=2 (Debit) must persist to the database.'
        );

        // Reload path: tree() must return the stored value for main accounts.
        $tree = $this->actingAs($this->actingUser())
            ->getJson('/api/accounts/tree')
            ->assertOk()
            ->json();

        $row = collect($tree)->firstWhere('AccID', $id);
        $this->assertNotNull($row, 'Account missing from tree.');
        $this->assertSame(
            2,
            (int) $row['AccDmType'],
            'tree() must return the real AccDmType for main accounts (was null → fake Credit).'
        );

        Account::where('AccID', $id)->forceDelete();
    }

    /** Test B: main account Debit(2) → Credit(1) persists and reloads. */
    public function test_main_account_debit_to_credit_persists(): void
    {
        $id = $this->createAccount(['AccDmType' => 2]);

        $this->putAccount($id, [
            'AccName' => 'DMTYPE-TMP-debit-to-credit',
            'AccType' => 0,
            'AccParent' => null,
            'AccDmType' => 1, // UI Credit
            'AccFinal' => false,
        ])->assertOk();

        $this->assertSame(
            1,
            (int) DB::table('accounts')->where('AccID', $id)->value('AccDmType')
        );

        Account::where('AccID', $id)->forceDelete();
    }

    /** Test C: PUT on one account must not touch another account's value. */
    public function test_update_does_not_overwrite_other_accounts(): void
    {
        $a = $this->createAccount(['AccDmType' => 1]);
        $b = $this->createAccount(['AccDmType' => 2]);

        $this->putAccount($a, [
            'AccName' => 'DMTYPE-TMP-isolated',
            'AccType' => 0,
            'AccParent' => null,
            'AccDmType' => 2,
            'AccFinal' => false,
        ])->assertOk();

        $this->assertSame(2, (int) DB::table('accounts')->where('AccID', $a)->value('AccDmType'));
        $this->assertSame(
            2,
            (int) DB::table('accounts')->where('AccID', $b)->value('AccDmType'),
            'Another account AccDmType must not be overwritten.'
        );

        Account::whereIn('AccID', [$a, $b])->forceDelete();
    }

    /** Test D: Create with explicit AccDmType keeps working (frontend sends 1|2). */
    public function test_create_with_explicit_dm_type_stores_backend_value(): void
    {
        $payload = [
            'AccCode' => '99' . random_int(1000, 9999),
            'AccName' => 'DMTYPE-TMP-create',
            'AccType' => 0,
            'AccParent' => null,
            'AccDmType' => 2,
            'AccFinal' => false,
            'Nature' => 'asset',
        ];

        $response = $this->actingAs($this->actingUser())
            ->postJson('/api/accounts', $payload)
            ->assertOk(); // store returns 200 (json success envelope), not 201

        // store() always regenerates AccCode via AccountHierarchyService,
        // so the created account is identified from the response payload.
        $created = $response->json('account');
        $this->assertNotEmpty($created, 'store response must include the created account.');
        $id = (int) $created['AccID'];
        $this->assertGreaterThan(0, $id);
        $this->assertSame(2, (int) DB::table('accounts')->where('AccID', $id)->value('AccDmType'));

        Account::where('AccID', $id)->forceDelete();
    }

    /** Inheritance contract: children inherit the parent's nature on update. */
    public function test_child_inherits_parent_dm_type_on_update(): void
    {
        $parentId = $this->createAccount(['AccDmType' => 2]);
        $parentCode = (string) DB::table('accounts')->where('AccID', $parentId)->value('AccCode');
        // Real hierarchy: child codes are prefixed by the parent code
        // (generated by AccountHierarchyService). syncDescendants matches
        // descendants by that prefix, so the fixture must mirror it.
        $childId = $this->createAccount([
            'AccCode' => $parentCode.'1',
            'AccType' => 1,
            'AccParent' => $parentCode,
            'AccDmType' => 1,
        ]);

        $this->putAccount($parentId, [
            'AccName' => 'DMTYPE-TMP-parent',
            'AccType' => 0,
            'AccParent' => null,
            'AccDmType' => 2,
            'AccFinal' => false,
        ])->assertOk();

        // Backend contract: child forced to parent's nature (unchanged behavior).
        $this->assertSame(
            2,
            (int) DB::table('accounts')->where('AccID', $childId)->value('AccDmType'),
            'Child must inherit parent AccDmType on parent update.'
        );

        Account::whereIn('AccID', [$parentId, $childId])->forceDelete();
    }

    protected function tearDown(): void
    {
        $this->cleanupAccountsLike('DMTYPE-TMP-');
        parent::tearDown();
    }
}
