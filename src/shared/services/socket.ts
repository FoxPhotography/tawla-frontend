import { io } from 'socket.io-client';

const getSocketUrl = (): string => {
  const isBrowser = typeof window !== 'undefined';
  const isLocalHost = isBrowser && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  // 1. Local environment (localhost/127.0.0.1) or SSR:
  if (!isBrowser || isLocalHost) {
    const envUrl = import.meta.env.VITE_SOCKET_URL;
    if (envUrl) return envUrl;
    const base = import.meta.env.VITE_API_BASE || import.meta.env.VITE_API_URL;
    if (base && base.includes('http')) {
      try {
        const url = new URL(base.startsWith('http') ? base : `http://${base}`);
        return url.origin;
      } catch (e) {
        // ignore
      }
    }
    return 'http://localhost:5000';
  }

  // 2. Live production environment (non-localhost domain):
  const envSocketUrl = import.meta.env.VITE_SOCKET_URL;
  if (envSocketUrl && !envSocketUrl.includes('localhost') && !envSocketUrl.includes('127.0.0.1')) {
    return envSocketUrl;
  }

  const apiEnv = import.meta.env.VITE_API_BASE || import.meta.env.VITE_API_URL;
  if (apiEnv && apiEnv.startsWith('http') && !apiEnv.includes('localhost') && !apiEnv.includes('127.0.0.1')) {
    try {
      const parsed = new URL(apiEnv);
      return parsed.origin;
    } catch (e) {
      // ignore
    }
  }

  // Production Railway backend URL for all live deployments
  return 'https://tawla-backend-production.up.railway.app';
};

const VITE_SOCKET_URL = getSocketUrl();

export const socket = io(VITE_SOCKET_URL, {
  autoConnect: false,
  withCredentials: true,
  transports: ['polling', 'websocket'],
});

