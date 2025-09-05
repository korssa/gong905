'use client';

import { useState, useEffect, useRef } from 'react';
import { useGalleryStore, type GalleryType } from '@/store/useGalleryStore';
import { GalleryGrid } from '@/components/gallery-grid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ImageIcon, Grid, List, Upload, Plus } from 'lucide-react';

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
  const [uploading, setUploading] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // 파일 업로드 핸들러
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', uploadTitle || file.name.split('.')[0]);
      formData.append('author', '공명');

      const response = await fetch(`/api/gallery/${selected}/upload`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ 업로드 성공:', result.data);
        // 갤러리 데이터 새로고침
        await loadGalleryData(selected);
        // 폼 초기화
        setUploadTitle('');
        setShowUploadForm(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        console.error('❌ 업로드 실패:', result.error);
        alert(`업로드 실패: ${result.error}`);
      }
    } catch (error) {
      console.error('❌ 업로드 오류:', error);
      alert('업로드 중 오류가 발생했습니다.');
    } finally {
      setUploading(false);
    }
  };

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
            onClick={() => setShowUploadForm(!showUploadForm)}
            className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
          >
            <Plus className="w-4 h-4 mr-1" />
            업로드
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

      {/* 업로드 폼 */}
      {showUploadForm && (
        <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
          <h3 className="text-lg font-semibold mb-3 text-green-800">
            {galleryTypes.find(g => g.type === selected)?.label}에 이미지 업로드
          </h3>
          <div className="space-y-3">
            <Input
              type="text"
              placeholder="이미지 제목 (선택사항)"
              value={uploadTitle}
              onChange={(e) => setUploadTitle(e.target.value)}
              className="w-full"
            />
            <div className="flex items-center space-x-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
                disabled={uploading}
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="bg-green-600 hover:bg-green-700"
              >
                <Upload className="w-4 h-4 mr-2" />
                {uploading ? '업로드 중...' : '파일 선택'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowUploadForm(false);
                  setUploadTitle('');
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }}
                disabled={uploading}
              >
                취소
              </Button>
            </div>
          </div>
        </div>
      )}

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
    </div>
  );
}
