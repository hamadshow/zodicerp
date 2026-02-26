import React, { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';

const Permissions = () => {
  // Permission Templates
  const getAdminPermissions = () => ({
    ask: { view: true, create: false, edit: true, delete: true },
    cms: { media: true, contact: true, pages: true, blog: true },
    ecommerce: {
      reports: true, products: true, inventory: true, brands: true,
      attributes: true, advertising: true, customers: true, returns: true, specification: true
    },
    faq: { view: true, categories: true },
    location: { countries: true, states: true, cities: true },
    marketplace: {
      stores: true, withdrawals: true, vendors: true, unverified: true,
      reports: true, messages: true
    },
    system: {
      users: true, roles: true, manage_licenses: true, cronjobs: true,
      plugins: true, appearance: true, analytics: true, activity_logs: true, backup: true
    },
    settings: {
      common: true, others: true, setup: true, ecommerce: true,
      localization: true, api: true
    },
    tools: { import_export: true },
    newsletters: { delete: true, payments: true, settings: true, payment_logs: true },
    sliders: { create: true, edit: true, delete: true }
  });

  const getEditorPermissions = () => ({
    ask: { view: true, create: true, edit: true, delete: false },
    cms: { media: true, contact: true, pages: true, blog: true },
    ecommerce: { products: true },
    faq: { view: true, categories: true },
    location: { countries: true, states: true, cities: true },
    system: { analytics: true, activity_logs: true },
    sliders: { create: true, edit: true, delete: false }
  });

  const getManagerPermissions = () => ({
    ask: { view: true, create: true, edit: true, delete: true },
    cms: { media: true, contact: true, pages: true, blog: true },
    ecommerce: {
      reports: true, products: true, inventory: true, brands: true,
      customers: true, returns: true
    },
    faq: { view: true, categories: true },
    location: { countries: true, states: true, cities: true },
    marketplace: { stores: true, vendors: true, reports: true },
    system: { users: true, analytics: true, activity_logs: true },
    settings: { common: true },
    sliders: { create: true, edit: true, delete: true }
  });

  const getSalesPermissions = () => ({
    ecommerce: { products: true, customers: true, returns: true },
    marketplace: { stores: true, vendors: true, reports: true },
    system: { analytics: true }
  });

  const getSupportPermissions = () => ({
    ask: { view: true, create: true, edit: true, delete: false },
    cms: { contact: true },
    ecommerce: { customers: true, returns: true },
    faq: { view: true },
    marketplace: { messages: true },
    system: { analytics: true }
  });

  const getViewerPermissions = () => ({
    ask: { view: true },
    cms: { media: true, pages: true, blog: true },
    ecommerce: { products: true, reports: true },
    faq: { view: true },
    system: { analytics: true }
  });

  const getGuestPermissions = () => ({
    ask: { view: true },
    cms: { pages: true, blog: true },
    ecommerce: { products: true }
  });

  // Initial Data
  const initialRoles = [
    {
      id: 1,
      name: 'Admin',
      description: 'Full access to all features',
      isDefault: true,
      users: 5,
      permissions: 320,
      status: 'active',
      created: '2023-01-15',
      permissionsData: getAdminPermissions()
    },
    {
      id: 2,
      name: 'Editor',
      description: 'Content management role',
      isDefault: false,
      users: 12,
      permissions: 85,
      status: 'active',
      created: '2023-02-20',
      permissionsData: getEditorPermissions()
    },
    {
      id: 3,
      name: 'Manager',
      description: 'Department manager role',
      isDefault: false,
      users: 8,
      permissions: 145,
      status: 'active',
      created: '2023-03-10',
      permissionsData: getManagerPermissions()
    },
    {
      id: 4,
      name: 'Sales',
      description: 'Sales team role',
      isDefault: false,
      users: 32,
      permissions: 124,
      status: 'active',
      created: '2023-04-05',
      permissionsData: getSalesPermissions()
    },
    {
      id: 5,
      name: 'Support',
      description: 'Customer support role',
      isDefault: false,
      users: 28,
      permissions: 98,
      status: 'active',
      created: '2023-05-12',
      permissionsData: getSupportPermissions()
    },
    {
      id: 6,
      name: 'Viewer',
      description: 'Read-only access role',
      isDefault: false,
      users: 15,
      permissions: 45,
      status: 'active',
      created: '2023-06-18',
      permissionsData: getViewerPermissions()
    },
    {
      id: 7,
      name: 'Guest',
      description: 'Limited guest access',
      isDefault: false,
      users: 8,
      permissions: 12,
      status: 'active',
      created: '2023-07-22',
      permissionsData: getGuestPermissions()
    },
    {
      id: 8,
      name: 'Archived',
      description: 'Inactive archived role',
      isDefault: false,
      users: 0,
      permissions: 0,
      status: 'inactive',
      created: '2022-12-01',
      permissionsData: {}
    }
  ];

  const [roles, setRoles] = useState(initialRoles);
  const [filteredRoles, setFilteredRoles] = useState(initialRoles);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [editingRole, setEditingRole] = useState(null);
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [bulkAction, setBulkAction] = useState('');
  const [expandedSections, setExpandedSections] = useState({
    ask: true, cms: false, ecommerce: false, faq: false, location: false,
    marketplace: false, system: false, settings: false, tools: false,
    newsletters: false, sliders: false
  });
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isDefault: false,
    permissionsData: {}
  });

  // Helper to count permissions
  const countPermissions = (permissionsData) => {
    if (!permissionsData) return 0;
    return Object.values(permissionsData).reduce((total, category) => {
      return total + Object.values(category).filter(Boolean).length;
    }, 0);
  };

  useEffect(() => {
    const lowerSearch = searchTerm.toLowerCase();
    const filtered = roles.filter(role => 
      role.name.toLowerCase().includes(lowerSearch) ||
      role.description.toLowerCase().includes(lowerSearch)
    );
    setFilteredRoles(filtered);
  }, [searchTerm, roles]);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handlePermissionChange = (category, permission, checked) => {
    setFormData(prev => ({
      ...prev,
      permissionsData: {
        ...prev.permissionsData,
        [category]: {
          ...(prev.permissionsData[category] || {}),
          [permission]: checked
        }
      }
    }));
  };

  const setAllPermissions = (checked) => {
    const adminTemplate = getAdminPermissions();
    const nextPermissionsData = Object.fromEntries(
      Object.entries(adminTemplate).map(([category, perms]) => {
        return [
          category,
          Object.fromEntries(Object.keys(perms).map((perm) => [perm, checked])),
        ];
      })
    );

    setFormData((prev) => ({
      ...prev,
      permissionsData: nextPermissionsData,
    }));
  };

  const hasAllPermissionsSelected = (permissionsData) => {
    const adminTemplate = getAdminPermissions();
    const categories = Object.keys(adminTemplate);
    return categories.every((category) => {
      const perms = Object.keys(adminTemplate[category]);
      return perms.every((perm) => Boolean(permissionsData?.[category]?.[perm]));
    });
  };

  const openAddModal = () => {
    setEditingRole(null);
    setFormData({
      name: '',
      description: '',
      isDefault: false,
      permissionsData: {}
    });
    setActiveTab('basic');
    setModalOpen(true);
  };

  const openEditModal = (role) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      description: role.description,
      isDefault: role.isDefault,
      permissionsData: JSON.parse(JSON.stringify(role.permissionsData || {}))
    });
    setActiveTab('basic');
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingRole(null);
  };

  const handleSave = (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      alert('Role name is required.');
      setActiveTab('basic');
      return;
    }

    const permissionsCount = countPermissions(formData.permissionsData);
    const newRole = {
      id: editingRole ? editingRole.id : (roles.length > 0 ? Math.max(...roles.map(r => r.id)) + 1 : 1),
      name: formData.name,
      description: formData.description,
      isDefault: formData.isDefault,
      users: editingRole ? editingRole.users : 0,
      permissions: permissionsCount,
      status: 'active',
      created: editingRole ? editingRole.created : new Date().toISOString().split('T')[0],
      permissionsData: formData.permissionsData
    };

    setRoles((prev) => {
      let next = prev;
      if (newRole.isDefault) {
        next = next.map((r) => ({ ...r, isDefault: false }));
      }
      return editingRole
        ? next.map((r) => (r.id === editingRole.id ? newRole : r))
        : [...next, newRole];
    });

    closeModal();
  };

  const handleDelete = (id) => {
    const role = roles.find(r => r.id === id);
    if (role.users > 0) {
      alert(`Cannot delete role "${role.name}" because it has ${role.users} users assigned.`);
      return;
    }
    if (confirm('Are you sure you want to delete this role?')) {
      setRoles(prev => prev.filter(r => r.id !== id));
    }
  };

  const handleDuplicate = (id) => {
    const role = roles.find(r => r.id === id);
    if (!role) return;

    const newRole = {
      ...JSON.parse(JSON.stringify(role)),
      id: roles.length > 0 ? Math.max(...roles.map(r => r.id)) + 1 : 1,
      name: role.name + ' (Copy)',
      isDefault: false,
      users: 0,
      created: new Date().toISOString().split('T')[0]
    };
    setRoles(prev => [...prev, newRole]);
  };

  const handleBulkAction = () => {
    const action = bulkAction;
    if (selectedRoles.length === 0) {
      alert('Please select at least one role.');
      return;
    }

    if (action === 'activate') {
      setRoles(prev => prev.map(r => selectedRoles.includes(r.id) ? { ...r, status: 'active' } : r));
    } else if (action === 'deactivate') {
      setRoles(prev => prev.map(r => selectedRoles.includes(r.id) ? { ...r, status: 'inactive' } : r));
    } else if (action === 'delete') {
      const rolesWithUsers = roles.filter(r => selectedRoles.includes(r.id) && r.users > 0);
      if (rolesWithUsers.length > 0) {
        alert(`Cannot delete ${rolesWithUsers.length} role(s) because they have users assigned.`);
        return;
      }
      if (confirm(`Delete ${selectedRoles.length} roles?`)) {
        setRoles(prev => prev.filter(r => !selectedRoles.includes(r.id)));
        setSelectedRoles([]);
      }
    } else if (action === 'duplicate') {
       const newRoles = [];
       selectedRoles.forEach(id => {
         const role = roles.find(r => r.id === id);
         if (role) {
           newRoles.push({
             ...JSON.parse(JSON.stringify(role)),
             id: Math.max(...roles.map(r => r.id), ...newRoles.map(r => r.id)) + 1,
             name: role.name + ' (Copy)',
             isDefault: false,
             users: 0,
             created: new Date().toISOString().split('T')[0]
           });
         }
       });
       setRoles(prev => [...prev, ...newRoles]);
    }
    setBulkAction('');
  };

  const toggleSelectRole = (id) => {
    setSelectedRoles(prev => 
      prev.includes(id) ? prev.filter(rId => rId !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedRoles(filteredRoles.map(r => r.id));
    } else {
      setSelectedRoles([]);
    }
  };

  // Stats
  const activeRolesCount = roles.filter(r => r.status === 'active').length;
  const totalUsers = roles.reduce((sum, r) => sum + r.users, 0);
  const totalPermissionsCount = roles.reduce((sum, r) => sum + r.permissions, 0);

  // Helper to render permission checkbox
  const PermissionCheckbox = ({ category, permission, label }) => (
    <div className="permission-item">
      <input 
        type="checkbox" 
        id={`perm_${category}_${permission}`}
        checked={formData.permissionsData[category]?.[permission] || false}
        onChange={(e) => handlePermissionChange(category, permission, e.target.checked)}
      />
      <label htmlFor={`perm_${category}_${permission}`}>{label}</label>
    </div>
  );

  return (
    <AdminLayout activeMenu="Permissions">
      <Head title="Roles & Permissions" />
      
      <div className="permissions-page">
        <div className="breadcrumb">
            <a href="#">Dashboard</a>
            <span>/</span>
            <a href="#">System</a>
            <span>/</span>
            <span>Roles & Permissions</span>
        </div>

        {/* Quick Stats */}
        <div className="stats-cards">
            <div className="stat-card">
                <div className="stat-icon" style={{ backgroundColor: 'var(--primary-color)' }}>
                    <span className="material-icons-outlined">admin_panel_settings</span>
                </div>
                <div className="stat-content">
                    <div className="stat-value">{roles.length}</div>
                    <div className="stat-label">Total Roles</div>
                </div>
            </div>
            <div className="stat-card">
                <div className="stat-icon" style={{ backgroundColor: 'var(--success-color)' }}>
                    <span className="material-icons-outlined">check_circle</span>
                </div>
                <div className="stat-content">
                    <div className="stat-value">{activeRolesCount}</div>
                    <div className="stat-label">Active Roles</div>
                </div>
            </div>
            <div className="stat-card">
                <div className="stat-icon" style={{ backgroundColor: 'var(--info-color)' }}>
                    <span className="material-icons-outlined">people</span>
                </div>
                <div className="stat-content">
                    <div className="stat-value">{totalUsers}</div>
                    <div className="stat-label">Total Users</div>
                </div>
            </div>
            <div className="stat-card">
                <div className="stat-icon" style={{ backgroundColor: 'var(--warning-color)' }}>
                    <span className="material-icons-outlined">lock</span>
                </div>
                <div className="stat-content">
                    <div className="stat-value">{totalPermissionsCount}</div>
                    <div className="stat-label">Total Permissions</div>
                </div>
            </div>
        </div>

        {/* Main Card */}
        <div className="roles-card">
            <div className="roles-actions">
                <select
                  className="btn btn-outline"
                  value={bulkAction}
                  onChange={(e) => setBulkAction(e.target.value)}
                  style={{ marginRight: '8px' }}
                >
                    <option value="">Bulk Actions</option>
                    <option value="activate">Activate Selected</option>
                    <option value="deactivate">Deactivate Selected</option>
                    <option value="delete">Delete Selected</option>
                    <option value="duplicate">Duplicate Selected</option>
                </select>
                <button className="btn btn-outline" onClick={handleBulkAction} style={{ marginRight: 'auto' }}>
                    <span className="material-icons-outlined">play_arrow</span>
                    <span>Apply</span>
                </button>
                
                <div className="search-bar light" style={{ marginRight: '8px' }}>
                    <input 
                      type="text" 
                      placeholder="Search roles..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <button>
                        <span className="material-icons-outlined">search</span>
                    </button>
                </div>

                <button className="btn btn-primary" onClick={openAddModal}>
                    <span className="material-icons-outlined">add</span>
                    <span>Add Role</span>
                </button>
            </div>

            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th><input type="checkbox" onChange={toggleSelectAll} /></th>
                            <th>ID</th>
                            <th>ROLE NAME</th>
                            <th>DESCRIPTION</th>
                            <th>USERS</th>
                            <th>PERMISSIONS</th>
                            <th>STATUS</th>
                            <th>CREATED</th>
                            <th>ACTIONS</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredRoles.map(role => (
                          <tr key={role.id}>
                              <td>
                                <input 
                                  type="checkbox" 
                                  checked={selectedRoles.includes(role.id)}
                                  onChange={() => toggleSelectRole(role.id)}
                                />
                              </td>
                              <td>{role.id.toString().padStart(3, '0')}</td>
                              <td>
                                  <div style={{ fontWeight: 600, color: 'var(--dark-color)' }}>
                                      {role.name}
                                      {role.isDefault && <span className="role-badge">Default</span>}
                                  </div>
                              </td>
                              <td>{role.description}</td>
                              <td>
                                  <div className="role-users">
                                      <div className="user-avatar">
                                          <span className="material-icons-outlined">person</span>
                                      </div>
                                      <span style={{ fontWeight: 500 }}>{role.users}</span>
                                      {role.users > 0 && <span className="more-users">users</span>}
                                  </div>
                              </td>
                              <td>
                                  <span className="role-badge">{role.permissions} permissions</span>
                              </td>
                              <td>
                                  <span className={`role-status status-${role.status}`}>
                                      {role.status === 'active' ? 'Active' : 'Inactive'}
                                  </span>
                              </td>
                              <td>{role.created}</td>
                              <td>
                                  <button className="icon-btn edit" onClick={() => openEditModal(role)}>
                                      <span className="material-icons-outlined">edit</span>
                                  </button>
                                  <button className="icon-btn delete" onClick={() => handleDelete(role.id)}>
                                      <span className="material-icons-outlined">delete</span>
                                  </button>
                                  <button className="icon-btn" style={{ color: 'var(--info-color)' }} onClick={() => handleDuplicate(role.id)}>
                                      <span className="material-icons-outlined">content_copy</span>
                                  </button>
                              </td>
                          </tr>
                        ))}
                        {filteredRoles.length === 0 && (
                          <tr>
                            <td colSpan="9" style={{ textAlign: 'center', padding: '20px' }}>No roles found</td>
                          </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={(e) => { if(e.target === e.currentTarget) closeModal(); }}>
            <form className="modal" onSubmit={handleSave}>
                <div className="modal-header">
                    <h3 className="modal-title">{editingRole ? 'Edit Role' : 'Add New Role'}</h3>
                    <button className="modal-close" type="button" onClick={closeModal}>
                        <span className="material-icons-outlined">close</span>
                    </button>
                </div>
                <div className="modal-body">
                    <div className="tabs">
                        <div 
                          className={`tab ${activeTab === 'basic' ? 'active' : ''}`} 
                          onClick={() => setActiveTab('basic')}
                        >
                          Basic Information
                        </div>
                        <div 
                          className={`tab ${activeTab === 'permissions' ? 'active' : ''}`}
                          onClick={() => setActiveTab('permissions')}
                        >
                          Permissions
                        </div>
                    </div>

                    {activeTab === 'basic' && (
                      <div className="tab-content active">
                              <div className="form-group">
                                  <label className="form-label">Name *</label>
                                  <input 
                                    type="text" 
                                    className="form-control" 
                                    placeholder="Enter role name" 
                                    required 
                                    value={formData.name}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                  />
                              </div>

                              <div className="form-group">
                                  <label className="form-label">Description</label>
                                  <textarea 
                                    className="form-control form-textarea" 
                                    placeholder="Enter role description"
                                    value={formData.description}
                                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                                  />
                              </div>

                              <div className="checkbox-group">
                                  <input 
                                    type="checkbox" 
                                    id="isDefault"
                                    checked={formData.isDefault}
                                    onChange={(e) => setFormData({...formData, isDefault: e.target.checked})}
                                  />
                                  <label htmlFor="isDefault">Is default?</label>
                              </div>
                      </div>
                    )}

                    {activeTab === 'permissions' && (
                      <div className="tab-content active">
                          <div className="permission-category">
                              <div className="checkbox-group">
                                  <input 
                                    type="checkbox" 
                                    id="selectAllPermissions" 
                                    checked={hasAllPermissionsSelected(formData.permissionsData)}
                                    onChange={(e) => setAllPermissions(e.target.checked)}
                                  />
                                  <label htmlFor="selectAllPermissions"><strong>All Permissions</strong></label>
                              </div>
                          </div>

                          {/* Ask Permissions */}
                          <div className="permission-section">
                              <h4 onClick={() => toggleSection('ask')}>
                                  <span>Ask</span>
                                  <span className="material-icons-outlined">
                                    {expandedSections.ask ? 'expand_less' : 'expand_more'}
                                  </span>
                              </h4>
                              {expandedSections.ask && (
                                <div className="permission-grid">
                                    <PermissionCheckbox category="ask" permission="view" label="View" />
                                    <PermissionCheckbox category="ask" permission="create" label="Create" />
                                    <PermissionCheckbox category="ask" permission="edit" label="Edit" />
                                    <PermissionCheckbox category="ask" permission="delete" label="Delete" />
                                </div>
                              )}
                          </div>

                          {/* CMS Permissions */}
                          <div className="permission-section">
                              <h4 onClick={() => toggleSection('cms')}>
                                  <span>CMS</span>
                                  <span className="material-icons-outlined">
                                    {expandedSections.cms ? 'expand_less' : 'expand_more'}
                                  </span>
                              </h4>
                              {expandedSections.cms && (
                                <div className="permission-grid">
                                    <PermissionCheckbox category="cms" permission="media" label="Media" />
                                    <PermissionCheckbox category="cms" permission="contact" label="Contact" />
                                    <PermissionCheckbox category="cms" permission="pages" label="Pages" />
                                    <PermissionCheckbox category="cms" permission="blog" label="Blog" />
                                </div>
                              )}
                          </div>
                          
                          {/* E-commerce Permissions */}
                          <div className="permission-section">
                              <h4 onClick={() => toggleSection('ecommerce')}>
                                  <span>E-commerce</span>
                                  <span className="material-icons-outlined">
                                    {expandedSections.ecommerce ? 'expand_less' : 'expand_more'}
                                  </span>
                              </h4>
                              {expandedSections.ecommerce && (
                                <div className="permission-grid">
                                    <PermissionCheckbox category="ecommerce" permission="reports" label="Reports" />
                                    <PermissionCheckbox category="ecommerce" permission="products" label="Products" />
                                    <PermissionCheckbox category="ecommerce" permission="inventory" label="Product Inventory" />
                                    <PermissionCheckbox category="ecommerce" permission="brands" label="Brands" />
                                    <PermissionCheckbox category="ecommerce" permission="attributes" label="Product Attributes" />
                                    <PermissionCheckbox category="ecommerce" permission="advertising" label="Advertising" />
                                    <PermissionCheckbox category="ecommerce" permission="customers" label="Customers" />
                                    <PermissionCheckbox category="ecommerce" permission="returns" label="Order Returns" />
                                    <PermissionCheckbox category="ecommerce" permission="specification" label="Product Specification" />
                                </div>
                              )}
                          </div>

                          {/* FAQ Permissions */}
                          <div className="permission-section">
                              <h4 onClick={() => toggleSection('faq')}>
                                  <span>FAQ</span>
                                  <span className="material-icons-outlined">
                                    {expandedSections.faq ? 'expand_less' : 'expand_more'}
                                  </span>
                              </h4>
                              {expandedSections.faq && (
                                <div className="permission-grid">
                                    <PermissionCheckbox category="faq" permission="view" label="FAQ" />
                                    <PermissionCheckbox category="faq" permission="categories" label="FAQ Categories" />
                                </div>
                              )}
                          </div>
                          
                          {/* Location Permissions */}
                          <div className="permission-section">
                              <h4 onClick={() => toggleSection('location')}>
                                  <span>Location</span>
                                  <span className="material-icons-outlined">
                                    {expandedSections.location ? 'expand_less' : 'expand_more'}
                                  </span>
                              </h4>
                              {expandedSections.location && (
                                <div className="permission-grid">
                                    <PermissionCheckbox category="location" permission="countries" label="Countries" />
                                    <PermissionCheckbox category="location" permission="states" label="States" />
                                    <PermissionCheckbox category="location" permission="cities" label="Cities" />
                                </div>
                              )}
                          </div>

                          {/* Marketplace Permissions */}
                          <div className="permission-section">
                              <h4 onClick={() => toggleSection('marketplace')}>
                                  <span>Marketplace</span>
                                  <span className="material-icons-outlined">
                                    {expandedSections.marketplace ? 'expand_less' : 'expand_more'}
                                  </span>
                              </h4>
                              {expandedSections.marketplace && (
                                <div className="permission-grid">
                                    <PermissionCheckbox category="marketplace" permission="stores" label="Stores" />
                                    <PermissionCheckbox category="marketplace" permission="withdrawals" label="Withdrawals" />
                                    <PermissionCheckbox category="marketplace" permission="vendors" label="Vendors" />
                                    <PermissionCheckbox category="marketplace" permission="unverified" label="Unverified vendors" />
                                    <PermissionCheckbox category="marketplace" permission="reports" label="Reports" />
                                    <PermissionCheckbox category="marketplace" permission="messages" label="Messages" />
                                </div>
                              )}
                          </div>
                          
                          {/* System Permissions */}
                          <div className="permission-section">
                              <h4 onClick={() => toggleSection('system')}>
                                  <span>System</span>
                                  <span className="material-icons-outlined">
                                    {expandedSections.system ? 'expand_less' : 'expand_more'}
                                  </span>
                              </h4>
                              {expandedSections.system && (
                                <div className="permission-grid">
                                    <PermissionCheckbox category="system" permission="users" label="Users" />
                                    <PermissionCheckbox category="system" permission="roles" label="Roles" />
                                    <PermissionCheckbox category="system" permission="manage_licenses" label="Manage licenses" />
                                    <PermissionCheckbox category="system" permission="cronjobs" label="Cronjobs" />
                                    <PermissionCheckbox category="system" permission="plugins" label="Plugins" />
                                    <PermissionCheckbox category="system" permission="appearance" label="Appearance" />
                                    <PermissionCheckbox category="system" permission="analytics" label="Analytics" />
                                    <PermissionCheckbox category="system" permission="activity_logs" label="Activity Logs" />
                                    <PermissionCheckbox category="system" permission="backup" label="Backup" />
                                </div>
                              )}
                          </div>

                          {/* Settings Permissions */}
                          <div className="permission-section">
                              <h4 onClick={() => toggleSection('settings')}>
                                  <span>Settings</span>
                                  <span className="material-icons-outlined">
                                    {expandedSections.settings ? 'expand_less' : 'expand_more'}
                                  </span>
                              </h4>
                              {expandedSections.settings && (
                                <div className="permission-grid">
                                    <PermissionCheckbox category="settings" permission="common" label="Common" />
                                    <PermissionCheckbox category="settings" permission="others" label="Others" />
                                    <PermissionCheckbox category="settings" permission="setup" label="Setup" />
                                    <PermissionCheckbox category="settings" permission="ecommerce" label="Ecommerce" />
                                    <PermissionCheckbox category="settings" permission="localization" label="Localization" />
                                    <PermissionCheckbox category="settings" permission="api" label="API" />
                                </div>
                              )}
                          </div>

                          {/* Tools Permissions */}
                          <div className="permission-section">
                              <h4 onClick={() => toggleSection('tools')}>
                                  <span>Tools</span>
                                  <span className="material-icons-outlined">
                                    {expandedSections.tools ? 'expand_less' : 'expand_more'}
                                  </span>
                              </h4>
                              {expandedSections.tools && (
                                <div className="permission-grid">
                                    <PermissionCheckbox category="tools" permission="import_export" label="Import/Export Data" />
                                </div>
                              )}
                          </div>

                          {/* Newsletters Permissions */}
                          <div className="permission-section">
                              <h4 onClick={() => toggleSection('newsletters')}>
                                  <span>Newsletters</span>
                                  <span className="material-icons-outlined">
                                    {expandedSections.newsletters ? 'expand_less' : 'expand_more'}
                                  </span>
                              </h4>
                              {expandedSections.newsletters && (
                                <div className="permission-grid">
                                    <PermissionCheckbox category="newsletters" permission="delete" label="Delete" />
                                    <PermissionCheckbox category="newsletters" permission="payments" label="Payments" />
                                    <PermissionCheckbox category="newsletters" permission="settings" label="Settings" />
                                    <PermissionCheckbox category="newsletters" permission="payment_logs" label="Payment Logs" />
                                </div>
                              )}
                          </div>
                          
                          {/* Simple Sliders Permissions */}
                          <div className="permission-section">
                              <h4 onClick={() => toggleSection('sliders')}>
                                  <span>Simple Sliders</span>
                                  <span className="material-icons-outlined">
                                    {expandedSections.sliders ? 'expand_less' : 'expand_more'}
                                  </span>
                              </h4>
                              {expandedSections.sliders && (
                                <div className="permission-grid">
                                    <PermissionCheckbox category="sliders" permission="create" label="Create" />
                                    <PermissionCheckbox category="sliders" permission="edit" label="Edit" />
                                    <PermissionCheckbox category="sliders" permission="delete" label="Delete" />
                                </div>
                              )}
                          </div>

                      </div>
                    )}
                </div>
                <div className="modal-actions">
                    <button className="btn" type="button" onClick={closeModal}>Cancel</button>
                    <button className="btn btn-primary" type="submit">Save Role</button>
                </div>
            </form>
        </div>
      )}
    </AdminLayout>
  );
};

export default Permissions;
