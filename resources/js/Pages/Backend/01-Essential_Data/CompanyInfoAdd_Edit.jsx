import React, { useState, useEffect } from 'react';
import { Head, useForm, Link, router } from '@inertiajs/react';
import axios from 'axios';
import AdminLayout from '../components/AdminLayout';
import '../../../../css/backend/CompanyInfo.css';

const CompanyInfoAdd_Edit = ({ company }) => {
    const isEdit = !!company;
    const [activeTab, setActiveTab] = useState('basic');
    const [logoPreview, setLogoPreview] = useState(company?.logo ? `/storage/${company.logo}` : null);
    
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

    const handleLogoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setData('logo', file);
            setLogoPreview(URL.createObjectURL(file));
        }
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
            router.post(route('admin.company_info.update', company.id), {
                ...data,
                _method: 'put',
            });
        } else {
            post(route('admin.company_info.store'));
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
        <AdminLayout activeMenu="Company Info">
            <Head title={isEdit ? "Edit Company Info" : "Add Company Info"} />
            <div className="Essential-Data-Container">
                 <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-800">
                        {isEdit ? 'Edit Company Information' : 'Add Company Information'}
                    </h1>
                     <Link
                        href={route('admin.company_info.index')}
                        className="btn btn-outline no-underline"
                    >
                        Back to List
                    </Link>
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
                    {/* Basic Tab */}
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

                            <div className="logo-container" onClick={() => document.getElementById('logoUpload').click()}>
                                <input
                                    type="file"
                                    id="logoUpload"
                                    name="logo"
                                    className="logo-upload"
                                    accept="image/*"
                                    onChange={handleLogoChange}
                                />
                                {logoPreview ? (
                                    <img src={logoPreview} alt="Logo Preview" className="logo-preview" />
                                ) : (
                                    <div className="logo-placeholder">
                                        <span className="material-icons-outlined" style={{ fontSize: '48px', color: '#94a3b8', marginBottom: '10px' }}>
                                            add_photo_alternate
                                        </span>
                                        <div>Company Logo</div>
                                        <div style={{ fontSize: '0.8rem', marginTop: '5px' }}>Click to upload</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Government Tab */}
                    <div className={`tab-content ${activeTab === 'government' ? 'active' : ''}`}>
                         <div className="section-header">Company Registration Details</div>
                        <div className="form-columns">
                            <div className="form-column">
                                {renderInput("Accountant Name:", "accountant_name")}
                                {renderInput("Tax Number:", "tax_number")}
                                {renderInput("Date of Establishment:", "date_of_establishment", "date")}
                            </div>
                            <div className="form-column">
                                {renderInput("Commercial Registration:", "commercial_registration")}
                                {renderInput("VAT Number:", "vat_number")}
                                {renderInput("Social Insurance Number:", "social_insurance_number")}
                            </div>
                        </div>
                        
                        <div className="section-header">Additional Information</div>
                        <div className="form-columns">
                            <div className="form-column">
                                {renderTextarea("Annual Goals:", "annual_goals")}
                                {renderInput("Work Center:", "work_center")}
                            </div>
                            <div className="form-column">
                                {renderInput("Storage:", "storage")}
                                {renderInput("Subsidiary Company:", "subsidiary_company")}
                            </div>
                        </div>
                    </div>

                    {/* Contact Tab */}
                    <div className={`tab-content ${activeTab === 'contact' ? 'active' : ''}`}>
                         <div className="form-columns">
                            <div className="form-column">
                                {renderInput("Email Address:", "email_address", "email")}
                                {renderInput("Official Email:", "official_email", "email")}
                                {renderInput("Facebook:", "facebook")}
                            </div>
                            <div className="form-column">
                                {renderInput("Telegram:", "telegram")}
                                {renderInput("YouTube:", "youtube")}
                                {renderInput("Instagram:", "instagram")}
                            </div>
                        </div>
                    </div>

                    {/* Financial Tab */}
                    <div className={`tab-content ${activeTab === 'financial' ? 'active' : ''}`}>
                        <div className="section-header">Bank Account Details</div>
                        <div className="form-columns">
                            <div className="form-column">
                                {renderInput("Account Holder Name:", "account_holder_name")}
                                {renderInput("IBAN:", "iban")}
                                {renderInput("SWIFT/BIC:", "swift_bic")}
                            </div>
                            <div className="form-column">
                                {renderInput("Bank Name:", "bank_name")}
                                {renderInput("Branch Name:", "branch_name")}
                                {renderTextarea("Bank Address:", "bank_address")}
                            </div>
                        </div>
                    </div>

                    <div className="button-group">
                        <button type="button" className="btn btn-outline" onClick={() => window.history.back()}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={processing}>
                            {processing ? 'Saving...' : 'Save Information'}
                        </button>
                    </div>
                </form>
            </div>
        </AdminLayout>
    );
};

export default CompanyInfoAdd_Edit;
