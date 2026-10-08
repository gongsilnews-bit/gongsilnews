"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import MobileTopBarHeader from "../_components/MobileTopBarHeader";
import StudySubMenuBar, { type StudyTab } from "../_components/StudySubMenuBar";
import { createClient } from "@/utils/supabase/client";
import { getMyEnrollments } from "@/app/actions/lecture";

// SVG Pictogram Icons
const IconDrone = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 5l2 2M19 5l-2 2M5 19l2-2M19 19l-2-2"/><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg>;
const IconApp = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>;
const IconAI = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z"/><path d="M16 14H8l-2 8h12l-2-8z"/><line x1="9" y1="18" x2="15" y2="18"/></svg>;
const IconMusic = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>;
const IconDoc = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>;

const BOARD_ITEMS = [
  { id: "drone", name: "드론영상", desc: "매물 홍보용 드론 항공 촬영 영상", icon: <IconDrone /> },
  { id: "app", name: "APP(앱)", desc: "부동산 업무에 유용한 앱 모음", icon: <IconApp /> },
  { id: "prompt", name: "AI 프롬프트", desc: "ChatGPT·AI 활용 프롬프트 공유", icon: <IconAI /> },
  { id: "sound", name: "음원", desc: "매물 영상용 배경 음원 자료", icon: <IconMusic /> },
  { id: "doc", name: "계약서/양식", desc: "부동산 계약서 및 실무 양식", icon: <IconDoc /> },
];



const FAQS = [
  {
    q: "초보 공인중개사도 AI 쇼츠를 만들 수 있나요?",
    a: "네! 코딩 없이 클릭 몇 번으로 매물 쇼츠를 뽑아내는 실습 위주로 구성되어 있어 누구나 쉽게 따라할 수 있습니다.",
  },
  {
    q: "1년 과정은 언제든 시작할 수 있나요?",
    a: "상시 가입 즉시 시작 가능하며, 가입일로부터 365일간 모든 강의와 서식을 무제한 이용할 수 있습니다.",
  },
  {
    q: "실무 서식은 어디서 다운로드받나요?",
    a: "강의실 내 자료실 및 상단 [자료실] 메뉴에서 한글(HWP), 엑셀, AI 프롬프트 원본을 자유롭게 다운로드받으실 수 있습니다.",
  },
];

const CATEGORIES = [
  "전체",
  "중개실무",
  "법률",
  "세무",
  "분양",
  "마케팅",
  "기타",
];

export default function MobileStudyHubClient({
  lectures,
  categories = CATEGORIES,
}: any) {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const initialTab: StudyTab = tabParam === "board" ? "board" : tabParam === "applications" ? "applications" : "lecture";
  const [activeTab, setActiveTab] = useState<StudyTab>(initialTab);
  const [activeCategory, setActiveCategory] = useState<string>("전체");
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [loadingEnrollments, setLoadingEnrollments] = useState(false);
  const router = useRouter();

  const filteredLectures = (lectures || []).filter((lecture: any) => {
    if (activeCategory === "전체") return true;
    return lecture.category === activeCategory || lecture.category?.includes(activeCategory);
  });

  React.useEffect(() => {
    const currentTab: StudyTab = tabParam === "board" ? "board" : tabParam === "applications" ? "applications" : "lecture";
    setActiveTab(currentTab);
  }, [tabParam]);

  React.useEffect(() => {
    if (activeTab !== "applications") return;

    let cancelled = false;
    const loadEnrollments = async () => {
      setLoadingEnrollments(true);
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          if (!cancelled) setEnrollments([]);
          return;
        }
        const result = await getMyEnrollments(user.id);
        if (!cancelled && result.success) setEnrollments(result.data || []);
      } finally {
        if (!cancelled) setLoadingEnrollments(false);
      }
    };

    loadEnrollments();
    return () => { cancelled = true; };
  }, [activeTab]);

  const handleTabChange = (newTab: StudyTab) => {
    setActiveTab(newTab);
    router.replace(`/m/study?tab=${newTab}`, { scroll: false });
  };

  return (
    <div style={{ width: "100%", maxWidth: "448px", margin: "0 auto", backgroundColor: "#f8fafc", minHeight: "100vh", paddingBottom: "80px", paddingTop: "108px", fontFamily: "'Pretendard Variable', -apple-system, sans-serif", color: "#1e293b" }}>
      <MobileTopBarHeader activeTab="study" />
      <StudySubMenuBar activeTab={activeTab} onTabChange={handleTabChange} />

      {/* ── 특강 콘텐츠 ── */}
      {activeTab === "lecture" && (
        <div>
          
          {/* 1. PC 공실스터디 배너의 모바일 버전 */}
          <div
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              minHeight: 250,
              margin: "12px 0 20px",
              backgroundColor: "#211b17",
              color: "#ffffff",
              borderRadius: 0,
              overflow: "hidden",
              boxShadow: "0 4px 16px rgba(26, 21, 18, 0.18)",
            }}
          >
            <Image
              src="/study_lectures_hero.png"
              alt="공실 앞에서 막막해하는 부동산 대표"
              fill
              priority
              sizes="(max-width: 448px) calc(100vw - 32px), 416px"
              style={{ objectFit: "cover", objectPosition: "center" }}
            />

            <div
              aria-hidden
              style={{
                position: "absolute",
                inset: 0,
                pointerEvents: "none",
                background: "linear-gradient(to right, rgba(33, 27, 23,0.98) 0%, rgba(33, 27, 23,0.9) 46%, rgba(33, 27, 23,0.45) 76%, rgba(33, 27, 23,0.18) 100%)",
              }}
            />

            <div style={{ position: "relative", zIndex: 1, width: "100%", padding: "34px 20px" }}>
              <h1
                style={{
                  maxWidth: 335,
                  fontSize: "clamp(18px, 5.2vw, 22px)",
                  fontWeight: 900,
                  lineHeight: 1.38,
                  letterSpacing: "-0.6px",
                  wordBreak: "keep-all",
                  margin: "0 0 24px 0",
                  textShadow: "0 2px 8px rgba(0, 0, 0, 0.45)",
                }}
              >
                다들 AI 유튜브로 중개한다던데<br />
                <span style={{ color: "#34d399" }}>나만 못 쓰고 있는 것 같으신가요?</span>
              </h1>

              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <Link
                  href="/m/study/about"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: 40,
                    padding: "9px 16px",
                    background: "#059669",
                    color: "#ffffff",
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 800,
                    textDecoration: "none",
                    boxShadow: "0 3px 10px rgba(5, 150, 105, 0.3)",
                  }}
                >
                  공실스터디란?
                </Link>
                <Link
                  href="/m/study/apply"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    minHeight: 40,
                    padding: "9px 2px",
                    color: "#ffffff",
                    fontSize: 13,
                    fontWeight: 800,
                    textDecoration: "none",
                    textShadow: "0 1px 5px rgba(0, 0, 0, 0.55)",
                  }}
                >
                  멤버십 신청하기 &gt;&gt;
                </Link>
              </div>
            </div>
          </div>

          {/* 2. 특강 목록 */}
          <div style={{ padding: "0 16px 24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: "#1c1917" }}>전체 스터디 특강</span>
              <span style={{ fontSize: 12.5, color: "#64748b", fontWeight: 600 }}>총 {filteredLectures.length}개</span>
            </div>

            {/* 카테고리 필터 버튼 바 */}
            <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "10px", marginBottom: "14px", WebkitOverflowScrolling: "touch", scrollbarWidth: "none" }}>
              {categories.map((cat: string) => {
                const isSel = activeCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    style={{
                      padding: "6px 14px",
                      borderRadius: "20px",
                      fontSize: "13px",
                      fontWeight: isSel ? 700 : 500,
                      whiteSpace: "nowrap",
                      color: isSel ? "#ffffff" : "#a8381a",
                      backgroundColor: isSel ? "#211b17" : "#ffffff",
                      border: isSel ? "1px solid #211b17" : "1px solid #d1fae5",
                      cursor: "pointer",
                      flexShrink: 0,
                    }}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {filteredLectures.length === 0 && (
                <div style={{ padding: "50px 20px", textAlign: "center", color: "#9ca3af", backgroundColor: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                  해당 카테고리의 특강이 없습니다.
                </div>
              )}

              {filteredLectures.map((lecture: any) => (
                <Link key={lecture.id} href={`/m/study_read?id=${lecture.id}`} style={{ textDecoration: "none" }}>
                  <div style={{ backgroundColor: "#ffffff", borderRadius: "12px", overflow: "hidden", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
                    <div style={{ width: "100%", aspectRatio: "16/9", position: "relative", backgroundColor: "#1a1613" }}>
                      {lecture.thumbnail_url ? (
                        <Image src={lecture.thumbnail_url} alt={lecture.title} fill sizes="(max-width: 448px) 100vw, 448px" style={{ objectFit: "cover" }} />
                      ) : (
                        <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,#1a1613,#3a2c22)", color: "#fff" }}>
                          <span style={{ fontSize: 28, marginBottom: 4 }}>🎓</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "#34d399" }}>{lecture.category || "공실스터디"}</span>
                        </div>
                      )}
                      <span style={{ position: "absolute", top: 10, left: 10, background: "#059669", color: "#fff", fontSize: 11, fontWeight: 800, padding: "2px 7px", borderRadius: 4 }}>
                        VOD
                      </span>
                    </div>

                    <div style={{ padding: "16px" }}>
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: "#047857", background: "#ecfdf5", padding: "2px 7px", borderRadius: 4, display: "inline-block", marginBottom: 6 }}>
                        {lecture.category || "중개실무"}
                      </span>
                      <h2 style={{ color: "#1c1917", fontSize: "16.5px", fontWeight: 800, lineHeight: 1.35, margin: "0 0 10px 0", wordBreak: "keep-all", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {lecture.title}
                      </h2>

                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "12.5px", color: "#64748b", marginBottom: "12px" }}>
                        <span>{lecture.instructor_name || "강사진"}</span>
                        <span style={{ display: "flex", alignItems: "center", gap: 3, color: "#d97706", fontWeight: 700 }}>
                          ★ {(lecture.rating || 4.9).toFixed(1)} ({lecture.review_count || 120})
                        </span>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 10, borderTop: "1px solid #f1f5f9" }}>
                        <span style={{ color: "#1c1917", fontWeight: 900, fontSize: "16px" }}>
                          {lecture.discount_price ? `${lecture.discount_price.toLocaleString()} P` : lecture.price ? `${lecture.price.toLocaleString()} P` : "무료 수강"}
                        </span>
                        <span style={{ fontSize: 12.5, fontWeight: 700, color: "#059669" }}>
                          수강신청 ›
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* 4. 자주 묻는 질문 FAQ (모바일 아코디언) */}
          <div style={{ padding: "0 16px 20px" }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#1c1917", marginBottom: 12 }}>
              자주 묻는 질문 FAQ
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {FAQS.map((faq, i) => {
                const isOpen = openFaqIndex === i;
                return (
                  <div
                    key={i}
                    style={{
                      backgroundColor: "#ffffff",
                      border: isOpen ? "1.5px solid #059669" : "1px solid #e2e8f0",
                      borderRadius: 10,
                      overflow: "hidden",
                      transition: "all 0.2s ease",
                      boxShadow: isOpen ? "0 2px 8px rgba(5, 150, 105, 0.08)" : "none",
                    }}
                  >
                    <button
                      onClick={() => setOpenFaqIndex(isOpen ? null : i)}
                      style={{
                        width: "100%",
                        padding: "14px 16px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        backgroundColor: "#ffffff",
                        border: "none",
                        textAlign: "left",
                        cursor: "pointer",
                        gap: 10,
                      }}
                    >
                      <span style={{ fontSize: 13.5, fontWeight: 700, color: isOpen ? "#3a2c22" : "#1e293b", lineHeight: 1.4 }}>
                        Q. {faq.q}
                      </span>
                      <span style={{ color: isOpen ? "#059669" : "#94a3b8", fontSize: 12, flexShrink: 0 }}>
                        {isOpen ? "▲" : "▼"}
                      </span>
                    </button>
                    {isOpen && (
                      <div style={{ padding: "0 16px 14px", fontSize: 12.5, color: "#334155", lineHeight: 1.6, borderTop: "1px solid #f1f5f9", paddingTop: 10 }}>
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* ── 자료실 콘텐츠 ── */}
      {activeTab === "board" && (
        <div style={{ padding: "16px", paddingTop: "10px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {BOARD_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => router.push(`/m/board?id=${item.id}`)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  padding: "16px",
                  backgroundColor: "#ffffff",
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                  cursor: "pointer",
                  textAlign: "left",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                }}
              >
                <div style={{ width: "44px", height: "44px", borderRadius: "10px", backgroundColor: "#ecfdf5", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {item.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "15px", fontWeight: 700, color: "#1c1917", marginBottom: "2px" }}>
                    {item.name}
                  </div>
                  <div style={{ fontSize: "12.5px", color: "#64748b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {item.desc}
                  </div>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </button>
            ))}
          </div>
        </div>
      )}

      {activeTab === "applications" && (
        <div style={{ padding: "16px", paddingTop: "10px" }}>
          <div style={{ marginBottom: 12, color: "#1c1917", fontSize: 16, fontWeight: 800 }}>📋 내 수강신청 내역</div>
          {loadingEnrollments ? (
            <div style={{ padding: "56px 20px", textAlign: "center", color: "#64748b", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12 }}>
              수강 내역을 불러오는 중...
            </div>
          ) : enrollments.length === 0 ? (
            <div style={{ padding: "56px 20px", textAlign: "center", color: "#94a3b8", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12 }}>
              <div style={{ fontSize: 42, marginBottom: 12 }}>📭</div>
              <div style={{ marginBottom: 14, color: "#1c1917", fontSize: 15, fontWeight: 700 }}>수강 신청 내역이 없습니다</div>
              <button type="button" onClick={() => handleTabChange("lecture")} style={{ padding: "9px 16px", color: "#fff", background: "#1a1613", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700 }}>특강 목록 둘러보기</button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {enrollments.map((en: any) => (
                <div key={en.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: 14, background: "#fbf8f4", border: "1px solid #d1fae5", borderRadius: 10 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ overflow: "hidden", marginBottom: 4, color: "#1c1917", fontSize: 14, fontWeight: 700, textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{en.lecture?.title || "특강"}</div>
                    <div style={{ color: "#64748b", fontSize: 11.5 }}>신청일: {en.created_at?.substring(0, 10) || "-"} · 결제: {(en.points_paid || 0).toLocaleString()}P</div>
                  </div>
                  <Link href={`/m/study_read?id=${en.lecture_id}`} style={{ flexShrink: 0, padding: "8px 10px", color: "#fff", background: "#059669", borderRadius: 6, fontSize: 11.5, fontWeight: 700, textDecoration: "none" }}>강의실 입장</Link>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* FAB: 내 강의실 (공실등록 버튼과 동일한 형식) */}
      <button
        type="button"
        onClick={() => router.push("/m/my_lectures")}
        style={{
          position: "fixed", bottom: "80px", right: "16px", height: "48px",
          borderRadius: "24px", background: "linear-gradient(135deg, #059669, #047857)",
          color: "#fff", border: "none", boxShadow: "0 6px 20px rgba(5, 150, 105, 0.4)",
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          padding: "0 18px", gap: "6px", zIndex: 100000,
          transition: "transform 0.15s ease",
        }}
        onMouseDown={(e) => { e.currentTarget.style.transform = "scale(0.92)"; }}
        onMouseUp={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
        onTouchStart={(e) => { e.currentTarget.style.transform = "scale(0.92)"; }}
        onTouchEnd={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ pointerEvents: "none" }}>
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
        <span style={{ fontSize: "14px", fontWeight: 800, color: "#fff", whiteSpace: "nowrap" }}>내 강의실</span>
      </button>
    </div>
  );
}

