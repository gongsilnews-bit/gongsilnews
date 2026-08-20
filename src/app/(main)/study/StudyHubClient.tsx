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

export default function StudyHubClient({
  initialLectures,
  initialTab = "lecture",
  initialCategory = "전체",
}: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"lecture" | "applications" | "classroom">(
    initialTab as any || "lecture"
  );
  const [activeCategory, setActiveCategory] = useState<string>(initialCategory);
  const [lectures, setLectures] = useState<any[]>(initialLectures);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [loadingEnrollments, setLoadingEnrollments] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // 유저 세션 로드
  useEffect(() => {
    async function loadUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
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
      (activeCategory === "AI마케팅/쇼츠" && (item.category?.includes("마케팅") || item.title?.includes("쇼츠") || item.title?.includes("AI")));
    const matchSearch =
      !searchQuery.trim() ||
      item.title?.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
      item.instructor_name?.toLowerCase().includes(searchQuery.toLowerCase().trim());
    return matchCategory && matchSearch;
  });

  const isNew = (createdAt: string) => {
    if (!createdAt) return false;
    const diff = Date.now() - new Date(createdAt).getTime();
    return diff < 7 * 24 * 60 * 60 * 1000;
  };

  return (
    <div className="bg-[#f8f9fa] font-sans text-[#222] min-h-[85vh]">
      {/* 1. 상단 히어로 배너 */}
      <div style={{ background: "linear-gradient(135deg, #102c57 0%, #1a4282 100%)", color: "#ffffff", padding: "48px 0 40px" }}>
        <div className="container mx-auto px-20" style={{ maxWidth: 1200 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 20 }}>
            <div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.15)", padding: "4px 12px", borderRadius: 20, fontSize: 13, fontWeight: 700, marginBottom: 12 }}>
                <span>🎓</span>
                <span>공실뉴스 부동산 아카데미</span>
              </div>
              <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.8px", margin: "0 0 10px 0" }}>
                부동산 실무 & 특강 허브
              </h1>
              <p style={{ fontSize: 16, color: "rgba(255,255,255,0.85)", margin: 0, letterSpacing: "-0.3px" }}>
                11만 부동산 전문가와 투자자를 위한 검증된 실전 특강과 노하우를 한곳에서 만나보세요.
              </p>
            </div>

            {/* 검색창 */}
            <div style={{ width: 320, position: "relative" }}>
              <input
                type="text"
                placeholder="특강 제목 또는 강사명 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: "100%",
                  height: 44,
                  background: "rgba(255,255,255,0.95)",
                  border: "none",
                  borderRadius: 22,
                  padding: "0 40px 0 18px",
                  fontSize: 14,
                  color: "#111",
                  outline: "none",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                }}
              />
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", right: 14, top: 13 }}>
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </div>
          </div>

          {/* 2차 서브메뉴 탭 */}
          <div style={{ display: "flex", gap: 10, marginTop: 32 }}>
            <button
              onClick={() => handleTabChange("lecture")}
              style={{
                padding: "10px 22px",
                borderRadius: 24,
                fontSize: 15,
                fontWeight: activeTab === "lecture" ? 800 : 600,
                color: activeTab === "lecture" ? "#102c57" : "#ffffff",
                background: activeTab === "lecture" ? "#ffffff" : "rgba(255,255,255,0.12)",
                border: "none",
                cursor: "pointer",
                transition: "all 0.2s",
                boxShadow: activeTab === "lecture" ? "0 4px 12px rgba(0,0,0,0.15)" : "none",
              }}
            >
              🎓 전체 특강 목록
            </button>
            <button
              onClick={() => handleTabChange("applications")}
              style={{
                padding: "10px 22px",
                borderRadius: 24,
                fontSize: 15,
                fontWeight: activeTab === "applications" ? 800 : 600,
                color: activeTab === "applications" ? "#102c57" : "#ffffff",
                background: activeTab === "applications" ? "#ffffff" : "rgba(255,255,255,0.12)",
                border: "none",
                cursor: "pointer",
                transition: "all 0.2s",
                boxShadow: activeTab === "applications" ? "0 4px 12px rgba(0,0,0,0.15)" : "none",
              }}
            >
              📋 내 수강신청 내역
            </button>
            <button
              onClick={() => handleTabChange("classroom")}
              style={{
                padding: "10px 22px",
                borderRadius: 24,
                fontSize: 15,
                fontWeight: activeTab === "classroom" ? 800 : 600,
                color: activeTab === "classroom" ? "#102c57" : "#ffffff",
                background: activeTab === "classroom" ? "#ffffff" : "rgba(255,255,255,0.12)",
                border: "none",
                cursor: "pointer",
                transition: "all 0.2s",
                boxShadow: activeTab === "classroom" ? "0 4px 12px rgba(0,0,0,0.15)" : "none",
              }}
            >
              🎬 나의 강의실
            </button>
          </div>
        </div>
      </div>

      {/* 2. 본문 영역 */}
      <main className="container mx-auto px-20 pt-30 pb-50" style={{ maxWidth: 1200 }}>
        {/* 특강 목록 탭 */}
        {activeTab === "lecture" && (
          <div>
            {/* 분야별 카테고리 필터 */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 28, background: "#ffffff", padding: "14px 20px", borderRadius: 12, border: "1px solid #e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#555", marginRight: 8 }}>분야별 특강:</span>
              {CATEGORIES.map((cat) => {
                const isSel = activeCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    style={{
                      padding: "6px 16px",
                      borderRadius: 20,
                      fontSize: 14,
                      fontWeight: isSel ? 700 : 500,
                      color: isSel ? "#ffffff" : "#4b5563",
                      backgroundColor: isSel ? "#1a4282" : "#f3f4f6",
                      border: isSel ? "1px solid #1a4282" : "1px solid #e5e7eb",
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            {/* 특강 카드 그리드 (4열) */}
            {filteredLectures.length === 0 ? (
              <div style={{ textAlign: "center", padding: "80px 20px", background: "#ffffff", borderRadius: 16, border: "1px solid #eee", color: "#888" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#333", marginBottom: 8 }}>해당 조건의 특강이 없습니다</div>
                <p style={{ fontSize: 14, color: "#999", margin: 0 }}>다른 검색어나 카테고리를 선택해 보세요.</p>
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
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
                      className="lecture-card"
                    >
                      <div
                        style={{
                          backgroundColor: "#ffffff",
                          borderRadius: 14,
                          overflow: "hidden",
                          border: "1px solid #e5e7eb",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                          transition: "all 0.25s ease",
                          height: "100%",
                          display: "flex",
                          flexDirection: "column",
                          cursor: "pointer",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = "translateY(-6px)";
                          e.currentTarget.style.boxShadow = "0 12px 24px rgba(26,66,130,0.12)";
                          e.currentTarget.style.borderColor = "#1a4282";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = "translateY(0)";
                          e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.04)";
                          e.currentTarget.style.borderColor = "#e5e7eb";
                        }}
                      >
                        {/* 썸네일 */}
                        <div style={{ width: "100%", aspectRatio: "16/9", position: "relative", overflow: "hidden", backgroundColor: "#e2e8f0" }}>
                          {item.thumbnail_url ? (
                            <img
                              src={item.thumbnail_url}
                              alt={item.title}
                              style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.3s" }}
                            />
                          ) : (
                            <div
                              style={{
                                width: "100%",
                                height: "100%",
                                background: "linear-gradient(135deg, #1a2e50 0%, #2d5a8c 100%)",
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
                              <span style={{ fontSize: 13, fontWeight: 700, opacity: 0.9 }}>{item.category || "부동산특강"}</span>
                            </div>
                          )}
                          {isNew(item.created_at) && (
                            <span style={{ position: "absolute", top: 10, left: 10, background: "#ef4444", color: "#fff", fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 4, letterSpacing: "0.5px" }}>
                              NEW
                            </span>
                          )}
                        </div>

                        {/* 내용 */}
                        <div style={{ padding: "18px 16px", flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                          <div>
                            <span style={{ fontSize: 12, fontWeight: 700, color: "#1a4282", background: "#edf4ff", padding: "3px 8px", borderRadius: 4, display: "inline-block", marginBottom: 8 }}>
                              {item.category || "중개실무"}
                            </span>
                            <h3
                              style={{
                                fontSize: 16,
                                fontWeight: 700,
                                color: "#111827",
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
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13, color: "#6b7280", marginBottom: 12 }}>
                              <span>{item.instructor_name || "공실뉴스 강사진"}</span>
                              <span style={{ display: "flex", alignItems: "center", gap: 3, color: "#d97706", fontWeight: 700 }}>
                                ★ {(item.rating || 4.9).toFixed(1)} ({item.review_count || 120})
                              </span>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 10, borderTop: "1px solid #f1f5f9" }}>
                              <span style={{ fontSize: 16, fontWeight: 800, color: item.price ? "#102c57" : "#059669" }}>
                                {item.price ? `${item.price.toLocaleString()} P` : "무료 특강"}
                              </span>
                              <span style={{ fontSize: 12, fontWeight: 700, color: "#3b82f6" }}>
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
        )}

        {/* 내 수강신청 내역 탭 */}
        {activeTab === "applications" && (
          <div style={{ background: "#ffffff", borderRadius: 16, padding: "32px 28px", border: "1px solid #e5e7eb" }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "#111", margin: "0 0 20px 0" }}>📋 내 수강신청 내역</h2>
            {loadingEnrollments ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: "#888" }}>불러오는 중...</div>
            ) : enrollments.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", color: "#999" }}>
                <div style={{ fontSize: 44, marginBottom: 14 }}>📭</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: "#333", marginBottom: 8 }}>수강 신청 내역이 없습니다</div>
                <button
                  onClick={() => handleTabChange("lecture")}
                  style={{ marginTop: 12, padding: "8px 20px", background: "#1a4282", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer" }}
                >
                  특강 목록 둘러보기
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {enrollments.map((en: any) => (
                  <div key={en.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 16, border: "1px solid #eee", borderRadius: 10, background: "#fdfdfd" }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#111", marginBottom: 4 }}>{en.lectures?.title || "특강"}</div>
                      <div style={{ fontSize: 13, color: "#888" }}>신청일: {en.created_at?.substring(0, 10)} | 결제: {en.paid_points?.toLocaleString() || 0} P</div>
                    </div>
                    <Link href={`/study_read?id=${en.lecture_id}`} style={{ padding: "8px 18px", background: "#102c57", color: "#fff", borderRadius: 6, fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
                      강의실 입장
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 나의 강의실 탭 */}
        {activeTab === "classroom" && (
          <div style={{ background: "#ffffff", borderRadius: 16, padding: "32px 28px", border: "1px solid #e5e7eb" }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "#111", margin: "0 0 20px 0" }}>🎬 나의 강의실</h2>
            {loadingEnrollments ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: "#888" }}>불러오는 중...</div>
            ) : enrollments.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", color: "#999" }}>
                <div style={{ fontSize: 44, marginBottom: 14 }}>🎓</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: "#333", marginBottom: 8 }}>수강 중인 강의가 없습니다</div>
                <button
                  onClick={() => handleTabChange("lecture")}
                  style={{ marginTop: 12, padding: "8px 20px", background: "#1a4282", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer" }}
                >
                  지금 특강 신청하기
                </button>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
                {enrollments.map((en: any) => (
                  <Link key={en.id} href={`/study_read?id=${en.lecture_id}`} style={{ textDecoration: "none", color: "inherit" }}>
                    <div style={{ border: "1px solid #eee", borderRadius: 12, overflow: "hidden", background: "#fff", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
                      <div style={{ width: "100%", aspectRatio: "16/9", background: "#1a2e50", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 32 }}>
                        ▶
                      </div>
                      <div style={{ padding: 14 }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: "#111", marginBottom: 6 }}>{en.lectures?.title}</div>
                        <div style={{ fontSize: 13, color: "#666" }}>강사: {en.lectures?.instructor_name || "강사진"}</div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {isAuthModalOpen && <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />}
    </div>
  );
}
