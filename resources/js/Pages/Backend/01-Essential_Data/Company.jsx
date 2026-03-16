import React, { useMemo, useState, useEffect } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import axios from 'axios';
import AdminLayout from '../components/AdminLayout';
import MediaPickerModal from '../Media/MediaPickerModal';
import '../../../../css/backend/main.scss';


const resolveMediaUrl = (value) => {
    if (!value) {
        return null;
    }
    if (typeof value === 'string' && /^https?:\/\//i.test(value)) {
        return value;
    }

    const withoutProtocol =
        typeof value === 'string' ? value.replace(/^https?:\/\/[^/]+/, '') : '';

    const relativePath = withoutProtocol.replace(
        /^\/?(files|storage|media-files)\//,
        ''
    );

    return `/media-files/${relativePath}`;
};

const CompanyForm = ({ company }) => {
    const isEdit = !!company;
    const [activeTab, setActiveTab] = useState('basic');

    const [logoPreview, setLogoPreview] = useState(
        company?.logo ? resolveMediaUrl(company.logo) : null,
    );
    const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
    
    // State for dependent dropdowns
    const [countries, setCountries] = useState([]);
    const [cities, setCities] = useState([]);
    const [areas, setAreas] = useState([]);

    // Client-side validation errors
    const [localErrors, setLocalErrors] = useState({});

    const { data, setData, post, processing, errors, clearErrors } = useForm({
        company_name: company?.company_name || '',
        company_code: company?.company_code || '',
        english_name: company?.english_name || '',
        company_type: company?.company_type || '',
        job_title: company?.job_title || '',
        mobile: company?.mobile || '',
        country: company?.country || '',
        city: company?.city || '',
        area: company?.area || '',
        address: company?.address || '',
        logo: null,
        logo_path: company?.logo || '',
        
        accountant_name: company?.accountant_name || '',
        commercial_registration: company?.commercial_registration || '',
        tax_number: company?.tax_number || '',
        vat_number: company?.vat_number || '',
        date_of_establishment: company?.date_of_establishment || '',
        social_insurance_number: company?.social_insurance_number || '',
        annual_goals: company?.annual_goals || '',
        storage: company?.storage || '',
        work_center: company?.work_center || '',
        subsidiary_company: company?.subsidiary_company || '',
        
        email_address: company?.email_address || '',
        official_email: company?.official_email || '',
        facebook: company?.facebook || '',
        telegram: company?.telegram || '',
        youtube: company?.youtube || '',
        instagram: company?.instagram || '',
        
        account_holder_name: company?.account_holder_name || '',
        bank_name: company?.bank_name || '',
        iban: company?.iban || '',
        branch_name: company?.branch_name || '',
        swift_bic: company?.swift_bic || '',
        bank_address: company?.bank_address || '',
    });

    // Fetch Countries on Mount
    useEffect(() => {
        axios.get('/api/countries')
            .then(response => {
                setCountries(response.data);
            })
            .catch(error => console.error("Error fetching countries:", error));
    }, []);

    // Fetch Cities when Country changes
    useEffect(() => {
        if (data.country) {
            axios.get(`/api/cities?country_id=${data.country}`)
                .then(response => {
                    setCities(response.data);
                })
                .catch(error => console.error("Error fetching cities:", error));
        } else {
            setCities([]);
        }
    }, [data.country]);

    // Fetch Areas when City changes
    useEffect(() => {
        if (data.city) {
            axios.get(`/api/areas?city_id=${data.city}`)
                .then(response => {
                    setAreas(response.data);
                })
                .catch(error => console.error("Error fetching areas:", error));
        } else {
            setAreas([]);
        }
    }, [data.city]);

    const handleLogoMediaSelect = (selected) => {
        if (!selected) {
            return;
        }

        const processPath = (path) => {
            if (!path) {
                return '';
            }
            const withoutProtocol =
                typeof path === 'string'
                    ? path.replace(/^https?:\/\/[^/]+/, '')
                    : '';

            return withoutProtocol.replace(
                /^\/?(files|storage|media-files)\//,
                ''
            );
        };

        const relativePath = processPath(selected.file_path);

        setData((prev) => ({
            ...prev,
            logo_path: relativePath,
        }));

        setLogoPreview(resolveMediaUrl(relativePath));
        setIsMediaPickerOpen(false);
    };

    const validateField = (name, value) => {
        let error = null;
        if (name === 'company_name' && !value.trim()) {
            error = "This field is required";
        }
        if ((name === 'email_address' || name === 'official_email') && value) {
             const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
             if (!emailRegex.test(value)) {
                 error = "Please enter a valid email address";
             }
        }
        
        setLocalErrors(prev => ({ ...prev, [name]: error }));
        return error;
    };

    const validateForm = () => {
        const newErrors = {};
        
        // Required fields
        if (!data.company_name.trim()) newErrors.company_name = "This field is required";
        
        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (data.email_address && !emailRegex.test(data.email_address)) {
            newErrors.email_address = "Please enter a valid email address";
        }
        if (data.official_email && !emailRegex.test(data.official_email)) {
            newErrors.official_email = "Please enter a valid email address";
        }

        setLocalErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const submitForm = (e) => {
        e.preventDefault();
        
        clearErrors();

        if (!validateForm()) {
            // Re-calculate for focus logic since state update is async
            const currentErrors = {};
            if (!data.company_name.trim()) currentErrors.company_name = true;
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (data.email_address && !emailRegex.test(data.email_address)) currentErrors.email_address = true;
            if (data.official_email && !emailRegex.test(data.official_email)) currentErrors.official_email = true;
            
            const firstKey = Object.keys(currentErrors)[0];
            if (firstKey) {
                // Switch tab if necessary
                if (['company_name'].includes(firstKey)) setActiveTab('basic');
                if (['email_address', 'official_email'].includes(firstKey)) setActiveTab('contact');
                
                // Use setTimeout to allow tab switch render to complete if needed
                setTimeout(() => {
                    const element = document.getElementById(firstKey);
                    if (element) {
                        element.focus();
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }, 100);
            }
            return;
        }

        if (isEdit) {
            router.post(route('admin.companies.update', company.id), {
                ...data,
                _method: 'put',
            });
        } else {
            post(route('admin.companies.store'));
        }
    };

    // Helper to render input fields with validation
    const renderInput = (label, name, type = 'text', placeholder = '') => (
        <div className="form-row">
            <label className="form-label" htmlFor={name}>{label}</label>
            <input
                type={type}
                id={name}
                name={name}
                className={`form-input ${errors[name] || localErrors[name] ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                value={data[name]}
                onChange={e => {
                    setData(name, e.target.value);
                    if (localErrors[name]) setLocalErrors(prev => ({ ...prev, [name]: null }));
                }}
                onBlur={() => validateField(name, data[name])}
                placeholder={placeholder}
                aria-describedby={`${name}-error`}
                aria-invalid={!!(errors[name] || localErrors[name])}
            />
            {(errors[name] || localErrors[name]) && (
                <div id={`${name}-error`} className="text-red-500 text-sm mt-1" role="alert">
                    {errors[name] || localErrors[name]}
                </div>
            )}
        </div>
    );

    // Helper for Textarea
     const renderTextarea = (label, name, placeholder = '') => (
        <div className="form-row">
            <label className="form-label" htmlFor={name}>{label}</label>
            <textarea
                id={name}
                name={name}
                className={`form-textarea ${errors[name] || localErrors[name] ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                value={data[name]}
                onChange={e => {
                    setData(name, e.target.value);
                    if (localErrors[name]) setLocalErrors(prev => ({ ...prev, [name]: null }));
                }}
                onBlur={() => validateField(name, data[name])}
                placeholder={placeholder}
                aria-describedby={`${name}-error`}
                aria-invalid={!!(errors[name] || localErrors[name])}
            ></textarea>
            {(errors[name] || localErrors[name]) && (
                <div id={`${name}-error`} className="text-red-500 text-sm mt-1" role="alert">
                    {errors[name] || localErrors[name]}
                </div>
            )}
        </div>
    );

    return (
        <AdminLayout activeMenu="Companies">
            <Head title={isEdit ? "Edit Company" : "Add Company"} />
            <div className="Essential-Data-Container">
                <div className="tasks-card">
                    <div className="card-header">
                        <h1 className="text-2xl font-bold text-gray-800">
                            {isEdit ? 'Edit Company Information' : 'Add Company Information'}
                        </h1>
                        <div className="tasks-actions">
                            <Link
                                href={route('admin.companies.index')}
                                className="btn btn-outline no-underline"
                            >
                                <span className="material-icons-outlined">arrow_back</span>
                                <span>Back to List</span>
                            </Link>
                        </div>
                    </div>

                    <div className="tabs">
                        {['basic', 'government', 'contact', 'financial'].map((tab) => (
                            <div
                                key={tab}
                                className={`tab ${activeTab === tab ? 'active' : ''}`}
                                onClick={() => setActiveTab(tab)}
                            >
                                {tab.charAt(0).toUpperCase() + tab.slice(1)} Information
                            </div>
                        ))}
                    </div>

                    <form onSubmit={submitForm} noValidate>
                        <div className={`tab-content ${activeTab === 'basic' ? 'active' : ''}`}>
                            <div className="form-columns">
                                <div className="form-column">
                                    <div className="form-row">
                                        <label className="form-label" htmlFor="company_code">Company Code:</label>
                                        <input
                                            type="text"
                                            id="company_code"
                                            name="company_code"
                                            className="form-input bg-gray-100 cursor-not-allowed"
                                            value={data.company_code}
                                            readOnly
                                            disabled
                                            placeholder={isEdit ? "Company Code" : "Auto-generated"}
                                            aria-describedby="company_code-error"
                                        />
                                    </div>
                                    {renderInput("Company Name:", "company_name", "text", "Enter company name")}
                                    {renderInput("English Name:", "english_name", "text", "Enter English name")}
                                    <div className="form-row">
                                        <label className="form-label" htmlFor="company_type">Company Type:</label>
                                        <select
                                            className="form-select"
                                            id="company_type"
                                            name="company_type"
                                            value={data.company_type}
                                            onChange={e => setData('company_type', e.target.value)}
                                            aria-describedby="company_type-error"
                                        >
                                            <option value="">Select company type</option>
                                            <option value="llc">Limited Liability Company (LLC)</option>
                                            <option value="corporation">Corporation</option>
                                            <option value="partnership">Partnership</option>
                                            <option value="sole">Sole Proprietorship</option>
                                        </select>
                                    </div>
                                    {renderInput("Job Title:", "job_title", "text", "Enter job title")}
                                    {renderInput("Mobile:", "mobile", "tel", "Enter mobile number")}
                                </div>

                                <div className="form-column">
                                    <div className="form-row">
                                        <label className="form-label" htmlFor="country">Country:</label>
                                        <select
                                            className="form-select"
                                            id="country"
                                            name="country"
                                            value={data.country}
                                            onChange={e => {
                                                setData(prev => ({ ...prev, country: e.target.value, city: '', area: '' }));
                                            }}
                                            aria-describedby="country-error"
                                        >
                                            <option value="">Select country</option>
                                            {countries.map(country => (
                                                <option key={country.id} value={country.id}>
                                                    {country.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-row">
                                        <label className="form-label" htmlFor="city">City:</label>
                                        <select
                                            className="form-select"
                                            id="city"
                                            name="city"
                                            value={data.city}
                                            onChange={e => {
                                                setData(prev => ({ ...prev, city: e.target.value, area: '' }));
                                            }}
                                            disabled={!data.country}
                                            aria-describedby="city-error"
                                        >
                                            <option value="">Select city</option>
                                            {cities.map(city => (
                                                <option key={city.id} value={city.id}>
                                                    {city.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-row">
                                        <label className="form-label" htmlFor="area">Area:</label>
                                        <select
                                            className="form-select"
                                            id="area"
                                            name="area"
                                            value={data.area}
                                            onChange={e => setData('area', e.target.value)}
                                            disabled={!data.city}
                                            aria-describedby="area-error"
                                        >
                                            <option value="">Select area</option>
                                            {areas.map(area => (
                                                <option key={area.id} value={area.id}>
                                                    {area.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    {renderTextarea("Address:", "address", "Enter full address")}
                                </div>

                                <div
                                    className="logo-container"
                                    onClick={() => setIsMediaPickerOpen(true)}
                                >
                                    {logoPreview ? (
                                        <img
                                            src={logoPreview}
                                            alt="Logo Preview"
                                            className="logo-preview"
                                        />
                                    ) : (
                                        <div className="logo-placeholder">
                                            <span
                                                className="material-icons-outlined"
                                                style={{
                                                    fontSize: '48px',
                                                    color: '#94a3b8',
                                                }}
                                            >
                                                add_photo_alternate
                                            </span>
                                            <div>Company Logo</div>
                                            <div
                                                style={{
                                                    fontSize: '0.8rem',
                                                    marginTop: '5px',
                                                }}
                                            >
                                                Click to choose from media
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className={`tab-content ${activeTab === 'government' ? 'active' : ''}`}>
                            <div className="form-columns">
                                <div className="form-column">
                                    {renderInput("Accountant Name:", "accountant_name", "text", "Enter accountant name")}
                                    {renderInput("Commercial Registration:", "commercial_registration", "text", "Enter CR number")}
                                    {renderInput("Tax Number:", "tax_number", "text", "Enter tax number")}
                                    {renderInput("VAT Number:", "vat_number", "text", "Enter VAT number")}
                                    {renderInput("Date of Establishment:", "date_of_establishment", "date")}
                                </div>
                                <div className="form-column">
                                    {renderInput("Social Insurance Number:", "social_insurance_number", "text", "Enter insurance number")}
                                    {renderInput("Annual Goals:", "annual_goals", "text", "Enter annual goals")}
                                    {renderInput("Storage:", "storage", "text", "Enter storage details")}
                                    {renderInput("Work Center:", "work_center", "text", "Enter work center")}
                                    {renderInput("Subsidiary Company:", "subsidiary_company", "text", "Enter subsidiary details")}
                                </div>
                            </div>
                        </div>

                        <div className={`tab-content ${activeTab === 'contact' ? 'active' : ''}`}>
                            <div className="form-columns">
                                <div className="form-column">
                                    {renderInput("Email Address:", "email_address", "email", "Enter email address")}
                                    {renderInput("Official Email:", "official_email", "email", "Enter official email")}
                                    {renderInput("Facebook:", "facebook", "url", "Enter Facebook URL")}
                                </div>
                                <div className="form-column">
                                    {renderInput("Telegram:", "telegram", "text", "Enter Telegram handle/URL")}
                                    {renderInput("YouTube:", "youtube", "url", "Enter YouTube channel URL")}
                                    {renderInput("Instagram:", "instagram", "text", "Enter Instagram handle/URL")}
                                </div>
                            </div>
                        </div>

                        <div className={`tab-content ${activeTab === 'financial' ? 'active' : ''}`}>
                            <div className="form-columns">
                                <div className="form-column">
                                    {renderInput("Account Holder Name:", "account_holder_name", "text", "Enter account holder name")}
                                    {renderInput("Bank Name:", "bank_name", "text", "Enter bank name")}
                                    {renderInput("IBAN:", "iban", "text", "Enter IBAN")}
                                </div>
                                <div className="form-column">
                                    {renderInput("Branch Name:", "branch_name", "text", "Enter branch name")}
                                    {renderInput("SWIFT/BIC:", "swift_bic", "text", "Enter SWIFT/BIC code")}
                                    {renderTextarea("Bank Address:", "bank_address", "Enter bank address")}
                                </div>
                            </div>
                        </div>

                        <div className="form-actions">
                            <button
                                type="button"
                                className="btn btn-outline"
                                onClick={() => router.visit(route('admin.companies.index'))}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={processing}
                            >
                                {processing ? (
                                    <>
                                        <span className="material-icons-outlined spin">sync</span>
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <span className="material-icons-outlined">save</span>
                                        {isEdit ? 'Update Company' : 'Save Company'}
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <MediaPickerModal
                isOpen={isMediaPickerOpen}
                onClose={() => setIsMediaPickerOpen(false)}
                onSelect={handleLogoMediaSelect}
                allowedTypes={['image']}
            />
        </AdminLayout>
    );
};

const Company = ({ companies, company, canCreateCompany }) => {
    if (company || route().current('admin.companies.create') || route().current('admin.companies.edit')) {
        return <CompanyForm company={company} />;
    }
    const [searchTerm, setSearchTerm] = useState('');

    const handleDelete = (id) => {
        if (confirm('Are you sure you want to delete this company?')) {
            router.delete(route('admin.companies.destroy', id));
        }
    };

    const stats = useMemo(() => {
        const totalCompanies = companies.length;
        const countriesSet = new Set();
        let withLogo = 0;
        let withContact = 0;

        companies.forEach((company) => {
            const countryName = company.country_data?.name || company.country;
            if (countryName) {
                countriesSet.add(countryName);
            }
            if (company.logo) {
                withLogo += 1;
            }
            if (company.email_address || company.official_email) {
                withContact += 1;
            }
        });

        return {
            totalCompanies,
            totalCountries: countriesSet.size,
            withLogo,
            withContact,
        };
    }, [companies]);

    const filteredCompanies = useMemo(() => {
        if (!searchTerm.trim()) {
            return companies;
        }

        const term = searchTerm.toLowerCase();

        return companies.filter((company) => {
            const name = company.company_name || '';
            const code = company.company_code || '';
            const type = company.company_type || '';
            const countryName = company.country_data?.name || company.country || '';

            return (
                name.toLowerCase().includes(term) ||
                String(code).toLowerCase().includes(term) ||
                type.toLowerCase().includes(term) ||
                String(countryName).toLowerCase().includes(term)
            );
        });
    }, [companies, searchTerm]);

    return (
        <AdminLayout activeMenu="Companies">
            <Head title="Company Information" />
            <div className="Essential-Data-Container">
                <div className="page-header">
                    <h1 className="text-2xl font-bold text-gray-800">Company Information</h1>
                </div>

                <div className="stats-cards">
                    <div className="stat-card">
                        <div
                            className="stat-icon"
                            style={{ backgroundColor: 'var(--primary-color)' }}
                        >
                            <span className="material-icons-outlined">apartment</span>
                        </div>
                        <div className="stat-content">
                            <div className="stat-value">{stats.totalCompanies}</div>
                            <div className="stat-label">Total Companies</div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div
                            className="stat-icon"
                            style={{ backgroundColor: 'var(--success-color)' }}
                        >
                            <span className="material-icons-outlined">public</span>
                        </div>
                        <div className="stat-content">
                            <div className="stat-value">{stats.totalCountries}</div>
                            <div className="stat-label">Countries</div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div
                            className="stat-icon"
                            style={{ backgroundColor: 'var(--info-color)' }}
                        >
                            <span className="material-icons-outlined">image</span>
                        </div>
                        <div className="stat-content">
                            <div className="stat-value">{stats.withLogo}</div>
                            <div className="stat-label">With Logo</div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div
                            className="stat-icon"
                            style={{ backgroundColor: 'var(--warning-color)' }}
                        >
                            <span className="material-icons-outlined">mark_email_read</span>
                        </div>
                        <div className="stat-content">
                            <div className="stat-value">{stats.withContact}</div>
                            <div className="stat-label">With Contact Email</div>
                        </div>
                    </div>
                </div>

                <div className="tasks-card">
                    <div className="card-header">
                        <div className="tasks-actions">
                            <div className="search-bar light">
                                <input
                                    type="text"
                                    placeholder="Search companies..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                <button type="button">
                                    <span className="material-icons-outlined">search</span>
                                </button>
                            </div>
                        </div>
                        <div className="tasks-actions">
                            {canCreateCompany ? (
                                <Link
                                    href={route('admin.companies.create')}
                                    className="btn btn-primary no-underline"
                                >
                                    <span className="material-icons-outlined">add_business</span>
                                    <span>Add Company</span>
                                </Link>
                            ) : null}
                        </div>
                    </div>

                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>COMPANY NAME</th>
                                    <th>CODE</th>
                                    <th>TYPE</th>
                                    <th>COUNTRY</th>
                                    <th>ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredCompanies.length > 0 ? (
                                    filteredCompanies.map((company) => (
                                        <tr key={company.id}>
                                            <td>#{company.id}</td>
                                            <td>{company.company_name}</td>
                                            <td>{company.company_code || '-'}</td>
                                            <td className="capitalize">{company.company_type || '-'}</td>
                                            <td className="uppercase">
                                                {company.country_data?.name || company.country || '-'}
                                            </td>
                                            <td>
                                                <button
                                                    type="button"
                                                    className="icon-btn edit"
                                                    title="Edit"
                                                    onClick={() =>
                                                        router.get(
                                                            route('admin.companies.edit', company.id)
                                                        )
                                                    }
                                                >
                                                    <span className="material-icons-outlined">edit</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    className="icon-btn delete"
                                                    title="Delete"
                                                    onClick={() => handleDelete(company.id)}
                                                >
                                                    <span className="material-icons-outlined">delete</span>
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="text-center text-gray-500 py-6">
                                            No company information found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="pagination">
                        <div className="pagination-info">
                            <span>
                                Showing{' '}
                                <strong>{filteredCompanies.length}</strong> of{' '}
                                <strong>{companies.length}</strong> companies
                            </span>
                        </div>
                        <div className="pagination-controls">
                            <button className="page-btn active" disabled>
                                1
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
};

export { CompanyForm, Company };
export default Company;
