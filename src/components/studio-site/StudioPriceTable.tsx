"use client";

import React from "react";
import Link from "next/link";

/**
 * 공실마케팅 금액안내 (/marketing/pricing) — 브루 가격 정책(vrew.ai/ko/payment/pricepolicy)과 같은 틀 (2026-10-26 사장님: "똑같이")
 *  큰 제목 → [월 구독 | 연 구독] → 요금제 칸(추천 띠 · 아이콘 · 가격 · 월 환산 · 시작하기 · 기본 제공 · 사용 가능 항목 · 특별한 기능) → 안내 → "모든 플랜에서" 알약 줄
 * 요금제: 공실뉴스부동산(무료) · 스튜디오회원(정가 월 5만 → 할인 월 3만 / 1년 36만) · 비즈니스회원 (2026-10-31)
 */
const ACCENT = "#e8890c";
const SOFT = "#fdf4e7";
const LINE = "#e5e7eb";

type Plan = {
  key: string; name: string; icon: React.ReactNode; tag?: string;
  price: (y: boolean) => { won: string; per: string; sub?: string; day?: string; year?: string; was?: string };
  cta: { label: string; href: string; solid?: boolean };
  base: string[];
  items: string[];
  extraTitle: string;
  extra: string[];
};

const ic = (d: string) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={d} /></svg>
);

/**
 * 2026-10-26 사장님: Free · Basic · Standard · 법인/기업/단체/기관용 네 칸 — 금액·항목은 "일단 랜덤"(임시).
 * 2026-10-31 사장님 확정: 유료는 스튜디오회원 하나 (마케팅회원 없앰 · 일반 사무소와 중개법인 같은 금액)
 *  정가 월 5만 → 특별 할인 월 3만 · 1년 36만. 비즈니스회원은 그대로. 공실 등록은 무료·스튜디오 모두 제한 없음.
 *  항목은 회의 권한표대로 (docs 없음 — 메모 studio-pricing-strategy)
 */
export const TEMP_PRICES = false;
/* 연 구독만 받는다 (2026-10-30 사장님) — 큰 글자는 월 금액, 작게 1년 결제 금액 · 하루 금액 (연 금액만 크면 부담스러워 보여서)
   was = 할인 전 정가 (줄 그어 보여 준다) */
const mon = (m: number, was?: number) => () => ({
  won: m.toLocaleString(), per: "/ 월",
  sub: `1년 ${(m * 12).toLocaleString()}원 · 한 번에 결제`,
  day: `하루 약 ${(Math.round((m * 12) / 365 / 100) * 100).toLocaleString()}원`,
  year: (m * 12).toLocaleString(),
  was: was ? was.toLocaleString() : undefined,
});

export const PLANS: Plan[] = [
  {
    key: "free", name: "공실뉴스부동산",
    icon: ic("M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"),
    price: () => ({ won: "0", per: "/ 평생", sub: "무료" }),
    cta: { label: "시작하기", href: "/newsrealty/apply" },
    base: ["공실 등록 무제한", "기사 쓰기"],
    items: ["블로그 · SNS 자동 작성 1주일 3번", "AI 매물보고서 (등록한 공실로)", "포토studio 기본 편집 (AI 제외)", "물건접수홈페이지 기본형 (전화 · 문자 연결)", "화면캡처 · 녹화"],
    extraTitle: "특별한 기능",
    extra: ["중개사 서류 승인 후 이용", "가입비 · 이용료 없음"],
  },
  {
    key: "standard", name: "스튜디오회원", tag: "특별 할인",
    icon: ic("M4 6h16v12H4zM10 9l5 3-5 3z"),
    price: mon(30000, 50000),
    cta: { label: "시작하기", href: "/marketing/apply", solid: true },
    base: ["공실 등록 무제한", "기사 쓰기"],
    items: ["블로그 · SNS 자동 작성 무제한", "AI 매물보고서", "포토studio AI 자동 디자인 · AI 고치기", "동영상studio · AI 성우 · 자동 자막", "인테리어 · 리모델링 AI", "물건접수홈페이지 집주인 접수 · 색상 · 로고"],
    extraTitle: "공실뉴스부동산의 모든 기능 포함",
    extra: ["일반 중개사무소 · 중개법인 같은 금액", "이름표 공실마케팅 로고"],
  },
  {
    key: "biz", name: "비즈니스회원", tag: "세무사·법무사·변호사 등 전문가용",
    icon: ic("M4 21V7l8-4 8 4v14M9 21v-6h6v6M8 10h.01M12 10h.01M16 10h.01"),
    price: mon(100000),
    cta: { label: "시작하기", href: "/marketing/apply", solid: true },
    base: ["공실 등록 무제한", "기사 쓰기"],
    items: ["스튜디오회원 항목 모두", "직원 계정 여러 개", "사무소 여러 곳 함께 관리"],
    extraTitle: "스튜디오회원의 모든 기능 포함",
    extra: ["전담 상담", "세금계산서 발행"],
  },
];

const NOTES = [
  "모든 금액은 부가세를 포함한 최종 결제 금액이에요.",
  "모든 요금제는 1년 단위로 결제해요. 표의 월 금액은 1년 금액을 12로 나눈 금액이에요.",
  "공실뉴스부동산은 중개사 서류가 승인되면 무료로 이용할 수 있어요.",
  "그 외 궁금한 점이 있으시다면 채팅 상담을 통해 문의 주세요.",
];

/** 아래 흘러가는 알약 두 줄 (브루처럼) — 글 알약 · 그림(픽토그램) 알약, ai = 노란 ✦ */
type Chip = { t?: string; ai?: boolean; d?: string };
const P = {
  map: "M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14",
  news: "M4 5h13v14H5a1 1 0 0 1-1-1zM17 9h3v9a1 1 0 0 1-1 1h-2M7 9h7M7 13h7M7 16h4",
  pin: "M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12zM12 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  film: "M4 6h16v12H4zM10 9l5 3-5 3z",
  image: "M4 5h16v14H4zM8 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM20 16l-5-5-9 8",
  mic: "M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zM5 11a7 7 0 0 0 14 0M12 18v3",
  doc: "M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6",
  home: "M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  folder: "M3 7h6l2 2h10v10H3z",
  chat: "M4 5h16v11H9l-5 4z",
};
const ROW1: Chip[] = [
  { t: "공실뉴스 열람" }, { d: P.news }, { t: "공실 등록" }, { t: "기사 등록" }, { d: P.pin }, { t: "공실열람 지도" },
  { t: "경공매 열람" }, { d: P.map }, { t: "블로그 · SNS 자동 작성", ai: true }, { d: P.chat }, { t: "AI 매물보고서", ai: true }, { t: "물건접수홈페이지" },
];
const ROW2: Chip[] = [
  { t: "이미지 편집" }, { d: P.image }, { t: "포토샵 템플릿" }, { t: "영상뉴스", ai: true }, { d: P.film }, { t: "AI 보이스", ai: true },
  { d: P.mic }, { t: "자동 자막", ai: true }, { t: "유튜브 썸네일" }, { d: P.doc }, { t: "자료실" }, { d: P.folder }, { t: "커뮤니티" }, { d: P.home },
];
const MARQUEE_CSS = `
.pm-row{display:flex;width:max-content;gap:12px;animation:pm-left 60s linear infinite}
.pm-row.rev{animation-name:pm-right}
.pm-wrap:hover .pm-row{animation-play-state:paused}
@keyframes pm-left{from{transform:translateX(0)}to{transform:translateX(-50%)}}
@keyframes pm-right{from{transform:translateX(-50%)}to{transform:translateX(0)}}
@media (prefers-reduced-motion:reduce){.pm-row{animation:none}}
`;
function ChipView({ c }: { c: Chip }) {
  if (c.d) {
    return (
      <span style={{ width: 48, height: 48, borderRadius: 999, border: "1px solid #e5e7eb", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: "#fff" }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={c.d} /></svg>
      </span>
    );
  }
  return (
    <span style={{ height: 48, padding: "0 24px", borderRadius: 999, border: "1px solid #e5e7eb", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 15, color: "#374151", whiteSpace: "nowrap", flexShrink: 0, background: "#fff" }}>
      {c.ai && <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden><path d="M12 2l2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2z" fill="#f5b301" /></svg>}
      {c.t}
    </span>
  );
}
function Marquee({ items, reverse }: { items: Chip[]; reverse?: boolean }) {
  const list = [...items, ...items]; // 두 번 이어 붙여 끊김 없이 돈다
  return (
    <div className={"pm-row" + (reverse ? " rev" : "")}>
      {list.map((c, i) => <ChipView key={i} c={c} />)}
    </div>
  );
}

const check = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ flexShrink: 0, marginTop: 3 }}><path d="M5 12l5 5L20 7" /></svg>
);

/** 브루처럼 숫자·"무제한"·"전체" 부분만 굵게 */
function Bold({ t }: { t: string }) {
  const parts = t.split(/(\d[\d,.]*\s?(?:건|편|개|곳)|무제한|전체|무료)/);
  return <>{parts.map((x, i) => (i % 2 ? <b key={i} style={{ fontWeight: 800, color: "#111827" }}>{x}</b> : <React.Fragment key={i}>{x}</React.Fragment>))}</>;
}
const info = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.8" aria-hidden style={{ flexShrink: 0, marginLeft: "auto", marginTop: 2 }}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg>
);
const coin = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="1.8" aria-hidden style={{ flexShrink: 0, marginTop: 2 }}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4.5" /></svg>
);

/**
 * compact = 앱 머리줄 [금액안내] 창 안에서 — 웹 금액안내(/marketing/pricing)와 똑같이 (2026-10-31 사장님: "여기 페이지 같이 그냥 신청하게")
 *  위 여백·제목만 조금 줄이고, [시작하기]는 새 창으로 (앱 화면을 떠나지 않게). 아래 기능 알약 줄도 그대로 흘러간다
 * current · allowed 는 예전 업그레이드 창(지금 등급 회색 · 고르기)에서 쓰던 것 — 지금은 화면에 안 쓴다
 */
export default function StudioPriceTable({ compact = false, current, allowed }: { compact?: boolean; current?: string; allowed?: string[] } = {}) {
  const yearly = false; // 연 구독만 — 금액은 늘 월 금액으로 보여 준다
  // 창 안도 웹 금액안내와 같은 디자인 (2026-10-31 사장님: 고르기·지금 등급 회색 칸은 촌스러움 → 원래 디자인으로)
  //  스튜디오회원 칸만 늘 주황으로 · 버튼은 모두 [시작하기] (창 안에서는 새 창)
  const isHl = (key: string) => key === "standard";
  /** 칸 색 — Studio 주황 · Business 검은 갈색 (띠 색과 같게) */
  const toneOf = (key: string) => (key === "biz" ? { line: "#1f1714", soft: "#f4f1ef", text: "#1f1714" } : { line: ACCENT, soft: SOFT, text: ACCENT });
  const cellBg = (key: string) => (isHl(key) ? toneOf(key).soft : "#fff");
  const lineOf = (key: string) => (isHl(key) ? toneOf(key).line : LINE);
  const font = "'Pretendard Variable','Pretendard',-apple-system,sans-serif";
  const cols = PLANS.length;
  const W = (cols > 4 ? 250 : 290) * cols; // 다섯 칸이면 칸을 조금 좁게

  return (
    <div style={{ fontFamily: font, color: "#111827", background: "#fff", wordBreak: "keep-all" }}>
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: compact ? "36px 24px 0" : "80px 24px 0", textAlign: "center" }}>
        {TEMP_PRICES && <div style={{ display: "inline-block", marginBottom: 18, padding: "6px 14px", borderRadius: 999, background: "#fef3c7", color: "#92400e", fontSize: 13, fontWeight: 700 }}>임시 금액 · 요금제 금액과 항목은 아직 정해지지 않았어요</div>}
        <h1 style={{ fontSize: compact ? 30 : "clamp(34px,4.4vw,52px)", fontWeight: 600, letterSpacing: "-0.03em", margin: compact ? "0 0 28px" : "0 0 56px" }}>여러분에게 맞는 요금제를 찾아 보세요</h1>

        {/* 연 구독만 — 월·연 고르는 칸은 없앴다 (2026-10-30) */}
        <div style={{ fontSize: 15, color: "#4b5563", marginBottom: compact ? 28 : 40 }}>모든 요금제는 <b style={{ color: "#111827" }}>1년 단위</b>로 결제해요</div>
      </section>

      {/* 요금제 칸 */}
      <section style={{ maxWidth: W, margin: "0 auto", padding: "0 24px", boxSizing: "content-box" }}>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {/* 추천 띠 */}
          {PLANS.map((p) => (
            <div key={p.key + "tag"} style={{ height: 40, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#fff", background: p.tag ? (p.key === "biz" ? "#1f1714" : ACCENT) : "transparent" }}>{p.tag || ""}</div>
          ))}
          {/* 머리 */}
          {PLANS.map((p, i) => {
            const pr = p.price(yearly);
            const hl = isHl(p.key);
            return (
              <div key={p.key + "head"} style={{ position: "relative", padding: "32px 24px 24px", textAlign: "center", background: cellBg(p.key), borderTop: `1px solid ${lineOf(p.key)}`, borderLeft: `1px solid ${lineOf(p.key)}`, borderRight: hl || i === cols - 1 ? `1px solid ${lineOf(p.key)}` : "none" }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 17, fontWeight: 600, color: hl ? toneOf(p.key).text : "#6b7280" }}>{p.icon}{p.name}</div>
                {/* 할인 전 정가 — 줄 긋기 (2026-10-31 사장님: 월 5만 → 특별 할인 월 3만) */}
                <div style={{ marginTop: 14, minHeight: 20, fontSize: 15, color: "#9ca3af" }}>{pr.was ? <><s>₩{pr.was}</s> <b style={{ color: "#dc2626", marginLeft: 4 }}>{Math.round((1 - Number(pr.won.replace(/,/g, "")) / Number(pr.was.replace(/,/g, ""))) * 100)}% 할인</b></> : ""}</div>
                <div style={{ margin: "2px 0 6px", display: "flex", alignItems: "baseline", justifyContent: "center", gap: 4 }}>
                  <span style={{ fontSize: 20, fontWeight: 700 }}>₩</span>
                  <span style={{ fontSize: 30, fontWeight: 700 }}>{pr.won}</span>
                  <span style={{ fontSize: 13, color: "#6b7280" }}>{pr.per}</span>
                </div>
                <div style={{ fontSize: 13, color: "#6b7280", minHeight: 20 }}>{pr.sub || ""}</div>
                <div style={{ fontSize: 12, color: "#9ca3af", minHeight: 18 }}>{pr.day || ""}</div>
                {/* 창 안도 웹 금액안내처럼 모든 칸 [시작하기] — 누르면 새 창으로 신청 (2026-10-31 사장님: "여기 페이지 같이 그냥 신청하게") */}
                <Link href={p.cta.href} target={compact ? "_blank" : undefined} style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 50, marginTop: 20, borderRadius: 8, fontSize: 15, fontWeight: 700, textDecoration: "none", background: p.cta.solid ? (p.key === "biz" ? "#1f1714" : ACCENT) : "#fff", color: p.cta.solid ? "#fff" : ACCENT, border: `1px solid ${p.cta.solid ? (p.key === "biz" ? "#1f1714" : ACCENT) : "#cbd5e1"}` }}>{p.cta.label}</Link>
                <div style={{ marginTop: 20, textAlign: "left", display: "flex", flexDirection: "column", gap: 8 }}>
                  {p.base.map((b) => <div key={b} style={{ fontSize: 14, color: "#374151", display: "flex", gap: 8 }}>{coin}<span><Bold t={b} /></span></div>)}
                </div>
              </div>
            );
          })}
          {/* 사용 가능 항목 */}
          {PLANS.map((p, i) => {
            const hl = isHl(p.key);
            return (
              <div key={p.key + "items"} style={{ padding: "26px 24px", textAlign: "left", background: cellBg(p.key), borderTop: `1px solid ${LINE}`, borderLeft: `1px solid ${lineOf(p.key)}`, borderRight: hl || i === cols - 1 ? `1px solid ${lineOf(p.key)}` : "none" }}>
                <div style={{ fontSize: 14.5, fontWeight: 700, marginBottom: 4 }}>사용 가능 항목</div>
                <div style={{ fontSize: 12.5, color: "#6b7280", marginBottom: 18 }}>{p.key === "free" ? "가입만 하면 바로 써요." : "공실마케팅 앱에서 써요."}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {p.items.map((t) => <div key={t} style={{ fontSize: 14, color: "#4b5563", display: "flex", gap: 8 }}>{check}<span><Bold t={t} /></span>{info}</div>)}
                </div>
              </div>
            );
          })}
          {/* 특별한 기능 */}
          {PLANS.map((p, i) => {
            const hl = isHl(p.key);
            return (
              <div key={p.key + "extra"} style={{ padding: "26px 24px 32px", textAlign: "left", background: cellBg(p.key), borderTop: `1px solid ${LINE}`, borderBottom: `1px solid ${lineOf(p.key)}`, borderLeft: `1px solid ${lineOf(p.key)}`, borderRight: hl || i === cols - 1 ? `1px solid ${lineOf(p.key)}` : "none" }}>
                <div style={{ fontSize: 14.5, fontWeight: 700, marginBottom: 18 }}>{p.extraTitle}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {p.extra.map((t) => <div key={t} style={{ fontSize: 14, color: "#4b5563", display: "flex", gap: 8 }}>{check}<span><Bold t={t} /></span></div>)}
                </div>
              </div>
            );
          })}
        </div>

        {/* 안내 */}
        <ul style={{ margin: "32px 0 0", paddingLeft: 18, fontSize: 13, lineHeight: 1.9, color: "#374151" }}>
          {NOTES.map((n) => <li key={n}>{n}</li>)}
        </ul>
      </section>

      {/* 모든 플랜에서 */}
      {/* 창 안에서도 아래 기능 알약 줄이 흘러가게 (2026-10-31 사장님) */}
      <section style={{ maxWidth: 1440, margin: "0 auto", padding: compact ? "64px 0 72px" : "96px 0 112px", textAlign: "center" }}>
        <style>{MARQUEE_CSS}</style>
        <h2 style={{ fontSize: "clamp(24px,2.6vw,32px)", fontWeight: 600, margin: "0 0 40px" }}>
          모든 요금제에서 <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden style={{ verticalAlign: "-2px" }}><path d="M12 2l2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2z" fill="#f5b301" /></svg>AI를 포함한 다양한 기능을 경험하세요.
        </h2>
        {/* 양 끝은 흐리게 사라지게 (브루처럼) — 마우스를 올리면 멈춘다 */}
        <div className="pm-wrap" style={{ overflow: "hidden", display: "flex", flexDirection: "column", gap: 16, WebkitMaskImage: "linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)", maskImage: "linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)" }}>
          <Marquee items={ROW1} />
          <Marquee items={ROW2} reverse />
        </div>
      </section>

    </div>
  );
}
