"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { submitNewsrealtyApplication } from "@/app/actions/newsrealtyApply";

export default function NewsRealtyApplyPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

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

          if (memberData?.name || authUser.user_metadata?.name) {
            setApplicantName(memberData?.name || authUser.user_metadata?.name || "");
          }
          if (agencyData?.name || memberData?.company_name) {
            setAgencyName(agencyData?.name || memberData?.company_name || "");
          }
          if (memberData?.phone || authUser.user_metadata?.phone) {
            setPhone(memberData?.phone || authUser.user_metadata?.phone || "");
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
        } else {
          // 비로그인 상태 (authLoading은 이미 위에서 false로 설정됨)
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
      setErrorMsg("회원가입 약관에 동의해 주세요.");
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
        memo: `[공실뉴스부동산 신청] 신청자: ${applicantName.trim()} / 연락처: ${phone.trim()} / 이메일: ${finalEmail} / 중개사무소: ${agencyName.trim()}`,
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

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 0. 로딩 중
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (authLoading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#f7f8f9" }}>
        <div style={{ textAlign: "center", color: "#999", fontSize: "14px" }}>로딩 중...</div>
      </div>
    );
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 0-1. 비로그인 안내 화면
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (!user) {
    return (
      <div style={{ backgroundColor: "#f7f8f9", minHeight: "100vh", fontFamily: "'Pretendard', sans-serif" }}>
        {/* 헤더 */}
        <header style={{ backgroundColor: "#ffffff", borderBottom: "1px solid #eaedf0", height: "60px", position: "sticky", top: 0, zIndex: 40 }}>
          <div style={{ maxWidth: "1060px", margin: "0 auto", height: "100%", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Link href="/" style={{ fontSize: "18px", fontWeight: 700, color: "#111", textDecoration: "none" }}>공실뉴스</Link>
              <span style={{ fontSize: "16px", color: "#ccc", fontWeight: 300 }}>|</span>
              <Link href="/newsrealty" style={{ fontSize: "18px", fontWeight: 700, color: "#111", textDecoration: "none" }}>공실뉴스부동산</Link>
            </div>
          </div>
        </header>

        {/* 비로그인 안내 카드 */}
        <main style={{ padding: "80px 20px", display: "flex", justifyContent: "center", alignItems: "center" }}>
          <div style={{
            backgroundColor: "#ffffff",
            borderRadius: "20px",
            border: "1px solid #eaedf0",
            boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
            padding: "56px 48px 48px 48px",
            maxWidth: "520px",
            width: "100%",
            textAlign: "center"
          }}>
            {/* 아이콘 */}
            <div style={{
              width: "72px",
              height: "72px",
              backgroundColor: "#fff2e8",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "32px",
              margin: "0 auto 24px auto"
            }}>🏠</div>

            <div style={{
              display: "inline-block",
              background: "#fff2e8",
              color: "#ea580c",
              fontSize: "12px",
              fontWeight: 800,
              padding: "4px 12px",
              borderRadius: "14px",
              marginBottom: "14px"
            }}>공실뉴스부동산 Pro 입점 신청</div>

            <h1 style={{ fontSize: "26px", fontWeight: 900, color: "#1a1a1a", marginBottom: "12px", letterSpacing: "-0.5px", lineHeight: 1.35 }}>
              로그인 후 신청하실 수 있어요
            </h1>
            <p style={{ fontSize: "15px", color: "#64748b", lineHeight: 1.65, marginBottom: "32px", wordBreak: "keep-all" }}>
              공실뉴스부동산 Pro 파트너 입점 신청은<br />
              <strong style={{ color: "#333" }}>공실뉴스 회원</strong>만 가능합니다.<br />
              아직 회원이 아니시면 지금 바로 가입해 보세요!
            </p>

            {/* 버튼 그룹 */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <a
                href="/signup"
                style={{
                  display: "block",
                  width: "100%",
                  height: "52px",
                  lineHeight: "52px",
                  backgroundColor: "#fa8258",
                  color: "#ffffff",
                  borderRadius: "10px",
                  fontSize: "16px",
                  fontWeight: 800,
                  textDecoration: "none",
                  boxShadow: "0 4px 14px rgba(250, 130, 88, 0.35)",
                  transition: "all 0.15s ease"
                }}
              >
                회원가입 하러 가기
              </a>
              <a
                href={`/login?returnTo=${encodeURIComponent("/newsrealty/apply")}`}
                style={{
                  display: "block",
                  width: "100%",
                  height: "52px",
                  lineHeight: "52px",
                  backgroundColor: "#ffffff",
                  color: "#444",
                  border: "1.5px solid #dfe2e6",
                  borderRadius: "10px",
                  fontSize: "15px",
                  fontWeight: 700,
                  textDecoration: "none",
                  transition: "all 0.15s ease"
                }}
              >
                이미 회원이신가요? 로그인
              </a>
            </div>

            {/* 구분선 + 절차 안내 링크 */}
            <div style={{ marginTop: "28px", paddingTop: "24px", borderTop: "1px solid #f0f2f5" }}>
              <button
                type="button"
                onClick={() => setShowGuideModal(true)}
                style={{ background: "none", border: "none", color: "#fa8258", fontSize: "13.5px", fontWeight: 700, cursor: "pointer", textDecoration: "underline" }}
              >
                📋 회원가입 및 이용 절차 보기
              </button>
            </div>
          </div>
        </main>

        {/* 가이드 모달 (비로그인 상태에서도 볼 수 있게) */}
        {showGuideModal && (
          <div
            onClick={() => setShowGuideModal(false)}
            style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", zIndex: 9999 }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{ backgroundColor: "#ffffff", borderRadius: "20px", width: "100%", maxWidth: "680px", padding: "36px 36px 30px 36px", boxShadow: "0 25px 60px rgba(0,0,0,0.22)", position: "relative", maxHeight: "92vh", overflowY: "auto" }}
            >
              <button type="button" onClick={() => setShowGuideModal(false)} style={{ position: "absolute", top: "24px", right: "24px", background: "none", border: "none", fontSize: "24px", color: "#94a3b8", cursor: "pointer" }}>✕</button>
              <div style={{ marginBottom: "26px" }}>
                <div style={{ display: "inline-block", background: "#fff2e8", color: "#ea580c", fontSize: "12.5px", fontWeight: 800, padding: "4px 12px", borderRadius: "14px", marginBottom: "10px" }}>공실뉴스부동산 입점 안내</div>
                <h3 style={{ fontSize: "24px", fontWeight: 900, color: "#1e293b", margin: "0 0 8px 0" }}>회원가입 및 이용 절차 안내</h3>
                <p style={{ fontSize: "15px", color: "#64748b", margin: 0 }}>공실뉴스부동산 파트너 입점은 아래 4단계를 거쳐 신속하게 진행됩니다.</p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "20px 22px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "14px" }}>
                  <div style={{ flex: "1 1 340px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                      <span style={{ backgroundColor: "#fa8258", color: "#fff", fontSize: "13px", fontWeight: 800, padding: "3px 10px", borderRadius: "6px" }}>1단계</span>
                      <span style={{ fontSize: "17.5px", fontWeight: 800, color: "#1e293b" }}>회원가입 및 중개업소 등록</span>
                    </div>
                    <div style={{ fontSize: "15px", color: "#475569", lineHeight: 1.65, paddingLeft: "4px" }}>
                      <p style={{ margin: "0 0 4px 0" }}>• 공실뉴스 포털에서 기본 <strong>부동산 회원가입</strong>을 진행합니다.</p>
                      <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>• 대표 공인중개사 정보 및 소속 중개업소 기본 정보를 등록합니다.</p>
                    </div>
                  </div>
                  <div>
                    <a href="/login?returnTo=%2Fsignup" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px", backgroundColor: "#fa8258", color: "#fff", fontSize: "14.5px", fontWeight: 800, padding: "11px 22px", borderRadius: "10px", textDecoration: "none", boxShadow: "0 3px 10px rgba(250,130,88,0.3)", whiteSpace: "nowrap" }}>회원가입 / 로그인 바로가기 ➔</a>
                  </div>
                </div>
                <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "20px 22px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                    <span style={{ backgroundColor: "#fa8258", color: "#fff", fontSize: "13px", fontWeight: 800, padding: "3px 10px", borderRadius: "6px" }}>2단계</span>
                    <span style={{ fontSize: "17.5px", fontWeight: 800, color: "#1e293b" }}>신청하기</span>
                  </div>
                  <div style={{ fontSize: "15px", color: "#475569", lineHeight: 1.65, paddingLeft: "4px" }}>
                    <p style={{ margin: "0 0 4px 0" }}>• <strong>로그인 상태</strong>에서 공실뉴스부동산 Pro 파트너 입점 신청서를 제출합니다.</p>
                    <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>• 신청자 성함, 연락처, 사무소 명칭을 확인하고 약관 동의 후 원클릭 접수</p>
                  </div>
                </div>
                <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "20px 22px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                    <span style={{ backgroundColor: "#fa8258", color: "#fff", fontSize: "13px", fontWeight: 800, padding: "3px 10px", borderRadius: "6px" }}>3단계</span>
                    <span style={{ fontSize: "17.5px", fontWeight: 800, color: "#1e293b" }}>승인심사 및 결과 안내</span>
                  </div>
                  <div style={{ fontSize: "15px", color: "#475569", lineHeight: 1.65, paddingLeft: "4px" }}>
                    <p style={{ margin: "0 0 4px 0" }}>• 담당 매니저가 중개업소 정보 확인 후 <strong>신속히 승인 심사</strong>를 진행합니다.</p>
                    <p style={{ margin: "0 0 4px 0", color: "#64748b", fontSize: "14px" }}>• 이미 부동산 회원으로 등록되어 있어 <strong>별도 복잡한 서류 제출 없이</strong> 빠르게 처리됩니다.</p>
                    <p style={{ margin: 0, color: "#059669", fontSize: "14px", fontWeight: 700 }}>• 심사 결과는 카카오톡 알림톡 및 유선 전화로 정중히 안내드립니다.</p>
                  </div>
                </div>
                <div style={{ backgroundColor: "#fffbf7", border: "1.5px solid #fed7aa", borderRadius: "14px", padding: "20px 22px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                    <span style={{ backgroundColor: "#ea580c", color: "#fff", fontSize: "13px", fontWeight: 800, padding: "3px 10px", borderRadius: "6px" }}>4단계</span>
                    <span style={{ fontSize: "17.5px", fontWeight: 900, color: "#1e293b" }}>이용료 납부 (기간별 할인 혜택)</span>
                  </div>
                  <p style={{ fontSize: "15px", color: "#475569", margin: "0 0 10px 0" }}>• 승인 완료 후 원하시는 이용 기간을 선택하여 이용료를 납부합니다.</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                    <div style={{ backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "14px 10px", textAlign: "center" }}>
                      <div style={{ fontSize: "15px", fontWeight: 700, color: "#334155" }}>3개월</div>
                      <div style={{ fontSize: "13px", color: "#64748b", marginTop: "4px" }}>월 30,000원</div>
                    </div>
                    <div style={{ backgroundColor: "#fff", border: "1.5px solid #fdba74", borderRadius: "10px", padding: "14px 10px", textAlign: "center" }}>
                      <div style={{ fontSize: "15px", fontWeight: 700, color: "#ea580c" }}>6개월</div>
                      <div style={{ fontSize: "13px", fontWeight: 700, color: "#ea580c", marginTop: "4px" }}>5% 할인</div>
                    </div>
                    <div style={{ backgroundColor: "#fff7ed", border: "1.5px solid #fa8258", borderRadius: "10px", padding: "14px 10px", textAlign: "center" }}>
                      <div style={{ fontSize: "15px", fontWeight: 900, color: "#c2410c" }}>12개월</div>
                      <div style={{ fontSize: "13px", fontWeight: 900, color: "#c2410c", marginTop: "4px" }}>15% 할인 🔥</div>
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ marginTop: "24px" }}>
                <button type="button" onClick={() => setShowGuideModal(false)} style={{ width: "100%", height: "52px", backgroundColor: "#fa8258", color: "#fff", border: "none", borderRadius: "12px", fontSize: "16px", fontWeight: 800, cursor: "pointer", boxShadow: "0 4px 14px rgba(250,130,88,0.3)" }}>확인 및 닫기</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 1. 접수 완료 화면
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (isSubmitted) {
    return (
      <div style={{ backgroundColor: "#f7f8f9", minHeight: "100vh", fontFamily: "'Pretendard', sans-serif", display: "flex", flexDirection: "column" }}>
        {/* 헤더 */}
        <header style={{ backgroundColor: "#ffffff", borderBottom: "1px solid #eaedf0", height: "60px", position: "sticky", top: 0, zIndex: 40 }}>
          <div style={{ maxWidth: "1060px", margin: "0 auto", height: "100%", padding: "0 24px", display: "flex", alignItems: "center" }}>
            <Link href="/" style={{ fontSize: "18px", fontWeight: 700, color: "#111", textDecoration: "none" }}>공실뉴스</Link>
            <span style={{ fontSize: "16px", color: "#ccc", fontWeight: 300, margin: "0 8px" }}>|</span>
            <Link href="/newsrealty" style={{ fontSize: "18px", fontWeight: 700, color: "#111", textDecoration: "none" }}>공실뉴스부동산</Link>
          </div>
        </header>

        {/* 완료 카드 */}
        <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 20px" }}>
          <div style={{
            backgroundColor: "#ffffff",
            borderRadius: "20px",
            border: "1px solid #eaedf0",
            boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
            padding: "52px 48px 44px 48px",
            maxWidth: "520px",
            width: "100%",
            textAlign: "center"
          }}>
            {/* 체크 아이콘 */}
            <div style={{
              width: "68px",
              height: "68px",
              backgroundColor: "#fff2e8",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "28px",
              fontWeight: 900,
              color: "#fa8258",
              margin: "0 auto 24px auto"
            }}>✓</div>

            <h1 style={{ fontSize: "26px", fontWeight: 900, color: "#1a1a1a", marginBottom: "10px", letterSpacing: "-0.5px" }}>
              회원가입 신청이 완료되었습니다
            </h1>
            <p style={{ fontSize: "15px", color: "#64748b", lineHeight: 1.65, marginBottom: "28px" }}>
              <strong style={{ color: "#222", fontWeight: 700 }}>{submittedData?.applicantName || submittedData?.agencyName}</strong> 님,<br />
              가입 신청서를 확인 후 <strong style={{ color: "#222" }}>1~2일 이내</strong> 전화드리겠습니다.
            </p>

            {/* 접수 정보 카드 */}
            <div style={{
              backgroundColor: "#f8f9fa",
              borderRadius: "12px",
              border: "1px solid #edf0f2",
              padding: "20px 22px",
              textAlign: "left",
              marginBottom: "28px"
            }}>
              {[
                { label: "신청자", value: submittedData?.applicantName },
                { label: "연락처", value: submittedData?.phone },
                { label: "E-mail", value: submittedData?.email },
                { label: "중개사무소", value: submittedData?.agencyName },
              ].map((row, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid #f0f2f5" }}>
                  <span style={{ fontSize: "13px", color: "#888" }}>{row.label}</span>
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "#222" }}>{row.value}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "10px" }}>
                <span style={{ fontSize: "13px", color: "#888" }}>접수 확인 문자</span>
                <span style={{
                  fontSize: "11.5px",
                  padding: "3px 10px",
                  borderRadius: "6px",
                  fontWeight: 800,
                  backgroundColor: "#e6fcf5",
                  color: "#0ca678"
                }}>
                  {submittedData?.smsSent ? "발송 완료" : "순차 발송중"}
                </span>
              </div>
            </div>

            {/* 버튼 */}
            <div style={{ display: "flex", gap: "12px" }}>
              <Link
                href="/newsrealty"
                style={{
                  flex: 1,
                  height: "50px",
                  lineHeight: "50px",
                  borderRadius: "10px",
                  backgroundColor: "#ffffff",
                  border: "1.5px solid #dfe2e6",
                  color: "#444",
                  fontSize: "14px",
                  fontWeight: 700,
                  textDecoration: "none",
                  textAlign: "center",
                  display: "block"
                }}
              >
                소개 홈으로
              </Link>
              <Link
                href="/"
                style={{
                  flex: 1,
                  height: "50px",
                  lineHeight: "50px",
                  borderRadius: "10px",
                  backgroundColor: "#fa8258",
                  color: "#ffffff",
                  fontSize: "14px",
                  fontWeight: 800,
                  textDecoration: "none",
                  textAlign: "center",
                  display: "block",
                  boxShadow: "0 4px 14px rgba(250,130,88,0.3)"
                }}
              >
                메인으로 이동
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }


  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 2. 직방 CEO 신청폼 1:1 완벽 구현 화면 (첨부 이미지 100% 동일)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  return (
    <div style={{ backgroundColor: "#f7f8f9", minHeight: "100vh", fontFamily: "'Pretendard', sans-serif" }}>
      
      {/* ── 직방 CEO 스타일 단독 상단 헤더 ── */}
      <header style={{ backgroundColor: "#ffffff", borderBottom: "1px solid #eaedf0", height: "60px", position: "sticky", top: 0, zIndex: 40 }}>
        <div style={{ maxWidth: "1060px", margin: "0 auto", height: "100%", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Link href="/" style={{ fontSize: "18px", fontWeight: 700, color: "#111", textDecoration: "none" }} title="공실뉴스 홈으로">
                공실뉴스
              </Link>
              <span style={{ fontSize: "16px", color: "#ccc", fontWeight: 300 }}>|</span>
              <Link href="/newsrealty" style={{ fontSize: "18px", fontWeight: 700, color: "#111", textDecoration: "none" }} title="공실뉴스부동산 소개로">
                공실뉴스부동산
              </Link>
            </div>
          </div>

          <nav style={{ display: "flex", alignItems: "center", gap: "24px", fontSize: "13px", fontWeight: 500, color: "#444" }}>
            <Link href="/newsrealty" style={{ color: "#444", textDecoration: "none" }}>홈</Link>
            <Link href="/newsrealty" style={{ color: "#444", textDecoration: "none" }}>채용</Link>
            <Link href="/newsrealty" style={{ color: "#444", textDecoration: "none" }}>상품소개</Link>
            <Link href="/newsrealty" style={{ color: "#444", textDecoration: "none" }}>허위광고OUT</Link>
            <Link href="tel:15555343" style={{ color: "#444", textDecoration: "none" }}>이용안내</Link>
            <button
              type="button"
              onClick={() => router.push("/")}
              style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "13px", color: "#444", cursor: "pointer", border: "none", background: "none" }}
            >
              <span>☰</span> 전체 메뉴
            </button>
          </nav>
        </div>
      </header>

      {/* ── 메인 화이트 카드 컨테이너 (정중앙 배치) ── */}
      <main style={{ padding: "48px 20px 80px 20px", display: "flex", justifyContent: "center" }}>
        <div style={{
          width: "100%",
          maxWidth: "1060px",
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          border: "1px solid #eaedf0",
          boxShadow: "0 1px 4px rgba(0,0,0,0.03)",
          padding: "56px 64px 60px 64px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "72px"
        }}>

          {/* ━━━ 좌측 안내 영역 (Width: 380px) ━━━ */}
          <div style={{ width: "380px", flexShrink: 0 }}>
            <h1 style={{ fontSize: "29px", fontWeight: 800, color: "#1a1a1a", lineHeight: 1.32, letterSpacing: "-0.5px", marginBottom: "20px", wordBreak: "keep-all" }}>
              내 지역/단지<br />
              로컬 부동산 기자가 되세요!
              <div style={{ fontSize: "19px", fontWeight: 700, color: "#fa8258", marginTop: "12px", letterSpacing: "-0.3px" }}>
                부동산중개 + 지역부동산기자
              </div>
            </h1>

            {/* 좌측 서비스 앱 목업 이미지 */}
            <div style={{ marginBottom: "24px", textAlign: "center" }}>
              <img
                src="/newsrealty_mockup@2x.png"
                alt="공실뉴스부동산 모바일 앱 화면"
                style={{
                  width: "100%",
                  maxWidth: "280px",
                  height: "auto",
                  display: "inline-block",
                  filter: "drop-shadow(0 10px 22px rgba(0,0,0,0.06))",
                  borderRadius: "12px"
                }}
              />
            </div>

            {/* 직방 연회색 안내 카드 */}
            <div style={{ backgroundColor: "#f8f9fa", borderRadius: "10px", padding: "24px 20px", border: "1px solid #f0f2f5" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "14px", fontSize: "13px", color: "#555", lineHeight: 1.6 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                  <span style={{ color: "#aaa", marginTop: "-1px" }}>•</span>
                  <span>국가 공간 정보 포털의 부동산중개업 정보에 등록된 대표 공인중개사만 회원가입이 가능해요.</span>
                </div>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                  <span style={{ color: "#aaa", marginTop: "-1px" }}>•</span>
                  <span>회원가입신청 시 1~2일 이내 전화드려요.</span>
                </div>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                  <span style={{ color: "#aaa", marginTop: "-1px" }}>•</span>
                  <span>문의는 1555-5343 (평일 오전 10시 ~ 오후 6시)로 연락해 주세요.</span>
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
                  border: "1px solid #fa8258",
                  borderRadius: "8px",
                  fontSize: "13.5px",
                  fontWeight: 700,
                  color: "#ea580c",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.15s ease",
                  boxShadow: "0 2px 6px rgba(250, 130, 88, 0.1)"
                }}
              >
                📋 회원가입 및 이용 절차가 궁금해요
              </button>
            </div>
          </div>

          {/* ━━━ 우측 입력 폼 (Width: 460px) ━━━ */}
          <div style={{ width: "100%", maxWidth: "460px", flexShrink: 0 }}>
            <form onSubmit={handleSubmit}>

              {/* 1. 신청자 */}
              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#222", marginBottom: "8px" }}>
                  신청자 <span style={{ color: "#fa8258" }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  value={applicantName}
                  onChange={(e) => setApplicantName(e.target.value)}
                  placeholder="신청자 성함을 입력해 주세요"
                  style={{
                    width: "100%",
                    height: "48px",
                    padding: "0 16px",
                    border: "1px solid #dfe2e6",
                    borderRadius: "6px",
                    fontSize: "14px",
                    color: "#222",
                    backgroundColor: "#fff",
                    outline: "none",
                    boxSizing: "border-box"
                  }}
                />
              </div>

              {/* 2. 연락처 */}
              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#222", marginBottom: "8px" }}>
                  연락처 <span style={{ color: "#fa8258" }}>*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="예) 01098765432"
                  style={{
                    width: "100%",
                    height: "48px",
                    padding: "0 16px",
                    border: "1px solid #dfe2e6",
                    borderRadius: "6px",
                    fontSize: "14px",
                    color: "#222",
                    backgroundColor: "#fff",
                    outline: "none",
                    boxSizing: "border-box"
                  }}
                />
              </div>

              {/* 3. E-mail */}
              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#222", marginBottom: "8px" }}>
                  E-mail <span style={{ color: "#fa8258" }}>*</span> <span style={{ fontWeight: 400, fontSize: "12px", color: "#888" }}>(가입 후 아이디로 이용돼요)</span>
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <input
                    type="text"
                    required
                    value={emailLocal}
                    onChange={(e) => setEmailLocal(e.target.value)}
                    placeholder="이메일"
                    style={{
                      flex: 1,
                      height: "48px",
                      padding: "0 16px",
                      border: "1px solid #dfe2e6",
                      borderRadius: "6px",
                      fontSize: "14px",
                      color: "#222",
                      backgroundColor: "#fff",
                      outline: "none",
                      boxSizing: "border-box"
                    }}
                  />
                  <span style={{ color: "#888", fontSize: "14px" }}>@</span>
                  {emailDomain === "direct" ? (
                    <input
                      type="text"
                      required
                      value={customDomain}
                      onChange={(e) => setCustomDomain(e.target.value)}
                      placeholder="직접 입력"
                      style={{
                        flex: 1,
                        height: "48px",
                        padding: "0 16px",
                        border: "1px solid #dfe2e6",
                        borderRadius: "6px",
                        fontSize: "14px",
                        color: "#222",
                        backgroundColor: "#fff",
                        outline: "none",
                        boxSizing: "border-box"
                      }}
                    />
                  ) : null}
                  <select
                    value={emailDomain}
                    onChange={(e) => setEmailDomain(e.target.value)}
                    style={{
                      width: "140px",
                      height: "48px",
                      padding: "0 12px",
                      border: "1px solid #dfe2e6",
                      borderRadius: "6px",
                      fontSize: "13.5px",
                      color: "#444",
                      backgroundColor: "#fff",
                      outline: "none",
                      cursor: "pointer",
                      boxSizing: "border-box"
                    }}
                  >
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

              {/* 4. 중개사무소 */}
              <div style={{ marginBottom: "24px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#222", marginBottom: "8px" }}>
                  중개사무소 <span style={{ color: "#fa8258" }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  value={agencyName}
                  onChange={(e) => setAgencyName(e.target.value)}
                  placeholder="중개사무소 명칭을 입력해 주세요"
                  style={{
                    width: "100%",
                    height: "48px",
                    padding: "0 16px",
                    border: "1px solid #dfe2e6",
                    borderRadius: "6px",
                    fontSize: "14px",
                    color: "#222",
                    backgroundColor: "#fff",
                    outline: "none",
                    boxSizing: "border-box"
                  }}
                />
              </div>

              {/* 5. 회원가입 약관 전체 동의 하기 (아코디언 박스) */}
              <div style={{ marginBottom: "28px" }}>
                <div style={{
                  border: "1px solid #dfe2e6",
                  borderRadius: "6px",
                  padding: "14px 16px",
                  backgroundColor: "#ffffff"
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontSize: "13.5px", fontWeight: 600, color: "#222", userSelect: "none" }}>
                      <input
                        type="checkbox"
                        checked={agreeTerms}
                        onChange={(e) => setAgreeTerms(e.target.checked)}
                        style={{
                          width: "18px",
                          height: "18px",
                          accentColor: "#fa8258",
                          cursor: "pointer"
                        }}
                      />
                      회원가입 약관 전체 동의 하기
                    </label>
                    <button
                      type="button"
                      onClick={() => setTermsAccordionOpen(!termsAccordionOpen)}
                      style={{ color: "#888", fontSize: "14px", cursor: "pointer", border: "none", background: "none", padding: "4px" }}
                    >
                      {termsAccordionOpen ? "▲" : "▼"}
                    </button>
                  </div>

                  {termsAccordionOpen && (
                    <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid #f0f2f5", fontSize: "11.5px", color: "#666", lineHeight: 1.6, paddingLeft: "28px" }}>
                      <p>• 개인정보 수집 및 이용 목적: 공실뉴스 공인중개사 회원가입 심사 및 안내</p>
                      <p>• 수집 항목: 신청자 성명, 연락처, E-mail, 중개사무소 정보</p>
                      <p>• 보유 및 이용 기간: 회원 탈퇴 또는 법정 의무 보유 기간까지</p>
                    </div>
                  )}
                </div>

                <p style={{ fontSize: "11.5px", color: "#888", marginTop: "6px", paddingLeft: "4px" }}>
                  약관의 효력은 회원가입 절차가 완료된 후 적용됩니다.
                </p>
              </div>

              {/* 에러 메시지 */}
              {errorMsg && (
                <div style={{ marginBottom: "16px", padding: "12px", borderRadius: "6px", backgroundColor: "#fff5f5", border: "1px solid #ffc9c9", fontSize: "12px", fontWeight: 700, color: "#e03131" }}>
                  ⚠️ {errorMsg}
                </div>
              )}

              {/* 7. 직방 시그니처 코랄 오렌지 메인 신청 버튼 */}
              <div>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    width: "100%",
                    height: "56px",
                    borderRadius: "8px",
                    backgroundColor: "#fa8258",
                    color: "#ffffff",
                    fontSize: "16px",
                    fontWeight: 700,
                    border: "none",
                    cursor: submitting ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    letterSpacing: "-0.3px",
                    boxShadow: "0 2px 6px rgba(250, 130, 88, 0.25)",
                    transition: "background-color 0.15s, transform 0.1s"
                  }}
                >
                  {submitting ? "신청 처리 중..." : "공실뉴스부동산 신청하기"}
                </button>
              </div>
            </form>
          </div>

        </div>
      </main>

      {/* ── 직방 CEO 스타일 푸터 ── */}
      <footer style={{ maxWidth: "1060px", margin: "0 auto", padding: "20px 24px 40px 24px", textAlign: "center", fontSize: "11.5px", color: "#888", lineHeight: 1.6 }}>
        <p style={{ fontWeight: 600, color: "#666", marginBottom: "4px" }}>공실뉴스 | 공실뉴스부동산</p>
        <p>고객센터: 1555-5343 (평일 10:00 ~ 18:00) | 이메일: gongsilnews@naver.com</p>
        <p style={{ marginTop: "4px" }}>© GONGSILLNEWS Corp. All rights reserved.</p>
      </footer>

      {/* ━━━ 공실뉴스부동산: 회원가입 및 이용 절차 가이드 모달 ━━━ */}
      {showGuideModal && (
        <div
          onClick={() => setShowGuideModal(false)}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            backdropFilter: "blur(2px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            zIndex: 9999
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "20px",
              width: "100%",
              maxWidth: "680px",
              padding: "36px 36px 30px 36px",
              boxShadow: "0 25px 60px rgba(0,0,0,0.22)",
              position: "relative",
              maxHeight: "92vh",
              overflowY: "auto"
            }}
          >
            {/* 닫기 버튼 */}
            <button
              type="button"
              onClick={() => setShowGuideModal(false)}
              style={{
                position: "absolute",
                top: "24px",
                right: "24px",
                background: "none",
                border: "none",
                fontSize: "24px",
                color: "#94a3b8",
                cursor: "pointer",
                padding: "4px",
                lineHeight: 1
              }}
            >
              ✕
            </button>

            {/* 모달 헤더 */}
            <div style={{ marginBottom: "26px" }}>
              <div style={{
                display: "inline-block",
                background: "#fff2e8",
                color: "#ea580c",
                fontSize: "12.5px",
                fontWeight: 800,
                padding: "4px 12px",
                borderRadius: "14px",
                marginBottom: "10px"
              }}>
                공실뉴스부동산 입점 안내
              </div>
              <h3 style={{ fontSize: "24px", fontWeight: 900, color: "#1e293b", margin: "0 0 8px 0", letterSpacing: "-0.5px" }}>
                회원가입 및 이용 절차 안내
              </h3>
              <p style={{ fontSize: "15px", color: "#64748b", margin: 0, lineHeight: 1.5 }}>
                공실뉴스부동산 파트너 입점은 아래 4단계를 거쳐 신속하게 진행됩니다.
              </p>
            </div>

            {/* 4단계 스텝 리스트 */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

              {/* 1단계 */}
              <div style={{
                backgroundColor: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "14px",
                padding: "20px 22px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "14px"
              }}>
                <div style={{ flex: "1 1 340px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                    <span style={{
                      backgroundColor: "#fa8258",
                      color: "#ffffff",
                      fontSize: "13px",
                      fontWeight: 800,
                      padding: "3px 10px",
                      borderRadius: "6px"
                    }}>
                      1단계
                    </span>
                    <span style={{ fontSize: "17.5px", fontWeight: 800, color: "#1e293b" }}>
                      회원가입 및 중개업소 등록
                    </span>
                  </div>
                  <div style={{ fontSize: "15px", color: "#475569", lineHeight: 1.65, paddingLeft: "4px" }}>
                    <p style={{ margin: "0 0 4px 0" }}>• 공실뉴스 포털에서 기본 <strong>부동산 회원가입</strong>을 진행합니다.</p>
                    <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>• 대표 공인중개사 정보 및 소속 중개업소 기본 정보를 등록합니다.</p>
                  </div>
                </div>

                <div>
                  <a
                    href="/login?returnTo=%2Fsignup"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      backgroundColor: "#fa8258",
                      color: "#ffffff",
                      fontSize: "14.5px",
                      fontWeight: 800,
                      padding: "11px 22px",
                      borderRadius: "10px",
                      textDecoration: "none",
                      boxShadow: "0 3px 10px rgba(250, 130, 88, 0.3)",
                      transition: "all 0.15s ease",
                      whiteSpace: "nowrap"
                    }}
                  >
                    회원가입 / 로그인 바로가기 ➔
                  </a>
                </div>
              </div>

              {/* 2단계 */}
              <div style={{
                backgroundColor: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "14px",
                padding: "20px 22px"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                  <span style={{
                    backgroundColor: "#fa8258",
                    color: "#ffffff",
                    fontSize: "13px",
                    fontWeight: 800,
                    padding: "3px 10px",
                    borderRadius: "6px"
                  }}>
                    2단계
                  </span>
                  <span style={{ fontSize: "17.5px", fontWeight: 800, color: "#1e293b" }}>
                    신청하기
                  </span>
                </div>
                <div style={{ fontSize: "15px", color: "#475569", lineHeight: 1.65, paddingLeft: "4px" }}>
                  <p style={{ margin: "0 0 4px 0" }}>• <strong>로그인 상태</strong>에서 공실뉴스부동산 Pro 파트너 입점 신청서를 제출합니다.</p>
                  <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>• 신청자 성함, 연락처, 사무소 명칭을 확인하고 약관 동의 후 원클릭 접수</p>
                </div>
              </div>

              {/* 3단계 */}
              <div style={{
                backgroundColor: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "14px",
                padding: "20px 22px"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                  <span style={{
                    backgroundColor: "#fa8258",
                    color: "#ffffff",
                    fontSize: "13px",
                    fontWeight: 800,
                    padding: "3px 10px",
                    borderRadius: "6px"
                  }}>
                    3단계
                  </span>
                  <span style={{ fontSize: "17.5px", fontWeight: 800, color: "#1e293b" }}>
                    승인심사 및 결과 안내
                  </span>
                </div>
                <div style={{ fontSize: "15px", color: "#475569", lineHeight: 1.65, paddingLeft: "4px" }}>
                  <p style={{ margin: "0 0 4px 0" }}>• 담당 매니저가 중개업소 정보 확인 후 <strong>신속히 승인 심사</strong>를 진행합니다.</p>
                  <p style={{ margin: "0 0 4px 0", color: "#64748b", fontSize: "14px" }}>• 이미 부동산 회원으로 등록되어 있어 <strong>별도 복잡한 서류 제출 없이</strong> 빠르게 처리됩니다.</p>
                  <p style={{ margin: 0, color: "#059669", fontSize: "14px", fontWeight: 700 }}>• 심사 결과는 카카오톡 알림톡 및 유선 전화로 정중히 안내드립니다.</p>
                </div>
              </div>

              {/* 4단계 */}
              <div style={{
                backgroundColor: "#fffbf7",
                border: "1.5px solid #fed7aa",
                borderRadius: "14px",
                padding: "20px 22px"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                  <span style={{
                    backgroundColor: "#ea580c",
                    color: "#ffffff",
                    fontSize: "13px",
                    fontWeight: 800,
                    padding: "3px 10px",
                    borderRadius: "6px"
                  }}>
                    4단계
                  </span>
                  <span style={{ fontSize: "17.5px", fontWeight: 900, color: "#1e293b" }}>
                    이용료 납부 (기간별 할인 혜택)
                  </span>
                </div>
                <div style={{ fontSize: "15px", color: "#475569", lineHeight: 1.65, paddingLeft: "4px" }}>
                  <p style={{ margin: "0 0 10px 0" }}>• 승인 완료 후 원하시는 이용 기간을 선택하여 이용료를 납부합니다.</p>
                  
                  {/* 할인 칩 박스 */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginTop: "12px" }}>
                    <div style={{
                      backgroundColor: "#ffffff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "10px",
                      padding: "14px 10px",
                      textAlign: "center"
                    }}>
                      <div style={{ fontSize: "15px", fontWeight: 800, color: "#334155" }}>3개월</div>
                      <div style={{ fontSize: "13px", color: "#64748b", marginTop: "3px" }}>월 30,000원</div>
                      <div style={{ fontSize: "11.5px", color: "#94a3b8", marginTop: "3px" }}>기본 플랜</div>
                    </div>
                    <div style={{
                      backgroundColor: "#ffffff",
                      border: "1.5px solid #fdba74",
                      borderRadius: "10px",
                      padding: "14px 10px",
                      textAlign: "center",
                      boxShadow: "0 2px 8px rgba(251, 146, 60, 0.12)"
                    }}>
                      <div style={{ fontSize: "15px", fontWeight: 800, color: "#ea580c" }}>6개월</div>
                      <div style={{ fontSize: "13px", color: "#ea580c", fontWeight: 700, marginTop: "3px" }}>5% 추가할인</div>
                      <div style={{ fontSize: "11.5px", color: "#ea580c", marginTop: "3px" }}>인기 플랜 👍</div>
                    </div>
                    <div style={{
                      backgroundColor: "#fff7ed",
                      border: "2px solid #fa8258",
                      borderRadius: "10px",
                      padding: "14px 10px",
                      textAlign: "center",
                      boxShadow: "0 4px 12px rgba(250, 130, 88, 0.2)"
                    }}>
                      <div style={{ fontSize: "15px", fontWeight: 900, color: "#c2410c" }}>12개월</div>
                      <div style={{ fontSize: "13px", color: "#c2410c", fontWeight: 800, marginTop: "3px" }}>15% 특별할인</div>
                      <div style={{ fontSize: "11.5px", color: "#c2410c", fontWeight: 700, marginTop: "3px" }}>최대 혜택 🔥</div>
                    </div>
                  </div>

                  <p style={{ margin: "12px 0 0 0", color: "#ea580c", fontSize: "13px", fontWeight: 700 }}>
                    ※ 납부 완료 즉시 월 20건 공실 등록 및 월 4건 뉴스 포털 정식 송고 권한이 부여됩니다.
                  </p>
                </div>
              </div>

            </div>

            {/* 하단 닫기/확인 버튼 */}
            <div style={{ marginTop: "26px" }}>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                style={{
                  width: "100%",
                  height: "52px",
                  backgroundColor: "#fa8258",
                  color: "#ffffff",
                  fontSize: "16px",
                  fontWeight: 800,
                  borderRadius: "12px",
                  border: "none",
                  cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(250, 130, 88, 0.35)",
                  transition: "all 0.15s ease"
                }}
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
