"use client";

import { GalleryCard, GalleryItem } from "./gallery-card";

interface GalleryGridProps {
  items: GalleryItem[];
  viewMode: "grid" | "list";
  onDelete?: (id: string) => void;
  isAdmin?: boolean;
}

export function GalleryGrid({ items, viewMode, onDelete, isAdmin = false }: GalleryGridProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="text-6xl mb-4">🖼️</div>
        <h3 className="text-lg font-medium mb-2">아직 이미지가 없습니다</h3>
        <p className="text-muted-foreground">
          첫 번째 이미지를 업로드해보세요!
        </p>
      </div>
      
    );
  }

  if (viewMode === "list") {
    return (
      <div className="space-y-4">
        {items.map((item) => (
          <GalleryCard 
            key={item.id} 
            item={item} 
            viewMode="list" 
            onDelete={onDelete}
            isAdmin={isAdmin}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {items.map((item) => (
        <GalleryCard 
          key={item.id} 
          item={item} 
          viewMode="grid" 
          onDelete={onDelete}
          isAdmin={isAdmin}
        />
      ))}
    </div>
  );
}
