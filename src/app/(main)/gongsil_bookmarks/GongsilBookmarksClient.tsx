"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { toggleWishlistToDB } from "@/app/actions/vacancyUserData";

export default function GongsilBookmarksClient() {
  const router = useRouter();
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const fetchBookmarks = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        // If not logged in, prompt and redirect
        alert("로그인이 필요합니다.");
        router.push("/");
        return;
      }
      setUser(user);

      // Fetch wishlist IDs from Supabase
      const { data: wishData } = await supabase
        .from("vacancy_wishlist")
        .select("vacancy_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      const wishIds = (wishData || []).map((row: any) => row.vacancy_id);

      if (wishIds.length > 0) {
        // Fetch properties from vacancies table
        const { data: props } = await supabase
          .from("vacancies")
          .select("*, vacancy_photos(url, sort_order)")
          .in("id", wishIds)
          .neq("status", "DELETED");

        if (props) {
          // Sort to match the wishlist order (latest first)
          const sortedProps = wishIds.map((id: string) => props.find((p: any) => p.id === id)).filter(Boolean);
          
          // Map images
          const withImages = sortedProps.map((p: any) => ({
            ...p,
            images: p.vacancy_photos ? [...p.vacancy_photos].sort((a:any, b:any) => a.sort_order - b.sort_order).map((pt:any) => pt.url) : []
          }));
          
          setProperties(withImages);
        }
      }
      setLoading(false);
    };

    fetchBookmarks();
  }, [router]);

  const handleRemove = async (id: string) => {
    // Optimistic UI update
    setProperties(prev => prev.filter(p => p.id !== id));
    
    // Update local storage to keep it in sync with map view
    const savedWish = localStorage.getItem('gongsil_wishlist');
    if (savedWish) {
      try {
        let localWish = JSON.parse(savedWish);
        localWish = localWish.filter((x: string) => x !== id);
        localStorage.setItem('gongsil_wishlist', JSON.stringify(localWish));
      } catch (e) {}
    }

    if (user) {
      await toggleWishlistToDB(user.id, id, false);
    }
  };

  const getPriceText = (prop: any) => {
    const formatPrice = (val: number) => {
      if (!val) return '0';
      if (val >= 100000000) {
        const uk = Math.floor(val / 100000000);
        const man = Math.floor((val % 100000000) / 10000);
        return man > 0 ? `${uk}억 ${man}만` : `${uk}억`;
      }
      return `${Math.floor(val / 10000)}만`;
    };
    if (prop.property_type === '분양') return `분양가 ${formatPrice(prop.sale_price)}`;
    if (prop.trade_type === '전세') return `전세 ${formatPrice(prop.deposit)}`;
    if (prop.trade_type === '월세') return `월세 ${formatPrice(prop.deposit)} / ${formatPrice(prop.monthly_rent)}`;
    if (prop.trade_type === '매매') return `매매 ${formatPrice(prop.price)}`;
    return '가격상담';
  };

  return (
    <main className="container px-20" style={{ position: "relative" }}>
      <div className="news-layout" style={{ maxWidth: 1000, margin: "0 auto" }}>
        {/* 중앙 단일 영역 레이아웃 (우측 배너 영역 제외) */}
        <div className="news-list-area" style={{ width: "100%", paddingRight: 0, paddingLeft: 0, borderRight: "none" }}>
          
          <div className="list-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #111", paddingBottom: 16, marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <span style={{ fontSize: 24, marginRight: 8 }}>📌</span>
              찜한공실
              <span style={{ fontSize: 14, color: "#9ca3af", fontWeight: 500, marginLeft: 12 }}>
                총 {properties.length}건
              </span>
            </div>
            
            <button 
              onClick={() => router.push("/gongsil?tab=wish")}
              style={{
                background: "#1a73e8", color: "#fff", border: "none", borderRadius: 8,
                padding: "10px 18px", fontSize: 14, fontWeight: "bold", cursor: "pointer",
                display: "flex", alignItems: "center", gap: 8,
                boxShadow: "0 2px 8px rgba(26,115,232,0.3)",
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(26,115,232,0.4)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(26,115,232,0.3)"; }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
              지도에서 한눈에 보기
            </button>
          </div>

          {loading ? (
            <div style={{ padding: "100px 0", textAlign: "center", color: "#888", fontSize: 15 }}>
              <div style={{ display: "inline-block", width: 30, height: 30, border: "3px solid #f3f3f3", borderTop: "3px solid #1a73e8", borderRadius: "50%", animation: "spin 1s linear infinite" }}></div>
              <div style={{ marginTop: 12 }}>찜한 매물을 불러오는 중입니다...</div>
              <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            </div>
          ) : properties.length === 0 ? (
            <div style={{ padding: "100px 0", textAlign: "center", color: "#888", fontSize: 15 }}>
              <div style={{ fontSize: 56, marginBottom: 20 }}>🏢</div>
              <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 18, color: "#333" }}>찜한 매물이 없습니다</div>
              <div style={{ fontSize: 14, color: "#999" }}>공실지도에서 관심있는 매물의 하트(🤍)를 눌러 추가해보세요.</div>
              <button 
                onClick={() => router.push("/gongsil")}
                style={{ marginTop: 32, padding: "12px 28px", border: "1px solid #1a73e8", color: "#1a73e8", background: "#fff", borderRadius: 6, fontWeight: "bold", cursor: "pointer", fontSize: 15 }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#f0f7ff"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; }}
              >
                매물 보러가기
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {properties.map(prop => {
                const addrText = [prop.dong, prop.building_name].filter(Boolean).join(" ");
                const priceText = getPriceText(prop);

                return (
                  <div key={prop.id} style={{ position: "relative" }}>
                    <Link href={`/gongsil?id=${prop.id}`} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
                      <div 
                        className="an-card" 
                        style={{ display: "flex", border: "1px solid #e5e7eb", borderRadius: 12, padding: "20px", transition: "all 0.2s", background: "#fff" }}
                        onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.05)"; e.currentTarget.style.borderColor = "#c3d4f5"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = "#e5e7eb"; }}
                      >
                        {/* Image Thumbnail */}
                        <div style={{ width: 160, height: 160, borderRadius: 8, overflow: "hidden", background: "#f8f9fa", flexShrink: 0, marginRight: 24, position: "relative" }}>
                          {prop.images && prop.images[0] ? (
                            <img src={prop.images[0]} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="매물사진" />
                          ) : (
                            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#ccc", fontSize: 40 }}>🏢</div>
                          )}
                          <div style={{ position: "absolute", top: 8, left: 8, background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: 11, padding: "2px 8px", borderRadius: 4, fontWeight: "bold" }}>
                            {prop.vacancy_no}
                          </div>
                        </div>

                        {/* Info Section */}
                        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                            <span style={{ fontSize: 13, color: "#1a73e8", fontWeight: "bold", background: "#e8f0fe", padding: "3px 8px", borderRadius: 4 }}>
                              {prop.property_type}
                            </span>
                            <span style={{ fontSize: 13, color: "#666", fontWeight: "bold" }}>
                              {prop.trade_type}
                            </span>
                            <span style={{ fontSize: 12, color: "#aaa", marginLeft: "auto" }}>
                              {new Date(prop.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          
                          <div style={{ fontSize: 20, fontWeight: "bold", color: "#111", marginBottom: 12 }}>
                            {addrText || "주소 없음"}
                          </div>
                          
                          <div style={{ fontSize: 22, fontWeight: 800, color: "#1a73e8", marginBottom: 12 }}>
                            {priceText}
                          </div>
                          
                          <div style={{ fontSize: 14, color: "#555", marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}>
                            <span>{prop.direction || "방향없음"}</span>
                            <span style={{ color: "#ddd" }}>|</span>
                            <span>{prop.exclusive_m2 ? `${prop.exclusive_m2}㎡` : "면적미상"}</span>
                            <span style={{ color: "#ddd" }}>|</span>
                            <span>해당층 {prop.current_floor || "-"}</span>
                          </div>
                          
                          <div style={{ fontSize: 14, color: "#777", display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                            {[`룸 ${prop.room_count || 0}개`, `욕실 ${prop.bathroom_count || 0}개`, ...(prop.options || [])].filter(Boolean).join(", ")}
                          </div>
                          
                          {/* 테마 키워드 */}
                          {prop.themes && prop.themes.length > 0 && (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
                              {prop.themes.slice(0, 4).map((theme: string, idx: number) => (
                                <span key={idx} style={{ background: "#f8fafc", color: "#64748b", fontSize: 12, padding: "2px 8px", borderRadius: 12, fontWeight: 500, border: "1px solid #e2e8f0" }}>
                                  {theme.startsWith('#') ? theme : `# ${theme}`}
                                </span>
                              ))}
                              {prop.themes.length > 4 && (
                                <span style={{ fontSize: 12, color: "#94a3b8", padding: "2px 4px" }}>+{prop.themes.length - 4}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </Link>

                    <button
                      onClick={(e) => { e.preventDefault(); handleRemove(prop.id); }}
                      title="찜 해제"
                      style={{
                        position: "absolute", top: 20, right: 20,
                        background: "#fff", border: "1px solid #e5e7eb", borderRadius: 6,
                        padding: "6px 12px", cursor: "pointer", fontSize: 13, color: "#ef4444",
                        fontWeight: 600, display: "flex", alignItems: "center", gap: 6,
                        boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
                        transition: "all 0.2s"
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "#fef2f2"; e.currentTarget.style.borderColor = "#fecaca"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = "#e5e7eb"; }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.5"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>
                      해제
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
