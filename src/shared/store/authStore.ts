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
  updateRestaurant: (restaurant: Partial<Restaurant>) => void;
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
      updateRestaurant: (restaurant) => set((state) => ({ restaurant: state.restaurant ? { ...state.restaurant, ...restaurant } : null })),
    }),
    {
      name: 'qr-menu-auth-session',
    }
  )
);
