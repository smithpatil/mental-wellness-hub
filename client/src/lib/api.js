import axios from 'axios';

const API_BASE = '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // sends the httpOnly refresh cookie
});

// ---- session state: kept in memory only (never localStorage) ---------------------------------
// The short-lived access token and the CSRF token live in this module. The long-lived refresh
// token is an httpOnly cookie that JavaScript cannot read.
let accessToken = null;
let csrfToken = null;

// The CSRF token is also kept in a readable SameSite=Strict cookie so that it survives reloads.
const readCsrfCookie = () => {
  const m = document.cookie.match(/(?:^|;\s*)mwh_csrf=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
};
const getCsrf = () => csrfToken || readCsrfCookie() || '';
let onSessionLost = () => {};

export const setSession = ({ token, csrfToken: csrf }) => {
  accessToken = token || null;
  csrfToken = csrf || null;
};
export const clearSession = () => setSession({});
export const hasSession = () => !!accessToken;
export const onSessionExpired = (fn) => { onSessionLost = fn; };

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

// One in-flight refresh at a time; a 401 triggers a single silent refresh, then a retry.
let refreshing = null;
const refreshSession = () => {
  if (!refreshing) {
    refreshing = axios
      .post(`${API_BASE}/auth/refresh`, {}, { withCredentials: true, headers: { 'X-CSRF-Token': getCsrf() } })
      .then(({ data }) => { setSession(data); return data; })
      .finally(() => { refreshing = null; });
  }
  return refreshing;
};
export const silentRefresh = refreshSession;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config || {};
    const isAuthCall = /\/auth\/(login|signup|refresh|logout)/.test(original.url || '');
    if (error.response?.status === 401 && !original._retried && !isAuthCall && getCsrf()) {
      original._retried = true;
      try {
        await refreshSession();
        original.headers.Authorization = `Bearer ${accessToken}`;
        return api(original);
      } catch {
        clearSession();
        onSessionLost();
      }
    }
    return Promise.reject(error);
  }
);

// Auth
export const authAPI = {
  signup: (data) => api.post('/auth/signup', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout', {}, { headers: { 'X-CSRF-Token': getCsrf() } }),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.put(`/auth/reset-password/${token}`, { password }),
  grantRecommenderConsent: () => api.post('/auth/consent/recommender'),
  withdrawRecommenderConsent: () => api.delete('/auth/consent/recommender'),
  exportData: () => api.get('/auth/export'),
  deleteAccount: () => api.delete('/auth/account'),
};

// Mood
export const moodAPI = {
  logMood: (data) => api.post('/mood', data),
  getHistory: (params) => api.get('/mood/history', { params }),
  getTrends: (period) => api.get('/mood/trends', { params: { period } }),
  exportData: () => api.get('/mood/export'),
};

// Gratitude
export const gratitudeAPI = {
  getNotes: () => api.get('/gratitude'),
  createNote: (content) => api.post('/gratitude', { content }),
  updateNote: (id, content) => api.put(`/gratitude/${id}`, { content }),
  deleteNote: (id) => api.delete(`/gratitude/${id}`),
};

// Counselors
export const counselorAPI = {
  getAll: (params) => api.get('/counselors', { params }),
  getOne: (id) => api.get(`/counselors/${id}`),
};

// Appointments
export const appointmentAPI = {
  book: (data) => api.post('/appointments', data),
  getAll: (params) => api.get('/appointments', { params }),
  reschedule: (id, dateTime) => api.put(`/appointments/${id}`, { dateTime }),
  cancel: (id) => api.delete(`/appointments/${id}`),
};

// Resources
export const resourceAPI = {
  getAll: (params) => api.get('/resources', { params }),
  getOne: (id) => api.get(`/resources/${id}`),
};

// NLP recommendations
export const recommendAPI = {
  recommend: (data) => api.post('/recommend', data),
};

// Forum
export const forumAPI = {
  getPosts: (params) => api.get('/forum', { params }),
  createPost: (data) => api.post('/forum', data),
  getPost: (id) => api.get(`/forum/${id}`),
  reply: (id, data) => api.post(`/forum/${id}/reply`, data),
  toggleLike: (id) => api.put(`/forum/${id}/like`),
  report: (id) => api.post(`/forum/${id}/report`),
};

// Gamification
export const gamificationAPI = {
  getRewards: () => api.get('/gamification/me'),
  checkBadges: () => api.post('/gamification/check-badges'),
};

// Admin
export const adminAPI = {
  getUsers: (params) => api.get('/admin/users', { params }),
  toggleUserStatus: (id) => api.put(`/admin/users/${id}/status`),
  getCounselors: () => api.get('/admin/counselors'),
  addCounselor: (data) => api.post('/admin/counselors', data),
  updateCounselor: (id, data) => api.put(`/admin/counselors/${id}`, data),
  deleteCounselor: (id) => api.delete(`/admin/counselors/${id}`),
  getAppointments: () => api.get('/admin/appointments'),
  getAnalytics: () => api.get('/admin/analytics'),
  getReportedPosts: () => api.get('/admin/forum/reported'),
  deletePost: (id) => api.delete(`/admin/forum/${id}`),
};

// Chatbot
export const chatAPI = {
  sendMessage: (data) => api.post('/chat', data),
};

// Turn an axios error into a readable message (server message, validation list, or network problem).
export const errorMessage = (err, fallback = 'Something went wrong') => {
  if (!err.response) return 'Cannot reach the server. Make sure the backend is running on port 5000.';
  const d = err.response.data || {};
  if (d.message) return d.message;
  if (Array.isArray(d.errors) && d.errors.length) return d.errors.map((e) => e.msg).join(', ');
  return fallback;
};

export default api;
