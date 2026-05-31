import { create } from 'zustand';
import type { TrialSubPhase } from '@ace-attorney/shared';

interface TrialState {
  subPhase: TrialSubPhase;
  witnessIndex: number;
  lineIndex: number;
  showObjection: boolean;
  showEvidencePicker: boolean;
  wrongCount: number;
  examinedHotspots: string[];
  setSubPhase: (phase: TrialSubPhase) => void;
  setWitnessIndex: (i: number) => void;
  setLineIndex: (i: number) => void;
  setShowObjection: (show: boolean) => void;
  setShowEvidencePicker: (show: boolean) => void;
  incrementWrong: () => void;
  addExaminedHotspot: (id: string) => void;
  reset: () => void;
}

export const useTrialStore = create<TrialState>((set, get) => ({
  subPhase: 'opening',
  witnessIndex: 0,
  lineIndex: 0,
  showObjection: false,
  showEvidencePicker: false,
  wrongCount: 0,
  examinedHotspots: [],
  setSubPhase: (phase) => set({ subPhase: phase }),
  setWitnessIndex: (i) => set({ witnessIndex: i }),
  setLineIndex: (i) => set({ lineIndex: i }),
  setShowObjection: (show) => set({ showObjection: show }),
  setShowEvidencePicker: (show) => set({ showEvidencePicker: show }),
  incrementWrong: () => set({ wrongCount: get().wrongCount + 1 }),
  addExaminedHotspot: (id) => {
    if (!get().examinedHotspots.includes(id)) {
      set({ examinedHotspots: [...get().examinedHotspots, id] });
    }
  },
  reset: () =>
    set({
      subPhase: 'opening',
      witnessIndex: 0,
      lineIndex: 0,
      showObjection: false,
      showEvidencePicker: false,
      wrongCount: 0,
      examinedHotspots: [],
    }),
}));
