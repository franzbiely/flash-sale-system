import axios from 'axios';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Clear token and redirect to login
      localStorage.removeItem('adminToken');
      window.location.href = '/admin/login';
    }
    return Promise.reject(error);
  }
);

// API Service Types
export interface FlashSale {
  _id: string;
  productId: {
    _id: string;
    name: string;
    price: number;
    salePrice?: number;
    imageUrl?: string;
  };
  startTime: string;
  endTime: string;
  stock: number;
  status: 'upcoming' | 'active' | 'ended';
  timeRemaining?: {
    hours: number;
    minutes: number;
    totalMilliseconds: number;
  };
  timeUntilStart?: {
    days: number;
    hours: number;
    minutes: number;
    totalMilliseconds: number;
  };
}

export interface Product {
  _id: string;
  name: string;
  price: number;
  salePrice?: number;
  stock: number;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseRequest {
  email: string;
  productId: string;
}

export interface PurchaseVerification {
  email: string;
  productId: string;
  otp: string;
}

export interface AdminLogin {
  email: string;
  password: string;
}

// API Service
export const apiService = {
  // Public Flash Sales
  getActiveFlashSales: (params?: { page?: number; limit?: number }) =>
    api.get<{ success: boolean; flashSales: FlashSale[] }>('/api/flash-sales/active', { params }),

  getUpcomingFlashSales: (params?: { page?: number; limit?: number }) =>
    api.get<{ success: boolean; flashSales: FlashSale[] }>('/api/flash-sales/upcoming', { params }),

  getEndedFlashSales: (params?: { page?: number; limit?: number }) =>
    api.get<{ success: boolean; flashSales: FlashSale[] }>('/api/flash-sales/ended', { params }),

  getFlashSaleSummary: () =>
    api.get<{ success: boolean; summary: any }>('/api/flash-sales/summary'),

  // Purchase Flow
  requestPurchase: (data: PurchaseRequest) =>
    api.post<{ success: boolean; message: string; data: any }>('/api/request-purchase', data),

  verifyPurchase: (data: PurchaseVerification) =>
    api.post<{ success: boolean; message: string; purchase: any }>('/api/verify-purchase', data),

  getPurchaseStatus: (email: string) =>
    api.get<{ success: boolean; data: any }>(`/api/purchase-status/${email}`),

  // Admin Authentication
  adminLogin: (data: AdminLogin) =>
    api.post<{ success: boolean; token: string; admin: any }>('/api/admin/login', data),

  getAdminProfile: () =>
    api.get<{ success: boolean; admin: any }>('/api/admin/profile'),

  // Admin Products
  getProducts: (params?: { page?: number; limit?: number; search?: string; inStock?: boolean }) =>
    api.get<{ success: boolean; products: Product[] }>('/api/admin/products', { params }),

  createProduct: (data: Omit<Product, '_id' | 'createdAt' | 'updatedAt'>) =>
    api.post<{ success: boolean; product: Product }>('/api/admin/products', data),

  updateProduct: (id: string, data: Partial<Product>) =>
    api.put<{ success: boolean; product: Product }>(`/api/admin/products/${id}`, data),

  deleteProduct: (id: string) =>
    api.delete<{ success: boolean; message: string }>(`/api/admin/products/${id}`),

  // Admin Flash Sales
  getAdminFlashSales: (params?: { page?: number; limit?: number; status?: string }) =>
    api.get<{ success: boolean; flashSales: FlashSale[] }>('/api/admin/flash-sales', { params }),

  createFlashSale: (data: { productId: string; startTime: string; endTime: string; stock: number }) =>
    api.post<{ success: boolean; flashSale: FlashSale }>('/api/admin/flash-sales', data),

  updateFlashSale: (id: string, data: Partial<{ startTime: string; endTime: string; stock: number }>) =>
    api.put<{ success: boolean; flashSale: FlashSale }>(`/api/admin/flash-sales/${id}`, data),

  deleteFlashSale: (id: string) =>
    api.delete<{ success: boolean; message: string }>(`/api/admin/flash-sales/${id}`),

  // Admin Customers
  getCustomers: (params?: { page?: number; limit?: number; search?: string }) =>
    api.get<{ success: boolean; customers: any[] }>('/api/admin/customers', { params }),

  getCustomerById: (id: string) =>
    api.get<{ success: boolean; customer: any }>(`/api/admin/customers/${id}`),

  // Admin Purchases
  getAllPurchases: (params?: { 
    page?: number; 
    limit?: number; 
    verified?: boolean; 
    startDate?: string; 
    endDate?: string; 
  }) =>
    api.get<{ success: boolean; purchases: any[]; summary: any }>('/api/admin/purchases', { params }),

  getPurchaseAnalytics: (params?: { days?: number }) =>
    api.get<{ success: boolean; analytics: any }>('/api/admin/analytics/purchases', { params }),

  // Queue Statistics
  getQueueStats: () =>
    api.get<{ success: boolean; queueStats: any }>('/api/admin/queue/stats'),
};

export default api;
