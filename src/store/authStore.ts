import { create } from 'zustand';
import { User } from '../types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  showTwoFactor: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
  setShowTwoFactor: (show: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  showTwoFactor: false,
  login: async (email: string, password: string) => {
    set({ isLoading: true });
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const mockUser: User = {
      id: '1',
      name: 'Alex Johnson',
      email,
      avatar: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
      role: email.includes('admin') ? 'admin' : 'member',
      isOnline: true,
      lastSeen: new Date(),
      badges: ['Contributor', 'Early Adopter']
    };
    
    if (mockUser.role === 'admin') {
      set({ showTwoFactor: true, isLoading: false });
    } else {
      set({ user: mockUser, isAuthenticated: true, isLoading: false });
    }
  },
  logout: () => set({ user: null, isAuthenticated: false, showTwoFactor: false }),
  setUser: (user) => set({ user, isAuthenticated: true, showTwoFactor: false }),
  setShowTwoFactor: (show) => set({ showTwoFactor: show })
}));