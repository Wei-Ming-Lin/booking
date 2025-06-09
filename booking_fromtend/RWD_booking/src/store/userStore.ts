import { create } from 'zustand';

type UserRole = 'user' | 'manager' | 'admin' | undefined;

interface UserStore {
  role: UserRole;
  setRole: (role: UserRole) => void;
}

export const useUserStore = create<UserStore>((set) => ({
  role: undefined,
  setRole: (role) => set({ role }),
})); 