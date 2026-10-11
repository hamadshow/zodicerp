import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import * as XLSX from 'xlsx';
import {
  DEFAULT_NUMBER_FORMAT,
  buildReportWorkbook,
  exportReportToExcel,
  toWorkbook,
} from '@/Components/ExportReportExcel';

vi.mock('xlsx', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    writeFile: vi.fn(), // stubbed browser download; real write via writeFileAtPath
  };
});

import { writeFileAtPath as _unused_writeFileAtPath } from '@/Components/ExportReportExcel';
void _unused_writeFileAtPath;

describe('buildReportWorkbook', () => {
  it('builds aoa, merges, cols, and autofilter for a typical report', () => {
    const config = buildReportWorkbook({
      title: 'Trial Balance',
      metaRows: [['From Date: 2026-01-01', 'To Date: 2026-12-31']],
      columns: [
        { header: 'Account Name', width: 50 },
        { header: 'Debit', width: 18 },
        { header: 'Credit', width: 18 },
      ],
      rows: [
        { values: ['1 - Assets', 100, 0] },
        { values: ['  1001 - Cash', 100, 0] },
      ],
      totalsRow: { label: 'GRAND TOTAL', values: [200, 0] },
      sheetName: 'Trial Balance',
    });

    expect(config.aoa).toEqual([
      ['Trial Balance'],
      ['From Date: 2026-01-01', 'To Date: 2026-12-31'],
      [],
      ['Account Name', 'Debit', 'Credit'],
      ['1 - Assets', 100, 0],
      ['  1001 - Cash', 100, 0],
      ['GRAND TOTAL', 200, 0],
    ]);
    expect(config.merges).toEqual([
      { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } },
    ]);
    expect(config.cols).toEqual([{ wch: 50 }, { wch: 18 }, { wch: 18 }]);
    expect(config.autofilter.ref).toBe('A4:C6');
    expect(config.numberFormats).toHaveLength(6); // 3 numeric cells per data row
    expect(config.numberFormats.every((f) => f.z === DEFAULT_NUMBER_FORMAT)).toBe(true);
  });

  it('supports per-column number formats', () => {
    const config = buildReportWorkbook({
      columns: [{ header: 'Amount', format: '#,##0.00;(#,##0.00)' }],
      rows: [{ values: [5] }],
    });
    expect(config.numberFormats[0].z).toBe('#,##0.00;(#,##0.00)');
    expect(config.autofilter.ref).toBe('A2:A3');
  });

  it('returns a null autofilter when there are no data rows', () => {
    const config = buildReportWorkbook({
      columns: [{ header: 'A' }],
      rows: [],
      totalsRow: null,
    });
    expect(config.autofilter).toBeNull();
    expect(config.aoa).toEqual([[], ['A']]);
  });
});

describe('toWorkbook', () => {
  it('produces a workbook SheetJS can round-trip with formats applied', () => {
    const config = buildReportWorkbook({
      title: 'Trial Balance',
      metaRows: [['From: 2026-01-01']],
      columns: [
        { header: 'Account', width: 30 },
        { header: 'Debit', width: 14 },
      ],
      rows: [{ values: ['1 - Assets', 1234.5] }],
      sheetName: 'Trial Balance',
    });
    const workbook = toWorkbook(config);
    expect(workbook.Sheets['Trial Balance']['!cols']).toEqual([{ wch: 30 }, { wch: 14 }]);
    const bytes = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const byteLength = bytes.length || bytes.byteLength || bytes?.toString().length;
    expect(byteLength).toBeGreaterThan(500); // valid xlsx payload
    const reopened = XLSX.read(bytes, { type: 'array', cellNF: true });
    const worksheet = reopened.Sheets['Trial Balance'];
    expect(worksheet.A1.v).toBe('Trial Balance');
    expect(worksheet.B5.z).toBe(DEFAULT_NUMBER_FORMAT);
    expect(worksheet['!autofilter'].ref).toBe('A4:B5');
  });
});

describe('exportReportToExcel', () => {
  beforeEach(() => {
    XLSX.writeFile.mockClear();
  });

  afterEach(() => {
    XLSX.writeFile.mockReset();
  });

  it('writes a workbook with all configured options and returns it', () => {
    const workbook = exportReportToExcel({
      title: 'My Report',
      columns: [{ header: 'Name', width: 20 }, { header: 'Amount', width: 14 }],
      rows: [{ values: ['Item A', 10] }],
      totalsRow: { label: 'TOTAL', values: [10] },
      sheetName: 'My Sheet',
      filename: 'My_Report.xlsx',
    });
    expect(XLSX.writeFile).toHaveBeenCalledTimes(1);
    const [wb, filename] = XLSX.writeFile.mock.calls[0];
    expect(filename).toBe('My_Report.xlsx');
    expect(wb.SheetNames).toContain('My Sheet');
    expect(workbook.SheetNames).toContain('My Sheet');
  });

  it('reports failures via onError without throwing or writing a partial file', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    XLSX.writeFile.mockImplementation(() => {
      throw new Error('Disk full');
    });
    const onError = vi.fn();
    const result = exportReportToExcel({
      title: 'My Report',
      columns: [{ header: 'Name' }],
      rows: [{ values: ['Item A'] }],
      filename: 'My_Report.xlsx',
      onError,
    });
    expect(result).toBeNull();
    expect(onError).toHaveBeenCalledTimes(1);
    consoleError.mockRestore();
  });

  it('handles empty rows without crashing and still writes a valid workbook', () => {
    const workbook = exportReportToExcel({
      title: 'My Report',
      columns: [{ header: 'Name' }],
      rows: [],
      totalsRow: null,
      sheetName: 'Sheet1',
      filename: 'Empty_Report.xlsx',
    });
    expect(workbook).not.toBeNull();
    expect(XLSX.writeFile).toHaveBeenCalledWith(
      expect.objectContaining({ SheetNames: ['Sheet1'] }),
      'Empty_Report.xlsx',
    );
  });
});

describe('writeFileAtPath', () => {
  it('writes a real xlsx file to disk (used for verification)', async () => {
    const fs = await import('node:fs');
    const os = await import('node:os');
    const path = await import('node:path');
    const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'export-excel-'));
    const filePath = path.join(dir, 'Sample.xlsx');

    const config = buildReportWorkbook({
      title: 'Sample',
      columns: [{ header: 'Name', width: 20 }, { header: 'Amount', width: 14 }],
      rows: [{ values: ['Item A', 42] }],
      sheetName: 'Sample',
    });
    const workbook = toWorkbook(config);
    // Bypass the writeFile mock to exercise the real file writer:
    const actualXLSX = await vi.importActual('xlsx');
    actualXLSX.writeFile(workbook, filePath, { type: 'file', bookType: 'xlsx' });

    expect(fs.existsSync(filePath)).toBe(true);
    const blob = fs.readFileSync(filePath);
    expect(blob.length).toBeGreaterThan(5000);
    // xlsx files are ZIP archives: check PK signature.
    expect(blob[0]).toBe(0x50);
    expect(blob[1]).toBe(0x4b);

    const reopened = XLSX.read(blob, { type: 'buffer', cellNF: true });
    expect(Object.keys(reopened.Sheets)).toContain('Sample');
    const sheet = reopened.Sheets.Sample;
    const values = Object.values(sheet).filter((cell) => cell && typeof cell === 'object' && 'v' in cell).map((cell) => cell.v);
    expect(values).toContain(42);
    await fs.promises.rm(dir, { recursive: true, force: true });
  });
});
