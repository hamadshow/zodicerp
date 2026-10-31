import React from 'react';
import * as XLSX from 'xlsx';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

const { getSpy, pageProps } = vi.hoisted(() => ({
  getSpy: vi.fn(),
  pageProps: {
    localization: {
      current_locale: 'en',
      translations: {},
    },
  },
}));

vi.mock('@inertiajs/react', () => ({
  Head: () => null,
  usePage: () => ({ props: pageProps }),
}));

vi.mock('@/Pages/Backend/components/AdminLayout', () => ({
  default: ({ children }) => <div>{children}</div>,
}));

vi.mock('@/services/api', () => ({
  apiService: {
    get: (...args) => getSpy(...args),
  },
}));

vi.mock('xlsx', async (importOriginal) => {
  const actual = await importOriginal();

  return {
    ...actual,
    writeFile: vi.fn(),
  };
});

import TrialBalance from '@/Pages/Backend/07-Accounting/FinancialReports/TrialBalance.jsx';

const openExportMenu = () => {
  fireEvent.click(screen.getByRole('button', { name: 'Export' }));
};

const getExportExcelMenuItem = () =>
  screen.getAllByRole('menuitem').find((el) => /Export Excel/i.test(el.textContent));

const clickExportExcel = () => {
  openExportMenu();
  fireEvent.click(getExportExcelMenuItem());
};

const applyDateRange = (fromDate = '01/01/2025', toDate = '31/12/2025') => {
  fireEvent.change(screen.getByLabelText('From Date'), {
    target: { value: fromDate },
  });
  fireEvent.change(screen.getByLabelText('To Date'), {
    target: { value: toDate },
  });
  fireEvent.click(screen.getByRole('button', { name: /Apply/ }));
};

const reportRows = [
  {
    AccID: 1,
    AccCode: '1',
    AccName: 'Assets',
    AccType: 0,
    depth: 0,
    beginning_debit: 100,
    beginning_credit: 20,
    current_debit: 30,
    current_credit: 10,
    ending_debit: 100,
    ending_credit: 0,
  },
  {
    AccID: 2,
    AccCode: '1001',
    AccName: 'Cash in Bank',
    AccType: 1,
    depth: 1,
    beginning_debit: 100,
    beginning_credit: 20,
    current_debit: 30,
    current_credit: 10,
    ending_debit: 100,
    ending_credit: 0,
  },
];

describe('Trial Balance Excel export', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete pageProps.printCompany;
    pageProps.localization.current_locale = 'en';
    vi.stubGlobal('ResizeObserver', class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    });
    vi.stubGlobal('alert', vi.fn());
    getSpy.mockResolvedValue({
      data: reportRows,
      headers: {
        'x-trial-balance-start-date': '2025-01-01',
        'x-trial-balance-as-of-date': '2025-12-31',
      },
    });
  });

  it('prints the active company name and details using the system locale', async () => {
    pageProps.printCompany = {
      company_name: 'شركة المثال',
      english_name: 'Example Company',
      mobile: '123456789',
      country: 'Saudi Arabia',
      city: 'Riyadh',
      area: 'Olaya',
      vat_number: 'VAT-123',
    };

    const { rerender } = render(<TrialBalance />);

    applyDateRange();
    expect(await screen.findByText('1001 - Cash in Bank')).toBeInTheDocument();
    expect(screen.getByText('Example Company')).toBeInTheDocument();
    expect(screen.getByText('Saudi Arabia - Riyadh - Olaya')).toBeInTheDocument();
    expect(screen.getByText('VAT-123')).toBeInTheDocument();
    expect(document.querySelector('.print-report')).toHaveAttribute('dir', 'ltr');

    pageProps.localization.current_locale = 'ar';
    rerender(<TrialBalance />);

    expect(screen.getByText('شركة المثال')).toBeInTheDocument();
    expect(document.querySelector('.print-report')).toHaveAttribute('dir', 'rtl');
    pageProps.localization.current_locale = 'en';
  });

  it('does not request or render the report until Apply is clicked', () => {
    render(<TrialBalance />);

    expect(getSpy).not.toHaveBeenCalled();
    expect(screen.getByLabelText('From Date')).toBeInTheDocument();
    expect(screen.getByLabelText('To Date')).toBeInTheDocument();
    expect(screen.queryByText('No data available')).not.toBeInTheDocument();
    expect(screen.queryByText('GRAND TOTAL')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Language')).not.toBeInTheDocument();
    expect(screen.getByLabelText('From Date')).toHaveValue('');
    expect(screen.getByLabelText('To Date')).toHaveValue('');
    expect(document.querySelector('.report-header__filters-grid')).toHaveClass(
      'trial-balance-filters-grid',
    );
  });

  it('requires both dates before submitting', () => {
    render(<TrialBalance />);
    fireEvent.change(screen.getByLabelText('From Date'), {
      target: { value: '01/01/2025' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Apply/ }));

    expect(window.alert).toHaveBeenCalledWith('Please select both From Date and To Date.');
    expect(getSpy).not.toHaveBeenCalled();
  });

  it('loads the backend default period only after Apply when both dates are blank', async () => {
    render(<TrialBalance />);
    expect(getSpy).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /Apply/ }));

    expect(await screen.findByText('1001 - Cash in Bank')).toBeInTheDocument();
    expect(getSpy).toHaveBeenCalledWith('/reports/trial-balance');
  });

  it('submits the selected ISO date range and displays it as dd/MM/yyyy', async () => {
    render(<TrialBalance />);
    applyDateRange('05/03/2026', '31/12/2026');

    expect(await screen.findByText('1001 - Cash in Bank')).toBeInTheDocument();
    expect(screen.getByLabelText('From Date')).toHaveValue('05/03/2026');
    expect(screen.getByLabelText('To Date')).toHaveValue('31/12/2026');
    expect(getSpy).toHaveBeenCalledWith(
      '/reports/trial-balance?start_date=2026-03-05&as_of_date=2026-12-31',
    );
  });

  it('validates the date range without requesting report data', () => {
    render(<TrialBalance />);
    applyDateRange('31/12/2025', '01/01/2025');

    expect(window.alert).toHaveBeenCalledWith('From Date cannot be after To Date.');
    expect(getSpy).not.toHaveBeenCalled();
    expect(screen.queryByText('GRAND TOTAL')).not.toBeInTheDocument();
  });

  it('resets dates and clears the report without making another request', async () => {
    render(<TrialBalance />);
    applyDateRange();
    expect(await screen.findByText('1001 - Cash in Bank')).toBeInTheDocument();
    expect(getSpy).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /Reset/ }));

    expect(screen.getByLabelText('From Date')).toHaveValue('');
    expect(screen.getByLabelText('To Date')).toHaveValue('');
    expect(screen.queryByText('1001 - Cash in Bank')).not.toBeInTheDocument();
    expect(getSpy).toHaveBeenCalledTimes(1);
  });

  it('exports a valid workbook with the visible report rows, totals, and applied period', async () => {
    render(<TrialBalance />);

    const exportButton = screen.getByRole('button', { name: 'Export' });
    expect(exportButton).toBeVisible();
    expect(getSpy).not.toHaveBeenCalled();
    applyDateRange();
    expect(await screen.findByText('1001 - Cash in Bank')).toBeInTheDocument();
    expect(exportButton).toBeEnabled();

    expect(getSpy).toHaveBeenCalledWith(
      '/reports/trial-balance?start_date=2025-01-01&as_of_date=2025-12-31',
    );
    const visibleTotalCells = Array.from(
      screen.getByText('GRAND TOTAL').closest('tr').querySelectorAll('td'),
    ).map((cell) => cell.textContent.trim());
    expect(visibleTotalCells).toEqual([
      'GRAND TOTAL',
      '100.00',
      '20.00',
      '30.00',
      '10.00',
      '100.00',
      '-',
    ]);

    clickExportExcel();
    expect(XLSX.writeFile).toHaveBeenCalledTimes(1);

    const [workbook, filename] = XLSX.writeFile.mock.calls[0];
    expect(filename).toBe('Trial_Balance_2025-01-01_to_2025-12-31.xlsx');

    const workbookBytes = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const reopenedWorkbook = XLSX.read(workbookBytes, { type: 'array', cellNF: true });
    const worksheet = reopenedWorkbook.Sheets['Trial Balance'];
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: true });

    expect(rows[0][0]).toBe('Trial Balance');
    expect(rows[1]).toEqual([
      'From Date: 2025-01-01',
      'To Date: 2025-12-31',
    ]);
    expect(rows[3]).toEqual([
      'Account Name',
      'Beginning Balances (Debit)',
      'Beginning Balances (Credit)',
      'CURRENT (Debit)',
      'CURRENT (Credit)',
      'BALANCE (Ending Balance) (Debit)',
      'BALANCE (Ending Balance) (Credit)',
    ]);
    expect(rows[4]).toEqual(['Total 1 - Assets', 100, 20, 30, 10, 100, 0]);
    expect(rows[5]).toEqual(['  1001 - Cash in Bank', 100, 20, 30, 10, 100, 0]);
    expect(rows[6]).toEqual(['GRAND TOTAL', 100, 20, 30, 10, 100, 0]);
    expect(worksheet.B5.z).toBe('#,##0.00;[Red](#,##0.00);-');

    expect(worksheet['!autofilter'].ref).toBe('A4:G6');
  }, 15000);

  it('disables the Export Excel menuitem when no rows are loaded', async () => {
    getSpy.mockResolvedValue({ data: [], headers: {} });
    render(<TrialBalance />);

    applyDateRange();
    await screen.findByText('No data available');
    openExportMenu();

    const exportExcelItem = getExportExcelMenuItem();
    expect(exportExcelItem).toBeTruthy();
    expect(exportExcelItem).toBeDisabled();

    fireEvent.click(exportExcelItem);
    expect(XLSX.writeFile).not.toHaveBeenCalled();
  });

  it('still shows the no-data banner if handleExportExcel runs with empty data (e.g. race with stale props)', async () => {
    render(<TrialBalance />);
    applyDateRange();
    await screen.findByText('1001 - Cash in Bank');

    await new Promise((r) => setTimeout(r, 10));

    getSpy.mockResolvedValue({ data: [], headers: {} });
    fireEvent.click(screen.getByRole('button', { name: /Reset/ }));
    applyDateRange();
    await screen.findByText('No data available');

    fireEvent.click(screen.getByRole('button', { name: 'Export' }));
    const disabledItem = getExportExcelMenuItem();
    expect(disabledItem).toBeTruthy();
    expect(disabledItem).toBeDisabled();
    expect(XLSX.writeFile).not.toHaveBeenCalled();
  });

  it('reports workbook generation failures instead of leaving an unhandled error', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    XLSX.writeFile.mockImplementation(() => {
      throw new Error('File generation failed');
    });
    render(<TrialBalance />);

    applyDateRange();
    await screen.findByText('1001 - Cash in Bank');
    clickExportExcel();

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Unable to export the Trial Balance. Please try again.',
    );
    consoleError.mockRestore();
  });

  it('keeps Export Excel disabled while filters have changed since the last Apply', async () => {
    render(<TrialBalance />);
    applyDateRange();
    await screen.findByText('1001 - Cash in Bank');

    openExportMenu();
    let item = getExportExcelMenuItem();
    expect(item).not.toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Export' }));

    fireEvent.change(screen.getByLabelText('From Date'), { target: { value: '01/02/2025' } });
    openExportMenu();
    item = getExportExcelMenuItem();
    expect(item).toBeDisabled();
    expect(XLSX.writeFile).not.toHaveBeenCalled();
  });
});
