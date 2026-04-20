import React, { useState, useEffect, useMemo } from 'react';
import { Head, router, Link, useForm } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';

const ViewSection = ({ companies, stats, marketIndices: marketIndicesData, countries: countriesData, filters, onEdit, onCreate, onDelete }) => {
    const [searchQuery, setSearchQuery] = useState(filters?.search || '');
    const [internalRatingFilter, setInternalRatingFilter] = useState(filters?.internal_rating || '');
    const [countryFilter, setCountryFilter] = useState(filters?.country || '');
    const [marketIndexFilter, setMarketIndexFilter] = useState(filters?.market_index || '');

    // Custom debounce hook (no external libs)
    const useDebounce = (value, delay) => {
        const [debouncedValue, setDebouncedValue] = useState(value);
        useEffect(() => {
            const handler = setTimeout(() => setDebouncedValue(value), delay);
            return () => clearTimeout(handler);
        }, [value, delay]);
        return debouncedValue;
    };

    const debouncedSearchQuery = useDebounce(searchQuery, 300);

    // Update filters on change
    useEffect(() => {
        const params = {};
        if (debouncedSearchQuery) params.search = debouncedSearchQuery;
        if (internalRatingFilter) params.internal_rating = internalRatingFilter;
        if (countryFilter) params.country = countryFilter;
        if (marketIndexFilter) params.market_index = marketIndexFilter;

        router.get(route('admin.investing.companies.index'), params, {
            preserveState: true,
            preserveScroll: true,
            replace: true
        });
    }, [debouncedSearchQuery, internalRatingFilter, countryFilter, marketIndexFilter]);

    const internalRatings = ['A', 'B', 'C', 'D']; // Standard ratings

    const marketIndices = useMemo(() => [
        ...new Set(
            ((marketIndicesData || []).map(index => index.name) || [])
                .filter(Boolean)
        )
    ].sort(), [marketIndicesData]);

    const countries = useMemo(() => [
        ...new Set(
            ((countriesData || []).map(c => c.name || c.name_en || c.name_ar) || [])
                .filter(Boolean)
        )
    ].sort(), [countriesData]);

    // Optional: Add fade effect on data change
    useEffect(() => {
        const rows = document.querySelectorAll('.professional-table tbody tr');
        rows.forEach(row => row.classList.add('fade-out'));
        setTimeout(() => {
            rows.forEach(row => row.classList.remove('fade-out'));
        }, 300);
    }, [companies.data]);

    return (
        <div className="animate-fade-slide">
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon blue">
                        <span className="material-icons-outlined">business</span>
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">{stats.total}</span>
                        <span className="stat-label">Total Companies</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon green">
                        <span className="material-icons-outlined">check_circle</span>
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">{stats.active}</span>
                        <span className="stat-label">Active Companies</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon orange">
                        <span className="material-icons-outlined">pause_circle</span>
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">{stats.inactive}</span>
                        <span className="stat-label">Inactive/Other</span>
                    </div>
                </div>
            </div>

            <div className="content-card">
                <div className="page-header" style={{ marginBottom: '1.5rem' }}>
                    <div className="advanced-search-container">
                        <div className="search-box">
                            <span className="material-icons-outlined search-icon">search</span>
                            <input
                                type="text"
                                placeholder="Search companies by ticker or name..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                dir="auto"
                            />
                            {searchQuery && (
                                <button className="clear-btn" onClick={() => setSearchQuery('')} title="Clear search">
                                    <span className="material-icons-outlined">clear</span>
                                </button>
                            )}
                        </div>
                        <div className="filter-controls">
                            <select value={internalRatingFilter} onChange={(e) => setInternalRatingFilter(e.target.value)}>
                                <option value="">All Internal Ratings</option>
                                {internalRatings.map(rating => (
                                    <option key={rating} value={rating}>{rating}</option>
                                ))}
                            </select>
                            <select value={marketIndexFilter} onChange={(e) => setMarketIndexFilter(e.target.value)}>
                                <option value="">All Market Indices</option>
                                {marketIndices.map(indexName => (
                                    <option key={indexName} value={indexName}>{indexName}</option>
                                ))}
                            </select>
                            <select value={countryFilter} onChange={(e) => setCountryFilter(e.target.value)}>
                                <option value="">All Countries</option>
                                {countries.map(country => (
                                    <option key={country} value={country}>{country}</option>
                                ))}
                            </select>
                            <button className="btn btn-secondary clear-filters-btn" onClick={() => { setSearchQuery(''); setInternalRatingFilter(''); setCountryFilter(''); setMarketIndexFilter(''); }}>
                                Clear Filters
                            </button>
                        </div>
                    </div>
                    <div className="results-info">
                        Showing {companies.from || 0} to {companies.to || 0} of {companies.total} companies
                    </div>
                    <button className="btn btn-primary" onClick={onCreate}>
                        <span className="material-icons-outlined">add</span>
                        Add New Company
                    </button>
                </div>

                <div className="table-responsive">
                    <table className="professional-table">
                        <thead>
                            <tr>
                                <th>Code</th>
                                <th>Name (AR)</th>
                                <th>Name (EN)</th>
                                <th>Ticker</th>
                                <th>Country</th>
                                <th>Currency</th>
                                <th>Indices</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {companies.data && companies.data.length > 0 ? (
                                companies.data.map(company => (
                                    <tr key={company.id}>
                                        <td>{company.company_code}</td>
                                        <td>{company.legal_name_ar}</td>
                                        <td>{company.legal_name_en || '-'}</td>
                                        <td>{company.ticker_symbol || '-'}</td>
                                        <td>{company.country?.name || company.country?.name_en || company.country?.name_ar || '-'}</td>
                                        <td>{company.reporting_currency?.code || '-'}</td>
                                        <td>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                                                {company.market_indices?.length > 0 ? (
                                                    company.market_indices.map(mi => (
                                                        <span key={mi.id} style={{ fontSize: '0.7rem', background: '#e9ecef', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                                                            {mi.name}
                                                        </span>
                                                    ))
                                                ) : '-'}
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`status-badge ${company.status}`}>
                                                {company.status ? company.status.charAt(0).toUpperCase() + company.status.slice(1) : '-'}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="action-buttons">
                                                <button onClick={() => onEdit(company)} title="Edit">
                                                    <span className="material-icons-outlined">edit</span>
                                                </button>
                                                <button className="delete-btn" onClick={() => onDelete(company.id)} title="Delete">
                                                    <span className="material-icons-outlined">delete</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="9" style={{ textAlign: 'center', padding: '2rem' }}>
                                        No companies match your search. <button onClick={() => { setSearchQuery(''); setInternalRatingFilter(''); setCountryFilter(''); setMarketIndexFilter(''); }}>Clear filters</button>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {companies.links && companies.links.length > 3 && (
                    <div className="pagination-container" style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                        {companies.links.map((link, key) => (
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

const FormSection = ({ mode, initialData, countries, currencies, industries, subIndustries, exchanges, marketIndices, states, cities, onBack, onSuccess }) => {
    const isEdit = mode === 'edit';
    const [activeTab, setActiveTab] = useState('general');
    
    const { data, setData, post, put, processing, errors, reset } = useForm({
        company_code: initialData?.company_code || '',
        tax_id: initialData?.tax_id || '',
        commercial_registration: initialData?.commercial_registration || '',
        legal_form: initialData?.legal_form || 'llc',
        legal_name_ar: initialData?.legal_name_ar || '',
        legal_name_en: initialData?.legal_name_en || '',
        trade_name_ar: initialData?.trade_name_ar || '',
        trade_name_en: initialData?.trade_name_en || '',
        industry_id: initialData?.industry_id || '',
        sub_industry_id: initialData?.sub_industry_id || '',
        company_size: initialData?.company_size || 'medium',
        country_id: initialData?.country_id || '',
        state_id: initialData?.state_id || '',
        city_id: initialData?.city_id || '',
        address_ar: initialData?.address_ar || '',
        address_en: initialData?.address_en || '',
        phone: initialData?.phone || '',
        email: initialData?.email || '',
        website: initialData?.website || '',
        ceo_name_ar: initialData?.ceo_name_ar || '',
        ceo_name_en: initialData?.ceo_name_en || '',
        chairman_name_ar: initialData?.chairman_name_ar || '',
        chairman_name_en: initialData?.chairman_name_en || '',
        reporting_currency_id: initialData?.reporting_currency_id || '',
        paid_up_capital: initialData?.paid_up_capital || '',
        authorized_capital: initialData?.authorized_capital || '',
        annual_revenue: initialData?.annual_revenue || '',
        exchange_id: initialData?.exchange_id || '',
        ticker_symbol: initialData?.ticker_symbol || '',
        isin_code: initialData?.isin_code || '',
        market_index_ids: initialData?.market_indices?.map(mi => mi.id) || [],
        ipo_date: initialData?.ipo_date || '',
        market_cap: initialData?.market_cap || '',
        credit_rating_id: initialData?.credit_rating_id || '',
        credit_score: initialData?.credit_score || '',
        rating_outlook: initialData?.rating_outlook || 'stable',
        status: initialData?.status || 'active',
        description: initialData?.description || '',
        notes: initialData?.notes || '',
        internal_rating: initialData?.internal_rating || 'B',
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (isEdit) {
            put(route('admin.investing.companies.update', initialData.id), {
                onSuccess: () => {
                    reset();
                    onSuccess();
                },
            });
        } else {
            post(route('admin.investing.companies.store'), {
                onSuccess: () => {
                    reset();
                    onSuccess();
                },
            });
        }
    };

    const toggleMarketIndex = (id) => {
        const currentIds = [...data.market_index_ids];
        const index = currentIds.indexOf(id);
        if (index > -1) {
            currentIds.splice(index, 1);
        } else {
            currentIds.push(id);
        }
        setData('market_index_ids', currentIds);
    };

    const tabs = [
        { id: 'general', label: 'General Info', icon: 'info' },
        { id: 'classification', label: 'Classification', icon: 'category' },
        { id: 'location', label: 'Location', icon: 'place' },
        { id: 'contact', label: 'Contact', icon: 'contact_phone' },
        { id: 'people', label: 'People', icon: 'people' },
        { id: 'financials', label: 'Financials', icon: 'account_balance_wallet' },
        { id: 'listing', label: 'Listing', icon: 'list_alt' },
        { id: 'relations', label: 'Relations', icon: 'handshake' },
    ];

    return (
        <div className="animate-fade-slide">
            <div className="page-header" style={{ marginBottom: '1.5rem' }}>
                <div className="page-header-title" style={{ margin: 0 }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#1f2937' }}>
                        {isEdit ? 'Edit Listed Company' : 'Create New Listed Company'}
                    </h2>
                </div>
                <button className="btn btn-secondary" onClick={onBack}>
                    <span className="material-icons-outlined">arrow_back</span>
                    Back to List
                </button>
            </div>

            <div className="content-card" style={{ padding: 0 }}>
                <div className="form-tabs-container">
                    <div className="form-tabs">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                                onClick={() => setActiveTab(tab.id)}
                                type="button"
                            >
                                <span className="material-icons-outlined">{tab.icon}</span>
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <form onSubmit={handleSubmit} className="tabbed-form">
                        <div className="tab-content">
                            {activeTab === 'general' && (
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label>Company Code *</label>
                                        <input type="text" value={data.company_code} onChange={e => setData('company_code', e.target.value)} required readOnly={isEdit} style={isEdit ? { backgroundColor: '#f3f4f6' } : {}} />
                                        {errors.company_code && <div className="error-message">{errors.company_code}</div>}
                                    </div>
                                    <div className="form-group">
                                        <label>Legal Form *</label>
                                        <select value={data.legal_form} onChange={e => setData('legal_form', e.target.value)} required>
                                            <option value="llc">LLC</option>
                                            <option value="joint_stock">Joint Stock</option>
                                            <option value="partnership">Partnership</option>
                                            <option value="sole_proprietorship">Sole Proprietorship</option>
                                            <option value="branch">Branch</option>
                                            <option value="subsidiary">Subsidiary</option>
                                            <option value="government">Government</option>
                                            <option value="non_profit">Non-Profit</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Legal Name (AR) *</label>
                                        <input type="text" value={data.legal_name_ar} onChange={e => setData('legal_name_ar', e.target.value)} required />
                                        {errors.legal_name_ar && <div className="error-message">{errors.legal_name_ar}</div>}
                                    </div>
                                    <div className="form-group">
                                        <label>Legal Name (EN)</label>
                                        <input type="text" value={data.legal_name_en} onChange={e => setData('legal_name_en', e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                        <label>Trade Name (AR)</label>
                                        <input type="text" value={data.trade_name_ar} onChange={e => setData('trade_name_ar', e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                        <label>Trade Name (EN)</label>
                                        <input type="text" value={data.trade_name_en} onChange={e => setData('trade_name_en', e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                        <label>Company Size *</label>
                                        <select value={data.company_size} onChange={e => setData('company_size', e.target.value)} required>
                                            <option value="micro">Micro</option>
                                            <option value="small">Small</option>
                                            <option value="medium">Medium</option>
                                            <option value="large">Large</option>
                                            <option value="enterprise">Enterprise</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Status *</label>
                                        <select value={data.status} onChange={e => setData('status', e.target.value)} required>
                                            <option value="active">Active</option>
                                            <option value="inactive">Inactive</option>
                                            <option value="suspended">Suspended</option>
                                            <option value="bankrupt">Bankrupt</option>
                                            <option value="dissolved">Dissolved</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Internal Rating *</label>
                                        <select value={data.internal_rating} onChange={e => setData('internal_rating', e.target.value)} required>
                                            <option value="A">A</option>
                                            <option value="B">B</option>
                                            <option value="C">C</option>
                                            <option value="D">D</option>
                                        </select>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'classification' && (
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label>Industry</label>
                                        <select value={data.industry_id} onChange={e => setData('industry_id', e.target.value)}>
                                            <option value="">Select Industry</option>
                                            {industries.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Sub-Industry</label>
                                        <select value={data.sub_industry_id} onChange={e => setData('sub_industry_id', e.target.value)}>
                                            <option value="">Select Sub-Industry</option>
                                            {subIndustries.filter(si => !data.industry_id || si.industry_id == data.industry_id).map(si => <option key={si.id} value={si.id}>{si.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'location' && (
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label>Country *</label>
                                        <select value={data.country_id} onChange={e => setData('country_id', e.target.value)} required>
                                            <option value="">Select Country</option>
                                            {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>State</label>
                                        <select value={data.state_id} onChange={e => setData('state_id', e.target.value)}>
                                            <option value="">Select State</option>
                                            {states.filter(s => !data.country_id || s.country_id == data.country_id).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>City</label>
                                        <select value={data.city_id} onChange={e => setData('city_id', e.target.value)}>
                                            <option value="">Select City</option>
                                            {cities.filter(c => !data.country_id || c.country_id == data.country_id).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group full-width">
                                        <label>Address (AR)</label>
                                        <input type="text" value={data.address_ar} onChange={e => setData('address_ar', e.target.value)} />
                                    </div>
                                    <div className="form-group full-width">
                                        <label>Address (EN)</label>
                                        <input type="text" value={data.address_en} onChange={e => setData('address_en', e.target.value)} />
                                    </div>
                                </div>
                            )}

                            {activeTab === 'contact' && (
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label>Phone</label>
                                        <input type="text" value={data.phone} onChange={e => setData('phone', e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                        <label>Email</label>
                                        <input type="email" value={data.email} onChange={e => setData('email', e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                        <label>Website</label>
                                        <input type="url" value={data.website} onChange={e => setData('website', e.target.value)} />
                                    </div>
                                </div>
                            )}

                            {activeTab === 'people' && (
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label>CEO Name (AR)</label>
                                        <input type="text" value={data.ceo_name_ar} onChange={e => setData('ceo_name_ar', e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                        <label>CEO Name (EN)</label>
                                        <input type="text" value={data.ceo_name_en} onChange={e => setData('ceo_name_en', e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                        <label>Chairman (AR)</label>
                                        <input type="text" value={data.chairman_name_ar} onChange={e => setData('chairman_name_ar', e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                        <label>Chairman (EN)</label>
                                        <input type="text" value={data.chairman_name_en} onChange={e => setData('chairman_name_en', e.target.value)} />
                                    </div>
                                </div>
                            )}

                            {activeTab === 'financials' && (
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label>Reporting Currency</label>
                                        <select value={data.reporting_currency_id} onChange={e => setData('reporting_currency_id', e.target.value)}>
                                            <option value="">Select Currency</option>
                                            {currencies.map(c => <option key={c.id} value={c.id}>{c.code} - {c.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Paid-up Capital</label>
                                        <input type="number" step="0.01" value={data.paid_up_capital} onChange={e => setData('paid_up_capital', e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                        <label>Authorized Capital</label>
                                        <input type="number" step="0.01" value={data.authorized_capital} onChange={e => setData('authorized_capital', e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                        <label>Annual Revenue</label>
                                        <input type="number" step="0.01" value={data.annual_revenue} onChange={e => setData('annual_revenue', e.target.value)} />
                                    </div>
                                </div>
                            )}

                            {activeTab === 'listing' && (
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label>Stock Exchange</label>
                                        <select value={data.exchange_id} onChange={e => setData('exchange_id', e.target.value)}>
                                            <option value="">Select Exchange</option>
                                            {exchanges.map(ex => <option key={ex.id} value={ex.id}>{ex.name} ({ex.code})</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Ticker Symbol</label>
                                        <input type="text" value={data.ticker_symbol} onChange={e => setData('ticker_symbol', e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                        <label>ISIN Code</label>
                                        <input type="text" value={data.isin_code} onChange={e => setData('isin_code', e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                        <label>IPO Date</label>
                                        <input type="date" value={data.ipo_date} onChange={e => setData('ipo_date', e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                        <label>Market Cap</label>
                                        <input type="number" step="0.01" value={data.market_cap} onChange={e => setData('market_cap', e.target.value)} />
                                    </div>
                                    <div className="form-group full-width">
                                        <label>Market Indices</label>
                                        <div className="checkbox-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', background: '#f8f9fa', padding: '1rem', borderRadius: '8px' }}>
                                            {marketIndices.map(mi => (
                                                <label key={mi.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', margin: 0 }}>
                                                    <input 
                                                        type="checkbox" 
                                                        checked={data.market_index_ids.includes(mi.id)} 
                                                        onChange={() => toggleMarketIndex(mi.id)}
                                                        style={{ width: 'auto' }}
                                                    />
                                                    <span style={{ fontSize: '0.875rem' }}>{mi.name}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>Credit Score</label>
                                        <input type="number" value={data.credit_score} onChange={e => setData('credit_score', e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                        <label>Rating Outlook *</label>
                                        <select value={data.rating_outlook} onChange={e => setData('rating_outlook', e.target.value)} required>
                                            <option value="positive">Positive</option>
                                            <option value="stable">Stable</option>
                                            <option value="negative">Negative</option>
                                            <option value="watch">Watch</option>
                                        </select>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'relations' && (
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label>Tax ID</label>
                                        <input type="text" value={data.tax_id} onChange={e => setData('tax_id', e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                        <label>Commercial Registration</label>
                                        <input type="text" value={data.commercial_registration} onChange={e => setData('commercial_registration', e.target.value)} />
                                    </div>
                                    <div className="form-group full-width">
                                        <label>Description</label>
                                        <textarea value={data.description} onChange={e => setData('description', e.target.value)} rows="3"></textarea>
                                    </div>
                                    <div className="form-group full-width">
                                         <label>Notes</label>
                                         <textarea value={data.notes} onChange={e => setData('notes', e.target.value)} rows="3"></textarea>
                                     </div>
                                 </div>
                             )}
                         </div>

                        <div className="form-actions" style={{ padding: '1.5rem', borderTop: '1px solid #eee' }}>
                            <button type="button" className="btn btn-secondary" onClick={onBack} disabled={processing}>Cancel</button>
                            <button type="submit" className="btn btn-primary" disabled={processing}>
                                {processing ? 'Saving...' : (isEdit ? 'Update Company' : 'Create Company')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

const ListedCompanies = ({ companies, stats, countries, currencies, industries, subIndustries, exchanges, marketIndices, creditRatings, states, cities, filters }) => {
    const [viewMode, setViewMode] = useState('list');
    const [selectedCompany, setSelectedCompany] = useState(null);

    const handleCreate = () => {
        setSelectedCompany(null);
        setViewMode('create');
    };

    const handleEdit = (company) => {
        setSelectedCompany(company);
        setViewMode('edit');
    };

    const handleDelete = (id) => {
        if (confirm('Are you sure you want to delete this company?')) {
            router.delete(route('admin.investing.companies.destroy', id), {
                preserveScroll: true,
            });
        }
    };

    return (
        <AdminLayout>
            <Head title="Listed Companies" />
            <div className="listed-companies-container">
                <div className="page-header-title">
                    <h1>Listed Companies Management</h1>
                    <p>Manage public companies, tickers, and exchange information</p>
                </div>

                {viewMode === 'list' && (
                    <ViewSection
             companies={companies}
             stats={stats}
             marketIndices={marketIndices}
             countries={countries}
             filters={filters}
             onEdit={handleEdit}
                        onCreate={handleCreate}
                        onDelete={handleDelete}
                    />
                )}

                {(viewMode === 'create' || viewMode === 'edit') && (
                    <FormSection
                        mode={viewMode}
                        initialData={selectedCompany}
                        countries={countries}
                        currencies={currencies}
                        industries={industries}
                        subIndustries={subIndustries}
                        exchanges={exchanges}
                        marketIndices={marketIndices}
                        creditRatings={creditRatings}
                        states={states}
                        cities={cities}
                        onBack={() => setViewMode('list')}
                        onSuccess={() => setViewMode('list')}
                    />
                )}
            </div>
        </AdminLayout>
    );
};

export default ListedCompanies;
