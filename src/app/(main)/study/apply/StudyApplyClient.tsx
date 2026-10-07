"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import StudyHeader, { STUDY_HERO_BAR } from "@/components/study/StudyHeader";
import StudyHero from "@/components/study/StudyHero";
import TypingText from "@/components/study/TypingText";

/** 히어로 [네이버결제] 버튼이 여는 결제 페이지 주소. 비어 있으면 '준비 중' 안내를 띄운다 */
const NAVER_PAY_URL = "";
import { createClient } from "@/utils/supabase/client";
import { submitStudyApplication, checkExistingStudyApplication } from "@/app/actions/studyApply";

const POINT = "#059669";
const POINT_DARK = "#047857";
const POINT_SOFT = "#ecfdf5";
const POINT_BORDER = "#a7f3d0";


const TARGET_AUDIENCE = [
  {
    tag: "RECOMMEND 01",
    title: "사무실/상가 전문 부동산",
    image: "/images/study/recommend_real_teheran_man.jpg",
    imageAlt: "강남 테헤란로를 걸으며 스마트폰으로 공실뉴스를 열람하는 전문 남성 공인중개사",
    description: "빠른 공실계약이 필요한 사무실/상가 전문 부동산 대표님!  고객에게 브리핑이 꼭! 필요할때~",
    solution: "AI 매매보고서 초안 10초 완성!~공실뉴스에서 공실만 등록하면, 빠르게 완성할 수 있습니다.",
  },
  {
    tag: "RECOMMEND 02",
    title: "아파트/오피스텔 입점 부동산",
    image: "/images/study/recommend_real_apartment.jpg",
    imageAlt: "아파트와 오피스텔 매물 브리핑을 진행하는 전문 여성 공인중개사",
    description: "단지 내 물건작업과 임장작업이 필수인 아파트/오피스텔 입점 부동산 대표님!~  차별화된 서비스를 고객에게 제공하고 싶을때~",
    solution: "물건접수웹페이지, 아파트/오피스텔 인테리어 예상AI서비스로 스마트하게 중개할 수 있습니다.",
  },
  {
    tag: "RECOMMEND 03",
    title: "빌라/주택 건물 부동산",
    image: "/images/study/recommend_real_villa.jpg",
    imageAlt: "신축 빌라와 주택 현장 영상 촬영 짐벌을 든 전문 공인중개사",
    description: "원룸·투룸 다가구부터 꼬마빌딩까지, 유튜브가 가장 효율적이라는데,,, 어떻게 촬영하고 편집해야 할지 막막한 대표님!",
    solution: "손님의 Call로 연결되는 유튜브 영상제작! 촬영방법부터 편집법까지! 따라만 하세요!",
  },
];

const RETURN_TO = "/study/apply";

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: "48px",
  padding: "0 16px",
  border: "1px solid #dfe2e6",
  borderRadius: "8px",
  fontSize: "14px",
  color: "#222",
  backgroundColor: "#fff",
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "inherit",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "13.5px",
  fontWeight: 700,
  color: "#1e293b",
  marginBottom: "8px",
};

export default function StudyApplyClient() {
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [kakaoLoading, setKakaoLoading] = useState(false);

  // 신청 모달 상태 (신청하기 클릭 시 화면 위에 뜸)
  const [showApplyModal, setShowApplyModal] = useState(false);

  // FAQ 아코디언 상태
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const [applicantName, setApplicantName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [agencyName, setAgencyName] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(true);

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
      } else {
        setErrorMsg(res.message || "신청 처리 중 오류가 발생했습니다.");
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "서버 통신 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  // ━━━ 이전 디자인: 시중 실무교육 vs 공실스터디 비교 데이터 ━━━
  const rivalFeatures = [
    { on: true, text: "현실에 맞지 않는 이론 강의" },
    { on: true, text: "종이 교재 수십 권" },
    { on: false, text: '결국 "유튜브·블로그 꾸준히 하세요"로 끝' },
    { on: false, text: "콘텐츠 제작은 오롯이 내 몫" },
    { on: false, text: "내 매물에 바로 적용 불가" },
  ];

  const paidFeatures = [
    <><strong>공실스터디 멤버십 VOD + 교육자료</strong></>,
    <>수강 기간 : <strong style={{ color: POINT }}>1년(365일) 무제한 다시보기</strong></>,
    <><strong>공실등록 20건 무료</strong> (AI매매보고서 포함)</>,
    <><strong>기사작성 4건 매월</strong></>,
    <><strong>매물접수웹페이지 무료</strong></>,
    <><strong>블로그 포스팅 자동화 프로그램 무료</strong></>,
    <><strong>드론 영상 저작권 무료</strong></>,
  ];

  const valueStats = [
    { title: "공실 등록 월 20건", highlight: "무료 포함" },
    { title: "AI 매물보고서", highlight: "무제한 생성" },
    { title: "기사 등록 월 4건 포털 송고", highlight: "무료 포함" },
    { title: "뉴스 광고영업권 (최대 50%)", highlight: "권한 부여" },
  ];

  const faqs = [
    {
      q: "1년 36만원 외에 가입비나 교재비 등 추가 비용이 있나요?",
      a: "전혀 없습니다. 가입비 0원, 교재비 0원이며 1년 36만원(월 3만원꼴, VAT 포함)으로 1년 365일 모든 VOD 특강과 실무 자료, 프로그램을 무제한 이용하실 수 있습니다.",
    },
    {
      q: "언제부터 수강할 수 있고, 기간은 얼마나 되나요?",
      a: "상시 가입하여 즉시 수강을 시작할 수 있습니다. 가입한 날로부터 1년(365일) 동안 모든 VOD 강의를 무제한 시청하실 수 있으며, 매달 새로 업데이트되는 신규 특강도 추가 비용 없이 이용하실 수 있습니다.",
    },
    {
      q: "할부 결제가 가능한가요?",
      a: "네, 주요 카드사 무이자 할부(최대 12개월 등)를 지원하여 월 3만원대로 부담 없이 시작하실 수 있습니다.",
    },
    {
      q: "강의 자료와 계약서 양식, AI 프롬프트도 받을 수 있나요?",
      a: "네. 각 강의실의 [강의자료 다운로드] 탭과 공실뉴스 [자료실] 메뉴에서 한글(HWP), 엑셀, PDF 및 프롬프트 텍스트 원본을 횟수 제한 없이 다운로드하실 수 있습니다.",
    },
    {
      q: "세금계산서나 현금영수증 발행이 가능한가요?",
      a: "네. 결제 시 입력하신 사업자등록번호로 매월 전자세금계산서 또는 지출증빙 현금영수증이 자동 발행됩니다.",
    },
  ];

  return (
    <div style={{ backgroundColor: "#f8faf9", minHeight: "100vh", fontFamily: "'Pretendard Variable', -apple-system, sans-serif", display: "flex", flexDirection: "column" }}>
      <StudyHeader background={STUDY_HERO_BAR} />

      {/* ━━━ [1] 상단 심플 초록색 와이드 히어로 영역 (통일된 프리미엄 스터디 히어로) ━━━ */}
      <StudyHero
        title="멤버십신청"
        englishTitle="Membership"
        description="12개월 동안 공실을 등록하면서 내 블로그/유튜브 마케팅을 완성하실 수 있습니다!"
        tabs={[
          {
            label: "네이버결제",
            href: NAVER_PAY_URL || "#",
            onClick: () => {
              if (NAVER_PAY_URL) return;
              alert("네이버결제는 준비 중입니다. 신청하기로 접수해 주세요.");
            },
          },
          {
            label: "신청하기",
            isActive: true,
            onClick: () => setShowApplyModal(true),
          },
        ]}
      />

      {/* ━━━ [2] 하단: 이전 디자인 2개 비교창 (시중 실무교육 vs 공실스터디) ━━━ */}
      <main className="container px-20" style={{ maxWidth: "1200px", width: "100%", margin: "0 auto", padding: "60px 20px 40px", boxSizing: "border-box" }}>
        <div style={{ textAlign: "center", marginBottom: "44px" }}>
          <div
            style={{
              display: "inline-block",
              background: POINT_SOFT,
              color: POINT_DARK,
              fontSize: "13px",
              fontWeight: 800,
              padding: "6px 18px",
              borderRadius: "20px",
              marginBottom: "16px",
              border: `1px solid ${POINT_BORDER}`,
            }}
          >
            수백만 원짜리 교육비, 이제 그만
          </div>
          <h2
            style={{
              fontSize: "36px",
              fontWeight: 900,
              color: "#0f2e28",
              letterSpacing: "-1px",
              margin: "0 0 14px 0",
              lineHeight: 1.3,
            }}
          >
            공실등록 + 유튜브/블로그 실습<br />
            월 <span style={{ color: POINT }}>3만원</span>이면 OK!
          </h2>
          <p style={{ fontSize: "16px", color: "#64748b", margin: 0 }}>
            12개월 동안 블로그 포스팅, 유튜브 채널! 확실하게 구축하실 수 있습니다.
          </p>
        </div>

        {/* 2개 비교창 그리드 */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "30px",
            alignItems: "stretch",
            textAlign: "left",
            marginBottom: "70px",
          }}
        >
          {/* 카드 1. 시중 실무교육 (오프라인 아카데미) */}
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "20px",
              padding: "42px 34px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              boxShadow: "0 4px 16px rgba(0,0,0,0.03)",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <h3 style={{ fontSize: "24px", fontWeight: 900, color: "#334155", margin: 0 }}>시중 실무교육</h3>
                <span style={{ fontSize: "12px", fontWeight: 700, background: "#f1f5f9", color: "#64748b", padding: "4px 10px", borderRadius: 20 }}>
                  오프라인 아카데미
                </span>
              </div>

              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: "38px", fontWeight: 900, color: "#1e293b", letterSpacing: "-1px" }}>
                  수백만 원
                  <span style={{ fontSize: "14px", fontWeight: 600, color: "#94a3b8", marginLeft: 6 }}>/ 12개월 일시불</span>
                </div>
                <p style={{ fontSize: "13px", color: "#94a3b8", margin: "6px 0 0" }}>
                  수백만원 결제, 불필요한 강의로 비용만 높아지는 오프라인 강의!!
                </p>
              </div>

              <div style={{ marginBottom: 28 }}>
                <div
                  style={{
                    width: "100%",
                    height: "50px",
                    background: "#f8fafc",
                    border: "1px dashed #cbd5e1",
                    borderRadius: "10px",
                    fontSize: "13.5px",
                    fontWeight: 700,
                    color: "#94a3b8",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0 10px",
                    textAlign: "center",
                    wordBreak: "keep-all",
                    boxSizing: "border-box",
                  }}
                >
                  강의 참여 때만 이해되고, 실무 활용 거의 불가!!
                </div>
              </div>

              <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 24 }}>
                <div style={{ fontSize: "12.5px", fontWeight: 800, color: "#64748b", marginBottom: 16 }}>
                  수백만 원을 내고 얻는 것
                </div>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 14, fontSize: "13.5px" }}>
                  {rivalFeatures.map((f, i) => (
                    <li key={i} style={{ display: "flex", alignItems: "center", gap: 10, color: f.on ? "#475569" : "#94a3b8" }}>
                      <span style={{ color: f.on ? POINT : "#cbd5e1", fontWeight: f.on ? 900 : 400 }}>{f.on ? "✓" : "✕"}</span>
                      <span style={f.on ? undefined : { textDecoration: "line-through" }}>{f.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* 카드 2. 공실스터디 (정회원 전용 플랜) */}
          <div
            style={{
              background: "#ffffff",
              border: `2.5px solid ${POINT}`,
              borderRadius: "20px",
              padding: "42px 34px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              boxShadow: "0 16px 44px rgba(5, 150, 105, 0.18)",
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: -14,
                left: "50%",
                transform: "translateX(-50%)",
                background: `linear-gradient(135deg, ${POINT} 0%, ${POINT_DARK} 100%)`,
                color: "#ffffff",
                padding: "5px 20px",
                borderRadius: "20px",
                fontSize: "12px",
                fontWeight: 900,
                boxShadow: "0 4px 12px rgba(5, 150, 105, 0.35)",
                letterSpacing: "-0.3px",
                whiteSpace: "nowrap",
              }}
            >
              🔥 강력 추천 · 1년 마스터마인드
            </div>

            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <h3 style={{ fontSize: "24px", fontWeight: 900, color: "#0f2e28", margin: 0 }}>공실스터디</h3>
                <span style={{ fontSize: "12px", fontWeight: 800, background: POINT_SOFT, color: POINT_DARK, padding: "4px 12px", borderRadius: 20 }}>
                  정회원 전용 플랜
                </span>
              </div>

              <div style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: "8px" }}>
                  <span style={{ fontSize: "40px", fontWeight: 900, color: "#0f2e28", letterSpacing: "-1.5px" }}>
                    36만원
                  </span>
                  <span style={{ fontSize: "15px", fontWeight: 700, color: "#64748b" }}>
                    / 1년 (12개월)
                  </span>
                  <span
                    style={{
                      fontSize: "13px",
                      fontWeight: 800,
                      color: POINT_DARK,
                      background: POINT_SOFT,
                      padding: "3px 10px",
                      borderRadius: "12px",
                      letterSpacing: "-0.3px",
                      border: `1px solid ${POINT_BORDER}`,
                    }}
                  >
                    월 3만원꼴
                  </span>
                </div>
                <p style={{ fontSize: "13px", color: POINT, fontWeight: 700, margin: "8px 0 0" }}>
                  가입비 0원 · 교재비 0원 · 카드 12개월 무이자 할부 가능
                </p>
              </div>

              <div style={{ marginBottom: 28 }}>
                <button
                  type="button"
                  onClick={() => setShowApplyModal(true)}
                  style={{
                    width: "100%",
                    height: "50px",
                    backgroundColor: POINT,
                    border: "none",
                    borderRadius: "10px",
                    fontSize: "15.5px",
                    fontWeight: 800,
                    color: "#ffffff",
                    cursor: "pointer",
                    boxShadow: "0 4px 14px rgba(5, 150, 105, 0.35)",
                    transition: "all 0.2s ease",
                    fontFamily: "inherit",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = POINT_DARK)}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = POINT)}
                >
                  공실스터디 신청하기 ➔
                </button>
              </div>

              <div style={{ borderTop: `1px solid ${POINT_BORDER}`, paddingTop: 26 }}>
                <div style={{ fontSize: "14px", fontWeight: 900, color: "#0f2e28", marginBottom: 18 }}>
                  포함된 모든 전용 혜택
                </div>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 16, fontSize: "15px" }}>
                  {paidFeatures.map((f, i) => (
                    <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, color: "#0f2e28", lineHeight: 1.5 }}>
                      <span style={{ color: POINT, fontSize: "18px", fontWeight: 900, lineHeight: 1, marginTop: "2px" }}>✓</span>
                      <span style={{ wordBreak: "keep-all" }}>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* ━━━ [3] 이런 부동산에게 추천합니다! ━━━ */}
        <section style={{ backgroundColor: "#f0fdf9", borderRadius: "24px", padding: "64px 32px", border: "1px solid #d1fae5", marginBottom: "68px", textAlign: "center" }}>
          <div style={{ maxWidth: 840, margin: "0 auto 44px" }}>
            <div style={{ color: POINT, fontSize: "13px", fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase", marginBottom: "8px" }}>
              RECOMMENDATION
            </div>
            <h2 style={{ fontSize: "30px", fontWeight: 900, color: "#0f2e28", margin: "0 0 12px 0", letterSpacing: "-0.8px" }}>
              이런 부동산에게 추천합니다!
            </h2>
            <p style={{ fontSize: "15px", color: "#64748b", margin: 0, lineHeight: 1.6 }}>
              바쁜 1~2인, 지역/단지 부동산 대표님에게 추천합니다.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "24px",
              maxWidth: 1040,
              margin: "0 auto",
              textAlign: "left",
            }}
          >
            {TARGET_AUDIENCE.map((item) => (
              <div
                key={item.title}
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: "20px",
                  padding: "24px 20px",
                  border: "1.5px solid #a7f3d0",
                  boxShadow: "0 10px 25px rgba(5, 150, 105, 0.06)",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {/* 실사 이미지 썸네일 */}
                <div
                  style={{
                    position: "relative",
                    width: "100%",
                    height: "220px",
                    borderRadius: "14px",
                    overflow: "hidden",
                    marginBottom: "18px",
                    backgroundColor: "#e2e8f0",
                  }}
                >
                  <Image
                    src={item.image}
                    alt={item.imageAlt}
                    fill
                    style={{ objectFit: "cover", objectPosition: "center top" }}
                  />
                </div>

                {/* 태그 배지 */}
                <span
                  style={{
                    display: "inline-block",
                    alignSelf: "flex-start",
                    backgroundColor: "#ecfdf5",
                    color: POINT,
                    border: "1px solid #a7f3d0",
                    fontSize: "12px",
                    fontWeight: 800,
                    padding: "3px 10px",
                    borderRadius: "20px",
                    marginBottom: "12px",
                  }}
                >
                  {item.tag}
                </span>

                {/* 제목 */}
                <h3
                  style={{
                    fontSize: "19px",
                    fontWeight: 900,
                    color: "#0f2e28",
                    margin: "0 0 10px 0",
                    letterSpacing: "-0.3px",
                  }}
                >
                  {item.title}
                </h3>

                {/* 본문 설명 */}
                <p
                  style={{
                    fontSize: "14px",
                    color: "#475569",
                    lineHeight: 1.65,
                    margin: "0 0 18px 0",
                    flex: 1,
                  }}
                >
                  {item.description}
                </p>

                {/* 맞춤 솔루션 배지 박스 */}
                <div
                  style={{
                    backgroundColor: "#f0fdf4",
                    border: "1px solid #bbf7d0",
                    borderRadius: "10px",
                    padding: "12px 14px",
                  }}
                >
                  <div style={{ fontSize: "12px", fontWeight: 800, color: POINT, marginBottom: "4px" }}>
                    💡 맞춤 솔루션
                  </div>
                  <div style={{ fontSize: "13px", color: "#166534", lineHeight: 1.55, fontWeight: 600 }}>
                    {item.solution}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ━━━ [4] 자주하는 질문 (FAQ 아코디언) ━━━ */}
        <section style={{ maxWidth: "840px", margin: "0 auto 80px" }}>
          <div style={{ textAlign: "center", marginBottom: "36px" }}>
            <div style={{ display: "inline-block", background: POINT_SOFT, color: POINT_DARK, fontSize: "12.5px", fontWeight: 800, padding: "4px 14px", borderRadius: "16px", marginBottom: "10px" }}>
              FAQ
            </div>
            <h2 style={{ fontSize: "26px", fontWeight: 900, color: "#0f172a", margin: "0 0 8px 0" }}>
              자주 묻는 질문
            </h2>
            <p style={{ fontSize: "14.5px", color: "#64748b", margin: 0 }}>
              멤버십 가입과 수강 방식에 대해 가장 자주 문의하시는 내용입니다.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: "14px",
                    overflow: "hidden",
                    backgroundColor: "#ffffff",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    style={{
                      width: "100%",
                      padding: "20px 24px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "left",
                      fontSize: "15.5px",
                      fontWeight: 800,
                      color: isOpen ? POINT : "#1e293b",
                      fontFamily: "inherit",
                    }}
                  >
                    <span>Q. {faq.q}</span>
                    <span style={{ fontSize: "18px", transition: "transform 0.2s ease", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", color: isOpen ? POINT : "#94a3b8" }}>
                      ▾
                    </span>
                  </button>
                  {isOpen && (
                    <div
                      style={{
                        padding: "0 24px 22px 24px",
                        fontSize: "14.5px",
                        color: "#475569",
                        lineHeight: 1.7,
                        borderTop: "1px solid #f1f5f9",
                        wordBreak: "keep-all",
                      }}
                    >
                      A. {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </main>

      <footer style={{ padding: "30px 16px 50px", textAlign: "center", fontSize: "13px", color: "#888", borderTop: "1px solid #eef2f0", backgroundColor: "#ffffff" }}>
        <p style={{ fontWeight: 700, color: "#475569", margin: "0 0 6px" }}>공실뉴스 | 공실스터디</p>
        <p style={{ margin: 0 }}>고객센터: 1555-5343 (평일 10:00 ~ 18:00) · 이메일: gongsilnews@gmail.com</p>
      </footer>

      {/* ━━━ [5] 신청하기 클릭 시 화면 위에 뜨는 신청 모달 (사용자 요청) ━━━ */}
      {showApplyModal && (
        <div
          onClick={() => setShowApplyModal(false)}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            zIndex: 9999,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "24px",
              width: "100%",
              maxWidth: "520px",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "36px 32px",
              boxShadow: "0 25px 60px rgba(0, 0, 0, 0.3)",
              position: "relative",
              boxSizing: "border-box",
            }}
          >
            {/* 닫기 버튼 */}
            <button
              type="button"
              onClick={() => setShowApplyModal(false)}
              style={{
                position: "absolute",
                top: "20px",
                right: "20px",
                width: "36px",
                height: "36px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#f1f5f9",
                border: "none",
                borderRadius: "50%",
                fontSize: "18px",
                color: "#64748b",
                cursor: "pointer",
              }}
            >
              ✕
            </button>

            {authLoading ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: "#888", fontSize: "15px" }}>
                회원 정보를 확인하고 있습니다...
              </div>
            ) : submittedData ? (
              /* 신청 완료 카드 */
              <div style={{ textAlign: "center", padding: "10px 0" }}>
                <div style={{ width: "64px", height: "64px", backgroundColor: POINT_SOFT, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px", fontWeight: 900, color: POINT, margin: "0 auto 16px" }}>
                  ✓
                </div>
                <div style={{ display: "inline-block", backgroundColor: POINT_SOFT, color: POINT_DARK, fontSize: "12.5px", fontWeight: 800, padding: "4px 14px", borderRadius: "20px", marginBottom: "10px" }}>
                  신청 접수 완료
                </div>
                <h3 style={{ fontSize: "22px", fontWeight: 900, color: "#0f2e28", margin: "0 0 10px" }}>
                  멤버십 신청이 완료되었습니다
                </h3>
                <p style={{ fontSize: "14px", color: "#64748b", lineHeight: 1.6, margin: "0 0 24px" }}>
                  <strong style={{ color: "#222" }}>{submittedData.applicantName}</strong> 님, 신청서를 확인한 뒤<br />
                  <strong style={{ color: "#222" }}>1~2일 이내</strong> 담당자가 연락드리겠습니다.
                </p>

                <div style={{ backgroundColor: "#f8faf9", borderRadius: "12px", border: "1px solid #e7efeb", padding: "16px 20px", textAlign: "left", marginBottom: "24px", fontSize: "13.5px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #eef2f0" }}>
                    <span style={{ color: "#888" }}>신청자</span>
                    <span style={{ fontWeight: 700 }}>{submittedData.applicantName}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #eef2f0" }}>
                    <span style={{ color: "#888" }}>연락처</span>
                    <span style={{ fontWeight: 700 }}>{submittedData.phone}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #eef2f0" }}>
                    <span style={{ color: "#888" }}>금액</span>
                    <span style={{ fontWeight: 700, color: POINT }}>1년 360,000원 (VAT 포함)</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
                    <span style={{ color: "#888" }}>접수 확인 문자</span>
                    <span style={{ fontWeight: 700 }}>{submittedData.smsSent ? "발송 완료" : "순차 발송중"}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  style={{ width: "100%", height: "48px", backgroundColor: POINT, color: "#fff", border: "none", borderRadius: "10px", fontSize: "15px", fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}
                >
                  확인 완료
                </button>
              </div>
            ) : existingApplication ? (
              /* 이미 신청한 내역이 있는 경우 */
              <div style={{ textAlign: "center", padding: "10px 0" }}>
                <div style={{ width: "64px", height: "64px", backgroundColor: POINT_SOFT, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px", fontWeight: 900, color: POINT, margin: "0 auto 16px" }}>
                  ✓
                </div>
                <div style={{ display: "inline-block", backgroundColor: POINT_SOFT, color: POINT_DARK, fontSize: "12.5px", fontWeight: 800, padding: "4px 14px", borderRadius: "20px", marginBottom: "10px" }}>
                  이미 접수된 내역이 있습니다
                </div>
                <h3 style={{ fontSize: "22px", fontWeight: 900, color: "#0f2e28", margin: "0 0 10px" }}>
                  멤버십 신청서가 확인 중입니다
                </h3>
                <p style={{ fontSize: "14px", color: "#64748b", lineHeight: 1.6, margin: "0 0 24px" }}>
                  <strong style={{ color: "#222" }}>{existingApplication.applicant_name}</strong> 님의 신청서가 정상 접수되어<br />
                  담당자가 확인하고 있습니다. (중복 신청 불가)
                </p>

                <div style={{ backgroundColor: "#f8faf9", borderRadius: "12px", border: "1px solid #e7efeb", padding: "16px 20px", textAlign: "left", marginBottom: "24px", fontSize: "13.5px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #eef2f0" }}>
                    <span style={{ color: "#888" }}>신청자</span>
                    <span style={{ fontWeight: 700 }}>{existingApplication.applicant_name}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #eef2f0" }}>
                    <span style={{ color: "#888" }}>연락처</span>
                    <span style={{ fontWeight: 700 }}>{existingApplication.phone}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
                    <span style={{ color: "#888" }}>진행 상태</span>
                    <span style={{ fontWeight: 700, color: POINT }}>{existingApplication.status || "확인 중"}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  style={{ width: "100%", height: "48px", backgroundColor: POINT, color: "#fff", border: "none", borderRadius: "10px", fontSize: "15px", fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}
                >
                  창 닫기
                </button>
              </div>
            ) : !user ? (
              /* 미로그인 상태: 소셜 로그인 시작 */
              <div>
                <div style={{ textAlign: "center", marginBottom: "26px", marginTop: "8px" }}>
                  <div style={{ display: "inline-block", backgroundColor: POINT_SOFT, color: POINT_DARK, fontSize: "12px", fontWeight: 800, padding: "3px 12px", borderRadius: "16px", marginBottom: "8px" }}>
                    공실스터디 1년 무제한 패스
                  </div>
                  <h3 style={{ fontSize: "22px", fontWeight: 900, color: "#0f172a", margin: "0 0 8px", letterSpacing: "-0.5px" }}>
                    간편 로그인 후 바로 신청
                  </h3>
                  <p style={{ fontSize: "13.5px", color: "#64748b", margin: 0, lineHeight: 1.5 }}>
                    로그인하시면 성함과 연락처가 자동으로 입력되어 1초 만에 신청하실 수 있습니다.
                  </p>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "22px" }}>
                  <button
                    type="button"
                    onClick={() => handleOAuth("kakao")}
                    disabled={googleLoading || kakaoLoading}
                    style={{
                      width: "100%",
                      height: "52px",
                      backgroundColor: "#fee500",
                      color: "#191919",
                      border: "none",
                      borderRadius: "10px",
                      fontSize: "15px",
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "10px",
                      cursor: googleLoading || kakaoLoading ? "not-allowed" : "pointer",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
                      fontFamily: "inherit",
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="#191919">
                      <path d="M12 3C6.477 3 2 6.477 2 10.772c0 2.766 1.875 5.187 4.707 6.541-.207.76-.75 2.753-.86 3.18-.135.534.195.526.41.383.17-.113 2.684-1.823 3.757-2.556.643.092 1.307.142 1.986.142 5.523 0 10-3.477 10-7.772S17.523 3 12 3z" />
                    </svg>
                    <span>{kakaoLoading ? "로그인 중..." : "카카오로 3초 만에 시작하기"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOAuth("google")}
                    disabled={googleLoading || kakaoLoading}
                    style={{
                      width: "100%",
                      height: "52px",
                      backgroundColor: "#ffffff",
                      color: "#374151",
                      border: "1px solid #d1d5db",
                      borderRadius: "10px",
                      fontSize: "15px",
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "10px",
                      cursor: googleLoading || kakaoLoading ? "not-allowed" : "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span>{googleLoading ? "로그인 중..." : "Google 계정으로 계속하기"}</span>
                  </button>
                </div>

                <div style={{ textAlign: "center" }}>
                  <a href={`/login?returnTo=${encodeURIComponent(RETURN_TO)}`} style={{ fontSize: "13px", color: "#64748b", textDecoration: "none" }}>
                    기존 이메일/비밀번호로 로그인하기 ➔
                  </a>
                </div>
              </div>
            ) : (
              /* 로그인 상태: 멤버십 신청 폼 */
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: "20px", marginTop: "4px" }}>
                  <div style={{ display: "inline-block", backgroundColor: POINT_SOFT, color: POINT_DARK, fontSize: "12px", fontWeight: 800, padding: "3px 12px", borderRadius: "16px", marginBottom: "8px" }}>
                    공실스터디 1년 멤버십
                  </div>
                  <h3 style={{ fontSize: "22px", fontWeight: 900, color: "#0f172a", margin: "0 0 6px" }}>
                    멤버십 간편 신청
                  </h3>
                  <p style={{ fontSize: "13.5px", color: "#64748b", margin: 0 }}>
                    신청 정보를 확인하신 후 버튼을 눌러주세요.
                  </p>
                </div>

                {errorMsg && (
                  <div style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", padding: "10px 14px", borderRadius: "8px", fontSize: "13.5px", fontWeight: 700, marginBottom: "16px" }}>
                    ⚠️ {errorMsg}
                  </div>
                )}

                <div style={{ marginBottom: "14px" }}>
                  <label style={labelStyle}>신청자 성함 <span style={{ color: POINT }}>*</span></label>
                  <input
                    type="text"
                    required
                    value={applicantName}
                    onChange={(e) => setApplicantName(e.target.value)}
                    placeholder="신청자 성함을 입력해 주세요"
                    style={inputStyle}
                  />
                </div>

                <div style={{ marginBottom: "14px" }}>
                  <label style={labelStyle}>연락처 (휴대폰) <span style={{ color: POINT }}>*</span></label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="예) 01012345678"
                    style={inputStyle}
                  />
                </div>

                <div style={{ marginBottom: "14px" }}>
                  <label style={labelStyle}>이메일 주소</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@gmail.com"
                    style={inputStyle}
                  />
                </div>

                <div style={{ marginBottom: "16px" }}>
                  <label style={labelStyle}>중개업소 상호명 <span style={{ fontSize: "12px", color: "#888", fontWeight: 400 }}>(선택)</span></label>
                  <input
                    type="text"
                    value={agencyName}
                    onChange={(e) => setAgencyName(e.target.value)}
                    placeholder="예) 공실뉴스 공인중개사사무소"
                    style={inputStyle}
                  />
                </div>

                <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "10px 12px", fontSize: "12px", color: "#64748b", lineHeight: 1.5, marginBottom: "14px" }}>
                  • 수집 목적: 공실스터디 멤버십 신청 접수 및 안내 연락<br />
                  • 보유 기간: 신청일로부터 1년 또는 회원 탈퇴 시까지
                </div>

                <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13.5px", fontWeight: 600, color: "#1e293b", cursor: "pointer", marginBottom: "18px" }}>
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    style={{ width: "17px", height: "17px", accentColor: POINT }}
                  />
                  <span>개인정보 수집 및 이용에 동의합니다 (필수)</span>
                </label>

                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    width: "100%",
                    height: "52px",
                    backgroundColor: submitting ? "#6ee7b7" : POINT,
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "10px",
                    fontSize: "16px",
                    fontWeight: 800,
                    cursor: submitting ? "not-allowed" : "pointer",
                    fontFamily: "inherit",
                    boxShadow: "0 4px 14px rgba(5, 150, 105, 0.3)",
                    transition: "background-color 0.15s ease",
                  }}
                  onMouseEnter={(e) => { if (!submitting) e.currentTarget.style.backgroundColor = POINT_DARK; }}
                  onMouseLeave={(e) => { if (!submitting) e.currentTarget.style.backgroundColor = POINT; }}
                >
                  {submitting ? "신청 처리 중..." : "지금 멤버십 신청 완료하기 (1년 36만원)"}
                </button>

                <button
                  type="button"
                  onClick={() => setShowGuideModal(true)}
                  style={{
                    marginTop: "12px",
                    width: "100%",
                    height: "42px",
                    backgroundColor: "#ffffff",
                    border: `1px solid ${POINT_BORDER}`,
                    borderRadius: "8px",
                    fontSize: "13px",
                    fontWeight: 700,
                    color: POINT_DARK,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  💳 입금 계좌 및 결제 안내 보기
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ━━━ [6] 입금 및 결제 안내 팝업 ━━━ */}
      {showGuideModal && (
        <div
          onClick={() => setShowGuideModal(false)}
          style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px", zIndex: 10000 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ backgroundColor: "#ffffff", borderRadius: "20px", width: "100%", maxWidth: "480px", padding: "30px 26px", boxShadow: "0 25px 60px rgba(0,0,0,0.25)", position: "relative", boxSizing: "border-box" }}
          >
            <button
              type="button"
              onClick={() => setShowGuideModal(false)}
              style={{ position: "absolute", top: "18px", right: "18px", background: "none", border: "none", fontSize: "20px", color: "#94a3b8", cursor: "pointer" }}
            >
              ✕
            </button>
            <h3 style={{ fontSize: "19px", fontWeight: 900, color: "#0f172a", margin: "0 0 14px" }}>
              💳 입금 및 결제 안내
            </h3>

            <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "16px 18px", fontSize: "14px", lineHeight: 1.8, color: "#334155", marginBottom: "16px" }}>
              <div><strong>은행명:</strong> 우리은행</div>
              <div><strong>계좌번호:</strong> 1005-004-716838</div>
              <div><strong>예금주:</strong> (주)공실뉴스</div>
              <div><strong>금액:</strong> 360,000원 (VAT 포함)</div>
            </div>

            <p style={{ fontSize: "12.5px", color: "#64748b", lineHeight: 1.6, margin: "0 0 18px" }}>
              * 입금자명은 신청서에 작성하신 성함 또는 상호명으로 입금해 주시기 바랍니다.<br />
              * 카드 무이자 할부 결제를 원하실 경우 신청 후 안내 문자 링크를 통해 온라인 결제가 가능합니다.
            </p>

            <button
              type="button"
              onClick={() => setShowGuideModal(false)}
              style={{ width: "100%", height: "46px", backgroundColor: POINT, color: "#fff", border: "none", borderRadius: "10px", fontSize: "14.5px", fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}
            >
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
