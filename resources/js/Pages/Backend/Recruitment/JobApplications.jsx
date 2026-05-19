import React, { useState, useEffect } from 'react';
import { Head, router, usePage, Link } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import BlankPage from '@/Components/BlankPage';
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
    const [selectedApplication, setSelectedApplication] = useState(null);
    const [sortConfig, setSortConfig] = useState({ key: 'id', direction: 'asc' });
    const [previewDoc, setPreviewDoc] = useState(null);
    const [showDetails, setShowDetails] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);

    const [filteredApplications, setFilteredApplications] = useState(applicationsData);

    useEffect(() => {
        let result = [...applicationsData];
        
        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            result = result.filter(app => 
                (app.name && app.name.toLowerCase().includes(lowerTerm)) ||
                (app.email && app.email.toLowerCase().includes(lowerTerm)) ||
                (app.phone && app.phone.toLowerCase().includes(lowerTerm)) ||
                (app.career?.title && app.career.title.toLowerCase().includes(lowerTerm))
            );
        }

        if (statusFilter !== 'all') {
            result = result.filter(app => app.status === statusFilter);
        }

        if (sortConfig.key) {
            result.sort((a, b) => {
                if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
                if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        setFilteredApplications(result);
        setCurrentPage(1); // Reset to first page when filters change
    }, [propApplications, searchTerm, statusFilter, sortConfig]);

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredApplications.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredApplications.length / itemsPerPage);

    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

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

    const openDetails = (application) => {
        setSelectedApplication(application);
        setShowDetails(true);
        setPreviewDoc(null);
    };

    const backToList = () => {
        setShowDetails(false);
        setSelectedApplication(null);
        setPreviewDoc(null);
    };

    const handleViewDoc = (path, title) => {
        const cleanPath = path.startsWith('storage/') ? path.replace('storage/', '') : path;
        const url = `/storage/${cleanPath}`;
        const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(path);
        const isPdf = /\.pdf$/i.test(path);
        
        setPreviewDoc({ url, title, isImage, isPdf });
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

    const breadcrumbs = [
        { label: translations['sidebar.Dashboard'] || 'Dashboard', href: getLocalizedRoute('admin.dashboard') },
        { label: translations['sidebar.recruitment'] || 'Recruitment', onClick: (e) => { e.preventDefault(); backToList(); } },
        { label: translations['sidebar.job_applications'] || 'Job Applications' }
    ];

    if (showDetails) {
        breadcrumbs.push({ label: selectedApplication?.name });
    }

    const statsContent = !showDetails && (
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
    );

    return (
        <AdminLayout activeMenu={translations['sidebar.job_applications'] || 'Job Applications'}>
            <Head title={translations['sidebar.job_applications'] || 'Job Applications Management'} />
            
            <BlankPage breadcrumbs={breadcrumbs} stats={statsContent}>
                {!showDetails ? (
                    <div className="fade-in">
                        {/* Main Card */}
                        <div className="applications-card">
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
                                            <th onClick={() => requestSort('id')} style={{ cursor: 'pointer' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                    ID
                                                    <span className="material-icons-outlined" style={{ fontSize: '16px' }}>
                                                        {sortConfig.key === 'id' ? (sortConfig.direction === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'sort'}
                                                    </span>
                                                </div>
                                            </th>
                                            <th>{translations['applications.applicant'] || 'APPLICANT'}</th>
                                            <th>{translations['applications.job_title'] || 'JOB TITLE'}</th>
                                            <th>{translations['applications.date'] || 'DATE'}</th>
                                            <th>{translations['applications.status'] || 'STATUS'}</th>
                                            <th>{translations['common.operations'] || 'OPERATIONS'}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {currentItems.map(app => (
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
                                                    <button className="icon-btn view" onClick={() => openDetails(app)}>
                                                        <span className="material-icons-outlined">visibility</span>
                                                    </button>
                                                    <button className="icon-btn delete" onClick={() => handleDelete(app.id)}>
                                                        <span className="material-icons-outlined">delete</span>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {currentItems.length === 0 && (
                                            <tr>
                                                <td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>
                                                    {translations['common.no_data'] || 'No applications found.'}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="pagination-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px' }}>
                                    <div className="pagination-info">
                                        {translations['common.showing'] || 'Showing'} {indexOfFirstItem + 1} {translations['common.to'] || 'to'} {Math.min(indexOfLastItem, filteredApplications.length)} {translations['common.of'] || 'of'} {filteredApplications.length} {translations['common.entries'] || 'entries'}
                                    </div>
                                    <div className="pagination-actions" style={{ display: 'flex', gap: '5px' }}>
                                        <button 
                                            className="btn btn-outline btn-sm" 
                                            disabled={currentPage === 1}
                                            onClick={() => paginate(currentPage - 1)}
                                        >
                                            <span className="material-icons-outlined">chevron_left</span>
                                        </button>
                                        {[...Array(totalPages)].map((_, i) => (
                                            <button 
                                                key={i} 
                                                className={`btn btn-sm ${currentPage === i + 1 ? 'btn-primary' : 'btn-outline'}`}
                                                onClick={() => paginate(i + 1)}
                                            >
                                                {i + 1}
                                            </button>
                                        ))}
                                        <button 
                                            className="btn btn-outline btn-sm" 
                                            disabled={currentPage === totalPages}
                                            onClick={() => paginate(currentPage + 1)}
                                        >
                                            <span className="material-icons-outlined">chevron_right</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    /* Application Details View */
                    <div className="fade-in">
                        <div className="card">
                            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    <button className="btn btn-outline btn-sm" onClick={backToList}>
                                        <span className="material-icons-outlined">arrow_back</span>
                                        <span>{translations['common.back'] || 'Back'}</span>
                                    </button>
                                    <h2 style={{ margin: 0 }}>{translations['applications.details'] || 'Application Details'} - {selectedApplication.name}</h2>
                                </div>
                                <div className="status-badge-container">
                                    <span className={`application-status status-${selectedApplication.status}`}>
                                        {translations[`applications.${selectedApplication.status}`] || selectedApplication.status}
                                    </span>
                                </div>
                            </div>
                            <div className="card-body" style={{ padding: '30px' }}>
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
                                            <button 
                                                type="button"
                                                className={`file-link ${previewDoc?.url?.includes(selectedApplication.cv_path) ? 'active' : ''}`}
                                                onClick={() => handleViewDoc(selectedApplication.cv_path, translations['applications.view_cv'] || 'View CV')}
                                            >
                                                <span className="material-icons-outlined">description</span>
                                                <span>{translations['applications.view_cv'] || 'View CV'}</span>
                                            </button>
                                            {selectedApplication.certificates_path && (
                                                <button 
                                                    type="button"
                                                    className={`file-link ${previewDoc?.url?.includes(selectedApplication.certificates_path) ? 'active' : ''}`}
                                                    onClick={() => handleViewDoc(selectedApplication.certificates_path, translations['applications.view_certificates'] || 'View Certificates')}
                                                >
                                                    <span className="material-icons-outlined">workspace_premium</span>
                                                    <span>{translations['applications.view_certificates'] || 'View Certificates'}</span>
                                                </button>
                                            )}
                                        </div>

                                        {/* Document Preview Area */}
                                        {previewDoc && (
                                            <div className="doc-preview-container fade-in">
                                                <div className="preview-header">
                                                    <span>{previewDoc.title}</span>
                                                    <div className="preview-actions">
                                                        <a href={previewDoc.url} download className="icon-btn" title="Download">
                                                            <span className="material-icons-outlined">download</span>
                                                        </a>
                                                        <button type="button" className="icon-btn" onClick={() => setPreviewDoc(null)}>
                                                            <span className="material-icons-outlined">close</span>
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="preview-content">
                                                    {previewDoc.isImage ? (
                                                        <img src={previewDoc.url} alt={previewDoc.title} />
                                                    ) : previewDoc.isPdf ? (
                                                        <iframe src={previewDoc.url} title={previewDoc.title}></iframe>
                                                    ) : (
                                                        <div className="unsupported-format">
                                                            <span className="material-icons-outlined">error_outline</span>
                                                            <p>Preview not available for this format. Please download to view.</p>
                                                            <a href={previewDoc.url} download className="btn btn-primary">Download File</a>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {selectedApplication.message && (
                                            <div className="message-box" style={{ marginTop: '20px' }}>
                                                <label>{translations['applications.message'] || 'Message'}:</label>
                                                <p>{selectedApplication.message}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="card-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 30px', borderTop: '1px solid #eee' }}>
                                <div className="status-update-actions" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    <label style={{ fontWeight: 600 }}>{translations['applications.update_status'] || 'Update Status'}:</label>
                                    <div className="btn-group" style={{ display: 'flex', gap: '8px' }}>
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
                                <button type="button" className="btn btn-secondary" onClick={backToList}>
                                    {translations['common.close'] || 'Close'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </BlankPage>
        </AdminLayout>
    );
};

export default JobApplications;

