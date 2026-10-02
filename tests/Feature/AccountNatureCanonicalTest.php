<?php

namespace Tests\Feature;

use App\Support\AccountNature;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * GL Audit Phase 6 — the canonical AccDmType Debit/Credit convention.
 *
 * CANONICAL RULE (evidence-backed, centralized in App\Support\AccountNature):
 *
 *   AccDmType == 1  => Credit nature
 *   anything else   => Debit nature
 *
 * Evidence trail:
 *   - account CRUD validation domain is Rule::in([1, 2]) with the
 *     documented meaning 1 = Credit, 2 = Debit
 *     (AccountDmTypeUpdateTest: "The API domain uses canonical backend
 *     values: 1 = Credit, 2 = Debit");
 *   - all 46 live AccDmType=2 rows are Nature='expense' (code range 6xx)
 *     — Debit-nature accounts;
 *   - the 75 legacy 0 rows span every Debit-nature family
 *     (asset/bank/cash/Inventory/AR/income/COGs);
 *   - Budget monitoring has always normalized "credit iff 1".
 *
 * The old per-site rules — GL's `(int)$x === 0` (misclassifying 2 as
 * Credit) and Budget's `$dm == 1` — are replaced by the shared helper;
 * these tests pin the helper AND the endpoints that consume it.
 */
class AccountNatureCanonicalTest extends TestCase
{
    use DatabaseTransactions;

    /** @test */
    public function the_helper_maps_the_canonical_convention(): void
    {
        $this->assertTrue(AccountNature::isCredit(1), 'AccDmType 1 = Credit');
        $this->assertTrue(AccountNature::isCredit('1'));
        $this->assertFalse(AccountNature::isCredit(0), 'legacy 0 = Debit');
        $this->assertFalse(AccountNature::isCredit(2), 'AccDmType 2 = Debit');
        $this->assertFalse(AccountNature::isCredit(null), 'null = Debit (legacy NULL rows exist)');
        $this->assertFalse(AccountNature::isDebit(1));
        $this->assertTrue(AccountNature::isDebit(2));
        $this->assertSame('Credit', AccountNature::label(1));
        $this->assertSame('Debit', AccountNature::label(2));
        $this->assertSame('Debit', AccountNature::label(null));
    }

    /** @test */
    public function amount_normalization_matches_the_budget_sign_convention(): void
    {
        $this->assertSame(100.0, AccountNature::normalizeAmount(100, 0), 'Debit-nature keeps the raw amount');
        $this->assertSame(100.0, AccountNature::normalizeAmount(100, 2), 'AccDmType 2 (Debit) keeps the raw amount');
        $this->assertSame(100.0, AccountNature::normalizeAmount(100, null));
        $this->assertSame(-100.0, AccountNature::normalizeAmount(100, 1), 'Credit-nature negates');
        $this->assertSame(-100.0, AccountNature::normalizeAmount('100', '1'));
    }

    private function actingUser(): \App\Models\User
    {
        // The committed admin user: creating a fresh user would overflow
        // the smallint accounts.AddUser column with its auto-increment id.
        $user = \App\Models\User::first();
        if (! $user) {
            $this->fail('No users exist to authenticate the request.');
        }

        return $user;
    }

    private function createAccount(int $accId, int $dmType): int
    {
        return (int) DB::table('accounts')->insertGetId([
            'AccCode' => '9'.random_int(1000000, 9999999),
            'AccName' => 'GLNAT-TMP-'.$accId.'-'.uniqid(),
            'AccType' => 1,
            'AccFinal' => 1,
            'AccDmType' => $dmType,
            'AccStopped' => 0,
            'company_id' => 1,
        ]);
    }

    /** @test */
    public function live_gl_treats_dm_type_2_as_debit_and_1_as_credit(): void
    {
        $this->actingAs($this->actingUser(), 'sanctum');

        $dm2 = $this->createAccount(2, 2);
        $dm1 = $this->createAccount(1, 1);
        $other = $this->createAccount(0, 0);

        $this->postJournal('GLNAT-A-'.uniqid(), now()->toDateString(), [
            [$dm2, 50, 0],
            [$other, 0, 50],
        ]);
        $this->postJournal('GLNAT-B-'.uniqid(), now()->toDateString(), [
            [$dm1, 70, 0],
            [$other, 0, 70],
        ]);

        // AccDmType = 2 (Debit): debit-nature math, +50 balance.
        $r2 = $this->getJson('/api/reports/general-ledger?account_id='.$dm2.'&status=all');
        $r2->assertStatus(200);
        $this->assertSame('Debit', $r2->json('account.dm_label'));
        $this->assertEqualsWithDelta(50.0, (float) $r2->json('closing_balance'), 0.001);

        // AccDmType = 1 (Credit): credit-nature math, the 70 debit row
        // produces −70.
        $r1 = $this->getJson('/api/reports/general-ledger?account_id='.$dm1.'&status=all');
        $r1->assertStatus(200);
        $this->assertSame('Credit', $r1->json('account.dm_label'));
        $this->assertEqualsWithDelta(-70.0, (float) $r1->json('closing_balance'), 0.001);
    }

    /** @test */
    public function account_crud_domain_remains_exactly_1_or_2(): void
    {
        // The CRUD domain is part of the canonical contract: user input is
        // restricted to the two explicit values (1 = Credit, 2 = Debit) —
        // legacy 0 may persist on old rows but can never be newly chosen.
        $this->actingAs($this->actingUser());

        foreach ([1, 2] as $dm) {
            $response = $this->postJson('/api/accounts', [
                'AccName' => 'GLNAT-CRUD-'.uniqid(),
                'AccType' => 0,
                'AccParent' => null,
                'AccDmType' => $dm,
                'Nature' => 'asset',
                'AccFinal' => 0,
            ]);
            $response->assertStatus(200);
            $this->assertSame(
                $dm,
                (int) DB::table('accounts')->where('AccName', 'like', 'GLNAT-CRUD-%')->latest('AccID')->value('AccDmType')
            );
        }

        // A value outside the domain is rejected.
        $this->postJson('/api/accounts', [
            'AccName' => 'GLNAT-CRUD-BAD-'.uniqid(),
            'AccType' => 0,
            'AccParent' => null,
            'AccDmType' => 3,
            'Nature' => 'asset',
        ])->assertStatus(422);
    }

    private function postJournal(string $code, string $date, array $lines): void
    {
        DB::table('journal_entries')->insert([
            'entry_code' => $code,
            'entry_type' => 'Regular',
            'date' => $date,
            'description' => 'GLNAT fixture',
            'total_amount' => array_sum(array_column($lines, 1)),
            'status' => 'Post',
            'company_id' => 1,
        ]);
        foreach ($lines as [$accountId, $debit, $credit]) {
            DB::table('journal_entry_lines')->insert([
                'journal_entry_code' => $code,
                'account_id' => $accountId,
                'debit' => $debit,
                'credit' => $credit,
                'company_id' => 1,
            ]);
        }
    }
}
