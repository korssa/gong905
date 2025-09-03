"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, Star, Edit, Trash2, Save } from "lucide-react";
import { AppItem } from "@/types";
import React, { useState, useEffect } from "react";

interface AdminCardActionsDialogProps {
  app: AppItem;
  isOpen: boolean;
  onClose: () => void;
  onDelete?: (id: string) => void;
  onEdit?: (app: AppItem) => void;
  onToggleFeatured?: (id: string) => void;
  onToggleEvent?: (id: string) => void;
  isFeatured?: boolean;
  isEvent?: boolean;
}

export function AdminCardActionsDialog({
  app,
  isOpen,
  onClose,
  onDelete,
  onEdit,
  onToggleFeatured,
  onToggleEvent,
  isFeatured = false,
  isEvent = false
}: AdminCardActionsDialogProps) {
  const [localFeatured, setLocalFeatured] = useState(isFeatured);
  const [localEvent, setLocalEvent] = useState(isEvent);
  const [isSaving, setIsSaving] = useState(false);

  // props가 변경될 때마다 로컬 상태 동기화
  useEffect(() => {
    setLocalFeatured(isFeatured);
    setLocalEvent(isEvent);
  }, [isFeatured, isEvent]);

  // 로컬 상태 동기화 - 현재 상태와 반대로 토글
  const handleToggleFeatured = () => {
    setLocalFeatured(!localFeatured);
  };

  const handleToggleEvent = () => {
    setLocalEvent(!localEvent);
  };

  // 저장 버튼 클릭 시 트리거 실행
  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      console.log('💾 저장 시작:', {
        appId: app.id,
        appName: app.name,
        localFeatured,
        isFeatured,
        localEvent,
        isEvent,
        hasToggleFeatured: !!onToggleFeatured,
        hasToggleEvent: !!onToggleEvent
      });
      
      // Featured 상태 변경이 있는 경우
      if (localFeatured !== isFeatured && onToggleFeatured) {
        console.log('🔄 Featured 상태 변경:', isFeatured, '→', localFeatured);
        await onToggleFeatured(app.id);
        console.log('✅ Featured 상태 변경 완료');
      }
      
      // Event 상태 변경이 있는 경우
      if (localEvent !== isEvent && onToggleEvent) {
        console.log('🔄 Event 상태 변경:', isEvent, '→', localEvent);
        await onToggleEvent(app.id);
        console.log('✅ Event 상태 변경 완료');
      }
      
      // 성공적으로 저장된 경우 다이얼로그 닫기
      console.log('🎉 모든 변경사항 저장 완료');
      onClose();
    } catch (error) {
      console.error('❌ 저장 중 오류 발생:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // 편집 버튼 클릭
  const handleEdit = () => {
    if (onEdit) {
      onEdit(app);
      onClose();
    }
  };

  // 삭제 버튼 클릭
  const handleDelete = () => {
    if (onDelete && confirm(`"${app.name}"을(를) 삭제하시겠습니까?`)) {
      onDelete(app.id);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>관리자 모드 - {app.name}</span>
            <Badge variant="secondary">{app.status}</Badge>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* 앱 정보 표시 */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                📱
              </div>
              <div>
                <h3 className="font-semibold">{app.name}</h3>
                <p className="text-sm text-gray-600">{app.developer}</p>
              </div>
            </div>
            <p className="text-sm text-gray-700">{app.description}</p>
          </div>

          {/* 상태 토글 버튼들 */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant={localFeatured ? "destructive" : "secondary"}
              onClick={handleToggleFeatured}
              className={`h-12 flex flex-col items-center gap-1 ${localFeatured ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-500 hover:bg-gray-600'}`}
            >
              <Heart className={`h-5 w-5 ${localFeatured ? 'fill-current text-white' : ''}`} />
              <span className="text-xs text-white">
                {localFeatured ? 'Featured 해제' : 'Featured 설정'}
              </span>
            </Button>
            
            <Button
              variant={localEvent ? "destructive" : "secondary"}
              onClick={handleToggleEvent}
              className={`h-12 flex flex-col items-center gap-1 ${localEvent ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-gray-500 hover:bg-gray-600'}`}
            >
              <Star className={`h-5 w-5 ${localEvent ? 'fill-current text-white' : ''}`} />
              <span className="text-xs text-white">
                {localEvent ? 'Event 해제' : 'Event 설정'}
              </span>
            </Button>
          </div>

          {/* 액션 버튼들 */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleEdit}
              className="flex-1"
            >
              <Edit className="h-4 w-4 mr-2" />
              편집
            </Button>
            
            <Button
              variant="destructive"
              onClick={handleDelete}
              className="flex-1"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              삭제
            </Button>
          </div>

          {/* 저장 버튼 */}
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? '저장 중...' : '변경사항 저장'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
