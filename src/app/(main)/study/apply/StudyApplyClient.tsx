"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import StudyHeader from "@/components/study/StudyHeader";
import { createClient } from "@/utils/supabase/client";
import { submitStudyApplication, checkExistingStudyApplication } from "@/app/actions/studyApply";

/**
 * 공실스터디 멤버십신청
 * 공실뉴스부동산 신청(/newsrealty/apply)과 같은 구성(좌측 안내 + 우측 로그인/신청폼)이며
 * 포인트 컬러만 스터디 에메랄드로 맞춘다.
 */
const POINT = "#059669";
const POINT_DARK = "#047857";
const POINT_SOFT = "#ecfdf5";
const POINT_BORDER = "#a7f3d0";

const RETURN_TO = "/study/apply";

const BENEFITS = [
  "AI 유튜브·블로그 콘텐츠 제작 전 과목 VOD",
  "1년(365일) 무제한 다시보기",
  "매달 신규 특강 추가 비용 없이 업데이트",
  "실무 AI 프롬프트·강의자료 원본 제공",
  "공실 등록 · AI 매물보고서 · 기사 송고 혜택",
];

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: "48px",
  padding: "0 16px",
  border: "1px solid #dfe2e6",
  borderRadius: "6px",
  fontSize: "14px",
  color: "#222",
  backgroundColor: "#fff",
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "inherit",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "13px",
  fontWeight: 600,
  color: "#222",
  marginBottom: "8px",
};

export default function StudyApplyClient() {
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [kakaoLoading, setKakaoLoading] = useState(false);

  const [applicantName, setApplicantName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [agencyName, setAgencyName] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [termsOpen, setTermsOpen] = useState(false);

  const [existingApplication, setExistingApplication] = useState<any>(null);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittedData, setSubmittedData] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function loadUserData() {
      try {
        const supabase = createClient();
        const { data: { user: authUser } } = await supabase.auth.getUser();

        if (authUser) {
          setUser(authUser);

          const { data: memberData } = await supabase
            .from("members")
            .select("*")
            .eq("id", authUser.id)
            .maybeSingle();
          const { data: agencyData } = await supabase
            .from("agencies")
            .select("name")
            .eq("owner_id", authUser.id)
            .maybeSingle();

          setApplicantName(memberData?.name || authUser.user_metadata?.name || "");
          setPhone(memberData?.phone || authUser.user_metadata?.phone || "");
          setEmail(authUser.email || "");
          setAgencyName(agencyData?.name || memberData?.company_name || "");

          const checkRes = await checkExistingStudyApplication(authUser.id);
          if (checkRes.exists && checkRes.application && checkRes.application.status !== "반려") {
            setExistingApplication(checkRes.application);
          }
        }
      } catch (err) {
        console.error("Error loading user info:", err);
      } finally {
        setAuthLoading(false);
      }
    }
    loadUserData();
  }, []);

  const handleOAuth = async (provider: "google" | "kakao") => {
    const setLoading = provider === "google" ? setGoogleLoading : setKakaoLoading;
    try {
      setLoading(true);
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback?returnTo=${encodeURIComponent(RETURN_TO)}`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      console.error(err);
      alert(`${provider === "google" ? "Google" : "카카오"} 로그인 오류: ` + (err?.message || String(err)));
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!applicantName.trim()) return setErrorMsg("신청자 성함을 입력해 주세요.");
    if (!phone.trim()) return setErrorMsg("연락처를 입력해 주세요.");
    if (!agreeTerms) return setErrorMsg("개인정보 수집 및 이용에 동의해 주세요.");

    setSubmitting(true);
    try {
      const res = await submitStudyApplication({
        memberId: user?.id,
        name: applicantName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        agencyName: agencyName.trim(),
      });

      if (res.success) {
        setSubmittedData({
          applicantName: applicantName.trim(),
          phone: phone.trim(),
          email: email.trim(),
          agencyName: agencyName.trim(),
          smsSent: res.smsSent,
        });
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setErrorMsg(res.message || "신청 처리 중 오류가 발생했습니다.");
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "서버 통신 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  // ━━━ 좌측 안내 영역 (로그인 전 / 신청폼 공통) ━━━
  const leftPanel = (
    <div className="study-apply-left">
      <h1 style={{ fontSize: "29px", fontWeight: 800, color: "#0f2e28", lineHeight: 1.32, letterSpacing: "-0.5px", margin: "0 0 20px", wordBreak: "keep-all" }}>
        AI로 중개하는<br />
        공실스터디 멤버가 되세요!
        <div style={{ fontSize: "19px", fontWeight: 700, color: POINT, marginTop: "12px", letterSpacing: "-0.3px" }}>
          AI 유튜브 + 부동산 실무
        </div>
      </h1>

      {/* 멤버십 혜택 카드 */}
      <div
        style={{
          background: "linear-gradient(145deg, #062326 0%, #0f3d33 100%)",
          borderRadius: "16px",
          padding: "26px 24px",
          color: "#ffffff",
          marginBottom: "24px",
          boxShadow: "0 12px 28px rgba(6, 35, 38, 0.18)",
        }}
      >
        <div style={{ display: "inline-block", fontSize: "11.5px", fontWeight: 800, color: "#34d399", border: "1px solid rgba(52,211,153,0.4)", borderRadius: "20px", padding: "3px 12px", marginBottom: "14px" }}>
          1년 멤버십 · 365일 무제한
        </div>
        <div style={{ fontSize: "18px", fontWeight: 800, lineHeight: 1.45, marginBottom: "18px", letterSpacing: "-0.3px" }}>
          배우고 끝이 아니라<br />
          <span style={{ color: "#34d399" }}>내 매물로 바로 실습</span>합니다
        </div>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "10px", fontSize: "13.5px" }}>
          {BENEFITS.map((b) => (
            <li key={b} style={{ display: "flex", alignItems: "flex-start", gap: "9px", color: "rgba(255,255,255,0.9)" }}>
              <span style={{ color: "#34d399", fontWeight: 900 }}>✓</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </div>

      <div style={{ backgroundColor: "#f8faf9", borderRadius: "12px", padding: "22px 20px", border: "1px solid #e7efeb" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "13.5px", color: "#475569", lineHeight: 1.6 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
            <span style={{ color: POINT, fontWeight: 800 }}>•</span>
            <span><strong>공실뉴스 회원</strong>이면 누구나 신청하실 수 있습니다.</span>
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
            <span style={{ color: POINT, fontWeight: 800 }}>•</span>
            <span>신청 후 <strong>1~2일 이내</strong> 담당자가 연락드립니다. <span style={{ color: "#888", fontSize: "12px" }}>(문자, 카톡)</span></span>
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
            <span style={{ color: POINT, fontWeight: 800 }}>•</span>
            <span>문의는 <Link href="/study/qna" style={{ color: POINT_DARK, fontWeight: 700 }}>Q&amp;A게시판</Link>을 이용해주세요.</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowGuideModal(true)}
          style={{
            marginTop: "20px",
            width: "100%",
            height: "44px",
            backgroundColor: "#ffffff",
            border: `1px solid ${POINT}`,
            borderRadius: "8px",
            fontSize: "13.5px",
            fontWeight: 700,
            color: POINT_DARK,
            cursor: "pointer",
            fontFamily: "inherit",
            boxShadow: "0 2px 6px rgba(5, 150, 105, 0.1)",
          }}
        >
          📋 멤버십 신청 및 수강 절차가 궁금해요
        </button>
      </div>
    </div>
  );

  // ━━━ 로그인 패널 ━━━
  const loginPanel = (
    <div className="study-apply-right" style={{ paddingTop: "52px" }}>
      <div style={{ textAlign: "center", marginBottom: "36px" }}>
        <h2 style={{ fontSize: "24px", fontWeight: 900, color: "#0f172a", margin: "0 0 10px", letterSpacing: "-0.5px" }}>
          공실뉴스 로그인
        </h2>
        <p style={{ fontSize: "14px", color: "#64748b", margin: 0, lineHeight: 1.5 }}>
          3초 만에 소셜 연동으로 간편하게 시작하세요.<br />
          첫 로그인 시 자동으로 가입이 완료됩니다.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <button
          type="button"
          onClick={() => handleOAuth("google")}
          disabled={googleLoading || kakaoLoading}
          style={{
            width: "100%",
            background: "#ffffff",
            border: "2px solid #e2e8f0",
            borderRadius: "8px",
            padding: "14px 0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px",
            fontWeight: 800,
            fontSize: "15px",
            color: "#0f172a",
            cursor: googleLoading || kakaoLoading ? "not-allowed" : "pointer",
            fontFamily: "inherit",
            position: "relative",
          }}
        >
          <span style={{ position: "absolute", top: -9, right: 14, background: POINT, color: "#fff", fontSize: "10px", fontWeight: 900, padding: "2px 8px", borderRadius: "10px", letterSpacing: "0.5px" }}>
            추천
          </span>
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
          </svg>
          {googleLoading ? "Google 연결 중..." : "Google 계정으로 시작하기"}
        </button>

        <button
          type="button"
          onClick={() => handleOAuth("kakao")}
          disabled={googleLoading || kakaoLoading}
          style={{
            width: "100%",
            background: "#FEE500",
            border: "none",
            borderRadius: "8px",
            padding: "15px 0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px",
            fontWeight: 800,
            fontSize: "15px",
            color: "#1e1e1e",
            cursor: googleLoading || kakaoLoading ? "not-allowed" : "pointer",
            fontFamily: "inherit",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#3C1E1E" d="M12 3C6.48 3 2 6.36 2 10.44c0 2.62 1.75 4.93 4.38 6.24l-1.12 4.16c-.1.36.3.65.6.44l4.94-3.26c.39.04.79.06 1.2.06 5.52 0 10-3.36 10-7.64C22 6.36 17.52 3 12 3z" /></svg>
          {kakaoLoading ? "카카오 연결 중..." : "카카오 계정으로 시작하기"}
        </button>
      </div>

      <div style={{ textAlign: "center", marginTop: "28px" }}>
        <a href={`/login?returnTo=${encodeURIComponent(RETURN_TO)}`} style={{ fontSize: "13px", color: "#94a3b8", textDecoration: "none" }}>
          어떤 계정으로 가입했는지 모르시나요?
        </a>
      </div>

      <div style={{ borderTop: "1px solid #f1f5f9", marginTop: "36px", paddingTop: "16px", textAlign: "center" }}>
        <div style={{ fontSize: "13px", color: "#94a3b8", marginBottom: "12px" }}>공실스터디 고객센터 1555-5343</div>
        <div style={{ fontSize: "11px", color: "#64748b", background: POINT_SOFT, border: `1px solid ${POINT_BORDER}`, borderRadius: "8px", padding: "10px 12px", boxSizing: "border-box" }}>
          <div style={{ fontWeight: 800, color: "#0f2e28", marginBottom: "6px", fontSize: "11.5px", textAlign: "left" }}>멤버십 신청 절차</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "2px" }}>
            <span>로그인</span>
            <span style={{ color: "#6ee7b7" }}>➔</span>
            <span>신청서 작성</span>
            <span style={{ color: "#6ee7b7" }}>➔</span>
            <span>담당자 연락</span>
            <span style={{ color: "#6ee7b7" }}>➔</span>
            <span style={{ fontWeight: 800, color: POINT_DARK }}>수강 시작</span>
          </div>
        </div>
      </div>
    </div>
  );

  // ━━━ 신청 폼 ━━━
  const formPanel = (
    <div className="study-apply-right">
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "20px" }}>
          <label style={labelStyle}>신청자 <span style={{ color: POINT }}>*</span></label>
          <input type="text" required value={applicantName} onChange={(e) => setApplicantName(e.target.value)} placeholder="신청자 성함을 입력해 주세요" style={inputStyle} />
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label style={labelStyle}>연락처 <span style={{ color: POINT }}>*</span></label>
          <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="예) 01098765432" style={inputStyle} />
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label style={labelStyle}>E-mail</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@gmail.com" style={inputStyle} />
        </div>

        <div style={{ marginBottom: "24px" }}>
          <label style={labelStyle}>
            중개사무소 <span style={{ fontWeight: 400, fontSize: "12px", color: "#888" }}>(선택)</span>
          </label>
          <input type="text" value={agencyName} onChange={(e) => setAgencyName(e.target.value)} placeholder="중개사무소 명칭을 입력해 주세요" style={inputStyle} />
        </div>

        <div style={{ marginBottom: "28px" }}>
          <div style={{ border: "1px solid #dfe2e6", borderRadius: "6px", padding: "14px 16px", backgroundColor: "#ffffff" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontSize: "13.5px", fontWeight: 600, color: "#222", userSelect: "none" }}>
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  style={{ width: "18px", height: "18px", accentColor: POINT, cursor: "pointer" }}
                />
                개인정보 수집 및 이용 동의
              </label>
              <button
                type="button"
                onClick={() => setTermsOpen(!termsOpen)}
                style={{ color: "#888", fontSize: "14px", cursor: "pointer", border: "none", background: "none", padding: "4px" }}
              >
                {termsOpen ? "▲" : "▼"}
              </button>
            </div>
            {termsOpen && (
              <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid #f0f2f5", fontSize: "11.5px", color: "#666", lineHeight: 1.6, paddingLeft: "28px" }}>
                <p style={{ margin: 0 }}>• 수집 목적: 공실스터디 멤버십 신청 확인 및 안내</p>
                <p style={{ margin: 0 }}>• 수집 항목: 신청자 성명, 연락처, E-mail, 중개사무소 정보</p>
                <p style={{ margin: 0 }}>• 보유 기간: 회원 탈퇴 또는 법정 의무 보유 기간까지</p>
              </div>
            )}
          </div>
        </div>

        {errorMsg && (
          <div style={{ marginBottom: "16px", padding: "12px", borderRadius: "6px", backgroundColor: "#fff5f5", border: "1px solid #ffc9c9", fontSize: "12px", fontWeight: 700, color: "#e03131" }}>
            ⚠️ {errorMsg}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          style={{
            width: "100%",
            height: "56px",
            borderRadius: "8px",
            backgroundColor: submitting ? "#6ee7b7" : POINT,
            color: "#ffffff",
            fontSize: "16px",
            fontWeight: 800,
            border: "none",
            cursor: submitting ? "not-allowed" : "pointer",
            letterSpacing: "-0.3px",
            fontFamily: "inherit",
            boxShadow: "0 4px 14px rgba(5, 150, 105, 0.3)",
          }}
          onMouseEnter={(e) => { if (!submitting) e.currentTarget.style.backgroundColor = POINT_DARK; }}
          onMouseLeave={(e) => { if (!submitting) e.currentTarget.style.backgroundColor = POINT; }}
        >
          {submitting ? "신청 처리 중..." : "공실스터디 멤버십 신청하기"}
        </button>
        <p style={{ fontSize: "12px", color: "#94a3b8", textAlign: "center", margin: "12px 0 0" }}>
          요금은 <Link href="/study/pricing" style={{ color: POINT_DARK, fontWeight: 700 }}>금액안내</Link>에서 확인하실 수 있습니다.
        </p>
      </form>
    </div>
  );

  // ━━━ 상태 카드 (이미 신청 / 접수 완료) ━━━
  const renderStatusCard = (opts: {
    badge: string;
    title: string;
    desc: React.ReactNode;
    rows: { label: string; value?: string }[];
  }) => (
    <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 16px" }}>
      <div style={{ backgroundColor: "#ffffff", borderRadius: "20px", border: "1px solid #eaedf0", boxShadow: "0 4px 24px rgba(0,0,0,0.06)", padding: "48px 40px 40px", maxWidth: "520px", width: "100%", textAlign: "center", boxSizing: "border-box" }}>
        <div style={{ width: "68px", height: "68px", backgroundColor: POINT_SOFT, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px", fontWeight: 900, color: POINT, margin: "0 auto 20px" }}>
          ✓
        </div>
        <div style={{ display: "inline-block", backgroundColor: POINT_SOFT, color: POINT_DARK, fontSize: "12.5px", fontWeight: 800, padding: "4px 14px", borderRadius: "20px", marginBottom: "12px" }}>
          {opts.badge}
        </div>
        <h1 style={{ fontSize: "24px", fontWeight: 900, color: "#0f2e28", margin: "0 0 12px", letterSpacing: "-0.5px", wordBreak: "keep-all" }}>{opts.title}</h1>
        <p style={{ fontSize: "14.5px", color: "#64748b", lineHeight: 1.65, margin: "0 0 28px", wordBreak: "keep-all" }}>{opts.desc}</p>

        <div style={{ backgroundColor: "#f8faf9", borderRadius: "12px", border: "1px solid #e7efeb", padding: "18px 22px", textAlign: "left", marginBottom: "28px" }}>
          {opts.rows.map((row, i) => (
            <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", padding: "8px 0", borderBottom: i < opts.rows.length - 1 ? "1px solid #eef2f0" : "none", fontSize: "13.5px" }}>
              <span style={{ color: "#888" }}>{row.label}</span>
              <span style={{ color: "#222", fontWeight: 700, textAlign: "right" }}>{row.value || "-"}</span>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <Link href="/study" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", height: "48px", backgroundColor: "#ffffff", color: "#555", border: "1px solid #dfe2e6", borderRadius: "8px", fontSize: "14px", fontWeight: 700, textDecoration: "none" }}>
            공실스터디란?
          </Link>
          <Link href="/study/lectures" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", height: "48px", backgroundColor: POINT, color: "#ffffff", borderRadius: "8px", fontSize: "14px", fontWeight: 800, textDecoration: "none", boxShadow: "0 2px 8px rgba(5, 150, 105, 0.3)" }}>
            강의목록 보기 ➔
          </Link>
        </div>
      </div>
    </main>
  );

  let body: React.ReactNode;
  if (authLoading) {
    body = <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#999", fontSize: "14px", padding: "120px 0" }}>로딩 중...</div>;
  } else if (submittedData) {
    body = renderStatusCard({
      badge: "신청 접수 완료",
      title: "멤버십 신청이 완료되었습니다",
      desc: <><strong style={{ color: "#222" }}>{submittedData.applicantName}</strong> 님, 신청서를 확인한 뒤<br /><strong style={{ color: "#222" }}>1~2일 이내</strong> 연락드리겠습니다.</>,
      rows: [
        { label: "신청자", value: submittedData.applicantName },
        { label: "연락처", value: submittedData.phone },
        { label: "E-mail", value: submittedData.email },
        { label: "중개사무소", value: submittedData.agencyName },
        { label: "접수 확인 문자", value: submittedData.smsSent ? "발송 완료" : "순차 발송중" },
      ],
    });
  } else if (existingApplication) {
    const dateStr = existingApplication.created_at
      ? new Date(existingApplication.created_at).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
      : "";
    body = renderStatusCard({
      badge: `신청 접수 완료 · ${existingApplication.status || "확인 중"}`,
      title: "이미 멤버십 신청서가 접수되었습니다",
      desc: <><strong style={{ color: "#222" }}>{existingApplication.applicant_name}</strong> 님의 신청서가 정상 접수되어<br />담당자가 확인 중입니다. <strong style={{ color: "#222" }}>(중복 신청 불가)</strong></>,
      rows: [
        { label: "신청자", value: existingApplication.applicant_name },
        { label: "연락처", value: existingApplication.phone },
        { label: "신청일시", value: dateStr },
        { label: "진행상태", value: existingApplication.status },
      ],
    });
  } else {
    body = (
      <main style={{ padding: "64px 16px 80px", display: "flex", justifyContent: "center" }}>
        <div className="study-apply-card">
          {leftPanel}
          {user ? formPanel : loginPanel}
        </div>
      </main>
    );
  }

  return (
    <div style={{ backgroundColor: "#f5f8f7", minHeight: "100vh", fontFamily: "'Pretendard Variable', -apple-system, sans-serif", display: "flex", flexDirection: "column" }}>
      <style>{`
        .study-apply-card {
          width: 100%;
          max-width: 1060px;
          background: #ffffff;
          border-radius: 16px;
          border: 1px solid #eaedf0;
          box-shadow: 0 1px 4px rgba(0,0,0,0.03);
          padding: 56px 64px 60px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 72px;
          box-sizing: border-box;
        }
        .study-apply-left { width: 380px; flex-shrink: 0; }
        .study-apply-right { width: 100%; max-width: 440px; }
        @media (max-width: 900px) {
          .study-apply-card { flex-direction: column; align-items: stretch; padding: 36px 20px 40px; gap: 40px; }
          .study-apply-left, .study-apply-right { width: 100%; max-width: none; }
          .study-apply-right { padding-top: 0 !important; }
        }
      `}</style>

      <StudyHeader />
      {body}

      <footer style={{ padding: "20px 16px 40px", textAlign: "center", fontSize: "11.5px", color: "#888", lineHeight: 1.6 }}>
        <p style={{ fontWeight: 600, color: "#666", margin: "0 0 4px" }}>공실뉴스 | 공실스터디</p>
        <p style={{ margin: 0 }}>고객센터: 1555-5343 (평일 10:00 ~ 18:00)</p>
      </footer>

      {/* ━━━ 멤버십 신청 및 수강 절차 안내 모달 ━━━ */}
      {showGuideModal && (
        <div
          onClick={() => setShowGuideModal(false)}
          style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px", zIndex: 9999 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ backgroundColor: "#ffffff", borderRadius: "20px", width: "100%", maxWidth: "600px", padding: "32px 28px 26px", boxShadow: "0 25px 60px rgba(0,0,0,0.22)", position: "relative", maxHeight: "92vh", overflowY: "auto", boxSizing: "border-box" }}
          >
            <button type="button" onClick={() => setShowGuideModal(false)} style={{ position: "absolute", top: "20px", right: "20px", background: "none", border: "none", fontSize: "22px", color: "#94a3b8", cursor: "pointer" }}>✕</button>
            <div style={{ marginBottom: "22px" }}>
              <div style={{ display: "inline-block", background: POINT_SOFT, color: POINT_DARK, fontSize: "12.5px", fontWeight: 800, padding: "4px 12px", borderRadius: "14px", marginBottom: "10px" }}>공실스터디 멤버십 안내</div>
              <h3 style={{ fontSize: "22px", fontWeight: 900, color: "#1e293b", margin: "0 0 8px" }}>멤버십 신청 및 수강 절차</h3>
              <p style={{ fontSize: "14.5px", color: "#64748b", margin: 0 }}>아래 3단계로 간단하게 진행됩니다.</p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {[
                { step: "1단계", title: "로그인 후 신청서 제출", lines: ["구글·카카오 계정으로 공실뉴스에 로그인합니다.", "성함과 연락처를 확인하고 멤버십 신청서를 제출합니다."] },
                { step: "2단계", title: "담당자 연락 및 결제 안내", lines: ["1~2일 이내 담당자가 문자·카톡으로 연락드립니다.", "요금과 결제 방법은 금액안내 페이지와 같습니다."] },
                { step: "3단계", title: "수강 시작", lines: ["결제가 확인되면 모든 특강을 1년 동안 무제한으로 들을 수 있습니다.", "수강 중인 강의는 나의 강의실에서 이어보실 수 있습니다."] },
              ].map((s) => (
                <div key={s.step} style={{ backgroundColor: "#f8faf9", border: "1px solid #e7efeb", borderRadius: "14px", padding: "18px 20px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                    <span style={{ backgroundColor: POINT, color: "#fff", fontSize: "12.5px", fontWeight: 800, padding: "3px 10px", borderRadius: "6px" }}>{s.step}</span>
                    <span style={{ fontSize: "16.5px", fontWeight: 800, color: "#1e293b" }}>{s.title}</span>
                  </div>
                  {s.lines.map((l) => (
                    <p key={l} style={{ margin: "0 0 2px", fontSize: "14px", color: "#475569", lineHeight: 1.6 }}>• {l}</p>
                  ))}
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setShowGuideModal(false)} style={{ marginTop: "22px", width: "100%", height: "50px", backgroundColor: POINT, color: "#fff", border: "none", borderRadius: "12px", fontSize: "15.5px", fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>
              확인 및 닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
