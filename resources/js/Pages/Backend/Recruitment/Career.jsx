import React, { useState, useEffect } from 'react';
import { Head, useForm, router, usePage, Link } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
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
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentCareer, setCurrentCareer] = useState(null);

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
        if (!searchTerm) {
            setFilteredCareers(careersData);
            return;
        }
        const lowerTerm = searchTerm.toLowerCase();
        const filtered = careersData.filter(c => 
            (c.title && c.title.toLowerCase().includes(lowerTerm)) ||
            (c.location && c.location.toLowerCase().includes(lowerTerm)) ||
            (c.type && c.type.toLowerCase().includes(lowerTerm))
        );
        setFilteredCareers(filtered);
    }, [propCareers, searchTerm]);

    const stats = {
        total: careersData.length,
        active: careersData.filter(c => c.is_active).length,
        fullTime: careersData.filter(c => c.type === 'full-time').length,
    };

    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
    };

    const openModal = (career = null) => {
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
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setCurrentCareer(null);
        reset();
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (currentCareer) {
            put(getLocalizedRoute('admin.careers.update', { career: currentCareer.id }), {
                onSuccess: () => closeModal(),
            });
        } else {
            post(getLocalizedRoute('admin.careers.store'), {
                onSuccess: () => closeModal(),
            });
        }
    };

    const handleDelete = (id) => {
        if (window.confirm(translations['confirm.delete'] || 'Are you sure you want to delete this job posting?')) {
            router.delete(getLocalizedRoute('admin.careers.destroy', { career: id }));
        }
    };

    return (
        <AdminLayout activeMenu={translations['sidebar.careers'] || 'Career'}>
            <Head title={translations['sidebar.careers'] || 'Careers Management'} />
            <div className="breadcrumb">
                <Link href={getLocalizedRoute('admin.dashboard')}>{translations['sidebar.Dashboard'] || 'Dashboard'}</Link>
                <span>/</span>
                <a href="#">{translations['sidebar.recruitment'] || 'Recruitment'}</a>
                <span>/</span>
                <span>{translations['sidebar.careers'] || 'Careers'}</span>
            </div>

            {/* Quick Stats */}
            <div className="stats-cards">
                <div className="stat-card">
                    <div className="stat-icon" style={{ backgroundColor: 'var(--primary-color)' }}>
                        <span className="material-icons-outlined">work</span>
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.total}</div>
                        <div className="stat-label">{translations['careers.total_jobs'] || 'Total Jobs'}</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ backgroundColor: 'var(--success-color)' }}>
                        <span className="material-icons-outlined">check_circle</span>
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.active}</div>
                        <div className="stat-label">{translations['careers.active_postings'] || 'Active Postings'}</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ backgroundColor: 'var(--info-color)' }}>
                        <span className="material-icons-outlined">timer</span>
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.fullTime}</div>
                        <div className="stat-label">{translations['careers.full_time_jobs'] || 'Full-Time Jobs'}</div>
                    </div>
                </div>
            </div>

            {/* Main Card */}
            <div className="career-card fade-in">
                <div className="card-header">
                    <div className="career-actions">
                        <div className="search-bar light">
                            <input 
                                type="text" 
                                placeholder={translations['common.search'] || 'Search careers...'}
                                value={searchTerm}
                                onChange={handleSearch}
                            />
                            <button>
                                <span className="material-icons-outlined">search</span>
                            </button>
                        </div>
                    </div>
                    <div className="actions">
                        <button className="btn btn-primary" onClick={() => openModal()}>
                            <span className="material-icons-outlined">add</span>
                            <span>{translations['careers.add_job'] || 'Add Job Posting'}</span>
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
                                <th>ID</th>
                                <th>{translations['careers.job_title'] || 'JOB TITLE'}</th>
                                <th>{translations['careers.location'] || 'LOCATION'}</th>
                                <th>{translations['careers.type'] || 'TYPE'}</th>
                                <th>{translations['careers.salary'] || 'SALARY'}</th>
                                <th>{translations['careers.status'] || 'STATUS'}</th>
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
                                            {career.type}
                                        </span>
                                    </td>
                                    <td>{career.salary_range || 'Not Specified'}</td>
                                    <td>
                                        <span className={`career-status status-${career.is_active ? 'active' : 'inactive'}`}>
                                            {career.is_active ? translations['common.active'] || 'Active' : translations['common.inactive'] || 'Inactive'}
                                        </span>
                                    </td>
                                    <td>
                                        <button className="icon-btn edit" onClick={() => openModal(career)}>
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

            {/* Modal Overlay */}
            <div className={`modal-overlay ${isModalOpen ? 'active' : ''}`} onClick={(e) => { if(e.target.className.includes('modal-overlay')) closeModal(); }}>
                <div className="modal modal-lg">
                    <div className="modal-header">
                        <h3 className="modal-title">{currentCareer ? translations['careers.edit_job'] || 'Edit Job Posting' : translations['careers.add_job'] || 'Add New Job Posting'}</h3>
                        <button className="modal-close" onClick={closeModal}>
                            <span className="material-icons-outlined">close</span>
                        </button>
                    </div>
                    <form onSubmit={handleSubmit}>
                        <div className="modal-body">
                            <div className="form-grid">
                                <div className="form-group">
                                    <label className="form-label">{translations['careers.job_title'] || 'Job Title'} *</label>
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
                                    <label className="form-label">{translations['careers.location'] || 'Location'}</label>
                                    <input 
                                        type="text" 
                                        className="form-control" 
                                        value={data.location}
                                        onChange={e => setData('location', e.target.value)}
                                    />
                                    {errors.location && <div className="text-error">{errors.location}</div>}
                                </div>

                                <div className="form-group">
                                    <label className="form-label">{translations['careers.job_type'] || 'Job Type'} *</label>
                                    <select 
                                        className="form-control" 
                                        value={data.type}
                                        onChange={e => setData('type', e.target.value)}
                                        required
                                    >
                                        <option value="full-time">{translations['careers.full_time'] || 'Full-time'}</option>
                                        <option value="part-time">{translations['careers.part_time'] || 'Part-time'}</option>
                                        <option value="contract">{translations['careers.contract'] || 'Contract'}</option>
                                        <option value="remote">{translations['careers.remote'] || 'Remote'}</option>
                                        <option value="internship">{translations['careers.internship'] || 'Internship'}</option>
                                    </select>
                                    {errors.type && <div className="text-error">{errors.type}</div>}
                                </div>

                                <div className="form-group">
                                    <label className="form-label">{translations['careers.salary_range'] || 'Salary Range'}</label>
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
                                <label className="form-label">{translations['careers.description'] || 'Description'}</label>
                                <textarea 
                                    className="form-control form-textarea" 
                                    value={data.description}
                                    onChange={e => setData('description', e.target.value)}
                                    rows="3"
                                ></textarea>
                                {errors.description && <div className="text-error">{errors.description}</div>}
                            </div>

                            <div className="form-group">
                                <label className="form-label">{translations['careers.requirements'] || 'Requirements'}</label>
                                <textarea 
                                    className="form-control form-textarea" 
                                    value={data.requirements}
                                    onChange={e => setData('requirements', e.target.value)}
                                    rows="3"
                                ></textarea>
                                {errors.requirements && <div className="text-error">{errors.requirements}</div>}
                            </div>

                            <div className="form-group">
                                <label className="form-label">{translations['careers.responsibilities'] || 'Responsibilities'}</label>
                                <textarea 
                                    className="form-control form-textarea" 
                                    value={data.responsibilities}
                                    onChange={e => setData('responsibilities', e.target.value)}
                                    rows="3"
                                ></textarea>
                                {errors.responsibilities && <div className="text-error">{errors.responsibilities}</div>}
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button type="button" className="btn" onClick={closeModal}>{translations['common.cancel'] || 'Cancel'}</button>
                            <button type="submit" className="btn btn-primary" disabled={processing}>
                                {currentCareer ? translations['common.update'] || 'Update Job Posting' : translations['common.save'] || 'Save Job Posting'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </AdminLayout>
    );
};

export default Career;
