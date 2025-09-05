import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type GalleryType = 'a' | 'b' | 'c';

interface GalleryState {
  selected: GalleryType;
  setSelected: (type: GalleryType) => void;
  featuredThumbnails: Record<GalleryType, string>;
  setFeaturedThumbnail: (type: GalleryType, url: string) => void;
}

export const useGalleryStore = create<GalleryState>()(
  persist(
    (set) => ({
      selected: 'a',
      setSelected: (type) => set({ selected: type }),
      featuredThumbnails: {
        a: '',
        b: '',
        c: '',
      },
      setFeaturedThumbnail: (type, url) => 
        set((state) => ({
          featuredThumbnails: {
            ...state.featuredThumbnails,
            [type]: url,
          },
        })),
    }),
    {
      name: 'gallery-store',
    }
  )
);