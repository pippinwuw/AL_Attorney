import { create } from 'zustand';
import type { DialogLine } from '@ace-attorney/shared';

interface DialogState {
  currentLine: DialogLine | null;
  history: string[];
  setCurrentLine: (line: DialogLine | null) => void;
  addHistory: (id: string) => void;
  reset: () => void;
}

export const useDialogStore = create<DialogState>((set) => ({
  currentLine: null,
  history: [],
  setCurrentLine: (line) => set({ currentLine: line }),
  addHistory: (id) => set((s) => ({ history: [...s.history, id] })),
  reset: () => set({ currentLine: null, history: [] }),
}));
