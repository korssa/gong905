"use client";

import { useState, useEffect, useMemo, useRef } from "react";

declare global {
  interface Window {
    adminModeChange?: (visible: boolean) => void;
  }
}
import { Header } from "@/components/layout/header";
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
import { generateUniqueId } from "@/lib/file-utils";
import { validateAppsImages } from "@/lib/image-utils";
import { uploadFile, deleteFile } from "@/lib/storage-adapter";
import { loadAppsFromBlob, loadAppsByTypeFromBlob, saveAppsByTypeToBlob, loadFeaturedIds, loadEventIds, saveFeaturedIds, saveEventIds } from "@/lib/data-loader";
import { blockTranslationFeedback, createAdminButtonHandler, startBlockingTranslationFeedback } from "@/lib/translation-utils";
import { AppGallery } from "@/components/app-gallery";
import Image from "next/image";

const isBlobUrl = (url?: string) => {
  return !!url && (url.includes('vercel-storage.com') || url.includes('blob.vercel-storage.com'));
};

// ID ��Ʈ�� ���� ���͸��ϴ� ��ƿ �Լ� (���� ������� ����)
// const pickByIds = (apps: AppItem[], ids: string[]) => {
//   const set = new Set(ids);
//   return apps.filter(a => set.has(a.id));
// };

// Featured/Events �÷��׸� �ۿ� �����ϴ� ��ƿ �Լ�
const applyFeaturedFlags = (apps: AppItem[], featuredIds: string[], eventIds: string[]) => {
  const f = new Set(featuredIds);
  const e = new Set(eventIds);
  return apps.map(a => ({ ...a, isFeatured: f.has(a.id), isEvent: e.has(a.id) }));
};

// �� �� ������ (���� �� ���ŵ�)
const sampleApps: AppItem[] = [];

export default function Home() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isAdminDialogOpen, setIsAdminDialogOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<AppItem | null>(null);
  const [currentFilter, setCurrentFilter] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentContentType, setCurrentContentType] = useState<ContentType | null>(null);
  const { t } = useLanguage();
  const { isAuthenticated: isAdmin } = useAdmin();
  const [adminVisible, setAdminVisible] = useState(false);

  // ���� ����� ���
  // ���� ���·� �� ������ ���� (Zustand ����)
  const [allApps, setAllApps] = useState<AppItem[]>([]);
  const [featuredIds, setFeaturedIds] = useState<string[]>([]);
  const [eventIds, setEventIds] = useState<string[]>([]);

  // ���� ��� �Լ���
  const toggleFeatured = (appId: string) => {
    setFeaturedIds(prev => 
      prev.includes(appId) 
        ? prev.filter(id => id !== appId)
        : [...prev, appId]
    );
  };

  const toggleEvent = (appId: string) => {
    setEventIds(prev => 
      prev.includes(appId) 
        ? prev.filter(id => id !== appId)
        : [...prev, appId]
    );
  };

  // Request ID for preventing race conditions
  const reqIdRef = useRef(0);
  const loadedRef = useRef(false);

  // Derived state - filtered apps based on current filter
  const filteredApps = useMemo(() => {
    let filtered = [...allApps];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(app => 
        app.name.toLowerCase().includes(query) ||
        app.description.toLowerCase().includes(query) ||
        app.developer.toLowerCase().includes(query)
      );
    }

    // Type filter using global store
    switch (currentFilter) {
      case "latest": {
        const latestApps = filtered
          .filter(app => app.status === "published")
          .sort((a, b) => 
            new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime()
          );
        return latestApps.slice(0, 1); // ���� �ֱ� published �� 1���� ��ȯ
      }
      case "featured":
        return allApps.filter(app => featuredIds.includes(app.id)).sort((a, b) => a.name.localeCompare(b.name));
      case "events":
        return allApps.filter(app => eventIds.includes(app.id)).sort((a, b) => a.name.localeCompare(b.name));
      case "normal":
        // �Ϲ� ī�常 ǥ�� (featured/events�� ���Ե��� ���� �۵�)
        return allApps.filter(app => !featuredIds.includes(app.id) && !eventIds.includes(app.id)).sort((a, b) => a.name.localeCompare(b.name));
      case "all":
      default:
        return allApps.sort((a, b) => a.name.localeCompare(b.name));
    }
  }, [allApps, currentFilter, searchQuery, featuredIds, eventIds]);





  // Ǫ�� ��ũ Ŭ�� �� ���� �ǵ�� ���� �ڵ鷯
  const handleFooterLinkClick = (action?: () => void, event?: React.MouseEvent) => {
    // �̺�Ʈ �⺻ ���� ����
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    // ���� �ǵ�� ����
    blockTranslationFeedback();
    
    // ���� �׼� ���� (���߿� ���� ��ũ ��� �߰� ��)
    if (action) action();
  };

     // All Apps ��ư Ŭ�� �ڵ鷯
   const handleAllAppsClick = () => {
     setCurrentFilter("all");
     setCurrentContentType(null); // �޸��� ��� ����
     // ������ ������� ��ũ��
     window.scrollTo({ top: 0, behavior: 'smooth' });
   };

   // New Releases ��ư Ŭ�� �ڵ鷯
   const handleNewReleasesClick = () => {
     setCurrentFilter("latest");
     setCurrentContentType(null); // �޸��� ��� ����
     // ������ ������� ��ũ��
     window.scrollTo({ top: 0, behavior: 'smooth' });
   };

  // Featured Apps ��ư Ŭ�� �ڵ鷯
  const handleFeaturedAppsClick = () => {
    setCurrentFilter("featured");
    setCurrentContentType(null);
    document.querySelector('main')?.scrollIntoView({ behavior: 'smooth' });
  };

  // Events ��ư Ŭ�� �ڵ鷯
  const handleEventsClick = () => {
    setCurrentFilter("events");
    setCurrentContentType(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // �Ϲ� ī�� ���� �ڵ鷯 (���� ����)
  const handleNormalClick = () => {
    setCurrentFilter("normal");
    setCurrentContentType(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ���� ���� �ڵ鷯 (������ ����)
  const handleManualSave = async () => {
    try {
      
      
      // Featured/Events ���¸� ����ҿ� ����
      const [featuredResult, eventsResult] = await Promise.all([
        saveFeaturedIds(featuredIds),
        saveEventIds(eventIds)
      ]);
      
      if (featuredResult.success && eventsResult.success) {
        alert('? Featured/Events ���°� ����Ǿ����ϴ�!');
      } else {
        alert('?? ���� �� �Ϻ� ������ �߻��߽��ϴ�.');
      }
    } catch (error) {
      alert('? ���� �� ������ �߻��߽��ϴ�.');
    }
  };

  // ������ ���ε� �ڵ鷯 (Featured/Events ���� ���� �� �������� �ֽ� ������ ��������)
  const handleRefreshData = async () => {
    try {
      
      // 1. �������� �ֽ� �� ������ �ε�
      const typeApps = await loadAppsByTypeFromBlob('gallery');
      
      if (typeApps.length > 0) {
        // 2. �̹��� ����
        const validatedApps = await validateAppsImages(typeApps);
        // 3. Featured/Events �÷��� �ε�
        const [featuredIds, eventIds] = await Promise.all([
          loadFeaturedIds(),
          loadEventIds()
        ]);
        
        // 4. �۵鿡 �÷��� ����
        const appsWithFlags = applyFeaturedFlags(validatedApps, featuredIds, eventIds);
        const appsWithType = appsWithFlags.map(app => ({ ...app, type: 'gallery' as const }));
        
        
        // 5. ���� ����� ������Ʈ
        setAllApps(appsWithType);
        
      } else {
      }
    } catch (error) {
    }
  };






   // New Release ���� �������� ���� �Լ�
   const getLatestApp = () => {
     const latestApps = allApps
       .filter(app => app.status === "published")
       .sort((a, b) => 
         new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime()
       );
     return latestApps[0]; // ���� �ֱ� published �� 1���� ��ȯ
   };

  const handleAppUpload = async (data: AppFormData, files: { icon: File; screenshots: File[] }) => {
    try {
      // ������/��ũ���� ���� ���ε� (Vercel Blob �켱)
      const iconUrl = await uploadFile(files.icon, "icon");
      const screenshotUrls = await Promise.all(
        files.screenshots.map(file => uploadFile(file, "screenshot"))
      );

      // �� �� ������ ����
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
        type: 'gallery', // ������ �� Ÿ�� ���
      };

      // ���յ� ���� �� ���� ������Ʈ (���� ������ ����)
      // 1. ���� �� ������ �ε� (��������Ʈ ����)
      const existingApps = await loadAppsByTypeFromBlob('gallery');
      // 2. �� ���� ���� �����Ϳ� �߰� (ī�װ�� ���� ����)
      const sanitizedNewApp = { 
        ...newApp, 
        isFeatured: undefined, 
        isEvent: undefined,
        // ī�װ�� ������ �� �����Ϳ� ���� (���� ������)
        appCategory: data.appCategory 
      };
      const updatedApps = [sanitizedNewApp, ...existingApps];
      try {
        
        // 3. �� ���� (���� ������ + �� ��, featured/events ���� �ݿ�)
        // ���� �Ϲ� ī����� ���µ� �����ϸ鼭 �� ���� ���� �߰�
        
        // �� ���� ī�װ���� ���� ���� �߰�
        const finalFeaturedIds = [...featuredIds];
        const finalEventIds = [...eventIds];
        
        if (data.appCategory === 'featured' && !finalFeaturedIds.includes(newApp.id)) {
          finalFeaturedIds.push(newApp.id);
        } else if (data.appCategory === 'events' && !finalEventIds.includes(newApp.id)) {
          finalEventIds.push(newApp.id);
        }
        
        const saveResult = await saveAppsByTypeToBlob('gallery', updatedApps, finalFeaturedIds, finalEventIds);
        
        // 2. Featured/Events ���� ������Ʈ (���� ����� ���)
        if (data.appCategory === 'featured' || data.appCategory === 'events') {
          // ���� ������ ��� ���
          if (data.appCategory === 'featured') {
            toggleFeatured(newApp.id);
            } else if (data.appCategory === 'events') {
            toggleEvent(newApp.id);
            }
        }
        
        // 3. ��� ���� �Ϸ� �� �� ���� ���� ������Ʈ (�񵿱� ���� ����)
        if (saveResult.success && saveResult.data) {
          setAllApps(saveResult.data);
        } else {
          setAllApps(updatedApps);
        }
        
        // 4. ���� ������Ʈ �� ��� ����Ͽ� ���°� �ݿ��ǵ��� ��
        setTimeout(() => {
          }, 100);
        
      } catch (error) {
        // ���� ���н� ���� ���¸� ������Ʈ
        setAllApps(updatedApps);
      }
      
      // �� ���ε� �� ���� �Ϸ�
      alert("? App uploaded successfully!");
      
      // ������ ���� ���ΰ�ħ (�������� ���̵� �ֽ� ������ ǥ��)
      await forceRefreshGallery();
      
    } catch {
      alert("? App upload failed. Please try again.");
    }
  };

     const handleDeleteApp = async (id: string) => {
     try {
       // 1. ������ �� ���� ã�� (���� �迭���� ã��)
       const appToDelete = allApps.find(app => app.id === id);
       if (!appToDelete) {
         return;
       }

       // 2. ���ο� �� ��� ��� (���� �迭 ���)
       const newApps = allApps.filter(app => app.id !== id);
       
             // 3. Featured/Events �ۿ����� ���� (���� ���� ���)
      const newFeaturedApps = featuredIds.filter(appId => appId !== id);
      const newEventApps = eventIds.filter(appId => appId !== id);
      
      // 4. ���յ� ���� �� ���� ������Ʈ (���� ������ ����)
      try {
        // ���� �� ������ �ε� (��������Ʈ ����)
        const existingApps = await loadAppsByTypeFromBlob('gallery');
        // ������ ���� ������ �� �迭 ����
        const sanitizedApps = existingApps.filter(app => app.id !== id);
        const saveResult = await saveAppsByTypeToBlob('gallery', sanitizedApps, newFeaturedApps, newEventApps);
        
        // 5. ��� ���� �Ϸ� �� �� ���� ���� ������Ʈ (�񵿱� ���� ����)
        if (saveResult.success && saveResult.data) {
          setAllApps(saveResult.data);
        } else {
          setAllApps(newApps);
        }
         
                 } catch (error) {
        // ���� ���н� ���� ���¸� ������Ʈ
        setAllApps(newApps);
      }

       // 5. ���丮������ ���� ���ϵ� ���� (Vercel Blob/���� �ڵ� �Ǵ�)
       if (appToDelete.iconUrl) {
         try {
           await deleteFile(appToDelete.iconUrl);
         } catch (error) {
           // ������ ���� ���� ���� ����
         }
       }
       
       if (appToDelete.screenshotUrls && appToDelete.screenshotUrls.length > 0) {
         try {
           await Promise.all(appToDelete.screenshotUrls.map(url => deleteFile(url)));
         } catch (error) {
           // ��ũ���� ���ϵ� ���� ���� ����
         }
       }

       // 6. Featured/Events Blob ����ȭ
       try {
         await Promise.all([
           saveFeaturedIds(newFeaturedApps),
           saveEventIds(newEventApps)
         ]);
       } catch (error) {
         // Featured/Events Blob ����ȭ ���� ����
       }

       // 7. ���� �Ϸ� Ȯ��
       // Blob ����ȭ �� ��� ��ٸ� �� �ٽ� �ε� (����ȭ ���� �ذ�)
       setTimeout(async () => {
         try {
           const updatedBlobApps = await loadAppsFromBlob();
           // Blob ����ȭ ���� Ȯ�� (����ȭ �Ϸ� �Ǵ� ����)
            } catch (error) {
              // Blob ��Ȯ�� ���� ����
            }
          }, 1000); // 1�� ���
       
     } catch (error) {
             // ���н� UI ���� ����
      const savedAppsStr = localStorage.getItem('gallery-apps');
      if (savedAppsStr) {
        try {
          const parsedApps = JSON.parse(savedAppsStr);
          setAllApps(parsedApps);
        } catch {
          // localStorage �Ľ� ���� ����
        }
      }

             alert('An error occurred while deleting the app. Please try again.');
    }
  };

  const handleEditApp = (app: AppItem) => {
    setEditingApp(app);
  };



  // �� ��� �ε� �� ����ȭ (���� ����� ���)
  useEffect(() => {
    // StrictMode ���� ���� ����
    if (loadedRef.current) return;
    loadedRef.current = true;

    // ��ȭ�� ���� �ǵ�� ���� ����
    startBlockingTranslationFeedback();

    let isMounted = true; // ������Ʈ ����Ʈ ���� ����
    
    const loadAllApps = async () => {
      const myId = ++reqIdRef.current; // Request ID for race condition prevention
      
      try {
        // �޸���� �����ϰ� Ÿ�Ժ� �и��� Blob Storage���� �ε� �õ�
        const typeApps = await loadAppsByTypeFromBlob('gallery');
        
        if (!isMounted || myId !== reqIdRef.current) return; // Race condition check
        
        if (typeApps.length > 0) {
          // �������� ��� ��ü ��, �Ϲ� ����ڴ� ��� �� ǥ�� (AppItem���� isPublished �Ӽ��� ����)
          const validatedApps = await validateAppsImages(typeApps);
          if (!isMounted || myId !== reqIdRef.current) return; // Race condition check
          
          
          // Featured/Events �÷��� ����
          const [loadedFeaturedIds, loadedEventIds] = await Promise.all([
            loadFeaturedIds(),
            loadEventIds()
          ]);
          
          if (!isMounted || myId !== reqIdRef.current) return; // Race condition check
          
          // ���� ���¿� ID ����
          setFeaturedIds(loadedFeaturedIds);
          setEventIds(loadedEventIds);
          
          // ���� �۵鿡 type �Ӽ��� Featured/Events �÷��� �߰�
          const appsWithFlags = applyFeaturedFlags(validatedApps, loadedFeaturedIds, loadedEventIds);
          const appsWithType = appsWithFlags.map(app => ({ ...app, type: 'gallery' as const }));
          
          setAllApps(appsWithType); // ���� ���� ������Ʈ
          
          // �ڵ� ����ȭ ��Ȱ��ȭ (������ �ս� ����)
          ');
        } else {
          // Ÿ�Ժ� �и� API�� �����Ͱ� ������ ���� API ���
          const blobApps = await loadAppsFromBlob();
          
          if (!isMounted || myId !== reqIdRef.current) return; // Race condition check
          
          if (blobApps && blobApps.length > 0) {
            const validatedApps = await validateAppsImages(blobApps);
            
            if (!isMounted || myId !== reqIdRef.current) return; // Race condition check
            
            :', validatedApps.length, '��');
            
            // Featured/Events �÷��� ����
            const [featuredIds, eventIds] = await Promise.all([
              loadFeaturedIds(),
              loadEventIds()
            ]);
            
            if (!isMounted || myId !== reqIdRef.current) return; // Race condition check
            
            :', { featured: featuredIds.length, events: eventIds.length });
            
            // ���� �۵鿡 type �Ӽ��� Featured/Events �÷��� �߰�
            const appsWithFlags = applyFeaturedFlags(validatedApps, featuredIds, eventIds);
            const appsWithType = appsWithFlags.map(app => ({ ...app, type: 'gallery' as const }));
            
            :', appsWithType.length, '��', {
              featured: appsWithType.filter(a => a.isFeatured).length,
              events: appsWithType.filter(a => a.isEvent).length
            });
            
            setAllApps(appsWithType); // ���� ���� ������Ʈ
            
            // �ڵ� ����ȭ ��Ȱ��ȭ (������ �ս� ����)
            ');
          } else {
            // Keep existing state - don't reset to empty array
          }
        }
        
      } catch (error) {
        if (isMounted) {
          // �� �ε� ����
          // ���н� ���� ������ ���
          setAllApps(sampleApps);
        }
      }
    };

    loadAllApps();
    
    // Ŭ���� �Լ�
    return () => {
      isMounted = false;
    };
  }, [setAllApps]); // setAllApps ������ �߰�

  // ���� ���� ��ȭ �α� (���� ��忡����)
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      }
  }, [allApps, featuredIds, eventIds]);

  // Featured/Events ���� ���� (���� ��忡����)
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      if (currentFilter === 'featured') {
        const anyEventCard = filteredApps.some(a => a.isEvent);
        if (anyEventCard) }
      if (currentFilter === 'events') {
        const anyFeaturedCard = filteredApps.some(a => a.isFeatured);
        if (anyFeaturedCard) }
    }
  }, [currentFilter, filteredApps]);


  // ���� ������ ���ΰ�ħ �Լ�
  const forceRefreshGallery = async () => {
    const myId = ++reqIdRef.current; // Request ID for race condition prevention
    
    try {
      // Blob���� �ֽ� ������ ���� �ε�
      const typeApps = await loadAppsByTypeFromBlob('gallery');
      if (typeApps.length > 0 && myId === reqIdRef.current) {
        const validatedApps = await validateAppsImages(typeApps);
        const appsWithType = validatedApps.map(app => ({ ...app, type: 'gallery' as const }));
        setAllApps(appsWithType); // ���� ���� ������Ʈ
        // �� ��� ����ȭ �Ϸ�
      }
    } catch (error) {
      // ���ΰ�ħ ���� �� ���� ������ ����
    }
  };

  const handleUpdateApp = async (appId: string, data: AppFormData, files?: { icon?: File; screenshots?: File[] }) => {
    try {
      const appIndex = allApps.findIndex(app => app.id === appId);
      if (appIndex === -1) return;

      const updatedApp = { ...allApps[appIndex] };

      // �⺻ ���� ������Ʈ
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

      // �� �������� ������ ������Ʈ (�۷ι� ����� ���)
      if (files?.icon) {
        updatedApp.iconUrl = await uploadFile(files.icon, "icon");
      }

      // �� ��ũ������ ������ ������Ʈ (�۷ι� ����� ���)
      if (files?.screenshots && files.screenshots.length > 0) {
        const newScreenshotUrls = await Promise.all(
          files.screenshots.map(file => uploadFile(file, "screenshot"))
        );
        updatedApp.screenshotUrls = newScreenshotUrls;
      }

      // �� ��� ������Ʈ
      const newApps = [...allApps];
      newApps[appIndex] = updatedApp;

      // ���յ� ���� �� ���� ������Ʈ (���� ������ ����)
      try {
        // ���� �� ������ �ε� (��������Ʈ ����)
        const existingApps = await loadAppsByTypeFromBlob('gallery');
        // ������ ������ ������Ʈ
        const sanitizedUpdatedApp = { ...updatedApp, isFeatured: undefined, isEvent: undefined };
        const sanitizedApps = existingApps.map(app => 
          app.id === updatedApp.id ? sanitizedUpdatedApp : app
        );
        const saveResult = await saveAppsByTypeToBlob('gallery', sanitizedApps, featuredIds, eventIds);
        
        // ��� ���� �Ϸ� �� �� ���� ���� ������Ʈ (�񵿱� ���� ����)
        if (saveResult.success && saveResult.data) {
          setAllApps(saveResult.data);
        } else {
          setAllApps(newApps);
          alert("?? App updated but cloud synchronization failed.");
        }
        
        } catch (error) {
        // ���� ���н� ���� ���¸� ������Ʈ
        setAllApps(newApps);
        alert("?? App updated but cloud synchronization failed.");
      }

             setEditingApp(null);
       // �� ������Ʈ �� ���� �Ϸ�
       alert("? App updated successfully!");
     } catch {
       
       alert("? App update failed. Please try again.");
    }
  };

  const handleCopyrightClick = () => {
    // ���̾�α� ���� ���� �� �� ������ �ξ� DOM ����ȭ
    setTimeout(() => {
      setIsAdminDialogOpen(true);
    }, 100);
  };

  // App Story Ŭ�� �ڵ鷯
  const handleAppStoryClick = () => {
    setCurrentContentType("appstory");
    setCurrentFilter("all"); // ������ ���� �ʱ�ȭ
    // �޸��� ���� ��ġ�� ��ũ��
    setTimeout(() => {
      const contentManager = document.querySelector('[data-content-manager]');
      if (contentManager) {
        contentManager.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  // ���� admin mode Ʈ���� ��� (AdminUploadDialog �� HiddenAdminAccess���� ȣ��)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Initialize handler and seed adminVisible from session storage only
    const initial = (() => {
      try {
        const sessionActive = sessionStorage.getItem('admin-session-active') === '1';
        const isAuth = isAdmin;
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
  }, [isAdmin, adminVisible]);

  // News Ŭ�� �ڵ鷯
  const handleNewsClick = () => {
    setCurrentContentType("news");
    setCurrentFilter("all"); // ������ ���� �ʱ�ȭ
    // �޸��� ���� ��ġ�� ��ũ��
    setTimeout(() => {
      const contentManager = document.querySelector('[data-content-manager]');
      if (contentManager) {
        contentManager.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };



  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden" onMouseEnter={blockTranslationFeedback}>
      {/* �� ������ �ִϸ��̼� */}
      <SnowAnimation />
      
      <Header 
        viewMode={viewMode} 
        onViewModeChange={setViewMode} 
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />
      
                           <main className="container mx-auto py-6 max-w-6xl" style={{ maxWidth: '1152px' }} onMouseEnter={blockTranslationFeedback}>
         <div className="mb-6 text-center" onMouseEnter={blockTranslationFeedback}>
           <h1 className="relative inline-block text-4xl font-extrabold tracking-tight text-transparent bg-clip-text shine-text mb-0" onMouseEnter={blockTranslationFeedback}>
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
           
           
           <h2 className="text-2xl font-semibold text-amber-200 tracking-wide opacity-90 mb-3 mt-0" onMouseEnter={blockTranslationFeedback}>
             <span className="notranslate" translate="no">PRESENT</span>
           </h2>
           
           {/* �߰� ���� ���� ��ġ �ɼ� - Ÿ��Ʋ �Ʒ� */}
           {/* <div id="google_translate_element_main" className="mb-4"></div> */}
           
           <p className="text-gray-300" translate="yes" onMouseEnter={blockTranslationFeedback}>
             {t("footerDescription")}
           </p>
         </div>

                            {/* New Releases Ư�� ���� */}
         {currentFilter === "latest" && (() => {
           const latestApp = getLatestApp();
           if (!latestApp) {
             return null;
           }
            
            return (
            <div className="mb-12">
                             <div className="text-center mb-8" onMouseEnter={blockTranslationFeedback}>
                 <h3 className="text-3xl font-bold text-amber-400 mb-2 notranslate" translate="no" onMouseEnter={blockTranslationFeedback}>NEW RELEASE</h3>
                 <p className="text-gray-400" translate="yes" onMouseEnter={blockTranslationFeedback}>Just launched - Check it out!</p>
               </div>
              
                             <div className="flex justify-center px-4 max-w-4xl mx-auto">
                 <div className="relative group w-full max-w-sm">
                   {/* ȭ���� �׵θ� ȿ�� */}
                   <div className="absolute -inset-1 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 rounded-2xl blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-pulse"></div>
                   <div className="absolute -inset-1 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 rounded-2xl blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-pulse" style={{animationDelay: '0.5s'}}></div>
                   
                   {/* ���� ī�� - ���� ������ ī��� ������ ������ ������ ������ */}
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
                              ??
                            </div>
                          )}
                        </div>

                       {/* Store Badge */}
                       <div className="absolute bottom-2 left-2" onMouseEnter={blockTranslationFeedback}>
                         <span className="bg-green-500 text-white text-xs px-2 py-1 rounded" translate="yes" onMouseEnter={blockTranslationFeedback}>
                           {t(latestApp.status as keyof typeof t)}
                         </span>
                       </div>
                     </div>

                     <div className="p-3" style={{ backgroundColor: '#D1E2EA' }} onMouseEnter={blockTranslationFeedback}>
                       {/* App Icon and Basic Info */}
                       <div className="flex items-start space-x-3 mb-2" onMouseEnter={blockTranslationFeedback}>
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
                         <div className="flex-1 min-w-0" onMouseEnter={blockTranslationFeedback}>
                           <h3 className="font-medium text-sm mb-1 truncate notranslate" translate="no" onMouseEnter={blockTranslationFeedback}>{latestApp.name}</h3>
                           <p className="text-xs text-muted-foreground truncate notranslate" translate="no" onMouseEnter={blockTranslationFeedback}>{latestApp.developer}</p>
                         </div>
                       </div>

                       {/* Rating and Stats */}
                       <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                         <div className="flex items-center space-x-2">
                           <div className="flex items-center gap-1">
                             <span className="text-yellow-400">��</span>
                             <span>{latestApp.rating}</span>
                           </div>
                           <span>{latestApp.downloads}</span>
                         </div>
                         <span>{latestApp.version}</span>
                       </div>

                       {/* Tags */}
                       {latestApp.tags && latestApp.tags.length > 0 && (
                         <div className="flex flex-wrap gap-1 mb-2">
                           {latestApp.tags.slice(0, 2).map((tag) => (
                             <span key={tag} className="text-xs px-2 py-0 bg-gray-200 text-gray-700 rounded">
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
                       <div className="mt-0 border-t border-gray-300" style={{ backgroundColor: '#84CC9A' }} onMouseEnter={blockTranslationFeedback}>
                         <div className="flex items-center justify-between p-3 w-full" onMouseEnter={blockTranslationFeedback}>
                           <button
                             className="h-7 px-3 text-xs bg-green-700 hover:bg-green-800 text-white flex items-center gap-1 rounded"
                             onClick={() => {
                               if (latestApp.storeUrl) {
                                 window.open(latestApp.storeUrl, '_blank');
                               }
                             }}
                             disabled={!latestApp.storeUrl}
                             onMouseEnter={startBlockingTranslationFeedback}
                           >
                             <span>??</span>
                             <span className="notranslate" translate="no">Download</span>
                           </button>
                           
                           {/* ����� ���� �̹��� */}
                           <div className="h-7 flex items-center" onMouseEnter={blockTranslationFeedback}>
                             {latestApp.store === "google-play" ? (
                               <Image 
                                   src="/google-play-badge.png" 
                                   alt="Google Play���� �ٿ�ε�"
                                   width={120}
                                   height={28}
                                   unoptimized={isBlobUrl('/google-play-badge.png')}
                                   className="h-7 object-contain"
                                   onMouseEnter={startBlockingTranslationFeedback}
                                 />
                             ) : (
                               <Image 
                                 src="/app-store-badge.png" 
                                 alt="App Store���� �ٿ�ε�"
                                 width={120}
                                 height={28}
                                 unoptimized={isBlobUrl('/app-store-badge.png')}
                                 className="h-7 object-contain"
                                 onMouseEnter={startBlockingTranslationFeedback}
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

                   {/* ������ Ÿ�Կ� ���� ���Ǻ� ������ */}
                   {currentContentType ? (
                     // App Story �Ǵ� News ���
                     <div className="space-y-6" data-content-manager>
                       {currentContentType === "appstory" ? (
                         // App Story�� ���ο� ����Ʈ �� ���
                         <AppStoryList
                           type={currentContentType}
                           onBack={() => setCurrentContentType(null)}
                         />
                       ) : (
                         // News�� ���ο� ����Ʈ �� ���
                         <NewsList
                           type={currentContentType}
                           onBack={() => setCurrentContentType(null)}
                         />
                       )}
                     </div>
                   ) : (
                     // �Ϲ� ������ ���
                     <>
                       {/* Featured Apps ���� */}
                       {currentFilter === "featured" && (
                         <div className="space-y-6">
                           <div className="text-center" onMouseEnter={blockTranslationFeedback}>
                             <h2 className="text-3xl font-bold text-amber-400 mb-2" translate="yes" onMouseEnter={blockTranslationFeedback}>Featured Apps</h2>
                             <p className="text-gray-400" translate="yes" onMouseEnter={blockTranslationFeedback}>Discover our curated selection of recommended apps</p>
                           </div>
                           <AppGallery 
                             apps={filteredApps} 
                             viewMode="grid"
                             onEditApp={handleEditApp}
                             onDeleteApp={handleDeleteApp}
                             onToggleFeatured={toggleFeatured}
                             onToggleEvent={toggleEvent}
                           />
                         </div>
                       )}
                       
                       {/* Events ���� */}
                       {currentFilter === "events" && (
                         <div className="space-y-6">
                           <div className="text-center" onMouseEnter={blockTranslationFeedback}>
                             <h2 className="text-3xl font-bold text-amber-400 mb-2" translate="yes" onMouseEnter={blockTranslationFeedback}>Events</h2>
                             <p className="text-gray-400" translate="yes" onMouseEnter={blockTranslationFeedback}>Stay updated with the latest app events and special offers</p>
                           </div>
                           <AppGallery 
                             apps={filteredApps} 
                             viewMode="grid"
                             onEditApp={handleEditApp}
                             onDeleteApp={handleDeleteApp}
                             onToggleFeatured={toggleFeatured}
                             onToggleEvent={toggleEvent}
                             showNumbering={true}
                           />
                           
                           {/* Events MailForm */}
                           <div className="mt-12 text-center max-w-4xl mx-auto" onMouseEnter={blockTranslationFeedback}>
                             <div className="max-w-2xl mx-auto">
                               <div className="max-w-md mx-auto">
                                 <MailForm
                                   type="events"
                                   buttonText="?? Events ?? Touch Here ??"
                                   buttonDescription="Choose one of the apps above as your free gift. The gift will be delivered to your email. By accepting, you agree to receive occasional news and offers from us via that email address."
                                   onMouseEnter={startBlockingTranslationFeedback}
                                 />
                               </div>
                             </div>
                           </div>
                         </div>
                       )}

                       {/* �Ϲ� ������ - New Release ��忡���� ���� */}
                       {currentFilter !== "latest" && currentFilter !== "featured" && currentFilter !== "events" && (
                         <>
                           {/* ���� �� ������ ��� */}
                           <AppGallery 
                             apps={filteredApps} 
                             viewMode="grid"
                             onEditApp={handleEditApp}
                             onDeleteApp={handleDeleteApp}
                           />
                         </>
                       )}
                     </>
                   )}
       </main>

                    {/* Ǫ�� */}
        <footer className="border-t py-8 mt-16 bg-black" onMouseEnter={blockTranslationFeedback}>
                     <div className="container mx-auto text-center max-w-6xl" style={{ maxWidth: '1152px' }}>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                                                                                                                                                                                                                               <div>
                                                                                                                                                <h4 className="font-medium mb-3 text-amber-400 text-base" translate="yes" onMouseEnter={blockTranslationFeedback}>{t("exhibition")}</h4>
                   <div className="space-y-3">
                                                                                          <button 
                          onClick={(e) => handleFooterLinkClick(handleAllAppsClick, e)} 
                          onMouseEnter={startBlockingTranslationFeedback}
                          className="w-full border border-white rounded-lg p-4 text-left hover:border-amber-400 hover:bg-gray-800/50 transition-all duration-300 group notranslate"
                          translate="no"
                        >
                         <div className="text-base font-medium group-hover:text-amber-400 transition-colors" translate="yes" onMouseEnter={blockTranslationFeedback}>{t("allApps")}</div>
                         <div className="text-xs text-gray-400 mt-1 group-hover:text-gray-300 transition-colors" translate="yes" onMouseEnter={blockTranslationFeedback}>{t("seeEverything")}</div>
                       </button>
                                               <button 
                          onClick={(e) => handleFooterLinkClick(handleNewReleasesClick, e)} 
                          onMouseEnter={startBlockingTranslationFeedback}
                          className="w-full border border-white rounded-lg p-4 text-left hover:border-amber-400 hover:bg-gray-800/50 transition-all duration-300 group"
                        >
                         <div className="text-base font-medium group-hover:text-amber-400 transition-colors" translate="yes" onMouseEnter={blockTranslationFeedback}>New Releases</div>
                         <div className="text-xs text-gray-400 mt-1 group-hover:text-gray-300 transition-colors" translate="yes" onMouseEnter={blockTranslationFeedback}>Just launched</div>
                       </button>
                                               <button 
                          onClick={(e) => handleFooterLinkClick(handleFeaturedAppsClick, e)} 
                          onMouseEnter={startBlockingTranslationFeedback}
                          className="w-full border border-white rounded-lg p-4 text-left hover:border-amber-400 hover:bg-gray-800/50 transition-all duration-300 group"
                        >
                         <div className="text-base font-medium group-hover:text-amber-400 transition-colors" translate="yes" onMouseEnter={blockTranslationFeedback}>Featured Apps</div>
                         <div className="text-xs text-gray-400 mt-1 group-hover:text-gray-300 transition-colors" translate="yes" onMouseEnter={blockTranslationFeedback}>Recommended picks</div>
                       </button>
                                                                                              <button 
                           onClick={(e) => handleFooterLinkClick(handleEventsClick, e)} 
                           onMouseEnter={startBlockingTranslationFeedback}
                           className="w-full border border-white rounded-lg p-4 text-left hover:border-amber-400 hover:bg-gray-800/50 transition-all duration-300 group"
                         >
                          <div className="text-base font-medium group-hover:text-amber-400 transition-colors" translate="yes" onMouseEnter={blockTranslationFeedback}>Events</div>
                          <div className="text-xs text-gray-400 mt-1 group-hover:text-gray-300 transition-colors" translate="yes" onMouseEnter={blockTranslationFeedback}>Discounts via email</div>
                        </button>
                   </div>
                </div>

                                                                            <div>
                                                                                                                                                                       <h4 className="font-medium mb-3 text-amber-400 text-base" translate="yes" onMouseEnter={blockTranslationFeedback}>{t("forYou")}</h4>
                   <div className="space-y-3">
                                                                                                                   <button 
                           onClick={(e) => handleFooterLinkClick(handleAppStoryClick, e)} 
                           onMouseEnter={startBlockingTranslationFeedback}
                           className="w-full border border-white rounded-lg p-4 text-left hover:border-amber-400 hover:bg-gray-800/50 transition-all duration-300 group"
                         >
                          <div className="text-base font-medium group-hover:text-amber-400 transition-colors" translate="yes" onMouseEnter={blockTranslationFeedback}>App Story</div>
                          <div className="text-xs text-gray-400 mt-1 group-hover:text-gray-300 transition-colors" translate="yes" onMouseEnter={blockTranslationFeedback}>How it was made</div>
                        </button>
                                               <button 
                          onClick={(e) => handleFooterLinkClick(handleNewsClick, e)} 
                          onMouseEnter={startBlockingTranslationFeedback}
                          className="w-full border border-white rounded-lg p-4 text-left hover:border-amber-400 hover:bg-gray-800/50 transition-all duration-300 group"
                        >
                         <div className="text-base font-medium group-hover:text-amber-400 transition-colors" translate="yes" onMouseEnter={blockTranslationFeedback}>News</div>
                         <div className="text-xs text-gray-400 mt-1 group-hover:text-gray-300 transition-colors" translate="yes" onMouseEnter={blockTranslationFeedback}>Latest updates</div>
                       </button>
                                             <MailForm
                         type="feedback"
                         buttonText="Feedback"
                         buttonDescription="Your thoughts matter"
                         onMouseEnter={startBlockingTranslationFeedback}
                       />
                                                                                           <MailForm
                          type="contact"
                          buttonText="Contact Us"
                          buttonDescription="Help & answers"
                          onMouseEnter={startBlockingTranslationFeedback}
                        />
                   </div>
               </div>
                     </div>
           
                       {/* �߾� �̹��� */}
            <div className="flex items-center justify-center py-8">
              <Image 
                src="/monk_cr.png" 
                alt="Monk Character"
                width={256}
                height={256}
                className="h-64 w-auto object-contain"
              />
            </div>
            
            {/* �̹��� �ٷ� �� ���ΰ� �� Since 2025 */}
            <div className="text-center mt-0" onMouseEnter={blockTranslationFeedback}>
              <p className="text-lg font-medium text-amber-400 mb-1" translate="yes" onMouseEnter={blockTranslationFeedback}>
                &quot;We&apos;re just. that kind of group!&quot;
              </p>
              <p className="text-sm text-gray-400 notranslate mb-1" translate="no" style={{translate: 'no'}} onMouseEnter={blockTranslationFeedback}>
                ? Since 2025
              </p>
              <div className="flex justify-center">
                <button
                  onClick={(e) => handleFooterLinkClick(handleAppStoryClick, e)}
                  onMouseEnter={blockTranslationFeedback}
                  className="text-sm text-blue-400 hover:text-blue-300 transition-colors duration-200 flex items-center gap-1"
                  translate="yes"
                >
                  ?? See That Group
                </button>
              </div>
            </div>
           
           <div className="border-t border-gray-600 pt-6 mt-6 text-center">
            <span 
              onClick={createAdminButtonHandler(handleCopyrightClick)}
              className="cursor-pointer hover:text-gray-300 transition-colors text-sm text-white"
              title="������ ���"
            >
              <span className="notranslate" translate="no">�� 2025 gongmyung.com. All rights reserved.</span>
            </span>
            
                         {/* ������ ����� ���� ǥ�õǴ� ���ε� ��ư �� ī�װ�� ���� */}
                             {isAdmin && adminVisible && (
               <div className="mt-4 space-y-4">
                 {/* ī�װ���� ���� ��ư */}
                 <div className="flex justify-center gap-2 flex-wrap">
                   <button
                     onClick={createAdminButtonHandler(() => setCurrentFilter("all"))}
                     className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 notranslate ${
                       currentFilter === "all" 
                         ? "bg-blue-600 text-white" 
                         : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                     }`}
                     onMouseEnter={startBlockingTranslationFeedback}
                     translate="no"
                   >
                     ?? ��ü ({allApps.length})
                   </button>
                   <button
                     onClick={createAdminButtonHandler(handleNormalClick)}
                     className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 notranslate ${
                       currentFilter === "normal" 
                         ? "bg-green-600 text-white" 
                         : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                     }`}
                     onMouseEnter={startBlockingTranslationFeedback}
                     translate="no"
                   >
                     ?? �Ϲ� ({allApps.length - featuredIds.length - eventIds.length})
                   </button>
                   <button
                     onClick={createAdminButtonHandler(handleFeaturedAppsClick)}
                     className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 notranslate ${
                       currentFilter === "featured" 
                         ? "bg-yellow-600 text-white" 
                         : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                     }`}
                     onMouseEnter={startBlockingTranslationFeedback}
                     translate="no"
                   >
                     ? Featured ({featuredIds.length})
                   </button>
                   <button
                     onClick={createAdminButtonHandler(handleEventsClick)}
                     className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 notranslate ${
                       currentFilter === "events" 
                         ? "bg-purple-600 text-white" 
                         : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                     }`}
                     onMouseEnter={startBlockingTranslationFeedback}
                     translate="no"
                   >
                     ?? Events ({eventIds.length})
                   </button>
                 </div>
                 
                 {/* ���� ���� �� ����ȭ ��ư */}
                 <div className="flex justify-center gap-4">
                   <button
                     onClick={createAdminButtonHandler(handleManualSave)}
                     className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 text-sm font-medium rounded-lg shadow-lg transition-all duration-200 hover:scale-105 notranslate"
                     onMouseEnter={startBlockingTranslationFeedback}
                     translate="no"
                   >
                     ?? ������� ����
                   </button>
                   <button
                     onClick={createAdminButtonHandler(handleRefreshData)}
                     className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 text-sm font-medium rounded-lg shadow-lg transition-all duration-200 hover:scale-105 notranslate"
                     onMouseEnter={startBlockingTranslationFeedback}
                     translate="no"
                   >
                     ?? ������ ���ΰ�ħ
                   </button>
                 </div>
                 
                 {/* ���ε� ��ư */}
                 <div className="flex justify-center">
                   <AdminUploadDialog 
                     onUpload={handleAppUpload}
                     buttonProps={{
                       size: "lg",
                       className: "bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg font-medium rounded-lg shadow-lg transition-all duration-200 hover:scale-105"
                     }}
                     buttonText="?? �� �� ���ε�"
                   />
                 </div>
               </div>
             )}
             
             
          </div>
        </div>
        
      </footer>

      {/* ������ ������ ���� ���̾�α� */}
      <HiddenAdminAccess 
        isOpen={isAdminDialogOpen}
        onClose={() => {
          // ���̾�α� �ݱ� ���� �� �� ������ �ξ� DOM ����ȭ
          setTimeout(() => {
            setIsAdminDialogOpen(false);
          }, 150);
        }}
      />

      {/* �� ���� ���̾�α� */}
      <EditAppDialog
        app={editingApp}
        isOpen={!!editingApp}
        onClose={() => setEditingApp(null)}
        onUpdate={handleUpdateApp}
      />


    </div>
  );
}