import { apiService } from './api';
import type { HealthResponse } from '../types/api';

class HealthService {
  async checkHealth(): Promise<HealthResponse> {
    return apiService.get<HealthResponse>('/health');
  }
}

export const healthService = new HealthService();
