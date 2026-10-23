"use client";

// 공실마케팅 › 인테리어·리모델링 예측 시뮬레이션 보고서 — 쪽 그림 (2026-10-22, docs/2026-10-22_sim_report_plan.md)
//  AI 매물보고서(marketing/report)와 같은 톤: 색 5가지, 레이아웃 테마 5가지, 머리띠·꼬리말 같은 모양.
//  A4 세로 794×1123 (2026-10-22 사장님: 세로 보고서)
//  공간 여러 개(거실·안방·주방·욕실…): 표지 → 개요·합계 → 공간마다 1쪽 → 종합 견적서
//  숫자는 예측 결과(단가표 견적) 그대로 — 지어내지 않는다. 글 칸은 눌러서 고친다.
import React from "react";
import type { Result } from "../sections/StudioSimSource";

export const PAGE_W = 794;
export const PAGE_H = 1123;

export type RColor = { id: string; name: string; primary: string; secondary: string; dark: string };
export const COLORS: RColor[] = [
  { id: "teal", name: "Teal", primary: "#00788c", secondary: "#00c6d7", dark: "#003845" },
  { id: "blue", name: "Blue", primary: "#1d4ed8", secondary: "#60a5fa", dark: "#172554" },
  { id: "gold", name: "Gold", primary: "#bfa068", secondary: "#e6cc9f", dark: "#3e301b" },
  { id: "green", name: "Green", primary: "#005f4d", secondary: "#4fb89e", dark: "#002820" },
  { id: "burgundy", name: "Burgundy", primary: "#7c1f2d", secondary: "#ff9ea7", dark: "#380d13" },
  { id: "orange", name: "Orange", primary: "#f27405", secondary: "#ffac63", dark: "#5e2609" },
];
export type LayoutId = "type1" | "type2" | "type3" | "type4" | "type5";
export const LAYOUTS: { id: LayoutId; name: string }[] = [
  { id: "type1", name: "Modern Overlay" },
  { id: "type2", name: "Luxury Center" },
  { id: "type3", name: "Natural Clean" },
  { id: "type4", name: "Bold Box" },
  { id: "type5", name: "High-end Minimal" },
];
export type ReportState = {
  color: string;
  layout: LayoutId;
  footer: string;
  /** 출력에서 뺀 쪽 (cover · overview · sp:<공간> · total) — 새 공간은 저절로 들어간다 */
  off: string[];
  /** 글 칸 — coverSub · coverTitle · summary · concept · costNote · closing (부동산 이름은 넣지 않는다 — 2026-10-22 사장님) */
  t: Record<string, string>;
};
export type Media = { before: string | null; after: { index: number; diffKo: string; image: string | null }[]; photos: { id: string; src: string | null }[] };
export type Site = { title: string; address: string; memo: string };
/** 보고서에 들어가는 공간 하나 (예측이 끝난 것만) */
export type SpaceView = { key: string; name: string; r: Result; media: Media | null };
export type PageDef = { id: string; name: string; space?: SpaceView };
export const pageDefs = (spaces: SpaceView[]): PageDef[] => [
  { id: "cover", name: "표지" },
  { id: "overview", name: "개요·합계" },
  ...spaces.map((sp, i) => ({ id: `sp:${sp.key}`, name: `${i + 1}. ${sp.name || sp.r.roomName || "공간"}`, space: sp })),
  { id: "total", name: "종합 견적서" },
];
export const totalOf = (spaces: SpaceView[]) => {
  const min = spaces.reduce((a, sp) => a + (sp.r.cost.min ?? 0), 0);
  const max = spaces.reduce((a, sp) => a + (sp.r.cost.max ?? 0), 0);
  return { min, max, text: `약 ${wonMan(min)} ~ ${wonMan(max)}` };
};
export type Kind = "interior" | "remodel";

export const KIND_TEXT: Record<Kind, { report: string; badge: string; what: string; footer: string }> = {
  interior: { report: "인테리어 예측 보고서", badge: "INTERIOR", what: "인테리어", footer: "INTERIOR SIMULATION REPORT" },
  remodel: { report: "리모델링 예측 보고서", badge: "REMODELING", what: "건물 외관 리모델링", footer: "REMODELING SIMULATION REPORT" },
};

/** 만 원 → "1억 2,000만 원" */
export const wonMan = (man: number) => {
  const v = Math.round(Number(man) || 0);
  if (v <= 0) return "0원";
  const eok = Math.floor(v / 10000);
  const rest = v % 10000;
  if (eok && rest) return `${eok}억 ${rest.toLocaleString()}만 원`;
  if (eok) return `${eok}억 원`;
  return `${rest.toLocaleString()}만 원`;
};

/** 면적은 평 먼저 — "105.8m²(32평)" → "32평(105.8m²)", "25m²(약 7.6평)" → "약 7.6평(25m²)" (2026-10 공실뉴스 표기) */
export const pyFirst = (s: string) =>
  String(s || "").replace(/([\d.,]+)\s*(m²|㎡)\s*\((약\s*)?([\d.,]+)\s*평\)/g, (_m, a, u, yak, b) => `${yak || ""}${b}평(${a}${u})`);

const FONT = "'Pretendard', -apple-system, 'Malgun Gothic', sans-serif";
const SERIF = "'Song Myung', 'Noto Serif KR', 'Batang', serif";

/* ── 눌러서 고치는 글 ── */
function Ed({ v, on, multi, style, ph }: { v: string; on?: (x: string) => void; multi?: boolean; style?: React.CSSProperties; ph?: string }) {
  const st: React.CSSProperties = { ...style, whiteSpace: multi ? "pre-wrap" : style?.whiteSpace };
  if (!on) return <span style={st}>{v}</span>;
  return (
    <span key={v} className="gsr-ed" contentEditable suppressContentEditableWarning data-ph={ph || ""} style={st}
      onBlur={(e) => {
        const x = e.currentTarget.innerText.replace(/\n{3,}/g, "\n\n").trim();
        if (x !== v) on(x);
      }}>
      {v}
    </span>
  );
}

export type PageProps = {
  kind: Kind;
  spaces: SpaceView[];
  site: Site;
  /** 공간 쪽이면 그 공간 */
  space?: SpaceView;
  /** 쪽 번호 (머리띠 큰 숫자) */
  n: number;
  st: ReportState;
  c: RColor;
  pageString: string;
  /** 고치기 (없으면 보기만) */
  setT?: (k: string, v: string) => void;
  setFooter?: (v: string) => void;
};

const textOf = (p: PageProps, k: string, def: string) => (p.st.t[k] ?? "") || def;

/* ── 머리띠 (매물보고서 ReportPage 와 같은 5가지) ── */
function Header({ p, n, title, sub }: { p: PageProps; n: number; title: string; sub: string }) {
  const { c } = p;
  const badge = KIND_TEXT[p.kind].badge;
  const L = p.st.layout;
  const base: React.CSSProperties = { height: 120, flexShrink: 0, padding: "24px 40px", boxSizing: "border-box", position: "relative" };
  if (L === "type2")
    return (
      <div style={{ ...base, background: "#fff", color: c.dark, borderBottom: `2px solid ${c.dark}`, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", fontFamily: SERIF }}>
        <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: "0.1em" }}>{title}</div>
        <div style={{ fontSize: 13, color: "#6b7280", letterSpacing: "0.2em", marginTop: 4 }}>{sub}</div>
        <div style={{ position: "absolute", top: 24, right: 40, border: `1px solid ${c.dark}`, padding: "4px 12px", fontSize: 11, fontWeight: 700, letterSpacing: "0.15em", fontFamily: FONT }}>{badge}</div>
      </div>
    );
  if (L === "type3")
    return (
      <div style={{ ...base, background: "#f9fafb", borderLeft: `12px solid ${c.primary}`, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
        <div style={{ fontSize: 30, fontWeight: 900, color: "#111827", letterSpacing: "-0.02em" }}>{title}</div>
        <div style={{ fontSize: 13, color: c.primary, fontWeight: 700, letterSpacing: "0.15em", marginTop: 4 }}>{sub}</div>
        <div style={{ position: "absolute", top: 24, right: 40, background: c.primary, color: "#fff", padding: "4px 12px", fontSize: 11, fontWeight: 700, letterSpacing: "0.15em" }}>{badge}</div>
      </div>
    );
  if (L === "type4")
    return (
      <div style={{ ...base, background: c.dark, color: "#fff", display: "flex", alignItems: "center", gap: 24 }}>
        <div style={{ fontSize: 48, fontWeight: 900, opacity: 0.2 }}>0{n}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: "-0.02em" }}>{title}</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", fontWeight: 700, letterSpacing: "0.15em", marginTop: 4 }}>{sub}</div>
        </div>
        <div style={{ background: c.primary, padding: "8px 16px", fontWeight: 900, letterSpacing: "0.15em", fontSize: 13 }}>{badge}</div>
      </div>
    );
  if (L === "type5")
    return (
      <div style={{ ...base, background: "#fff", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", padding: "32px 40px" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 30, fontWeight: 900, color: "#111827", letterSpacing: "-0.02em" }}>{title}</div>
          <div style={{ fontSize: 12, color: "#9ca3af", fontWeight: 700, letterSpacing: "0.15em", marginTop: 4 }}>{sub}</div>
        </div>
        <div style={{ background: c.primary, color: "#fff", padding: "8px 16px", fontWeight: 900, letterSpacing: "0.15em", fontSize: 13 }}>{badge}</div>
      </div>
    );
  return (
    <div style={{ ...base, background: c.dark, color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
      <div>
        <div style={{ fontSize: 30, fontWeight: 800, marginBottom: 4, letterSpacing: "-0.02em" }}>{title}</div>
        <div style={{ fontSize: 13, color: "#9ca3af", letterSpacing: "0.12em" }}>{sub}</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, paddingBottom: 8 }}>
        <div style={{ width: 1, height: 32, background: "#4b5563" }} />
        <span style={{ fontSize: 22, fontWeight: 900, letterSpacing: "0.15em" }}>{badge}</span>
      </div>
    </div>
  );
}

/* ── 쪽 틀: 머리띠 + 본문 + 꼬리말 ── */
function Sheet({ p, n, title, sub, children }: { p: PageProps; n: number; title: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="gsr-page" style={{ position: "relative", width: PAGE_W, height: PAGE_H, overflow: "hidden", background: "#fff", display: "flex", flexDirection: "column", wordBreak: "keep-all", fontFamily: p.st.layout === "type2" ? SERIF : FONT, color: "#111827" }}>
      <Header p={p} n={n} title={title} sub={sub} />
      <div style={{ flex: 1, padding: 40, position: "relative", minHeight: 0, fontFamily: FONT }}>{children}</div>
      <div style={{ height: 50, flexShrink: 0, padding: "0 40px", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #f3f4f6", fontFamily: FONT }}>
        <Ed v={p.st.footer} on={p.setFooter} style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.15em", color: "#9ca3af", textTransform: "uppercase" }} />
        <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.15em", color: "#9ca3af" }}>{p.pageString}</span>
      </div>
    </div>
  );
}

const SecTitle = ({ en, ko }: { en: string; ko: string }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
    <span style={{ color: "#6b7280", fontWeight: 700, letterSpacing: "0.15em", fontSize: 13 }}>{en}</span>
    <span style={{ color: "#d1d5db" }}>|</span>
    <span style={{ color: "#1f2937", fontWeight: 700, fontSize: 13.5 }}>{ko}</span>
  </div>
);
const Img = ({ src, style, fit = "cover" }: { src: string | null | undefined; style?: React.CSSProperties; fit?: "cover" | "contain" }) =>
  src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" style={{ display: "block", width: "100%", height: "100%", objectFit: fit, ...style }} />
  ) : (
    <div style={{ width: "100%", height: "100%", background: "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: 13, ...style }}>사진 없음</div>
  );
const Tag = ({ text, bg }: { text: string; bg: string }) => (
  <span style={{ position: "absolute", left: 12, top: 12, padding: "5px 12px", background: bg, color: "#fff", fontSize: 12.5, fontWeight: 800, letterSpacing: "0.05em" }}>{text}</span>
);

const first = (p: PageProps) => p.spaces[0];
const coverTitle = (p: PageProps) => textOf(p, "coverTitle", `${p.site.title || ""} ${KIND_TEXT[p.kind].what} 예측`.trim());
const coverSub = (p: PageProps) => textOf(p, "coverSub", KIND_TEXT[p.kind].report);
const afterOf = (sp?: SpaceView) => (sp ? sp.media?.after[0]?.image || sp.r.versions[0]?.image || null : null);
const beforeOf = (sp?: SpaceView) => (sp ? sp.media?.before || sp.r.before : null);
const afterImg = (p: PageProps) => afterOf(first(p));
const dateOf = (p: PageProps) => p.spaces.map((x) => x.r.dateText).sort().pop() || "";
const spaceName = (sp: SpaceView, i: number) => sp.name || sp.r.roomName || `공간 ${i + 1}`;

/* ── 0. 표지 (세로) ── */
export function Cover(p: PageProps) {
  const { c } = p;
  const total = totalOf(p.spaces);
  const L = p.st.layout;
  const setT = p.setT;
  const sub = <Ed v={coverSub(p)} on={setT ? (x) => setT("coverSub", x) : undefined} />;
  const title = <Ed v={coverTitle(p)} on={setT ? (x) => setT("coverTitle", x) : undefined} multi />;
  const facts = (dark?: boolean, center?: boolean) => (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 22, justifyContent: center ? "center" : undefined, fontFamily: FONT }}>
      {[`작성일 ${dateOf(p)}`, ...(p.spaces.length > 1 ? [`공간 ${p.spaces.length}곳`] : []), `예상 공사비 ${total.text}`].map((x) => (
        <span key={x} style={{ fontSize: 13, fontWeight: 700, padding: "6px 12px", border: `1px solid ${dark ? "rgba(255,255,255,0.35)" : "#e5e7eb"}`, color: dark ? "#fff" : "#374151", background: dark ? "rgba(255,255,255,0.08)" : "#fff" }}>{x}</span>
      ))}
    </div>
  );
  const credit = (dark?: boolean) => (
    <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", color: dark ? "rgba(255,255,255,0.6)" : "#9ca3af", fontFamily: FONT }}>
      공실뉴스 AI {KIND_TEXT[p.kind].what} 예측 시뮬레이션
    </div>
  );
  const wrap: React.CSSProperties = { position: "relative", width: PAGE_W, height: PAGE_H, overflow: "hidden", background: "#fff", display: "flex", flexDirection: "column", wordBreak: "keep-all", fontFamily: L === "type2" ? SERIF : FONT, color: "#111827", boxSizing: "border-box" };
  if (L === "type2")
    return (
      <div className="gsr-page" style={{ ...wrap, border: `16px solid ${c.dark}`, padding: "64px 56px 50px", justifyContent: "space-between" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ color: c.primary, fontSize: 17, letterSpacing: "0.3em", fontWeight: 700 }}>{sub}</div>
          <div style={{ width: 64, height: 2, background: c.primary, margin: "22px auto" }} />
          <div style={{ fontSize: 40, fontWeight: 900, lineHeight: 1.3 }}>{title}</div>
          {facts(false, true)}
        </div>
        <div style={{ height: 520, position: "relative", border: `1px solid ${c.dark}`, margin: "26px 0" }}><Img src={afterImg(p)} /><Tag text="AI 예측 이미지" bg={c.primary} /></div>
        <div style={{ textAlign: "center" }}>{credit()}</div>
      </div>
    );
  if (L === "type3")
    return (
      <div className="gsr-page" style={{ ...wrap, flexDirection: "row" }}>
        <div style={{ width: 28, background: c.primary, flexShrink: 0 }} />
        <div style={{ flex: 1, padding: "70px 56px 56px 50px", display: "flex", flexDirection: "column" }}>
          <span style={{ alignSelf: "flex-start", background: `${c.primary}1a`, color: c.primary, padding: "5px 14px", fontSize: 12, fontWeight: 900, letterSpacing: "0.15em", borderRadius: 999 }}>{sub}</span>
          <div style={{ fontSize: 38, fontWeight: 800, lineHeight: 1.3, marginTop: 16 }}>{title}</div>
          <div style={{ width: 96, height: 6, background: c.primary, marginTop: 26 }} />
          {facts()}
          <div style={{ flex: 1, position: "relative", margin: "34px 0 26px", minHeight: 0 }}><Img src={afterImg(p)} /><Tag text="AI 예측 이미지" bg={c.primary} /></div>
          {credit()}
        </div>
      </div>
    );
  if (L === "type4")
    return (
      <div className="gsr-page" style={{ ...wrap, background: c.dark, color: "#fff", justifyContent: "space-between", padding: "80px 64px 64px" }}>
        <div style={{ position: "absolute", inset: 0, opacity: 0.32 }}><Img src={afterImg(p)} /></div>
        <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, ${c.dark} 30%, transparent 65%, ${c.dark})` }} />
        <div style={{ position: "relative" }}>
          <span style={{ display: "inline-block", background: c.primary, padding: "6px 14px", fontSize: 13, fontWeight: 900, letterSpacing: "0.2em" }}>{sub}</span>
          <div style={{ fontSize: 46, fontWeight: 900, lineHeight: 1.25, marginTop: 22 }}>{title}</div>
          {facts(true)}
        </div>
        <div style={{ position: "relative" }}>{credit(true)}</div>
      </div>
    );
  if (L === "type5")
    return (
      <div className="gsr-page" style={wrap}>
        <div style={{ padding: "64px 56px 28px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 13, color: "#9ca3af", fontWeight: 800, letterSpacing: "0.25em" }}>{sub}</div>
            <div style={{ background: c.primary, color: "#fff", padding: "7px 14px", fontWeight: 900, letterSpacing: "0.15em", fontSize: 12 }}>{KIND_TEXT[p.kind].badge}</div>
          </div>
          <div style={{ fontSize: 38, fontWeight: 900, lineHeight: 1.25, marginTop: 14 }}>{title}</div>
        </div>
        <div style={{ height: 600, position: "relative", margin: "0 56px" }}><Img src={afterImg(p)} /><Tag text="AI 예측 이미지" bg={c.dark} /></div>
        <div style={{ flex: 1, padding: "30px 56px 50px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          {credit()}
          <div style={{ textAlign: "right", fontSize: 13, color: "#6b7280", fontWeight: 700, lineHeight: 1.8 }}>
            <div>작성일 {dateOf(p)}</div>
            <div style={{ color: c.primary, fontSize: 15, fontWeight: 900 }}>예상 공사비 {total.text}</div>
          </div>
        </div>
      </div>
    );
  // type1 — Modern Overlay (위 그림 · 아래 글)
  return (
    <div className="gsr-page" style={wrap}>
      <div style={{ height: 620, position: "relative", background: c.dark, flexShrink: 0 }}>
        <div style={{ position: "absolute", inset: 0, opacity: 0.94 }}><Img src={afterImg(p)} /></div>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "70px 56px 24px", background: `linear-gradient(transparent, ${c.dark}ee)`, color: "#fff" }}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.2em", color: c.secondary }}>AI PREDICTION</div>
          <div style={{ fontSize: 15, fontWeight: 700, marginTop: 6 }}>AI가 그린 {KIND_TEXT[p.kind].what} 예측 이미지</div>
        </div>
      </div>
      <div style={{ flex: 1, padding: "50px 56px 50px", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#f8fafc" }}>
        <div>
          <div style={{ color: c.primary, fontSize: 12, fontWeight: 900, letterSpacing: "0.3em", marginBottom: 14 }}>{sub}</div>
          <div style={{ fontSize: 34, fontWeight: 800, lineHeight: 1.3 }}>{title}</div>
          <div style={{ width: 80, height: 4, background: c.primary, marginTop: 22 }} />
          {facts()}
        </div>
        {credit()}
      </div>
    </div>
  );
}

const Box = ({ c, label, children }: { c: string; label: string; children: React.ReactNode }) => (
  <div style={{ borderLeft: `4px solid ${c}`, background: "#f9fafb", padding: "10px 16px" }}>
    <div style={{ fontSize: 12, fontWeight: 800, color: c, letterSpacing: "0.1em", marginBottom: 4 }}>{label}</div>
    {children}
  </div>
);
const clampStyle = (n: number): React.CSSProperties => ({ display: "-webkit-box", WebkitLineClamp: n, WebkitBoxOrient: "vertical", overflow: "hidden" });
const th = (c: RColor): React.CSSProperties => ({ padding: "9px 10px", fontSize: 12.5, fontWeight: 800, color: "#fff", background: c.dark, textAlign: "left" });
const tdS: React.CSSProperties = { padding: "7px 10px", fontSize: 13, borderBottom: "1px solid #eef0f3", color: "#111827" };
const pick = (r: Result, keys: RegExp) => Object.entries(r.design || {}).filter(([k]) => keys.test(k)).map(([, v]) => v.join(", ")).filter(Boolean).join(" · ");

/* ── 1. 개요 · 공간별 합계 ── */
export function Overview(p: PageProps) {
  const { c, setT, site } = p;
  const total = totalOf(p.spaces);
  const rows: [string, string][] = [
    ...(site.title ? [["현장", site.title] as [string, string]] : []),
    ...(site.address ? [["위치", site.address] as [string, string]] : []),
    ["공간", p.spaces.map((sp, i) => spaceName(sp, i)).join(", ")],
    ["작성일", dateOf(p)],
    ...(site.memo ? [["요청 사항", site.memo] as [string, string]] : []),
  ];
  const thumbs = p.spaces.slice(0, 4);
  return (
    <Sheet p={p} n={p.n} title="개요 · 예상 공사비" sub="OVERVIEW · SUMMARY">
      <SecTitle en="SITE" ko="현장 정보" />
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k} style={{ borderBottom: "1px solid #f3f4f6" }}>
              <th style={{ width: 110, textAlign: "left", padding: "8px 10px", background: "#f9fafb", color: "#6b7280", fontWeight: 700, fontSize: 12.5, verticalAlign: "top" }}>{k}</th>
              <td style={{ padding: "8px 12px", fontSize: 13.5, fontWeight: 600, lineHeight: 1.45 }}>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ marginTop: 20 }}><SecTitle en="BY SPACE" ko="공간별 예상 공사비" /></div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ ...th(c), width: 30, textAlign: "center" }}>No</th>
            <th style={{ ...th(c), width: 110 }}>공간</th>
            <th style={th(c)}>주요 조건</th>
            <th style={{ ...th(c), width: 190, textAlign: "right" }}>예상 공사비</th>
          </tr>
        </thead>
        <tbody>
          {p.spaces.map((sp, i) => (
            <tr key={sp.key} style={{ background: i % 2 ? "#fafbfc" : "#fff" }}>
              <td style={{ ...tdS, textAlign: "center", color: "#9ca3af" }}>{i + 1}</td>
              <td style={{ ...tdS, fontWeight: 800 }}>{spaceName(sp, i)}<div style={{ fontSize: 11.5, color: "#6b7280", fontWeight: 600 }}>{pyFirst(sp.r.cost.basisText).replace(/^\S+\s/, "").split(" · ")[0]}</div></td>
              <td style={{ ...tdS, fontSize: 12.5, color: "#4b5563" }}><div style={clampStyle(2)}>{pick(sp.r, /스타일|바닥|벽|외장|색상|창호/)}</div></td>
              <td style={{ ...tdS, textAlign: "right", whiteSpace: "nowrap", fontWeight: 700 }}>{sp.r.cost.rangeText}</td>
            </tr>
          ))}
          <tr>
            <td colSpan={2} style={{ padding: "12px 10px", background: `${c.primary}12`, borderTop: `2px solid ${c.primary}`, fontSize: 14, fontWeight: 900, color: c.dark, whiteSpace: "nowrap" }}>합계 (부가세 별도)</td>
            <td colSpan={2} style={{ padding: "12px 10px", background: `${c.primary}12`, borderTop: `2px solid ${c.primary}`, textAlign: "right", fontSize: 19, fontWeight: 900, color: c.primary, whiteSpace: "nowrap" }}>{total.text}</td>
          </tr>
        </tbody>
      </table>
      {thumbs.length > 0 && (
        <div style={{ display: "flex", gap: 10, height: 120, marginTop: 16 }}>
          {thumbs.map((sp, i) => (
            <div key={sp.key} style={{ flex: 1, position: "relative" }}>
              <Img src={afterOf(sp)} />
              <span style={{ position: "absolute", left: 6, bottom: 6, padding: "2px 8px", background: "rgba(17,24,39,0.75)", color: "#fff", fontSize: 11, fontWeight: 700 }}>{spaceName(sp, i)} · AI 예측</span>
            </div>
          ))}
          {Array.from({ length: Math.max(0, 4 - thumbs.length) }, (_, i) => <div key={i} style={{ flex: 1 }} />)}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
        <Box c={c.primary} label="보고서 요약">
          <Ed v={textOf(p, "summary", "")} on={setT ? (x) => setT("summary", x) : undefined} multi ph="[AI로 채우기]를 누르거나 눌러서 직접 쓰세요" style={{ display: "block", fontSize: 13.5, lineHeight: 1.7, color: "#1f2937", minHeight: 40 }} />
        </Box>
        <Box c={c.dark} label="디자인 콘셉트">
          <Ed v={textOf(p, "concept", "")} on={setT ? (x) => setT("concept", x) : undefined} multi ph="[AI로 채우기]를 누르거나 눌러서 직접 쓰세요" style={{ display: "block", fontSize: 13.5, lineHeight: 1.7, color: "#1f2937", minHeight: 40 }} />
        </Box>
      </div>
    </Sheet>
  );
}

/* ── 공간 하나 (거실·안방·주방·욕실…) ── */
export function SpacePage(p: PageProps) {
  const { c } = p;
  const sp = p.space!;
  const i = p.spaces.findIndex((x) => x.key === sp.key);
  const r = sp.r;
  const chosen = Object.entries(r.design || {}).filter(([, v]) => v && v.length);
  const half = Math.ceil(chosen.length / 2);
  const many = r.cost.items.length > 6;
  // 한 쪽에 맞게 — 견적 항목이 많으면 사진·사양을 줄인다
  const spec = r.designSpec.filter((x) => !/공간 유형|roomType/i.test(x.label)).slice(0, many ? 1 : 2);
  return (
    <Sheet p={p} n={p.n} title={`${String(i + 1).padStart(2, "0")}. ${spaceName(sp, i)}`} sub={`SPACE ${String(i + 1).padStart(2, "0")} · BEFORE & AFTER`}>
      <div style={{ display: "flex", gap: 12, height: many ? 240 : 265 }}>
        <div style={{ flex: 1, position: "relative" }}><Img src={beforeOf(sp)} /><Tag text="현재" bg="#374151" /></div>
        <div style={{ flex: 1, position: "relative" }}><Img src={afterOf(sp)} /><Tag text="AI 예측" bg={c.primary} /></div>
      </div>
      {r.versions[0]?.diffKo && <div style={{ fontSize: 11.5, lineHeight: 1.5, color: "#6b7280", marginTop: 6, ...clampStyle(2) }}>{r.versions[0].diffKo}</div>}
      <div style={{ marginTop: 14 }}><SecTitle en="SELECTED" ko="고른 조건" /></div>
      <div style={{ display: "flex", gap: 14 }}>
        {[chosen.slice(0, half), chosen.slice(half)].map((part, k) => (
          <table key={k} style={{ flex: 1, borderCollapse: "collapse", alignSelf: "flex-start" }}>
            <tbody>
              {part.map(([kk, v]) => (
                <tr key={kk} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <th style={{ width: 92, textAlign: "left", padding: "6px 8px", background: "#f9fafb", color: "#6b7280", fontWeight: 700, fontSize: 12 }}>{kk}</th>
                  <td style={{ padding: "6px 10px", fontSize: 12.5, lineHeight: 1.4 }}>{v.join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ))}
      </div>
      {spec.length > 0 && (
        <>
          <div style={{ marginTop: 14 }}><SecTitle en="AI SPEC" ko="AI 설계 사양 (요약)" /></div>
          {spec.map((x) => (
            <div key={x.label} style={{ display: "flex", gap: 10, fontSize: 12, lineHeight: 1.5, padding: "4px 0", borderBottom: "1px dashed #eef0f3" }}>
              <b style={{ width: 92, flexShrink: 0, color: "#6b7280" }}>{x.label}</b>
              <span style={{ color: "#374151", ...clampStyle(2) }}>{x.value}</span>
            </div>
          ))}
        </>
      )}
      <div style={{ marginTop: 14 }}><SecTitle en="ESTIMATE" ko={`예상 견적 · ${pyFirst(r.cost.basisText)}`} /></div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <tbody>
          {r.cost.items.map((it, k) => (
            <tr key={it.label} style={{ background: k % 2 ? "#fafbfc" : "#fff" }}>
              <td style={{ ...tdS, padding: many ? "5px 10px" : "6px 10px", fontWeight: 700, width: 130 }}>{it.label}</td>
              <td style={{ ...tdS, padding: many ? "5px 10px" : "6px 10px", color: "#4b5563", fontSize: 12 }}>{it.basis}</td>
              <td style={{ ...tdS, padding: many ? "5px 10px" : "6px 10px", textAlign: "right", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{wonMan(it.min)} ~ {wonMan(it.max)}</td>
            </tr>
          ))}
          <tr>
            <td colSpan={2} style={{ padding: "10px", background: `${c.primary}12`, borderTop: `2px solid ${c.primary}`, fontSize: 13.5, fontWeight: 900, color: c.dark }}>{spaceName(sp, i)} 소계</td>
            <td style={{ padding: "10px", background: `${c.primary}12`, borderTop: `2px solid ${c.primary}`, textAlign: "right", fontSize: 16, fontWeight: 900, color: c.primary, whiteSpace: "nowrap" }}>{r.cost.rangeText}</td>
          </tr>
        </tbody>
      </table>
    </Sheet>
  );
}

/* ── 마지막. 종합 견적서 · 유의사항 · 맺음말 ── */
export function Total(p: PageProps) {
  const { c, setT } = p;
  const total = totalOf(p.spaces);
  const sp0 = first(p);
  const notes = [
    "예측 이미지는 AI가 만든 참고용 이미지로, 실제 시공 결과와 다를 수 있습니다.",
    `예상 공사비는 공실뉴스 단가표로 계산한 범위이며, 현장 실측·자재 선택·시공 업체에 따라 달라집니다.${sp0 ? ` (${sp0.r.cost.excludes})` : ""}`,
    ...(sp0 ? [sp0.r.cost.notice] : []),
    "공사 전에는 건물 관리 규약·관련 법규(인허가 대상 여부)와 시공 업체 견적을 꼭 확인해 주세요.",
  ];
  return (
    <Sheet p={p} n={p.n} title="종합 견적서" sub="TOTAL ESTIMATE">
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ ...th(c), width: 30, textAlign: "center" }}>No</th>
            <th style={{ ...th(c), width: 120 }}>공간</th>
            <th style={th(c)}>견적 기준</th>
            <th style={{ ...th(c), width: 100, textAlign: "right" }}>최소</th>
            <th style={{ ...th(c), width: 100, textAlign: "right" }}>최대</th>
          </tr>
        </thead>
        <tbody>
          {p.spaces.map((sp, i) => (
            <tr key={sp.key} style={{ background: i % 2 ? "#fafbfc" : "#fff" }}>
              <td style={{ ...tdS, textAlign: "center", color: "#9ca3af" }}>{i + 1}</td>
              <td style={{ ...tdS, fontWeight: 800 }}>{spaceName(sp, i)}</td>
              <td style={{ ...tdS, fontSize: 12, color: "#4b5563" }}>{pyFirst(sp.r.cost.basisText)}</td>
              <td style={{ ...tdS, textAlign: "right", whiteSpace: "nowrap" }}>{wonMan(sp.r.cost.min ?? 0)}</td>
              <td style={{ ...tdS, textAlign: "right", whiteSpace: "nowrap" }}>{wonMan(sp.r.cost.max ?? 0)}</td>
            </tr>
          ))}
          <tr>
            <td colSpan={2} style={{ padding: "13px 10px", background: `${c.primary}12`, borderTop: `2px solid ${c.primary}`, fontSize: 14.5, fontWeight: 900, color: c.dark, whiteSpace: "nowrap" }}>예상 공사비 합계</td>
            <td colSpan={3} style={{ padding: "13px 10px", background: `${c.primary}12`, borderTop: `2px solid ${c.primary}`, textAlign: "right", fontSize: 20, fontWeight: 900, color: c.primary, whiteSpace: "nowrap" }}>{total.text}</td>
          </tr>
        </tbody>
      </table>
      <div style={{ fontSize: 11.5, color: "#6b7280", textAlign: "right", marginTop: 6 }}>단위: 원 · 부가세 별도 · 공간별 세부 내역은 앞 쪽에</div>
      <div style={{ marginTop: 14 }}>
        <Box c={c.primary} label="견적 해설">
          <Ed v={textOf(p, "costNote", "")} on={setT ? (x) => setT("costNote", x) : undefined} multi ph="[AI로 채우기]를 누르거나 눌러서 직접 쓰세요" style={{ display: "block", fontSize: 13, lineHeight: 1.65, color: "#1f2937", minHeight: 36 }} />
        </Box>
      </div>
      <div style={{ marginTop: 18 }}><SecTitle en="NOTICE" ko="유의사항" /></div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {notes.map((x, i) => (
          <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 12.5, lineHeight: 1.55, color: "#374151" }}>
            <span style={{ width: 18, height: 18, borderRadius: 9, background: c.primary, color: "#fff", fontSize: 11, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>{i + 1}</span>
            <span>{x}</span>
          </div>
        ))}
      </div>
      {sp0?.r.disclaimer && (
        <div style={{ marginTop: 14, background: "#fef2f2", padding: "10px 14px" }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#b91c1c", marginBottom: 3 }}>주의 문구</div>
          <div style={{ fontSize: 12, lineHeight: 1.6, color: "#991b1b", ...clampStyle(4) }}>{sp0.r.disclaimer}</div>
        </div>
      )}
      <div style={{ position: "absolute", left: 40, right: 40, bottom: 26, borderTop: `2px solid ${c.primary}`, paddingTop: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: c.primary, letterSpacing: "0.2em" }}>THANK YOU</div>
        <Ed v={textOf(p, "closing", "")} on={setT ? (x) => setT("closing", x) : undefined} multi ph="맺음말 — [AI로 채우기]를 누르거나 직접 쓰세요" style={{ display: "block", fontSize: 13.5, lineHeight: 1.7, color: "#374151", marginTop: 6, minHeight: 40 }} />
      </div>
    </Sheet>
  );
}

/** 쪽 하나 그리기 */
export function RenderPage({ def, ...p }: PageProps & { def: PageDef }) {
  if (def.id === "cover") return <Cover {...p} />;
  if (def.id === "overview") return <Overview {...p} />;
  if (def.id === "total") return <Total {...p} />;
  return <SpacePage {...p} space={def.space} />;
}
