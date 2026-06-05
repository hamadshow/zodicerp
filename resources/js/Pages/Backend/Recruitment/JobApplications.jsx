import React, { useState, useMemo, useCallback } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import Table from '../components/Table';
import BlankPage from '@/Components/BlankPage';
import '../../../../css/backend/main.scss';

const JobApplications = ({ applications: propApplications }) => {
    const { props } = usePage();
    const localization = props.localization;
    const translations = localization?.translations || {};

    const getLocalizedRoute = useCallback((name, params = {}) => {
        try {
            return route(name, {
                country: localization?.country_code || 'sa',
                lang: localization?.current_locale || 'ar',
                ...params
            });
        } catch {
            return '#';
        }
    }, [localization]);

    const applicationsData = propApplications?.data || (Array.isArray(propApplications) ? propApplications : []);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [showDetails, setShowDetails] = useState(false);
    const [selectedApplication, setSelectedApplication] = useState(null);
    const [previewDoc, setPreviewDoc] = useState(null);
    const [toast, setToast] = useState(null);

    const showToast = (message, type = 'info') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const filteredApplications = useMemo(() => {
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

        return result;
    }, [applicationsData, searchTerm, statusFilter]);

    const stats = useMemo(() => ({
        total: applicationsData.length,
        pending: applicationsData.filter(app => app.status === 'pending').length,
        accepted: applicationsData.filter(app => app.status === 'accepted').length,
        rejected: applicationsData.filter(app => app.status === 'rejected').length,
    }), [applicationsData]);

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
                    showToast('Status updated successfully', 'success');
                    if (selectedApplication?.id === id) {
                        setSelectedApplication(prev => ({ ...prev, status: newStatus }));
                    }
                }
            });
        }
    };

    const handleDelete = (id) => {
        if (window.confirm(translations['confirm.delete'] || 'Are you sure you want to delete this application?')) {
            router.delete(getLocalizedRoute('admin.careers.applications.destroy', { application: id }), {
                onSuccess: () => showToast('Application deleted successfully', 'success')
            });
        }
    };

    const columns = useMemo(() => [
        { 
            header: 'ID', 
            key: 'id', 
            sortable: true,
            render: (row) => row.id.toString().padStart(3, '0')
        },
        { 
            header: translations['applications.applicant'] || 'APPLICANT', 
            key: 'name', 
            sortable: true,
            render: (row) => (
                <div className="employee-info">
                    <div className="employee-avatar">
                        <span className="material-icons-outlined" style={{ color: '#94a3b8' }}>person</span>
                    </div>
                    <div className="employee-details">
                        <div className="employee-name" style={{ fontWeight: 600 }}>{row.name}</div>
                        <div className="employee-position" style={{ fontSize: '0.8rem', color: '#64748b' }}>{row.email}</div>
                    </div>
                </div>
            )
        },
        { 
            header: translations['applications.job_title'] || 'JOB TITLE', 
            key: 'job_title',
            render: (row) => <span className="department-badge">{row.career?.title || 'N/A'}</span>
        },
        { 
            header: translations['applications.date'] || 'DATE', 
            key: 'created_at', 
            sortable: true,
            render: (row) => new Date(row.created_at).toLocaleDateString()
        },
        { 
            header: translations['applications.status'] || 'STATUS', 
            key: 'status', 
            sortable: true,
            render: (row) => (
                <span className={`employee-status status-${row.status}`}>
                    {translations[`applications.${row.status}`] || row.status}
                </span>
            )
        }
    ], [translations]);

    const breadcrumbs = [
        { label: translations['sidebar.Dashboard'] || 'Dashboard', href: getLocalizedRoute('admin.dashboard') },
        { label: translations['sidebar.recruitment'] || 'Recruitment', onClick: (e) => { e.preventDefault(); backToList(); } },
        { label: translations['sidebar.job_applications'] || 'Job Applications', active: !showDetails }
    ];

    if (showDetails) {
        breadcrumbs.push({ label: selectedApplication?.name, active: true });
    }

    return (
        <AdminLayout activeMenu={translations['sidebar.job_applications'] || 'Job Applications'}>
            <Head title={translations['sidebar.job_applications'] || 'Job Applications Management'} />
            
            {toast && (
                <div className={`toast toast-${toast.type}`}>{toast.message}</div>
            )}

            <BlankPage 
                breadcrumbs={breadcrumbs} 
                stats={!showDetails && (
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
                )}
                filters={!showDetails && (
                    <div className="attendance-summary" style={{ marginBottom: '20px' }}>
                        <div className="attendance-buttons">
                            {['all', 'pending', 'reviewed', 'accepted', 'rejected'].map((status) => (
                                <button
                                    key={status}
                                    className={`attendance-btn ${statusFilter === status ? 'active' : ''}`}
                                    onClick={() => setStatusFilter(status)}
                                >
                                    {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
                                </button>
                            ))}
                        </div>
                        <div style={{ marginLeft: 'auto' }}>
                            <button className="btn btn-outline" onClick={() => router.reload()}>
                                <span className="material-icons-outlined">refresh</span>
                                <span>{translations['common.refresh'] || 'Refresh'}</span>
                            </button>
                        </div>
                    </div>
                )}
            >
                {!showDetails ? (
                    <div className="employees-card fade-in">
                        <Table
                            showToolbar={true}
                            toolbarSearch={true}
                            toolbarSearchValue={searchTerm}
                            onToolbarSearch={setSearchTerm}
                            tableData={filteredApplications}
                            columns={columns}
                            onView={(row) => openDetails(row)}
                            onDelete={(row) => handleDelete(row.id)}
                        />
                    </div>
                ) : (
                    <div className="employees-card fade-in">
                        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px', borderBottom: '1px solid #e2e8f0' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <button className="btn btn-outline btn-sm" onClick={backToList}>
                                    <span className="material-icons-outlined">arrow_back</span>
                                    <span>{translations['common.back'] || 'Back'}</span>
                                </button>
                                <h3 style={{ margin: 0 }}>{translations['applications.details'] || 'Application Details'} - {selectedApplication.name}</h3>
                            </div>
                            <span className={`employee-status status-${selectedApplication.status}`}>
                                {translations[`applications.${selectedApplication.status}`] || selectedApplication.status}
                            </span>
                        </div>
                        
                        <div className="card-body" style={{ padding: '25px' }}>
                            <div className="application-details-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>
                                <div className="details-section">
                                    <h4 className="section-title" style={{ borderBottom: '2px solid #f1f5f9', paddingBottom: '10px', marginBottom: '15px', color: '#1e293b' }}>
                                        {translations['applications.personal_info'] || 'Personal Information'}
                                    </h4>
                                    <div className="info-grid" style={{ display: 'grid', gap: '12px' }}>
                                        <div className="info-item">
                                            <label style={{ color: '#64748b', fontSize: '0.85rem', display: 'block' }}>{translations['applications.name'] || 'Full Name'}</label>
                                            <span style={{ fontWeight: 500 }}>{selectedApplication.name}</span>
                                        </div>
                                        <div className="info-item">
                                            <label style={{ color: '#64748b', fontSize: '0.85rem', display: 'block' }}>{translations['applications.email'] || 'Email'}</label>
                                            <span style={{ fontWeight: 500 }}>{selectedApplication.email}</span>
                                        </div>
                                        <div className="info-item">
                                            <label style={{ color: '#64748b', fontSize: '0.85rem', display: 'block' }}>{translations['applications.phone'] || 'Phone'}</label>
                                            <span style={{ fontWeight: 500 }}>{selectedApplication.phone}</span>
                                        </div>
                                        <div className="info-item">
                                            <label style={{ color: '#64748b', fontSize: '0.85rem', display: 'block' }}>{translations['applications.gender'] || 'Gender'}</label>
                                            <span style={{ fontWeight: 500 }}>{translations[`common.${selectedApplication.gender}`] || selectedApplication.gender}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="details-section">
                                    <h4 className="section-title" style={{ borderBottom: '2px solid #f1f5f9', paddingBottom: '10px', marginBottom: '15px', color: '#1e293b' }}>
                                        {translations['applications.job_specifics'] || 'Job Specifics'}
                                    </h4>
                                    <div className="info-grid" style={{ display: 'grid', gap: '12px' }}>
                                        <div className="info-item">
                                            <label style={{ color: '#64748b', fontSize: '0.85rem', display: 'block' }}>{translations['applications.applying_for'] || 'Applying For'}</label>
                                            <span className="department-badge">{selectedApplication.career?.title}</span>
                                        </div>
                                        <div className="info-item">
                                            <label style={{ color: '#64748b', fontSize: '0.85rem', display: 'block' }}>{translations['applications.experience'] || 'Experience'}</label>
                                            <span style={{ fontWeight: 500 }}>{selectedApplication.experience_years} {translations['common.years'] || 'Years'}</span>
                                        </div>
                                        <div className="info-item">
                                            <label style={{ color: '#64748b', fontSize: '0.85rem', display: 'block' }}>{translations['applications.expected_salary'] || 'Expected Salary'}</label>
                                            <span style={{ fontWeight: 500 }}>{selectedApplication.expected_salary || 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="details-section full-width" style={{ gridColumn: '1 / -1' }}>
                                    <h4 className="section-title" style={{ borderBottom: '2px solid #f1f5f9', paddingBottom: '10px', marginBottom: '15px', color: '#1e293b' }}>
                                        {translations['applications.files_message'] || 'Files & Message'}
                                    </h4>
                                    <div className="files-container" style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
                                        <button 
                                            type="button"
                                            className={`btn ${previewDoc?.url?.includes(selectedApplication.cv_path) ? 'btn-primary' : 'btn-outline'}`}
                                            onClick={() => handleViewDoc(selectedApplication.cv_path, translations['applications.view_cv'] || 'View CV')}
                                        >
                                            <span className="material-icons-outlined">description</span>
                                            <span>{translations['applications.view_cv'] || 'View CV'}</span>
                                        </button>
                                        {selectedApplication.certificates_path && (
                                            <button 
                                                type="button"
                                                className={`btn ${previewDoc?.url?.includes(selectedApplication.certificates_path) ? 'btn-primary' : 'btn-outline'}`}
                                                onClick={() => handleViewDoc(selectedApplication.certificates_path, translations['applications.view_certificates'] || 'View Certificates')}
                                            >
                                                <span className="material-icons-outlined">workspace_premium</span>
                                                <span>{translations['applications.view_certificates'] || 'View Certificates'}</span>
                                            </button>
                                        )}
                                    </div>

                                    {previewDoc && (
                                        <div className="doc-preview-container fade-in" style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', marginTop: '15px' }}>
                                            <div className="preview-header" style={{ background: '#f8fafc', padding: '10px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0' }}>
                                                <span style={{ fontWeight: 600 }}>{previewDoc.title}</span>
                                                <div className="preview-actions" style={{ display: 'flex', gap: '10px' }}>
                                                    <a href={previewDoc.url} download className="btn btn-sm btn-outline" title="Download">
                                                        <span className="material-icons-outlined" style={{ fontSize: '18px' }}>download</span>
                                                    </a>
                                                    <button type="button" className="btn btn-sm btn-outline" onClick={() => setPreviewDoc(null)}>
                                                        <span className="material-icons-outlined" style={{ fontSize: '18px' }}>close</span>
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="preview-content" style={{ height: '600px', background: '#fff' }}>
                                                {previewDoc.isImage ? (
                                                    <img src={previewDoc.url} alt={previewDoc.title} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                                ) : previewDoc.isPdf ? (
                                                    <iframe src={previewDoc.url} title={previewDoc.title} style={{ width: '100%', height: '100%', border: 'none' }}></iframe>
                                                ) : (
                                                    <div style={{ padding: '40px', textAlign: 'center' }}>
                                                        <span className="material-icons-outlined" style={{ fontSize: '48px', color: '#94a3b8', marginBottom: '15px' }}>error_outline</span>
                                                        <p>Preview not available. Please download to view.</p>
                                                        <a href={previewDoc.url} download className="btn btn-primary">Download File</a>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {selectedApplication.message && (
                                        <div className="message-box" style={{ marginTop: '20px', background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                            <label style={{ fontWeight: 600, display: 'block', marginBottom: '8px' }}>{translations['applications.message'] || 'Message'}</label>
                                            <p style={{ margin: 0, color: '#475569', lineHeight: 1.6 }}>{selectedApplication.message}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        
                        <div className="card-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '20px', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                            <button 
                                className={`btn ${selectedApplication.status === 'reviewed' ? 'btn-info' : 'btn-outline'}`}
                                onClick={() => handleUpdateStatus(selectedApplication.id, 'reviewed')}
                            >
                                {translations['applications.reviewed'] || 'Mark as Reviewed'}
                            </button>
                            <button 
                                className={`btn ${selectedApplication.status === 'accepted' ? 'btn-success' : 'btn-outline'}`}
                                onClick={() => handleUpdateStatus(selectedApplication.id, 'accepted')}
                            >
                                {translations['applications.accepted'] || 'Accept'}
                            </button>
                            <button 
                                className={`btn ${selectedApplication.status === 'rejected' ? 'btn-danger' : 'btn-outline'}`}
                                onClick={() => handleUpdateStatus(selectedApplication.id, 'rejected')}
                            >
                                {translations['applications.rejected'] || 'Reject'}
                            </button>
                        </div>
                    </div>
                )}
            </BlankPage>
        </AdminLayout>
    );
};

export default JobApplications;
