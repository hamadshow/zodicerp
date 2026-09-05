import React, { useEffect, useState, useMemo } from 'react';
import { Head, Link } from '@inertiajs/react';
import AdminLayout from '../../components/AdminLayout';
import { apiService } from '../../../../services/api';

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
            <div className="FinancialReports-page InventoryValuationSummary-page">
                <Head title="Inventory Valuation Summary - ZodicERP" />

                <div className="breadcrumb no-print">
                    <Link href={route('admin.dashboard')}>Dashboard</Link>
                    <span>/</span>
                    <Link href={financialReportsRoute()}>Financial Reports</Link>
                    <span>/</span>
                    <span>Inventory Reports</span>
                    <span>/</span>
                    <span>Inventory Valuation Summary</span>
                </div>

                <div className="report-header">
                    <div className="report-title-section">
                        <h1>Inventory Valuation Summary</h1>
                        <p className="report-subtitle">
                            Period: {startDate} to {endDate} | Generated on {new Date().toLocaleDateString()}
                        </p>
                    </div>
                    <div className="report-actions no-print">
                        <button className="btn btn-outline" onClick={handlePrint}>
                            <span className="material-icons-outlined">print</span> Print
                        </button>
                        <button className="btn btn-primary" onClick={handleExport}>
                            <span className="material-icons-outlined">download</span> Export
                        </button>
                    </div>
                </div>

                <div className="filters-bar no-print">
                    <div className="filters-group">
                        <div className="search-input-wrapper">
                            <span className="material-icons-outlined search-icon">search</span>
                            <input
                                type="text"
                                className="search-input"
                                placeholder="Search products..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="date-filters">
                            <input 
                                type="date" 
                                className="filter-input" 
                                value={startDate} 
                                onChange={(e) => setStartDate(e.target.value)} 
                            />
                            <span>to</span>
                            <input 
                                type="date" 
                                className="filter-input" 
                                value={endDate} 
                                onChange={(e) => setEndDate(e.target.value)} 
                            />
                        </div>
                    </div>
                </div>

                <div className="report-table-container">
                    <table className="report-table">
                        <thead>
                            <tr>
                                <th>Product</th>
                                <th>Unit</th>
                                <th className="text-right">Opening Qty</th>
                                <th className="text-right">Opening Value</th>
                                <th className="text-right">In Qty</th>
                                <th className="text-right">In Value</th>
                                <th className="text-right">Out Qty</th>
                                <th className="text-right">Out Value</th>
                                <th className="text-right">Closing Qty</th>
                                <th className="text-right">Avg Cost</th>
                                <th className="text-right">Closing Value</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="11" className="text-center" style={{ padding: '40px' }}>
                                        Loading inventory data...
                                    </td>
                                </tr>
                            ) : filteredData.length > 0 ? (
                                filteredData.map((item, idx) => (
                                    <tr key={idx}>
                                        <td className="font-medium">{item.product_name}</td>
                                        <td>{item.unit}</td>
                                        <td className="text-right">{formatNumber(item.opening_qty)}</td>
                                        <td className="text-right">{formatNumber(item.opening_value)}</td>
                                        <td className="text-right">{formatNumber(item.in_qty)}</td>
                                        <td className="text-right">{formatNumber(item.in_value)}</td>
                                        <td className="text-right">{formatNumber(item.out_qty)}</td>
                                        <td className="text-right">{formatNumber(item.out_value)}</td>
                                        <td className="text-right">{formatNumber(item.closing_qty)}</td>
                                        <td className="text-right">{formatNumber(item.avg_cost)}</td>
                                        <td className="text-right font-bold">{formatNumber(item.closing_value)}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="11" className="empty-state text-center" style={{ padding: '40px' }}>
                                        No products found for the selected period.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                        {!loading && filteredData.length > 0 && (
                            <tfoot>
                                <tr>
                                    <td colSpan="2" className="font-bold">TOTALS</td>
                                    <td className="text-right font-bold">{formatNumber(totals.openingQty)}</td>
                                    <td className="text-right font-bold">{formatNumber(totals.openingValue)}</td>
                                    <td className="text-right font-bold">{formatNumber(totals.inQty)}</td>
                                    <td className="text-right font-bold">{formatNumber(totals.inValue)}</td>
                                    <td className="text-right font-bold">{formatNumber(totals.outQty)}</td>
                                    <td className="text-right font-bold">{formatNumber(totals.outValue)}</td>
                                    <td className="text-right font-bold">{formatNumber(totals.closingQty)}</td>
                                    <td></td>
                                    <td className="text-right font-bold">{formatNumber(totals.closingValue)}</td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>
        </AdminLayout>
    );
}
