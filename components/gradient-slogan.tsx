"use client";

import { useState, useEffect } from 'react';
import { 
  FIXED_SLOGAN_TRANSLATIONS, 
  getFixedTranslation, 
  hasFixedTranslation, 
  detectUserLanguage,
  saveLanguagePreference,
  type SloganTranslation 
} from '@/lib/slogan-translations';

/**
 * 차분하고 고급스러운 우측 흐름의 그라디언트 애니메이션 슬로건
 * GPT-쥐튀튀 직접 감정 주입 버전: 22개 언어 고정 번역, 나머지는 Google Translate
 * 눈 내리는 효과와 자연스럽게 어우러지는 디자인
 */
export function GradientSlogan() {
  const [currentTranslation, setCurrentTranslation] = useState<SloganTranslation | null>(null);
  const [userLanguage, setUserLanguage] = useState<string>('en');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 사용자 언어 감지
    const detectedLang = detectUserLanguage();
    setUserLanguage(detectedLang);
    
    // 고정 번역이 있는지 확인
    const fixedTranslation = getFixedTranslation(detectedLang);
    if (fixedTranslation) {
      setCurrentTranslation(fixedTranslation);
      // 고정 번역이 있는 언어는 Google Translate 방지
      saveLanguagePreference(detectedLang);
    }
    
    setIsLoading(false);
  }, []);

  // 언어 변경 핸들러 (언어 선택 드롭다운용)
  const handleLanguageChange = (languageCode: string) => {
    const fixedTranslation = getFixedTranslation(languageCode);
    setCurrentTranslation(fixedTranslation);
    setUserLanguage(languageCode);
    saveLanguagePreference(languageCode);
  };

  // 표시할 텍스트 결정
  const getDisplayText = (): string => {
    if (isLoading) {
      return "We're just. That kind of group!";
    }
    
    if (currentTranslation) {
      return currentTranslation.translation;
    }
    
    // 고정 번역이 없는 언어는 원본 텍스트 (Google Translate가 번역)
    return "We're just. That kind of group!";
  };

  // Google Translate 허용 여부 결정
  const shouldAllowGoogleTranslate = (): boolean => {
    return !currentTranslation; // 고정 번역이 없으면 Google Translate 허용
  };

  return (
    <div className="text-center mb-1 mt-1 overflow-hidden">
      <h2
        className={`text-xl sm:text-2xl font-semibold tracking-wide italic animate-gradient-x bg-gradient-to-r from-white via-white to-amber-400 bg-[length:200%_100%] bg-clip-text text-transparent ${
          shouldAllowGoogleTranslate() ? '' : 'notranslate'
        }`}
        style={{
          textShadow: '0 0 20px rgba(255, 255, 255, 0.3)',
        }}
        translate={shouldAllowGoogleTranslate() ? 'yes' : 'no'}
      >
        {getDisplayText()}
      </h2>
      
      {/* 언어 선택 드롭다운 (개발/테스트용) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-2 text-xs text-gray-400">
          <select 
            value={userLanguage} 
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="bg-gray-800 text-white text-xs px-2 py-1 rounded"
          >
            <option value="en">🇺🇸 English</option>
            <option value="ko">🇰🇷 Korean</option>
            <option value="ja">🇯🇵 Japanese</option>
            <option value="zh-CN">🇨🇳 Chinese (Simplified)</option>
            <option value="zh-TW">🇹🇼 Chinese (Traditional)</option>
            <option value="fr">🇫🇷 French</option>
            <option value="de">🇩🇪 German</option>
            <option value="es">🇪🇸 Spanish</option>
            <option value="it">🇮🇹 Italian</option>
            <option value="pt">🇵🇹 Portuguese</option>
            <option value="ru">🇷🇺 Russian</option>
            <option value="ar">🇸🇦 Arabic</option>
            <option value="hi">🇮🇳 Hindi</option>
            <option value="vi">🇻🇳 Vietnamese</option>
            <option value="th">🇹🇭 Thai</option>
            <option value="id">🇮🇩 Indonesian</option>
            <option value="nl">🇳🇱 Dutch</option>
            <option value="tr">🇹🇷 Turkish</option>
            <option value="pl">🇵🇱 Polish</option>
            <option value="sv">🇸🇪 Swedish</option>
            <option value="el">🇬🇷 Greek</option>
            <option value="he">🇮🇱 Hebrew</option>
            <option value="auto">🌐 Auto (Google Translate)</option>
          </select>
          <span className="ml-2">
            {currentTranslation ? `고정 번역: ${currentTranslation.flag} ${currentTranslation.language}` : 'Google Translate 허용'}
          </span>
        </div>
      )}
    </div>
  );
}
