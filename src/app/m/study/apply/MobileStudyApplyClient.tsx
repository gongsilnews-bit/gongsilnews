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
    objectPosition: "center 52%",
    description: "빠른 공실계약이 필요한 사무실/상가 전문 부동산 대표님!  고객에게 브리핑이 꼭! 필요할때~",
    solution: "AI 매매보고서 초안 10초 완성!~공실뉴스에서 공실만 등록하면, 빠르게 완성할 수 있습니다.",
  },
  {
    tag: "RECOMMEND 02",
    title: "아파트/오피스텔 입점 부동산",
    image: "/images/study/recommend_real_apartment.jpg",
    imageAlt: "아파트와 오피스텔 매물 브리핑을 진행하는 전문 여성 공인중개사",
    objectPosition: "center 38%",
    description: "단지 내 물건작업과 임장작업이 필수인 아파트/오피스텔 입점 부동산 대표님!~  차별화된 서비스를 고객에게 제공하고 싶을때~",
    solution: "물건접수웹페이지, 아파트/오피스텔 인테리어 예상AI서비스로 스마트하게 중개할 수 있습니다.",
  },
  {
    tag: "RECOMMEND 03",
    title: "빌라/주택 건물 부동산",
    image: "/images/study/recommend_real_villa.jpg",
    imageAlt: "신축 빌라와 주택 현장 영상 촬영 짐벌을 든 전문 공인중개사",
    objectPosition: "center 38%",
    description: "원룸·투룸 다가구부터 꼬마빌딩까지, 유튜브가 가장 효율적이라는데,,, 어떻게 촬영하고 편집해야 할지 막막한 대표님!",
    solution: "손님의 Call로 연결되는 유튜브 영상제작! 촬영방법부터 편집법까지! 따라만 하세요!",
  },
];

const RIVAL_FEATURES = [
  { on: true, text: "이론 강의 + 종이 교재 수십 권" },
  { on: true, text: "수료증 · 자격증 응시자격" },
  { on: false, text: "결국 \"유튜브·블로그 하세요\"로 끝" },
  { on: false, text: "콘텐츠 제작은 오롯이 내 몫" },
  { on: false, text: "AI 실전 활용 과정 없음" },
  { on: false, text: "내 매물에 바로 적용 불가" },
  { on: false, text: "매달 신규 특강 업데이트 없음" },
  { on: false, text: "일시불 결제 · 중도 해지 어려움" },
  { on: false, text: "공실 등록 · 경공매 열람 혜택 없음" },
];

const PAID_FEATURES = [
  "공실스터디 멤버십 VOD + 교육자료",
  "수강 기간 : 1년(365일) 무제한 다시보기",
  "공실등록 20건 무료 (AI매매보고서 포함)",
  "기사작성 4건 매월",
  "매물접수웹페이지 무료",
  "블로그 포스팅 자동화 프로그램 무료",
  "드론 영상 저작권 무료",
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

      {/* ━━━ [1] 메인 타이틀 (PC 1:1 일치) ━━━ */}
      <div style={{ textAlign: "center", padding: "28px 16px 20px" }}>
        <div
          style={{
            display: "inline-block",
            background: "#ecfdf5",
            color: "#059669",
            fontSize: "12px",
            fontWeight: 800,
            padding: "5px 14px",
            borderRadius: "20px",
            marginBottom: "12px",
            border: "1px solid #a7f3d0",
          }}
        >
          수백만 원짜리 교육비, 이제 그만
        </div>
        <h1
          style={{
            fontSize: "24px",
            fontWeight: 900,
            color: "#0f2e28",
            letterSpacing: "-0.6px",
            margin: "0 0 10px 0",
            lineHeight: 1.35,
          }}
        >
          공실등록 + 유튜브/블로그 실습<br />
          월 <span style={{ color: "#059669" }}>3만원</span>이면 OK!
        </h1>
        <p style={{ fontSize: "13.5px", color: "#64748b", margin: 0, lineHeight: 1.5, wordBreak: "keep-all" }}>
          12개월 동안 블로그 포스팅, 유튜브 채널! 확실하게 구축하실 수 있습니다.
        </p>
      </div>

      <div className={styles.content} style={{ paddingTop: 0 }}>
        {/* ━━━ [2] 2개 비교창 (시중 실무교육 vs 공실스터디) ━━━ */}

        {/* 카드 1. 시중 실무교육 */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "18px",
            padding: "24px 20px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.03)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <h3 style={{ fontSize: "20px", fontWeight: 900, color: "#334155", margin: 0 }}>시중 실무교육</h3>
            <span style={{ fontSize: "11px", fontWeight: 700, background: "#f1f5f9", color: "#64748b", padding: "3px 9px", borderRadius: 20 }}>
              오프라인 아카데미
            </span>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: "28px", fontWeight: 900, color: "#1e293b", letterSpacing: "-0.8px" }}>
              수백만 원
              <span style={{ fontSize: "13px", fontWeight: 600, color: "#94a3b8", marginLeft: 6 }}>/ 12개월 일시불</span>
            </div>
            <p style={{ fontSize: "12px", color: "#94a3b8", margin: "6px 0 0", lineHeight: 1.45 }}>
              수백만원 결제, 불필요한 강의로 비용만 높아지는 오프라인 강의!!
            </p>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div
              style={{
                width: "100%",
                padding: "12px 10px",
                background: "#f8fafc",
                border: "1px dashed #cbd5e1",
                borderRadius: "10px",
                fontSize: "12.5px",
                fontWeight: 700,
                color: "#94a3b8",
                textAlign: "center",
                wordBreak: "keep-all",
                boxSizing: "border-box",
                lineHeight: 1.4,
              }}
            >
              강의 참여 때만 이해되고, 실무 활용 거의 불가!!
            </div>
          </div>

          <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 18 }}>
            <div style={{ fontSize: "12px", fontWeight: 800, color: "#64748b", marginBottom: 14 }}>
              수백만 원을 내고 얻는 것
            </div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 11, fontSize: "13px" }}>
              {RIVAL_FEATURES.map((f, i) => (
                <li key={i} style={{ display: "flex", alignItems: "center", gap: 9, color: f.on ? "#475569" : "#94a3b8" }}>
                  <span style={{ color: f.on ? "#059669" : "#cbd5e1", fontWeight: f.on ? 900 : 400 }}>{f.on ? "✓" : "✕"}</span>
                  <span style={f.on ? undefined : { textDecoration: "line-through" }}>{f.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* 카드 2. 공실스터디 */}
        <div
          style={{
            background: "#ffffff",
            border: "2.5px solid #059669",
            borderRadius: "18px",
            padding: "26px 20px",
            boxShadow: "0 12px 36px rgba(5, 150, 105, 0.16)",
            position: "relative",
            marginTop: "10px",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: -13,
              left: "50%",
              transform: "translateX(-50%)",
              background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
              color: "#ffffff",
              padding: "4px 16px",
              borderRadius: "20px",
              fontSize: "11px",
              fontWeight: 900,
              boxShadow: "0 4px 10px rgba(5, 150, 105, 0.35)",
              letterSpacing: "-0.3px",
              whiteSpace: "nowrap",
            }}
          >
            🔥 강력 추천 · 1년 마스터마인드
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <h3 style={{ fontSize: "20px", fontWeight: 900, color: "#0f2e28", margin: 0 }}>공실스터디</h3>
            <span style={{ fontSize: "11px", fontWeight: 800, background: "#ecfdf5", color: "#065f46", padding: "3px 10px", borderRadius: 20 }}>
              정회원 전용 플랜
            </span>
          </div>

          <div style={{ marginBottom: 18 }}>
            <div style={{ display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: "6px" }}>
              <span style={{ fontSize: "32px", fontWeight: 900, color: "#0f2e28", letterSpacing: "-1px" }}>
                36만원
              </span>
              <span style={{ fontSize: "13px", fontWeight: 700, color: "#64748b" }}>
                / 1년 (12개월)
              </span>
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 800,
                  color: "#065f46",
                  background: "#ecfdf5",
                  padding: "2px 8px",
                  borderRadius: "12px",
                  border: "1px solid #a7f3d0",
                }}
              >
                월 3만원꼴
              </span>
            </div>
            <p style={{ fontSize: "12px", color: "#059669", fontWeight: 700, margin: "6px 0 0" }}>
              가입비 0원 · 교재비 0원 · 카드 12개월 무이자 할부 가능
            </p>
          </div>

          <div style={{ marginBottom: 22 }}>
            <button
              type="button"
              onClick={scrollToApplyForm}
              style={{
                width: "100%",
                height: "48px",
                backgroundColor: "#059669",
                border: "none",
                borderRadius: "10px",
                fontSize: "15px",
                fontWeight: 800,
                color: "#ffffff",
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(5, 150, 105, 0.35)",
                fontFamily: "inherit",
              }}
            >
              공실스터디 신청하기 ➔
            </button>
          </div>

          <div style={{ borderTop: "1px solid #a7f3d0", paddingTop: 20 }}>
            <div style={{ fontSize: "13px", fontWeight: 900, color: "#0f2e28", marginBottom: 14 }}>
              포함된 모든 전용 혜택
            </div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 13, fontSize: "13.5px" }}>
              {PAID_FEATURES.map((f, i) => (
                <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, color: "#0f2e28", lineHeight: 1.45 }}>
                  <span style={{ color: "#059669", fontSize: "16px", fontWeight: 900, lineHeight: 1, marginTop: "2px" }}>✓</span>
                  <span style={{ wordBreak: "keep-all" }}>{f}</span>
                </li>
              ))}
            </ul>
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
                <div style={{ position: "relative", width: "100%", aspectRatio: "4 / 3", background: "#e2e8f0" }}>
                  <Image
                    src={item.image}
                    alt={item.imageAlt}
                    fill
                    sizes="(max-width: 480px) 100vw, 448px"
                    style={{ objectFit: "cover", objectPosition: item.objectPosition || "center center" }}
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
