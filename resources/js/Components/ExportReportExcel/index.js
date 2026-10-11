/**
 * ExportReportExcel
 * -----------------
 * Reusable Excel export helpers for financial report pages.
 *
 * Built on top of the `xlsx` library already used across the project
 * (see resources/js/Pages/Backend/** pages). Each report page supplies its
 * own configuration (column definitions, metadata, filename, formatting),
 * so every report can share the same builder while keeping its own shape.
 *
 * Typical usage in a report page:
 *
 *   import { exportReportToExcel } from '@/Components/ExportReportExcel';
 *
 *   exportReportToExcel({
 *     title: t('title', 'Trial Balance'),
 *     metaRows: [[`From Date: ...`, `To Date: ...`]],
 *     columns: [{ header, width, key, format }],
 *     rows: [{ values: [...], format: 'number' }],
 *     totalsRow: { label, values, format: 'number' },
 *     sheetName: 'Trial Balance',
 *     filename: 'Trial_Balance_2026-01-01_to_2026-12-31.xlsx',
 *     onError: (msg) => setExportError(msg),
 *   });
 *
 * `exportReportToExcel` never throws; it reports failures via `onError`
 * (or console.error) so callers can surface them to the user.
 */
import * as XLSX from 'xlsx';

/** Default number format applied to numeric cells when no column format is given. */
export const DEFAULT_NUMBER_FORMAT = '#,##0.00;[Red](#,##0.00);-';

/**
 * Build a full workbook config for a report. Pure function: returns an object
 * that can be inspected in tests or passed to `writeReportWorkbook`.
 *
 * @param {object} options
 * @param {string}   [options.title]           - Big top title (merged across the table).
 * @param {string[]|string[][]} [options.metaRows] - Rows above the table (period, filters, etc).
 * @param {Array<{header:string,width?:number,format?:string}>} options.columns
 *     Column definitions: header text and optional width + number format per column.
 * @param {Array<{values:(string|number)[], bold?:boolean, format?:string}>} [options.rows]
 *     Data rows. Each row supplies one value per column.
 * @param {{label:string, values:number[], format?:string}} [options.totalsRow]
 *     Optional footer totals row.
 * @param {string} [options.sheetName='Report']      - Worksheet tab name.
 * @param {string} [options.numberFormat]            - Fallback format for numeric cells.
 * @returns {{workbook:sheetConfig, filename:string}} where workbook is a plain
 *     sheet config object (aoa + merges + cols + numberFormats + autofilter).
 */
export function buildReportWorkbook({
  title,
  metaRows = [],
  columns = [],
  rows = [],
  totalsRow = null,
  sheetName = 'Report',
  numberFormat = DEFAULT_NUMBER_FORMAT,
}) {
  const tableStartIndex = 1 + (title ? 1 : 0) + metaRows.length; // 0-based row index of headers
  const totalColumns = columns.length;

  const aoa = [];
  if (title) aoa.push([title]);
  metaRows.forEach((metaRow) => aoa.push(Array.isArray(metaRow) ? metaRow : [metaRow]));
  aoa.push([]);
  aoa.push(columns.map((col) => col.header));
  rows.forEach((row) => {
    aoa.push(row.values.slice(0, totalColumns));
  });
  if (totalsRow) {
    aoa.push([totalsRow.label, ...totalsRow.values]);
  }

  // Merges: title across all columns; meta rows too (so they don't wrap oddly).
  const merges = [];
  if (title && totalColumns > 1) {
    merges.push({
      s: { r: 0, c: 0 },
      e: { r: 0, c: totalColumns - 1 },
    });
  }
  metaRows.forEach((_, metaIndex) => {
    if (totalColumns > 1) {
      merges.push({
        s: { r: (title ? 1 : 0) + metaIndex, c: 0 },
        e: { r: (title ? 1 : 0) + metaIndex, c: totalColumns - 1 },
      });
    }
  });

  // Column widths come from the config (x = character width per SheetJS).
  const cols = columns.map((col) => ({ wch: col.width ?? Math.max(12, col.header.length + 4) }));

  // Collect which cells hold numbers and which format each should use.
  const numberFormats = [];
  rows.forEach((row, rowIndex) => {
    row.values.forEach((value, colIndex) => {
      if (typeof value === 'number') {
        numberFormats.push({
          r: tableStartIndex + 1 + rowIndex,
          c: colIndex,
          z: columns[colIndex]?.format ?? row.format ?? numberFormat,
        });
      }
    });
  });
  if (totalsRow) {
    totalsRow.values.forEach((value, colIndex) => {
      if (typeof value === 'number') {
        numberFormats.push({
          r: tableStartIndex + 1 + rows.length,
          c: colIndex,
          z: totalsRow.format ?? columns[colIndex]?.format ?? numberFormat,
        });
      }
    });
  }

  return {
    sheetName,
    aoa,
    merges,
    cols,
    numberFormats,
    autofilter: rows.length > 0
      ? {
          // Header row (4th row: title, meta, blank, header) to last data row (excl totals).
          ref: XLSX.utils.encode_range({
            s: { r: tableStartIndex, c: 0 },
            e: { r: tableStartIndex + rows.length, c: totalColumns - 1 },
          }),
        }
      : null,
    __tableStartIndex: tableStartIndex,
    __totalColumns: totalColumns,
  };
}

/**
 * Turn a workbook config (from `buildReportWorkbook`) into an xlsx workbook
 * object ready for `XLSX.write` / `XLSX.writeFile` / `XLSX.writeBuffer`.
 */
export function toWorkbook(config) {
  const worksheet = XLSX.utils.aoa_to_sheet(config.aoa);
  if (config.merges?.length) worksheet['!merges'] = config.merges;
  if (config.cols?.length) worksheet['!cols'] = config.cols;
  if (config.autofilter) worksheet['!autofilter'] = config.autofilter;

  config.numberFormats?.forEach(({ r, c, z }) => {
    const address = XLSX.utils.encode_cell({ r, c });
    if (worksheet[address]) worksheet[address].z = z;
  });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, config.sheetName);
  return workbook;
}

/**
 * Write a workbook to a specific file path (node-only; useful in tests
 * and for generating sample output files). Returns void; throws on error.
 */
export function writeFileAtPath(workbook, filePath) {
  XLSX.writeFile(workbook, filePath, { bookType: 'xlsx', type: 'file' });
}

/**
 * Generate and download the workbook in the browser.
 * Wraps everything in a single try/catch; on failure calls `onError`
 * with a user-facing message instead of throwing.
 */
export function exportReportToExcel({
  title,
  metaRows,
  columns,
  rows,
  totalsRow,
  sheetName,
  numberFormat,
  filename,
  onError,
}) {
  try {
    const config = buildReportWorkbook({
      title,
      metaRows,
      columns,
      rows,
      totalsRow,
      sheetName,
      numberFormat,
    });
    const workbook = toWorkbook(config);
    XLSX.writeFile(workbook, filename);
    return workbook;
  } catch (error) {
    console.error('Failed to export report to Excel:', error);
    if (typeof onError === 'function') {
      onError(error);
    }
    return null;
  }
}

