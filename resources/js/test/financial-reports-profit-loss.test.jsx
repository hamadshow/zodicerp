import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';

/**
 * Financial Reports -> Profit & Loss screen.
 *
 * Regression guard for the reported "report doesn't run" failure: the page
 * called `t('dashboard', 'Dashboard')` in its breadcrumb while `t` was a plain
 * ar/en dictionary object, so `t(...)` threw `TypeError: t is not a function`
 * during render and React unmounted the whole tree (AdminLayout has no error
 * boundary), leaving a blank page. These tests render the real component and
 * would fail with that TypeError.
 */

const getSpy = vi.fn();

vi.mock('@inertiajs/react', () => ({
  Head: () => null,
}));

vi.mock('@/Pages/Backend/components/AdminLayout', () => ({
  default: ({ children }) => <div>{children}</div>,
}));

vi.mock('@/services/api', () => ({
  apiService: {
    get: (...args) => getSpy(...args),
  },
}));

vi.mock('xlsx', () => ({
  utils: {
    book_new: vi.fn(),
    aoa_to_sheet: vi.fn(),
    book_append_sheet: vi.fn(),
  },
  writeFile: vi.fn(),
}));

import ProfitLoss from '@/Pages/Backend/07-Accounting/FinancialReports/Profit&Loss.jsx';

const apiPayload = {
  main: {
    income: [
      { AccID: 1, AccCode: '4001', AccName: 'Sales Revenue', AccType: 0, AccParent: null, depth: 0, children: [], balance: 15000 },
    ],
    cogs: [
      { AccID: 2, AccCode: '5001', AccName: 'Cost of Sales', AccType: 0, AccParent: null, depth: 0, children: [], balance: 6000 },
    ],
    expenses: [
      { AccID: 3, AccCode: '6001', AccName: 'Rent Expense', AccType: 0, AccParent: null, depth: 0, children: [], balance: 2000 },
    ],
    total_income: 15000,
    total_cogs: 6000,
    total_expenses: 2000,
    gross_profit: 9000,
    net_income: 7000,
  },
  period: { start: '2024-01-01', end: '2026-12-31' },
};

describe('Profit & Loss report screen (Financial Reports)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.documentElement.lang = 'en';
    getSpy.mockResolvedValue({ data: apiPayload });
  });

  it('renders the breadcrumb and every P&L section without crashing', async () => {
    render(<ProfitLoss />);

    // Rendered synchronously — this is where the old `t(...)` call threw.
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Accounting')).toBeInTheDocument();
    expect(screen.getByText('Financial Reports')).toBeInTheDocument();

    await screen.findByText('Net Income');

    expect(screen.getByText('Total Income')).toBeInTheDocument();
    expect(screen.getByText('Total Cost of Goods Sold')).toBeInTheDocument();
    expect(screen.getByText('Total Expenses')).toBeInTheDocument();
    expect(screen.getByText('Gross Profit')).toBeInTheDocument();
    expect(screen.getByText('Sales Revenue')).toBeInTheDocument();
    expect(screen.getByText('Cost of Sales')).toBeInTheDocument();
    expect(screen.getByText('Rent Expense')).toBeInTheDocument();
  });

  it('requests the report from the profit-loss API for the selected period', async () => {
    render(<ProfitLoss />);

    await screen.findByText('Net Income');

    expect(getSpy).toHaveBeenCalledTimes(1);

    const [url] = getSpy.mock.calls[0];
    expect(url).toContain('/reports/profit-loss');
    expect(url).toContain('start_date=');
    expect(url).toContain('end_date=');
  });

  it('falls back to the built-in dictionary when switching language with the "a" key', async () => {
    render(<ProfitLoss />);

    await screen.findByText('Net Income');

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    });

    expect(screen.getByText('لوحة التحكم')).toBeInTheDocument();
    expect(screen.getByText('المحاسبة')).toBeInTheDocument();
    expect(screen.getByText('التقارير المالية')).toBeInTheDocument();
    expect(screen.getByText('صافي الدخل')).toBeInTheDocument();
  });
});
