import React, { useState, useEffect, useMemo } from 'react';
import { Head, router, Link, useForm, usePage } from '@inertiajs/react';
import * as XLSX from 'xlsx';
import AdminLayout from '../components/AdminLayout';
import Table from '../components/Table';

const ViewSection = ({ companies, stats, marketIndices: marketIndicesData, countries: countriesData, filters, onEdit, onCreate, onDelete, onView, setShowImport }) => {
    const { props } = usePage();
    const translations = props.localization?.translations || {};
    const t = (key, fallback) => {
        const fullKey = `ListedCompanies.${key}`;
        if (translations[fullKey]) return translations[fullKey];
        console.warn(`Missing translation: ${fullKey}`);
        return fallback;
    };

    // Column configuration
    const columns = [
        { key: 'company_code', header: t('code', 'Code'), sortable: true },
        { key: 'legal_name_ar', header: t('name_ar', 'Name (AR)'), sortable: true },
        { key: 'legal_name_en', header: t('name_en', 'Name (EN)'), sortable: true, render: (row) => row.legal_name_en || '-' },
        { key: 'ticker_symbol', header: t('ticker', 'Ticker'), sortable: true, render: (row) => row.ticker_symbol || '-' },
        { 
            key: 'country', 
            header: t('country', 'Country'),
            sortable: false, // country is a relation, not a direct column we're sorting by right now
            render: (row) => row.country?.name || row.country?.name_en || row.country?.name_ar || '-' 
        },
        { 
            key: 'reporting_currency', 
            header: t('currency', 'Currency'),
            sortable: false,
            render: (row) => row.reporting_currency?.code || '-' 
        },
        { 
            key: 'roi', 
            header: t('roi', 'ROI (%)'),
            sortable: true,
            render: (row) => row.roi ? `${row.roi}%` : '-' 
        },
        { 
            key: 'market_indices', 
            header: t('indices', 'Indices'),
            sortable: false,
            render: (row) => (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                    {row.market_indices?.length > 0 ? (
                        row.market_indices.map((mi) => (
                            <span key={mi.id} style={{ fontSize: '0.7rem', background: '#e9ecef', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                                {mi.name}
                            </span>
                        ))
                    ) : (
                        '-'
                    )}
                </div>
            ) 
        },
        { 
            key: 'status', 
            header: t('status', 'Status'),
            sortable: true,
            render: (row) => (
                <span className={`status-badge ${row.status}`}>
                    {row.status ? t(row.status, row.status.charAt(0).toUpperCase() + row.status.slice(1)) : '-'}
                </span>
            ) 
        }
    ];

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

        // Check if params are different from current filters
        const hasChanges = 
            debouncedSearchQuery !== (filters?.search || '') ||
            internalRatingFilter !== (filters?.internal_rating || '') ||
            countryFilter !== (filters?.country || '') ||
            marketIndexFilter !== (filters?.market_index || '');

        if (hasChanges) {
            router.get(route('admin.investing.companies.index'), params, {
                preserveState: true,
                preserveScroll: true,
                replace: true
            });
        }
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



    return (
        <div className="animate-fade-slide">
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon blue">
                        <span className="material-icons-outlined">business</span>
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">{stats.total}</span>
                        <span className="stat-label">{t('total_companies', 'Total Companies')}</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon green">
                        <span className="material-icons-outlined">check_circle</span>
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">{stats.active}</span>
                        <span className="stat-label">{t('active_companies', 'Active Companies')}</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon orange">
                        <span className="material-icons-outlined">pause_circle</span>
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">{stats.inactive}</span>
                        <span className="stat-label">{t('inactive_companies', 'Inactive/Other')}</span>
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
                                placeholder={t('search_placeholder', 'Search companies by ticker or name...')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                dir="auto"
                            />
                            {searchQuery && (
                                <button className="clear-btn" onClick={() => setSearchQuery('')} title={t('clear_filters', 'Clear search')}>
                                    <span className="material-icons-outlined">clear</span>
                                </button>
                            )}
                        </div>
                        <div className="filter-controls">
                            <select value={internalRatingFilter} onChange={(e) => setInternalRatingFilter(e.target.value)}>
                                <option value="">{t('all_ratings', 'All Internal Ratings')}</option>
                                {internalRatings.map(rating => (
                                    <option key={rating} value={rating}>{rating}</option>
                                ))}
                            </select>
                            <select value={marketIndexFilter} onChange={(e) => setMarketIndexFilter(e.target.value)}>
                                <option value="">{t('all_indices', 'All Market Indices')}</option>
                                {marketIndices.map(indexName => (
                                    <option key={indexName} value={indexName}>{indexName}</option>
                                ))}
                            </select>
                            <select value={countryFilter} onChange={(e) => setCountryFilter(e.target.value)}>
                                <option value="">{t('all_countries', 'All Countries')}</option>
                                {countries.map(country => (
                                    <option key={country} value={country}>{country}</option>
                                ))}
                            </select>
                            <button className="btn btn-secondary clear-filters-btn" onClick={() => { setSearchQuery(''); setInternalRatingFilter(''); setCountryFilter(''); setMarketIndexFilter(''); }}>
                                {t('clear_filters', 'Clear Filters')}
                            </button>
                        </div>
                    </div>
                    <div className="results-info">
                        {t('showing_results', `Showing ${companies.from || 0} to ${companies.to || 0} of ${companies.total} companies`)
                            .replace(':from', companies.from || 0)
                            .replace(':to', companies.to || 0)
                            .replace(':total', companies.total)}
                    </div>
                    <div className="header-actions" style={{ display: 'flex', gap: '0.75rem' }}>
                        <button className="btn btn-secondary" onClick={() => setShowImport(true)}>
                            <span className="material-icons-outlined">upload_file</span>
                            {t('import_excel', 'Import from Excel')}
                        </button>
                        <button className="btn btn-primary" onClick={onCreate}>
                            <span className="material-icons-outlined">add</span>
                            {t('add_new', 'Add New Company')}
                        </button>
                    </div>
                </div>

                <Table
                    tableData={companies.data}
                    columns={columns}
                    currentPage={companies.current_page}
                    totalPages={companies.last_page}
                    totalRecords={companies.total}
                    recordsPerPage={companies.per_page}
                    serverSide={true}
                    sortKey={filters?.sort}
                    sortDirection={filters?.direction}
                    onSort={(sort, direction) => {
                        const params = { ...filters };
                        if (sort && direction) {
                            params.sort = sort;
                            params.direction = direction;
                        } else {
                            delete params.sort;
                            delete params.direction;
                        }
                        router.get(route('admin.investing.companies.index'), params, {
                            preserveState: true,
                            preserveScroll: true,
                            replace: true
                        });
                    }}
                    onPageChange={(page) => {
                        router.get(route('admin.investing.companies.index'), { ...filters, page }, {
                            preserveState: true,
                            preserveScroll: true
                        });
                    }}
                    onView={onView}
                    onEdit={onEdit}
                    onDelete={(row) => onDelete(row.id)}
                    viewTitle={t('view', 'View')}
                    editTitle={t('edit', 'Edit')}
                    deleteTitle={t('delete', 'Delete')}
                />
            </div>
        </div>
    );
};

const FormSection = ({ mode, initialData, countries, currencies, industries, subIndustries, exchanges, marketIndices, states, cities, onBack, onSuccess }) => {
    const { props } = usePage();
    const translations = props.localization?.translations || {};
    const isRtl = props.localization?.is_rtl;
    const t = (key, fallback) => {
        const fullKey = `ListedCompanies.${key}`;
        if (translations[fullKey]) return translations[fullKey];
        console.warn(`Missing translation: ${fullKey}`);
        return fallback;
    };

    const isEdit = mode === 'edit';
    const isView = mode === 'view';
    const [activeTab, setActiveTab] = useState('general');
    
    // Helper to get localized company name with fallbacks
    const getLocalizedCompanyName = (company) => {
        if (!company) return '';
        if (isRtl) {
            return (
                company.legal_name_ar ||
                company.legal_name_en ||
                company.trade_name_ar ||
                company.trade_name_en ||
                'شركة بدون اسم'
            );
        } else {
            return (
                company.legal_name_en ||
                company.legal_name_ar ||
                company.trade_name_en ||
                company.trade_name_ar ||
                'Unnamed Company'
            );
        }
    };
    
    // Helper to get ticker symbol with fallbacks
    const getTickerSymbol = (company) => {
        if (!company) return '';
        return company.ticker_symbol || company.company_code || 'No Ticker';
    };
    
    // Reusable computed display title
    const companyDisplayTitle = () => {
        if (mode === 'create') {
            return t('create_title', 'Create New Listed Company');
        }
        const ticker = getTickerSymbol(initialData);
        const name = getLocalizedCompanyName(initialData);
        return `${ticker} - ${name}`;
    };
    
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
        roi: initialData?.roi || '',
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
        { id: 'general', label: t('tab_general', 'General Info'), icon: 'info' },
        { id: 'classification', label: t('tab_classification', 'Classification'), icon: 'category' },
        { id: 'location', label: t('tab_location', 'Location'), icon: 'place' },
        { id: 'contact', label: t('tab_contact', 'Contact'), icon: 'contact_phone' },
        { id: 'people', label: t('tab_people', 'People'), icon: 'people' },
        { id: 'financials', label: t('tab_financials', 'Financials'), icon: 'account_balance_wallet' },
        { id: 'listing', label: t('tab_listing', 'Listing'), icon: 'list_alt' },
        { id: 'relations', label: t('tab_relations', 'Relations'), icon: 'handshake' },
    ];

    return (
        <div className="animate-fade-slide">
            <div className="page-header" style={{ marginBottom: '1.5rem' }}>
                <div className="page-header-title" style={{ margin: 0 }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#1f2937' }}>
                        {companyDisplayTitle()}
                    </h2>
                </div>
                <button className="btn btn-secondary" onClick={onBack}>
                    <span className="material-icons-outlined">arrow_back</span>
                    {t('back_to_list', 'Back to List')}
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
                        <fieldset disabled={isView} style={{ border: 'none', padding: 0, margin: 0 }}>
                            <div className="tab-content">
                            {activeTab === 'general' && (
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label>{t('company_code', 'Company Code')} *</label>
                                        <input type="text" value={data.company_code} onChange={e => setData('company_code', e.target.value)} required readOnly={isEdit} style={isEdit ? { backgroundColor: '#f3f4f6' } : {}} />
                                        {errors.company_code && <div className="error-message">{errors.company_code}</div>}
                                    </div>
                                    <div className="form-group">
                                        <label>{t('legal_form', 'Legal Form')} *</label>
                                        <select value={data.legal_form} onChange={e => setData('legal_form', e.target.value)} required>
                                            <option value="llc">{t('llc', 'LLC')}</option>
                                            <option value="joint_stock">{t('joint_stock', 'Joint Stock')}</option>
                                            <option value="partnership">{t('partnership', 'Partnership')}</option>
                                            <option value="sole_proprietorship">{t('sole_proprietorship', 'Sole Proprietorship')}</option>
                                            <option value="branch">{t('branch', 'Branch')}</option>
                                            <option value="subsidiary">{t('subsidiary', 'Subsidiary')}</option>
                                            <option value="government">{t('government', 'Government')}</option>
                                            <option value="non_profit">{t('non_profit', 'Non-Profit')}</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>{t('legal_name_ar', 'Legal Name (AR)')} *</label>
                                        <input type="text" value={data.legal_name_ar} onChange={e => setData('legal_name_ar', e.target.value)} required />
                                        {errors.legal_name_ar && <div className="error-message">{errors.legal_name_ar}</div>}
                                    </div>
                                    <div className="form-group">
                                        <label>{t('legal_name_en', 'Legal Name (EN)')}</label>
                                        <input type="text" value={data.legal_name_en} onChange={e => setData('legal_name_en', e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                        <label>{t('trade_name_ar', 'Trade Name (AR)')}</label>
                                        <input type="text" value={data.trade_name_ar} onChange={e => setData('trade_name_ar', e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                        <label>{t('trade_name_en', 'Trade Name (EN)')}</label>
                                        <input type="text" value={data.trade_name_en} onChange={e => setData('trade_name_en', e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                        <label>{t('company_size', 'Company Size')} *</label>
                                        <select value={data.company_size} onChange={e => setData('company_size', e.target.value)} required>
                                            <option value="micro">{t('micro', 'Micro')}</option>
                                            <option value="small">{t('small', 'Small')}</option>
                                            <option value="medium">{t('medium', 'Medium')}</option>
                                            <option value="large">{t('large', 'Large')}</option>
                                            <option value="enterprise">{t('enterprise', 'Enterprise')}</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>{t('status_label', 'Status')} *</label>
                                        <select value={data.status} onChange={e => setData('status', e.target.value)} required>
                                            <option value="active">{t('active', 'Active')}</option>
                                            <option value="inactive">{t('inactive', 'Inactive')}</option>
                                            <option value="suspended">{t('suspended', 'Suspended')}</option>
                                            <option value="bankrupt">{t('bankrupt', 'Bankrupt')}</option>
                                            <option value="dissolved">{t('dissolved', 'Dissolved')}</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>{t('internal_rating', 'Internal Rating')} *</label>
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
                                        <label>{t('industry', 'Industry')}</label>
                                        <select value={data.industry_id} onChange={e => setData('industry_id', e.target.value)}>
                                            <option value="">{t('select_industry', 'Select Industry')}</option>
                                            {industries.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>{t('sub_industry', 'Sub-Industry')}</label>
                                        <select value={data.sub_industry_id} onChange={e => setData('sub_industry_id', e.target.value)}>
                                            <option value="">{t('select_sub_industry', 'Select Sub-Industry')}</option>
                                            {subIndustries.filter(si => !data.industry_id || si.industry_id == data.industry_id).map(si => <option key={si.id} value={si.id}>{si.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'location' && (
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label>{t('country', 'Country')} *</label>
                                        <select value={data.country_id} onChange={e => setData('country_id', e.target.value)} required>
                                            <option value="">{t('select_country', 'Select Country')}</option>
                                            {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>{t('state', 'State')}</label>
                                        <select value={data.state_id} onChange={e => setData('state_id', e.target.value)}>
                                            <option value="">{t('select_state', 'Select State')}</option>
                                            {states.filter(s => !data.country_id || s.country_id == data.country_id).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>{t('city', 'City')}</label>
                                        <select value={data.city_id} onChange={e => setData('city_id', e.target.value)}>
                                            <option value="">{t('select_city', 'Select City')}</option>
                                            {cities.filter(c => !data.country_id || c.country_id == data.country_id).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group full-width">
                                        <label>{t('address_ar', 'Address (AR)')}</label>
                                        <input type="text" value={data.address_ar} onChange={e => setData('address_ar', e.target.value)} />
                                    </div>
                                    <div className="form-group full-width">
                                        <label>{t('address_en', 'Address (EN)')}</label>
                                        <input type="text" value={data.address_en} onChange={e => setData('address_en', e.target.value)} />
                                    </div>
                                </div>
                            )}

                            {activeTab === 'contact' && (
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label>{t('phone', 'Phone')}</label>
                                        <input type="text" value={data.phone} onChange={e => setData('phone', e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                        <label>{t('email', 'Email')}</label>
                                        <input type="email" value={data.email} onChange={e => setData('email', e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                        <label>{t('website', 'Website')}</label>
                                        <input type="url" value={data.website} onChange={e => setData('website', e.target.value)} />
                                    </div>
                                </div>
                            )}

                            {activeTab === 'people' && (
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label>{t('ceo_name_ar', 'CEO Name (AR)')}</label>
                                        <input type="text" value={data.ceo_name_ar} onChange={e => setData('ceo_name_ar', e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                        <label>{t('ceo_name_en', 'CEO Name (EN)')}</label>
                                        <input type="text" value={data.ceo_name_en} onChange={e => setData('ceo_name_en', e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                        <label>{t('chairman_name_ar', 'Chairman Name (AR)')}</label>
                                        <input type="text" value={data.chairman_name_ar} onChange={e => setData('chairman_name_ar', e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                        <label>{t('chairman_name_en', 'Chairman Name (EN)')}</label>
                                        <input type="text" value={data.chairman_name_en} onChange={e => setData('chairman_name_en', e.target.value)} />
                                    </div>
                                </div>
                            )}

                            {activeTab === 'financials' && (
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label>{t('reporting_currency', 'Reporting Currency')}</label>
                                        <select value={data.reporting_currency_id} onChange={e => setData('reporting_currency_id', e.target.value)}>
                                            <option value="">{t('select_currency', 'Select Currency')}</option>
                                            {currencies.map(c => <option key={c.id} value={c.id}>{c.code} - {c.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>{t('paid_up_capital', 'Paid-up Capital')}</label>
                                        <input type="number" step="0.01" value={data.paid_up_capital} onChange={e => setData('paid_up_capital', e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                        <label>{t('authorized_capital', 'Authorized Capital')}</label>
                                        <input type="number" step="0.01" value={data.authorized_capital} onChange={e => setData('authorized_capital', e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                        <label>{t('annual_revenue', 'Annual Revenue')}</label>
                                        <input type="number" step="0.01" value={data.annual_revenue} onChange={e => setData('annual_revenue', e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                        <label>{t('roi', 'ROI (%)')}</label>
                                        <input type="number" step="0.01" min="0" value={data.roi} onChange={e => setData('roi', e.target.value)} />
                                    </div>
                                </div>
                            )}

                            {activeTab === 'listing' && (
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label>{t('exchange', 'Stock Exchange')}</label>
                                        <select value={data.exchange_id} onChange={e => setData('exchange_id', e.target.value)}>
                                            <option value="">{t('select_exchange', 'Select Exchange')}</option>
                                            {exchanges.map(ex => <option key={ex.id} value={ex.id}>{ex.name} ({ex.code})</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>{t('ticker_symbol', 'Ticker Symbol')}</label>
                                        <input type="text" value={data.ticker_symbol} onChange={e => setData('ticker_symbol', e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                        <label>{t('isin_code', 'ISIN Code')}</label>
                                        <input type="text" value={data.isin_code} onChange={e => setData('isin_code', e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                        <label>{t('ipo_date', 'IPO Date')}</label>
                                        <input type="date" value={data.ipo_date} onChange={e => setData('ipo_date', e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                        <label>{t('market_cap', 'Market Cap')}</label>
                                        <input type="number" step="0.01" value={data.market_cap} onChange={e => setData('market_cap', e.target.value)} />
                                    </div>
                                    <div className="form-group full-width">
                                        <label>{t('market_indices', 'Market Indices')}</label>
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
                                        <label>{t('credit_score', 'Credit Score')}</label>
                                        <input type="number" value={data.credit_score} onChange={e => setData('credit_score', e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                        <label>{t('rating_outlook', 'Rating Outlook')} *</label>
                                        <select value={data.rating_outlook} onChange={e => setData('rating_outlook', e.target.value)} required>
                                            <option value="positive">{t('positive', 'Positive')}</option>
                                            <option value="stable">{t('stable', 'Stable')}</option>
                                            <option value="negative">{t('negative', 'Negative')}</option>
                                            <option value="watch">{t('watch', 'Watch')}</option>
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
                                        <label>{t('description', 'Description')}</label>
                                        <textarea value={data.description} onChange={e => setData('description', e.target.value)} rows="3"></textarea>
                                    </div>
                                    <div className="form-group full-width">
                                         <label>{t('notes', 'Notes')}</label>
                                         <textarea value={data.notes} onChange={e => setData('notes', e.target.value)} rows="3"></textarea>
                                     </div>
                                 </div>
                             )}
                         </div>
                        </fieldset>

                        <div className="form-actions" style={{ padding: '1.5rem', borderTop: '1px solid #eee' }}>
                            <button type="button" className="btn btn-secondary" onClick={onBack} disabled={processing}>
                                {isView ? t('close', 'Close') : t('cancel', 'Cancel')}
                            </button>
                            {!isView && (
                                <button type="submit" className="btn btn-primary" disabled={processing}>
                                    {processing ? t('saving', 'Saving...') : (isEdit ? t('update', 'Update Company') : t('save', 'Save Company'))}
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

const ListedCompanies = ({ companies, stats, countries, currencies, industries, subIndustries, exchanges, marketIndices, creditRatings, states, cities, filters }) => {
    const { props } = usePage();
    if (typeof window !== 'undefined') window.debugTranslations = props.localization?.translations;
    console.log('Localization Props:', props.localization);
    console.log('Debug ListedCompanies Key:', props.localization?.debug_listed_companies);
    const translations = props.localization?.translations || {};
    console.log('Translation Keys starting with ListedCompanies:', Object.keys(translations).filter(k => k.startsWith('ListedCompanies')));
    const t = (key, fallback) => {
        const fullKey = `ListedCompanies.${key}`;
        if (translations[fullKey]) return translations[fullKey];
        console.warn(`Missing translation: ${fullKey}`);
        return fallback;
    };

    const [viewMode, setViewMode] = useState('list');
    const [selectedCompany, setSelectedCompany] = useState(null);
    const [showImport, setShowImport] = useState(false);
    const [importLoading, setImportLoading] = useState(false);
    const [importProgress, setImportProgress] = useState(0);

    const handleImport = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setImportLoading(true);
        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws);
                
                if (data.length === 0) {
                    alert('File is empty');
                    setImportLoading(false);
                    return;
                }

                // Simple bulk import logic using individual store calls (fallback if no bulk route)
                let successCount = 0;
                for (let i = 0; i < data.length; i++) {
                    const row = data[i];
                    // Map row fields to company fields here if needed
                    // For now, assume column names match model attributes
                    await new Promise((resolve) => {
                        router.post(route('admin.investing.companies.store'), row, {
                            onSuccess: () => {
                                successCount++;
                                setImportProgress(Math.round(((i + 1) / data.length) * 100));
                                resolve();
                            },
                            onError: () => resolve(), // Continue on error
                        });
                    });
                }
                
                alert(`Imported ${successCount} companies successfully.`);
                setShowImport(false);
                setImportLoading(false);
                setImportProgress(0);
                router.reload();
            } catch (err) {
                console.error(err);
                alert('Error processing file.');
                setImportLoading(false);
            }
        };
        reader.readAsBinaryString(file);
    };

    const handleCreate = () => {
        setSelectedCompany(null);
        setViewMode('create');
    };

    const handleEdit = (company) => {
        setSelectedCompany(company);
        setViewMode('edit');
    };

    const handleView = (company) => {
        setSelectedCompany(company);
        setViewMode('view');
    };

    const handleDelete = (id) => {
        if (confirm(t('delete_confirm_msg', 'Are you sure you want to delete this company?'))) {
            router.delete(route('admin.investing.companies.destroy', id), {
                preserveScroll: true,
            });
        }
    };

    return (
        <AdminLayout>
            <Head title={t('page_title', 'Listed Companies Management')} />
            <div className="listed-companies-container">
                <div className="page-header-title">
                    <h1>{t('page_title', 'Listed Companies Management')} - {t('test_key', 'FALLBACK')}</h1>
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
                        onView={handleView}
                        setShowImport={setShowImport}
                    />
                )}

                {(viewMode === 'create' || viewMode === 'edit' || viewMode === 'view') && (
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

                {showImport && (
                    <div className="modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000 }}>
                        <div className="modal-content" style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', maxWidth: '500px', width: '90%' }}>
                            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                                <h3 style={{ margin: 0 }}>{t('import_title', 'Import Companies')}</h3>
                                <button onClick={() => !importLoading && setShowImport(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5rem' }}>&times;</button>
                            </div>
                            <div className="modal-body">
                                <p>{t('import_instruction', 'Select an Excel file (.xlsx or .xls) containing company data.')}</p>
                                <input 
                                    type="file" 
                                    accept=".xlsx, .xls" 
                                    onChange={handleImport} 
                                    disabled={importLoading}
                                    style={{ marginTop: '1rem', width: '100%' }}
                                />
                                {importLoading && (
                                    <div style={{ marginTop: '1.5rem' }}>
                                        <div style={{ width: '100%', height: '8px', backgroundColor: '#eee', borderRadius: '4px', overflow: 'hidden' }}>
                                            <div style={{ width: `${importProgress}%`, height: '100%', backgroundColor: '#3b82f6', transition: 'width 0.3s' }}></div>
                                        </div>
                                        <p style={{ textAlign: 'center', marginTop: '0.5rem', fontSize: '0.875rem' }}>{importProgress}% {t('processing', 'Processing...')}</p>
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer" style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
                                <button className="btn btn-secondary" onClick={() => setShowImport(false)} disabled={importLoading}>
                                    {t('close', 'Close')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
};

export default ListedCompanies;
