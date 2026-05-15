import React, { useEffect, useMemo, useState } from 'react';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import { apiService } from '@/services/api';
import '../../../../css/backend/main.scss';
import { toast } from 'react-toastify';

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

const BranchInfo = ({ branches = [], companies = [], branch = null, formMode = null }) => {
    const { props } = usePage();
    const { localization } = props;

    const getLocalizedRoute = (name, params = {}) => {
        return route(name, {
            country: localization?.country_code || 'sa',
            lang: localization?.current_locale || 'ar',
            ...params
        });
    };

    const [filteredBranches, setFilteredBranches] = useState(branches);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentBranch, setCurrentBranch] = useState(null);
    const [activeTab, setActiveTab] = useState('basic');
    const [logoPreview, setLogoPreview] = useState(
        branch?.logo ? resolveMediaUrl(branch.logo) : null
    );
    const [countries, setCountries] = useState([]);
    const [cities, setCities] = useState([]);
    const [areas, setAreas] = useState([]);
    const [localErrors, setLocalErrors] = useState({});
    const { data, setData, errors, setError, clearErrors, processing, reset } = useForm({
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
    const [stats, setStats] = useState({
        total: 0,
        withCompany: 0,
        withCountry: 0,
        withEmail: 0
    });

    useEffect(() => {
        setFilteredBranches(branches);
    }, [branches]);

    useEffect(() => {
        updateStats();
        filterBranches();
    }, [filteredBranches, searchTerm]);

    const updateStats = () => {
        const total = filteredBranches.length;
        const withCompany = filteredBranches.filter(b => b.company_id).length;
        const withCountry = filteredBranches.filter(b => b.country || b.country_data).length;
        const withEmail = filteredBranches.filter(b => b.email_address || b.official_email).length;
        setStats({ total, withCompany, withCountry, withEmail });
    };

    const filterBranches = () => {
        if (!searchTerm) {
            setFilteredBranches(branches);
            return;
        }
        const lowerTerm = searchTerm.toLowerCase();
        const filtered = branches.filter(b =>
            b.branch_name?.toLowerCase().includes(lowerTerm) ||
            (b.branch_code && String(b.branch_code).toLowerCase().includes(lowerTerm)) ||
            (b.company?.company_name && b.company.company_name.toLowerCase().includes(lowerTerm)) ||
            (b.branch_type && b.branch_type.toLowerCase().includes(lowerTerm)) ||
            (b.country_data?.name && b.country_data.name.toLowerCase().includes(lowerTerm)) ||
            (b.country && String(b.country).toLowerCase().includes(lowerTerm))
        );
        setFilteredBranches(filtered);
    };

    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
    };

    const query = useMemo(() => new URLSearchParams(window.location.search), [window.location.search]);
    const mode = query.get('mode') || formMode;
    const branchId = query.get('id');
    const isFormOpen = mode === 'create' || mode === 'edit' || mode === 'view';
    const isViewMode = mode === 'view';

    const applyBranchToForm = (source) => {
        setData('company_id', source?.company_id || '');
        setData('branch_name', source?.branch_name || '');
        setData('branch_code', source?.branch_code || '');
        setData('english_name', source?.english_name || '');
        setData('branch_type', source?.branch_type || '');
        setData('job_title', source?.job_title || '');
        setData('mobile', source?.mobile || '');
        setData('country', source?.country || '');
        setData('city', source?.city || '');
        setData('area', source?.area || '');
        setData('address', source?.address || '');
        setData('logo', null);
        setData('accountant_name', source?.accountant_name || '');
        setData('commercial_registration', source?.commercial_registration || '');
        setData('tax_number', source?.tax_number || '');
        setData('vat_number', source?.vat_number || '');
        setData('date_of_establishment', source?.date_of_establishment || '');
        setData('social_insurance_number', source?.social_insurance_number || '');
        setData('annual_goals', source?.annual_goals || '');
        setData('storage', source?.storage || '');
        setData('work_center', source?.work_center || '');
        setData('subsidiary_company', source?.subsidiary_company || '');
        setData('email_address', source?.email_address || '');
        setData('official_email', source?.official_email || '');
        setData('facebook', source?.facebook || '');
        setData('telegram', source?.telegram || '');
        setData('youtube', source?.youtube || '');
        setData('instagram', source?.instagram || '');
        setData('account_holder_name', source?.account_holder_name || '');
        setData('bank_name', source?.bank_name || '');
        setData('iban', source?.iban || '');
        setData('bank_branch_name', source?.bank_branch_name || '');
        setData('swift_bic', source?.swift_bic || '');
        setData('bank_address', source?.bank_address || '');
        setLogoPreview(source?.logo ? resolveMediaUrl(source.logo) : null);
    };

    useEffect(() => {
        if ((mode === 'edit' || mode === 'view') && branchId) {
            const selected = branches.find((b) => String(b.id) === String(branchId));
            setCurrentBranch(selected || null);
            applyBranchToForm(selected);
            setActiveTab('basic');
            return;
        }
        if ((mode === 'edit' || mode === 'view') && branch) {
            setCurrentBranch(branch);
            applyBranchToForm(branch);
            setActiveTab('basic');
            return;
        }
        if (mode === 'create') {
            setCurrentBranch(null);
            reset();
            setLogoPreview(null);
            setActiveTab('basic');
            return;
        }
        setCurrentBranch(null);
    }, [mode, branchId, branches]);

    useEffect(() => {
        apiService
            .get('/countries')
            .then((response) => {
                setCountries(response.data);
            })
            .catch(() => {
                setCountries([]);
            });
    }, []);

    useEffect(() => {
        if (data.country) {
            apiService
                .get(`/cities?country_id=${data.country}`)
                .then((response) => {
                    setCities(response.data);
                })
                .catch(() => {
                    setCities([]);
                });
        } else {
            setCities([]);
        }
    }, [data.country]);

    useEffect(() => {
        if (data.city) {
            apiService
                .get(`/areas?city_id=${data.city}`)
                .then((response) => {
                    setAreas(response.data);
                })
                .catch(() => {
                    setAreas([]);
                });
        } else {
            setAreas([]);
        }
    }, [data.city]);

    const openCreateForm = () => {
        router.visit(`${window.location.pathname}?mode=create`);
    };

    const openEditForm = (branch) => {
        router.visit(`${window.location.pathname}?mode=edit&id=${branch.id}`);
    };

    const openViewForm = (branch) => {
        router.visit(`${window.location.pathname}?mode=view&id=${branch.id}`);
    };

    const closeForm = () => {
        router.visit(window.location.pathname, { replace: true });
    };

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
            error = 'This field is required';
        }
        if (name === 'company_id' && !value) {
            error = 'Please select a company';
        }
        if ((name === 'email_address' || name === 'official_email') && value) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                error = 'Please enter a valid email address';
            }
        }
        setLocalErrors((prev) => ({ ...prev, [name]: error }));
        return error;
    };

    const validateForm = () => {
        const newErrors = {};
        if (!data.branch_name.trim()) newErrors.branch_name = 'This field is required';
        if (!data.company_id) newErrors.company_id = 'Please select a company';
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (data.email_address && !emailRegex.test(data.email_address)) {
            newErrors.email_address = 'Please enter a valid email address';
        }
        if (data.official_email && !emailRegex.test(data.official_email)) {
            newErrors.official_email = 'Please enter a valid email address';
        }
        setLocalErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (isViewMode) {
            return;
        }

        clearErrors();
        if (!validateForm()) {
            toast.warning('Please check the form for errors');
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
            }
            return;
        }

        const payload = { ...data };
        if (currentBranch) {
            payload._method = 'put';
        }

        const submitUrl = currentBranch
            ? getLocalizedRoute('admin.branches.update', { branch: currentBranch.id })
            : getLocalizedRoute('admin.branches.store');

        router.post(submitUrl, payload, {
            forceFormData: true,
            onStart: () => {
                toast.info(currentBranch ? 'Updating branch...' : 'Creating branch...', { autoClose: 2000 });
            },
            onSuccess: () => {
                if (!currentBranch) {
                    reset();
                    setLogoPreview(null);
                }
                closeForm();
            },
            onError: (errs) => {
                setError(errs);
                toast.error('Failed to save branch information');
            },
        });
    };

    const handleDelete = (id) => {
        if (confirm('Are you sure you want to delete this branch info?')) {
            router.delete(getLocalizedRoute('admin.branches.destroy', { branch: id }), {
                onStart: () => toast.info('Deleting branch...', { autoClose: 2000 }),
                onError: () => toast.error('Failed to delete branch'),
            });
        }
    };

    return (
        <AdminLayout activeMenu="Branch Info">
            <Head title="Branch Information - ZodicERP" />
            <div className="Essential-Data-Container">
                {isFormOpen ? (
                    <div className="tasks-card">
                        <div className="card-header">
                            <h1 className="text-2xl font-bold text-gray-800">
                                {isViewMode
                                    ? 'View Branch Information'
                                    : currentBranch
                                        ? 'Edit Branch Information'
                                        : 'Add Branch Information'}
                            </h1>
                            <div className="tasks-actions">
                                <button type="button" className="btn btn-outline" onClick={closeForm}>
                                    <span className="material-icons-outlined">arrow_back</span>
                                    <span>Back to List</span>
                                </button>
                            </div>
                        </div>

                        <div className="tabs">
                            {[
                                { id: 'basic', label: 'Basic Information' },
                                { id: 'government', label: 'Government Info' },
                                { id: 'contact', label: 'Contact Info' },
                                { id: 'financial', label: 'Financial Info' },
                            ].map((tab) => (
                                <div
                                    key={tab.id}
                                    className={`tab ${activeTab === tab.id ? 'active' : ''}`}
                                    onClick={() => setActiveTab(tab.id)}
                                >
                                    {tab.label}
                                </div>
                            ))}
                        </div>

                        <form onSubmit={handleSubmit} noValidate>
                            <div className={`tab-content ${activeTab === 'basic' ? 'active' : ''}`}>
                                <div className="form-columns">
                                        <div className="form-column">
                                            <div className="form-row">
                                                <label className="form-label" htmlFor="company_id">Company</label>
                                                <select
                                                    id="company_id"
                                                    name="company_id"
                                                    className="form-select"
                                                    value={data.company_id}
                                                    onChange={(e) => {
                                                        setData('company_id', e.target.value);
                                                        if (localErrors.company_id) {
                                                            setLocalErrors((prev) => ({ ...prev, company_id: null }));
                                                        }
                                                    }}
                                                    disabled={isViewMode}
                                                >
                                                    <option value="" disabled>Select Company</option>
                                                    {companies.map((company) => (
                                                        <option key={company.id} value={company.id}>
                                                            {company.company_name}
                                                        </option>
                                                    ))}
                                                </select>
                                                {(errors.company_id || localErrors.company_id) && (
                                                    <div className="text-red-500 text-sm mt-1">{errors.company_id || localErrors.company_id}</div>
                                                )}
                                            </div>
                                            <div className="form-row">
                                                <label className="form-label" htmlFor="branch_name">Branch Name</label>
                                                <input
                                                    id="branch_name"
                                                    type="text"
                                                    name="branch_name"
                                                    className="form-input"
                                                    value={data.branch_name}
                                                    onChange={(e) => {
                                                        setData('branch_name', e.target.value);
                                                        if (localErrors.branch_name) {
                                                            setLocalErrors((prev) => ({ ...prev, branch_name: null }));
                                                        }
                                                    }}
                                                    onBlur={() => validateField('branch_name', data.branch_name)}
                                                    placeholder="Enter branch name"
                                                    disabled={isViewMode}
                                                />
                                                {(errors.branch_name || localErrors.branch_name) && (
                                                    <div className="text-red-500 text-sm mt-1">{errors.branch_name || localErrors.branch_name}</div>
                                                )}
                                            </div>
                                            <div className="form-row">
                                                <label className="form-label" htmlFor="english_name">English Name</label>
                                                <input
                                                    id="english_name"
                                                    type="text"
                                                    name="english_name"
                                                    className="form-input"
                                                    value={data.english_name}
                                                    onChange={(e) => setData('english_name', e.target.value)}
                                                    placeholder="Enter English name"
                                                    disabled={isViewMode}
                                                />
                                            </div>
                                            <div className="form-row">
                                                <label className="form-label" htmlFor="branch_type">Branch Type</label>
                                                <select
                                                    id="branch_type"
                                                    name="branch_type"
                                                    className="form-select"
                                                    value={data.branch_type}
                                                    onChange={(e) => setData('branch_type', e.target.value)}
                                                    disabled={isViewMode}
                                                >
                                                    <option value="" disabled>Select Type</option>
                                                    <option value="main">Main Branch</option>
                                                    <option value="sub">Sub Branch</option>
                                                    <option value="warehouse">Warehouse</option>
                                                </select>
                                            </div>
                                            <div className="form-row">
                                                <label className="form-label" htmlFor="job_title">Job Title</label>
                                                <input
                                                    id="job_title"
                                                    type="text"
                                                    name="job_title"
                                                    className="form-input"
                                                    value={data.job_title}
                                                    onChange={(e) => setData('job_title', e.target.value)}
                                                    placeholder="Enter job title"
                                                    disabled={isViewMode}
                                                />
                                            </div>
                                            <div className="form-row">
                                                <label className="form-label" htmlFor="mobile">Mobile</label>
                                                <input
                                                    id="mobile"
                                                    type="tel"
                                                    name="mobile"
                                                    className="form-input"
                                                    value={data.mobile}
                                                    onChange={(e) => setData('mobile', e.target.value)}
                                                    placeholder="Enter mobile number"
                                                    disabled={isViewMode}
                                                />
                                            </div>
                                        </div>
                                        <div className="form-column">
                                            <div className="form-row">
                                                <label className="form-label" htmlFor="country">Country</label>
                                                <select
                                                    id="country"
                                                    name="country"
                                                    className="form-select"
                                                    value={data.country}
                                                    onChange={(e) => setData('country', e.target.value)}
                                                    disabled={isViewMode}
                                                >
                                                    <option value="" disabled>Select Country</option>
                                                    {countries.map((country) => (
                                                        <option key={country.id} value={country.id}>{country.name}</option>
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
                                                    onChange={(e) => setData('city', e.target.value)}
                                                    disabled={!data.country || isViewMode}
                                                >
                                                    <option value="" disabled>Select City</option>
                                                    {cities.map((city) => (
                                                        <option key={city.id} value={city.id}>{city.name}</option>
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
                                                    onChange={(e) => setData('area', e.target.value)}
                                                    disabled={!data.city || isViewMode}
                                                >
                                                    <option value="" disabled>Select Area</option>
                                                    {areas.map((area) => (
                                                        <option key={area.id} value={area.id}>{area.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="form-row">
                                                <label className="form-label" htmlFor="address">Address</label>
                                                <textarea
                                                    id="address"
                                                    name="address"
                                                    className="form-textarea"
                                                    value={data.address}
                                                    onChange={(e) => setData('address', e.target.value)}
                                                    placeholder="Enter full address"
                                                    disabled={isViewMode}
                                                />
                                            </div>
                                            <div className="form-row">
                                                <label className="form-label">Branch Logo</label>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    className="form-input"
                                                    onChange={handleLogoChange}
                                                    disabled={isViewMode}
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
                                <div className="form-columns">
                                        <div className="form-column">
                                            <div className="form-row">
                                                <label className="form-label" htmlFor="accountant_name">Accountant Name</label>
                                                <input
                                                    id="accountant_name"
                                                    type="text"
                                                    name="accountant_name"
                                                    className="form-input"
                                                    value={data.accountant_name}
                                                    onChange={(e) => setData('accountant_name', e.target.value)}
                                                    disabled={isViewMode}
                                                />
                                            </div>
                                            <div className="form-row">
                                                <label className="form-label" htmlFor="commercial_registration">Commercial Registration</label>
                                                <input
                                                    id="commercial_registration"
                                                    type="text"
                                                    name="commercial_registration"
                                                    className="form-input"
                                                    value={data.commercial_registration}
                                                    onChange={(e) => setData('commercial_registration', e.target.value)}
                                                    disabled={isViewMode}
                                                />
                                            </div>
                                            <div className="form-row">
                                                <label className="form-label" htmlFor="tax_number">Tax Number</label>
                                                <input
                                                    id="tax_number"
                                                    type="text"
                                                    name="tax_number"
                                                    className="form-input"
                                                    value={data.tax_number}
                                                    onChange={(e) => setData('tax_number', e.target.value)}
                                                    disabled={isViewMode}
                                                />
                                            </div>
                                            <div className="form-row">
                                                <label className="form-label" htmlFor="vat_number">VAT Number</label>
                                                <input
                                                    id="vat_number"
                                                    type="text"
                                                    name="vat_number"
                                                    className="form-input"
                                                    value={data.vat_number}
                                                    onChange={(e) => setData('vat_number', e.target.value)}
                                                    disabled={isViewMode}
                                                />
                                            </div>
                                            <div className="form-row">
                                                <label className="form-label" htmlFor="date_of_establishment">Date of Establishment</label>
                                                <input
                                                    id="date_of_establishment"
                                                    type="date"
                                                    name="date_of_establishment"
                                                    className="form-input"
                                                    value={data.date_of_establishment}
                                                    onChange={(e) => setData('date_of_establishment', e.target.value)}
                                                    disabled={isViewMode}
                                                />
                                            </div>
                                        </div>
                                        <div className="form-column">
                                            <div className="form-row">
                                                <label className="form-label" htmlFor="social_insurance_number">Social Insurance Number</label>
                                                <input
                                                    id="social_insurance_number"
                                                    type="text"
                                                    name="social_insurance_number"
                                                    className="form-input"
                                                    value={data.social_insurance_number}
                                                    onChange={(e) => setData('social_insurance_number', e.target.value)}
                                                    disabled={isViewMode}
                                                />
                                            </div>
                                            <div className="form-row">
                                                <label className="form-label" htmlFor="annual_goals">Annual Goals</label>
                                                <textarea
                                                    id="annual_goals"
                                                    name="annual_goals"
                                                    className="form-textarea"
                                                    value={data.annual_goals}
                                                    onChange={(e) => setData('annual_goals', e.target.value)}
                                                    disabled={isViewMode}
                                                />
                                            </div>
                                            <div className="form-row">
                                                <label className="form-label" htmlFor="work_center">Work Center</label>
                                                <input
                                                    id="work_center"
                                                    type="text"
                                                    name="work_center"
                                                    className="form-input"
                                                    value={data.work_center}
                                                    onChange={(e) => setData('work_center', e.target.value)}
                                                    disabled={isViewMode}
                                                />
                                            </div>
                                            <div className="form-row">
                                                <label className="form-label" htmlFor="storage">Storage</label>
                                                <input
                                                    id="storage"
                                                    type="text"
                                                    name="storage"
                                                    className="form-input"
                                                    value={data.storage}
                                                    onChange={(e) => setData('storage', e.target.value)}
                                                    disabled={isViewMode}
                                                />
                                            </div>
                                            <div className="form-row">
                                                <label className="form-label" htmlFor="subsidiary_company">Subsidiary Company</label>
                                                <input
                                                    id="subsidiary_company"
                                                    type="text"
                                                    name="subsidiary_company"
                                                    className="form-input"
                                                    value={data.subsidiary_company}
                                                    onChange={(e) => setData('subsidiary_company', e.target.value)}
                                                    disabled={isViewMode}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                            <div className={`tab-content ${activeTab === 'contact' ? 'active' : ''}`}>
                                <div className="form-columns">
                                        <div className="form-column">
                                            <div className="form-row">
                                                <label className="form-label" htmlFor="email_address">Email Address</label>
                                                <input
                                                    id="email_address"
                                                    type="email"
                                                    name="email_address"
                                                    className="form-input"
                                                    value={data.email_address}
                                                    onChange={(e) => {
                                                        setData('email_address', e.target.value);
                                                        if (localErrors.email_address) {
                                                            setLocalErrors((prev) => ({ ...prev, email_address: null }));
                                                        }
                                                    }}
                                                    onBlur={() => validateField('email_address', data.email_address)}
                                                    disabled={isViewMode}
                                                />
                                                {(errors.email_address || localErrors.email_address) && (
                                                    <div className="text-red-500 text-sm mt-1">{errors.email_address || localErrors.email_address}</div>
                                                )}
                                            </div>
                                            <div className="form-row">
                                                <label className="form-label" htmlFor="official_email">Official Email</label>
                                                <input
                                                    id="official_email"
                                                    type="email"
                                                    name="official_email"
                                                    className="form-input"
                                                    value={data.official_email}
                                                    onChange={(e) => {
                                                        setData('official_email', e.target.value);
                                                        if (localErrors.official_email) {
                                                            setLocalErrors((prev) => ({ ...prev, official_email: null }));
                                                        }
                                                    }}
                                                    onBlur={() => validateField('official_email', data.official_email)}
                                                    disabled={isViewMode}
                                                />
                                                {(errors.official_email || localErrors.official_email) && (
                                                    <div className="text-red-500 text-sm mt-1">{errors.official_email || localErrors.official_email}</div>
                                                )}
                                            </div>
                                            <div className="form-row">
                                                <label className="form-label" htmlFor="facebook">Facebook</label>
                                                <input
                                                    id="facebook"
                                                    type="text"
                                                    name="facebook"
                                                    className="form-input"
                                                    value={data.facebook}
                                                    onChange={(e) => setData('facebook', e.target.value)}
                                                    disabled={isViewMode}
                                                />
                                            </div>
                                        </div>
                                        <div className="form-column">
                                            <div className="form-row">
                                                <label className="form-label" htmlFor="telegram">Telegram</label>
                                                <input
                                                    id="telegram"
                                                    type="text"
                                                    name="telegram"
                                                    className="form-input"
                                                    value={data.telegram}
                                                    onChange={(e) => setData('telegram', e.target.value)}
                                                    disabled={isViewMode}
                                                />
                                            </div>
                                            <div className="form-row">
                                                <label className="form-label" htmlFor="youtube">YouTube</label>
                                                <input
                                                    id="youtube"
                                                    type="text"
                                                    name="youtube"
                                                    className="form-input"
                                                    value={data.youtube}
                                                    onChange={(e) => setData('youtube', e.target.value)}
                                                    disabled={isViewMode}
                                                />
                                            </div>
                                            <div className="form-row">
                                                <label className="form-label" htmlFor="instagram">Instagram</label>
                                                <input
                                                    id="instagram"
                                                    type="text"
                                                    name="instagram"
                                                    className="form-input"
                                                    value={data.instagram}
                                                    onChange={(e) => setData('instagram', e.target.value)}
                                                    disabled={isViewMode}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                            <div className={`tab-content ${activeTab === 'financial' ? 'active' : ''}`}>
                                <div className="form-columns">
                                        <div className="form-column">
                                            <div className="form-row">
                                                <label className="form-label" htmlFor="account_holder_name">Account Holder Name</label>
                                                <input
                                                    id="account_holder_name"
                                                    type="text"
                                                    name="account_holder_name"
                                                    className="form-input"
                                                    value={data.account_holder_name}
                                                    onChange={(e) => setData('account_holder_name', e.target.value)}
                                                    disabled={isViewMode}
                                                />
                                            </div>
                                            <div className="form-row">
                                                <label className="form-label" htmlFor="bank_name">Bank Name</label>
                                                <input
                                                    id="bank_name"
                                                    type="text"
                                                    name="bank_name"
                                                    className="form-input"
                                                    value={data.bank_name}
                                                    onChange={(e) => setData('bank_name', e.target.value)}
                                                    disabled={isViewMode}
                                                />
                                            </div>
                                            <div className="form-row">
                                                <label className="form-label" htmlFor="iban">IBAN</label>
                                                <input
                                                    id="iban"
                                                    type="text"
                                                    name="iban"
                                                    className="form-input"
                                                    value={data.iban}
                                                    onChange={(e) => setData('iban', e.target.value)}
                                                    disabled={isViewMode}
                                                />
                                            </div>
                                        </div>
                                        <div className="form-column">
                                            <div className="form-row">
                                                <label className="form-label" htmlFor="bank_branch_name">Bank Branch Name</label>
                                                <input
                                                    id="bank_branch_name"
                                                    type="text"
                                                    name="bank_branch_name"
                                                    className="form-input"
                                                    value={data.bank_branch_name}
                                                    onChange={(e) => setData('bank_branch_name', e.target.value)}
                                                    disabled={isViewMode}
                                                />
                                            </div>
                                            <div className="form-row">
                                                <label className="form-label" htmlFor="swift_bic">SWIFT/BIC</label>
                                                <input
                                                    id="swift_bic"
                                                    type="text"
                                                    name="swift_bic"
                                                    className="form-input"
                                                    value={data.swift_bic}
                                                    onChange={(e) => setData('swift_bic', e.target.value)}
                                                    disabled={isViewMode}
                                                />
                                            </div>
                                            <div className="form-row">
                                                <label className="form-label" htmlFor="bank_address">Bank Address</label>
                                                <textarea
                                                    id="bank_address"
                                                    name="bank_address"
                                                    className="form-textarea"
                                                    value={data.bank_address}
                                                    onChange={(e) => setData('bank_address', e.target.value)}
                                                    disabled={isViewMode}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            <div className="form-actions">
                                <button type="button" className="btn btn-outline" onClick={closeForm}>
                                    {isViewMode ? 'Close' : 'Cancel'}
                                </button>
                                {!isViewMode && (
                                    <button type="submit" className="btn btn-primary" disabled={processing}>
                                        {processing ? 'Saving...' : currentBranch ? 'Update Branch' : 'Create Branch'}
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                ) : (
                    <>
                        <div className="page-header">
                            <h1 className="text-2xl font-bold text-gray-800">Branch Information</h1>
                        </div>

                        <div className="stats-cards">
                            <div className="stat-card">
                                <div className="stat-icon" style={{ backgroundColor: 'var(--primary-color)' }}>
                                    <span className="material-icons-outlined">account_tree</span>
                                </div>
                                <div className="stat-content">
                                    <div className="stat-value">{stats.total}</div>
                                    <div className="stat-label">Total Branches</div>
                                </div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-icon" style={{ backgroundColor: 'var(--success-color)' }}>
                                    <span className="material-icons-outlined">business</span>
                                </div>
                                <div className="stat-content">
                                    <div className="stat-value">{stats.withCompany}</div>
                                    <div className="stat-label">With Company</div>
                                </div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-icon" style={{ backgroundColor: 'var(--info-color)' }}>
                                    <span className="material-icons-outlined">public</span>
                                </div>
                                <div className="stat-content">
                                    <div className="stat-value">{stats.withCountry}</div>
                                    <div className="stat-label">With Country</div>
                                </div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-icon" style={{ backgroundColor: 'var(--warning-color)' }}>
                                    <span className="material-icons-outlined">email</span>
                                </div>
                                <div className="stat-content">
                                    <div className="stat-value">{stats.withEmail}</div>
                                    <div className="stat-label">With Email</div>
                                </div>
                            </div>
                        </div>

                        <div className="tasks-card">
                            <div className="card-header">
                                <div className="tasks-actions">
                                    <div className="search-bar light">
                                        <input
                                            type="text"
                                            placeholder="Search branches..."
                                            value={searchTerm}
                                            onChange={handleSearch}
                                        />
                                        <button type="button">
                                            <span className="material-icons-outlined">search</span>
                                        </button>
                                    </div>
                                </div>
                                <div className="tasks-actions">
                                    <button type="button" className="btn btn-outline">
                                        <span className="material-icons-outlined">upload</span>
                                        <span>Import</span>
                                    </button>
                                    <button type="button" className="btn btn-outline">
                                        <span className="material-icons-outlined">download</span>
                                        <span>Export</span>
                                    </button>
                                    <button type="button" className="btn btn-primary" onClick={openCreateForm}>
                                        <span className="material-icons-outlined">add</span>
                                        <span>Add Branch</span>
                                    </button>
                                </div>
                            </div>

                            <div className="table-container">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>BRANCH NAME</th>
                                            <th>CODE</th>
                                            <th>COMPANY</th>
                                            <th>TYPE</th>
                                            <th>COUNTRY</th>
                                            <th>ACTIONS</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredBranches.length > 0 ? (
                                            filteredBranches.map((branch) => (
                                                <tr key={branch.id}>
                                                    <td>#{branch.id}</td>
                                                    <td>{branch.branch_name}</td>
                                                    <td>{branch.branch_code || '-'}</td>
                                                    <td>{branch.company?.company_name || '-'}</td>
                                                    <td className="capitalize">{branch.branch_type || '-'}</td>
                                                    <td className="uppercase">{branch.country_data?.name || branch.country || '-'}</td>
                                                    <td>
                                                        <button
                                                            type="button"
                                                            className="icon-btn edit"
                                                            title="Edit"
                                                            onClick={() => openEditForm(branch)}
                                                        >
                                                            <span className="material-icons-outlined">edit</span>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="icon-btn delete"
                                                            title="Delete"
                                                            onClick={() => handleDelete(branch.id)}
                                                        >
                                                            <span className="material-icons-outlined">delete</span>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="icon-btn view"
                                                            title="View"
                                                            onClick={() => openViewForm(branch)}
                                                        >
                                                            <span className="material-icons-outlined">visibility</span>
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={7} className="text-center text-gray-500 py-6">
                                                    No branch information found.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div className="pagination">
                                <div className="pagination-info">
                                    <span>
                                        Showing <strong>{filteredBranches.length}</strong> of{' '}
                                        <strong>{branches.length}</strong> branches
                                    </span>
                                </div>
                                <div className="pagination-controls">
                                    <button className="page-btn active" disabled>
                                        1
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </AdminLayout>
    );
};

export default BranchInfo;
