import React, { useState, useEffect } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import '../../../../css/backend/Exchange_rates.scss';

const Exchange_rates = ({ exchangeRates = [], currencies = [] }) => {
    const { errors } = usePage().props;
    const [filteredRates, setFilteredRates] = useState(exchangeRates);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentRate, setCurrentRate] = useState(null);
    const [stats, setStats] = useState({
        total: 0,
        today: 0,
        pairs: 0
    });
    const [autoUpdate, setAutoUpdate] = useState(false);
    const [autoInterval, setAutoInterval] = useState(15);

    const colors = [
        '#3b82f6', '#10b981', '#f59e0b', '#ef4444', 
        '#8b5cf6', '#06b6d4', '#ec4899', '#64748b'
    ];

    const getCurrencyColor = (code) => {
        let hash = 0;
        for (let i = 0; i < code.length; i++) {
            hash = code.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    };

    const normalizeCode = (code) => {
        if (!code) return '';
        const c = String(code).toUpperCase();
        if (c === 'EGY') return 'EGP';
        if (c === 'USA' || c === 'US' || c === 'USD$') return 'USD';
        return c;
    };

    const currencyMeta = {
        USD: { name: 'US Dollar', symbol: '$' },
        EGP: { name: 'Egyptian Pound', symbol: 'E£' },
        SAR: { name: 'Saudi Riyal', symbol: '﷼' },
        EUR: { name: 'Euro', symbol: '€' },
        GBP: { name: 'British Pound', symbol: '£' },
        AED: { name: 'UAE Dirham', symbol: 'د.إ' },
    };

    const getDisplayCurrency = (currency) => {
        const code = normalizeCode(currency?.code);
        const meta = currencyMeta[code] || {};
        return {
            code,
            name: meta.name || currency?.name || '',
            symbol: meta.symbol || currency?.symbol || (code ? code[0] : ''),
        };
    };

    const formatDateOnly = (value) => {
        if (!value) return '';
        try {
            const d = new Date(value);
            if (!isNaN(d.getTime())) {
                return d.toISOString().slice(0, 10);
            }
        } catch {
            return '';
        }
        if (typeof value === 'string') {
            const parts = value.split('T');
            return parts[0] || value;
        }
        return '';
    };

    useEffect(() => {
        setFilteredRates(exchangeRates);
    }, [exchangeRates]);

    useEffect(() => {
        updateStats();
        filterRates();
    }, [filteredRates, searchTerm]);

    useEffect(() => {
        if (Object.keys(errors).length > 0) {
            // Keep modal open if there are validation errors
            if (!isModalOpen && (errors.rate_date || errors.from_currency_id || errors.to_currency_id || errors.rate)) {
                // If we were editing, we might have lost state, but usually Inertia preserves it.
                // However, without state preservation manually, we might just want to open the modal.
                // For now, let's just ensure the user sees the error.
                setIsModalOpen(true);
            }
        }
    }, [errors]);

    const updateStats = () => {
        const total = filteredRates.length;
        const todayStr = new Date().toISOString().split('T')[0];
        const today = filteredRates.filter(r => r.rate_date === todayStr).length;
        
        // Unique pairs
        const pairs = new Set(filteredRates.map(r => `${r.from_currency_id}-${r.to_currency_id}`)).size;

        setStats({ total, today, pairs });
    };

    const filterRates = () => {
        if (!searchTerm) {
            setFilteredRates(exchangeRates);
            return;
        }
        const lowerTerm = searchTerm.toLowerCase();
        const filtered = exchangeRates.filter(r => 
            r.from_currency?.code?.toLowerCase().includes(lowerTerm) ||
            r.to_currency?.code?.toLowerCase().includes(lowerTerm) ||
            (r.source && r.source.toLowerCase().includes(lowerTerm)) ||
            r.rate_date.includes(lowerTerm)
        );
        setFilteredRates(filtered);
    };

    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
    };

    const openModal = (rate = null) => {
        if (rate) {
            setCurrentRate(rate);
        } else {
            setCurrentRate(null);
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setCurrentRate(null);
        // Clear errors if any (Inertia handles this on new navigation, but here we are just closing modal)
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        const data = {
            rate_date: formData.get('rate_date'),
            from_currency_id: formData.get('from_currency_id'),
            to_currency_id: formData.get('to_currency_id'),
            rate: formData.get('rate'),
            source: formData.get('source'),
        };

        if (currentRate) {
            router.put(route('admin.exchange_rates.update', currentRate.id), data, {
                onSuccess: () => closeModal(),
            });
        } else {
            router.post(route('admin.exchange_rates.store'), data, {
                onSuccess: () => closeModal(),
            });
        }
    };

    const handleDelete = (id) => {
        if (window.confirm('Are you sure you want to delete this exchange rate?')) {
            router.delete(route('admin.exchange_rates.destroy', id));
        }
    };

    const handleFetchRates = () => {
        if (window.confirm('This will fetch current exchange rates from external API. Continue?')) {
            router.post(route('admin.exchange_rates.fetch'), {}, {
                preserveScroll: true,
                onSuccess: () => window.location.reload(),
            });
        }
    };

    useEffect(() => {
        const savedAuto = localStorage.getItem('exchange_auto_update');
        const savedInterval = localStorage.getItem('exchange_auto_interval');
        if (savedAuto === 'true') {
            setAutoUpdate(true);
        }
        if (savedInterval) {
            const n = parseInt(savedInterval, 10);
            if (!isNaN(n) && n > 0) setAutoInterval(n);
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('exchange_auto_update', autoUpdate ? 'true' : 'false');
        localStorage.setItem('exchange_auto_interval', String(autoInterval));
        let timerId = null;
        if (autoUpdate) {
            router.post(route('admin.exchange_rates.fetch'), {}, { preserveScroll: true });
            timerId = setInterval(() => {
                router.post(route('admin.exchange_rates.fetch'), {}, { preserveScroll: true });
            }, autoInterval * 60 * 1000);
        }
        return () => {
            if (timerId) clearInterval(timerId);
        };
    }, [autoUpdate, autoInterval]);

    return (
        <AdminLayout activeMenu="Exchange Rates">
            <Head title="Exchange Rates - ZodicERP" />
            <div className="breadcrumb">
                <a href="#">Dashboard</a>
                <span>/</span>
                <a href="#">Essential Data</a>
                <span>/</span>
                <span>Exchange Rates</span>
            </div>

            {/* Quick Stats */}
            <div className="stats-cards">
                <div className="stat-card">
                    <div className="stat-icon" style={{ backgroundColor: 'var(--primary-color)' }}>
                        <span className="material-icons-outlined">currency_exchange</span>
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.total}</div>
                        <div className="stat-label">Total Rates</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ backgroundColor: 'var(--success-color)' }}>
                        <span className="material-icons-outlined">today</span>
                        icon={<Calendar className="h-6 w-6" />}
                    <div className="stat-content">
                        <div className="stat-value">{stats.today}</div>
                        <div className="stat-label">Added Today</div>
                    </div>
                </div>
                        icon={<Activity className="h-6 w-6" />}
                    <div className="stat-icon" style={{ backgroundColor: 'var(--info-color)' }}>
                        <span className="material-icons-outlined">compare_arrows</span>
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.pairs}</div>
                        <div className="stat-label">Active Pairs</div>
                    </div>
                </div>
            </div>

            {/* Main Card */}
            <div className="exchange-rates-card fade-in">
                <div className="card-header">
                    <div className="exchange-rates-actions">
                        <button className="btn btn-outline" onClick={() => window.location.reload()}>
                            <span className="material-icons-outlined">refresh</span>
                            <span>Refresh</span>
                        </button>
                        <div className="search-bar light">
                            <input 
                                type="text" 
                                placeholder="Search rates..." 
                                value={searchTerm}
                                onChange={handleSearch}
                            />
                            <button>
                                <span className="material-icons-outlined">search</span>
                            </button>
                        </div>
                    </div>
                    <div className="actions">
                        <div className="form-row" style={{ alignItems: 'center' }}>
                            <label className="form-label" style={{ marginRight: '8px' }}>Auto Update</label>
                            <input type="checkbox" checked={autoUpdate} onChange={(e) => setAutoUpdate(e.target.checked)} style={{ marginRight: '12px' }} />
                            <select className="form-control" value={autoInterval} onChange={(e) => setAutoInterval(parseInt(e.target.value, 10))} style={{ width: '140px', marginRight: '8px' }}>
                                <option value={5}>Every 5 min</option>
                                <option value={15}>Every 15 min</option>
                                <option value={30}>Every 30 min</option>
                                <option value={60}>Every 60 min</option>
                            </select>
                        </div>
                        <button className="btn btn-outline" onClick={handleFetchRates} style={{ marginRight: '8px' }}>
                            <span className="material-icons-outlined">cloud_download</span>
                            <span>Fetch Rates</span>
                        </button>
                        <button className="btn btn-primary" onClick={() => openModal()}>
                            <span className="material-icons-outlined">add</span>
                            <span>Add Exchange Rate</span>
                        </button>
                    </div>
                </div>

                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>DATE <span className="material-icons-outlined" style={{ fontSize: '16px' }}>arrow_drop_down</span></th>
                                <th>FROM CURRENCY <span className="material-icons-outlined" style={{ fontSize: '16px' }}>arrow_drop_down</span></th>
                                <th>TO CURRENCY <span className="material-icons-outlined" style={{ fontSize: '16px' }}>arrow_drop_down</span></th>
                                <th>RATE <span className="material-icons-outlined" style={{ fontSize: '16px' }}>arrow_drop_down</span></th>
                                <th>SOURCE <span className="material-icons-outlined" style={{ fontSize: '16px' }}>arrow_drop_down</span></th>
                                <th>OPERATIONS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRates.length > 0 ? (
                                filteredRates.map(rate => (
                                    <tr key={rate.id}>
                                        <td>{formatDateOnly(rate.rate_date)}</td>
                                        <td>
                                            <div className="exchange-info">
                                                {(() => {
                                                    const from = getDisplayCurrency(rate.from_currency);
                                                    return (
                                                        <>
                                                            <div 
                                                                className="currency-icon-small" 
                                                                style={{ backgroundColor: getCurrencyColor(from.code || 'UNK') }}
                                                            >
                                                                {from.symbol}
                                                            </div>
                                                            <span className="font-medium">{from.code}</span>
                                                            <span className="text-xs text-gray-500">({from.name})</span>
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="exchange-info">
                                                {(() => {
                                                    const to = getDisplayCurrency(rate.to_currency);
                                                    return (
                                                        <>
                                                            <div 
                                                                className="currency-icon-small" 
                                                                style={{ backgroundColor: getCurrencyColor(to.code || 'UNK') }}
                                                            >
                                                                {to.symbol}
                                                            </div>
                                                            <span className="font-medium">{to.code}</span>
                                                            <span className="text-xs text-gray-500">({to.name})</span>
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        </td>
                                        <td>
                                            <span className="rate-display">{parseFloat(rate.rate).toFixed(6)}</span>
                                        </td>
                                        <td>{rate.source || '-'}</td>
                                        <td>
                                            <button className="icon-btn edit" onClick={() => openModal(rate)}>
                                                <span className="material-icons-outlined">edit</span>
                                            </button>
                                            <button className="icon-btn delete" onClick={() => handleDelete(rate.id)}>
                                                <span className="material-icons-outlined">delete</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="text-center py-4">No exchange rates found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            <div className={`modal-overlay ${isModalOpen ? 'active' : ''}`} onClick={(e) => {
                if(e.target.className.includes('modal-overlay')) closeModal();
            }}>
                <div className="modal">
                    <div className="modal-header">
                        <div className="modal-title">{currentRate ? 'Edit Exchange Rate' : 'Add New Exchange Rate'}</div>
                        <button className="modal-close" onClick={closeModal}>
                            <span className="material-icons-outlined">close</span>
                        </button>
                    </div>
                    <form onSubmit={handleSubmit}>
                        <div className="modal-body">
                            {errors.rate_date && <div className="text-red-500 text-sm mb-2">{errors.rate_date}</div>}
                            
                            <div className="form-group">
                                <label className="form-label">Rate Date</label>
                                <input 
                                    type="date" 
                                    name="rate_date" 
                                    className="form-control" 
                                    defaultValue={currentRate?.rate_date || new Date().toISOString().split('T')[0]}
                                    required 
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">From Currency</label>
                                    <select 
                                        name="from_currency_id" 
                                        className="form-control" 
                                        defaultValue={currentRate?.from_currency_id || ''}
                                        required
                                    >
                                        <option value="" disabled>Select Currency</option>
                                        {currencies.map(curr => (
                                            <option key={curr.id} value={curr.id}>{curr.code} - {curr.name}</option>
                                        ))}
                                    </select>
                                    {errors.from_currency_id && <div className="text-red-500 text-xs mt-1">{errors.from_currency_id}</div>}
                                </div>
                                <div className="form-group">
                                    <label className="form-label">To Currency</label>
                                    <select 
                                        name="to_currency_id" 
                                        className="form-control" 
                                        defaultValue={currentRate?.to_currency_id || ''}
                                        required
                                    >
                                        <option value="" disabled>Select Currency</option>
                                        {currencies.map(curr => (
                                            <option key={curr.id} value={curr.id}>{curr.code} - {curr.name}</option>
                                        ))}
                                    </select>
                                    {errors.to_currency_id && <div className="text-red-500 text-xs mt-1">{errors.to_currency_id}</div>}
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Exchange Rate</label>
                                <input 
                                    type="number" 
                                    step="0.000001"
                                    name="rate" 
                                    className="form-control" 
                                    defaultValue={currentRate?.rate}
                                    placeholder="e.g. 1.25"
                                    required 
                                />
                                {errors.rate && <div className="text-red-500 text-xs mt-1">{errors.rate}</div>}
                            </div>

                            <div className="form-group">
                                <label className="form-label">Source (Optional)</label>
                                <input 
                                    type="text" 
                                    name="source" 
                                    className="form-control" 
                                    defaultValue={currentRate?.source}
                                    placeholder="e.g. Central Bank"
                                />
                            </div>
                        </div>

                        <div className="modal-actions">
                            <button type="button" className="btn btn-outline" onClick={closeModal}>Cancel</button>
                            <button type="submit" className="btn btn-primary">
                                {currentRate ? 'Update Rate' : 'Add Rate'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </AdminLayout>
    );
};

export default Exchange_rates;
