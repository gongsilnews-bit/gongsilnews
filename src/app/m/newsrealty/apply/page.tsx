"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { submitNewsrealtyApplication } from "@/app/actions/newsrealtyApply";

export default function MobileNewsRealtyApplyPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

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

  // 접수 완료 화면
  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-[#f5f6f8] text-[#222] font-sans flex items-center justify-center p-4">
        <div className="max-w-[400px] w-full bg-white rounded-xl p-6 text-center shadow-xs border border-[#e5e8ec]">
          <div className="w-12 h-12 bg-[#fa7743]/10 text-[#fa7743] rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
            ✓
          </div>
          <h1 className="text-xl font-bold text-[#222] mb-1.5">
            회원가입 신청 완료
          </h1>
          <p className="text-xs text-[#666] leading-relaxed mb-5">
            <strong className="text-[#222]">{submittedData?.applicantName || submittedData?.agencyName}</strong> 님,<br />
            확인 후 <strong>1~2일 이내</strong> 전화드리겠습니다.
          </p>

          <div className="bg-[#f8f9fa] rounded-lg p-3.5 text-xs text-left mb-5 space-y-1.5 border border-[#edf0f2]">
            <div className="flex justify-between">
              <span className="text-[#888]">신청자</span>
              <span className="font-semibold text-[#222]">{submittedData?.applicantName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#888]">연락처</span>
              <span className="font-semibold text-[#222]">{submittedData?.phone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#888]">E-mail</span>
              <span className="font-semibold text-[#222]">{submittedData?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#888]">중개사무소</span>
              <span className="font-semibold text-[#222]">{submittedData?.agencyName}</span>
            </div>
            <div className="flex justify-between items-center pt-1.5 border-t border-[#e5e8ec]">
              <span className="text-[#888]">접수 문자</span>
              <span className="text-[10.5px] px-1.5 py-0.5 rounded font-bold bg-[#e6fcf5] text-[#0ca678]">
                {submittedData?.smsSent ? "발송 완료" : "순차 발송중"}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Link
              href="/m/newsrealty"
              className="block w-full py-2.5 rounded-lg bg-white border border-[#dfe2e6] text-[#444] text-xs font-semibold text-center"
            >
              소개 홈으로
            </Link>
            <Link
              href="/m"
              className="block w-full py-2.5 rounded-lg bg-[#fa7743] text-white text-xs font-bold text-center shadow-2xs"
            >
              공실뉴스 메인으로
            </Link>
          </div>
        </div>
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
            className="mt-4 w-full py-2.5 px-3 bg-white border border-[#dfe2e6] rounded-md text-xs font-semibold text-[#495057] shadow-2xs text-center cursor-pointer"
          >
            회원가입 절차와 필요한 서류가 궁금해요
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

      {/* ━━━ 직방 스타일: 회원가입 절차 가이드 모달 ━━━ */}
      {showGuideModal && (
        <div
          onClick={() => setShowGuideModal(false)}
          className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-xl max-w-sm w-full p-5 shadow-2xl relative"
          >
            <h3 className="text-[16px] font-bold text-[#1a1a1a] mb-4 tracking-tight">
              회원가입 절차 가이드
            </h3>

            <div>
              {/* 1단계 */}
              <div className="mb-4">
                <div className="bg-[#f4f6f8] rounded-lg py-2 px-3 flex items-center gap-2">
                  <span className="text-xs">📝</span>
                  <span className="text-xs font-bold text-[#fa8258]">1단계 필수 정보 입력</span>
                </div>
                <div className="pt-2 px-1 text-[11px] text-[#666] leading-relaxed">
                  <p className="mb-1">원활한 상담을 위해 중개사무소 정보를 정확히 입력해 주세요.</p>
                  <ul className="text-[#777] text-[10.5px] space-y-0.5 pl-1">
                    <li>· 중개사무소명</li>
                    <li>· 대표 공인 중개사 휴대폰 번호와 이메일</li>
                    <li>· 주거래 매물 선택</li>
                  </ul>
                </div>
              </div>

              {/* 2단계 */}
              <div className="mb-4">
                <div className="bg-[#f4f6f8] rounded-lg py-2 px-3 flex items-center gap-2">
                  <span className="text-xs">👤</span>
                  <span className="text-xs font-bold text-[#fa8258]">2단계 가입신청 상담</span>
                </div>
                <div className="pt-2 px-1 text-[11px] text-[#666] leading-relaxed">
                  <p className="mb-0.5">담당 매니저가 가입 신청서를 확인하고 연락드려요.</p>
                  <p className="text-[#777] text-[10.5px]">· 최대 1~2 영업일 소요</p>
                </div>
              </div>

              {/* 3단계 */}
              <div className="mb-4">
                <div className="bg-[#f4f6f8] rounded-lg py-2 px-3 flex items-center gap-2">
                  <span className="text-xs">📋</span>
                  <span className="text-xs font-bold text-[#fa8258]">3단계 승인 심사 및 완료</span>
                </div>
                <div className="pt-2 px-1 text-[11px] text-[#666] leading-relaxed">
                  <p>상담 후, 가입에 필요한 서류를 보내주시면 승인해드려요.</p>
                  <p className="mb-1.5">결과는 카카오톡으로 보내드립니다.</p>
                  <div className="space-y-1 text-[10.5px] text-[#444] font-medium">
                    <div>📄 사업자 등록증</div>
                    <div>🏢 중개사무소 등록증</div>
                    <div>🖼️ 프로필 사진</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                style={{ backgroundColor: "#fa8258" }}
                className="px-5 py-1.5 text-white font-bold text-xs rounded-md shadow-xs cursor-pointer"
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
