import { describe, it, expect } from 'vitest';
import { formatBalanceWithDirection } from '../Pages/Backend/07-Accounting/FinancialReports/GeneralLedger';

/**
 * GL Audit Phase 5 — balance direction presentation.
 *
 * The backend computes the signed balance from the account's nature:
 *   Debit-nature  (dm_label 'Debit')  : sign = debit − credit  (positive ⇒ Debit)
 *   Credit-nature (dm_label 'Credit') : sign = credit − debit  (positive ⇒ Credit)
 *
 * The old UI used Math.abs() and hid the direction entirely. The formatter
 * must always render the magnitude WITH an explicit Debit/Credit direction,
 * derived from the nature — never from the sign alone.
 */
describe('GL balance direction presentation (audit Phase 5)', () => {
  it('labels a positive balance Debit on a Debit-nature account', () => {
    expect(formatBalanceWithDirection(4450, 'Debit')).toBe('4450.00 Debit');
  });

  it('labels a negative balance Credit on a Debit-nature account (the audited screenshot case)', () => {
    // Debit 9,779,079 / Credit 18,917,500 on a Debit-nature account:
    // the old UI printed the bare magnitude, hiding the Credit direction.
    expect(formatBalanceWithDirection(-9138421, 'Debit')).toBe('9138421.00 Credit');
  });

  it('labels a positive balance Credit on a Credit-nature account', () => {
    expect(formatBalanceWithDirection(4350, 'Credit')).toBe('4350.00 Credit');
  });

  it('labels a negative balance Debit on a Credit-nature account', () => {
    // Credit-nature sign = credit − debit: a debit-heavy credit account
    // goes negative, and the direction label must flip to Debit.
    expect(formatBalanceWithDirection(-50, 'Credit')).toBe('50.00 Debit');
  });

  it('always renders an explicit direction — never a bare magnitude', () => {
    for (const value of [0, 1234.5, -9876.25, 1000000]) {
      expect(formatBalanceWithDirection(value, 'Debit')).toMatch(/ (Debit|Credit)$/);
      expect(formatBalanceWithDirection(value, 'Credit')).toMatch(/ (Debit|Credit)$/);
    }
  });

  it('treats any non-Credit nature label as Debit-nature', () => {
    // The API sends 'Debit' or 'Credit'; anything unexpected must not
    // silently flip the direction — default to Debit convention.
    expect(formatBalanceWithDirection(10, undefined)).toBe('10.00 Debit');
    expect(formatBalanceWithDirection(10, null)).toBe('10.00 Debit');
  });

  it('formats with exactly two decimals and handles zero', () => {
    expect(formatBalanceWithDirection(0, 'Debit')).toBe('0.00 Debit');
    expect(formatBalanceWithDirection('12.3', 'Debit')).toBe('12.30 Debit');
  });
});
