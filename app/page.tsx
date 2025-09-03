"use client";

import { useState, useEffect } from "react";

declare global {
  interface Window {
    adminModeChange?: (visible: boolean) => void;
  }
}
import { Header } from "@/components/layout/header";
import { AppGallery } from "@/components/app-gallery";
import { HiddenAdminAccess } from "@/components/hidden-admin-access";
import { EditAppDialog } from "@/components/edit-app-dialog";
import { AdminUploadDialog } from "@/components/admin-upload-dialog";
import { SnowAnimation } from "@/components/snow-animation";
import { MailForm } from "@/components/mail-form";
// ContentManager is imported in other files; not used directly here.
import { AppStoryList } from "@/components/app-story-list";
import { NewsList } from "@/components/news-list";

// Button not used in this file
import { AppItem, AppFormData, FilterType, ContentType } from "@/types";
import { useLanguage } from "@/hooks/use-language";
import { useAdmin } from "@/hooks/use-admin";
import { saveFileToLocal, generateUniqueId } from "@/lib/file-utils";
import { validateAppsImages } from "@/lib/image-utils";
import { uploadFile, deleteFile } from "@/lib/storage-adapter";
import { loadAppsFromBlob, saveAppsToBlob, loadFeaturedAppsFromBlob, saveFeaturedAppsToBlob, toggleFeaturedAppStatus, loadAppsByTypeFromBlob, saveAppsByTypeToBlob } from "@/lib/data-loader";
import { blockTranslationFeedback, createAdminButtonHandler } from "@/lib/translation-utils";
import Image from "next/image";
import { Button } from "@/components/ui/button";

const isBlobUrl = (url?: string) => {
  return !!url && (url.includes('vercel-storage.com') || url.includes('blob.vercel-storage.com'));
};

// 빈 앱 데이터 (샘플 앱 제거됨)
const sampleApps: AppItem[] = [];

export default function Home() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [apps, setApps] = useState<AppItem[]>([]);
  const [isAdminDialogOpen, setIsAdminDialogOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<AppItem | null>(null);
  const [currentFilter, setCurrentFilter] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [featuredApps, setFeaturedApps] = useState<string[]>([]);
  const [eventApps, setEventApps] = useState<string[]>([]);
  const [currentContentType, setCurrentContentType] = useState<ContentType | null>(null);
  const { t } = useLanguage();
  const { isAuthenticated } = useAdmin();
  const [adminVisible, setAdminVisible] = useState(false);





  // 푸터 링크 클릭 시 번역 피드백 차단 핸들러
  const handleFooterLinkClick = (action?: () => void, event?: React.MouseEvent) => {
    // 이벤트 기본 동작 차단
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    // 번역 피드백 차단
    blockTranslationFeedback();
    
    // 기존 액션 실행 (나중에 실제 링크 기능 추가 시)
    if (action) action();
  };

     // All Apps 버튼 클릭 핸들러
   const handleAllAppsClick = () => {
     setCurrentFilter("all");
     setCurrentContentType(null); // 메모장 모드 종료
     // 페이지 상단으로 스크롤
     window.scrollTo({ top: 0, behavior: 'smooth' });
   };

   // New Releases 버튼 클릭 핸들러
   const handleNewReleasesClick = () => {
     setCurrentFilter("latest");
     setCurrentContentType(null); // 메모장 모드 종료
     // 페이지 상단으로 스크롤
     window.scrollTo({ top: 0, behavior: 'smooth' });
   };

  // Featured Apps 버튼 클릭 핸들러
  const handleFeaturedAppsClick = () => {
    setCurrentFilter("featured");
    setCurrentContentType(null); // 메모장 모드 종료
    // 갤러리로 스크롤
    const galleryElement = document.querySelector('main');
    if (galleryElement) {
      galleryElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Events 버튼 클릭 핸들러
  const handleEventsClick = () => {
    setCurrentFilter("events");
    setCurrentContentType(null); // 메모장 모드 종료
    // 페이지 상단으로 스크롤
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 데이터 리로드 핸들러 (Featured/Events 상태 변경 후 서버에서 최신 데이터 가져오기)
  const handleRefreshData = async () => {
    try {
      // 서버에서 최신 Featured/Events 데이터 가져오기
      const response = await fetch('/api/apps/featured', { 
        method: 'GET',
        cache: 'no-store' // 캐시 무시하고 최신 데이터 요청
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // React 상태 업데이트
          setFeaturedApps(data.featured || []);
          setEventApps(data.events || []);
          
          // localStorage 백업 업데이트
          localStorage.setItem('featured-apps', JSON.stringify(data.featured || []));
          localStorage.setItem('event-apps', JSON.stringify(data.events || []));
          
          console.log('✅ Featured/Events 데이터 리로드 성공:', {
            featured: data.featured,
            events: data.events
          });
        }
      } else {
        console.warn('⚠️ Featured/Events 데이터 리로드 실패:', response.status);
      }
    } catch (error) {
      console.error('❌ Featured/Events 데이터 리로드 오류:', error);
    }
  };

    // Featured 앱 토글 핸들러
  const handleToggleFeatured = async (appId: string) => {
    const isCurrentlyFeatured = featuredApps.includes(appId);
    const action = isCurrentlyFeatured ? 'remove' : 'add';
    
    try {
      // API 호출로 상태 토글
      const success = await toggleFeaturedAppStatus(appId, 'featured', action);
      
      if (success) {
        // 1. 새로운 상태 계산 (명확한 트리거)
        const newFeatured = isCurrentlyFeatured 
          ? featuredApps.filter(id => id !== appId)
          : [...featuredApps, appId];
        
        // 2. React 상태 업데이트
        setFeaturedApps(newFeatured);
        
        // 3. localStorage 백업 저장
        localStorage.setItem('featured-apps', JSON.stringify(newFeatured));
        
        // 4. Vercel Blob에 명시적 동기화 (트리거)
        try {
          console.log('🔄 Featured Blob 동기화 시작:', { newFeatured, eventApps });
          const blobResult = await saveFeaturedAppsToBlob(newFeatured, eventApps);
          if (blobResult) {
            console.log('✅ Featured Blob 동기화 성공:', newFeatured);
          } else {
            console.warn('⚠️ Featured Blob 동기화 실패 (반환값 false)');
          }
        } catch (blobError) {
          console.error('❌ Featured Blob 동기화 오류 (Vercel):', blobError);
        }
      } else {
        // Featured 앱 상태 토글 실패
        console.warn('❌ Featured 토글 API 실패');
      }
    } catch (error) {
      // Featured 앱 상태 토글 중 오류
      console.error('❌ Featured 토글 중 오류:', error);
      // 실패 시 로컬 상태만 업데이트 (사용자 경험 개선)
      const newFeatured = isCurrentlyFeatured 
        ? featuredApps.filter(id => id !== appId)
        : [...featuredApps, appId];
      setFeaturedApps(newFeatured);
      localStorage.setItem('featured-apps', JSON.stringify(newFeatured));
    }
  };

  // Event 앱 토글 핸들러
  const handleToggleEvent = async (appId: string) => {
    const isCurrentlyEvent = eventApps.includes(appId);
    const action = isCurrentlyEvent ? 'remove' : 'add';
    
    try {
      // API 호출로 상태 토글
      const success = await toggleFeaturedAppStatus(appId, 'events', action);
      
      if (success) {
        // 1. 새로운 상태 계산 (명확한 트리거)
        const newEvents = isCurrentlyEvent 
          ? eventApps.filter(id => id !== appId)
          : [...eventApps, appId];
        
        // 2. React 상태 업데이트
        setEventApps(newEvents);
        
        // 3. localStorage 백업 저장
        localStorage.setItem('event-apps', JSON.stringify(newEvents));
        
        // 4. Vercel Blob에 명시적 동기화 (트리거)
        try {
          console.log('🔄 Events Blob 동기화 시작:', { featuredApps, newEvents });
          const blobResult = await saveFeaturedAppsToBlob(featuredApps, newEvents);
          if (blobResult) {
            console.log('✅ Events Blob 동기화 성공:', newEvents);
          } else {
            console.warn('⚠️ Events Blob 동기화 실패 (반환값 false)');
          }
        } catch (blobError) {
          console.error('❌ Events Blob 동기화 오류 (Vercel):', blobError);
        }
                   } else {
        // Event 앱 상태 토글 실패
        console.warn('❌ Events 토글 API 실패');
      }
    } catch (error) {
      // Event 앱 상태 토글 중 오류
      console.error('❌ Events 토글 중 오류:', error);
      // 실패 시 로컬 상태만 업데이트 (사용자 경험 개선)
      const newEvents = isCurrentlyEvent 
        ? eventApps.filter(id => id !== appId)
        : [...eventApps, appId];
      setEventApps(newEvents);
      localStorage.setItem('event-apps', JSON.stringify(newEvents));
    }
  };

  // 푸터 호버 시 번역 피드백 차단 핸들러
  const handleFooterHover = () => {
    blockTranslationFeedback();
  };

     // 앱 필터링 및 정렬 로직
   const getFilteredAndSortedApps = () => {
     let filteredApps = [...apps];

     // 검색어 필터링
     if (searchQuery.trim()) {
       const query = searchQuery.toLowerCase().trim();
       filteredApps = filteredApps.filter(app => 
         app.name.toLowerCase().includes(query) ||
         app.developer.toLowerCase().includes(query) ||
         app.description.toLowerCase().includes(query) ||
         app.category?.toLowerCase().includes(query) ||
         app.tags?.some(tag => tag.toLowerCase().includes(query))
       );
     }

           // 필터 타입별 정렬
      switch (currentFilter) {
        case "latest":
          const latestApps = filteredApps
            .filter(app => app.status === "published")
            .sort((a, b) => 
              new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime()
            );
          return latestApps.slice(0, 1); // 가장 최근 published 앱 1개만 반환
        case "featured":
          return filteredApps
            .filter(app => featuredApps.includes(app.id))
            .sort((a, b) => a.name.localeCompare(b.name));
        case "events":
          return filteredApps
            .filter(app => eventApps.includes(app.id))
            .sort((a, b) => a.name.localeCompare(b.name));
        case "all":
        default:
          return filteredApps.sort((a, b) => a.name.localeCompare(b.name));
      }
   };

   // New Release 앱을 가져오는 별도 함수
   const getLatestApp = () => {
     const latestApps = apps
       .filter(app => app.status === "published")
       .sort((a, b) => 
         new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime()
       );
     return latestApps[0]; // 가장 최근 published 앱 1개만 반환
   };

  const handleAppUpload = async (data: AppFormData, files: { icon: File; screenshots: File[] }) => {
    try {
      // 아이콘/스크린샷 파일 업로드 (Vercel Blob 우선)
      const iconUrl = await uploadFile(files.icon, "icon");
      const screenshotUrls = await Promise.all(
        files.screenshots.map(file => uploadFile(file, "screenshot"))
      );

      // 새 앱 아이템 생성
      const newApp: AppItem = {
        id: generateUniqueId(),
        name: data.name,
        developer: data.developer,
        description: data.description,
        iconUrl,
        screenshotUrls,
        store: data.store,
        status: data.status,
        rating: data.rating,
        downloads: data.downloads,
        views: 0,
        likes: 0,
        uploadDate: new Date().toISOString().split('T')[0],
        tags: data.tags ? data.tags.split(',').map(tag => tag.trim()).filter(Boolean) : [],
        storeUrl: data.storeUrl || undefined,
        version: data.version,
        size: data.size,
        category: data.category,
        type: 'gallery', // 갤러리 앱 타입 명시
      };

      // 앱 목록에 추가
      const updatedApps = [newApp, ...apps];
      setApps(updatedApps);
      
      // 메모장 방식: 타입별 분리된 Blob Storage에 저장
      try {
        await saveAppsByTypeToBlob('gallery', updatedApps);
        
        // 저장 후 즉시 Blob에서 다시 로드 (메모장 방식)
        const refreshedApps = await loadAppsByTypeFromBlob('gallery');
        if (refreshedApps.length > 0) {
          setApps(refreshedApps);
          localStorage.setItem('gallery-apps', JSON.stringify(refreshedApps));
        }
      } catch {}
      
      // 캐시용 localStorage 업데이트
      localStorage.setItem('gallery-apps', JSON.stringify(updatedApps));
      
      // 앱 업로드 및 저장 완료
      alert("✅ App uploaded successfully!");
      
      // 갤러리 강제 새로고침 (리프레시 없이도 최신 데이터 표시)
      await forceRefreshGallery();
      
    } catch {
      alert("❌ App upload failed. Please try again.");
    }
  };

     const handleDeleteApp = async (id: string) => {
     try {
       // 1. 삭제할 앱 정보 찾기 (원본 배열에서 찾기)
       const appToDelete = apps.find(app => app.id === id);
       if (!appToDelete) {
         return;
       }

       // 2. 새로운 앱 목록 계산 (원본 배열 기반)
       const newApps = apps.filter(app => app.id !== id);
       
       // 3. Featured/Events 앱에서도 제거 (원본 배열 기반)
       const newFeaturedApps = featuredApps.filter(appId => appId !== id);
       const newEventApps = eventApps.filter(appId => appId !== id);
       
       // 4. React 상태 업데이트 (순서 중요!)
       setApps(newApps);  // 먼저 앱 목록 업데이트
       setFeaturedApps(newFeaturedApps);  // 그 다음 Featured 업데이트
       setEventApps(newEventApps);  // 마지막 Events 업데이트

       // 4. localStorage 업데이트 (순서 중요!)
       localStorage.setItem('gallery-apps', JSON.stringify(newApps));
       localStorage.setItem('featured-apps', JSON.stringify(newFeaturedApps));
       localStorage.setItem('event-apps', JSON.stringify(newEventApps));

       // 5. 스토리지에서 실제 파일들 삭제 (Vercel Blob/로컬 자동 판단)
       if (appToDelete.iconUrl) {
         try {
           await deleteFile(appToDelete.iconUrl);
         } catch (error) {
           // 아이콘 파일 삭제 실패 무시
         }
       }
       
       if (appToDelete.screenshotUrls && appToDelete.screenshotUrls.length > 0) {
         try {
           await Promise.all(appToDelete.screenshotUrls.map(url => deleteFile(url)));
         } catch (error) {
           // 스크린샷 파일들 삭제 실패 무시
         }
       }

                // 6. 메모장 방식: 타입별 분리된 Blob Storage에 저장
         let blobSyncSuccess = false;
         try {
           const blobResult = await saveAppsByTypeToBlob('gallery', newApps);
           blobSyncSuccess = blobResult;
           
           // 저장 후 즉시 Blob에서 다시 로드 (메모장 방식)
           if (blobResult) {
             const refreshedApps = await loadAppsByTypeFromBlob('gallery');
             if (refreshedApps.length === 0) {
               // 삭제가 반영된 경우
               setApps([]);
               localStorage.setItem('gallery-apps', JSON.stringify([]));
             }
           }
         } catch (error) {
           // Blob 동기화 실패 무시
         }

       // 7. Featured/Events Blob 동기화
       try {
         await saveFeaturedAppsToBlob(newFeaturedApps, newEventApps);
       } catch (error) {
         // Featured/Events Blob 동기화 실패 무시
       }

              // 8. 삭제 완료 확인
        if (blobSyncSuccess) {
          // Blob 동기화 후 잠시 기다린 후 다시 로드 (동기화 지연 해결)
          setTimeout(async () => {
            try {
              const updatedBlobApps = await loadAppsFromBlob();
              
              if (updatedBlobApps && updatedBlobApps.length === 0) {
                // Blob 동기화 완료
              } else {
                // Blob 동기화 지연, 강제로 빈 배열 설정
                setApps([]);
                localStorage.setItem('gallery-apps', JSON.stringify([]));
              }
            } catch (error) {
              // Blob 재확인 실패 무시
            }
          }, 1000); // 1초 대기
        }
       
     } catch (error) {
       // 실패시 UI 상태 복원
       const savedAppsStr = localStorage.getItem('gallery-apps');
       if (savedAppsStr) {
         try {
           const parsedApps = JSON.parse(savedAppsStr);
           setApps(parsedApps);
         } catch (parseError) {
           // localStorage 파싱 실패 무시
         }
       }

             alert('An error occurred while deleting the app. Please try again.');
    }
  };

  const handleEditApp = (app: AppItem) => {
    setEditingApp(app);
  };

    // 앱 목록 로드 및 동기화 (메모장 방식으로 수정)
  useEffect(() => {
    const loadApps = async () => {
      try {
        console.log('🔄 앱 로드 시작...');
        
        // 메모장과 동일하게 타입별 분리된 Blob Storage에서 로드 시도
        const typeApps = await loadAppsByTypeFromBlob('gallery');
        console.log('📦 Blob에서 타입별 앱 로드 결과:', typeApps.length, '개');
        
        if (typeApps.length > 0) {
          console.log('✅ Blob에서 앱 데이터 로드 성공');
          // 관리자일 경우 전체 앱, 일반 사용자는 모든 앱 표시 (AppItem에는 isPublished 속성이 없음)
          const validatedApps = await validateAppsImages(typeApps);
          console.log('🔍 이미지 검증 후 앱:', validatedApps.length, '개');
          // 기존 앱들에 type 속성 추가
          const appsWithType = validatedApps.map(app => ({ ...app, type: 'gallery' as const }));
          setApps(appsWithType);
          localStorage.setItem('gallery-apps', JSON.stringify(appsWithType));
          console.log('💾 Blob 데이터를 localStorage에 저장 완료');
        } else {
          console.log('⚠️ Blob에 타입별 데이터 없음, 기존 API 시도...');
          // 타입별 분리 API에 데이터가 없으면 기존 API 사용
          const blobApps = await loadAppsFromBlob();
          console.log('📦 기존 Blob API 결과:', blobApps?.length || 0, '개');
          
          if (blobApps && blobApps.length > 0) {
            console.log('✅ 기존 Blob API에서 데이터 로드 성공');
            const validatedApps = await validateAppsImages(blobApps);
            // 기존 앱들에 type 속성 추가
            const appsWithType = validatedApps.map(app => ({ ...app, type: 'gallery' as const }));
            setApps(appsWithType);
            localStorage.setItem('gallery-apps', JSON.stringify(appsWithType));
          } else {
            console.log('⚠️ Blob에도 데이터 없음, localStorage 캐시 시도...');
            // localStorage 캐시 시도
            const savedApps = localStorage.getItem('gallery-apps');
            if (savedApps) {
              console.log('📱 localStorage에서 캐시된 앱 로드:', savedApps.length, '개');
              const parsedApps = JSON.parse(savedApps) as AppItem[];
              const validatedApps = await validateAppsImages(parsedApps);
              // 기존 앱들에 type 속성 추가
              const appsWithType = validatedApps.map(app => ({ ...app, type: 'gallery' as const }));
              setApps(appsWithType);
              console.log('✅ localStorage 캐시에서 앱 로드 완료');
            } else {
              console.log('❌ localStorage에도 데이터 없음, 빈 배열 설정');
              setApps([]);
              localStorage.setItem('gallery-apps', JSON.stringify([]));
            }
          }
        }

        // Featured Apps 로드 (Blob 우선, localStorage 폴백)
        try {
          const blobFeatured = await loadFeaturedAppsFromBlob();
          if (blobFeatured.featured.length > 0 || blobFeatured.events.length > 0) {
            setFeaturedApps(blobFeatured.featured);
            setEventApps(blobFeatured.events);
            // Blob에서 Featured/Events 앱 로드됨
          } else {
            // Blob에 데이터가 없으면 localStorage 폴백
            const savedFeaturedApps = localStorage.getItem('featured-apps');
            if (savedFeaturedApps) {
              const parsedFeaturedApps = JSON.parse(savedFeaturedApps);
              setFeaturedApps(parsedFeaturedApps);
            }
            
            const savedEventApps = localStorage.getItem('event-apps');
            if (savedEventApps) {
              const parsedEventApps = JSON.parse(savedEventApps);
              setEventApps(parsedEventApps);
            }
          }
        } catch (error) {
          // localStorage 폴백
          const savedFeaturedApps = localStorage.getItem('featured-apps');
          if (savedFeaturedApps) {
            const parsedFeaturedApps = JSON.parse(savedFeaturedApps);
            setFeaturedApps(parsedFeaturedApps);
          }
          
          const savedEventApps = localStorage.getItem('event-apps');
          if (savedEventApps) {
            const parsedEventApps = JSON.parse(savedEventApps);
            setEventApps(parsedEventApps);
          }
        }
        
        console.log('🎯 최종 앱 상태:', apps.length, '개');
      } catch (error) {
        console.error('❌ 앱 로드 실패:', error);
        // 앱 로드 실패
        // 실패시 샘플 데이터 사용
        setApps(sampleApps);
      }
    };

    loadApps();
  }, [isAuthenticated]); // 관리자 인증 상태 변경 시 재로드

  // 강제 데이터 새로고침 함수
  const forceRefreshGallery = async () => {
    try {
      // Blob에서 최신 데이터 강제 로드
      const typeApps = await loadAppsByTypeFromBlob('gallery');
      if (typeApps.length > 0) {
        const validatedApps = await validateAppsImages(typeApps);
        const appsWithType = validatedApps.map(app => ({ ...app, type: 'gallery' as const }));
        setApps(appsWithType);
        localStorage.setItem('gallery-apps', JSON.stringify(appsWithType));
      }
    } catch (error) {
      // 새로고침 실패 시 기존 데이터 유지
    }
  };

  const handleUpdateApp = async (appId: string, data: AppFormData, files?: { icon?: File; screenshots?: File[] }) => {
    try {
      const appIndex = apps.findIndex(app => app.id === appId);
      if (appIndex === -1) return;

      const updatedApp = { ...apps[appIndex] };

      // 기본 정보 업데이트
      updatedApp.name = data.name;
      updatedApp.developer = data.developer;
      updatedApp.description = data.description;
      updatedApp.store = data.store;
      updatedApp.status = data.status;
      updatedApp.rating = data.rating;
      updatedApp.downloads = data.downloads;
      updatedApp.version = data.version;
      updatedApp.size = data.size;
      updatedApp.category = data.category;
      updatedApp.storeUrl = data.storeUrl || undefined;
      updatedApp.tags = data.tags ? data.tags.split(',').map(tag => tag.trim()).filter(Boolean) : [];

      // 새 아이콘이 있으면 업데이트
      if (files?.icon) {
        updatedApp.iconUrl = await saveFileToLocal(files.icon, "icon");
      }

      // 새 스크린샷이 있으면 업데이트
      if (files?.screenshots && files.screenshots.length > 0) {
        const newScreenshotUrls = await Promise.all(
          files.screenshots.map(file => saveFileToLocal(file, "screenshot"))
        );
        updatedApp.screenshotUrls = newScreenshotUrls;
      }

      // 앱 목록 업데이트
      const newApps = [...apps];
      newApps[appIndex] = updatedApp;
      setApps(newApps);

      // localStorage에 저장
      localStorage.setItem('gallery-apps', JSON.stringify(newApps));

                           // 메모장 방식: 타입별 분리된 Blob Storage에 저장
        try {
          await saveAppsByTypeToBlob('gallery', newApps);
          
          // 저장 후 즉시 Blob에서 다시 로드 (메모장 방식)
          const refreshedApps = await loadAppsByTypeFromBlob('gallery');
          if (refreshedApps.length > 0) {
            setApps(refreshedApps);
            localStorage.setItem('gallery-apps', JSON.stringify(refreshedApps));
          }
        } catch (error) {
          alert("⚠️ App updated but cloud synchronization failed.");
        }

             setEditingApp(null);
       // 앱 업데이트 및 저장 완료
       alert("✅ App updated successfully!");
     } catch {
       
       alert("❌ App update failed. Please try again.");
    }
  };

  const handleCopyrightClick = () => {
    // 다이얼로그 열기 전에 더 긴 지연을 두어 DOM 안정화
    setTimeout(() => {
      setIsAdminDialogOpen(true);
    }, 100);
  };

  // App Story 클릭 핸들러
  const handleAppStoryClick = () => {
            setCurrentContentType("appstory");
    setCurrentFilter("all"); // 갤러리 필터 초기화
    // 메모장 본문 위치로 스크롤
    setTimeout(() => {
      const contentManager = document.querySelector('[data-content-manager]');
      if (contentManager) {
        contentManager.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  // 전역 admin mode 트리거 등록 (AdminUploadDialog 및 HiddenAdminAccess에서 호출)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Initialize handler and seed adminVisible from session storage only
    const initial = (() => {
      try {
        const sessionActive = sessionStorage.getItem('admin-session-active') === '1';
        const isAuth = isAuthenticated;
        return sessionActive && isAuth;
      } catch {
        return false;
      }
    })();
    
    setAdminVisible(Boolean(initial));

    window.adminModeChange = (visible: boolean) => {
      setAdminVisible(Boolean(visible));
    };

    return () => {
      try {
        // cleanup
        delete window.adminModeChange;
      } catch {
        // ignore
      }
    };
  }, [isAuthenticated, adminVisible]);

  // News 클릭 핸들러
  const handleNewsClick = () => {
    setCurrentContentType("news");
    setCurrentFilter("all"); // 갤러리 필터 초기화
    // 메모장 본문 위치로 스크롤
    setTimeout(() => {
      const contentManager = document.querySelector('[data-content-manager]');
      if (contentManager) {
        contentManager.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };



  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* 눈 내리는 애니메이션 */}
      <SnowAnimation />
      
      <Header 
        viewMode={viewMode} 
        onViewModeChange={setViewMode} 
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />
      
                           <main className="container mx-auto py-6 max-w-6xl" style={{ maxWidth: '1152px' }}>
         <div className="mb-6 text-center">
           <h1 className="relative inline-block text-4xl font-extrabold tracking-tight text-transparent bg-clip-text shine-text mb-1">
             <span className="notranslate" translate="no">GPT X GONGMYUNG.COM</span>
             <span className="shine-sparkle">
               <span className="shine-dots"></span>
               <span className="shine-dots"></span>
               <span className="shine-dots"></span>
               <span className="shine-dots"></span>
               <span className="shine-dots"></span>
               <span className="shine-dots"></span>
               <span className="shine-dots"></span>
               <span className="shine-dots"></span>
             </span>
           </h1>
           <h2 className="text-2xl font-semibold text-amber-200 tracking-wide opacity-90 mb-3">
             <span className="notranslate" translate="no">PRESENT</span>
           </h2>
           
           {/* 추가 번역 위젯 위치 옵션 - 타이틀 아래 */}
           {/* <div id="google_translate_element_main" className="mb-4"></div> */}
           
           <p className="text-gray-300">
             {t("footerDescription")}
           </p>
         </div>

                            {/* New Releases 특별 섹션 */}
         {currentFilter === "latest" && (() => {
           const latestApp = getLatestApp();
           if (!latestApp) return null;
            
            return (
            <div className="mb-12">
                             <div className="text-center mb-8">
                 <h3 className="text-3xl font-bold text-amber-400 mb-2 notranslate" translate="no">NEW RELEASE</h3>
                 <p className="text-gray-400">Just launched - Check it out!</p>
               </div>
              
                             <div className="flex justify-center px-4 max-w-4xl mx-auto">
                 <div className="relative group w-full max-w-sm">
                   {/* 화려한 테두리 효과 */}
                   <div className="absolute -inset-1 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 rounded-2xl blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-pulse"></div>
                   <div className="absolute -inset-1 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 rounded-2xl blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-pulse" style={{animationDelay: '0.5s'}}></div>
                   
                   {/* 메인 카드 - 기존 갤러리 카드와 완전히 동일한 반응형 사이즈 */}
                   <div className="relative group overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1 new-release-card w-full" style={{ backgroundColor: '#D1E2EA' }}>
                     <div className="relative">
                                               {/* Screenshot/App Preview */}
                        <div className="aspect-[9/16] sm:aspect-square overflow-hidden bg-gradient-to-br from-blue-50 to-purple-50 relative">
                          {latestApp.screenshotUrls && latestApp.screenshotUrls.length > 0 ? (
                                                         <Image
                               src={latestApp.screenshotUrls[0]}
                               alt={latestApp.name}
                               fill
                               unoptimized={isBlobUrl(latestApp.screenshotUrls[0])}
                               className="object-cover object-center transition-transform duration-300 group-hover:scale-105"
                             />
                          ) : (
                            <div className="absolute inset-0 w-full h-full flex items-center justify-center text-6xl">
                              📱
                            </div>
                          )}
                        </div>

                       {/* Store Badge */}
                       <div className="absolute bottom-2 left-2">
                         <span className="bg-green-500 text-white text-xs px-2 py-1 rounded">
                           {t(latestApp.status as keyof typeof t)}
                         </span>
                       </div>
                     </div>

                     <div className="p-3" style={{ backgroundColor: '#D1E2EA' }}>
                       {/* App Icon and Basic Info */}
                       <div className="flex items-start space-x-3 mb-2">
                                                   <Image
                            src={latestApp.iconUrl}
                            alt={latestApp.name}
                            width={48}
                            height={48}
                            unoptimized={isBlobUrl(latestApp.iconUrl)}
                            className="w-12 h-12 rounded-xl object-cover object-center flex-shrink-0"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiBmaWxsPSIjZjNmNGY2Ii8+CjxwYXRoIGQ9Ik0xMiA2QzEwLjM0IDYgOSA3LjM0IDkgOUM5IDEwLjY2IDEwLjM0IDEyIDEyIDEyQzEzLjY2IDEyIDE1IDEwLjY2IDE1IDlDMTUgNy4zNCAxMy42NiA2IDEyIDZaTTEyIDRDMTQuNzYgNCAxNyA2LjI0IDE3IDlDMTcgMTEuNzYgMTQuNzYgMTQgMTIgMTRDOS4yNCAxNCA3IDExLjc2IDcgOUM3IDYuMjQgOS4yNCA0IDEyIDRaTTEyIDE2QzEwLjM0IDE2IDkgMTcuMzQgOSAxOUg3QzcgMTYuMjQgOS4yNCAxNCAxMiAxNEMxNC43NiAxNCAxNyAxNi4yNCAxNyAxOUgxNUMxNSAxNy4zNCAxMy42NiAxNiAxMiAxNloiIGZpbGw9IiM5Y2EzYWYiLz4KPC9zdmc+";
                            }}
                          />
                         <div className="flex-1 min-w-0">
                           <h3 className="font-medium text-sm mb-1 truncate notranslate" translate="no">{latestApp.name}</h3>
                           <p className="text-xs text-muted-foreground truncate notranslate" translate="no">{latestApp.developer}</p>
                         </div>
                       </div>

                       {/* Rating and Stats */}
                       <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                         <div className="flex items-center space-x-2">
                           <div className="flex items-center gap-1">
                             <span className="text-yellow-400">★</span>
                             <span>{latestApp.rating}</span>
                           </div>
                           <span>{latestApp.downloads}</span>
                         </div>
                         <span>{latestApp.version}</span>
                       </div>

                       {/* Tags */}
                       {latestApp.tags && latestApp.tags.length > 0 && (
                         <div className="flex flex-wrap gap-1 mb-2">
                           {latestApp.tags.slice(0, 2).map((tag, index) => (
                             <span key={index} className="text-xs px-2 py-0 bg-gray-200 text-gray-700 rounded">
                               {tag}
                             </span>
                           ))}
                           {latestApp.tags.length > 2 && (
                             <span className="text-xs text-muted-foreground">
                               +{latestApp.tags.length - 2}
                             </span>
                           )}
                         </div>
                       )}

                       {/* Download Section */}
                       <div className="mt-0 border-t border-gray-300" style={{ backgroundColor: '#84CC9A' }}>
                         <div className="flex items-center justify-between p-3 w-full">
                           <button
                             className="h-7 px-3 text-xs bg-green-700 hover:bg-green-800 text-white flex items-center gap-1 rounded"
                             onClick={() => {
                               if (latestApp.storeUrl) {
                                 window.open(latestApp.storeUrl, '_blank');
                               }
                             }}
                             disabled={!latestApp.storeUrl}
                           >
                             <span>⬇️</span>
                             <span className="notranslate" translate="no">Download</span>
                           </button>
                           
                           {/* 스토어 배지 이미지 */}
                           <div className="h-7 flex items-center">
                             {latestApp.store === "google-play" ? (
                               <Image 
                                   src="/google-play-badge.png" 
                                   alt="Google Play에서 다운로드"
                                   width={120}
                                   height={28}
                                   unoptimized={isBlobUrl('/google-play-badge.png')}
                                   className="h-7 object-contain"
                                 />
                             ) : (
                               <Image 
                                 src="/app-store-badge.png" 
                                 alt="App Store에서 다운로드"
                                 width={120}
                                 height={28}
                                 unoptimized={isBlobUrl('/app-store-badge.png')}
                                 className="h-7 object-contain"
                               />
                             )}
                           </div>
                         </div>
                       </div>
                     </div>
                   </div>
                 </div>
               </div>
             </div>
           );
         })()}

                   {/* 콘텐츠 타입에 따른 조건부 렌더링 */}
                   {currentContentType ? (
                     // App Story 또는 News 모드
                     <div className="space-y-6" data-content-manager>
                       {currentContentType === "appstory" ? (
                         // App Story는 새로운 리스트 뷰 사용
                         <AppStoryList
                           type={currentContentType}
                           onBack={() => setCurrentContentType(null)}
                         />
                       ) : (
                         // News도 새로운 리스트 뷰 사용
                         <NewsList
                           type={currentContentType}
                           onBack={() => setCurrentContentType(null)}
                         />
                       )}
                     </div>
                   ) : (
                     // 일반 갤러리 모드
                     <>
                       {/* 일반 갤러리 - New Release 모드에서는 숨김 */}
                       {currentFilter !== "latest" && (
                         <>
                           <AppGallery 
                             apps={getFilteredAndSortedApps()} 
                             viewMode={viewMode} 
                             onDeleteApp={handleDeleteApp}
                             onEditApp={handleEditApp}
                             onToggleFeatured={handleToggleFeatured}
                             onToggleEvent={handleToggleEvent}
                             featuredApps={featuredApps}
                             eventApps={eventApps}
                             showNumbering={currentFilter === "events"}
                             onRefreshData={handleRefreshData}
                           />
                           
                           {/* Events 모드일 때 설명문구와 메일폼 추가 */}
                           {currentFilter === "events" && (
                             <div className="mt-12 text-center max-w-4xl mx-auto">
                               <div className="max-w-2xl mx-auto">
                                 <div className="max-w-md mx-auto">
                                   <MailForm
                                     type="events"
                                     buttonText="🎉 Events 📧 Touch Here 🎉"
                                     buttonDescription="Choose one of the apps above as your free gift. The gift will be delivered to your email. By accepting, you agree to receive occasional news and offers from us via that email address."
                                     onMouseEnter={handleFooterHover}
                                   />
                                 </div>
                               </div>
                             </div>
                           )}
                         </>
                       )}
                     </>
                   )}
       </main>

                    {/* 푸터 */}
        <footer className="border-t py-8 mt-16 bg-black" onMouseEnter={blockTranslationFeedback}>
                     <div className="container mx-auto text-center max-w-6xl" style={{ maxWidth: '1152px' }}>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                                                                                                                                                                                                                               <div>
                                                                                                                                                <h4 className="font-medium mb-3 text-amber-400 text-base notranslate" translate="no" style={{translate: 'no'}}>Exhibition</h4>
                   <div className="space-y-3">
                                                                                          <button 
                          onClick={(e) => handleFooterLinkClick(handleAllAppsClick, e)} 
                          onMouseEnter={blockTranslationFeedback}
                          className="w-full border border-white rounded-lg p-4 text-left hover:border-amber-400 hover:bg-gray-800/50 transition-all duration-300 group"
                        >
                         <div className="text-base font-medium group-hover:text-amber-400 transition-colors">All Apps</div>
                         <div className="text-xs text-gray-400 mt-1 group-hover:text-gray-300 transition-colors">See everything we&apos;ve made</div>
                       </button>
                                               <button 
                          onClick={(e) => handleFooterLinkClick(handleNewReleasesClick, e)} 
                          onMouseEnter={blockTranslationFeedback}
                          className="w-full border border-white rounded-lg p-4 text-left hover:border-amber-400 hover:bg-gray-800/50 transition-all duration-300 group"
                        >
                         <div className="text-base font-medium group-hover:text-amber-400 transition-colors">New Releases</div>
                         <div className="text-xs text-gray-400 mt-1 group-hover:text-gray-300 transition-colors">Just launched</div>
                       </button>
                                               <button 
                          onClick={(e) => handleFooterLinkClick(handleFeaturedAppsClick, e)} 
                          onMouseEnter={blockTranslationFeedback}
                          className="w-full border border-white rounded-lg p-4 text-left hover:border-amber-400 hover:bg-gray-800/50 transition-all duration-300 group"
                        >
                         <div className="text-base font-medium group-hover:text-amber-400 transition-colors">Featured Apps</div>
                         <div className="text-xs text-gray-400 mt-1 group-hover:text-gray-300 transition-colors">Recommended picks</div>
                       </button>
                                                                                              <button 
                           onClick={(e) => handleFooterLinkClick(handleEventsClick, e)} 
                           onMouseEnter={blockTranslationFeedback}
                           className="w-full border border-white rounded-lg p-4 text-left hover:border-amber-400 hover:bg-gray-800/50 transition-all duration-300 group"
                         >
                          <div className="text-base font-medium group-hover:text-amber-400 transition-colors">Events</div>
                          <div className="text-xs text-gray-400 mt-1 group-hover:text-gray-300 transition-colors">Discounts via email</div>
                        </button>
                   </div>
                </div>

                                                                            <div>
                                                                                                                                                                       <h4 className="font-medium mb-3 text-amber-400 text-base notranslate" translate="no" style={{translate: 'no'}}>For You</h4>
                   <div className="space-y-3">
                                                                                                                   <button 
                           onClick={(e) => handleFooterLinkClick(handleAppStoryClick, e)} 
                           onMouseEnter={blockTranslationFeedback}
                           className="w-full border border-white rounded-lg p-4 text-left hover:border-amber-400 hover:bg-gray-800/50 transition-all duration-300 group"
                         >
                          <div className="text-base font-medium group-hover:text-amber-400 transition-colors">App Story</div>
                          <div className="text-xs text-gray-400 mt-1 group-hover:text-gray-300 transition-colors">How it was made</div>
                        </button>
                                               <button 
                          onClick={(e) => handleFooterLinkClick(handleNewsClick, e)} 
                          onMouseEnter={blockTranslationFeedback}
                          className="w-full border border-white rounded-lg p-4 text-left hover:border-amber-400 hover:bg-gray-800/50 transition-all duration-300 group"
                        >
                         <div className="text-base font-medium group-hover:text-amber-400 transition-colors">News</div>
                         <div className="text-xs text-gray-400 mt-1 group-hover:text-gray-300 transition-colors">Latest updates</div>
                       </button>
                                             <MailForm
                         type="feedback"
                         buttonText="Feedback"
                         buttonDescription="Your thoughts matter"
                         onMouseEnter={blockTranslationFeedback}
                       />
                                                                                           <MailForm
                          type="contact"
                          buttonText="Contact Us"
                          buttonDescription="Help & answers"
                          onMouseEnter={blockTranslationFeedback}
                        />
                   </div>
               </div>
                     </div>
           
                       {/* 중앙 이미지 */}
            <div className="flex items-center justify-center py-8">
              <Image 
                src="/monk_cr.png" 
                alt="Monk Character"
                width={256}
                height={256}
                className="h-64 w-auto object-contain"
              />
            </div>
           
           <div className="border-t border-gray-600 pt-6 mt-6 text-center">
            <span 
              onClick={createAdminButtonHandler(handleCopyrightClick)}
              className="cursor-pointer hover:text-gray-300 transition-colors text-sm text-white"
              title="관리자 모드"
            >
              <span className="notranslate" translate="no">© 2025 gongmyung.com. All rights reserved.</span>
            </span>
            
                         {/* 관리자 모드일 때만 표시되는 업로드 버튼 */}
              {isAuthenticated && adminVisible && (
               <div className="mt-4 flex justify-center">
                 <AdminUploadDialog 
                   onUpload={handleAppUpload}
                   buttonProps={{
                     size: "lg",
                     className: "bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg font-medium rounded-lg shadow-lg transition-all duration-200 hover:scale-105"
                   }}
                   buttonText="📱 새 앱 업로드"
                 />
               </div>
             )}
             
             
          </div>
        </div>
      </footer>

      {/* 숨겨진 관리자 접근 다이얼로그 */}
      <HiddenAdminAccess 
        isOpen={isAdminDialogOpen}
        onClose={() => {
          // 다이얼로그 닫기 전에 더 긴 지연을 두어 DOM 안정화
          setTimeout(() => {
            setIsAdminDialogOpen(false);
          }, 150);
        }}
      />

      {/* 앱 편집 다이얼로그 */}
      <EditAppDialog
        app={editingApp}
        isOpen={!!editingApp}
        onClose={() => setEditingApp(null)}
        onUpdate={handleUpdateApp}
      />


    </div>
  );
}