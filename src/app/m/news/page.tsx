"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getArticles, getArticleDetail, incrementArticleView } from "@/app/actions/article";

const KAKAO_APP_KEY = process.env.NEXT_PUBLIC_KAKAO_APP_KEY || "435d3602201a49ea712e5f5a36fe6efc";

const CATEGORIES = [
  { key: "home", label: "홈" },
  { key: "all", label: "전체뉴스" },
  { key: "부동산·주식·재테크", label: "부동산·재테크" },
  { key: "정치·경제·사회", label: "정치·경제" },
  { key: "세무·법률", label: "세무·법률" },
  { key: "여행·건강·생활", label: "여행·생활" },
  { key: "etc", label: "기타" },
];

function formatDate(d: string) {
  if (!d) return "";
  const dt = new Date(d);
  const now = new Date();
  const diff = Math.floor((now.getTime() - dt.getTime()) / 3600000);
  if (diff < 1) return "방금 전";
  if (diff < 24) return `${diff}시간 전`;
  const days = Math.floor(diff / 24);
  if (days < 7) return `${days}일 전`;
  return `${dt.getMonth() + 1}/${dt.getDate()}`;
}

function formatDateFull(dateStr: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const hour = d.getHours();
  const ampm = hour >= 12 ? "오후" : "오전";
  const h12 = hour > 12 ? hour - 12 : hour || 12;
  return `입력 ${d.getFullYear()}. ${String(d.getMonth() + 1).padStart(2, "0")}. ${String(d.getDate()).padStart(2, "0")}. ${ampm} ${h12}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
}

const stripHtml = (html: string) => html ? html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim() : "";

const extractYoutubeId = (url?: string, html?: string): string | null => {
  const rx = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([\w-]{11})/;
  if (url) {
    const m = url.match(rx);
    if (m) return m[1];
  }
  if (html) {
    const m = html.match(rx);
    if (m) return m[1];
  }
  return null;
};

function MobileNewsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") || "all";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [articles, setArticles] = useState<any[]>([]);
  const [localArticles, setLocalArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCluster, setSelectedCluster] = useState<any[] | null>(null);
  const [activeArticleId, setActiveArticleId] = useState<string | null>(null);
  const [articleDetail, setArticleDetail] = useState<any>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [viewedArticles, setViewedArticles] = useState<Set<string>>(new Set());
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const kakaoMapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  // 일반 뉴스 로드
  useEffect(() => {
    const loadArticles = async () => {
      setLoading(true);
      const filters: any = { status: "APPROVED", limit: 30 };
      if (activeTab !== "all" && activeTab !== "local") {
        if (activeTab === "etc") {
          filters.section2 = ["IT·가전·가구", "스포츠·연예·Car", "인물·미션·기타"];
        } else {
          filters.section2 = activeTab;
        }
      }
      const res = await getArticles(filters);
      if (res.success && res.data) {
        setArticles(res.data);
      }
      setLoading(false);
    };

    if (activeTab !== "local") {
      loadArticles();
    }
  }, [activeTab]);

  // 우리동네뉴스 (lat/lng 있는 기사) 로드
  useEffect(() => {
    const loadLocalArticles = async () => {
      const res = await getArticles({ status: "APPROVED", limit: 100 });
      if (res.success && res.data) {
        const withLocation = res.data.filter((a: any) => a.lat && a.lng);
        setLocalArticles(withLocation);
      }
    };
    loadLocalArticles();
  }, []);
  // 기사 상세 조회
  const handleSelectArticle = async (id: string) => {
    setActiveArticleId(id);
    setShowDetail(true);
    setArticleDetail(null);
    setDetailLoading(true);
    const res = await getArticleDetail(id);
    if (res.success && res.data) {
      setArticleDetail(res.data);
    }
    setDetailLoading(false);
  };

  // 조회수 증가
  useEffect(() => {
    if (showDetail && articleDetail && articleDetail.id) {
      if (!viewedArticles.has(articleDetail.id)) {
        incrementArticleView(articleDetail.id).then((res) => {
          if (res.success && res.view_count !== undefined) {
            setArticleDetail((prev: any) => prev ? { ...prev, view_count: res.view_count } : prev);
          }
        });
        setViewedArticles((prev) => new Set(prev).add(articleDetail.id));
      }
    }
  }, [showDetail, articleDetail, viewedArticles]);

  // 카카오 지도 초기화
  useEffect(() => {
    if (activeTab !== "local") return;

    const initMap = () => {
      if (!mapRef.current || kakaoMapRef.current) return;
      const kakao = (window as any).kakao;
      if (!kakao?.maps) return;

      const map = new kakao.maps.Map(mapRef.current, {
        center: new kakao.maps.LatLng(37.5665, 126.978),
        level: 7,
      });
      kakaoMapRef.current = map;

      // 마커 그리기
      const addMarkers = () => {
        markersRef.current.forEach((m: any) => m.setMap(null));
        markersRef.current = [];

        // lat/lng 기준으로 그룹화
        const groups: Record<string, any[]> = {};
        localArticles.forEach((a) => {
          const key = `${Math.round(a.lat * 100)}_${Math.round(a.lng * 100)}`;
          if (!groups[key]) groups[key] = [];
          groups[key].push(a);
        });

        Object.values(groups).forEach((group) => {
          const { lat, lng } = group[0];
          const count = group.length;
          const size = count > 5 ? 44 : 36;

          const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
            <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 2}" fill="${count > 5 ? '#1a2e50' : '#f97316'}" stroke="white" stroke-width="2.5"/>
            <text x="50%" y="50%" dy="1px" text-anchor="middle" dominant-baseline="middle" fill="white" font-size="${count > 9 ? 13 : 15}" font-weight="bold" font-family="sans-serif">${count}</text>
          </svg>`;

          const markerImage = new kakao.maps.MarkerImage(
            `data:image/svg+xml,${encodeURIComponent(svg)}`,
            new kakao.maps.Size(size, size),
            { offset: new kakao.maps.Point(size / 2, size / 2) }
          );

          const marker = new kakao.maps.Marker({
            position: new kakao.maps.LatLng(lat, lng),
            image: markerImage,
            map,
          });

          kakao.maps.event.addListener(marker, "click", () => {
            setSelectedCluster(group);
          });

          markersRef.current.push(marker);
        });
      };

      if (localArticles.length > 0) addMarkers();
      setMapLoaded(true);
    };

    // Kakao Maps SDK 로드
    if ((window as any).kakao?.maps?.LatLng) {
      initMap();
    } else {
      const scriptId = "kakao-map-script";
      if (!document.getElementById(scriptId)) {
        const script = document.createElement("script");
        script.id = scriptId;
        script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_APP_KEY}&libraries=services,clusterer&autoload=false`;
        script.onload = () => {
          (window as any).kakao.maps.load(initMap);
        };
        document.head.appendChild(script);
      } else {
        const check = setInterval(() => {
          if ((window as any).kakao?.maps?.LatLng) {
            clearInterval(check);
            initMap();
          }
        }, 100);
      }
    }
  }, [activeTab, localArticles]);

  // 지도에 마커 업데이트 (localArticles 변경 시)
  useEffect(() => {
    if (!kakaoMapRef.current || !mapLoaded) return;
    const kakao = (window as any).kakao;
    if (!kakao?.maps) return;

    markersRef.current.forEach((m: any) => m.setMap(null));
    markersRef.current = [];

    const groups: Record<string, any[]> = {};
    localArticles.forEach((a) => {
      const key = `${Math.round(a.lat * 100)}_${Math.round(a.lng * 100)}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(a);
    });

    Object.values(groups).forEach((group) => {
      const { lat, lng } = group[0];
      const count = group.length;
      const size = count > 5 ? 44 : 36;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
        <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 2}" fill="${count > 5 ? '#1a2e50' : '#f97316'}" stroke="white" stroke-width="2.5"/>
        <text x="50%" y="50%" dy="1px" text-anchor="middle" dominant-baseline="middle" fill="white" font-size="${count > 9 ? 13 : 15}" font-weight="bold" font-family="sans-serif">${count}</text>
      </svg>`;

      const markerImage = new kakao.maps.MarkerImage(
        `data:image/svg+xml,${encodeURIComponent(svg)}`,
        new kakao.maps.Size(size, size),
        { offset: new kakao.maps.Point(size / 2, size / 2) }
      );

      const marker = new kakao.maps.Marker({
        position: new kakao.maps.LatLng(lat, lng),
        image: markerImage,
        map: kakaoMapRef.current,
      });

      kakao.maps.event.addListener(marker, "click", () => {
        setSelectedCluster(group);
      });

      markersRef.current.push(marker);
    });
  }, [localArticles, mapLoaded]);

  return (
    <div
      style={{
        width: "100%",
        backgroundColor: "#fff",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        position: "relative",
      }}
    >

      {/* 카테고리 탭 — 우리동네뉴스(지도)일 때 숨김 */}
      {activeTab !== "local" && (
        <>
          <div
            className="no-scrollbar"
            style={{
              display: "flex",
              overflowX: "auto",
              backgroundColor: "#1a2e50",
              position: "fixed",
              top: "41px",
              left: "50%",
              transform: "translateX(-50%)",
              width: "100%",
              maxWidth: "448px",
              zIndex: 40,
            }}
          >
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                onClick={() => {
                  if (cat.key === "home") { router.push("/m"); return; }
                  setActiveTab(cat.key); setSelectedCluster(null);
                }}
                style={{
                  flexShrink: 0,
                  padding: "10px 16px",
                  fontSize: "14px",
                  fontWeight: activeTab === cat.key ? 800 : 500,
                  color: activeTab === cat.key ? "#fff" : "rgba(255,255,255,0.6)",
                  background: "none",
                  border: "none",
                  borderBottom: activeTab === cat.key ? "3px solid #ffffff" : "3px solid transparent",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  whiteSpace: "nowrap",
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>
          {/* 카테고리 바 높이만큼 공간 확보 */}
          <div style={{ height: "46px" }} />
        </>
      )}

      {/* 우리동네뉴스: 카카오 지도 뷰 */}
      {activeTab === "local" ? (
        <div
          style={{ flex: 1, position: "relative", overflow: "hidden" }}
          onClick={() => setSelectedCluster(null)}
        >
          {/* 카카오 지도 */}
          <div ref={mapRef} style={{ width: "100%", height: "100%", minHeight: "calc(100vh - 100px)" }} />

          {/* 지도 미로드 시 스켈레톤 */}
          {!mapLoaded && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "#e8ecf0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              <div className="skeleton" style={{ width: "120px", height: "20px" }} />
              <p style={{ fontSize: "14px", color: "#9ca3af" }}>지도를 불러오는 중...</p>
            </div>
          )}

          {/* 내 위치 검색 버튼 */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (navigator.geolocation && kakaoMapRef.current) {
                navigator.geolocation.getCurrentPosition((pos) => {
                  const kakao = (window as any).kakao;
                  const latlng = new kakao.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
                  kakaoMapRef.current.panTo(latlng);
                  kakaoMapRef.current.setLevel(5);
                });
              }
            }}
            style={{
              position: "absolute",
              top: "16px",
              right: "16px",
              zIndex: 20,
              background: "#f97316",
              color: "#fff",
              border: "none",
              borderRadius: "20px",
              padding: "8px 14px",
              fontSize: "13px",
              fontWeight: 700,
              boxShadow: "0 4px 12px rgba(249,115,22,0.4)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
            </svg>
            내 위치
          </button>

          {/* 기사 수 표시 */}
          <div
            style={{
              position: "absolute",
              top: "16px",
              left: "16px",
              zIndex: 20,
              background: "rgba(255,255,255,0.95)",
              borderRadius: "20px",
              padding: "8px 14px",
              fontSize: "13px",
              fontWeight: 700,
              color: "#1a2e50",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            }}
          >
            📍 기사 {localArticles.length}건
          </div>

          {/* 바텀시트 */}
          <div
            className={`news-bottom-sheet ${selectedCluster ? "open" : ""}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 핸들 */}
            <div
              style={{ display: "flex", justifyContent: "center", padding: "12px 0 8px", cursor: "pointer" }}
              onClick={() => setSelectedCluster(null)}
            >
              <div style={{ width: "40px", height: "4px", backgroundColor: "#e5e7eb", borderRadius: "4px" }} />
            </div>

            {/* 헤더 */}
            <div
              style={{
                padding: "0 20px 12px",
                borderBottom: "1px solid #f3f4f6",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#111827" }}>
                이 지역 뉴스{" "}
                <span style={{ color: "#f97316" }}>{selectedCluster?.length || 0}</span>건
              </h3>
              <button
                onClick={() => setSelectedCluster(null)}
                style={{
                  background: "#f3f4f6",
                  border: "none",
                  borderRadius: "50%",
                  width: "28px",
                  height: "28px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  fontSize: "16px",
                  color: "#6b7280",
                }}
              >
                ✕
              </button>
            </div>

            {/* 기사 목록 */}
            <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 20px" }}>
              {selectedCluster?.map((article: any) => (
                <div
                  key={article.id}
                  className="article-row"
                  onClick={() => handleSelectArticle(article.id)}
                  style={{
                    padding: "16px 20px",
                    borderBottom: "1px solid #f0f0f0",
                    cursor: "pointer",
                    background: activeArticleId === article.id ? "#fff7ed" : "#fff",
                    transition: "background 0.15s ease",
                  }}
                >
                  <div style={{ fontSize: 11, color: "#ff8e15", fontWeight: "bold", marginBottom: 5 }}>
                    <span style={{ background: "#fff7ed", padding: "2px 6px", borderRadius: 3, border: "1px solid #ffdfb8", marginRight: 4 }}>
                      {article.section1 || "뉴스"} &gt; {article.section2 || "전체"}
                    </span>
                    {article.section1 === "뉴스/칼럼" && <span style={{ color: "#ef4444" }}>NEWS</span>}
                    {article.location_name && <span style={{ color: "#999", fontSize: 10, marginLeft: 4 }}>📍{article.location_name}</span>}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#111", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", wordBreak: "keep-all", marginBottom: 8, lineHeight: 1.45 }}>
                    {article.title}
                  </div>
                  <div style={{ fontSize: 13, color: "#666", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", marginBottom: 10, lineHeight: 1.5 }}>
                    {article.subtitle || stripHtml(article.content || "").slice(0, 100)}
                  </div>
                  <div style={{ fontSize: 12, color: "#999", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>{formatDate(article.published_at || article.created_at)} · {article.author_name || "공실뉴스"}</span>
                    <span style={{ color: activeArticleId === article.id && showDetail ? "#d32f2f" : "#ff8e15", fontWeight: "bold", fontSize: 12 }}>
                      {activeArticleId === article.id && showDetail ? "기사닫기 ✕" : "기사상세보기 >"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* 일반 뉴스 리스트 뷰 */
        <div style={{ flex: 1, paddingBottom: "20px" }}>
          {/* 헤드라인 히어로 (APPROVED 기사 중 첫번째 큰 이미지) */}
          {articles[0] && (
            <div
              onClick={() => handleSelectArticle(articles[0].id)}
              style={{
                position: "relative",
                width: "100%",
                aspectRatio: "16/9",
                height: "auto",
                overflow: "hidden",
                cursor: "pointer",
                backgroundColor: "#e5e7eb",
              }}
            >
              {articles[0].thumbnail_url ? (
                <img
                  src={articles[0].thumbnail_url}
                  alt={articles[0].title}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg, #1a2e50, #2d4a7a)" }} />
              )}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 60%)",
                }}
              />
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "16px" }}>
                <span
                  style={{
                    background: "#1a2e50",
                    color: "#f97316",
                    fontSize: "11px",
                    fontWeight: 800,
                    padding: "3px 8px",
                    borderRadius: "3px",
                    display: "inline-block",
                    marginBottom: "8px",
                  }}
                >
                  {articles[0].section1 || "뉴스"}
                </span>
                <h2
                  style={{
                    color: "#fff",
                    fontSize: "17px",
                    fontWeight: 800,
                    lineHeight: 1.35,
                    wordBreak: "keep-all",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {articles[0].title}
                </h2>
              </div>
            </div>
          )}

          {/* 스켈레톤 로딩 */}
          {loading && (
            <div style={{ padding: "16px" }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} style={{ display: "flex", gap: "12px", padding: "16px 0", borderBottom: "1px solid #f3f4f6" }}>
                  <div style={{ flex: 1 }}>
                    <div className="skeleton" style={{ height: "16px", width: "90%", marginBottom: "8px" }} />
                    <div className="skeleton" style={{ height: "16px", width: "70%", marginBottom: "8px" }} />
                    <div className="skeleton" style={{ height: "12px", width: "40%" }} />
                  </div>
                  <div className="skeleton" style={{ width: "84px", height: "64px", borderRadius: "8px", flexShrink: 0 }} />
                </div>
              ))}
            </div>
          )}

          {/* 실 기사 리스트 */}
          {!loading && (
            <div style={{ padding: "0 16px" }}>
              {articles.slice(1).map((a: any) => (
                <div
                  key={a.id}
                  className="article-row"
                  onClick={() => handleSelectArticle(a.id)}
                  style={{
                    padding: "16px 0",
                    borderBottom: "1px solid #f0f0f0",
                    cursor: "pointer",
                    background: activeArticleId === a.id ? "#fff7ed" : "#fff",
                    transition: "background 0.15s ease",
                  }}
                >
                  <div style={{ fontSize: 11, color: "#ff8e15", fontWeight: "bold", marginBottom: 5 }}>
                    <span style={{ background: "#fff7ed", padding: "2px 6px", borderRadius: 3, border: "1px solid #ffdfb8", marginRight: 4 }}>
                      {a.section1 || "뉴스"} &gt; {a.section2 || "전체"}
                    </span>
                    {a.section1 === "뉴스/칼럼" && <span style={{ color: "#ef4444" }}>NEWS</span>}
                    {a.location_name && <span style={{ color: "#999", fontSize: 10, marginLeft: 4 }}>📍{a.location_name}</span>}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#111", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", wordBreak: "keep-all", marginBottom: 8, lineHeight: 1.45 }}>
                    {a.title}
                  </div>
                  <div style={{ fontSize: 13, color: "#666", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", marginBottom: 10, lineHeight: 1.5 }}>
                    {a.subtitle || stripHtml(a.content || "").slice(0, 100)}
                  </div>
                  <div style={{ fontSize: 12, color: "#999", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>{formatDate(a.published_at || a.created_at)} · {a.author_name || "공실뉴스"}</span>
                    <span style={{ color: activeArticleId === a.id && showDetail ? "#d32f2f" : "#ff8e15", fontWeight: "bold", fontSize: 12 }}>
                      {activeArticleId === a.id && showDetail ? "기사닫기 ✕" : "기사상세보기 >"}
                    </span>
                  </div>
                </div>
              ))}

              {!loading && articles.length === 0 && (
                <div style={{ textAlign: "center", padding: "60px 0", color: "#9ca3af" }}>
                  <div style={{ fontSize: "40px", marginBottom: "12px" }}>📰</div>
                  <p style={{ fontSize: "15px", fontWeight: 600 }}>아직 기사가 없습니다.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 기사 상세 뷰 (모바일 슬라이딩 패널) */}
      <div className={`news-detail-panel ${showDetail ? "open" : ""}`}>
        <button
          onClick={() => setShowDetail(false)}
          style={{ position: "absolute", top: 12, right: 12, background: "none", border: "none", fontSize: 28, color: "#999", cursor: "pointer", padding: 8, lineHeight: 1, zIndex: 10 }}
        >✕</button>

        {detailLoading ? (
          <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
            <div style={{ width: 32, height: 32, border: "3px solid #f0f0f0", borderTop: "3px solid #ff8e15", borderRadius: "50%", animation: "spin 0.8s linear infinite" }}></div>
            <div style={{ fontSize: 14, color: "#888", fontWeight: 500 }}>기사를 불러오는 중</div>
          </div>
        ) : articleDetail ? (
          <div style={{ padding: "20px", paddingTop: "50px", paddingBottom: "80px", overflowY: "auto", height: "100%" }}>
            <div style={{ fontSize: 13, color: "#666", marginBottom: 8, fontWeight: 600 }}>
              [{articleDetail.section1 || "뉴스"} &gt; {articleDetail.section2 || "전체"}]
            </div>

            <h1 style={{ fontSize: 24, fontWeight: 800, color: "#111", lineHeight: 1.35, marginBottom: 16, letterSpacing: -1, wordBreak: "keep-all" }}>
              {articleDetail.title}
            </h1>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #ddd", paddingBottom: 16, marginBottom: 24 }}>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, fontSize: 12, color: "#666" }}>
                <span style={{ color: "#111", fontWeight: "bold" }}>{articleDetail.author_name || "공실뉴스"}</span>
                <span style={{ display: "inline-block", width: 1, height: 10, background: "#ddd" }}></span>
                <span>{formatDateFull(articleDetail.published_at || articleDetail.created_at)}</span>
              </div>
              <button
                onClick={() => router.push(`/m/news/${articleDetail.article_no || articleDetail.id}`)}
                style={{ fontSize: 12, fontWeight: "bold", color: "#ff8e15", border: "1px solid #ff8e15", borderRadius: 20, padding: "4px 12px", background: "none", whiteSpace: "nowrap" }}
              >
                원본보기
              </button>
            </div>

            {articleDetail.subtitle && (
              <div className="article-subtitle-box map-subtitle-box" style={{ fontSize: 14, marginBottom: 20, paddingLeft: 12, borderLeft: "3px solid #ff8e15", color: "#333", fontWeight: 600, wordBreak: "keep-all" }}>
                {articleDetail.subtitle}
              </div>
            )}

            <div className="article-body" style={{ fontSize: 16, lineHeight: 1.6, color: "#111" }}>
              {extractYoutubeId(articleDetail.youtube_url, articleDetail.content) ? (
                <div style={{ position: "relative", width: "100%", paddingBottom: articleDetail.is_shorts ? "177.78%" : "56.25%", marginBottom: 16, borderRadius: 8, overflow: "hidden" }}>
                  <iframe src={`https://www.youtube.com/embed/${extractYoutubeId(articleDetail.youtube_url, articleDetail.content)}`} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }} allowFullScreen />
                </div>
              ) : articleDetail.thumbnail_url && !(articleDetail.content && articleDetail.content.includes(articleDetail.thumbnail_url)) ? (
                <img src={articleDetail.thumbnail_url} alt={articleDetail.title} style={{ width: "100%", borderRadius: 8, marginBottom: 16 }} />
              ) : null}

              {articleDetail.content && (
                <div suppressHydrationWarning dangerouslySetInnerHTML={{
                  __html: articleDetail.content
                    .replace(/<p[^>]*>\s*(?:<br>\s*)*<iframe[^>]*youtube\.com\/embed[^>]*>.*?<\/iframe>(?:\s*<br>\s*)*\s*<\/p>/gi, '')
                    .replace(/<div(?:(?!class="article-body")[^>]*)?>\s*(?:<br>\s*)*<iframe[^>]*youtube\.com\/embed[^>]*>.*?<\/iframe>(?:\s*<br>\s*)*\s*<\/div>/gi, '')
                    .replace(/<iframe[^>]*youtube\.com\/embed[^>]*>.*?<\/iframe>/gi, '')
                }} />
              )}
            </div>

            <div style={{ marginTop: 40, paddingTop: 20, borderTop: "1px solid #eee", color: "#888", fontSize: 12, textAlign: "center" }}>
              저작권자 © 공실뉴스 무단전재 및 재배포 금지
            </div>
          </div>
        ) : null}
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .news-bottom-sheet {
          position: absolute; bottom: 0; left: 0; width: 100%;
          background: white; border-radius: 20px 20px 0 0;
          box-shadow: 0 -8px 32px rgba(0,0,0,0.15);
          transform: translateY(100%);
          transition: transform 0.35s cubic-bezier(0.25, 1, 0.5, 1);
          z-index: 30; max-height: 72vh;
          display: flex; flex-direction: column;
        }
        .news-bottom-sheet.open { transform: translateY(0); }
        .skeleton { background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 6px; }
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        .article-row:active { background: #f9fafb; }
        .news-detail-panel {
          position: absolute; top: 0; right: 0; width: 100%; height: 100%;
          background: white; z-index: 50;
          transform: translateX(100%);
          transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: -5px 0 30px rgba(0,0,0,0.15);
        }
        .news-detail-panel.open { transform: translateX(0); }
      `}</style>
    </div>
  );
}

export default function MobileNewsPageWrapper() {
  return (
    <Suspense fallback={null}>
      <MobileNewsPage />
    </Suspense>
  );
}
