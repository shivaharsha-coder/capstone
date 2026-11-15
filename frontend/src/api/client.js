import axios from 'axios';

// Dynamically determine the backend API base URL so the app works seamlessly across multiple laptops on Wi-Fi
export const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname || 'localhost';
    return `${protocol}//${hostname}:8000`;
  }
  return 'http://localhost:8000';
};

// Dynamically determine WebSocket URL matching current hostname and protocol
export const getWsUrl = (path = '/api/monitoring/ws') => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (import.meta.env.VITE_API_BASE_URL) {
    try {
      const url = new URL(import.meta.env.VITE_API_BASE_URL);
      const wsProtocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${wsProtocol}//${url.host}${cleanPath}`;
    } catch {
      // fallback if invalid URL
    }
  }
  if (typeof window !== 'undefined') {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const hostname = window.location.hostname || 'localhost';
    return `${wsProtocol}//${hostname}:8000${cleanPath}`;
  }
  return `ws://localhost:8000${cleanPath}`;
};

const API_BASE_URL = getApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Helper to determine the right token based on current location and endpoint
export const getActiveToken = (url = '') => {
  const path = typeof window !== 'undefined' ? window.location.pathname : '';

  // 1. Current page context
  if (path.startsWith('/admin') || path.startsWith('/login/admin')) {
    const token = localStorage.getItem('smart_classroom_admin_token');
    if (token) return token;
  }

  if (path.startsWith('/faculty') || path.startsWith('/login/faculty')) {
    const token = localStorage.getItem('smart_classroom_faculty_token');
    if (token) return token;
  }

  if (path.startsWith('/student') || path.startsWith('/login/student')) {
    const token = localStorage.getItem('smart_classroom_student_token');
    if (token) return token;
  }

  // 2. API endpoint context hints
  const reqUrl = String(url || '');
  if (reqUrl.includes('/admin')) {
    const token = localStorage.getItem('smart_classroom_admin_token');
    if (token) return token;
  }

  if (reqUrl.includes('/monitoring') || reqUrl.includes('/scan') || reqUrl.includes('/faculty')) {
    const token = localStorage.getItem('smart_classroom_faculty_token') || localStorage.getItem('smart_classroom_admin_token');
    if (token) return token;
  }

  if (reqUrl.includes('/attempt') || reqUrl.includes('/my-attendance') || reqUrl.includes('/student')) {
    const token = localStorage.getItem('smart_classroom_student_token');
    if (token) return token;
  }

  // 3. Fallback: whichever token is present
  return (
    localStorage.getItem('smart_classroom_admin_token') ||
    localStorage.getItem('smart_classroom_faculty_token') ||
    localStorage.getItem('smart_classroom_student_token') ||
    localStorage.getItem('smart_classroom_token')
  );
};

// Interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = getActiveToken(config.url);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor to handle unauthorized 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const path = typeof window !== 'undefined' ? window.location.pathname : '';
      const isAuthRoute = path.startsWith('/login');
      if (!isAuthRoute) {
        if (path.startsWith('/faculty')) {
          localStorage.removeItem('smart_classroom_faculty_token');
          localStorage.removeItem('smart_classroom_faculty_user');
        } else if (path.startsWith('/student')) {
          localStorage.removeItem('smart_classroom_student_token');
          localStorage.removeItem('smart_classroom_student_user');
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
export { API_BASE_URL };
