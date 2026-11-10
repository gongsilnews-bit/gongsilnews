"use client";

import React from "react";
import { useStartHref } from "./useStartHref";
import Link from "next/link";
import { ProTag } from "@/components/admin/ProBadge";
import StudioPriceTable from "./StudioPriceTable";

/**
 * 공실뉴스부동산 · PRO 소개 (/newsrealty, 2026-11-04 사장님: 공실마케팅 studio → 공실뉴스부동산 PRO, 영상편집·앱 설치 빼고 웹으로)
 *  예전 공실마케팅 소개 (/marketing) — 브루(vrew.ai)식: 섹션마다 큰 제목 한 줄 · 설명 두 줄 · 버튼 · 큰 그림 하나 (2026-10-26 사장님)
 * 그림·시연 영상 자리는 비워 둔다 (<Shot>) — 실제 앱에서 찍은 화면으로 채운다. 지어낸 화면·숫자·후기 넣지 않음.
 * 색은 공실마케팅 앱 아이콘에서: 짙은 블랙·밤색 바탕 + 오렌지 버튼 (2026-10-26 사장님). ACCENT 만 바꾸면 전체가 바뀐다.
 */
const ACCENT = "#e8890c";
const ACCENT_SOFT = "#fdf4e7";
const CSS = `
.sv{font-family:"Pretendard Variable","Pretendard",-apple-system,sans-serif;color:#111827;background:#fff;word-break:keep-all}
.sv-sec{max-width:1120px;margin:0 auto;padding:120px 24px 0;text-align:center}
.sv-kicker{font-size:20px;font-weight:700;color:#6b7280;margin:0 0 14px}
.sv-h1{font-size:clamp(40px,5.6vw,68px);line-height:1.2;font-weight:900;letter-spacing:-0.03em;margin:0 0 28px}
.sv-h2{font-size:clamp(30px,3.6vw,42px);line-height:1.3;font-weight:900;letter-spacing:-0.02em;margin:0 0 18px}
.sv-p{font-size:18px;line-height:1.75;color:#4b5563;margin:0 auto 32px;max-width:680px}
.sv-p b{color:${ACCENT}}
.sv-btns{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}
.sv-cmp{max-width:860px;margin:8px auto 0;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;text-align:left}
.sv-cmp .h,.sv-cmp .r{display:grid;grid-template-columns:1.3fr 1fr 1.4fr;align-items:center}
.sv-cmp .h{background:#f9fafb;font-size:15px;font-weight:800;color:#374151}
.sv-cmp .h span,.sv-cmp .r span{padding:14px 20px}
.sv-cmp .r{border-top:1px solid #f1f5f9;font-size:15px;color:#4b5563}
.sv-cmp .r .t{font-weight:700;color:#111827}
.sv-cmp .pro{background:${ACCENT_SOFT};color:#111827;font-weight:700}
.sv-cmp .h .pro{color:${ACCENT}}
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
.sv-band-y{background:#FFF8E6;margin-top:120px;padding:0 0 120px}
.sv-band-y .sv-card{background:#fff;box-shadow:0 6px 20px rgba(120,90,20,.06)}
.sv-steps{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:48px;text-align:left}
.sv-step{background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:28px}
.sv-step .n{width:38px;height:38px;border-radius:50%;background:${ACCENT};color:#fff;font-weight:900;display:flex;align-items:center;justify-content:center;margin-bottom:16px}
.sv-step .t{font-size:20px;font-weight:800;margin-bottom:8px}
.sv-step .d{font-size:15.5px;line-height:1.7;color:#4b5563}
.sv-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:28px;margin-top:56px;text-align:center}
.sv-grid.five{grid-template-columns:repeat(6,1fr)}.sv-grid.five .sv-card{grid-column:span 2}.sv-grid.five .sv-card:nth-child(4){grid-column:2/span 2}
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
.sv-last-wrap{background:#1b1c1e;margin-top:120px} /* 맨 아래 진한 바탕 (2026-11-09 사장님) */
.sv-last{padding-top:110px;padding-bottom:120px}
.sv-last .logo{display:flex;align-items:center;justify-content:center;gap:20px;margin-bottom:48px}
.sv-last .logo img{width:96px;height:96px;border-radius:50%;object-fit:cover}
.sv-last .logo span{font-size:clamp(40px,5vw,60px);font-weight:900;letter-spacing:-0.03em;color:#fff}
.sv-last .sv-h2{margin-bottom:40px;color:#fff}
.sv-last .os{font-size:15px;color:#9ca3af;margin:28px 0 14px}
.sv-last .osi{display:inline-flex;width:42px;height:42px;border:1px solid #e5e7eb;border-radius:10px;align-items:center;justify-content:center;color:#374151}
.sv-dl{max-width:820px;margin:40px auto 0;text-align:left}
@media (max-width:860px){.sv-steps,.sv-grid,.sv-grid.five,.sv-cases,.sv-price{grid-template-columns:1fr}.sv-grid.five .sv-card,.sv-grid.five .sv-card:nth-child(4){grid-column:auto}.sv-sec{padding-top:88px}}
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
        <iframe src={`https://www.youtube.com/embed/${id}?autoplay=1&rel=0`} title="공실뉴스 소개 영상" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
      </div>
    </div>
  );
}

/** 실무 소스 칸 — 그림은 실제 앱 캡처, 없는 것은 자리만 (지어낸 화면 넣지 않음) */
/** 쇼츠 자동 발행기 왼쪽 단계 목록 (2026-11-10 사장님: 디자인 편집 칸과 같은 모양) */
const SHORTS_STEPS = [
  { t: "공실 고르기", d: "등록한 공실의 사진·정보로 대본이 채워집니다." },
  { t: "테마 고르기", d: "자막·글꼴·전환이 맞춰진 테마를 고르면 쇼츠가 완성됩니다." },
  { t: "한 번에 올리기", d: "도우미가 영상·제목·설명을 채우고, [게시]는 대표님이 직접 누릅니다." },
];

const SOURCES: { t: string; i: string; src?: string }[] = [
  { t: "포토studio 편집 화면", i: "M3 4h18v12H3zM8 20h8M12 16v4M7 12l3-3 3 3 4-4", src: "/studio-shots/home-photo.webp" }, // 디자인 편집과 합침 (2026-11-05)
  { t: "이미지 소스", i: "M3 5h18v14H3zM3 15l5-5 4 4 3-3 6 6", src: "/studio-shots/src-media.webp" },
  { t: "인스타 · 페이스북 · 스레드 소스", i: "M4 4h16v16H4zM8 12a4 4 0 1 0 8 0 4 4 0 0 0-8 0M17 7h.01", src: "/studio-shots/f-photo-1.webp" },
  { t: "물건홍보 · 명함 · 썸네일", i: "M5 3h14v18H5zM8 7h8M8 11h8M8 15h5", src: "/studio-shots/f-flyer.webp" },
];

/** 회원 후기 — 실제 회원이 남긴 글만 넣는다 (지어낸 후기 금지). 비어 있으면 자리만 보인다 (2026-10-26 사장님) */
const REVIEWS: { text: string; who: string }[] = [
  { text: "블로그 포스팅, 아무리 교육을 받아도 안 됐는데\n이제 매일 2개씩 부담 없이 꾸준히 하고 있어요.", who: "양재 OO부동산" },
  { text: "포토샵으로 만들어 둔 홍보물이 많았는데,\n공실뉴스 포토studio가 PSD와 호환돼서\n기존 자료를 그대로 불러와 다 쓰고 있어요.", who: "서초 OO공인" },
  { text: "대형 부동산은 비싼 프로그램으로 매매보고서를 만든다던데,\n공실뉴스에서는 다양한 매물보고서를\n온라인 · 오프라인으로 바로 만들어 손님께 보내요.", who: "논현 사무실 전문 부동산" },
];

/** 실제 후기가 들어오기 전 자리 — 3개가 돌아가는 모양만 보여 준다 */
const REVIEW_SLOTS = [1, 2, 3].map(() => ({ text: "공실뉴스부동산을 쓰는 대표님의 실제 후기가 이 자리에 들어갑니다.", who: "" }));

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
  news: (
    <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden>
      <rect x="8" y="10" width="40" height="44" rx="5" fill="#fff" stroke="#374151" strokeWidth="3" />
      <rect x="14" y="17" width="28" height="9" rx="2" fill="#e8890c" />
      <path d="M14 33h28M14 40h28M14 47h18" stroke="#9ca3af" strokeWidth="3" strokeLinecap="round" />
      <path d="M48 22h6a2 2 0 0 1 2 2v26a4 4 0 0 1-8 0z" fill="#fde68a" stroke="#374151" strokeWidth="3" />
    </svg>
  ),
  design: (
    <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden>
      <rect x="6" y="10" width="44" height="36" rx="5" fill="#eef2ff" stroke="#374151" strokeWidth="3" />
      <path d="M12 40l10-12 8 8 6-6 8 10z" fill="#60a5fa" />
      <circle cx="20" cy="20" r="4" fill="#fbbf24" />
      <path d="M44 54l14-14-6-6-14 14-2 8z" fill="#e8890c" stroke="#374151" strokeWidth="2.5" strokeLinejoin="round" />
    </svg>
  ),
  alert: (
    <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden>
      <path d="M32 8c-9 0-15 7-15 16v10l-5 8h40l-5-8V24c0-9-6-16-15-16z" fill="#fde68a" stroke="#374151" strokeWidth="3" strokeLinejoin="round" />
      <path d="M26 46a6 6 0 0 0 12 0" fill="none" stroke="#374151" strokeWidth="3" />
      <circle cx="46" cy="14" r="9" fill="#ef4444" />
      <path d="M42 15l3 3 5-6" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  // 쇼츠·릴스 편집기 — 세로 화면 안 재생 단추 (2026-11-05 사장님)
  video: (
    <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden>
      <rect x="18" y="6" width="28" height="50" rx="5" fill="#fff" stroke="#374151" strokeWidth="3" />
      <rect x="23" y="13" width="18" height="30" rx="2" fill="#fde68a" />
      <path d="M29 22v12l10-6z" fill="#e8890c" stroke="#374151" strokeWidth="2" strokeLinejoin="round" />
      <path d="M26 49h12" stroke="#9ca3af" strokeWidth="3" strokeLinecap="round" />
      <circle cx="50" cy="14" r="8" fill="#ef4444" />
      <path d="M47 11v6l5-3z" fill="#fff" />
    </svg>
  ),
};

const MORE = [ // 공실뉴스부동산 혜택 (2026-11-05 사장님) — 쇼츠·릴스 편집기 더해 6가지
  { t: "공실등록 20건 · 뉴스 월 4건", d: "광고 공실 20건을 올리고\n내 지역 소식을 공실뉴스 기사로 냅니다.", a: ART.news },
  { t: "AI 매물보고서 · 유리창 홍보지", d: "공실 하나로 손님에게 보낼 보고서와\n사무소 유리창 홍보지를 만듭니다.", a: ART.flyer },
  { t: "물건접수홈페이지", d: "임대인이 물건을 맡기는\n나만의 홈페이지를 엽니다.", a: ART.intake },
  { t: "부동산 디자인 편집 프로그램", d: "포토샵 파일(PSD)까지 여는 편집기로\n홍보 이미지를 직접 만듭니다.", a: ART.design },
  { t: "쇼츠·릴스 편집기", d: "공실 하나로 60초 쇼츠를 만들고\n유튜브·인스타그램에 바로 올립니다.", a: ART.video },
  { t: "단지 실시간 실거래 알림", d: "찜한 단지에 새 실거래가 뜨면\n바로 알려 드립니다.", a: ART.alert },
];

export default function StudioVrewLanding() {
  const START_HREF = useStartHref();
  const [video, setVideo] = React.useState<string | null>(null);
  const [src, setSrc] = React.useState(0);
  const [shortsStep, setShortsStep] = React.useState(0);
  /** 칸마다 같은 두 버튼 — [영상보기] 유튜브 창 · [무료로 시작하기] (2026-11-04: 앱 설치 대신 웹) */
  const btns = (
    <div className="sv-btns">
      <button type="button" className="sv-btn line" onClick={() => setVideo(SAMPLE_VIDEO)}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M8 5v14l11-7z" /></svg>
        영상보기
      </button>
      <Link href={START_HREF} className="sv-btn solid">무료로 시작하기</Link>
    </div>
  );
  return (
    <div className="sv">
      <style>{CSS}</style>
      {video && <VideoModal id={video} onClose={() => setVideo(null)} />}

      {/* 원페이지 — 위 메뉴를 누르면 이 칸들로 내려간다 (2026-11-09 사장님) */}
      <style>{`html{scroll-behavior:smooth}`}</style>
      {/* 1 SNS 자동화 — 여기부터 (2026-11-09 사장님: "공실만 등록하면 뉴스 블로그 SNS까지 여기서부터") */}
      <section id="sns" className="sv-sec" style={{ paddingTop: 96, scrollMarginTop: 80 }}>
        {/* 2026-11-09 사장님 문구 — "내 지역 공실! 이제 뉴스로 전달하세요." 대신 */}
        <p className="sv-kicker">내 지역 공실! 이제 <span style={{ color: ACCENT }}>SNS · 뉴스</span>로 전달하세요</p>{/* 2026-11-10 사장님 */}
        <h2 className="sv-h1">공실만 등록하면<br />뉴스 · 블로그 · SNS까지</h2>
        <p className="sv-p">
          공실 하나로 <b>공실뉴스 기사</b>와 <b>블로그 · 인스타그램 · 스레드 · 페이스북 글</b>,<br />
          <b>유튜브 대본</b>까지 AI가 채웁니다.<br />
          <b>공실뉴스부동산</b>이 되시면 <b>SNS · 뉴스</b> 마케팅이 쉬워집니다!
        </p>
        <div className="sv-btns">
          {/* 2026-11-10 사장님: 왼쪽 [금액안내] · 오른쪽 [공실뉴스부동산 신청 >>] */}
          <a href="#pricing" className="sv-btn line big">금액안내</a>
          <Link href="/newsrealty/pro-apply" className="sv-btn solid big">공실뉴스부동산 신청 &gt;&gt;</Link>
        </div>
        {/* 첫 화면 영상 — 사장님이 만든 studio.mp4 (소리 빼고 줄임, 2026-10-26). 소리 없이 자동 재생 · 반복 */}
        <video className="sv-img" style={{ maxWidth: 1060 }} src="/studio-shots/hero.mp4?v=4" poster="/studio-shots/hero-poster.jpg" autoPlay muted loop playsInline preload="auto" aria-label="공실뉴스로 블로그 · 인스타그램 · 페이스북 · 스레드에 한 번에 올리는 중개사" />
      </section>

      {/* 공실뉴스부동산이 되면 — 3단계 칸 (2026-11-10 사장님: 맨 위 소개 칸 없애고, 첫 화면 영상과 "클릭 한 번" 사이로 옮김. 위 메뉴 [공실뉴스부동산이란?]은 여기로) */}
      <div id="intro" className="sv-band" style={{ scrollMarginTop: 80 }}>
        <section className="sv-sec">
          <h2 className="sv-h2">내 지역/단지 뉴스 부동산</h2>
          <p className="sv-p">AI · 스마트폰 시대, 내 지역/단지 정보를<br />뉴스로 전달하세요!</p>
          <div className="sv-steps">
            <div className="sv-step"><div className="n">1</div><div className="t">내 지역·단지 기사 작성</div><div className="d">매월 4회 기사를 꾸준히 발행하세요. 지역 전문가로 알려집니다.</div></div>
            <div className="sv-step"><div className="n">2</div><div className="t">공실 20건 등록</div><div className="d">공실을 20건까지 등록해 지도와 내 홈페이지에 함께 알릴 수 있습니다.</div></div>
            <div className="sv-step"><div className="n">3</div><div className="t">쉬워지는 부동산마케팅</div><div className="d">SNS·뉴스 발행 · 매물보고서 · 물건접수 홈페이지를 공실 하나 등록하면 한 번에 만듭니다.</div></div>
          </div>
        </section>
      </div>
      {/* 2 뉴스·SNS 자동 발행 */}
      <section className="sv-sec">
        <h2 className="sv-h2">클릭 한 번으로<br />블로그 · 인스타그램 · 페이스북 · 스레드까지</h2>
        <p className="sv-p">공실을 고르고 <b>[한 번에 쓰기]</b>만 누르세요.<br /><b>공실뉴스 기사 · 네이버 블로그 · 인스타그램 · 페이스북 · 스레드</b> 글이 동시에 완성됩니다.<br />채널마다 따로 쓸 필요 없이, [발행]만 누르면 포스팅 끝.</p>
        {btns}
        {/* 네이버 블로그 자동 채우기 영상 — 사장님이 찍은 naver.mp4 (소리 빼고 줄임, 2026-10-26) */}
        <video className="sv-img" style={{ maxWidth: 1060 }} src="/studio-shots/sns.mp4" poster="/studio-shots/sns-poster.jpg" autoPlay muted loop playsInline preload="metadata" aria-label="공실뉴스가 네이버 블로그 글을 채우는 화면" />
      </section>

      {/* 2-1 어렵지 않아요 — 뉴스·SNS 바로 아래 (2026-10-26 사장님) */}
      <div className="sv-band">
        <section className="sv-sec">
          <h2 className="sv-h2">SNS 뉴스 마케팅! 어렵지 않아요.<br />3단계면 됩니다</h2>{/* 2026-11-10 사장님 */}
          <p className="sv-p">블로그 · 인스타그램 · 스레드 · 페이스북, 몰라도 괜찮습니다.<br />대표님은 고르고, 확인하고, 누르기만 하세요.</p>
          <div className="sv-steps">
            {[
              { n: "1", t: "공실등록하기", d: "내 지역/단지, 공실을 등록합니다." },
              { n: "2", t: "AI 복사, 붙여넣기", d: "뉴스 · 블로그 · SNS 글과 유튜브 쇼츠를 AI가 만들어 채웁니다." },
              { n: "3", t: "내가 발행", d: "확인하고 고친 뒤 [발행]은 대표님이 직접 누릅니다. 계정이 안전합니다." },
            ].map((s) => (
              <div key={s.n} className="sv-step"><div className="n">{s.n}</div><div className="t">{s.t}</div><div className="d">{s.d}</div></div>
            ))}
          </div>
          {/* 쓰기 전 준비물 — 작은 글씨 (2026-11-10 사장님) */}
          <p style={{ margin: "28px auto 0", fontSize: 13, color: "#6b7280", lineHeight: 1.7, textAlign: "center" }}>
            * 크롬 웹브라우저가 설치되어 있어야 합니다.<br />
            * 개인이 사용하는 ChatGPT, Gemini, Claude 중 하나가 있어야 합니다.
          </p>
        </section>
      </div>

      {/* SNS 안 하는 대표님께 경각심 (2026-11-05 사장님) — 숫자는 확인된 출처만 (가짜 데이터 금지) */}
      <section className="sv-sec">
        <h2 className="sv-h2">손님은 하루 5시간, 스마트폰을 봅니다.<br />대표님은 SNS 광고 하고 계신가요?</h2>
        <p className="sv-p" style={{ marginBottom: 14 }}>
          한국인 10명 중 4명이 인스타그램을 씁니다.<br />
          이미, 대형 부동산은 <b>블로그 · 인스타그램 · 유튜브 · 스레드 · 페이스북</b>으로 손님을 꾸준히 만나고 있습니다.
        </p>
        <p style={{ fontSize: 12.5, color: "#9ca3af", margin: 0 }}>출처: data.ai 2023 모바일 현황 보고서(한국인 하루 앱 사용 약 5시간) · 와이즈앱 2023년 4월(인스타그램 이용자 2,167만 명, 42%)</p>
        {/* 빈 SNS 칸 앞에서 막막해하는 중개사 (2026-11-05 사장님 영상, 슬로모션 앞뒤로 반복) */}
        <video className="sv-img" style={{ maxWidth: 960, marginTop: 36 }} src="/studio-shots/sns-frustrated.mp4?v=1" poster="/studio-shots/sns-frustrated-poster.jpg?v=1" autoPlay muted loop playsInline preload="metadata" aria-label="블로그·인스타그램·유튜브·스레드 빈 글 칸 앞에서 막막해하는 중개사" />
      </section>

      {/* 해결 — 복사·붙여넣기만 하면 다섯 곳 글이 채워진다, [발행]은 대표님이 (2026-11-05 사장님. 자동 발행은 안 함 — 계정 보호) */}
      <section className="sv-sec">
        <h2 className="sv-h2">복사, 붙여넣기만 하면<br />블로그부터 인스타그램 · 페이스북 · 스레드까지</h2>
        <p className="sv-p">
          글쓰기 칸이 <b>알아서 자동으로 채워집니다.</b><br />
          대표님은 마지막 <b>[발행]</b>만 누르세요.
        </p>
        {/* 실제 화면 하이퍼랩스 광고 영상 (2026-11-05 사장님 녹화 "1분이면 ok", 이름·메일 흐림, 6배속) — 소리 없이 자동 재생 · 반복 */}
        <video className="sv-img" style={{ maxWidth: 1060, marginTop: 36 }} src="/studio-shots/write-ad.mp4?v=3" poster="/studio-shots/write-ad-poster.jpg?v=3" autoPlay muted loop playsInline preload="metadata" aria-label="공실 하나를 고르고 한 번에 쓰기를 누르면 AI가 기사·블로그·SNS 글을 쓰는 실제 화면" />
      </section>

      {/* 2026-11-05 사장님 — 해결(복사·붙여넣기) 다음, 비교표 앞 */}
      <section className="sv-sec">
        <h2 className="sv-h2" style={{ margin: 0 }}><span style={{ color: ACCENT }}>공실뉴스부동산</span>이 되시고,<br />내 지역 정보를 뉴스로 전달하세요!!</h2>
        {/* 커피 한 잔 하는 사이 다섯 곳 글 완성 (2026-11-05 사장님 영상 + 완성 카드) — 소리 없이 자동 재생 · 반복 */}
        <video className="sv-img" style={{ maxWidth: 1060, marginTop: 40 }} src="/studio-shots/coffee-sns.mp4?v=5" poster="/studio-shots/coffee-sns-poster.jpg?v=5" autoPlay muted loop playsInline preload="metadata" aria-label="커피를 마시는 사이 블로그·인스타그램·스레드·유튜브·페이스북 글이 완성되는 모습" />
      </section>

      {/* 여기부터 혜택 이야기 — 노란 미색 띠로 구분 (2026-11-05 사장님) */}
      <div id="benefits" className="sv-band-y" style={{ scrollMarginTop: 80 }}>
        {/* 7 이것도 돼요 */}
        <section className="sv-sec">
          <h2 className="sv-h2"><span style={{ color: ACCENT }}>공실뉴스부동산</span>이 되시면,<br />부동산마케팅이 쉬워집니다.</h2>
          <div className={`sv-grid${MORE.length % 3 === 2 ? " five" : ""}`}>
            {MORE.map((m) => (
              <div key={m.t} className="sv-card"><div className="ic">{m.a}</div><div className="t">{m.t}</div><div className="d">{m.d}</div></div>
            ))}
          </div>
        </section>
      </div>

      {/* 혜택 1 — 공실등록 20건 · 뉴스 월 4건 (2026-11-05 사장님: 혜택 5가지 순서대로) */}
      <section className="sv-sec">
        <h2 className="sv-h2">공실등록 20건 · 뉴스 월 4건</h2>
        <p className="sv-p">광고 공실을 <b>20건</b>까지 올리고, 내 지역 소식을 <b>한 달 4건 공실뉴스 기사</b>로 냅니다.<br />공실 하나를 고르면 기사 · 블로그 · SNS 글을 AI가 함께 씁니다.</p>
        {btns}
        <Shot label="공실뉴스 기사 쓰기 화면" src="/studio-shots/f-news-web.webp" />
      </section>

      {/* 4 AI 물건보고서 */}
      <section className="sv-sec">
        <h2 className="sv-h2">AI 매물보고서 · 유리창 홍보지</h2>
        <p className="sv-p">다양한 디자인 · 컬러를 골라 <b>온라인 · 오프라인 매물보고서</b>를 만듭니다.<br /><b>건축물대장 · 시세현황</b>까지 AI가 자동으로 작성합니다.</p>
        <p className="sv-p" style={{ marginTop: -12 }}>사무소 유리창에 붙일 <b>매물 홍보지</b>도 공실 하나로 바로 만듭니다.</p>
        {btns}
        <Shot label="AI 매물보고서 화면" src="/studio-shots/home-report.webp" />
      </section>

      {/* 3-1 물건접수홈페이지 제공 (2026-11-04 사장님: "매물접수홈페이지 제공도 넣어줘") — PRO 혜택. 그림은 실제 화면 */}
      <section className="sv-sec">
        <h2 className="sv-h2" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>내 부동산 홈페이지를<br />바로 열어 드립니다 <ProTag size="md" style={{ fontSize: 18, padding: "4px 8px 5px", borderRadius: 5 }} /></h2>
        <p className="sv-p">
          공실뉴스부동산 회원에게 <b>물건접수홈페이지</b>를 만들어 드려요. 내 공실이 저절로 올라가고,<br />
          집주인은 <b>[물건 접수]</b>로 직접 물건을 맡깁니다. 로고 · 색상 · 첫 화면 사진 · 영상도 내 마음대로.<br />
          블로그 · SNS 글의 링크도 모두 <b>내 홈페이지</b>로 모입니다.
        </p>
        {btns}
        <Shot label="물건접수홈페이지 화면" src="/studio-shots/f-intake.webp" />
      </section>

      {/* 5 디자인 편집 */}
      <section className="sv-sec">
        <h2 className="sv-h2">부동산에 꼭 맞춘<br />디자인 편집 프로그램</h2>
        <p className="sv-p"><b>유튜브 썸네일 · 인스타 카드 · 명함 · 유리창 홍보지</b>까지.<br />포토샵(PSD) 파일과도 호환됩니다. 실무에 꼭 필요한 <b>소스 · 템플릿</b>도 저작권 걱정 없이 한번에.</p>
        {btns}
        {/* 실무 소스와 합침 — 왼쪽 목록 · 오른쪽 그림 (2026-11-05 사장님) */}
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

      {/* 단지 실시간 실거래 알림 칸은 뺌 (2026-11-10 사장님) */}

      {/* 쇼츠 자동 발행기 (2026-11-09 사장님). 실제 기능대로: 공실 하나로 60초 쇼츠 → 도우미가 올리기 칸 채움 → 게시는 회원
          11-10 사장님: 디자인 편집 칸과 같은 모양 — 왼쪽 단계 목록 · 오른쪽 실제 화면 영상 */}
      <section className="sv-sec">
        <h2 className="sv-h2">쇼츠 자동 발행기</h2>
        <p className="sv-p">공실 하나로 <b>60초 쇼츠</b>를 만들고,<br /><b>유튜브 쇼츠 · 인스타그램 릴스 · 스레드 · 페이스북</b>에 올립니다.</p>
        {btns}
        <div className="sv-src">
          <ul className="sv-src-list">
            {SHORTS_STEPS.map((x, i) => (
              <li key={x.t}>
                <button type="button" className={i === shortsStep ? "on" : ""} onClick={() => setShortsStep(i)}>
                  <span style={{ flex: "0 0 auto", width: 26, height: 26, borderRadius: "50%", background: i === shortsStep ? ACCENT : "#e5e7eb", color: i === shortsStep ? "#fff" : "#6b7280", fontSize: 13, fontWeight: 900, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{i + 1}</span>
                  {x.t}
                </button>
                {i === shortsStep && <p style={{ margin: "4px 18px 8px 56px", fontSize: 14.5, lineHeight: 1.6, color: "#6b7280" }}>{x.d}</p>}
              </li>
            ))}
          </ul>
          <div className="sv-src-view">
            {/* 사장님이 찍은 실제 화면 (2026-11-09) — 위쪽 이름·메일은 흐림, 소리 뺌 */}
            <video style={{ display: "block", width: "100%", height: "auto", borderRadius: 14, border: "1px solid #e5e7eb", boxShadow: "0 24px 60px rgba(31,23,20,.16)" }} src="/studio-shots/shorts.mp4?v=1" poster="/studio-shots/shorts-poster.jpg?v=1" autoPlay muted loop playsInline preload="metadata" aria-label="공실을 고르고 테마를 누르면 60초 쇼츠가 만들어지는 실제 화면" />
          </div>
        </div>
      </section>

      {/* 7-1 후기 — 브루 "가벼우니까, 쉬우니까"식 (2026-10-26 사장님) */}
      <section id="reviews" className="sv-sec" style={{ scrollMarginTop: 80 }}>
        {/* 제목 「부동산 마케팅, 이거 하나면 끝!」·설명·단추는 11-09 사장님 지시로 없앰 — 후기만 */}
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
            { t: "빌라 · 주택 · 건물", d: "블로그 · SNS · 유튜브로 꾸준히 알리고 싶은 소장님!", src: "/images/study/recommend_real_villa.jpg" },
          ].map((c) => (
            // eslint-disable-next-line @next/next/no-img-element
            <div key={c.t} className="sv-case"><img src={c.src} alt={c.t} loading="lazy" style={{ display: "block", width: "100%", aspectRatio: "4 / 3", objectFit: "cover", borderRadius: 14, marginBottom: 16 }} /><div className="t">{c.t}</div><div className="d">{c.d}</div></div>
          ))}
        </div>
        {/* "공실뉴스부동산 PRO와 12개월 뒤" 상자 (2026-10-26 사장님) */}
        <div className="sv-after">
          <div className="k">공실뉴스부동산이 되시면,</div>
          <h3>블로그/유튜브 채널이 완성되고, SNS로 꾸준히 홍보할 수 있습니다.</h3>
          <div className="row">
            {CHANNELS.map((c) => (
              <div key={c.t} className="ch">{ico(c.i)}<span>{c.t}</span></div>
            ))}
          </div>
        </div>
      </section>

      {/* 만든 사람(대표 소개) 띠는 11-09 사장님 지시로 없앰 */}
      {/* 부동산회원 · 공실뉴스부동산 비교표는 11-09 사장님 지시로 없앰 */}

      {/* 금액안내 — 원페이지라 따로 떨어진 페이지 대신 여기 (2026-11-09 사장님) */}
      <div id="pricing" style={{ scrollMarginTop: 80 }}>
        <StudioPriceTable />
      </div>

      {/* 마지막 — 브루 맨 아래처럼 큰 로고 · 한 줄 · 버튼 (2026-10-26 사장님) */}
      <div className="sv-last-wrap">
      <section id="start" className="sv-sec sv-last" style={{ scrollMarginTop: 80 }}>
        <div className="logo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/new_logo.png" alt="" />
          <span>공실뉴스부동산</span>
          <ProTag size="md" style={{ fontSize: 16, padding: "4px 8px 5px", borderRadius: 4 }} />
        </div>
        {/* 2026-11-10 사장님: 문구 바꾸고 [금액안내]는 뺌, [신청하기 >>]만 */}
        <h2 className="sv-h2">내 지역/단지 <span style={{ color: ACCENT }}>SNS 뉴스 마케팅!</span><br />이제 쉬워집니다.</h2>
        <div className="sv-btns">
          <Link href="/newsrealty/pro-apply" className="sv-btn solid">신청하기 &gt;&gt;</Link>
        </div>
      </section>
      </div>
    </div>
  );
}
