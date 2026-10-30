"use client";

import React from "react";
import StudioAppDownload from "./StudioAppDownload";

/**
 * 공실마케팅 새 메뉴(SNS뉴스발행·동영상제작)의 자리 화면
 * 기능이 들어가기 전까지 무엇이 될지 안내한다.
 * SNS뉴스발행은 앱 전용이라, 웹에서 열면 앱으로 안내한다.
 */
type Props = {
  theme: { cardBg: string; textPrimary: string; textSecondary: string; border: string };
  kind: "sns" | "video";
  isApp: boolean;
  onGoGongsil: () => void;
};

const COPY = {
  sns: {
    icon: "📣",
    title: "뉴스·SNS자동화",
    lead: "공실을 고르면 공실뉴스 기사·네이버 블로그·인스타그램·페이스북·스레드 글을 AI가 써서 채워 드립니다.",
    points: ["공실 하나 고르고 버튼 한 번", "블로그·SNS 글과 사진을 자동으로 채움", "마지막 [발행]만 소장님이 누름 (계정 안전)"],
  },
  video: {
    icon: "🎬",
    title: "동영상제작",
    lead: "등록한 공실 사진으로 20~30초 세로 릴스를 만듭니다.",
    points: ["공실 사진으로 클립 자동 구성", "AI 성우 목소리와 자막", "공인중개사법 표시 항목 자동 삽입"],
  },
};

export default function StudioComingSoon({ theme, kind, isApp, onGoGongsil }: Props) {
  const c = COPY[kind];
  const appOnly = !isApp; // 뉴스·SNS발행·동영상제작 모두 앱 전용 — 웹에서는 앱 받기 안내 (2026-10-23)

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: 28 }}>
      <div style={{ maxWidth: 720, margin: "0 auto", background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: 14, padding: "40px 36px" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>{c.icon}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: theme.textPrimary }}>{c.title}</h2>
          <span style={{ fontSize: 12, fontWeight: 800, padding: "3px 8px", borderRadius: 999, background: "#fef3c7", color: "#b45309" }}>준비 중</span>
        </div>
        <p style={{ margin: "0 0 20px", fontSize: 15, lineHeight: 1.7, color: theme.textSecondary, wordBreak: "keep-all" }}>{c.lead}</p>
        <ul style={{ margin: "0 0 26px", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
          {c.points.map((p) => (
            <li key={p} style={{ fontSize: 14, color: theme.textPrimary, display: "flex", gap: 8 }}>
              <span style={{ color: "#16a34a", fontWeight: 800 }}>✓</span>
              {p}
            </li>
          ))}
        </ul>

        {appOnly ? (
          <div style={{ padding: "16px 18px", borderRadius: 10, background: "#eff6ff", border: "1px solid #bfdbfe", fontSize: 14, lineHeight: 1.7, color: "#1e3a8a", wordBreak: "keep-all" }}>
            <b>공실마케팅(PC 앱)</b>에서 이용하는 기능입니다. 앱을 받아 설치해 주세요.
            <div style={{ marginTop: 12 }}><StudioAppDownload /></div>
          </div>
        ) : (
          <button onClick={onGoGongsil} style={{ padding: "12px 20px", background: "#1a3a6b", color: "#fff", border: 0, borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            공실등록으로 가기
          </button>
        )}
      </div>
    </div>
  );
}
