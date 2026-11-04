"use client";
/** 사무소 SNS 동그라미 픽토그램 — 기사 아래 사무소 소개 상자(ArticleAuthorAdSlot)와 같은 아이콘·모양 (2026-11-04 사장님) */
import React from "react";

const S = { viewBox: "0 0 24 24", width: 16, height: 16, fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
const ICONS: Record<string, { title: string; icon: React.ReactNode }> = {
  blog: { title: "네이버 블로그", icon: <span style={{ fontSize: 9, fontWeight: "bold" }}>BLOG</span> },
  cafe: { title: "네이버 카페", icon: <span style={{ fontSize: 9, fontWeight: "bold" }}>CAFE</span> },
  contact: { title: "문의하기", icon: <svg {...S}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg> },
  youtube: { title: "유튜브 채널", icon: <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.99C18.88 4 12 4 12 4s-6.88 0-8.59.43A2.78 2.78 0 0 0 1.46 6.42C1 8.16 1 12 1 12s0 3.84.46 5.58a2.78 2.78 0 0 0 1.95 1.99C5.12 20 12 20 12 20s6.88 0 8.59-.43a2.78 2.78 0 0 0 1.95-1.99C23 15.84 23 12 23 12s0-3.84-.46-5.58zM9.54 15.55V8.45L15.82 12l-6.28 3.55z" /></svg> },
  instagram: { title: "인스타그램", icon: <svg {...S}><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></svg> },
  facebook: { title: "페이스북", icon: <svg {...S}><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></svg> },
  twitter: { title: "트위터", icon: <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z" /></svg> },
  kakao: { title: "카카오톡", icon: <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 3c-5.5 0-10 3.5-10 7.8 0 2.8 1.8 5.2 4.4 6.5l-1 3.7c-.1.3.3.6.5.4l4.3-2.9c.6.1 1.2.1 1.8.1 5.5 0 10-3.5 10-7.8S17.5 3 12 3z" /></svg> },
  homepage: { title: "홈페이지", icon: <svg {...S}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg> },
  shopping_mall: { title: "쇼핑몰", icon: <svg {...S}><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" /></svg> },
};
const LINK = { title: "링크", icon: <svg {...S}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg> };

export default function SnsIconLink({ kind, url }: { kind: string; url: string }) {
  const it = ICONS[kind] || ICONS[kind.replace(/^naver_/, "")] || LINK;
  const href = url.startsWith("http") ? url : `https://${url}`;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" title={it.title}
      style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: "50%", background: "#f8f9fa", border: "1px solid #e0e0e0", color: "#555", textDecoration: "none", transition: "all .2s" }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "#eaf4ff"; e.currentTarget.style.borderColor = "#1a73e8"; e.currentTarget.style.color = "#1a73e8"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "#f8f9fa"; e.currentTarget.style.borderColor = "#e0e0e0"; e.currentTarget.style.color = "#555"; }}>
      {it.icon}
    </a>
  );
}
