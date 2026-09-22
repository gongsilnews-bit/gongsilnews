"use client";

import React, { useEffect, useRef, useState } from "react";
import { heroSlides, youtubeId, type HeroSlide, type Theme } from "../theme";

interface Props {
  officeName: string;
  theme: Theme;
  cfg: any;
  onCta: () => void;
}

/** 사진은 6초, 영상은 14초 뒤에 다음 장으로. 영상을 6초 만에 끊으면 본 것도 안 본 것도 아니다 */
const PHOTO_MS = 6000;
const VIDEO_MS = 14000;

/**
 * 첫 화면 — 최대 3장 슬라이드.
 *
 * 장면마다 사진이나 유튜브를 깔고 문구를 따로 얹는다. 배경을 어둡게 덮는 것은
 * 사진이 밝든 어둡든 흰 글씨가 읽혀야 하기 때문이다. 아무것도 안 올린 중개사는
 * 예전처럼 테마 색 단색으로 떨어진다 — 빈 회색 칸을 보이는 것보다 낫다.
 *
 * 유튜브는 음소거로 자동재생한다. 브라우저가 소리 있는 자동재생을 막기 때문이고,
 * 소리를 듣고 싶은 사람은 우측 아래 버튼을 누른다.
 *
 * 문구는 편집기에 적힌 그대로만 그린다. 비어 있으면 그 줄은 없다 — 여기서 기본
 * 문구로 되돌리면 중개사가 지워도 계속 살아나서 지울 방법이 없어진다.
 */
export default function HeroSection({ officeName, theme, cfg, onCta }: Props) {
  const slides: HeroSlide[] = heroSlides(cfg);
  const [idx, setIdx] = useState(0);
  const [muted, setMuted] = useState(true);
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const touchX = useRef<number | null>(null);

  const current = slides[Math.min(idx, slides.length - 1)] || {};
  const currentVid = youtubeId(current.youtube);

  // 자동 넘김. 장이 한 장뿐이면 돌릴 것이 없다.
  useEffect(() => {
    if (slides.length < 2) return;
    const t = setTimeout(() => setIdx((i) => (i + 1) % slides.length), currentVid ? VIDEO_MS : PHOTO_MS);
    return () => clearTimeout(t);
  }, [idx, slides.length, currentVid]);

  // 장이 바뀌면 다시 음소거로 돌아간다. 넘어간 장에서 갑자기 소리가 나면 놀란다.
  useEffect(() => {
    setMuted(true);
  }, [idx]);

  const toggleSound = () => {
    const win = frameRef.current?.contentWindow;
    if (!win) return;
    const func = muted ? "unMute" : "mute";
    win.postMessage(JSON.stringify({ event: "command", func, args: [] }), "*");
    setMuted(!muted);
  };

  const go = (next: number) => setIdx((next + slides.length) % slides.length);

  const onTouchStart = (e: React.TouchEvent) => {
    touchX.current = e.touches[0]?.clientX ?? null;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current == null || slides.length < 2) return;
    const dx = (e.changedTouches[0]?.clientX ?? 0) - touchX.current;
    if (Math.abs(dx) > 45) go(idx + (dx < 0 ? 1 : -1));
    touchX.current = null;
  };

  return (
    <section
      id="top"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      style={{
        position: "relative",
        minHeight: "min(82vh, 640px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "72px 20px 64px",
        textAlign: "center",
        background: theme.dark,
        overflow: "hidden",
      }}
    >
      {/* 배경 — 사진은 겹쳐두고 투명도로 바꾼다. 영상은 보고 있는 장만 심는다 */}
      {slides.map((s, i) => {
        const vid = youtubeId(s.youtube);
        const on = i === idx;
        if (vid) {
          return on ? (
            <span
              key={i}
              aria-hidden
              style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}
            >
              <iframe
                ref={frameRef}
                title=""
                src={`https://www.youtube.com/embed/${vid}?autoplay=1&mute=1&loop=1&playlist=${vid}&controls=0&modestbranding=1&rel=0&playsinline=1&disablekb=1&fs=0&iv_load_policy=3&enablejsapi=1`}
                allow="autoplay; encrypted-media"
                frameBorder={0}
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  // 16:9 영상을 화면 가득 채운다. 둘 중 큰 쪽을 기준으로 잡아야 여백이 안 생긴다
                  width: "max(100%, 177.78vh)",
                  height: "max(100%, 56.25vw)",
                  transform: "translate(-50%, -50%)",
                  border: 0,
                }}
              />
            </span>
          ) : null;
        }
        if (!s.image) return null;
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src={s.image}
            alt=""
            aria-hidden={!on}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              opacity: on ? 1 : 0,
              transition: "opacity .6s ease",
            }}
          />
        );
      })}

      {(current.image || currentVid) && (
        <span
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background: `linear-gradient(180deg, rgba(0,0,0,0.42) 0%, rgba(0,0,0,0.58) 55%, ${theme.dark}e6 100%)`,
          }}
        />
      )}

      <div style={{ position: "relative", maxWidth: 720, width: "100%" }}>
        <p style={{ fontSize: 15, color: theme.secondary, fontWeight: 800, margin: "0 0 14px 0", letterSpacing: "0.5px" }}>
          {officeName}
        </p>

        {(current.title || current.highlight) && (
          <h1
            style={{
              fontSize: "clamp(30px, 8vw, 46px)",
              fontWeight: 900,
              lineHeight: 1.35,
              letterSpacing: "-1px",
              color: "#fff",
              margin: current.desc ? "0 0 18px 0" : "0 0 34px 0",
              wordBreak: "keep-all",
              textShadow: "0 2px 16px rgba(0,0,0,0.35)",
            }}
          >
            {current.title}
            {current.title && current.highlight && <br />}
            {current.highlight && <span style={{ color: theme.secondary }}>{current.highlight}</span>}
          </h1>
        )}

        {current.desc && (
          <p
            style={{
              fontSize: 16.5,
              lineHeight: 1.8,
              color: "rgba(255,255,255,0.86)",
              margin: "0 auto 34px",
              maxWidth: 520,
              wordBreak: "keep-all",
              textShadow: "0 1px 10px rgba(0,0,0,0.4)",
            }}
          >
            {current.desc}
          </p>
        )}

        <button
          type="button"
          onClick={onCta}
          style={{
            padding: "17px 42px",
            background: theme.primary,
            color: "#fff",
            border: "none",
            borderRadius: 999,
            fontSize: 17,
            fontWeight: 900,
            cursor: "pointer",
            boxShadow: `0 12px 30px ${theme.primary}66`,
          }}
        >
          {cfg?.cta_label || "1분이면 접수 끝"}
        </button>
      </div>

      {/* 장 넘기는 점 */}
      {slides.length > 1 && (
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 22, display: "flex", justifyContent: "center", gap: 8 }}>
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`${i + 1}번째 화면`}
              onClick={() => setIdx(i)}
              style={{
                width: i === idx ? 26 : 8,
                height: 8,
                padding: 0,
                borderRadius: 999,
                border: "none",
                background: i === idx ? theme.secondary : "rgba(255,255,255,0.45)",
                cursor: "pointer",
                transition: "width .25s",
              }}
            />
          ))}
        </div>
      )}

      {/* 소리 — 영상이 깔린 장에만 */}
      {currentVid && (
        <button
          type="button"
          onClick={toggleSound}
          aria-label={muted ? "소리 켜기" : "소리 끄기"}
          style={{
            position: "absolute",
            right: 16,
            bottom: 52,
            width: 42,
            height: 42,
            borderRadius: "50%",
            border: "1px solid rgba(255,255,255,0.35)",
            background: "rgba(0,0,0,0.42)",
            color: "#fff",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {muted ? (
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 5 6 9H2v6h4l5 4V5z" />
              <path d="M23 9l-6 6M17 9l6 6" />
            </svg>
          ) : (
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 5 6 9H2v6h4l5 4V5z" />
              <path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a9 9 0 0 1 0 14" />
            </svg>
          )}
        </button>
      )}
    </section>
  );
}
