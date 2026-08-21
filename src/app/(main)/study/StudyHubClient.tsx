"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { getMyEnrollments } from "@/app/actions/lecture";
import AuthModal from "@/components/AuthModal";

interface Props {
  initialLectures: any[];
  initialTab?: string;
  initialCategory?: string;
}

const CATEGORIES = [
  "전체",
  "실무/마케팅",
  "경매/특수물건",
  "재개발/투자",
  "세무/법률",
  "AI마케팅/쇼츠",
];

const FAQS = [
  {
    q: "컴퓨터나 AI를 잘 모르는 초보 공인중개사도 따라할 수 있나요?",
    a: "네, 100% 가능합니다. 복잡한 코딩이나 어려운 이론 없이, 클릭 몇 번으로 매물 쇼츠 영상을 만들고 ChatGPT로 매물 설명글을 뽑아내는 실습 위주로 진행됩니다. 컴퓨터를 잘 다루지 못하셔도 순서대로만 따라 하시면 됩니다.",
  },
  {
    q: "1년 연간 스터디는 언제부터 참여할 수 있나요?",
    a: "상시 가입하여 즉시 수강을 시작할 수 있습니다. 가입한 날로부터 1년(365일) 동안 모든 VOD 강의 무제한 시청 및 매달 새롭게 업데이트되는 신규 특강과 실무 서식을 모두 이용하실 수 있습니다.",
  },
  {
    q: "강의 자료와 계약서 양식, AI 프롬프트는 어떻게 다운받나요?",
    a: "각 강의실 본문 내 [강의자료 다운로드] 탭 및 공실뉴스 [자료실] 메뉴에서 한글(HWP), 엑셀, PDF 및 프롬프트 텍스트 파일 원본을 횟수 제한 없이 자유롭게 다운로드받으실 수 있습니다.",
  },
  {
    q: "스마트폰(모바일)에서도 강의를 들을 수 있나요?",
    a: "네, PC는 물론 스마트폰, 태블릿 등 모든 기기에서 최적화된 모바일 전용 뷰어로 언제 어디서나 끊김 없이 이어보기가 가능합니다.",
  },
  {
    q: "공실뉴스 회원에게 주어지는 추가 혜택이 있나요?",
    a: "공실뉴스 가입 회원은 기초 실무 특강 및 AI 맛보기 과정을 무료로 수강할 수 있으며, 공실 등록 및 전국 법원 경공매 정보 열람 혜택이 함께 제공됩니다.",
  },
];

export default function StudyHubClient({
  initialLectures,
  initialTab = "lecture",
  initialCategory = "전체",
}: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"lecture" | "applications" | "classroom">(
    (initialTab as any) || "lecture"
  );
  const [activeCategory, setActiveCategory] = useState<string>(initialCategory);
  const [lectures] = useState<any[]>(initialLectures);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [loadingEnrollments, setLoadingEnrollments] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // 유저 세션 로드
  useEffect(() => {
    async function loadUser() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUser(user);
    }
    loadUser();
  }, []);

  // 내 수강신청 / 나의 강의실 로드
  useEffect(() => {
    if (activeTab === "applications" || activeTab === "classroom") {
      if (!currentUser) {
        setEnrollments([]);
        return;
      }
      setLoadingEnrollments(true);
      getMyEnrollments(currentUser.id).then((res) => {
        if (res.success && res.data) {
          setEnrollments(res.data);
        }
        setLoadingEnrollments(false);
      });
    }
  }, [activeTab, currentUser]);

  const handleTabChange = (tab: "lecture" | "applications" | "classroom") => {
    if ((tab === "applications" || tab === "classroom") && !currentUser) {
      setIsAuthModalOpen(true);
      return;
    }
    setActiveTab(tab);
    router.replace(`/study?tab=${tab}`, { scroll: false });
  };

  const filteredLectures = lectures.filter((item) => {
    const matchCategory =
      activeCategory === "전체" ||
      item.category?.includes(activeCategory) ||
      (activeCategory === "AI마케팅/쇼츠" &&
        (item.category?.includes("마케팅") ||
          item.title?.includes("쇼츠") ||
          item.title?.includes("AI")));
    const matchSearch =
      !searchQuery.trim() ||
      item.title?.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
      item.instructor_name?.toLowerCase().includes(searchQuery.toLowerCase().trim());
    return matchCategory && matchSearch;
  });

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div style={{ backgroundColor: "#ffffff", fontFamily: "'Pretendard Variable', -apple-system, sans-serif", color: "#1e293b", minHeight: "100vh" }}>
      
      {/* ━━━ 1. HERO SECTION (윤자동 스타일: 딥 다크 네이비 & 깔끔한 타이포그래피) ━━━ */}
      <section style={{ backgroundColor: "#0b1329", color: "#ffffff", padding: "70px 0 55px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ maxWidth: 1160, margin: "0 auto", padding: "0 24px" }}>
          
          {/* Top Tag */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(59, 130, 246, 0.12)", border: "1px solid rgba(59, 130, 246, 0.28)", padding: "6px 14px", borderRadius: 24, fontSize: 13, fontWeight: 700, color: "#93c5fd", marginBottom: 20 }}>
            <span>✨</span>
            <span>1년(12개월) 부동산 실무 & AI 마스터마인드</span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 30 }}>
            <div style={{ maxWidth: 720 }}>
              <h1 style={{ fontSize: "38px", fontWeight: 900, lineHeight: 1.3, letterSpacing: "-1px", margin: "0 0 16px 0" }}>
                1년 365일, 현장과 함께 달리는<br />
                <span style={{ color: "#60a5fa" }}>공실뉴스 AI 부동산 실전 스터디</span>
              </h1>
              <p style={{ fontSize: "16.5px", color: "#94a3b8", lineHeight: 1.65, margin: "0 0 28px 0", wordBreak: "keep-all" }}>
                단발성 온라인 강의로 끝나지 않습니다. 12개월 동안 매월 업데이트되는 최신 AI 마케팅 기술, 공실 해결 임대 실무, 법원 경공매 분석으로 지역 1등 부동산을 완성하세요.
              </p>

              {/* 4대 안심 포인트 */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "12px 24px", fontSize: "13.5px", color: "#cbd5e1", fontWeight: 600 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  365일 무제한 수강 & 복습
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  매월 신규 실무 VOD 업데이트
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  계약서·특약·쇼츠 원본 100% 제공
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  전국 11만 중개사 스터디 크루
                </span>
              </div>
            </div>

            {/* Quick CTA Button */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button
                onClick={() => scrollToSection("study-lectures-section")}
                style={{
                  padding: "14px 28px",
                  background: "#2563eb",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 10,
                  fontSize: 15.5,
                  fontWeight: 800,
                  cursor: "pointer",
                  boxShadow: "0 4px 16px rgba(37,99,235,0.35)",
                  transition: "all 0.2s",
                }}
              >
                1년 스터디 커리큘럼 보기 ↓
              </button>
            </div>
          </div>

          {/* 3대 모드 탭 (전체 특강 / 내 수강신청 / 나의 강의실) */}
          <div style={{ display: "flex", gap: 10, marginTop: 42, borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 20 }}>
            <button
              onClick={() => handleTabChange("lecture")}
              style={{
                padding: "9px 20px",
                borderRadius: 20,
                fontSize: 14,
                fontWeight: activeTab === "lecture" ? 800 : 600,
                color: activeTab === "lecture" ? "#0f172a" : "#cbd5e1",
                background: activeTab === "lecture" ? "#ffffff" : "rgba(255,255,255,0.08)",
                border: "none",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              🎓 전체 스터디 특강
            </button>
            <button
              onClick={() => handleTabChange("applications")}
              style={{
                padding: "9px 20px",
                borderRadius: 20,
                fontSize: 14,
                fontWeight: activeTab === "applications" ? 800 : 600,
                color: activeTab === "applications" ? "#0f172a" : "#cbd5e1",
                background: activeTab === "applications" ? "#ffffff" : "rgba(255,255,255,0.08)",
                border: "none",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              📋 내 수강신청 내역
            </button>
            <button
              onClick={() => handleTabChange("classroom")}
              style={{
                padding: "9px 20px",
                borderRadius: 20,
                fontSize: 14,
                fontWeight: activeTab === "classroom" ? 800 : 600,
                color: activeTab === "classroom" ? "#0f172a" : "#cbd5e1",
                background: activeTab === "classroom" ? "#ffffff" : "rgba(255,255,255,0.08)",
                border: "none",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              🎬 나의 강의실
            </button>
          </div>

        </div>
      </section>

      {/* ━━━ TAB 1: LECTURE & 1-YEAR STORYTELLING ━━━ */}
      {activeTab === "lecture" && (
        <>
          {/* ━━━ 2. WHY 1-YEAR STUDY? (비교 & 필요성 섹션) ━━━ */}
          <section style={{ padding: "65px 0 60px", backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
            <div style={{ maxWidth: 1160, margin: "0 auto", padding: "0 24px" }}>
              
              <div style={{ textAlign: "center", marginBottom: 44 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: "#2563eb", letterSpacing: "1px", textTransform: "uppercase" }}>
                  WHY 1-YEAR STUDY
                </span>
                <h2 style={{ fontSize: "28px", fontWeight: 800, color: "#0f172a", margin: "8px 0 10px 0", letterSpacing: "-0.5px" }}>
                  혼자 보다가 작심삼일로 끝나는 온라인 강의는 이제 그만.
                </h2>
                <p style={{ fontSize: "15px", color: "#64748b", margin: 0 }}>
                  AI 기술과 부동산 정책은 매달 빠르게 변합니다. 1년 동안 곁에서 함께 뛰는 든든한 파트너가 필요합니다.
                </p>
              </div>

              {/* 2열 비교 카드 */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                {/* 기존 단발성 강의 */}
                <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "28px 24px" }}>
                  <div style={{ display: "inline-block", background: "#fee2e2", color: "#dc2626", fontSize: 12, fontWeight: 800, padding: "3px 10px", borderRadius: 6, marginBottom: 16 }}>
                    ❌ 기존 단발성 강의
                  </div>
                  <h3 style={{ fontSize: 17, fontWeight: 700, color: "#334155", margin: "0 0 14px 0" }}>혼자 듣다가 흐지부지 포기</h3>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: 14, color: "#64748b", lineHeight: 1.9 }}>
                    <li>· 1회성 결제 후 방치되어 수강 기한 만료</li>
                    <li>· 6개월만 지나도 쓸 수 없는 옛날 AI/정책 정보</li>
                    <li>· 막히는 부분이 생겨도 질문할 곳이 없음</li>
                    <li>· 강의는 들었지만 내 실무에 적용하지 못함</li>
                  </ul>
                </div>

                {/* 공실뉴스 1년 스터디 */}
                <div style={{ background: "#ffffff", border: "2px solid #2563eb", borderRadius: 14, padding: "28px 24px", boxShadow: "0 8px 24px rgba(37,99,235,0.08)" }}>
                  <div style={{ display: "inline-block", background: "#eff6ff", color: "#2563eb", fontSize: 12, fontWeight: 800, padding: "3px 10px", borderRadius: 6, marginBottom: 16 }}>
                    ✅ 공실뉴스 1년 스터디
                  </div>
                  <h3 style={{ fontSize: 17, fontWeight: 800, color: "#0f172a", margin: "0 0 14px 0" }}>365일 실전 동행 마스터마인드</h3>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: 14, color: "#334155", fontWeight: 600, lineHeight: 1.9 }}>
                    <li>· 1년(365일) 내내 무제한 반복 시청 및 복습</li>
                    <li>· 매달 변화하는 최신 AI 툴과 정책 특강 자동 추가</li>
                    <li>· 계약서 특약, AI 프롬프트, 영상 템플릿 원본 제공</li>
                    <li>· 전국 11만 부동산 스터디 크루와 공동중개 네트워킹</li>
                  </ul>
                </div>
              </div>

            </div>
          </section>

          {/* ━━━ 3. 12-MONTH ANNUAL ROADMAP (1년 4단계 성장 로드맵) ━━━ */}
          <section style={{ padding: "70px 0 65px", backgroundColor: "#ffffff", borderBottom: "1px solid #e2e8f0" }}>
            <div style={{ maxWidth: 1160, margin: "0 auto", padding: "0 24px" }}>
              
              <div style={{ textAlign: "center", marginBottom: 44 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: "#2563eb", letterSpacing: "1px", textTransform: "uppercase" }}>
                  12-MONTH ROADMAP
                </span>
                <h2 style={{ fontSize: "28px", fontWeight: 800, color: "#0f172a", margin: "8px 0 10px 0", letterSpacing: "-0.5px" }}>
                  1년 12개월 실전 마스터 플랜
                </h2>
                <p style={{ fontSize: "15px", color: "#64748b", margin: 0 }}>
                  기초 AI 도구 장착부터 지역 1등 브랜드 구축까지, 단계별로 차근차근 완성합니다.
                </p>
              </div>

              {/* 4단계 스텝 그리드 */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 18 }}>
                
                {/* STEP 1 */}
                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: "22px 18px" }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#2563eb", marginBottom: 8 }}>Q1 (1~3개월차)</div>
                  <h4 style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", margin: "0 0 10px 0" }}>🤖 AI 무기 장착기</h4>
                  <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.55, margin: 0 }}>
                    · 1분 완성 매물 쇼츠/릴스 제작<br />
                    · ChatGPT 매물 설명문 10배 작성<br />
                    · 블로그 상위 노출 자동화 기본기
                  </p>
                </div>

                {/* STEP 2 */}
                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: "22px 18px" }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#2563eb", marginBottom: 8 }}>Q2 (4~6개월차)</div>
                  <h4 style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", margin: "0 0 10px 0" }}>🏢 실전 공실 해결기</h4>
                  <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.55, margin: 0 }}>
                    · 상가·원룸 공실 채우는 임대 마케팅<br />
                    · AI 물건보고서로 고객 즉시 클로징<br />
                    · 임대인·임차인 설득 브리핑 기법
                  </p>
                </div>

                {/* STEP 3 */}
                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: "22px 18px" }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#2563eb", marginBottom: 8 }}>Q3 (7~9개월차)</div>
                  <h4 style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", margin: "0 0 10px 0" }}>🔨 경공매 & 수익 극대화</h4>
                  <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.55, margin: 0 }}>
                    · 법원 경·공매 권리분석 실전<br />
                    · 돈 되는 유찰 물건 정밀 발굴<br />
                    · 특수물건 중개 및 절세 세무 전략
                  </p>
                </div>

                {/* STEP 4 */}
                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: "22px 18px" }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#2563eb", marginBottom: 8 }}>Q4 (10~12개월차)</div>
                  <h4 style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", margin: "0 0 10px 0" }}>🏆 지역 1등 브랜드 안착</h4>
                  <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.55, margin: 0 }}>
                    · 나만의 유튜브/블로그 채널 완성<br />
                    · 전국 11만 공동중개망 연계<br />
                    · 지속 가능한 자동 고객 유입 시스템
                  </p>
                </div>

              </div>

            </div>
          </section>

          {/* ━━━ 4. 4대 연간 멤버십 혜택 (MINIMAL ICON CARDS) ━━━ */}
          <section style={{ padding: "65px 0", backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
            <div style={{ maxWidth: 1160, margin: "0 auto", padding: "0 24px" }}>
              
              <div style={{ textAlign: "center", marginBottom: 40 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: "#2563eb", letterSpacing: "1px", textTransform: "uppercase" }}>
                  MEMBERSHIP BENEFITS
                </span>
                <h2 style={{ fontSize: "28px", fontWeight: 800, color: "#0f172a", margin: "8px 0 0 0", letterSpacing: "-0.5px" }}>
                  1년 스터디 멤버십 4대 핵심 혜택
                </h2>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }}>
                
                <div style={{ background: "#ffffff", padding: "24px 20px", borderRadius: 12, border: "1px solid #e2e8f0" }}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, marginBottom: 16 }}>
                    🎬
                  </div>
                  <h4 style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", margin: "0 0 6px 0" }}>365일 무제한 VOD</h4>
                  <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.5, margin: 0 }}>
                    1년 내내 언제 어디서나 PC와 스마트폰으로 반복 수강할 수 있습니다.
                  </p>
                </div>

                <div style={{ background: "#ffffff", padding: "24px 20px", borderRadius: 12, border: "1px solid #e2e8f0" }}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, marginBottom: 16 }}>
                    🔄
                  </div>
                  <h4 style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", margin: "0 0 6px 0" }}>매월 신규 실무 업데이트</h4>
                  <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.5, margin: 0 }}>
                    변화하는 AI 기술과 최신 부동산 정책을 매달 새 특강으로 반영합니다.
                  </p>
                </div>

                <div style={{ background: "#ffffff", padding: "24px 20px", borderRadius: 12, border: "1px solid #e2e8f0" }}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, marginBottom: 16 }}>
                    📂
                  </div>
                  <h4 style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", margin: "0 0 6px 0" }}>실무 서식 원본 제공</h4>
                  <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.5, margin: 0 }}>
                    계약서 특약, AI 프롬프트 템플릿, 쇼츠 제작 원본 파일을 100% 드립니다.
                  </p>
                </div>

                <div style={{ background: "#ffffff", padding: "24px 20px", borderRadius: 12, border: "1px solid #e2e8f0" }}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, marginBottom: 16 }}>
                    🤝
                  </div>
                  <h4 style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", margin: "0 0 6px 0" }}>전국 스터디 크루 연계</h4>
                  <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.5, margin: 0 }}>
                    전국 11만 부동산 회원과 매물 정보 및 공동중개를 활발히 교류합니다.
                  </p>
                </div>

              </div>

            </div>
          </section>

          {/* ━━━ 5. CURATED STUDY LECTURES LIST (특강 목록 및 실시간 신청) ━━━ */}
          <section id="study-lectures-section" style={{ padding: "70px 0 80px", backgroundColor: "#ffffff" }}>
            <div style={{ maxWidth: 1160, margin: "0 auto", padding: "0 24px" }}>
              
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28, flexWrap: "wrap", gap: 16 }}>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 800, color: "#2563eb", letterSpacing: "1px", textTransform: "uppercase" }}>
                    CURRICULUM & LECTURES
                  </span>
                  <h2 style={{ fontSize: "28px", fontWeight: 800, color: "#0f172a", margin: "6px 0 0 0", letterSpacing: "-0.5px" }}>
                    1년 연간 스터디 특강 라인업
                  </h2>
                </div>

                {/* 검색창 */}
                <div style={{ width: 280, position: "relative" }}>
                  <input
                    type="text"
                    placeholder="특강 제목 또는 강사명 검색..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: "100%",
                      height: 40,
                      background: "#f8fafc",
                      border: "1px solid #cbd5e1",
                      borderRadius: 8,
                      padding: "0 36px 0 14px",
                      fontSize: 13.5,
                      color: "#111",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", right: 12, top: 12 }}>
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                </div>
              </div>

              {/* 카테고리 필터 버튼 바 */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 32 }}>
                {CATEGORIES.map((cat) => {
                  const isSel = activeCategory === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      style={{
                        padding: "7px 16px",
                        borderRadius: 8,
                        fontSize: 13.5,
                        fontWeight: isSel ? 700 : 500,
                        color: isSel ? "#ffffff" : "#475569",
                        backgroundColor: isSel ? "#0f172a" : "#f1f5f9",
                        border: isSel ? "1px solid #0f172a" : "1px solid #e2e8f0",
                        cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>

              {/* 강의 카드 그리드 */}
              {filteredLectures.length === 0 ? (
                <div style={{ textAlign: "center", padding: "80px 20px", background: "#f8fafc", borderRadius: 12, border: "1px solid #e2e8f0", color: "#64748b" }}>
                  <div style={{ fontSize: 44, marginBottom: 12 }}>🔍</div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: "#1e293b", marginBottom: 6 }}>해당 조건의 특강이 없습니다</div>
                  <p style={{ fontSize: 13.5, color: "#94a3b8", margin: 0 }}>다른 검색어나 카테고리를 선택해 보세요.</p>
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                    gap: "22px",
                  }}
                >
                  {filteredLectures.map((item, i) => {
                    const href = item.id && !item.id.startsWith("sample-") ? `/study_read?id=${item.id}` : "/study_read";
                    return (
                      <Link
                        key={item.id || i}
                        href={href}
                        style={{ textDecoration: "none", color: "inherit" }}
                      >
                        <div
                          style={{
                            backgroundColor: "#ffffff",
                            borderRadius: 12,
                            overflow: "hidden",
                            border: "1px solid #e2e8f0",
                            transition: "all 0.2s ease",
                            height: "100%",
                            display: "flex",
                            flexDirection: "column",
                            cursor: "pointer",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = "translateY(-4px)";
                            e.currentTarget.style.boxShadow = "0 10px 20px rgba(0,0,0,0.06)";
                            e.currentTarget.style.borderColor = "#2563eb";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "translateY(0)";
                            e.currentTarget.style.boxShadow = "none";
                            e.currentTarget.style.borderColor = "#e2e8f0";
                          }}
                        >
                          {/* 썸네일 */}
                          <div style={{ width: "100%", aspectRatio: "16/9", position: "relative", overflow: "hidden", backgroundColor: "#0f172a" }}>
                            {item.thumbnail_url ? (
                              <img
                                src={item.thumbnail_url}
                                alt={item.title}
                                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                              />
                            ) : (
                              <div
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)",
                                  display: "flex",
                                  flexDirection: "column",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  color: "#ffffff",
                                  padding: 16,
                                  textAlign: "center",
                                }}
                              >
                                <span style={{ fontSize: 22, marginBottom: 4 }}>🎓</span>
                                <span style={{ fontSize: 13, fontWeight: 700, color: "#93c5fd" }}>{item.category || "부동산특강"}</span>
                              </div>
                            )}
                          </div>

                          {/* 내용 */}
                          <div style={{ padding: "16px", flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                            <div>
                              <span style={{ fontSize: 11.5, fontWeight: 700, color: "#2563eb", background: "#eff6ff", padding: "2px 7px", borderRadius: 4, display: "inline-block", marginBottom: 8 }}>
                                {item.category || "중개실무"}
                              </span>
                              <h3
                                style={{
                                  fontSize: 15.5,
                                  fontWeight: 700,
                                  color: "#0f172a",
                                  lineHeight: 1.4,
                                  margin: "0 0 8px 0",
                                  display: "-webkit-box",
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: "vertical",
                                  overflow: "hidden",
                                  wordBreak: "keep-all",
                                }}
                              >
                                {item.title}
                              </h3>
                            </div>

                            <div>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12.5, color: "#64748b", marginBottom: 10 }}>
                                <span>{item.instructor_name || "공실뉴스 강사진"}</span>
                                <span style={{ display: "flex", alignItems: "center", gap: 3, color: "#d97706", fontWeight: 700 }}>
                                  ★ {(item.rating || 4.9).toFixed(1)} ({item.review_count || 120})
                                </span>
                              </div>

                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 10, borderTop: "1px solid #f1f5f9" }}>
                                <span style={{ fontSize: 15, fontWeight: 800, color: item.price ? "#0f172a" : "#16a34a" }}>
                                  {item.price ? `${item.price.toLocaleString()} P` : "무료 수강"}
                                </span>
                                <span style={{ fontSize: 12, fontWeight: 700, color: "#2563eb" }}>
                                  수강신청 ›
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}

            </div>
          </section>

          {/* ━━━ 6. FAQ (자주 묻는 질문 아코디언) ━━━ */}
          <section style={{ padding: "65px 0 75px", backgroundColor: "#f8fafc", borderTop: "1px solid #e2e8f0" }}>
            <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 24px" }}>
              
              <div style={{ textAlign: "center", marginBottom: 36 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: "#2563eb", letterSpacing: "1px", textTransform: "uppercase" }}>
                  FAQ
                </span>
                <h2 style={{ fontSize: "26px", fontWeight: 800, color: "#0f172a", margin: "6px 0 0 0" }}>
                  자주 묻는 질문
                </h2>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {FAQS.map((faq, index) => {
                  const isOpen = openFaqIndex === index;
                  return (
                    <div
                      key={index}
                      style={{
                        background: "#ffffff",
                        borderRadius: 10,
                        border: "1px solid #e2e8f0",
                        overflow: "hidden",
                      }}
                    >
                      <button
                        onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                        style={{
                          width: "100%",
                          padding: "16px 20px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          background: "none",
                          border: "none",
                          textAlign: "left",
                          cursor: "pointer",
                          fontFamily: "inherit",
                        }}
                      >
                        <span style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
                          Q. {faq.q}
                        </span>
                        <span style={{ fontSize: 16, color: "#64748b", transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
                          ▼
                        </span>
                      </button>
                      {isOpen && (
                        <div style={{ padding: "0 20px 18px", fontSize: 14, color: "#475569", lineHeight: 1.65, borderTop: "1px solid #f1f5f9", paddingTop: 12 }}>
                          {faq.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

            </div>
          </section>

          {/* ━━━ 7. FINAL CTA BANNER (하단 심플 배너) ━━━ */}
          <section style={{ backgroundColor: "#0b1329", color: "#ffffff", padding: "50px 0", textAlign: "center" }}>
            <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 24px" }}>
              <h3 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 10px 0" }}>
                지역 1등 부동산으로 성장하는 가장 확실한 1년
              </h3>
              <p style={{ fontSize: 15, color: "#94a3b8", margin: "0 0 24px 0" }}>
                지금 가입하고 1년 동안 제공되는 모든 AI 실무 특강과 자료를 무제한으로 누리세요.
              </p>
              <button
                onClick={() => scrollToSection("study-lectures-section")}
                style={{
                  padding: "13px 32px",
                  background: "#2563eb",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 15,
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                1년 스터디 지금 시작하기 →
              </button>
            </div>
          </section>
        </>
      )}

      {/* ━━━ TAB 2: APPLICATIONS (내 수강신청 내역) ━━━ */}
      {activeTab === "applications" && (
        <main style={{ maxWidth: 1160, margin: "0 auto", padding: "40px 24px 80px" }}>
          <div style={{ background: "#ffffff", borderRadius: 14, padding: "32px 28px", border: "1px solid #e2e8f0" }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", margin: "0 0 20px 0" }}>📋 내 수강신청 내역</h2>
            {loadingEnrollments ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: "#64748b" }}>수강 내역을 불러오는 중...</div>
            ) : enrollments.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", color: "#94a3b8" }}>
                <div style={{ fontSize: 44, marginBottom: 14 }}>📭</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: "#1e293b", marginBottom: 8 }}>수강 신청 내역이 없습니다</div>
                <button
                  onClick={() => handleTabChange("lecture")}
                  style={{ marginTop: 12, padding: "8px 20px", background: "#0f172a", color: "#fff", border: "none", borderRadius: 8, fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}
                >
                  특강 목록 둘러보기
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {enrollments.map((en: any) => (
                  <div key={en.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 16, border: "1px solid #e2e8f0", borderRadius: 8, background: "#f8fafc" }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>{en.lectures?.title || "특강"}</div>
                      <div style={{ fontSize: 13, color: "#64748b" }}>신청일: {en.created_at?.substring(0, 10)} | 결제: {en.paid_points?.toLocaleString() || 0} P</div>
                    </div>
                    <Link href={`/study_read?id=${en.lecture_id}`} style={{ padding: "8px 18px", background: "#0f172a", color: "#fff", borderRadius: 6, fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
                      강의실 입장
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      )}

      {/* ━━━ TAB 3: CLASSROOM (나의 강의실) ━━━ */}
      {activeTab === "classroom" && (
        <main style={{ maxWidth: 1160, margin: "0 auto", padding: "40px 24px 80px" }}>
          <div style={{ background: "#ffffff", borderRadius: 14, padding: "32px 28px", border: "1px solid #e2e8f0" }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", margin: "0 0 20px 0" }}>🎬 나의 강의실</h2>
            {loadingEnrollments ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: "#64748b" }}>강의 목록을 불러오는 중...</div>
            ) : enrollments.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", color: "#94a3b8" }}>
                <div style={{ fontSize: 44, marginBottom: 14 }}>🎓</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: "#1e293b", marginBottom: 8 }}>수강 중인 강의가 없습니다</div>
                <button
                  onClick={() => handleTabChange("lecture")}
                  style={{ marginTop: 12, padding: "8px 20px", background: "#0f172a", color: "#fff", border: "none", borderRadius: 8, fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}
                >
                  지금 특강 신청하기
                </button>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
                {enrollments.map((en: any) => (
                  <Link key={en.id} href={`/study_read?id=${en.lecture_id}`} style={{ textDecoration: "none", color: "inherit" }}>
                    <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden", background: "#fff" }}>
                      <div style={{ width: "100%", aspectRatio: "16/9", background: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 28 }}>
                        ▶
                      </div>
                      <div style={{ padding: 14 }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>{en.lectures?.title}</div>
                        <div style={{ fontSize: 12.5, color: "#64748b" }}>강사: {en.lectures?.instructor_name || "강사진"}</div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </main>
      )}

      {isAuthModalOpen && <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />}
    </div>
  );
}
