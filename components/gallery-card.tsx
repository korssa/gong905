"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, Download, Share2, MoreHorizontal, Trash2 } from "lucide-react";
import { useState } from "react";

export interface GalleryItem {
  id: string;
  imageUrl: string;
  title: string;
  author: string;
  likes: number;
  views: number;
  uploadDate: string;
  tags?: string[];
}

interface GalleryCardProps {
  item: GalleryItem;
  viewMode: "grid" | "list";
  onDelete?: (id: string) => void;
  isAdmin?: boolean;
}

export function GalleryCard({ item, viewMode, onDelete, isAdmin = false }: GalleryCardProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [likes, setLikes] = useState(item.likes);

  const handleLike = () => {
    setIsLiked(!isLiked);
    setLikes(prev => isLiked ? prev - 1 : prev + 1);
  };

  const handleDelete = () => {
    if (onDelete && confirm(`"${item.title}"을(를) 삭제하시겠습니까?`)) {
      onDelete(item.id);
    }
  };

  if (viewMode === "list") {
    return (
      <Card className="flex flex-row overflow-hidden hover:shadow-lg transition-shadow">
        <div className="w-48 h-32 flex-shrink-0">
          <img
            src={item.imageUrl}
            alt={item.title}
            className="w-full h-full object-cover"
          />
        </div>
        <CardContent className="flex-1 p-4">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-1">{item.title}</h3>
              <p className="text-sm text-muted-foreground mb-2">
                작성자: {item.author}
              </p>
                             <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                 <span>{likes} 좋아요</span>
                 <span>{item.views} 조회</span>
                 <span>{item.uploadDate}</span>
               </div>
              {item.tags && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {item.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-secondary rounded-full text-xs"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLike}
                className={isLiked ? "text-red-500" : ""}
              >
                <Heart className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`} />
              </Button>
              <Button variant="ghost" size="sm">
                <Download className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm">
                <Share2 className="h-4 w-4" />
              </Button>
              {isAdmin && onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
      <div className="relative aspect-square overflow-hidden">
        <img
          src={item.imageUrl}
          alt={item.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
        
        {/* 호버 시 액션 버튼들 */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="flex space-x-1">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleLike}
              className={`backdrop-blur-sm ${isLiked ? "text-red-500" : ""}`}
            >
              <Heart className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`} />
            </Button>
            <Button variant="secondary" size="sm" className="backdrop-blur-sm">
              <Download className="h-4 w-4" />
            </Button>
            {isAdmin && onDelete && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleDelete}
                className="backdrop-blur-sm text-red-500 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* 하단 정보 오버레이 */}
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="text-white">
            <h3 className="font-medium text-sm mb-1 truncate">{item.title}</h3>
            <p className="text-xs text-white/80">{item.author}</p>
          </div>
        </div>
      </div>

      <CardContent className="p-3">
        <h3 className="font-medium text-sm mb-1 truncate">{item.title}</h3>
        <p className="text-xs text-muted-foreground mb-2">{item.author}</p>
        
        <div className="flex items-center justify-between text-xs text-muted-foreground">
                     <div className="flex items-center space-x-3">
             <span className="flex items-center gap-1">
               <Heart className="h-3 w-3" />
               {likes}
             </span>
             <span>{item.views}</span>
           </div>
          <span>{item.uploadDate}</span>
        </div>

        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {item.tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-secondary rounded-full text-xs"
              >
                #{tag}
              </span>
            ))}
            {item.tags.length > 3 && (
              <span className="text-xs text-muted-foreground">
                +{item.tags.length - 3}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
