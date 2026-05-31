import { create } from 'zustand';
import type { GamePhase } from '@ace-attorney/shared';

interface GameState {
  sessionId: string | null;
  caseId: string;
  phase: GamePhase;
  hp: number;
  maxHp: number;
  currentSceneId: string;
  penaltyShake: boolean;
  setSessionId: (id: string | null) => void;
  setPhase: (phase: GamePhase) => void;
  setHp: (hp: number) => void;
  damageHp: (amount?: number) => void;
  setCurrentSceneId: (id: string) => void;
  triggerPenaltyShake: () => void;
  reset: () => void;
}

const initialState = {
  sessionId: null as string | null,
  caseId: 'case01',
  phase: 'prologue' as GamePhase,
  hp: 5,
  maxHp: 5,
  currentSceneId: 'crime_scene',
  penaltyShake: false,
};

export const useGameStore = create<GameState>((set, get) => ({
  ...initialState,
  setSessionId: (id) => set({ sessionId: id }),
  setPhase: (phase) => set({ phase }),
  setHp: (hp) => set({ hp: Math.max(0, Math.min(get().maxHp, hp)) }),
  damageHp: (amount = 1) => {
    set({ hp: Math.max(0, get().hp - amount), penaltyShake: true });
    setTimeout(() => set({ penaltyShake: false }), 500);
  },
  setCurrentSceneId: (id) => set({ currentSceneId: id }),
  triggerPenaltyShake: () => {
    set({ penaltyShake: true });
    setTimeout(() => set({ penaltyShake: false }), 500);
  },
  reset: () => set({ ...initialState }),
}));
