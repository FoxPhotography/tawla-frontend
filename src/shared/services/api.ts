import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const VITE_API_URL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL: VITE_API_URL,
  withCredentials: true,
});

// Dynamically set Content-Type: skip for FormData so the browser sets multipart boundary
api.interceptors.request.use(
  (config) => {
    if (!(config.data instanceof FormData)) {
      config.headers['Content-Type'] = 'application/json';
    }
    return config;
  }
);

// Request Interceptor: Attach access token, tenant header, and device token
api.interceptors.request.use(
  (config) => {
    const { token, user } = useAuthStore.getState();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (user?.restaurantId) {
      config.headers['x-restaurant-id'] = user.restaurantId;
    }

    // Ensure we have a device token stored in localStorage for customer table sessions
    let deviceToken = localStorage.getItem('tawla_device_token');
    if (!deviceToken) {
      deviceToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('tawla_device_token', deviceToken);
    }
    config.headers['x-device-token'] = deviceToken;

    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle automatic token refresh on 401
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

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Check if error is 401 and request has not been retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const response = await axios.post(
          `${VITE_API_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        if (response.data?.success) {
          const { accessToken, user } = response.data.data;
          const { login, restaurant } = useAuthStore.getState();
          
          login(accessToken, user, restaurant || null);

          api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;

          processQueue(null, accessToken);
          return api(originalRequest);
        }
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        useAuthStore.getState().logout();
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
