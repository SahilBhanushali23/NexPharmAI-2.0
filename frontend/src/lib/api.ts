import { SystemHealth } from '@/types';

const API_BASE_URL = "/api";
export class ApiClientError extends Error {
  statusCode: number;
  data: unknown;

  constructor(message: string, statusCode: number, data?: unknown) {
    super(message);
    this.name = 'ApiClientError';
    this.statusCode = statusCode;
    this.data = data;
  }
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  private getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('nexpharm_token');
    }
    return null;
  }

  setToken(token: string) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('nexpharm_token', token);
    }
  }

  clearToken() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('nexpharm_token');
    }
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    const token = this.getToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        let errorData: any = null;
        try {
          errorData = await response.json();
        } catch {
          errorData = { detail: await response.text() };
        }

        const message = errorData?.detail || errorData?.message || `HTTP error ${response.status}`;
        
        if (response.status === 401 && typeof window !== 'undefined') {
          this.clearToken();
        }

        throw new ApiClientError(message, response.status, errorData);
      }

      return (await response.json()) as T;
    } catch (error: any) {
      if (error instanceof ApiClientError) {
        throw error;
      }
      throw new ApiClientError(error?.message || 'Network error occurred', 0);
    }
  }

  // System & Health
  async getHealth(): Promise<SystemHealth> {
    return this.request<SystemHealth>('/api/v1/health');
  }

  // Auth
  async login(credentials: { email: string; password: string }): Promise<any> {
    const res = await this.request<any>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    if (res?.access_token) {
      this.setToken(res.access_token);
    }
    return res;
  }

  async register(data: any): Promise<any> {
    return this.request('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getMe(): Promise<any> {
    return this.request('/api/v1/auth/me');
  }

  // Machines
  async getMachines(params: Record<string, any> = {}): Promise<any[]> {
    const qs = new URLSearchParams(params).toString();
    return this.request(`/api/v1/machines${qs ? `?${qs}` : ''}`);
  }

  async getMachine(id: string): Promise<any> {
    return this.request(`/api/v1/machines/${id}`);
  }

  async createMachine(data: any): Promise<any> {
    return this.request('/api/v1/machines', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateMachine(id: string, data: any): Promise<any> {
    return this.request(`/api/v1/machines/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Readings & Telemetry
  async ingestReading(data: any): Promise<any> {
    return this.request('/api/v1/readings/ingest', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getMachineReadings(machineId: string, limit: number = 30): Promise<any[]> {
    return this.request(`/api/v1/readings/${machineId}?limit=${limit}`);
  }

  // Predictive Maintenance
  async predictFailure(data: any): Promise<any> {
    return this.request('/api/v1/predictive-maintenance/predict', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async runMachinePrediction(machineId: string): Promise<any> {
    return this.request(`/api/v1/predictive-maintenance/machines/${machineId}/predict`, {
      method: 'POST',
    });
  }

  // Anomaly Detection
  async predictAnomaly(data: any): Promise<any> {
    return this.request('/api/v1/anomaly-detection/predict', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async runMachineAnomalyCheck(machineId: string): Promise<any> {
    return this.request(`/api/v1/anomaly-detection/machines/${machineId}/anomaly-check`, {
      method: 'POST',
    });
  }

  async getAnomalyHistory(machineId: string): Promise<any[]> {
    return this.request(`/api/v1/anomaly-detection/machines/${machineId}/history`);
  }

  // Alerts
  async getAlerts(params: Record<string, any> = {}): Promise<any[]> {
    const qs = new URLSearchParams(params).toString();
    return this.request(`/api/v1/alerts${qs ? `?${qs}` : ''}`);
  }

  async acknowledgeAlert(alertId: string): Promise<any> {
    return this.request(`/api/v1/alerts/${alertId}/acknowledge`, {
      method: 'PATCH',
    });
  }

  async resolveAlert(alertId: string): Promise<any> {
    return this.request(`/api/v1/alerts/${alertId}/resolve`, {
      method: 'PATCH',
    });
  }

  // Maintenance
  async getMaintenanceRecords(params: Record<string, any> = {}): Promise<any[]> {
    const qs = new URLSearchParams(params).toString();
    return this.request(`/api/v1/maintenance${qs ? `?${qs}` : ''}`);
  }

  async createMaintenance(data: any): Promise<any> {
    return this.request('/api/v1/maintenance', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateMaintenance(id: string, data: any): Promise<any> {
    return this.request(`/api/v1/maintenance/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Products
  async getProducts(): Promise<any[]> {
    return this.request('/api/v1/products');
  }

  async createProduct(data: any): Promise<any> {
    return this.request('/api/v1/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Inventory
  async getInventory(params: Record<string, any> = {}): Promise<any[]> {
    const qs = new URLSearchParams(params).toString();
    return this.request(`/api/v1/inventory${qs ? `?${qs}` : ''}`);
  }

  async createMaterial(data: any): Promise<any> {
    return this.request('/api/v1/inventory', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async adjustStock(materialId: string, data: any): Promise<any> {
    return this.request(`/api/v1/inventory/${materialId}/adjust`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Production
  async getOrders(): Promise<any[]> {
    return this.request('/api/v1/production/orders');
  }

  async createOrder(data: any): Promise<any> {
    return this.request('/api/v1/production/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getBatches(params: Record<string, any> = {}): Promise<any[]> {
    const qs = new URLSearchParams(params).toString();
    return this.request(`/api/v1/production/batches${qs ? `?${qs}` : ''}`);
  }

  async updateBatchStatus(batchId: string, status: string): Promise<any> {
    return this.request(`/api/v1/production/batches/${batchId}/status?status_str=${status}`, {
      method: 'PATCH',
    });
  }

  // Scheduler
  async generateSchedule(data: { horizon_days: number } = { horizon_days: 7 }): Promise<any> {
    return this.request('/api/v1/scheduler/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getActiveSchedule(): Promise<any> {
    return this.request('/api/v1/scheduler/active');
  }

  async getScheduleRevisions(): Promise<any[]> {
    return this.request('/api/v1/scheduler/revisions');
  }

  async triggerReschedule(data: { machine_id: string; trigger_reason?: string }): Promise<any> {
    return this.request('/api/v1/scheduler/reschedule', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Quality
  async predictQuality(data: any): Promise<any> {
    return this.request('/api/v1/quality/predict', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getQualityHistory(batchId?: string): Promise<any[]> {
    return this.request(`/api/v1/quality/history${batchId ? `?batch_id=${batchId}` : ''}`);
  }

  // Forecasting
  async generateForecast(data: { product_id: string; horizon_days: number }): Promise<any> {
    return this.request('/api/v1/forecasting/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Analytics & Dashboard
  async getDashboardSummary(): Promise<any> {
    return this.request('/api/v1/analytics/dashboard');
  }

  async getMachineOEE(machineId: string): Promise<any> {
    return this.request(`/api/v1/analytics/oee/machines/${machineId}`);
  }

  // Assistant
  async queryAssistant(query: string): Promise<{ query: string; answer: string; data_context: any; timestamp: string }> {
    return this.request('/api/v1/assistant/query', {
      method: 'POST',
      body: JSON.stringify({ query }),
    });
  }
}

export const api = new ApiClient(API_BASE_URL);
export default api;
