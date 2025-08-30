"use client";

import { useEffect } from 'react';

// Google Translate 타입 정의
interface GoogleTranslateOptions {
  pageLanguage: string;
  layout: string;
  multilanguagePage: boolean;
  autoDisplay: boolean;
}

interface GoogleTranslateElement {
  // Google Translate Element의 기본 구조
  translate?: () => void;
  restore?: () => void;
  getDisplayLanguage?: () => string;
  getOriginalLanguage?: () => string;
  isVisible?: () => boolean;
  showBanner?: () => void;
  hideBanner?: () => void;
  [key: string]: unknown; // 인덱스 시그니처로 모든 속성 허용
}

declare global {
  interface Window {
    googleTranslateElementInit?: () => void;
    google?: {
      translate?: {
        TranslateElement?: {
          new (options: GoogleTranslateOptions, element: string): GoogleTranslateElement;
          InlineLayout?: {
            HORIZONTAL?: string;
          };
        };
      };
    };
    adminModeChange?: (enabled: boolean) => void;
  }
}

export function GoogleTranslate() {
  useEffect(() => {
    // Google Translate 스크립트 동적 로드
    const script = document.createElement('script');
    script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    script.async = true;
    document.head.appendChild(script);

    // Google Translate 초기화 함수 정의
    window.googleTranslateElementInit = function() {
      // 구글 번역 위젯 초기화 시작
      
      try {
        const targetElement = document.getElementById('google_translate_element');
        if (!targetElement) {
          // google_translate_element를 찾을 수 없습니다
          return;
        }
        
        // 타겟 요소 찾음
        
        if (typeof window.google === 'undefined' || !window.google?.translate) {
          // Google Translate API가 로드되지 않았습니다
          return;
        }
        
        // Google Translate API 확인됨
        
        new window.google!.translate!.TranslateElement!({
          pageLanguage: 'ko',
          layout: window.google!.translate!.TranslateElement!.InlineLayout!.HORIZONTAL!,
          multilanguagePage: true,
          autoDisplay: false
        }, 'google_translate_element');
        
        // 구글 번역 위젯 생성 요청 완료
      } catch {
    // 번역 위젯 생성 실패
      }
    };

  // NOTE: admin mode is no longer checked automatically on load. Admin
  // toggles should be triggered explicitly via window.adminModeChange.

    // 번역기 완전 비활성화 함수
    function disableTranslateWidget() {
      try {
        // 번역기 완전 비활성화 시작
        
        // body에 admin-mode 클래스 추가
        document.body.classList.add('admin-mode');
        
        // 1단계: 번역 상태를 원래 언어로 강제 리셋
        const combo = document.querySelector('.goog-te-combo') as HTMLSelectElement;
        if (combo) {
          try {
            // 현재 번역 상태
            combo.value = '';
            combo.selectedIndex = 0;
            
            const event = new Event('change', { bubbles: true });
            combo.dispatchEvent(event);
            
            // 번역 상태 리셋 완료
          } catch {
            // 번역 리셋 에러
          }
        }
        
        // 2단계: 즉시 모든 Google Translate DOM 요소 완전 제거/숨김
        try {
          const allTranslateElements = document.querySelectorAll([
            '#google_translate_element',
            '.goog-te-gadget',
            '.skiptranslate', 
            '.goog-te-ftab',
            '.goog-te-balloon-frame',
            '.goog-tooltip',
            '.goog-te-spinner-pos',
            '.goog-te-banner-frame',
            '.goog-te-menu-frame',
            '.goog-te-menu2',
            'iframe[src*="translate.googleapis.com"]'
          ].join(','));
          
          // 즉시 제거할 번역 요소 개수
          
          allTranslateElements.forEach(function(el) {
            if (el && el.parentNode) {
              try {
                (el as HTMLElement).style.setProperty('display', 'none', 'important');
                (el as HTMLElement).style.setProperty('visibility', 'hidden', 'important');
                (el as HTMLElement).style.setProperty('opacity', '0', 'important');
                (el as HTMLElement).style.setProperty('pointer-events', 'none', 'important');
                (el as HTMLElement).style.setProperty('position', 'absolute', 'important');
                (el as HTMLElement).style.setProperty('top', '-9999px', 'important');
                (el as HTMLElement).style.setProperty('left', '-9999px', 'important');
                (el as HTMLElement).style.setProperty('width', '0', 'important');
                (el as HTMLElement).style.setProperty('height', '0', 'important');
              } catch {
                // 스타일 설정 실패는 무시
              }
            }
          });
          
          // 번역기 즉시 숨김 완료
        } catch {
          // 번역기 정리 에러
        }
        
        // 3단계: Google Translate API 완전 무력화
        try {
          if (typeof window.google !== 'undefined') {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (window.google as any).translate = {
              TranslateElement: function() {
                // 번역 엔진 차단됨 (관리자 모드)
                return null;
              },
              translate: function() { return null; },
              translatePage: function() { return null; }
            };
          }
          
          window.googleTranslateElementInit = function() {
            // 번역 초기화 차단됨 (관리자 모드)
          };
          
          document.documentElement.lang = 'ko';
          document.documentElement.setAttribute('translate', 'no');
          document.body.setAttribute('translate', 'no');
          
          // Google Translate API 완전 무력화 완료
        } catch {
          // Google Translate API 무력화 에러
        }
        
      } catch {
        // 번역기 비활성화 전체 에러
      }
    }

    // 번역기 안전 활성화 함수  
    function enableTranslateWidget() {
      try {
        document.body.classList.remove('admin-mode');
        
        // 번역 차단 속성 제거
        try {
          document.documentElement.className = document.documentElement.className.replace(' notranslate', '');
          document.documentElement.removeAttribute('translate');
          document.body.className = document.body.className.replace(' notranslate', '');
          document.body.removeAttribute('translate');
          
          const mainContainers = document.querySelectorAll('.notranslate');
          mainContainers.forEach(function(container) {
            try {
              if (!container.textContent || 
                  (!container.textContent.includes('GPT X GONGMYUNG.COM') && 
                   !container.textContent.includes('PRESENT') && 
                   !container.textContent.includes('© 2025 gongmyung.com') &&
                   !container.classList.contains('app-name-fixed') &&
                   !container.classList.contains('app-developer-fixed'))) {
                container.className = container.className.replace(' notranslate', '');
                container.removeAttribute('translate');
              }
            } catch {
              // 개별 제거 실패 무시
            }
          });
          
          } catch {
            // 번역 차단 해제 에러
          }
        
        // Google Translate API 복원
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (typeof window.google !== 'undefined' && (window.google as any).translate) {
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            delete (window.google as any).translate.TranslateElement;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            delete (window.google as any).translate.translate;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            delete (window.google as any).translate.translatePage;
          } catch {
            // Google Translate API 복원 에러
          }
        }
        
        // 위젯이 제거되었다면 재생성
        let widget = document.getElementById('google_translate_element');
        if (!widget) {
          const headerWidgetContainer = document.querySelector('header .translate-widget-horizontal');
          if (headerWidgetContainer) {
            headerWidgetContainer.id = 'google_translate_element';
            widget = headerWidgetContainer as HTMLElement;
          }
        }
        
        if (widget) {
          widget.style.display = '';
          widget.style.visibility = '';
          widget.style.opacity = '';
          widget.style.pointerEvents = '';
          widget.style.position = '';
          widget.style.top = '';
          widget.style.left = '';
          widget.style.width = '';
          widget.style.height = '';
          
          if (!widget.innerHTML.trim()) {
            setTimeout(function() {
              if (typeof window.googleTranslateElementInit === 'function') {
                window.googleTranslateElementInit();
              }
            }, 500);
          }
        }
        
        // 안전한 번역 요소들 복원 (피드백 요소 제외)
        setTimeout(function() {
          try {
            const coreTranslateElements = document.querySelectorAll([
              '.goog-te-gadget:not(.goog-te-ftab)',
              '.skiptranslate:not(.goog-te-balloon-frame)'
            ].join(','));
            
            coreTranslateElements.forEach(function(el) {
              try {
                if (el && document.contains(el)) {
                  (el as HTMLElement).style.display = '';
                  (el as HTMLElement).style.visibility = '';
                  (el as HTMLElement).style.opacity = '';
                  (el as HTMLElement).style.pointerEvents = '';
                }
              } catch {
                  // 개별 복원 실패는 무시
                }
            });
          } catch {
            // 번역 요소 복원 에러
          }
        }, 200);
      } catch {
        // 번역기 활성화 전체 에러
      }
    }

    // 관리자 모드 이벤트 핸들러
    function handleAdminModeChange(isAdminMode: boolean) {
      // 관리자 모드 변경 이벤트
      
      if (isAdminMode) {
        disableTranslateWidget();
        
        // Select 컴포넌트 정상 작동 보장
        setTimeout(function() {
          try {
            const selectElements = document.querySelectorAll([
              '[role="combobox"]',
              '[role="listbox"]',
              '[role="option"]',
              '[data-radix-select-content]',
              '[data-radix-select-item]',
              '[data-radix-select-trigger]',
              '[data-radix-select-viewport]',
              'select'
            ].join(','));
            
            selectElements.forEach(function(el) {
              try {
                (el as HTMLElement).style.setProperty('pointer-events', 'auto', 'important');
                (el as HTMLElement).style.setProperty('user-select', 'auto', 'important');
                (el as HTMLElement).style.setProperty('cursor', 'pointer', 'important');
                (el as HTMLElement).style.setProperty('transform', 'none', 'important');
                el.removeAttribute('translate');
                el.className = el.className.replace(' notranslate', '');
              } catch {
                  // 개별 복원 실패 무시
                }
            });
            

          } catch {
            // Select 복원 에러
          }
        }, 100);
        
        // 선택적 번역 차단 속성 설정 (Select 컴포넌트 제외)
        try {
          document.documentElement.setAttribute('translate', 'no');
          document.body.setAttribute('translate', 'no');
          
          const textContainers = document.querySelectorAll('p, span, h1, h2, h3, h4, h5, h6, li, td, th');
          textContainers.forEach(function(container) {
            try {
              if (!container.closest('[role="combobox"]') && 
                  !container.closest('[role="listbox"]') && 
                  !container.closest('[role="option"]') &&
                  !container.closest('[data-radix-select-content]') &&
                  !container.closest('[data-radix-select-item]') &&
                  !container.closest('[data-radix-select-trigger]')) {
                container.className += ' notranslate';
                container.setAttribute('translate', 'no');
              }
            } catch {
              // 개별 설정 실패 무시
            }
          });
          

        } catch {
          // 번역 차단 설정 에러
        }
        
        // 번역된 텍스트 즉시 복원
        setTimeout(function() {
          try {
            const translatedElements = document.querySelectorAll([
              'font[color="#444444"]',
              'font[style*="color: rgb(68, 68, 68)"]',
              'font[style*="background-color: rgb(255, 255, 255)"]',
              'span[style*="background-color: rgb(255, 255, 255)"]',
              '*[style*="background-color: rgb(255, 255, 255)"]'
            ].join(','));
            
            if (translatedElements.length > 0) {
              translatedElements.forEach(function(el) {
                try {
                  (el as HTMLElement).style.setProperty('color', '', 'important');
                  (el as HTMLElement).style.setProperty('background-color', '', 'important');
                  (el as HTMLElement).style.setProperty('font-size', '', 'important');
                  (el as HTMLElement).style.setProperty('font-family', '', 'important');
                  el.removeAttribute('color');
                } catch {
                  // 개별 리셋 실패는 무시
                }
              });
            }
          } catch {
            // 텍스트 복원 에러
          }
        }, 50);
        
      } else {
        enableTranslateWidget();
      }
    }

    // 전역 이벤트 리스너 등록
    window.adminModeChange = handleAdminModeChange;

    // 언어 매핑 및 피드백 차단 함수
    function startLanguageMapping() {
      try {
        // 구글 번역에서 실제 사용하는 언어 이름들
        const languageMap: { [key: string]: string } = {
          // 구글 번역에서 실제 사용하는 언어 이름들 (정확한 매칭)
          'Korean': 'Korea - 한국어',
          'English': 'USA - English',
          'Spanish': 'Spain - Español',
          'French': 'France - Français',
          'German': 'Germany - Deutsch',
          'Italian': 'Italy - Italiano',
          'Portuguese': 'Portugal - Português',
          'Russian': 'Russia - Русский',
          'Japanese': 'Japan - 日本語',
          'Chinese (Simplified)': 'China - 中文(简体)',
          'Chinese (Traditional)': 'Taiwan - 中文(繁體)',
          'Arabic': 'Saudi Arabia - العربية',
          'Hindi': 'India - हिन्दी',
          'Turkish': 'Turkey - Türkçe',
          'Dutch': 'Netherlands - Nederlands',
          'Polish': 'Poland - Polski',
          'Swedish': 'Sweden - Svenska',
          'Norwegian': 'Norway - Norsk',
          'Danish': 'Denmark - Dansk',
          'Finnish': 'Finland - Suomi',
          'Greek': 'Greece - Ελληνικά',
          'Czech': 'Czech Republic - Čeština',
          'Hungarian': 'Hungary - Magyar',
          'Romanian': 'Romania - Română',
          'Bulgarian': 'Bulgaria - Български',
          'Croatian': 'Croatia - Hrvatski',
          'Slovak': 'Slovakia - Slovenčina',
          'Slovenian': 'Slovenia - Slovenščina',
          'Estonian': 'Estonia - Eesti',
          'Latvian': 'Latvia - Latviešu',
          'Lithuanian': 'Lithuania - Lietuvių',
          'Ukrainian': 'Ukraine - Українська',
          'Vietnamese': 'Vietnam - Tiếng Việt',
          'Thai': 'Thailand - ไทย',
          'Indonesian': 'Indonesia - Bahasa Indonesia',
          'Malay': 'Malaysia - Bahasa Melayu',
          'Filipino': 'Philippines - Filipino',
          'Hebrew': 'Israel - עברית',
          'Persian': 'Iran - فارسی',
          'Urdu': 'Pakistan - اردو',
          'Bengali': 'Bangladesh - বাংলা',
          'Tamil': 'Tamil Nadu - தமிழ்',
          'Telugu': 'Andhra Pradesh - తెలుగు',
          'Gujarati': 'Gujarat - ગુજરાતી',
          'Kannada': 'Karnataka - ಕನ್ನಡ',
          'Malayalam': 'Kerala - മലയാളം',
          'Marathi': 'Maharashtra - मराठी',
          'Punjabi': 'Punjab - ਪੰਜਾਬੀ',
          'Nepali': 'Nepal - नेपाली',
          'Sinhala': 'Sri Lanka - සිංහල',
          'Myanmar (Burmese)': 'Myanmar - မြန်မာ',
          'Khmer': 'Cambodia - ខ្មែរ',
          'Lao': 'Laos - ລາວ',
          'Georgian': 'Georgia - ქართული',
          'Armenian': 'Armenia - Հայերեն',
          'Azerbaijani': 'Azerbaijan - Azərbaycan',
          'Kazakh': 'Kazakhstan - Қазақ',
          'Kyrgyz': 'Kyrgyzstan - Кыргыз',
          'Tajik': 'Tajikistan - Тоҷикӣ',
          'Turkmen': 'Turkmenistan - Türkmen',
          'Uzbek': 'Uzbekistan - O\'zbek',
          'Mongolian': 'Mongolia - Монгол',
          'Albanian': 'Albania - Shqip',
          'Basque': 'Basque Country - Euskera',
          'Catalan': 'Catalonia - Català',
          'Galician': 'Galicia - Galego',
          'Icelandic': 'Iceland - Íslenska',
          'Irish': 'Ireland - Gaeilge',
          'Welsh': 'Wales - Cymraeg',
          'Maltese': 'Malta - Malti',
          'Afrikaans': 'South Africa - Afrikaans',
          'Swahili': 'Kenya - Kiswahili',
          'Yoruba': 'Nigeria - Yorùbá',
          'Zulu': 'South Africa - isiZulu',
          'Xhosa': 'South Africa - isiXhosa',
          'Amharic': 'Ethiopia - አማርኛ',
          'Hausa': 'Nigeria - Hausa',
          'Igbo': 'Nigeria - Igbo',
          'Somali': 'Somalia - Soomaali',
          'Malagasy': 'Madagascar - Malagasy',
          
          // 구글 번역에서 사용하는 다른 형태의 언어 이름들
          'Korean (South Korea)': 'Korea - 한국어',
          'English (United States)': 'USA - English',
          'English (United Kingdom)': 'UK - English',
          'English (Canada)': 'Canada - English',
          'English (Australia)': 'Australia - English',
          'English (India)': 'India - English',
          'Spanish (Spain)': 'Spain - Español',
          'Spanish (Mexico)': 'Mexico - Español',
          'Spanish (Argentina)': 'Argentina - Español',
          'Spanish (Colombia)': 'Colombia - Español',
          'Spanish (Peru)': 'Peru - Español',
          'Spanish (Venezuela)': 'Venezuela - Español',
          'Spanish (Chile)': 'Chile - Español',
          'Spanish (Ecuador)': 'Ecuador - Español',
          'Spanish (Guatemala)': 'Guatemala - Español',
          'Spanish (Cuba)': 'Cuba - Español',
          'Spanish (Bolivia)': 'Bolivia - Español',
          'Spanish (Dominican Republic)': 'Dominican Republic - Español',
          'Spanish (Honduras)': 'Honduras - Español',
          'Spanish (Paraguay)': 'Paraguay - Español',
          'Spanish (El Salvador)': 'El Salvador - Español',
          'Spanish (Nicaragua)': 'Nicaragua - Español',
          'Spanish (Costa Rica)': 'Costa Rica - Español',
          'Spanish (Puerto Rico)': 'Puerto Rico - Español',
          'Spanish (Panama)': 'Panama - Español',
          'Spanish (Uruguay)': 'Uruguay - Español',
          'Spanish (Equatorial Guinea)': 'Equatorial Guinea - Español',
          'French (France)': 'France - Français',
          'French (Canada)': 'Canada - Français',
          'French (Belgium)': 'Belgium - Français',
          'French (Switzerland)': 'Switzerland - Français',
          'French (Luxembourg)': 'Luxembourg - Français',
          'French (Monaco)': 'Monaco - Français',
          'German (Germany)': 'Germany - Deutsch',
          'German (Austria)': 'Austria - Deutsch',
          'German (Switzerland)': 'Switzerland - Deutsch',
          'German (Luxembourg)': 'Luxembourg - Deutsch',
          'German (Liechtenstein)': 'Liechtenstein - Deutsch',
          'Italian (Italy)': 'Italy - Italiano',
          'Italian (Switzerland)': 'Switzerland - Italiano',
          'Italian (San Marino)': 'San Marino - Italiano',
          'Italian (Vatican City)': 'Vatican City - Italiano',
          'Portuguese (Portugal)': 'Portugal - Português',
          'Portuguese (Brazil)': 'Brazil - Português',
          'Portuguese (Angola)': 'Angola - Português',
          'Portuguese (Mozambique)': 'Mozambique - Português',
          'Portuguese (Cape Verde)': 'Cape Verde - Português',
          'Portuguese (Guinea-Bissau)': 'Guinea-Bissau - Português',
          'Portuguese (São Tomé and Príncipe)': 'São Tomé and Príncipe - Português',
          'Portuguese (East Timor)': 'East Timor - Português',
          'Portuguese (Macau)': 'Macau - Português',
          'Russian (Russia)': 'Russia - Русский',
          'Russian (Belarus)': 'Belarus - Русский',
          'Russian (Kazakhstan)': 'Kazakhstan - Русский',
          'Russian (Kyrgyzstan)': 'Kyrgyzstan - Русский',
          'Japanese (Japan)': 'Japan - 日本語',
          'Chinese (China)': 'China - 中文(简体)',
          'Chinese (Taiwan)': 'Taiwan - 中文(繁體)',
          'Chinese (Hong Kong)': 'Hong Kong - 中文(繁體)',
          'Chinese (Singapore)': 'Singapore - 中文(简体)',
          'Arabic (Saudi Arabia)': 'Saudi Arabia - العربية',
          'Arabic (Egypt)': 'Egypt - العربية',
          'Arabic (Iraq)': 'Iraq - العربية',
          'Arabic (Syria)': 'Syria - العربية',
          'Arabic (Lebanon)': 'Lebanon - العربية',
          'Arabic (Jordan)': 'Jordan - العربية',
          'Arabic (Palestine)': 'Palestine - العربية',
          'Arabic (Kuwait)': 'Kuwait - العربية',
          'Arabic (Bahrain)': 'Bahrain - العربية',
          'Arabic (Qatar)': 'Qatar - العربية',
          'Arabic (United Arab Emirates)': 'UAE - العربية',
          'Arabic (Oman)': 'Oman - العربية',
          'Arabic (Yemen)': 'Yemen - العربية',
          'Arabic (Libya)': 'Libya - العربية',
          'Arabic (Tunisia)': 'Tunisia - العربية',
          'Arabic (Algeria)': 'Algeria - العربية',
          'Arabic (Morocco)': 'Morocco - العربية',
          'Arabic (Sudan)': 'Sudan - العربية',
          'Arabic (South Sudan)': 'South Sudan - العربية',
          'Arabic (Chad)': 'Chad - العربية',
          'Arabic (Djibouti)': 'Djibouti - العربية',
          'Arabic (Comoros)': 'Comoros - العربية',
          'Arabic (Eritrea)': 'Eritrea - العربية',
          'Arabic (Somalia)': 'Somalia - العربية',
          'Arabic (Mauritania)': 'Mauritania - العربية',
          'Hindi (India)': 'India - हिन्दी',
          'Turkish (Turkey)': 'Turkey - Türkçe',
          'Turkish (Cyprus)': 'Cyprus - Türkçe',
          'Dutch (Netherlands)': 'Netherlands - Nederlands',
          'Dutch (Belgium)': 'Belgium - Nederlands',
          'Dutch (Suriname)': 'Suriname - Nederlands',
          'Polish (Poland)': 'Poland - Polski',
          'Swedish (Sweden)': 'Sweden - Svenska',
          'Swedish (Finland)': 'Finland - Svenska',
          'Norwegian (Norway)': 'Norway - Norsk',
          'Norwegian (Bokmål)': 'Norway - Norsk (Bokmål)',
          'Norwegian (Nynorsk)': 'Norway - Norsk (Nynorsk)',
          'Danish (Denmark)': 'Denmark - Dansk',
          'Finnish (Finland)': 'Finland - Suomi',
          'Greek (Greece)': 'Greece - Ελληνικά',
          'Greek (Cyprus)': 'Cyprus - Ελληνικά',
          'Czech (Czech Republic)': 'Czech Republic - Čeština',
          'Hungarian (Hungary)': 'Hungary - Magyar',
          'Romanian (Romania)': 'Romania - Română',
          'Romanian (Moldova)': 'Moldova - Română',
          'Bulgarian (Bulgaria)': 'Bulgaria - Български',
          'Croatian (Croatia)': 'Croatia - Hrvatski',
          'Croatian (Bosnia and Herzegovina)': 'Bosnia and Herzegovina - Hrvatski',
          'Slovak (Slovakia)': 'Slovakia - Slovenčina',
          'Slovenian (Slovenia)': 'Slovenia - Slovenščina',
          'Estonian (Estonia)': 'Estonia - Eesti',
          'Latvian (Latvia)': 'Latvia - Latviešu',
          'Lithuanian (Lithuania)': 'Lithuania - Lietuvių',
          'Ukrainian (Ukraine)': 'Ukraine - Українська',
          'Vietnamese (Vietnam)': 'Vietnam - Tiếng Việt',
          'Thai (Thailand)': 'Thailand - ไทย',
          'Indonesian (Indonesia)': 'Indonesia - Bahasa Indonesia',
          'Malay (Malaysia)': 'Malaysia - Bahasa Melayu',
          'Malay (Brunei)': 'Brunei - Bahasa Melayu',
          'Malay (Singapore)': 'Singapore - Bahasa Melayu',
          'Filipino (Philippines)': 'Philippines - Filipino',
          'Hebrew (Israel)': 'Israel - עברית',
          'Persian (Iran)': 'Iran - فارسی',
          'Persian (Afghanistan)': 'Afghanistan - فارسی',
          'Persian (Tajikistan)': 'Tajikistan - فارسی',
          'Urdu (Pakistan)': 'Pakistan - اردو',
          'Urdu (India)': 'India - اردو',
          'Bengali (Bangladesh)': 'Bangladesh - বাংলা',
          'Bengali (India)': 'India - বাংলা',
          'Tamil (India)': 'India - தமிழ்',
          'Tamil (Sri Lanka)': 'Sri Lanka - தமிழ்',
          'Tamil (Singapore)': 'Singapore - தமிழ்',
          'Tamil (Malaysia)': 'Malaysia - தமிழ்',
          'Telugu (India)': 'India - తెలుగు',
          'Gujarati (India)': 'India - ગુજરાતી',
          'Kannada (India)': 'India - ಕನ್ನಡ',
          'Malayalam (India)': 'India - മലയാളം',
          'Marathi (India)': 'India - मराठी',
          'Punjabi (India)': 'India - ਪੰਜਾਬੀ',
          'Punjabi (Pakistan)': 'Pakistan - پنجابی',
          'Nepali (Nepal)': 'Nepal - नेपाली',
          'Nepali (India)': 'India - नेपाली',
          'Sinhala (Sri Lanka)': 'Sri Lanka - සිංහල',
          'Myanmar (Myanmar)': 'Myanmar - မြန်မာ',
          'Khmer (Cambodia)': 'Cambodia - ខ្មែរ',
          'Lao (Laos)': 'Laos - ລາວ',
          'Georgian (Georgia)': 'Georgia - ქართული',
          'Armenian (Armenia)': 'Armenia - Հայերեն',
          'Azerbaijani (Azerbaijan)': 'Azerbaijan - Azərbaycan',
          'Azerbaijani (Iran)': 'Iran - آذربایجان',
          'Kazakh (Kazakhstan)': 'Kazakhstan - Қазақ',
          'Kazakh (China)': 'China - Қазақ',
          'Kyrgyz (Kyrgyzstan)': 'Kyrgyzstan - Кыргыз',
          'Kyrgyz (China)': 'China - Кыргыз',
          'Tajik (Tajikistan)': 'Tajikistan - Тоҷикӣ',
          'Turkmen (Turkmenistan)': 'Turkmenistan - Türkmen',
          'Uzbek (Uzbekistan)': 'Uzbekistan - O\'zbek',
          'Mongolian (Mongolia)': 'Mongolia - Монгол',
          'Mongolian (China)': 'China - Монгол',
          'Albanian (Albania)': 'Albania - Shqip',
          'Albanian (Kosovo)': 'Kosovo - Shqip',
          'Albanian (North Macedonia)': 'North Macedonia - Shqip',
          'Basque (Spain)': 'Spain - Euskera',
          'Catalan (Spain)': 'Spain - Català',
          'Catalan (Andorra)': 'Andorra - Català',
          'Galician (Spain)': 'Spain - Galego',
          'Icelandic (Iceland)': 'Iceland - Íslenska',
          'Irish (Ireland)': 'Ireland - Gaeilge',
          'Welsh (United Kingdom)': 'Wales - Cymraeg',
          'Maltese (Malta)': 'Malta - Malti',
          'Afrikaans (South Africa)': 'South Africa - Afrikaans',
          'Afrikaans (Namibia)': 'Namibia - Afrikaans',
          'Swahili (Kenya)': 'Kenya - Kiswahili',
          'Swahili (Tanzania)': 'Tanzania - Kiswahili',
          'Swahili (Uganda)': 'Uganda - Kiswahili',
          'Yoruba (Nigeria)': 'Nigeria - Yorùbá',
          'Yoruba (Benin)': 'Benin - Yorùbá',
          'Zulu (South Africa)': 'South Africa - isiZulu',
          'Xhosa (South Africa)': 'South Africa - isiXhosa',
          'Amharic (Ethiopia)': 'Ethiopia - አማርኛ',
          'Hausa (Nigeria)': 'Nigeria - Hausa',
          'Hausa (Niger)': 'Niger - Hausa',
          'Hausa (Ghana)': 'Ghana - Hausa',
          'Hausa (Cameroon)': 'Cameroon - Hausa',
          'Hausa (Chad)': 'Chad - Hausa',
          'Hausa (Sudan)': 'Sudan - Hausa',
          'Igbo (Nigeria)': 'Nigeria - Igbo',
          'Somali (Somalia)': 'Somalia - Soomaali',
          'Somali (Ethiopia)': 'Ethiopia - Soomaali',
          'Somali (Kenya)': 'Kenya - Soomaali',
          'Somali (Djibouti)': 'Djibouti - Soomaali',
          'Malagasy (Madagascar)': 'Madagascar - Malagasy',
          
          // 구글 번역에서 사용하는 약어들도 매핑
          'ko': 'Korea - 한국어',
          'en': 'USA - English',
          'es': 'Spain - Español',
          'fr': 'France - Français',
          'de': 'Germany - Deutsch',
          'it': 'Italy - Italiano',
          'pt': 'Portugal - Português',
          'ru': 'Russia - Русский',
          'ja': 'Japan - 日本語',
          'zh': 'China - 中文(简体)',
          'zh-CN': 'China - 中文(简体)',
          'zh-TW': 'Taiwan - 中文(繁體)',
          'zh-HK': 'Hong Kong - 中文(繁體)',
          'ar': 'Saudi Arabia - العربية',
          'hi': 'India - हिन्दी',
          'tr': 'Turkey - Türkçe',
          'nl': 'Netherlands - Nederlands',
          'pl': 'Poland - Polski',
          'sv': 'Sweden - Svenska',
          'no': 'Norway - Norsk',
          'da': 'Denmark - Dansk',
          'fi': 'Finland - Suomi',
          'el': 'Greece - Ελληνικά',
          'cs': 'Czech Republic - Čeština',
          'hu': 'Hungary - Magyar',
          'ro': 'Romania - Română',
          'bg': 'Bulgaria - Български',
          'hr': 'Croatia - Hrvatski',
          'sk': 'Slovakia - Slovenčina',
          'sl': 'Slovenia - Slovenščina',
          'et': 'Estonia - Eesti',
          'lv': 'Latvia - Latviešu',
          'lt': 'Lithuania - Lietuvių',
          'uk': 'Ukraine - Українська',
          'vi': 'Vietnam - Tiếng Việt',
          'th': 'Thailand - ไทย',
          'id': 'Indonesia - Bahasa Indonesia',
          'ms': 'Malaysia - Bahasa Melayu',
          'tl': 'Philippines - Filipino',
          'he': 'Israel - עברית',
          'fa': 'Iran - فارسی',
          'ur': 'Pakistan - اردو',
          'bn': 'Bangladesh - বাংলা',
          'ta': 'Tamil Nadu - தமிழ்',
          'te': 'Andhra Pradesh - తెలుగు',
          'gu': 'Gujarat - ગુજરાતી',
          'kn': 'Karnataka - ಕನ್ನಡ',
          'ml': 'Kerala - മലയാളം',
          'mr': 'Maharashtra - मराठी',
          'pa': 'Punjab - ਪੰਜਾਬੀ',
          'ne': 'Nepal - नेपाली',
          'si': 'Sri Lanka - සිංහල',
          'my': 'Myanmar - မြန်မာ',
          'km': 'Cambodia - ខ្មែរ',
          'lo': 'Laos - ລາວ',
          'ka': 'Georgia - ქართული',
          'hy': 'Armenia - Հայերեն',
          'az': 'Azerbaijan - Azərbaycan',
          'kk': 'Kazakhstan - Қазақ',
          'ky': 'Kyrgyzstan - Кыргыз',
          'tg': 'Tajikistan - Тоҷикӣ',
          'tk': 'Turkmenistan - Türkmen',
          'uz': 'Uzbekistan - O\'zbek',
          'mn': 'Mongolia - Монгол',
          'sq': 'Albania - Shqip',
          'eu': 'Basque Country - Euskera',
          'ca': 'Catalonia - Català',
          'gl': 'Galicia - Galego',
          'is': 'Iceland - Íslenska',
          'ga': 'Ireland - Gaeilge',
          'cy': 'Wales - Cymraeg',
          'mt': 'Malta - Malti',
          'af': 'South Africa - Afrikaans',
          'sw': 'Kenya - Kiswahili',
          'yo': 'Nigeria - Yorùbá',
          'zu': 'South Africa - isiZulu',
          'xh': 'South Africa - isiXhosa',
          'am': 'Ethiopia - አማርኛ',
          'ha': 'Nigeria - Hausa',
          'ig': 'Nigeria - Igbo',
          'so': 'Somalia - Soomaali',
          'mg': 'Madagascar - Malagasy'
        };
        
        // 안전한 피드백 차단 함수
        function hideFeedbackElements() {
          try {
            const feedbackSelectors = [
              '.goog-te-balloon-frame',
              '.goog-te-ftab',
              '.goog-te-ftab-float',
              '.goog-tooltip',
              '.goog-tooltip-popup',
              '.goog-te-banner-frame',
              '.goog-te-spinner-pos'
            ];
            
            feedbackSelectors.forEach(function(selector) {
              try {
                document.querySelectorAll(selector).forEach(function(el) {
                  if (el && document.contains(el)) {
                    (el as HTMLElement).style.display = 'none';
                    (el as HTMLElement).style.visibility = 'hidden';
                    (el as HTMLElement).style.opacity = '0';
                  }
                });
              } catch {
                // 개별 선택자 에러 무시
              }
            });
          } catch {
            // 전체 함수 에러 무시
          }
        }
        
        // 언어 옵션 업데이트 함수 개선
        function updateLanguageOptions() {
          try {
            const combo = document.querySelector('.goog-te-combo') as HTMLSelectElement;
            if (combo && combo.options) {
              let updatedCount = 0;
              Array.from(combo.options).forEach(function(option, index) {
                const text = option.text;
                
                if (text && !(option as HTMLOptionElement).dataset.updated) {
                  // 정확한 매칭 시도
                  if (languageMap[text]) {
                    option.text = languageMap[text];
                    (option as HTMLOptionElement).dataset.updated = 'true';
                    updatedCount++;
                  } else {
                    // 부분 매칭 시도 (언어 코드나 약어)
                    const lowerText = text.toLowerCase();
                    for (const [key, value] of Object.entries(languageMap)) {
                      if (key.toLowerCase().includes(lowerText) || 
                          lowerText.includes(key.toLowerCase()) ||
                          key.toLowerCase().startsWith(lowerText) ||
                          lowerText.startsWith(key.toLowerCase())) {
                        option.text = value;
                        (option as HTMLOptionElement).dataset.updated = 'true';
                        updatedCount++;
                        break;
                      }
                    }
                  }
                }
              });
            }
          } catch (error) {
            // 에러 무시
          }
        }
        
        // 강제 언어 옵션 업데이트 (모든 옵션을 다시 매핑)
        function forceUpdateLanguageOptions() {
          try {
            const combo = document.querySelector('.goog-te-combo') as HTMLSelectElement;
            if (combo && combo.options) {
              let updatedCount = 0;
              Array.from(combo.options).forEach(function(option, index) {
                const text = option.text;
                
                if (text) {
                  // 기존 업데이트 플래그 제거
                  delete (option as HTMLOptionElement).dataset.updated;
                  
                  // 정확한 매칭 시도
                  if (languageMap[text]) {
                    option.text = languageMap[text];
                    (option as HTMLOptionElement).dataset.updated = 'true';
                    updatedCount++;
                  } else {
                    // 부분 매칭 시도
                    const lowerText = text.toLowerCase();
                    for (const [key, value] of Object.entries(languageMap)) {
                      if (key.toLowerCase().includes(lowerText) || 
                          lowerText.includes(key.toLowerCase()) ||
                          key.toLowerCase().startsWith(lowerText) ||
                          lowerText.startsWith(key.toLowerCase())) {
                        option.text = value;
                        (option as HTMLOptionElement).dataset.updated = 'true';
                        updatedCount++;
                        break;
                      }
                    }
                  }
                }
              });
            }
          } catch (error) {
            // 에러 무시
          }
        }
        
        // 초기 업데이트 (더 빠른 실행)
        setTimeout(() => {
          updateLanguageOptions();
          hideFeedbackElements();
        }, 500);
        
        // 추가 업데이트 (위젯이 늦게 로드되는 경우 대비)
        setTimeout(() => {
          forceUpdateLanguageOptions();
          hideFeedbackElements();
        }, 2000);
        
        // 추가 업데이트 (위젯이 완전히 로드된 후)
        setTimeout(() => {
          forceUpdateLanguageOptions();
          hideFeedbackElements();
        }, 5000);
        
        // 주기적 피드백 차단 및 언어 옵션 업데이트
        setInterval(() => {
          hideFeedbackElements();
          updateLanguageOptions();
        }, 3000);
        
        // 클릭 이벤트 시 피드백 차단 및 언어 옵션 업데이트
        document.addEventListener('click', function(e) {
          if (e.target && (e.target as Element).closest('.goog-te-combo, .goog-te-menu2')) {
            setTimeout(() => {
              hideFeedbackElements();
              forceUpdateLanguageOptions();
            }, 200);
          }
        });
        
        // MutationObserver를 사용하여 동적으로 추가되는 요소 감지
        const observer = new MutationObserver(function(mutations) {
          mutations.forEach(function(mutation) {
            if (mutation.type === 'childList') {
              mutation.addedNodes.forEach(function(node) {
                if (node.nodeType === Node.ELEMENT_NODE) {
                  const element = node as Element;
                  if (element.classList && 
                      (element.classList.contains('goog-te-combo') || 
                       element.classList.contains('goog-te-menu2'))) {
                    setTimeout(() => {
                      forceUpdateLanguageOptions();
                      hideFeedbackElements();
                    }, 100);
                  }
                }
              });
            }
          });
        });
        
        observer.observe(document.body, {
          childList: true,
          subtree: true
        });
        
              } catch (error) {
          // 에러 무시
        }
    }

    // 페이지 로드 후 위젯 확인 및 언어 매핑 시작
    window.addEventListener('load', function() {
      // NOTE: Do NOT auto-toggle admin mode on page load from localStorage.
      // Previously we called isAdminMode() here and automatically disabled
      // the translate widget for persisted admin sessions. That allowed
      // admin UI to appear for regular users if admin-storage persisted.
      // Now, we only register the handler and start language mapping; actual
      // admin toggles happen only via explicit calls to window.adminModeChange().

      // 구글 번역 위젯 로드 확인 및 언어 매핑 시작
      function checkAndStartLanguageMapping() {
        const combo = document.querySelector('.goog-te-combo');
        if (combo && (combo as HTMLSelectElement).options && (combo as HTMLSelectElement).options.length > 1) {
          startLanguageMapping();
          // ensure translate widget is ready (do not force admin behavior)
          enableTranslateWidget();
          return true;
        }
        return false;
      }

              // 즉시 확인
        if (!checkAndStartLanguageMapping()) {
          // 위젯이 아직 로드되지 않았다면 주기적으로 확인
          let attempts = 0;
          const maxAttempts = 20; // 최대 10초 대기
          
          const checkInterval = setInterval(() => {
            attempts++;
            
            if (checkAndStartLanguageMapping()) {
              clearInterval(checkInterval);
            } else if (attempts >= maxAttempts) {
              clearInterval(checkInterval);
            }
          }, 500);
        }
    });

    return () => {
      // 클린업: 스크립트 제거
      const existingScript = document.querySelector('script[src*="translate.google.com"]');
      if (existingScript) {
        document.head.removeChild(existingScript);
      }
    };
  }, []);

  return null; // 이 컴포넌트는 UI를 렌더링하지 않음
}
