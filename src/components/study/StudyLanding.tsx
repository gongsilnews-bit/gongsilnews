"use client";

import React, { useState } from "react";
import Link from "next/link";

// 공실스터디 녹색 (2026-10-12). 멤버십혜택 "강의영상업로딩"(/study/benefits/lecture-upload) 본문. Claude Design 시안(design/gongsilstudy/공실스터디 웹랜딩.html)을 옮긴 것.
// 시안의 자체 머리글·바닥글은 빼고, 사이트 공용 StudyHeader 아래에 붙여 쓴다.
// 아이콘은 시안과 같은 Phosphor 아이콘 웹폰트(ph ph-*)를 쓴다.

const IMG = "/images/study/landing/";
const APPLY = "/study/apply";

// 히어로 오른쪽에 틀 유튜브 영상 주소. 비워 두면 사진이 나온다.
const HERO_YOUTUBE_URL = "https://youtu.be/aWuNj5m-zy8";
const HERO_FALLBACK_IMG = "/images/study/study-real-hero.webp";

function youtubeEmbed(url: string) {
  const m = url.match(/(?:youtu\.be\/|v=|embed\/|shorts\/|live\/)([\w-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}?rel=0` : "";
}

const heroChips = ["강의 제작 영상 가이드", "유튜브 영상제작 편집 강의 VOD", "강의 영상 플랫폼 업로드"];

const solution: { n: string; ic: string; t: string; hl?: boolean }[] = [
  { n: "01", ic: "ph-map-pin", t: "지역정보" },
  { n: "02", ic: "ph-article", t: "콘텐츠" },
  { n: "03", ic: "ph-graduation-cap", t: "강의" },
  { n: "04", ic: "ph-users-three", t: "신뢰" },
  { n: "05", ic: "ph-handshake", t: "공동중개", hl: true },
];

const studyChips: { ic: string; t: string }[] = [
  { ic: "ph-megaphone", t: "AI 마케팅" },
  { ic: "ph-video-camera", t: "영상 제작" },
  { ic: "ph-book-open", t: "실무 강의" },
  { ic: "ph-presentation-chart", t: "강의 개설" },
  { ic: "ph-coins", t: "수익화" },
];

const ytCards = [
  { img: "yt-1.webp", n: "01", ic: "ph-youtube-logo", t: ["유튜브 만드는 법을", "처음부터 알려드립니다"], d: "공실뉴스가 유튜브 영상을 만드는 방법을 단계별로 알려드립니다. 순서대로 따라하기만 하면 됩니다.", alt: "유튜브 촬영·편집 강의 장면" },
  { img: "yt-2.webp", n: "02", ic: "ph-sparkle", t: ["AI로 영상을", "쉽게 만드는 방법까지"], d: "어려운 편집 없이 AI로 영상을 쉽게 만드는 방법을 알려드립니다.", alt: "AI 영상 제작 화면" },
];

const lectures = [
  { img: "lecture-1.webp", k: "지역 분석", t: "우리 동네 아파트 단지 분석" },
  { img: "lecture-2.webp", k: "시세", t: "인기 아파트화 시세 흐름" },
  { img: "lecture-3.webp", k: "임대차", t: "전세·월세 지역 정보" },
  { img: "lecture-4.webp", k: "매물", t: "좋은 매물 소개" },
  { img: "lecture-5.webp", k: "AI 마케팅", t: "AI로 매물 홍보 콘텐츠 만들기" },
  { img: "lecture-6.webp", k: "영상 제작", t: "스마트폰으로 매물 영상 촬영하기" },
];

const reviews = [
  { img: "review-1.webp", q: "매번 손님에게 설명하던 동네 이야기를 영상으로 만들었더니, 문의 전화부터 달라졌습니다.", n: "김○○ 대표" },
  { img: "review-2.webp", q: "강의를 개설하고 나서 다른 지역 부동산에서 먼저 공동중개 연락이 왔어요.", n: "이○○ 대표" },
  { img: "review-3.webp", q: "AI 마케팅 강의 덕분에 매물 홍보에 쓰던 시간이 절반으로 줄었습니다.", n: "박○○ 대표" },
];

const faqs: [string, string][] = [
  ["공실스터디 멤버가 되면 무엇이 달라지나요?", "공실을 20건까지 등록할 수 있고, AI 마케팅·영상 제작·실무 강의를 수강할 수 있습니다. 직접 강의를 개설해 수익화할 수도 있습니다."],
  ["공실뉴스는 무료로 이용할 수 있나요?", "네. 공동중개 열람은 무료이며, 누구나 공실 3건까지 무료로 등록할 수 있습니다."],
  ["강의 경험이 없어도 강사가 될 수 있나요?", "대표님이 쌓아온 지역정보가 바로 강의 소재입니다. 콘텐츠 제작 방법은 공실스터디 강의에서 배울 수 있습니다."],
  ["어떤 주제로 강의를 만들 수 있나요?", "우리 동네 아파트 단지 분석, 시세 흐름, 전세·월세 지역 정보, 좋은 매물 소개 등 현장에서 설명하던 내용이면 모두 가능합니다."],
  ["신청은 어떻게 하나요?", "페이지의 신청하기 버튼을 누르면 신청 페이지로 이동합니다."],
];

const CSS = `
.stl{--bg:oklch(0.975 0.007 165);--bg2:oklch(0.99 0.004 165);--text:oklch(0.22 0.01 165);--acc:oklch(0.62 0.129 163);--acc-d:oklch(0.55 0.129 163);--acc-t:oklch(0.58 0.129 163);--line:oklch(0.9 0.012 165);--line2:oklch(0.88 0.015 165);--mute:oklch(0.45 0.01 165);--mute2:oklch(0.42 0.01 165);--tint:oklch(0.96 0.02 165);--tint2:oklch(0.95 0.03 165);--white:oklch(1 0 0);--dark:oklch(0.21 0.008 165);--acc-l:oklch(0.72 0.109 163);
  background:var(--bg);color:var(--text);font-family:'Pretendard',sans-serif;letter-spacing:-0.03em;word-break:keep-all;text-align:left}
.stl *,.stl *::before,.stl *::after{box-sizing:border-box}
.stl h1,.stl h2,.stl p{margin:0}
.stl img{display:block;width:100%;height:100%;object-fit:cover}
.stl .acc{color:var(--acc)}
.stl a{text-decoration:none}
.stl-wrap{max-width:1140px;margin:0 auto;padding:clamp(64px,9vw,112px) 24px;display:flex;flex-direction:column;gap:40px;scroll-margin-top:70px}
.stl-split{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,440px),1fr));gap:clamp(24px,4vw,48px);align-items:center}
.stl-head{display:flex;flex-direction:column;gap:12px}
.stl-eyebrow{font-size:13px;font-weight:600;letter-spacing:0.14em;color:var(--acc-t)}
.stl-h2{font-size:clamp(28px,4vw,44px);line-height:1.3;font-weight:700}
.stl-card{border:1px solid var(--line);border-radius:12px;background:var(--white)}
.stl-tag{align-self:flex-start;font-size:11px;font-weight:700;color:oklch(0.99 0 0);background:var(--acc);padding:4px 9px;border-radius:4px}
.stl-btn{display:inline-flex;align-items:center;gap:8px;padding:15px 26px;border-radius:8px;background:var(--acc);color:oklch(0.99 0 0)!important;font-size:16px;font-weight:700;transition:background .15s}
.stl-btn:hover{background:var(--acc-d)}
.stl-btn-ghost{display:inline-flex;align-items:center;gap:8px;padding:15px 26px;border-radius:8px;border:1.5px solid oklch(0.85 0.015 165);background:oklch(1 0 0 / 0.7);color:oklch(0.3 0.01 165)!important;font-size:16px;font-weight:600;transition:border-color .15s}
.stl-btn-ghost:hover{border-color:var(--acc)}

/* 히어로 */
.stl-hero{max-width:1140px;margin:0 auto;padding:clamp(40px,6vw,80px) 24px}
.stl-hero-text{display:flex;flex-direction:column;gap:24px;max-width:520px}
.stl-badge{align-self:flex-start;font-size:13px;font-weight:600;color:oklch(0.99 0 0);background:var(--acc);padding:6px 12px;border-radius:6px}
.stl-h1{font-size:clamp(28px,4.6vw,54px);line-height:1.25;font-weight:800;letter-spacing:-0.04em}
.stl-h1 .line{white-space:nowrap}
.stl-hero-sub{font-size:clamp(19px,2.2vw,26px);line-height:1.5;font-weight:600;color:oklch(0.3 0.01 165)}
.stl-hero-chips{display:flex;flex-wrap:wrap;gap:6px}
.stl-hero-chips span{padding:8px 12px;border-radius:999px;background:var(--white);border:1px solid var(--line2);font-size:clamp(11px,1.1vw,13px);font-weight:600;white-space:nowrap}
.stl-hero-cta{display:flex;flex-wrap:wrap;gap:12px;padding-top:8px}
.stl-hero-media{position:relative;aspect-ratio:16/9;width:min(100%,600px);justify-self:end;border-radius:16px;overflow:hidden;background:oklch(0.2 0.01 165);box-shadow:0 24px 48px oklch(0.3 0.02 165 / 0.14)}
.stl-hero-media iframe,.stl-hero-media img{position:absolute;inset:0;width:100%;height:100%;border:0}

/* WHY */
.stl-why-h{display:flex;flex-direction:column;gap:6px;font-weight:700}
.stl-why-h .s{font-size:clamp(24px,3.4vw,36px);line-height:1.3}
.stl-why-h .b{font-size:clamp(64px,10vw,116px);line-height:1;color:var(--acc);letter-spacing:-0.05em}
.stl-why-p{font-size:clamp(16px,1.6vw,18px);line-height:1.7;color:var(--mute)}
.stl-why-svg{width:100%;max-width:540px;justify-self:end}

/* PROBLEM */
.stl-grid2{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr));gap:20px}
.stl-prob{display:flex;flex-direction:column;gap:10px;padding:28px}
.stl-prob-top{display:flex;justify-content:space-between;align-items:center;padding-bottom:8px;font-size:21px;font-weight:700}
.stl-prob-top i{font-size:24px;color:var(--acc)}
.stl-prob-row{display:flex;gap:10px;align-items:center;padding:12px 14px;border-radius:6px;background:var(--tint);font-size:15px}
.stl-prob-row i{color:var(--acc)}
.stl-prob-row.bad{background:none;border:1px solid var(--acc);color:oklch(0.52 0.129 163);font-weight:600}
.stl-prob-row.bad i{color:inherit}
.stl-conclude{display:flex;flex-direction:column;gap:6px}
.stl-conclude .s{font-size:clamp(17px,2vw,20px);color:var(--mute)}
.stl-conclude .b{font-size:clamp(32px,5vw,52px);font-weight:700;color:var(--acc);line-height:1.25}

/* SOLUTION */
.stl-sol{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px}
.stl-sol div{display:flex;flex-direction:column;gap:14px;padding:22px 18px}
.stl-sol .n{font-size:12px;color:oklch(0.5 0.01 165)}
.stl-sol i{font-size:30px;color:var(--acc)}
.stl-sol .t{font-size:17px;font-weight:700}
.stl-sol .hl{border:1.5px solid var(--acc);background:var(--tint2)}
.stl-sol .hl .n{color:oklch(0.52 0.129 163);font-weight:600}
.stl-p-lg{font-size:clamp(17px,2vw,20px);line-height:1.6}
.stl-p-lg b{color:var(--acc-d)}

/* STEPS */
.stl-step-text{display:flex;flex-direction:column;gap:20px}
.stl-step-h{font-size:clamp(28px,3.6vw,40px);line-height:1.3;font-weight:700}
.stl-step-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.stl-step-grid>div{display:flex;flex-direction:column;gap:8px;padding:16px;border-radius:10px;font-size:15px;line-height:1.5}
.stl-step-grid i{font-size:22px;color:var(--acc)}
.stl-free{align-self:flex-start;font-size:10px;font-weight:700;color:oklch(0.99 0 0);background:var(--acc);padding:3px 5px;border-radius:3px}
.stl-shot{height:clamp(260px,32vw,380px);border-radius:12px;overflow:hidden;box-shadow:0 20px 40px oklch(0.3 0.02 165 / 0.12)}
.stl-pills{display:flex;flex-wrap:wrap;gap:8px}
.stl-pills span{display:flex;gap:6px;align-items:center;padding:9px 14px;border-radius:999px;background:var(--white);border:1px solid var(--line);font-size:15px;font-weight:600}
.stl-pills i{color:var(--acc)}
.stl-step-p{font-size:17px;line-height:1.6}
.stl-step-p b{color:var(--acc-d)}

/* YOUTUBE */
.stl-quote{align-self:flex-start;display:flex;gap:8px;align-items:center;padding:10px 18px;border-radius:999px;background:oklch(0.93 0.01 165);font-size:clamp(17px,2vw,20px);font-weight:600;color:oklch(0.4 0.01 165)}
.stl-yt-h{font-size:clamp(30px,4.4vw,48px);line-height:1.3;font-weight:700}
.stl-yt-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr));gap:20px}
.stl-yt{display:flex;flex-direction:column;border-radius:14px;overflow:hidden}
.stl-yt-img{height:220px}
.stl-yt-body{display:flex;flex-direction:column;gap:12px;padding:28px}
.stl-yt-num{display:flex;gap:10px;align-items:center}
.stl-yt-num span{font-size:13px;font-weight:700;color:oklch(0.99 0 0);background:var(--acc);padding:3px 8px;border-radius:4px}
.stl-yt-num i{font-size:26px;color:var(--acc)}
.stl-yt-t{font-size:22px;font-weight:700;line-height:1.4}
.stl-yt-d{font-size:16px;line-height:1.7;color:var(--mute2)}
.stl-yt-note{display:flex;flex-wrap:wrap;align-items:center;gap:14px;padding:24px 28px;border-radius:12px;background:var(--tint2);border:1px solid oklch(0.62 0.129 163 / 0.4)}
.stl-yt-note i{font-size:28px;color:var(--acc)}
.stl-yt-note span{font-size:clamp(17px,2vw,20px);line-height:1.5}
.stl-yt-note b{color:oklch(0.52 0.129 163)}

/* LECTURES */
.stl-lec-head{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-end;gap:20px}
.stl-lec-head p{font-size:16px;color:var(--mute);max-width:360px}
.stl-lec-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px}
.stl-lec{display:flex;flex-direction:column;overflow:hidden;color:inherit!important;transition:border-color .15s}
.stl-lec:hover{border-color:var(--acc)}
.stl-lec-img{height:160px}
.stl-lec-body{display:flex;flex-direction:column;gap:6px;padding:18px}
.stl-lec-body .k{font-size:12px;font-weight:600;color:var(--acc-d)}
.stl-lec-body .t{font-size:17px;font-weight:700}

/* MEMBERSHIP */
.stl-dark{background:var(--dark);color:oklch(0.96 0.005 165)}
.stl-dark .stl-eyebrow,.stl-dark .accl{color:var(--acc-l)}
.stl-dark .stl-h2{color:inherit}
.stl-plan{display:flex;flex-direction:column;gap:22px;padding:32px;border-radius:14px;border:1px solid oklch(0.34 0.01 165);background:oklch(0.25 0.008 165)}
.stl-plan.rec{border:1.5px solid var(--acc-l);background:oklch(0.27 0.03 165)}
.stl-plan-top{display:flex;flex-direction:column;gap:8px}
.stl-plan-top .k{display:flex;justify-content:space-between;font-size:15px;color:oklch(0.75 0.008 165)}
.stl-plan.rec .stl-plan-top .k{color:oklch(0.85 0.034 163)}
.stl-plan-top .k em{font-style:normal;font-size:11px;font-weight:700;padding:3px 8px;border-radius:4px;background:var(--acc);color:oklch(0.99 0 0)}
.stl-plan-top .t{font-size:clamp(30px,3.6vw,40px);font-weight:700;line-height:1.25}
.stl-plan-list{display:flex;flex-direction:column;gap:12px;font-size:16px}
.stl-plan-list div{display:flex;gap:10px;align-items:center}
.stl-plan-list i{color:var(--acc-l)}
.stl-plan-btn{margin-top:auto;text-align:center;padding:14px;border-radius:8px;font-size:15px;transition:all .15s}
.stl-plan-btn.ghost{border:1.5px solid oklch(0.45 0.01 165);color:oklch(0.96 0.005 165)!important;font-weight:600}
.stl-plan-btn.ghost:hover{border-color:var(--acc-l)}
.stl-plan-btn.solid{background:var(--acc);color:oklch(0.99 0 0)!important;font-weight:700}
.stl-plan-btn.solid:hover{background:var(--acc-d)}

/* REVIEWS */
.stl-rev-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:16px}
.stl-rev{display:flex;flex-direction:column;gap:20px;padding:28px}
.stl-rev>i{font-size:28px;color:var(--acc)}
.stl-rev p{font-size:16px;line-height:1.7}
.stl-rev-who{display:flex;gap:12px;align-items:center;margin-top:auto}
.stl-rev-who img{width:44px;height:44px;border-radius:50%}
.stl-rev-who div{display:flex;flex-direction:column;font-size:14px}
.stl-rev-who span{color:oklch(0.5 0.01 165)}

/* FAQ */
.stl-faq{display:flex;flex-direction:column;border-top:1px solid var(--line2)}
.stl-faq>div{display:flex;flex-direction:column;border-bottom:1px solid var(--line2)}
.stl-faq button{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:22px 0;background:none;border:none;font-family:inherit;font-size:17px;font-weight:600;color:var(--text);text-align:left;cursor:pointer;letter-spacing:-0.03em}
.stl-faq button i{font-size:18px;color:var(--acc);flex:none}
.stl-faq p{padding:0 0 22px;font-size:15px;line-height:1.7;color:var(--mute2)}

/* CTA */
.stl-cta{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:28px;padding:clamp(28px,5vw,48px);border:1.5px solid var(--acc);border-radius:16px;background:var(--white)}
.stl-cta-text{display:flex;flex-direction:column;gap:10px}
.stl-cta-text h2{font-size:clamp(26px,3.6vw,38px);line-height:1.3;font-weight:700}
.stl-cta-text p{font-size:15px;line-height:1.7;color:var(--mute)}
.stl-cta .stl-btn{padding:16px 28px;font-size:17px}
`;

export default function StudyLanding() {
  const [open, setOpen] = useState(0);
  const embed = youtubeEmbed(HERO_YOUTUBE_URL);

  return (
    <div className="stl">
      <style>{CSS}</style>
      <link rel="stylesheet" href="https://unpkg.com/@phosphor-icons/web@2.1.1/src/regular/style.css" precedence="default" />
      <link rel="stylesheet" href="https://unpkg.com/@phosphor-icons/web@2.1.1/src/fill/style.css" precedence="default" />

      {/* 01 히어로 */}
      <section id="top">
        <div className="stl-hero stl-split">
          <div className="stl-hero-text">
            <span className="stl-badge">공실뉴스 × 공실스터디</span>
            <h1 className="stl-h1">
              <span className="line">내 지역, 단지, 물건 정보</span>
              <br />
              <span className="acc">이제 유튜브 강의로</span>
            </h1>
            <p className="stl-hero-sub">부동산 대표님도 공실스터디 강사가 될 수 있습니다</p>
            <div className="stl-hero-chips">
              {heroChips.map((c) => (
                <span key={c}>{c}</span>
              ))}
            </div>
            <div className="stl-hero-cta">
              <Link href={APPLY} className="stl-btn">
                공실스터디 멤버십 신청하기 <i className="ph ph-arrow-right" />
              </Link>
              <a href="#lectures" className="stl-btn-ghost">
                강의 둘러보기
              </a>
            </div>
          </div>
          <div className="stl-hero-media">
            {embed ? (
              <iframe
                src={embed}
                title="공실스터디 소개 영상"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <img src={HERO_FALLBACK_IMG} alt="노트북 화면을 보며 기뻐하는 부동산 대표" />
            )}
          </div>
        </div>
      </section>

      {/* 02 WHY */}
      <section id="why" className="stl-wrap stl-split" style={{ display: "grid" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <span className="stl-eyebrow">WHY</span>
          <h2 className="stl-why-h">
            <span className="s">왜 부동산에서</span>
            <span className="b">임장료</span>
            <span className="s">이야기가 나올까?</span>
          </h2>
          <p className="stl-why-p">
            시간과 지역정보는 쓰이지만,
            <br />
            계약이 안 되면 수익은 없습니다.
          </p>
        </div>
        <WhyIllustration />
      </section>

      {/* 03 PROBLEM */}
      <section id="about" style={{ background: "var(--bg2)" }}>
        <div className="stl-wrap">
          <div className="stl-head">
            <span className="stl-eyebrow">PROBLEM</span>
            <h2 className="stl-h2">
              하지만 임장료는
              <br />
              <span className="acc">현실적으로 쉽지 않습니다</span>
            </h2>
          </div>
          <div className="stl-grid2">
            <div className="stl-card stl-prob">
              <div className="stl-prob-top">
                <span>부동산 입장</span>
                <i className="ph ph-buildings" />
              </div>
              <div className="stl-prob-row"><i className="ph ph-map-pin" />지역정보 제공</div>
              <div className="stl-prob-row"><i className="ph ph-clock" />시간과 설명 노력</div>
              <div className="stl-prob-row bad"><i className="ph ph-x-circle" />계약이 안 되면 수익 0원</div>
            </div>
            <div className="stl-card stl-prob">
              <div className="stl-prob-top">
                <span>소비자 입장</span>
                <i className="ph ph-user" />
              </div>
              <div className="stl-prob-row"><i className="ph ph-wallet" />집 보는데 비용 부담</div>
              <div className="stl-prob-row"><i className="ph ph-door" />심리적 진입장벽</div>
              <div className="stl-prob-row"><i className="ph ph-trend-down" />정착되기 어려움</div>
            </div>
          </div>
          <div className="stl-conclude">
            <span className="s">그래서 필요한 것은 임장료가 아니라,</span>
            <span className="b">내 지역/단지/물건 정보의 자산화입니다.</span>
          </div>
        </div>
      </section>

      {/* 04 SOLUTION */}
      <section className="stl-wrap">
        <div className="stl-head">
          <span className="stl-eyebrow">SOLUTION</span>
          <h2 className="stl-h2">
            대표님의
            <br />
            <span className="acc">지역/단지/물건 정보를 강의 콘텐츠로 만드는 것</span>
          </h2>
        </div>
        <div className="stl-sol">
          {solution.map((s) => (
            <div key={s.n} className={`stl-card${s.hl ? " hl" : ""}`}>
              <span className="n">{s.n}</span>
              <i className={`ph ${s.ic}`} />
              <span className="t">{s.t}</span>
            </div>
          ))}
        </div>
        <p className="stl-p-lg">
          대표님의 강의를 통해 <b>더 많은 공동중개 파트너</b>를 만날 수 있습니다.
        </p>
      </section>

      {/* 05 STEPS */}
      <section style={{ background: "var(--bg2)" }}>
        <div className="stl-wrap" style={{ gap: 56 }}>
          <div className="stl-split">
            <div className="stl-step-text">
              <span className="stl-tag">STEP 1</span>
              <h2 className="stl-step-h">
                <span className="acc">공실뉴스</span>는
                <br />
                이렇게 시작합니다
              </h2>
              <div className="stl-step-grid">
                <div className="stl-card"><i className="ph ph-users-three" /><span><b>11만 부동산과</b><br />임대인이 보는 채널</span></div>
                <div className="stl-card"><i className="ph ph-file-text" /><span><b>공실 등록과</b><br />열람이 가능한 플랫폼</span></div>
                <div className="stl-card"><span className="stl-free">FREE</span><span>누구나 공실<br /><b>3건 무료 등록</b></span></div>
                <div className="stl-card"><i className="ph ph-magnifying-glass" /><span>공동중개<br /><b>열람 무료</b></span></div>
              </div>
            </div>
            <div className="stl-shot">
              <img src={IMG + "step-news.webp"} alt="공실뉴스 노트북·모바일 화면" loading="lazy" />
            </div>
          </div>
          <div className="stl-split">
            <div className="stl-shot">
              <img src={IMG + "step-study.webp"} alt="공실스터디 강의 화면" loading="lazy" />
            </div>
            <div className="stl-step-text">
              <span className="stl-tag">STEP 2</span>
              <h2 className="stl-step-h">
                <span className="acc">공실스터디</span>는
                <br />
                배우고, 만들고, 개설하는 플랫폼입니다
              </h2>
              <div className="stl-pills">
                {studyChips.map((c) => (
                  <span key={c.t}><i className={`ph ${c.ic}`} />{c.t}</span>
                ))}
              </div>
              <p className="stl-step-p">
                단순히 배우는 데서 끝나지 않고, 자신의 정보를 <b>강의로 만들 수 있습니다.</b>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 06 YOUTUBE */}
      <section id="youtube" className="stl-wrap">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <span className="stl-quote"><i className="ph ph-chat-circle-dots" />“난 유튜브를 못하는데??”</span>
          <h2 className="stl-yt-h">
            <span className="acc">걱정하지 마세요.</span>
            <br />
            그냥 따라하면 누구나 만들 수 있습니다
          </h2>
        </div>
        <div className="stl-yt-grid">
          {ytCards.map((c) => (
            <div key={c.n} className="stl-card stl-yt">
              <div className="stl-yt-img">
                <img src={IMG + c.img} alt={c.alt} loading="lazy" />
              </div>
              <div className="stl-yt-body">
                <div className="stl-yt-num"><span>{c.n}</span><i className={`ph ${c.ic}`} /></div>
                <span className="stl-yt-t">{c.t[0]}<br />{c.t[1]}</span>
                <p className="stl-yt-d">{c.d}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="stl-yt-note">
          <i className="ph ph-trend-up" />
          <span>계속 만들다 보면, <b>대표님만의 유튜브 채널도 꾸준히 운영할 수 있습니다.</b></span>
        </div>
      </section>

      {/* 07 LECTURES */}
      <section id="lectures" className="stl-wrap">
        <div className="stl-lec-head">
          <div className="stl-head">
            <span className="stl-eyebrow">LECTURES</span>
            <h2 className="stl-h2">
              <span className="acc">부동산 대표님</span>도
              <br />
              강사가 될 수 있습니다
            </h2>
          </div>
          <p>대표님이 오랫동안 쌓아온 지역정보가 바로 강의 소재입니다.</p>
        </div>
        <div className="stl-lec-grid">
          {lectures.map((l) => (
            <Link key={l.img} href={APPLY} className="stl-card stl-lec">
              <div className="stl-lec-img">
                <img src={IMG + l.img} alt={l.t} loading="lazy" />
              </div>
              <div className="stl-lec-body">
                <span className="k">{l.k}</span>
                <span className="t">{l.t}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 08 MEMBERSHIP */}
      <section id="pricing" className="stl-dark">
        <div className="stl-wrap">
          <div className="stl-head">
            <span className="stl-eyebrow">MEMBERSHIP</span>
            <h2 className="stl-h2">
              지역정보를 <span className="accl">영상</span>으로,
              <br />
              <span className="accl">강의</span>로, <span className="accl">기회</span>로 바꾸세요
            </h2>
          </div>
          <div className="stl-grid2">
            <div className="stl-plan">
              <div className="stl-plan-top">
                <span className="k">공실뉴스 일반</span>
                <span className="t">강의 개설 불가</span>
              </div>
              <div className="stl-plan-list">
                <div><i className="ph ph-check" />공동중개 열람 무료</div>
                <div><i className="ph ph-check" />누구나 공실 3건 무료 등록</div>
              </div>
              <Link href="/login" className="stl-plan-btn ghost">공실뉴스 회원가입하기 &gt;&gt;</Link>
            </div>
            <div className="stl-plan rec">
              <div className="stl-plan-top">
                <span className="k">공실스터디 멤버<em>추천</em></span>
                <span className="t">1년 36만원 (월 3만원꼴)</span>
              </div>
              <div className="stl-plan-list">
                <div><i className="ph ph-check" /><b>공실 20건 등록 가능</b></div>
                <div><i className="ph ph-check" />AI 마케팅·영상 제작·실무 강의 수강</div>
                <div><i className="ph ph-check" />강의 개설과 수익화</div>
              </div>
              <Link href={APPLY} className="stl-plan-btn solid">공실스터디 멤버십 신청하기 &gt;</Link>
            </div>
          </div>
        </div>
      </section>

      {/* 09 REVIEWS */}
      <section id="reviews" className="stl-wrap">
        <div className="stl-head">
          <span className="stl-eyebrow">REVIEWS</span>
          <h2 className="stl-h2">
            먼저 시작한 <span className="acc">대표님들</span>의 이야기
          </h2>
        </div>
        <div className="stl-rev-grid">
          {reviews.map((r) => (
            <div key={r.n} className="stl-card stl-rev">
              <i className="ph-fill ph-quotes" />
              <p>{r.q}</p>
              <div className="stl-rev-who">
                <img src={IMG + r.img} alt="" loading="lazy" />
                <div><b>{r.n}</b><span>○○동 공인중개사</span></div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 10 FAQ */}
      <section id="faq" style={{ background: "var(--bg2)" }}>
        <div className="stl-wrap" style={{ maxWidth: 820, gap: 32 }}>
          <div className="stl-head">
            <span className="stl-eyebrow">FAQ</span>
            <h2 className="stl-h2">자주 묻는 질문</h2>
          </div>
          <div className="stl-faq">
            {faqs.map(([q, a], i) => (
              <div key={q}>
                <button type="button" aria-expanded={open === i} onClick={() => setOpen(open === i ? -1 : i)}>
                  <span>{q}</span>
                  <i className={open === i ? "ph ph-minus" : "ph ph-plus"} />
                </button>
                {open === i && <p>{a}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 11 CTA */}
      <section className="stl-wrap">
        <div className="stl-cta">
          <div className="stl-cta-text">
            <h2>
              지금 <span className="acc">공실뉴스</span>에서
              <br />
              시작하세요
            </h2>
            <p>공실뉴스와 공실스터디는 부동산이 가진 매물과 지역정보를 더 많은 사람에게 전달하고, 더 많은 부동산과 연결되도록 돕습니다.</p>
          </div>
          <Link href={APPLY} className="stl-btn">
            공실스터디 멤버십 신청하기 <i className="ph ph-arrow-right" />
          </Link>
        </div>
      </section>
    </div>
  );
}

// 시안의 "중개사가 손님에게 매물을 안내하는" 라인 일러스트 그대로
function WhyIllustration() {
  return (
    <svg
      viewBox="0 0 480 400"
      className="stl-why-svg"
      fill="none"
      stroke="#2f3533"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-label="중개사가 손님에게 매물을 안내하는 라인 일러스트"
    >
      <path d="M70 300 C 40 220, 90 120, 190 105 C 280 92, 330 60, 400 95 C 470 130, 460 250, 440 330 L 90 340 C 78 330, 72 318, 70 300 Z" fill="#e7f6ef" stroke="none" />
      <path d="M290 64 q6 -12 18 -8 q8 -12 22 -4 q14 0 12 14 h-50 z" strokeWidth="1.8" fill="#fff" />
      <path d="M196 50 q6 -10 16 -6 q8 -8 18 0 q10 2 6 10 h-40 z" strokeWidth="1.8" fill="#fff" />
      <path d="M24 352 C 120 346, 360 346, 456 352" />
      <path d="M60 352 v-50" />
      <path d="M60 300 c-26 2 -38 -22 -24 -38 c-10 -22 14 -40 30 -30 c14 -16 40 -4 34 16 c18 10 10 38 -12 38 c-6 10 -20 14 -28 14 z" fill="#fff" />
      <path d="M60 322 l-12 -12 M60 314 l12 -10" strokeWidth="1.8" />
      <rect x="388" y="168" width="64" height="184" rx="8" strokeWidth="1.8" stroke="#7a8580" fill="#fff" />
      <path d="M402 190 h12 M426 190 h12 M402 214 h12 M426 214 h12 M402 238 h12 M426 238 h12 M402 262 h12 M426 262 h12" strokeWidth="1.8" stroke="#7a8580" />
      <rect x="296" y="116" width="120" height="236" rx="10" fill="#fff" />
      <path d="M296 136 h120" strokeWidth="1.8" />
      <rect x="312" y="152" width="22" height="26" rx="4" /><rect x="345" y="152" width="22" height="26" rx="4" /><rect x="378" y="152" width="22" height="26" rx="4" />
      <rect x="312" y="192" width="22" height="26" rx="4" /><rect x="345" y="192" width="22" height="26" rx="4" fill="#e7f6ef" /><rect x="378" y="192" width="22" height="26" rx="4" />
      <rect x="312" y="232" width="22" height="26" rx="4" /><rect x="345" y="232" width="22" height="26" rx="4" /><rect x="378" y="232" width="22" height="26" rx="4" />
      <rect x="312" y="272" width="22" height="26" rx="4" /><rect x="378" y="272" width="22" height="26" rx="4" />
      <path d="M340 352 v-34 a16 16 0 0 1 32 0 v34" />
      <path d="M356 318 v34" strokeWidth="1.6" />
      <path d="M176 340 C 210 330, 250 332, 290 340" strokeDasharray="3 7" strokeWidth="1.8" stroke="#7a8580" />
      <circle cx="150" cy="168" r="17" fill="#fff" />
      <path d="M133 166 c0 -14 10 -22 20 -21 c10 1 16 8 15 18 c-6 -6 -14 -8 -22 -6 c-5 1 -9 4 -13 9 z" fill="#2f3533" />
      <path d="M144 172 h0.1 M156 172 h0.1" strokeWidth="3" />
      <path d="M145 178 q5 4 10 0" strokeWidth="1.8" />
      <path d="M150 185 v6" />
      <path d="M128 204 c0 -8 8 -13 22 -13 c14 0 22 5 22 13 l-4 72 h-36 z" fill="#fff" />
      <path d="M141 192 l9 16 l9 -16" strokeWidth="1.8" />
      <path d="M150 208 l-3 10 l3 14 l3 -14 z" fill="#059669" stroke="#059669" strokeWidth="1.4" />
      <path d="M170 204 c14 -2 30 -8 46 -18" />
      <path d="M216 186 l10 -6 M216 186 l8 2" strokeWidth="2" />
      <path d="M131 210 c-8 12 -12 24 -10 36" />
      <rect x="104" y="236" width="24" height="32" rx="3" fill="#fff" transform="rotate(-10 116 252)" />
      <path d="M110 248 h12 M110 255 h12 M110 262 h8" strokeWidth="1.5" transform="rotate(-10 116 252)" />
      <path d="M134 276 l-4 70 M166 276 l4 70" />
      <path d="M150 284 v58" strokeWidth="1.6" />
      <path d="M122 348 h14 M164 348 h14" strokeWidth="3" />
      <path d="M235 208 c-3 -16 6 -24 15 -24 c10 0 18 8 15 24 c2 10 1 18 -3 23 M235 208 c-2 9 -1 17 3 22" fill="#2f3533" strokeWidth="1.6" />
      <circle cx="250" cy="208" r="13" fill="#fff" />
      <path d="M237 204 c6 -1 13 -6 16 -12 c2 5 6 9 10 11" strokeWidth="1.8" />
      <path d="M245 211 h0.1 M255 211 h0.1" strokeWidth="3" />
      <path d="M246 217 q4 3 8 0" strokeWidth="1.6" />
      <path d="M234 238 c4 -6 10 -8 16 -8 c6 0 12 2 16 8 l8 56 h-48 z" fill="#fff" />
      <path d="M236 246 c-6 14 -6 26 -2 34" />
      <path d="M264 246 c6 10 8 20 6 30" />
      <rect x="262" y="274" width="18" height="16" rx="3" fill="#e7f6ef" />
      <path d="M266 274 c0 -6 10 -6 10 0" strokeWidth="1.6" />
      <path d="M240 294 l-2 52 M260 294 l2 52" />
      <path d="M232 348 h10 M258 348 h10" strokeWidth="3" />
      <g stroke="#059669">
        <circle cx="96" cy="96" r="32" fill="#fff" />
        <circle cx="96" cy="96" r="25" strokeWidth="1.4" />
        <path d="M96 80 V96 L108 104" />
        <path d="M70 66 l-10 -10 M122 66 l10 -10" />
        <path d="M78 130 l-6 8 M114 130 l6 8" />
      </g>
      <path d="M318 30 h130 a10 10 0 0 1 10 10 v20 a10 10 0 0 1 -10 10 h-46 l-12 12 v-12 h-72 a10 10 0 0 1 -10 -10 v-20 a10 10 0 0 1 10 -10 z" fill="#fff" stroke="#059669" />
      <text x="383" y="56" textAnchor="middle" fill="#059669" stroke="none" fontFamily="Pretendard, sans-serif" fontSize="17" fontWeight="700">
        계약없으면 수익 0원
      </text>
    </svg>
  );
}
