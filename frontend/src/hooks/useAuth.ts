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
      } catch (error) {
        // Token is invalid, clear it
        apiService.clearToken();
        setIsAuthenticated(false);
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
