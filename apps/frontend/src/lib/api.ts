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

// Tracking API
export const trackingApi = {
  // ==================== STATS (Dashboard) ====================
  getStats: async () => {
    const response = await api.get('/tracking/stats');
    return response.data;
  },

  // ==================== TYPES ====================
  getTypes: async () => {
    const response = await api.get('/tracking/types');
    return response.data;
  },
  createType: async (name: string, note?: string) => {
    const response = await api.post('/tracking/types', { name, note });
    return response.data;
  },

  // ==================== SEARCH DATA (Multisearch) ====================
  searchData: async (filters: {
    cartellino?: string;
    commessa?: string;
    articolo?: string;
    descrizione?: string;
    linea?: string;
    ragioneSociale?: string;
    ordine?: string;
    page?: number;
    limit?: number;
  }) => {
    const response = await api.post('/tracking/search-data', filters);
    return response.data;
  },

  // ==================== CHECK CARTEL (Ordersearch) ====================
  checkCartel: async (cartellino: string) => {
    const response = await api.post('/tracking/check-cartel', { cartellino });
    return response.data;
  },

  // ==================== SAVE LINKS (ProcessLinks) ====================
  saveLinks: async (data: { typeId: number; lots: string[]; cartelli: number[] }) => {
    const response = await api.post('/tracking/save-links', data);
    return response.data;
  },

  // ==================== TREE DATA (TreeView) ====================
  getTreeData: async (search?: string, page = 1, limit = 100) => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    params.append('page', String(page));
    params.append('limit', String(limit));
    const response = await api.get(`/tracking/tree-data?${params}`);
    return response.data;
  },
  updateLot: async (id: number, lot: string) => {
    const response = await api.put(`/tracking/update-lot/${id}`, { lot });
    return response.data;
  },
  deleteLink: async (id: number) => {
    const response = await api.delete(`/tracking/delete-lot/${id}`);
    return response.data;
  },

  // ==================== LOT DETAIL (3 tabs) ====================
  getLotsWithoutDdt: async (page = 1, limit = 50) => {
    const response = await api.get(`/tracking/lots-without-ddt?page=${page}&limit=${limit}`);
    return response.data;
  },
  getOrdersWithoutDate: async (page = 1, limit = 50) => {
    const response = await api.get(`/tracking/orders-without-date?page=${page}&limit=${limit}`);
    return response.data;
  },
  getOrdersWithDate: async (page = 1, limit = 50) => {
    const response = await api.get(`/tracking/orders-with-date?page=${page}&limit=${limit}`);
    return response.data;
  },
  getArticlesWithoutSku: async (page = 1, limit = 50) => {
    const response = await api.get(`/tracking/articles-without-sku?page=${page}&limit=${limit}`);
    return response.data;
  },
  getArticlesWithSku: async (page = 1, limit = 50) => {
    const response = await api.get(`/tracking/articles-with-sku?page=${page}&limit=${limit}`);
    return response.data;
  },
  updateLotInfo: async (lot: string, data: { doc?: string; date?: string; note?: string }) => {
    const response = await api.post('/tracking/update-lot-info', { lot, ...data });
    return response.data;
  },
  updateOrderInfo: async (ordine: string, date?: string) => {
    const response = await api.post('/tracking/update-order-info', { ordine, date });
    return response.data;
  },
  updateSku: async (art: string, sku: string) => {
    const response = await api.post('/tracking/update-sku', { art, sku });
    return response.data;
  },

  // ==================== SEARCH DETAILS ====================
  searchLotDetails: async (lot: string) => {
    const response = await api.get(`/tracking/search-lot-details?lot=${encodeURIComponent(lot)}`);
    return response.data;
  },
  searchOrderDetails: async (ordine: string) => {
    const response = await api.get(`/tracking/search-order-details?ordine=${encodeURIComponent(ordine)}`);
    return response.data;
  },
  searchArticoloDetails: async (art: string) => {
    const response = await api.get(`/tracking/search-articolo-details?art=${encodeURIComponent(art)}`);
    return response.data;
  },

  // ==================== LOAD SUMMARY (Reports) ====================
  loadSummary: async (cartelli: number[]) => {
    const response = await api.post('/tracking/load-summary', { cartelli });
    return response.data;
  },

  // ==================== REPORTS ====================
  reportLotPdf: async (lots: string[]) => {
    const response = await api.post('/tracking/report-lot-pdf', { lots }, { responseType: 'blob' });
    return response.data;
  },
  reportCartelPdf: async (cartelli: number[]) => {
    const response = await api.post('/tracking/report-cartel-pdf', { cartelli }, { responseType: 'blob' });
    return response.data;
  },
  reportLotExcel: async (lots: string[]) => {
    const response = await api.post('/tracking/report-lot-excel', { lots }, { responseType: 'blob' });
    return response.data;
  },
  reportCartelExcel: async (cartelli: number[]) => {
    const response = await api.post('/tracking/report-cartel-excel', { cartelli }, { responseType: 'blob' });
    return response.data;
  },
  reportFichesPdf: async (cartelli: number[]) => {
    const response = await api.post('/tracking/report-fiches-pdf', { cartelli }, { responseType: 'blob' });
    return response.data;
  },
};

// Settings API
export const settingsApi = {
  analyzeExcel: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/settings/analyze-excel', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
  executeImport: async () => {
    const response = await api.post('/settings/execute-import');
    return response.data;
  },
  cancelImport: async () => {
    const response = await api.delete('/settings/cancel-import');
    return response.data;
  },
  getImportProgress: async () => {
    const response = await api.get('/settings/import-progress');
    return response.data;
  },
};

export default api;
