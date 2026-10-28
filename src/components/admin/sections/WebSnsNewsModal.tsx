"use client";

import React from "react";

/**
 * 웹 공실관리 [SNS뉴스발행] 안내 창 (2026-10-26 사장님)
 * 기사 · SNS 글은 공실마케팅 앱의 뉴스·SNS발행에서 쓴다 — 회원 본인 AI(ChatGPT·Gemini)가 쓰므로 서버 AI 비용이 없다.
 * 웹에서 복사·붙여넣기로 쓰는 길은 만들었다가 없앴다 ("이렇게 쓰는 거 싫어" → "앱을 다운 받게").
 * 공실뉴스부동산은 앱에서 1주일에 3번 (src/utils/studioUsage.ts). "무료 체험"이라는 말은 쓰지 않는다.
 */

const ORANGE = "#ea580c";

export default function WebSnsNewsModal({ vacancyTitle, darkMode = false, onClose }: { vacancyId: string; vacancyTitle?: string; darkMode?: boolean; onClose: () => void }) {
  const bg = darkMode ? "#1f2023" : "#fff";
  const fg = darkMode ? "#e5e7eb" : "#111827";
  const sub = darkMode ? "#9ca3af" : "#6b7280";
  const line = darkMode ? "#3a3b40" : "#e5e7eb";
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 100000, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 520, background: bg, color: fg, borderRadius: 14, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "18px 22px", borderBottom: `1px solid ${line}` }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 800 }}>SNS뉴스발행</div>
            {vacancyTitle && <div style={{ fontSize: 13, color: sub, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{vacancyTitle}</div>}
          </div>
          <button type="button" onClick={onClose} aria-label="닫기" style={{ border: 0, background: "none", fontSize: 22, color: sub, cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: "28px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 15.5, lineHeight: 1.75 }}>
            SNS뉴스발행은 <b>공실마케팅 앱</b>에서 써요.<br />
            공실을 고르면 <b>공실뉴스 기사 · 블로그 · 인스타그램 · 스레드 · 페이스북</b> 글을<br />
            소장님의 AI(ChatGPT · Gemini)가 한 번에 채워요.
          </div>
          <div style={{ fontSize: 13.5, color: sub, marginTop: 10 }}>공실뉴스부동산 회원은 1주일에 3번 사용할 수 있습니다.</div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 22, flexWrap: "wrap" }}>
            <a href="/marketing#download" style={{ height: 46, padding: "0 24px", borderRadius: 8, background: ORANGE, color: "#fff", fontSize: 15, fontWeight: 800, textDecoration: "none", display: "inline-flex", alignItems: "center" }}>앱 받기</a>
            <a href="/marketing/feature/news" style={{ height: 46, padding: "0 20px", borderRadius: 8, border: `1px solid ${line}`, color: fg, fontSize: 15, fontWeight: 700, textDecoration: "none", display: "inline-flex", alignItems: "center" }}>자세히 보기</a>
          </div>
        </div>
      </div>
    </div>
  );
}
