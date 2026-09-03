"use client";

import React, { useState } from "react";
import Link from "next/link";
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

const COMMUNITY_ITEMS = [
  { id: "free", name: "자유게시판", desc: "공실뉴스 회원들의 자유로운 이야기", icon: "💬", color: "#2563eb", background: "linear-gradient(135deg, #dbeafe, #eff6ff)" },
  { id: "qna", name: "Q&A게시판", desc: "부동산 실무 궁금증을 함께 해결", icon: "❓", color: "#7c3aed", background: "linear-gradient(135deg, #ede9fe, #f5f3ff)" },
  { id: "notice", name: "공지사항", desc: "공실뉴스의 새로운 소식과 안내", icon: "📢", color: "#ea580c", background: "linear-gradient(135deg, #ffedd5, #fff7ed)" },
  { id: "inquiry", name: "1:1 문의", desc: "공실뉴스에 궁금한 점을 문의", icon: "✉️", color: "#059669", background: "linear-gradient(135deg, #d1fae5, #ecfdf5)" },
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

export default function MobileStudyHubClient({ lectures }: any) {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const initialTab: StudyTab = tabParam === "board" ? "board" : tabParam === "applications" ? "applications" : tabParam === "community" ? "community" : "lecture";
  const [activeTab, setActiveTab] = useState<StudyTab>(initialTab);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [loadingEnrollments, setLoadingEnrollments] = useState(false);
  const router = useRouter();

  React.useEffect(() => {
    const currentTab: StudyTab = tabParam === "board" ? "board" : tabParam === "applications" ? "applications" : tabParam === "community" ? "community" : "lecture";
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
    <div style={{ width: "100%", backgroundColor: "#f8fafc", minHeight: "100vh", paddingBottom: "80px", paddingTop: "56px", fontFamily: "'Pretendard Variable', -apple-system, sans-serif", color: "#1e293b" }}>
      <MobileTopBarHeader activeTab="study" />
      <StudySubMenuBar activeTab={activeTab} onTabChange={handleTabChange} />

      {/* ── 특강 콘텐츠 ── */}
      {activeTab === "lecture" && (
        <div>
          
          {/* 1. 모바일 히어로 배너 (윤자동 딥 포레스트 그린 스타일) */}
          <div style={{ backgroundColor: "#062326", color: "#ffffff", padding: "28px 20px 24px", margin: "12px 16px 20px", borderRadius: 14, boxShadow: "0 4px 16px rgba(6,35,38,0.15)" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)", padding: "4px 10px", borderRadius: 16, fontSize: 11.5, fontWeight: 700, color: "#6ee7b7", marginBottom: 12 }}>
              <span>🌿</span>
              <span>1년(12개월) 부동산 실무 & AI 마스터마인드</span>
            </div>

            <h1 style={{ fontSize: "19px", fontWeight: 900, lineHeight: 1.35, letterSpacing: "-0.5px", margin: "0 0 10px 0" }}>
              AI 유튜브 시대! 부동산 중개에<br />
              <span style={{ color: "#34d399" }}>꼭! 필요한 실전 마케팅 스터디</span>
            </h1>

            <p style={{ fontSize: "13px", color: "#a7f3d0", opacity: 0.9, lineHeight: 1.55, margin: "0 0 16px 0", wordBreak: "keep-all" }}>
              매월 업데이트되는 최신 AI 마케팅 기술과 실전 노하우로 지역 1등 부동산을 완성하세요.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 12px", fontSize: "12px", color: "#d1fae5", fontWeight: 600, marginBottom: "16px" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ color: "#34d399" }}>✓</span> 365일 무제한 수강
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ color: "#34d399" }}>✓</span> 매월 신규 VOD 업데이트
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ color: "#34d399" }}>✓</span> 실무 서식 100% 제공
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ color: "#34d399" }}>✓</span> 11만 중개사 크루 연계
              </span>
            </div>

            {/* 16:9 유튜브 비디오 플레이어 */}
            <div
              style={{
                position: "relative",
                width: "100%",
                aspectRatio: "16/9",
                borderRadius: 10,
                overflow: "hidden",
                boxShadow: "0 6px 20px rgba(0, 0, 0, 0.35)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                background: "#000000",
                marginBottom: 16,
              }}
            >
              <iframe
                src="https://www.youtube-nocookie.com/embed/QyClYIjPzao?rel=0"
                title="공실스터디 안내 영상"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  border: "none",
                }}
              />
            </div>

            <Link
              href="/m/study/about"
              style={{
                display: "block",
                textAlign: "center",
                padding: "12px",
                background: "#059669",
                color: "#ffffff",
                borderRadius: 8,
                fontSize: "14px",
                fontWeight: 800,
                textDecoration: "none",
                boxShadow: "0 2px 8px rgba(5, 150, 105, 0.3)",
              }}
            >
              공실스터디 자세히 보기 →
            </Link>
          </div>

          {/* 2. 특강 목록 */}
          <div style={{ padding: "0 16px 24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: "#062828" }}>전체 스터디 특강</span>
              <span style={{ fontSize: 12.5, color: "#64748b", fontWeight: 600 }}>총 {lectures.length}개</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {lectures.length === 0 && (
                <div style={{ padding: "50px 20px", textAlign: "center", color: "#9ca3af", backgroundColor: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                  등록된 특강이 없습니다.
                </div>
              )}

              {lectures.map((lecture: any) => (
                <Link key={lecture.id} href={`/m/study_read?id=${lecture.id}`} style={{ textDecoration: "none" }}>
                  <div style={{ backgroundColor: "#ffffff", borderRadius: "12px", overflow: "hidden", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
                    <div style={{ width: "100%", aspectRatio: "16/9", position: "relative", backgroundColor: "#062326" }}>
                      {lecture.thumbnail_url ? (
                        <img src={lecture.thumbnail_url} alt={lecture.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,#062326,#064e3b)", color: "#fff" }}>
                          <span style={{ fontSize: 28, marginBottom: 4 }}>🎓</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "#6ee7b7" }}>{lecture.category || "공실스터디"}</span>
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
                      <h2 style={{ color: "#062828", fontSize: "16.5px", fontWeight: 800, lineHeight: 1.35, margin: "0 0 10px 0", wordBreak: "keep-all", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {lecture.title}
                      </h2>

                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "12.5px", color: "#64748b", marginBottom: "12px" }}>
                        <span>{lecture.instructor_name || "강사진"}</span>
                        <span style={{ display: "flex", alignItems: "center", gap: 3, color: "#d97706", fontWeight: 700 }}>
                          ★ {(lecture.rating || 4.9).toFixed(1)} ({lecture.review_count || 120})
                        </span>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 10, borderTop: "1px solid #f1f5f9" }}>
                        <span style={{ color: "#062828", fontWeight: 900, fontSize: "16px" }}>
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
            <div style={{ fontSize: 15, fontWeight: 800, color: "#062828", marginBottom: 12 }}>
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
                      <span style={{ fontSize: 13.5, fontWeight: 700, color: isOpen ? "#064e3b" : "#1e293b", lineHeight: 1.4 }}>
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
                  <div style={{ fontSize: "15px", fontWeight: 700, color: "#062828", marginBottom: "2px" }}>
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

      {activeTab === "community" && (
        <div style={{ padding: "16px", paddingTop: "10px" }}>
          <div style={{ marginBottom: 14 }}>
            <div style={{ color: "#062828", fontSize: 16, fontWeight: 800 }}>💬 커뮤니티</div>
            <div style={{ marginTop: 4, color: "#64748b", fontSize: 12 }}>공실뉴스 회원들과 소식을 나눠보세요.</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
            {COMMUNITY_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => router.push(`/m/board?id=${item.id}`)}
                style={{ padding: 0, overflow: "hidden", textAlign: "left", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, boxShadow: "0 2px 8px rgba(15,23,42,0.05)", cursor: "pointer" }}
              >
                <div style={{ height: 92, display: "flex", alignItems: "center", justifyContent: "center", background: item.background, color: item.color, fontSize: 38 }}>
                  {item.icon}
                </div>
                <div style={{ padding: "12px 11px 13px" }}>
                  <div style={{ marginBottom: 4, color: "#0f172a", fontSize: 14, fontWeight: 800 }}>{item.name}</div>
                  <div style={{ minHeight: 32, color: "#64748b", fontSize: 11, lineHeight: 1.45 }}>{item.desc}</div>
                  <div style={{ marginTop: 9, color: item.color, fontSize: 11, fontWeight: 800 }}>게시판 보기 ›</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {activeTab === "applications" && (
        <div style={{ padding: "16px", paddingTop: "10px" }}>
          <div style={{ marginBottom: 12, color: "#062828", fontSize: 16, fontWeight: 800 }}>📋 내 수강신청 내역</div>
          {loadingEnrollments ? (
            <div style={{ padding: "56px 20px", textAlign: "center", color: "#64748b", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12 }}>
              수강 내역을 불러오는 중...
            </div>
          ) : enrollments.length === 0 ? (
            <div style={{ padding: "56px 20px", textAlign: "center", color: "#94a3b8", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12 }}>
              <div style={{ fontSize: 42, marginBottom: 12 }}>📭</div>
              <div style={{ marginBottom: 14, color: "#062828", fontSize: 15, fontWeight: 700 }}>수강 신청 내역이 없습니다</div>
              <button type="button" onClick={() => handleTabChange("lecture")} style={{ padding: "9px 16px", color: "#fff", background: "#062326", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700 }}>특강 목록 둘러보기</button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {enrollments.map((en: any) => (
                <div key={en.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: 14, background: "#f4fbf7", border: "1px solid #d1fae5", borderRadius: 10 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ overflow: "hidden", marginBottom: 4, color: "#062828", fontSize: 14, fontWeight: 700, textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{en.lecture?.title || "특강"}</div>
                    <div style={{ color: "#64748b", fontSize: 11.5 }}>신청일: {en.created_at?.substring(0, 10) || "-"} · 결제: {(en.points_paid || 0).toLocaleString()}P</div>
                  </div>
                  <Link href={`/m/study_read?id=${en.lecture_id}`} style={{ flexShrink: 0, padding: "8px 10px", color: "#fff", background: "#059669", borderRadius: 6, fontSize: 11.5, fontWeight: 700, textDecoration: "none" }}>강의실 입장</Link>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
