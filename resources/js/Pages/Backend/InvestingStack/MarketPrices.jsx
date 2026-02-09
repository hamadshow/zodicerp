import React, { useState, useEffect, useMemo } from 'react';
import { Head, router, usePage, Link } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import '../../../../css/backend/InvestingStack/MarketPrices.scss';
import { debounce } from 'lodash';

const ViewSection = ({ marketPrices, filters, onEdit, onCreate, onDelete }) => {
    const [searchTerm, setSearchTerm] = useState(filters.search || '');

    const handleSearch = useMemo(
        () => debounce((value) => {
            router.get(
                route('admin.investing-stack.market-prices.index'),
                { search: value },
                { preserveState: true, replace: true }
            );
        }, 300),
        []
    );

    useEffect(() => {
        handleSearch(searchTerm);
    }, [searchTerm]);

    const stats = useMemo(() => {
        const total = marketPrices.total;
        return { total };
    }, [marketPrices]);

    return (
        <div className="animate-fade-slide">
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon blue">
                        <span className="material-icons-outlined">show_chart</span>
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">{stats.total}</span>
                        <span className="stat-label">Total Prices</span>
                    </div>
                </div>
            </div>

            <div className="content-card">
                <div className="page-header" style={{ marginBottom: '1.5rem' }}>
                    <div className="search-box">
                        <span className="material-icons-outlined search-icon">search</span>
                        <input
                            type="text"
                            placeholder="Search by instrument..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button className="btn btn-primary" onClick={onCreate}>
                        <span className="material-icons-outlined">add</span>
                        Add Market Price
                    </button>
                </div>

                <div className="table-responsive">
                    <table className="professional-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Time</th>
                                <th>Instrument</th>
                                <th>Bid</th>
                                <th>Ask</th>
                                <th>Last</th>
                                <th>Change</th>
                                <th>Volume</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {marketPrices.data && marketPrices.data.length > 0 ? (
                                marketPrices.data.map(price => (
                                    <tr key={price.id}>
                                        <td>{price.price_date}</td>
                                        <td>{price.price_time}</td>
                                        <td>
                                            {price.instrument ? (
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span style={{ fontWeight: 500 }}>{price.instrument.company_code}</span>
                                                    <span style={{ fontSize: '0.8rem', color: '#666' }}>{price.instrument.legal_name_ar || price.instrument.legal_name_en}</span>
                                                </div>
                                            ) : '-'}
                                        </td>
                                        <td className="price-value">{price.bid_price}</td>
                                        <td className="price-value">{price.ask_price}</td>
                                        <td className="price-value">{price.last_price}</td>
                                        <td>
                                            {price.change_percent ? (
                                                <span className={`price-value ${parseFloat(price.change_percent) >= 0 ? 'change-positive' : 'change-negative'}`}>
                                                    {price.change_percent > 0 ? '+' : ''}{price.change_percent}%
                                                </span>
                                            ) : '-'}
                                        </td>
                                        <td className="price-value">{price.volume ? Number(price.volume).toLocaleString() : '-'}</td>
                                        <td>
                                            <div className="action-buttons">
                                                <button onClick={() => onEdit(price)} title="Edit">
                                                    <span className="material-icons-outlined">edit</span>
                                                </button>
                                                <button className="delete-btn" onClick={() => onDelete(price.id)} title="Delete">
                                                    <span className="material-icons-outlined">delete</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="9" style={{ textAlign: 'center', padding: '2rem' }}>
                                        No market prices found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {marketPrices.links && marketPrices.links.length > 3 && (
                    <div className="pagination-container" style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                        {marketPrices.links.map((link, key) => (
                            link.url === null ? (
                                <div 
                                    key={key} 
                                    className="pagination-link disabled"
                                    style={{ padding: '0.5rem 1rem', border: '1px solid #ddd', borderRadius: '4px', color: '#999' }}
                                    dangerouslySetInnerHTML={{ __html: link.label }} 
                                />
                            ) : (
                                <Link
                                    key={key}
                                    href={link.url}
                                    className={`pagination-link ${link.active ? 'active' : ''}`}
                                    style={{ 
                                        padding: '0.5rem 1rem', 
                                        border: '1px solid #ddd', 
                                        borderRadius: '4px', 
                                        color: link.active ? '#fff' : '#333',
                                        backgroundColor: link.active ? '#007bff' : '#fff',
                                        textDecoration: 'none'
                                    }}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            )
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const FormSection = ({ mode, initialData, companies, onBack, onSubmit }) => {
    const isEdit = mode === 'edit';
    const { errors } = usePage().props;
    
    // Set default values for date/time if creating
    const defaultDate = new Date().toISOString().split('T')[0];
    const defaultTime = new Date().toTimeString().split(' ')[0].substring(0, 5);

    const handleSubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        const data = {};
        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }
        
        // Explicitly handle checkboxes
        const eodCheckbox = e.target.querySelector('input[name="is_eod"]');
        if (eodCheckbox) data.is_eod = eodCheckbox.checked;

        const intradayCheckbox = e.target.querySelector('input[name="is_intraday"]');
        if (intradayCheckbox) data.is_intraday = intradayCheckbox.checked;

        // Ensure price_timestamp is set if not provided (though backend validation requires it)
        // Usually timestamp is combination of date + time
        if (data.price_date && data.price_time) {
            data.price_timestamp = `${data.price_date} ${data.price_time}`;
        }

        onSubmit(data);
    };

    return (
        <div className="animate-fade-slide">
            <div className="content-card">
                <div className="form-container">
                    <div className="form-section-title">
                        {isEdit ? 'Edit Market Price' : 'Add New Market Price'}
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="form-grid">
                            <div className="form-group full-width">
                                <label>Instrument *</label>
                                <select
                                    name="instrument_id"
                                    defaultValue={initialData?.instrument_id || ''}
                                    required
                                >
                                    <option value="">Select Company / Instrument</option>
                                    {companies.map(company => (
                                        <option key={company.id} value={company.id}>
                                            {company.company_code} - {company.legal_name_ar || company.legal_name_en}
                                        </option>
                                    ))}
                                </select>
                                {errors.instrument_id && <div className="error-message">{errors.instrument_id}</div>}
                            </div>

                            {/* Prices */}
                            <div className="form-group">
                                <label>Bid Price *</label>
                                <input
                                    type="number" step="0.0001"
                                    name="bid_price"
                                    defaultValue={initialData?.bid_price}
                                    required
                                />
                                {errors.bid_price && <div className="error-message">{errors.bid_price}</div>}
                            </div>
                            <div className="form-group">
                                <label>Ask Price *</label>
                                <input
                                    type="number" step="0.0001"
                                    name="ask_price"
                                    defaultValue={initialData?.ask_price}
                                    required
                                />
                                {errors.ask_price && <div className="error-message">{errors.ask_price}</div>}
                            </div>
                            <div className="form-group">
                                <label>Last Price *</label>
                                <input
                                    type="number" step="0.0001"
                                    name="last_price"
                                    defaultValue={initialData?.last_price}
                                    required
                                />
                                {errors.last_price && <div className="error-message">{errors.last_price}</div>}
                            </div>
                            <div className="form-group">
                                <label>Open Price</label>
                                <input
                                    type="number" step="0.0001"
                                    name="open_price"
                                    defaultValue={initialData?.open_price}
                                />
                            </div>

                            <div className="form-group">
                                <label>High Price</label>
                                <input
                                    type="number" step="0.0001"
                                    name="high_price"
                                    defaultValue={initialData?.high_price}
                                />
                            </div>
                            <div className="form-group">
                                <label>Low Price</label>
                                <input
                                    type="number" step="0.0001"
                                    name="low_price"
                                    defaultValue={initialData?.low_price}
                                />
                            </div>
                            <div className="form-group">
                                <label>Close Price</label>
                                <input
                                    type="number" step="0.0001"
                                    name="close_price"
                                    defaultValue={initialData?.close_price}
                                />
                            </div>

                            {/* Date & Time */}
                            <div className="form-group">
                                <label>Date *</label>
                                <input
                                    type="date"
                                    name="price_date"
                                    defaultValue={initialData?.price_date || defaultDate}
                                    required
                                />
                                {errors.price_date && <div className="error-message">{errors.price_date}</div>}
                            </div>
                            <div className="form-group">
                                <label>Time *</label>
                                <input
                                    type="time"
                                    name="price_time"
                                    defaultValue={initialData?.price_time || defaultTime}
                                    required
                                />
                                {errors.price_time && <div className="error-message">{errors.price_time}</div>}
                            </div>

                            {/* Volume */}
                            <div className="form-group">
                                <label>Volume</label>
                                <input
                                    type="number" step="0.01"
                                    name="volume"
                                    defaultValue={initialData?.volume}
                                />
                            </div>
                             <div className="form-group">
                                <label>Bid Volume</label>
                                <input
                                    type="number" step="0.01"
                                    name="bid_volume"
                                    defaultValue={initialData?.bid_volume}
                                />
                            </div>
                             <div className="form-group">
                                <label>Ask Volume</label>
                                <input
                                    type="number" step="0.01"
                                    name="ask_volume"
                                    defaultValue={initialData?.ask_volume}
                                />
                            </div>

                            {/* Change */}
                            <div className="form-group">
                                <label>Change Amount</label>
                                <input
                                    type="number" step="0.0001"
                                    name="change_amount"
                                    defaultValue={initialData?.change_amount}
                                />
                            </div>
                            <div className="form-group">
                                <label>Change Percent (%)</label>
                                <input
                                    type="number" step="0.0001"
                                    name="change_percent"
                                    defaultValue={initialData?.change_percent}
                                />
                            </div>

                            {/* Metadata */}
                            <div className="form-group">
                                <label>Data Source</label>
                                <input
                                    type="text"
                                    name="data_source"
                                    defaultValue={initialData?.data_source}
                                    placeholder="e.g., Bloomberg, Reuters"
                                />
                            </div>

                            <div className="form-group checkbox-group full-width">
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        name="is_eod"
                                        defaultChecked={initialData?.is_eod}
                                    />
                                    End of Day (EOD)
                                </label>
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        name="is_intraday"
                                        defaultChecked={initialData?.is_intraday}
                                    />
                                    Intraday
                                </label>
                            </div>
                        </div>

                        <div className="form-actions">
                            <button type="button" className="btn btn-secondary" onClick={onBack}>
                                Cancel
                            </button>
                            <button type="submit" className="btn btn-primary">
                                {isEdit ? 'Update Price' : 'Save Price'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

const MarketPrices = () => {
    const { marketPrices, companies, filters } = usePage().props;
    const [mode, setMode] = useState('view'); // view, create, edit
    const [currentPrice, setCurrentPrice] = useState(null);

    const handleCreate = () => {
        setCurrentPrice(null);
        setMode('create');
    };

    const handleEdit = (price) => {
        setCurrentPrice(price);
        setMode('edit');
    };

    const handleBack = () => {
        setMode('view');
        setCurrentPrice(null);
    };

    const handleSubmit = (data) => {
        if (mode === 'create') {
            router.post(route('admin.investing-stack.market-prices.store'), data, {
                onSuccess: () => setMode('view'),
            });
        } else if (mode === 'edit') {
            router.put(route('admin.investing-stack.market-prices.update', currentPrice.id), data, {
                onSuccess: () => setMode('view'),
            });
        }
    };

    const handleDelete = (id) => {
        if (window.confirm('Are you sure you want to delete this market price?')) {
            router.delete(route('admin.investing-stack.market-prices.destroy', id));
        }
    };

    return (
        <AdminLayout>
            <Head title="Market Prices" />
            <div className="market-prices-container">
                <div className="page-header">
                    <h1>Market Prices</h1>
                </div>

                {mode === 'view' ? (
                    <ViewSection 
                        marketPrices={marketPrices} 
                        filters={filters}
                        onCreate={handleCreate} 
                        onEdit={handleEdit} 
                        onDelete={handleDelete}
                    />
                ) : (
                    <FormSection 
                        mode={mode} 
                        initialData={currentPrice} 
                        companies={companies}
                        onBack={handleBack} 
                        onSubmit={handleSubmit}
                    />
                )}
            </div>
        </AdminLayout>
    );
};

export default MarketPrices;
