"use client";

// 공실스터디 멤버십혜택 상세 페이지 공통 틀 (2026-10-12).
// 멤버십혜택(/study/benefits, NewsrealtyBenefits tone="green")과 같은 글꼴·여백·녹색·버튼을 쓴다.
// 순서: 맨 위 요약 → 이런 고민 → 기능(사진+설명) → 사용 순서 → 자주 묻는 질문 → 신청 띠.
// 그리드는 auto-fit 이라 휴대폰 폭에서도 알아서 한 줄로 내려온다.
import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export type BenefitDetailFeature = {
  label: string;
  title: string;
  body: string;
  points?: string[];
  img: string;
  alt: string;
};

export type BenefitDetailContent = {
  kicker: string;
  title: string;
  lead: string;
  chips?: string[];
  heroImg: string;
  heroAlt: string;
  problems: string[];
  features: BenefitDetailFeature[];
  steps: { t: string; d: string }[];
  faqs: { q: string; a: string }[];
  ctaTitle: string;
};

/** 상세 페이지끼리 오가는 탭. 이름은 멤버십혜택 탭과 같은 말로 쓴다 */
const DETAIL_TABS = [
  { label: "공실등록 · 매매보고서", href: "/study/benefits/vacancy-register" },
  { label: "블로그 · SNS", href: "/study/benefits/blog-automation" },
  { label: "릴스 · 유튜브", href: "/study/benefits/ai-youtube" },
  { label: "강의 업로딩", href: "/study/about" },
];

// 공실스터디 메뉴 줄이 위에 붙었을 때의 높이. 탭 줄이 그 아래에 붙는다.
const TABS_TOP = 65;

const CSS = `
.sbd{--bg:#ffffff;--cream:#f0f9f4;--surface:oklch(0.965 0.012 165);--text:oklch(0.25 0.015 165);--accent:#059669;--accent-700:#047857;--accent-200:#d1fae5;--n300:oklch(0.38 0.012 165);--n400:oklch(0.48 0.012 165);--n500:oklch(0.55 0.01 165);--divider:color-mix(in srgb, oklch(0.25 0.015 165) 12%, transparent);--dark:#0c2a22;--on-dark-accent:#6ee7b7;
  background:var(--bg);color:var(--text);font-family:"Pretendard","Pretendard Variable",system-ui,sans-serif;font-size:15px;line-height:1.6;word-break:keep-all;-webkit-font-smoothing:antialiased;text-align:left}
.sbd *,.sbd *::before,.sbd *::after{box-sizing:border-box}
.sbd h1,.sbd h2,.sbd h3,.sbd p{margin:0}
.sbd-wrap{max-width:1120px;margin:0 auto;padding:0 24px}
.sbd-tab{display:inline-flex;align-items:center;padding:12px 14px;font-size:14px;text-decoration:none;white-space:nowrap;border-bottom:2px solid transparent;color:var(--n400)}
.sbd-tab.on{border-bottom-color:var(--accent);color:var(--text);font-weight:600}
.sbd-tab.back{color:var(--accent-700);font-weight:700}
.sbd-hero{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr));gap:48px;align-items:center;padding:72px 24px 80px}
.sbd-h1{font-size:clamp(30px,4.4vw,46px);line-height:1.25;letter-spacing:-0.025em;font-weight:800;white-space:pre-line}
.sbd-h2{font-size:clamp(24px,3.2vw,32px);line-height:1.3;letter-spacing:-0.02em;font-weight:700}
.sbd-kicker{font-size:13px;color:var(--accent-700);font-weight:600}
.sbd-lead{font-size:17px;line-height:1.7;color:var(--n300)}
.sbd-img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:14px;background:var(--surface);display:block}
.sbd-chip{display:inline-flex;align-items:center;padding:6px 12px;border-radius:999px;background:#fff;border:1px solid var(--divider);font-size:13px;font-weight:600;color:var(--n300)}
.sbd-sec{padding:112px 0 0}
.sbd-grid3{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:12px}
.sbd-card{padding:24px;border-radius:14px;background:var(--surface);font-size:16px;font-weight:600;line-height:1.5}
.sbd-feat{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr));gap:48px;align-items:center;padding-top:96px}
.sbd-feat.rev>:first-child{order:2}
@media (max-width:880px){.sbd-feat.rev>:first-child{order:0}}
.sbd-points{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:8px}
.sbd-points li{display:flex;gap:8px;font-size:15px;color:var(--n300)}
.sbd-points li::before{content:"✓";color:var(--accent);font-weight:800}
.sbd-step{display:flex;flex-direction:column;gap:8px;padding:22px;border-radius:14px;border:1px solid var(--divider);background:#fff}
.sbd-step b{font-size:13px;color:var(--accent-700)}
.sbd-faq{border-top:1px solid var(--divider)}
.sbd-faq button{all:unset;cursor:pointer;display:flex;justify-content:space-between;gap:16px;width:100%;padding:20px 0;font-size:16px;font-weight:600;color:var(--text)}
.sbd-btn{display:inline-flex;align-items:center;justify-content:center;text-decoration:none;font-weight:700;font-size:15px;border-radius:8px;padding:13px 22px;border:1px solid transparent}
.sbd-btn-cta{color:#fff!important;background:var(--accent);border-color:var(--accent)}
.sbd-btn-cta:hover{background:var(--accent-700);border-color:var(--accent-700)}
.sbd-btn-ghost{color:#fff!important;border-color:rgba(255,255,255,0.35)}
.sbd-btn-ghost:hover{background:rgba(255,255,255,0.1)}
.sbd-btn-line{color:var(--accent-700)!important;border-color:var(--accent);background:#fff}
`;

export default function StudyBenefitDetail({ c }: { c: BenefitDetailContent }) {
  const pathname = usePathname() || "";
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="sbd">
      <style>{CSS}</style>

      {/* 상세 페이지 탭 (메뉴 줄 아래에 붙는다) */}
      <div style={{ position: "sticky", top: TABS_TOP, zIndex: 50, background: "rgba(255,255,255,0.94)", backdropFilter: "blur(10px)", borderBottom: "1px solid var(--divider)" }}>
        <div className="sbd-wrap" style={{ display: "flex", gap: 4, overflowX: "auto" }}>
          <Link href="/newsrealty/benefits/brokerage-article" className="sbd-tab back">← 멤버십혜택 전체</Link>
          {DETAIL_TABS.map((t) => (
            <Link key={t.href} href={t.href} className={"sbd-tab" + (pathname.startsWith(t.href) ? " on" : "")}>
              {t.label}
            </Link>
          ))}
        </div>
      </div>

      <main>
        {/* ① 맨 위 요약 */}
        <div style={{ background: "var(--cream)" }}>
          <section className="sbd-wrap sbd-hero">
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <span className="sbd-kicker">{c.kicker}</span>
              <h1 className="sbd-h1">{c.title}</h1>
              <p className="sbd-lead">{c.lead}</p>
              {c.chips && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {c.chips.map((t) => <span key={t} className="sbd-chip">{t}</span>)}
                </div>
              )}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 4 }}>
                <Link href="/newsrealty/apply" className="sbd-btn sbd-btn-cta">공실뉴스부동산 신청하기 &gt;</Link>
              </div>
            </div>
            <img src={c.heroImg} alt={c.heroAlt} className="sbd-img" />
          </section>
        </div>

        {/* ② 이런 고민 */}
        <section className="sbd-wrap sbd-sec">
          <span className="sbd-kicker">이런 고민 있으셨죠?</span>
          <div className="sbd-grid3" style={{ marginTop: 16 }}>
            {c.problems.map((p) => <div key={p} className="sbd-card">{p}</div>)}
          </div>
        </section>

        {/* ③ 기능: 사진 + 설명 (좌우 번갈아) */}
        <section className="sbd-wrap">
          {c.features.map((f, i) => (
            <div key={f.title} className={"sbd-feat" + (i % 2 ? " rev" : "")}>
              <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 500 }}>
                <span className="sbd-kicker">{String(i + 1).padStart(2, "0")} · {f.label}</span>
                <h2 className="sbd-h2">{f.title}</h2>
                <p style={{ fontSize: 16, color: "var(--n300)" }}>{f.body}</p>
                {f.points && (
                  <ul className="sbd-points">
                    {f.points.map((p) => <li key={p}>{p}</li>)}
                  </ul>
                )}
              </div>
              <img src={f.img} alt={f.alt} className="sbd-img" />
            </div>
          ))}
        </section>

        {/* ④ 사용 순서 */}
        <section className="sbd-wrap sbd-sec">
          <span className="sbd-kicker">사용 순서</span>
          <h2 className="sbd-h2" style={{ marginTop: 8 }}>이렇게 쓰시면 됩니다</h2>
          <div className="sbd-grid3" style={{ marginTop: 28, gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,190px),1fr))" }}>
            {c.steps.map((s, i) => (
              <div key={s.t} className="sbd-step">
                <b>STEP {i + 1}</b>
                <span style={{ fontSize: 17, fontWeight: 700 }}>{s.t}</span>
                <span style={{ fontSize: 14, color: "var(--n400)" }}>{s.d}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ⑤ 자주 묻는 질문 */}
        <section className="sbd-wrap sbd-sec">
          <span className="sbd-kicker">자주 묻는 질문</span>
          <div style={{ marginTop: 16, borderBottom: "1px solid var(--divider)" }}>
            {c.faqs.map((f, i) => (
              <div key={f.q} className="sbd-faq">
                <button type="button" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}>
                  <span>Q. {f.q}</span>
                  <span style={{ color: "var(--n500)" }}>{open === i ? "−" : "+"}</span>
                </button>
                {open === i && <p style={{ padding: "0 0 20px", fontSize: 15, color: "var(--n300)", whiteSpace: "pre-line" }}>{f.a}</p>}
              </div>
            ))}
          </div>
        </section>

        {/* ⑥ 신청 띠 */}
        <div style={{ background: "var(--dark)", marginTop: 112 }}>
          <section className="sbd-wrap" style={{ padding: "88px 24px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 22, maxWidth: 640 }}>
              <span style={{ fontSize: 14, color: "var(--on-dark-accent)" }}>공실뉴스부동산 · 1년 36만원 (월 3만원꼴)</span>
              <h2 style={{ fontSize: "clamp(26px,3.8vw,38px)", lineHeight: 1.3, letterSpacing: "-0.02em", color: "#fff", fontWeight: 700 }}>{c.ctaTitle}</h2>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <Link href="/newsrealty/apply" className="sbd-btn sbd-btn-cta">공실뉴스부동산 신청하기 &gt;</Link>
                <Link href="/study" className="sbd-btn sbd-btn-ghost">강의 둘러보기 &gt;</Link>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
