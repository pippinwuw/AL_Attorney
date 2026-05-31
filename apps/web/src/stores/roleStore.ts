import { create } from 'zustand';
import type { PlayerRole } from '@ace-attorney/shared';

interface RoleState {
  playerRole: PlayerRole;
  setPlayerRole: (role: PlayerRole) => void;
  isNaruhodo: () => boolean;
  reset: () => void;
}

export const useRoleStore = create<RoleState>((set, get) => ({
  playerRole: 'naruhodo',
  setPlayerRole: (role) => set({ playerRole: role }),
  isNaruhodo: () => get().playerRole === 'naruhodo',
  reset: () => set({ playerRole: 'naruhodo' }),
}));
