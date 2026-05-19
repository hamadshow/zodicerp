import React, { useState, useEffect, useMemo } from 'react';
import AdminLayout from '../components/AdminLayout';
import Table from '../components/Table';
import '../../../../css/backend/main.scss';
import { useForm, router, usePage } from '@inertiajs/react';

const Profession = ({ professions = [], departments = [] }) => {
    const { props } = usePage();
    const localization = props.localization;
    const isArabic = localization?.current_locale === 'ar';

    const getLocalizedRoute = (name, params = {}) => {
        return route(name, {
            country: localization?.country_code || 'sa',
            lang: localization?.current_locale || 'ar',
            ...params
        });
    };

    const getDepartmentName = (deptId) => {
        const dept = departments.find(d => d.id === parseInt(deptId));
        if (!dept) return deptId || '';
        return isArabic ? dept.name_ar : dept.name_en;
    };

    const [filteredProfessions, setFilteredProfessions] = useState(professions);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentProfession, setCurrentProfession] = useState(null);
    const [selectedIds, setSelectedIds] = useState([]);
    const [selectAll, setSelectAll] = useState(false);
    const [stats, setStats] = useState({
        total: 0,
        active: 0,
        employees: 0,
        vacant: 0
    });

    const { data, setData, post, put, processing, errors, reset } = useForm({
        company_id: 1, // Default company_id
        profession_name: '',
        profession_code: '',
        category: '',
        description: '',
        min_salary: 0,
        max_salary: 0,
        required_experience: 0,
        education_level: 'Bachelor',
        key_skills: '',
        status: 'active',
        sort_order: 0,
    });

    useEffect(() => {
        updateStats();
        filterProfessions();
    }, [professions, searchTerm]);

    const updateStats = () => {
        const total = professions.length;
        const active = professions.filter(p => p.status === 'active').length;
        const employees = professions.reduce((sum, p) => sum + (p.employees || 0), 0);
        const vacant = professions.filter(p => (p.employees || 0) === 0 && p.status === 'active').length;

        setStats({ total, active, employees, vacant });
    };

    const filterProfessions = () => {
        if (!searchTerm) {
            setFilteredProfessions(professions);
            return;
        }
        const lowerTerm = searchTerm.toLowerCase();
        const filtered = professions.filter(p => 
            p.profession_name.toLowerCase().includes(lowerTerm) ||
            p.profession_code.toLowerCase().includes(lowerTerm) ||
            getDepartmentName(p.category).toLowerCase().includes(lowerTerm)
        );
        setFilteredProfessions(filtered);
    };

    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
    };

    const handleRowSelect = (id) => {
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleSelectAll = () => {
        if (selectAll) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredProfessions.map(p => p.id));
        }
        setSelectAll(!selectAll);
    };

    const columns = useMemo(() => [
        { 
            header: 'ID', 
            key: 'id', 
            sortable: true,
            render: (row) => row.id.toString().padStart(3, '0')
        },
        { 
            header: 'PROFESSION', 
            key: 'profession_name', 
            sortable: true,
            render: (row) => (
                <div className="profession-info">
                    <div className="profession-icon" style={{ backgroundColor: getCategoryColor() }}>
                        <span className="material-icons-outlined">work</span>
                    </div>
                    <div className="profession-details">
                        <div className="profession-name">{row.profession_name}</div>
                        <div className="profession-category">{getDepartmentName(row.category)}</div>
                    </div>
                </div>
            )
        },
        { 
            header: 'CODE', 
            key: 'profession_code', 
            sortable: true,
            render: (row) => <strong>{row.profession_code}</strong>
        },
        { 
            header: 'EMPLOYEES', 
            key: 'employees', 
            sortable: true,
            render: (row) => (
                <div className="employee-count">
                    <span className="material-icons-outlined" style={{ fontSize: '16px' }}>people</span>
                    {row.employees || 0}
                </div>
            )
        },
        { 
            header: 'SALARY RANGE', 
            key: 'salary_range', 
            sortable: true,
            render: (row) => (
                <div className="salary-range">
                    ${row.min_salary ? parseFloat(row.min_salary).toLocaleString() : '0'} - ${row.max_salary ? parseFloat(row.max_salary).toLocaleString() : '0'}
                </div>
            )
        },
        { 
            header: 'STATUS', 
            key: 'status', 
            sortable: true,
            render: (row) => (
                <span className={`profession-status ${row.status === 'active' ? 'status-active' : 'status-inactive'}`}>
                    {row.status === 'active' ? 'Active' : 'Inactive'}
                </span>
            )
        },
        { 
            header: 'CREATED AT', 
            key: 'created_at', 
            sortable: true,
            render: (row) => new Date(row.created_at).toLocaleDateString()
        }
    ], [isArabic, departments]);

    const tableData = useMemo(() => {
        return filteredProfessions.map(p => ({
            ...p,
            selected: selectedIds.includes(p.id)
        }));
    }, [filteredProfessions, selectedIds]);

    const openModal = (prof = null) => {
        if (prof) {
            setCurrentProfession(prof);
            setData({
                company_id: prof.company_id || 1,
                profession_name: prof.profession_name,
                profession_code: prof.profession_code,
                category: prof.category || '',
                description: prof.description || '',
                min_salary: prof.min_salary || 0,
                max_salary: prof.max_salary || 0,
                required_experience: prof.required_experience || 0,
                education_level: prof.education_level || 'Bachelor',
                key_skills: prof.key_skills || '',
                status: prof.status || 'active',
                sort_order: prof.sort_order || 0,
            });
        } else {
            setCurrentProfession(null);
            reset();
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setCurrentProfession(null);
        reset();
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        if (currentProfession) {
            put(getLocalizedRoute('admin.professions.update', { profession: currentProfession.id }), {
                onSuccess: () => closeModal(),
            });
        } else {
            post(getLocalizedRoute('admin.professions.store'), {
                onSuccess: () => closeModal(),
            });
        }
    };

    const handleDelete = (id) => {
        if (window.confirm('Are you sure you want to delete this profession?')) {
            router.delete(getLocalizedRoute('admin.professions.destroy', { profession: id }));
        }
    };

    const getCategoryColor = () => {
        return 'var(--primary-color)';
    };

    return (
        <AdminLayout activeMenu="Profession">
            <div className="breadcrumb">
                <a href="#">Dashboard</a>
                <span>/</span>
                <a href="#">Human Resources</a>
                <span>/</span>
                <span>Professions</span>
            </div>

            {/* Quick Stats */}
            <div className="stats-cards">
                <div className="stat-card">
                    <div className="stat-icon" style={{ backgroundColor: 'var(--info-color)' }}>
                        <span className="material-icons-outlined">work</span>
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.total}</div>
                        <div className="stat-label">Total Professions</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ backgroundColor: 'var(--success-color)' }}>
                        <span className="material-icons-outlined">check_circle</span>
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.active}</div>
                        <div className="stat-label">Active Professions</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ backgroundColor: 'var(--warning-color)' }}>
                        <span className="material-icons-outlined">person</span>
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.employees}</div>
                        <div className="stat-label">Total Employees</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ backgroundColor: 'var(--danger-color)' }}>
                        <span className="material-icons-outlined">warning</span>
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.vacant}</div>
                        <div className="stat-label">Vacant Positions</div>
                    </div>
                </div>
            </div>

            {/* Main Card */}
            <div className="profession-card fade-in">
                <div className="card-header">
                    <div className="profession-actions">
                        <select className="btn btn-outline" defaultValue="">
                            <option disabled value="">Bulk Actions</option>
                            <option value="activate">Activate Selected</option>
                            <option value="deactivate">Deactivate Selected</option>
                            <option value="delete">Delete Selected</option>
                        </select>
                        <button className="btn btn-outline">
                            <span className="material-icons-outlined">play_arrow</span>
                            <span>Apply</span>
                        </button>
                        <div className="search-bar light">
                            <input 
                                type="text" 
                                placeholder="Search professions..." 
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
                            <span>Add Profession</span>
                        </button>
                        <button className="btn btn-outline" onClick={() => router.get(getLocalizedRoute('admin.professions.index'))}>
                            <span className="material-icons-outlined">refresh</span>
                            <span>Refresh</span>
                        </button>
                    </div>
                </div>

                <Table 
                    tableData={tableData}
                    columns={columns}
                    handleRowSelect={handleRowSelect}
                    selectAll={selectAll}
                    handleSelectAll={handleSelectAll}
                    onView={(row) => console.log('View', row)}
                    onEdit={(row) => openModal(row)}
                    onDelete={(row) => handleDelete(row.id)}
                    viewTitle={isArabic ? "عرض" : "View"}
                    editTitle={isArabic ? "تعديل" : "Edit"}
                    deleteTitle={isArabic ? "حذف" : "Delete"}
                />

                <div className="pagination">
                    <div className="pagination-info">
                        <select className="select-dropdown" defaultValue="10">
                            <option value="10">10</option>
                            <option value="25">25</option>
                            <option value="50">50</option>
                            <option value="100">100</option>
                        </select>
                        <span>Show from 1 to {filteredProfessions.length > 10 ? 10 : filteredProfessions.length} in <span style={{ backgroundColor: '#64748b', color: 'white', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>{filteredProfessions.length}</span> records</span>
                    </div>
                    <div className="pagination-controls">
                        <button className="page-btn">« Previous</button>
                        <button className="page-btn active">1</button>
                        <button className="page-btn">2</button>
                        <button className="page-btn">Next »</button>
                    </div>
                </div>
            </div>

            {/* Modal Overlay */}
            <div className={`modal-overlay ${isModalOpen ? 'active' : ''}`} onClick={(e) => { if(e.target.className.includes('modal-overlay')) closeModal(); }}>
                <div className="modal">
                    <div className="modal-header">
                        <h3 className="modal-title">{currentProfession ? 'Edit Profession' : 'Add New Profession'}</h3>
                        <button className="modal-close" onClick={closeModal}>
                            <span className="material-icons-outlined">close</span>
                        </button>
                    </div>
                    <form onSubmit={handleSubmit}>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Profession Name *</label>
                                <input 
                                    type="text" 
                                    className={`form-control ${errors.profession_name ? 'is-invalid' : ''}`} 
                                    value={data.profession_name} 
                                    onChange={e => setData('profession_name', e.target.value)} 
                                    placeholder="Enter profession name" 
                                    required 
                                />
                                {errors.profession_name && <div className="invalid-feedback">{errors.profession_name}</div>}
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Profession Code *</label>
                                    <input 
                                        type="text" 
                                        className={`form-control ${errors.profession_code ? 'is-invalid' : ''}`} 
                                        value={data.profession_code} 
                                        onChange={e => setData('profession_code', e.target.value.toUpperCase())} 
                                        placeholder="Enter profession code" 
                                        required 
                                    />
                                    {errors.profession_code && <div className="invalid-feedback">{errors.profession_code}</div>}
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Category (Department)</label>
                                    <select 
                                        className="form-control" 
                                        value={data.category} 
                                        onChange={e => setData('category', e.target.value)}
                                    >
                                        <option value="">Select Department</option>
                                        {departments.map(dept => (
                                            <option key={dept.id} value={dept.id}>
                                                {isArabic ? dept.name_ar : dept.name_en}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Description</label>
                                <textarea 
                                    className="form-control form-textarea" 
                                    value={data.description} 
                                    onChange={e => setData('description', e.target.value)} 
                                    placeholder="Enter profession description"
                                ></textarea>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Minimum Salary</label>
                                    <input 
                                        type="number" 
                                        className="form-control" 
                                        value={data.min_salary} 
                                        onChange={e => setData('min_salary', e.target.value)} 
                                        placeholder="Enter minimum salary" 
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Maximum Salary</label>
                                    <input 
                                        type="number" 
                                        className="form-control" 
                                        value={data.max_salary} 
                                        onChange={e => setData('max_salary', e.target.value)} 
                                        placeholder="Enter maximum salary" 
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Required Experience (Years)</label>
                                    <input 
                                        type="number" 
                                        className="form-control" 
                                        value={data.required_experience} 
                                        onChange={e => setData('required_experience', e.target.value)} 
                                        placeholder="Years of experience" 
                                        min="0" 
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Education Level</label>
                                    <select 
                                        className="form-control" 
                                        value={data.education_level} 
                                        onChange={e => setData('education_level', e.target.value)}
                                    >
                                        <option value="High School">High School</option>
                                        <option value="Diploma">Diploma</option>
                                        <option value="Bachelor">Bachelor's Degree</option>
                                        <option value="Master">Master's Degree</option>
                                        <option value="PhD">PhD</option>
                                    </select>
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Key Skills (comma separated)</label>
                                <input 
                                    type="text" 
                                    className="form-control" 
                                    value={data.key_skills} 
                                    onChange={e => setData('key_skills', e.target.value)} 
                                    placeholder="e.g., Communication, Leadership, Project Management" 
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Status</label>
                                    <select 
                                        className="form-control" 
                                        value={data.status} 
                                        onChange={e => setData('status', e.target.value)}
                                    >
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Sort Order</label>
                                    <input 
                                        type="number" 
                                        className="form-control" 
                                        value={data.sort_order} 
                                        onChange={e => setData('sort_order', e.target.value)} 
                                        min="0" 
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button type="button" className="btn" onClick={closeModal}>Cancel</button>
                            <button type="submit" className="btn btn-primary" disabled={processing}>
                                {processing ? 'Saving...' : 'Save Profession'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </AdminLayout>
    );
};

export default Profession;
