import { useState, useEffect } from 'react';
import { apiService } from '../services/api';

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = apiService.getToken();

      if (!token) {
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      try {
        // Try to get current user to verify token is valid
        await apiService.get('/auth/me');
        setIsAuthenticated(true);
      } catch (error: unknown) {
        // Only clear token if it's an authentication error (401)
        // Don't clear on network errors or other issues
        const axiosError = error as { response?: { status?: number } };
        if (axiosError?.response?.status === 401) {
          apiService.clearToken();
          setIsAuthenticated(false);
        } else {
          // For other errors, assume token is still valid but there's a temporary issue
          console.warn('Auth check failed with non-401 error:', error);
          setIsAuthenticated(true); // Assume still authenticated
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = (token: string) => {
    apiService.setToken(token);
    setIsAuthenticated(true);
  };

  const logout = () => {
    apiService.clearToken();
    setIsAuthenticated(false);
  };

  return {
    isAuthenticated,
    isLoading,
    login,
    logout,
  };
}
