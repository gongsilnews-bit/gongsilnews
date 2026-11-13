"use client";

import React from "react";

/**
 * 소리 없는 자동 재생 영상 — 휴대폰에서도 돌게 (2026-11-13 사장님: "모바일에서는 왜 동영상이 안나오는거야")
 *  - 화면 이동(Link)으로 그려진 <video> 는 React 가 muted 를 '속성'으로만 넣어, 휴대폰 브라우저가
 *    "소리 나는 영상"으로 보고 자동 재생을 막는다 → muted 를 태그에도 직접 박는다.
 *  - 화면에 보일 때 play() 를 다시 부르고, 안 보이면 멈춘다(휴대폰 데이터·배터리).
 *  - 절전 모드 등으로 끝내 막히면 표지 그림(poster)이 그대로 보인다.
 */
export default function AutoVideo(props: React.VideoHTMLAttributes<HTMLVideoElement>) {
  const ref = React.useRef<HTMLVideoElement>(null);

  React.useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.muted = true;
    v.defaultMuted = true;
    v.setAttribute("muted", "");
    v.setAttribute("playsinline", "");
    v.setAttribute("webkit-playsinline", "");
    const tryPlay = () => { const p = v.play(); if (p) p.catch(() => {}); };
    if (typeof IntersectionObserver === "undefined") { tryPlay(); return; }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) tryPlay();
      else v.pause();
    }, { threshold: 0.15 });
    io.observe(v);
    return () => io.disconnect();
  }, []);

  return <video ref={ref} autoPlay muted loop playsInline {...props} />;
}
