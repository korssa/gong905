"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Eye, EyeOff, Calendar, User, FileText, ArrowLeft } from "lucide-react";
import { ContentItem, ContentFormData, ContentType } from "@/types";
import { useAdmin } from "@/hooks/use-admin";
import { uploadFile } from "@/lib/storage-adapter";

interface NewsListProps {
  type: string; // "news"
  onBack?: () => void;
}

export function NewsList({ type, onBack }: NewsListProps) {
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [selected, setSelected] = useState<ContentItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingContent, setEditingContent] = useState<ContentItem | null>(null);
  const [formData, setFormData] = useState<ContentFormData>({
    title: "",
    content: "",
    author: "",
    type: 'news' as ContentType,
    tags: "",
    isPublished: false,
  });
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const { isAuthenticated } = useAdmin();

  // 번역 피드백 차단 함수
  const blockTranslationFeedback = () => {
    try {
      const feedbackElements = document.querySelectorAll([
        '.goog-te-balloon-frame',
        '.goog-te-ftab',
        '.goog-te-ftab-float', 
        '.goog-tooltip',
        '.goog-tooltip-popup',
        '.goog-te-banner-frame',
        '.goog-te-banner-frame-skiptranslate',
        '.goog-te-gadget',
        '.goog-te-combo',
        '.goog-te-menu-frame',
        '.goog-te-menu-value',
        '.goog-te-banner',
        '.goog-te-banner-frame',
        '.goog-te-banner-frame-skiptranslate',
        '.goog-te-banner-frame-skiptranslate-goog-inline-block',
        '[class*="goog-te-balloon"]',
        '[class*="goog-te-ftab"]',
        '[class*="goog-te-tooltip"]',
        '[class*="goog-te-banner"]',
        '[class*="goog-te-gadget"]',
        '[class*="goog-te-combo"]',
        '[class*="goog-te-menu"]',
        '[id*="goog-te"]',
        '[id*="goog-tooltip"]',
        '[id*="goog-balloon"]'
      ].join(','));
      
      feedbackElements.forEach(el => {
        (el as HTMLElement).style.display = 'none';
        (el as HTMLElement).style.visibility = 'hidden';
        (el as HTMLElement).style.opacity = '0';
        (el as HTMLElement).style.pointerEvents = 'none';
        (el as HTMLElement).style.position = 'absolute';
        (el as HTMLElement).style.left = '-9999px';
        (el as HTMLElement).style.top = '-9999px';
        (el as HTMLElement).style.zIndex = '-9999';
      });
    } catch (error) {
      // 에러 무시
    }
    
    // 추가 지연 차단 (더블 체크)
    setTimeout(() => {
      try {
        const allGoogleElements = document.querySelectorAll('*');
        allGoogleElements.forEach(el => {
          const className = el.className || '';
          const id = el.id || '';
          if (className.includes('goog-') || id.includes('goog-')) {
            (el as HTMLElement).style.display = 'none';
            (el as HTMLElement).style.visibility = 'hidden';
            (el as HTMLElement).style.opacity = '0';
            (el as HTMLElement).style.pointerEvents = 'none';
          }
        });
      } catch (error) {
        // 에러 무시
      }
    }, 50);
  };

  // Load content list
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/content?type=${type}`);
        const data = await res.json();
        setContents(data.filter((c: ContentItem) => c.isPublished));
      } catch {

      } finally {
        setLoading(false);
      }
    };
    load();
    
    // 컴포넌트 마운트 시 번역 피드백 차단
    blockTranslationFeedback();
    
    // 주기적으로 번역 피드백 차단 (1초마다)
    const interval = setInterval(blockTranslationFeedback, 1000);
    
    return () => clearInterval(interval);
  }, [type]);

  // 폼 초기화
  const resetForm = () => {
    setFormData({
      title: "",
      content: "",
      author: "",
      type: 'news' as ContentType,
      tags: "",
      isPublished: false,
    });
    setEditingContent(null);
    setSelectedImage(null);
    setImagePreview(null);
  };

  // 이미지 선택 핸들러
  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedImage(file);
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    }
  };

  // 이미지 제거 핸들러
  const handleRemoveImage = () => {
    setSelectedImage(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
    }
  };

  // 콘텐츠 저장
  const handleSubmit = async () => {
    try {
      let imageUrl = null;

      // 이미지가 선택된 경우 업로드
      if (selectedImage) {
        try {
          imageUrl = await uploadFile(selectedImage, 'content-images');
        } catch {
          throw new Error('이미지 업로드에 실패했습니다.');
        }
      }

      const url = editingContent ? `/api/content` : `/api/content`;
      const method = editingContent ? 'PUT' : 'POST';
      const body = editingContent 
        ? { id: editingContent.id, ...formData, imageUrl } 
        : { ...formData, imageUrl };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        setIsDialogOpen(false);
        resetForm();
        // 콘텐츠 목록 다시 로드
        const res = await fetch(`/api/content?type=${type}`);
        const data = await res.json();
        setContents(data.filter((c: ContentItem) => c.isPublished));
      }
    } catch {
      alert('News 저장에 실패했습니다.');
    }
  };

  // 콘텐츠 삭제
  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      const response = await fetch(`/api/content?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const res = await fetch(`/api/content?type=${type}`);
        const data = await res.json();
        setContents(data.filter((c: ContentItem) => c.isPublished));
      }
    } catch {
      // 삭제 실패
    }
  };

  // 편집 모드 시작
  const handleEdit = (content: ContentItem) => {
    setEditingContent(content);
    setFormData({
      title: content.title,
      content: content.content,
      author: content.author,
      type: content.type,
      tags: content.tags?.join(', ') || "",
      isPublished: content.isPublished,
    });
    setIsDialogOpen(true);
  };

  // 게시 상태 토글
  const togglePublish = async (content: ContentItem) => {
    try {
      const response = await fetch('/api/content', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: content.id,
          isPublished: !content.isPublished,
        }),
      });

      if (response.ok) {
        const res = await fetch(`/api/content?type=${type}`);
        const data = await res.json();
        setContents(data.filter((c: ContentItem) => c.isPublished));
      }
    } catch {
      // 토글 실패
    }
  };

  // If content selected, show detail view
  if (selected) {
    return (
      <div className="w-full space-y-6 px-4" onMouseEnter={blockTranslationFeedback}>
                 {/* 상단 버튼 */}
         <Button 
           onClick={() => {
             setSelected(null);
             // 상단으로 빠르게 스크롤
             window.scrollTo({ top: 0, behavior: 'smooth' });
           }} 
           variant="ghost" 
           className="text-white hover:text-amber-400 transition-colors"
           onMouseEnter={blockTranslationFeedback}
         >
           <ArrowLeft className="w-4 h-4 mr-2" />
           ← To the full list
         </Button>

        <div className="w-full flex justify-center">
          <div className="w-full max-w-2xl">
            {/* 헤더 정보 */}
            <div className="text-white border-b border-gray-600 pb-4 mb-6">
              <h1 className="text-3xl font-bold mb-2">{selected.title}</h1>
              <div className="flex gap-4 text-sm text-gray-400">
                <span className="flex items-center gap-1">
                  <User className="w-4 h-4" /> {selected.author}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {new Date(selected.publishDate).toLocaleDateString()}
                </span>
                <span className="flex items-center gap-1">
                  <Eye className="w-4 h-4" /> {selected.views}회 조회
                </span>
              </div>
            </div>

            {/* 본문 콘텐츠 */}
            <article className="text-left text-gray-300 leading-relaxed space-y-6">
              {/* 이미지가 있으면 본문 시작 부분에 배치 */}
              {selected.imageUrl && (
                <div className="flex justify-start mb-6">
                  <img
                    src={selected.imageUrl}
                    alt={selected.title}
                    className="max-w-xs h-auto rounded shadow-lg"
                    style={{ maxHeight: '300px' }}
                  />
                </div>
              )}

              {/* 본문 텍스트 */}
              <div
                className="whitespace-pre-wrap"
                dangerouslySetInnerHTML={{
                  __html: selected.content
                    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                    .replace(/\*(.*?)\*/g, "<em>$1</em>")
                    .replace(/\n/g, "<br>")
                }}
              />
            </article>

                         {/* 태그 */}
             {selected.tags && selected.tags.length > 0 && (
               <div className="flex gap-2 flex-wrap mt-6 pt-4 border-t border-gray-600">
                 {selected.tags.map((tag, index) => (
                   <span
                     key={index}
                     className="px-3 py-1 bg-white text-black rounded-full text-sm"
                   >
                     #{tag}
                   </span>
                 ))}
               </div>
             )}
          </div>
        </div>

                 {/* 하단 버튼 */}
         <Button 
           onClick={() => {
             setSelected(null);
             // 상단으로 빠르게 스크롤
             window.scrollTo({ top: 0, behavior: 'smooth' });
           }} 
           variant="ghost" 
           className="text-white hover:text-amber-400 transition-colors"
           onMouseEnter={blockTranslationFeedback}
         >
           <ArrowLeft className="w-4 h-4 mr-2" />
           ← To the full list
         </Button>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="w-full max-w-4xl mx-auto px-4">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-400 mx-auto"></div>
          <p className="text-gray-400 mt-4">News를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (contents.length === 0) {
    return (
      <div className="w-full max-w-4xl mx-auto px-4">
        <div className="text-center py-12">
          <h3 className="text-xl font-semibold text-gray-300 mb-2">News가 없습니다</h3>
          <p className="text-gray-400 mb-6">곧 새로운 News가 추가될 예정입니다.</p>
          
          {/* 관리자 모드에서만 추가 버튼 표시 */}
          {isAuthenticated && (
            <div className="mt-6">
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={resetForm} className="gap-2">
                    <Plus className="h-4 w-4" />
                    새 News 작성
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingContent ? 'News 수정' : '새 News 작성'}
                    </DialogTitle>
                    <DialogDescription>
                      최신 업데이트와 소식을 작성하세요.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">제목 *</label>
                      <Input
                        value={formData.title}
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="제목을 입력하세요"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">작성자 *</label>
                      <Input
                        value={formData.author}
                        onChange={(e) => setFormData(prev => ({ ...prev, author: e.target.value }))}
                        placeholder="작성자명을 입력하세요"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">내용 *</label>
                      <Textarea
                        value={formData.content}
                        onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                        placeholder="내용을 입력하세요 (마크다운 지원)"
                        rows={10}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">태그</label>
                      <Input
                        value={formData.tags}
                        onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                        placeholder="태그를 쉼표로 구분하여 입력하세요"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">대표 이미지 (선택사항)</label>
                      <div className="space-y-2">
                        <input
                          id="image-upload"
                          type="file"
                          accept="image/*"
                          onChange={handleImageSelect}
                          className="hidden"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => document.getElementById('image-upload')?.click()}
                            className="px-3 py-2 text-sm bg-gray-800 border border-gray-600 text-gray-300 hover:border-amber-400 rounded transition-colors"
                          >
                            이미지 선택
                          </button>
                          {selectedImage && (
                            <button
                              type="button"
                              onClick={handleRemoveImage}
                              className="px-3 py-2 text-sm bg-red-600 border border-red-600 text-white hover:bg-red-700 rounded transition-colors"
                            >
                              제거
                            </button>
                          )}
                        </div>
                        {imagePreview && (
                          <div className="mt-2">
                            <img
                              src={imagePreview}
                              alt="미리보기"
                              className="w-32 h-32 object-cover rounded border"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="isPublished"
                        checked={formData.isPublished}
                        onChange={(e) => setFormData(prev => ({ ...prev, isPublished: e.target.checked }))}
                      />
                      <label htmlFor="isPublished" className="text-sm">
                        즉시 게시
                      </label>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                      취소
                    </Button>
                    <Button onClick={handleSubmit}>
                      {editingContent ? '수정' : '저장'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 px-4" onMouseEnter={blockTranslationFeedback}>
             {onBack && (
         <Button 
           onClick={onBack} 
           variant="ghost" 
           className="text-white hover:text-amber-400 transition-colors"
           onMouseEnter={blockTranslationFeedback}
         >
           <ArrowLeft className="w-4 h-4 mr-2" />
           뒤로 가기
         </Button>
       )}

      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">News</h2>
        <p className="text-gray-400">최신 업데이트와 소식을 확인해보세요</p>
        {isAuthenticated && (
          <div className="mt-4">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm} className="gap-2">
                  <Plus className="h-4 w-4" />
                  새 News 작성
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingContent ? 'News 수정' : '새 News 작성'}
                  </DialogTitle>
                  <DialogDescription>
                    최신 업데이트와 소식을 작성하세요.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">제목 *</label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="제목을 입력하세요"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">작성자 *</label>
                    <Input
                      value={formData.author}
                      onChange={(e) => setFormData(prev => ({ ...prev, author: e.target.value }))}
                      placeholder="작성자명을 입력하세요"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">내용 *</label>
                    <Textarea
                      value={formData.content}
                      onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                      placeholder="내용을 입력하세요 (마크다운 지원)"
                      rows={10}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">태그</label>
                    <Input
                      value={formData.tags}
                      onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                      placeholder="태그를 쉼표로 구분하여 입력하세요"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">대표 이미지 (선택사항)</label>
                    <div className="space-y-2">
                      <input
                        id="image-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleImageSelect}
                        className="hidden"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => document.getElementById('image-upload')?.click()}
                          className="px-3 py-2 text-sm bg-gray-800 border border-gray-600 text-gray-300 hover:border-amber-400 rounded transition-colors"
                        >
                          이미지 선택
                        </button>
                        {selectedImage && (
                          <button
                            type="button"
                            onClick={handleRemoveImage}
                            className="px-3 py-2 text-sm bg-red-600 border border-red-600 text-white hover:bg-red-700 rounded transition-colors"
                          >
                            제거
                          </button>
                        )}
                      </div>
                      {imagePreview && (
                        <div className="mt-2">
                          <img
                            src={imagePreview}
                            alt="미리보기"
                            className="w-32 h-32 object-cover rounded border"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="isPublished"
                      checked={formData.isPublished}
                      onChange={(e) => setFormData(prev => ({ ...prev, isPublished: e.target.checked }))}
                    />
                    <label htmlFor="isPublished" className="text-sm">
                      즉시 게시
                    </label>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    취소
                  </Button>
                  <Button onClick={handleSubmit}>
                    {editingContent ? '수정' : '저장'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {contents.map((content) => (
                     <Card
             key={content.id}
             className="bg-gray-800/50 border-gray-700 hover:border-amber-400/50 hover:bg-gray-800/70 transition-all duration-300 cursor-pointer group"
             onClick={() => {
               setSelected(content);
               blockTranslationFeedback();
             }}
           >
            <CardHeader className="pb-3">
              {content.imageUrl && (
                <div className="aspect-video overflow-hidden rounded-lg mb-3">
                  <img
                    src={content.imageUrl}
                    alt={content.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              )}
              <CardTitle className="text-lg font-semibold text-white group-hover:text-amber-400 transition-colors line-clamp-2">
                {content.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between text-sm text-gray-400">
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {content.author}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(content.publishDate).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center gap-1 text-sm text-gray-400 mt-2">
                <Eye className="w-3 h-3" />
                {content.views}회 조회
              </div>
              {isAuthenticated && (
                <div className="flex items-center gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => togglePublish(content)}
                    className="text-gray-400 hover:text-white"
                  >
                    {content.isPublished ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(content)}
                    className="text-gray-400 hover:text-white"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(content.id)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
