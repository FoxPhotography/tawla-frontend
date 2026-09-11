import { io } from 'socket.io-client';

const cleanOrigin = (urlStr: string): string => {
  try {
    const formatted = urlStr.startsWith('http') ? urlStr : `https://${urlStr}`;
    return new URL(formatted).origin;
  } catch (e) {
    return urlStr.replace(/\/api\/?$/, '').replace(/\/$/, '');
  }
};

const getSocketUrl = (): string => {
  const isBrowser = typeof window !== 'undefined';
  const isLocalHost = isBrowser && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  if (!isBrowser || isLocalHost) {
    const envUrl = import.meta.env.VITE_SOCKET_URL;
    if (envUrl) return cleanOrigin(envUrl);
    return 'http://localhost:5000';
  }

  // In live production, connect directly to current origin (proxied by Nginx to :5000)
  return window.location.origin;
};

const VITE_SOCKET_URL = getSocketUrl();

export const socket = io(VITE_SOCKET_URL, {
  autoConnect: false,
  withCredentials: true,
  transports: ['polling', 'websocket'],
});

