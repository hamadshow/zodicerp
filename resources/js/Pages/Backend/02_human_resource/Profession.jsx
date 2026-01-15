import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import './Profession.css';

const Profession = () => {
    // Sample profession data
    const initialProfessions = [
        {
            id: 1,
            name: 'Software Engineer',
            code: 'SE',
            category: 'it',
            description: 'Develops software applications and systems',
            minSalary: 50000,
            maxSalary: 120000,
            experience: 3,
            educationLevel: 'bachelor',
            keySkills: ['Programming', 'Problem Solving', 'Teamwork'],
            status: 'active',
            employees: 8,
            createdAt: '2024-01-15',
            sortOrder: 1
        },
        {
            id: 2,
            name: 'Marketing Manager',
            code: 'MM',
            category: 'management',
            description: 'Leads marketing team and develops strategies',
            minSalary: 60000,
            maxSalary: 110000,
            experience: 5,
            educationLevel: 'bachelor',
            keySkills: ['Leadership', 'Strategy', 'Communication'],
            status: 'active',
            employees: 3,
            createdAt: '2024-01-16',
            sortOrder: 2
        },
        {
            id: 3,
            name: 'HR Specialist',
            code: 'HRS',
            category: 'hr',
            description: 'Handles recruitment and employee relations',
            minSalary: 40000,
            maxSalary: 75000,
            experience: 2,
            educationLevel: 'bachelor',
            keySkills: ['Recruitment', 'Communication', 'Compliance'],
            status: 'active',
            employees: 4,
            createdAt: '2024-01-17',
            sortOrder: 3
        },
        {
            id: 4,
            name: 'Financial Analyst',
            code: 'FA',
            category: 'finance',
            description: 'Analyzes financial data and creates reports',
            minSalary: 45000,
            maxSalary: 85000,
            experience: 3,
            educationLevel: 'bachelor',
            keySkills: ['Analysis', 'Excel', 'Reporting'],
            status: 'active',
            employees: 5,
            createdAt: '2024-01-18',
            sortOrder: 4
        },
        {
            id: 5,
            name: 'Sales Executive',
            code: 'SLEX',
            category: 'sales',
            description: 'Generates sales and maintains client relationships',
            minSalary: 35000,
            maxSalary: 80000,
            experience: 2,
            educationLevel: 'high-school',
            keySkills: ['Sales', 'Negotiation', 'Communication'],
            status: 'active',
            employees: 12,
            createdAt: '2024-01-19',
            sortOrder: 5
        },
        {
            id: 6,
            name: 'Customer Support',
            code: 'CS',
            category: 'customer-service',
            description: 'Assists customers with product inquiries',
            minSalary: 28000,
            maxSalary: 45000,
            experience: 1,
            educationLevel: 'high-school',
            keySkills: ['Communication', 'Problem Solving', 'Patience'],
            status: 'active',
            employees: 9,
            createdAt: '2024-02-01',
            sortOrder: 6
        },
        {
            id: 7,
            name: 'Graphic Designer',
            code: 'GD',
            category: 'creative',
            description: 'Creates visual content and designs',
            minSalary: 35000,
            maxSalary: 65000,
            experience: 2,
            educationLevel: 'bachelor',
            keySkills: ['Creativity', 'Adobe Suite', 'Design'],
            status: 'active',
            employees: 4,
            createdAt: '2024-02-02',
            sortOrder: 7
        },
        {
            id: 8,
            name: 'System Administrator',
            code: 'SA',
            category: 'it',
            description: 'Manages IT infrastructure and systems',
            minSalary: 50000,
            maxSalary: 90000,
            experience: 4,
            educationLevel: 'bachelor',
            keySkills: ['Networking', 'Security', 'Troubleshooting'],
            status: 'inactive',
            employees: 0,
            createdAt: '2024-02-03',
            sortOrder: 8
        }
    ];

    const categoryNames = {
        'management': 'Management',
        'technical': 'Technical',
        'administrative': 'Administrative',
        'creative': 'Creative',
        'customer-service': 'Customer Service',
        'sales': 'Sales',
        'it': 'IT',
        'finance': 'Finance',
        'hr': 'HR',
        'operations': 'Operations'
    };

    const [professions, setProfessions] = useState(initialProfessions);
    const [filteredProfessions, setFilteredProfessions] = useState(initialProfessions);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentProfession, setCurrentProfession] = useState(null);
    const [stats, setStats] = useState({
        total: 0,
        active: 0,
        employees: 0,
        vacant: 0
    });

    useEffect(() => {
        updateStats();
        filterProfessions();
    }, [professions, searchTerm]);

    const updateStats = () => {
        const total = professions.length;
        const active = professions.filter(p => p.status === 'active').length;
        const employees = professions.reduce((sum, p) => sum + p.employees, 0);
        const vacant = professions.filter(p => p.employees === 0 && p.status === 'active').length;

        setStats({ total, active, employees, vacant });
    };

    const filterProfessions = () => {
        if (!searchTerm) {
            setFilteredProfessions(professions);
            return;
        }
        const lowerTerm = searchTerm.toLowerCase();
        const filtered = professions.filter(p => 
            p.name.toLowerCase().includes(lowerTerm) ||
            p.code.toLowerCase().includes(lowerTerm) ||
            (categoryNames[p.category] || p.category).toLowerCase().includes(lowerTerm)
        );
        setFilteredProfessions(filtered);
    };

    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
    };

    const openModal = (prof = null) => {
        setCurrentProfession(prof);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setCurrentProfession(null);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        const keySkillsInput = formData.get('keySkills');
        const keySkills = keySkillsInput ? keySkillsInput.split(',').map(skill => skill.trim()) : [];

        const newProf = {
            id: currentProfession ? currentProfession.id : Date.now(),
            name: formData.get('name'),
            code: formData.get('code').toUpperCase(),
            category: formData.get('category'),
            description: formData.get('description'),
            minSalary: formData.get('minSalary') ? parseInt(formData.get('minSalary')) : null,
            maxSalary: formData.get('maxSalary') ? parseInt(formData.get('maxSalary')) : null,
            experience: formData.get('experience') ? parseInt(formData.get('experience')) : 0,
            educationLevel: formData.get('educationLevel'),
            keySkills: keySkills,
            status: formData.get('status'),
            sortOrder: parseInt(formData.get('sortOrder')) || 0,
            employees: currentProfession ? currentProfession.employees : 0,
            createdAt: currentProfession ? currentProfession.createdAt : new Date().toISOString().split('T')[0]
        };

        if (currentProfession) {
            setProfessions(professions.map(p => p.id === currentProfession.id ? newProf : p));
        } else {
            setProfessions([...professions, newProf]);
        }
        closeModal();
    };

    const handleDelete = (id) => {
        if (window.confirm('Are you sure you want to delete this profession?')) {
            setProfessions(professions.filter(p => p.id !== id));
        }
    };

    const getCategoryColor = (category) => {
        if (category === 'it') return 'var(--info-color)';
        if (category === 'management') return 'var(--primary-color)';
        if (category === 'sales') return 'var(--warning-color)';
        return 'var(--success-color)';
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
                                <th>PROFESSION <span className="material-icons-outlined" style={{ fontSize: '16px' }}>arrow_drop_down</span></th>
                                <th>CATEGORY <span className="material-icons-outlined" style={{ fontSize: '16px' }}>arrow_drop_down</span></th>
                                <th>EMPLOYEES <span className="material-icons-outlined" style={{ fontSize: '16px' }}>arrow_drop_down</span></th>
                                <th>SALARY RANGE <span className="material-icons-outlined" style={{ fontSize: '16px' }}>arrow_drop_down</span></th>
                                <th>STATUS <span className="material-icons-outlined" style={{ fontSize: '16px' }}>arrow_drop_down</span></th>
                                <th>CREATED AT <span className="material-icons-outlined" style={{ fontSize: '16px' }}>arrow_drop_down</span></th>
                                <th>OPERATIONS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProfessions.map(prof => (
                                <tr key={prof.id}>
                                    <td><input type="checkbox" className="profession-checkbox" /></td>
                                    <td>{prof.id.toString().padStart(3, '0')}</td>
                                    <td>
                                        <div className="profession-info">
                                            <div className="profession-icon" style={{ backgroundColor: getCategoryColor(prof.category) }}>
                                                <span className="material-icons-outlined">work</span>
                                            </div>
                                            <div className="profession-details">
                                                <div className="profession-name">{prof.name}</div>
                                                <div className="profession-category">{categoryNames[prof.category] || prof.category}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td><strong>{prof.code}</strong></td>
                                    <td>
                                        <div className="employee-count">
                                            <span className="material-icons-outlined" style={{ fontSize: '16px' }}>people</span>
                                            {prof.employees}
                                        </div>
                                    </td>
                                    <td>
                                        <div className="salary-range">
                                            ${prof.minSalary ? prof.minSalary.toLocaleString() : 'N/A'} - ${prof.maxSalary ? prof.maxSalary.toLocaleString() : 'N/A'}
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`profession-status ${prof.status === 'active' ? 'status-active' : 'status-inactive'}`}>
                                            {prof.status === 'active' ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td>{prof.createdAt}</td>
                                    <td>
                                        <button className="icon-btn edit" onClick={() => openModal(prof)}>
                                            <span className="material-icons-outlined">edit</span>
                                        </button>
                                        <button className="icon-btn delete" onClick={() => handleDelete(prof.id)}>
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
                                <input type="text" className="form-control" name="name" placeholder="Enter profession name" required defaultValue={currentProfession?.name} />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Profession Code *</label>
                                    <input type="text" className="form-control" name="code" placeholder="Enter profession code" required defaultValue={currentProfession?.code} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Category</label>
                                    <select className="form-control" name="category" defaultValue={currentProfession?.category || ''}>
                                        <option value="">Select Category</option>
                                        <option value="management">Management</option>
                                        <option value="technical">Technical</option>
                                        <option value="administrative">Administrative</option>
                                        <option value="creative">Creative</option>
                                        <option value="customer-service">Customer Service</option>
                                        <option value="sales">Sales</option>
                                        <option value="it">Information Technology</option>
                                        <option value="finance">Finance</option>
                                        <option value="hr">Human Resources</option>
                                        <option value="operations">Operations</option>
                                    </select>
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Description</label>
                                <textarea className="form-control form-textarea" name="description" placeholder="Enter profession description" defaultValue={currentProfession?.description}></textarea>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Minimum Salary</label>
                                    <input type="number" className="form-control" name="minSalary" placeholder="Enter minimum salary" defaultValue={currentProfession?.minSalary} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Maximum Salary</label>
                                    <input type="number" className="form-control" name="maxSalary" placeholder="Enter maximum salary" defaultValue={currentProfession?.maxSalary} />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Required Experience (Years)</label>
                                    <input type="number" className="form-control" name="experience" placeholder="Years of experience" min="0" defaultValue={currentProfession?.experience} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Education Level</label>
                                    <select className="form-control" name="educationLevel" defaultValue={currentProfession?.educationLevel || ''}>
                                        <option value="">Select Education</option>
                                        <option value="high-school">High School</option>
                                        <option value="diploma">Diploma</option>
                                        <option value="bachelor">Bachelor's Degree</option>
                                        <option value="master">Master's Degree</option>
                                        <option value="phd">PhD</option>
                                        <option value="certification">Professional Certification</option>
                                    </select>
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Key Skills (comma separated)</label>
                                <input type="text" className="form-control" name="keySkills" placeholder="e.g., Communication, Leadership, Project Management" defaultValue={currentProfession?.keySkills?.join(', ')} />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Status</label>
                                    <select className="form-control" name="status" defaultValue={currentProfession?.status || 'active'}>
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Sort Order</label>
                                    <input type="number" className="form-control" name="sortOrder" defaultValue={currentProfession?.sortOrder || 0} min="0" />
                                </div>
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button type="button" className="btn" onClick={closeModal}>Cancel</button>
                            <button type="submit" className="btn btn-primary">Save Profession</button>
                        </div>
                    </form>
                </div>
            </div>
        </AdminLayout>
    );
};

export default Profession;
