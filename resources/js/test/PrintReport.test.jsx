import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, cleanup } from '@testing-library/react';
import PrintReport, { PrintReportButton } from '@/Components/PrintReport';

describe('PrintReport', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('sends the report to the browser print dialog from the Print button', () => {
    const print = vi.fn();
    Object.defineProperty(window, 'print', { configurable: true, value: print });

    render(<PrintReportButton>Print</PrintReportButton>);
    fireEvent.click(screen.getByRole('button', { name: 'Print' }));

    expect(print).toHaveBeenCalledTimes(1);
  });

  it('renders the company identity, report title, and requested date range', () => {
    render(
      <PrintReport
        companyName="Example Company"
        companyLogo="/storage/company_logos/logo.png"
        reportTitle="Chart of Accounts"
        dateFrom="2026-01-01"
        dateTo="2026-10-13"
        locale="en"
      >
        <table><tbody><tr><td>Account 1000</td></tr></tbody></table>
      </PrintReport>,
    );

    expect(screen.getByText('Example Company')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Chart of Accounts' })).toBeInTheDocument();
    expect(screen.getByText(/From: January 1, 2026/)).toBeInTheDocument();
    expect(screen.getByText(/To: October 13, 2026/)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Example Company' })).toHaveAttribute(
      'src',
      '/storage/company_logos/logo.png',
    );
    expect(screen.getByText('Account 1000')).toBeInTheDocument();
  });
});