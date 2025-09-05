import { create } from 'zustand';

export type GalleryType = 'a' | 'b' | 'c';

interface GalleryState {
  selected: GalleryType;
  setSelected: (type: GalleryType) => void;
}

export const useGalleryStore = create<GalleryState>((set) => ({
  selected: 'a', // 기본값: All Apps (갤러리 A)
  setSelected: (type) => set({ selected: type }),
}));