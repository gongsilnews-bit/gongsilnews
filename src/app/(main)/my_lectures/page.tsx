"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { getMyEnrollments } from "@/app/actions/lecture";

export default function MyLecturesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [enrollments, setEnrollments] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/"); return; }

      const res = await getMyEnrollments(user.id);
      if (res.success) setEnrollments(res.data);
      setLoading(false);
    };
    load();
  }, [router]);

  return (
    <div className="bg-[#f8f9fa] font-sans text-[#222] min-h-[80vh]">
      <main className="container mx-auto px-20 pt-10 pb-20" style={{ position: "relative", maxWidth: 1200 }}>
        <div className="news-layout">
          <div className="news-list-area">
            
            <div className="list-header" style={{ marginBottom: 24 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              내 수강특강
            </div>

            {loading ? (
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "40vh" }}>
                <div style={{ textAlign: "center", color: "#9ca3af" }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>📚</div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>수강 내역을 불러오는 중...</div>
                </div>
              </div>
            ) : enrollments.length === 0 ? (
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "40vh", background: "#fff", borderRadius: 16, border: "1px solid #eee", boxShadow: "0 4px 20px rgba(0,0,0,0.03)" }}>
                <div style={{ textAlign: "center", color: "#9ca3af" }}>
                  <div style={{ fontSize: 56, marginBottom: 20 }}>📭</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#333", marginBottom: 12 }}>수강 중인 특강이 없습니다</div>
                  <div style={{ fontSize: 15, color: "#888", lineHeight: 1.6 }}>
                    지금 바로 공실뉴스의 유익한 특강을 만나보세요!
                  </div>
                  <button
                    onClick={() => router.push("/study_read")}
                    style={{ marginTop: 24, padding: "12px 32px", background: "#059669", color: "#fff", border: "none", borderRadius: 12, fontSize: 16, fontWeight: 800, cursor: "pointer", transition: "all 0.2s", boxShadow: "0 4px 12px rgba(5, 150, 105, 0.2)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
                  >
                    부동산특강 둘러보기
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: '16px', padding: '12px 16px', background: '#f0f4ff', borderRadius: '8px', fontSize: '14px', color: '#555' }}>
                  총 <strong style={{ color: '#1a2e50' }}>{enrollments.length}</strong>개의 수강특강이 있습니다.
                </div>

                <div>
                  {enrollments.map((en: any, idx: number) => {
                    const lecture = en.lecture;
                    const isExpired = new Date(en.expires_at) < new Date();
                    
                    return (
                      <div key={en.id} style={{ position: "relative" }}>
                        <Link href={`/study_watch?id=${en.lecture_id}`} style={{ textDecoration: "none", color: "inherit" }}>
                          <div className="an-card" style={{ display: "flex", alignItems: "center", padding: "20px", borderBottom: "1px solid #e5e7eb", background: "#fff", transition: "background 0.2s" }}
                               onMouseEnter={(e) => e.currentTarget.style.background = "#f9fafb"}
                               onMouseLeave={(e) => e.currentTarget.style.background = "#fff"}>
                            
                            <div className="an-img" style={{ width: 160, height: 100, flexShrink: 0, marginRight: 20, borderRadius: 8, overflow: "hidden", position: "relative", background: "#f3f4f6" }}>
                              {lecture?.thumbnail_url ? (
                                <img src={lecture.thumbnail_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                              ) : (
                                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,#a8edea,#fed6e3)", color: "#fff", fontSize: 14, fontWeight: 800 }}>
                                  {lecture?.category || "특강"}
                                </div>
                              )}
                              {isExpired && (
                                <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13, fontWeight: 800 }}>
                                  기간 만료
                                </div>
                              )}
                            </div>

                            <div className="an-body" style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                              <div style={{ fontSize: 18, fontWeight: 800, color: "#111", marginBottom: 8, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                                {lecture?.title || "삭제된 강의입니다"}
                              </div>
                              <div className="an-meta" style={{ display: "flex", alignItems: "center", fontSize: 13, color: "#6b7280" }}>
                                <span style={{ color: "#059669", fontWeight: "bold", marginRight: 8 }}>
                                  [{lecture?.category || "일반특강"}]
                                </span>
                                결제포인트: {en.points_paid.toLocaleString()}P · 만료일: {new Date(en.expires_at).toLocaleDateString()}
                              </div>
                            </div>
                            
                            <div style={{ marginLeft: "auto", paddingLeft: 20 }}>
                               <span style={{ display: "inline-block", padding: "8px 16px", background: isExpired ? "#fef2f2" : "#eff6ff", color: isExpired ? "#ef4444" : "#2563eb", borderRadius: 6, fontSize: 14, fontWeight: 700 }}>
                                 {isExpired ? "재수강하기" : "수강하기 ▶"}
                               </span>
                            </div>
                          </div>
                        </Link>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* 우측 사이드바 (배너 광고용 여백) */}
          <div className="news-sidebar">
            <div style={{ marginBottom: 20 }}>
              {/* 여기에 배너 컴포넌트가 들어갈 수 있습니다 */}
              {/* <BannerSlot placement="LIST_SIDEBAR" category="lecture" /> */}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
