import React, { useState, useEffect, useMemo } from 'react';
import { Head, router, usePage, Link } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import '../../../../css/backend/InvestingStack/ListedCompanies.scss';
import { debounce } from 'lodash';

const ViewSection = ({ companies, filters, onEdit, onCreate, onDelete }) => {
    const [searchTerm, setSearchTerm] = useState(filters.search || '');

    const handleSearch = useMemo(
        () => debounce((value) => {
            router.get(
                route('admin.investing-stack.listed-companies.index'),
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
        const total = companies.total;
        const currentData = companies.data || [];
        const active = currentData.filter(c => c.status === 'active').length;
        const inactive = currentData.length - active; 
        return { total, active, inactive };
    }, [companies]);

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
            </div>

            <div className="content-card">
                <div className="page-header" style={{ marginBottom: '1.5rem' }}>
                    <div className="search-box">
                        <span className="material-icons-outlined search-icon">search</span>
                        <input
                            type="text"
                            placeholder="Search companies..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
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
                                    <td colSpan="8" style={{ textAlign: 'center', padding: '2rem' }}>
                                        No listed companies found.
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

const FormSection = ({ mode, initialData, countries, currencies, onBack, onSubmit }) => {
    const isEdit = mode === 'edit';
    const { errors } = usePage().props;
    
    const handleSubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = {
            company_code: formData.get('company_code'),
            legal_name_ar: formData.get('legal_name_ar'),
            legal_name_en: formData.get('legal_name_en'),
            ticker_symbol: formData.get('ticker_symbol'),
            isin_code: formData.get('isin_code'),
            country_id: formData.get('country_id'),
            reporting_currency_id: formData.get('reporting_currency_id'),
            description: formData.get('description'),
            status: formData.get('status'),
        };
        onSubmit(data);
    };

    return (
        <div className="animate-fade-slide">
            <div className="content-card">
                <div className="form-container">
                    <div className="form-section-title">
                        {isEdit ? 'Edit Listed Company' : 'Create New Listed Company'}
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Company Code</label>
                                <input
                                    type="text"
                                    name="company_code"
                                    defaultValue={initialData?.company_code}
                                    placeholder="Auto-generated (e.g., CMP-001)"
                                    readOnly={isEdit}
                                    style={isEdit ? { backgroundColor: '#f3f4f6' } : {}}
                                />
                                {errors.company_code && <div className="error-message">{errors.company_code}</div>}
                            </div>

                            <div className="form-group">
                                <label>Legal Name (AR) *</label>
                                <input
                                    type="text"
                                    name="legal_name_ar"
                                    defaultValue={initialData?.legal_name_ar}
                                    placeholder="Company Name in Arabic"
                                    required
                                />
                                {errors.legal_name_ar && <div className="error-message">{errors.legal_name_ar}</div>}
                            </div>

                            <div className="form-group">
                                <label>Legal Name (EN)</label>
                                <input
                                    type="text"
                                    name="legal_name_en"
                                    defaultValue={initialData?.legal_name_en}
                                    placeholder="Company Name in English"
                                />
                                {errors.legal_name_en && <div className="error-message">{errors.legal_name_en}</div>}
                            </div>

                            <div className="form-group">
                                <label>Ticker Symbol</label>
                                <input
                                    type="text"
                                    name="ticker_symbol"
                                    defaultValue={initialData?.ticker_symbol}
                                    placeholder="e.g., AAPL, 2222.SR"
                                />
                                {errors.ticker_symbol && <div className="error-message">{errors.ticker_symbol}</div>}
                            </div>

                            <div className="form-group">
                                <label>ISIN Code</label>
                                <input
                                    type="text"
                                    name="isin_code"
                                    defaultValue={initialData?.isin_code}
                                    placeholder="International Securities Identification Number"
                                />
                                {errors.isin_code && <div className="error-message">{errors.isin_code}</div>}
                            </div>

                            <div className="form-group">
                                <label>Country *</label>
                                <select
                                    name="country_id"
                                    defaultValue={initialData?.country_id || ''}
                                    required
                                >
                                    <option value="">Select Country</option>
                                    {countries.map(country => (
                                        <option key={country.id} value={country.id}>
                                            {country.name} ({country.code})
                                        </option>
                                    ))}
                                </select>
                                {errors.country_id && <div className="error-message">{errors.country_id}</div>}
                            </div>

                            <div className="form-group">
                                <label>Reporting Currency</label>
                                <select
                                    name="reporting_currency_id"
                                    defaultValue={initialData?.reporting_currency_id || ''}
                                >
                                    <option value="">Select Currency</option>
                                    {currencies.map(currency => (
                                        <option key={currency.id} value={currency.id}>
                                            {currency.code} - {currency.name}
                                        </option>
                                    ))}
                                </select>
                                {errors.reporting_currency_id && <div className="error-message">{errors.reporting_currency_id}</div>}
                            </div>
                            
                             <div className="form-group full-width">
                                <label>Description</label>
                                <textarea
                                    name="description"
                                    defaultValue={initialData?.description}
                                    rows="3"
                                    placeholder="Brief description of the company..."
                                ></textarea>
                                {errors.description && <div className="error-message">{errors.description}</div>}
                            </div>

                            <div className="form-group">
                                <label>Status</label>
                                <select
                                    name="status"
                                    defaultValue={initialData?.status || 'active'}
                                >
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                    <option value="suspended">Suspended</option>
                                    <option value="bankrupt">Bankrupt</option>
                                    <option value="dissolved">Dissolved</option>
                                </select>
                            </div>
                        </div>

                        <div className="form-actions">
                            <button type="button" className="btn btn-secondary" onClick={onBack}>
                                Cancel
                            </button>
                            <button type="submit" className="btn btn-primary">
                                {isEdit ? 'Update Company' : 'Create Company'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

const ListedCompanies = ({ companies, countries, currencies, filters }) => {
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
            router.delete(route('admin.investing-stack.listed-companies.destroy', id), {
                preserveScroll: true,
                onSuccess: () => {
                }
            });
        }
    };

    const handleSubmit = (data) => {
        if (viewMode === 'edit') {
            router.put(route('admin.investing-stack.listed-companies.update', selectedCompany.id), data, {
                onSuccess: () => setViewMode('list'),
            });
        } else {
            router.post(route('admin.investing-stack.listed-companies.store'), data, {
                onSuccess: () => setViewMode('list'),
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
                        onBack={() => setViewMode('list')}
                        onSubmit={handleSubmit}
                    />
                )}
            </div>
        </AdminLayout>
    );
};

export default ListedCompanies;
