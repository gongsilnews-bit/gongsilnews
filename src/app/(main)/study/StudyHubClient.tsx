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
    <div style={{ backgroundColor: "#ffffff", fontFamily: "'Pretendard Variable', -apple-system, sans-serif", color: "#132e27", minHeight: "100vh" }}>
      
      {/* ━━━ 1. HERO SECTION (윤자동 스타일: 딥 포레스트 에메랄드 다크 & 민트 포인트) ━━━ */}
      <section style={{ backgroundColor: "#062326", color: "#ffffff", padding: "72px 0 56px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ maxWidth: 1160, margin: "0 auto", padding: "0 24px" }}>
          
          {/* Top Tag */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(16, 185, 129, 0.14)", border: "1px solid rgba(16, 185, 129, 0.35)", padding: "6px 14px", borderRadius: 24, fontSize: 13, fontWeight: 700, color: "#6ee7b7", marginBottom: 20 }}>
            <span>🌿</span>
            <span>1년(12개월) 부동산 실무 & AI 마스터마인드</span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 30 }}>
            <div style={{ maxWidth: 720 }}>
              <h1 style={{ fontSize: "38px", fontWeight: 900, lineHeight: 1.3, letterSpacing: "-1px", margin: "0 0 16px 0" }}>
                AI 유튜브 시대<br />
                <span style={{ color: "#34d399" }}>부동산중개에 꼭! 필요한 실전 마케팅 스터디</span>
              </h1>
              <p style={{ fontSize: "16.5px", color: "#a7f3d0", opacity: 0.9, lineHeight: 1.65, margin: "0 0 28px 0", wordBreak: "keep-all" }}>
                단발성 온라인 강의로 끝나지 않습니다. 12개월 동안 매월 업데이트되는 최신 AI 마케팅 기술, 공실 해결 임대 실무, 법원 경공매 분석으로 지역 1등 부동산을 완성하세요.
              </p>

              {/* 4대 안심 포인트 */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "12px 24px", fontSize: "13.5px", color: "#d1fae5", fontWeight: 600 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  365일 무제한 수강 & 복습
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  매월 신규 실무 VOD 업데이트
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  계약서·특약·쇼츠 원본 100% 제공
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  전국 11만 중개사 스터디 크루
                </span>
              </div>
            </div>

            {/* Quick CTA Button */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Link
                href="/study/about"
                style={{
                  padding: "14px 28px",
                  background: "#059669",
                  color: "#ffffff",
                  borderRadius: 10,
                  fontSize: 15.5,
                  fontWeight: 800,
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  boxShadow: "0 4px 16px rgba(5, 150, 105, 0.4)",
                  transition: "all 0.2s",
                }}
              >
                <span>공실스터디 알아보기</span>
                <span>→</span>
              </Link>
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
                color: activeTab === "lecture" ? "#062828" : "#d1fae5",
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
                color: activeTab === "applications" ? "#062828" : "#d1fae5",
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
                color: activeTab === "classroom" ? "#062828" : "#d1fae5",
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

      {/* ━━━ TAB 1: LECTURES LIST & FAQ ━━━ */}
      {activeTab === "lecture" && (
        <>
          {/* ━━━ CURATED STUDY LECTURES LIST (특강 목록 및 실시간 신청) ━━━ */}
          <section id="study-lectures-section" style={{ padding: "60px 0 80px", backgroundColor: "#ffffff" }}>
            <div style={{ maxWidth: 1160, margin: "0 auto", padding: "0 24px" }}>
              
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28, flexWrap: "wrap", gap: 16 }}>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 800, color: "#059669", letterSpacing: "1px", textTransform: "uppercase" }}>
                    CURRICULUM & LECTURES
                  </span>
                  <h2 style={{ fontSize: "28px", fontWeight: 800, color: "#062828", margin: "6px 0 0 0", letterSpacing: "-0.5px" }}>
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
                      background: "#f4fbf7",
                      border: "1px solid #d1fae5",
                      borderRadius: 8,
                      padding: "0 36px 0 14px",
                      fontSize: 13.5,
                      color: "#111",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", right: 12, top: 12 }}>
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
                        color: isSel ? "#ffffff" : "#065f46",
                        backgroundColor: isSel ? "#062f32" : "#f0fdf4",
                        border: isSel ? "1px solid #062f32" : "1px solid #d1fae5",
                        cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>

              {/* 강의 카드 그리드 (3열 레이아웃) */}
              {filteredLectures.length === 0 ? (
                <div style={{ textAlign: "center", padding: "80px 20px", background: "#f4fbf7", borderRadius: 12, border: "1px solid #d1fae5", color: "#64748b" }}>
                  <div style={{ fontSize: 44, marginBottom: 12 }}>🔍</div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: "#1e293b", marginBottom: 6 }}>해당 조건의 특강이 없습니다</div>
                  <p style={{ fontSize: 13.5, color: "#94a3b8", margin: 0 }}>다른 검색어나 카테고리를 선택해 보세요.</p>
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
                    gap: "24px",
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
                            borderRadius: 14,
                            overflow: "hidden",
                            border: "1px solid #e2e8f0",
                            transition: "all 0.2s ease",
                            height: "100%",
                            display: "flex",
                            flexDirection: "column",
                            cursor: "pointer",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = "translateY(-4px)";
                            e.currentTarget.style.boxShadow = "0 12px 24px rgba(5, 150, 105, 0.1)";
                            e.currentTarget.style.borderColor = "#059669";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "translateY(0)";
                            e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.02)";
                            e.currentTarget.style.borderColor = "#e2e8f0";
                          }}
                        >
                          {/* 썸네일 */}
                          <div style={{ width: "100%", aspectRatio: "16/9", position: "relative", overflow: "hidden", backgroundColor: "#062326" }}>
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
                                  background: "linear-gradient(135deg, #062326 0%, #064e3b 100%)",
                                  display: "flex",
                                  flexDirection: "column",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  color: "#ffffff",
                                  padding: 16,
                                  textAlign: "center",
                                }}
                              >
                                <span style={{ fontSize: 24, marginBottom: 4 }}>🎓</span>
                                <span style={{ fontSize: 13.5, fontWeight: 700, color: "#6ee7b7" }}>{item.category || "공실스터디"}</span>
                              </div>
                            )}
                          </div>

                          {/* 내용 */}
                          <div style={{ padding: "18px 18px 16px", flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                            <div>
                              <span style={{ fontSize: 12, fontWeight: 700, color: "#047857", background: "#ecfdf5", padding: "3px 8px", borderRadius: 4, display: "inline-block", marginBottom: 10 }}>
                                {item.category || "중개실무"}
                              </span>
                              <h3
                                style={{
                                  fontSize: 16.5,
                                  fontWeight: 800,
                                  color: "#062828",
                                  lineHeight: 1.45,
                                  margin: "0 0 10px 0",
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
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13, color: "#64748b", marginBottom: 12 }}>
                                <span>{item.instructor_name || "공실뉴스 강사진"}</span>
                                <span style={{ display: "flex", alignItems: "center", gap: 3, color: "#d97706", fontWeight: 700 }}>
                                  ★ {(item.rating || 4.9).toFixed(1)} ({item.review_count || 120})
                                </span>
                              </div>

                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 12, borderTop: "1px solid #f1f5f9" }}>
                                <span style={{ fontSize: 16, fontWeight: 800, color: item.price ? "#062828" : "#059669" }}>
                                  {item.price ? `${item.price.toLocaleString()} P` : "무료 수강"}
                                </span>
                                <span style={{ fontSize: 13, fontWeight: 700, color: "#059669" }}>
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
          <section style={{ padding: "65px 0 75px", backgroundColor: "#f2f9f6", borderTop: "1px solid #d1fae5" }}>
            <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 24px" }}>
              
              <div style={{ textAlign: "center", marginBottom: 36 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: "#059669", letterSpacing: "1px", textTransform: "uppercase" }}>
                  FAQ
                </span>
                <h2 style={{ fontSize: "26px", fontWeight: 800, color: "#062828", margin: "6px 0 0 0" }}>
                  자주 묻는 질문
                </h2>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {FAQS.map((faq, index) => {
                  const isOpen = openFaqIndex === index;
                  return (
                    <div
                      key={index}
                      style={{
                        backgroundColor: isOpen ? "#f4fbf7" : "#ffffff",
                        border: isOpen ? "1.5px solid #059669" : "1px solid #e2e8f0",
                        borderRadius: 12,
                        overflow: "hidden",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <button
                        onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                        style={{
                          width: "100%",
                          padding: "20px 24px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          backgroundColor: "transparent",
                          border: "none",
                          cursor: "pointer",
                          textAlign: "left",
                          gap: 16,
                        }}
                      >
                        <span style={{ fontSize: 16, fontWeight: 700, color: isOpen ? "#064e3b" : "#1e293b", lineHeight: 1.4 }}>
                          Q. {faq.q}
                        </span>
                        <span
                          style={{
                            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                            transition: "transform 0.2s ease",
                            color: isOpen ? "#059669" : "#94a3b8",
                            fontSize: 14,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          ▼
                        </span>
                      </button>

                      {isOpen && (
                        <div
                          style={{
                            padding: "0 24px 22px 24px",
                            fontSize: 14.5,
                            color: "#475569",
                            lineHeight: 1.7,
                            borderTop: "1px solid rgba(5, 150, 105, 0.1)",
                            paddingTop: 16,
                          }}
                        >
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
          <section style={{ backgroundColor: "#062326", color: "#ffffff", padding: "50px 0", textAlign: "center" }}>
            <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 24px" }}>
              <h3 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 10px 0" }}>
                지역 1등 부동산으로 성장하는 가장 확실한 1년
              </h3>
              <p style={{ fontSize: 15, color: "#a7f3d0", margin: "0 0 24px 0" }}>
                지금 가입하고 1년 동안 제공되는 모든 AI 실무 특강과 자료를 무제한으로 누리세요.
              </p>
              <button
                onClick={() => scrollToSection("study-lectures-section")}
                style={{
                  padding: "13px 32px",
                  background: "#059669",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 15,
                  fontWeight: 800,
                  cursor: "pointer",
                  boxShadow: "0 4px 16px rgba(5, 150, 105, 0.4)",
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
          <div style={{ background: "#ffffff", borderRadius: 14, padding: "32px 28px", border: "1px solid #d1fae5" }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "#062828", margin: "0 0 20px 0" }}>📋 내 수강신청 내역</h2>
            {loadingEnrollments ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: "#64748b" }}>수강 내역을 불러오는 중...</div>
            ) : enrollments.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", color: "#94a3b8" }}>
                <div style={{ fontSize: 44, marginBottom: 14 }}>📭</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: "#062828", marginBottom: 8 }}>수강 신청 내역이 없습니다</div>
                <button
                  onClick={() => handleTabChange("lecture")}
                  style={{ marginTop: 12, padding: "8px 20px", background: "#062326", color: "#fff", border: "none", borderRadius: 8, fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}
                >
                  특강 목록 둘러보기
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {enrollments.map((en: any) => (
                  <div key={en.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 16, border: "1px solid #d1fae5", borderRadius: 8, background: "#f4fbf7" }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#062828", marginBottom: 4 }}>{en.lectures?.title || "특강"}</div>
                      <div style={{ fontSize: 13, color: "#64748b" }}>신청일: {en.created_at?.substring(0, 10)} | 결제: {en.paid_points?.toLocaleString() || 0} P</div>
                    </div>
                    <Link href={`/study_read?id=${en.lecture_id}`} style={{ padding: "8px 18px", background: "#059669", color: "#fff", borderRadius: 6, fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
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
          <div style={{ background: "#ffffff", borderRadius: 14, padding: "32px 28px", border: "1px solid #d1fae5" }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "#062828", margin: "0 0 20px 0" }}>🎬 나의 강의실</h2>
            {loadingEnrollments ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: "#64748b" }}>강의 목록을 불러오는 중...</div>
            ) : enrollments.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", color: "#94a3b8" }}>
                <div style={{ fontSize: 44, marginBottom: 14 }}>🎓</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: "#062828", marginBottom: 8 }}>수강 중인 강의가 없습니다</div>
                <button
                  onClick={() => handleTabChange("lecture")}
                  style={{ marginTop: 12, padding: "8px 20px", background: "#062326", color: "#fff", border: "none", borderRadius: 8, fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}
                >
                  지금 특강 신청하기
                </button>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
                {enrollments.map((en: any) => (
                  <Link key={en.id} href={`/study_read?id=${en.lecture_id}`} style={{ textDecoration: "none", color: "inherit" }}>
                    <div style={{ border: "1px solid #d1fae5", borderRadius: 10, overflow: "hidden", background: "#fff" }}>
                      <div style={{ width: "100%", aspectRatio: "16/9", background: "#062326", display: "flex", alignItems: "center", justifyContent: "center", color: "#34d399", fontSize: 28 }}>
                        ▶
                      </div>
                      <div style={{ padding: 14 }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: "#062828", marginBottom: 4 }}>{en.lectures?.title}</div>
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
