import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from 'axios';
import type { UploadResponse } from '../types/file';
import { mockApiService } from './mockApi';

export interface RequestOptions extends AxiosRequestConfig {
  requiresAuth?: boolean;
}

// Check if we should use mock API
const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === 'true';

class ApiService {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor() {
    const apiUrl = import.meta.env.VITE_API_URL || '/api';

    this.client = axios.create({
      baseURL: apiUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Load token from localStorage on initialization
    // For mock API, we still want to load from localStorage to maintain consistency
    this.token = localStorage.getItem('auth_token');

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        if (this.token) {
          config.headers.Authorization = `Bearer ${this.token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Only redirect if we're not already on the login page
          // and if this isn't a login attempt
          const currentPath = window.location.pathname;
          const isLoginEndpoint = error.config?.url?.includes('/auth/login');

          if (!isLoginEndpoint && currentPath !== '/login') {
            // Handle unauthorized - clear token and redirect to login
            this.clearToken();
            window.location.href = '/login';
          } else if (isLoginEndpoint) {
            // For login attempts, just clear any existing token but don't redirect
            this.clearToken();
          }
        }
        return Promise.reject(error);
      }
    );
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('auth_token', token);
    if (USE_MOCK_API) {
      mockApiService.setToken(token);
    }
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('auth_token');
    if (USE_MOCK_API) {
      mockApiService.clearToken();
    }
  }

  getToken(): string | null {
    // Always check localStorage first to ensure we have the latest token
    const storedToken = localStorage.getItem('auth_token');
    if (storedToken !== this.token) {
      this.token = storedToken;
    }

    if (USE_MOCK_API) {
      return mockApiService.getToken();
    }
    return this.token;
  }

  async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    if (USE_MOCK_API) {
      return mockApiService.get<T>(endpoint);
    }
    const response: AxiosResponse<T> = await this.client.get(endpoint, options);
    return response.data;
  }

  async post<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
    if (USE_MOCK_API) {
      return mockApiService.post<T>(endpoint, data);
    }
    const response: AxiosResponse<T> = await this.client.post(endpoint, data, options);
    return response.data;
  }

  async put<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
    if (USE_MOCK_API) {
      return mockApiService.put<T>(endpoint, data);
    }
    const response: AxiosResponse<T> = await this.client.put(endpoint, data, options);
    return response.data;
  }

  async delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    if (USE_MOCK_API) {
      return mockApiService.delete<T>(endpoint);
    }
    const response: AxiosResponse<T> = await this.client.delete(endpoint, options);
    return response.data;
  }

  async uploadFile(endpoint: string, formData: FormData, onProgress?: (progress: number) => void): Promise<UploadResponse> {
    if (USE_MOCK_API) {
      return mockApiService.uploadFile(endpoint, formData, onProgress);
    }

    try {
      console.log('API Upload request:', {
        endpoint,
        baseURL: this.client.defaults.baseURL,
        formDataEntries: Array.from(formData.entries()).map(([key, value]) => ({
          key,
          value: value instanceof File ? `File: ${value.name} (${value.size} bytes)` : value
        }))
      });

      const response = await this.client.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(progress);
          }
        },
      });

      console.log('API Upload response:', response.data);
      return response.data;
    } catch (error) {
      console.error('API Upload error:', error);
      if (axios.isAxiosError(error)) {
        console.error('Upload error details:', {
          response: error.response?.data,
          status: error.response?.status,
          statusText: error.response?.statusText
        });
      }
      throw error;
    }
  }

  async downloadFile(endpoint: string): Promise<Blob> {
    if (USE_MOCK_API) {
      return mockApiService.downloadFile(endpoint);
    }

    const response = await this.client.get(endpoint, {
      responseType: 'blob',
    });
    return response.data;
  }
}

export const apiService = new ApiService();
