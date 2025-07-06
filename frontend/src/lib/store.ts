import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { jwtDecode } from 'jwt-decode';

interface User {
  id: string;
  email: string;
  roles: string[];
  full_name: string; // Add the missing property here
}

interface AuthState {
  token: string | null;
  user: User | null;
  isManager: boolean;
  login: (token: string) => void;
  logout: () => void;
  setIsManager: (isManager: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isManager: false,
      login: (token) => {
        const decodedUser: User = jwtDecode(token);
        set({ token, user: decodedUser });
      },
      logout: () => {
        set({ token: null, user: null, isManager: false });
      },
      setIsManager: (isManager) => {
        set({ isManager });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        token: state.token, 
        user: state.user, 
        isManager: state.isManager 
      }),
    }
  )
);
