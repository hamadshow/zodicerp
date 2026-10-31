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

  it('hides the logo when its image cannot be loaded', () => {
    render(<PrintReport companyName="Example Company" companyLogo="/missing-logo.png" />);

    const logo = screen.getByRole('img', { name: 'Example Company' });
    fireEvent.error(logo);

    expect(logo).toHaveAttribute('hidden');
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

  it('selects the company name by locale and omits unavailable company details', () => {
    const companyInfo = {
      company_name: 'شركة المثال',
      english_name: 'Example Company',
      mobile: '123456789',
      country: 'Saudi Arabia',
      city: '',
      area: 'Riyadh',
      vat_number: 'VAT-123',
    };
    const { rerender } = render(
      <PrintReport
        companyInfo={companyInfo}
        companyLogo="/storage/company-logo.png"
        reportTitle="Trial Balance"
        locale="en"
      />,
    );

    expect(screen.getByText('Example Company')).toBeInTheDocument();
    expect(screen.getByText('123456789')).toBeInTheDocument();
    expect(screen.getByText('Saudi Arabia - Riyadh')).toBeInTheDocument();
    expect(screen.getByText('VAT-123')).toBeInTheDocument();
    expect(document.querySelector('.print-report')).toHaveAttribute('dir', 'ltr');
    expect(document.querySelector('.print-report__company-block').firstElementChild).toHaveClass(
      'print-report__logo',
    );
    expect(
      document.querySelector('.print-report__company-block').compareDocumentPosition(
        document.querySelector('.print-report__title-block'),
      ) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    rerender(
      <PrintReport
        companyInfo={{ ...companyInfo, english_name: null, mobile: null, country: null, vat_number: null }}
        companyLogo="/storage/company-logo.png"
        reportTitle="ميزان المراجعة"
        locale="ar"
      />,
    );

    expect(screen.getByText('شركة المثال')).toBeInTheDocument();
    expect(screen.getByText('Riyadh')).toBeInTheDocument();
    expect(screen.queryByText(/undefined|null/)).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'ميزان المراجعة' })).toBeInTheDocument();
    expect(document.querySelector('.print-report')).toHaveAttribute('dir', 'rtl');
    expect(document.querySelector('.print-report__company-block').firstElementChild).toHaveClass(
      'print-report__logo',
    );
  });
});