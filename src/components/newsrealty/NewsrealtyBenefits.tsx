"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";

// 공실뉴스부동산 혜택 페이지(/newsrealty/benefits/brokerage-article) 본문.
// Claude Design 시안(design/newsrealty, benefits.dc.html)을 옮긴 것. 혜택 5가지를 한 페이지 + 상단 탭으로 보여 준다.
// PC·모바일이 같이 쓰고, 탭 줄이 붙는 높이(tabsTop)만 각자 넘겨준다.

const S = "/images/study/";

type Section = {
  id: string;
  tab: string;
  label: string;
  title: React.ReactNode;
  img: string;
  alt: string;
  bullets?: string[];
};

const sections: Section[] = [
  {
    id: "cobroker",
    tab: "공동중개마케팅",
    label: "01 · 공동중개 마케팅",
    title: <>11만 부동산이 무료 열람 가능<br />공동중개 등록 20건</>,
    img: S + "benefit_joint_contract_stamp_v2.jpg",
    alt: "공동중개 계약",
    bullets: ["부동산 누구나 무료 열람 가능한 공동중개 채널", "매일 실시간 업데이트 경매 열람", "스마트폰 공동중개 등록 지원", "지도/위치 기반 공동중개 검색"],
  },
  {
    id: "report",
    tab: "부동산마케팅",
    label: "02 · 부동산 마케팅",
    title: <>등록된 공실 원클릭!<br />매매보고서와 홈페이지 연동~</>,
    img: S + "benefit-vacancy-hero-real.webp",
    alt: "AI 매매보고서",
    bullets: ["AI 매매보고서 즉시 생성", "공실뉴스 기사 송고 (월 4건)", "유리창 홍보지 출력", "내 물건 연동 홈페이지"],
  },
  {
    id: "blog",
    tab: "블로그 · SNS",
    label: "03 · 블로그 · SNS",
    title: <>블로그/SNS 포스팅 초안을<br />1분 안에 자동 완성!</>,
    img: S + "benefit-sns-posting-real.jpg",
    alt: "블로그·SNS 포스팅 자동 완성",
    bullets: ["네이버 블로그 · 인스타그램 · 페이스북 · 쓰레드", "유튜브 대본 작성", "별도 API 비용 없음 (내 챗GPT, 제미나이 계정 연동)"],
  },
  {
    id: "video",
    tab: "릴스 · 유튜브",
    label: "04 · 릴스 · 유튜브",
    title: <>촬영부터 편집까지<br />12개월 강의 열람</>,
    img: "/images/newsrealty/benefit-capcut-youtube-editing.webp",
    alt: "캡컷으로 부동산 유튜브 편집",
  },
  {
    id: "lecture",
    tab: "강의 업로딩",
    label: "05 · 강의 업로딩",
    title: <>공실스터디 강의 등록</>,
    img: S + "real-estate-youtube-filming.png",
    alt: "스마트폰으로 강의 촬영",
    bullets: ["공실스터디 강의 등록 권한", "스마트폰 촬영부터 강의 편집 VOD 강의 제공", "내 지역/단지 특징, 상권 분석, 급매물/경매 강의 등록", "강의 포인트를 현금으로 수익화 가능", "전국 중개망에 홍보 · 공동중개 네트워크 강화"],
  },
];

// 탭·구역 제목 옆 픽토그램. 소개 페이지와 같은 24×24 라인 아이콘(stroke 1.6).
const ICONS: Record<string, React.ReactNode> = {
  cobroker: <><circle cx="9" cy="8" r="3" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><circle cx="17" cy="9" r="2.5" /><path d="M15.5 14.2c3 .2 5.5 2.6 5.5 5.8" /></>,
  report: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 17v-3M12 17V9M16 17v-5" /></>,
  blog: <><path d="M4 5h16v11H9l-5 4z" /><path d="M8 9.5h8M8 12.5h5" /></>,
  video: <><rect x="2.5" y="5.5" width="19" height="13" rx="4" /><path d="M10.5 9.5v5l4-2.5z" fill="currentColor" /></>,
  lecture: <><rect x="3" y="4.5" width="18" height="12" rx="2" /><path d="M8 20h8M12 16.5V20" /></>,
};

function Pictogram({ id, size, color }: { id: string; size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ color, display: "block", flex: "none" }}>
      {ICONS[id]}
    </svg>
  );
}

const videoTags = ["브루 AI", "캡컷", "챗GPT 대본"];
const videoLines = [
  "내 부동산 유튜브 실습 VOD 강의 무료 열람",
  "브루, 캡컷, 컷편집부터, AI 활용 영상 편집까지~",
  "매월 4회, 방송국 PD출신 공실뉴스 편집장 새로운 강의 제공",
  "자료실, 드론 영상은 저작권 걱정 없이 내 영상에 사용할 수 있습니다.",
];

const CSS = `
.nrb{--bg:oklch(0.995 0 0);--surface:oklch(0.965 0.012 70);--text:oklch(0.27 0.02 55);--accent:oklch(0.6 0.17 48);--accent-700:oklch(0.48 0.14 45);--divider:color-mix(in srgb, oklch(0.27 0.02 55) 14%, transparent);--n300:oklch(0.38 0.02 55);--n400:oklch(0.48 0.02 55);--n500:oklch(0.52 0.02 55);--dark:#2a211c;--on-dark-accent:oklch(0.78 0.12 60);
  background:var(--bg);color:var(--text);font-family:"Pretendard","Pretendard Variable",system-ui,sans-serif;font-size:15px;line-height:1.55;word-break:keep-all;-webkit-font-smoothing:antialiased;text-align:left}
.nrb *,.nrb *::before,.nrb *::after{box-sizing:border-box}
.nrb h1,.nrb h2{font-family:inherit;font-weight:700;color:var(--text)}
.nrb-tab{display:inline-flex;align-items:center;gap:6px;padding:12px 14px;font-size:14px;text-decoration:none;white-space:nowrap;border-bottom:2px solid transparent;color:var(--n400);font-weight:400}
.nrb-tab.on{border-bottom-color:var(--accent);color:var(--text);font-weight:500}
.nrb-sec{max-width:1120px;margin:0 auto;padding:128px 24px 0;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr));gap:48px;align-items:center}
.nrb-h2{font-size:clamp(26px,3.4vw,34px);line-height:1.3;margin:0;letter-spacing:-0.02em}
.nrb-img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:14px;background:var(--surface);display:block}
.nrb-btn{display:inline-flex;align-items:center;justify-content:center;text-decoration:none;font-family:inherit;font-weight:500;font-size:15px;line-height:1.2;border:1px solid transparent;border-radius:8px;padding:12px 20px;cursor:pointer;background:transparent}
.nrb .nrb-btn-cta{color:#fff;font-weight:700;background:var(--accent);border-color:var(--accent)}
.nrb .nrb-btn-cta:hover{color:#fff;background:var(--accent-700);border-color:var(--accent-700)}
.nrb .nrb-btn-cta-ghost{color:#fff;border-color:rgba(255,255,255,0.35)}
.nrb .nrb-btn-cta-ghost:hover{color:#fff;background:rgba(255,255,255,0.1)}
`;

export default function NewsrealtyBenefits({
  onApply,
  inquiryHref = "/newsrealty/guide/inquiry",
  tabsTop = 0,
  showFooter = false,
}: {
  onApply: () => void;
  inquiryHref?: string;
  // 탭 줄이 붙을 위치. 위에 고정되는 헤더 높이만큼 내린다.
  tabsTop?: number;
  showFooter?: boolean;
}) {
  const [active, setActive] = useState(sections[0].id);

  // 탭 줄 고정. 사이트 body 에 overflow-x:hidden 이 걸려 있어 CSS sticky 가 안 먹으므로
  // 공실스터디 메뉴 줄(StudyHeader)처럼 원래 자리(slot)가 tabsTop 에 닿으면 fixed 로 바꾼다.
  const slotRef = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);
  const [slotHeight, setSlotHeight] = useState<number | undefined>(undefined);
  useEffect(() => {
    const check = () => {
      const el = slotRef.current;
      if (!el) return;
      const isStuck = el.getBoundingClientRect().top <= tabsTop && window.scrollY > 0;
      if (isStuck) setSlotHeight((h) => h ?? el.offsetHeight);
      setStuck(isStuck);
    };
    const raf = window.requestAnimationFrame(check);
    window.addEventListener("scroll", check, { passive: true });
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("scroll", check);
    };
  }, [tabsTop]);

  // 스크롤 위치에 따라 활성 탭을 바꾼다
  useEffect(() => {
    const els = sections.map((s) => document.getElementById(s.id)).filter((el): el is HTMLElement => !!el);
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-40% 0px -55% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const goTo = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (!el) return;
    setActive(id);
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - tabsTop - 64, behavior: "smooth" });
  };

  const applyClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onApply();
  };

  return (
    <div className="nrb">
      <style>{CSS}</style>

      {/* 혜택 탭 줄 */}
      <div ref={slotRef} style={{ height: stuck ? slotHeight : undefined }}>
        <div
          style={{
            ...(stuck ? { position: "fixed", top: tabsTop, left: 0, width: "100%", zIndex: 9999980 } : {}),
            background: "color-mix(in srgb, oklch(0.995 0 0) 92%, transparent)",
            backdropFilter: "blur(10px)",
            borderBottom: "1px solid var(--divider)",
          }}
        >
          <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 24px", display: "flex", gap: 4, overflowX: "auto" }}>
            {sections.map((s) => (
              <a key={s.id} href={"#" + s.id} onClick={(e) => goTo(e, s.id)} className={"nrb-tab" + (active === s.id ? " on" : "")}>
                <Pictogram id={s.id} size={16} color={active === s.id ? "#d9661f" : "currentColor"} />
                {s.tab}
              </a>
            ))}
          </div>
        </div>
      </div>

      <main>
        {/* 맨 위 제목: 화면 끝까지 미색 배경 (소개 페이지 히어로와 같은 색) */}
        <div style={{ background: "#fbf6ee" }}>
          <section style={{ maxWidth: 1120, margin: "0 auto", padding: "88px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
            <span style={{ fontSize: 13, color: "var(--accent-700)" }}>공실뉴스 부동산 주요 혜택</span>
            <h1 style={{ fontSize: "clamp(32px,4.6vw,48px)", lineHeight: 1.2, letterSpacing: "-0.025em", margin: 0, textWrap: "balance" }}>
              공동중개 + 매매보고서 + 블로그/SNS포스팅 + 유튜브강의까지!<br />AI 시대! 부동산 마케팅 쉬워집니다.
            </h1>
          </section>
        </div>

        {sections.map((s, i) => (
          <section key={s.id} id={s.id} className="nrb-sec" style={i === 0 ? { paddingTop: 96 } : undefined}>
            <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 480 }}>
              <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 52, height: 52, borderRadius: 14, background: "var(--surface)" }}>
                <Pictogram id={s.id} size={28} color="#d9661f" />
              </span>
              <span style={{ fontSize: 13, color: "var(--accent)" }}>{s.label}</span>
              <h2 className="nrb-h2">{s.title}</h2>
              {s.id === "video" ? (
                <>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {videoTags.map((t) => (
                      <span key={t} style={{ display: "inline-flex", alignItems: "center", fontSize: 11, letterSpacing: "0.02em", padding: "3px 10px", borderRadius: 6, background: "var(--surface)", color: "var(--text)" }}>{t}</span>
                    ))}
                  </div>
                  {videoLines.map((l) => (
                    <p key={l} style={{ margin: 0, fontSize: 15, lineHeight: 1.7, color: "var(--n300)" }}>{l}</p>
                  ))}
                </>
              ) : (
                <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10, fontSize: 15, color: "var(--n300)" }}>
                  {s.bullets!.map((b) => <li key={b}>{b}</li>)}
                </ul>
              )}
            </div>
            <img src={s.img} alt={s.alt} className="nrb-img" />
          </section>
        ))}

        {/* CTA: 화면 끝까지 진한 배경 */}
        <div style={{ background: "var(--dark)", marginTop: 128 }}>
          <section style={{ maxWidth: 1120, margin: "0 auto", padding: "96px 24px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 640 }}>
              <h2 style={{ fontSize: "clamp(28px,4vw,40px)", lineHeight: 1.25, margin: 0, letterSpacing: "-0.02em", color: "#ffffff" }}>
                AI 시대, 공실뉴스가 대표님의 마케팅을 함께 합니다.
              </h2>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <a href="/newsrealty/apply" onClick={applyClick} className="nrb-btn nrb-btn-cta">공실뉴스부동산 신청하기</a>
                <Link href={inquiryHref} className="nrb-btn nrb-btn-cta-ghost">1:1문의 접수</Link>
              </div>
            </div>
          </section>
        </div>
      </main>

      {showFooter && (
        <footer style={{ maxWidth: 1120, margin: "0 auto", padding: "32px 24px 48px", fontSize: 12, lineHeight: 1.7, color: "var(--n500)", borderTop: "1px solid var(--divider)" }}>
          (주)공실마케팅 · 공실뉴스 · 고객센터 1555-5343
        </footer>
      )}
    </div>
  );
}
