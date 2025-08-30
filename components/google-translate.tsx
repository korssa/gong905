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

      if (typeof window.google === "undefined" || !window.google.translate) return;

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
      const languageMap: { [key: string]: string } = {
        Afrikaans: "South Africa - Afrikaans",
        Albanian: "Albania - Shqip",
        Amharic: "Ethiopia - አማርኛ",
        Arabic: "Saudi Arabia - العربية",
        Armenian: "Armenia - Հայերեն",
        Azerbaijani: "Azerbaijan - Azərbaycan dili",
        Basque: "Basque Country - Euskara",
        Belarusian: "Belarus - Беларуская",
        Bengali: "Bangladesh - বাংলা",
        Bosnian: "Bosnia - Bosanski",
        Bulgarian: "Bulgaria - Български",
        Catalan: "Catalonia - Català",
        Cebuano: "Philippines - Cebuano",
        Chinese: "China - 中文(简体)",
        "Chinese (Simplified)": "China - 中文(简体)",
        "Chinese (Traditional)": "Taiwan - 中文(繁體)",
        Corsican: "Corsica - Corsu",
        Croatian: "Croatia - Hrvatski",
        Czech: "Czech Republic - Čeština",
        Danish: "Denmark - Dansk",
        Dutch: "Netherlands - Nederlands",
        English: "USA - English",
        Esperanto: "Esperanto - Esperanto",
        Estonian: "Estonia - Eesti",
        Finnish: "Finland - Suomi",
        French: "France - Français",
        Frisian: "Netherlands - Frysk",
        Galician: "Spain - Galego",
        Georgian: "Georgia - ქართული",
        German: "Germany - Deutsch",
        Greek: "Greece - Ελληνικά",
        Gujarati: "India - ગુજરાતી",
        "Haitian Creole": "Haiti - Kreyòl ayisyen",
        Hausa: "Nigeria - Hausa",
        Hawaiian: "Hawaii - ʻŌlelo Hawaiʻi",
        Hebrew: "Israel - עברית",
        Hindi: "India - हिन्दी",
        Hmong: "Hmong - Hmoob",
        Hungarian: "Hungary - Magyar",
        Icelandic: "Iceland - Íslenska",
        Igbo: "Nigeria - Igbo",
        Indonesian: "Indonesia - Bahasa Indonesia",
        Irish: "Ireland - Gaeilge",
        Italian: "Italy - Italiano",
        Japanese: "Japan - 日本語",
        Javanese: "Indonesia - Jawa",
        Kannada: "India - ಕನ್ನಡ",
        Kazakh: "Kazakhstan - Қазақ тілі",
        Khmer: "Cambodia - ភាសាខ្មែរ",
        Kinyarwanda: "Rwanda - Kinyarwanda",
        Korean: "Korea - 한국어",
        Kurdish: "Kurdistan - Kurdî",
        Kyrgyz: "Kyrgyzstan - Кыргызча",
        Lao: "Laos - ລາວ",
        Latin: "Ancient Rome - Latina",
        Latvian: "Latvia - Latviešu",
        Lithuanian: "Lithuania - Lietuvių",
        Luxembourgish: "Luxembourg - Lëtzebuergesch",
        Macedonian: "North Macedonia - Македонски",
        Malagasy: "Madagascar - Malagasy",
        Malay: "Malaysia - Bahasa Melayu",
        Malayalam: "India - മലയാളം",
        Maltese: "Malta - Malti",
        Maori: "New Zealand - Māori",
        Marathi: "India - मराठी",
        Mongolian: "Mongolia - Монгол",
        Myanmar: "Myanmar - မြန်မာစာ",
        Nepali: "Nepal - नेपाली",
        Norwegian: "Norway - Norsk",
        Nyanja: "Malawi - Nyanja",
        Odia: "India - ଓଡ଼ିଆ",
        Pashto: "Afghanistan - پښتو",
        Persian: "Iran - فارسی",
        Polish: "Poland - Polski",
        Portuguese: "Portugal - Português",
        Punjabi: "India - ਪੰਜਾਬੀ",
        Romanian: "Romania - Română",
        Russian: "Russia - Русский",
        Samoan: "Samoa - Gagana Samoa",
        "Scots Gaelic": "Scotland - Gàidhlig",
        Serbian: "Serbia - Српски",
        Sesotho: "Lesotho - Sesotho",
        Shona: "Zimbabwe - Shona",
        Sindhi: "Pakistan - سنڌي",
        Sinhala: "Sri Lanka - සිංහල",
        Slovak: "Slovakia - Slovenčina",
        Slovenian: "Slovenia - Slovenščina",
        Somali: "Somalia - Soomaali",
        Spanish: "Spain - Español",
        Sundanese: "Indonesia - Basa Sunda",
        Swahili: "East Africa - Kiswahili",
        Swedish: "Sweden - Svenska",
        Tagalog: "Philippines - Tagalog",
        Tajik: "Tajikistan - Тоҷикӣ",
        Tamil: "India - தமிழ்",
        Tatar: "Tatarstan - Татар",
        Telugu: "India - తెలుగు",
        Thai: "Thailand - ไทย",
        Turkish: "Turkey - Türkçe",
        Turkmen: "Turkmenistan - Türkmençe",
        Ukrainian: "Ukraine - Українська",
        Urdu: "Pakistan - اردو",
        Uyghur: "Xinjiang - ئۇيغۇرچە",
        Uzbek: "Uzbekistan - Oʻzbekcha",
        Vietnamese: "Vietnam - Tiếng Việt",
        Welsh: "Wales - Cymraeg",
        Xhosa: "South Africa - isiXhosa",
        Yiddish: "Ashkenazi - ייִדיש",
        Yoruba: "Nigeria - Yorùbá",
        Zulu: "South Africa - isiZulu",
      };

      function updateLanguageOptions() {
        try {
          const combo = document.querySelector(".goog-te-combo") as HTMLSelectElement;
          if (combo && combo.options) {
            Array.from(combo.options).forEach((option) => {
              const text = option.text.trim();
              const matchKey = Object.keys(languageMap).find(
                (key) => text.startsWith(key) || text.includes(key)
              );

              if (matchKey && !(option as HTMLOptionElement).dataset.updated) {
                option.text = languageMap[matchKey];
                (option as HTMLOptionElement).dataset.updated = "true";
              }
            });
          }
        } catch {}
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
        combo.addEventListener("change", () => {
          updateLanguageOptions();
          hideFeedbackElements();
          
          // 번역 완료 후 위젯 제거 (선택사항)
          setTimeout(() => {
            const el = document.getElementById("google_translate_element");
            if (el) el.style.display = "none";
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

    // 위젯 로드 후 한 번만 언어 매핑 설정
    window.addEventListener("load", () => {
      setTimeout(() => {
        const combo = document.querySelector(".goog-te-combo");
        if (combo && (combo as HTMLSelectElement).options.length > 1) {
          startLanguageMapping();
        } else {
          // 위젯이 아직 로드되지 않았다면 다시 시도
          setTimeout(() => {
            const combo = document.querySelector(".goog-te-combo");
            if (combo && (combo as HTMLSelectElement).options.length > 1) {
              startLanguageMapping();
            }
          }, 2000);
        }
      }, 2000);
    });

    return () => {
      const existingScript = document.querySelector('script[src*="translate.google.com"]');
      if (existingScript) document.head.removeChild(existingScript);
    };
  }, []);

  return null;
}
