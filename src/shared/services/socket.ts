import { io, Socket } from 'socket.io-client';

const cleanOrigin = (urlStr: string): string => {
  try {
    const formatted = urlStr.startsWith('http') ? urlStr : `https://${urlStr}`;
    return new URL(formatted).origin;
  } catch (e) {
    return urlStr.replace(/\/api\/?$/, '').replace(/\/$/, '');
  }
};

const getPrimarySocketUrl = (): string => {
  const isBrowser = typeof window !== 'undefined';
  const isLocalHost = isBrowser && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  if (!isBrowser || isLocalHost) {
    const envUrl = import.meta.env.VITE_SOCKET_URL;
    if (envUrl) return cleanOrigin(envUrl);
    return 'http://localhost:5000';
  }

  // Live production cloud origin
  return window.location.origin;
};

const getLocalLanSocketUrl = (): string | null => {
  if (typeof window === 'undefined') return null;
  const lanIp = localStorage.getItem('tawla_local_lan_ip');
  if (!lanIp) return null;
  const trimmed = lanIp.trim();
  if (!trimmed) return null;
  return trimmed.startsWith('http') ? trimmed : `http://${trimmed}:5000`;
};

export const primaryUrl = getPrimarySocketUrl();

export const socket: Socket = io(primaryUrl, {
  autoConnect: false,
  withCredentials: true,
  transports: ['websocket', 'polling'],
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  timeout: 10000,
});

let isUsingLanFallback = false;

// Automatic Local LAN Fallback Trigger
socket.on('connect_error', () => {
  const lanUrl = getLocalLanSocketUrl();
  if (lanUrl && !isUsingLanFallback) {
    console.warn(`[SocketEngine] Cloud socket unreachable. Automatic Fallback to Local LAN Gateway: ${lanUrl}`);
    isUsingLanFallback = true;
    (socket as any).io.uri = lanUrl;
    socket.connect();
  }
});

socket.on('connect', () => {
  console.log(`[SocketEngine] Socket connected to: ${(socket as any).io.uri}`);
});

export const switchSocketTarget = (targetUrl: string) => {
  try {
    socket.disconnect();
    (socket as any).io.uri = cleanOrigin(targetUrl);
    socket.connect();
  } catch (e) {
    console.error('Failed to switch socket target:', e);
  }
};
