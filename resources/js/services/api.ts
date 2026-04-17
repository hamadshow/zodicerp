import axios, { AxiosResponse } from 'axios';
import { ApiResponse, PaginatedResponse } from '@/types';

// Create axios instance
const api = axios.create({
  baseURL: '/api',
  timeout: 120000,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add CSRF token
    const csrfToken = document.querySelector('meta[name="csrf-token"]');
    if (csrfToken) {
      config.headers['X-CSRF-TOKEN'] = csrfToken.getAttribute('content')!;
    }

    // Add auth token if available
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

// Generic API methods
export const apiService = {
  get: <T = any>(url: string, params?: Record<string, any>): Promise<AxiosResponse<ApiResponse<T>>> =>
    api.get(url, { params }),

  post: <T = any>(url: string, data?: any): Promise<AxiosResponse<ApiResponse<T>>> =>
    api.post(url, data),

  put: <T = any>(url: string, data?: any): Promise<AxiosResponse<ApiResponse<T>>> =>
    api.put(url, data),

  patch: <T = any>(url: string, data?: any): Promise<AxiosResponse<ApiResponse<T>>> =>
    api.patch(url, data),

  delete: <T = any>(url: string): Promise<AxiosResponse<ApiResponse<T>>> =>
    api.delete(url),

  // File upload
  upload: (url: string, formData: FormData): Promise<AxiosResponse<ApiResponse>> =>
    api.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),
};

// Dashboard API
export const dashboardApi = {
  getStats: () => apiService.get('/dashboard/stats'),
  getSalesChart: (months = 12) => apiService.get('/dashboard/sales-chart', { months }),
  getOrderStatusDistribution: () => apiService.get('/dashboard/order-status-distribution'),
  getRevenueByMonth: (months = 12) => apiService.get('/dashboard/revenue-by-month', { months }),
  getRecentActivity: (limit = 10) => apiService.get('/dashboard/recent-activity', { limit }),
  getTopSellingProducts: (limit = 5) => apiService.get('/dashboard/top-selling-products', { limit }),
  getLowStockAlerts: (threshold = 10) => apiService.get('/dashboard/low-stock-alerts', { threshold }),
};

// Users API
export const usersApi = {
  getUsers: (params?: Record<string, any>) => apiService.get('/users', params),
  getUser: (id: number) => apiService.get(`/users/${id}`),
  createUser: (data: any) => apiService.post('/users', data),
  updateUser: (id: number, data: any) => apiService.put(`/users/${id}`, data),
  deleteUser: (id: number) => apiService.delete(`/users/${id}`),
  bulkDeleteUsers: (ids: number[]) => apiService.post('/users/bulk-delete', { ids }),
  assignRole: (userId: number, roleId: number) => apiService.post(`/users/${userId}/assign-role`, { role_id: roleId }),
  removeRole: (userId: number, roleId: number) => apiService.post(`/users/${userId}/remove-role`, { role_id: roleId }),
  checkPermission: (userId: number, permission: string) => apiService.post(`/users/${userId}/check-permission`, { permission }),
};

// Products API
export const productsApi = {
  getProducts: (params?: Record<string, any>) => apiService.get('/products', params),
  getProduct: (id: number) => apiService.get(`/products/${id}`),
  createProduct: (data: FormData) => apiService.upload('/products', data),
  updateProduct: (id: number, data: FormData) => apiService.upload(`/products/${id}`, data),
  deleteProduct: (id: number) => apiService.delete(`/products/${id}`),
  bulkDeleteProducts: (ids: number[]) => apiService.post('/products/bulk-delete', { ids }),
  bulkUpdateStatus: (ids: number[], status: string) => apiService.post('/products/bulk-update-status', { ids, status }),
  updateStock: (id: number, quantity: number, operation = 'set') =>
    apiService.post(`/products/${id}/update-stock`, { quantity, operation }),
};

// Orders API
export const ordersApi = {
  getOrders: (params?: Record<string, any>) => apiService.get('/orders', params),
  getOrder: (id: number) => apiService.get(`/orders/${id}`),
  createOrder: (data: any) => apiService.post('/orders', data),
  updateOrder: (id: number, data: any) => apiService.put(`/orders/${id}`, data),
  deleteOrder: (id: number) => apiService.delete(`/orders/${id}`),
  updateStatus: (id: number, status: string) => apiService.patch(`/orders/${id}/status`, { status }),
  bulkDeleteOrders: (ids: number[]) => apiService.post('/orders/bulk-delete', { ids }),
  bulkUpdateStatus: (ids: number[], status: string) => apiService.post('/orders/bulk-update-status', { ids, status }),
};

// Categories API
export const categoriesApi = {
  getCategories: (params?: Record<string, any>) => apiService.get('/categories', params),
  getCategory: (id: number) => apiService.get(`/categories/${id}`),
  createCategory: (data: any) => apiService.post('/categories', data),
  updateCategory: (id: number, data: any) => apiService.put(`/categories/${id}`, data),
  deleteCategory: (id: number) => apiService.delete(`/categories/${id}`),
  getTree: () => apiService.get('/categories/tree'),
};

// Roles API
export const rolesApi = {
  getRoles: (params?: Record<string, any>) => apiService.get('/roles', params),
  getRole: (id: number) => apiService.get(`/roles/${id}`),
  createRole: (data: any) => apiService.post('/roles', data),
  updateRole: (id: number, data: any) => apiService.put(`/roles/${id}`, data),
  deleteRole: (id: number) => apiService.delete(`/roles/${id}`),
  assignPermission: (roleId: number, permissionId: number) => apiService.post(`/roles/${roleId}/assign-permission`, { permission_id: permissionId }),
  removePermission: (roleId: number, permissionId: number) => apiService.post(`/roles/${roleId}/remove-permission`, { permission_id: permissionId }),
};

// Permissions API
export const permissionsApi = {
  getPermissions: (params?: Record<string, any>) => apiService.get('/permissions', params),
  getPermission: (id: number) => apiService.get(`/permissions/${id}`),
  createPermission: (data: any) => apiService.post('/permissions', data),
  updatePermission: (id: number, data: any) => apiService.put(`/permissions/${id}`, data),
  deletePermission: (id: number) => apiService.delete(`/permissions/${id}`),
};

// Auth API
export const authApi = {
  login: (credentials: { email: string; password: string }) => apiService.post('/auth/login', credentials),
  logout: () => apiService.post('/auth/logout'),
  refresh: () => apiService.post('/auth/refresh'),
  getProfile: () => apiService.get('/auth/profile'),
  updateProfile: (data: any) => apiService.put('/auth/profile', data),
  changePassword: (data: { current_password: string; password: string; password_confirmation: string }) =>
    apiService.post('/auth/change-password', data),
};

export default api;