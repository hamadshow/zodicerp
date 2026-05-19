import React, { useState, useEffect, useMemo } from 'react';
import { Head, router, usePage, Link } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import ActionsCell from '@/Components/ActionsCell';

const TaxType = ({ taxTypes = [], countries = [] }) => {
    const { props } = usePage();
    const { localization } = props;

    const getLocalizedRoute = (name, params = {}) => {
        return route(name, {
            country: localization?.country_code || 'sa',
            lang: localization?.current_locale || 'ar',
            ...params
        });
    };

    const [filteredTaxTypes, setFilteredTaxTypes] = useState(taxTypes);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentTaxType, setCurrentTaxType] = useState(null);
    const [stats, setStats] = useState({
        total: 0,
        active: 0,
        withholding: 0,
        recoverable: 0
    });

    useEffect(() => {
        setFilteredTaxTypes(taxTypes);
    }, [taxTypes]);

    useEffect(() => {
        updateStats();
        filterTaxTypes();
    }, [filteredTaxTypes, searchTerm]);

    const updateStats = () => {
        const total = filteredTaxTypes.length;
        const active = filteredTaxTypes.filter(t => t.is_active).length;
        const withholding = filteredTaxTypes.filter(t => t.is_withholding).length;
        const recoverable = filteredTaxTypes.filter(t => t.is_recoverable).length;

        setStats({ total, active, withholding, recoverable });
    };

    const filterTaxTypes = () => {
        if (!searchTerm) {
            setFilteredTaxTypes(taxTypes);
            return;
        }
        const lowerTerm = searchTerm.toLowerCase();
        const filtered = taxTypes.filter(t => 
            t.name_en.toLowerCase().includes(lowerTerm) ||
            t.name_ar.toLowerCase().includes(lowerTerm) ||
            t.code.toLowerCase().includes(lowerTerm)
        );
        setFilteredTaxTypes(filtered);
    };

    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
    };

    const query = useMemo(() => new URLSearchParams(window.location.search), [window.location.search]);
    const mode = query.get('mode');
    const taxTypeId = query.get('id');
    const isFormOpen = mode === 'create' || mode === 'edit' || mode === 'view';
    const isViewMode = mode === 'view';

    useEffect(() => {
        if ((mode === 'edit' || mode === 'view') && taxTypeId) {
            const taxType = taxTypes.find((t) => String(t.id) === String(taxTypeId));
            setCurrentTaxType(taxType || null);
            return;
        }
        if (mode === 'create') {
            setCurrentTaxType(null);
            return;
        }
        setCurrentTaxType(null);
    }, [mode, taxTypeId, taxTypes]);

    const openCreateForm = () => {
        router.visit(`${window.location.pathname}?mode=create`);
    };

    const openEditForm = (taxType) => {
        router.visit(`${window.location.pathname}?mode=edit&id=${taxType.id}`);
    };

    const openViewForm = (taxType) => {
        router.visit(`${window.location.pathname}?mode=view&id=${taxType.id}`);
    };

    const closeForm = () => {
        router.visit(window.location.pathname, { replace: true });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (isViewMode) {
            return;
        }
        const formData = new FormData(e.target);
        
        const data = {
            code: formData.get('code'),
            name_ar: formData.get('name_ar'),
            name_en: formData.get('name_en'),
            tax_category: formData.get('tax_category'),
            tax_level: formData.get('tax_level'),
            tax_system_code: formData.get('tax_system_code'),
            country_id: formData.get('country_id'),
            legal_reference: formData.get('legal_reference'),
            effective_date: formData.get('effective_date'),
            expiry_date: formData.get('expiry_date'),
            is_recoverable: formData.get('is_recoverable') === 'on',
            is_withholding: formData.get('is_withholding') === 'on',
            is_compound: formData.get('is_compound') === 'on',
            is_active: formData.get('is_active') === 'on',
        };

        if (currentTaxType) {
            router.put(getLocalizedRoute('admin.taxes.types.update', { type: currentTaxType.id }), data, {
                onSuccess: () => closeForm(),
            });
        } else {
            router.post(getLocalizedRoute('admin.taxes.types.store'), data, {
                onSuccess: () => closeForm(),
            });
        }
    };

    const handleDelete = (id) => {
        if (window.confirm('Are you sure you want to delete this Tax Type?')) {
            router.delete(getLocalizedRoute('admin.taxes.types.destroy', { type: id }));
        }
    };

    return (
        <AdminLayout activeMenu="Tax Types">
            <Head title="Tax Types - ZodicERP" />
            <div className="breadcrumb">
                <Link href={getLocalizedRoute('admin.dashboard')}>Dashboard</Link>
                <span>/</span>
                <a href="#">Tax & VAT</a>
                <span>/</span>
                <span>Tax Types</span>
            </div>

            {/* Quick Stats */}
            <div className="stats-cards">
                <div className="stat-card">
                    <div className="stat-icon" style={{ backgroundColor: 'var(--primary-color)' }}>
                        <span className="material-icons-outlined">category</span>
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.total}</div>
                        <div className="stat-label">Total Tax Types</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ backgroundColor: 'var(--success-color)' }}>
                        <span className="material-icons-outlined">check_circle</span>
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.active}</div>
                        <div className="stat-label">Active Types</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ backgroundColor: 'var(--info-color)' }}>
                        <span className="material-icons-outlined">remove_circle_outline</span>
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.withholding}</div>
                        <div className="stat-label">Withholding Taxes</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ backgroundColor: 'var(--warning-color)' }}>
                        <span className="material-icons-outlined">replay</span>
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.recoverable}</div>
                        <div className="stat-label">Recoverable Taxes</div>
                    </div>
                </div>
            </div>

            {isFormOpen ? (
                <div className="tax-types-card fade-in tax-types-form-page">
                    <div className="modal">
                        <div className="modal-header">
                            <div className="modal-title">
                                {isViewMode ? 'View Tax Type' : currentTaxType ? 'Edit Tax Type' : 'Add New Tax Type'}
                            </div>
                            <button className="modal-close" onClick={closeForm}>
                                <span className="material-icons-outlined">close</span>
                            </button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Code</label>
                                        <input
                                            type="text"
                                            name="code"
                                            className="form-control"
                                            defaultValue={currentTaxType?.code}
                                            placeholder="Tax Code"
                                            required
                                            disabled={isViewMode}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Country</label>
                                        <select
                                            name="country_id"
                                            className="form-control"
                                            defaultValue={currentTaxType?.country_id || ''}
                                            required
                                            disabled={isViewMode}
                                        >
                                            <option value="" disabled>Select Country</option>
                                            {countries.map(country => (
                                                <option key={country.id} value={country.id}>{country.name_en} ({country.name_ar})</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Name (EN)</label>
                                        <input
                                            type="text"
                                            name="name_en"
                                            className="form-control"
                                            defaultValue={currentTaxType?.name_en}
                                            placeholder="Name in English"
                                            required
                                            disabled={isViewMode}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Name (AR)</label>
                                        <input
                                            type="text"
                                            name="name_ar"
                                            className="form-control"
                                            defaultValue={currentTaxType?.name_ar}
                                            placeholder="Name in Arabic"
                                            required
                                            disabled={isViewMode}
                                            style={{ direction: 'rtl' }}
                                        />
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Category</label>
                                        <select
                                            name="tax_category"
                                            className="form-control"
                                            defaultValue={currentTaxType?.tax_category || ''}
                                            disabled={isViewMode}
                                        >
                                            <option value="">Select Category</option>
                                            <option value="sales">Sales</option>
                                            <option value="purchase">Purchase</option>
                                            <option value="income">Income</option>
                                            <option value="withholding">Withholding</option>
                                            <option value="excise">Excise</option>
                                            <option value="customs">Customs</option>
                                            <option value="property">Property</option>
                                            <option value="other">Other</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Tax Level</label>
                                        <select
                                            name="tax_level"
                                            className="form-control"
                                            defaultValue={currentTaxType?.tax_level || ''}
                                            disabled={isViewMode}
                                            required
                                        >
                                            <option value="">Select Level</option>
                                            <option value="federal">Federal</option>
                                            <option value="state">State</option>
                                            <option value="provincial">Provincial</option>
                                            <option value="county">County</option>
                                            <option value="city">City</option>
                                            <option value="municipal">Municipal</option>
                                            <option value="special">Special</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">System Code</label>
                                        <input
                                            type="text"
                                            name="tax_system_code"
                                            className="form-control"
                                            defaultValue={currentTaxType?.tax_system_code}
                                            placeholder="External System Code"
                                            disabled={isViewMode}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Legal Reference</label>
                                        <input
                                            type="text"
                                            name="legal_reference"
                                            className="form-control"
                                            defaultValue={currentTaxType?.legal_reference}
                                            placeholder="Legal Ref / Law No."
                                            disabled={isViewMode}
                                        />
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Effective Date</label>
                                        <input
                                            type="date"
                                            name="effective_date"
                                            className="form-control"
                                            defaultValue={currentTaxType?.effective_date ? currentTaxType.effective_date.split('T')[0] : ''}
                                            required
                                            disabled={isViewMode}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Expiry Date</label>
                                        <input
                                            type="date"
                                            name="expiry_date"
                                            className="form-control"
                                            defaultValue={currentTaxType?.expiry_date ? currentTaxType.expiry_date.split('T')[0] : ''}
                                            disabled={isViewMode}
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Options</label>
                                    <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                                        <div className="checkbox-group">
                                            <input
                                                type="checkbox"
                                                id="is_active"
                                                name="is_active"
                                                defaultChecked={currentTaxType ? currentTaxType.is_active : true}
                                                disabled={isViewMode}
                                            />
                                            <label htmlFor="is_active">Active</label>
                                        </div>
                                        <div className="checkbox-group">
                                            <input
                                                type="checkbox"
                                                id="is_recoverable"
                                                name="is_recoverable"
                                                defaultChecked={currentTaxType?.is_recoverable}
                                                disabled={isViewMode}
                                            />
                                            <label htmlFor="is_recoverable">Recoverable</label>
                                        </div>
                                        <div className="checkbox-group">
                                            <input
                                                type="checkbox"
                                                id="is_withholding"
                                                name="is_withholding"
                                                defaultChecked={currentTaxType?.is_withholding}
                                                disabled={isViewMode}
                                            />
                                            <label htmlFor="is_withholding">Withholding</label>
                                        </div>
                                        <div className="checkbox-group">
                                            <input
                                                type="checkbox"
                                                id="is_compound"
                                                name="is_compound"
                                                defaultChecked={currentTaxType?.is_compound}
                                                disabled={isViewMode}
                                            />
                                            <label htmlFor="is_compound">Compound</label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-outline" onClick={closeForm}>
                                    {isViewMode ? 'Close' : 'Cancel'}
                                </button>
                                {!isViewMode && (
                                    <button type="submit" className="btn btn-primary">
                                        {currentTaxType ? 'Update Tax Type' : 'Create Tax Type'}
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>
            ) : (
                <div className="tax-types-card fade-in">
                    <div className="card-header">
                        <div className="tax-types-actions">
                            <div className="search-box">
                                <span className="material-icons-outlined">search</span>
                                <input
                                    type="text"
                                    placeholder="Search tax types..."
                                    value={searchTerm}
                                    onChange={handleSearch}
                                />
                            </div>
                        </div>
                        <button className="btn btn-primary" onClick={openCreateForm}>
                            <span className="material-icons-outlined">add</span>
                            Add Tax Type
                        </button>
                    </div>

                    <div className="table-responsive">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Code</th>
                                    <th>Name (EN)</th>
                                    <th>Name (AR)</th>
                                    <th>Country</th>
                                    <th>Category</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTaxTypes.length > 0 ? (
                                    filteredTaxTypes.map(taxType => (
                                        <tr key={taxType.id}>
                                            <td><span className="tax-code">{taxType.code}</span></td>
                                            <td className="font-medium">{taxType.name_en}</td>
                                            <td className="text-right">{taxType.name_ar}</td>
                                            <td>{taxType.country?.name_en}</td>
                                            <td>{taxType.tax_category}</td>
                                            <td>
                                                <span className={`tax-status ${taxType.is_active ? 'status-active' : 'status-inactive'}`}>
                                                    {taxType.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td>
    <ActionsCell 
        onView={() => openViewForm(taxType)}
        onEdit={() => openEditForm(taxType)}
        onDelete={() => handleDelete(taxType.id)}
        viewTitle="View"
        editTitle="Edit"
        deleteTitle="Delete"
    />
</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="7" className="text-center py-8 text-gray-500">
                                            No tax types found
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
};

export default TaxType;
