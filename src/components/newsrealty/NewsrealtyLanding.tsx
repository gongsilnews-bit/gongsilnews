"use client";

import React from "react";
import Link from "next/link";

// 공실뉴스부동산 소개(/newsrealty) 본문. Claude Design 시안(design/newsrealty, v3)을 옮긴 것.
// PC(/newsrealty)와 모바일(/m/newsrealty)이 같이 쓴다. 그리드는 auto-fit 이라 폭에 따라 알아서 줄바꿈된다.

const S = "/images/study/";

type IconKey =
  | "report" | "news" | "click" | "share" | "blog" | "insta" | "fb"
  | "threads" | "yt" | "home" | "lecture" | "sns";

const ICON_PATHS: Record<IconKey, React.ReactNode> = {
  report: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 17v-3M12 17V9M16 17v-5" /></>,
  news: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 8h10M7 12h6M7 16h10" /></>,
  click: <><path d="M9 3v3M3 9h3M5 5l2 2" /><path d="M10 10l10 4-4 1.5-1.5 4z" /></>,
  share: <><path d="M12 3v12M8 7l4-4 4 4" /><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" /></>,
  blog: <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 8h6M9 12h6M9 16h4" /></>,
  insta: <><rect x="3.5" y="3.5" width="17" height="17" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17" cy="7" r="0.8" fill="currentColor" /></>,
  fb: <><circle cx="12" cy="12" r="9" /><path d="M15 8.5h-1.5a2 2 0 0 0-2 2V21M9 13h5.5" /></>,
  threads: <><circle cx="12" cy="12" r="3.5" /><path d="M15.5 12v1.5a2.5 2.5 0 0 0 5 0V12a8.5 8.5 0 1 0-3.5 6.9" /></>,
  yt: <><rect x="2.5" y="5.5" width="19" height="13" rx="4" /><path d="M10.5 9.5v5l4-2.5z" fill="currentColor" /></>,
  home: <><path d="M4 10.5 12 4l8 6.5V20H4z" /><path d="M10 20v-5h4v5" /></>,
  lecture: <><rect x="3" y="4.5" width="18" height="12" rx="2" /><path d="M8 20h8M12 16.5V20" /></>,
  sns: <><path d="M4 5h16v11H9l-5 4z" /><path d="M8 9.5h8M8 12.5h5" /></>,
};

function Icon({ name, size }: { name: IconKey; size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ color: "#d9661f", display: "block", flex: "none" }}
    >
      {ICON_PATHS[name]}
    </svg>
  );
}

const chips = ["AI 공동중개등록", "AI 매매보고서", "AI 블로그 포스팅", "AI SNS 인스타그램", "부동산홈페이지", "유리창홍보지", "강의 채널 개설 (수익화)"];

const advantages: { ic: IconKey; n: string; t: string; d: string }[] = [
  { ic: "news", n: "01 기본 혜택", t: "공실 20건 · 매월 언론 기사 4건 등록", d: "전국 11만 부동산이 무료 열람하는 공실뉴스에 매물과 기사를 등록 · 홍보합니다." },
  { ic: "report", n: "02 AI 마케팅", t: "매매보고서 · 유리창홍보지 · 홈페이지", d: "등록한 공실을 분석해 AI가 매매보고서 초안, 유리창홍보지 및 부동산홈페이지를 제작해 드립니다." },
  { ic: "click", n: "03 AI 원클릭", t: "유튜브 대본 · 블로그 · SNS", d: "기사 초안부터 블로그 글, SNS, 유튜브 대본까지 한 번의 클릭으로 완성합니다." },
];

const steps: { ic: IconKey; n: string; t: string; d: string }[] = [
  { ic: "share", n: "01", t: "공동중개 등록", d: "11만 중개망 실시간 노출" },
  { ic: "report", n: "02", t: "AI 매물보고서", d: "10초 완성 브리핑 리포트" },
  { ic: "news", n: "03", t: "AI 기사초안", d: "공실뉴스 기사 등록" },
  { ic: "sns", n: "04", t: "SNS · 블로그 · 유튜브 대본", d: "원클릭 멀티유즈 AI 자동화" },
  { ic: "home", n: "05", t: "부동산홈페이지", d: "내 등록 기사, 홈페이지 자동화" },
];

type PhotoCard = { img: string; k: string; t: string; d: string };

const big: PhotoCard[] = [
  { img: S + "study-real-corp-filming.webp", k: "전문 기획 · 촬영팀 상주", t: "부동산 유튜브 채널 운영", d: "전담 PD와 드론으로 매주 임장 영상과 쇼츠를 올립니다." },
  { img: S + "study-real-corp-report.webp", k: "전문적인 온라인 작업", t: "매매보고서 · 홈페이지 운영", d: "전문적인 보고서와 홈페이지를 꾸준히 운영합니다." },
  { img: S + "study-real-corp-sns.webp", k: "팀별 채널 운영", t: "SNS 마케팅 채널 운영", d: "젊은 고객에게 부동산 정보를 SNS로 빠르게 전달합니다." },
];

const local: PhotoCard[] = [
  { img: S + "study-real-local-cost.webp", k: "비용 부담", t: "비싼 광고비와 고정비", d: "마케팅 대행은 엄두가 나지 않습니다." },
  { img: S + "study-real-local-busy.webp", k: "시간 부족", t: "혼자 하는 과중한 업무", d: "하루 종일 일하고 나면 글 한 편 쓰기도 어렵습니다." },
  { img: S + "study-real-local-camera.webp", k: "제작 장벽", t: "스마트폰 앞에만 서면 막막", d: "장비도 없고 편집 툴도 낯설어 시작이 어렵습니다." },
];

const benefits: { ic: IconKey; k: string; t: string; items: string[] }[] = [
  { ic: "report", k: "공실 등록 20건", t: "부동산 마케팅", items: ["공동중개 물건 홍보", "AI 매매보고서 즉시 생성", "유리창 홍보지 자동 출력", "내 물건 연동 홈페이지"] },
  { ic: "sns", k: "공실 등록하면", t: "SNS 마케팅 자동화", items: ["AI 블로그 포스팅 초안", "인스타그램 · 페이스북 · 쓰레드 초안", "유튜브 대본 초안", "인테리어 · 리모델링 AI 견적 등등"] },
  { ic: "yt", k: "부동산 유튜브 강의", t: "유튜브 실습 · 커뮤니티", items: ["브루AI · 캡컷 편집 강의", "AI 대본 활용 영상 제작", "드론 영상 · Q&A 커뮤니티"] },
  { ic: "lecture", k: "강의 개설 지원", t: "내 온라인 강의 개설", items: ["공실뉴스 강의 등록 권한", "촬영법 및 편집법 VOD 제공", "물건소개, 단지/지역 시세 강의 등록", "강의 수익화 가능 (공실포인트)"] },
];

const recs = [
  { img: S + "recommend_real_teheran_man.jpg", t: "사무실 · 상가 전문", d: "빠른 브리핑이 필요할 때, AI 매매보고서 10초 완성." },
  { img: S + "recommend_real_apartment.jpg", t: "아파트 · 오피스텔 입점", d: "블로그, SNS 꾸준한 포스팅 및 매물접수 홈페이지로 차별화!" },
  { img: S + "recommend_real_villa.jpg", t: "빌라 · 주택 · 건물", d: "유튜브 동영상 제작법을 배우고, 강의 수익을 원하는 소장님!" },
];

const channels: { t: string; ic: IconKey }[] = [
  { t: "블로그", ic: "blog" },
  { t: "인스타그램", ic: "insta" },
  { t: "페이스북", ic: "fb" },
  { t: "쓰레드", ic: "threads" },
  { t: "유튜브", ic: "yt" },
];

const rows = [
  { a: "공실 등록", b: "최초 3건", c: "월 20건 · 11만 중개망 노출" },
  { a: "기사 등록", b: "최초 3건", c: "월 4건" },
  { a: "AI 물건보고서", b: "일부 열람", c: "무제한 생성" },
  { a: "매물 광고 등록", b: "—", c: "가능" },
  { a: "정회원 커뮤니티", b: "—", c: "가입" },
  { a: "실무 자료실", b: "—", c: "서식 · 특약 · 계약서 다운로드" },
  { a: "드론 영상", b: "—", c: "저작권 무료 상업 이용" },
  { a: "공실스터디 강좌", b: "—", c: "일부 무료 수강" },
];

const faqs: { q: string; badge?: string; a: string }[] = [
  { q: "공실뉴스부동산은 어떤 서비스인가요?", a: "공실뉴스에 공실 매물과 기사를 등록하면, AI가 매매보고서와 블로그 · SNS · 유튜브 대본 초안을 만들어 주는 12개월 공실등록 멤버십입니다." },
  { q: "블로그나 유튜브를 잘 모르는 초보도 할 수 있나요?", a: "네. 글은 AI가 초안을 작성하고, 영상은 촬영부터 편집까지 실습 강의로 안내합니다." },
  { q: "블로그 포스팅 초안은 어떻게 작성하나요? 별도 비용이 드나요?", a: "크롬 확장프로그램을 설치하면 바로 작성할 수 있습니다. 본인이 구독 중인 챗GPT 또는 제미나이 계정이 필요합니다." },
  { q: "결제는 어떻게 하나요?", badge: "12개월 무이자 특별 이벤트", a: "지금 12개월 무이자 특별 이벤트를 진행 중입니다. 신청 후 네이버 쇼핑몰에서 결제하시면 바로 사용하실 수 있습니다." },
  { q: "모든 기사를 작성할 수 있나요?", a: "공실뉴스의 물건 기사를 작성할 수 있습니다. 기사는 작성 후 승인 신청을 거쳐 게재됩니다." },
  { q: "신청 후 절차는 어떻게 되나요?", a: "네이버 쇼핑몰에서 결제하시면, 승인 이후 자동으로 공실 등록 20건과 기사 4편을 작성하실 수 있습니다." },
];

const CSS = `
.nrl{--bg:oklch(0.995 0 0);--surface:oklch(0.965 0.012 70);--text:oklch(0.27 0.02 55);--accent:oklch(0.6 0.17 48);--cream:#fbf6ee;--accent-200:oklch(0.93 0.05 60);--accent-700:oklch(0.48 0.14 45);--accent-800:oklch(0.42 0.13 44);--divider:color-mix(in srgb, oklch(0.27 0.02 55) 14%, transparent);--n100:oklch(0.995 0 0);--n200:oklch(0.93 0.02 72);--n300:oklch(0.38 0.02 55);--n400:oklch(0.48 0.02 55);--n500:oklch(0.52 0.02 55);--r-md:8px;--r-lg:14px;
  background:var(--bg);color:var(--text);font-family:"Pretendard","Pretendard Variable",system-ui,sans-serif;font-size:15px;line-height:1.55;font-weight:400;word-break:keep-all;-webkit-font-smoothing:antialiased;text-align:left}
.nrl *,.nrl *::before,.nrl *::after{box-sizing:border-box}
.nrl h1,.nrl h2,.nrl h3{font-family:inherit;font-weight:700;line-height:1.12;letter-spacing:-0.015em;color:var(--text)}
.nrl b,.nrl strong{font-weight:700}
.nrl a{color:var(--accent);text-underline-offset:3px}
.nrl a:hover{color:var(--accent-700)}
.nrl img{display:block;max-width:100%}
.nrl :focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.nrl summary{list-style:none}
.nrl summary::-webkit-details-marker{display:none}
.nrl-sec{max-width:1120px;margin:0 auto;padding:112px 24px 0;scroll-margin-top:70px}
.nrl-sec.wide{padding-top:128px}
.nrl-h2{font-size:clamp(26px,3.4vw,34px);margin:0 0 12px;letter-spacing:-0.02em}
.nrl-lead{margin:0 0 48px;font-size:16px;color:var(--n400)}
.nrl-grid3{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:24px}
.nrl-grid4{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr));gap:24px}
.nrl-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;cursor:pointer;text-decoration:none;font-family:inherit;font-weight:500;font-size:15px;line-height:1.2;background:transparent;border:1px solid transparent;border-radius:var(--r-md);padding:12px 20px}
.nrl .nrl-btn-outline{color:var(--accent);border-color:var(--accent)}
.nrl .nrl-btn-outline:hover{color:var(--accent);background:color-mix(in srgb, var(--accent) 12%, transparent)}
.nrl .nrl-btn-solid{color:#fff;font-weight:700;background:var(--accent-700);border-color:var(--accent-700)}
.nrl .nrl-btn-solid:hover{color:#fff;background:var(--accent-800);border-color:var(--accent-800)}
.nrl .nrl-btn-ghost{color:var(--text);border-color:var(--divider)}
.nrl .nrl-btn-ghost:hover{color:var(--text);background:color-mix(in srgb, var(--text) 7%, transparent)}
.nrl-photo{width:100%;object-fit:cover;border-radius:var(--r-lg);background:var(--surface)}
.nrl-table{width:100%;border-collapse:collapse;font-size:15px}
@media (max-width:600px){.nrl-table{font-size:14px}.nrl-table td,.nrl-table th{padding-left:4px;padding-right:4px}.nrl-th-price{font-size:16px}}
.nrl-table th{text-align:left;font-size:11px;font-weight:500;letter-spacing:0.08em;color:color-mix(in srgb, var(--text) 60%, transparent);padding:12px 8px;vertical-align:bottom}
.nrl-table td{padding:14px 8px}
.nrl-table thead tr{background:linear-gradient(to right,transparent,var(--divider) 48px,var(--divider) calc(100% - 48px),transparent) no-repeat bottom / 100% 1px}
.nrl-table tbody tr{background:linear-gradient(to right,transparent,color-mix(in srgb, var(--text) 8%, transparent) 48px,color-mix(in srgb, var(--text) 8%, transparent) calc(100% - 48px),transparent) no-repeat bottom / 100% 1px}
.nrl-table tbody tr:hover{background:linear-gradient(color-mix(in srgb, var(--text) 4%, transparent),color-mix(in srgb, var(--text) 4%, transparent)),linear-gradient(to right,transparent,color-mix(in srgb, var(--text) 8%, transparent) 48px,color-mix(in srgb, var(--text) 8%, transparent) calc(100% - 48px),transparent) no-repeat bottom / 100% 1px}
.nrl-th-price{display:inline-block;font-size:18px;letter-spacing:0;color:var(--text);font-weight:700}
`;

// 일반 부동산 vs 공실뉴스부동산 금액·혜택 비교표. 금액안내 페이지(/newsrealty/pricing)도 이것을 쓴다.
function PriceTable() {
  return (
    <div style={{ overflowX: "auto" }}>
      <table className="nrl-table">
        <thead>
          <tr>
            <th style={{ width: "30%" }}>항목</th>
            <th style={{ width: "28%" }}>
              일반 부동산<br /><span className="nrl-th-price">무료</span>
            </th>
            <th style={{ width: "42%", color: "var(--accent)" }}>
              공실뉴스부동산<br /><span className="nrl-th-price">₩30,000 / 월</span><br />
              <span style={{ fontSize: 13, letterSpacing: 0, color: "var(--accent-700)", fontWeight: 700 }}>12개월 36만 원</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.a}>
              <td style={{ color: "var(--n300)" }}>{r.a}</td>
              <td style={{ color: "var(--n500)" }}>{r.b}</td>
              <td>{r.c}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PhotoCards({ items, kickerColor }: { items: PhotoCard[]; kickerColor: string }) {
  return (
    <div className="nrl-grid3">
      {items.map((b) => (
        <div key={b.t} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <img src={b.img} alt={b.t} className="nrl-photo" style={{ aspectRatio: "3 / 2" }} />
          <span style={{ fontSize: 12, color: kickerColor }}>{b.k}</span>
          <h3 style={{ fontSize: 18, margin: 0 }}>{b.t}</h3>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: "var(--n300)" }}>{b.d}</p>
        </div>
      ))}
    </div>
  );
}

export default function NewsrealtyLanding({
  onApply,
  benefitsHref = "/newsrealty/benefits/brokerage-article",
  showFooter = false,
}: {
  onApply: () => void;
  benefitsHref?: string;
  // PC 는 사이트 공통 푸터가 있어 끄고, 모바일에서만 켠다
  showFooter?: boolean;
}) {
  const applyClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onApply();
  };

  return (
    <div className="nrl">
      <style>{CSS}</style>

      <main id="top">
        {/* Hero + 기능 칩: 화면 끝까지 미색 배경 */}
        <div style={{ background: "var(--cream)", paddingBottom: 72 }}>
        <section style={{ maxWidth: 1120, margin: "0 auto", padding: "64px 24px 72px", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,420px),1fr))", gap: 48, alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 520 }}>
            <span style={{ display: "inline-flex", alignItems: "center", alignSelf: "flex-start", fontSize: 11, letterSpacing: "0.02em", padding: "3px 10px", borderRadius: 6, background: "var(--accent-200)", color: "var(--accent-700)" }}>
              11만 부동산 무료 열람 채널
            </span>
            <h1 style={{ fontSize: "clamp(34px,5vw,50px)", lineHeight: 1.2, letterSpacing: "-0.025em", margin: 0, textWrap: "balance" }}>
              유튜브, 블로그, SNS<br />이제, 공실만 등록하면 자동으로
            </h1>
            <p style={{ margin: 0, fontSize: 17, lineHeight: 1.7, color: "var(--n300)", textWrap: "pretty" }}>
              공실뉴스부동산이 되시면 블로그 · 유튜브 · SNS 마케팅을 바로 시작하실 수 있습니다.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <a href="/newsrealty/apply" onClick={applyClick} className="nrl-btn nrl-btn-solid">공실뉴스부동산 신청 &gt;</a>
              <Link href={benefitsHref} className="nrl-btn nrl-btn-ghost">부동산 혜택 &gt;</Link>
            </div>
          </div>
          <img src="/images/newsrealty/hero_gangnam_multichannel_agent.jpg" alt="공실뉴스 AI 마케팅을 활용하는 공인중개사" className="nrl-photo" style={{ aspectRatio: "4 / 3" }} />
        </section>

        {/* Feature chips */}
        <section style={{ maxWidth: 1120, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {chips.map((c) => (
              <span key={c} style={{ padding: "8px 14px", borderRadius: 999, background: "#ffffff", border: "1px solid var(--divider)", fontSize: 14 }}>{c}</span>
            ))}
          </div>
        </section>

        </div>

        {/* 무엇이 좋아질까요? — 상단 메뉴의 '상품' 앵커(#products)가 여기로 온다 */}
        <section id="products" className="nrl-sec">
          <h2 className="nrl-h2">무엇이 좋아질까요?</h2>
          <p className="nrl-lead">공실뉴스부동산이 되시면, 부동산 마케팅이 쉬워집니다.</p>
          <div className="nrl-grid3">
            {advantages.map((a) => (
              <div key={a.n} style={{ display: "flex", flexDirection: "column", gap: 12, padding: "28px 24px", background: "var(--surface)", borderRadius: "var(--r-lg)" }}>
                <Icon name={a.ic} size={32} />
                <span style={{ fontSize: 13, color: "var(--accent-700)" }}>{a.n}</span>
                <h3 style={{ fontSize: 19, lineHeight: 1.4, margin: 0 }}>{a.t}</h3>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: "var(--n300)" }}>{a.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 내가 꾸준히 할 수 있을까? */}
        <section className="nrl-sec">
          <h2 className="nrl-h2">내가 꾸준히 할 수 있을까?</h2>
          <p className="nrl-lead">공실만 등록하시면, AI가 기사 초안과 SNS 글을 작성합니다.</p>
          <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 2 }}>
            {steps.map((s) => (
              <li key={s.n} style={{ padding: "24px 20px", background: "var(--surface)", display: "flex", flexDirection: "column", gap: 10 }}>
                <Icon name={s.ic} size={28} />
                <span style={{ fontSize: 12, color: "var(--accent)" }}>STEP {s.n}</span>
                <span style={{ fontSize: 16, fontWeight: 700 }}>{s.t}</span>
                <span style={{ fontSize: 13, color: "var(--n400)" }}>{s.d}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* Market Reality */}
        <section className="nrl-sec wide">
          <span style={{ fontSize: 13, color: "var(--n400)" }}>대형 부동산</span>
          <h2 className="nrl-h2" style={{ lineHeight: 1.35, margin: "8px 0 40px", textWrap: "balance" }}>
            대형 부동산은 매일 꾸준히<br />유튜브 · 블로그 · SNS를 운영합니다.
          </h2>
          <PhotoCards items={big} kickerColor="var(--n500)" />

          <div style={{ display: "flex", alignItems: "center", gap: 16, margin: "72px 0" }}>
            <div style={{ flex: 1, height: 1, background: "var(--divider)" }} />
            <span style={{ fontSize: 22, fontWeight: 700, color: "var(--accent)" }}>VS</span>
            <div style={{ flex: 1, height: 1, background: "var(--divider)" }} />
          </div>

          <span style={{ fontSize: 13, color: "var(--accent-700)" }}>1~2인 로컬 부동산</span>
          <h2 className="nrl-h2" style={{ lineHeight: 1.35, margin: "8px 0 40px", textWrap: "balance" }}>
            하지만 1~2인 부동산은<br />온라인 마케팅 할 시간이 없습니다.
          </h2>
          <PhotoCards items={local} kickerColor="var(--accent-700)" />
        </section>

        {/* Solution */}
        <section className="nrl-sec wide">
          <div style={{ borderRadius: "var(--r-lg)", overflow: "hidden", background: "linear-gradient(120deg, oklch(0.5 0.14 42), oklch(0.6 0.16 52))", color: "var(--n100)", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,400px),1fr))", alignItems: "center" }}>
            <div style={{ padding: "48px 40px", display: "flex", flexDirection: "column", gap: 14 }}>
              <span style={{ fontSize: 14, color: "var(--n200)" }}>공실뉴스 AI 원스톱 솔루션</span>
              <h2 className="nrl-h2" style={{ lineHeight: 1.35, margin: 0, color: "var(--n100)", textWrap: "balance" }}>
                공실만 등록하면<br />AI가 알아서 다 해줍니다.
              </h2>
              <p style={{ margin: 0, fontSize: 15, lineHeight: 1.7, color: "var(--n200)" }}>
                매매보고서 작성부터 블로그, SNS포스팅, 홈페이지까지!<br />무엇보다, 유튜브도 배우고, 내 강의 개설로 수익화 가능!
              </p>
            </div>
            <img src="/images/newsrealty/newsrealty_partner_trio_success.jpg" alt="공실뉴스부동산 파트너 중개사들" style={{ width: "100%", height: "100%", minHeight: 300, objectFit: "cover" }} />
          </div>
          <div className="nrl-grid4" style={{ marginTop: 24 }}>
            {benefits.map((b) => (
              <div key={b.t} style={{ display: "flex", flexDirection: "column", gap: 12, padding: 24, background: "var(--surface)", borderRadius: "var(--r-lg)" }}>
                <Icon name={b.ic} size={32} />
                <span style={{ fontSize: 12, color: "var(--accent-700)" }}>{b.k}</span>
                <h3 style={{ fontSize: 18, margin: 0 }}>{b.t}</h3>
                <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8, fontSize: 14, color: "var(--n300)" }}>
                  {b.items.map((i) => <li key={i}>{i}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* 이런 부동산에게 추천합니다 */}
        <section className="nrl-sec wide">
          <h2 className="nrl-h2" style={{ margin: "0 0 40px" }}>이런 부동산에게 추천합니다</h2>
          <div className="nrl-grid3">
            {recs.map((r) => (
              <div key={r.t} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <img src={r.img} alt={r.t} className="nrl-photo" style={{ aspectRatio: "4 / 3" }} />
                <h3 style={{ fontSize: 18, margin: "4px 0 0" }}>{r.t}</h3>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: "var(--n300)" }}>{r.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="nrl-sec wide">
          <h2 className="nrl-h2">월 3만 원, 12개월 36만 원</h2>
          <p className="nrl-lead" style={{ marginBottom: 40 }}>12개월 단위 멤버십 · VAT 포함</p>
          <div style={{ margin: "0 0 56px", padding: "36px 32px", borderRadius: "var(--r-lg)", background: "var(--surface)", display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontSize: "clamp(18px,2vw,22px)", fontWeight: 700, color: "var(--accent-700)" }}>공실뉴스부동산 12개월 뒤</span>
              <h3 style={{ fontSize: "clamp(22px,2.8vw,30px)", lineHeight: 1.35, margin: 0, letterSpacing: "-0.02em" }}>
                블로그/유튜브 채널이 완성되고, SNS로 꾸준히 홍보할 수 있습니다.
              </h3>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 8 }}>
              {channels.map((c) => (
                <div key={c.t} style={{ padding: 18, background: "var(--bg)", borderRadius: "var(--r-md)", fontSize: 16, fontWeight: 700, display: "flex", alignItems: "center", gap: 10 }}>
                  <Icon name={c.ic} size={24} />
                  <span>{c.t}</span>
                </div>
              ))}
            </div>
          </div>
          <PriceTable />
        </section>

        {/* FAQ */}
        <section id="faq" className="nrl-sec">
          <h2 className="nrl-h2" style={{ margin: "0 0 32px" }}>자주 묻는 질문</h2>
          <div style={{ display: "flex", flexDirection: "column", maxWidth: 760 }}>
            {faqs.map((f, i) => (
              <details key={f.q} style={{ padding: "20px 0", borderTop: "1px solid var(--divider)", borderBottom: i === faqs.length - 1 ? "1px solid var(--divider)" : undefined }}>
                <summary style={{ cursor: "pointer", fontSize: 16, fontWeight: 700 }}>
                  {f.q}
                  {f.badge && <span style={{ marginLeft: 6, fontSize: 13, color: "var(--accent-700)" }}>{f.badge}</span>}
                </summary>
                <p style={{ margin: "12px 0 0", fontSize: 15, lineHeight: 1.7, color: "var(--n300)" }}>{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="nrl-sec wide" style={{ paddingBottom: 128 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 640 }}>
            <span style={{ fontSize: 14, color: "var(--accent-700)" }}>공실등록 + 블로그/유튜브/SNS</span>
            <h2 style={{ fontSize: "clamp(28px,4vw,40px)", lineHeight: 1.3, margin: 0, letterSpacing: "-0.02em", textWrap: "balance" }}>
              12개월안에<br />내 마케팅채널 완성할 수 있습니다.
            </h2>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <a href="/newsrealty/apply" onClick={applyClick} className="nrl-btn nrl-btn-outline">공실뉴스부동산 신청하기</a>
              <Link href="/help" className="nrl-btn nrl-btn-ghost">고객센터 바로가기 &gt;&gt;</Link>
            </div>
          </div>
        </section>
      </main>

      {showFooter && (
        <footer style={{ maxWidth: 1120, margin: "0 auto", padding: "32px 24px 48px", display: "flex", flexDirection: "column", gap: 6, fontSize: 12, lineHeight: 1.7, color: "var(--n500)", borderTop: "1px solid var(--divider)" }}>
          <span style={{ color: "var(--n400)", fontSize: 13 }}>(주)공실마케팅 · 공실뉴스</span>
          <span>서울특별시 강남구 논현로115길 31, 105호 · 대표 김윤경 · 사업자등록번호 337-81-03010</span>
          <span>인터넷신문 등록번호 서울 아55037 · master@gongsilnews.com · 고객센터 1555-5343</span>
        </footer>
      )}
    </div>
  );
}

// 금액안내 페이지(/newsrealty/pricing) 본문: 소개 페이지의 금액 제목 + 비교표만 보여 준다
export function NewsrealtyPricing() {
  return (
    <div className="nrl">
      <style>{CSS}</style>
      <section className="nrl-sec" style={{ paddingTop: 72, paddingBottom: 112 }}>
        <h2 className="nrl-h2">월 3만 원, 12개월 36만 원</h2>
        <p className="nrl-lead" style={{ marginBottom: 40 }}>12개월 단위 멤버십 · VAT 포함</p>
        <PriceTable />
      </section>
    </div>
  );
}
