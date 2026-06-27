import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Restaurant } from '../types';

interface AuthState {
  token: string | null;
  user: User | null;
  restaurant: Restaurant | null;
  login: (token: string, user: User, restaurant: Restaurant) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      restaurant: null,
      login: (token, user, restaurant) => set({ token, user, restaurant }),
      logout: () => set({ token: null, user: null, restaurant: null }),
      updateUser: (user) => set((state) => ({ user: state.user ? { ...state.user, ...user } : null })),
    }),
    {
      name: 'qr-menu-auth-session',
    }
  )
);
