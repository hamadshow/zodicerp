import React, { useState } from 'react';
import { Head, usePage, router } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';

/**
 * Inventory Reports + Reconciliation (Phase 7).
 *
 * The report runs as an Inertia partial reload (only=['report']) — the "Run"
 * action never remounts the page. Resync actions post ledger-recorded
 * corrections (balance) or pure cache writes (derived quantity) and then
 * refresh the report.
 */
export default function InventoryReports({ warehouses = [], report = null, filters = {} }) {
    const { localization, errors: pageErrors = {} } = usePage().props;
    const translations = localization?.translations || {};

    const t = (key, fallback) => translations[key] || translations[`common.${key}`] || fallback;

    const getLocalizedRoute = (name, params = {}) =>
        route(name, {
            country: localization?.country_code || 'sa',
            lang: localization?.current_locale || 'ar',
            ...params,
        });

    const [warehouseId, setWarehouseId] = useState(filters?.warehouse_id ? String(filters.warehouse_id) : '');
    const [running, setRunning] = useState(false);

    const runReport = () => {
        setRunning(true);
        router.get(
            getLocalizedRoute('admin.inventory.reports.index'),
            { run: 1, warehouse_id: warehouseId || undefined },
            {
                only: ['report'],
                preserveState: true,
                preserveScroll: true,
                onFinish: () => setRunning(false),
            }
        );
    };

    const resyncBalance = (productId, whId) => {
        if (window.confirm(t('confirm_resync_balance', 'Post a ledger-recorded correction document to bring the WAC balance in line with the movement ledger?'))) {
            router.post(
                getLocalizedRoute('admin.inventory.reports.resync-balance'),
                { product_id: productId, warehouse_id: whId },
                { preserveScroll: true, onSuccess: () => runReport() }
            );
        }
    };

    const resyncDerived = (productId) => {
        if (window.confirm(t('confirm_resync_derived', 'Rewrite the derived product quantity from the movement ledger?'))) {
            router.post(
                getLocalizedRoute('admin.inventory.reports.resync-derived'),
                { product_id: productId },
                { preserveScroll: true, onSuccess: () => runReport() }
            );
        }
    };

    const mismatches = report?.mismatches || [];
    const derivedDrift = report?.derived_drift || [];
    const summary = report?.summary || null;

    return (
        <AdminLayout activeMenu={t('inventory_reports', 'Inventory Reports')}>
            <Head title={t('inventory_reports', 'Inventory Reports')} />

            <div className="reconciliation-module">
                <div className="reconciliation-module__header">
                    <div>
                        <h1>{t('inventory_reports', 'Inventory Reports')}</h1>
                        <p className="reconciliation-module__subtitle">
                            {t('reconciliation_subtitle', 'Movement ledger vs weighted-average ledger vs derived quantities')}
                        </p>
                    </div>
                </div>

                {pageErrors.general && (
                    <div className="reconciliation-module__alert reconciliation-module__alert--error">{pageErrors.general}</div>
                )}

                <div className="reconciliation-module__section">
                    <h3>{t('reconciliation', 'Reconciliation')}</h3>
                    <p className="reconciliation-module__hint">
                        {t(
                            'reconciliation_hint',
                            'The movement ledger and the weighted-average ledger are the source of truth; products.quantity is a derived cache. Balance corrections are posted as real reconciliation documents so the fix itself stays auditable.'
                        )}
                    </p>

                    <div className="reconciliation-module__controls">
                        <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
                            <option value="">{t('all_warehouses', 'All warehouses')}</option>
                            {warehouses.map((w) => (
                                <option key={w.id} value={w.id}>{w.name}</option>
                            ))}
                        </select>
                        <button type="button" className="btn btn--primary" onClick={runReport} disabled={running}>
                            {running ? t('running', 'Running...') : t('run_reconciliation', 'Run Reconciliation')}
                        </button>
                    </div>

                    {summary && (
                        <div className="reconciliation-module__summary">
                            <span className="badge badge-danger">
                                {t('balance_mismatches', 'Balance mismatches')}: {summary.balance_mismatches}
                            </span>
                            <span className="badge badge-secondary">
                                {t('legacy_lines', 'Legacy-line products')}: {summary.legacy_line_products}
                            </span>
                            <span className="badge badge-secondary">
                                {t('derived_drifts', 'Derived drifts')}: {summary.derived_drifts}
                            </span>
                        </div>
                    )}

                    {mismatches.length > 0 && (
                        <table className="reconciliation-module__table">
                            <thead>
                                <tr>
                                    <th>{t('product', 'Product')}</th>
                                    <th>{t('warehouse', 'Warehouse')}</th>
                                    <th className="text-end">{t('ledger_quantity', 'Movement ledger')}</th>
                                    <th className="text-end">{t('wac_quantity', 'WAC balance')}</th>
                                    <th className="text-end">{t('delta', 'Delta')}</th>
                                    <th className="text-end">{t('legacy_lines', 'Lines w/o ICT')}</th>
                                    <th>{t('actions', 'Actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {mismatches.map((row) => (
                                    <tr key={`${row.product_id}-${row.warehouse_id}`}>
                                        <td>#{row.product_id}</td>
                                        <td>{warehouses.find((w) => String(w.id) === String(row.warehouse_id))?.name || `#${row.warehouse_id}`}</td>
                                        <td className="text-end">{Number(row.ledger_quantity).toLocaleString()}</td>
                                        <td className="text-end">{Number(row.wac_quantity).toLocaleString()}</td>
                                        <td className={`text-end ${row.delta > 0 ? 'text-success' : 'text-danger'}`}>{row.delta}</td>
                                        <td className="text-end">{row.legacy_lines_without_ict || '-'}</td>
                                        <td>
                                            {row.delta !== 0 && (
                                                <button
                                                    type="button"
                                                    className="btn btn--secondary btn--sm"
                                                    onClick={() => resyncBalance(row.product_id, row.warehouse_id)}
                                                >
                                                    {t('resync_balance', 'Post correction')}
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}

                    {derivedDrift.length > 0 && (
                        <h4 className="reconciliation-module__subsection">{t('derived_drift', 'Derived quantity drift (products.quantity)')}</h4>
                    )}
                    {derivedDrift.length > 0 && (
                        <table className="reconciliation-module__table">
                            <thead>
                                <tr>
                                    <th>{t('product', 'Product')}</th>
                                    <th className="text-end">{t('derived_quantity', 'products.quantity')}</th>
                                    <th className="text-end">{t('ledger_total', 'Ledger total')}</th>
                                    <th className="text-end">{t('delta', 'Delta')}</th>
                                    <th>{t('actions', 'Actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {derivedDrift.map((row) => (
                                    <tr key={row.product_id}>
                                        <td>#{row.product_id}</td>
                                        <td className="text-end">{Number(row.derived_quantity).toLocaleString()}</td>
                                        <td className="text-end">{Number(row.ledger_total).toLocaleString()}</td>
                                        <td className={`text-end ${row.delta > 0 ? 'text-success' : 'text-danger'}`}>{row.delta}</td>
                                        <td>
                                            <button
                                                type="button"
                                                className="btn btn--secondary btn--sm"
                                                onClick={() => resyncDerived(row.product_id)}
                                            >
                                                {t('resync_derived', 'Resync cache')}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}

                    {report && mismatches.length === 0 && derivedDrift.length === 0 && (
                        <div className="reconciliation-module__empty">
                            {t('reconciliation_clean', 'No drift detected — ledgers and derived quantities agree.')}
                        </div>
                    )}
                </div>

                <div className="reconciliation-module__section">
                    <h3>{t('other_reports', 'Other Reports')}</h3>
                    <div className="grid grid-cols-2 gap-6">
                        <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition">
                            <h3 className="font-bold text-lg mb-2">{t('stock_by_warehouse', 'Stock by Warehouse')}</h3>
                            <p className="text-gray-600 mb-4">{t('stock_by_warehouse_desc', 'View current stock levels broken down by warehouse.')}</p>
                            <p className="text-sm text-gray-500">{t('via_stock_card', 'Available via Stock Adjustments → Warehouse Stock')}</p>
                        </div>
                        <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition">
                            <h3 className="font-bold text-lg mb-2">{t('stock_card', 'Stock Card')}</h3>
                            <p className="text-gray-600 mb-4">{t('stock_card_desc', 'Track all movements for a specific product with running balance.')}</p>
                            <p className="text-sm text-gray-500">{t('via_stock_card_2', 'Available via Stock Adjustments → Stock Card')}</p>
                        </div>
                        <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition">
                            <h3 className="font-bold text-lg mb-2">{t('movement_report', 'Movement Report')}</h3>
                            <p className="text-gray-600 mb-4">{t('movement_report_desc', 'View all inventory movements (in/out) by date range and type.')}</p>
                            <p className="text-sm text-blue-500">{t('served_by_reconciliation', 'Covered by the reconciliation view above')}</p>
                        </div>
                        <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition">
                            <h3 className="font-bold text-lg mb-2">{t('inventory_valuation', 'Inventory Valuation')}</h3>
                            <p className="text-gray-600 mb-4">{t('inventory_valuation_desc', 'Calculate total inventory value by product and warehouse.')}</p>
                            <p className="text-sm text-blue-500">{t('available_in_financial', 'Available in Financial Reports → Inventory Valuation')}</p>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
