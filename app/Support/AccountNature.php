<?php

namespace App\Support;

/**
 * GL Audit Phase 6 — the canonical account Debit/Credit nature convention.
 *
 * EVIDENCE (repository-wide, see the Phase 6 report):
 *
 *   - accounts.AccDmType is nullable tinyint; the account CRUD validation
 *     domain (Store/UpdateAccountRequest, Rule::in([1, 2])) accepts ONLY
 *     1 and 2 for user input, with the documented meaning 1 = Credit,
 *     2 = Debit (see AccountDmTypeUpdateTest: "The API domain uses
 *     canonical backend values: 1 = Credit, 2 = Debit").
 *   - 75 legacy rows carry 0 (all Debit-nature families: asset, bank,
 *     cash, Inventory, AR, income, COGs...), and the 46 rows carrying 2
 *     are ALL Nature='expense' (code range 6xx) — Debit-nature accounts.
 *     No row carries any other value.
 *   - Budget monitoring already normalizes amounts as "credit iff 1"
 *     (non-1 values — 0, 2, null — are treated as Debit/positive).
 *
 * THE CANONICAL RULE:
 *
 *   AccDmType == 1  => Credit nature
 *   anything else   => Debit nature  (0 legacy, 2 explicit Debit, null)
 *
 * Every consumer must go through this helper instead of re-implementing
 * `(int)$value === 0` / `$value == 1` locally, so the conventions can
 * never drift apart again. If the business ever redefines the mapping
 * (e.g. a data migration to a strict 0/1 enum), this is the single place
 * to change.
 */
final class AccountNature
{
    public const CREDIT = 'Credit';

    public const DEBIT = 'Debit';

    /**
     * True when the account's AccDmType denotes CREDIT nature.
     */
    public static function isCredit(int|string|null $accDmType): bool
    {
        return (int) $accDmType === 1;
    }

    /**
     * True when the account's AccDmType denotes DEBIT nature.
     */
    public static function isDebit(int|string|null $accDmType): bool
    {
        return ! self::isCredit($accDmType);
    }

    /**
     * The display label for the account's nature.
     */
    public static function label(int|string|null $accDmType): string
    {
        return self::isCredit($accDmType) ? self::CREDIT : self::DEBIT;
    }

    /**
     * Sign a raw amount so that a Debit-nature account contributes its
     * raw (debit-positive) value and a Credit-nature account contributes
     * its negation. Budget monitoring's normalization, centralized.
     */
    public static function normalizeAmount(float|int|string $amount, int|string|null $accDmType): float
    {
        return self::isCredit($accDmType) ? -(float) $amount : (float) $amount;
    }
}
