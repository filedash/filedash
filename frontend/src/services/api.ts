import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from 'axios';
import type { UploadResponse } from '../types/file';

export interface RequestOptions extends AxiosRequestConfig {
  requiresAuth?: boolean;
}

class ApiService {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080/api',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

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
          // Handle unauthorized - clear token and redirect to login
          this.clearToken();
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('auth_token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('auth_token');
    }
    return this.token;
  }

  async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    const response: AxiosResponse<T> = await this.client.get(endpoint, options);
    return response.data;
  }

  async post<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
    const response: AxiosResponse<T> = await this.client.post(endpoint, data, options);
    return response.data;
  }

  async put<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
    const response: AxiosResponse<T> = await this.client.put(endpoint, data, options);
    return response.data;
  }

  async delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    const response: AxiosResponse<T> = await this.client.delete(endpoint, options);
    return response.data;
  }

  async uploadFile(endpoint: string, formData: FormData, onProgress?: (progress: number) => void): Promise<UploadResponse> {
    return this.client.post(endpoint, formData, {
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
  }

  async downloadFile(endpoint: string): Promise<Blob> {
    const response = await this.client.get(endpoint, {
      responseType: 'blob',
    });
    return response.data;
  }
}

export const apiService = new ApiService();
