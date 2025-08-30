"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Lock } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { useAdmin } from "@/hooks/use-admin";

interface HiddenAdminAccessProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HiddenAdminAccess({ isOpen, onClose }: HiddenAdminAccessProps) {
  const [password, setPassword] = useState("");
  const [isMounted, setIsMounted] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  // language hook kept for future translations
  useLanguage();
  const { login, logout, isAuthenticated } = useAdmin();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 컴포넌트 마운트 상태 관리
  useEffect(() => {
    setIsMounted(true);
    return () => {
      setIsMounted(false);
      // 타임아웃 정리
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // 다이얼로그 열기/닫기 상태 동기화
  useEffect(() => {
    if (isOpen && isMounted) {
      // 다이얼로그 열기 전 지연
      timeoutRef.current = setTimeout(() => {
        setIsDialogOpen(true);
      }, 100);
    } else {
      // 다이얼로그 닫기 전 지연
      timeoutRef.current = setTimeout(() => {
        setIsDialogOpen(false);
        setPassword("");
      }, 150);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isOpen, isMounted]);

  const handleLogin = useCallback(() => {
    if (!isMounted) return;
    
    try {
      console.log('🔍 Login attempt with password:', password ? '***' : 'empty');
      if (login(password)) {
        console.log('✅ Login successful');
        setPassword("");
        // 로그인 성공 후 지연을 두고 다이얼로그 닫기
        timeoutRef.current = setTimeout(() => {
          if (isMounted) {
            console.log('🔍 Closing dialog and setting admin mode');
            onClose();
            // Notify page to show admin controls
            if (typeof window !== 'undefined') {
              if (window.adminModeChange) {
                console.log('🔍 Calling adminModeChange(true)');
                window.adminModeChange(true);
              }
              try { 
                sessionStorage.setItem('admin-session-active', '1');
                console.log('✅ Session storage set');
              } catch (e) {
                console.error('❌ Session storage error:', e);
              }
            }
          }
        }, 200);
      } else {
        console.log('❌ Login failed - invalid password');
        alert("잘못된 관리자 비밀번호입니다.");
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      alert("로그인 중 오류가 발생했습니다.");
    }
  }, [login, password, onClose, isMounted]);

  const handleLogout = useCallback(() => {
    if (!isMounted) return;
    
    try {
      logout();
      // 로그아웃 후 지연을 두고 다이얼로그 닫기
      timeoutRef.current = setTimeout(() => {
        if (isMounted) {
          onClose();
          if (typeof window !== 'undefined') {
            if (window.adminModeChange) window.adminModeChange(false);
            try { sessionStorage.removeItem('admin-session-active'); } catch {}
          }
        }
      }, 200);
    } catch {
      // Logout error
    }
  }, [logout, onClose, isMounted]);

  const handleClose = useCallback(() => {
    if (!isMounted) return;
    
    // 다이얼로그 닫기 전 지연
    timeoutRef.current = setTimeout(() => {
      if (isMounted) {
        onClose();
      }
    }, 100);
  }, [onClose, isMounted]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && password.trim()) {
      handleLogin();
    }
  }, [handleLogin, password]);

  // 컴포넌트가 마운트되지 않았으면 렌더링하지 않음
  if (!isMounted) {
    return null;
  }

  return (
    <Dialog open={isDialogOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            {isAuthenticated ? "관리자 모드" : "관리자 인증"}
          </DialogTitle>
          <DialogDescription>
            {isAuthenticated 
              ? "현재 관리자 모드입니다. 앱을 업로드하고 수정할 수 있습니다."
              : "관리자 비밀번호를 입력하세요."
            }
          </DialogDescription>
        </DialogHeader>
        
        {!isAuthenticated ? (
          <div className="space-y-4">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="관리자 비밀번호"
              onKeyPress={handleKeyPress}
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-green-800">
                ✅ 관리자 권한이 활성화되었습니다.
              </p>
              <ul className="text-sm text-green-700 mt-2 space-y-1">
                <li>• 새 앱 업로드</li>
                <li>• 기존 앱 수정</li>
                <li>• 앱 삭제</li>
              </ul>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            닫기
          </Button>
          {!isAuthenticated ? (
            <Button onClick={handleLogin} disabled={!password.trim()}>
              로그인
            </Button>
          ) : (
            <Button variant="destructive" onClick={handleLogout}>
              로그아웃
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
