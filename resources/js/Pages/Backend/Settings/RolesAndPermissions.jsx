import React, { useState, useEffect } from 'react';
import { Head, Link, usePage, useForm } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import ActionsCell from '@/Components/ActionsCell';

const RolesAndPermissions = ({ roles, availablePermissions }) => {
  const { localization } = usePage().props;
  const [viewMode, setViewMode] = useState('list'); // 'list', 'create', 'edit'
  const [editingRole, setEditingRole] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState({});

  const { data, setData, post, put, processing, errors, reset, clearErrors, delete: destroy } = useForm({
    name: '',
    description: '',
    is_default: false,
    permissions: {}
  });

  // Helper to generate localized routes
  const getLocalizedRoute = (name, params = {}) => {
    try {
      return route(name, {
        country: localization?.country_code || 'sa',
        lang: localization?.current_locale || 'ar',
        ...params
      });
    } catch {
      console.warn(`Route ${name} not found`);
      return '#';
    }
  };

  // Initialize form when editing
  useEffect(() => {
    if (viewMode === 'edit' && editingRole) {
      setData({
        name: editingRole.name,
        description: editingRole.description || '',
        is_default: editingRole.is_default,
        permissions: editingRole.permissions || {}
      });
    } else if (viewMode === 'create') {
      reset();
      setData('permissions', {});
    }
    clearErrors();
  }, [viewMode, editingRole]);

  // Initialize expanded groups
  useEffect(() => {
    if (availablePermissions) {
        const initialExpanded = {};
        Object.keys(availablePermissions).forEach(group => {
            initialExpanded[group] = true;
        });
        setExpandedGroups(initialExpanded);
    }
  }, [availablePermissions]);

  const handleCreateClick = () => {
    setEditingRole(null);
    setViewMode('create');
  };

  const handleEditClick = (role) => {
    setEditingRole(role);
    setViewMode('edit');
  };

  const handleCancel = () => {
    setViewMode('list');
    setEditingRole(null);
    reset();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (viewMode === 'create') {
      post(route('admin.roles.store'), {
        onSuccess: () => setViewMode('list'),
      });
    } else {
      put(route('admin.roles.update', editingRole.id), {
        onSuccess: () => setViewMode('list'),
      });
    }
  };
  
  const handleDelete = (role) => {
    if (confirm('Are you sure you want to delete this role?')) {
        destroy(route('admin.roles.destroy', role.id), {
            preserveScroll: true,
            onSuccess: () => setViewMode('list'),
        });
    }
  };

  // --- Permission Logic ---

  const isGroupSelected = (group) => {
    // Check if every resource in the group has all its actions selected
    if (!availablePermissions[group]) return false;
    return Object.keys(availablePermissions[group]).every(resource => {
      const availableActions = availablePermissions[group][resource];
      const selectedActions = data.permissions[group]?.[resource] || [];
      return availableActions.length === selectedActions.length;
    });
  };

  const toggleAction = (group, resource, action) => {
    const currentGroup = data.permissions[group] || {};
    const currentResource = currentGroup[resource] || [];
    
    let newResource;
    if (currentResource.includes(action)) {
      newResource = currentResource.filter(a => a !== action);
    } else {
      newResource = [...currentResource, action];
    }
    
    const newPermissions = {
      ...data.permissions,
      [group]: {
        ...currentGroup,
        [resource]: newResource
      }
    };
    
    if (newResource.length === 0) delete newPermissions[group][resource];
    if (Object.keys(newPermissions[group]).length === 0) delete newPermissions[group];
    
    setData('permissions', newPermissions);
  };

  const toggleResource = (group, resource) => {
    const availableActions = availablePermissions[group][resource];
    const currentGroup = data.permissions[group] || {};
    const currentResource = currentGroup[resource] || [];
    
    let newResource;
    if (currentResource.length === availableActions.length) {
      newResource = [];
    } else {
      newResource = [...availableActions];
    }
    
    const newPermissions = {
      ...data.permissions,
      [group]: {
        ...currentGroup,
        [resource]: newResource
      }
    };

    if (newResource.length === 0) delete newPermissions[group][resource];
    if (Object.keys(newPermissions[group]).length === 0) delete newPermissions[group];

    setData('permissions', newPermissions);
  };

  const toggleGroup = (group) => {
    if (isGroupSelected(group)) {
      const newPermissions = { ...data.permissions };
      delete newPermissions[group];
      setData('permissions', newPermissions);
    } else {
      const fullGroup = {};
      Object.keys(availablePermissions[group]).forEach(resource => {
        fullGroup[resource] = availablePermissions[group][resource];
      });
      
      setData('permissions', {
        ...data.permissions,
        [group]: fullGroup
      });
    }
  };
  
  const toggleAll = () => {
    const allSelected = Object.keys(availablePermissions).every(g => isGroupSelected(g));
    
    if (allSelected) {
        setData('permissions', {});
    } else {
        const all = {};
        Object.keys(availablePermissions).forEach(group => {
            const groupPerms = {};
            Object.keys(availablePermissions[group]).forEach(resource => {
                groupPerms[resource] = availablePermissions[group][resource];
            });
            all[group] = groupPerms;
        });
        setData('permissions', all);
    }
  };

  const expandAll = () => {
    const newExpanded = {};
    Object.keys(availablePermissions).forEach(group => {
        newExpanded[group] = true;
    });
    setExpandedGroups(newExpanded);
  };

  const collapseAll = () => {
    setExpandedGroups({});
  };

  const toggleGroupExpand = (group) => {
    setExpandedGroups(prev => ({
        ...prev,
        [group]: !prev[group]
    }));
  };

  const isResourceSelected = (group, resource) => {
    const available = availablePermissions[group][resource];
    const selected = data.permissions[group]?.[resource] || [];
    return selected.length === available.length && available.length > 0;
  };
  
  const isResourceIndeterminate = (group, resource) => {
    const selected = data.permissions[group]?.[resource] || [];
    return selected.length > 0 && selected.length < availablePermissions[group][resource].length;
  };

  const isActionSelected = (group, resource, action) => {
    return data.permissions[group]?.[resource]?.includes(action);
  };

  return (
    <AdminLayout activeMenu="Platform Admin">
      <Head title={viewMode === 'list' ? "Roles And Permissions" : (viewMode === 'create' ? "Create Role" : "Edit Role")} />
      
      <div className="roles-page-container">
        {/* Breadcrumbs */}
        <nav className="roles-breadcrumbs">
          <Link href={getLocalizedRoute('admin.dashboard')} className="breadcrumb-link">DASHBOARD</Link>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-text">SYSTEM</span>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">ROLES AND PERMISSIONS</span>
          {viewMode !== 'list' && (
            <>
                <span className="breadcrumb-separator">/</span>
                <span className="breadcrumb-current">{viewMode === 'create' ? 'CREATE' : 'DETAILS "DESIGNER"'}</span>
            </>
          )}
        </nav>

        {viewMode === 'list' ? (
          <div className="roles-content-card">
            {/* List View Toolbar */}
            <div className="roles-toolbar">
              <div className="roles-toolbar__left">
                <div className="dropdown-action">
                  <button className="btn-outline dropdown-toggle">
                    Bulk Actions <span className="material-icons-outlined">expand_more</span>
                  </button>
                </div>
                <div className="search-box">
                  <input type="text" placeholder="Search..." className="search-input" />
                  <span className="material-icons-outlined search-icon">search</span>
                </div>
              </div>

              <div className="roles-toolbar__right">
                <button className="btn-primary" onClick={handleCreateClick}>
                  <span className="material-icons-outlined">add</span> Create
                </button>
                <button className="btn-outline reload-btn" onClick={() => window.location.reload()}>
                  <span className="material-icons-outlined">refresh</span> Reload
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="roles-table-container">
              <table className="roles-table">
                <thead>
                  <tr>
                    <th className="th-checkbox"><input type="checkbox" className="custom-checkbox" /></th>
                    <th className="th-sortable">ID</th>
                    <th className="th-sortable">NAME</th>
                    <th className="th-sortable">DESCRIPTION</th>
                    <th className="th-sortable">CREATED AT</th>
                    <th className="th-sortable">CREATED BY</th>
                    <th>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {roles.map(role => (
                    <tr key={role.id}>
                      <td className="td-checkbox"><input type="checkbox" className="custom-checkbox" /></td>
                      <td>{role.id}</td>
                      <td className="fw-bold">{role.name}</td>
                      <td>{role.description}</td>
                      <td>{role.created_at}</td>
                      <td>
                        {role.created_by ? (
                            <a href="#" className="creator-link">{role.created_by.name}</a>
                        ) : '-'}
                      </td>
                      <td>
    <ActionsCell 
        onEdit={() => handleEditClick(role)}
        onDelete={() => handleDelete(role)}
    />
</td>
                    </tr>
                  ))}
                  {roles.length === 0 && (
                      <tr><td colSpan="7" className="text-center p-4">No roles found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="roles-footer">
                <div className="roles-pagination-info">
                    <span className="globe-icon material-icons-outlined">public</span>
                    <span>1-10 of {roles.length} items.</span>
                    <span className="badge-count">{roles.length}</span>
                </div>
            </div>
          </div>
        ) : (
          <div className="roles-form-container">
            {/* Create/Edit Form */}
            <form onSubmit={handleSubmit}>
                <div className="form-layout">
                    {/* Left Column: Role Details */}
                    <div className="form-main-section">
                        <div className="form-card">
                            <div className="form-group">
                                <label className="form-label required">Name</label>
                                <input 
                                    type="text" 
                                    className={`form-input ${errors.name ? 'is-invalid' : ''}`}
                                    value={data.name}
                                    onChange={e => setData('name', e.target.value)}
                                    placeholder="Role Name"
                                />
                                {errors.name && <div className="invalid-feedback">{errors.name}</div>}
                            </div>
                            
                            <div className="form-group">
                                <label className="form-label">Description</label>
                                <textarea 
                                    className="form-textarea"
                                    value={data.description}
                                    onChange={e => setData('description', e.target.value)}
                                    placeholder="Role Description"
                                    rows="3"
                                ></textarea>
                            </div>

                            <div className="form-group checkbox-group">
                                <label className="switch-label">
                                    <input 
                                        type="checkbox" 
                                        checked={data.is_default}
                                        onChange={e => setData('is_default', e.target.checked)}
                                    />
                                    <span className="switch-text">Is default?</span>
                                </label>
                            </div>
                        </div>

                        {/* Permissions Section */}
                        <div className="permissions-card">
                            <div className="permissions-header">
                                <h3 className="permissions-title">Permission Flags</h3>
                                <div className="permissions-actions">
                                    <label className="all-permissions-label">
                                        <input 
                                            type="checkbox" 
                                            checked={Object.keys(availablePermissions).every(g => isGroupSelected(g))}
                                            onChange={toggleAll}
                                        />
                                        All Permissions
                                    </label>
                                    <button type="button" className="text-btn" onClick={collapseAll}>Collapse all</button>
                                    <span className="separator">|</span>
                                    <button type="button" className="text-btn" onClick={expandAll}>Expand all</button>
                                </div>
                            </div>

                            <div className="permissions-grid">
                                {Object.keys(availablePermissions).map(groupName => (
                                    <div key={groupName} className={`permission-group ${expandedGroups[groupName] ? 'expanded' : 'collapsed'}`}>
                                        <div className="group-header">
                                            <div className="group-left">
                                                <button type="button" className="collapse-icon" onClick={() => toggleGroupExpand(groupName)}>
                                                    <span className="material-icons-outlined">
                                                        {expandedGroups[groupName] ? 'expand_more' : 'chevron_right'}
                                                    </span>
                                                </button>
                                                <label className="group-checkbox">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={isGroupSelected(groupName)}
                                                        onChange={() => toggleGroup(groupName)}
                                                    />
                                                    <span className="group-name">{groupName}</span>
                                                </label>
                                            </div>
                                        </div>
                                        
                                        {expandedGroups[groupName] && (
                                            <div className="group-resources">
                                                {Object.keys(availablePermissions[groupName]).map(resourceName => (
                                                    <div key={resourceName} className="resource-item">
                                                        <div className="resource-header">
                                                            <label className="resource-checkbox">
                                                                <input 
                                                                    type="checkbox" 
                                                                    checked={isResourceSelected(groupName, resourceName)}
                                                                    ref={input => {
                                                                        if (input) input.indeterminate = isResourceIndeterminate(groupName, resourceName);
                                                                    }}
                                                                    onChange={() => toggleResource(groupName, resourceName)}
                                                                />
                                                                <span className="resource-name">{resourceName}</span>
                                                            </label>
                                                        </div>
                                                        
                                                        <div className="resource-actions">
                                                            {availablePermissions[groupName][resourceName].map(action => (
                                                                <label key={action} className="action-checkbox">
                                                                    <input 
                                                                        type="checkbox" 
                                                                        checked={isActionSelected(groupName, resourceName, action)}
                                                                        onChange={() => toggleAction(groupName, resourceName, action)}
                                                                    />
                                                                    <span className="action-name">{action}</span>
                                                                </label>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="form-actions">
                        <button type="button" className="btn-outline" onClick={handleCancel}>Cancel</button>
                        <button type="submit" className="btn-primary" disabled={processing}>
                            {processing ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </div>
            </form>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default RolesAndPermissions;
