"use client";

import { create } from "zustand";

type AskRunnerState = {
  activeEntryIds: Set<string>;
  addActive: (entryId: string) => void;
  removeActive: (entryId: string) => void;
  isBusy: () => boolean;
};

export const useAskRunnerStore = create<AskRunnerState>((set, get) => ({
  activeEntryIds: new Set(),
  addActive: (entryId) =>
    set((s) => {
      const next = new Set(s.activeEntryIds);
      next.add(entryId);
      return { activeEntryIds: next };
    }),
  removeActive: (entryId) =>
    set((s) => {
      const next = new Set(s.activeEntryIds);
      next.delete(entryId);
      return { activeEntryIds: next };
    }),
  isBusy: () => get().activeEntryIds.size > 0,
}));

export function selectAskRunnerBusy(state: AskRunnerState): boolean {
  return state.activeEntryIds.size > 0;
}
