import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';

/**
 * Financial Reports -> Profit & Loss screen.
 *
 * Regression guard for the Profit & Loss report request lifecycle.
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
    vi.stubGlobal('route', (name, params) => {
      if (!name) {
        return { params: { country: 'sa', lang: 'en' } };
      }

      return `/${params.country}/${params.lang}/admin/financial-reports`;
    });
    getSpy.mockResolvedValue({ data: apiPayload });
  });

  it('does not request or render report data on initial page load', () => {
    render(<ProfitLoss />);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Accounting')).toBeInTheDocument();
    expect(screen.getByText('Financial Reports')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Apply' })).toBeInTheDocument();
    expect(screen.queryByText('Net Income')).not.toBeInTheDocument();
    expect(screen.queryByText('No data available for this period')).not.toBeInTheDocument();
    expect(getSpy).not.toHaveBeenCalled();
  });

  it('only requests report data after Apply and submits the selected dates', async () => {
    render(<ProfitLoss />);

    fireEvent.change(screen.getByLabelText('Period From'), {
      target: { value: '2025-02-01' },
    });
    fireEvent.change(screen.getByLabelText('To'), {
      target: { value: '2025-02-28' },
    });

    expect(getSpy).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    await screen.findByText('Net Income');

    expect(getSpy).toHaveBeenCalledTimes(1);
    const [url] = getSpy.mock.calls[0];
    expect(url).toContain('/reports/profit-loss');
    expect(url).toContain('start_date=2025-02-01');
    expect(url).toContain('end_date=2025-02-28');
  });

  it('does not reload when dates change after loading and reloads once on Apply', async () => {
    render(<ProfitLoss />);

    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    await screen.findByText('Net Income');
    expect(getSpy).toHaveBeenCalledTimes(1);

    fireEvent.change(screen.getByLabelText('Period From'), {
      target: { value: '2025-03-01' },
    });
    fireEvent.change(screen.getByLabelText('To'), {
      target: { value: '2025-03-31' },
    });

    expect(getSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Net Income')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    await act(async () => {
      await Promise.resolve();
    });

    expect(getSpy).toHaveBeenCalledTimes(2);
    expect(getSpy.mock.calls[1][0]).toContain('start_date=2025-03-01');
    expect(getSpy.mock.calls[1][0]).toContain('end_date=2025-03-31');
  });

  it('falls back to the built-in dictionary when switching language with the "a" key', async () => {
    render(<ProfitLoss />);

    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
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
