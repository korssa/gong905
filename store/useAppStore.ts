"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { AppItem } from "@/types";

interface AppStore {
  apps: AppItem[];
  setApps: (apps: AppItem[]) => void;
  updateApp: (id: string, patch: Partial<AppItem>) => void;
  toggleFeatured: (id: string) => void;
  toggleEvent: (id: string) => void;
  getFeaturedApps: () => AppItem[];
  getEventApps: () => AppItem[];
  getNormalApps: () => AppItem[];
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      apps: [],

      setApps: (apps) => {
        // 들어오는 데이터에 featured/event 기본값 보정
        const normalized = apps.map(a => ({
          ...a,
          isFeatured: a.isFeatured ?? false,
          isEvent: a.isEvent ?? false,
        }));
        set({ apps: normalized });
      },

      updateApp: (id, patch) => {
        set((state) => ({
          apps: state.apps.map((a) =>
            a.id === id ? { ...a, ...patch } : a
          ),
        }));
      },

      toggleFeatured: (id) => {
        const { apps } = get();
        const curr = apps.find(a => a.id === id);
        if (!curr) return;
        set((state) => ({
          apps: state.apps.map((a) =>
            a.id === id ? { ...a, isFeatured: !a.isFeatured } : a
          ),
        }));
      },

      toggleEvent: (id) => {
        const { apps } = get();
        const curr = apps.find(a => a.id === id);
        if (!curr) return;
        set((state) => ({
          apps: state.apps.map((a) =>
            a.id === id ? { ...a, isEvent: !a.isEvent } : a
          ),
        }));
      },

      getFeaturedApps: () => {
        return get().apps.filter(app => app.isFeatured);
      },

      getEventApps: () => {
        return get().apps.filter(app => app.isEvent);
      },

      getNormalApps: () => {
        const { apps } = get();
        return apps.filter(app => !app.isFeatured && !app.isEvent);
      },
    }),
    {
      name: "app-store-v2",
      storage: createJSONStorage(() => localStorage),
      version: 2,
      migrate: (persistedState: any, version) => {
        // v2로 오면서 featured/event 기본값 주입
        if (!persistedState?.apps) return persistedState;
        persistedState.apps = persistedState.apps.map((a: any) => ({
          ...a,
          isFeatured: a?.isFeatured ?? false,
          isEvent: a?.isEvent ?? false,
        }));
        return persistedState;
      },
      // 절대 필드 제외(partialize) 하지 마라 → 누락 원인 1위
    }
  )
);
