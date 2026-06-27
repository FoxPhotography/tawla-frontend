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

  return 'http://localhost:5000';
};

const VITE_SOCKET_URL = getSocketUrl();

export const socket = io(VITE_SOCKET_URL, {
  autoConnect: false,
  withCredentials: true,
  transports: ['websocket'],
});
