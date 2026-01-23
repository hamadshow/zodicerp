import React, { useState, useEffect } from 'react';
import { Head, router } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import '../../../../css/backend/Currencies.scss';

const Currencies = ({ currencies = [] }) => {
    const [filteredCurrencies, setFilteredCurrencies] = useState(currencies);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentCurrency, setCurrentCurrency] = useState(null);
    const [stats, setStats] = useState({
        total: 0,
        active: 0,
        baseCurrency: '-',
        inactive: 0
    });

    const colors = [
        '#3b82f6', '#10b981', '#f59e0b', '#ef4444', 
        '#8b5cf6', '#06b6d4', '#ec4899', '#64748b'
    ];

    useEffect(() => {
        setFilteredCurrencies(currencies);
    }, [currencies]);

    useEffect(() => {
        updateStats();
        filterCurrencies();
    }, [filteredCurrencies, searchTerm]);

    const updateStats = () => {
        const total = filteredCurrencies.length;
        const active = filteredCurrencies.filter(c => c.status === 'active').length;
        const base = currencies.find(c => c.is_base);
        const inactive = filteredCurrencies.filter(c => c.status !== 'active').length;

        setStats({ 
            total, 
            active, 
            baseCurrency: base ? `${base.code} (${base.symbol})` : 'None', 
            inactive 
        });
    };

    const filterCurrencies = () => {
        if (!searchTerm) {
            setFilteredCurrencies(currencies);
            return;
        }
        const lowerTerm = searchTerm.toLowerCase();
        const filtered = currencies.filter(c => 
            c.name.toLowerCase().includes(lowerTerm) ||
            c.code.toLowerCase().includes(lowerTerm) ||
            (c.symbol && c.symbol.toLowerCase().includes(lowerTerm))
        );
        setFilteredCurrencies(filtered);
    };

    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
    };

    const openModal = (currency = null) => {
        setCurrentCurrency(currency);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setCurrentCurrency(null);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        const data = {
            code: formData.get('code'),
            name: formData.get('name'),
            symbol: formData.get('symbol'),
            decimal_places: formData.get('decimal_places'),
            format: formData.get('format'),
            is_base: formData.get('is_base') === 'on',
            status: formData.get('status'),
        };

        if (currentCurrency) {
            router.put(route('admin.currencies.update', currentCurrency.id), data, {
                onSuccess: () => closeModal(),
            });
        } else {
            router.post(route('admin.currencies.store'), data, {
                onSuccess: () => closeModal(),
            });
        }
    };

    const handleDelete = (id) => {
        if (window.confirm('Are you sure you want to delete this currency?')) {
            router.delete(route('admin.currencies.destroy', id));
        }
    };

    const getCurrencyColor = (code) => {
        let hash = 0;
        for (let i = 0; i < code.length; i++) {
            hash = code.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    };

    return (
        <AdminLayout activeMenu="Currencies">
            <Head title="Currencies - ZodicERP" />
            <div className="breadcrumb">
                <a href="#">Dashboard</a>
                <span>/</span>
                <a href="#">Essential Data</a>
                <span>/</span>
                <span>Currencies</span>
            </div>

            {/* Quick Stats */}
            <div className="stats-cards">
                <div className="stat-card">
                    <div className="stat-icon" style={{ backgroundColor: 'var(--primary-color)' }}>
                        <span className="material-icons-outlined">monetization_on</span>
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.total}</div>
                        <div className="stat-label">Total Currencies</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ backgroundColor: 'var(--success-color)' }}>
                        <span className="material-icons-outlined">check_circle</span>
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.active}</div>
                        <div className="stat-label">Active Currencies</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ backgroundColor: 'var(--info-color)' }}>
                        <span className="material-icons-outlined">flag</span>
                    </div>
                    <div className="stat-content">
                        <div className="stat-value" style={{ fontSize: '1.2rem' }}>{stats.baseCurrency}</div>
                        <div className="stat-label">Base Currency</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ backgroundColor: 'var(--warning-color)' }}>
                        <span className="material-icons-outlined">archive</span>
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.inactive}</div>
                        <div className="stat-label">Inactive/Archived</div>
                    </div>
                </div>
            </div>

            {/* Main Card */}
            <div className="currencies-card fade-in">
                <div className="card-header">
                    <div className="currencies-actions">
                        <select className="btn btn-outline" defaultValue="">
                            <option disabled value="">Bulk Actions</option>
                            <option value="activate">Activate Selected</option>
                            <option value="deactivate">Deactivate Selected</option>
                            <option value="delete">Delete Selected</option>
                        </select>
                        <button className="btn btn-outline">
                            <span className="material-icons-outlined">play_arrow</span>
                            <span>Apply</span>
                        </button>
                        <div className="search-bar light">
                            <input 
                                type="text" 
                                placeholder="Search currencies..." 
                                value={searchTerm}
                                onChange={handleSearch}
                            />
                            <button>
                                <span className="material-icons-outlined">search</span>
                            </button>
                        </div>
                    </div>
                    <div className="actions">
                        <button className="btn btn-primary" onClick={() => openModal()}>
                            <span className="material-icons-outlined">add</span>
                            <span>Add Currency</span>
                        </button>
                        <button className="btn btn-outline" onClick={() => window.location.reload()}>
                            <span className="material-icons-outlined">refresh</span>
                            <span>Refresh</span>
                        </button>
                    </div>
                </div>

                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th><input type="checkbox" /></th>
                                <th>CODE <span className="material-icons-outlined" style={{ fontSize: '16px' }}>arrow_drop_down</span></th>
                                <th>CURRENCY <span className="material-icons-outlined" style={{ fontSize: '16px' }}>arrow_drop_down</span></th>
                                <th>SYMBOL <span className="material-icons-outlined" style={{ fontSize: '16px' }}>arrow_drop_down</span></th>
                                <th>DECIMALS <span className="material-icons-outlined" style={{ fontSize: '16px' }}>arrow_drop_down</span></th>
                                <th>IS BASE <span className="material-icons-outlined" style={{ fontSize: '16px' }}>arrow_drop_down</span></th>
                                <th>STATUS <span className="material-icons-outlined" style={{ fontSize: '16px' }}>arrow_drop_down</span></th>
                                <th>OPERATIONS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredCurrencies.length > 0 ? (
                                filteredCurrencies.map(currency => (
                                    <tr key={currency.id}>
                                        <td><input type="checkbox" className="currency-checkbox" /></td>
                                        <td>{currency.code}</td>
                                        <td>
                                            <div className="currency-info">
                                                <div className="currency-icon" style={{ backgroundColor: getCurrencyColor(currency.code) }}>
                                                    <span>{currency.symbol}</span>
                                                </div>
                                                <div className="currency-details">
                                                    <div className="currency-name">{currency.name}</div>
                                                    <div className="currency-code">{currency.format || '-'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>{currency.symbol}</td>
                                        <td>{currency.decimal_places}</td>
                                        <td>
                                            {currency.is_base ? (
                                                <span className="base-badge">
                                                    <span className="material-icons-outlined" style={{ fontSize: '12px', verticalAlign: 'middle' }}>star</span> Base
                                                </span>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </td>
                                        <td>
                                            <span className={`currency-status status-${currency.status}`}>
                                                {currency.status.charAt(0).toUpperCase() + currency.status.slice(1)}
                                            </span>
                                        </td>
                                        <td>
                                            <button className="icon-btn edit" onClick={() => openModal(currency)}>
                                                <span className="material-icons-outlined">edit</span>
                                            </button>
                                            <button className="icon-btn delete" onClick={() => handleDelete(currency.id)}>
                                                <span className="material-icons-outlined">delete</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="8" className="text-center py-4">No currencies found.</td>
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
                        <div className="modal-title">{currentCurrency ? 'Edit Currency' : 'Add New Currency'}</div>
                        <button className="modal-close" onClick={closeModal}>
                            <span className="material-icons-outlined">close</span>
                        </button>
                    </div>
                    <form onSubmit={handleSubmit}>
                        <div className="modal-body">
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Currency Code</label>
                                    <input 
                                        type="text" 
                                        name="code" 
                                        className="form-control" 
                                        defaultValue={currentCurrency?.code}
                                        placeholder="e.g. USD"
                                        required 
                                        maxLength="3"
                                        style={{ textTransform: 'uppercase' }}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Symbol</label>
                                    <input 
                                        type="text" 
                                        name="symbol" 
                                        className="form-control" 
                                        defaultValue={currentCurrency?.symbol}
                                        placeholder="e.g. $"
                                        required 
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Currency Name</label>
                                <input 
                                    type="text" 
                                    name="name" 
                                    className="form-control" 
                                    defaultValue={currentCurrency?.name}
                                    placeholder="e.g. US Dollar"
                                    required 
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Decimal Places</label>
                                    <input 
                                        type="number" 
                                        name="decimal_places" 
                                        className="form-control" 
                                        defaultValue={currentCurrency?.decimal_places || 2}
                                        min="0"
                                        max="8"
                                        required 
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Format</label>
                                    <input 
                                        type="text" 
                                        name="format" 
                                        className="form-control" 
                                        defaultValue={currentCurrency?.format}
                                        placeholder="e.g. 1,0.00"
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Status</label>
                                <select 
                                    name="status" 
                                    className="form-control" 
                                    defaultValue={currentCurrency?.status || 'active'}
                                >
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                    <option value="archived">Archived</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="checkbox-label">
                                    <input 
                                        type="checkbox" 
                                        name="is_base" 
                                        className="form-checkbox"
                                        defaultChecked={currentCurrency?.is_base}
                                    />
                                    Set as Base Currency
                                </label>
                                <div className="text-xs text-gray-500 mt-1 ml-6">
                                    Warning: Setting this as base currency will unset any existing base currency.
                                </div>
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button type="button" className="btn btn-outline" onClick={closeModal}>Cancel</button>
                            <button type="submit" className="btn btn-primary">
                                {currentCurrency ? 'Update Currency' : 'Create Currency'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </AdminLayout>
    );
};

export default Currencies;
