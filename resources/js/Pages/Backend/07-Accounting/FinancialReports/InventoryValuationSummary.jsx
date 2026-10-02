import React, { useEffect, useState, useMemo } from 'react';
import { Head, Link } from '@inertiajs/react';
import AdminLayout from '../../components/AdminLayout';
import { apiService } from '../../../../services/api';

const t = (key, fallback) => {
  const translations = {
    'inventory_reports': 'Inventory Reports',
    'inventory_valuation_summary': 'Inventory Valuation Summary',
    'all_types': 'All Types',
    'all_status': 'All Status',
    'active': 'Active',
    'inactive': 'Inactive',
    'period': 'Period',
    'generated_on': 'Generated on',
    'search': 'Search',
    'search_products': 'Search products...',
    'print': 'Print',
    'export': 'Export',
    'opening_qty': 'Opening Qty',
    'opening_value': 'Opening Value',
    'in_qty': 'In Qty',
    'in_value': 'In Value',
    'out_qty': 'Out Qty',
    'out_value': 'Out Value',
    'closing_qty': 'Closing Qty',
    'avg_cost': 'Avg Cost',
    'closing_value': 'Closing Value',
    'totals': 'TOTALS',
    'loading_data': 'Loading inventory data...',
    'no_data': 'No products found for the selected period.',
    'yes': 'Yes'
  };
  return translations[key] || fallback;
};

export default function InventoryValuationSummary() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const financialReportsRoute = () => route('admin.financial-reports.index', {
        country: route().params.country || 'sa',
        lang: route().params.lang || 'ar',
    });

    useEffect(() => {
        fetchData();
    }, [startDate, endDate]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const response = await apiService.get(`/financial-reports/inventory-valuation-summary?start_date=${startDate}&end_date=${endDate}`);
            setData(response.data.data || []);
        } catch (error) {
            console.error('Failed to fetch inventory valuation data:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredData = useMemo(() => {
        if (!searchTerm) return data;
        const s = searchTerm.toLowerCase();
        return data.filter(item =>
            (item.product_name && item.product_name.toLowerCase().includes(s)) ||
            (item.unit && item.unit.toLowerCase().includes(s))
        );
    }, [data, searchTerm]);

    const totals = useMemo(() => {
        return filteredData.reduce((acc, item) => ({
            openingQty: acc.openingQty + (item.opening_qty || 0),
            openingValue: acc.openingValue + (item.opening_value || 0),
            inQty: acc.inQty + (item.in_qty || 0),
            inValue: acc.inValue + (item.in_value || 0),
            outQty: acc.outQty + (item.out_qty || 0),
            outValue: acc.outValue + (item.out_value || 0),
            closingQty: acc.closingQty + (item.closing_qty || 0),
            closingValue: acc.closingValue + (item.closing_value || 0),
        }), {
            openingQty: 0, openingValue: 0, inQty: 0, inValue: 0, outQty: 0, outValue: 0, closingQty: 0, closingValue: 0
        });
    }, [filteredData]);

    const handlePrint = () => window.print();
    const handleExport = () => {
        const url = route('admin.financial-reports.inventory-valuation-summary.export', {
            country: route().params.country || 'sa',
            lang: route().params.lang || 'en',
            start_date: startDate,
            end_date: endDate
        });
        window.location.href = url;
    };

    const formatNumber = (num) => {
        if (num === undefined || num === null) return '0.00';
        return Number(num).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    return (
        <AdminLayout activeMenu="Financial Reports">
            <div className="fr-page InventoryValuationSummary-page">
                <Head title="Inventory Valuation Summary - ZodicERP" />

                <div className="fr-breadcrumb">
                    <Link href={route('admin.dashboard')}>Dashboard</Link>
                    <span className="fr-sep">/</span>
                    <Link href={financialReportsRoute()}>Financial Reports</Link>
                    <span className="fr-sep">/</span>
                    <span className="fr-current">{t('inventory_reports', 'Inventory Reports')}</span>
                </div>

                <div className="fr-header-card">
                    <div>
                        <h1 className="fr-title">{t('inventory_valuation_summary', 'Inventory Valuation Summary')}</h1>
                        <p className="fr-subtitle">
                            {t('period', 'Period')}: {startDate} to {endDate} | {t('generated_on', 'Generated on')} {new Date().toLocaleDateString()}
                        </p>
                    </div>
                </div>

                <div className="fr-filters-card">
                    <div className="fr-filters-grid">
                        <div className="fr-form-group">
                            <label htmlFor="fr-search">{t('search', 'Search')}</label>
                            <input
                                id="fr-search"
                                type="text"
                                className="fr-input"
                                placeholder={t('search_products', 'Search products...')}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="fr-form-group">
                            <label htmlFor="fr-start">{t('period', 'Period From')}</label>
                            <input
                                id="fr-start"
                                type="date"
                                className="fr-input"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>
                        <div className="fr-form-group">
                            <label htmlFor="fr-end">{t('to', 'To')}</label>
                            <input
                                id="fr-end"
                                type="date"
                                className="fr-input"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="fr-form-actions">
                        <button
                            type="button"
                            className="btn btn-primary fr-btn"
                            onClick={handlePrint}
                        >
                            <span className="material-icons-outlined">print</span>
                            <span>{t('print', 'Print')}</span>
                        </button>
                        <button
                            type="button"
                            className="btn btn-excel fr-btn"
                            onClick={handleExport}
                        >
                            <span className="material-icons-outlined">description</span>
                            <span>{t('export', 'Export')}</span>
                        </button>
                    </div>
                </div>

                <div className="fr-table-card">
                    <div className="fr-table-wrapper">
                        <table className="fr-table">
                            <thead>
                                <tr>
                                    <th className="fr-th">Product</th>
                                    <th className="fr-th">Unit</th>
                                    <th className="fr-th fr-amount-header">{t('opening_qty', 'Opening Qty')}</th>
                                    <th className="fr-th fr-amount-header">{t('opening_value', 'Opening Value')}</th>
                                    <th className="fr-th fr-amount-header">{t('in_qty', 'In Qty')}</th>
                                    <th className="fr-th fr-amount-header">{t('in_value', 'In Value')}</th>
                                    <th className="fr-th fr-amount-header">{t('out_qty', 'Out Qty')}</th>
                                    <th className="fr-th fr-amount-header">{t('out_value', 'Out Value')}</th>
                                    <th className="fr-th fr-amount-header">{t('closing_qty', 'Closing Qty')}</th>
                                    <th className="fr-th fr-amount-header">{t('avg_cost', 'Avg Cost')}</th>
                                    <th className="fr-th fr-amount-header">{t('closing_value', 'Closing Value')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan="11" className="fr-empty-td">{t('loading_data', 'Loading inventory data...')}</td>
                                    </tr>
                                ) : filteredData.length > 0 ? (
                                    filteredData.map((item, idx) => (
                                        <tr key={idx}>
                                            <td className="font-medium">{item.product_name}</td>
                                            <td>{item.unit}</td>
                                            <td className="fr-amount">{formatNumber(item.opening_qty)}</td>
                                            <td className="fr-amount">{formatNumber(item.opening_value)}</td>
                                            <td className="fr-amount">{formatNumber(item.in_qty)}</td>
                                            <td className="fr-amount">{formatNumber(item.in_value)}</td>
                                            <td className="fr-amount">{formatNumber(item.out_qty)}</td>
                                            <td className="fr-amount">{formatNumber(item.out_value)}</td>
                                            <td className="fr-amount">{formatNumber(item.closing_qty)}</td>
                                            <td className="fr-amount">{formatNumber(item.avg_cost)}</td>
                                            <td className="fr-amount font-bold">{formatNumber(item.closing_value)}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="11" className="fr-empty-state">
                                            {t('no_data', 'No products found for the selected period.')}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                            {!loading && filteredData.length > 0 && (
                                <tfoot>
                                    <tr>
                                        <td colSpan="2" className="font-bold">{t('totals', 'TOTALS')}</td>
                                        <td className="fr-amount font-bold">{formatNumber(totals.openingQty)}</td>
                                        <td className="fr-amount font-bold">{formatNumber(totals.openingValue)}</td>
                                        <td className="fr-amount font-bold">{formatNumber(totals.inQty)}</td>
                                        <td className="fr-amount font-bold">{formatNumber(totals.inValue)}</td>
                                        <td className="fr-amount font-bold">{formatNumber(totals.outQty)}</td>
                                        <td className="fr-amount font-bold">{formatNumber(totals.outValue)}</td>
                                        <td className="fr-amount font-bold">{formatNumber(totals.closingQty)}</td>
                                        <td></td>
                                        <td className="fr-amount font-bold">{formatNumber(totals.closingValue)}</td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                </div>
            </div>

            <style jsx>{`{
                .InventoryValuationSummary-page { padding: 40px; background-color: #f9fafb; min-height: 100vh; }
                .rtl { direction: rtl; text-align: right; }
                .ltr { direction: ltr; text-align: left; }
                .fr-breadcrumb { margin-bottom: 16px; }
                .fr-header-card { margin-bottom: 18px; }
                .fr-filters-card { margin-bottom: 18px; }
                .fr-filters-grid { grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; align-items: flex-end; }
                .fr-form-group label { font-size: 0.8rem; font-weight: 500; }
                .fr-input { font-size: 0.85rem; }
                .fr-form-actions { justify-content: flex-start; gap: 8px; }
                .fr-table { font-size: 0.85rem; }
                .fr-table th, .fr-table td { padding: 8px 10px; }
                .fr-table .fr-amount-header { text-align: right; }
                .fr-table .fr-amount { text-align: right; font-variant-numeric: tabular-nums; }
                .fr-status-badge {
                    padding: 2px 10px;
                    border-radius: 12px;
                    font-size: 0.75rem;
                    font-weight: 700;
                    text-transform: uppercase;
                }
                .fr-status-active { background: #d4edda; color: #155724; }
                .fr-status-inactive { background: #f8d7da; color: #721c24; }
                .level-indicator {
                    display: inline-block;
                    width: 4px;
                    height: 4px;
                    border-radius: 50%;
                    background: #94a3b8;
                    margin-right: 6px;
                }
                @media print {
                    .fr-page { padding: 0; background: white; }
                    .fr-breadcrumb, .fr-header-card, .fr-filters-card, .fr-form-actions { display: none !important; }
                    .fr-table-card { box-shadow: none !important; margin: 0 !important; width: 100% !important; max-width: none !important; }
                    body { background: white !important; }
                }
                .rtl .fr-breadcrumb { direction: rtl; }
                .rtl .text-left { text-align: right !important; }
                .rtl .text-right { text-align: left !important; }
            `}</style>
        </AdminLayout>
    );
}
