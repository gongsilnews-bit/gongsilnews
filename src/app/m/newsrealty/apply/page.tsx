"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { submitNewsrealtyApplication, checkExistingNewsrealtyApplication } from "@/app/actions/newsrealtyApply";

export default function MobileNewsRealtyApplyPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [kakaoLoading, setKakaoLoading] = useState(false);

  // 이메일 분리
  const [emailLocal, setEmailLocal] = useState("");
  const [emailDomain, setEmailDomain] = useState("");
  const [customDomain, setCustomDomain] = useState("");

  // 폼 상태: 신청자 정보 위주
  const [applicantName, setApplicantName] = useState("");
  const [phone, setPhone] = useState("");
  const [agencyName, setAgencyName] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [termsAccordionOpen, setTermsAccordionOpen] = useState(false);

  // 기존 신청 내역 상태
  const [existingApplication, setExistingApplication] = useState<any>(null);

  // 모달 및 서브밋 상태
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedData, setSubmittedData] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function loadUserData() {
      try {
        const supabase = createClient();
        const { data: { user: authUser } } = await supabase.auth.getUser();
        setAuthLoading(false);

        if (authUser) {
          setUser(authUser);

          const { data: memberData } = await supabase
            .from("members")
            .select("*")
            .eq("id", authUser.id)
            .maybeSingle();

          const { data: agencyData } = await supabase
            .from("agencies")
            .select("*")
            .eq("owner_id", authUser.id)
            .maybeSingle();

          const currentPhone = memberData?.phone || authUser.user_metadata?.phone || "";

          if (memberData?.name || authUser.user_metadata?.name) {
            setApplicantName(memberData?.name || authUser.user_metadata?.name || "");
          }
          if (agencyData?.name || memberData?.company_name) {
            setAgencyName(agencyData?.name || memberData?.company_name || "");
          }
          if (currentPhone) {
            setPhone(currentPhone);
          }

          const userEmail = authUser.email || "";
          if (userEmail.includes("@")) {
            const [local, dom] = userEmail.split("@");
            setEmailLocal(local);
            if (["naver.com", "gmail.com", "daum.net", "kakao.com", "nate.com"].includes(dom)) {
              setEmailDomain(dom);
            } else {
              setEmailDomain("direct");
              setCustomDomain(dom);
            }
          }

          // 기존 신청 내역 확인
          try {
            const checkRes = await checkExistingNewsrealtyApplication(authUser.id, currentPhone);
            if (checkRes.exists && checkRes.application && checkRes.application.status !== "반려") {
              setExistingApplication(checkRes.application);
            }
          } catch (e) {
            console.error("Error checking existing application:", e);
          }
        }
      } catch (err) {
        console.error("Error loading user info:", err);
        setAuthLoading(false);
      }
    }
    loadUserData();
  }, []);

  const getFullEmail = () => {
    if (!emailLocal) return "";
    const dom = emailDomain === "direct" ? customDomain : emailDomain;
    return dom ? `${emailLocal}@${dom}` : emailLocal;
  };

  const handleGoogleSignup = async () => {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("signup_member_type", "broker");
      }
      setGoogleLoading(true);
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?returnTo=${encodeURIComponent("/m/newsrealty/apply")}`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      console.error(err);
      alert("Google 로그인 오류: " + (err?.message || String(err)));
      setGoogleLoading(false);
    }
  };

  const handleKakaoSignup = async () => {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("signup_member_type", "broker");
      }
      setKakaoLoading(true);
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "kakao",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?returnTo=${encodeURIComponent("/m/newsrealty/apply")}`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      console.error(err);
      alert("카카오 로그인 오류: " + (err?.message || String(err)));
      setKakaoLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!applicantName.trim()) {
      setErrorMsg("신청자 성함을 입력해 주세요.");
      return;
    }
    if (!phone.trim()) {
      setErrorMsg("연락처를 입력해 주세요.");
      return;
    }
    const finalEmail = getFullEmail();
    if (!finalEmail.trim()) {
      setErrorMsg("E-mail을 입력해 주세요.");
      return;
    }
    if (!agencyName.trim()) {
      setErrorMsg("중개사무소 정보를 입력해 주세요.");
      return;
    }
    if (!agreeTerms) {
      setErrorMsg("약관에 동의해 주세요.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await submitNewsrealtyApplication({
        memberId: user?.id,
        name: applicantName.trim(),
        phone: phone.trim(),
        email: finalEmail,
        agencyName: agencyName.trim(),
        interests: ["로컬기자", "부동산중개"],
        memo: `[모바일 공실뉴스부동산 신청] 신청자: ${applicantName.trim()} / 연락처: ${phone.trim()} / 이메일: ${finalEmail} / 중개사무소: ${agencyName.trim()}`,
      });

      if (res.success) {
        setSubmittedData({
          applicantName: applicantName.trim(),
          agencyName: agencyName.trim(),
          phone: phone.trim(),
          email: finalEmail,
          smsSent: res.smsSent,
        });
        setIsSubmitted(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setErrorMsg(res.message || "신청 처리 중 오류가 발생했습니다.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "서버 통신 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  // ━━━ 0. 로딩 중 ━━━
  if (authLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-sm text-[#999]">로딩 중...</div>
      </div>
    );
  }

  // ━━━ 0-1. 비로그인 안내 화면 ━━━
  if (!user) {
    return (
      <div style={{ backgroundColor: "#f7f8f9", minHeight: "100vh", fontFamily: "'Pretendard Variable', -apple-system, sans-serif", display: "flex", flexDirection: "column" }}>
        {/* 헤더 */}
        <header style={{
          position: "sticky",
          top: 0,
          zIndex: 30,
          backgroundColor: "#ffffff",
          borderBottom: "1px solid #eef0f2",
          height: "52px",
          padding: "0 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}>
          <Link href="/m/newsrealty" style={{ color: "#444", fontSize: "14px", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px", textDecoration: "none" }}>
            ‹ 뒤로
          </Link>
          <Link href="/m/newsrealty" style={{ fontWeight: 800, fontSize: "16px", color: "#111", textDecoration: "none" }}>
            공실뉴스부동산
          </Link>
          <div style={{ width: "32px" }} />
        </header>

        <main style={{
          width: "100%",
          maxWidth: "460px",
          margin: "0 auto",
          padding: "36px 16px 70px",
          boxSizing: "border-box"
        }}>
          <div style={{
            backgroundColor: "#ffffff",
            borderRadius: "20px",
            border: "1px solid #eaedf0",
            boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
            padding: "28px 20px",
            textAlign: "center",
            boxSizing: "border-box"
          }}>
            
            {/* 상단 뱃지 & 타이틀 */}
            <div style={{ marginBottom: "16px" }}>
              <span style={{
                display: "inline-block",
                backgroundColor: "#fff2e8",
                color: "#ea580c",
                fontSize: "12px",
                fontWeight: 800,
                padding: "4px 12px",
                borderRadius: "16px",
                marginBottom: "10px"
              }}>
                공실뉴스부동산 입점 신청
              </span>
              <h1 style={{
                fontSize: "21px",
                fontWeight: 900,
                color: "#1a1a1a",
                lineHeight: 1.35,
                margin: 0,
                letterSpacing: "-0.5px",
                wordBreak: "keep-all"
              }}>
                내 지역/단지<br />
                로컬 부동산 기자가 되세요!
                <div style={{ fontSize: "15px", fontWeight: 800, color: "#ff8e15", marginTop: "6px" }}>
                  부동산중개 + 지역부동산기자
                </div>
              </h1>
            </div>

            {/* 새로운 기자 대표 이미지 */}
            <div style={{ margin: "16px 0 20px", textAlign: "center" }}>
              <img
                src="/images/realty/newsrealty_local_reporter.jpg"
                alt="내 지역/단지 로컬 부동산 기자"
                style={{
                  width: "100%",
                  maxWidth: "340px",
                  height: "auto",
                  borderRadius: "14px",
                  objectFit: "cover",
                  display: "inline-block",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.08)"
                }}
              />
            </div>

            {/* 안내 멘트 3가지 */}
            <div style={{
              backgroundColor: "#f8f9fa",
              borderRadius: "12px",
              padding: "18px 16px",
              border: "1px solid #f0f2f5",
              textAlign: "left",
              marginBottom: "24px",
              boxSizing: "border-box"
            }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "13px", color: "#475569", lineHeight: 1.55 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                  <span style={{ color: "#ff8e15", fontWeight: 900, fontSize: "15px", lineHeight: 1 }}>•</span>
                  <span>공실뉴스부동산회원만 신청하실 수 있습니다. <strong style={{ color: "#ea580c" }}>(무료)</strong></span>
                </div>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                  <span style={{ color: "#ff8e15", fontWeight: 900, fontSize: "15px", lineHeight: 1 }}>•</span>
                  <span>가입신청 후, 1~2일 이내 담당자가 연락드립니다. (문자, 카톡)</span>
                </div>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                  <span style={{ color: "#ff8e15", fontWeight: 900, fontSize: "15px", lineHeight: 1 }}>•</span>
                  <span>문의는 1:1 게시판을 이용해주세요.</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowGuideModal(true)}
                style={{
                  marginTop: "14px",
                  width: "100%",
                  height: "40px",
                  backgroundColor: "#ffffff",
                  border: "1px solid #ff8e15",
                  borderRadius: "8px",
                  fontSize: "12.5px",
                  fontWeight: 700,
                  color: "#ea580c",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 1px 4px rgba(255, 142, 21,0.1)"
                }}
              >
                📋 회원가입 및 이용 절차가 궁금해요
              </button>
            </div>

            {/* 공실뉴스 시작하기 (공식 로그인 디자인) */}
            <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "22px", marginBottom: "18px" }}>
              <h2 style={{ fontSize: "20px", fontWeight: 900, color: "#0f172a", margin: "0 0 8px 0", letterSpacing: "-0.5px" }}>
                공실뉴스 로그인
              </h2>
              <p style={{ fontSize: "13px", color: "#64748b", margin: 0, lineHeight: 1.5 }}>
                3초 만에 소셜 연동으로 간편하게 시작하세요.<br />
                첫 로그인 시 자동으로 가입이 완료됩니다.
              </p>
            </div>

            {/* 버튼 그룹 */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "16px" }}>
              {/* 구글 */}
              <button
                type="button"
                onClick={handleGoogleSignup}
                disabled={googleLoading || kakaoLoading}
                style={{
                  width: "100%",
                  height: "48px",
                  backgroundColor: "#ffffff",
                  border: "2px solid #e2e8f0",
                  borderRadius: "10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                  fontWeight: 800,
                  fontSize: "14.5px",
                  color: "#0f172a",
                  cursor: (googleLoading || kakaoLoading) ? "not-allowed" : "pointer",
                  position: "relative",
                  fontFamily: "inherit",
                  boxSizing: "border-box",
                  opacity: googleLoading ? 0.7 : 1
                }}
              >
                <span style={{
                  position: "absolute",
                  top: "-10px",
                  right: "14px",
                  backgroundColor: "#2563eb",
                  color: "#ffffff",
                  fontSize: "10px",
                  fontWeight: 900,
                  padding: "2px 7px",
                  borderRadius: "10px",
                  letterSpacing: "0.5px",
                  lineHeight: 1.2
                }}>
                  추천
                </span>
                <svg width="18" height="18" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                <span>{googleLoading ? "Google 연결 중..." : "Google 계정으로 시작하기"}</span>
              </button>

              {/* 카카오 */}
              <button
                type="button"
                onClick={handleKakaoSignup}
                disabled={googleLoading || kakaoLoading}
                style={{
                  width: "100%",
                  height: "48px",
                  backgroundColor: "#FEE500",
                  border: "none",
                  borderRadius: "10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                  fontWeight: 800,
                  fontSize: "14.5px",
                  color: "#191919",
                  cursor: (googleLoading || kakaoLoading) ? "not-allowed" : "pointer",
                  fontFamily: "inherit",
                  boxSizing: "border-box",
                  opacity: kakaoLoading ? 0.7 : 1
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#191919">
                  <path d="M12 3C6.48 3 2 6.36 2 10.44c0 2.62 1.75 4.93 4.38 6.24l-1.12 4.16c-.1.36.3.65.6.44l4.94-3.26c.39.04.79.06 1.2.06 5.52 0 10-3.36 10-7.64C22 6.36 17.52 3 12 3z"/>
                </svg>
                <span>{kakaoLoading ? "카카오 연결 중..." : "카카오 계정으로 시작하기"}</span>
              </button>
            </div>

            {/* 어떤 계정으로 가입했는지 모르시나요? */}
            <div style={{ textAlign: "center", marginBottom: "20px" }}>
              <a
                href={`/login?returnTo=${encodeURIComponent("/m/newsrealty/apply")}`}
                style={{ fontSize: "12.5px", color: "#94a3b8", textDecoration: "none" }}
              >
                어떤 계정으로 가입했는지 모르시나요?
              </a>
            </div>

            {/* 고객센터 및 가입 절차 안내 (4-step grid) */}
            <div style={{
              borderTop: "1px solid #f1f5f9",
              paddingTop: "18px",
              textAlign: "left",
              boxSizing: "border-box"
            }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", marginBottom: "8px", textAlign: "center" }}>
                공실뉴스 고객센터
              </div>
              <div style={{
                backgroundColor: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "10px",
                padding: "12px 14px",
                boxSizing: "border-box"
              }}>
                <div style={{ fontWeight: 800, color: "#475569", marginBottom: "8px", fontSize: "11.5px" }}>
                  부동산 회원가입 절차
                </div>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: "4px",
                  textAlign: "center",
                  fontSize: "11px"
                }}>
                  <div style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "6px", padding: "6px 2px" }}>
                    <div style={{ fontSize: "9.5px", color: "#94a3b8", fontWeight: 700 }}>STEP 1</div>
                    <div style={{ fontWeight: 700, color: "#334155", marginTop: "1px" }}>회원가입</div>
                  </div>
                  <div style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "6px", padding: "6px 2px" }}>
                    <div style={{ fontSize: "9.5px", color: "#94a3b8", fontWeight: 700 }}>STEP 2</div>
                    <div style={{ fontWeight: 700, color: "#334155", marginTop: "1px" }}>관리자</div>
                  </div>
                  <div style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "6px", padding: "6px 2px" }}>
                    <div style={{ fontSize: "9.5px", color: "#94a3b8", fontWeight: 700 }}>STEP 3</div>
                    <div style={{ fontWeight: 700, color: "#334155", marginTop: "1px" }}>정보설정</div>
                  </div>
                  <div style={{ backgroundColor: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "6px", padding: "6px 2px" }}>
                    <div style={{ fontSize: "9.5px", color: "#2563eb", fontWeight: 800 }}>STEP 4</div>
                    <div style={{ fontWeight: 800, color: "#1d4ed8", marginTop: "1px" }}>승인완료</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* 가이드 모달 (비로그인 상태에서도 볼 수 있게) */}
        {showGuideModal && (
          <div
            onClick={() => setShowGuideModal(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl relative max-h-[88vh] overflow-y-auto"
            >
              <button type="button" onClick={() => setShowGuideModal(false)} className="absolute top-4 right-4 text-[#94a3b8] text-xl p-1 leading-none">✕</button>
              <div className="mb-4">
                <span className="inline-block bg-[#fff2e8] text-[#ea580c] text-[11px] font-bold px-2 py-0.5 rounded-full mb-1">안내 가이드</span>
                <h3 className="text-[18px] font-black text-[#1e293b] tracking-tight m-0">회원가입 및 이용 절차 안내</h3>
                <p className="text-[12.5px] text-[#64748b] mt-1 mb-0">공실뉴스부동산 4단계 간편 가입 절차</p>
              </div>
              <div className="space-y-3">
                <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-3.5">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="bg-[#ff8e15] text-white text-[11px] font-bold px-2 py-0.5 rounded-md">1단계</span>
                    <span className="text-[14px] font-bold text-[#1e293b]">회원가입 및 중개업소 등록</span>
                  </div>
                  <p className="text-[12.5px] text-[#475569] leading-relaxed m-0">
                    • 공실뉴스 포털에서 기본 부동산 회원가입 진행<br />
                    • 대표 공인중개사 및 소속 중개사무소 정보 등록
                  </p>
                </div>
                <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-3.5">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="bg-[#ff8e15] text-white text-[11px] font-bold px-2 py-0.5 rounded-md">2단계</span>
                    <span className="text-[14px] font-bold text-[#1e293b]">신청하기</span>
                  </div>
                  <p className="text-[12.5px] text-[#475569] leading-relaxed m-0">
                    • <strong>로그인 상태</strong>에서 입점 신청서 제출<br />
                    • 성함, 연락처, 사무소 확인 후 원클릭 신청 완료
                  </p>
                </div>
                <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-3.5">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="bg-[#ff8e15] text-white text-[11px] font-bold px-2 py-0.5 rounded-md">3단계</span>
                    <span className="text-[14px] font-bold text-[#1e293b]">승인심사 및 결과 안내</span>
                  </div>
                  <p className="text-[12.5px] text-[#475569] leading-relaxed m-0">
                    • 담당 매니저가 중개업소 정보 확인 후 <strong>신속 승인</strong><br />
                    • 별도 복잡한 서류 제출 없이 빠른 검토<br />
                    • <span className="text-[#059669] font-semibold">카카오톡 알림톡 및 유선으로 결과 안내</span>
                  </p>
                </div>
                <div className="bg-[#fffbf7] border border-[#fed7aa] rounded-xl p-3.5">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="bg-[#ea580c] text-white text-[11px] font-bold px-2 py-0.5 rounded-md">4단계</span>
                    <span className="text-[14px] font-black text-[#1e293b]">이용료 납부 (기간별 할인)</span>
                  </div>
                  <p className="text-[12.5px] text-[#475569] leading-relaxed mb-2">
                    • 승인 완료 후 희망 기간 선택 납부 (즉시 정식 혜택 개시)
                  </p>
                  <div className="grid grid-cols-3 gap-1.5 text-center">
                    <div className="bg-white border border-[#e2e8f0] rounded-lg py-2 px-1">
                      <div className="text-[12px] font-bold text-[#334155]">3개월</div>
                      <div className="text-[11px] text-[#64748b]">월 30,000원</div>
                    </div>
                    <div className="bg-white border border-[#fdba74] rounded-lg py-2 px-1 shadow-2xs">
                      <div className="text-[12px] font-bold text-[#ea580c]">6개월</div>
                      <div className="text-[11px] font-bold text-[#ea580c]">5% 할인</div>
                    </div>
                    <div className="bg-[#fff7ed] border border-[#ff8e15] rounded-lg py-2 px-1 shadow-2xs">
                      <div className="text-[12px] font-black text-[#c2410c]">12개월</div>
                      <div className="text-[11px] font-black text-[#c2410c]">15% 할인 🔥</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <button type="button" onClick={() => setShowGuideModal(false)} style={{ backgroundColor: "#ff8e15" }} className="w-full h-11 text-white font-bold text-[14.5px] rounded-xl shadow-md cursor-pointer flex items-center justify-center">
                  확인 및 닫기
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ━━━ 0-2. 기존 신청 내역이 이미 존재하는 경우 (중복 신청 방지 및 상태 안내) ━━━
  if (existingApplication && !isSubmitted) {
    const isApproved = existingApplication.status === "승인완료";
    const dateStr = existingApplication.created_at
      ? new Date(existingApplication.created_at).toLocaleDateString("ko-KR", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "";

    return (
      <div style={{ backgroundColor: "#f7f8f9", minHeight: "100vh", fontFamily: "'Pretendard', sans-serif", display: "flex", flexDirection: "column" }}>
        {/* 헤더 */}
        <header style={{ backgroundColor: "#fff", borderBottom: "1px solid #eef0f2", height: "52px", position: "sticky", top: 0, zIndex: 30, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px" }}>
          <Link href="/m/newsrealty" style={{ fontSize: "14px", fontWeight: 600, color: "#444", textDecoration: "none" }}>‹ 뒤로</Link>
          <Link href="/m/newsrealty" style={{ fontSize: "16px", fontWeight: 700, color: "#222", textDecoration: "none" }}>공실뉴스부동산</Link>
          <div style={{ width: "32px" }} />
        </header>

        <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "36px 16px" }}>
          <div style={{
            backgroundColor: "#ffffff",
            borderRadius: "20px",
            border: "1px solid #eaedf0",
            boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
            padding: "36px 24px 28px 24px",
            width: "100%",
            maxWidth: "400px",
            textAlign: "center"
          }}>
            {/* 상태 뱃지 & 아이콘 */}
            <div style={{
              width: "64px",
              height: "64px",
              backgroundColor: isApproved ? "#ecfdf5" : "#fff2e8",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "26px",
              color: isApproved ? "#059669" : "#ff8e15",
              margin: "0 auto 16px auto"
            }}>
              {isApproved ? "🏢" : "📋"}
            </div>

            <div style={{
              display: "inline-block",
              backgroundColor: isApproved ? "#ecfdf5" : "#fff2e8",
              color: isApproved ? "#059669" : "#ea580c",
              fontSize: "11.5px",
              fontWeight: 800,
              padding: "4px 12px",
              borderRadius: "16px",
              marginBottom: "10px"
            }}>
              {isApproved ? "🎉 정식 승인 파트너" : `신청 접수 완료 · ${existingApplication.status || "심사 진행 중"}`}
            </div>

            <h1 style={{ fontSize: "20px", fontWeight: 900, color: "#1a1a1a", marginBottom: "8px", letterSpacing: "-0.4px", wordBreak: "keep-all" }}>
              {isApproved
                ? "이미 정식 파트너로 승인되었습니다"
                : "입점 신청서가 이미 접수되었습니다"}
            </h1>

            <p style={{ fontSize: "13px", color: "#64748b", lineHeight: 1.6, marginBottom: "22px", wordBreak: "keep-all" }}>
              {isApproved ? (
                <>
                  <strong style={{ color: "#222" }}>{existingApplication.applicant_name || existingApplication.agency_name}</strong> 대표님은 이미 정식 파트너 권한을 보유하고 계십니다.
                </>
              ) : (
                <>
                  <strong style={{ color: "#222" }}>{existingApplication.applicant_name || existingApplication.agency_name}</strong> 대표님의 신청서가 접수되어 심사 및 상담 준비 중입니다. <strong style={{ color: "#222" }}>(중복 신청 불가)</strong>
                </>
              )}
            </p>

            {/* 접수 정보 요약 박스 */}
            <div style={{
              backgroundColor: "#f8f9fa",
              borderRadius: "12px",
              border: "1px solid #edf0f2",
              padding: "16px 18px",
              textAlign: "left",
              marginBottom: "20px"
            }}>
              {[
                { label: "신청자명", value: existingApplication.applicant_name },
                { label: "중개사무소", value: existingApplication.agency_name },
                { label: "연락처", value: existingApplication.phone },
                { label: "신청일시", value: dateStr || "최근 접수" },
                { label: "진행상태", value: isApproved ? "정식 파트너 활성" : `${existingApplication.status || "신규"} (1영업일 이내 안내)` },
              ].map((item, idx) => (
                <div key={idx} style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "6px 0",
                  borderBottom: idx < 4 ? "1px solid #f0f2f5" : "none",
                  fontSize: "12.5px"
                }}>
                  <span style={{ color: "#888" }}>{item.label}</span>
                  <span style={{ color: item.label === "진행상태" ? (isApproved ? "#059669" : "#ea580c") : "#222", fontWeight: 700 }}>
                    {item.value || "-"}
                  </span>
                </div>
              ))}
            </div>

            {/* 고객센터 안내 */}
            <div style={{
              backgroundColor: "#fffbf7",
              border: "1px solid #fed7aa",
              borderRadius: "8px",
              padding: "10px 14px",
              fontSize: "11.5px",
              color: "#9a3412",
              lineHeight: 1.5,
              marginBottom: "20px",
              textAlign: "left"
            }}>
              💡 변경이나 상담 문의: 고객센터 <strong>1555-5343</strong>
            </div>

            {/* 버튼 그룹 */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <Link
                href="/m/newsrealty"
                style={{
                  display: "block",
                  height: "44px",
                  lineHeight: "44px",
                  borderRadius: "10px",
                  backgroundColor: "#fff",
                  border: "1.5px solid #dfe2e6",
                  color: "#444",
                  fontSize: "13px",
                  fontWeight: 700,
                  textDecoration: "none",
                  textAlign: "center"
                }}
              >
                소개 페이지로
              </Link>
              <Link
                href={isApproved ? "/admin" : "/m"}
                style={{
                  display: "block",
                  height: "44px",
                  lineHeight: "44px",
                  borderRadius: "10px",
                  backgroundColor: "#ff8e15",
                  color: "#fff",
                  fontSize: "13px",
                  fontWeight: 800,
                  textDecoration: "none",
                  textAlign: "center",
                  boxShadow: "0 4px 12px rgba(255, 142, 21,0.3)"
                }}
              >
                {isApproved ? "관리자/공실 관리로 이동 ➔" : "공실뉴스 메인으로 ➔"}
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div style={{ backgroundColor: "#f7f8f9", minHeight: "100vh", fontFamily: "'Pretendard', sans-serif", display: "flex", flexDirection: "column" }}>
        {/* 헤더 */}
        <header style={{ backgroundColor: "#fff", borderBottom: "1px solid #eef0f2", height: "52px", position: "sticky", top: 0, zIndex: 30, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px" }}>
          <Link href="/m/newsrealty" style={{ fontSize: "14px", fontWeight: 600, color: "#444", textDecoration: "none" }}>‹ 뒤로</Link>
          <Link href="/m/newsrealty" style={{ fontSize: "16px", fontWeight: 700, color: "#222", textDecoration: "none" }}>공실뉴스부동산</Link>
          <div style={{ width: "32px" }} />
        </header>

        <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 16px" }}>
          <div style={{
            backgroundColor: "#ffffff",
            borderRadius: "20px",
            border: "1px solid #eaedf0",
            boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
            padding: "40px 28px 32px 28px",
            width: "100%",
            maxWidth: "400px",
            textAlign: "center"
          }}>
            {/* 체크 아이콘 */}
            <div style={{
              width: "60px", height: "60px",
              backgroundColor: "#fff2e8", borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "24px", fontWeight: 900, color: "#ff8e15",
              margin: "0 auto 20px auto"
            }}>✓</div>

            <h1 style={{ fontSize: "22px", fontWeight: 900, color: "#1a1a1a", marginBottom: "8px", letterSpacing: "-0.4px" }}>
              회원가입 신청 완료
            </h1>
            <p style={{ fontSize: "14px", color: "#64748b", lineHeight: 1.65, marginBottom: "24px" }}>
              <strong style={{ color: "#222", fontWeight: 700 }}>{submittedData?.applicantName || submittedData?.agencyName}</strong> 님,<br />
              확인 후 <strong style={{ color: "#222" }}>1~2일 이내</strong> 전화드리겠습니다.
            </p>

            {/* 접수 정보 */}
            <div style={{
              backgroundColor: "#f8f9fa", borderRadius: "12px",
              border: "1px solid #edf0f2", padding: "16px 18px",
              textAlign: "left", marginBottom: "24px"
            }}>
              {[
                { label: "신청자", value: submittedData?.applicantName },
                { label: "연락처", value: submittedData?.phone },
                { label: "E-mail", value: submittedData?.email },
                { label: "중개사무소", value: submittedData?.agencyName },
              ].map((row, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #f0f2f5" }}>
                  <span style={{ fontSize: "12px", color: "#888" }}>{row.label}</span>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "#222" }}>{row.value}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "8px" }}>
                <span style={{ fontSize: "12px", color: "#888" }}>접수 문자</span>
                <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "5px", fontWeight: 800, backgroundColor: "#e6fcf5", color: "#0ca678" }}>
                  {submittedData?.smsSent ? "발송 완료" : "순차 발송중"}
                </span>
              </div>
            </div>

            {/* 버튼 */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <Link
                href="/m/newsrealty"
                style={{ display: "block", height: "46px", lineHeight: "46px", borderRadius: "10px", backgroundColor: "#fff", border: "1.5px solid #dfe2e6", color: "#444", fontSize: "13px", fontWeight: 700, textDecoration: "none", textAlign: "center" }}
              >
                소개 홈으로
              </Link>
              <Link
                href="/m"
                style={{ display: "block", height: "46px", lineHeight: "46px", borderRadius: "10px", backgroundColor: "#ff8e15", color: "#fff", fontSize: "13px", fontWeight: 800, textDecoration: "none", textAlign: "center", boxShadow: "0 4px 12px rgba(255, 142, 21,0.3)" }}
              >
                공실뉴스 메인으로
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }


  return (
    <div style={{ backgroundColor: "#f7f8f9", minHeight: "100vh", fontFamily: "'Pretendard', sans-serif" }}>
      {/* ── 모바일 전용 중앙 정렬 컨테이너 ── */}
      <div style={{
        maxWidth: "460px",
        margin: "0 auto",
        backgroundColor: "#ffffff",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 0 24px rgba(0,0,0,0.04)",
        borderLeft: "1px solid #eaedf0",
        borderRight: "1px solid #eaedf0",
        position: "relative"
      }}>
        {/* ── 상단 헤더 ── */}
        <header style={{
          position: "sticky",
          top: 0,
          zIndex: 30,
          backgroundColor: "#ffffff",
          borderBottom: "1px solid #eef0f2",
          height: "52px",
          padding: "0 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}>
          <Link href="/m/newsrealty" style={{ fontSize: "14px", fontWeight: 600, color: "#444", textDecoration: "none", display: "flex", alignItems: "center", gap: "4px" }}>
            ‹ 뒤로
          </Link>
          <Link href="/m/newsrealty" style={{ fontSize: "16px", fontWeight: 700, color: "#222", textDecoration: "none", letterSpacing: "-0.3px" }}>
            공실뉴스 | 공실뉴스부동산
          </Link>
          <div style={{ width: "32px" }} />
        </header>

        <main style={{ padding: "24px 20px 100px 20px", flex: 1 }}>
          {/* 헤드라인 */}
          <div style={{ marginBottom: "20px" }}>
            <h1 style={{ fontSize: "24px", fontWeight: 800, color: "#1f2328", lineHeight: 1.35, letterSpacing: "-0.5px", margin: 0, wordBreak: "keep-all" }}>
              내 지역/단지<br />
              로컬 부동산 기자가 되세요!
              <div style={{ fontSize: "16px", fontWeight: 700, color: "#ff8e15", marginTop: "8px", letterSpacing: "-0.3px" }}>
                부동산중개 + 지역부동산기자
              </div>
            </h1>
          </div>

          {/* 로컬 부동산 기자 실사 이미지 */}
          <div style={{ marginBottom: "20px", textAlign: "center" }}>
            <div style={{
              borderRadius: "16px",
              overflow: "hidden",
              boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
              border: "1px solid #eaedf0",
              backgroundColor: "#fff"
            }}>
              <img
                src="/images/realty/newsrealty_local_reporter.jpg"
                alt="공실뉴스부동산 로컬 부동산 기자"
                style={{
                  width: "100%",
                  height: "auto",
                  display: "block",
                  objectFit: "cover"
                }}
              />
            </div>
          </div>

          {/* 사용자 맞춤 안내 카드 (최신 3개 문구) */}
          <div style={{
            backgroundColor: "#f8f9fa",
            borderRadius: "14px",
            padding: "18px 16px",
            border: "1px solid #edf0f2",
            marginBottom: "24px"
          }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "12.5px", color: "#475569", lineHeight: 1.55 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "7px" }}>
                <span style={{ color: "#ff8e15", fontWeight: 800, fontSize: "13px" }}>1.</span>
                <span>
                  <strong>공실뉴스부동산회원</strong>만 신청하실 수 있습니다.{" "}
                  <span style={{ display: "inline-block", backgroundColor: "#fff2e8", color: "#ea580c", fontSize: "11px", fontWeight: 800, padding: "1px 6px", borderRadius: "4px", marginLeft: "2px" }}>
                    무료
                  </span>
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "7px" }}>
                <span style={{ color: "#ff8e15", fontWeight: 800, fontSize: "13px" }}>2.</span>
                <span>가입신청 후, <strong>1~2일 이내</strong> 담당자가 연락드립니다. <span style={{ color: "#888", fontSize: "11.5px" }}>(문자, 카톡)</span></span>
              </div>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "7px" }}>
                <span style={{ color: "#ff8e15", fontWeight: 800, fontSize: "13px" }}>3.</span>
                <span>문의는 <strong>1:1 게시판</strong>을 이용해주세요.</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowGuideModal(true)}
              style={{
                marginTop: "14px",
                width: "100%",
                height: "42px",
                backgroundColor: "#ffffff",
                border: "1px solid #ff8e15",
                borderRadius: "10px",
                fontSize: "12.5px",
                fontWeight: 700,
                color: "#ea580c",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                boxShadow: "0 2px 6px rgba(255, 142, 21, 0.08)"
              }}
            >
              📋 회원가입 및 이용 절차가 궁금해요
            </button>
          </div>

          {/* 폼 */}
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* 1. 신청자 */}
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#222", marginBottom: "6px" }}>
                신청자 <span style={{ color: "#ff8e15" }}>*</span>
              </label>
              <input
                type="text"
                required
                value={applicantName}
                onChange={(e) => setApplicantName(e.target.value)}
                placeholder="신청자 성함을 입력해 주세요"
                style={{
                  width: "100%",
                  height: "44px",
                  padding: "0 14px",
                  borderRadius: "8px",
                  border: "1px solid #dfe2e6",
                  fontSize: "13px",
                  color: "#222",
                  backgroundColor: "#fff",
                  outline: "none",
                  boxSizing: "border-box"
                }}
              />
            </div>

            {/* 2. 연락처 */}
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#222", marginBottom: "6px" }}>
                연락처 <span style={{ color: "#ff8e15" }}>*</span>
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="예) 010-1234-5678"
                style={{
                  width: "100%",
                  height: "44px",
                  padding: "0 14px",
                  borderRadius: "8px",
                  border: "1px solid #dfe2e6",
                  fontSize: "13px",
                  color: "#222",
                  backgroundColor: "#fff",
                  outline: "none",
                  boxSizing: "border-box"
                }}
              />
            </div>

            {/* 3. E-mail */}
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#222", marginBottom: "6px" }}>
                E-mail <span style={{ color: "#ff8e15" }}>*</span> <span style={{ color: "#888", fontWeight: 400, fontSize: "11px" }}>(가입 후 아이디로 이용돼요)</span>
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <input
                  type="text"
                  required
                  value={emailLocal}
                  onChange={(e) => setEmailLocal(e.target.value)}
                  placeholder="이메일"
                  style={{
                    flex: 1,
                    height: "44px",
                    padding: "0 12px",
                    borderRadius: "8px",
                    border: "1px solid #dfe2e6",
                    fontSize: "13px",
                    color: "#222",
                    backgroundColor: "#fff",
                    outline: "none",
                    boxSizing: "border-box"
                  }}
                />
                <span style={{ color: "#888", fontSize: "13px" }}>@</span>
                {emailDomain === "direct" ? (
                  <input
                    type="text"
                    required
                    value={customDomain}
                    onChange={(e) => setCustomDomain(e.target.value)}
                    placeholder="도메인"
                    style={{
                      width: "100px",
                      height: "44px",
                      padding: "0 8px",
                      borderRadius: "8px",
                      border: "1px solid #dfe2e6",
                      fontSize: "13px",
                      outline: "none",
                      boxSizing: "border-box"
                    }}
                  />
                ) : null}
                <select
                  value={emailDomain}
                  onChange={(e) => setEmailDomain(e.target.value)}
                  style={{
                    width: "100px",
                    height: "44px",
                    padding: "0 6px",
                    borderRadius: "8px",
                    border: "1px solid #dfe2e6",
                    fontSize: "12px",
                    color: "#555",
                    backgroundColor: "#fff",
                    outline: "none",
                    boxSizing: "border-box"
                  }}
                >
                  <option value="">선택</option>
                  <option value="naver.com">naver.com</option>
                  <option value="gmail.com">gmail.com</option>
                  <option value="daum.net">daum.net</option>
                  <option value="kakao.com">kakao.com</option>
                  <option value="nate.com">nate.com</option>
                  <option value="direct">직접입력</option>
                </select>
              </div>
            </div>

            {/* 4. 중개사무소 */}
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#222", marginBottom: "6px" }}>
                중개사무소 <span style={{ color: "#ff8e15" }}>*</span>
              </label>
              <input
                type="text"
                required
                value={agencyName}
                onChange={(e) => setAgencyName(e.target.value)}
                placeholder="중개사무소 명칭을 입력해 주세요"
                style={{
                  width: "100%",
                  height: "44px",
                  padding: "0 14px",
                  borderRadius: "8px",
                  border: "1px solid #dfe2e6",
                  fontSize: "13px",
                  color: "#222",
                  backgroundColor: "#fff",
                  outline: "none",
                  boxSizing: "border-box"
                }}
              />
            </div>

            {/* 5. 회원가입 약관 전체 동의 하기 */}
            <div style={{ paddingTop: "6px" }}>
              <div style={{ border: "1px solid #dfe2e6", borderRadius: "10px", padding: "14px 14px", backgroundColor: "#fff" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12.5px", fontWeight: 700, color: "#222", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                      style={{ accentColor: "#ff8e15", width: "16px", height: "16px" }}
                    />
                    회원가입 약관 전체 동의 하기
                  </label>
                  <button
                    type="button"
                    onClick={() => setTermsAccordionOpen(!termsAccordionOpen)}
                    style={{ color: "#888", fontSize: "12px", padding: "4px", background: "none", border: "none", cursor: "pointer" }}
                  >
                    {termsAccordionOpen ? "▲" : "▼"}
                  </button>
                </div>
                <p style={{ fontSize: "11px", color: "#888", paddingLeft: "24px", margin: "4px 0 0 0" }}>
                  약관의 효력은 회원가입 절차가 완료된 후 적용됩니다.
                </p>
                {termsAccordionOpen && (
                  <div style={{ marginTop: "10px", paddingTop: "10px", borderTop: "1px solid #f1f3f5", fontSize: "11.5px", color: "#666", paddingLeft: "24px", lineHeight: 1.6 }}>
                    <p style={{ margin: "2px 0" }}>• 수집 목적: 공실뉴스 공인중개사 회원가입 심사</p>
                    <p style={{ margin: "2px 0" }}>• 항목: 신청자 성명, 연락처, E-mail, 중개사무소 정보</p>
                  </div>
                )}
              </div>
            </div>

            {/* 에러 메시지 */}
            {errorMsg && (
              <div style={{ padding: "10px 12px", borderRadius: "8px", backgroundColor: "#fff5f5", border: "1px solid #ffc9c9", fontSize: "12px", fontWeight: 700, color: "#e03131" }}>
                ⚠️ {errorMsg}
              </div>
            )}

            {/* 하단 고정 신청하기 버튼 */}
            <div style={{
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 40,
              backgroundColor: "rgba(255,255,255,0.96)",
              backdropFilter: "blur(6px)",
              borderTop: "1px solid #eef0f2",
              padding: "12px 16px"
            }}>
              <div style={{ maxWidth: "460px", margin: "0 auto" }}>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    width: "100%",
                    height: "50px",
                    borderRadius: "10px",
                    backgroundColor: "#ff8e15",
                    color: "#ffffff",
                    fontWeight: 800,
                    fontSize: "15px",
                    border: "none",
                    cursor: submitting ? "not-allowed" : "pointer",
                    boxShadow: "0 4px 14px rgba(255, 142, 21, 0.35)",
                    letterSpacing: "-0.3px",
                    opacity: submitting ? 0.6 : 1
                  }}
                >
                  {submitting ? "처리 중..." : "공실뉴스부동산 신청하기"}
                </button>
              </div>
            </div>
          </form>
        </main>
      </div>

      {/* ━━━ 공실뉴스부동산: 회원가입 및 이용 절차 가이드 모달 ━━━ */}
      {showGuideModal && (
        <div
          onClick={() => setShowGuideModal(false)}
          className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl relative max-h-[88vh] overflow-y-auto"
          >
            {/* 닫기 버튼 */}
            <button
              type="button"
              onClick={() => setShowGuideModal(false)}
              className="absolute top-4 right-4 text-[#94a3b8] text-xl p-1 leading-none"
            >
              ✕
            </button>

            {/* 헤더 */}
            <div className="mb-4">
              <span className="inline-block bg-[#fff2e8] text-[#ea580c] text-[11px] font-bold px-2 py-0.5 rounded-full mb-1">
                안내 가이드
              </span>
              <h3 className="text-[18px] font-black text-[#1e293b] tracking-tight m-0">
                회원가입 및 이용 절차 안내
              </h3>
              <p className="text-[12.5px] text-[#64748b] mt-1 mb-0">
                공실뉴스부동산 4단계 간편 가입 절차
              </p>
            </div>

            {/* 4단계 스텝 */}
            <div className="space-y-3">
              {/* 1단계 */}
              <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-3.5">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="bg-[#ff8e15] text-white text-[11px] font-bold px-2 py-0.5 rounded-md">
                    1단계
                  </span>
                  <span className="text-[14px] font-bold text-[#1e293b]">
                    회원가입 및 중개업소 등록
                  </span>
                </div>
                <p className="text-[12.5px] text-[#475569] leading-relaxed m-0">
                  • 공실뉴스 포털에서 기본 부동산 회원가입 진행<br />
                  • 대표 공인중개사 및 소속 중개사무소 정보 등록
                </p>
              </div>

              {/* 2단계 */}
              <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-3.5">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="bg-[#ff8e15] text-white text-[11px] font-bold px-2 py-0.5 rounded-md">
                    2단계
                  </span>
                  <span className="text-[14px] font-bold text-[#1e293b]">
                    신청하기
                  </span>
                </div>
                <p className="text-[12.5px] text-[#475569] leading-relaxed m-0">
                  • <strong>로그인 상태</strong>에서 입점 신청서 제출<br />
                  • 성함, 연락처, 사무소 확인 후 원클릭 신청 완료
                </p>
              </div>

              {/* 3단계 */}
              <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-3.5">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="bg-[#ff8e15] text-white text-[11px] font-bold px-2 py-0.5 rounded-md">
                    3단계
                  </span>
                  <span className="text-[14px] font-bold text-[#1e293b]">
                    승인심사 및 결과 안내
                  </span>
                </div>
                <p className="text-[12.5px] text-[#475569] leading-relaxed m-0">
                  • 담당 매니저가 중개업소 정보 확인 후 <strong>신속 승인</strong><br />
                  • 별도 복잡한 서류 제출 없이 빠른 검토<br />
                  • <span className="text-[#059669] font-semibold">카카오톡 알림톡 및 유선으로 결과 안내</span>
                </p>
              </div>

              {/* 4단계 */}
              <div className="bg-[#fffbf7] border border-[#fed7aa] rounded-xl p-3.5">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="bg-[#ea580c] text-white text-[11px] font-bold px-2 py-0.5 rounded-md">
                    4단계
                  </span>
                  <span className="text-[14px] font-black text-[#1e293b]">
                    이용료 납부 (기간별 할인)
                  </span>
                </div>
                <p className="text-[12.5px] text-[#475569] leading-relaxed mb-2">
                  • 승인 완료 후 희망 기간 선택 납부 (즉시 정식 혜택 개시)
                </p>

                {/* 3개 할인 칩 */}
                <div className="grid grid-cols-3 gap-1.5 text-center">
                  <div className="bg-white border border-[#e2e8f0] rounded-lg py-2 px-1">
                    <div className="text-[12px] font-bold text-[#334155]">3개월</div>
                    <div className="text-[11px] text-[#64748b]">월 30,000원</div>
                  </div>
                  <div className="bg-white border border-[#fdba74] rounded-lg py-2 px-1 shadow-2xs">
                    <div className="text-[12px] font-bold text-[#ea580c]">6개월</div>
                    <div className="text-[11px] font-bold text-[#ea580c]">5% 할인</div>
                  </div>
                  <div className="bg-[#fff7ed] border border-[#ff8e15] rounded-lg py-2 px-1 shadow-2xs">
                    <div className="text-[12px] font-black text-[#c2410c]">12개월</div>
                    <div className="text-[11px] font-black text-[#c2410c]">15% 할인 🔥</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 하단 확인 버튼 */}
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                style={{ backgroundColor: "#ff8e15" }}
                className="w-full h-11 text-white font-bold text-[14.5px] rounded-xl shadow-md cursor-pointer flex items-center justify-center"
              >
                확인 및 닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
