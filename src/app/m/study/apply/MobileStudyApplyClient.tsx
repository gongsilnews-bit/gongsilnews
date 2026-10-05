"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import MobileTopBarHeader from "../../_components/MobileTopBarHeader";
import StudySubMenuBar from "../../_components/StudySubMenuBar";
import { createClient } from "@/utils/supabase/client";
import { submitStudyApplication, checkExistingStudyApplication } from "@/app/actions/studyApply";
import styles from "./mobileStudyApply.module.css";

const RETURN_TO = "/m/study/apply";

const TARGET_AUDIENCE = [
  {
    tag: "RECOMMEND 01",
    title: "사무실/상가 전문 부동산",
    image: "/images/study/recommend_real_teheran_man.jpg",
    imageAlt: "강남 테헤란로를 걸으며 스마트폰으로 공실뉴스를 열람하는 전문 남성 공인중개사",
    description: "사무실 임장하면서, 고객에서 빠르게 물건을 브리핑할때, 매물보고서, 홈페이지를 카톡/문자등 모바일로 쉽고 빠르게 전달합니다.",
    solution: "AI 매매보고서 초안 10초 완성!~공실뉴스에서 공실만 등록하면, 빠르게 완성할 수 있습니다.",
  },
  {
    tag: "RECOMMEND 02",
    title: "아파트/오피스텔 입점 부동산",
    image: "/images/study/recommend_real_apartment.jpg",
    imageAlt: "아파트와 오피스텔 매물 브리핑을 진행하는 전문 여성 공인중개사",
    description: "단지 내 급매물과 전월세 정보를 빠르게 블로그와 숏폼으로 제작하여 입주민과 외부 매수·임차 고객 문의를 선점합니다.",
    solution: "단지별 급매물 브리핑 보고서와 블로그 포스팅, 단지 투어 숏폼 영상이 즉시 자동 완성됩니다.",
  },
  {
    tag: "RECOMMEND 03",
    title: "빌라/주택 건물 부동산",
    image: "/images/study/recommend_real_villa.jpg",
    imageAlt: "신축 빌라와 주택 현장 영상 촬영 짐벌을 든 전문 공인중개사",
    description: "원룸·투룸 다가구부터 꼬마빌딩까지, 현장 영상 촬영 대본과 기사 발행으로 공실 해소와 공동중개 기회를 극대화합니다.",
    solution: "씬별 현장 촬영 대본과 전국 11만 부동산 실시간 공유로 빠른 공실 계약을 이끕니다.",
  },
];

const PREMIUM_BENEFITS = [
  {
    icon: "🎓",
    title: "1년 365일 전 강좌 VOD 무제한 시청",
    desc: "AI 영상 제작, 유튜브 채널 개설, 블로그 상위노출 등 스마트폰/PC 무제한 수강",
  },
  {
    icon: "🏢",
    title: "공실뉴스 공실 등록 월 20건 무료 포함",
    desc: "1년 총 240건 등록 가능 (직접 등록 시 건당 과금되는 정규 권한 기본 제공)",
  },
  {
    icon: "📰",
    title: "네이버·다음 포털 뉴스 기사 송고 월 4건",
    desc: "내 부동산과 추천 매물을 공실뉴스 기자단 명의로 포털 뉴스에 송고 (연 48건)",
  },
  {
    icon: "🤖",
    title: "AI 매물보고서 & 유튜브 쇼츠 대본 무제한",
    desc: "물건 등록 한 번으로 매물 브리핑 보고서와 유튜브 쇼츠 스크립트 원스톱 자동 생성",
  },
  {
    icon: "💼",
    title: "공실뉴스 광고영업권 (최대 50% 수수료) 부여",
    desc: "공실뉴스 배너 및 기사형 광고 유치 시 업계 최고 수준의 광고 수수료 수익 보장",
  },
  {
    icon: "📁",
    title: "실무 서식·계약서·AI 프롬프트 원본 무료 제공",
    desc: "현업 공인중개사가 검증한 특약 모음집, 엑셀 수식, 프롬프트 파일 횟수 무제한 다운로드",
  },
];

export default function MobileStudyApplyClient() {
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [kakaoLoading, setKakaoLoading] = useState(false);

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

  const scrollToApplyForm = () => {
    const el = document.getElementById("apply-form");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
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

  return (
    <div className={styles.container}>
      <MobileTopBarHeader activeTab="study" />
      <StudySubMenuBar activeMenu="apply" />

      {/* ━━━ [1] 상단 짙은 초록색 영역 (대표님 지정 레이아웃) ━━━ */}
      <section className={styles.hero}>
        <div className={styles.heroTopRow}>
          <div className={styles.badge}>
            <span>✓ 멤버십신청</span>
          </div>
          <button
            type="button"
            onClick={scrollToApplyForm}
            className={styles.heroQuickApplyBtn}
          >
            신청하기 &gt;&gt;
          </button>
        </div>

        <h1 className={styles.heroTitle}>
          월 3만원에 12개월 동안<br />
          <span className={styles.heroHighlight}>내 유튜브/블로그를 완성하세요!</span>
        </h1>

        <p className={styles.heroDesc}>
          공실등록 + 유튜브/블로그 실습 + 포털기사 송고까지 1년 무제한 실전 패키지
        </p>

        {/* 핵심 4대 혜택 칩 그리드 */}
        <div className={styles.heroTagsGrid}>
          <div className={styles.heroTagItem}>
            <span className={styles.heroTagCheck}>✓</span>
            <span>공실등록 20건 무료</span>
          </div>
          <div className={styles.heroTagItem}>
            <span className={styles.heroTagCheck}>✓</span>
            <span>기사 4건 포털 송고</span>
          </div>
          <div className={styles.heroTagItem}>
            <span className={styles.heroTagCheck}>✓</span>
            <span>365일 VOD 무제한</span>
          </div>
          <div className={styles.heroTagItem}>
            <span className={styles.heroTagCheck}>✓</span>
            <span>AI 자동화 툴 지원</span>
          </div>
        </div>
      </section>

      {/* ━━━ [2] 하단 금액 및 상세 혜택 안내 ━━━ */}
      <div className={styles.content}>
        <div className={styles.pricingCard}>
          <div className={styles.pricingHeader}>
            <span className={styles.pricingTag}>공실스터디 1년 무제한 패스</span>
            <span className={styles.zeroFeeNotice}>가입비 0원 · 교재비 0원</span>
          </div>

          <h2 className={styles.pricingTitle}>1년 정규 멤버십</h2>
          <p className={styles.pricingSub}>1년 365일 전 강좌 VOD + 공실등록 + AI 자동화 무제한</p>

          <div className={styles.priceBox}>
            <div className={styles.priceMonthlyWrap}>
              <span className={styles.priceMonthly}>월 30,000원</span>
              <span className={styles.priceUnit}> / 월</span>
            </div>
            <div className={styles.priceYearly}>
              1년 360,000원 <span style={{ fontSize: "11px", color: "#64748b" }}>(VAT 포함)</span>
            </div>
          </div>

          <h3 className={styles.benefitTitle}>
            <span>🎁 1년 멤버십에 모두 포함된 핵심 혜택</span>
          </h3>

          <div className={styles.benefitList}>
            {PREMIUM_BENEFITS.map((item, idx) => (
              <div key={idx} className={styles.benefitRow}>
                <span className={styles.benefitIcon}>{item.icon}</span>
                <div className={styles.benefitInfo}>
                  <div className={styles.benefitRowName}>{item.title}</div>
                  <div className={styles.benefitRowDesc}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ━━━ 이런 부동산에게 추천합니다! ━━━ */}
        <section
          aria-labelledby="m-apply-recommend-title"
          style={{
            background: "#f0fdf9",
            border: "1px solid #d1fae5",
            borderRadius: 18,
            padding: "28px 16px",
            margin: "20px 0",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <div style={{ color: "#059669", fontSize: 11.5, fontWeight: 800, letterSpacing: "1px", marginBottom: 6 }}>
              RECOMMENDATION
            </div>
            <h2 id="m-apply-recommend-title" style={{ fontSize: 21, fontWeight: 900, color: "#0f2e28", margin: "0 0 8px", letterSpacing: "-0.5px" }}>
              이런 부동산에게 추천합니다!
            </h2>
            <p style={{ fontSize: 13, color: "#64748b", margin: 0, lineHeight: 1.55, wordBreak: "keep-all" }}>
              바쁜 1~2인, 지역/단지 부동산 대표님에게 추천합니다.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {TARGET_AUDIENCE.map((item) => (
              <article
                key={item.title}
                style={{
                  background: "#ffffff",
                  borderRadius: 16,
                  border: "1.5px solid #a7f3d0",
                  boxShadow: "0 6px 18px rgba(5, 150, 105, 0.06)",
                  overflow: "hidden",
                }}
              >
                <div style={{ position: "relative", width: "100%", height: 190, background: "#e2e8f0" }}>
                  <Image
                    src={item.image}
                    alt={item.imageAlt}
                    fill
                    sizes="(max-width: 480px) 100vw, 448px"
                    style={{ objectFit: "cover", objectPosition: "center top" }}
                  />
                </div>
                <div style={{ padding: "16px 16px 18px" }}>
                  <span
                    style={{
                      display: "inline-block",
                      background: "#ecfdf5",
                      color: "#059669",
                      border: "1px solid #a7f3d0",
                      fontSize: 11,
                      fontWeight: 800,
                      padding: "2px 9px",
                      borderRadius: 20,
                      marginBottom: 8,
                    }}
                  >
                    {item.tag}
                  </span>
                  <h3 style={{ fontSize: 17, fontWeight: 900, color: "#0f2e28", margin: "0 0 6px" }}>{item.title}</h3>
                  <p style={{ fontSize: 13.5, color: "#475569", lineHeight: 1.6, margin: "0 0 12px", wordBreak: "keep-all" }}>
                    {item.description}
                  </p>
                  <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "10px 12px" }}>
                    <div style={{ fontSize: 11.5, fontWeight: 800, color: "#059669", marginBottom: 3 }}>💡 맞춤 솔루션</div>
                    <div style={{ fontSize: 12.5, color: "#166534", lineHeight: 1.5, fontWeight: 600, wordBreak: "keep-all" }}>
                      {item.solution}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* ━━━ [3] 원스톱 신청 폼 영역 ━━━ */}
        <div id="apply-form" className={styles.card}>
          {authLoading ? (
            <div style={{ textAlign: "center", padding: "40px 20px" }}>
              <p style={{ color: "#64748b" }}>회원 정보를 확인하고 있습니다...</p>
            </div>
          ) : !user ? (
            /* ━━━ 미로그인 상태: 간편 로그인 안내 ━━━ */
            <>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>간편 로그인 후 바로 신청</h2>
                <p className={styles.cardDesc}>
                  공실뉴스 계정으로 로그인하시면 성함과 연락처가 자동으로 입력되어 간편하게 신청됩니다.
                </p>
              </div>

              <div className={styles.oauthGroup}>
                <button
                  type="button"
                  onClick={() => handleOAuth("kakao")}
                  disabled={kakaoLoading}
                  className={styles.kakaoBtn}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="#191919">
                    <path d="M12 3C6.477 3 2 6.477 2 10.772c0 2.766 1.875 5.187 4.707 6.541-.207.76-.75 2.753-.86 3.18-.135.534.195.526.41.383.17-.113 2.684-1.823 3.757-2.556.643.092 1.307.142 1.986.142 5.523 0 10-3.477 10-7.772S17.523 3 12 3z" />
                  </svg>
                  <span>{kakaoLoading ? "로그인 중..." : "카카오로 3초 만에 시작하기"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOAuth("google")}
                  disabled={googleLoading}
                  className={styles.googleBtn}
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
            </>
          ) : submittedData ? (
            /* ━━━ 제출 완료 화면 ━━━ */
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "48px", marginBottom: "12px" }}>🎉</div>
              <h2 className={styles.cardTitle}>멤버십 신청이 접수되었습니다!</h2>
              <p className={styles.cardDesc} style={{ marginBottom: "20px" }}>
                담당자가 영업일 기준 1~2일 이내에 유선 또는 카카오톡으로 입금 및 결제 절차를 안내해 드립니다.
              </p>

              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "16px", textAlign: "left", fontSize: "13px", lineHeight: "1.7", marginBottom: "20px" }}>
                <div><strong>신청자:</strong> {submittedData.applicantName}</div>
                <div><strong>연락처:</strong> {submittedData.phone}</div>
                <div><strong>금액:</strong> 1년 360,000원 (월 3만원꼴, VAT 포함)</div>
                {submittedData.agencyName && <div><strong>중개업소:</strong> {submittedData.agencyName}</div>}
              </div>

              <Link href="/m/study" style={{
                display: "block",
                width: "100%",
                padding: "13px 0",
                background: "#059669",
                color: "#ffffff",
                borderRadius: "10px",
                fontWeight: 800,
                textDecoration: "none",
                fontSize: "14.5px"
              }}>
                특강 둘러보기
              </Link>
            </div>
          ) : existingApplication ? (
            /* ━━━ 기신청 회원 안내 ━━━ */
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "40px", marginBottom: "10px" }}>📋</div>
              <h2 className={styles.cardTitle}>이미 신청이 접수된 회원입니다</h2>
              <p className={styles.cardDesc} style={{ marginBottom: "16px" }}>
                신청일시: {new Date(existingApplication.created_at).toLocaleDateString("ko-KR")}<br />
                상태: <strong>{existingApplication.status || "대기중"}</strong>
              </p>
              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "14px", fontSize: "13px", color: "#475569", lineHeight: "1.6", marginBottom: "16px" }}>
                입금 또는 결제가 확인되는 대로 즉시 멤버십 권한이 부여됩니다.<br />
                문의: <strong>010-4781-0199</strong>
              </div>
              <Link href="/m/study" style={{
                display: "inline-block",
                padding: "10px 24px",
                background: "#059669",
                color: "#ffffff",
                borderRadius: "8px",
                fontWeight: 700,
                fontSize: "13.5px",
                textDecoration: "none"
              }}>
                특강 목록 보기
              </Link>
            </div>
          ) : (
            /* ━━━ 로그인 회원: 신청서 폼 ━━━ */
            <form onSubmit={handleSubmit}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>멤버십 간편 신청</h2>
                <p className={styles.cardDesc}>
                  정보 확인 후 신청해 주시면 담당자가 신속히 안내해 드립니다.
                </p>
              </div>

              {errorMsg && (
                <div style={{
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  color: "#dc2626",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  marginBottom: "16px",
                  fontWeight: 600,
                }}>
                  {errorMsg}
                </div>
              )}

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  신청자 성함 <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  type="text"
                  value={applicantName}
                  onChange={(e) => setApplicantName(e.target.value)}
                  placeholder="예: 홍길동"
                  className={styles.input}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  연락처 (휴대폰) <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="예: 010-1234-5678"
                  className={styles.input}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>이메일 주소</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="예: gongsil@example.com"
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>중개업소명 (상호)</label>
                <input
                  type="text"
                  value={agencyName}
                  onChange={(e) => setAgencyName(e.target.value)}
                  placeholder="예: 공실뉴스 공인중개사사무소"
                  className={styles.input}
                />
              </div>

              <div className={styles.termsBox}>
                <strong>[개인정보 수집 및 이용 안내]</strong><br />
                - 수집항목: 성명, 연락처, 이메일, 중개업소명<br />
                - 이용목적: 공실스터디 멤버십 신청 접수 및 안내 연락<br />
                - 보유기간: 신청일로부터 1년 또는 회원 탈퇴 시까지
              </div>

              <label className={styles.agreeLabel}>
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  style={{ width: "16px", height: "16px", accentColor: "#059669" }}
                />
                <span>개인정보 수집 및 이용에 동의합니다 (필수)</span>
              </label>

              <button
                type="submit"
                disabled={submitting}
                className={styles.submitBtn}
              >
                {submitting ? "신청 처리 중..." : "지금 멤버십 신청 완료하기 (1년 36만원)"}
              </button>

              <div className={styles.trustFootnote}>
                ✓ 사업자등록번호로 전자세금계산서 또는 현금영수증이 즉시 발행됩니다.<br />
                ✓ 신청 후 7일 이내 전액 환불을 보장합니다.
              </div>

              <button
                type="button"
                onClick={() => setShowGuideModal(true)}
                className={styles.guideBtn}
              >
                <span>🏦 입금 계좌 및 결제 안내 보기</span>
              </button>
            </form>
          )}
        </div>
      </div>

      {/* ━━━ 입금 안내 모달 ━━━ */}
      {showGuideModal && (
        <div className={styles.modalOverlay} onClick={() => setShowGuideModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setShowGuideModal(false)}
              className={styles.modalClose}
            >
              ✕
            </button>

            <h3 style={{ fontSize: "17px", fontWeight: 800, color: "#0f172a", margin: "0 0 14px" }}>
              💳 입금 및 결제 안내
            </h3>

            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "14px", fontSize: "13px", lineHeight: "1.7", color: "#334155", marginBottom: "16px" }}>
              <div><strong>은행명:</strong> 우리은행</div>
              <div><strong>계좌번호:</strong> 1005-004-716838</div>
              <div><strong>예금주:</strong> (주)공실뉴스</div>
              <div><strong>금액:</strong> 360,000원 (VAT 포함)</div>
            </div>

            <p style={{ fontSize: "12.5px", color: "#64748b", lineHeight: "1.6", margin: "0 0 16px" }}>
              * 입금자명은 신청서에 작성하신 성함 또는 상호명으로 입금해 주시기 바랍니다.<br />
              * 카드 결제를 원하실 경우 신청 후 안내 문자 링크를 통해 온라인 카드 결제가 가능합니다.
            </p>

            <button
              type="button"
              onClick={() => setShowGuideModal(false)}
              style={{
                width: "100%",
                padding: "12px 0",
                background: "#059669",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                fontWeight: 700,
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
