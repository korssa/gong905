"use client";

import { useState, useEffect } from "react";
import { GalleryGrid } from "./gallery-grid";
import { useGalleryStore } from "@/store/useGalleryStore";
import { loadGalleryData, syncGalleryData } from "@/lib/gallery-loader";
import { convertAppsToGallery } from "@/lib/gallery-converter";
import { Button } from "@/components/ui/button";
import { RefreshCw, Download } from "lucide-react";
import type { AppItem } from "@/types";

// 타입 정의
type GalleryFilter = 'all' | 'featured' | 'events';

// 헬퍼 함수들
function getGalleryTitle(filter: GalleryFilter): string {
  switch (filter) {
    case 'all':
      return '전체 갤러리';
    case 'featured':
      return '추천 갤러리';
    case 'events':
      return '이벤트 갤러리';
    default:
      return '갤러리';
  }
}

function getEmptyStateTitle(filter: GalleryFilter): string {
  switch (filter) {
    case 'all':
      return '아직 이미지가 없습니다';
    case 'featured':
      return '추천 이미지가 없습니다';
    case 'events':
      return '이벤트 이미지가 없습니다';
    default:
      return '이미지가 없습니다';
  }
}

function getEmptyStateMessage(filter: GalleryFilter): string {
  switch (filter) {
    case 'all':
      return '첫 번째 이미지를 업로드해보세요!';
    case 'featured':
      return '추천할 이미지를 추가해보세요!';
    case 'events':
      return '이벤트 이미지를 추가해보세요!';
    default:
      return '이미지를 추가해보세요!';
  }
}

interface GalleryManagerProps {
  readonly viewMode: "grid" | "list";
  readonly filter: GalleryFilter;
  readonly onRefresh?: () => void;
  readonly isAdmin?: boolean;
  readonly apps?: AppItem[];
}

export function GalleryManager({ viewMode, filter, onRefresh, isAdmin = false, apps = [] }: GalleryManagerProps) {
  const {
    isLoading,
    lastLoaded,
    setGalleryItems,
    setFeaturedItems,
    setEventItems,
    setLoading,
    setLastLoaded,
    getFilteredItems
  } = useGalleryStore();

  const [isInitialized, setIsInitialized] = useState(false);

  // 초기 데이터 로드
  useEffect(() => {
    if (isInitialized) return;
    
    const initializeData = async () => {
      setLoading(true);
      
      try {
        console.log('🚀 갤러리 매니저 초기화 시작...');
        
        // 모든 타입의 데이터를 병렬로 로드
        const [galleryData, featuredData, eventData] = await Promise.all([
          loadGalleryData('gallery'),
          loadGalleryData('featured'),
          loadGalleryData('events')
        ]);
        
        // 스토어에 데이터 설정
        setGalleryItems(galleryData);
        setFeaturedItems(featuredData);
        setEventItems(eventData);
        setLastLoaded(Date.now());
        
        console.log('✅ 갤러리 매니저 초기화 완료:', {
          gallery: galleryData.length,
          featured: featuredData.length,
          events: eventData.length
        });
        
        setIsInitialized(true);
      } catch (error) {
        console.error('❌ 갤러리 매니저 초기화 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, [isInitialized, setGalleryItems, setFeaturedItems, setEventItems, setLoading, setLastLoaded]);

  // 데이터 새로고침
  const handleRefresh = async () => {
    setLoading(true);
    
    try {
      console.log('🔄 갤러리 데이터 새로고침 시작...');
      
      // 현재 필터에 해당하는 데이터만 새로고침
      const freshData = await loadGalleryData(filter === 'all' ? 'gallery' : filter);
      
      if (filter === 'all') {
        setGalleryItems(freshData);
      } else if (filter === 'featured') {
        setFeaturedItems(freshData);
      } else if (filter === 'events') {
        setEventItems(freshData);
      }
      
      setLastLoaded(Date.now());
      
      console.log(`✅ ${filter} 데이터 새로고침 완료: ${freshData.length}개 항목`);
      
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('❌ 갤러리 데이터 새로고침 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // 데이터 동기화
  const handleSync = async () => {
    setLoading(true);
    
    try {
      console.log('🔄 갤러리 데이터 동기화 시작...');
      
      const currentItems = getFilteredItems(filter);
      const syncResult = await syncGalleryData(currentItems, filter === 'all' ? 'gallery' : filter);
      
      if (syncResult.success && syncResult.serverItems) {
        if (filter === 'all') {
          setGalleryItems(syncResult.serverItems);
        } else if (filter === 'featured') {
          setFeaturedItems(syncResult.serverItems);
        } else if (filter === 'events') {
          setEventItems(syncResult.serverItems);
        }
        
        setLastLoaded(Date.now());
        console.log('✅ 갤러리 데이터 동기화 완료');
      }
    } catch (error) {
      console.error('❌ 갤러리 데이터 동기화 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // 현재 필터에 따른 데이터 가져오기 (앱 데이터 우선 사용)
  const currentItems = (() => {
    if (apps.length > 0) {
      // 앱 데이터가 있으면 앱 데이터를 갤러리 아이템으로 변환
      const galleryItems = convertAppsToGallery(apps);
      
      switch (filter) {
        case 'featured':
          return galleryItems.filter(item => {
            const app = apps.find(a => a.id === item.id);
            return app?.isFeatured;
          });
        case 'events':
          return galleryItems.filter(item => {
            const app = apps.find(a => a.id === item.id);
            return app?.isEvent;
          });
        case 'all':
        default:
          return galleryItems;
      }
    } else {
      // 앱 데이터가 없으면 갤러리 스토어에서 가져오기
      return getFilteredItems(filter);
    }
  })();

  if (!isInitialized && isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400 mb-4"></div>
        <p className="text-gray-400">갤러리 데이터를 로드하는 중...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 컨트롤 패널 - 관리자만 표시 */}
      {isAdmin && (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold text-amber-400">
              {getGalleryTitle(filter)}
            </h2>
            <span className="text-sm text-gray-400">
              {currentItems.length}개 항목
            </span>
            {lastLoaded && (
              <span className="text-xs text-gray-500">
                마지막 업데이트: {new Date(lastLoaded).toLocaleTimeString()}
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
              className="flex items-center space-x-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>새로고침</span>
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={isLoading}
              className="flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>동기화</span>
            </Button>
          </div>
        </div>
      )}

      {/* 갤러리 그리드 */}
      <GalleryGrid items={currentItems} viewMode={viewMode} />
      
      {/* 빈 상태 메시지 */}
      {currentItems.length === 0 && !isLoading && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="text-6xl mb-4">🖼️</div>
          <h3 className="text-lg font-medium mb-2">
            {getEmptyStateTitle(filter)}
          </h3>
          <p className="text-muted-foreground">
            {getEmptyStateMessage(filter)}
          </p>
        </div>
      )}
    </div>
  );
}
