"use client";

import React from "react";
import Link from "next/link";

// 공실뉴스부동산 신청하기(/newsrealty/apply) 화면. 소개·혜택·금액안내와 같은 톤(미색 띠, 차분한 주황, Pretendard 700).
// 로그인·신청서 제출 같은 동작은 PC·모바일 page.tsx 에 그대로 있고, 여기는 겉모양만 맡는다.

export type ApplyStage = "loading" | "login" | "existing" | "submitted" | "form";

type ExistingApplication = {
  status?: string;
  created_at?: string;
  applicant_name?: string;
  agency_name?: string;
  phone?: string;
};

type SubmittedData = {
  applicantName?: string;
  agencyName?: string;
  phone?: string;
  email?: string;
  smsSent?: boolean;
};

export type NewsrealtyApplyViewProps = {
  stage: ApplyStage;
  // 화면 위 머리(PC 는 NewsrealtyHeader, 모바일은 고정 헤더)
  header: React.ReactNode;
  mobile?: boolean;
  links: { intro: string; home: string; approvedAdmin: string; findAccount: string };

  googleLoading: boolean;
  kakaoLoading: boolean;
  onGoogle: () => void;
  onKakao: () => void;

  existingApplication: ExistingApplication | null;
  submittedData: SubmittedData | null;

  applicantName: string;
  setApplicantName: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  emailLocal: string;
  setEmailLocal: (v: string) => void;
  emailDomain: string;
  setEmailDomain: (v: string) => void;
  customDomain: string;
  setCustomDomain: (v: string) => void;
  agencyName: string;
  setAgencyName: (v: string) => void;
  agreeTerms: boolean;
  setAgreeTerms: (v: boolean) => void;
  termsAccordionOpen: boolean;
  setTermsAccordionOpen: (v: boolean) => void;
  errorMsg: string;
  submitting: boolean;
  onSubmit: (e: React.FormEvent) => void;

  showGuideModal: boolean;
  setShowGuideModal: (v: boolean) => void;
};

const CSS = `
.nra{--bg:oklch(0.995 0 0);--cream:#fbf6ee;--surface:oklch(0.965 0.012 70);--text:oklch(0.27 0.02 55);--accent:oklch(0.6 0.17 48);--accent-200:oklch(0.93 0.05 60);--accent-700:oklch(0.48 0.14 45);--accent-800:oklch(0.42 0.13 44);--divider:color-mix(in srgb, oklch(0.27 0.02 55) 14%, transparent);--n300:oklch(0.38 0.02 55);--n400:oklch(0.48 0.02 55);--n500:oklch(0.52 0.02 55);
  min-height:100vh;background:var(--bg);color:var(--text);font-family:"Pretendard","Pretendard Variable",system-ui,sans-serif;font-size:15px;line-height:1.55;word-break:keep-all;-webkit-font-smoothing:antialiased;text-align:left}
.nra *,.nra *::before,.nra *::after{box-sizing:border-box}
.nra h1,.nra h2,.nra h3{font-family:inherit;font-weight:700;color:var(--text)}
.nra-card{background:#fff;border:1px solid var(--divider);border-radius:14px}
.nra-label{display:block;font-size:13px;font-weight:600;color:var(--text);margin-bottom:8px}
.nra-label em{font-style:normal;color:var(--accent)}
.nra-input{width:100%;height:48px;padding:0 14px;border:1px solid var(--divider);border-radius:8px;font-size:15px;font-family:inherit;color:var(--text);background:#fff;outline:none}
.nra-input:focus{border-color:var(--accent);box-shadow:0 0 0 3px color-mix(in srgb, var(--accent) 15%, transparent)}
.nra-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;text-decoration:none;font-family:inherit;font-size:15px;line-height:1.2;border:1px solid transparent;border-radius:8px;padding:12px 20px;cursor:pointer;background:transparent}
.nra .nra-btn-solid{color:#fff;font-weight:700;background:var(--accent-700);border-color:var(--accent-700)}
.nra .nra-btn-solid:hover{color:#fff;background:var(--accent-800);border-color:var(--accent-800)}
.nra .nra-btn-solid:disabled{opacity:.6;cursor:not-allowed}
.nra .nra-btn-outline{color:var(--accent-700);font-weight:600;border-color:var(--accent);background:#fff}
.nra .nra-btn-outline:hover{background:color-mix(in srgb, var(--accent) 10%, #fff)}
.nra .nra-btn-ghost{color:var(--text);font-weight:600;border-color:var(--divider);background:#fff}
.nra .nra-btn-ghost:hover{background:color-mix(in srgb, var(--text) 5%, #fff)}
.nra-social{width:100%;display:flex;align-items:center;justify-content:center;gap:12px;padding:14px 0;border-radius:8px;font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;position:relative}
.nra-social:disabled{cursor:not-allowed}
.nra-google{background:#fff;border:1px solid var(--divider);color:var(--text)}
.nra-google:hover{background:color-mix(in srgb, var(--text) 4%, #fff)}
.nra-kakao{background:#FEE500;border:1px solid #FEE500;color:#191919}
.nra-kakao:hover{background:#f5dc00}
.nra-row{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:10px 0;font-size:14px}
.nra-row + .nra-row{border-top:1px solid var(--divider)}
`;

const BULLETS: React.ReactNode[] = [
  <>공실뉴스부동산회원만 신청하실 수 있습니다. <strong style={{ color: "var(--accent-700)" }}>(무료)</strong></>,
  <>가입신청 후, 네이버쇼핑몰에서 결제하셔요. <strong style={{ color: "var(--accent-700)" }}>(12개월 무이자)</strong></>,
  <>문의는 1:1 게시판을 이용해주세요.</>,
];

const GUIDE_STEPS: { n: string; t: string; lines: React.ReactNode[]; highlight?: boolean }[] = [
  { n: "1단계", t: "회원가입 · 신청", lines: [<>구글 · 카카오 계정으로 3초 만에 <strong>회원가입</strong>합니다.</>, <>신청자 · 연락처 · 중개사무소를 입력하고 신청서를 접수합니다.</>] },
  { n: "2단계", t: "네이버쇼핑몰 결제", highlight: true, lines: [<><strong>36만원 (12개월 · VAT 포함)</strong></>, <>네이버쇼핑몰에서 결제하시면 되고, <strong>12개월 무이자 할부</strong>가 가능합니다.</>] },
  { n: "3단계", t: "바로 승인", lines: [<>결제가 확인되면 <strong>바로 승인</strong>됩니다.</>, <>승인 즉시 공실 등록 월 20건 · 기사 작성 월 4건을 이용하실 수 있습니다.</>] },
];

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

function KakaoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#191919" d="M12 3C6.48 3 2 6.36 2 10.44c0 2.62 1.75 4.93 4.38 6.24l-1.12 4.16c-.1.36.3.65.6.44l4.94-3.26c.39.04.79.06 1.2.06 5.52 0 10-3.36 10-7.64C22 6.36 17.52 3 12 3z" />
    </svg>
  );
}

// 왼쪽: 제목 + 사진 + 안내 3줄 + 절차 버튼 (로그인 전·신청서 화면 공통)
// part: "all"(PC) / "title"·"rest"(모바일은 제목 → 로그인 카드 → 사진·안내 순서로 나눠 그린다)
function Intro({ mobile, onGuide, part = "all" }: { mobile?: boolean; onGuide: () => void; part?: "all" | "title" | "rest" }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 480 }}>
      {part !== "rest" && (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <span style={{ fontSize: 13, color: "var(--accent-700)" }}>공실뉴스부동산 신청</span>
        <h1 style={{ fontSize: mobile ? 26 : "clamp(28px,3.4vw,38px)", lineHeight: 1.3, letterSpacing: "-0.025em", margin: 0 }}>
          내 지역/단지<br />공실을 SNS/뉴스로 전달하세요!
        </h1>
        <p style={{ margin: 0, fontSize: mobile ? 16 : 18, fontWeight: 700, color: "var(--accent-700)" }}>공동중개 + 블로그/SNS마케팅완성</p>
      </div>
      )}
      {part !== "title" && (
      <>
      <img
        src="/images/realty/newsrealty_local_reporter.jpg"
        alt="내 지역/단지 로컬 부동산 기자"
        style={{ width: "100%", maxWidth: mobile ? "100%" : 400, aspectRatio: "1024 / 935", objectFit: "cover", borderRadius: 14, background: "var(--surface)", display: "block" }}
      />
      <div className="nra-card" style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10, fontSize: 14, color: "var(--n300)", lineHeight: 1.6 }}>
          {BULLETS.map((b, i) => (
            <li key={i} style={{ display: "flex", gap: 8 }}>
              <span style={{ color: "var(--accent)", fontWeight: 700 }}>•</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
        <button type="button" onClick={onGuide} className="nra-btn nra-btn-outline" style={{ width: "100%" }}>
          회원가입 및 이용 절차가 궁금해요
        </button>
      </div>
      </>
      )}
    </div>
  );
}

function GuideModal({ onClose, mobile }: { onClose: () => void; mobile?: boolean }) {
  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(30, 22, 18, 0.5)", backdropFilter: "blur(2px)", display: "flex", alignItems: "center", justifyContent: "center", padding: mobile ? 12 : 20, zIndex: 99999999 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 640, padding: mobile ? "28px 20px 22px" : "36px 36px 30px", boxShadow: "0 25px 60px rgba(0,0,0,0.22)", position: "relative", maxHeight: "92vh", overflowY: "auto" }}
      >
        <button type="button" onClick={onClose} aria-label="닫기" style={{ position: "absolute", top: 18, right: 18, background: "none", border: "none", fontSize: 22, color: "var(--n500)", cursor: "pointer", lineHeight: 1 }}>✕</button>
        <div style={{ marginBottom: 24, display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ fontSize: 13, color: "var(--accent-700)" }}>공실뉴스부동산 입점 안내</span>
          <h3 style={{ fontSize: mobile ? 20 : 24, margin: 0, letterSpacing: "-0.02em" }}>회원가입 및 이용 절차 안내</h3>
          <p style={{ fontSize: 14, color: "var(--n400)", margin: 0 }}>회원가입하고 네이버쇼핑몰에서 결제하시면 바로 승인됩니다.</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {GUIDE_STEPS.map((s) => (
            <div key={s.n} style={{ background: s.highlight ? "var(--cream)" : "var(--surface)", borderRadius: 12, padding: mobile ? "16px 16px" : "18px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span style={{ background: "var(--accent-700)", color: "#fff", fontSize: 12, fontWeight: 700, padding: "3px 9px", borderRadius: 6, whiteSpace: "nowrap" }}>{s.n}</span>
                <span style={{ fontSize: mobile ? 15 : 17, fontWeight: 700 }}>{s.t}</span>
              </div>
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 4, fontSize: 14, color: "var(--n300)", lineHeight: 1.6 }}>
                {s.lines.map((l, i) => <li key={i}>• {l}</li>)}
              </ul>
            </div>
          ))}
        </div>
        <button type="button" onClick={onClose} className="nra-btn nra-btn-solid" style={{ width: "100%", height: 52, marginTop: 22 }}>
          확인 및 닫기
        </button>
      </div>
    </div>
  );
}

// 이미 신청함·신청 완료 화면의 가운데 카드
function StatusCard({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--cream)", flex: 1 }}>
      <section style={{ maxWidth: 1120, margin: "0 auto", padding: "72px 24px 112px", display: "flex", justifyContent: "center" }}>
        <div className="nra-card" style={{ width: "100%", maxWidth: 540, padding: "44px 32px 36px", textAlign: "center" }}>
          {children}
        </div>
      </section>
    </div>
  );
}

function InfoRows({ rows }: { rows: { label: string; value?: React.ReactNode; accent?: boolean }[] }) {
  return (
    <div style={{ background: "var(--surface)", borderRadius: 12, padding: "6px 20px", textAlign: "left", marginBottom: 24 }}>
      {rows.map((r) => (
        <div key={r.label} className="nra-row">
          <span style={{ color: "var(--n400)" }}>{r.label}</span>
          <span style={{ fontWeight: 700, color: r.accent ? "var(--accent-700)" : "var(--text)", textAlign: "right" }}>{r.value || "-"}</span>
        </div>
      ))}
    </div>
  );
}

export default function NewsrealtyApplyView(p: NewsrealtyApplyViewProps) {
  const { stage, header, mobile, links } = p;
  const openGuide = () => p.setShowGuideModal(true);

  let body: React.ReactNode = null;

  if (stage === "loading") {
    body = <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--n500)", fontSize: 14 }}>로딩 중...</div>;
  } else if (stage === "existing" && p.existingApplication) {
    const app = p.existingApplication;
    const isApproved = app.status === "승인완료";
    const dateStr = app.created_at
      ? new Date(app.created_at).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
      : "";
    const who = app.applicant_name || app.agency_name;
    body = (
      <StatusCard>
        <span style={{ display: "inline-block", fontSize: 13, fontWeight: 600, padding: "4px 12px", borderRadius: 999, background: isApproved ? "#e7f6ee" : "var(--accent-200)", color: isApproved ? "#0f7a4a" : "var(--accent-700)", marginBottom: 14 }}>
          {isApproved ? "정식 승인 파트너" : `신청 접수 완료 · ${app.status || "심사 진행 중"}`}
        </span>
        <h1 style={{ fontSize: mobile ? 21 : 24, lineHeight: 1.35, margin: "0 0 12px", letterSpacing: "-0.02em" }}>
          {isApproved ? "이미 공실뉴스부동산 정식 파트너로 승인되었습니다" : "이미 파트너 입점 신청서가 접수되었습니다"}
        </h1>
        <p style={{ fontSize: 14.5, color: "var(--n300)", lineHeight: 1.7, margin: "0 0 24px" }}>
          {isApproved ? (
            <><strong>{who}</strong> 대표님은 이미 정식 파트너 권한을 보유하고 계십니다.<br />공실 등록, 기사 송고, AI 물건보고서 등 모든 혜택을 이용하실 수 있습니다.</>
          ) : (
            <><strong>{who}</strong> 대표님의 입점 신청서가 정상 접수되어<br />현재 담당 매니저가 심사 및 상담을 준비 중입니다. <strong>(중복 신청 불가)</strong></>
          )}
        </p>
        <InfoRows
          rows={[
            { label: "신청자명", value: app.applicant_name },
            { label: "중개사무소", value: app.agency_name },
            { label: "연락처", value: app.phone },
            { label: "신청일시", value: dateStr || "최근 접수" },
            { label: "진행상태", value: isApproved ? "정식 파트너 활성" : `${app.status || "신규"} (1영업일 이내 유선 안내)`, accent: true },
          ]}
        />
        <p style={{ fontSize: 13, color: "var(--n400)", lineHeight: 1.6, margin: "0 0 24px", textAlign: "left" }}>
          신청 내용 변경이나 빠른 상담이 필요하신 경우 고객센터 <strong style={{ color: "var(--text)" }}>1555-5343</strong> (평일 10:00~17:00)로 문의해 주시기 바랍니다.
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <Link href={links.home} className="nra-btn nra-btn-ghost" style={{ flex: 1 }}>메인 홈으로</Link>
          <Link href={isApproved ? links.approvedAdmin : links.intro} className="nra-btn nra-btn-solid" style={{ flex: 1 }}>
            {isApproved ? "관리자/공실 등록 >" : "공실뉴스부동산 소개 >"}
          </Link>
        </div>
      </StatusCard>
    );
  } else if (stage === "submitted") {
    const d = p.submittedData;
    body = (
      <StatusCard>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--accent-200)", color: "var(--accent-700)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 700, margin: "0 auto 20px" }}>✓</div>
        <h1 style={{ fontSize: mobile ? 22 : 26, margin: "0 0 10px", letterSpacing: "-0.02em" }}>회원가입 신청이 완료되었습니다</h1>
        <p style={{ fontSize: 15, color: "var(--n300)", lineHeight: 1.7, margin: "0 0 24px" }}>
          <strong>{d?.applicantName || d?.agencyName}</strong> 님,<br />
          가입 신청서를 확인 후 <strong>1~2일 이내</strong> 전화드리겠습니다.
        </p>
        <InfoRows
          rows={[
            { label: "신청자", value: d?.applicantName },
            { label: "연락처", value: d?.phone },
            { label: "E-mail", value: d?.email },
            { label: "중개사무소", value: d?.agencyName },
            { label: "접수 확인 문자", value: d?.smsSent ? "발송 완료" : "순차 발송중", accent: true },
          ]}
        />
        <div style={{ display: "flex", gap: 10 }}>
          <Link href={links.intro} className="nra-btn nra-btn-ghost" style={{ flex: 1 }}>소개 홈으로</Link>
          <Link href={links.home} className="nra-btn nra-btn-solid" style={{ flex: 1 }}>메인으로 이동</Link>
        </div>
      </StatusCard>
    );
  } else {
    // 로그인 전 / 신청서: 미색 띠 위에 왼쪽 안내, 오른쪽 흰 카드
    const busy = p.googleLoading || p.kakaoLoading;
    const right =
      stage === "login" ? (
        <div className="nra-card" style={{ padding: mobile ? "28px 20px" : "40px 36px" }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <h2 style={{ fontSize: mobile ? 21 : 24, margin: "0 0 10px", letterSpacing: "-0.02em" }}>공실뉴스 로그인</h2>
            <p style={{ fontSize: 14, color: "var(--n400)", margin: 0, lineHeight: 1.6 }}>
              3초 만에 소셜 연동으로 간편하게 시작하세요.<br />첫 로그인 시 자동으로 가입이 완료됩니다.
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button type="button" onClick={p.onGoogle} disabled={busy} className="nra-social nra-google">
              <span style={{ position: "absolute", top: -9, right: 14, background: "var(--accent-700)", color: "#fff", fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 10 }}>추천</span>
              <GoogleIcon />
              {p.googleLoading ? "Google 연결 중..." : "Google 계정으로 시작하기"}
            </button>
            <button type="button" onClick={p.onKakao} disabled={busy} className="nra-social nra-kakao">
              <KakaoIcon />
              {p.kakaoLoading ? "카카오 연결 중..." : "카카오 계정으로 시작하기"}
            </button>
          </div>
          <div style={{ textAlign: "center", marginTop: 22 }}>
            <a href={links.findAccount} style={{ fontSize: 13, color: "var(--n400)", textDecoration: "underline", textUnderlineOffset: 3 }}>
              어떤 계정으로 가입했는지 모르시나요?
            </a>
          </div>
          <div style={{ borderTop: "1px solid var(--divider)", marginTop: 28, paddingTop: 18 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>부동산 회원가입 절차</div>
            <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px 8px", fontSize: 12.5, color: "var(--n400)" }}>
              {["회원가입", "관리자페이지", "정보설정", "중개소 가입/서류제출", "승인완료"].map((t, i, arr) => (
                <li key={t} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <span style={i === arr.length - 1 ? { color: "var(--accent-700)", fontWeight: 700 } : undefined}>{t}</span>
                  {i < arr.length - 1 && <span style={{ color: "var(--divider)" }}>›</span>}
                </li>
              ))}
            </ol>
          </div>
        </div>
      ) : (
        <form onSubmit={p.onSubmit} className="nra-card" style={{ padding: mobile ? "24px 18px" : "36px 32px", display: "flex", flexDirection: "column", gap: 20 }}>
          <h2 style={{ fontSize: mobile ? 20 : 22, margin: 0, letterSpacing: "-0.02em" }}>신청서 작성</h2>
          <div>
            <label className="nra-label">신청자 <em>*</em></label>
            <input className="nra-input" type="text" required value={p.applicantName} onChange={(e) => p.setApplicantName(e.target.value)} placeholder="신청자 성함을 입력해 주세요" />
          </div>
          <div>
            <label className="nra-label">연락처 <em>*</em></label>
            <input className="nra-input" type="tel" required value={p.phone} onChange={(e) => p.setPhone(e.target.value)} placeholder="예) 01098765432" />
          </div>
          <div>
            <label className="nra-label">
              E-mail <em>*</em> <span style={{ fontWeight: 400, fontSize: 12, color: "var(--n500)" }}>(가입 후 아이디로 이용돼요)</span>
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: mobile ? "wrap" : "nowrap" }}>
              <input className="nra-input" type="text" required value={p.emailLocal} onChange={(e) => p.setEmailLocal(e.target.value)} placeholder="이메일" style={{ flex: 1, minWidth: 0 }} />
              <span style={{ color: "var(--n500)" }}>@</span>
              {p.emailDomain === "direct" && (
                <input className="nra-input" type="text" required value={p.customDomain} onChange={(e) => p.setCustomDomain(e.target.value)} placeholder="직접 입력" style={{ flex: 1, minWidth: 0 }} />
              )}
              <select className="nra-input" value={p.emailDomain} onChange={(e) => p.setEmailDomain(e.target.value)} style={{ width: mobile ? "100%" : 140, cursor: "pointer" }}>
                <option value="">선택</option>
                <option value="naver.com">naver.com</option>
                <option value="gmail.com">gmail.com</option>
                <option value="daum.net">daum.net</option>
                <option value="kakao.com">kakao.com</option>
                <option value="nate.com">nate.com</option>
                <option value="direct">직접 입력</option>
              </select>
            </div>
          </div>
          <div>
            <label className="nra-label">중개사무소 <em>*</em></label>
            <input className="nra-input" type="text" required value={p.agencyName} onChange={(e) => p.setAgencyName(e.target.value)} placeholder="중개사무소 명칭을 입력해 주세요" />
          </div>
          <div>
            <div style={{ border: "1px solid var(--divider)", borderRadius: 8, padding: "12px 14px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 14, fontWeight: 600, userSelect: "none" }}>
                  <input type="checkbox" checked={p.agreeTerms} onChange={(e) => p.setAgreeTerms(e.target.checked)} style={{ width: 18, height: 18, accentColor: "#a5440f", cursor: "pointer" }} />
                  회원가입 약관 전체 동의 하기
                </label>
                <button type="button" onClick={() => p.setTermsAccordionOpen(!p.termsAccordionOpen)} aria-label="약관 펼치기" style={{ color: "var(--n500)", fontSize: 12, cursor: "pointer", border: "none", background: "none", padding: 4 }}>
                  {p.termsAccordionOpen ? "▲" : "▼"}
                </button>
              </div>
              {p.termsAccordionOpen && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--divider)", fontSize: 12, color: "var(--n400)", lineHeight: 1.7, paddingLeft: 28 }}>
                  <p style={{ margin: 0 }}>• 개인정보 수집 및 이용 목적: 공실뉴스 공인중개사 회원가입 심사 및 안내</p>
                  <p style={{ margin: 0 }}>• 수집 항목: 신청자 성명, 연락처, E-mail, 중개사무소 정보</p>
                  <p style={{ margin: 0 }}>• 보유 및 이용 기간: 회원 탈퇴 또는 법정 의무 보유 기간까지</p>
                </div>
              )}
            </div>
            <p style={{ fontSize: 12, color: "var(--n500)", margin: "6px 0 0 4px" }}>약관의 효력은 회원가입 절차가 완료된 후 적용됩니다.</p>
          </div>
          {p.errorMsg && (
            <div style={{ padding: 12, borderRadius: 8, background: "#fdf0ee", border: "1px solid #f3c8c0", fontSize: 13, fontWeight: 600, color: "#b3261e" }}>
              {p.errorMsg}
            </div>
          )}
          <button type="submit" disabled={p.submitting} className="nra-btn nra-btn-solid" style={{ width: "100%", height: 54, fontSize: 16 }}>
            {p.submitting ? "신청 처리 중..." : "공실뉴스부동산 신청하기"}
          </button>
        </form>
      );

    body = (
      <div style={{ background: "var(--cream)" }}>
        <section
          style={{
            maxWidth: 1120,
            margin: "0 auto",
            padding: mobile ? "32px 16px 64px" : "72px 24px 112px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,420px),1fr))",
            gap: mobile ? 32 : 64,
            alignItems: "start",
          }}
        >
          {mobile ? (
            <>
              <Intro mobile onGuide={openGuide} part="title" />
              <div style={{ width: "100%" }}>{right}</div>
              <Intro mobile onGuide={openGuide} part="rest" />
            </>
          ) : (
            <>
              <Intro onGuide={openGuide} />
              <div style={{ width: "100%", maxWidth: 480, justifySelf: "end" }}>{right}</div>
            </>
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="nra" style={{ display: "flex", flexDirection: "column" }}>
      <style>{CSS}</style>
      {header}
      {body}
      {p.showGuideModal && <GuideModal mobile={mobile} onClose={() => p.setShowGuideModal(false)} />}
    </div>
  );
}
