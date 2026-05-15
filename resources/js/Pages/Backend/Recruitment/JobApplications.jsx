import React, { useState, useEffect } from 'react';
import { Head, router, usePage, Link } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import '../../../../css/backend/main.scss';

const JobApplications = ({ applications: propApplications }) => {
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

    const applicationsData = propApplications?.data || (Array.isArray(propApplications) ? propApplications : []);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [selectedApplication, setSelectedApplication] = useState(null);

    const [filteredApplications, setFilteredApplications] = useState(applicationsData);

    useEffect(() => {
        let filtered = applicationsData;
        
        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            filtered = filtered.filter(app => 
                (app.name && app.name.toLowerCase().includes(lowerTerm)) ||
                (app.email && app.email.toLowerCase().includes(lowerTerm)) ||
                (app.phone && app.phone.toLowerCase().includes(lowerTerm)) ||
                (app.career?.title && app.career.title.toLowerCase().includes(lowerTerm))
            );
        }

        if (statusFilter !== 'all') {
            filtered = filtered.filter(app => app.status === statusFilter);
        }

        setFilteredApplications(filtered);
    }, [propApplications, searchTerm, statusFilter]);

    const stats = {
        total: applicationsData.length,
        pending: applicationsData.filter(app => app.status === 'pending').length,
        reviewed: applicationsData.filter(app => app.status === 'reviewed').length,
        accepted: applicationsData.filter(app => app.status === 'accepted').length,
        rejected: applicationsData.filter(app => app.status === 'rejected').length,
    };

    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
    };

    const openViewModal = (application) => {
        setSelectedApplication(application);
        setIsViewModalOpen(true);
    };

    const closeViewModal = () => {
        setIsViewModalOpen(false);
        setSelectedApplication(null);
    };

    const handleUpdateStatus = (id, newStatus) => {
        if (window.confirm(translations['confirm.update_status'] || 'Are you sure you want to update the status of this application?')) {
            router.put(getLocalizedRoute('admin.careers.applications.update', { application: id }), {
                status: newStatus
            }, {
                onSuccess: () => {
                    if (selectedApplication?.id === id) {
                        setSelectedApplication(prev => ({ ...prev, status: newStatus }));
                    }
                }
            });
        }
    };

    const handleDelete = (id) => {
        if (window.confirm(translations['confirm.delete'] || 'Are you sure you want to delete this application?')) {
            router.delete(getLocalizedRoute('admin.careers.applications.destroy', { application: id }));
        }
    };

    return (
        <AdminLayout activeMenu={translations['sidebar.job_applications'] || 'Job Applications'}>
            <Head title={translations['sidebar.job_applications'] || 'Job Applications Management'} />
            <div className="breadcrumb">
                <Link href={getLocalizedRoute('admin.dashboard')}>{translations['sidebar.Dashboard'] || 'Dashboard'}</Link>
                <span>/</span>
                <a href="#">{translations['sidebar.recruitment'] || 'Recruitment'}</a>
                <span>/</span>
                <span>{translations['sidebar.job_applications'] || 'Job Applications'}</span>
            </div>

            {/* Quick Stats */}
            <div className="stats-cards">
                <div className="stat-card">
                    <div className="stat-icon" style={{ backgroundColor: 'var(--primary-color)' }}>
                        <span className="material-icons-outlined">assignment</span>
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.total}</div>
                        <div className="stat-label">{translations['applications.total'] || 'Total Applications'}</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ backgroundColor: 'var(--warning-color)' }}>
                        <span className="material-icons-outlined">pending_actions</span>
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.pending}</div>
                        <div className="stat-label">{translations['applications.pending'] || 'Pending'}</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ backgroundColor: 'var(--success-color)' }}>
                        <span className="material-icons-outlined">check_circle</span>
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.accepted}</div>
                        <div className="stat-label">{translations['applications.accepted'] || 'Accepted'}</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ backgroundColor: 'var(--danger-color)' }}>
                        <span className="material-icons-outlined">cancel</span>
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.rejected}</div>
                        <div className="stat-label">{translations['applications.rejected'] || 'Rejected'}</div>
                    </div>
                </div>
            </div>

            {/* Main Card */}
            <div className="applications-card fade-in">
                <div className="card-header">
                    <div className="applications-actions">
                        <div className="search-bar light">
                            <input 
                                type="text" 
                                placeholder={translations['common.search'] || 'Search applications...'}
                                value={searchTerm}
                                onChange={handleSearch}
                            />
                            <button>
                                <span className="material-icons-outlined">search</span>
                            </button>
                        </div>
                        <div className="filter-group">
                            <select 
                                className="form-control" 
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option value="all">{translations['common.all_status'] || 'All Status'}</option>
                                <option value="pending">{translations['applications.pending'] || 'Pending'}</option>
                                <option value="reviewed">{translations['applications.reviewed'] || 'Reviewed'}</option>
                                <option value="accepted">{translations['applications.accepted'] || 'Accepted'}</option>
                                <option value="rejected">{translations['applications.rejected'] || 'Rejected'}</option>
                            </select>
                        </div>
                    </div>
                    <div className="actions">
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
                                <th>{translations['applications.applicant'] || 'APPLICANT'}</th>
                                <th>{translations['applications.job_title'] || 'JOB TITLE'}</th>
                                <th>{translations['applications.date'] || 'DATE'}</th>
                                <th>{translations['applications.status'] || 'STATUS'}</th>
                                <th>{translations['common.operations'] || 'OPERATIONS'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredApplications.map(app => (
                                <tr key={app.id}>
                                    <td><input type="checkbox" className="application-checkbox" /></td>
                                    <td>{app.id.toString().padStart(3, '0')}</td>
                                    <td>
                                        <div className="applicant-info">
                                            <div className="applicant-name">{app.name}</div>
                                            <div className="applicant-contact">{app.email}</div>
                                        </div>
                                    </td>
                                    <td>{app.career?.title || 'N/A'}</td>
                                    <td>{new Date(app.created_at).toLocaleDateString()}</td>
                                    <td>
                                        <span className={`application-status status-${app.status}`}>
                                            {translations[`applications.${app.status}`] || app.status}
                                        </span>
                                    </td>
                                    <td>
                                        <button className="icon-btn view" onClick={() => openViewModal(app)}>
                                            <span className="material-icons-outlined">visibility</span>
                                        </button>
                                        <button className="icon-btn delete" onClick={() => handleDelete(app.id)}>
                                            <span className="material-icons-outlined">delete</span>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filteredApplications.length === 0 && (
                                <tr>
                                    <td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>
                                        {translations['common.no_data'] || 'No applications found.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* View Modal */}
            {isViewModalOpen && selectedApplication && (
                <div className={`modal-overlay active`} onClick={(e) => { if(e.target.className.includes('modal-overlay')) closeViewModal(); }}>
                    <div className="modal modal-xl">
                        <div className="modal-header">
                            <h3 className="modal-title">{translations['applications.details'] || 'Application Details'} - {selectedApplication.name}</h3>
                            <button className="modal-close" onClick={closeViewModal}>
                                <span className="material-icons-outlined">close</span>
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="application-details-grid">
                                <div className="details-section">
                                    <h4 className="section-title">{translations['applications.personal_info'] || 'Personal Information'}</h4>
                                    <div className="info-grid">
                                        <div className="info-item">
                                            <label>{translations['applications.name'] || 'Full Name'}:</label>
                                            <span>{selectedApplication.name}</span>
                                        </div>
                                        <div className="info-item">
                                            <label>{translations['applications.email'] || 'Email'}:</label>
                                            <span>{selectedApplication.email}</span>
                                        </div>
                                        <div className="info-item">
                                            <label>{translations['applications.phone'] || 'Phone'}:</label>
                                            <span>{selectedApplication.phone}</span>
                                        </div>
                                        <div className="info-item">
                                            <label>{translations['applications.gender'] || 'Gender'}:</label>
                                            <span>{translations[`common.${selectedApplication.gender}`] || selectedApplication.gender}</span>
                                        </div>
                                        <div className="info-item">
                                            <label>{translations['applications.age'] || 'Age'}:</label>
                                            <span>{selectedApplication.age}</span>
                                        </div>
                                        <div className="info-item">
                                            <label>{translations['applications.nationality'] || 'Nationality'}:</label>
                                            <span>{selectedApplication.nationality}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="details-section">
                                    <h4 className="section-title">{translations['applications.address_info'] || 'Address Information'}</h4>
                                    <div className="info-grid">
                                        <div className="info-item">
                                            <label>{translations['applications.country'] || 'Country'}:</label>
                                            <span>{selectedApplication.country}</span>
                                        </div>
                                        <div className="info-item">
                                            <label>{translations['applications.city'] || 'City'}:</label>
                                            <span>{selectedApplication.city}</span>
                                        </div>
                                        <div className="info-item">
                                            <label>{translations['applications.area'] || 'Area'}:</label>
                                            <span>{selectedApplication.area || 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="details-section">
                                    <h4 className="section-title">{translations['applications.education_exp'] || 'Education & Experience'}</h4>
                                    <div className="info-grid">
                                        <div className="info-item">
                                            <label>{translations['applications.qualification'] || 'Qualification'}:</label>
                                            <span>{selectedApplication.qualification}</span>
                                        </div>
                                        <div className="info-item">
                                            <label>{translations['applications.specialization'] || 'Specialization'}:</label>
                                            <span>{selectedApplication.specialization || 'N/A'}</span>
                                        </div>
                                        <div className="info-item">
                                            <label>{translations['applications.experience'] || 'Experience'}:</label>
                                            <span>{selectedApplication.experience_years} {translations['common.years'] || 'Years'}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="details-section">
                                    <h4 className="section-title">{translations['applications.job_specifics'] || 'Job Specifics'}</h4>
                                    <div className="info-grid">
                                        <div className="info-item">
                                            <label>{translations['applications.applying_for'] || 'Applying For'}:</label>
                                            <span className="highlight">{selectedApplication.career?.title}</span>
                                        </div>
                                        <div className="info-item">
                                            <label>{translations['applications.expected_salary'] || 'Expected Salary'}:</label>
                                            <span>{selectedApplication.expected_salary ? `${selectedApplication.expected_salary}` : 'N/A'}</span>
                                        </div>
                                        <div className="info-item">
                                            <label>{translations['applications.availability'] || 'Availability'}:</label>
                                            <span>{selectedApplication.availability_date || 'N/A'}</span>
                                        </div>
                                        <div className="info-item">
                                            <label>{translations['applications.shift_type'] || 'Shift Type'}:</label>
                                            <span>{selectedApplication.shift_type || 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="details-section full-width">
                                    <h4 className="section-title">{translations['applications.files_message'] || 'Files & Message'}</h4>
                                    <div className="files-container">
                                        <a href={`/storage/${selectedApplication.cv_path}`} target="_blank" rel="noopener noreferrer" className="file-link">
                                            <span className="material-icons-outlined">description</span>
                                            <span>{translations['applications.view_cv'] || 'View CV'}</span>
                                        </a>
                                        {selectedApplication.certificates_path && (
                                            <a href={`/storage/${selectedApplication.certificates_path}`} target="_blank" rel="noopener noreferrer" className="file-link">
                                                <span className="material-icons-outlined">workspace_premium</span>
                                                <span>{translations['applications.view_certificates'] || 'View Certificates'}</span>
                                            </a>
                                        )}
                                    </div>
                                    {selectedApplication.message && (
                                        <div className="message-box">
                                            <label>{translations['applications.message'] || 'Message'}:</label>
                                            <p>{selectedApplication.message}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <div className="status-update-actions">
                                <label>{translations['applications.update_status'] || 'Update Status'}:</label>
                                <div className="btn-group">
                                    <button 
                                        className={`btn btn-sm ${selectedApplication.status === 'reviewed' ? 'btn-info' : 'btn-outline'}`}
                                        onClick={() => handleUpdateStatus(selectedApplication.id, 'reviewed')}
                                    >
                                        {translations['applications.reviewed'] || 'Reviewed'}
                                    </button>
                                    <button 
                                        className={`btn btn-sm ${selectedApplication.status === 'accepted' ? 'btn-success' : 'btn-outline'}`}
                                        onClick={() => handleUpdateStatus(selectedApplication.id, 'accepted')}
                                    >
                                        {translations['applications.accepted'] || 'Accepted'}
                                    </button>
                                    <button 
                                        className={`btn btn-sm ${selectedApplication.status === 'rejected' ? 'btn-danger' : 'btn-outline'}`}
                                        onClick={() => handleUpdateStatus(selectedApplication.id, 'rejected')}
                                    >
                                        {translations['applications.rejected'] || 'Rejected'}
                                    </button>
                                </div>
                            </div>
                            <button type="button" className="btn btn-secondary" onClick={closeViewModal}>
                                {translations['common.close'] || 'Close'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
};

export default JobApplications;
