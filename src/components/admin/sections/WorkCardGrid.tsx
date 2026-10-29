"use client";

import React from "react";
import { BG, G, CardHoverStyle } from "./VacancyCardGrid";

/**
 * 뉴스·SNS발행 목록 카드 (2026-10-29 사장님: "디자인 다르게 하지 말고 복사해서 똑같이")
 * 공실관리 SNS홍보형 카드(VacancyCardGrid)와 같은 크기·여백·글자·채널 줄 — 뉴스칼럼·내 영상 올리기가 쓴다.
 * 맨 앞 주황 [+ 새로 만들기] · 카드 = 위쪽(머리 글자·제목·두 줄·오른쪽 사진) + 아래 채널 줄(써 둔 글은 반투명, 없으면 흐리게)
 */
type Theme = { cardBg: string; textPrimary: string; textSecondary: string; border: string; darkMode?: boolean };
export type WorkCard = {
  id: string;
  /** 머리 줄 — 빨간 딱지 · 날짜 */
  badge?: string;
  date?: string;
  title: string;
  /** 파란 굵은 줄 (가격 자리) */
  headline?: string;
  /** 회색 두 줄 */
  line1?: string;
  line2?: string;
  thumb?: string | null;
  /** 채널마다 써 둔 글 { article, blog, instagram, threads, facebook, youtube } — 없으면 채널 줄을 그리지 않는다 */
  done?: Record<string, boolean>;
  current?: boolean;
};

const CH: [string, string][] = [["article", "공실뉴스 기사"], ["blog", "네이버 블로그"], ["instagram", "인스타그램"], ["threads", "스레드"], ["facebook", "페이스북"], ["youtube", "유튜브"]];

export default function WorkCardGrid({ theme, cards, addLabel = "새로 만들기", onAdd, onOpen, empty, placeholder }: {
  theme: Theme;
  cards: WorkCard[] | null;
  addLabel?: string;
  onAdd: () => void;
  /** tab — 채널 칸을 누르면 그 채널 (카드 위쪽은 "article") */
  onOpen: (id: string, tab: string) => void;
  empty?: string;
  /** 사진이 없을 때 */
  placeholder?: React.ReactNode;
}) {
  const { cardBg, textPrimary, textSecondary, border } = theme;
  const darkMode = Boolean(theme.darkMode);
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, 320px)", gap: 18 }}>
        <button onClick={onAdd} title={addLabel}
          style={{ minHeight: 230, borderRadius: 14, border: `2px dashed ${darkMode ? "#5c4033" : "#f3c9a8"}`, background: darkMode ? "#2b2320" : "#fff8f1", cursor: "pointer",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
          <span style={{ width: 60, height: 60, borderRadius: "50%", background: "#e8590c", color: "#fff", fontSize: 34, fontWeight: 400, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(232,89,12,0.3)" }}>+</span>
          <span style={{ fontSize: 16, fontWeight: 800, color: darkMode ? "#ffd8a8" : "#5c3b2e" }}>{addLabel}</span>
        </button>
        {cards === null && <div style={{ padding: 20, fontSize: 13, color: textSecondary }}>불러오는 중…</div>}
        {cards && !cards.length && empty && <div style={{ padding: 20, fontSize: 13.5, color: textSecondary }}>{empty}</div>}
        {(cards || []).map((c) => {
          const n = c.done ? CH.filter(([k]) => c.done![k]).length : 0;
          return (
            <div key={c.id} className="gs-vac-card"
              style={{ position: "relative", background: cardBg, border: `${c.current ? 2 : 1}px solid ${c.current ? (darkMode ? "#5b8def" : "#1a3a6b") : border}`, borderRadius: 14, overflow: "hidden", padding: "16px 16px 14px" }}>
              <div role="button" onClick={() => onOpen(c.id, "article")} style={{ display: "flex", gap: 10, cursor: "pointer" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                    {c.badge && <span style={{ fontSize: 11, color: "#fa5252", border: "1px solid #fa5252", padding: "1px 5px", borderRadius: 4, fontWeight: 700, whiteSpace: "nowrap" }}>{c.badge}</span>}
                    {c.date && <span style={{ fontSize: 12, color: "#aaa" }}>{c.date}</span>}
                    {c.current && <span style={{ fontSize: 11, fontWeight: 800, padding: "1px 6px", borderRadius: 4, background: "#1a3a6b", color: "#fff", whiteSpace: "nowrap" }}>지금 작업</span>}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: textPrimary, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", lineHeight: 1.4 }}>{c.title}</div>
                  {c.headline && <div style={{ fontSize: 16, fontWeight: 800, color: "#1a73e8", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.headline}</div>}
                  {c.line1 && <div style={{ fontSize: 13, color: darkMode ? "#adb5bd" : "#555", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.line1}</div>}
                  {c.line2 && <div style={{ fontSize: 12, color: darkMode ? "#868e96" : "#666", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.line2}</div>}
                </div>
                <div style={{ flexShrink: 0, width: 110, height: 110, borderRadius: 6, overflow: "hidden", background: darkMode ? "#2c2d31" : "#f1f3f5", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {c.thumb ? <img src={c.thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : placeholder}
                </div>
              </div>
              {c.done && (
                <div style={{ marginTop: 12, borderTop: `1px solid ${border}` }}>
                  <div style={{ marginTop: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: textSecondary, whiteSpace: "nowrap" }}>
                        작성 <b style={{ color: n ? "#2f9e44" : textSecondary, fontSize: 13 }}>{n}</b> / {CH.length}
                      </span>
                      <span style={{ flex: 1, height: 4, borderRadius: 4, background: darkMode ? "#333" : "#eef0f2", overflow: "hidden" }}>
                        <span style={{ display: "block", height: "100%", width: `${(n / CH.length) * 100}%`, background: "#2f9e44", borderRadius: 4 }} />
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      {CH.map(([k, label]) => {
                        const on = Boolean(c.done![k]);
                        return (
                          <button key={k} onClick={() => onOpen(c.id, k)} title={`${label} · ${on ? "써 둔 글 열기" : "만들기"}`}
                            style={{ position: "relative", width: 32, height: 32, padding: 0, border: 0, borderRadius: 10, cursor: "pointer", background: BG[k],
                              display: "flex", alignItems: "center", justifyContent: "center", filter: on ? "none" : "grayscale(1)", opacity: on ? 1 : 0.25, transition: "opacity .15s" }}>
                            {G[k]}
                            {on && <span style={{ position: "absolute", right: -4, bottom: -4, width: 15, height: 15, borderRadius: "50%", background: "#2f9e44", border: `2px solid ${darkMode ? "#25262b" : "#fff"}`, color: "#fff", fontSize: 9, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>✓</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <CardHoverStyle darkMode={darkMode} />
    </div>
  );
}
