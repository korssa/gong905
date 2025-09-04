"use client";

/**
 * 차분하고 고급스러운 우측 흐름의 그라디언트 애니메이션 슬로건
 * Google Translate 허용, 번역 피드백 방지
 * 눈 내리는 효과와 자연스럽게 어우러지는 디자인
 */
export function GradientSlogan() {
  return (
    <div className="text-center mb-0 mt-0 overflow-hidden">
      <h2
        className="text-xl sm:text-2xl font-semibold tracking-wide italic animate-gradient-x bg-gradient-to-r from-white via-white to-amber-400 bg-[length:200%_100%] bg-clip-text text-transparent"
        style={{
          textShadow: '0 0 20px rgba(255, 255, 255, 0.3)',
        }}
        translate="yes"
      >
        We&apos;re just. that kind of group!
      </h2>
    </div>
  );
}