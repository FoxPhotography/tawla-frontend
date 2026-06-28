import { io } from 'socket.io-client';

const getSocketUrl = (): string => {
  const envUrl = import.meta.env.VITE_SOCKET_URL;
  if (envUrl) return envUrl;

  const base = import.meta.env.VITE_API_BASE;
  if (base) {
    const protocol = base.includes('localhost') ? 'http' : 'https';
    const cleanBase = base.replace(/^(https?:\/\/)?/, '');
    return `${protocol}://${cleanBase}`;
  }

  // Automatic runtime fallback based on hostname to bypass missing env build issues
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host.includes('tawla.netlify.app') || host.includes('vercel.app') || host.includes('tawla.site')) {
      return 'https://tawla-backend-production.up.railway.app';
    }
  }

  return 'http://localhost:5000';
};

const VITE_SOCKET_URL = getSocketUrl();

export const socket = io(VITE_SOCKET_URL, {
  autoConnect: false,
  withCredentials: true,
  transports: ['polling', 'websocket'],
});
