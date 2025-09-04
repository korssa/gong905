/**
 * GPT-쥐튀튀 직접 감정 주입 버전 슬로건 번역
 * 지정된 22개 언어는 고정 번역, 나머지는 Google Translate 허용
 */

export interface SloganTranslation {
  language: string;
  country: string;
  flag: string;
  translation: string;
  code: string; // 언어 코드
}

export const FIXED_SLOGAN_TRANSLATIONS: SloganTranslation[] = [
  {
    language: "English",
    country: "United States",
    flag: "🇺🇸",
    translation: "We're just. that kind of group!",
    code: "en"
  },
  {
    language: "Korean",
    country: "South Korea", 
    flag: "🇰🇷",
    translation: "우린 그런 집단이예요!",
    code: "ko"
  },
  {
    language: "Japanese",
    country: "Japan",
    flag: "🇯🇵", 
    translation: "僕たちはただの。そういう集団なんだ！",
    code: "ja"
  },
  {
    language: "Chinese (Simplified)",
    country: "China",
    flag: "🇨🇳",
    translation: "我们就是。那样的一群人！",
    code: "zh-CN"
  },
  {
    language: "Chinese (Traditional)", 
    country: "Taiwan",
    flag: "🇹🇼",
    translation: "我們就是。那樣的團體！",
    code: "zh-TW"
  },
  {
    language: "French",
    country: "France",
    flag: "🇫🇷",
    translation: "On est juste. ce genre de groupe !",
    code: "fr"
  },
  {
    language: "German",
    country: "Germany", 
    flag: "🇩🇪",
    translation: "Wir sind einfach. so eine Gruppe!",
    code: "de"
  },
  {
    language: "Spanish",
    country: "Spain",
    flag: "🇪🇸",
    translation: "Somos solo. ese tipo de grupo!",
    code: "es"
  },
  {
    language: "Italian",
    country: "Italy",
    flag: "🇮🇹",
    translation: "Siamo solo. quel tipo di gruppo!",
    code: "it"
  },
  {
    language: "Portuguese",
    country: "Portugal",
    flag: "🇵🇹", 
    translation: "Somos apenas. esse tipo de grupo!",
    code: "pt"
  },
  {
    language: "Russian",
    country: "Russia",
    flag: "🇷🇺",
    translation: "Мы просто. такая группа!",
    code: "ru"
  },
  {
    language: "Arabic",
    country: "Saudi Arabia",
    flag: "🇸🇦",
    translation: "نحن فقط. من هذا النوع من المجموعات!",
    code: "ar"
  },
  {
    language: "Hindi",
    country: "India",
    flag: "🇮🇳",
    translation: "हम बस हैं। ऐसे ही लोग!",
    code: "hi"
  },
  {
    language: "Vietnamese",
    country: "Vietnam",
    flag: "🇻🇳",
    translation: "Chúng tôi chỉ là. kiểu nhóm như vậy!",
    code: "vi"
  },
  {
    language: "Thai",
    country: "Thailand",
    flag: "🇹🇭",
    translation: "พวกเราแค่...กลุ่มแบบนั้น!",
    code: "th"
  },
  {
    language: "Indonesian",
    country: "Indonesia",
    flag: "🇮🇩",
    translation: "Kami cuma. kelompok yang seperti itu!",
    code: "id"
  },
  {
    language: "Dutch",
    country: "Netherlands",
    flag: "🇳🇱",
    translation: "We zijn gewoon. dat soort groep!",
    code: "nl"
  },
  {
    language: "Turkish",
    country: "Turkey",
    flag: "🇹🇷",
    translation: "Biz sadece. o tarz bir grubuz!",
    code: "tr"
  },
  {
    language: "Polish",
    country: "Poland",
    flag: "🇵🇱",
    translation: "Jesteśmy po prostu. takim rodzajem grupy!",
    code: "pl"
  },
  {
    language: "Swedish",
    country: "Sweden",
    flag: "🇸🇪",
    translation: "Vi är bara. den typen av grupp!",
    code: "sv"
  },
  {
    language: "Greek",
    country: "Greece",
    flag: "🇬🇷",
    translation: "Είμαστε απλώς. τέτοια ομάδα!",
    code: "el"
  },
  {
    language: "Hebrew",
    country: "Israel",
    flag: "🇮🇱",
    translation: "אנחנו פשוט. קבוצה כזו!",
    code: "he"
  }
];

/**
 * 언어 코드로 고정 번역 찾기
 */
export function getFixedTranslation(languageCode: string): SloganTranslation | null {
  return FIXED_SLOGAN_TRANSLATIONS.find(translation => 
    translation.code === languageCode ||
    translation.code === languageCode.split('-')[0] // en-US -> en
  ) || null;
}

/**
 * 고정 번역이 있는 언어인지 확인
 */
export function hasFixedTranslation(languageCode: string): boolean {
  return getFixedTranslation(languageCode) !== null;
}

/**
 * 사용자 언어 감지
 */
export function detectUserLanguage(): string {
  if (typeof window === 'undefined') return 'en';
  
  // 1. URL 파라미터 확인 (예: ?lang=ko)
  const urlParams = new URLSearchParams(window.location.search);
  const urlLang = urlParams.get('lang');
  if (urlLang) return urlLang;
  
  // 2. localStorage 확인
  const storedLang = localStorage.getItem('preferred-language');
  if (storedLang) return storedLang;
  
  // 3. 브라우저 언어 감지
  const browserLang = navigator.language || navigator.languages?.[0] || 'en';
  return browserLang;
}

/**
 * 언어 설정 저장
 */
export function saveLanguagePreference(languageCode: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('preferred-language', languageCode);
}
