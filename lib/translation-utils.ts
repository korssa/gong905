// 전역 변수로 MutationObserver와 타이머 관리
let feedbackBlockObserver: MutationObserver | null = null;
let feedbackBlockInterval: ReturnType<typeof setInterval> | null = null;

// 번역 피드백 차단 함수 (기본 버전)
export const blockTranslationFeedback = () => {
  try {
    const feedbackElements = document.querySelectorAll([
      '.goog-te-balloon-frame',
      '.goog-te-ftab',
      '.goog-te-ftab-float',
      '.goog-tooltip',
      '.goog-tooltip-popup',
      '.goog-te-banner-frame',
      '.goog-te-banner-frame-skiptranslate',
      '.goog-te-gadget',
      '.goog-te-combo',
      '.goog-te-menu-frame',
      '.goog-te-menu-value',
      '.goog-te-banner',
      '.goog-te-banner-frame',
      '.goog-te-banner-frame-skiptranslate',
      '.goog-te-banner-frame-skiptranslate-goog-inline-block',
      '[class*="goog-te-balloon"]',
      '[class*="goog-te-ftab"]',
      '[class*="goog-te-tooltip"]',
      '[class*="goog-te-banner"]',
      '[class*="goog-te-gadget"]',
      '[class*="goog-te-combo"]',
      '[class*="goog-te-menu"]',
      '[id*="goog-te"]',
      '[id*="goog-tooltip"]',
      '[id*="goog-balloon"]'
    ].join(','));

    feedbackElements.forEach(el => {
      (el as HTMLElement).style.display = 'none';
      (el as HTMLElement).style.visibility = 'hidden';
      (el as HTMLElement).style.opacity = '0';
      (el as HTMLElement).style.pointerEvents = 'none';
      (el as HTMLElement).style.position = 'absolute';
      (el as HTMLElement).style.left = '-9999px';
      (el as HTMLElement).style.top = '-9999px';
      (el as HTMLElement).style.zIndex = '-9999';
    });
  } catch {
    // 에러 무시
  }
};

// 강화된 번역 피드백 차단 시작 함수
export const startBlockingTranslationFeedback = () => {
  const blockNow = () => {
    try {
      const feedbackElements = document.querySelectorAll([
        '.goog-te-balloon-frame',
        '.goog-te-ftab',
        '.goog-te-ftab-float',
        '.goog-tooltip',
        '.goog-tooltip-popup',
        '.goog-te-banner-frame',
        '.goog-te-banner-frame-skiptranslate',
        '.goog-te-gadget',
        '.goog-te-combo',
        '.goog-te-menu-frame',
        '.goog-te-menu-value',
        '.goog-te-banner',
        '[class*="goog-te-"]',
        '[id*="goog-te"]',
        '[id*="goog-tooltip"]',
        '[id*="goog-balloon"]'
      ].join(','));

      feedbackElements.forEach(el => {
        const style = el as HTMLElement;
        style.style.display = 'none';
        style.style.visibility = 'hidden';
        style.style.opacity = '0';
        style.style.pointerEvents = 'none';
        style.style.position = 'absolute';
        style.style.left = '-9999px';
        style.style.top = '-9999px';
        style.style.zIndex = '-9999';
      });
    } catch (err) {
      console.warn('Error hiding translation feedback:', err);
    }
  };

  // 최초 실행
  blockNow();

  // 반복 감시 (1초마다)
  if (feedbackBlockInterval) clearInterval(feedbackBlockInterval);
  feedbackBlockInterval = setInterval(blockNow, 1000);

  // DOM 변경 감지 (추가적으로 대비)
  if (feedbackBlockObserver) feedbackBlockObserver.disconnect();
  feedbackBlockObserver = new MutationObserver(() => blockNow());
  feedbackBlockObserver.observe(document.body, {
    childList: true,
    subtree: true
  });
};

// 번역 피드백 차단 정지 함수
export const stopBlockingTranslationFeedback = () => {
  if (feedbackBlockInterval) {
    clearInterval(feedbackBlockInterval);
    feedbackBlockInterval = null;
  }
  if (feedbackBlockObserver) {
    feedbackBlockObserver.disconnect();
    feedbackBlockObserver = null;
  }
};

// 관리자 모드 버튼 클릭 핸들러 래퍼
export const createAdminButtonHandler = (handler: () => void) => {
  return () => {
    blockTranslationFeedback();
    handler();
  };
};

// 관리자 모드 버튼 이벤트 핸들러 래퍼
export const createAdminEventHandler = (handler: (event: React.MouseEvent) => void) => {
  return (event: React.MouseEvent) => {
    blockTranslationFeedback();
    handler(event);
  };
};

// 관리자 모드 폼 제출 핸들러 래퍼
export const createAdminFormHandler = (handler: (event: React.FormEvent) => void | Promise<void>) => {
  return async (event: React.FormEvent) => {
    blockTranslationFeedback();
    await handler(event);
  };
};

// 강화된 관리자 모드 핸들러들 (지속적 차단 사용)
export const createEnhancedAdminButtonHandler = (handler: () => void) => {
  return () => {
    startBlockingTranslationFeedback();
    handler();
  };
};

export const createEnhancedAdminEventHandler = (handler: (event: React.MouseEvent) => void) => {
  return (event: React.MouseEvent) => {
    startBlockingTranslationFeedback();
    handler(event);
  };
};

export const createEnhancedAdminFormHandler = (handler: (event: React.FormEvent) => void | Promise<void>) => {
  return async (event: React.FormEvent) => {
    startBlockingTranslationFeedback();
    await handler(event);
  };
};
