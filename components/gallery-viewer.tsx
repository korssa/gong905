'use client';

import { useState, useEffect } from 'react';
import { useGalleryStore, type GalleryType } from '@/store/useGalleryStore';
import { GalleryGrid } from '@/components/gallery-grid';
import { Button } from '@/components/ui/button';
import { ImageIcon, Grid, List, Plus } from 'lucide-react';
import { AdminUploadDialog } from '@/components/admin-upload-dialog';

interface GalleryItem {
  id: string;
  imageUrl: string;
  title: string;
  author: string;
  likes: number;
  views: number;
  uploadDate: string;
  tags: string[];
}

export function GalleryViewer() {
  const { selected, setSelected, featuredThumbnails } = useGalleryStore();
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showAdminUpload, setShowAdminUpload] = useState(false);

  // 선택된 갤러리 데이터 로드
  const loadGalleryData = async (type: GalleryType) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/gallery/${type}`);
      const result = await response.json();
      
      if (result.success) {
        setItems(result.data);
        console.log(`📱 갤러리 ${type} 로드 완료: ${result.data.length}개`);
      } else {
        console.error(`❌ 갤러리 ${type} 로드 실패:`, result.error);
        setItems([]);
      }
    } catch (error) {
      console.error(`❌ 갤러리 ${type} 로드 오류:`, error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  // 갤러리 타입 변경 시 데이터 로드
  useEffect(() => {
    loadGalleryData(selected);
  }, [selected]);


  const galleryTypes: { type: GalleryType; label: string; color: string }[] = [
    { type: 'a', label: '갤러리 A', color: 'bg-blue-500' },
    { type: 'b', label: '갤러리 B', color: 'bg-green-500' },
    { type: 'c', label: '갤러리 C', color: 'bg-purple-500' },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto p-6">
      {/* 갤러리 선택 탭 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex space-x-2">
          {galleryTypes.map(({ type, label, color }) => (
            <Button
              key={type}
              variant={selected === type ? 'default' : 'outline'}
              onClick={() => setSelected(type)}
              className={`${selected === type ? color : ''} transition-all`}
            >
              <ImageIcon className="w-4 h-4 mr-2" />
              {label}
            </Button>
          ))}
        </div>

        {/* 뷰 모드 토글 및 업로드 버튼 */}
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAdminUpload(true)}
            className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
          >
            <Plus className="w-4 h-4 mr-1" />
            Featured 카드 업로드
          </Button>
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>


      {/* 대표 썸네일 표시 */}
      {featuredThumbnails[selected] && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">대표 이미지</h3>
          <img 
            src={featuredThumbnails[selected]} 
            alt="대표 이미지"
            className="w-32 h-32 object-cover rounded-lg"
          />
        </div>
      )}

      {/* 로딩 상태 */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-2">갤러리 로딩 중...</span>
        </div>
      )}

      {/* 갤러리 그리드 */}
      {!loading && (
        <div>
          <div className="mb-4">
            <h2 className="text-2xl font-bold">
              {galleryTypes.find(g => g.type === selected)?.label}
            </h2>
            <p className="text-gray-600">
              총 {items.length}개의 이미지
            </p>
          </div>

          {items.length > 0 ? (
            <GalleryGrid 
              items={items} 
              viewMode={viewMode}
            />
          ) : (
            <div className="text-center py-16">
              <ImageIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">
                이미지가 없습니다
              </h3>
              <p className="text-gray-500">
                스승님이 gallery-{selected} 폴더에 이미지를 업로드해주세요.
              </p>
            </div>
          )}
        </div>
      )}

      {/* 관리자 업로드 다이얼로그 */}
      {showAdminUpload && (
        <AdminUploadDialog
          isOpen={showAdminUpload}
          onClose={() => setShowAdminUpload(false)}
          onUploadSuccess={() => {
            console.log('✅ Featured 카드 업로드 완료');
            // 갤러리 데이터 새로고침
            loadGalleryData(selected);
            setShowAdminUpload(false);
          }}
        />
      )}
    </div>
  );
}
