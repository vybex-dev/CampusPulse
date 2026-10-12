import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type {
  BlockCode,
  Range,
  ResourceTab,
  Role,
  WasteMode,
} from "@/lib/contract";

interface UIState {
  role: Role;
  range: Range;
  resourceTab: ResourceTab;
  block: BlockCode | null;
  wasteMode: WasteMode;
  setRole: (role: Role) => void;
  setRange: (range: Range) => void;
  setResourceTab: (tab: ResourceTab) => void;
  setBlock: (block: BlockCode | null) => void;
  setWasteMode: (mode: WasteMode) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      role: "admin",
      range: 7,
      resourceTab: "all",
      block: null,
      wasteMode: "identify",
      setRole: (role) => set({ role }),
      setRange: (range) => set({ range }),
      setResourceTab: (resourceTab) => set({ resourceTab }),
      setBlock: (block) => set({ block }),
      setWasteMode: (wasteMode) => set({ wasteMode }),
    }),
    {
      name: "campuspulse-ui",
      storage: createJSONStorage(() => sessionStorage),
      skipHydration: true,
      partialize: (s) => ({
        role: s.role,
        range: s.range,
        resourceTab: s.resourceTab,
        block: s.block,
        wasteMode: s.wasteMode,
      }),
    },
  ),
);
