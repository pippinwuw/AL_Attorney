import { create } from 'zustand';
import type { CaseDossier, MayaMessage } from '@ace-attorney/shared';

export type CourtRecordTab = 'evidence' | 'dossier';

interface CourtRecordState {
  isOpen: boolean;
  activeTab: CourtRecordTab;
  dossier: CaseDossier | null;
  dossierMessages: MayaMessage[];
  isLoading: boolean;
  setOpen: (open: boolean) => void;
  setActiveTab: (tab: CourtRecordTab) => void;
  setDossier: (dossier: CaseDossier) => void;
  setDossierMessages: (messages: MayaMessage[]) => void;
  addDossierMessage: (msg: MayaMessage) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useCourtRecordStore = create<CourtRecordState>((set) => ({
  isOpen: false,
  activeTab: 'evidence',
  dossier: null,
  dossierMessages: [],
  isLoading: false,
  setOpen: (open) => set({ isOpen: open }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setDossier: (dossier) => set({ dossier }),
  setDossierMessages: (messages) => set({ dossierMessages: messages }),
  addDossierMessage: (msg) => set((s) => ({ dossierMessages: [...s.dossierMessages, msg] })),
  setLoading: (loading) => set({ isLoading: loading }),
  reset: () =>
    set({
      isOpen: false,
      activeTab: 'evidence',
      dossier: null,
      dossierMessages: [],
      isLoading: false,
    }),
}));
