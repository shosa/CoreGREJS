import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3011/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Helper per verificare se è un errore di database o server
async function checkErrorType(): Promise<'server' | 'database' | 'ok'> {
  try {
    // Prova prima l'health check base (senza database)
    await axios.get(`${API_URL}/health`, { timeout: 3000 });
    // Se arriviamo qui, il server risponde
    return 'ok';
  } catch (error: any) {
    // Server non raggiungibile
    if (!error.response && error.code === 'ERR_NETWORK') {
      return 'server';
    }
    // Server raggiungibile ma database offline
    if (error.response?.status === 503 || error.response?.status === 500) {
      return 'database';
    }
    return 'server';
  }
}

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

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Evita redirect se siamo già nelle pagine di errore
    const isOnErrorPage = typeof window !== 'undefined' &&
      (window.location.pathname.includes('/db-error') ||
       window.location.pathname.includes('/server-error') ||
       window.location.pathname.includes('/login'));

    // Database connection error (controlla prima il database, poi il network)
    // 503 Service Unavailable o 500 con messaggio database
    if (error.response?.status === 503) {
      if (!isOnErrorPage) {
        window.location.replace('/db-error');
      }
      return Promise.reject(error);
    }

    if (error.response?.status === 500) {
      const errorMessage = error.response?.data?.message || '';
      const errorDetails = JSON.stringify(error.response?.data || '').toLowerCase();

      // Controlla se l'errore è relativo al database
      if (errorMessage.toLowerCase().includes('database') ||
          errorMessage.includes('Can\'t reach database') ||
          errorDetails.includes('prisma') ||
          errorDetails.includes('database')) {
        if (!isOnErrorPage) {
          window.location.replace('/db-error');
        }
        return Promise.reject(error);
      }
    }

    // Network error - Verifica se è server o database offline
    if (!error.response && error.code === 'ERR_NETWORK') {
      if (!isOnErrorPage) {
        // Usa health check per determinare il tipo di errore
        const errorType = await checkErrorType();
        if (errorType === 'database') {
          window.location.replace('/db-error');
        } else {
          window.location.replace('/server-error');
        }
      }
      return Promise.reject(error);
    }

    // Auth error - non autorizzato
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
  getRecentRecords: async (limit?: number) => {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    const response = await api.get(`/produzione/recent?${params}`);
    return response.data;
  },
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
  requestPdf: async (date: string) => {
    const response = await api.get(`/produzione/pdf/${date}`);
    return response.data;
  },
  sendEmail: async (date: string) => {
    const response = await api.post(`/produzione/email/${date}`);
    return response.data;
  },
  save: async (data: any) => {
    const response = await api.post(`/produzione/date/${data.date}`, data);
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
  getTreeData: async (search?: string, page = 1, limit = 25) => {
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
  getLotsWithDdt: async (page = 1, limit = 50) => {
    const response = await api.get(`/tracking/lots-with-ddt?page=${page}&limit=${limit}`);
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
    const response = await api.post('/tracking/report-lot-pdf', { lots });
    return response.data;
  },
  reportCartelPdf: async (cartelli: number[]) => {
    const response = await api.post('/tracking/report-cartel-pdf', { cartelli });
    return response.data;
  },
  reportLotExcel: async (lots: string[]) => {
    const response = await api.post('/tracking/report-lot-excel', { lots });
    return response.data;
  },
  reportCartelExcel: async (cartelli: number[]) => {
    const response = await api.post('/tracking/report-cartel-excel', { cartelli });
    return response.data;
  },
  reportFichesPdf: async (cartelli: number[]) => {
    const response = await api.post('/tracking/report-fiches-pdf', { cartelli });
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
  // Module management
  getActiveModules: async () => {
    const response = await api.get('/settings/modules');
    return response.data;
  },
  updateModuleStatus: async (moduleName: string, enabled: boolean) => {
    const response = await api.put(`/settings/modules/${moduleName}`, { enabled });
    return response.data;
  },
  updateMultipleModules: async (modules: Record<string, boolean>) => {
    const response = await api.put('/settings/modules', modules);
    return response.data;
  },
  // SMTP configuration
  getSmtpConfig: async () => {
    const response = await api.get('/settings/smtp');
    return response.data;
  },
  updateSmtpConfig: async (config: any) => {
    const response = await api.put('/settings/smtp', config);
    return response.data;
  },
  // Produzione email configuration
  getProduzioneEmails: async () => {
    const response = await api.get('/settings/produzione/emails');
    return response.data;
  },
  updateProduzioneEmails: async (emails: string[]) => {
    const response = await api.put('/settings/produzione/emails', { emails });
    return response.data;
  },
};

// Jobs / Spool API
export const jobsApi = {
  enqueue: async (type: string, payload: any) => {
    const response = await api.post('/jobs', { type, payload });
    return response.data;
  },
  list: async (status?: string) => {
    const response = await api.get('/jobs', { params: { status } });
    return response.data;
  },
  detail: async (id: string) => {
    const response = await api.get(`/jobs/${id}`);
    return response.data;
  },
  download: async (id: string) => {
    const response = await api.get(`/jobs/${id}/download`, { responseType: 'blob' });
    return response;
  },
  delete: async (id: string) => {
    const response = await api.delete(`/jobs/${id}`);
    return response.data;
  },
  mergePdf: async (ids: string[]) => {
    const response = await api.post('/jobs/merge-pdf', { ids }, { responseType: 'blob' });
    return response;
  },
  downloadZip: async (ids: string[]) => {
    const response = await api.post('/jobs/zip', { ids }, { responseType: 'blob' });
    return response;
  },
};

// Export / DDT API
export const exportApi = {
  // ==================== ARTICLES MASTER ====================
  getArticlesMaster: async (search?: string) => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    const response = await api.get(`/export/articles-master?${params}`);
    return response.data;
  },
  getArticleMasterById: async (id: number) => {
    const response = await api.get(`/export/articles-master/${id}`);
    return response.data;
  },
  getArticleMasterByCode: async (code: string) => {
    const response = await api.get(`/export/articles-master/by-code/${code}`);
    return response.data;
  },
  createArticleMaster: async (data: {
    codiceArticolo: string;
    descrizione?: string;
    voceDoganale?: string;
    um?: string;
    prezzoUnitario?: number;
  }) => {
    const response = await api.post('/export/articles-master', data);
    return response.data;
  },
  updateArticleMaster: async (id: number, data: Partial<{
    codiceArticolo: string;
    descrizione: string;
    voceDoganale: string;
    um: string;
    prezzoUnitario: number;
  }>) => {
    const response = await api.put(`/export/articles-master/${id}`, data);
    return response.data;
  },
  deleteArticleMaster: async (id: number) => {
    const response = await api.delete(`/export/articles-master/${id}`);
    return response.data;
  },

  // ==================== TERZISTI ====================
  getTerzisti: async (onlyActive = true) => {
    const response = await api.get(`/export/terzisti?onlyActive=${onlyActive}`);
    return response.data;
  },
  getTerzistaById: async (id: number) => {
    const response = await api.get(`/export/terzisti/${id}`);
    return response.data;
  },
  createTerzista: async (data: {
    ragioneSociale: string;
    indirizzo1?: string;
    indirizzo2?: string;
    indirizzo3?: string;
    nazione?: string;
    consegna?: string;
    autorizzazione?: string;
  }) => {
    const response = await api.post('/export/terzisti', data);
    return response.data;
  },
  updateTerzista: async (id: number, data: Partial<{
    ragioneSociale: string;
    indirizzo1: string;
    indirizzo2: string;
    indirizzo3: string;
    nazione: string;
    consegna: string;
    autorizzazione: string;
    attivo: boolean;
  }>) => {
    const response = await api.put(`/export/terzisti/${id}`, data);
    return response.data;
  },
  deleteTerzista: async (id: number) => {
    const response = await api.delete(`/export/terzisti/${id}`);
    return response.data;
  },

  // ==================== DOCUMENTS ====================
  getDocuments: async (filters?: {
    stato?: string;
    terzistaId?: number;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters?.stato) params.append('stato', filters.stato);
    if (filters?.terzistaId) params.append('terzistaId', String(filters.terzistaId));
    if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.append('dateTo', filters.dateTo);
    if (filters?.search) params.append('search', filters.search);
    const response = await api.get(`/export/documents?${params}`);
    return response.data;
  },
  getNextProgressivo: async () => {
    const response = await api.get('/export/documents/next-progressivo');
    return response.data;
  },
  getDocumentByProgressivo: async (progressivo: string) => {
    const response = await api.get(`/export/documents/${progressivo}`);
    return response.data;
  },
  createDocument: async (data: {
    progressivo: string;
    terzistaId: number;
    data: string;
    autorizzazione?: string;
    commento?: string;
  }) => {
    const response = await api.post('/export/documents', data);
    return response.data;
  },
  updateDocument: async (progressivo: string, data: Partial<{
    terzistaId: number;
    data: string;
    stato: string;
    autorizzazione: string;
    commento: string;
    firstBoot: boolean;
  }>) => {
    const response = await api.put(`/export/documents/${progressivo}`, data);
    return response.data;
  },
  deleteDocument: async (progressivo: string) => {
    const response = await api.delete(`/export/documents/${progressivo}`);
    return response.data;
  },
  closeDocument: async (progressivo: string) => {
    const response = await api.post(`/export/documents/${progressivo}/close`);
    return response.data;
  },
  reopenDocument: async (progressivo: string) => {
    const response = await api.post(`/export/documents/${progressivo}/reopen`);
    return response.data;
  },

  // ==================== DOCUMENT ITEMS ====================
  addDocumentItem: async (data: {
    documentoId: number;
    articleId?: number;
    qtaOriginale: number;
    qtaReale?: number;
    codiceLibero?: string;
    descrizioneLibera?: string;
    voceLibera?: string;
    umLibera?: string;
    prezzoLibero?: number;
    isMancante?: boolean;
    rifMancante?: string;
    missingDataId?: number;
  }) => {
    const response = await api.post('/export/document-items', data);
    return response.data;
  },
  updateDocumentItem: async (id: number, data: {
    qtaOriginale?: number;
    qtaReale?: number;
    codiceLibero?: string;
    descrizioneLibera?: string;
    voceLibera?: string;
    umLibera?: string;
    prezzoLibero?: number;
  }) => {
    const response = await api.put(`/export/document-items/${id}`, data);
    return response.data;
  },
  deleteDocumentItem: async (id: number) => {
    const response = await api.delete(`/export/document-items/${id}`);
    return response.data;
  },

  // ==================== DOCUMENT FOOTER ====================
  upsertDocumentFooter: async (data: {
    documentoId: number;
    aspettoColli?: string;
    nColli?: number;
    totPesoLordo?: number;
    totPesoNetto?: number;
    trasportatore?: string;
    consegnatoPer?: string;
    vociDoganali?: Array<{ voce: string; peso: number }>;
  }) => {
    const response = await api.post('/export/document-footer', data);
    return response.data;
  },
  getDocumentFooter: async (documentoId: number) => {
    const response = await api.get(`/export/document-footer/${documentoId}`);
    return response.data;
  },

  // ==================== MISSING DATA ====================
  addMissingData: async (data: {
    documentoId: number;
    articleId: number;
    qtaMancante: number;
  }) => {
    const response = await api.post('/export/missing-data', data);
    return response.data;
  },
  getMissingDataForDocument: async (documentoId: number) => {
    const response = await api.get(`/export/missing-data/${documentoId}`);
    return response.data;
  },
  getMissingDataFromClosedDocuments: async (terzistaId: number) => {
    const response = await api.get(`/export/missing-data-from-closed/${terzistaId}`);
    return response.data;
  },
  deleteMissingData: async (id: number) => {
    const response = await api.delete(`/export/missing-data/${id}`);
    return response.data;
  },

  // ==================== LAUNCH DATA ====================
  addLaunchData: async (data: {
    documentoId: number;
    lancio: string;
    articolo: string;
    paia: number;
    note?: string;
  }) => {
    const response = await api.post('/export/launch-data', data);
    return response.data;
  },
  getLaunchDataForDocument: async (documentoId: number) => {
    const response = await api.get(`/export/launch-data/${documentoId}`);
    return response.data;
  },
  deleteLaunchData: async (id: number) => {
    const response = await api.delete(`/export/launch-data/${id}`);
    return response.data;
  },

  // ==================== EXCEL UPLOAD & PROCESSING ====================
  uploadExcelFile: async (progressivo: string, formData: FormData) => {
    const response = await api.post(`/export/documents/${progressivo}/upload-excel`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  getUploadedFiles: async (progressivo: string) => {
    const response = await api.get(`/export/documents/${progressivo}/uploaded-files`);
    return response.data;
  },
  processExcelFile: async (progressivo: string, fileName: string) => {
    const response = await api.post(`/export/documents/${progressivo}/process-excel`, { fileName });
    return response.data;
  },
  deleteUploadedFile: async (progressivo: string, fileName: string) => {
    const response = await api.delete(`/export/documents/${progressivo}/uploaded-files/${fileName}`);
    return response.data;
  },
  saveExcelData: async (progressivo: string, data: {
    modello: string;
    lancio: string;
    qty: number;
    tableTaglio: string[][];
    tableOrlatura: string[][];
    originalFileName: string;
  }) => {
    const response = await api.post(`/export/documents/${progressivo}/save-excel-data`, data);
    return response.data;
  },
  generateDDT: async (progressivo: string) => {
    const response = await api.post(`/export/documents/${progressivo}/generate-ddt`);
    return response.data;
  },

  // ==================== REPORTS ====================
  requestSegnacolliPdf: async (progressivo: string) => {
    const response = await api.post('/jobs', {
      type: 'export.segnacolli-pdf',
      payload: { progressivo }
    });
    return response.data;
  },
  requestGrigliaMaterialiPdf: async (progressivo: string, selectedArticles: any[]) => {
    const response = await api.post('/jobs', {
      type: 'export.griglia-materiali-pdf',
      payload: {
        progressivo,
        selectedArticles: selectedArticles.map(a => a.codiceArticolo)
      }
    });
    return response.data;
  },
  requestDdtCompletoPdf: async (progressivo: string) => {
    const response = await api.post('/jobs', {
      type: 'export.ddt-completo-pdf',
      payload: { progressivo }
    });
    return response.data;
  },
  requestDdtExcel: async (progressivo: string) => {
    const response = await api.post('/jobs', {
      type: 'export.ddt-excel',
      payload: { progressivo }
    });
    return response.data;
  },

  requestDownloadExcel: async (progressivo: string, fileName: string) => {
    const response = await api.post('/jobs', {
      type: 'export.download-excel',
      payload: { progressivo, fileName }
    });
    return response.data;
  },
};

// ==================== RIPARAZIONI API ====================

export const riparazioniApi = {
  // ==================== RIPARAZIONI ESTERNE ====================

  // Get stats
  getStats: async () => {
    const response = await api.get('/riparazioni/stats');
    return response.data;
  },

  // Get all riparazioni with pagination
  getRiparazioni: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    completa?: boolean;
    laboratorioId?: number;
    repartoId?: number;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.completa !== undefined) queryParams.append('completa', params.completa.toString());
    if (params?.laboratorioId) queryParams.append('laboratorioId', params.laboratorioId.toString());
    if (params?.repartoId) queryParams.append('repartoId', params.repartoId.toString());

    const response = await api.get(`/riparazioni?${queryParams.toString()}`);
    return response.data;
  },

  // Get next idRiparazione
  getNextId: async () => {
    const response = await api.get('/riparazioni/next-id');
    return response.data;
  },

  // Get cartellino data from core_dati
  getCartellinoData: async (cartellino: string) => {
    const response = await api.get(`/riparazioni/cartellino/${cartellino}`);
    return response.data;
  },

  // Get riparazione by numeric ID
  getRiparazione: async (id: number) => {
    const response = await api.get(`/riparazioni/${id}`);
    return response.data;
  },

  // Get riparazione by custom idRiparazione
  getRiparazioneByCode: async (idRiparazione: string) => {
    const response = await api.get(`/riparazioni/id/${idRiparazione}`);
    return response.data;
  },

  // Create riparazione
  createRiparazione: async (data: any) => {
    const response = await api.post('/riparazioni', data);
    return response.data;
  },

  // Update riparazione
  updateRiparazione: async (id: number, data: any) => {
    const response = await api.put(`/riparazioni/${id}`, data);
    return response.data;
  },

  // Complete riparazione
  completeRiparazione: async (id: number) => {
    const response = await api.put(`/riparazioni/${id}/complete`);
    return response.data;
  },

  // Delete riparazione
  deleteRiparazione: async (id: number) => {
    const response = await api.delete(`/riparazioni/${id}`);
    return response.data;
  },

  // ==================== RIPARAZIONI INTERNE ====================

  // Get stats interne
  getStatsInterne: async () => {
    const response = await api.get('/riparazioni/interne/stats');
    return response.data;
  },

  // Get all riparazioni interne
  getRiparazioniInterne: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    completa?: boolean;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.completa !== undefined) queryParams.append('completa', params.completa.toString());

    const response = await api.get(`/riparazioni/interne?${queryParams.toString()}`);
    return response.data;
  },

  // Get next idRiparazione for interne
  getNextIdInterna: async () => {
    const response = await api.get('/riparazioni/interne/next-id');
    return response.data;
  },

  // Get riparazione interna by ID
  getRiparazioneInterna: async (id: number) => {
    const response = await api.get(`/riparazioni/interne/${id}`);
    return response.data;
  },

  // Create riparazione interna
  createRiparazioneInterna: async (data: any) => {
    const response = await api.post('/riparazioni/interne', data);
    return response.data;
  },

  // Update riparazione interna
  updateRiparazioneInterna: async (id: number, data: any) => {
    const response = await api.put(`/riparazioni/interne/${id}`, data);
    return response.data;
  },

  // Complete riparazione interna
  completeRiparazioneInterna: async (id: number, operatoreChiusura?: string) => {
    const response = await api.put(`/riparazioni/interne/${id}/complete`, { operatoreChiusura });
    return response.data;
  },

  // Delete riparazione interna
  deleteRiparazioneInterna: async (id: number) => {
    const response = await api.delete(`/riparazioni/interne/${id}`);
    return response.data;
  },

  // ==================== SUPPORT DATA ====================

  // Get all reparti
  getReparti: async () => {
    const response = await api.get('/riparazioni/reparti');
    return response.data;
  },

  // Get all laboratori
  getLaboratori: async () => {
    const response = await api.get('/riparazioni/laboratori');
    return response.data;
  },

  // Get all linee
  getLinee: async () => {
    const response = await api.get('/riparazioni/linee');
    return response.data;
  },

  // Get all numerate
  getNumerate: async () => {
    const response = await api.get('/riparazioni/numerate');
    return response.data;
  },

  // Get numerata by ID
  getNumerata: async (id: number) => {
    const response = await api.get(`/riparazioni/numerate/${id}`);
    return response.data;
  },

  // ==================== LABORATORI CRUD ====================

  createLaboratorio: async (data: { nome: string; attivo?: boolean }) => {
    const response = await api.post('/riparazioni/laboratori', data);
    return response.data;
  },

  updateLaboratorio: async (id: number, data: { nome?: string; attivo?: boolean }) => {
    const response = await api.put(`/riparazioni/laboratori/${id}`, data);
    return response.data;
  },

  deleteLaboratorio: async (id: number) => {
    const response = await api.delete(`/riparazioni/laboratori/${id}`);
    return response.data;
  },

  // ==================== REPARTI CRUD ====================

  createReparto: async (data: { nome: string; ordine?: number; attivo?: boolean }) => {
    const response = await api.post('/riparazioni/reparti', data);
    return response.data;
  },

  updateReparto: async (id: number, data: { nome?: string; ordine?: number; attivo?: boolean }) => {
    const response = await api.put(`/riparazioni/reparti/${id}`, data);
    return response.data;
  },

  deleteReparto: async (id: number) => {
    const response = await api.delete(`/riparazioni/reparti/${id}`);
    return response.data;
  },

  // ==================== NUMERATE CRUD ====================

  createNumerata: async (data: any) => {
    const response = await api.post('/riparazioni/numerate', data);
    return response.data;
  },

  updateNumerata: async (id: number, data: any) => {
    const response = await api.put(`/riparazioni/numerate/${id}`, data);
    return response.data;
  },

  deleteNumerata: async (id: number) => {
    const response = await api.delete(`/riparazioni/numerate/${id}`);
    return response.data;
  },
};

// Activity Log API
export const activityLogApi = {
  getLogs: async (filters?: {
    userId?: number;
    module?: string;
    action?: string;
    entity?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }) => {
    const params = new URLSearchParams();
    if (filters?.userId) params.append('userId', filters.userId.toString());
    if (filters?.module) params.append('module', filters.module);
    if (filters?.action) params.append('action', filters.action);
    if (filters?.entity) params.append('entity', filters.entity);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.offset) params.append('offset', filters.offset.toString());
    const response = await api.get(`/activity-log?${params}`);
    return response.data;
  },
  getStats: async (filters?: {
    userId?: number;
    module?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters?.userId) params.append('userId', filters.userId.toString());
    if (filters?.module) params.append('module', filters.module);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    const response = await api.get(`/activity-log/stats?${params}`);
    return response.data;
  },
};

export default api;
