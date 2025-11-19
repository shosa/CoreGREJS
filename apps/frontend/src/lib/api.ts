import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3011/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    // Il token è salvato dentro lo store Zustand
    const authStorage = localStorage.getItem('coregre-auth');
    if (authStorage) {
      try {
        const authState = JSON.parse(authStorage);
        const token = authState.state?.token;
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (e) {
        // Ignora errori di parsing
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Pulisci lo store Zustand
      localStorage.removeItem('coregre-auth');
      // Usa replace per evitare loop nella history
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        window.location.replace('/login');
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: async (username: string, password: string) => {
    const response = await api.post('/auth/login', { username, password });
    return response.data;
  },
  getProfile: async () => {
    const response = await api.get('/auth/profile');
    return response.data;
  },
  updateProfile: async (data: any) => {
    const response = await api.put('/auth/profile', data);
    return response.data;
  },
  changePassword: async (currentPassword: string, newPassword: string) => {
    const response = await api.post('/auth/change-password', { currentPassword, newPassword });
    return response.data;
  },
};

// Dashboard API
export const dashboardApi = {
  getStats: async () => {
    const response = await api.get('/widgets/dashboard/stats');
    return response.data;
  },
  getActivities: async () => {
    const response = await api.get('/widgets/dashboard/activities');
    return response.data;
  },
  getUserWidgets: async () => {
    const response = await api.get('/widgets/user');
    return response.data;
  },
  saveUserWidgets: async (widgets: any[]) => {
    const response = await api.post('/widgets/user', { widgets });
    return response.data;
  },
};

// Users API
export const usersApi = {
  getAll: async () => {
    const response = await api.get('/users');
    return response.data;
  },
  getStats: async () => {
    const response = await api.get('/users/stats');
    return response.data;
  },
  getOne: async (id: number) => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },
  create: async (data: any) => {
    const response = await api.post('/users', data);
    return response.data;
  },
  update: async (id: number, data: any) => {
    const response = await api.put(`/users/${id}`, data);
    return response.data;
  },
  delete: async (id: number) => {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  },
  deleteBulk: async (ids: number[]) => {
    const response = await api.post('/users/delete-bulk', { ids });
    return response.data;
  },
  getPermissions: async (id: number) => {
    const response = await api.get(`/users/${id}/permissions`);
    return response.data;
  },
  updatePermissions: async (id: number, permissions: any) => {
    const response = await api.put(`/users/${id}/permissions`, permissions);
    return response.data;
  },
};

// Produzione API
export const produzioneApi = {
  // Phases
  getPhases: async () => {
    const response = await api.get('/produzione/phases');
    return response.data;
  },
  getPhaseById: async (id: number) => {
    const response = await api.get(`/produzione/phases/${id}`);
    return response.data;
  },
  createPhase: async (data: any) => {
    const response = await api.post('/produzione/phases', data);
    return response.data;
  },
  updatePhase: async (id: number, data: any) => {
    const response = await api.put(`/produzione/phases/${id}`, data);
    return response.data;
  },
  deletePhase: async (id: number) => {
    const response = await api.delete(`/produzione/phases/${id}`);
    return response.data;
  },

  // Departments
  getDepartments: async () => {
    const response = await api.get('/produzione/departments');
    return response.data;
  },
  getDepartmentById: async (id: number) => {
    const response = await api.get(`/produzione/departments/${id}`);
    return response.data;
  },
  createDepartment: async (data: any) => {
    const response = await api.post('/produzione/departments', data);
    return response.data;
  },
  updateDepartment: async (id: number, data: any) => {
    const response = await api.put(`/produzione/departments/${id}`, data);
    return response.data;
  },
  deleteDepartment: async (id: number) => {
    const response = await api.delete(`/produzione/departments/${id}`);
    return response.data;
  },

  // Calendar & Data
  getCalendar: async (month?: number, year?: number) => {
    const params = new URLSearchParams();
    if (month) params.append('month', month.toString());
    if (year) params.append('year', year.toString());
    const response = await api.get(`/produzione/calendar?${params}`);
    return response.data;
  },
  getByDate: async (date: string) => {
    const response = await api.get(`/produzione/date/${date}`);
    return response.data;
  },
  saveByDate: async (date: string, data: any) => {
    const response = await api.post(`/produzione/date/${date}`, data);
    return response.data;
  },
  getStatistics: async (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const response = await api.get(`/produzione/statistics?${params}`);
    return response.data;
  },
  getTrend: async (days: number = 30) => {
    const response = await api.get(`/produzione/trend?days=${days}`);
    return response.data;
  },
  getMachinePerformance: async (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const response = await api.get(`/produzione/machine-performance?${params}`);
    return response.data;
  },
  getComparison: async (month1?: number, year1?: number, month2?: number, year2?: number) => {
    const params = new URLSearchParams();
    if (month1) params.append('month1', month1.toString());
    if (year1) params.append('year1', year1.toString());
    if (month2) params.append('month2', month2.toString());
    if (year2) params.append('year2', year2.toString());
    const response = await api.get(`/produzione/comparison?${params}`);
    return response.data;
  },
  getToday: async () => {
    const response = await api.get('/produzione/today');
    return response.data;
  },
  getWeek: async () => {
    const response = await api.get('/produzione/week');
    return response.data;
  },
  getMonth: async (month?: number, year?: number) => {
    const params = new URLSearchParams();
    if (month) params.append('month', month.toString());
    if (year) params.append('year', year.toString());
    const response = await api.get(`/produzione/month?${params}`);
    return response.data;
  },
};

export default api;
