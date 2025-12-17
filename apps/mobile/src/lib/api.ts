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
    const authStorage = localStorage.getItem('coregre-mobile-auth');
    if (authStorage) {
      try {
        const authState = JSON.parse(authStorage);
        const token = authState.state?.user;
        if (token) {
          // Mobile usa un sistema diverso - passa i dati utente come header
          config.headers['X-Mobile-User'] = JSON.stringify(token);
        }
      } catch (e) {
        console.error('Error parsing auth storage:', e);
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('coregre-mobile-auth');
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        window.location.replace('/login');
      }
    }
    return Promise.reject(error);
  }
);

// ==================== MOBILE API ====================

export const mobileApi = {
  // Login unificato
  login: async (username: string, password: string, appType: string) => {
    const response = await api.post('/mobile/login', {
      action: 'login',
      username,
      password,
      app_type: appType,
    });
    return response.data;
  },

  // Lista operatori
  getOperators: async (appType: string) => {
    const response = await api.post('/mobile/login', {
      action: 'get_users',
      app_type: appType,
    });
    return response.data;
  },

  // Profilo operatore
  getProfile: async (id: number, appType: string) => {
    const response = await api.get(`/mobile/profile`, {
      params: { id },
      headers: { 'X-App-Type': appType },
    });
    return response.data;
  },

  // Riepilogo giornaliero
  getDailySummary: async (id: number, data: string, appType: string) => {
    const response = await api.get('/mobile/daily-summary', {
      params: { id, data },
      headers: { 'X-App-Type': appType },
    });
    return response.data;
  },

  // Dati sistema (reparti, linee, quality, repairs)
  getSystemData: async (type: string, nu?: string) => {
    const params: any = { type };
    if (nu) params.nu = nu;
    const response = await api.get('/mobile/system-data', { params });
    return response.data;
  },

  // Verifica cartellino/commessa
  checkData: async (type: 'cartellino' | 'commessa', value: string) => {
    const response = await api.post('/mobile/check-data', { type, value });
    return response.data;
  },
};

// ==================== QUALITY API ====================

export const qualityApi = {
  // Check cartellino
  checkCartellino: async (numeroCartellino: string) => {
    const response = await api.post('/quality/check-cartellino', { numeroCartellino });
    return response.data;
  },

  // Dettagli cartellino
  getCartollinoDetails: async (cartellino: string) => {
    const response = await api.post('/quality/cartellino-details', { cartellino });
    return response.data;
  },

  // Opzioni per form quality
  getOptions: async (cartellino?: string) => {
    const response = await api.post('/quality/options', { cartellino });
    return response.data;
  },

  // Salva controllo qualità Hermes
  saveHermesCq: async (data: any) => {
    const response = await api.post('/quality/save-hermes-cq', data);
    return response.data;
  },

  // Upload foto difetto
  uploadPhoto: async (formData: FormData) => {
    const response = await api.post('/quality/upload-photo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Riepilogo giornaliero operatore
  getOperatorDailySummary: async (operatore: string, data: string) => {
    const params = new URLSearchParams();
    params.append('operatore', operatore);
    params.append('date', data);
    const response = await api.get(`/quality/operator-summary?${params}`);
    return response.data;
  },

  // Dettagli controllo con eccezioni
  getControlDetails: async (controlId: number) => {
    const response = await api.get(`/mobile/quality-control/${controlId}`);
    return response.data;
  },

  // Elimina controllo
  deleteControl: async (controlId: number) => {
    const response = await api.delete(`/mobile/quality-control/${controlId}`);
    return response.data;
  },
};

// ==================== REPAIRS API ====================

export const repairsApi = {
  // Lista riparazioni interne
  getRiparazioni: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    completa?: boolean;
    operatore?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.completa !== undefined) queryParams.append('completa', params.completa.toString());
    if (params?.operatore) queryParams.append('operatore', params.operatore);

    const response = await api.get(`/riparazioni/interne?${queryParams.toString()}`);
    return response.data;
  },

  // Get next ID
  getNextId: async () => {
    const response = await api.get('/riparazioni/interne/next-id');
    return response.data;
  },

  // Dettagli riparazione
  getRiparazione: async (id: number) => {
    const response = await api.get(`/riparazioni/interne/${id}`);
    return response.data;
  },

  // Crea riparazione
  createRiparazione: async (data: any) => {
    const response = await api.post('/riparazioni/interne', data);
    return response.data;
  },

  // Aggiorna riparazione
  updateRiparazione: async (id: number, data: any) => {
    const response = await api.put(`/riparazioni/interne/${id}`, data);
    return response.data;
  },

  // Completa riparazione
  completeRiparazione: async (id: number, operatoreChiusura?: string) => {
    const response = await api.put(`/riparazioni/interne/${id}/complete`, { operatoreChiusura });
    return response.data;
  },

  // Elimina riparazione
  deleteRiparazione: async (id: number) => {
    const response = await api.delete(`/riparazioni/interne/${id}`);
    return response.data;
  },

  // Dettagli cartellino per pre-fill
  getCartellinoData: async (cartellino: string) => {
    const response = await api.get(`/riparazioni/cartellino/${cartellino}`);
    return response.data;
  },

  // Opzioni per form (reparti, laboratori, taglie, causali)
  getOptions: async () => {
    const response = await api.post('/riparazioni/interne/options');
    return response.data;
  },

  // Statistiche
  getStats: async (operatore?: string, data?: string) => {
    const params = new URLSearchParams();
    if (operatore) params.append('operatore', operatore);
    if (data) params.append('data', data);
    const response = await api.get(`/riparazioni/interne/stats?${params}`);
    return response.data;
  },

  // Genera PDF
  generatePDF: async (id: number) => {
    const response = await api.get(`/riparazioni/interne/pdf?id=${id}`, {
      responseType: 'blob',
    });
    return URL.createObjectURL(response.data);
  },
};

export default api;
