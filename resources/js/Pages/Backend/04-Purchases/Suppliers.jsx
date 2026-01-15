import React, { useState, useEffect } from 'react';
import { Head, Link } from '@inertiajs/react';
import '../../../../css/backend/Suppliers.css';
import AdminLayout from '../components/AdminLayout';
import { apiService } from '../../../services/api';

const SuppliersManagement = () => {
  // State management
  const [suppliers, setSuppliers] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteItem, setDeleteItem] = useState(null);
  const [formData, setFormData] = useState({
    supplier_name: '',
    company_name: '',
    email: '',
    phone: '',
    status: 'active',
    address: '',
    notes: '',
  });
  const [importFile, setImportFile] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [errors, setErrors] = useState({});

  // Initialize component
  useEffect(() => {
    fetchSuppliers();
  }, []);

  // Fetch suppliers
  const fetchSuppliers = async (page = 1, search = '') => {
    setLoading(true);
    try {
      const response = await apiService.get(`/admin/suppliers/data?page=${page}&per_page=${rowsPerPage}&search=${search}`);
      setSuppliers(response.data.data);
      setCurrentPage(response.data.current_page);
      setTotalItems(response.data.total);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      showToast('Error loading suppliers', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Toast notification
  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Modal handlers
  const openModal = (supplier = null) => {
    setEditingSupplier(supplier);
    setErrors({});
    if (supplier) {
      setFormData({
        supplier_name: supplier.supplier_name,
        company_name: supplier.company_name || '',
        email: supplier.email,
        phone: supplier.phone || '',
        status: supplier.status,
        address: supplier.address || '',
        notes: supplier.notes || '',
      });
    } else {
      setFormData({
        supplier_name: '',
        company_name: '',
        email: '',
        phone: '',
        status: 'active',
        address: '',
        notes: '',
      });
    }
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingSupplier(null);
    setFormData({
      supplier_name: '',
      company_name: '',
      email: '',
      phone: '',
      status: 'active',
      address: '',
      notes: '',
    });
    setErrors({});
  };

  // Form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      const url = editingSupplier
        ? `/admin/suppliers/${editingSupplier.id}`
        : '/admin/suppliers';
      
      let response;
      if (editingSupplier) {
        response = await apiService.put(url, formData);
      } else {
        response = await apiService.post(url, formData);
      }

      if (response.data.success) {
        showToast(response.data.message, 'success');
        closeModal();
        fetchSuppliers(currentPage, searchTerm);
      } else {
        showToast('Error saving supplier', 'error');
      }
    } catch (error) {
      console.error('Error saving supplier:', error);
      if (error.response && error.response.data && error.response.data.errors) {
        setErrors(error.response.data.errors);
      } else {
        showToast('Error saving supplier', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  // Delete handlers
  const handleDeleteClick = (supplier) => {
    setDeleteItem(supplier);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deleteItem) return;
    
    try {
      const response = await apiService.delete(`/admin/suppliers/${deleteItem.id}`);
      if (response.data.success) {
        showToast(response.data.message, 'success');
        setShowDeleteModal(false);
        setDeleteItem(null);
        fetchSuppliers(currentPage, searchTerm);
      } else {
        showToast('Error deleting supplier', 'error');
      }
    } catch (error) {
      console.error('Error deleting supplier:', error);
      showToast('Error deleting supplier', 'error');
    }
  };

  // Bulk actions
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(suppliers.map(s => s.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(itemId => itemId !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    
    if (window.confirm(`Are you sure you want to delete ${selectedIds.length} selected suppliers?`)) {
      try {
        const response = await apiService.post('/admin/suppliers/bulk-delete', { ids: selectedIds });
        if (response.data.success) {
          showToast(response.data.message, 'success');
          setSelectedIds([]);
          fetchSuppliers(currentPage, searchTerm);
        }
      } catch (error) {
        showToast('Error deleting suppliers', 'error');
      }
    }
  };

  const handleBulkStatus = async (status) => {
    if (selectedIds.length === 0) return;

    try {
      const response = await apiService.post('/admin/suppliers/bulk-status', { 
        ids: selectedIds,
        status: status 
      });
      
      if (response.data.success) {
        showToast(response.data.message, 'success');
        setSelectedIds([]);
        fetchSuppliers(currentPage, searchTerm);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      showToast('Error updating status', 'error');
    }
  };

  // Import handler
  const handleImport = async (e) => {
    e.preventDefault();
    if (!importFile) return;

    const formData = new FormData();
    formData.append('file', importFile);

    setLoading(true);
    try {
        // We need to set content type for file upload, usually apiService handles JSON.
        // If apiService is axios instance, we can override headers.
        // Assuming apiService is axios-like
        const response = await apiService.post('/admin/suppliers/import', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        showToast(response.data.message, 'success');
        setImportModalOpen(false);
        setImportFile(null);
        fetchSuppliers(currentPage, searchTerm);
    } catch (error) {
        console.error('Error importing suppliers:', error);
        showToast('Error importing suppliers', 'error');
    } finally {
        setLoading(false);
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    fetchSuppliers(1, e.target.value);
  };

  const applyBulkAction = (action) => {
    if (action === 'delete') {
      handleBulkDelete();
    } else if (action === 'active' || action === 'inactive') {
      handleBulkStatus(action);
    }
    const select = document.getElementById('bulkActions');
    if (select) select.value = '';
  };

  return (
    <AdminLayout activeMenu="Purchases">
      <Head title="Suppliers Management" />
      
      {/* Toast Notification */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>{toast.message}</div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay active" onClick={() => setShowDeleteModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Delete Supplier</h3>
              <button className="modal-close" onClick={() => setShowDeleteModal(false)}>
                <span className="material-icons-outlined">close</span>
              </button>
            </div>
            <div className="modal-body">
              <p>
                Are you sure you want to delete <strong>{deleteItem?.supplier_name}</strong>? This action cannot be undone.
              </p>
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowDeleteModal(false)}>Cancel</button>
              <button className="btn btn-danger" onClick={confirmDelete}>Delete Supplier</button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {importModalOpen && (
        <div className="modal-overlay active" onClick={() => setImportModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Import Suppliers</h3>
              <button className="modal-close" onClick={() => setImportModalOpen(false)}>
                <span className="material-icons-outlined">close</span>
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleImport}>
                <div className="form-group">
                    <label className="form-label">CSV File</label>
                    <input 
                        type="file" 
                        accept=".csv,.txt"
                        className="form-control"
                        onChange={(e) => setImportFile(e.target.files[0])}
                        required
                    />
                    <small className="form-text text-muted">
                        Format: Name, Email, Phone, Company, Status
                    </small>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-outline" onClick={() => setImportModalOpen(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={loading || !importFile}>
                    {loading ? 'Importing...' : 'Import'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="modal-overlay active" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
              </h3>
              <button className="modal-close" onClick={closeModal}>
                <span className="material-icons-outlined">close</span>
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmit}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Supplier Name *</label>
                    <input
                      type="text"
                      className={`form-control ${errors.supplier_name ? 'is-invalid' : ''}`}
                      value={formData.supplier_name}
                      onChange={(e) => setFormData({...formData, supplier_name: e.target.value})}
                      required
                    />
                    {errors.supplier_name && <div className="invalid-feedback">{errors.supplier_name}</div>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Company Name</label>
                    <input
                      type="text"
                      className={`form-control ${errors.company_name ? 'is-invalid' : ''}`}
                      value={formData.company_name}
                      onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                    />
                    {errors.company_name && <div className="invalid-feedback">{errors.company_name}</div>}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Email *</label>
                    <input
                      type="email"
                      className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      required
                    />
                    {errors.email && <div className="invalid-feedback">{errors.email}</div>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input
                      type="text"
                      className={`form-control ${errors.phone ? 'is-invalid' : ''}`}
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    />
                    {errors.phone && <div className="invalid-feedback">{errors.phone}</div>}
                  </div>
                </div>

                <div className="form-group">
                    <label className="form-label">Address</label>
                    <textarea
                        className={`form-control ${errors.address ? 'is-invalid' : ''}`}
                        value={formData.address}
                        onChange={(e) => setFormData({...formData, address: e.target.value})}
                        rows="2"
                    ></textarea>
                    {errors.address && <div className="invalid-feedback">{errors.address}</div>}
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select
                      className="form-control"
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value})}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                    <label className="form-label">Notes</label>
                    <textarea
                        className={`form-control ${errors.notes ? 'is-invalid' : ''}`}
                        value={formData.notes}
                        onChange={(e) => setFormData({...formData, notes: e.target.value})}
                        rows="2"
                    ></textarea>
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn btn-outline" onClick={closeModal}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? 'Saving...' : (editingSupplier ? 'Update Supplier' : 'Create Supplier')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <div className="suppliers-container">
        <div className="page-header">
          <div className="header-title">
            <h1>Suppliers Management</h1>
          </div>
        </div>

      {/* Quick Stats */}
      <div className="stats-cards">
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'var(--primary-color)' }}>
            <span className="material-icons-outlined">inventory_2</span>
          </div>
          <div className="stat-content">
            <div className="stat-value">{totalItems}</div>
            <div className="stat-label">Total Suppliers</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'var(--success-color)' }}>
            <span className="material-icons-outlined">verified</span>
          </div>
          <div className="stat-content">
            <div className="stat-value">{suppliers.filter(s => s.status === 'active').length}</div>
            <div className="stat-label">Active Suppliers</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'var(--warning-color)' }}>
            <span className="material-icons-outlined">pending</span>
          </div>
          <div className="stat-content">
            <div className="stat-value">{suppliers.filter(s => s.status === 'inactive').length}</div>
            <div className="stat-label">Inactive Suppliers</div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'var(--info-color)' }}>
            <span className="material-icons-outlined">business</span>
          </div>
          <div className="stat-content">
            <div className="stat-value">{new Set(suppliers.map(s => s.company_name)).size}</div>
            <div className="stat-label">Companies</div>
          </div>
        </div>
      </div>

      {/* Main Card */}
       <div className="suppliers-card fade-in">
         <div className="card-header">
           <div className="suppliers-actions">
            <select
              className="btn btn-outline"
              id="bulkActions"
              onChange={(e) => applyBulkAction(e.target.value)}
              disabled={selectedIds.length === 0}
            >
              <option value="">Bulk Actions</option>
              <option value="active">Set Active</option>
              <option value="inactive">Set Inactive</option>
              <option value="delete">Delete Selected</option>
            </select>
             <div className="search-bar light">
                 <input
                     type="text"
                     placeholder="Search suppliers..."
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                 />
                 <button>
                     <span className="material-icons-outlined">search</span>
                 </button>
             </div>
            <button className="btn btn-outline" onClick={() => setImportModalOpen(true)}>
                <span className="material-icons-outlined">upload_file</span>
                Import
            </button>
            <button className="btn btn-outline">
                <span className="material-icons-outlined">download</span>
                Export
            </button>
          </div>
          <div className="actions">
            <button className="btn btn-primary" onClick={() => openModal()}>
                <span className="material-icons-outlined">add</span>
                Add Supplier
            </button>
            <button className="btn btn-outline" onClick={() => showToast('Suppliers list refreshed!', 'success')}>
                <span className="material-icons-outlined">refresh</span>
                Refresh
            </button>
          </div>
        </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="checkbox-cell">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === suppliers.length && suppliers.length > 0}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th>Supplier Name</th>
                  <th>Company</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" className="text-center">Loading...</td>
                  </tr>
                ) : suppliers.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center">No suppliers found</td>
                  </tr>
                ) : (
                  suppliers.map((supplier) => (
                    <tr key={supplier.id}>
                      <td className="checkbox-cell">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(supplier.id)}
                          onChange={() => handleSelectRow(supplier.id)}
                        />
                      </td>
                      <td>
                        <div className="supplier-info">
                          <div className="supplier-details">
                            <span className="supplier-name">{supplier.supplier_name}</span>
                          </div>
                        </div>
                      </td>
                      <td>{supplier.company_name}</td>
                      <td>{supplier.email}</td>
                      <td>{supplier.phone}</td>
                      <td>
                        <span className={`supplier-status status-${String(supplier.status || '').toLowerCase()}`}>
                          {supplier.status}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons-cell">
                          <Link
                            href={route('admin.suppliers.profile', supplier.id)}
                            className="btn-icon"
                            title="View Profile"
                          >
                            <span className="material-icons-outlined">visibility</span>
                          </Link>
                          <button
                            className="btn-icon"
                            onClick={() => openModal(supplier)}
                            title="Edit"
                          >
                            <span className="material-icons-outlined">edit</span>
                          </button>
                          <button
                            className="btn-icon delete-btn"
                            onClick={() => handleDeleteClick(supplier)}
                            title="Delete"
                          >
                            <span className="material-icons-outlined">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination would go here */}
        </div>
      </div>
    </AdminLayout>
  );
};

export default SuppliersManagement;
