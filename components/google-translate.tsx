"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    googleTranslateElementInit?: () => void;
    google?: {
      translate?: {
        TranslateElement?: {
          new (
            options: {
              pageLanguage: string;
              layout: string;
              multilanguagePage: boolean;
              autoDisplay: boolean;
            },
            element: string
          ): unknown;
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
    const script = document.createElement("script");
    script.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    script.async = true;
    document.head.appendChild(script);

    window.googleTranslateElementInit = function () {
      const target = document.getElementById("google_translate_element");
      if (!target) return;

      if (typeof window.google === "undefined" || !window.google.translate || !window.google.translate.TranslateElement) return;

      new window.google.translate.TranslateElement(
        {
          pageLanguage: "ko",
          layout: window.google.translate.TranslateElement?.InlineLayout?.HORIZONTAL || 'horizontal',
          multilanguagePage: true,
          autoDisplay: false,
        },
        "google_translate_element"
      );
    };

         // 언어 매핑 + 피드백 제거
     function startLanguageMapping() {

                           function updateLanguageOptions() {
          try {
            const combo = document.querySelector(".goog-te-combo") as HTMLSelectElement;
            if (combo && combo.options) {
              Array.from(combo.options).forEach((option) => {
                                 const value = option.value.trim().split("|")[0].toLowerCase(); // 핵심: 파이프 제거 후 소문자로 정규화
                const langLabelMap: { [key: string]: string } = {
                  af: "South Africa - Afrikaans",
                  sq: "Albania - Shqip",
                  am: "Ethiopia - አማርኛ",
                  ar: "Saudi Arabia - العربية",
                  hy: "Armenia - Հայերեն",
                  az: "Azerbaijan - Azərbaycan dili",
                  eu: "Basque Country - Euskara",
                  be: "Belarus - Беларуская",
                  bn: "Bangladesh - বাংলা",
                  bs: "Bosnia - Bosanski",
                  bg: "Bulgaria - Български",
                  ca: "Catalonia - Català",
                  ceb: "Philippines - Cebuano",
                  zh: "China - 中文(简体)",
                  "zh-cn": "China - 中文(简体)",
                  "zh-tw": "Taiwan - 中文(繁體)",
                  hr: "Croatia - Hrvatski",
                  cs: "Czech Republic - Čeština",
                  da: "Denmark - Dansk",
                  nl: "Netherlands - Nederlands",
                  en: "USA - English",
                  eo: "Esperanto - Esperanto",
                  et: "Estonia - Eesti",
                  fi: "Finland - Suomi",
                  fr: "France - Français",
                  fy: "Netherlands - Frysk",
                  gl: "Spain - Galego",
                  ka: "Georgia - ქართული",
                  de: "Germany - Deutsch",
                  el: "Greece - Ελληνικά",
                  gu: "India - ગુજરાતી",
                  ht: "Haiti - Kreyòl ayisyen",
                  ha: "Nigeria - Hausa",
                  haw: "Hawaii - ʻŌlelo Hawaiʻi",
                  he: "Israel - עברית",
                  hi: "India - हिन्दी",
                  hmn: "Hmong - Hmoob",
                  hu: "Hungary - Magyar",
                  is: "Iceland - Íslenska",
                  ig: "Nigeria - Igbo",
                  id: "Indonesia - Bahasa Indonesia",
                  ga: "Ireland - Gaeilge",
                  it: "Italy - Italiano",
                  ja: "Japan - 日本語",
                  jv: "Indonesia - Jawa",
                  kn: "India - ಕನ್ನಡ",
                  kk: "Kazakhstan - Қазақ тілі",
                  km: "Cambodia - ភាសាខ្មែរ",
                  rw: "Rwanda - Kinyarwanda",
                  ko: "Korea - 한국어",
                  ku: "Kurdistan - Kurdî",
                  ky: "Kyrgyzstan - Кыргызча",
                  lo: "Laos - ລາວ",
                  la: "Ancient Rome - Latina",
                  lv: "Latvia - Latviešu",
                  lt: "Lithuania - Lietuvių",
                  lb: "Luxembourg - Lëtzebuergesch",
                  mk: "North Macedonia - Македонски",
                  mg: "Madagascar - Malagasy",
                  ms: "Malaysia - Bahasa Melayu",
                  ml: "India - മലയാളം",
                  mt: "Malta - Malti",
                  mi: "New Zealand - Māori",
                  mr: "India - मराठी",
                  mn: "Mongolia - Монгол",
                  my: "Myanmar - မြန်မာစာ",
                  ne: "Nepal - नेपाली",
                  no: "Norway - Norsk",
                  ny: "Malawi - Nyanja",
                  or: "India - ଓଡ଼ିଆ",
                  ps: "Afghanistan - پښتو",
                  fa: "Iran - فارسی",
                  pl: "Poland - Polski",
                  pt: "Portugal - Português",
                  "pt-br": "Brazil - Português (BR)",
                  pa: "India - ਪੰਜਾਬੀ",
                  ro: "Romania - Română",
                  ru: "Russia - Русский",
                  sm: "Samoa - Gagana Samoa",
                  gd: "Scotland - Gàidhlig",
                  sr: "Serbia - Српски",
                  st: "Lesotho - Sesotho",
                  sn: "Zimbabwe - Shona",
                  sd: "Pakistan - سنڌي",
                  si: "Sri Lanka - සිංහල",
                  sk: "Slovakia - Slovenčina",
                  sl: "Slovenia - Slovenščina",
                  so: "Somalia - Soomaali",
                  es: "Spain - Español",
                  su: "Indonesia - Basa Sunda",
                  sw: "East Africa - Kiswahili",
                  sv: "Sweden - Svenska",
                  tl: "Philippines - Tagalog",
                  tg: "Tajikistan - Тоҷикӣ",
                  ta: "India - தமிழ்",
                  tt: "Tatarstan - Татар",
                  te: "India - తెలుగు",
                  th: "Thailand - ไทย",
                  tr: "Turkey - Türkçe",
                  tk: "Turkmenistan - Türkmençe",
                  uk: "Ukraine - Українська",
                  ur: "Pakistan - اردو",
                  ug: "Xinjiang - ئۇيغۇرچە",
                  uz: "Uzbekistan - Oʻzbekcha",
                  vi: "Vietnam - Tiếng Việt",
                  cy: "Wales - Cymraeg",
                  xh: "South Africa - isiXhosa",
                  yi: "Ashkenazi - ייִדיש",
                  yo: "Nigeria - Yorùbá",
                  zu: "South Africa - isiZulu",
                };

                if (langLabelMap[value] && !option.dataset.updated) {
                  option.text = langLabelMap[value];
                  option.dataset.updated = "true";
                }
              });
            }
              } catch (e) {
      // Language mapping failed
    }
        }

      function hideFeedbackElements() {
        const feedbackSelectors = [
          ".goog-te-balloon-frame",
          ".goog-te-ftab",
          ".goog-te-ftab-float",
          ".goog-tooltip",
          ".goog-tooltip-popup",
          ".goog-te-banner-frame",
          ".goog-te-spinner-pos",
        ];
        feedbackSelectors.forEach((selector) => {
          document.querySelectorAll(selector).forEach((el) => {
            (el as HTMLElement).style.display = "none";
            (el as HTMLElement).style.visibility = "hidden";
            (el as HTMLElement).style.opacity = "0";
          });
        });
      }

             // 언어 선택 시에만 실행
       const combo = document.querySelector(".goog-te-combo") as HTMLSelectElement;
       if (combo) {
         // 초기 1회 즉시 적용
         updateLanguageOptions();
         hideFeedbackElements();

         // 이후 사용자가 바꿀 때마다 적용
         combo.addEventListener("change", () => {
           updateLanguageOptions();
           hideFeedbackElements();
           
           // 번역 완료 후 위젯 숨김 (완전 제거 대신 시각만 숨김)
           setTimeout(() => {
             const el = document.getElementById("google_translate_element");
             if (el) el.style.opacity = "0";
           }, 1000);
         });
       }
    }

    function handleAdminModeChange(enabled: boolean) {
      if (enabled) {
        try {
          document.documentElement.setAttribute("translate", "no");
          document.body.setAttribute("translate", "no");

          const elements = document.querySelectorAll(".goog-te-combo, .goog-te-gadget, .skiptranslate, iframe[src*='translate']");
          elements.forEach((el) => {
            const e = el as HTMLElement;
            e.style.display = "none";
            e.style.visibility = "hidden";
            e.style.opacity = "0";
            e.style.pointerEvents = "none";
          });

          if (window.google) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (window.google as any).translate = {
              TranslateElement: function () {
                return null;
              },
            };
          }
        } catch {}
      } else {
        try {
          document.documentElement.removeAttribute("translate");
          document.body.removeAttribute("translate");

          const elements = document.querySelectorAll(".goog-te-combo, .goog-te-gadget, .skiptranslate");
          elements.forEach((el) => {
            const e = el as HTMLElement;
            e.style.display = "";
            e.style.visibility = "";
            e.style.opacity = "";
            e.style.pointerEvents = "";
          });

          setTimeout(() => {
            if (typeof window.googleTranslateElementInit === "function") {
              window.googleTranslateElementInit();
            }
          }, 500);
        } catch {}
      }
    }

    window.adminModeChange = handleAdminModeChange;

    // 위젯 로드 후 언어 매핑 설정 (더 확실하게)
    function initializeLanguageMapping() {
      const combo = document.querySelector(".goog-te-combo") as HTMLSelectElement;
      if (combo && combo.options.length > 1) {
        startLanguageMapping();
        return true;
      }
      return false;
    }

    // 위젯 로드 감지 및 언어 매핑 초기화
    const checkAndInitialize = () => {
      if (initializeLanguageMapping()) {
        return; // 성공하면 종료
      }
      
      // 실패하면 다시 시도
      setTimeout(checkAndInitialize, 1000);
    };

    // 페이지 로드 후 시작
    window.addEventListener("load", () => {
      setTimeout(checkAndInitialize, 1000);
    });

    // DOM 변경 감지 (MutationObserver 사용)
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              if (element.querySelector && element.querySelector('.goog-te-combo')) {
                setTimeout(initializeLanguageMapping, 100);
              }
            }
          });
        }
      });
    });

    // DOM 변경 감지 시작
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    return () => {
      const existingScript = document.querySelector('script[src*="translate.google.com"]');
      if (existingScript) document.head.removeChild(existingScript);
      
      // observer 정리
      observer.disconnect();
    };
  }, []);

  return (
    <div
      id="google_translate_element"
      style={{ position: "fixed", top: 0, right: 0, zIndex: 9999, opacity: 0, pointerEvents: "none" }}
    />
  );
}
