import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import '../../../../css/backend/main.scss';


const Departments = () => {
    // Sample department data
    const initialDepartments = [
        {
            id: 1,
            name: 'Information Technology',
            code: 'IT',
            head: 'Ahmed Mohamed',
            headId: 'ahmed',
            employees: 24,
            budget: 500000,
            location: 'Floor 3, Building A',
            status: 'active',
            icon: 'computer',
            color: '#3b82f6',
            description: 'Responsible for software development, infrastructure, and technical support.',
            createdAt: '2023-01-15'
        },
        {
            id: 2,
            name: 'Human Resources',
            code: 'HR',
            head: 'Sarah Johnson',
            headId: 'sarah',
            employees: 12,
            budget: 300000,
            location: 'Floor 2, Building A',
            status: 'active',
            icon: 'people',
            color: '#10b981',
            description: 'Handles recruitment, employee relations, training, and benefits administration.',
            createdAt: '2022-03-10'
        },
        {
            id: 3,
            name: 'Sales Department',
            code: 'SALES',
            head: 'James Wilson',
            headId: 'james',
            employees: 32,
            budget: 800000,
            location: 'Floor 1, Building B',
            status: 'active',
            icon: 'trending_up',
            color: '#ef4444',
            description: 'Responsible for sales strategy, client acquisition, and revenue growth.',
            createdAt: '2021-11-20'
        },
        {
            id: 4,
            name: 'Marketing',
            code: 'MKT',
            head: 'Fatima Al-Mansour',
            headId: 'fatima',
            employees: 18,
            budget: 450000,
            location: 'Floor 2, Building B',
            status: 'active',
            icon: 'campaign',
            color: '#8b5cf6',
            description: 'Handles brand management, advertising, digital marketing, and market research.',
            createdAt: '2023-06-05'
        },
        {
            id: 5,
            name: 'Finance',
            code: 'FIN',
            head: 'Mohammed Al-Farsi',
            headId: 'mohammed',
            employees: 15,
            budget: 350000,
            location: 'Floor 4, Building A',
            status: 'active',
            icon: 'account_balance',
            color: '#f59e0b',
            description: 'Responsible for financial planning, budgeting, accounting, and auditing.',
            createdAt: '2022-09-12'
        },
        {
            id: 6,
            name: 'Customer Service',
            code: 'CS',
            head: 'Priya Sharma',
            headId: 'priya',
            employees: 28,
            budget: 380000,
            location: 'Floor 1, Building C',
            status: 'active',
            icon: 'support_agent',
            color: '#06b6d4',
            description: 'Provides customer support, handles complaints, and manages client relationships.',
            createdAt: '2023-02-28'
        },
        {
            id: 7,
            name: 'Operations',
            code: 'OPS',
            head: 'Ali Khan',
            headId: 'ali',
            employees: 22,
            budget: 420000,
            location: 'Floor 3, Building C',
            status: 'active',
            icon: 'local_shipping',
            color: '#64748b',
            description: 'Manages daily operations, logistics, and process optimization.',
            createdAt: '2021-08-15'
        },
        {
            id: 8,
            name: 'Engineering',
            code: 'ENG',
            head: 'Marie Dubois',
            headId: 'marie',
            employees: 16,
            budget: 600000,
            location: 'Floor 4, Building B',
            status: 'inactive',
            icon: 'engineering',
            color: '#ec4899',
            description: 'Product development and engineering team (currently inactive).',
            createdAt: '2020-12-01'
        }
    ];

    const departmentHeads = {
        'ahmed': 'Ahmed Mohamed',
        'sarah': 'Sarah Johnson',
        'james': 'James Wilson',
        'fatima': 'Fatima Al-Mansour',
        'mohammed': 'Mohammed Al-Farsi',
        'priya': 'Priya Sharma',
        'ali': 'Ali Khan',
        'marie': 'Marie Dubois'
    };

    const icons = [
        { icon: 'computer', name: 'IT' },
        { icon: 'people', name: 'HR' },
        { icon: 'trending_up', name: 'Sales' },
        { icon: 'campaign', name: 'Marketing' },
        { icon: 'account_balance', name: 'Finance' },
        { icon: 'engineering', name: 'Engineering' },
        { icon: 'support_agent', name: 'Support' },
        { icon: 'local_shipping', name: 'Operations' },
        { icon: 'science', name: 'R&D' },
        { icon: 'security', name: 'Security' }
    ];

    const colors = [
        '#3b82f6', '#10b981', '#f59e0b', '#ef4444', 
        '#8b5cf6', '#06b6d4', '#ec4899', '#64748b'
    ];

    const [departments, setDepartments] = useState(initialDepartments);
    const [filteredDepartments, setFilteredDepartments] = useState(initialDepartments);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentDepartment, setCurrentDepartment] = useState(null);
    const [selectedIcon, setSelectedIcon] = useState('computer');
    const [selectedColor, setSelectedColor] = useState('#3b82f6');
    const [stats, setStats] = useState({
        total: 0,
        active: 0,
        employees: 0,
        budget: 0
    });

    useEffect(() => {
        updateStats();
        filterDepartments();
    }, [departments, searchTerm]);

    const updateStats = () => {
        const total = departments.length;
        const active = departments.filter(d => d.status === 'active').length;
        const employees = departments.reduce((sum, d) => sum + d.employees, 0);
        const budget = departments.reduce((sum, d) => sum + d.budget, 0);

        setStats({ total, active, employees, budget });
    };

    const filterDepartments = () => {
        if (!searchTerm) {
            setFilteredDepartments(departments);
            return;
        }
        const lowerTerm = searchTerm.toLowerCase();
        const filtered = departments.filter(d => 
            d.name.toLowerCase().includes(lowerTerm) ||
            d.code.toLowerCase().includes(lowerTerm) ||
            d.head.toLowerCase().includes(lowerTerm)
        );
        setFilteredDepartments(filtered);
    };

    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
    };

    const openModal = (dept = null) => {
        if (dept) {
            setCurrentDepartment(dept);
            setSelectedIcon(dept.icon);
            setSelectedColor(dept.color);
        } else {
            setCurrentDepartment(null);
            setSelectedIcon('computer');
            setSelectedColor('#3b82f6');
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setCurrentDepartment(null);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const newDept = {
            id: currentDepartment ? currentDepartment.id : Date.now(),
            name: formData.get('name'),
            code: formData.get('code'),
            headId: formData.get('headId'),
            head: departmentHeads[formData.get('headId')] || '',
            employees: currentDepartment ? currentDepartment.employees : 0, // Preserve or default
            budget: parseFloat(formData.get('budget')) || 0,
            location: formData.get('location'),
            status: formData.get('status'),
            icon: selectedIcon,
            color: selectedColor,
            description: formData.get('description'),
            createdAt: currentDepartment ? currentDepartment.createdAt : new Date().toISOString().split('T')[0]
        };

        if (currentDepartment) {
            setDepartments(departments.map(d => d.id === currentDepartment.id ? newDept : d));
        } else {
            setDepartments([...departments, newDept]);
        }
        closeModal();
    };

    const handleDelete = (id) => {
        if (window.confirm('Are you sure you want to delete this department?')) {
            setDepartments(departments.filter(d => d.id !== id));
        }
    };

    return (
        <AdminLayout activeMenu="Departments">
            <div className="breadcrumb">
                <a href="#">Dashboard</a>
                <span>/</span>
                <a href="#">Human Resources</a>
                <span>/</span>
                <span>Departments</span>
            </div>

            {/* Quick Stats */}
            <div className="stats-cards">
                <div className="stat-card">
                    <div className="stat-icon" style={{ backgroundColor: 'var(--primary-color)' }}>
                        <span className="material-icons-outlined">business</span>
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.total}</div>
                        <div className="stat-label">Total Departments</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ backgroundColor: 'var(--success-color)' }}>
                        <span className="material-icons-outlined">check_circle</span>
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.active}</div>
                        <div className="stat-label">Active Departments</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ backgroundColor: 'var(--info-color)' }}>
                        <span className="material-icons-outlined">people</span>
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.employees}</div>
                        <div className="stat-label">Total Employees</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ backgroundColor: 'var(--warning-color)' }}>
                        <span className="material-icons-outlined">attach_money</span>
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">${(stats.budget / 1000000).toFixed(1)}M</div>
                        <div className="stat-label">Total Budget</div>
                    </div>
                </div>
            </div>

            {/* Main Card */}
            <div className="departments-card fade-in">
                <div className="card-header">
                    <div className="departments-actions">
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
                                placeholder="Search departments..." 
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
                            <span>Add Department</span>
                        </button>
                        <button className="btn btn-outline" onClick={() => window.location.reload()}>
                            <span className="material-icons-outlined">refresh</span>
                            <span>Refresh</span>
                        </button>
                    </div>
                </div>

                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th><input type="checkbox" /></th>
                                <th>ID <span className="material-icons-outlined" style={{ fontSize: '16px' }}>arrow_drop_down</span></th>
                                <th>DEPARTMENT <span className="material-icons-outlined" style={{ fontSize: '16px' }}>arrow_drop_down</span></th>
                                <th>HEAD <span className="material-icons-outlined" style={{ fontSize: '16px' }}>arrow_drop_down</span></th>
                                <th>EMPLOYEES <span className="material-icons-outlined" style={{ fontSize: '16px' }}>arrow_drop_down</span></th>
                                <th>BUDGET <span className="material-icons-outlined" style={{ fontSize: '16px' }}>arrow_drop_down</span></th>
                                <th>LOCATION <span className="material-icons-outlined" style={{ fontSize: '16px' }}>arrow_drop_down</span></th>
                                <th>STATUS <span className="material-icons-outlined" style={{ fontSize: '16px' }}>arrow_drop_down</span></th>
                                <th>OPERATIONS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredDepartments.map(dept => (
                                <tr key={dept.id}>
                                    <td><input type="checkbox" className="department-checkbox" /></td>
                                    <td>{dept.id.toString().padStart(3, '0')}</td>
                                    <td>
                                        <div className="department-info">
                                            <div className="department-icon" style={{ backgroundColor: dept.color }}>
                                                <span className="material-icons-outlined">{dept.icon}</span>
                                            </div>
                                            <div className="department-details">
                                                <div className="department-name">{dept.name} ({dept.code})</div>
                                                <div className="department-head">{dept.head}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>{dept.head}</td>
                                    <td>
                                        <span className="employee-count">{dept.employees} employees</span>
                                    </td>
                                    <td>
                                        <div className="budget-display">${dept.budget.toLocaleString()}</div>
                                    </td>
                                    <td>{dept.location}</td>
                                    <td>
                                        <span className={`department-status status-${dept.status}`}>
                                            {dept.status === 'active' ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td>
                                        <button className="icon-btn edit" onClick={() => openModal(dept)}>
                                            <span className="material-icons-outlined">edit</span>
                                        </button>
                                        <button className="icon-btn delete" onClick={() => handleDelete(dept.id)}>
                                            <span className="material-icons-outlined">delete</span>
                                        </button>
                                        <button className="icon-btn" style={{ color: 'var(--info-color)' }}>
                                            <span className="material-icons-outlined">visibility</span>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="pagination">
                    <div className="pagination-info">
                        <select className="select-dropdown" defaultValue="10">
                            <option value="10">10</option>
                            <option value="25">25</option>
                            <option value="50">50</option>
                            <option value="100">100</option>
                        </select>
                        <span>Show from 1 to {filteredDepartments.length > 10 ? 10 : filteredDepartments.length} in <span style={{ backgroundColor: '#64748b', color: 'white', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>{filteredDepartments.length}</span> records</span>
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
                        <h3 className="modal-title">{currentDepartment ? 'Edit Department' : 'Add New Department'}</h3>
                        <button className="modal-close" onClick={closeModal}>
                            <span className="material-icons-outlined">close</span>
                        </button>
                    </div>
                    <form onSubmit={handleSubmit}>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Department Name *</label>
                                <input type="text" className="form-control" name="name" placeholder="Enter department name" required defaultValue={currentDepartment?.name} />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Department Code *</label>
                                <input type="text" className="form-control" name="code" placeholder="e.g., IT, HR, SALES" required defaultValue={currentDepartment?.code} />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Department Head</label>
                                <select className="form-control" name="headId" defaultValue={currentDepartment?.headId || ''}>
                                    <option value="">Select Department Head</option>
                                    {Object.entries(departmentHeads).map(([id, name]) => (
                                        <option key={id} value={id}>{name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Location</label>
                                    <input type="text" className="form-control" name="location" placeholder="e.g., Floor 3, Building A" defaultValue={currentDepartment?.location} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Budget ($)</label>
                                    <input type="number" className="form-control" name="budget" placeholder="Annual budget" min="0" step="0.01" defaultValue={currentDepartment?.budget} />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Status</label>
                                <select className="form-control" name="status" defaultValue={currentDepartment?.status || 'active'}>
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Department Icon</label>
                                <div className="icon-selector">
                                    {icons.map(item => (
                                        <div 
                                            key={item.icon}
                                            className={`icon-option ${selectedIcon === item.icon ? 'selected' : ''}`}
                                            onClick={() => setSelectedIcon(item.icon)}
                                        >
                                            <span className="material-icons-outlined">{item.icon}</span>
                                            <span className="icon-name">{item.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Icon Color</label>
                                <div className="color-picker">
                                    {colors.map(color => (
                                        <div 
                                            key={color}
                                            className={`color-option ${selectedColor === color ? 'selected' : ''}`}
                                            style={{ backgroundColor: color }}
                                            onClick={() => setSelectedColor(color)}
                                        ></div>
                                    ))}
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Description</label>
                                <textarea className="form-control form-textarea" name="description" placeholder="Enter department description" defaultValue={currentDepartment?.description}></textarea>
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button type="button" className="btn" onClick={closeModal}>Cancel</button>
                            <button type="submit" className="btn btn-primary">Save Department</button>
                        </div>
                    </form>
                </div>
            </div>
        </AdminLayout>
    );
};

export default Departments;
