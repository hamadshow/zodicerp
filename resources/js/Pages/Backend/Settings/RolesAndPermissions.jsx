import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Head, Link, usePage, useForm, router } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import Table from '../components/Table';

const RolesAndPermissions = ({ roles, availablePermissions, stats, filters }) => {
  const { localization } = usePage().props;
  const [viewMode, setViewMode] = useState('list'); // 'list', 'create', 'edit'
  const [editingRole, setEditingRole] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [permissionSearch, setPermissionSearch] = useState('');
  
  const [searchQuery, setSearchQuery] = useState(filters?.search || '');
  const [statusFilter, setStatusFilter] = useState(filters?.status || '');
  const [typeFilter, setTypeFilter] = useState(filters?.type || '');

  const { data, setData, post, put, processing, errors, reset, clearErrors, delete: destroy } = useForm({
    name: '',
    description: '',
    is_default: false,
    status: 'active',
    permissions: {}
  });

  // Handle Search and Filters
  const handleFilterChange = useCallback(() => {
    router.get(route('admin.roles.index'), {
      search: searchQuery,
      status: statusFilter,
      type: typeFilter
    }, {
      preserveState: true,
      preserveScroll: true,
      replace: true
    });
  }, [searchQuery, statusFilter, typeFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleFilterChange();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, statusFilter, typeFilter]);

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
        status: editingRole.status || 'active',
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

  const handleRowSelect = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedIds([]);
    } else {
      setSelectedIds(roles.map(r => r.id));
    }
    setSelectAll(!selectAll);
  };

  const handleDuplicate = (role) => {
    router.post(route('admin.roles.duplicate', role.id));
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    if (confirm(`Are you sure you want to delete ${selectedIds.length} roles?`)) {
        router.post(route('admin.roles.bulk-delete'), { ids: selectedIds }, {
            onSuccess: () => setSelectedIds([])
        });
    }
  };

  const columns = useMemo(() => [
    { header: 'ID', key: 'id', sortable: true },
    { 
      header: 'NAME', 
      key: 'name', 
      sortable: true,
      render: (role) => (
        <div>
            <div className="fw-bold">{role.name}</div>
            <div className="text-muted small">{role.slug}</div>
        </div>
      )
    },
    { 
        header: 'PERMISSIONS SUMMARY', 
        key: 'permissions_summary',
        render: (role) => (
            <div className="permission-summary">
                <span className="badge-pill bg-blue-soft text-blue">
                    {role.module_count} Modules
                </span>
                <span className="badge-pill bg-green-soft text-green ml-1">
                    {role.permission_count} Perms
                </span>
                <div className="small text-muted mt-1">Last Updated: {role.updated_at}</div>
            </div>
        )
    },
    { 
        header: 'STATUS', 
        key: 'status', 
        render: (role) => (
            <span className={`badge ${role.status === 'active' ? 'bg-success' : 'bg-secondary'}`}>
                {role.status}
            </span>
        )
    },
    { 
        header: 'ASSIGNED TO', 
        key: 'assigned', 
        render: (role) => (
            <div className="assigned-info">
                <div>Users: {role.users_count}</div>
                <div>Employees: {role.employees_count}</div>
            </div>
        )
    },
    { 
      header: 'CREATED BY', 
      key: 'created_by', 
      render: (role) => role.created_by ? (
        <span className="creator-link">{role.created_by.name}</span>
      ) : '-'
    }
  ], []);

  const tableData = useMemo(() => {
    return roles.map(r => ({
      ...r,
      selected: selectedIds.includes(r.id)
    }));
  }, [roles, selectedIds]);

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

  const clearAll = () => {
    setData('permissions', {});
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

  // Filter permissions based on search
  const filteredPermissions = useMemo(() => {
    if (!permissionSearch) return availablePermissions;
    
    const filtered = {};
    Object.keys(availablePermissions).forEach(group => {
        const groupMatches = group.toLowerCase().includes(permissionSearch.toLowerCase());
        const matchedResources = {};
        
        Object.keys(availablePermissions[group]).forEach(resource => {
            const resourceMatches = resource.toLowerCase().includes(permissionSearch.toLowerCase());
            const matchedActions = availablePermissions[group][resource].filter(action => 
                action.toLowerCase().includes(permissionSearch.toLowerCase())
            );
            
            if (resourceMatches || matchedActions.length > 0 || groupMatches) {
                matchedResources[resource] = availablePermissions[group][resource];
            }
        });
        
        if (Object.keys(matchedResources).length > 0) {
            filtered[group] = matchedResources;
        }
    });
    return filtered;
  }, [availablePermissions, permissionSearch]);

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
        </nav>

        {viewMode === 'list' && (
            <div className="stats-grid mb-4">
                <div className="stat-card">
                    <div className="stat-label">Total Roles</div>
                    <div className="stat-value">{stats.total_roles}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Total Permissions</div>
                    <div className="stat-value">{stats.total_permissions}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Default Roles</div>
                    <div className="stat-value">{stats.default_roles}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Active Roles</div>
                    <div className="stat-value text-success">{stats.active_roles}</div>
                </div>
            </div>
        )}

        {viewMode === 'list' ? (
          <div className="roles-content-card">
            {/* List View Toolbar */}
            <div className="roles-toolbar">
              <div className="roles-toolbar__left">
                <div className="bulk-actions-group">
                    {selectedIds.length > 0 && (
                        <>
                            <button className="btn-outline-danger btn-sm mr-2" onClick={handleBulkDelete}>
                                <span className="material-icons-outlined">delete</span> Delete ({selectedIds.length})
                            </button>
                            <button className="btn-outline-primary btn-sm mr-2">
                                <span className="material-icons-outlined">file_download</span> Export
                            </button>
                        </>
                    )}
                </div>
                
                <div className="filters-row flex items-center gap-2">
                    <div className="search-box">
                        <input 
                            type="text" 
                            placeholder="Search Roles..." 
                            className="search-input" 
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                        <span className="material-icons-outlined search-icon">search</span>
                    </div>
                    
                    <select 
                        className="filter-select" 
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                    >
                        <option value="">All Status</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
                    
                    <select 
                        className="filter-select"
                        value={typeFilter}
                        onChange={e => setTypeFilter(e.target.value)}
                    >
                        <option value="">All Types</option>
                        <option value="default">Default</option>
                        <option value="custom">Custom</option>
                    </select>
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
            <Table 
                tableData={tableData}
                columns={columns}
                handleRowSelect={handleRowSelect}
                selectAll={selectAll}
                handleSelectAll={handleSelectAll}
                onEdit={(role) => handleEditClick(role)}
                onDelete={(role) => handleDelete(role)}
                actions={(role) => (
                    <button 
                        className="btn-icon text-blue" 
                        title="Duplicate" 
                        onClick={() => handleDuplicate(role)}
                    >
                        <span className="material-icons-outlined">content_copy</span>
                    </button>
                )}
            />
            
            <div className="roles-footer">
                <div className="roles-pagination-info">
                    <span className="globe-icon material-icons-outlined">public</span>
                    <span>Showing {roles.length} items.</span>
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
                            <div className="grid grid-cols-2 gap-4">
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
                                    <label className="form-label">Status</label>
                                    <select 
                                        className="form-input"
                                        value={data.status}
                                        onChange={e => setData('status', e.target.value)}
                                    >
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </div>
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
                                <div className="flex items-center gap-4">
                                    <h3 className="permissions-title">Permission Flags</h3>
                                    <div className="search-permissions-box">
                                        <input 
                                            type="text" 
                                            placeholder="Search permissions..." 
                                            className="search-input-sm"
                                            value={permissionSearch}
                                            onChange={e => setPermissionSearch(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="permissions-actions">
                                    <label className="all-permissions-label">
                                        <input 
                                            type="checkbox" 
                                            checked={Object.keys(availablePermissions).every(g => isGroupSelected(g))}
                                            onChange={toggleAll}
                                        />
                                        All Permissions
                                    </label>
                                    <button type="button" className="text-btn" onClick={clearAll}>Clear all</button>
                                    <span className="separator">|</span>
                                    <button type="button" className="text-btn" onClick={collapseAll}>Collapse all</button>
                                    <span className="separator">|</span>
                                    <button type="button" className="text-btn" onClick={expandAll}>Expand all</button>
                                </div>
                            </div>

                            <div className="permissions-grid">
                                {Object.keys(filteredPermissions).map(groupName => (
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
                                                    <span className="permission-badge ml-2">
                                                        {Object.keys(data.permissions[groupName] || {}).length} / {Object.keys(availablePermissions[groupName]).length}
                                                    </span>
                                                </label>
                                            </div>
                                        </div>
                                        
                                        {expandedGroups[groupName] && (
                                            <div className="group-resources">
                                                {Object.keys(filteredPermissions[groupName]).map(resourceName => (
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
                                                            {filteredPermissions[groupName][resourceName].map(action => (
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
