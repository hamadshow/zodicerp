import React, { useMemo } from 'react';
import { Head, Link } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';

export default function Portfolio({ portfolio }) {
    const totalStats = useMemo(() => {
        let totalCost = 0;
        let totalMarket = 0;
        let totalProfit = 0;

        portfolio.forEach(item => {
            totalCost += parseFloat(item.quantity) * parseFloat(item.avg_price);
            totalMarket += parseFloat(item.quantity) * parseFloat(item.last_price);
            totalProfit += parseFloat(item.profit);
        });

        return {
            totalCost: totalCost.toFixed(2),
            totalMarket: totalMarket.toFixed(2),
            totalProfit: totalProfit.toFixed(2),
            profitPct: totalCost > 0 ? ((totalMarket - totalCost) / totalCost * 100).toFixed(2) : 0
        };
    }, [portfolio]);

    return (
        <AdminLayout>
            <Head title="Portfolio" />
            
            <div className="portfolio-module">
                <div className="portfolio-module__top-header">
                    <div className="header-title">
                        <h1>Stock Portfolio</h1>
                        <p>Real-time tracking of your stock investments and performance</p>
                    </div>
                    <div className="export-actions">
                        <button className="btn-export"><span className="material-icons-outlined">print</span> Print</button>
                        <button className="btn-export"><span className="material-icons-outlined">picture_as_pdf</span> PDF</button>
                        <button className="btn-export"><span className="material-icons-outlined">table_view</span> Excel</button>
                    </div>
                </div>

                <div className="portfolio-module__stats">
                    <div className="stat-card">
                        <div className="stat-icon blue">
                            <span className="material-icons-outlined">account_balance_wallet</span>
                        </div>
                        <div className="stat-info">
                            <span className="stat-value">{totalStats.totalMarket}</span>
                            <span className="stat-label">Total Market Value</span>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon purple">
                            <span className="material-icons-outlined">payments</span>
                        </div>
                        <div className="stat-info">
                            <span className="stat-value">{totalStats.totalCost}</span>
                            <span className="stat-label">Total Cost Basis</span>
                        </div>
                    </div>
                    <div className={`stat-card ${parseFloat(totalStats.totalProfit) >= 0 ? 'green' : 'red'}`}>
                        <div className="stat-icon">
                            <span className="material-icons-outlined">
                                {parseFloat(totalStats.totalProfit) >= 0 ? 'trending_up' : 'trending_down'}
                            </span>
                        </div>
                        <div className="stat-info">
                            <span className="stat-value">{totalStats.totalProfit} ({totalStats.profitPct}%)</span>
                            <span className="stat-label">Total Profit/Loss</span>
                        </div>
                    </div>
                </div>

                <div className="portfolio-module__table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Stock</th>
                                <th className="text-right">Quantity</th>
                                <th className="text-right">Avg Price</th>
                                <th className="text-right">Last Price</th>
                                <th className="text-right">Cost Value</th>
                                <th className="text-right">Market Value</th>
                                <th className="text-right">Profit/Loss</th>
                                <th className="text-right">% Chg</th>
                            </tr>
                        </thead>
                        <tbody>
                            {portfolio.length > 0 ? (
                                portfolio.map(item => (
                                    <tr key={item.id}>
                                        <td>
                                            <div className="stock-info">
                                                <span className="symbol-badge">{item.stock?.ticker_symbol}</span>
                                                <div className="stock-name">{item.stock?.legal_name_ar}</div>
                                            </div>
                                        </td>
                                        <td className="text-right font-mono">{parseFloat(item.quantity).toLocaleString()}</td>
                                        <td className="text-right font-mono">{parseFloat(item.avg_price).toFixed(2)}</td>
                                        <td className="text-right font-mono">{parseFloat(item.last_price).toFixed(2)}</td>
                                        <td className="text-right font-mono">{item.cost_value}</td>
                                        <td className="text-right font-mono font-bold">{item.market_value}</td>
                                        <td className={`text-right font-mono font-bold ${parseFloat(item.profit) >= 0 ? 'text-success' : 'text-danger'}`}>
                                            {parseFloat(item.profit).toFixed(2)}
                                        </td>
                                        <td className={`text-right font-mono font-bold ${item.profit_pct >= 0 ? 'text-success' : 'text-danger'}`}>
                                            {item.profit_pct.toFixed(2)}%
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="8" className="text-center py-8 text-gray-500">
                                        No stocks in your portfolio yet. Start by <Link href={route('admin.investing.buy-shares.index')}>buying some shares</Link>.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </AdminLayout>
    );
}
