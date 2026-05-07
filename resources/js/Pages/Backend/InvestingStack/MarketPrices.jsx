import React, { useState, useEffect, useMemo } from 'react';
import { Head, router, usePage, Link } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import SearchableComboBox from '../components/SearchableComboBox';
import { debounce } from 'lodash';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const ViewSection = ({ marketPrices, filters, onEdit, onCreate, onDelete, onShowDetails }) => {
    const { props } = usePage();
    const translations = props.localization?.translations || {};
    const t = (key, fallback) => translations[`MarketPrices.${key}`] || fallback;

    const [searchTerm, setSearchTerm] = useState(filters.search || '');

    const handleSearch = useMemo(
        () => debounce((value) => {
            router.get(
                route('admin.investing.prices.index'),
                { search: value },
                { preserveState: true, replace: true }
            );
        }, 300),
        []
    );

    useEffect(() => {
        if (searchTerm !== (filters.search || '')) {
            handleSearch(searchTerm);
        }
    }, [searchTerm]);

    const stats = useMemo(() => {
        const total = marketPrices.total;
        return { total };
    }, [marketPrices]);

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    return (
        <div className="animate-fade-slide">
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon blue">
                        <span className="material-icons-outlined">show_chart</span>
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">{stats.total}</span>
                        <span className="stat-label">{t('total_prices', 'Total Prices')}</span>
                    </div>
                </div>
            </div>

            <div className="content-card">
                <div className="page-header-actions" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="search-box">
                        <span className="material-icons-outlined search-icon">search</span>
                        <input
                            type="text"
                            placeholder={t('search_placeholder', 'Search by instrument...')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button className="btn btn-primary" onClick={onCreate}>
                        <span className="material-icons-outlined">add</span>
                        {t('add_new', 'Add Market Price')}
                    </button>
                </div>

                <div className="table-responsive">
                    <table className="professional-table">
                        <thead>
                            <tr>
                                <th>{t('date', 'Date')}</th>
                                <th>{t('instrument', 'Instrument')}</th>
                                <th>{t('last', 'Last')}</th>
                                <th>{t('change', 'Change')}</th>
                                <th>{t('volume', 'Volume')}</th>
                                <th>{t('source', 'Source')}</th>
                                <th>{t('actions', 'Actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {marketPrices.data && marketPrices.data.length > 0 ? (
                                marketPrices.data.map(price => (
                                    <tr key={price.id}>
                                        <td>{formatDate(price.price_date)}</td>
                                        <td>
                                            {price.instrument ? (
                                                <div 
                                                    className="instrument-link" 
                                                    onClick={() => onShowDetails(price)}
                                                    style={{ cursor: 'pointer', color: 'var(--primary-color)' }}
                                                >
                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                        <span style={{ fontWeight: 600 }}>{price.instrument.company_code}</span>
                                                        <span style={{ fontSize: '0.8rem', color: '#666' }}>{price.instrument.legal_name_ar || price.instrument.legal_name_en}</span>
                                                    </div>
                                                </div>
                                            ) : '-'}
                                        </td>
                                        <td className="price-value">{price.last_price}</td>
                                        <td>
                                            {price.change_percent ? (
                                                <span className={`price-value ${parseFloat(price.change_percent) >= 0 ? 'change-positive' : 'change-negative'}`}>
                                                    {price.change_percent > 0 ? '+' : ''}{price.change_percent}%
                                                </span>
                                            ) : '-'}
                                        </td>
                                        <td className="price-value">{price.volume ? Number(price.volume).toLocaleString() : '-'}</td>
                                        <td><span className="badge-source">{price.data_source || '-'}</span></td>
                                        <td>
                                            <div className="action-buttons">
                                                <button type="button" onClick={() => onEdit(price)} title={t('edit_title', 'Edit')}>
                                                    <span className="material-icons-outlined">edit</span>
                                                </button>
                                                <button type="button" className="delete-btn" onClick={() => onDelete(price.id)} title={t('delete_confirm', 'Delete')}>
                                                    <span className="material-icons-outlined">delete</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>
                                        {t('no_prices_found', 'No market prices found.')}
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

const DetailsSection = ({ master, onBack, onEditDetail, onDeleteDetail }) => {
    const { props } = usePage();
    const translations = props.localization?.translations || {};
    const t = (key, fallback) => translations[`MarketPrices.${key}`] || fallback;

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    return (
        <div className="animate-fade-slide">
            <div className="detail-header-card content-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                    <button className="btn btn-secondary btn-icon" onClick={onBack}>
                        <span className="material-icons-outlined">arrow_back</span>
                    </button>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.5rem' }}>
                            {master.instrument.legal_name_ar || master.instrument.legal_name_en}
                        </h2>
                        <div style={{ color: '#666', fontSize: '0.9rem' }}>
                            {master.instrument.company_code} | {t('date', 'Date')}: {formatDate(master.price_date)}
                        </div>
                    </div>
                </div>

                <div className="details-grid">
                    <div className="detail-stat">
                        <span className="label">{t('last_price', 'Last Price')}</span>
                        <span className="value primary">{master.last_price}</span>
                    </div>
                    <div className="detail-stat">
                        <span className="label">{t('change', 'Change')}</span>
                        <span className={`value ${parseFloat(master.change_percent) >= 0 ? 'change-positive' : 'change-negative'}`}>
                            {master.change_percent}%
                        </span>
                    </div>
                    <div className="detail-stat">
                        <span className="label">{t('volume', 'Volume')}</span>
                        <span className="value">{Number(master.volume).toLocaleString()}</span>
                    </div>
                </div>
            </div>

            <div className="content-card">
                <h3 style={{ marginBottom: '1.5rem' }}>{t('price_history', 'Intraday Price History')}</h3>
                <div className="table-responsive">
                    <table className="professional-table">
                        <thead>
                            <tr>
                                <th>{t('date', 'Date')}</th>
                                <th>{t('time', 'Time')}</th>
                                <th>{t('bid', 'Bid')}</th>
                                <th>{t('ask', 'Ask')}</th>
                                <th>{t('last', 'Last')}</th>
                                <th>{t('open', 'Open')}</th>
                                <th>{t('high', 'High')}</th>
                                <th>{t('low', 'Low')}</th>
                                <th>{t('close', 'Close')}</th>
                                <th>{t('volume', 'Volume')}</th>
                                <th>{t('actions', 'Actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {master.details && master.details.length > 0 ? (
                                master.details.map(detail => (
                                    <tr key={detail.id}>
                                        <td>{formatDate(detail.price_date)}</td>
                                        <td>{detail.price_time}</td>
                                        <td className="price-value">{detail.bid_price}</td>
                                        <td className="price-value">{detail.ask_price}</td>
                                        <td className="price-value">{detail.last_price}</td>
                                        <td className="price-value">{detail.open_price}</td>
                                        <td className="price-value">{detail.high_price}</td>
                                        <td className="price-value">{detail.low_price}</td>
                                        <td className="price-value">{detail.close_price}</td>
                                        <td className="price-value">{Number(detail.volume).toLocaleString()}</td>
                                        <td>
                                            <div className="action-buttons" style={{ position: 'relative', zIndex: 10 }}>
                                                <button 
                                                    type="button" 
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        onEditDetail(detail);
                                                    }} 
                                                    title={t('edit_title', 'Edit')}
                                                    style={{ cursor: 'pointer' }}
                                                >
                                                    <span className="material-icons-outlined" style={{ pointerEvents: 'none' }}>edit</span>
                                                </button>
                                                <button 
                                                    type="button" 
                                                    className="delete-btn" 
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        onDeleteDetail(detail.id);
                                                    }} 
                                                    title={t('delete_confirm', 'Delete')}
                                                    style={{ cursor: 'pointer' }}
                                                >
                                                    <span className="material-icons-outlined" style={{ pointerEvents: 'none' }}>delete</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="10" style={{ textAlign: 'center', padding: '2rem' }}>
                                        {t('no_details_found', 'No detailed records found.')}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const EditDetailModal = ({ detail, isOpen, onClose, onUpdate }) => {
    const { props } = usePage();
    const translations = props.localization?.translations || {};
    const t = (key, fallback) => translations[`MarketPrices.${key}`] || fallback;
    const { errors } = props;

    const [formData, setFormData] = useState({
        price_date: detail?.price_date || '',
        price_time: detail?.price_time || '',
        bid_price: detail?.bid_price || '',
        ask_price: detail?.ask_price || '',
        last_price: detail?.last_price || '',
        open_price: detail?.open_price || '',
        high_price: detail?.high_price || '',
        low_price: detail?.low_price || '',
        close_price: detail?.close_price || '',
        volume: detail?.volume || '',
        bid_volume: detail?.bid_volume || '',
        ask_volume: detail?.ask_volume || '',
        change_amount: detail?.change_amount || '',
        change_percent: detail?.change_percent || '',
    });

    useEffect(() => {
        if (detail) {
            setFormData({
                price_date: detail.price_date || '',
                price_time: detail.price_time || '',
                bid_price: detail.bid_price ?? '',
                ask_price: detail.ask_price ?? '',
                last_price: detail.last_price ?? '',
                open_price: detail.open_price ?? '',
                high_price: detail.high_price ?? '',
                low_price: detail.low_price ?? '',
                close_price: detail.close_price ?? '',
                volume: detail.volume ?? '',
                bid_volume: detail.bid_volume ?? '',
                ask_volume: detail.ask_volume ?? '',
                change_amount: detail.change_amount ?? '',
                change_percent: detail.change_percent ?? '',
            });
        }
    }, [detail]);

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onUpdate(formData);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content animate-fade-slide" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>{t('edit_detail_title', 'Edit Transaction Details')}</h3>
                    <button className="close-btn" onClick={onClose}>
                        <span className="material-icons-outlined">close</span>
                    </button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                            <div className="form-group">
                                <label>{t('date', 'Date')} *</label>
                                <input type="date" name="price_date" value={formData.price_date} onChange={handleChange} required />
                            </div>
                            <div className="form-group">
                                <label>{t('time', 'Time')} *</label>
                                <input type="time" name="price_time" value={formData.price_time} onChange={handleChange} required />
                            </div>
                            <div className="form-group">
                                <label>{t('bid_price', 'Bid Price')}</label>
                                <input type="number" step="0.0001" name="bid_price" value={formData.bid_price} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label>{t('ask_price', 'Ask Price')}</label>
                                <input type="number" step="0.0001" name="ask_price" value={formData.ask_price} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label>{t('last_price', 'Last Price')}</label>
                                <input type="number" step="0.0001" name="last_price" value={formData.last_price} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label>{t('volume', 'Volume')}</label>
                                <input type="number" step="0.01" name="volume" value={formData.volume} onChange={handleChange} />
                            </div>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>{t('cancel', 'Cancel')}</button>
                        <button type="submit" className="btn btn-primary">{t('update', 'Update')}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const FormSection = ({ mode, initialData, companies, onBack, onSubmit }) => {
    const isEdit = mode === 'edit';
    const { errors, localization } = usePage().props;
    const translations = localization?.translations || {};
    const t = (key, fallback) => translations[`MarketPrices.${key}`] || fallback;

    const currentLocale = localization?.current_locale || 'ar';
    const [instrumentId, setInstrumentId] = useState(initialData?.instrument_id || '');
    const [isSyncing, setIsSyncing] = useState(false);

    // Form states for auto-fill
    const [formData, setFormData] = useState({
        bid_price: initialData?.bid_price ?? '',
        ask_price: initialData?.ask_price ?? '',
        last_price: initialData?.last_price ?? '',
        open_price: initialData?.open_price ?? '',
        high_price: initialData?.high_price ?? '',
        low_price: initialData?.low_price ?? '',
        close_price: initialData?.close_price ?? '',
        volume: initialData?.volume ?? '',
        bid_volume: initialData?.bid_volume ?? '',
        ask_volume: initialData?.ask_volume ?? '',
        change_amount: initialData?.change_amount ?? '',
        change_percent: initialData?.change_percent ?? '',
        data_source: initialData?.data_source ?? '',
        price_date: initialData?.price_date || new Date().toISOString().split('T')[0],
        price_time: initialData?.price_time || new Date().toTimeString().split(' ')[0].substring(0, 5),
        is_eod: initialData?.is_eod || false,
        is_intraday: initialData?.is_intraday ?? true,
    });
    
    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const companyOptions = useMemo(() => {
        return companies.map(company => ({
            value: company.id,
            label: `${company.ticker_symbol} - ${currentLocale === 'en' ? (company.legal_name_en || company.legal_name_ar) : (company.legal_name_ar || company.legal_name_en)}`,
            code: company.company_code,
            ticker_symbol: company.ticker_symbol,
            name: currentLocale === 'en' ? (company.legal_name_en || company.legal_name_ar) : (company.legal_name_ar || company.legal_name_en)
        }));
    }, [companies, currentLocale]);

    const handleSync = async () => {
        const selectedCompany = companies.find(c => String(c.id) === String(instrumentId));
        if (!selectedCompany || !selectedCompany.ticker_symbol) {
            toast.error(t('select_instrument_first', 'Please select an instrument first'));
            return;
        }

        setIsSyncing(true);
        try {
            const response = await axios.get(`/api/sync-price?symbol=${selectedCompany.ticker_symbol}`);
            const data = response.data;
            
            setFormData(prev => ({
                ...prev,
                bid_price: data.bid_price ?? '',
                ask_price: data.ask_price ?? '',
                last_price: data.last_price ?? '',
                open_price: data.open_price ?? '',
                high_price: data.high_price ?? '',
                low_price: data.low_price ?? '',
                volume: data.volume ?? '',
                change_amount: data.change_amount ?? '',
                change_percent: data.change_percent ?? '',
                data_source: data.data_source || prev.data_source
            }));
            
            toast.success(t('sync_success', 'Price synced successfully!'));
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || t('sync_error', 'Failed to sync price. Using fallback if available.'));
        } finally {
            setIsSyncing(false);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        const data = {
            ...formData,
            instrument_id: instrumentId,
        };

        if (data.price_date && data.price_time) {
            data.price_timestamp = `${data.price_date} ${data.price_time}`;
        }

        onSubmit(data);
    };

    return (
        <div className="animate-fade-slide">
            <ToastContainer position="top-right" autoClose={3000} />
            <div className="content-card">
                <div className="form-container">
                    <div className="form-section-title">
                        {isEdit ? t('edit_title', 'Edit Market Price') : t('create_title', 'Add New Market Price')}
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="form-sections">
                            <div className="form-section">
                                <div className="form-section-title">{t('essential_data', 'Essential Data')}</div>
                                <div className="form-grid">
                                    <div className="form-group full-width">
                                        <label>{t('instrument_label', 'Instrument')} *</label>
                                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                                            <div style={{ flex: 1 }}>
                                                <SearchableComboBox
                                                    name="instrument_id"
                                                    value={instrumentId}
                                                    onChange={setInstrumentId}
                                                    options={companyOptions}
                                                    placeholder={t('search_instrument_placeholder', 'Search by name, code or ticker...')}
                                                    required
                                                />
                                            </div>
                                            <button 
                                                type="button" 
                                                className="btn btn-sync" 
                                                onClick={handleSync}
                                                disabled={isSyncing || !instrumentId}
                                            >
                                                {isSyncing ? (
                                                    <span className="spinner-small"></span>
                                                ) : (
                                                    <span className="material-icons-outlined">sync</span>
                                                )}
                                                {t('sync_price', 'Sync Price')}
                                            </button>
                                        </div>
                                        {errors.instrument_id && <div className="error-message">{errors.instrument_id}</div>}
                                    </div>
                                    <div className="form-group">
                                        <label>{t('date', 'Date')} *</label>
                                        <input
                                            type="date"
                                            name="price_date"
                                            value={formData.price_date}
                                            onChange={handleInputChange}
                                            required
                                        />
                                        {errors.price_date && <div className="error-message">{errors.price_date}</div>}
                                    </div>
                                    <div className="form-group">
                                        <label>{t('time', 'Time')} *</label>
                                        <input
                                            type="time"
                                            name="price_time"
                                            value={formData.price_time}
                                            onChange={handleInputChange}
                                            required
                                        />
                                        {errors.price_time && <div className="error-message">{errors.price_time}</div>}
                                    </div>
                                </div>
                            </div>

                            <div className="form-section">
                                <div className="form-section-title">{t('trading_session', 'Trading Session')}</div>
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label>{t('bid_price', 'Bid Price')} *</label>
                                        <input
                                            type="number" step="0.0001"
                                            name="bid_price"
                                            value={formData.bid_price}
                                            onChange={handleInputChange}
                                            required
                                        />
                                        {errors.bid_price && <div className="error-message">{errors.bid_price}</div>}
                                    </div>
                                    <div className="form-group">
                                        <label>{t('ask_price', 'Ask Price')} *</label>
                                        <input
                                            type="number" step="0.0001"
                                            name="ask_price"
                                            value={formData.ask_price}
                                            onChange={handleInputChange}
                                            required
                                        />
                                        {errors.ask_price && <div className="error-message">{errors.ask_price}</div>}
                                    </div>
                                    <div className="form-group">
                                        <label>{t('last_price', 'Last Price')} *</label>
                                        <input
                                            type="number" step="0.0001"
                                            name="last_price"
                                            value={formData.last_price}
                                            onChange={handleInputChange}
                                            required
                                        />
                                        {errors.last_price && <div className="error-message">{errors.last_price}</div>}
                                    </div>
                                    <div className="form-group">
                                        <label>{t('open_price', 'Open Price')}</label>
                                        <input
                                            type="number" step="0.0001"
                                            name="open_price"
                                            value={formData.open_price}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>{t('high_price', 'High Price')}</label>
                                        <input
                                            type="number" step="0.0001"
                                            name="high_price"
                                            value={formData.high_price}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>{t('low_price', 'Low Price')}</label>
                                        <input
                                            type="number" step="0.0001"
                                            name="low_price"
                                            value={formData.low_price}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>{t('close_price', 'Close Price')}</label>
                                        <input
                                            type="number" step="0.0001"
                                            name="close_price"
                                            value={formData.close_price}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="form-section">
                                <div className="form-section-title">{t('trading_volume', 'Trading Volume')}</div>
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label>{t('volume', 'Volume')}</label>
                                        <input
                                            type="number" step="0.01"
                                            name="volume"
                                            value={formData.volume}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>{t('bid_volume', 'Bid Volume')}</label>
                                        <input
                                            type="number" step="0.01"
                                            name="bid_volume"
                                            value={formData.bid_volume}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>{t('ask_volume', 'Ask Volume')}</label>
                                        <input
                                            type="number" step="0.01"
                                            name="ask_volume"
                                            value={formData.ask_volume}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="form-section">
                                <div className="form-section-title">{t('change_source', 'Change and Data Source')}</div>
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label>{t('change_amount', 'Change Amount')}</label>
                                        <input
                                            type="number" step="0.0001"
                                            name="change_amount"
                                            value={formData.change_amount}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>{t('change_percent', 'Change Percent (%)')}</label>
                                        <input
                                            type="number" step="0.0001"
                                            name="change_percent"
                                            value={formData.change_percent}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>{t('data_source', 'Data Source')}</label>
                                        <input
                                            type="text"
                                            name="data_source"
                                            value={formData.data_source}
                                            onChange={handleInputChange}
                                            placeholder="e.g., Bloomberg, Reuters"
                                        />
                                    </div>
                                    <div className="form-group checkbox-group full-width">
                                        <label className="checkbox-label">
                                            <input
                                                type="checkbox"
                                                name="is_eod"
                                                checked={formData.is_eod}
                                                onChange={handleInputChange}
                                            />
                                            {t('eod', 'End of Day (EOD)')}
                                        </label>
                                        <label className="checkbox-label">
                                            <input
                                                type="checkbox"
                                                name="is_intraday"
                                                checked={formData.is_intraday}
                                                onChange={handleInputChange}
                                            />
                                            {t('intraday', 'Intraday')}
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="form-actions">
                            <button type="button" className="btn btn-secondary" onClick={onBack}>
                                {t('cancel', 'Cancel')}
                            </button>
                            <button type="submit" className="btn btn-primary">
                                {isEdit ? t('update', 'Update Price') : t('save', 'Save Price')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

const MarketPrices = () => {
    const { marketPrices, companies, filters, localization } = usePage().props;
    const translations = localization?.translations || {};
    const t = (key, fallback) => translations[`MarketPrices.${key}`] || fallback;

    const [mode, setMode] = useState('view'); // view, create, edit, details
    const [currentPrice, setCurrentPrice] = useState(null);
    const [selectedMaster, setSelectedMaster] = useState(null);
    
    // Detail record states
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [editingDetail, setEditingDetail] = useState(null);

    const handleCreate = () => {
        setCurrentPrice(null);
        setMode('create');
    };

    const handleEdit = (price) => {
        setCurrentPrice(price);
        setMode('edit');
    };

    const handleShowDetails = (master) => {
        setSelectedMaster(master);
        setMode('details');
    };

    const handleBack = () => {
        setMode('view');
        setCurrentPrice(null);
        setSelectedMaster(null);
    };

    const handleSubmit = (data) => {
        if (mode === 'create') {
            router.post(route('admin.investing.prices.store'), data, {
                onSuccess: () => setMode('view'),
            });
        } else if (mode === 'edit') {
            router.put(route('admin.investing.prices.update', currentPrice.id), data, {
                onSuccess: () => setMode('view'),
            });
        }
    };

    const handleDelete = (id) => {
        if (window.confirm(t('delete_confirm_msg', 'Are you sure you want to delete this market price?'))) {
            router.delete(route('admin.investing.prices.destroy', id));
        }
    };

    // Detail handlers
    const handleEditDetail = (detail) => {
        console.log('Editing detail:', detail);
        setEditingDetail(detail);
        setIsDetailModalOpen(true);
    };

    const handleDeleteDetail = (detailId) => {
        if (window.confirm(t('delete_detail_confirm', 'Are you sure you want to delete this detailed transaction?'))) {
            router.delete(route('admin.investing.prices.destroyDetail', detailId), {
                preserveScroll: true,
                onSuccess: () => {
                    // Update the selectedMaster in state to reflect the deletion
                    if (selectedMaster) {
                        const updatedDetails = selectedMaster.details.filter(d => d.id !== detailId);
                        setSelectedMaster({ ...selectedMaster, details: updatedDetails });
                    }
                }
            });
        }
    };

    const handleUpdateDetail = (formData) => {
        router.put(route('admin.investing.prices.updateDetail', editingDetail.id), formData, {
            preserveScroll: true,
            onSuccess: () => {
                setIsDetailModalOpen(false);
                setEditingDetail(null);
                // Update local state if needed or let Inertia reload props
                // If Inertia reloads, we need to make sure selectedMaster is updated
            }
        });
    };

    // Re-sync selectedMaster when props change to keep details fresh after update/delete
    useEffect(() => {
        if (selectedMaster && marketPrices.data) {
            const updatedMaster = marketPrices.data.find(m => m.id === selectedMaster.id);
            if (updatedMaster) {
                setSelectedMaster(updatedMaster);
            }
        }
    }, [marketPrices]);

    return (
        <AdminLayout>
            <Head title={t('page_title', 'Market Prices')} />
            <div className="market-prices-container">
                <div className="page-header">
                    <h1>{t('page_title', 'Market Prices')}</h1>
                </div>

                {mode === 'view' && (
                    <ViewSection 
                        marketPrices={marketPrices} 
                        filters={filters}
                        onCreate={handleCreate} 
                        onEdit={handleEdit} 
                        onDelete={handleDelete}
                        onShowDetails={handleShowDetails}
                    />
                )}

                {mode === 'details' && (
                    <DetailsSection 
                        master={selectedMaster}
                        onBack={handleBack}
                        onEditDetail={handleEditDetail}
                        onDeleteDetail={handleDeleteDetail}
                    />
                )}

                {(mode === 'create' || mode === 'edit') && (
                    <FormSection 
                        mode={mode} 
                        initialData={currentPrice} 
                        companies={companies}
                        onBack={handleBack} 
                        onSubmit={handleSubmit}
                    />
                )}

                <EditDetailModal 
                    isOpen={isDetailModalOpen}
                    detail={editingDetail}
                    onClose={() => setIsDetailModalOpen(false)}
                    onUpdate={handleUpdateDetail}
                />
            </div>
        </AdminLayout>
    );
};

export default MarketPrices;
