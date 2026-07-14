import axios from 'axios';
import { getAuth } from 'firebase/auth';

// Configure Axios client
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://unicomm-1.onrender.com/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request Interceptor: Inject JWT token from localStorage/sessionStorage
api.interceptors.request.use(
  async (config) => {
    const token = localStorage.getItem('mock_token') || 
                  sessionStorage.getItem('mock_token') || 
                  localStorage.getItem('fb_token') || 
                  sessionStorage.getItem('fb_token');
    
    // Debugging authentication state console logs (removable/safe)
    console.log(`[API Request] Path: ${config.url} | Token Loaded: ${!!token}`);
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error(`[API Request Error]`, error);
    return Promise.reject(error);
  }
);

// Response Interceptor: Global Error handling and automatic token refresh/retry
api.interceptors.response.use(
  (response) => {
    console.log(`[API Response SUCCESS] Path: ${response.config.url} | Status: ${response.status}`);
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    console.error(`[API Response ERROR] Path: ${originalRequest?.url} | Status: ${error.response?.status} | Message: ${error.message}`);

    // Check if error is 401 Unauthorized and not already retried
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // Check if we are running in mock mode
      const isMock = !!(localStorage.getItem('mock_token') || sessionStorage.getItem('mock_token'));
      if (isMock) {
        console.warn('API returned 401 in Mock Mode. Logging out user.');
        logoutAndRedirect();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      isRefreshing = true;

      try {
        const auth = getAuth();
        const currentUser = auth.currentUser;
        if (currentUser) {
          console.log(`[Token Refresh] Refreshing token for UID: ${currentUser.uid}`);
          const newToken = await currentUser.getIdToken(true); // force refresh
          
          // Update caches matching active remember_me state
          const isRemembered = localStorage.getItem('remember_me') !== 'false';
          if (isRemembered) {
            localStorage.setItem('fb_token', newToken);
            sessionStorage.removeItem('fb_token');
          } else {
            sessionStorage.setItem('fb_token', newToken);
            localStorage.removeItem('fb_token');
          }

          console.log(`[Token Refresh] Token refreshed successfully.`);
          
          processQueue(null, newToken);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        } else {
          console.warn('No Firebase currentUser available to refresh token.');
          logoutAndRedirect();
          return Promise.reject(error);
        }
      } catch (refreshError) {
        console.error('[Token Refresh Failed] Logging out user.', refreshError);
        processQueue(refreshError, null);
        logoutAndRedirect();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

function logoutAndRedirect() {
  localStorage.removeItem('mock_user');
  localStorage.removeItem('mock_token');
  localStorage.removeItem('fb_token');
  sessionStorage.removeItem('mock_user');
  sessionStorage.removeItem('mock_token');
  sessionStorage.removeItem('fb_token');
  localStorage.removeItem('remember_me');

  if (!window.location.pathname.includes('/login')) {
    window.location.href = '/login';
  }
}

export default api;
