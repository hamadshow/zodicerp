import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  dashboardApi,
  usersApi,
  productsApi,
  ordersApi,
  categoriesApi,
  rolesApi,
  permissionsApi
} from '@/services/api';
import {
  User,
  Product,
  Order,
  Category,
  Role,
  Permission,
  DashboardStats,
  UserFormData,
  ProductFormData,
  OrderFormData,
  UserFilters,
  ProductFilters,
  OrderFilters
} from '@/types';

// Dashboard Hooks
export const useDashboardStats = () => {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: async () => {
      const response = await dashboardApi.getStats();
      return response.data.data as DashboardStats;
    },
  });
};

export const useSalesChart = (months = 12) => {
  return useQuery({
    queryKey: ['dashboard', 'sales-chart', months],
    queryFn: async () => {
      const response = await dashboardApi.getSalesChart(months);
      return response.data.data;
    },
  });
};

export const useOrderStatusDistribution = () => {
  return useQuery({
    queryKey: ['dashboard', 'order-status-distribution'],
    queryFn: async () => {
      const response = await dashboardApi.getOrderStatusDistribution();
      return response.data.data;
    },
  });
};

export const useRevenueByMonth = (months = 12) => {
  return useQuery({
    queryKey: ['dashboard', 'revenue-by-month', months],
    queryFn: async () => {
      const response = await dashboardApi.getRevenueByMonth(months);
      return response.data.data;
    },
  });
};

export const useRecentActivity = (limit = 10) => {
  return useQuery({
    queryKey: ['dashboard', 'recent-activity', limit],
    queryFn: async () => {
      const response = await dashboardApi.getRecentActivity(limit);
      return response.data.data;
    },
  });
};

// User Hooks
export const useUsers = (filters?: UserFilters, page = 1, perPage = 15) => {
  return useQuery({
    queryKey: ['users', filters, page, perPage],
    queryFn: async () => {
      const response = await usersApi.getUsers({ ...filters, page, per_page: perPage });
      return response.data;
    },
  });
};

export const useUser = (id: number) => {
  return useQuery({
    queryKey: ['users', id],
    queryFn: async () => {
      const response = await usersApi.getUser(id);
      return response.data.data as User;
    },
    enabled: !!id,
  });
};

export const useCreateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UserFormData) => usersApi.createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<UserFormData> }) =>
      usersApi.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => usersApi.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};

export const useBulkDeleteUsers = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: number[]) => usersApi.bulkDeleteUsers(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};

// Product Hooks
export const useProducts = (filters?: ProductFilters, page = 1, perPage = 15) => {
  return useQuery({
    queryKey: ['products', filters, page, perPage],
    queryFn: async () => {
      const response = await productsApi.getProducts({ ...filters, page, per_page: perPage });
      return response.data;
    },
  });
};

export const useProduct = (id: number) => {
  return useQuery({
    queryKey: ['products', id],
    queryFn: async () => {
      const response = await productsApi.getProduct(id);
      return response.data.data as Product;
    },
    enabled: !!id,
  });
};

export const useCreateProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: FormData) => productsApi.createProduct(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
};

export const useUpdateProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: FormData }) =>
      productsApi.updateProduct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
};

export const useDeleteProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => productsApi.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
};

// Order Hooks
export const useOrders = (filters?: OrderFilters, page = 1, perPage = 15) => {
  return useQuery({
    queryKey: ['orders', filters, page, perPage],
    queryFn: async () => {
      const response = await ordersApi.getOrders({ ...filters, page, per_page: perPage });
      return response.data;
    },
  });
};

export const useOrder = (id: number) => {
  return useQuery({
    queryKey: ['orders', id],
    queryFn: async () => {
      const response = await ordersApi.getOrder(id);
      return response.data.data as Order;
    },
    enabled: !!id,
  });
};

export const useCreateOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: OrderFormData) => ordersApi.createOrder(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useUpdateOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<OrderFormData> }) =>
      ordersApi.updateOrder(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useUpdateOrderStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: Order['status'] }) =>
      ordersApi.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

// Category Hooks
export const useCategories = (page = 1, perPage = 15) => {
  return useQuery({
    queryKey: ['categories', page, perPage],
    queryFn: async () => {
      const response = await categoriesApi.getCategories({ page, per_page: perPage });
      return response.data;
    },
  });
};

export const useCategoryTree = () => {
  return useQuery({
    queryKey: ['categories', 'tree'],
    queryFn: async () => {
      const response = await categoriesApi.getTree();
      return response.data.data;
    },
  });
};

// Role and Permission Hooks
export const useRoles = (page = 1, perPage = 15) => {
  return useQuery({
    queryKey: ['roles', page, perPage],
    queryFn: async () => {
      const response = await rolesApi.getRoles({ page, per_page: perPage });
      return response.data;
    },
  });
};

export const usePermissions = (page = 1, perPage = 15) => {
  return useQuery({
    queryKey: ['permissions', page, perPage],
    queryFn: async () => {
      const response = await permissionsApi.getPermissions({ page, per_page: perPage });
      return response.data;
    },
  });
};