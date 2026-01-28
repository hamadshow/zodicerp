import React, { useState, useEffect, useMemo } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout'; // Adjusted import path based on likely location
import '../../../../css/backend/InvestingStack/ListedCompanies.scss';

// --- View Section Component ---
const ViewSection = ({ companies, onEdit, onCreate, onDelete }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredCompanies, setFilteredCompanies] = useState(companies);

    // Update stats
    const stats = useMemo(() => {
        const total = filteredCompanies.length;
        const active = filteredCompanies.filter(c => c.is_active).length;
        const inactive = total - active;
        return { total, active, inactive };
    }, [filteredCompanies]);

    useEffect(() => {
        if (!searchTerm) {
            setFilteredCompanies(companies);
        } else {
            const lowerTerm = searchTerm.toLowerCase();
            setFilteredCompanies(companies.filter(c => 
                c.legal_name_ar.toLowerCase().includes(lowerTerm) ||
                (c.legal_name_en && c.legal_name_en.toLowerCase().includes(lowerTerm)) ||
                (c.company_code && c.company_code.toLowerCase().includes(lowerTerm)) ||
                (c.ticker_symbol && c.ticker_symbol.toLowerCase().includes(lowerTerm))
            ));
        }
    }, [searchTerm, companies]);

    return (
        <div className="animate-fade-slide">
            {/* Quick Stats */}
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
                    <div className="stat-icon gray">
                        <span className="material-icons-outlined">cancel</span>
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">{stats.inactive}</span>
                        <span className="stat-label">Inactive Companies</span>
                    </div>
                </div>
            </div>

            {/* Content Card */}
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
                            {filteredCompanies.length > 0 ? (
                                filteredCompanies.map(company => (
                                    <tr key={company.id}>
                                        <td>{company.company_code}</td>
                                        <td>{company.legal_name_ar}</td>
                                        <td>{company.legal_name_en || '-'}</td>
                                        <td>{company.ticker_symbol || '-'}</td>
                                        <td>{company.country?.name_ar || company.country?.name_en || '-'}</td>
                                        <td>{company.reporting_currency?.code || '-'}</td>
                                        <td>
                                            <span className={`status-badge ${company.is_active ? 'active' : 'inactive'}`}>
                                                {company.is_active ? 'Active' : 'Inactive'}
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
            </div>
        </div>
    );
};

// --- Form Section Component (Used for Create & Edit) ---
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
            is_active: formData.get('is_active') === '1',
            // Add other fields as needed based on the model
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
                                    readOnly={isEdit} // Allow editing only on create if manual entry is needed, or keep readOnly if auto-generated
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

                            <div className="form-group checkbox-group">
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        name="is_active"
                                        value="1"
                                        defaultChecked={initialData ? initialData.is_active : true}
                                    />
                                    Active Status
                                </label>
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

// --- Main Page Component ---
const ListedCompanies = ({ companies, countries, currencies }) => {
    const [viewMode, setViewMode] = useState('list'); // 'list', 'create', 'edit'
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
            router.delete(route('listed-companies.destroy', id), {
                preserveScroll: true,
                onSuccess: () => {
                    // Success notification handled by flash message in layout
                }
            });
        }
    };

    const handleSubmit = (data) => {
        if (viewMode === 'edit') {
            router.put(route('listed-companies.update', selectedCompany.id), data, {
                onSuccess: () => setViewMode('list'),
            });
        } else {
            router.post(route('listed-companies.store'), data, {
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
