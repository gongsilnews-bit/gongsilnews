"use client";

import React from "react";
import Link from "next/link";
import { InstallGuideModal, useStudioInstaller } from "@/components/admin/sections/StudioInstallGuide";

/**
 * 공실마케팅 소개 (/marketing) — 브루(vrew.ai)식: 섹션마다 큰 제목 한 줄 · 설명 두 줄 · 버튼 · 큰 그림 하나 (2026-10-26 사장님)
 * 그림·시연 영상 자리는 비워 둔다 (<Shot>) — 실제 앱에서 찍은 화면으로 채운다. 지어낸 화면·숫자·후기 넣지 않음.
 * 색은 공실마케팅 앱 아이콘에서: 짙은 블랙·밤색 바탕 + 오렌지 버튼 (2026-10-26 사장님). ACCENT 만 바꾸면 전체가 바뀐다.
 */
const ACCENT = "#e8890c";
const ACCENT_SOFT = "#fdf4e7";
/** [무료로 써 보기] — 설치 없이 웹에서 이미지제작 (로그인 뒤 열린다) */
const TRY_HREF = "/realty_admin?menu=photo";

const CSS = `
.sv{font-family:"Pretendard Variable","Pretendard",-apple-system,sans-serif;color:#111827;background:#fff;word-break:keep-all}
.sv-sec{max-width:1120px;margin:0 auto;padding:120px 24px 0;text-align:center}
.sv-kicker{font-size:20px;font-weight:700;color:#6b7280;margin:0 0 14px}
.sv-h1{font-size:clamp(40px,5.6vw,68px);line-height:1.2;font-weight:900;letter-spacing:-0.03em;margin:0 0 28px}
.sv-h2{font-size:clamp(30px,3.6vw,42px);line-height:1.3;font-weight:900;letter-spacing:-0.02em;margin:0 0 18px}
.sv-p{font-size:18px;line-height:1.75;color:#4b5563;margin:0 auto 32px;max-width:680px}
.sv-p b{color:${ACCENT}}
.sv-btns{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}
.sv-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-width:150px;height:58px;padding:0 28px;border-radius:10px;font-size:17px;font-weight:700;text-decoration:none;transition:all .15s}
.sv-btn.solid{background:${ACCENT};color:#fff;border:1px solid ${ACCENT}}
.sv-btn.solid:hover{filter:brightness(1.12)}
.sv-btn.big{height:68px;padding:0 44px;border-radius:14px;font-size:20px;font-weight:800;gap:10px}
.sv-btn.line{background:#fff;color:${ACCENT};border:1px solid ${ACCENT}}
.sv-btn.line:hover{background:${ACCENT_SOFT}}
.sv-link{display:inline-block;margin-top:18px;font-size:16px;color:${ACCENT};text-decoration:underline}
.sv-shot{margin:56px auto 0;width:100%;border-radius:18px;background:repeating-linear-gradient(45deg,#f3f4f6,#f3f4f6 14px,#eef0f3 14px,#eef0f3 28px);border:1px dashed #cbd5e1;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:15px;font-weight:600}
.sv-img{display:block;margin:56px auto 0;width:100%;height:auto;border-radius:14px;border:1px solid #e5e7eb;box-shadow:0 24px 60px rgba(31,23,20,.16)}
.sv-band{background:${ACCENT_SOFT};margin-top:120px;padding-bottom:120px}
.sv-steps{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:48px;text-align:left}
.sv-step{background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:28px}
.sv-step .n{width:38px;height:38px;border-radius:50%;background:${ACCENT};color:#fff;font-weight:900;display:flex;align-items:center;justify-content:center;margin-bottom:16px}
.sv-step .t{font-size:20px;font-weight:800;margin-bottom:8px}
.sv-step .d{font-size:15.5px;line-height:1.7;color:#4b5563}
.sv-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:28px;margin-top:56px;text-align:center}
.sv-card{background:#fafafa;border-radius:20px;padding:36px 28px 34px}
.sv-card .ic{height:64px;display:flex;align-items:center;justify-content:center;margin-bottom:24px};color:${ACCENT};display:flex;align-items:center;justify-content:center;margin-bottom:16px}
.sv-card .t{font-size:21px;font-weight:800;margin-bottom:14px}
.sv-card .d{font-size:16px;line-height:1.8;color:#4b5563;white-space:pre-line}
.sv-cases{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:48px}
.sv-case .sv-shot{margin:0 0 14px}
.sv-case .t{font-size:19px;font-weight:800;text-align:left}
.sv-case .d{font-size:15px;line-height:1.6;color:#4b5563;text-align:left;margin-top:8px}
.sv-price{display:grid;grid-template-columns:repeat(2,1fr);gap:18px;max-width:720px;margin:40px auto 0}
.sv-pc{border:1px solid #e5e7eb;border-radius:16px;padding:28px;text-align:left}
.sv-pc.hl{border:2px solid ${ACCENT}}
.sv-pc .k{font-size:15px;font-weight:700;color:#6b7280;margin-bottom:8px}
.sv-pc .v{font-size:34px;font-weight:900}
.sv-end{background:#1f1714;color:#fff;margin-top:120px;padding:96px 24px;text-align:center}
.sv-end .sv-h2{color:#fff}
.sv-end .sv-btn.line{background:transparent;color:#fff;border-color:rgba(255,255,255,.7)}
.sv-end .sv-btn.solid{background:${ACCENT};color:#fff;border-color:${ACCENT}}
button.sv-btn{cursor:pointer;font-family:inherit}
.sv-vmodal{position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.75);display:flex;align-items:center;justify-content:center;padding:24px}
.sv-vmodal .box{position:relative;width:100%;max-width:1100px;aspect-ratio:16/9;background:#000;border-radius:12px;overflow:hidden}
.sv-vmodal iframe{width:100%;height:100%;border:0;display:block}
.sv-vmodal .x{position:absolute;top:6px;right:10px;z-index:1;border:0;background:none;color:#fff;font-size:34px;line-height:1;cursor:pointer}
.sv-src{display:grid;grid-template-columns:260px 1fr;gap:32px;max-width:1060px;margin:56px auto 0;text-align:left;align-items:start}
.sv-src-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}
.sv-src-list button{width:100%;display:flex;align-items:center;gap:12px;padding:14px 18px;border:0;border-radius:12px;background:none;font:inherit;font-size:18px;font-weight:700;color:#6b7280;cursor:pointer;text-align:left}
.sv-src-list button:hover{background:#f9fafb}
.sv-src-list button.on{background:${ACCENT_SOFT};color:${ACCENT}}
.sv-src-view img{display:block;width:100%;height:auto;border-radius:14px;border:1px solid #e5e7eb;box-shadow:0 24px 60px rgba(31,23,20,.16)}
@media (max-width:860px){.sv-src{grid-template-columns:1fr}}
.sv-rv-wrap{--rv-w:640px;--rv-gap:24px;position:relative;margin:48px auto 0;overflow:hidden;max-width:1400px;-webkit-mask-image:linear-gradient(90deg,transparent,#000 18%,#000 82%,transparent);mask-image:linear-gradient(90deg,transparent,#000 18%,#000 82%,transparent)}
.sv-rv-track{display:flex;gap:var(--rv-gap);width:100%}
.sv-rv{flex:0 0 var(--rv-w);background:#fafafa;border:1px solid #e5e7eb;border-radius:28px;padding:40px 40px 34px;text-align:left;box-sizing:border-box;opacity:.4;cursor:pointer;transition:opacity .7s}
.sv-rv.on{opacity:1;cursor:default}
.sv-rv .q{font-size:72px;line-height:.6;font-weight:900;color:#d1d5db;height:36px;font-family:Georgia,serif}
.sv-rv .txt{font-size:21px;line-height:1.8;color:#111827;margin-top:18px;white-space:pre-line}
.sv-rv.empty .txt{color:#9ca3af}
.sv-rv .who{display:flex;align-items:center;gap:10px;font-size:15px;font-weight:600;color:#6b7280;margin-top:24px}
.sv-rv-dots{display:flex;gap:8px;justify-content:center;margin-top:24px}
.sv-rv-dots button{width:8px;height:8px;border-radius:4px;border:0;background:#d1d5db;cursor:pointer;padding:0}
.sv-rv-dots button.on{width:22px;background:#1f1714}
@media (max-width:860px){.sv-rv-wrap{--rv-w:calc(100vw - 64px);--rv-gap:14px}.sv-rv{padding:28px}}
.sv-after{margin:64px auto 0;padding:36px 32px;border-radius:20px;background:${ACCENT_SOFT};text-align:left}
.sv-after .k{font-size:clamp(18px,2vw,22px);font-weight:700;color:#9a3412;margin-bottom:8px}
.sv-after h3{font-size:clamp(22px,2.8vw,30px);line-height:1.35;margin:0 0 24px;letter-spacing:-0.02em;font-weight:800}
.sv-after .row{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px}
.sv-after .ch{padding:18px;background:#fff;border-radius:12px;font-size:16px;font-weight:700;display:flex;align-items:center;gap:10px;color:#111827}
.sv-after .ch svg{color:${ACCENT}}
.sv-uses{display:grid;grid-template-columns:repeat(2,1fr);gap:56px 72px;max-width:900px;margin:56px auto 0}
.sv-use img{display:block;width:100%;aspect-ratio:5/3;object-fit:cover;object-position:top;border-radius:18px;border:1px solid #e5e7eb}
.sv-use .t{font-size:22px;font-weight:800;margin-top:22px}
.sv-use .d{font-size:16px;line-height:1.7;color:#4b5563;margin-top:10px;white-space:pre-line}
@media (max-width:860px){.sv-uses{grid-template-columns:1fr;gap:40px}}
.sv-maker{background:#1b1c1e;color:#fff;margin-top:120px}
.sv-maker .sv-h2{color:#fff}
.sv-maker .box{display:grid;grid-template-columns:340px 1fr;max-width:960px;margin:56px auto 0;background:#2a2c2f;border-radius:20px;text-align:left;overflow:hidden}
.sv-maker .pic{border-right:1px solid #3a3c40;padding:32px;display:flex;align-items:center;justify-content:center}
.sv-maker .ph{width:100%;aspect-ratio:3/4;border-radius:14px;border:1px dashed #55585d;display:flex;align-items:center;justify-content:center;color:#9ca3af;font-size:15px;font-weight:600}
.sv-maker .list{padding:44px 48px;display:flex;flex-direction:column;gap:30px;justify-content:center}
.sv-maker .it{display:flex;gap:16px;align-items:flex-start}
.sv-maker .it svg{flex:none;color:${ACCENT};margin-top:3px}
.sv-maker .it .t{font-size:19px;font-weight:800}
.sv-maker .it .d{font-size:15px;line-height:1.7;color:#c4c7cc;margin-top:6px}
@media (max-width:860px){.sv-maker .box{grid-template-columns:1fr}.sv-maker .pic{border-right:0;border-bottom:1px solid #3a3c40}.sv-maker .list{padding:32px 24px}}
.sv-last{padding-bottom:120px}
.sv-last .logo{display:flex;align-items:center;justify-content:center;gap:20px;margin-bottom:48px}
.sv-last .logo img{width:96px;height:96px;border-radius:50%;object-fit:cover}
.sv-last .logo span{font-size:clamp(40px,5vw,60px);font-weight:900;letter-spacing:-0.03em;color:#1f1714}
.sv-last .sv-h2{margin-bottom:40px}
.sv-last .os{font-size:15px;color:#4b5563;margin:28px 0 14px}
.sv-last .osi{display:inline-flex;width:42px;height:42px;border:1px solid #e5e7eb;border-radius:10px;align-items:center;justify-content:center;color:#374151}
.sv-dl{max-width:820px;margin:40px auto 0;text-align:left}
@media (max-width:860px){.sv-steps,.sv-grid,.sv-cases,.sv-price{grid-template-columns:1fr}.sv-sec{padding-top:88px}}
`;

/** 그림 — src 가 있으면 실제 앱에서 찍은 화면 (public/studio-shots, 2026-10-26), 없으면 자리 표시 */
function Shot({ label, ratio = "16 / 9", max = 1060, src }: { label: string; ratio?: string; max?: number; src?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  if (src) return <img src={src} alt={label} loading="lazy" className="sv-img" style={{ maxWidth: max }} />;
  return <div className="sv-shot" style={{ aspectRatio: ratio, maxWidth: max }}>{label} 자리</div>;
}

/** [영상보기] 누르면 띄우는 유튜브 — 지금은 샘플 영상 (2026-10-26 사장님), 실제 시연 영상이 나오면 바꾼다 */
const SAMPLE_VIDEO = "ah-zWlk8mxM";

function VideoModal({ id, onClose }: { id: string; onClose: () => void }) {
  React.useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div className="sv-vmodal" onClick={onClose}>
      <div className="box" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="x" onClick={onClose} aria-label="닫기">×</button>
        <iframe src={`https://www.youtube.com/embed/${id}?autoplay=1&rel=0`} title="공실마케팅 영상" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
      </div>
    </div>
  );
}

/** 실무 소스 칸 — 그림은 실제 앱 캡처, 없는 것은 자리만 (지어낸 화면 넣지 않음) */
const SOURCES: { t: string; i: string; src?: string }[] = [
  { t: "이미지와 비디오", i: "M3 5h18v14H3zM3 15l5-5 4 4 3-3 6 6", src: "/studio-shots/src-media.webp" },
  { t: "무료 드론 영상", i: "M12 10v4M8 12h8M5 5a2 2 0 1 0 0 .01M19 5a2 2 0 1 0 0 .01M5 19a2 2 0 1 0 0 .01M19 19a2 2 0 1 0 0 .01M7 7l3 3M17 7l-3 3M7 17l3-3M17 17l-3-3" },
  { t: "인스타 · 페이스북 · 스레드 소스", i: "M4 4h16v16H4zM8 12a4 4 0 1 0 8 0 4 4 0 0 0-8 0M17 7h.01", src: "/studio-shots/f-photo-1.webp" },
  { t: "물건홍보 · 명함 · 썸네일", i: "M5 3h14v18H5zM8 7h8M8 11h8M8 15h5", src: "/studio-shots/f-flyer.webp" },
];

/** 회원 후기 — 실제 회원이 남긴 글만 넣는다 (지어낸 후기 금지). 비어 있으면 자리만 보인다 (2026-10-26 사장님) */
const REVIEWS: { text: string; who: string }[] = [
  { text: "블로그 포스팅, 아무리 교육을 받아도 안 됐는데\n이제 매일 2개씩 부담 없이 꾸준히 하고 있어요.", who: "양재 OO부동산" },
  { text: "포토샵으로 만들어 둔 홍보물이 많았는데,\n공실마케팅 이미지편집이 PSD와 호환돼서\n기존 자료를 그대로 불러와 다 쓰고 있어요.", who: "서초 OO공인" },
  { text: "인스타 릴스, 부동산 소개 영상을\n공실마케팅에서 녹화하고 바로 편집해요.\n따로 배울 필요도 없고, 정말 너무 쉬워요.", who: "반포 단지 공인" },
  { text: "대형 부동산은 비싼 프로그램으로 매매보고서를 만든다던데,\n공실마케팅에서는 다양한 매물보고서를\n온라인 · 오프라인으로 바로 만들어 손님께 보내요.", who: "논현 사무실 전문 부동산" },
];

/** 실제 후기가 들어오기 전 자리 — 3개가 돌아가는 모양만 보여 준다 */
const REVIEW_SLOTS = [1, 2, 3].map(() => ({ text: "공실마케팅를 쓰는 대표님의 실제 후기가 이 자리에 들어갑니다.", who: "" }));

/** 후기 쓴 분 얼굴 자리 — 선으로 그린 작은 사람 (브루 후기처럼) */
const AVATAR = (
  <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden>
    <circle cx="20" cy="20" r="19" fill="#fff" stroke="#e5e7eb" />
    <path d="M11 14c0-6 4-9 9-9s9 3 9 9" fill="#fbbf24" stroke="#374151" strokeWidth="1.3" />
    <circle cx="20" cy="17" r="6.5" fill="#fff" stroke="#374151" strokeWidth="1.3" />
    <circle cx="17.8" cy="16.8" r=".9" fill="#374151" /><circle cx="22.2" cy="16.8" r=".9" fill="#374151" />
    <path d="M18.3 19.8q1.7 1.2 3.4 0" fill="none" stroke="#374151" strokeWidth="1.1" strokeLinecap="round" />
    <path d="M9 37c1-6 5-10 11-10s10 4 11 10" fill="none" stroke="#374151" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

function Reviews() {
  // 3개가 안 되면 남은 칸은 자리 표시로 채운다
  const list = [...REVIEWS, ...REVIEW_SLOTS.slice(REVIEWS.length)].map((r, k) => ({ ...r, empty: k >= REVIEWS.length }));
  const n = list.length;
  // 옆으로 계속 흘러가는 띠 — 세 벌 이어 붙이고 가운데 벌에서 돈다 (끝에 닿으면 소리 없이 가운데로 되돌린다)
  const [pos, setPos] = React.useState(n);
  const [anim, setAnim] = React.useState(true);
  React.useEffect(() => {
    const t = setInterval(() => { setAnim(true); setPos((p) => p + 1); }, 4000);
    return () => clearInterval(t);
  }, []);
  const onEnd = () => {
    if (pos >= 2 * n || pos < n) { setAnim(false); setPos(n + (((pos - n) % n) + n) % n); }
  };
  const strip = [...list, ...list, ...list];
  const cur = (((pos - n) % n) + n) % n;
  return (
    <>
      <div className="sv-rv-wrap">
        <div className="sv-rv-track" onTransitionEnd={onEnd} style={{ transform: `translateX(calc(50% - (var(--rv-w) + var(--rv-gap)) * ${pos} - var(--rv-w) / 2))`, transition: anim ? "transform .7s cubic-bezier(.4,0,.2,1)" : "none" }}>
          {strip.map((r, k) => (
            <div key={k} className={`sv-rv${k === pos ? " on" : ""}${r.empty ? " empty" : ""}`} onClick={() => { setAnim(true); setPos(k); }}>
              <div className="q">“</div><div className="txt">{r.text}</div>{r.who && <div className="who">{AVATAR}<span>{r.who}</span></div>}
            </div>
          ))}
        </div>
      </div>
      <div className="sv-rv-dots">{list.map((_, k) => <button key={k} type="button" aria-label={`후기 ${k + 1}`} className={k === cur ? "on" : ""} onClick={() => { setAnim(true); setPos(n + k); }} />)}</div>
    </>
  );
}

const CHANNELS = [
  { t: "블로그", i: "M6 3h9l3 3v15H6zM9 9h6M9 13h6M9 17h4" },
  { t: "인스타그램", i: "M4 4h16v16H4zM8 12a4 4 0 1 0 8 0 4 4 0 0 0-8 0M17 7h.01" },
  { t: "페이스북", i: "M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0M14 8h-1.5A1.5 1.5 0 0 0 11 9.5V21M9 13h5" },
  { t: "스레드", i: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M16 12v1.5a2.5 2.5 0 0 0 5 0V12a9 9 0 1 0-3.5 7.1" },
  { t: "유튜브", i: "M3 6h18v12H3zM10 9l5 3-5 3z" },
];

const ico = (d: string) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={d} /></svg>
);

/** [이것도 다 됩니다] 그림 — 브루 "강력하고 놀라운 기능들"처럼 색 있는 작은 그림 (2026-10-26 사장님) */
const ART = {
  capture: (
    <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden>
      <rect x="6" y="12" width="52" height="34" rx="5" fill="#f3f4f6" stroke="#374151" strokeWidth="3" />
      <path d="M24 54h16M32 46v8" stroke="#374151" strokeWidth="3" strokeLinecap="round" />
      <circle cx="32" cy="29" r="8" fill="#ef4444" />
      <path d="M12 18h6M12 18v6M52 18h-6M52 18v6M12 40h6M12 40v-6M52 40h-6M52 40v-6" stroke="#9ca3af" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  ),
  remodel: (
    <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden>
      <path d="M8 30 32 10l24 20" stroke="#374151" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M14 26v28h36V26" fill="#fdf4e7" stroke="#374151" strokeWidth="3" strokeLinejoin="round" />
      <rect x="27" y="38" width="10" height="16" fill="#e8890c" />
      <path d="M50 4l2.2 5.8L58 12l-5.8 2.2L50 20l-2.2-5.8L42 12l5.8-2.2z" fill="#f59e0b" />
    </svg>
  ),
  flyer: (
    <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden>
      <rect x="12" y="6" width="36" height="50" rx="4" fill="#f3f4f6" stroke="#374151" strokeWidth="3" />
      <rect x="18" y="13" width="24" height="15" rx="2" fill="#93c5fd" />
      <path d="M18 35h24M18 42h24M18 49h14" stroke="#9ca3af" strokeWidth="3" strokeLinecap="round" />
      <rect x="42" y="30" width="14" height="10" rx="2" fill="#ef4444" />
    </svg>
  ),
  intake: (
    <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden>
      <rect x="6" y="8" width="52" height="48" rx="8" fill="#38bdf8" />
      <circle cx="32" cy="32" r="15" fill="none" stroke="#fff" strokeWidth="3" />
      <path d="M17 32h30M32 17c6 5 6 25 0 30M32 17c-6 5-6 25 0 30" stroke="#fff" strokeWidth="3" fill="none" />
    </svg>
  ),
  voice: (
    <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden>
      <rect x="22" y="6" width="20" height="32" rx="10" fill="#a78bfa" />
      <path d="M14 28a18 18 0 0 0 36 0M32 46v8" stroke="#374151" strokeWidth="3" strokeLinecap="round" fill="none" />
      <rect x="8" y="56" width="48" height="5" rx="2.5" fill="#fbbf24" />
    </svg>
  ),
  folder: (
    <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden>
      <path d="M6 16a4 4 0 0 1 4-4h14l6 6h24a4 4 0 0 1 4 4v28a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4z" fill="#fbbf24" />
      <path d="M6 26h52v24a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4z" fill="#f59e0b" />
      <rect x="22" y="34" width="20" height="12" rx="2" fill="#fff" />
    </svg>
  ),
};

const MORE = [
  { t: "화면캡처 · 녹화", d: "화면을 캡처하고 녹화해서\n바로 영상 · 이미지 작업에 씁니다.", a: ART.capture },
  { t: "인테리어 · 리모델링 AI", d: "공실 사진으로\n고친 뒤 모습을 미리 보여 줍니다.", a: ART.remodel },
  { t: "유리창 홍보지", d: "사무소 유리창에 붙일\n매물 홍보지를 만듭니다.", a: ART.flyer },
  { t: "물건접수홈페이지", d: "임대인이 물건을 맡기는\n나만의 홈페이지를 엽니다.", a: ART.intake },
  { t: "AI 성우 · 자막", d: "글만 쓰면 AI 목소리와\n자막이 영상에 들어갑니다.", a: ART.voice },
  { t: "작업 파일은 내 PC에", d: "만든 원본은 대표님 PC 폴더에\n그대로 남습니다.", a: ART.folder },
];

export default function StudioVrewLanding() {
  const [video, setVideo] = React.useState<string | null>(null);
  const [src, setSrc] = React.useState(0);
  const installer = useStudioInstaller();
  const [guide, setGuide] = React.useState(false);
  /** 칸마다 같은 두 버튼 — [영상보기] 유튜브 창 · [마케팅프로그램 PC설치] 아래 앱 받기 칸 (2026-10-26 사장님, 이름은 10-29) */
  const btns = (
    <div className="sv-btns">
      <button type="button" className="sv-btn line" onClick={() => setVideo(SAMPLE_VIDEO)}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M8 5v14l11-7z" /></svg>
        영상보기
      </button>
      <a href="#download" className="sv-btn solid">마케팅프로그램 PC설치</a>
    </div>
  );
  return (
    <div className="sv">
      <style>{CSS}</style>
      {video && <VideoModal id={video} onClose={() => setVideo(null)} />}

      {/* 1 첫 화면 */}
      <section className="sv-sec" style={{ paddingTop: 96 }}>
        <p className="sv-kicker">국내 최초! 부동산 전용 마케팅 스튜디오</p>
        <h1 className="sv-h1">공실만 등록하면<br />뉴스 · 블로그 · SNS · 영상까지</h1>
        <p className="sv-p">
          공실 하나로 <b>공실뉴스 기사</b>와 <b>블로그 · 인스타그램 · 스레드 글</b>을 AI가 채우고,<br />
          공실 사진으로 <b>영상뉴스</b>를 만듭니다. 마지막 <b>[발행]</b>만 직접 누르세요.
        </p>
        <div className="sv-btns">
          <a href="#download" className="sv-btn solid big">
            무료 다운로드
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 4v11" /><path d="m7 10 5 5 5-5" /><path d="M4 17v3h16v-3" /></svg>
          </a>
        </div>
        {/* 첫 화면 영상 — 사장님이 만든 studio.mp4 (소리 빼고 줄임, 2026-10-26). 소리 없이 자동 재생 · 반복 */}
        <video className="sv-img" style={{ maxWidth: 1060 }} src="/studio-shots/hero.mp4" poster="/studio-shots/hero-poster.jpg" autoPlay muted loop playsInline preload="auto" aria-label="공실마케팅로 블로그 · 인스타그램 · 페이스북 · 스레드에 한 번에 올리는 중개사" />
      </section>

      {/* 2 뉴스·SNS 자동 발행 */}
      <section className="sv-sec">
        <h2 className="sv-h2">클릭 한 번으로<br />블로그 · 인스타그램 · 페이스북 · 스레드까지</h2>
        <p className="sv-p">공실을 고르고 <b>[한 번에 쓰기]</b>만 누르세요.<br /><b>공실뉴스 기사 · 네이버 블로그 · 인스타그램 · 페이스북 · 스레드</b> 글이 동시에 완성됩니다.<br />채널마다 따로 쓸 필요 없이, [발행]만 누르면 포스팅 끝.</p>
        {btns}
        {/* 네이버 블로그 자동 채우기 영상 — 사장님이 찍은 naver.mp4 (소리 빼고 줄임, 2026-10-26) */}
        <video className="sv-img" style={{ maxWidth: 1060 }} src="/studio-shots/sns.mp4" poster="/studio-shots/sns-poster.jpg" autoPlay muted loop playsInline preload="metadata" aria-label="공실마케팅가 네이버 블로그 글을 채우는 화면" />
      </section>

      {/* 2-1 어렵지 않아요 — 뉴스·SNS 바로 아래 (2026-10-26 사장님) */}
      <div className="sv-band">
        <section className="sv-sec">
          <h2 className="sv-h2">어렵지 않아요, 3단계면 됩니다</h2>
          <p className="sv-p">블로그 · 인스타그램 · 스레드 · 페이스북, 몰라도 괜찮습니다.<br />대표님은 고르고, 확인하고, 누르기만 하세요.</p>
          <div className="sv-steps">
            {[
              { n: "1", t: "공실 고르기", d: "공실뉴스에 등록한 내 공실을 고릅니다." },
              { n: "2", t: "AI가 채우기", d: "뉴스 · 블로그 · SNS 글과 영상 · 이미지를 AI가 만들어 채웁니다." },
              { n: "3", t: "내가 발행", d: "확인하고 고친 뒤 [발행]은 대표님이 직접 누릅니다. 계정이 안전합니다." },
            ].map((s) => (
              <div key={s.n} className="sv-step"><div className="n">{s.n}</div><div className="t">{s.t}</div><div className="d">{s.d}</div></div>
            ))}
          </div>
        </section>
      </div>

      {/* 3 영상뉴스 */}
      <section className="sv-sec">
        <h2 className="sv-h2">부동산에 꼭 맞춘<br />영상편집 전문 프로그램</h2>
        <p className="sv-p"><b>쉽고, 빠르게.</b> 릴스 · 뉴스 영상을 <b>AI가 만들어 줍니다.</b><br />공실 사진만 넣으면 AI 성우 목소리와 자막까지 자동으로 들어갑니다.</p>
        {btns}
        <Shot label="릴스 · 쇼츠 9:16 영상 편집 화면" src="/studio-shots/home-video.webp" />
      </section>

      {/* 4 AI 물건보고서 */}
      <section className="sv-sec">
        <h2 className="sv-h2">AI 물건보고서 자동 작성</h2>
        <p className="sv-p">다양한 디자인 · 컬러를 골라 <b>온라인 · 오프라인 매물보고서</b>를 만듭니다.<br /><b>건축물대장 · 시세현황</b>까지 AI가 자동으로 작성합니다.</p>
        {btns}
        <Shot label="AI 매물보고서 화면" src="/studio-shots/home-report.webp" />
      </section>

      {/* 5 디자인 편집 */}
      <section className="sv-sec">
        <h2 className="sv-h2">부동산에 꼭 맞춘<br />디자인 편집 프로그램</h2>
        <p className="sv-p"><b>유튜브 썸네일 · 인스타 카드 · 명함 · 유리창 홍보지</b>까지.<br />포토샵(PSD) 파일과도 호환됩니다.</p>
        {btns}
        <Shot label="이미지제작 화면" src="/studio-shots/home-photo.webp" />
      </section>

      {/* 5-1 실무 소스 — 브루 "저작권 걱정 없는 영상 소스"식: 왼쪽 목록 · 오른쪽 그림 (2026-10-26 사장님) */}
      <section className="sv-sec">
        <h2 className="sv-h2">부동산 실무에 꼭 필요한 소스를 한번에</h2>
        <p className="sv-p">마케팅 실무에 꼭 필요한 다양한 소스를 템플릿으로,<br />저작권 걱정 없이 한번에 쓰세요.</p>
        {btns}
        <div className="sv-src">
          <ul className="sv-src-list">
            {SOURCES.map((x, i) => (
              <li key={x.t}><button type="button" className={i === src ? "on" : ""} onClick={() => setSrc(i)}>{ico(x.i)}{x.t}</button></li>
            ))}
          </ul>
          <div className="sv-src-view">
            {SOURCES[src].src
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={SOURCES[src].src} alt={SOURCES[src].t} />
              : <div className="sv-shot" style={{ aspectRatio: "16 / 10", margin: 0 }}>{SOURCES[src].t} 화면 자리</div>}
          </div>
        </div>
      </section>

      {/* 7 이것도 돼요 */}
      <section className="sv-sec">
        <h2 className="sv-h2">부동산을 위한 마케팅 스튜디오!</h2>
        <div className="sv-grid">
          {MORE.map((m) => (
            <div key={m.t} className="sv-card"><div className="ic">{m.a}</div><div className="t">{m.t}</div><div className="d">{m.d}</div></div>
          ))}
        </div>
      </section>

      {/* 7-1 후기 — 브루 "가벼우니까, 쉬우니까"식 (2026-10-26 사장님) */}
      <section className="sv-sec">
        <h2 className="sv-h2">부동산 마케팅, 이거 하나면 끝!</h2>
        <p className="sv-p">뉴스 · 블로그 · SNS · 영상 · 보고서 · 디자인까지<br />공실마케팅 하나로 한 번에 해결하세요.</p>
        {btns}
        <Reviews />
      </section>

      {/* 8 활용 사례 */}
      <section className="sv-sec">
        <h2 className="sv-h2">1~2인 부동산에 강력 추천합니다.</h2>
        <div className="sv-cases">
          {/* 공실뉴스부동산 소개(/newsrealty) "이런 부동산에게 추천합니다" 사진 그대로 (2026-10-26 사장님) */}
          {[
            { t: "사무실 · 상가 전문", d: "빠른 브리핑이 필요할 때, AI 매물보고서로 바로.", src: "/images/study/recommend_real_teheran_man.jpg" },
            { t: "아파트 · 오피스텔 입점", d: "블로그 · SNS 꾸준한 포스팅과 물건접수 홈페이지로 차별화!", src: "/images/study/recommend_real_apartment.jpg" },
            { t: "빌라 · 주택 · 건물", d: "공실 사진으로 릴스 · 유튜브 영상을 직접 만들고 싶은 소장님!", src: "/images/study/recommend_real_villa.jpg" },
          ].map((c) => (
            // eslint-disable-next-line @next/next/no-img-element
            <div key={c.t} className="sv-case"><img src={c.src} alt={c.t} loading="lazy" style={{ display: "block", width: "100%", aspectRatio: "4 / 3", objectFit: "cover", borderRadius: 14, marginBottom: 16 }} /><div className="t">{c.t}</div><div className="d">{c.d}</div></div>
          ))}
        </div>
        {/* 공실뉴스부동산 소개(/newsrealty) "공실마케팅와 12개월 뒤" 상자 그대로 (2026-10-26 사장님) */}
        <div className="sv-after">
          <div className="k">공실마케팅와 12개월 뒤</div>
          <h3>블로그/유튜브 채널이 완성되고, SNS로 꾸준히 홍보할 수 있습니다.</h3>
          <div className="row">
            {CHANNELS.map((c) => (
              <div key={c.t} className="ch">{ico(c.i)}<span>{c.t}</span></div>
            ))}
          </div>
        </div>
      </section>

      {/* 8-1 이렇게 쓰세요 — 브루 "이렇게 Vrew를 사용하고 있어요"식 2×2, 그림은 공실마케팅로 실제 만든 결과물 (2026-10-26 사장님) */}
      <section className="sv-sec">
        <h2 className="sv-h2">이렇게 공실마케팅를 사용하세요</h2>
        <div className="sv-uses">
          {[
            { t: "공동중개 광고", d: "등록한 공실이 공실뉴스 공실열람에 올라가\n중개사님들과 함께 공동중개로 홍보됩니다.", src: "/studio-shots/case-news.webp" },
            { t: "물건보고서 작성", d: "건축물대장 · 시세까지 AI가 채운 물건보고서를\n온라인 · 오프라인으로 손님께 보냅니다.", src: "/studio-shots/case-report.webp" },
            { t: "블로그 / SNS 자동화", d: "공실 하나로 블로그 · 인스타그램 · 페이스북 · 스레드 글을\n한 번에 채우고 [발행]만 누릅니다.", src: "/studio-shots/sns-poster.jpg" },
            { t: "이미지 / 영상 편집", d: "홍보 이미지 · 명함 · 썸네일부터\n릴스 · 유튜브 영상까지 직접 만듭니다.", src: "/studio-shots/home-photo.webp" },
          ].map((c) => (
            <div key={c.t} className="sv-use">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.src} alt={c.t} loading="lazy" />
              <div className="t">{c.t}</div>
              <div className="d">{c.d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 8-2 만든 사람 — 브루 "개인정보 보호를 최우선으로" 검은 띠식: 왼쪽 사진 · 오른쪽 설명 (2026-10-26 사장님) */}
      <div className="sv-maker">
        <section className="sv-sec" style={{ paddingTop: 110, paddingBottom: 110 }}>
          <h2 className="sv-h2">강남 부동산 마케팅 교육 10년,<br />방송국 PD 출신 마케팅 대표가 제작했습니다.</h2>
          <div className="box">
            <div className="pic">
              {/* 대표 사진 — 사장님이 주시면 /public/studio-shots/maker.jpg 로 넣는다 */}
              <div className="ph">대표 사진 자리</div>
            </div>
            <div className="list">
              {[
                { t: "강남권 최다 공동중개 마케팅 이사 직접 제작", d: "공동중개 현장에서 매일 쓰는 마케팅을 그대로 프로그램에 담았습니다.", i: "M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7zM9 12l2 2 4-4" },
                { t: "부동산 마케팅 교육 10년", d: "강남에서 10년 동안 중개사님들께 블로그 · SNS · 영상 마케팅을 가르쳤습니다.", i: "M3 7l9-4 9 4-9 4zM7 9v5c0 2 2.5 3 5 3s5-1 5-3V9" },
                { t: "서울벤처대학원대학교 부동산 마케팅 강의", d: "대학원에서 부동산 마케팅을 강의한 내용을 실무 기능으로 옮겼습니다.", i: "M4 20h16M6 20V10M10 20V10M14 20V10M18 20V10M3 10l9-6 9 6z" },
                { t: "포토샵 · 프리미어 프로 · 캡컷 · 브루 강의 10년", d: "전문 프로그램을 10년 동안 가르치며 꼭 필요한 기능만 골라 담았습니다.", i: "M4 4h16v16H4zM8 15V9l4 3 4-3v6" },
                { t: "방송국 PD 출신", d: "방송 제작 경험으로 누구나 쉽게 쓰는 영상 편집 화면을 만들었습니다.", i: "M3 6h18v12H3zM10 9l5 3-5 3z" },
              ].map((x) => (
                <div key={x.t} className="it">{ico(x.i)}<div><div className="t">{x.t}</div><div className="d">{x.d}</div></div></div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* 마지막 — 브루 맨 아래처럼 큰 로고 · 한 줄 · 버튼 (2026-10-26 사장님) */}
      <section id="download" className="sv-sec sv-last" style={{ scrollMarginTop: 80 }}>
        <div className="logo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/new_logo.png" alt="" />
          <span>공실마케팅</span>
        </div>
        <h2 className="sv-h2">부동산 AI를 가장 잘 활용할 수 있도록,</h2>
        <div className="sv-btns">
          <Link href={TRY_HREF} className="sv-btn line">웹에서 써 보기</Link>
          {/* 설치 파일이 저장소에 있으면 바로 받고 [추가 정보] → [실행] 안내를 띄운다 (2026-10-27 사장님) */}
          <a href={installer.ready ? installer.href : "#download"} onClick={() => installer.ready && setGuide(true)} className="sv-btn solid">무료 다운로드</a>
        </div>
        {guide && <InstallGuideModal ver={installer.ver} onClose={() => setGuide(false)} />}
        <p className="os">공실마케팅는 윈도우 10 · 11 PC를 지원합니다.</p>
        <div className="osi" aria-hidden>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M3 5.5 10.5 4.5v7H3zM11.5 4.4 21 3v8.5h-9.5zM3 12.5h7.5v7L3 18.5zM11.5 12.5H21V21l-9.5-1.4z" /></svg>
        </div>
      </section>
    </div>
  );
}
