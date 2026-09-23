"use client";

import React from "react";
import type { Theme } from "../theme";

/**
 * 누르고 나서 새 화면이 뜰 때까지 덮어두는 막.
 *
 * 폰에서는 기사·매물을 같은 탭에서 연다(뒤로가기로 홈페이지에 돌아와야 하므로).
 * 그런데 그건 전체 새로고침이라 Next 의 loading.tsx 가 걸리지 않는다. 눌러도
 * 한동안 아무 일이 없어 고장 난 줄 알고 다시 누르게 된다.
 *
 * 그래서 누르는 즉시 이 막을 덮는다. 빈 회색 네모로 다음 화면의 생김새를
 * 미리 그려두면, 기다리는 시간이 '멈춘 시간'이 아니라 '열리는 중'으로 읽힌다.
 */
export default function OpenVeil({
  show,
  variant,
  theme,
}: {
  show: boolean;
  /** article = 사진 + 제목 + 본문 줄, vacancy = 큰 사진 + 값 + 정보 줄 */
  variant: "article" | "vacancy";
  theme: Theme;
}) {
  if (!show) return null;

  const bar = (w: string, h = 14, mt = 10) => (
    <div className="gs-veil-bar" style={{ width: w, height: h, marginTop: mt, borderRadius: 5 }} />
  );

  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "#fff",
        padding: "18px 16px",
        overflow: "hidden",
      }}
    >
      <style>{`
        .gs-veil-bar, .gs-veil-box {
          background: linear-gradient(90deg, #eef1f4 25%, #e3e8ed 37%, #eef1f4 63%);
          background-size: 400% 100%;
          animation: gs-veil-shine 1.1s ease-in-out infinite;
        }
        @keyframes gs-veil-shine {
          0% { background-position: 100% 50%; }
          100% { background-position: 0 50%; }
        }
      `}</style>

      {/* 다음 화면의 생김새를 그대로 흉내 낸다 */}
      {variant === "article" ? (
        <>
          {bar("38%", 12, 6)}
          {bar("92%", 20, 14)}
          {bar("70%", 20, 8)}
          <div className="gs-veil-box" style={{ width: "100%", aspectRatio: "16/10", borderRadius: 8, marginTop: 18 }} />
          {bar("100%")}
          {bar("96%")}
          {bar("88%")}
        </>
      ) : (
        <>
          <div className="gs-veil-box" style={{ width: "100%", aspectRatio: "4/3", borderRadius: 8 }} />
          {bar("46%", 22, 16)}
          {bar("72%")}
          {bar("60%")}
          {bar("88%", 14, 18)}
        </>
      )}

      {/* 점 세 개. 무언가 돌고 있다는 신호는 글자보다 점이 빠르게 읽힌다 */}
      <div style={{ display: "flex", justifyContent: "center", gap: 7, marginTop: 26 }}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: theme.primary,
              opacity: 0.35,
              animation: `gs-veil-dot 1s ${i * 0.15}s infinite ease-in-out`,
            }}
          />
        ))}
      </div>
      <style>{`
        @keyframes gs-veil-dot {
          0%, 80%, 100% { opacity: .25; transform: translateY(0); }
          40% { opacity: 1; transform: translateY(-4px); }
        }
      `}</style>
    </div>
  );
}
