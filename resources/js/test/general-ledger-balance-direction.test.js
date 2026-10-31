import { describe, it, expect } from 'vitest';
import {
  formatBalanceWithDirection,
  getBalancePresentation,
} from '../Pages/Backend/07-Accounting/FinancialReports/GeneralLedger';

describe('GL running balance presentation', () => {
  it('renders debit balances without a direction label', () => {
    expect(formatBalanceWithDirection(785214, 'Debit')).toBe('785214.00');
    expect(getBalancePresentation(785214, 'Debit').isCredit).toBe(false);
  });

  it('renders credit balances in parentheses based on debit-account nature', () => {
    expect(formatBalanceWithDirection(-785214, 'Debit')).toBe('(785214.00)');
    expect(getBalancePresentation(-785214, 'Debit').isCredit).toBe(true);
  });

  it('renders credit balances in parentheses based on credit-account nature', () => {
    expect(formatBalanceWithDirection(4350, 'Credit')).toBe('(4350.00)');
    expect(getBalancePresentation(4350, 'Credit').isCredit).toBe(true);
  });

  it('renders a debit balance without parentheses for credit-account nature', () => {
    expect(formatBalanceWithDirection(-50, 'Credit')).toBe('50.00');
    expect(getBalancePresentation(-50, 'Credit').isCredit).toBe(false);
  });

  it('renders zero without parentheses or direction for either nature', () => {
    expect(formatBalanceWithDirection(0, 'Debit')).toBe('0.00');
    expect(formatBalanceWithDirection(0, 'Credit')).toBe('0.00');
    expect(getBalancePresentation(0, 'Credit').isCredit).toBe(false);
  });

  it('preserves two-decimal formatting and defaults unknown natures to Debit', () => {
    expect(formatBalanceWithDirection('12.3', 'Debit')).toBe('12.30');
    expect(formatBalanceWithDirection(10, undefined)).toBe('10.00');
    expect(formatBalanceWithDirection(10, null)).toBe('10.00');
  });
});
