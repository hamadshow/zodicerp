import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Head, usePage } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import Table from '../components/Table';
import BlankPage from '@/Components/BlankPage';
import '../../../../css/backend/main.scss';
import { apiService } from '../../../services/api';
import { useNotification } from '@/Components/Notifications/useNotification';

const Profession = ({ professions: initialProfessions = [], departments = [] }) => {
  const { props } = usePage();
  const { showSuccess, showError } = useNotification();
  const localization = props?.localization;
  const isArabic = localization?.current_locale === 'ar';
  const translations = localization?.translations || {};

  const t = useCallback(
    (key, fallback) => translations[`profession.${key}`] || translations[`common.${key}`] || fallback,
    [translations]
  );

  const getLocalizedRoute = useCallback(
    (name, params = {}) => {
      try {
        return route(name, {
          country: localization?.country_code || 'sa',
          lang: localization?.current_locale || 'ar',
          ...params,
        });
      } catch {
        return '#';
      }
    },
    [localization]
  );

  // State management
  const [professions, setProfessions] = useState(initialProfessions);
  const [showForm, setShowForm] = useState(false);
  const [editingProfession, setEditingProfession] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [currentFilterStatus, setCurrentFilterStatus] = useState('all');
  const [currentFilterCategory, setCurrentFilterCategory] = useState('all');
  const [formData, setFormData] = useState({
    company_id: 1,
    profession_name: '',
    profession_code: '',
    category: '',
    description: '',
    min_salary: '',
    max_salary: '',
    required_experience: '',
    education_level: 'Bachelor',
    key_skills: '',
    status: 'active',
    sort_order: 0,
  });

  // Fetch professions
  const fetchProfessions = async (params = {}) => {
    try {
      const response = await apiService.get('/professions', params);
      const data = response.data;
      setProfessions(Array.isArray(data) ? data : data.data || []);
    } catch (error) {
      console.error('Error fetching professions:', error);
      showError(t('error_loading', 'Error loading professions'));
    }
  };

  // Initialize
  useEffect(() => {
    if (initialProfessions.length === 0) {
      fetchProfessions();
    }
  }, []);

  const departmentNameById = useMemo(() => {
    const map = new Map();
    departments.forEach((dept) => {
      map.set(String(dept.id), isArabic ? dept.name_ar : dept.name_en);
    });
    return map;
  }, [departments, isArabic]);

  const getDepartmentName = useCallback(
    (deptId) => {
      if (!deptId) return '-';
      return departmentNameById.get(String(deptId)) || deptId;
    },
    [departmentNameById]
  );

  // Filter handlers
  const handleStatusFilter = (status) => {
    setCurrentFilterStatus(status);
    fetchProfessions({ 
      status: status === 'all' ? '' : status,
      department_id: currentFilterCategory === 'all' ? '' : currentFilterCategory 
    });
  };

  const handleCategoryFilter = (e) => {
    const categoryId = e.target.value;
    setCurrentFilterCategory(categoryId);
    fetchProfessions({ 
      status: currentFilterStatus === 'all' ? '' : currentFilterStatus,
      department_id: categoryId === 'all' ? '' : categoryId 
    });
  };

  const filteredProfessions = useMemo(() => {
    const lowerSearch = searchTerm.toLowerCase();
    return professions.filter((p) =>
      (p.profession_name || '').toLowerCase().includes(lowerSearch) ||
      (p.profession_code || '').toLowerCase().includes(lowerSearch) ||
      getDepartmentName(p.category).toLowerCase().includes(lowerSearch)
    );
  }, [professions, searchTerm, getDepartmentName]);

  // Stats calculation
  const stats = useMemo(() => {
    const total = professions.length;
    const active = professions.filter((p) => p.status === 'active').length;
    const employees = professions.reduce((sum, p) => sum + (parseInt(p.employees) || 0), 0);
    const vacant = professions.filter((p) => (parseInt(p.employees) || 0) === 0 && p.status === 'active').length;
    return { total, active, employees, vacant };
  }, [professions]);

  // Form handlers
  const handleAddEdit = (profession = null) => {
    setEditingProfession(profession);
    if (profession) {
      setFormData({
        company_id: profession.company_id || 1,
        profession_name: profession.profession_name || '',
        profession_code: profession.profession_code || '',
        category: profession.category || '',
        description: profession.description || '',
        min_salary: profession.min_salary || '',
        max_salary: profession.max_salary || '',
        required_experience: profession.required_experience || '',
        education_level: profession.education_level || 'Bachelor',
        key_skills: profession.key_skills || '',
        status: profession.status || 'active',
        sort_order: profession.sort_order || 0,
      });
    } else {
      resetForm();
    }
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingProfession(null);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      company_id: 1,
      profession_name: '',
      profession_code: '',
      category: '',
      description: '',
      min_salary: '',
      max_salary: '',
      required_experience: '',
      education_level: 'Bachelor',
      key_skills: '',
      status: 'active',
      sort_order: 0,
    });
  };

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.profession_name || !formData.profession_code) {
      showError(t('required_fields', 'Please fill in all required fields'));
      return;
    }

    try {
      if (editingProfession) {
        await apiService.put(`/professions/${editingProfession.id}`, formData);
        showSuccess(t('updated_success', 'Profession updated successfully'));
      } else {
        await apiService.post('/professions', formData);
        showSuccess(t('saved_success', 'Profession saved successfully'));
      }
      fetchProfessions();
      handleCancel();
    } catch (error) {
      console.error('Error saving profession:', error);
      const msg = error.response?.data?.message || t('error_saving', 'Error saving profession');
      showError(msg);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('confirm_delete', 'Are you sure you want to delete this profession?'))) return;

    try {
      await apiService.delete(`/professions/${id}`);
      showSuccess(t('deleted_success', 'Profession deleted successfully'));
      fetchProfessions();
    } catch (error) {
      console.error('Error deleting profession:', error);
      showError(t('error_deleting', 'Error deleting profession'));
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredProfessions.length && filteredProfessions.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredProfessions.map((p) => p.id));
    }
  };

  const handleRowSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]
    );
  };

  const columns = useMemo(() => [
    { 
      header: 'ID', 
      key: 'id', 
      sortable: true,
      render: (row) => row.id.toString().padStart(3, '0')
    },
    { 
      header: t('profession', 'PROFESSION'), 
      key: 'profession_name', 
      sortable: true,
      render: (row) => (
        <div className="employee-info">
          <div className="employee-avatar">
            <span className="material-icons-outlined" style={{ color: '#94a3b8' }}>work</span>
          </div>
          <div className="employee-details">
            <div className="employee-name" style={{ fontWeight: 600 }}>{row.profession_name}</div>
            <div className="employee-position" style={{ fontSize: '0.8rem', color: '#64748b' }}>{getDepartmentName(row.category)}</div>
          </div>
        </div>
      )
    },
    { 
      header: t('code', 'CODE'), 
      key: 'profession_code', 
      sortable: true,
      render: (row) => <strong style={{ color: 'var(--primary-color)' }}>{row.profession_code}</strong>
    },
    { 
      header: t('employees', 'EMPLOYEES'), 
      key: 'employees', 
      sortable: true,
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span className="material-icons-outlined" style={{ fontSize: '16px', color: '#64748b' }}>people</span>
          {row.employees || 0}
        </div>
      )
    },
    { 
      header: t('salary_range', 'SALARY RANGE'), 
      key: 'salary_range', 
      render: (row) => (
        <div className="salary-display" style={{ fontSize: '0.85rem' }}>
          ${parseFloat(row.min_salary || 0).toLocaleString()} - ${parseFloat(row.max_salary || 0).toLocaleString()}
        </div>
      )
    },
    { 
      header: t('status', 'STATUS'), 
      key: 'status', 
      sortable: true,
      render: (row) => (
        <span className={`employee-status status-${row.status === 'active' ? 'active' : 'inactive'}`}>
          {row.status === 'active' ? t('active', 'Active') : t('inactive', 'Inactive')}
        </span>
      )
    }
  ], [getDepartmentName, t]);

  const breadcrumbs = [
    { label: t('dashboard', 'Dashboard'), href: getLocalizedRoute('admin.dashboard') },
    { label: t('human_resources', 'Human Resources'), href: '#' },
    { label: t('professions', 'Professions'), active: true }
  ];

  const statsSection = (
    <div className="stats-cards">
      <div className="stat-card">
        <div className="stat-icon" style={{ backgroundColor: 'var(--info-color)' }}>
          <span className="material-icons-outlined">work</span>
        </div>
        <div className="stat-content">
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">{t('total_professions', 'Total Professions')}</div>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-icon" style={{ backgroundColor: 'var(--success-color)' }}>
          <span className="material-icons-outlined">check_circle</span>
        </div>
        <div className="stat-content">
          <div className="stat-value">{stats.active}</div>
          <div className="stat-label">{t('active_professions', 'Active Professions')}</div>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-icon" style={{ backgroundColor: 'var(--warning-color)' }}>
          <span className="material-icons-outlined">people</span>
        </div>
        <div className="stat-content">
          <div className="stat-value">{stats.employees}</div>
          <div className="stat-label">{t('total_employees', 'Total Employees')}</div>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-icon" style={{ backgroundColor: 'var(--danger-color)' }}>
          <span className="material-icons-outlined">warning</span>
        </div>
        <div className="stat-content">
          <div className="stat-value">{stats.vacant}</div>
          <div className="stat-label">{t('vacant_positions', 'Vacant Positions')}</div>
        </div>
      </div>
    </div>
  );

  return (
    <AdminLayout activeMenu="Profession">
      <Head title={t('professions', 'Professions Management')} />

      <BlankPage 
        breadcrumbs={breadcrumbs} 
        stats={!showForm && statsSection}
        filters={!showForm && (
          <div className="attendance-summary">
            <div className="attendance-buttons">
              {['all', 'active', 'inactive'].map((status) => (
                <button
                  key={status}
                  className={`attendance-btn ${currentFilterStatus === status ? 'active' : ''}`}
                  onClick={() => handleStatusFilter(status)}
                >
                  <span className="material-icons-outlined" style={{ fontSize: '16px' }}>
                    {status === 'all' ? 'all_inclusive' : status === 'active' ? 'check_circle' : 'cancel'}
                  </span>
                  {status === 'all' ? t('all', 'All') : t(status, status.charAt(0).toUpperCase() + status.slice(1))}
                </button>
              ))}
            </div>

            <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px', alignItems: 'center' }}>
              <select 
                className="form-control" 
                style={{ width: '200px', height: '42px' }}
                value={currentFilterCategory}
                onChange={handleCategoryFilter}
              >
                <option value="all">{t('all_departments', 'All Departments')}</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.id}>{isArabic ? dept.name_ar : dept.name_en}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      >
        {showForm ? (
          <div className="employees-card fade-in">
            <div className="card-header">
              <h3>{editingProfession ? t('edit_profession', 'Edit Profession') : t('add_profession', 'Add New Profession')}</h3>
              <button className="btn btn-outline" onClick={handleCancel}>
                <span className="material-icons-outlined">arrow_back</span>
                <span>{t('back_to_list', 'Back to List')}</span>
              </button>
            </div>
            <div className="card-body" style={{ padding: '20px' }}>
              <form onSubmit={handleSubmit}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">{t('profession_name', 'Profession Name')} *</label>
                    <input
                      type="text"
                      className="form-control"
                      id="profession_name"
                      value={formData.profession_name}
                      onChange={handleInputChange}
                      placeholder={t('enter_profession_name', 'Enter profession name')}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t('profession_code', 'Profession Code')} *</label>
                    <input
                      type="text"
                      className="form-control"
                      id="profession_code"
                      value={formData.profession_code}
                      onChange={(e) => setFormData(prev => ({ ...prev, profession_code: e.target.value.toUpperCase() }))}
                      placeholder={t('enter_profession_code', 'Enter profession code')}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">{t('department', 'Department')}</label>
                    <select
                      className="form-control"
                      id="category"
                      value={formData.category}
                      onChange={handleInputChange}
                    >
                      <option value="">{t('select_department', 'Select Department')}</option>
                      {departments.map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          {isArabic ? dept.name_ar : dept.name_en}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t('education_level', 'Education Level')}</label>
                    <select
                      className="form-control"
                      id="education_level"
                      value={formData.education_level}
                      onChange={handleInputChange}
                    >
                      <option value="High School">High School</option>
                      <option value="Diploma">Diploma</option>
                      <option value="Bachelor">Bachelor's Degree</option>
                      <option value="Master">Master's Degree</option>
                      <option value="PhD">PhD</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">{t('min_salary', 'Minimum Salary')}</label>
                    <input
                      type="number"
                      className="form-control"
                      id="min_salary"
                      value={formData.min_salary}
                      onChange={handleInputChange}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t('max_salary', 'Maximum Salary')}</label>
                    <input
                      type="number"
                      className="form-control"
                      id="max_salary"
                      value={formData.max_salary}
                      onChange={handleInputChange}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">{t('required_experience', 'Required Experience (Years)')}</label>
                    <input
                      type="number"
                      className="form-control"
                      id="required_experience"
                      value={formData.required_experience}
                      onChange={handleInputChange}
                      min="0"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t('status', 'Status')}</label>
                    <select className="form-control" id="status" value={formData.status} onChange={handleInputChange}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">{t('key_skills', 'Key Skills')}</label>
                  <input
                    type="text"
                    className="form-control"
                    id="key_skills"
                    value={formData.key_skills}
                    onChange={handleInputChange}
                    placeholder="e.g., Accounting, Excel, Management"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">{t('description', 'Description')}</label>
                  <textarea
                    className="form-control form-textarea"
                    id="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder={t('enter_description', 'Enter profession description')}
                    style={{ minHeight: '100px' }}
                  />
                </div>

                <div className="form-actions" style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                  <button type="submit" className="btn btn-primary">
                    {editingProfession ? t('update_profession', 'Update Profession') : t('save_profession', 'Save Profession')}
                  </button>
                  <button type="button" className="btn btn-outline" onClick={handleCancel}>
                    {t('cancel', 'Cancel')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : (
          <div className="employees-card fade-in">
            <Table
              showToolbar={true}
              toolbarSearch={true}
              toolbarSearchValue={searchTerm}
              onToolbarSearch={setSearchTerm}
              toolbarSearchPlaceholder={t('search_professions', 'Search professions...')}
              showAddButton={true}
              addButtonText={t('add_profession', 'Add Profession')}
              onAdd={handleAddEdit}
              showRefreshButton={true}
              onRefresh={() => {
                fetchProfessions();
                showSuccess(t('refreshed', 'Professions list refreshed!'));
              }}
              tableData={filteredProfessions.map(p => ({ ...p, selected: selectedIds.includes(p.id) }))}
              columns={columns}
              handleRowSelect={handleRowSelect}
              selectAll={selectedIds.length === filteredProfessions.length && filteredProfessions.length > 0}
              handleSelectAll={handleSelectAll}
              onEdit={(row) => handleAddEdit(row)}
              onDelete={(row) => handleDelete(row.id)}
            />
          </div>
        )}
      </BlankPage>
    </AdminLayout>
  );
};

export default Profession;
