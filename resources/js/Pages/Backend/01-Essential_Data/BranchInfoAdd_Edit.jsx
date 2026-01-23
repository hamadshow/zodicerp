import React, { useState, useEffect } from 'react';
import { Head, useForm, Link, router } from '@inertiajs/react';
import axios from 'axios';
import AdminLayout from '../components/AdminLayout';
import '../../../../css/backend/BranchInfo.scss';

const BranchInfoAdd_Edit = ({ branch, companies }) => {
    const isEdit = !!branch;
    const [activeTab, setActiveTab] = useState('basic');
    const [logoPreview, setLogoPreview] = useState(branch?.logo ? `/storage/${branch.logo}` : null);
    
    // State for dependent dropdowns
    const [countries, setCountries] = useState([]);
    const [cities, setCities] = useState([]);
    const [areas, setAreas] = useState([]);

    // Client-side validation errors
    const [localErrors, setLocalErrors] = useState({});

    const { data, setData, post, processing, errors, clearErrors } = useForm({
        company_id: branch?.company_id || '',
        branch_name: branch?.branch_name || '',
        branch_code: branch?.branch_code || '',
        english_name: branch?.english_name || '',
        branch_type: branch?.branch_type || '',
        job_title: branch?.job_title || '',
        mobile: branch?.mobile || '',
        country: branch?.country || '',
        city: branch?.city || '',
        area: branch?.area || '',
        address: branch?.address || '',
        logo: null,
        
        accountant_name: branch?.accountant_name || '',
        commercial_registration: branch?.commercial_registration || '',
        tax_number: branch?.tax_number || '',
        vat_number: branch?.vat_number || '',
        date_of_establishment: branch?.date_of_establishment || '',
        social_insurance_number: branch?.social_insurance_number || '',
        annual_goals: branch?.annual_goals || '',
        storage: branch?.storage || '',
        work_center: branch?.work_center || '',
        subsidiary_company: branch?.subsidiary_company || '',
        
        email_address: branch?.email_address || '',
        official_email: branch?.official_email || '',
        facebook: branch?.facebook || '',
        telegram: branch?.telegram || '',
        youtube: branch?.youtube || '',
        instagram: branch?.instagram || '',
        
        account_holder_name: branch?.account_holder_name || '',
        bank_name: branch?.bank_name || '',
        iban: branch?.iban || '',
        bank_branch_name: branch?.bank_branch_name || '',
        swift_bic: branch?.swift_bic || '',
        bank_address: branch?.bank_address || '',
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
        if (name === 'branch_name' && !value.trim()) {
            error = "This field is required";
        }
        if (name === 'company_id' && !value) {
            error = "Please select a company";
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
        if (!data.branch_name.trim()) newErrors.branch_name = "This field is required";
        if (!data.company_id) newErrors.company_id = "Please select a company";
        
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
            const currentErrors = {};
            if (!data.branch_name.trim()) currentErrors.branch_name = true;
            if (!data.company_id) currentErrors.company_id = true;
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (data.email_address && !emailRegex.test(data.email_address)) currentErrors.email_address = true;
            if (data.official_email && !emailRegex.test(data.official_email)) currentErrors.official_email = true;
            
            const firstKey = Object.keys(currentErrors)[0];
            if (firstKey) {
                if (['branch_name', 'company_id'].includes(firstKey)) setActiveTab('basic');
                if (['email_address', 'official_email'].includes(firstKey)) setActiveTab('contact');
                
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
            router.post(route('admin.branches.update', branch.id), {
                ...data,
                _method: 'put',
            });
        } else {
            post(route('admin.branches.store'));
        }
    };

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

    const renderTextarea = (label, name, placeholder = '') => (
        <div className="form-row">
            <label className="form-label" htmlFor={name}>{label}</label>
            <textarea
                id={name}
                name={name}
                className={`form-textarea ${errors[name] || localErrors[name] ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                value={data[name]}
                onChange={e => setData(name, e.target.value)}
                placeholder={placeholder}
            />
             {(errors[name] || localErrors[name]) && (
                <div className="text-red-500 text-sm mt-1" role="alert">
                    {errors[name] || localErrors[name]}
                </div>
            )}
        </div>
    );

    return (
        <AdminLayout activeMenu="Branch Info">
            <Head title={isEdit ? "Edit Branch Info" : "Add Branch Info"} />
            <div className="Essential-Data-Container">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-800">
                        {isEdit ? "Edit Branch Info" : "Add Branch Info"}
                    </h1>
                    <Link
                        href={route('admin.branch_info.index')}
                        className="btn btn-secondary no-underline"
                    >
                        Back to List
                    </Link>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-6">
                    <form onSubmit={submitForm} noValidate>
                        <div className="tabs">
                            <div 
                                className={`tab ${activeTab === 'basic' ? 'active' : ''}`}
                                onClick={() => setActiveTab('basic')}
                            >
                                Basic Information
                            </div>
                            <div 
                                className={`tab ${activeTab === 'government' ? 'active' : ''}`}
                                onClick={() => setActiveTab('government')}
                            >
                                Government Info
                            </div>
                            <div 
                                className={`tab ${activeTab === 'contact' ? 'active' : ''}`}
                                onClick={() => setActiveTab('contact')}
                            >
                                Contact Info
                            </div>
                            <div 
                                className={`tab ${activeTab === 'financial' ? 'active' : ''}`}
                                onClick={() => setActiveTab('financial')}
                            >
                                Financial Info
                            </div>
                        </div>

                        <div className={`tab-content ${activeTab === 'basic' ? 'active' : ''}`}>
                            <div className="section-header">Basic Details</div>
                            <div className="form-columns">
                                <div className="form-column">
                                    <div className="form-row">
                                        <label className="form-label" htmlFor="company_id">Company <span className="text-red-500">*</span></label>
                                        <select
                                            id="company_id"
                                            name="company_id"
                                            className={`form-select ${errors.company_id || localErrors.company_id ? 'border-red-500' : ''}`}
                                            value={data.company_id}
                                            onChange={e => {
                                                setData('company_id', e.target.value);
                                                if (localErrors.company_id) setLocalErrors(prev => ({ ...prev, company_id: null }));
                                            }}
                                            onBlur={() => validateField('company_id', data.company_id)}
                                        >
                                            <option value="">Select Company</option>
                                            {companies && companies.map(company => (
                                                <option key={company.id} value={company.id}>{company.company_name}</option>
                                            ))}
                                        </select>
                                        {(errors.company_id || localErrors.company_id) && (
                                            <div className="text-red-500 text-sm mt-1">{errors.company_id || localErrors.company_id}</div>
                                        )}
                                    </div>
                                    {renderInput('Branch Name', 'branch_name', 'text', 'Enter branch name')}
                                    {renderInput('English Name', 'english_name', 'text', 'Enter English name')}
                                    
                                    <div className="form-row">
                                        <label className="form-label" htmlFor="branch_type">Branch Type</label>
                                        <select
                                            id="branch_type"
                                            name="branch_type"
                                            className="form-select"
                                            value={data.branch_type}
                                            onChange={e => setData('branch_type', e.target.value)}
                                        >
                                            <option value="">Select Type</option>
                                            <option value="main">Main Branch</option>
                                            <option value="sub">Sub Branch</option>
                                            <option value="warehouse">Warehouse</option>
                                        </select>
                                    </div>

                                    {renderInput('Job Title', 'job_title', 'text', 'Enter job title')}
                                    {renderInput('Mobile', 'mobile', 'tel', 'Enter mobile number')}
                                </div>
                                
                                <div className="form-column">
                                    <div className="form-row">
                                        <label className="form-label" htmlFor="country">Country</label>
                                        <select
                                            id="country"
                                            name="country"
                                            className="form-select"
                                            value={data.country}
                                            onChange={e => setData('country', e.target.value)}
                                        >
                                            <option value="">Select Country</option>
                                            {countries.map(c => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="form-row">
                                        <label className="form-label" htmlFor="city">City</label>
                                        <select
                                            id="city"
                                            name="city"
                                            className="form-select"
                                            value={data.city}
                                            onChange={e => setData('city', e.target.value)}
                                            disabled={!data.country}
                                        >
                                            <option value="">Select City</option>
                                            {cities.map(c => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="form-row">
                                        <label className="form-label" htmlFor="area">Area</label>
                                        <select
                                            id="area"
                                            name="area"
                                            className="form-select"
                                            value={data.area}
                                            onChange={e => setData('area', e.target.value)}
                                            disabled={!data.city}
                                        >
                                            <option value="">Select Area</option>
                                            {areas.map(a => (
                                                <option key={a.id} value={a.id}>{a.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {renderTextarea('Address', 'address', 'Enter full address')}
                                    
                                    <div className="form-row">
                                        <label className="form-label">Branch Logo</label>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="form-input"
                                            onChange={handleLogoChange}
                                        />
                                        {logoPreview && (
                                            <div className="mt-2">
                                                <img src={logoPreview} alt="Logo Preview" className="h-20 w-auto object-contain border rounded p-1" />
                                            </div>
                                        )}
                                        {errors.logo && <div className="text-red-500 text-sm mt-1">{errors.logo}</div>}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className={`tab-content ${activeTab === 'government' ? 'active' : ''}`}>
                            <div className="section-header">Government Information</div>
                            <div className="form-columns">
                                <div className="form-column">
                                    {renderInput('Accountant Name', 'accountant_name')}
                                    {renderInput('Commercial Registration', 'commercial_registration')}
                                    {renderInput('Tax Number', 'tax_number')}
                                    {renderInput('VAT Number', 'vat_number')}
                                    {renderInput('Date of Establishment', 'date_of_establishment', 'date')}
                                </div>
                                <div className="form-column">
                                    {renderInput('Social Insurance Number', 'social_insurance_number')}
                                    {renderTextarea('Annual Goals', 'annual_goals')}
                                    {renderInput('Work Center', 'work_center')}
                                    {renderInput('Storage', 'storage')}
                                    {renderInput('Subsidiary Company', 'subsidiary_company')}
                                </div>
                            </div>
                        </div>

                        <div className={`tab-content ${activeTab === 'contact' ? 'active' : ''}`}>
                            <div className="section-header">Contact Information</div>
                            <div className="form-columns">
                                <div className="form-column">
                                    {renderInput('Email Address', 'email_address', 'email')}
                                    {renderInput('Official Email', 'official_email', 'email')}
                                    {renderInput('Facebook', 'facebook')}
                                </div>
                                <div className="form-column">
                                    {renderInput('Telegram', 'telegram')}
                                    {renderInput('YouTube', 'youtube')}
                                    {renderInput('Instagram', 'instagram')}
                                </div>
                            </div>
                        </div>

                        <div className={`tab-content ${activeTab === 'financial' ? 'active' : ''}`}>
                            <div className="section-header">Financial Information</div>
                            <div className="form-columns">
                                <div className="form-column">
                                    {renderInput('Account Holder Name', 'account_holder_name')}
                                    {renderInput('Bank Name', 'bank_name')}
                                    {renderInput('IBAN', 'iban')}
                                </div>
                                <div className="form-column">
                                    {renderInput('Bank Branch Name', 'bank_branch_name')}
                                    {renderInput('SWIFT/BIC', 'swift_bic')}
                                    {renderTextarea('Bank Address', 'bank_address')}
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 pt-4 border-t border-gray-200 flex justify-end gap-4">
                            <Link
                                href={route('admin.branches.index')}
                                className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </Link>
                            <button
                                type="submit"
                                disabled={processing}
                                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50"
                            >
                                {processing ? 'Saving...' : (isEdit ? 'Update Branch' : 'Save Branch')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </AdminLayout>
    );
};

export default BranchInfoAdd_Edit;
