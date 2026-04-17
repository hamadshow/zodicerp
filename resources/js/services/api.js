import axios from 'axios';
import { router } from '@inertiajs/react';

// Create axios instance
const api = axios.create({
  baseURL: '/api', // Laravel API base URL
  timeout: 120000, // Increased timeout to 2 minutes for large imports
  headers: {
    Accept: 'application/json',
  },
  withCredentials: true, // Include credentials (cookies) for session-based auth
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add CSRF token for Laravel (Inertia.js handles this automatically via cookies)
    const csrfToken = document.querySelector('meta[name="csrf-token"]');
    if (csrfToken) {
      config.headers['X-CSRF-TOKEN'] = csrfToken.getAttribute('content');
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle common errors
    if (error.response) {
      const { status, data } = error.response;

      switch (status) {
        case 401:
          // For session-based auth, redirect to login on unauthorized
          router.visit('/login');
          break;
        case 403:
          // Forbidden
          console.error('Access forbidden:', data.message);
          break;
        case 404:
          // Not found
          console.error('Resource not found:', data.message);
          break;
        case 422:
          // Validation errors
          console.error(
            'Validation errors:',
            data?.errors ?? data?.message ?? data,
          );
          break;
        case 500:
          // Server error
          console.error('Server error:', data.message);
          break;
        default:
          console.error('API Error:', data.message);
      }
    } else if (error.request) {
      // Network error
      console.error('Network error:', error.message);
    } else {
      // Other error
      console.error('Request error:', error.message);
    }

    return Promise.reject(error);
  }
);

// API methods
export const dashboardApi = {
  getStats: () => api.get('/dashboard/stats'),
  getSalesChart: (months = 12) => api.get('/dashboard/sales-chart', { params: { months } }),
  getOrderStatusDistribution: () => api.get('/dashboard/order-status-distribution'),
  getRevenueByMonth: (months = 12) => api.get('/dashboard/revenue-by-month', { params: { months } }),
  getRecentActivity: (limit = 10) => api.get('/dashboard/recent-activity', { params: { limit } }),
  getTopSellingProducts: (limit = 5) => api.get('/dashboard/top-selling-products', { params: { limit } }),
  getLowStockAlerts: (threshold = 10) => api.get('/dashboard/low-stock-alerts', { params: { threshold } }),
};

export const usersApi = {
  getUsers: (params) => api.get('/users', { params }),
  getUser: (id) => api.get(`/users/${id}`),
  createUser: (data) => api.post('/users', data),
  updateUser: (id, data) => api.put(`/users/${id}`, data),
  deleteUser: (id) => api.delete(`/users/${id}`),
  bulkDeleteUsers: (ids) => api.post('/users/bulk-delete', { ids }),
  assignRole: (userId, roleId) => api.post(`/users/${userId}/assign-role`, { role_id: roleId }),
  removeRole: (userId, roleId) => api.post(`/users/${userId}/remove-role`, { role_id: roleId }),
  checkPermission: (userId, permission) => api.post(`/users/${userId}/check-permission`, { permission }),
};

export const productsApi = {
  getProducts: (params) => api.get('/products', { params }),
  getProduct: (id) => api.get(`/products/${id}`),
  createProduct: (data) => api.post('/products', data),
  updateProduct: (id, data) => api.put(`/products/${id}`, data),
  deleteProduct: (id) => api.delete(`/products/${id}`),
  bulkDelete: (ids) => api.post('/products/bulk-delete', { ids }),
  bulkUpdateStatus: (ids, status) => api.post('/products/bulk-update-status', { ids, status }),
  updateStock: (id, quantity) => api.post(`/products/${id}/update-stock`, { quantity }),
};

export const ordersApi = {
  getOrders: (params) => api.get('/orders', { params }),
  getOrder: (id) => api.get(`/orders/${id}`),
  createOrder: (data) => api.post('/orders', data),
  updateOrder: (id, data) => api.put(`/orders/${id}`, data),
  deleteOrder: (id) => api.delete(`/orders/${id}`),
  updateStatus: (id, status, notes = '') => api.patch(`/orders/${id}/status`, { status, notes }),
  bulkDelete: (ids) => api.post('/orders/bulk-delete', { ids }),
  bulkUpdateStatus: (ids, status, notes = '') => api.post('/orders/bulk-update-status', { ids, status, notes }),
};

export const categoriesApi = {
  getCategories: (params) => api.get('/categories', { params }),
  getCategory: (id) => api.get(`/categories/${id}`),
  createCategory: (data) => api.post('/categories', data),
  updateCategory: (id, data) => api.put(`/categories/${id}`, data),
  deleteCategory: (id) => api.delete(`/categories/${id}`),
  getTree: (includeInactive = false) => api.get('/categories/tree', { params: { include_inactive: includeInactive } }),
};

export const rolesApi = {
  getRoles: (params) => api.get('/roles', { params }),
  getRole: (id) => api.get(`/roles/${id}`),
  createRole: (data) => api.post('/roles', data),
  updateRole: (id, data) => api.put(`/roles/${id}`, data),
  deleteRole: (id) => api.delete(`/roles/${id}`),
  assignPermission: (roleId, permissionId) => api.post(`/roles/${roleId}/assign-permission`, { permission_id: permissionId }),
  removePermission: (roleId, permissionId) => api.post(`/roles/${roleId}/remove-permission`, { permission_id: permissionId }),
};

export const permissionsApi = {
  getPermissions: (params) => api.get('/permissions', { params }),
  getPermission: (id) => api.get(`/permissions/${id}`),
  createPermission: (data) => api.post('/permissions', data),
  updatePermission: (id, data) => api.put(`/permissions/${id}`, data),
  deletePermission: (id) => api.delete(`/permissions/${id}`),
};

export const authApi = {
  login: (data) => api.post('/login', data),
  logout: () => api.post('/logout'),
  getUser: () => api.get('/user'),
};

export const apiService = {
  ...dashboardApi,
  ...usersApi,
  ...productsApi,
  ...ordersApi,
  ...categoriesApi,
  ...rolesApi,
  ...permissionsApi,
  ...authApi,
  // Generic CRUD methods
  get: (url, params = {}, config = {}) => api.get(url, { ...config, params }),
  post: (url, data = {}, config = {}) => api.post(url, data, config),
  put: (url, data = {}, config = {}) => api.put(url, data, config),
  patch: (url, data = {}, config = {}) => api.patch(url, data, config),
  delete: (url, config = {}) => api.delete(url, config),
};

export default api;
