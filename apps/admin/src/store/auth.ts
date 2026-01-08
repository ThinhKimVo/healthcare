import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Admin {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthState {
  admin: Admin | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  setAuth: (admin: Admin, accessToken: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      admin: null,
      accessToken: null,
      isAuthenticated: false,

      setAuth: (admin, accessToken) => {
        set({ admin, accessToken, isAuthenticated: true });
      },

      logout: () => {
        set({ admin: null, accessToken: null, isAuthenticated: false });
      },
    }),
    {
      name: 'hopefull-admin-auth',
    }
  )
);
