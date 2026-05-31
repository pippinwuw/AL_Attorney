import { create } from 'zustand';
import type { EvidenceItem } from '@ace-attorney/shared';

interface EvidenceState {
  collected: EvidenceItem[];
  viewedIds: Set<string>;
  addEvidence: (item: EvidenceItem) => void;
  markViewed: (id: string) => void;
  hasEvidence: (id: string) => boolean;
  reset: () => void;
}

export const useEvidenceStore = create<EvidenceState>((set, get) => ({
  collected: [],
  viewedIds: new Set(),
  addEvidence: (item) => {
    const exists = get().collected.some((e) => e.id === item.id);
    if (!exists) {
      set({ collected: [...get().collected, item] });
    }
  },
  markViewed: (id) => {
    const viewed = new Set(get().viewedIds);
    viewed.add(id);
    set({ viewedIds: viewed });
  },
  hasEvidence: (id) => get().collected.some((e) => e.id === id),
  reset: () => set({ collected: [], viewedIds: new Set() }),
}));
