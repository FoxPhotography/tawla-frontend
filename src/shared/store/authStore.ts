import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Restaurant } from '../types';
import { socket } from '../services/socket';

export interface OfflineLease {
  restaurantId: string;
  restaurantName: string;
  plan: 'trial' | 'basic' | 'pro';
  isPaid: boolean;
  issuedAt: number;
  expiresAt: number;
  maxOfflineHours: number;
  signature: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  restaurant: Restaurant | null;
  offlineLease: OfflineLease | null;
  lastServerSyncTime: number;
  login: (token: string, user: User, restaurant: Restaurant | null, offlineLease?: OfflineLease) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
  updateRestaurant: (restaurant: Partial<Restaurant>) => void;
  setOfflineLease: (lease: OfflineLease | null) => void;
  updateLastServerSyncTime: (timestamp?: number) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      restaurant: null,
      offlineLease: null,
      lastServerSyncTime: Date.now(),
      login: (token, user, restaurant, offlineLease) => set({ 
        token, 
        user, 
        restaurant, 
        offlineLease: offlineLease || null,
        lastServerSyncTime: Date.now() 
      }),
      logout: () => {
        set({ token: null, user: null, restaurant: null, offlineLease: null });
        try {
          socket.disconnect();
        } catch (e) {
          console.error('Failed to disconnect socket on logout:', e);
        }
      },
      updateUser: (user) => set((state) => ({ user: state.user ? { ...state.user, ...user } : null })),
      updateRestaurant: (restaurant) => set((state) => ({ restaurant: state.restaurant ? { ...state.restaurant, ...restaurant } : null })),
      setOfflineLease: (offlineLease) => set({ offlineLease }),
      updateLastServerSyncTime: (timestamp) => set({ lastServerSyncTime: timestamp || Date.now() }),
    }),
    {
      name: 'qr-menu-auth-session',
    }
  )
);
