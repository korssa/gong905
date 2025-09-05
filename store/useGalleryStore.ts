"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { GalleryItem } from "@/components/gallery-card";

interface GalleryStore {
  // 갤러리 데이터
  galleryItems: GalleryItem[];
  featuredItems: GalleryItem[];
  eventItems: GalleryItem[];
  
  // 로딩 상태
  isLoading: boolean;
  lastLoaded: number | null;
  
  // 액션들
  setGalleryItems: (items: GalleryItem[]) => void;
  setFeaturedItems: (items: GalleryItem[]) => void;
  setEventItems: (items: GalleryItem[]) => void;
  addGalleryItem: (item: GalleryItem) => void;
  updateGalleryItem: (id: string, updates: Partial<GalleryItem>) => void;
  removeGalleryItem: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setLastLoaded: (timestamp: number) => void;
  
  // 필터링된 데이터 가져오기
  getFilteredItems: (filter: 'all' | 'featured' | 'events') => GalleryItem[];
  
  // 초기화
  clearAll: () => void;
}

export const useGalleryStore = create<GalleryStore>()(
  persist(
    (set, get) => ({
      // 초기 상태
      galleryItems: [],
      featuredItems: [],
      eventItems: [],
      isLoading: false,
      lastLoaded: null,

      // 액션들
      setGalleryItems: (items) => {
        set({ galleryItems: items });
      },

      setFeaturedItems: (items) => {
        set({ featuredItems: items });
      },

      setEventItems: (items) => {
        set({ eventItems: items });
      },

      addGalleryItem: (item) => {
        set((state) => ({
          galleryItems: [item, ...state.galleryItems]
        }));
      },

      updateGalleryItem: (id, updates) => {
        set((state) => ({
          galleryItems: state.galleryItems.map(item =>
            item.id === id ? { ...item, ...updates } : item
          ),
          featuredItems: state.featuredItems.map(item =>
            item.id === id ? { ...item, ...updates } : item
          ),
          eventItems: state.eventItems.map(item =>
            item.id === id ? { ...item, ...updates } : item
          )
        }));
      },

      removeGalleryItem: (id) => {
        set((state) => ({
          galleryItems: state.galleryItems.filter(item => item.id !== id),
          featuredItems: state.featuredItems.filter(item => item.id !== id),
          eventItems: state.eventItems.filter(item => item.id !== id)
        }));
      },

      setLoading: (loading) => {
        set({ isLoading: loading });
      },

      setLastLoaded: (timestamp) => {
        set({ lastLoaded: timestamp });
      },

      getFilteredItems: (filter) => {
        const { galleryItems, featuredItems, eventItems } = get();
        
        switch (filter) {
          case 'featured':
            return featuredItems;
          case 'events':
            return eventItems;
          case 'all':
          default:
            return galleryItems;
        }
      },

      clearAll: () => {
        set({
          galleryItems: [],
          featuredItems: [],
          eventItems: [],
          isLoading: false,
          lastLoaded: null
        });
      }
    }),
    {
      name: "gallery-store-v1",
      storage: createJSONStorage(() => localStorage),
      version: 1,
      // 중요한 데이터만 persist
      partialize: (state) => ({
        galleryItems: state.galleryItems,
        featuredItems: state.featuredItems,
        eventItems: state.eventItems,
        lastLoaded: state.lastLoaded
      })
    }
  )
);
