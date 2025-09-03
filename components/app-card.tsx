"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, Download, Star, Trash2, Edit } from "lucide-react";
import { useState } from "react";
import { AppItem } from "@/types";
import { useLanguage } from "@/hooks/use-language";
import { useAdmin } from "@/hooks/use-admin";
import { blockTranslationFeedback, createAdminButtonHandler } from "@/lib/translation-utils";
import { AdminCardActionsDialog } from "./admin-card-actions-dialog";
import Image from "next/image";

interface AppCardProps {
  app: AppItem;
  viewMode: "grid" | "list";
  onDelete?: (id: string) => void;
  onEdit?: (app: AppItem) => void;
  onToggleFeatured?: (id: string) => void;
  onToggleEvent?: (id: string) => void;
  isFeatured?: boolean;
  isEvent?: boolean;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "published":
      return "bg-green-500";
    case "in-review":
      return "bg-yellow-500";
    case "development":
      return "bg-blue-500";
    default:
      return "bg-gray-500";
  }
};

export function AppCard({ app, viewMode, onDelete, onEdit, onToggleFeatured, onToggleEvent, isFeatured = false, isEvent = false }: AppCardProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [isAdminDialogOpen, setIsAdminDialogOpen] = useState(false);
  const { t } = useLanguage();
  const { isAuthenticated } = useAdmin();

  const isBlobUrl = (url?: string) => {
    return !!url && (url.includes('vercel-storage.com') || url.includes('blob.vercel-storage.com'));
  };

  const handleLike = () => {
    setIsLiked(!isLiked);
  };

  const handleStoreView = () => {
    if (app.storeUrl) {
      window.open(app.storeUrl, '_blank');
    }
  };

  const handleDelete = createAdminButtonHandler(() => {
    if (onDelete && confirm(`Delete "${app.name}"?`)) {
      onDelete(app.id);
    }
  });

  const handleEdit = createAdminButtonHandler(() => {
    if (onEdit) {
      onEdit(app);
    }
  });

  const handleToggleFeatured = createAdminButtonHandler(() => {
    if (onToggleFeatured) {
      onToggleFeatured(app.id);
    }
  });

  const handleToggleEvent = createAdminButtonHandler(() => {
    if (onToggleEvent) {
      onToggleEvent(app.id);
    }
  });

  // 호버 심볼 클릭 시 관리자 다이얼로그 열기
  const handleAdminActions = () => {
    setIsAdminDialogOpen(true);
  };

  if (viewMode === "list") {
    return (
      <>
        <Card
          className="flex flex-row overflow-hidden hover:shadow-lg transition-shadow"
          style={{ backgroundColor: '#D1E2EA' }}
          onMouseEnter={blockTranslationFeedback}
        >
          {/* App Icon */}
          <div className="w-24 h-24 flex-shrink-0 p-3">
            <Image
              src={app.iconUrl}
              alt={app.name}
              width={96}
              height={96}
              unoptimized={isBlobUrl(app.iconUrl)}
              className="w-full h-full object-cover object-center rounded-xl"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiBmaWxsPSIjZjNmNGY2Ii8+CjxwYXRoIGQ9Ik0xMiA2QzEwLjM0IDYgOSA3LjM0IDkgOUM5IDEwLjY2IDEwLjM0IDEyIDEyIDEyQzEzLjY2IDEyIDE1IDEwLjY2IDE1IDlDMTUgNy4zNCAxMy42NiA2IDEyIDZaTTEyIDRDMTQuNzYgNCAxNyA2LjI0IDE3IDlDMTcgMTEuNzYgMTQuNzYgMTQgMTIgMTRNOS4yNCAxNCA3IDExLjc2IDcgOUM3IDYuMjQgOS4yNCA0IDEyIDRaTTEyIDE2QzEwLjM0IDE2IDkgMTcuMzQgOSAxOUg3QzcgMTYuMjQgOS4yNCAxNCAxMiAxNEMxNC43NiAxNCAxNyAxNi4yNCAxNyAxOUgxNUMxNSAxNy4zNCAxMy42NiAxNiAxMiAxNloiIGZpbGw9IiM5Y2EzYWYiLz4KPC9zdmc+";
              }}
            />
          </div>

          <CardContent className="flex-1 px-2 py-0" style={{ backgroundColor: '#D1E2EA' }}>
            <div className="flex justify-between items-start h-full">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-lg notranslate app-name-fixed" translate="no">{app.name}</h3>
                  {/* 상태/스토어 배지 */}
                  <Badge className={`text-xs ${getStatusColor(app.status)} text-white`}>
                    {app.status}
                  </Badge>
                </div>

                <p className="text-sm text-muted-foreground mb-2">
                  {t("author")}: <span className="notranslate app-developer-fixed" translate="no">{app.developer}</span>
                </p>

                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  {app.description}
                </p>

                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span>{app.rating}</span>
                  </div>
                  <span>{app.downloads}</span>
                  <span>{app.version}</span>
                  <span>{app.uploadDate}</span>
                </div>

                {app.tags && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {app.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* 관리자 모드에서만 관리자 액션 버튼 표시 */}
              {isAuthenticated && (
                <div className="flex flex-col items-end space-y-2 ml-4" onMouseEnter={blockTranslationFeedback}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAdminActions}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    title="관리자 모드 열기"
                    onMouseEnter={blockTranslationFeedback}
                  >
                    ⚙️ 관리자 모드
                  </Button>
                </div>
              )}
            </div>
          </CardContent>

          <div className="w-full bg-[#84CC9A] border-t border-gray-300 px-4 py-3">
            {/* 하단 2줄 - 다운로드 버튼 */}
            <div className="flex flex-col items-start space-y-2">
              <div className="w-full">
                {app.status === "published" && app.storeUrl ? (
                  <Button
                    size="sm"
                    className="h-7 px-3 text-xs bg-green-700 hover:bg-green-800 text-white flex items-center gap-1 whitespace-nowrap min-w-[120px] justify-start"
                    onClick={handleStoreView}
                  >
                    <Download className="h-3 w-3" />
                    Download
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="h-7 px-3 text-xs bg-gray-500 text-white flex items-center gap-1 min-w-[120px] justify-start"
                    disabled
                  >
                    Coming soon
                  </Button>
                )}
              </div>

              {/* 하단 1줄 - 스토어 배지 */}
              <div className="h-7">
                <Image
                  src={app.store === "google-play" ? "/google-play-badge.png" : "/app-store-badge.png"}
                  alt="스토어 배지"
                  width={120}
                  height={28}
                  className="h-7 object-contain"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* 관리자 모드 다이얼로그 */}
        <AdminCardActionsDialog
          app={app}
          isOpen={isAdminDialogOpen}
          onClose={() => setIsAdminDialogOpen(false)}
          onDelete={onDelete}
          onEdit={onEdit}
          onToggleFeatured={onToggleFeatured}
          onToggleEvent={onToggleEvent}
          isFeatured={isFeatured}
          isEvent={isEvent}
        />
      </>
    );
  }

  return (
    <>
      <Card
        className="group overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
        style={{ backgroundColor: '#D1E2EA' }}
        onMouseEnter={blockTranslationFeedback}
      >
        <div className="relative">
          {/* Screenshot/App Preview */}
          <div className="aspect-square overflow-hidden bg-gradient-to-br from-blue-50 to-purple-50 relative">
            {app.screenshotUrls && app.screenshotUrls.length > 0 ? (
              <Image
                src={app.screenshotUrls[0]}
                alt={app.name}
                fill
                unoptimized={isBlobUrl(app.screenshotUrls?.[0])}
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
            <Badge className={`${getStatusColor(app.status)} text-white text-xs`}>
              {app.status}
            </Badge>
          </div>

          {/* Admin Actions Button - 호버 시 표시 */}
          {isAuthenticated && (
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20" onMouseEnter={blockTranslationFeedback}>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleAdminActions}
                className="h-8 w-8 p-0 shadow-lg bg-blue-600 hover:bg-blue-700 text-white"
                title="관리자 모드 열기"
                onMouseEnter={blockTranslationFeedback}
              >
                ⚙️
              </Button>
            </div>
          )}
        </div>

        <CardContent className="px-2 py-0" style={{ backgroundColor: '#D1E2EA' }}>
          {/* App Icon and Basic Info */}
          <div className="flex items-start space-x-3 mb-2">
            <Image
              src={app.iconUrl}
              alt={app.name}
              width={48}
              height={48}
              className="w-12 h-12 rounded-xl object-cover object-center flex-shrink-0"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiBmaWxsPSIjZjNmNGY2Ii8+CjxwYXRoIGQ9Ik0xMiA2QzEwLjM0IDYgOSA3LjM0IDkgOUM5IDEwLjY2IDEwLjM0IDEyIDEyIDEyQzEzLjY2IDEyIDE1IDEwLjY2IDE1IDlDMTUgNy4zNCAxMy42NiA2IDEyIDZaTTEyIDRDMTQuNzYgNCAxNyA2LjI0IDE3IDlDMTcgMTEuNzYgMTQuNzYgMTQgMTIgMTRNOS4yNCAxNCA3IDExLjc2IDcgOUM3IDYuMjQgOS4yNCA0IDEyIDRaTTEyIDE2QzEwLjM0IDE2IDkgMTcuMzQgOSAxOUg3QzcgMTYuMjQgOS4yNCAxNCAxMiAxNEMxNC43NiAxNCAxNyAxNi4yNCAxNyAxOUgxNUMxNSAxNy4zNCAxMy42NiAxNiAxMiAxNloiIGZpbGw9IiM5Y2EzYWYiLz4KPC9zdmc+";
              }}
            />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base mb-1 truncate notranslate app-name-fixed" translate="no">{app.name}</h3>
              <p className="text-sm text-muted-foreground truncate notranslate app-developer-fixed" translate="no">{app.developer}</p>
            </div>
          </div>

          {/* Rating and Stats */}
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
            <div className="flex items-center space-x-3">
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span>{app.rating}</span>
              </div>
              <span>{app.downloads}</span>
            </div>
            <span>{app.version}</span>
          </div>

          {/* Tags */}
          {app.tags && app.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-0">
              {app.tags.slice(0, 2).map((tag, index) => (
                <Badge key={index} variant="secondary" className="text-xs px-2 py-0">
                  {tag}
                </Badge>
              ))}
              {app.tags.length > 2 && (
                <span className="text-xs text-muted-foreground">
                  +{app.tags.length - 2}
                </span>
              )}
            </div>
          )}
        </CardContent>

        {/* Download Section - CardContent 밖으로 이동 */}
        <div className="w-full bg-[#84CC9A] border-t border-gray-300 px-4 py-2">
          <div className="flex flex-col items-start space-y-1">
            {/* 하단 2줄 - 다운로드 버튼 */}
            <div className="w-full">
              {app.status === "published" && app.storeUrl ? (
                <Button
                  size="sm"
                  className="h-6 px-3 text-xs bg-green-700 hover:bg-green-800 text-white flex items-center gap-1 whitespace-nowrap min-w-[120px] justify-start"
                  onClick={handleStoreView}
                >
                  <Download className="h-3 w-3" />
                  Download
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="h-6 px-3 text-xs bg-gray-500 text-white flex items-center gap-1 min-w-[120px] justify-start"
                  disabled
                >
                  Coming soon
                </Button>
              )}
            </div>

            {/* 하단 1줄 - 스토어 배지 */}
            <div className="h-6">
              <Image
                src={app.store === "google-play" ? "/google-play-badge.png" : "/app-store-badge.png"}
                alt="스토어 배지"
                width={100}
                height={24}
                className="h-6 object-contain"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* 관리자 모드 다이얼로그 */}
      <AdminCardActionsDialog
        app={app}
        isOpen={isAdminDialogOpen}
        onClose={() => setIsAdminDialogOpen(false)}
        onDelete={onDelete}
        onEdit={onEdit}
        onToggleFeatured={onToggleFeatured}
        onToggleEvent={onToggleEvent}
        isFeatured={isFeatured}
        isEvent={isEvent}
      />
    </>
  );
}
