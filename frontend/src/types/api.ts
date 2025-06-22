export interface HealthResponse {
  status: string;
  version: string;
  uptime: number;
  storage: {
    available: number;
    total: number;
  };
}
