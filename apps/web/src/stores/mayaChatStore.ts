import { create } from 'zustand';
import type { MayaIntent, MayaMessage } from '@ace-attorney/shared';

interface MayaChatState {
  messages: MayaMessage[];
  isOpen: boolean;
  isLoading: boolean;
  pendingIntent: MayaIntent | null;
  addMessage: (msg: MayaMessage) => void;
  setOpen: (open: boolean) => void;
  setLoading: (loading: boolean) => void;
  setPendingIntent: (intent: MayaIntent | null) => void;
  reset: () => void;
}

export const useMayaChatStore = create<MayaChatState>((set) => ({
  messages: [],
  isOpen: false,
  isLoading: false,
  pendingIntent: null,
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  setOpen: (open) => set({ isOpen: open }),
  setLoading: (loading) => set({ isLoading: loading }),
  setPendingIntent: (intent) => set({ pendingIntent: intent }),
  reset: () => set({ messages: [], isOpen: false, isLoading: false, pendingIntent: null }),
}));
