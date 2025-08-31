"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppCard } from "./app-card";
import { AppItem, AppStore } from "@/types";
import { useLanguage } from "@/hooks/use-language";
import { loadAppsFromBlob } from "@/lib/data-loader";

interface AppGalleryProps {
  apps: AppItem[];
  viewMode: "grid" | "list";
  onDeleteApp?: (id: string) => void;
  onEditApp?: (app: AppItem) => void;
  onToggleFeatured?: (id: string) => void;
  onToggleEvent?: (id: string) => void;
  featuredApps?: string[];
  eventApps?: string[];
  showNumbering?: boolean;
}

export function AppGallery({ apps: initialApps, viewMode, onDeleteApp, onEditApp, onToggleFeatured, onToggleEvent, featuredApps = [], eventApps = [], showNumbering = false }: AppGalleryProps) {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<AppStore>("google-play");
  const [apps, setApps] = useState<AppItem[]>(initialApps);
  const [isLoading, setIsLoading] = useState(false);

  // Vercel Blob Storage에서 앱 데이터 로드
  useEffect(() => {
    const loadApps = async () => {
      setIsLoading(true);
      try {
        const blobApps = await loadAppsFromBlob();
        if (blobApps.length > 0) {
          setApps(blobApps);
        }
      } catch (error) {
        console.error('Failed to load apps from blob:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadApps();
  }, []);

  const filteredApps = apps.filter(app => app.store === activeTab);

  const googlePlayApps = apps.filter(app => app.store === "google-play");
  const appStoreApps = apps.filter(app => app.store === "app-store");

  if (apps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="text-6xl mb-4">📱</div>
        <h3 className="text-lg font-medium mb-2">{t("noAppsYet")}</h3>
        <p className="text-muted-foreground">
          {t("firstAppMessage")}
        </p>
      </div>
    );
  }

  const renderAppGrid = (appsToRender: AppItem[]) => {
    if (appsToRender.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="text-4xl mb-4">📱</div>
          <p className="text-muted-foreground">
            {activeTab === "google-play" ? "구글 플레이스토어 앱이 없습니다" :
             "앱스토어 앱이 없습니다"}
          </p>
        </div>
      );
    }

    if (viewMode === "list") {
      return (
        <div className="space-y-4">
          {appsToRender.map((app, index) => (
            <div key={app.id} className="relative">
              {showNumbering && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 event-number text-black font-bold text-2xl w-16 h-16 rounded-full flex items-center justify-center">
                  {index + 1}
                </div>
              )}
              <AppCard 
                app={app} 
                viewMode="list" 
                onDelete={onDeleteApp}
                onEdit={onEditApp}
                onToggleFeatured={onToggleFeatured}
                onToggleEvent={onToggleEvent}
                isFeatured={featuredApps.includes(app.id)}
                isEvent={eventApps.includes(app.id)}
              />
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {appsToRender.map((app, index) => (
          <div key={app.id} className="relative">
            {showNumbering && (
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 event-number text-black font-bold text-2xl w-16 h-16 rounded-full flex items-center justify-center">
                {index + 1}
              </div>
            )}
            <AppCard 
              app={app} 
              viewMode="grid" 
              onDelete={onDeleteApp}
              onEdit={onEditApp}
              onToggleFeatured={onToggleFeatured}
              onToggleEvent={onToggleEvent}
              isFeatured={featuredApps.includes(app.id)}
              isEvent={eventApps.includes(app.id)}
            />
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="w-full max-w-7xl mx-auto">
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as AppStore)} className="w-full">
        <div className="flex justify-center mb-6">
          <TabsList className="grid grid-cols-2 w-96" style={{ backgroundColor: '#9EA5B1' }}>
          <TabsTrigger value="google-play" className="flex items-center gap-2">
            {t("googlePlay")} ({googlePlayApps.length})
          </TabsTrigger>
          <TabsTrigger value="app-store" className="flex items-center gap-2">
            {t("appStore")} ({appStoreApps.length})
          </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="google-play" className="mt-0">
          {renderAppGrid(googlePlayApps)}
        </TabsContent>

        <TabsContent value="app-store" className="mt-0">
          {renderAppGrid(appStoreApps)}
        </TabsContent>
      </Tabs>
    </div>
  );
}
