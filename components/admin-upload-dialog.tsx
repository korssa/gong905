"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
// Badge 제거 - 사용하지 않음
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
// Select 컴포넌트 제거 - 버튼으로 대체
import { Upload, Image as ImageIcon, X, Lock } from "lucide-react";
import { AppFormData, AppStore, AppStatus } from "@/types";

import { useAdmin } from "@/hooks/use-admin";
import { createURLManager, registerManager, unregisterManager } from "@/lib/url-manager";
import { blockTranslationFeedback, createAdminButtonHandler, startBlockingTranslationFeedback } from "@/lib/translation-utils";
// select-protection 제거 - 버튼으로 대체

// 관리자용 영어 텍스트 (번역 불필요)
const adminTexts = {
  upload: "Upload",
  uploadTitle: "Upload App", 
  uploadDescription: "Add a new app to the gallery.",
  appName: "App Name",
  appNamePlaceholder: "Enter app name",
  developer: "Developer", 
  developerPlaceholder: "Enter developer name",
  description: "Description",
  descriptionPlaceholder: "Enter app description",
  category: "Category",
  appCategory: "App Category",
  appCategoryPlaceholder: "Select app category",
  normal: "Normal",
  featured: "Featured",
  events: "Events",
  tags: "Tags (Optional)",
  tagsPlaceholder: "Enter tags separated by commas",
  tagsExample: "e.g., productivity, utility, game",
  selectFiles: "Click to upload or drag and drop",
  fileTypes: "PNG, JPG, JPEG (Max 10MB)",
  selectedFiles: "Selected files:",
  cancel: "Cancel",
  logout: "Logout",
  store: "Store",
  status: "Status",
  googlePlay: "Google Play Store",
  appStore: "App Store", 
  published: "Published",
  inReview: "In Review",
  development: "Development",
  adminPassword: "Admin Password",
  passwordPlaceholder: "Enter admin password",
  login: "Login",
  adminPanel: "Admin Panel"
};

interface AdminUploadDialogProps {
  onUpload?: (data: AppFormData, files: { icon: File; screenshots: File[] }) => void;
  buttonProps?: {
    size?: "sm" | "lg" | "default";
    className?: string;
  };
  buttonText?: string;
  // 갤러리에서 사용하는 props
  isOpen?: boolean;
  onClose?: () => void;
  onUploadSuccess?: () => void;
  targetGallery?: 'gallery' | 'featured' | 'events';
}

export function AdminUploadDialog({ 
  onUpload, 
  buttonProps, 
  buttonText = "Upload",
  isOpen: externalIsOpen,
  onClose,
  onUploadSuccess,
  targetGallery
}: AdminUploadDialogProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  const setIsOpen = externalIsOpen !== undefined ? (onClose || (() => {})) : setInternalIsOpen;
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [screenshotFiles, setScreenshotFiles] = useState<File[]>([]);
  const [iconUrl, setIconUrl] = useState<string | null>(null);
  const [screenshotUrls, setScreenshotUrls] = useState<string[]>([]);
  const [urlManager] = useState(() => createURLManager());
  
  // URL 매니저 등록 및 정리
  useEffect(() => {
    registerManager(urlManager);
    
    return () => {
      unregisterManager(urlManager);
      urlManager.dispose();
    };
  }, [urlManager]);

  // 다이얼로그가 열릴 때 강화된 번역 피드백 차단 시작
  useEffect(() => {
    if (isOpen) {
      startBlockingTranslationFeedback();
    }
  }, [isOpen]);
  
  const [formData, setFormData] = useState<AppFormData>({
    name: "",
    developer: "",
    description: "",
    store: "google-play",
    status: "development",
    tags: "",
    rating: 4.5,
    downloads: "1K+",
    version: "1.0.0",
    size: "50MB",
    category: "",
    storeUrl: "",
    appCategory: "normal",
  });

  const { isAuthenticated, login, logout } = useAdmin();



  // 안전한 아이콘 URL 관리
  useEffect(() => {
    // 이전 URL 정리
    if (iconUrl) {
      urlManager.revokeObjectURL(iconUrl);
      setIconUrl(null);
    }

    // 새 URL 생성
    if (iconFile && !urlManager.isDisposed()) {
      const url = urlManager.createObjectURL(iconFile);
      if (url) {
        setIconUrl(url);
      }
    }
  }, [iconFile, urlManager]);

  // 안전한 스크린샷 URLs 관리
  useEffect(() => {
    // 이전 URLs 정리
    screenshotUrls.forEach(url => {
      if (url) {
        urlManager.revokeObjectURL(url);
      }
    });
    setScreenshotUrls([]);
    
    // 새 URLs 생성
    if (screenshotFiles.length > 0 && !urlManager.isDisposed()) {
      const urls = screenshotFiles
        .map(file => urlManager.createObjectURL(file))
        .filter(url => url !== null) as string[];
      
      setScreenshotUrls(urls);
    }
  }, [screenshotFiles, urlManager]);



  const handleLogin = () => {
    if (login(password)) {
      setIsLoginOpen(false);
      setPassword("");
      setIsOpen(true);
      
             // 관리자 모드 진입 이벤트 즉시 발생
       if (typeof window !== 'undefined' && window.adminModeChange) {
         try {
           window.adminModeChange(true);
         } catch (error) {
           // adminModeChange 호출 실패
         }
       }
    } else {
      alert("Incorrect password");
    }
  };

  const handleIconSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIconFile(file);
    }
  };

  const handleScreenshotsSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setScreenshotFiles(files);
  };

  const removeScreenshot = (index: number) => {
    setScreenshotFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!iconFile) {
      alert("Please select an app icon");
      return;
    }

    // 갤러리 업로드인 경우
    if (targetGallery && onUploadSuccess) {
      try {
        // 갤러리별 업로드 API 호출
        const formDataToSend = new FormData();
        formDataToSend.append('file', iconFile);
        formDataToSend.append('title', formData.name);
        formDataToSend.append('content', formData.description || '');
        formDataToSend.append('author', formData.developer);
        formDataToSend.append('tags', formData.tags || '');
        formDataToSend.append('isPublished', 'true');
        formDataToSend.append('store', formData.store || 'google-play');
        formDataToSend.append('storeUrl', formData.storeUrl || '');
        
        const response = await fetch(`/api/gallery?type=${targetGallery}`, {
          method: 'POST',
          body: formDataToSend,
        });

        if (response.ok) {
          onUploadSuccess();
        } else {
          alert('업로드에 실패했습니다.');
        }
      } catch (error) {
        alert('업로드 중 오류가 발생했습니다.');
      }
    } else if (onUpload) {
      // 기존 업로드 방식
      onUpload(formData, {
        icon: iconFile,
        screenshots: screenshotFiles,
      });
    }

    // Reset form
    setIsOpen(false);
    setIconFile(null);
    setScreenshotFiles([]);
    setFormData({
      name: "",
      developer: "",
      description: "",
      store: "google-play",
      status: "development",
      tags: "",
      rating: 4.5,
      downloads: "1K+",
      version: "1.0.0",
      size: "50MB",
      category: "",
      storeUrl: "",
      appCategory: "normal",
    });
  };

  const isFormValid = formData.name.trim() && formData.developer.trim() && iconFile;

  if (!isAuthenticated) {
    return (
      <>
        <Dialog open={isLoginOpen} onOpenChange={setIsLoginOpen}>
          <DialogTrigger asChild>
            <Button 
              className="gap-2"
              onMouseEnter={blockTranslationFeedback}
            >
              <Lock className="h-4 w-4" />
              {adminTexts.adminPanel}
            </Button>
          </DialogTrigger>
          <DialogContent 
            className="sm:max-w-[400px]"
            onMouseEnter={blockTranslationFeedback}
          >
            <DialogHeader>
              <DialogTitle>{adminTexts.adminPanel}</DialogTitle>
              <DialogDescription>
                {adminTexts.adminPassword}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4" onMouseEnter={blockTranslationFeedback}>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={adminTexts.passwordPlaceholder}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                onMouseEnter={blockTranslationFeedback}
              />
            </div>

            <DialogFooter onMouseEnter={blockTranslationFeedback}>
              <Button 
                variant="outline" 
                onClick={() => setIsLoginOpen(false)}
                onMouseEnter={blockTranslationFeedback}
              >
                {adminTexts.cancel}
              </Button>
              <Button 
                onClick={createAdminButtonHandler(handleLogin)} 
                disabled={!password.trim()}
                onMouseEnter={blockTranslationFeedback}
              >
                {adminTexts.login}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button 
        size={buttonProps?.size || "default"}
        className={`${buttonProps?.className || "gap-2"} notranslate`}
        onClick={() => {
          setIsOpen(true);
        }}
        onMouseEnter={blockTranslationFeedback}
        translate="no"
      >
        <Upload className="h-4 w-4" />
        {buttonText || adminTexts.upload}
      </Button>
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
                  <DialogContent 
                    className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto"
                    onMouseEnter={blockTranslationFeedback}
                  >
          <DialogHeader onMouseEnter={blockTranslationFeedback}>
            <DialogTitle>{adminTexts.uploadTitle}</DialogTitle>
            <DialogDescription>
              {adminTexts.uploadDescription}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4" onMouseEnter={blockTranslationFeedback}>
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div onMouseEnter={blockTranslationFeedback}>
                <label className="block text-sm font-medium mb-2">
                  {adminTexts.appName} *
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder={adminTexts.appNamePlaceholder}
                  onMouseEnter={blockTranslationFeedback}
                />
              </div>
              <div onMouseEnter={blockTranslationFeedback}>
                <label className="block text-sm font-medium mb-2">
                  {adminTexts.developer} *
                </label>
                <Input
                  value={formData.developer}
                  onChange={(e) => setFormData(prev => ({ ...prev, developer: e.target.value }))}
                  placeholder={adminTexts.developerPlaceholder}
                  onMouseEnter={blockTranslationFeedback}
                />
              </div>
            </div>

            {/* Description */}
            <div onMouseEnter={blockTranslationFeedback}>
              <label className="block text-sm font-medium mb-2">
                {adminTexts.description}
              </label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                  placeholder={adminTexts.descriptionPlaceholder}
                onMouseEnter={blockTranslationFeedback}
              />
            </div>

            {/* Store and Status */}
            <div className="grid grid-cols-2 gap-4" onMouseEnter={blockTranslationFeedback}>
              <div onMouseEnter={blockTranslationFeedback}>
                                 <label className="block text-sm font-medium mb-2">
                   <span className="notranslate" translate="no">{adminTexts.store}</span>
                 </label>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start h-10 bg-white hover:bg-gray-50 border border-gray-200"
                  onClick={createAdminButtonHandler(() => {
                    try {
                      const stores: AppStore[] = ["google-play", "app-store"];
                      const currentIndex = stores.indexOf(formData.store);
                      const nextIndex = (currentIndex + 1) % stores.length;
                      const newStore = stores[nextIndex];
                      setFormData(prev => ({ ...prev, store: newStore }));
                      
                      // store 변경 시 번역 피드백 방지
                      blockTranslationFeedback();
                    } catch (error) {
                      // Store change error
                    }
                  })}
                  onMouseEnter={blockTranslationFeedback}
                >
                  {formData.store === "google-play" ? "🤖" : "🍎"} {" "}
                  {formData.store === "google-play" ? adminTexts.googlePlay : adminTexts.appStore}
                </Button>
              </div>
              <div onMouseEnter={blockTranslationFeedback}>
                <label className="block text-sm font-medium mb-2">
                  {adminTexts.status}
                </label>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start h-10 bg-white hover:bg-gray-50 border border-gray-200"
                  onClick={() => {
                    try {
                      // 번역 피드백 방지
                      blockTranslationFeedback();
                      
                      const statuses: AppStatus[] = ["published", "in-review", "development"];
                      const currentIndex = statuses.indexOf(formData.status);
                      const nextIndex = (currentIndex + 1) % statuses.length;
                      const newStatus = statuses[nextIndex];
                      setFormData(prev => ({ ...prev, status: newStatus }));
                    } catch (error) {
                      // Status change error
                    }
                  }}
                  onMouseEnter={blockTranslationFeedback}
                >
                  {formData.status === "published" && "✅ " + adminTexts.published}
                  {formData.status === "in-review" && "⏳ " + adminTexts.inReview}
                  {formData.status === "development" && "🚧 " + adminTexts.development}
                </Button>
              </div>
            </div>

            {/* App Category */}
            <div onMouseEnter={blockTranslationFeedback}>
              <label className="block text-sm font-medium mb-2">
                {adminTexts.appCategory} *
              </label>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start h-10 bg-white hover:bg-gray-50 border border-gray-200"
                onClick={() => {
                  try {
                    blockTranslationFeedback();
                    
                    const categories: ('normal' | 'featured' | 'events')[] = ["normal", "featured", "events"];
                    const currentIndex = categories.indexOf(formData.appCategory || 'normal');
                    const nextIndex = (currentIndex + 1) % categories.length;
                    const newCategory = categories[nextIndex];
                    setFormData(prev => ({ ...prev, appCategory: newCategory }));
                  } catch (error) {
                    // Category change error
                  }
                }}
                onMouseEnter={blockTranslationFeedback}
                
              >
                {formData.appCategory === "normal" && "📱 " + adminTexts.normal}
                {formData.appCategory === "featured" && "⭐ " + adminTexts.featured}
                {formData.appCategory === "events" && "🎉 " + adminTexts.events}
              </Button>
            </div>

            {/* Additional Info */}
            <div className="grid grid-cols-3 gap-4" onMouseEnter={blockTranslationFeedback}>
              <div onMouseEnter={blockTranslationFeedback}>
                <label className="block text-sm font-medium mb-2">
                  Rating
                </label>
                <Input
                  type="number"
                  min="0"
                  max="5"
                  step="0.1"
                  value={formData.rating}
                  onChange={(e) => setFormData(prev => ({ ...prev, rating: parseFloat(e.target.value) }))}
                  onMouseEnter={blockTranslationFeedback}
                />
              </div>
              <div onMouseEnter={blockTranslationFeedback}>
                <label className="block text-sm font-medium mb-2">
                  Downloads
                </label>
                <Input
                  value={formData.downloads}
                  onChange={(e) => setFormData(prev => ({ ...prev, downloads: e.target.value }))}
                  placeholder="1K+, 10K+, 1M+"
                  onMouseEnter={blockTranslationFeedback}
                />
              </div>
              <div onMouseEnter={blockTranslationFeedback}>
                <label className="block text-sm font-medium mb-2">
                  Version
                </label>
                <Input
                  value={formData.version}
                  onChange={(e) => setFormData(prev => ({ ...prev, version: e.target.value }))}
                  placeholder="1.0.0"
                  onMouseEnter={blockTranslationFeedback}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4" onMouseEnter={blockTranslationFeedback}>
              <div onMouseEnter={blockTranslationFeedback}>
                <label className="block text-sm font-medium mb-2">
                  Size
                </label>
                <Input
                  value={formData.size}
                  onChange={(e) => setFormData(prev => ({ ...prev, size: e.target.value }))}
                  placeholder="50MB"
                  onMouseEnter={blockTranslationFeedback}
                />
              </div>
              <div onMouseEnter={blockTranslationFeedback}>
                <label className="block text-sm font-medium mb-2">
                  Store URL
                </label>
                <Input
                  value={formData.storeUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, storeUrl: e.target.value }))}
                  placeholder="https://..."
                  onMouseEnter={blockTranslationFeedback}
                />
              </div>
            </div>

            {/* App Icon */}
            <div onMouseEnter={blockTranslationFeedback}>
              <label className="block text-sm font-medium mb-2">
                App Icon *
              </label>
              <label
                htmlFor="icon-upload"
                className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
                onMouseEnter={blockTranslationFeedback}
              >
                {iconFile && iconUrl ? (
                  <div className="flex items-center gap-2">
                    <img
                      src={iconUrl}
                      alt="Icon preview"
                      className="w-12 h-12 rounded object-cover"
                    />
                    <span className="text-sm">{iconFile.name}</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <ImageIcon className="w-6 h-6 mb-1 text-gray-400" />
                    <p className="text-sm text-gray-500">Click to upload app icon</p>
                  </div>
                )}
                <input
                  id="icon-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleIconSelect}
                />
              </label>
            </div>

            {/* Screenshots */}
            <div onMouseEnter={blockTranslationFeedback}>
              <label className="block text-sm font-medium mb-2">
                Screenshots
              </label>
              <label
                htmlFor="screenshots-upload"
                className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
                onMouseEnter={blockTranslationFeedback}
              >
                <div className="flex flex-col items-center">
                  <ImageIcon className="w-6 h-6 mb-1 text-gray-400" />
                  <p className="text-sm text-gray-500">Click to upload screenshots</p>
                </div>
                <input
                  id="screenshots-upload"
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={handleScreenshotsSelect}
                />
              </label>

              {screenshotFiles.length > 0 && (
                <div className="grid grid-cols-4 gap-2 mt-3">
                  {screenshotFiles.map((file, index) => (
                    screenshotUrls[index] ? (
                      <div key={index} className="relative group">
                        <img
                          src={screenshotUrls[index]}
                          alt={`Screenshot ${index + 1}`}
                          className="w-full h-20 object-cover rounded"
                        />
                        <Button
                          variant="destructive"
                          size="sm"
                          className="absolute top-1 right-1 h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeScreenshot(index)}
                          onMouseEnter={blockTranslationFeedback}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : null
                  ))}
                </div>
              )}
            </div>

            {/* Tags */}
            <div onMouseEnter={blockTranslationFeedback}>
              <label className="block text-sm font-medium mb-2">
{adminTexts.tags}
              </label>
              <Input
                value={formData.tags}
                onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                placeholder={adminTexts.tagsPlaceholder}
                onMouseEnter={blockTranslationFeedback}
              />
              <p className="text-xs text-gray-500 mt-1">
{adminTexts.tagsExample}
              </p>
            </div>
          </div>

                     <DialogFooter onMouseEnter={blockTranslationFeedback}>
                           <Button 
                             variant="outline" 
                             onClick={() => setIsOpen(false)}
                             onMouseEnter={blockTranslationFeedback}
                           >
               {adminTexts.cancel}
             </Button>
                         <Button 
                           variant="outline" 
                           onClick={() => {
               logout();
               // 관리자 모드 해제 이벤트 즉시 발생
               if (typeof window !== 'undefined' && window.adminModeChange) {
                 try {
                   window.adminModeChange(false);
                 } catch (error) {
                   // adminModeChange 호출 실패
                 }
               }
             }}
                           onMouseEnter={blockTranslationFeedback}
                         >
{adminTexts.logout}
            </Button>
            <Button 
              onClick={createAdminButtonHandler(handleSubmit)} 
              disabled={!isFormValid}
              onMouseEnter={blockTranslationFeedback}
            >
{adminTexts.upload}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
