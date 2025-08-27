"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ContentItem } from "@/types";
import { User, Calendar, Eye, ArrowLeft } from "lucide-react";

interface NewsListProps {
  type: string; // "news"
  onBack?: () => void;
}

export function NewsList({ type, onBack }: NewsListProps) {
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [selected, setSelected] = useState<ContentItem | null>(null);
  const [loading, setLoading] = useState(true);

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
        // console.error("불러오기 실패");
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
          <p className="text-gray-400">곧 새로운 News가 추가될 예정입니다.</p>
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
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
