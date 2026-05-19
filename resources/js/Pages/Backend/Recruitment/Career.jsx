import React, { useState, useEffect } from 'react';
import { Head, useForm, router, usePage, Link } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import BlankPage from '@/Components/BlankPage';
import '../../../../css/backend/main.scss';

const Career = ({ careers: propCareers }) => {
    const { props } = usePage();
    const localization = props.localization;
    const translations = localization?.translations || {};

    const getLocalizedRoute = (name, params = {}) => {
        return route(name, {
            country: localization?.country_code || 'sa',
            lang: localization?.current_locale || 'ar',
            ...params
        });
    };

    const careersData = propCareers?.data || (Array.isArray(propCareers) ? propCareers : []);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [currentCareer, setCurrentCareer] = useState(null);
    const [sortConfig, setSortConfig] = useState({ key: 'id', direction: 'asc' });

    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        title: '',
        location: '',
        type: 'full-time',
        description: '',
        requirements: '',
        responsibilities: '',
        salary_range: '',
        is_active: true,
        company_id: null,
    });

    const [filteredCareers, setFilteredCareers] = useState(careersData);

    useEffect(() => {
        let result = [...careersData];

        // Search filtering
        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            result = result.filter(c => 
                (c.title && c.title.toLowerCase().includes(lowerTerm)) ||
                (c.location && c.location.toLowerCase().includes(lowerTerm)) ||
                (c.type && c.type.toLowerCase().includes(lowerTerm))
            );
        }

        // Sorting
        if (sortConfig.key) {
            result.sort((a, b) => {
                if (a[sortConfig.key] < b[sortConfig.key]) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (a[sortConfig.key] > b[sortConfig.key]) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }

        setFilteredCareers(result);
    }, [propCareers, searchTerm, sortConfig]);

    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const stats = {
        total: careersData.length,
        active: careersData.filter(c => c.is_active).length,
        fullTime: careersData.filter(c => c.type === 'full-time').length,
    };

    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
    };

    const openForm = (career = null) => {
        clearErrors();
        if (career) {
            setCurrentCareer(career);
            setData({
                title: career.title || '',
                location: career.location || '',
                type: career.type || 'full-time',
                description: career.description || '',
                requirements: career.requirements || '',
                responsibilities: career.responsibilities || '',
                salary_range: career.salary_range || '',
                is_active: !!career.is_active,
                company_id: career.company_id || null,
            });
        } else {
            setCurrentCareer(null);
            reset();
        }
        setShowForm(true);
    };

    const closeForm = () => {
        setShowForm(false);
        setCurrentCareer(null);
        reset();
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (currentCareer) {
            put(getLocalizedRoute('admin.careers.update', { career: currentCareer.id }), {
                onSuccess: () => closeForm(),
            });
        } else {
            post(getLocalizedRoute('admin.careers.store'), {
                onSuccess: () => closeForm(),
            });
        }
    };

    const handleDelete = (id) => {
        if (window.confirm(translations['confirm.delete'] || translations['common.confirm_delete'] || 'Are you sure?')) {
            router.delete(getLocalizedRoute('admin.careers.destroy', { career: id }));
        }
    };

    const getTranslation = (key, fallback) => {
        return translations[`career.${key}`] || translations[`common.${key}`] || fallback;
    };

    const breadcrumbs = [
        { label: translations['sidebar.Dashboard'] || 'Dashboard', href: getLocalizedRoute('admin.dashboard') },
        { label: translations['sidebar.recruitment'] || 'Recruitment', onClick: (e) => { e.preventDefault(); closeForm(); } },
        { label: translations['sidebar.careers'] || 'Careers' }
    ];

    if (showForm) {
        breadcrumbs.push({ 
            label: currentCareer ? getTranslation('edit_job', 'Edit Job') : getTranslation('add_job', 'Add Job') 
        });
    }

    const statsContent = !showForm && (
        <div className="stats-cards">
            <div className="stat-card">
                <div className="stat-icon" style={{ backgroundColor: 'var(--primary-color)' }}>
                    <span className="material-icons-outlined">work</span>
                </div>
                <div className="stat-content">
                    <div className="stat-value">{stats.total}</div>
                    <div className="stat-label">{getTranslation('total_jobs', 'Total Jobs')}</div>
                </div>
            </div>
            <div className="stat-card">
                <div className="stat-icon" style={{ backgroundColor: 'var(--success-color)' }}>
                    <span className="material-icons-outlined">check_circle</span>
                </div>
                <div className="stat-content">
                    <div className="stat-value">{stats.active}</div>
                    <div className="stat-label">{getTranslation('active_postings', 'Active Postings')}</div>
                </div>
            </div>
            <div className="stat-card">
                <div className="stat-icon" style={{ backgroundColor: 'var(--info-color)' }}>
                    <span className="material-icons-outlined">timer</span>
                </div>
                <div className="stat-content">
                    <div className="stat-value">{stats.fullTime}</div>
                    <div className="stat-label">{getTranslation('full_time_jobs', 'Full-Time Jobs')}</div>
                </div>
            </div>
        </div>
    );

    return (
        <AdminLayout activeMenu={translations['sidebar.careers'] || 'Career'}>
            <Head title={getTranslation('title', 'Careers Management')} />
            
            <BlankPage breadcrumbs={breadcrumbs} stats={statsContent}>
                {!showForm ? (
                    <div className="fade-in">
                        {/* Main Card */}
                        <div className="career-card">
                            <div className="card-header">
                                <div className="career-actions">
                                    <div className="search-bar light">
                                        <input 
                                            type="text" 
                                            placeholder={getTranslation('search_placeholder', 'Search careers...')}
                                            value={searchTerm}
                                            onChange={handleSearch}
                                        />
                                        <button>
                                            <span className="material-icons-outlined">search</span>
                                        </button>
                                    </div>
                                </div>
                                <div className="actions">
                                    <button className="btn btn-primary" onClick={() => openForm()}>
                                        <span className="material-icons-outlined">add</span>
                                        <span>{getTranslation('add_job', 'Add Job Posting')}</span>
                                    </button>
                                    <button className="btn btn-outline" onClick={() => router.reload()}>
                                        <span className="material-icons-outlined">refresh</span>
                                        <span>{translations['common.refresh'] || 'Refresh'}</span>
                                    </button>
                                </div>
                            </div>

                            <div className="table-container">
                                <table>
                                    <thead>
                                        <tr>
                                            <th><input type="checkbox" /></th>
                                            <th onClick={() => requestSort('id')} style={{ cursor: 'pointer' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                    ID
                                                    <span className="material-icons-outlined" style={{ fontSize: '16px' }}>
                                                        {sortConfig.key === 'id' ? (sortConfig.direction === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'sort'}
                                                    </span>
                                                </div>
                                            </th>
                                            <th>{getTranslation('job_title', 'JOB TITLE')}</th>
                                            <th>{getTranslation('location', 'LOCATION')}</th>
                                            <th>{getTranslation('type', 'TYPE')}</th>
                                            <th>{getTranslation('salary', 'SALARY')}</th>
                                            <th>{getTranslation('status', 'STATUS')}</th>
                                            <th>{translations['common.operations'] || 'OPERATIONS'}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredCareers.map(career => (
                                            <tr key={career.id}>
                                                <td><input type="checkbox" className="career-checkbox" /></td>
                                                <td>{career.id.toString().padStart(3, '0')}</td>
                                                <td>{career.title}</td>
                                                <td>{career.location || 'N/A'}</td>
                                                <td>
                                                    <span className="career-type-tag">
                                                        {getTranslation(career.type, career.type)}
                                                    </span>
                                                </td>
                                                <td>{career.salary_range || 'Not Specified'}</td>
                                                <td>
                                                    <span className={`career-status status-${career.is_active ? 'active' : 'inactive'}`}>
                                                        {career.is_active ? translations['common.active'] || 'Active' : translations['common.inactive'] || 'Inactive'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <button className="icon-btn edit" onClick={() => openForm(career)}>
                                                        <span className="material-icons-outlined">edit</span>
                                                    </button>
                                                    <button className="icon-btn delete" onClick={() => handleDelete(career.id)}>
                                                        <span className="material-icons-outlined">delete</span>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {filteredCareers.length === 0 && (
                                            <tr>
                                                <td colSpan="8" style={{ textAlign: 'center', padding: '2rem' }}>
                                                    {translations['common.no_data'] || 'No careers found.'}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Career Form View */
                    <div className="fade-in">
                        <div className="card">
                            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    <button className="btn btn-outline btn-sm" onClick={closeForm}>
                                        <span className="material-icons-outlined">arrow_back</span>
                                        <span>{translations['common.back'] || 'Back'}</span>
                                    </button>
                                    <h2 style={{ margin: 0 }}>{currentCareer ? getTranslation('edit_job', 'Edit Job Posting') : getTranslation('add_job', 'Add New Job Posting')}</h2>
                                </div>
                            </div>
                            <form onSubmit={handleSubmit}>
                                <div className="card-body" style={{ padding: '30px' }}>
                                    <div className="form-grid">
                                        <div className="form-group">
                                            <label className="form-label">{getTranslation('job_title', 'Job Title')} *</label>
                                            <input 
                                                type="text" 
                                                className="form-control" 
                                                value={data.title}
                                                onChange={e => setData('title', e.target.value)}
                                                required 
                                            />
                                            {errors.title && <div className="text-error">{errors.title}</div>}
                                        </div>

                                        <div className="form-group">
                                            <label className="form-label">{getTranslation('location', 'Location')}</label>
                                            <input 
                                                type="text" 
                                                className="form-control" 
                                                value={data.location}
                                                onChange={e => setData('location', e.target.value)}
                                            />
                                            {errors.location && <div className="text-error">{errors.location}</div>}
                                        </div>

                                        <div className="form-group">
                                            <label className="form-label">{getTranslation('job_type', 'Job Type') || getTranslation('type', 'Job Type')} *</label>
                                            <select 
                                                className="form-control" 
                                                value={data.type}
                                                onChange={e => setData('type', e.target.value)}
                                                required
                                            >
                                                <option value="full-time">{getTranslation('full_time', 'Full-time')}</option>
                                                <option value="part-time">{getTranslation('part_time', 'Part-time')}</option>
                                                <option value="contract">{getTranslation('contract', 'Contract')}</option>
                                                <option value="remote">{getTranslation('remote', 'Remote')}</option>
                                                <option value="internship">{getTranslation('internship', 'Internship')}</option>
                                            </select>
                                            {errors.type && <div className="text-error">{errors.type}</div>}
                                        </div>

                                        <div className="form-group">
                                            <label className="form-label">{getTranslation('salary_range', 'Salary Range')}</label>
                                            <input 
                                                type="text" 
                                                className="form-control" 
                                                value={data.salary_range}
                                                onChange={e => setData('salary_range', e.target.value)}
                                                placeholder="e.g. $5000 - $7000"
                                            />
                                            {errors.salary_range && <div className="text-error">{errors.salary_range}</div>}
                                        </div>

                                        <div className="form-group">
                                            <label className="form-label">{translations['common.status'] || 'Status'}</label>
                                            <select 
                                                className="form-control" 
                                                value={data.is_active}
                                                onChange={e => setData('is_active', e.target.value === 'true')}
                                            >
                                                <option value="true">{translations['common.active'] || 'Active'}</option>
                                                <option value="false">{translations['common.inactive'] || 'Inactive'}</option>
                                            </select>
                                            {errors.is_active && <div className="text-error">{errors.is_active}</div>}
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">{getTranslation('description', 'Description')}</label>
                                        <textarea 
                                            className="form-control form-textarea" 
                                            value={data.description}
                                            onChange={e => setData('description', e.target.value)}
                                            rows="3"
                                        ></textarea>
                                        {errors.description && <div className="text-error">{errors.description}</div>}
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">{getTranslation('requirements', 'Requirements')}</label>
                                        <textarea 
                                            className="form-control form-textarea" 
                                            value={data.requirements}
                                            onChange={e => setData('requirements', e.target.value)}
                                            rows="3"
                                        ></textarea>
                                        {errors.requirements && <div className="text-error">{errors.requirements}</div>}
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">{getTranslation('responsibilities', 'Responsibilities')}</label>
                                        <textarea 
                                            className="form-control form-textarea" 
                                            value={data.responsibilities}
                                            onChange={e => setData('responsibilities', e.target.value)}
                                            rows="3"
                                        ></textarea>
                                        {errors.responsibilities && <div className="text-error">{errors.responsibilities}</div>}
                                    </div>
                                </div>
                                <div className="card-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px', padding: '20px 30px', borderTop: '1px solid #eee' }}>
                                    <button type="button" className="btn btn-outline" onClick={closeForm}>{translations['common.cancel'] || 'Cancel'}</button>
                                    <button type="submit" className="btn btn-primary" disabled={processing}>
                                        {currentCareer ? translations['common.update'] || 'Update Job Posting' : translations['common.save'] || 'Save Job Posting'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </BlankPage>
        </AdminLayout>
    );
};

export default Career;
