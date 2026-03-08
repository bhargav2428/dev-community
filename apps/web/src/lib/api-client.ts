import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { getSession, signOut } from 'next-auth/react';
import { getPublicApiUrl } from '@/lib/env-utils';

// API response types
interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  timestamp: string;
}

interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
}

interface PaginatedResponse<T> {
  success: true;
  data: T[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext?: boolean;
    hasPrev?: boolean;
  };
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext?: boolean;
    hasPrev?: boolean;
  };
  timestamp: string;
}

// Create axios instance
const api = axios.create({
  baseURL: getPublicApiUrl(),
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor - add auth token
api.interceptors.request.use(
  async (config) => {
    // Get session token from NextAuth
    if (typeof window !== 'undefined') {
      const session = await getSession();
      if (session?.accessToken) {
        config.headers.Authorization = `Bearer ${session.accessToken}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors
api.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    return response;
  },
  async (error: AxiosError<ApiErrorResponse>) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    // Handle 401 - unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // Session is invalid - sign out and redirect to login
      // NextAuth handles token refresh via its own callbacks
      if (typeof window !== 'undefined') {
        const session = await getSession();
        if (!session?.accessToken) {
          // No valid session, redirect to login
          await signOut({ redirect: true, callbackUrl: '/login' });
          return Promise.reject(error);
        }
      }
    }

    // Handle other errors
    const errorMessage = error.response?.data?.error?.message || error.message || 'An error occurred';
    
    return Promise.reject({
      message: errorMessage,
      code: error.response?.data?.error?.code || 'UNKNOWN_ERROR',
      status: error.response?.status || 500,
      details: error.response?.data?.error?.details,
    });
  }
);

// API helper functions
export const apiClient = {
  get: <T = any>(url: string, config?: AxiosRequestConfig) =>
    api.get<ApiResponse<T>>(url, config).then((res) => res.data.data),

  post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) =>
    api.post<ApiResponse<T>>(url, data, config).then((res) => res.data.data),

  put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) =>
    api.put<ApiResponse<T>>(url, data, config).then((res) => res.data.data),

  patch: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) =>
    api.patch<ApiResponse<T>>(url, data, config).then((res) => res.data.data),

  delete: <T = any>(url: string, config?: AxiosRequestConfig) =>
    api.delete<ApiResponse<T>>(url, config).then((res) => res.data.data),

  getPaginated: <T = any>(url: string, config?: AxiosRequestConfig) =>
    api.get<PaginatedResponse<T>>(url, config).then((res) => ({
      data: res.data.data,
      pagination: res.data.pagination || res.data.meta || {
        page: 1,
        limit: res.data.data?.length || 0,
        total: res.data.data?.length || 0,
        totalPages: 1,
      },
    })),
};

export default api;
