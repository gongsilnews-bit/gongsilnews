"use client";

import React from "react";
import Link from "next/link";
import StudioAppDownload from "@/components/admin/sections/StudioAppDownload";

/**
 * 공실스튜디오 소개 (/studio) — 브루(vrew.ai)식: 섹션마다 큰 제목 한 줄 · 설명 두 줄 · 버튼 · 큰 그림 하나 (2026-10-26 사장님)
 * 그림·시연 영상 자리는 비워 둔다 (<Shot>) — 실제 앱에서 찍은 화면으로 채운다. 지어낸 화면·숫자·후기 넣지 않음.
 * 색은 공실스튜디오 앱 아이콘에서: 짙은 블랙·밤색 바탕 + 오렌지 버튼 (2026-10-26 사장님). ACCENT 만 바꾸면 전체가 바뀐다.
 */
const ACCENT = "#e8890c";
const ACCENT_SOFT = "#fdf4e7";
/** [무료로 써 보기] — 설치 없이 웹에서 이미지제작 (로그인 뒤 열린다) */
const TRY_HREF = "/realty_admin?menu=photo";
const PRICE_HREF = "/studio/pricing";

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
.sv-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:48px;text-align:left}
.sv-card{border:1px solid #e5e7eb;border-radius:16px;padding:26px}
.sv-card .ic{width:44px;height:44px;border-radius:12px;background:${ACCENT_SOFT};color:${ACCENT};display:flex;align-items:center;justify-content:center;margin-bottom:16px}
.sv-card .t{font-size:18px;font-weight:800;margin-bottom:6px}
.sv-card .d{font-size:15px;line-height:1.65;color:#4b5563}
.sv-cases{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:48px}
.sv-case .sv-shot{margin:0 0 14px}
.sv-case .t{font-size:17px;font-weight:800;text-align:left}
.sv-price{display:grid;grid-template-columns:repeat(2,1fr);gap:18px;max-width:720px;margin:40px auto 0}
.sv-pc{border:1px solid #e5e7eb;border-radius:16px;padding:28px;text-align:left}
.sv-pc.hl{border:2px solid ${ACCENT}}
.sv-pc .k{font-size:15px;font-weight:700;color:#6b7280;margin-bottom:8px}
.sv-pc .v{font-size:34px;font-weight:900}
.sv-end{background:#1f1714;color:#fff;margin-top:120px;padding:96px 24px;text-align:center}
.sv-end .sv-h2{color:#fff}
.sv-end .sv-btn.line{background:transparent;color:#fff;border-color:rgba(255,255,255,.7)}
.sv-end .sv-btn.solid{background:${ACCENT};color:#fff;border-color:${ACCENT}}
.sv-dl{max-width:820px;margin:40px auto 0;text-align:left}
@media (max-width:860px){.sv-steps,.sv-grid,.sv-cases,.sv-price{grid-template-columns:1fr}.sv-sec{padding-top:88px}}
`;

/** 그림 — src 가 있으면 실제 앱에서 찍은 화면 (public/studio-shots, 2026-10-26), 없으면 자리 표시 */
function Shot({ label, ratio = "16 / 9", max = 1060, src }: { label: string; ratio?: string; max?: number; src?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  if (src) return <img src={src} alt={label} loading="lazy" className="sv-img" style={{ maxWidth: max }} />;
  return <div className="sv-shot" style={{ aspectRatio: ratio, maxWidth: max }}>{label} 자리</div>;
}

const ico = (d: string) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={d} /></svg>
);

const MORE = [
  { t: "화면캡처 · 녹화", d: "화면을 캡처하고 녹화해서 바로 영상 · 이미지 작업에 씁니다.", i: "M4 6h16v11H4zM9 21h6M12 17v4" },
  { t: "인테리어 · 리모델링 AI", d: "공실 사진으로 고친 뒤 모습을 미리 보여 줍니다.", i: "M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" },
  { t: "유리창 홍보지", d: "사무소 유리창에 붙일 매물 홍보지를 만듭니다.", i: "M5 3h14v18H5zM8 7h8M8 11h8M8 15h5" },
  { t: "물건접수홈페이지", d: "임대인이 물건을 맡기는 나만의 홈페이지를 엽니다.", i: "M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0zM3 12h18M12 3c3 3 3 15 0 18" },
  { t: "AI 성우 · 자막", d: "글만 쓰면 AI 목소리와 자막이 영상에 들어갑니다.", i: "M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zM5 11a7 7 0 0 0 14 0M12 18v3" },
  { t: "작업 파일은 내 PC에", d: "만든 원본은 대표님 PC 폴더에 그대로 남습니다.", i: "M3 7h6l2 2h10v10H3z" },
];

export default function StudioVrewLanding() {
  return (
    <div className="sv">
      <style>{CSS}</style>

      {/* 1 첫 화면 */}
      <section className="sv-sec" style={{ paddingTop: 96 }}>
        <p className="sv-kicker">AI가 도와드려요</p>
        <h1 className="sv-h1">공실만 등록하면<br />뉴스 · 블로그 · SNS · 영상까지</h1>
        <p className="sv-p">
          공실 하나로 <b>공실뉴스 기사</b>와 <b>블로그 · 인스타그램 · 스레드 글</b>을 AI가 채우고,<br />
          공실 사진으로 <b>영상뉴스</b>를 만듭니다. 마지막 <b>[발행]</b>만 직접 누르세요.
        </p>
        <div className="sv-btns">
          <Link href={TRY_HREF} className="sv-btn line">무료로 써 보기 →</Link>
          <a href="#download" className="sv-btn solid">앱 받기</a>
        </div>
        <Shot label="공실스튜디오 앱 전체 화면" src="/studio-shots/home-app.webp" />
      </section>

      {/* 2 뉴스·SNS 자동 발행 */}
      <section className="sv-sec">
        <h2 className="sv-h2">공실 하나로 끝나는 뉴스 · SNS 발행</h2>
        <p className="sv-p">공실을 고르면 공실뉴스 기사 · 네이버 블로그 · 인스타그램 · 페이스북 · 스레드 글이 한 번에 채워집니다.<br />고칠 곳만 고치고 [발행]을 누르면 됩니다.</p>
        <div className="sv-btns"><Link href={TRY_HREF} className="sv-btn line">써 보기</Link></div>
        <Shot label="공실스튜디오 뉴스·SNS발행 화면" max={900} src="/studio-shots/home-sns.webp" />
      </section>

      {/* 3 영상뉴스 */}
      <section className="sv-sec">
        <h2 className="sv-h2">1주일에 1번, 영상뉴스로</h2>
        <p className="sv-p">공실 사진을 넣으면 릴스 · 유튜브 영상이 됩니다.<br />AI 성우 목소리와 자막까지 자동으로 들어갑니다.</p>
        <div className="sv-btns"><a href="#download" className="sv-btn line">앱 받기</a></div>
        <Shot label="릴스 · 쇼츠 9:16 영상 편집 화면" src="/studio-shots/home-video.webp" />
      </section>

      {/* 4 어렵지 않아요 */}
      <div className="sv-band">
        <section className="sv-sec">
          <h2 className="sv-h2">어렵지 않아요, 3단계면 됩니다</h2>
          <p className="sv-p">블로그 · 유튜브를 몰라도 괜찮습니다. 대표님은 고르고, 확인하고, 누르기만 하세요.</p>
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

      {/* 5 이미지제작 */}
      <section className="sv-sec">
        <h2 className="sv-h2">홍보 이미지 · 카드뉴스도 바로</h2>
        <p className="sv-p">템플릿을 고르고 글자만 바꾸면 완성. 이미지제작은 <b>설치 없이 웹에서</b> 먼저 써 볼 수 있어요.</p>
        <div className="sv-btns"><Link href={TRY_HREF} className="sv-btn solid">설치 없이 써 보기</Link></div>
        <Shot label="이미지제작 화면" src="/studio-shots/home-photo.webp" />
      </section>

      {/* 6 AI 매물보고서 */}
      <section className="sv-sec">
        <h2 className="sv-h2">손님에게 보낼 AI 매물보고서</h2>
        <p className="sv-p">공실 하나로 매물 소개 보고서가 만들어집니다.<br />지적도 · 건축물대장 · 실거래 이력 같은 공공자료도 자동으로 들어갑니다.</p>
        <div className="sv-btns"><a href="#download" className="sv-btn line">앱 받기</a></div>
        <Shot label="AI 매물보고서 화면" src="/studio-shots/home-report.webp" />
      </section>

      {/* 7 이것도 돼요 */}
      <section className="sv-sec">
        <h2 className="sv-h2">이것도 다 됩니다</h2>
        <div className="sv-grid">
          {MORE.map((m) => (
            <div key={m.t} className="sv-card"><div className="ic">{ico(m.i)}</div><div className="t">{m.t}</div><div className="d">{m.d}</div></div>
          ))}
        </div>
      </section>

      {/* 8 활용 사례 */}
      <section className="sv-sec">
        <h2 className="sv-h2">중개사무소에서 이렇게 써요</h2>
        <div className="sv-cases">
          {/* 공실스튜디오로 실제로 만든 결과물 (2026-10-26 캡처) */}
          {[
            { t: "공실열람 보도 기사", src: "/studio-shots/case-news.webp" },
            { t: "AI 매물보고서", src: "/studio-shots/case-report.webp" },
            { t: "인테리어 시뮬레이션 기사", src: "/studio-shots/case-interior.webp" },
          ].map((c) => (
            // eslint-disable-next-line @next/next/no-img-element
            <div key={c.t} className="sv-case"><img src={c.src} alt={c.t} loading="lazy" style={{ display: "block", width: "100%", aspectRatio: "4 / 3", objectFit: "cover", objectPosition: "top", borderRadius: 14, border: "1px solid #e5e7eb", marginBottom: 14 }} /><div className="t">{c.t}</div></div>
          ))}
        </div>
      </section>

      {/* 9 안전 */}
      <section className="sv-sec">
        <h2 className="sv-h2">대표님 계정과 자료는 안전하게</h2>
        <p className="sv-p">블로그 · SNS의 마지막 [발행]은 대표님이 직접 누릅니다.<br />만든 원본 파일은 대표님 PC에 저장됩니다.</p>
      </section>

      {/* 이용료 (짧게) */}
      <section className="sv-sec">
        <h2 className="sv-h2">이용료</h2>
        <div className="sv-price">
          <div className="sv-pc"><div className="k">월 이용</div><div className="v">월 3만원</div></div>
          <div className="sv-pc hl"><div className="k" style={{ color: ACCENT }}>1년 이용</div><div className="v">1년 36만원</div></div>
        </div>
        <Link href={PRICE_HREF} className="sv-link">금액 자세히 보기</Link>
      </section>

      {/* 받기 */}
      <section id="download" className="sv-sec" style={{ scrollMarginTop: 80 }}>
        <h2 className="sv-h2">공실스튜디오 받기</h2>
        <p className="sv-p">윈도우 10 · 11 PC에서 씁니다.</p>
        <div className="sv-dl"><StudioAppDownload /></div>
      </section>

      {/* 마지막 */}
      <div className="sv-end">
        <h2 className="sv-h2">내 지역 · 단지 소식,<br />공실스튜디오로 시작하세요</h2>
        <div className="sv-btns" style={{ marginTop: 32 }}>
          <Link href={TRY_HREF} className="sv-btn line">무료로 써 보기</Link>
          <a href="#download" className="sv-btn solid">앱 받기</a>
        </div>
      </div>
    </div>
  );
}
