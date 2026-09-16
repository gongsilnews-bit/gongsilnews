"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { submitNewsrealtyApplication } from "@/app/actions/newsrealtyApply";

const AD_PRODUCTS = [
  { id: "아파트", label: "아파트 광고 상품을 이용하고 싶어요." },
  { id: "원룸/빌라/오피스텔", label: "원룸/빌라/오피스텔 광고 상품을 이용하고 싶어요." },
  { id: "전체", label: "아파트 및 원룸/빌라/오피스텔 광고 상품을 모두 이용하고 싶어요." },
];

export default function NewsRealtyApplyPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  // 이메일 분리
  const [emailLocal, setEmailLocal] = useState("");
  const [emailDomain, setEmailDomain] = useState("");
  const [customDomain, setCustomDomain] = useState("");

  // 폼 상태 (직방 1:1)
  const [agencyName, setAgencyName] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("전체");
  const [referralCode, setReferralCode] = useState("");
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
        }
      } catch (err) {
        console.error("Error loading user info:", err);
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

    if (!agencyName.trim()) {
      setErrorMsg("중개사무소 정보를 입력해 주세요.");
      return;
    }
    if (!phone.trim()) {
      setErrorMsg("대표 공인중개사 휴대폰 번호를 입력해 주세요.");
      return;
    }
    if (!agreeTerms) {
      setErrorMsg("회원가입 약관에 동의해 주세요.");
      return;
    }

    const finalEmail = getFullEmail();

    setSubmitting(true);
    try {
      const res = await submitNewsrealtyApplication({
        memberId: user?.id,
        name: agencyName.trim(),
        phone: phone.trim(),
        email: finalEmail,
        agencyName: agencyName.trim(),
        interests: [selectedProduct, referralCode ? `추천인:${referralCode}` : ""].filter(Boolean),
        memo: `[직방형 접수] 상품: ${selectedProduct}${referralCode ? ` / 추천인: ${referralCode}` : ""}`,
      });

      if (res.success) {
        setSubmittedData({
          agencyName,
          phone,
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
  // 1. 접수 완료 화면
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-[#f5f6f8] text-[#222] font-sans flex items-center justify-center p-4">
        <div className="max-w-[480px] w-full bg-white rounded-xl p-8 sm:p-10 shadow-sm border border-[#e5e8ec] text-center">
          <div className="w-14 h-14 bg-[#fa7743]/10 text-[#fa7743] rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-5">
            ✓
          </div>
          <h1 className="text-2xl font-bold text-[#222] mb-2 tracking-tight">
            회원가입 신청이 완료되었습니다
          </h1>
          <p className="text-[#666] text-[13.5px] leading-relaxed mb-6">
            <strong className="text-[#222] font-semibold">{submittedData?.agencyName}</strong> 대표님,<br />
            가입 신청서를 확인 후 <strong>1~2일 이내</strong> 전화드리겠습니다.
          </p>

          <div className="bg-[#f8f9fa] rounded-lg p-4 text-left text-xs space-y-2 mb-6 border border-[#edf0f2]">
            <div className="flex justify-between">
              <span className="text-[#888]">중개사무소</span>
              <span className="font-semibold text-[#222]">{submittedData?.agencyName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#888]">휴대폰 번호</span>
              <span className="font-semibold text-[#222]">{submittedData?.phone}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-[#e5e8ec]">
              <span className="text-[#888]">접수 확인 문자</span>
              <span className="text-[11px] px-2 py-0.5 rounded font-bold bg-[#e6fcf5] text-[#0ca678]">
                {submittedData?.smsSent ? "발송 완료" : "순차 발송중"}
              </span>
            </div>
          </div>

          <div className="flex gap-2.5">
            <Link
              href="/newsrealty"
              className="flex-1 py-3 rounded-lg bg-white border border-[#dfe2e6] text-[#444] text-xs font-semibold hover:bg-[#f8f9fa] transition text-center"
            >
              소개 홈으로
            </Link>
            <Link
              href="/"
              className="flex-1 py-3 rounded-lg bg-[#fa8258] hover:bg-[#f36b36] text-white text-xs font-bold transition text-center shadow-2xs"
            >
              메인으로 이동
            </Link>
          </div>
        </div>
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
            <h1 style={{ fontSize: "32px", fontWeight: 700, color: "#1a1a1a", lineHeight: 1.35, letterSpacing: "-0.5px", marginBottom: "36px" }}>
              지역/단지 대표부동산을<br />
              모십니다.
            </h1>

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
                  height: "40px",
                  backgroundColor: "#ffffff",
                  border: "1px solid #d5d9de",
                  borderRadius: "6px",
                  fontSize: "12.5px",
                  fontWeight: 600,
                  color: "#333",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "background-color 0.15s"
                }}
              >
                회원가입 절차와 필요한 서류가 궁금해요
              </button>
            </div>
          </div>

          {/* ━━━ 우측 입력 폼 (Width: 460px) ━━━ */}
          <div style={{ width: "100%", maxWidth: "460px", flexShrink: 0 }}>
            <form onSubmit={handleSubmit}>

              {/* 1. 중개사무소 정보 */}
              <div style={{ marginBottom: "24px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#222", marginBottom: "8px" }}>
                  중개사무소 정보
                </label>
                <input
                  type="text"
                  required
                  value={agencyName}
                  onChange={(e) => setAgencyName(e.target.value)}
                  placeholder="중개사무소 이름, 대표자명, 주소를 조합 검색"
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

              {/* 2. 대표 공인중개사 휴대폰 번호 */}
              <div style={{ marginBottom: "24px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#222", marginBottom: "8px" }}>
                  대표 공인중개사 휴대폰 번호
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

              {/* 3. 대표 공인중개사 이메일 */}
              <div style={{ marginBottom: "24px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#222", marginBottom: "8px" }}>
                  대표 공인중개사 이메일 <span style={{ fontWeight: 400, fontSize: "12px", color: "#888" }}>(가입 후 아이디로 이용돼요.)</span>
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <input
                    type="text"
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

              {/* 4. 상담할 광고 상품 선택 */}
              <div style={{ marginBottom: "24px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#222", marginBottom: "12px" }}>
                  상담할 광고 상품 선택
                </label>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {AD_PRODUCTS.map((prod) => {
                    const isChecked = selectedProduct === prod.id;
                    return (
                      <label
                        key={prod.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          cursor: "pointer",
                          fontSize: "13px",
                          color: "#333",
                          userSelect: "none"
                        }}
                      >
                        <input
                          type="radio"
                          name="adProduct"
                          value={prod.id}
                          checked={isChecked}
                          onChange={() => setSelectedProduct(prod.id)}
                          style={{
                            width: "16px",
                            height: "16px",
                            accentColor: "#fa8258",
                            cursor: "pointer"
                          }}
                        />
                        <span style={{ fontWeight: isChecked ? 600 : 400, color: isChecked ? "#111" : "#444" }}>
                          {prod.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* 5. 회원가입 약관 전체 동의 하기 (아코디언 박스) */}
              <div style={{ marginBottom: "24px" }}>
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
                      <p>• 수집 항목: 중개사무소 정보, 대표자 성명, 휴대폰 번호, 이메일</p>
                      <p>• 보유 및 이용 기간: 회원 탈퇴 또는 법정 의무 보유 기간까지</p>
                    </div>
                  )}
                </div>

                <p style={{ fontSize: "11.5px", color: "#888", marginTop: "6px", paddingLeft: "4px" }}>
                  약관의 효력은 회원가입 절차가 완료된 후 적용됩니다.
                </p>
              </div>

              {/* 6. 추천인 코드 6자리 (선택) */}
              <div style={{ marginBottom: "28px" }}>
                <input
                  type="text"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value)}
                  placeholder="추천인 코드 6자리 (선택)"
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

      {/* ━━━ 직방 스타일: 회원가입 절차 가이드 모달 (1:1 동일) ━━━ */}
      {showGuideModal && (
        <div
          onClick={() => setShowGuideModal(false)}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
            zIndex: 9999
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "12px",
              width: "100%",
              maxWidth: "420px",
              padding: "26px 22px 20px 22px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
              position: "relative"
            }}
          >
            {/* 모달 타이틀 */}
            <h3 style={{ fontSize: "17px", fontWeight: 700, color: "#1a1a1a", marginBottom: "18px", letterSpacing: "-0.3px" }}>
              회원가입 절차 가이드
            </h3>

            <div>
              {/* 1단계 */}
              <div style={{ marginBottom: "18px" }}>
                <div style={{
                  backgroundColor: "#f4f6f8",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}>
                  <span style={{ fontSize: "14px" }}>📝</span>
                  <span style={{ fontSize: "13.5px", fontWeight: 700, color: "#fa8258" }}>1단계 필수 정보 입력</span>
                </div>
                <div style={{ padding: "10px 4px 0 6px", fontSize: "12px", color: "#666", lineHeight: 1.55 }}>
                  <p style={{ marginBottom: "6px" }}>원활한 상담을 위해 중개사무소 정보를 정확히 입력해 주세요.</p>
                  <ul style={{ color: "#777", fontSize: "11.5px", display: "flex", flexDirection: "column", gap: "2px", paddingLeft: "2px" }}>
                    <li>· 중개사무소명</li>
                    <li>· 대표 공인 중개사 휴대폰 번호와 이메일</li>
                    <li>· 주거래 매물 선택</li>
                  </ul>
                </div>
              </div>

              {/* 2단계 */}
              <div style={{ marginBottom: "18px" }}>
                <div style={{
                  backgroundColor: "#f4f6f8",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}>
                  <span style={{ fontSize: "14px" }}>👤</span>
                  <span style={{ fontSize: "13.5px", fontWeight: 700, color: "#fa8258" }}>2단계 가입신청 상담</span>
                </div>
                <div style={{ padding: "10px 4px 0 6px", fontSize: "12px", color: "#666", lineHeight: 1.55 }}>
                  <p style={{ marginBottom: "4px" }}>담당 매니저가 가입 신청서를 확인하고 연락드려요.</p>
                  <p style={{ color: "#777", fontSize: "11.5px" }}>· 최대 1~2 영업일 소요</p>
                </div>
              </div>

              {/* 3단계 */}
              <div style={{ marginBottom: "18px" }}>
                <div style={{
                  backgroundColor: "#f4f6f8",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}>
                  <span style={{ fontSize: "14px" }}>📋</span>
                  <span style={{ fontSize: "13.5px", fontWeight: 700, color: "#fa8258" }}>3단계 승인 심사 및 완료</span>
                </div>
                <div style={{ padding: "10px 4px 0 6px", fontSize: "12px", color: "#666", lineHeight: 1.55 }}>
                  <p>상담 후, 가입에 필요한 서류를 보내주시면 담당 매니저가 승인해드려요.</p>
                  <p style={{ marginBottom: "8px" }}>결과는 카카오톡으로 보내드립니다.</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "11.5px", color: "#444", fontWeight: 500 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span>📄</span>
                      <span>사업자 등록증</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span>🏢</span>
                      <span>중개사무소 등록증</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span>🖼️</span>
                      <span>프로필 사진</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 하단 우측 직방 스타일 주황색 확인 버튼 */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px" }}>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                style={{
                  padding: "7px 18px",
                  backgroundColor: "#fa8258",
                  color: "#ffffff",
                  fontSize: "12.5px",
                  fontWeight: 700,
                  borderRadius: "6px",
                  border: "none",
                  cursor: "pointer",
                  boxShadow: "0 1px 3px rgba(250, 130, 88, 0.3)"
                }}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
