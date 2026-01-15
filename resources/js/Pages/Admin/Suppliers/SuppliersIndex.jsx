import React, { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import '../../../../css/backend/Employees.css';
import AdminLayout from '../../Backend/components/AdminLayout';
import { apiService } from '../../../services/api';

const SuppliersManagement = () => {
  // State management
  const [suppliers, setSuppliers] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
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
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [errors, setErrors] = useState({});

  // Fetch suppliers from API
  const fetchSuppliers = async (page = 1, search = '') => {
    setLoading(true);
    try {
      const response = await apiService.get('/admin/suppliers/data', {
        params: {
          page,
          per_page: rowsPerPage,
          search,
        }
      });
      const data = response.data;
      setSuppliers(data.data);
      setTotalItems(data.total);
      setCurrentPage(data.current_page);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      showToast('Error loading suppliers', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Initialize component
  useEffect(() => {
    fetchSuppliers(currentPage, searchTerm);
  }, [currentPage, searchTerm, rowsPerPage]);

  // Handle Search
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
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
    setErrors({});
  };

  // Form handlers
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingSupplier) {
        await apiService.put(`/admin/suppliers/${editingSupplier.id}`, formData);
        showToast('Supplier updated successfully', 'success');
      } else {
        await apiService.post('/admin/suppliers', formData);
        showToast('Supplier created successfully', 'success');
      }
      closeModal();
      fetchSuppliers(currentPage, searchTerm);
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
    setLoading(true);
    try {
      await apiService.delete(`/admin/suppliers/${deleteItem.id}`);
      showToast('Supplier deleted successfully', 'success');
      setShowDeleteModal(false);
      setDeleteItem(null);
      fetchSuppliers(currentPage, searchTerm);
    } catch (error) {
      console.error('Error deleting supplier:', error);
      showToast('Error deleting supplier', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Bulk actions
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(suppliers.map((s) => s.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((itemId) => itemId !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm('Are you sure you want to delete selected suppliers?')) return;
    
    setLoading(true);
    try {
        await apiService.post('/admin/suppliers/bulk-delete', { ids: selectedIds });
        showToast('Selected suppliers deleted successfully', 'success');
        setSelectedIds([]);
        fetchSuppliers(currentPage, searchTerm);
    } catch (error) {
        console.error('Error deleting suppliers:', error);
        showToast('Error deleting suppliers', 'error');
    } finally {
        setLoading(false);
    }
  };

  return (
    <AdminLayout activeMenu="Purchases">
      <Head title="Suppliers Management" />
      
      <div className="employees-container">
        <div className="page-header">
          <div className="header-title">
            <h1>Suppliers Management</h1>
            <p>Manage your suppliers and their information</p>
          </div>
          <div className="header-actions">
            <button className="btn btn-primary" onClick={() => openModal()}>
              <span className="material-icons-outlined">add</span>
              Add Supplier
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="stats-grid">
            <div className="stat-card">
                <div className="stat-icon bg-blue-100 text-blue-600">
                    <span className="material-icons-outlined">people</span>
                </div>
                <div className="stat-content">
                    <h3>Total Suppliers</h3>
                    <p>{totalItems}</p>
                </div>
            </div>
            <div className="stat-card">
                <div className="stat-icon bg-green-100 text-green-600">
                    <span className="material-icons-outlined">check_circle</span>
                </div>
                <div className="stat-content">
                    <h3>Active Suppliers</h3>
                    <p>{suppliers.filter(s => s.status === 'active').length}</p> {/* Approximate for current page */}
                </div>
            </div>
        </div>

        <div className="content-card">
          <div className="table-actions">
            <div className="search-box">
              <span className="material-icons-outlined">search</span>
              <input
                type="text"
                placeholder="Search suppliers..."
                value={searchTerm}
                onChange={handleSearch}
              />
            </div>
            <div className="action-buttons">
                {selectedIds.length > 0 && (
                    <button className="btn btn-danger" onClick={handleBulkDelete}>
                        <span className="material-icons-outlined">delete</span>
                        Delete Selected ({selectedIds.length})
                    </button>
                )}
              <button className="btn btn-outline">
                <span className="material-icons-outlined">filter_list</span>
                Filter
              </button>
              <button className="btn btn-outline">
                <span className="material-icons-outlined">file_download</span>
                Export
              </button>
            </div>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th width="40">
                    <input
                      type="checkbox"
                      checked={suppliers.length > 0 && selectedIds.length === suppliers.length}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th>Supplier Name</th>
                  <th>Company</th>
                  <th>Contact Info</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && suppliers.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-4">Loading...</td>
                  </tr>
                ) : suppliers.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-4">No suppliers found</td>
                  </tr>
                ) : (
                  suppliers.map((supplier) => (
                    <tr key={supplier.id} className={selectedIds.includes(supplier.id) ? 'selected' : ''}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(supplier.id)}
                          onChange={() => handleSelectOne(supplier.id)}
                        />
                      </td>
                      <td>
                        <div className="user-info">
                          <div className="user-details">
                            <span className="name">{supplier.supplier_name}</span>
                          </div>
                        </div>
                      </td>
                      <td>{supplier.company_name || '-'}</td>
                      <td>
                        <div className="contact-info">
                          <div>{supplier.email}</div>
                          <div className="text-muted">{supplier.phone}</div>
                        </div>
                      </td>
                      <td>
                        <span className={`status-badge ${supplier.status}`}>
                          {supplier.status}
                        </span>
                      </td>
                      <td>
                        <div className="row-actions">
                          <button
                            className="action-btn edit"
                            onClick={() => openModal(supplier)}
                            title="Edit"
                          >
                            <span className="material-icons-outlined">edit</span>
                          </button>
                          <button
                            className="action-btn delete"
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

          <div className="pagination-container">
            <div className="rows-per-page">
                <span>Rows per page:</span>
                <select value={rowsPerPage} onChange={(e) => setRowsPerPage(Number(e.target.value))}>
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                </select>
            </div>
            <div className="pagination-controls">
                <button 
                  disabled={currentPage === 1} 
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  className="btn-icon"
                >
                  <span className="material-icons-outlined">chevron_left</span>
                </button>
                <span>Page {currentPage} of {Math.ceil(totalItems / rowsPerPage) || 1}</span>
                <button 
                  disabled={currentPage >= Math.ceil(totalItems / rowsPerPage)} 
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  className="btn-icon"
                >
                  <span className="material-icons-outlined">chevron_right</span>
                </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}</h2>
              <button className="close-btn" onClick={closeModal}>
                <span className="material-icons-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-row">
                    <div className="form-group">
                        <label>Supplier Name *</label>
                        <input
                          type="text"
                          name="supplier_name"
                          value={formData.supplier_name}
                          onChange={handleInputChange}
                          className={errors.supplier_name ? 'error' : ''}
                          required
                        />
                        {errors.supplier_name && <span className="error-text">{errors.supplier_name}</span>}
                    </div>
                    <div className="form-group">
                        <label>Company Name</label>
                        <input
                          type="text"
                          name="company_name"
                          value={formData.company_name}
                          onChange={handleInputChange}
                          className={errors.company_name ? 'error' : ''}
                        />
                        {errors.company_name && <span className="error-text">{errors.company_name}</span>}
                    </div>
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label>Email *</label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          className={errors.email ? 'error' : ''}
                          required
                        />
                        {errors.email && <span className="error-text">{errors.email}</span>}
                    </div>
                    <div className="form-group">
                        <label>Phone</label>
                        <input
                          type="text"
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          className={errors.phone ? 'error' : ''}
                        />
                        {errors.phone && <span className="error-text">{errors.phone}</span>}
                    </div>
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label>Status *</label>
                        <select
                          name="status"
                          value={formData.status}
                          onChange={handleInputChange}
                          className={errors.status ? 'error' : ''}
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                        {errors.status && <span className="error-text">{errors.status}</span>}
                    </div>
                    <div className="form-group">
                        <label>Address</label>
                        <input
                          type="text"
                          name="address"
                          value={formData.address}
                          onChange={handleInputChange}
                        />
                    </div>
                </div>
                
                <div className="form-group">
                    <label>Notes</label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      rows="3"
                    ></textarea>
                </div>
              </div>
              <div className="modal-footer">
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
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Confirm Delete</h2>
              <button className="close-btn" onClick={() => setShowDeleteModal(false)}>
                <span className="material-icons-outlined">close</span>
              </button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete supplier <strong>{deleteItem?.supplier_name}</strong>?</p>
              <p className="text-warning">This action cannot be undone.</p>
            </div>
            <div className="modal-footer">
              <button 
                type="button" 
                className="btn btn-outline" 
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn btn-danger" 
                onClick={confirmDelete}
                disabled={loading}
              >
                {loading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`toast ${toast.type}`}>
          <span className="material-icons-outlined">
            {toast.type === 'success' ? 'check_circle' : 'error'}
          </span>
          <span>{toast.message}</span>
        </div>
      )}
    </AdminLayout>
  );
};

export default SuppliersManagement;
