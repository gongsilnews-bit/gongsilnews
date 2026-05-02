"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { getArticles, getArticleDetail, incrementArticleView } from "@/app/actions/article";
import { getVacancyCountByKeyword } from "@/app/actions/vacancy";
import HomeHeader from "../_components/HomeHeader";
import AuthorProfileHeader from "../_components/AuthorProfileHeader";

const SearchOverlay = dynamic(() => import("../_components/header/SearchOverlay"), { ssr: false });

const KAKAO_APP_KEY = process.env.NEXT_PUBLIC_KAKAO_APP_KEY || "435d3602201a49ea712e5f5a36fe6efc";

const CATEGORIES = [
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

function MobileNewsClient({ initialTab, initialArticles, initialAuthorName, initialKeyword, authorProfile }: { initialTab: string, initialArticles: any[], initialAuthorName?: string, initialKeyword?: string, authorProfile?: any }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [activeTab, setActiveTab] = useState(initialTab);
  const [articles, setArticles] = useState<any[]>(initialArticles);
  const [localArticles, setLocalArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVacancyId, setSelectedVacancyId] = useState<string | null>(null);

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'CLOSE_VACANCY_OVERLAY') {
        window.history.back(); // Trigger popstate
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    if (selectedVacancyId) {
      window.history.pushState({ panel: 'vacancy-overlay' }, '');
    }
  }, [selectedVacancyId]);

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (selectedVacancyId && e.state?.panel !== 'vacancy-overlay') {
        setSelectedVacancyId(null);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [selectedVacancyId]);

  // 기사 상세 보기 상태 (우리동네뉴스 슬라이딩 패널용)
  const [showDetail, setShowDetail] = useState(false);
  const [articleDetail, setArticleDetail] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // 애니메이션 오버레이 상태는 완전히 제거됨 (즉각적인 화면 전환을 위해)
  // URL의 탭이 변경되면 activeTab 상태를 동기화
  useEffect(() => {
    const tab = searchParams.get("tab") || "all";
    if (tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [searchParams]);
  const [visibleArticles, setVisibleArticles] = useState<any[]>([]);
  const [vacancyCount, setVacancyCount] = useState<number>(0);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [clusterMode, setClusterMode] = useState(false);

  const mapRef = useRef<HTMLDivElement>(null);
  const kakaoMapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const clustererRef = useRef<any>(null);
  const clusterModeRef = useRef(false);
  const detailPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => { clusterModeRef.current = clusterMode; }, [clusterMode]);

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
      
      const authorMatch = searchParams.get("author_name");
      if (authorMatch) {
        filters.author_name = authorMatch;
      }
      
      const keywordMatch = searchParams.get("keyword");
      if (keywordMatch) {
        filters.keyword = keywordMatch;
        // Fetch related vacancy count
        const vRes = await getVacancyCountByKeyword(keywordMatch);
        if (vRes.success) setVacancyCount(vRes.count || 0);
        else setVacancyCount(0);
      } else {
        setVacancyCount(0);
      }
      
      const res = await getArticles(filters);
      if (res.success && res.data) {
        setArticles(res.data);
      }
      setLoading(false);
    };

    if (activeTab !== "local" && activeTab !== initialTab) {
      loadArticles();
    } else if (activeTab === initialTab && articles.length === 0) {
      loadArticles();
    } else if (searchParams.get("author_name") !== initialAuthorName) {
      loadArticles();
    } else if (searchParams.get("keyword") !== initialKeyword) {
      loadArticles();
    }
  }, [activeTab, searchParams, initialTab, articles.length, initialAuthorName, initialKeyword]);

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
  // 뒤로 가기(안드로이드 하드웨어 백버튼 등) 처리 - hash를 사용해야 Next.js 라우터와 충돌하지 않음
  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash !== "#detail" && showDetail) {
        setShowDetail(false);
      }
    };
    window.addEventListener("hashchange", handleHashChange);
    // 현재 열려있는데 해시가 없다면(버그 방지) 해시 추가
    if (showDetail && window.location.hash !== "#detail") {
      window.location.hash = "detail";
    }
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [showDetail]);

  // 기사 상세 변경 시 스크롤 최상단 강제 초기화 (가장 확실한 방법)
  useEffect(() => {
    if (showDetail && detailPanelRef.current) {
      const el = detailPanelRef.current;
      el.scrollTop = 0;

      // 혹시 모를 렌더링 딜레이를 대비해 여러 번 강제 초기화
      let attempts = 0;
      const interval = setInterval(() => {
        if (el) el.scrollTop = 0;
        attempts++;
        if (attempts > 5) clearInterval(interval);
      }, 50);

      return () => clearInterval(interval);
    }
  }, [articleDetail, showDetail]);

  // 기사 상세 조회 (우리동네뉴스는 인라인 패널, 나머지는 새 페이지)
  const handleSelectArticle = async (id: string, isLocal: boolean = false, e?: React.MouseEvent) => {
    if (isLocal) {
      window.location.hash = "detail";
      setShowDetail(true);
      setDetailLoading(true);
      const res = await getArticleDetail(id);
      if (res.success && res.data) {
        setArticleDetail(res.data);
      }
      setDetailLoading(false);
    } else {
      router.push(`/m/news/${id}`);
    }
  };

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
    if (!clustererRef.current) {
      clustererRef.current = new kakao.maps.MarkerClusterer({
        map: kakaoMapRef.current,
        averageCenter: true,
        minLevel: 4,
        gridSize: 60,
        calculator: [5, 10, 30, 50],
        texts: (count: number) => count.toString(),
        styles: [
          { width: '38px', height: '38px', background: 'rgba(255, 142, 21, 0.85)', color: '#fff', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', fontWeight: 'bold', fontSize: '14px', border: '3px solid rgba(255,255,255,0.7)', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' },
          { width: '44px', height: '44px', background: 'rgba(255, 130, 0, 0.88)', color: '#fff', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', fontWeight: 'bold', fontSize: '15px', border: '3px solid rgba(255,255,255,0.7)', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' },
          { width: '52px', height: '52px', background: 'rgba(230, 115, 0, 0.9)', color: '#fff', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', fontWeight: 'bold', fontSize: '16px', border: '3px solid rgba(255,255,255,0.7)', boxShadow: '0 3px 10px rgba(0,0,0,0.25)' },
          { width: '60px', height: '60px', background: 'rgba(204, 102, 0, 0.92)', color: '#fff', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', fontWeight: 'bold', fontSize: '17px', border: '3px solid rgba(255,255,255,0.7)', boxShadow: '0 3px 12px rgba(0,0,0,0.3)' },
          { width: '70px', height: '70px', background: 'rgba(178, 89, 0, 0.95)', color: '#fff', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', fontWeight: 'bold', fontSize: '19px', border: '3px solid rgba(255,255,255,0.7)', boxShadow: '0 4px 14px rgba(0,0,0,0.35)' }
        ]
      });

      kakao.maps.event.addListener(clustererRef.current, 'clusterclick', (cluster: any) => {
        const clusterMarkers = cluster.getMarkers();
        const clusterArticleIds = clusterMarkers.map((m: any) => m._articleId).filter(Boolean);
        const matched = localArticles.filter(a => clusterArticleIds.includes(a.id));
        if (matched.length > 0) {
          setVisibleArticles(matched);
          setClusterMode(true);
        }
      });
    }

    if (clustererRef.current) clustererRef.current.clear();
    markersRef.current = [];

    const newMarkers: any[] = [];
    localArticles.forEach((a) => {
      if (!a.lat || !a.lng) return;
      const size = 32;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
        <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 2}" fill="#ff8e15" stroke="white" stroke-width="2.5"/>
        <text x="50%" y="50%" dy="1px" text-anchor="middle" dominant-baseline="middle" fill="white" font-size="13" font-weight="bold" font-family="sans-serif">1</text>
      </svg>`;

      const markerImage = new kakao.maps.MarkerImage(
        `data:image/svg+xml,${encodeURIComponent(svg)}`,
        new kakao.maps.Size(size, size),
        { offset: new kakao.maps.Point(size / 2, size / 2) }
      );

      const marker = new kakao.maps.Marker({
        position: new kakao.maps.LatLng(a.lat, a.lng),
        image: markerImage,
      });

      (marker as any)._articleId = a.id;

      kakao.maps.event.addListener(marker, "click", () => {
        kakaoMapRef.current.panTo(new kakao.maps.LatLng(a.lat, a.lng));
        handleSelectArticle(a.id, true);
      });

      newMarkers.push(marker);
      markersRef.current.push(marker);
    });

    if (clustererRef.current && newMarkers.length > 0) {
      clustererRef.current.addMarkers(newMarkers);
    }

    const updateVisible = () => {
      if (clusterModeRef.current) return;
      const bounds = kakaoMapRef.current.getBounds();
      if (!bounds) return;
      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();
      const visible = localArticles.filter((a) => {
        if (!a.lat || !a.lng) return false;
        return a.lat >= sw.getLat() && a.lat <= ne.getLat() && a.lng >= sw.getLng() && a.lng <= ne.getLng();
      });
      setVisibleArticles(visible);
    };

    kakao.maps.event.addListener(kakaoMapRef.current, "idle", updateVisible);

    // Slight delay to allow map to render fully before taking bounds
    setTimeout(updateVisible, 300);

    return () => {
      kakao.maps.event.removeListener(kakaoMapRef.current, "idle", updateVisible);
    };
  }, [localArticles, mapLoaded]);

  // ── 스와이프(좌우 슬라이드) 탭 전환 ──
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const [slideAnim, setSlideAnim] = useState<"" | "slide-out-left" | "slide-out-right" | "slide-in-left" | "slide-in-right">("");
  const tabBarRef = useRef<HTMLDivElement>(null);

  const handleSwipeStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleSwipeEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    touchStartX.current = null;
    touchStartY.current = null;

    // 수직 스크롤이면 무시
    if (Math.abs(dy) > Math.abs(dx)) return;
    // 최소 스와이프 거리
    if (Math.abs(dx) < 60) return;

    const currentIdx = CATEGORIES.findIndex((c) => c.key === activeTab);

    if (dx < 0 && currentIdx < CATEGORIES.length - 1) {
      // ← 왼쪽 스와이프 → 다음 탭
      const next = CATEGORIES[currentIdx + 1].key;
      setSlideAnim("slide-out-left");
      setTimeout(() => {
        setActiveTab(next);
        setClusterMode(false);
        setSlideAnim("slide-in-right");
        setTimeout(() => setSlideAnim(""), 250);
      }, 200);
    } else if (dx > 0) {
      // → 오른쪽 스와이프 → 이전 탭 (또는 홈으로 이동)
      if (currentIdx === 0) {
        setSlideAnim("slide-out-right");
        setTimeout(() => { router.push("/m"); }, 200);
      } else if (currentIdx > 0) {
        const prev = CATEGORIES[currentIdx - 1].key;
        setSlideAnim("slide-out-right");
        setTimeout(() => {
          setActiveTab(prev);
          setClusterMode(false);
          setSlideAnim("slide-in-left");
          setTimeout(() => setSlideAnim(""), 250);
        }, 200);
      }
    }
  };

  // 탭 변경 시 카테고리 바 자동 스크롤
  useEffect(() => {
    if (!tabBarRef.current) return;
    const activeBtn = tabBarRef.current.querySelector("[data-active='true']") as HTMLElement;
    if (activeBtn) {
      activeBtn.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, [activeTab]);

  return (
    <div
      onTouchStart={handleSwipeStart}
      onTouchEnd={handleSwipeEnd}
      style={{
        width: "100%",
        backgroundColor: "#fff",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
      }}
    >

      {/* 카테고리 탭바 */}
      {activeTab !== "local" && (
        <>
          {/*
            외부 wrapper: position fixed + borderBottom 여기에만 지정 → 회색 바 절대 안 사라짘
            내부 자식에는 border 없음
          */}
          <div
            style={{
              position: "fixed",
              top: "0px",
              left: "50%",
              transform: "translateX(-50%)",
              width: "100%",
              maxWidth: "448px",
              zIndex: 40,
              backgroundColor: "#ffffff",
              borderBottom: "9px solid #F4F6F8",
              display: "flex",
              alignItems: "stretch",
              height: "56px",
            }}
          >
            {/* 좌측 로고 — 고정 */}
            <button
              onClick={() => router.push("/m")}
              style={{
                flexShrink: 0,
                display: "flex",
                alignItems: "flex-end",
                padding: "0 8px 6px 12px",
                background: "none",
                border: "none",
                cursor: "pointer",
              }}
            >
              <img src="/new_logo.png" alt="홈" style={{ width: "28px", height: "28px", objectFit: "contain" }} />
            </button>

            {/* 중앙 스크롤 메뉴 */}
            <div
              ref={tabBarRef}
              className="hide-scrollbar"
              style={{
                flex: 1,
                display: "flex",
                alignItems: "flex-end",
                overflowX: "auto",
                WebkitOverflowScrolling: "touch",
                touchAction: "pan-x",
                scrollBehavior: "smooth",
              }}
            >
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.key}
                  data-active={activeTab === cat.key ? "true" : "false"}
                  onClick={() => { setActiveTab(cat.key); setClusterMode(false); }}
                  style={{
                    flexShrink: 0,
                    padding: "0 14px 0",
                    fontSize: "17px",
                    fontWeight: activeTab === cat.key ? 700 : 500,
                    color: activeTab === cat.key ? "#1a2e50" : "#222222",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    transition: "color 0.2s",
                    whiteSpace: "nowrap",
                    letterSpacing: "-0.3px",
                  }}
                >
                  <span style={{
                    display: "inline-block",
                    paddingBottom: "3px",
                    borderBottom: activeTab === cat.key ? "3px solid #1a2e50" : "3px solid transparent",
                  }}>
                    {cat.label}
                  </span>
                </button>
              ))}
              {/* 검색 버튼에 가려지지 않도록 끝부분 여백 추가 */}
              <div style={{ flexShrink: 0, width: "40px" }} />
            </div>
            {/* 우측 검색 버튼 — 고정 */}
            <button
              onClick={() => setIsSearchOpen(true)}
              style={{
                position: "absolute",
                right: "0",
                top: "4px",
                width: "40px",
                height: "40px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#fff",
                border: "none",
                cursor: "pointer",
              }}
            >
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#1a2e50" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </button>

          </div>


          {/* 탭바(56px) 만큼 콘텐츠 밀리기 */}
          <div style={{ height: "56px" }} />

          {/* 검색 오버레이 */}
          {isSearchOpen && <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />}
        </>
      )}

      {/* 우리동네뉴스: 카카오 지도 + 목록 스플릿 뷰 */}
      {activeTab === "local" ? (
        <div className={slideAnim} style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <HomeHeader 
            bgColor="#ea580c" 
            logoText="우리동네뉴스"
            sloganPrefix="내 지역부동산이 전하는 " 
            sloganHighlight="real 부동산정보" 
            highlightColor="#ffffff" 
          />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: "calc(100vh - 50px - 60px)", paddingTop: "50px" }}>
            {/* 구분선 (회색 배경) */}
            <div style={{ height: "9px", backgroundColor: "#F4F6F8", width: "100%", flexShrink: 0 }} />
            {/* 상단: 카카오 지도 */}
          <div
            style={{ position: "relative", width: "100%", height: "45vh", borderBottom: "1px solid #ddd", flexShrink: 0 }}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
          >
            <div ref={mapRef} style={{ width: "100%", height: "100%" }} />

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
          </div>

          {/* 하단: 보이는 기사 리스트 */}
          <div style={{ flex: "1 1 50%", overflowY: "auto", background: "#f9fafb", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "12px 16px", background: "#fff", borderBottom: "1px solid #f0f0f0", position: "sticky", top: 0, zIndex: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4b89ff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                </svg>
                <h3 style={{ fontSize: "15px", fontWeight: 800, color: "#111" }}>
                  {clusterMode ? (
                    <><span style={{ color: "#ff8e15" }}>선택 지역</span> 기사 {visibleArticles.length}개</>
                  ) : (
                    <>지도영역 기사 {visibleArticles.length}개</>
                  )}
                </h3>
              </div>
              {clusterMode && (
                <button
                  onClick={() => {
                    setClusterMode(false);
                    if (kakaoMapRef.current) {
                      (window as any).kakao.maps.event.trigger(kakaoMapRef.current, 'idle');
                    }
                  }}
                  style={{
                    padding: "4px 12px",
                    background: "#f3f4f6",
                    border: "1px solid #ddd",
                    borderRadius: "20px",
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "#555",
                    cursor: "pointer"
                  }}
                >
                  전체보기
                </button>
              )}
            </div>

            <div style={{ padding: "0 16px 20px", background: "#fff", flex: 1 }}>
              {visibleArticles.map((article: any) => (
                <div
                  key={article.id}
                  className="article-row"
                  onClick={() => handleSelectArticle(article.id, true)}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    padding: "20px 0",
                    borderBottom: "1px solid #f0f0f0",
                    cursor: "pointer",
                    background: "#fff",
                    transition: "background 0.15s ease",
                  }}
                >
                  {/* 상단 NEWS 태그 (카테고리 제거) */}
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                    <span style={{ fontSize: "11px", fontWeight: 800, color: "#dc2626" }}>NEWS</span>
                  </div>

                  {/* 제목 */}
                  <div style={{ fontSize: "17px", fontWeight: 800, color: "#111", lineHeight: 1.35, marginBottom: "10px", wordBreak: "keep-all" }}>
                    {article.title}
                  </div>

                  {/* 요약 (본문 또는 부제목) */}
                  <div style={{ fontSize: "14px", color: "#666", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", marginBottom: "14px" }}>
                    {article.subtitle || stripHtml(article.content || "").slice(0, 100)}
                  </div>

                  {/* 하단 날짜, 작성자 및 상세보기 버튼 */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "13px" }}>
                    <span style={{ color: "#222222", fontWeight: 500 }}>
                      {formatDate(article.published_at || article.created_at)} · {article.author_name || "공실뉴스"}
                      {article.location_name && ` · 📍${article.location_name}`}
                    </span>
                    <span style={{ color: "#f97316", fontWeight: 700 }}>
                      기사상세보기 &gt;
                    </span>
                  </div>
                </div>
              ))}
              {visibleArticles.length === 0 && mapLoaded && (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#9ca3af" }}>
                  <p style={{ fontSize: "14px" }}>현재 지도 영역에 기사가 없습니다.</p>
                </div>
              )}
            </div>
          </div>
        </div>
        </div>
      ) : (
        /* 일반 뉴스 리스트 뷰 */
        <div className={slideAnim} style={{ flex: 1, paddingBottom: "20px" }}>
          {/* Author Profile Header */}
          {(authorProfile || initialAuthorName) && (
            <AuthorProfileHeader profile={authorProfile || { name: initialAuthorName, role: 'REALTOR', profile_image_url: null }} />
          )}

          {/* Keyword Search Result Header (Tab UI) */}
          {(initialKeyword || searchParams.get("keyword")) && (
            <div style={{ background: "#fff", display: "flex", flexDirection: "column", borderBottom: "1px solid #eee" }}>
              <div style={{ padding: "16px 16px 12px" }}>
                <span style={{ fontSize: "18px", fontWeight: 800, color: "#111" }}>#{initialKeyword || searchParams.get("keyword")}</span>
                <span style={{ fontSize: "15px", fontWeight: 600, color: "#666", marginLeft: "6px" }}>검색결과</span>
              </div>
              
              <div style={{ display: "flex" }}>
                <div style={{ flex: 1, textAlign: "center", padding: "12px 0", fontSize: "15px", fontWeight: 800, color: "#111", borderBottom: "3px solid #111" }}>
                  관련기사 <span style={{ color: "#508bf5" }}>{articles.length}</span>
                </div>
                <Link href={`/m/gongsil?keyword=${initialKeyword || searchParams.get("keyword")}`} style={{ flex: 1, textAlign: "center", padding: "12px 0", fontSize: "15px", fontWeight: 600, color: "#888", borderBottom: "3px solid transparent", textDecoration: "none" }}>
                  관련공실 <span style={{ color: "#f97316" }}>{vacancyCount}</span>
                </Link>
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
          {!loading && (() => {
            const importantArticles = articles.filter(a => a.is_important);
            const regularArticles = articles.filter(a => !a.is_important);
            
            return (
              <div>
                {/* 중요 뉴스 슬라이딩 캐러셀 */}
                {importantArticles.length > 0 && (
                  <div style={{ padding: "20px 16px", borderBottom: "8px solid #f4f6f8" }}>
                    <div style={{ display: 'flex', overflowX: 'auto', gap: '12px', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }} className="no-scrollbar">
                      {importantArticles.map((a: any) => (
                        <Link
                          href={`/m/news/${a.article_no || a.id}`}
                          key={a.id}
                          style={{
                            flexShrink: 0,
                            width: "calc(50% - 6px)", // Exactly 2 items visible
                            textDecoration: "none",
                            display: "flex",
                            flexDirection: "column",
                            gap: "8px"
                          }}
                        >
                          <div style={{ width: "100%", aspectRatio: "16/10", position: "relative", backgroundColor: "#f3f4f6", borderRadius: "8px", overflow: "hidden" }}>
                            {(a.thumbnail_url || extractYoutubeId(a.youtube_url, a.content)) ? (
                              <Image
                                src={a.thumbnail_url || `https://img.youtube.com/vi/${extractYoutubeId(a.youtube_url, a.content)}/mqdefault.jpg`}
                                alt={a.title}
                                fill
                                style={{ objectFit: "cover" }}
                                sizes="(max-width: 768px) 50vw, 33vw"
                              />
                            ) : (
                              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#ccc", background: "#f8f9fa", border: "1px solid #eaeaea" }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                              </div>
                            )}
                          </div>
                          <div style={{ fontSize: "14px", fontWeight: 700, color: "#111", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", wordBreak: "keep-all" }}>
                            {a.title}
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* 일반 뉴스 리스트 */}
                {regularArticles.map((a: any) => (
                <Link
                  href={`/m/news/${a.article_no || a.id}`}
                  key={a.id}
                  className="article-row"
                  style={{
                    display: "flex",
                    gap: "14px",
                    padding: "16px",
                    borderBottom: "1px solid #f0f0f0",
                    cursor: "pointer",
                    background: "#fff",
                    transition: "background 0.15s ease",
                    WebkitTapHighlightColor: "transparent",
                  }}
                >
                  {/* 왼쪽 썸네일 (존재할 경우) */}
                  {(a.thumbnail_url || extractYoutubeId(a.youtube_url, a.content)) && (
                    <div style={{ flexShrink: 0, width: "130px", height: "88px", borderRadius: "6px", overflow: "hidden", backgroundColor: "#f3f4f6", position: "relative" }}>
                      <Image
                        src={a.thumbnail_url || `https://img.youtube.com/vi/${extractYoutubeId(a.youtube_url, a.content)}/mqdefault.jpg`}
                        alt={a.title}
                        fill
                        style={{ objectFit: "cover" }}
                        sizes="130px"
                      />
                    </div>
                  )}

                  {/* 오른쪽 텍스트 컨텐츠 */}
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontSize: "16px", fontWeight: 800, color: "#111", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", wordBreak: "keep-all", marginBottom: "4px", lineHeight: 1.4 }}>
                        {a.title}
                      </div>
                      <div style={{ fontSize: "14px", color: "#666", display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden", marginBottom: "6px", lineHeight: 1.4 }}>
                        {a.subtitle || stripHtml(a.content || "").slice(0, 80)}
                      </div>
                    </div>
                    <div style={{ fontSize: "13px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px" }}>
                      <span style={{ color: "#222222", fontWeight: 500 }}>
                        {formatDate(a.published_at || a.created_at)} · {a.author_name || "공실뉴스"}
                      </span>
                      {a.location_name && <span style={{ color: "#222222", marginLeft: "auto", fontWeight: 500 }}>📍{a.location_name}</span>}
                    </div>
                  </div>
                </Link>
              ))}
              </div>
            );
          })()}

          {!loading && articles.length === 0 && (
                <div style={{ textAlign: "center", padding: "60px 0", color: "#9ca3af" }}>
                  <div style={{ fontSize: "40px", marginBottom: "12px" }}>📰</div>
                  <p style={{ fontSize: "15px", fontWeight: 600 }}>아직 기사가 없습니다.</p>
                </div>
              )}
        </div>
      )}
      {/* 기사 상세 뷰 (모바일 슬라이딩 패널) - 우리동네뉴스 전용 */}
      <div ref={detailPanelRef} className={`news-detail-panel ${showDetail ? "open" : ""}`}>
        {/* 헤더 */}
        <div style={{ position: "sticky", top: 0, zIndex: 50, background: "#fff", display: "flex", justifyContent: "flex-end", padding: "12px 16px", borderBottom: "1px solid #f0f0f0" }}>
          <button onClick={() => window.history.back()} style={{ background: "none", border: "none", fontSize: "24px", cursor: "pointer", color: "#999" }}>✕</button>
        </div>

        {/* 로딩 상태 */}
        {detailLoading ? (
          <div style={{ padding: "20px" }}>
            <div className="skeleton" style={{ width: "80%", height: "24px", marginBottom: "16px" }} />
            <div className="skeleton" style={{ width: "40%", height: "16px", marginBottom: "30px" }} />
            <div className="skeleton" style={{ width: "100%", height: "200px", marginBottom: "16px" }} />
          </div>
        ) : articleDetail ? (
          <div style={{ padding: "0 20px 40px", backgroundColor: "#fff" }}>
            {/* 섹션 */}
            <div style={{ fontSize: "13px", color: "#666", marginBottom: "10px", marginTop: "16px" }}>
              [{articleDetail.section1 || "뉴스"} &gt; {articleDetail.section2 || "전체"}]
            </div>
            {/* 제목 */}
            <h1 style={{ fontSize: "22px", fontWeight: 800, color: "#111", lineHeight: 1.4, marginBottom: "16px", wordBreak: "keep-all" }}>
              {articleDetail.title}
            </h1>
            {/* 작성자 & 작성일 & 원본보기 */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f0f0f0", paddingBottom: "16px", marginBottom: "20px" }}>
              <div style={{ fontSize: "13px", color: "#666" }}>
                <span style={{ fontWeight: 700, color: "#111", marginRight: "8px" }}>{articleDetail.author_name || "공실뉴스"}</span>
                <span style={{ color: "#d1d5db", margin: "0 4px" }}>|</span>
                {formatDateFull(articleDetail.published_at || articleDetail.created_at)}
              </div>
              <button
                onClick={() => router.push(`/m/news/${articleDetail.article_no || articleDetail.id}`)}
                style={{ fontSize: "12px", color: "#ff8e15", border: "1px solid #ff8e15", background: "#fff", borderRadius: "20px", padding: "4px 10px", cursor: "pointer" }}
              >
                원본보기
              </button>
            </div>

            {/* 부제목 */}
            {articleDetail.subtitle && (
              <div style={{ padding: "16px", backgroundColor: "#f9fafb", borderLeft: "4px solid #d97706", fontSize: "15px", color: "#374151", lineHeight: 1.6, marginBottom: "24px", fontWeight: 600 }}>
                {articleDetail.subtitle}
              </div>
            )}

            {/* 본문 */}
            <div
              style={{ fontSize: "16px", lineHeight: 1.8, color: "#333", wordBreak: "keep-all" }}
              dangerouslySetInnerHTML={{ __html: articleDetail.content || "" }}
              onClick={(e) => {
                const target = e.target as HTMLElement;
                const a = target.closest('a');
                if (a && a.href) {
                  e.preventDefault();
                  let url = a.href;
                  try {
                    const urlObj = new URL(url);
                    if (urlObj.pathname === '/gongsil' || urlObj.pathname === '/m/gongsil') {
                      const id = urlObj.searchParams.get('id');
                      if (id) {
                        setSelectedVacancyId(id);
                        return;
                      }
                    }
                    if (urlObj.origin === window.location.origin) {
                      router.push(urlObj.pathname + urlObj.search + urlObj.hash);
                    } else {
                      window.location.href = url;
                    }
                  } catch (err) {
                    window.location.href = url;
                  }
                }
              }}
            />
          </div>
        ) : (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "#999" }}>
            기사를 불러올 수 없습니다.
          </div>
        )}
      </div>
      
      {/* Vacancy Iframe Overlay */}
      <div 
        className={`vacancy-iframe-overlay ${selectedVacancyId ? "open" : ""}`} 
        style={{
          position: "fixed", top: 0, left: "50%", width: "100%", maxWidth: "448px",
          marginLeft: "-224px", height: "100dvh", background: "#fff", zIndex: 9999999,
          transform: selectedVacancyId ? "translateX(0)" : "translateX(100vw)",
          transition: "transform 0.35s cubic-bezier(0.25,1,0.5,1)",
          display: "flex", flexDirection: "column"
        }}
      >
        <style>{`@media (max-width: 448px) { .vacancy-iframe-overlay { margin-left: -50vw !important; } }`}</style>
        {selectedVacancyId && (
          <iframe 
            src={`/m/gongsil?id=${selectedVacancyId}&embed=true`} 
            style={{ flex: 1, border: "none", width: "100%", height: "100%" }}
            title="vacancy-detail"
          />
        )}
      </div>
      

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .news-detail-panel {
          position: fixed; top: 0; left: 50%; width: 100%; max-width: 448px; height: 100dvh;
          margin-left: -224px; /* max-width 448px 의 절반 */
          background: #fff; z-index: 9999; transform: translateX(100vw);
          transition: transform 0.35s cubic-bezier(0.25, 1, 0.5, 1);
          overflow-y: auto;
        }
        @media (max-width: 448px) {
          .news-detail-panel {
            margin-left: -50vw;
          }
        }
        .news-detail-panel.open { transform: translateX(0); }
        .skeleton { background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 6px; }
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        .article-row { -webkit-user-select: none; user-select: none; }
        .article-row:active { background: #f3f4f6 !important; }
        .slide-out-left { animation: slideOutLeft 0.2s ease forwards; }
        .slide-out-right { animation: slideOutRight 0.2s ease forwards; }
        .slide-in-left { animation: slideInLeft 0.25s ease forwards; }
        .slide-in-right { animation: slideInRight 0.25s ease forwards; }
        @keyframes slideOutLeft { from { transform: translateX(0); opacity: 1; } to { transform: translateX(-100%); opacity: 0; } }
        @keyframes slideOutRight { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }
        @keyframes slideInLeft { from { transform: translateX(-60px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes slideInRight { from { transform: translateX(60px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      `}</style>
    </div>
  );
}

export default function MobileNewsClientWrapper(props: { initialTab: string, initialArticles: any[], initialAuthorName?: string, initialKeyword?: string, authorProfile?: any }) {
  return (
    <Suspense fallback={null}>
      <MobileNewsClient {...props} />
    </Suspense>
  );
}
