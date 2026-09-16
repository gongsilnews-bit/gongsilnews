"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { submitNewsrealtyApplication } from "@/app/actions/newsrealtyApply";

export default function MobileNewsRealtyApplyPage() {
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
      <div className="min-h-screen bg-[#f7f8f9] font-sans">
        {/* 헤더 */}
        <header className="sticky top-0 z-30 bg-white border-b border-[#eef0f2] px-4 py-3.5 flex items-center justify-between">
          <Link href="/m/newsrealty" className="text-[#444] text-sm font-semibold flex items-center gap-1">‹ 뒤로</Link>
          <Link href="/m/newsrealty" className="font-bold text-[16px] text-[#222] tracking-tight no-underline">공실뉴스부동산</Link>
          <div className="w-8" />
        </header>

        <main className="px-5 py-10 flex flex-col items-center">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-[#eaedf0] p-8 text-center">
            {/* 아이콘 */}
            <div className="w-16 h-16 bg-[#fff2e8] rounded-full flex items-center justify-center text-3xl mx-auto mb-5">🏠</div>

            <span className="inline-block bg-[#fff2e8] text-[#ea580c] text-[11px] font-bold px-3 py-1 rounded-full mb-3">
              공실뉴스부동산 Pro 입점 신청
            </span>

            <h1 className="text-[22px] font-black text-[#1a1a1a] mb-3 leading-snug" style={{ wordBreak: "keep-all" }}>
              로그인 후<br />신청하실 수 있어요
            </h1>
            <p className="text-[13.5px] text-[#64748b] leading-relaxed mb-7" style={{ wordBreak: "keep-all" }}>
              공실뉴스부동산 Pro 파트너 입점 신청은<br />
              <strong className="text-[#333]">공실뉴스 회원</strong>만 가능합니다.<br />
              아직 회원이 아니시면 지금 가입해 보세요!
            </p>

            {/* 버튼 그룹 */}
            <div className="space-y-3">
              <a
                href="/signup"
                className="block w-full h-12 leading-[48px] rounded-xl text-white text-[15px] font-black text-center no-underline shadow-md"
                style={{ backgroundColor: "#fa8258", boxShadow: "0 4px 14px rgba(250,130,88,0.35)" }}
              >
                회원가입 하러 가기
              </a>
              <a
                href={`/login?returnTo=${encodeURIComponent("/m/newsrealty/apply")}`}
                className="block w-full h-12 leading-[48px] rounded-xl text-[#444] text-[14px] font-bold text-center no-underline border border-[#dfe2e6] bg-white"
              >
                이미 회원이신가요? 로그인
              </a>
            </div>

            {/* 절차 안내 링크 */}
            <div className="mt-6 pt-5 border-t border-[#f0f2f5]">
              <button
                type="button"
                onClick={() => setShowGuideModal(true)}
                className="text-[#fa8258] text-[13px] font-bold underline cursor-pointer bg-transparent border-none"
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
                    <span className="bg-[#fa8258] text-white text-[11px] font-bold px-2 py-0.5 rounded-md">1단계</span>
                    <span className="text-[14px] font-bold text-[#1e293b]">회원가입 및 중개업소 등록</span>
                  </div>
                  <p className="text-[12.5px] text-[#475569] leading-relaxed mb-2.5">
                    • 공실뉴스 포털에서 기본 부동산 회원가입 진행<br />
                    • 대표 공인중개사 및 소속 중개사무소 정보 등록
                  </p>
                  <a href="/login?returnTo=%2Fsignup" className="inline-flex items-center justify-center w-full py-2.5 px-3 bg-[#fa8258] text-white text-[13px] font-bold rounded-lg shadow-xs no-underline">
                    회원가입 / 로그인 바로가기 ➔
                  </a>
                </div>
                <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-3.5">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="bg-[#fa8258] text-white text-[11px] font-bold px-2 py-0.5 rounded-md">2단계</span>
                    <span className="text-[14px] font-bold text-[#1e293b]">신청하기</span>
                  </div>
                  <p className="text-[12.5px] text-[#475569] leading-relaxed m-0">
                    • <strong>로그인 상태</strong>에서 입점 신청서 제출<br />
                    • 성함, 연락처, 사무소 확인 후 원클릭 신청 완료
                  </p>
                </div>
                <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-3.5">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="bg-[#fa8258] text-white text-[11px] font-bold px-2 py-0.5 rounded-md">3단계</span>
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
                    <div className="bg-[#fff7ed] border border-[#fa8258] rounded-lg py-2 px-1 shadow-2xs">
                      <div className="text-[12px] font-black text-[#c2410c]">12개월</div>
                      <div className="text-[11px] font-black text-[#c2410c]">15% 할인 🔥</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <button type="button" onClick={() => setShowGuideModal(false)} style={{ backgroundColor: "#fa8258" }} className="w-full h-11 text-white font-bold text-[14.5px] rounded-xl shadow-md cursor-pointer flex items-center justify-center">
                  확인 및 닫기
                </button>
              </div>
            </div>
          </div>
        )}
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
              fontSize: "24px", fontWeight: 900, color: "#fa8258",
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
                style={{ display: "block", height: "46px", lineHeight: "46px", borderRadius: "10px", backgroundColor: "#fa8258", color: "#fff", fontSize: "13px", fontWeight: 800, textDecoration: "none", textAlign: "center", boxShadow: "0 4px 12px rgba(250,130,88,0.3)" }}
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
    <div className="min-h-screen bg-white text-[#222] pb-24 font-sans">
      {/* ── 직방 CEO 스타일 상단 헤더 ── */}
      <header className="sticky top-0 z-30 bg-white border-b border-[#eef0f2] px-4 py-3.5 flex items-center justify-between">
        <Link href="/m/newsrealty" className="text-[#444] text-sm font-semibold flex items-center gap-1">
          ‹ 뒤로
        </Link>
        <Link href="/m/newsrealty" className="font-bold text-[16px] text-[#222] tracking-tight no-underline">
          공실뉴스 | 공실뉴스부동산
        </Link>
        <div className="w-8" />
      </header>

      <main className="px-5 py-6">
        {/* 헤드라인 */}
        <div className="mb-4">
          <h1 className="text-[24px] font-extrabold text-[#1f2328] leading-tight" style={{ wordBreak: "keep-all" }}>
            내 지역/단지<br />
            로컬 부동산 기자가 되세요!
            <div className="text-[16px] font-bold text-[#fa8258] mt-2">
              부동산중개 + 지역부동산기자
            </div>
          </h1>
        </div>

        {/* 좌측/상단 앱 목업 이미지 */}
        <div className="mb-5 text-center">
          <img
            src="/newsrealty_mockup@2x.png"
            alt="공실뉴스부동산 모바일 앱 화면"
            className="max-w-[240px] w-full h-auto inline-block drop-shadow-md rounded-xl"
          />
        </div>

        {/* 안내 카드 */}
        <div className="bg-[#f8f9fa] border border-[#f1f3f5] rounded-xl p-4 mb-6">
          <ul className="space-y-2.5 text-xs text-[#495057] leading-relaxed">
            <li className="flex items-start gap-1.5">
              <span className="text-[#adb5bd] mt-0.5">•</span>
              <span>국가 공간 정보 포털의 부동산중개업 정보에 등록된 <strong>대표 공인중개사</strong>만 회원가입이 가능해요.</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-[#adb5bd] mt-0.5">•</span>
              <span>회원가입신청 시 <strong>1~2일 이내</strong> 전화드려요.</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-[#adb5bd] mt-0.5">•</span>
              <span>문의는 <strong>1555-5343</strong> (평일 오전 10시 ~ 오후 6시)로 연락해 주세요.</span>
            </li>
          </ul>

          <button
            type="button"
            onClick={() => setShowGuideModal(true)}
            className="mt-4 w-full py-3 px-3 bg-white border border-[#fa8258] rounded-lg text-[13px] font-bold text-[#ea580c] shadow-2xs text-center cursor-pointer flex items-center justify-center gap-1.5"
          >
            📋 회원가입 및 이용 절차가 궁금해요
          </button>
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 1. 신청자 */}
          <div>
            <label className="block text-xs font-semibold text-[#222] mb-1.5">
              신청자 <span className="text-[#fa8258]">*</span>
            </label>
            <input
              type="text"
              required
              value={applicantName}
              onChange={(e) => setApplicantName(e.target.value)}
              placeholder="신청자 성함을 입력해 주세요"
              className="w-full h-11 px-3.5 rounded-md border border-[#dfe2e6] text-xs text-[#222] placeholder-[#aaa] outline-none focus:border-[#fa8258] transition"
            />
          </div>

          {/* 2. 연락처 */}
          <div>
            <label className="block text-xs font-semibold text-[#222] mb-1.5">
              연락처 <span className="text-[#fa8258]">*</span>
            </label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="예) 01098765432"
              className="w-full h-11 px-3.5 rounded-md border border-[#dfe2e6] text-xs text-[#222] placeholder-[#aaa] outline-none focus:border-[#fa8258] transition"
            />
          </div>

          {/* 3. E-mail */}
          <div>
            <label className="block text-xs font-semibold text-[#222] mb-1.5">
              E-mail <span className="text-[#fa8258]">*</span> <span className="text-[#888] font-normal text-[11px]">(가입 후 아이디로 이용돼요)</span>
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                required
                value={emailLocal}
                onChange={(e) => setEmailLocal(e.target.value)}
                placeholder="이메일"
                className="flex-1 h-11 px-3 rounded-md border border-[#dfe2e6] text-xs text-[#222] outline-none focus:border-[#fa8258]"
              />
              <span className="text-[#888] text-xs">@</span>
              {emailDomain === "direct" ? (
                <input
                  type="text"
                  required
                  value={customDomain}
                  onChange={(e) => setCustomDomain(e.target.value)}
                  placeholder="도메인"
                  className="w-24 h-11 px-2 rounded-md border border-[#dfe2e6] text-xs outline-none focus:border-[#fa8258]"
                />
              ) : null}
              <select
                value={emailDomain}
                onChange={(e) => setEmailDomain(e.target.value)}
                className="w-24 h-11 px-1.5 rounded-md border border-[#dfe2e6] text-xs text-[#555] bg-white outline-none focus:border-[#fa8258]"
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
            <label className="block text-xs font-semibold text-[#222] mb-1.5">
              중개사무소 <span className="text-[#fa8258]">*</span>
            </label>
            <input
              type="text"
              required
              value={agencyName}
              onChange={(e) => setAgencyName(e.target.value)}
              placeholder="중개사무소 명칭을 입력해 주세요"
              className="w-full h-11 px-3.5 rounded-md border border-[#dfe2e6] text-xs text-[#222] placeholder-[#aaa] outline-none focus:border-[#fa8258] transition"
            />
          </div>

          {/* 5. 회원가입 약관 전체 동의 하기 */}
          <div className="pt-2">
            <div className="border border-[#dfe2e6] rounded-lg p-3.5 bg-white">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs font-semibold text-[#222] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    style={{ accentColor: "#fa8258" }}
                    className="w-4 h-4 rounded border-[#ccc]"
                  />
                  회원가입 약관 전체 동의 하기
                </label>
                <button
                  type="button"
                  onClick={() => setTermsAccordionOpen(!termsAccordionOpen)}
                  className="text-[#888] text-xs p-1"
                >
                  {termsAccordionOpen ? "▲" : "▼"}
                </button>
              </div>
              <p className="text-[11px] text-[#888] pl-6 mt-1">
                약관의 효력은 회원가입 절차가 완료된 후 적용됩니다.
              </p>
              {termsAccordionOpen && (
                <div className="mt-2.5 pt-2.5 border-t border-[#f1f3f5] text-[11px] text-[#666] pl-6 space-y-1">
                  <p>• 수집 목적: 공실뉴스 공인중개사 회원가입 심사</p>
                  <p>• 항목: 신청자 성명, 연락처, E-mail, 중개사무소 정보</p>
                </div>
              )}
            </div>
          </div>

          {/* 에러 메시지 */}
          {errorMsg && (
            <div className="p-2.5 rounded-md bg-[#fff5f5] border border-[#ffc9c9] text-xs font-bold text-[#e03131]">
              ⚠️ {errorMsg}
            </div>
          )}

          {/* 하단 고정 직방 시그니처 코랄 오렌지 버튼 */}
          <div className="fixed bottom-0 left-0 right-0 p-3 bg-white/95 backdrop-blur-xs border-t border-[#eef0f2] z-40">
            <button
              type="submit"
              disabled={submitting}
              style={{ backgroundColor: "#fa8258" }}
              className="w-full h-[52px] rounded-lg text-white font-bold text-[15px] shadow-sm flex items-center justify-center disabled:opacity-50 tracking-tight cursor-pointer"
            >
              {submitting ? "처리 중..." : "공실뉴스부동산 신청하기"}
            </button>
          </div>
        </form>
      </main>

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
                  <span className="bg-[#fa8258] text-white text-[11px] font-bold px-2 py-0.5 rounded-md">
                    1단계
                  </span>
                  <span className="text-[14px] font-bold text-[#1e293b]">
                    회원가입 및 중개업소 등록
                  </span>
                </div>
                <p className="text-[12.5px] text-[#475569] leading-relaxed mb-2.5">
                  • 공실뉴스 포털에서 기본 부동산 회원가입 진행<br />
                  • 대표 공인중개사 및 소속 중개사무소 정보 등록
                </p>
                <a
                  href="/login?returnTo=%2Fsignup"
                  className="inline-flex items-center justify-center w-full py-2.5 px-3 bg-[#fa8258] text-white text-[13px] font-bold rounded-lg shadow-xs no-underline"
                >
                  회원가입 / 로그인 바로가기 ➔
                </a>
              </div>

              {/* 2단계 */}
              <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-3.5">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="bg-[#fa8258] text-white text-[11px] font-bold px-2 py-0.5 rounded-md">
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
                  <span className="bg-[#fa8258] text-white text-[11px] font-bold px-2 py-0.5 rounded-md">
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
                  <div className="bg-[#fff7ed] border border-[#fa8258] rounded-lg py-2 px-1 shadow-2xs">
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
                style={{ backgroundColor: "#fa8258" }}
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
