import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import { apiService } from '../../../services/api';
import '../../../../css/backend/Suppliers.css';

const SupplierProfile = ({ supplier, products }) => {
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [toast, setToast] = useState(null);

  // Initialize selected products with currently assigned ones
  const assignedProducts = supplier.products || [];

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleAssignProducts = async (e) => {
    e.preventDefault();
    try {
      const response = await apiService.post(`/admin/suppliers/${supplier.id}/products`, {
        product_ids: selectedProducts
      });
      
      if (response.data.success) {
        showToast(response.data.message, 'success');
        setAssignModalOpen(false);
        window.location.reload();
      }
    } catch (error) {
      console.error('Error assigning products:', error);
      showToast('Error assigning products', 'error');
    }
  };

  const toggleProductSelection = (productId) => {
    if (selectedProducts.includes(productId)) {
      setSelectedProducts(selectedProducts.filter(id => id !== productId));
    } else {
      setSelectedProducts([...selectedProducts, productId]);
    }
  };

  return (
    <AdminLayout activeMenu="Purchases">
      <Head title={`${supplier.supplier_name} - Profile`} />
      
      {toast && (
        <div className={`toast toast-${toast.type}`}>{toast.message}</div>
      )}

      {/* Assign Products Modal */}
      {assignModalOpen && (
        <div className="modal-overlay active" onClick={() => setAssignModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Assign Products</h3>
              <button className="modal-close" onClick={() => setAssignModalOpen(false)}>
                <span className="material-icons-outlined">close</span>
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Select Products</label>
                <div className="products-selection-list">
                  {products.map(product => (
                    <div key={product.id} className="checkbox-item">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={selectedProducts.includes(product.id)}
                          onChange={() => toggleProductSelection(product.id)}
                        />
                        <span>{product.name} ({product.product_code})</span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setAssignModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAssignProducts}>Save Assignments</button>
            </div>
          </div>
        </div>
      )}

      <div className="profile-container">
        {/* Header */}
        <div className="profile-header-card">
          <div className="profile-cover"></div>
          <div className="profile-info-wrapper">
            <div className="profile-avatar-large">
              {supplier.supplier_name.charAt(0)}
            </div>
            <div className="profile-main-info">
              <h1>{supplier.supplier_name}</h1>
              <p className="position">{supplier.company_name}</p>
              <div className="profile-badges">
                <span className={`supplier-status status-${String(supplier.status || '').toLowerCase()}`}>
                  {supplier.status}
                </span>
              </div>
            </div>
            <div className="profile-actions">
              <Link href={route('admin.suppliers.index')} className="btn btn-outline">
                <span className="material-icons-outlined">arrow_back</span>
                Back to List
              </Link>
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="profile-content-grid">
          {/* Left Column */}
          <div className="profile-left-col">
            <div className="suppliers-card">
              <h3 className="card-title">Contact Information</h3>
              <div className="info-list">
                <div className="info-item">
                  <span className="material-icons-outlined">email</span>
                  <div className="info-content">
                    <label>Email</label>
                    <p>{supplier.email}</p>
                  </div>
                </div>
                <div className="info-item">
                  <span className="material-icons-outlined">phone</span>
                  <div className="info-content">
                    <label>Phone</label>
                    <p>{supplier.phone || 'N/A'}</p>
                  </div>
                </div>
                <div className="info-item">
                  <span className="material-icons-outlined">location_on</span>
                  <div className="info-content">
                    <label>Address</label>
                    <p>{supplier.address || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="profile-right-col">
            <div className="suppliers-card">
                <div className="card-header">
                    <h3 className="card-title">Assigned Products</h3>
                    <button className="btn btn-sm btn-primary" onClick={() => {
                        setSelectedProducts(assignedProducts.map(p => p.id));
                        setAssignModalOpen(true);
                    }}>
                        <span className="material-icons-outlined">edit</span>
                        Manage Products
                    </button>
                </div>
                
                <div className="table-responsive">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Product Name</th>
                                <th>Code</th>
                                <th>Cost Price</th>
                            </tr>
                        </thead>
                        <tbody>
                            {assignedProducts.length === 0 ? (
                                <tr>
                                    <td colSpan="3" className="text-center">No products assigned</td>
                                </tr>
                            ) : (
                                assignedProducts.map(product => (
                                    <tr key={product.id}>
                                        <td>{product.name}</td>
                                        <td>{product.product_code || product.code}</td>
                                        <td>{product.pivot?.cost_price || '-'}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default SupplierProfile;
