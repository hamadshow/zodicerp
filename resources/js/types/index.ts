import React from 'react';

// User Types
export interface User {
  id: number;
  name: string;
  email: string;
  email_verified_at?: string;
  is_active: boolean;
  avatar?: string;
  roles?: Role[];
  created_at: string;
  updated_at: string;
}

export interface Role {
  id: number;
  name: string;
  display_name: string;
  description?: string;
  permissions?: Permission[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Permission {
  id: number;
  name: string;
  display_name: string;
  group?: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

// Product Types
export interface Product {
  id: number;
  name: string;
  slug: string;
  description?: string;
  price: number;
  stock_quantity: number;
  sku?: string;
  image?: string;
  status: 'active' | 'inactive' | 'draft';
  category_id?: number;
  category?: Category;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  parent_id?: number;
  parent?: Category;
  children?: Category[];
  sort_order: number;
  is_active: boolean;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// Order Types
export interface Order {
  id: number;
  order_number: string;
  user_id: number;
  user?: User;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  subtotal: number;
  tax: number;
  total: number;
  shipping_address?: Address;
  billing_address?: Address;
  notes?: string;
  items?: OrderItem[];
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  product?: Product;
  quantity: number;
  price: number;
  total: number;
  created_at: string;
  updated_at: string;
}

export interface Address {
  id?: number;
  street: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
}

// Dashboard Types
export interface DashboardStats {
  users: {
    total_users: number;
    active_users: number;
    new_users_today: number;
    users_by_role: Record<string, number>;
  };
  products: {
    total_products: number;
    active_products: number;
    out_of_stock: number;
    low_stock: number;
    total_value: number;
    products_by_category: Record<string, number>;
  };
  orders: {
    total_orders: number;
    total_revenue: number;
    pending_orders: number;
    completed_orders: number;
    monthly_revenue: Array<{
      month: number;
      year: number;
      revenue: number;
    }>;
    status_distribution: Record<string, number>;
  };
  categories: {
    total_categories: number;
    active_categories: number;
  };
  summary: {
    total_users: number;
    total_products: number;
    total_orders: number;
    total_revenue: number;
  };
}

export interface ChartData {
  labels: string[];
  data: number[];
  colors?: string[];
}

export interface Activity {
  id: string;
  type: 'order' | 'user' | 'product';
  title: string;
  description: string;
  amount?: number;
  created_at: string;
}

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T;
  errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number;
    to: number;
  };
}

// Form Types
export interface UserFormData {
  name: string;
  email: string;
  password?: string;
  password_confirmation?: string;
  role_id?: number;
  is_active: boolean;
}

export interface ProductFormData {
  name: string;
  slug: string;
  description: string;
  price: number;
  stock_quantity: number;
  sku: string;
  image?: File;
  status: 'active' | 'inactive' | 'draft';
  category_id?: number;
  metadata?: Record<string, unknown>;
}

export interface OrderFormData {
  user_id: number;
  status: Order['status'];
  shipping_address: Address;
  billing_address: Address;
  notes?: string;
  items: Array<{
    product_id: number;
    quantity: number;
    price: number;
  }>;
}

// Filter Types
export interface UserFilters {
  name?: string;
  email?: string;
  role_id?: number;
  is_active?: boolean;
  created_from?: string;
  created_to?: string;
}

export interface ProductFilters {
  name?: string;
  category_id?: number;
  status?: Product['status'];
  price_min?: number;
  price_max?: number;
  stock_min?: number;
  stock_max?: number;
}

export interface OrderFilters {
  order_number?: string;
  status?: Order['status'];
  user_id?: number;
  date_from?: string;
  date_to?: string;
  total_min?: number;
  total_max?: number;
}

// Component Props Types
export interface TableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  loading?: boolean;
  onRowClick?: (item: T) => void;
  selectable?: boolean;
  selectedRows?: number[];
  onSelectionChange?: (selectedIds: number[]) => void;
}

export interface TableColumn<T> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  render?: (value: unknown, item: T) => React.ReactNode;
  width?: string;
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export interface FormFieldProps {
  label: string;
  name: string;
  type?: string;
  value?: unknown;
  onChange?: (value: unknown) => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
  options?: Array<{ value: unknown; label: string }>;
}

// Utility Types
export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;