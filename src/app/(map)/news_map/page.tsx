"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { getArticles, getArticleDetail, incrementArticleView } from "@/app/actions/article";
import MapSearchBar from "@/components/MapSearchBar";
import MapTopAuthButtons from "@/components/MapTopAuthButtons";

export default function NewsLocalPage() {
  /* ── 상태 ── */
  const [allArticles, setAllArticles] = useState<any[]>([]);           // DB에서 불러온 전체 기사
  const [geoArticles, setGeoArticles] = useState<any[]>([]);           // 좌표가 있는 기사만
  const [filteredArticles, setFilteredArticles] = useState<any[]>([]);  // 현재 사이드바에 표시될 기사
  const [activeArticleId, setActiveArticleId] = useState<string | null>(null);
  const [articleDetail, setArticleDetail] = useState<any>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [popularArticles, setPopularArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewedArticles, setViewedArticles] = useState<Set<string>>(new Set());
  const [section1, setSection1] = useState("");
  const [section2, setSection2] = useState("");
  const [mapError, setMapError] = useState<string | null>(null);
  const [clusterMode, setClusterMode] = useState(false);  // 클러스터 클릭으로 필터 중인지 여부
  const [activeInfoWindow, setActiveInfoWindow] = useState<any>(null); // 현재 열린 InfoWindow ref
  const [mapCenterRegion, setMapCenterRegion] = useState<{sido:string, gugun:string, dong:string} | null>(null);

  /* ── Refs ── */
  const mapRef = useRef<HTMLDivElement>(null);
  const kakaoMapRef = useRef<any>(null);
  const clustererRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const infoWindowRef = useRef<any>(null);
  const clusterModeRef = useRef(false);
  const updateVisibleArticlesRef = useRef<() => void>(() => {});
  const showDetailRef = useRef(showDetail);
  const activeArticleIdRef = useRef(activeArticleId);
  
  useEffect(() => { showDetailRef.current = showDetail; }, [showDetail]);
  useEffect(() => { activeArticleIdRef.current = activeArticleId; }, [activeArticleId]);


  /* ── 유틸: 날짜 포맷 ── */
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return `${d.getFullYear()}. ${String(d.getMonth() + 1).padStart(2, "0")}. ${String(d.getDate()).padStart(2, "0")}.`;
  };
  const formatDateFull = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const hour = d.getHours();
    const ampm = hour >= 12 ? "오후" : "오전";
    const h12 = hour > 12 ? hour - 12 : hour || 12;
    return `입력 ${d.getFullYear()}. ${String(d.getMonth() + 1).padStart(2, "0")}. ${String(d.getDate()).padStart(2, "0")}. ${ampm} ${h12}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
  };
  const stripHtml = (html: string) => html ? html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim() : "";
  const extractYoutubeId = (url: string): string | null => {
    if (!url) return null;
    const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([\w-]{11})/);
    return m ? m[1] : null;
  };
  const youtubeId = articleDetail ? extractYoutubeId(articleDetail.youtube_url) : null;

  /* ── 기사 목록 가져오기 ── */
  useEffect(() => {
    const fetchArticles = async () => {
      setLoading(true);
      const filters: any = { status: "APPROVED" };
      if (section1) filters.section1 = section1;
      if (section2) filters.section2 = section2;

      const res = await getArticles(filters);
      if (res.success && res.data) {
        setAllArticles(res.data);
        const geo = res.data.filter((a: any) => a.lat && a.lng);
        setGeoArticles(geo);
        setFilteredArticles(geo); // 기본: 좌표 있는 기사 전체 표시
        setClusterMode(false);
      }

      // 인기 기사
      const popRes = await getArticles({ status: "APPROVED", limit: 50 });
      if (popRes.success && popRes.data) {
        const sorted = [...popRes.data].sort((a: any, b: any) => (b.view_count || 0) - (a.view_count || 0));
        setPopularArticles(sorted.slice(0, 5));
      }
      setLoading(false);
    };
    fetchArticles();
  }, [section1, section2]);

  /* ── 조회수 증가 ── */
  useEffect(() => {
    if (showDetail && articleDetail && articleDetail.id) {
      if (!viewedArticles.has(articleDetail.id)) {
        incrementArticleView(articleDetail.id).then((res) => {
          if (res.success && res.view_count !== undefined) {
            setArticleDetail((prev: any) => prev ? { ...prev, view_count: res.view_count } : prev);
          }
        });
        setViewedArticles(prev => new Set(prev).add(articleDetail.id));
      }
    }
  }, [showDetail, articleDetail, viewedArticles]);

  /* ── 기사 선택 (리스트 클릭) ── */
  const handleSelectArticle = useCallback(async (id: string, forceShowDetail = false) => {
    setActiveArticleId(id);
    if (forceShowDetail) setShowDetail(true);
    setArticleDetail(null);
    const res = await getArticleDetail(id);
    if (res.success && res.data) {
      setArticleDetail(res.data);
    }
  }, []);

  /* ── InfoWindow / CustomOverlay 닫기 ── */
  const closeInfoWindow = useCallback(() => {
    if (infoWindowRef.current) {
      if (typeof infoWindowRef.current.close === 'function') {
        infoWindowRef.current.close();
      } else if (typeof infoWindowRef.current.setMap === 'function') {
        infoWindowRef.current.setMap(null);
      }
      infoWindowRef.current = null;
    }
  }, []);

  /* ── InfoWindow 내 버튼 텍스트 동기화 ── */
  useEffect(() => {
    const btn = document.getElementById("overlay-toggle-btn");
    if (btn) {
      if (showDetail) {
        btn.innerHTML = "기사닫기 ✕";
        btn.style.color = "#d32f2f";
      } else {
        btn.innerHTML = "기사 보러가기 &gt;";
        btn.style.color = "#ff8e15";
      }
    }
  }, [showDetail, activeArticleId]);

  /* ── 지도에서 특정 기사 위치에 커스텀 오버레이 표시 ── */
  const showArticleOnMap = useCallback((article: any) => {
    if (!kakaoMapRef.current || !article.lat || !article.lng) return;
    const kakao = (window as any).kakao;
    const position = new kakao.maps.LatLng(article.lat, article.lng);

    // 기존 오버레이 닫기
    closeInfoWindow();

    // 글로벌 함수 등록 (HTML에서 호출)
    (window as any).__openArticleDetail = (id: string) => {
      // 이미 열려있는 같은 기사면 닫기
      if (activeArticleIdRef.current === id && showDetailRef.current) {
        setShowDetail(false);
      } else {
        handleSelectArticle(id, true);
      }
    };
    (window as any).__closeCustomOverlay = () => {
      closeInfoWindow();
    };

    // 하나로 이어진 깔끔한 말풍선 오버레이 생성
    const content = `
      <div style="position: relative; background: #fff; padding: 16px 20px; max-width: 300px; min-width: 250px; border-radius: 8px; box-shadow: 0 6px 20px rgba(0,0,0,0.15); border: 1px solid #ddd; font-family: 'Pretendard', sans-serif; line-height: 1.4; margin-bottom: 22px;">
        <div onclick="window.__closeCustomOverlay()" style="position: absolute; top: 10px; right: 12px; font-size: 18px; color: #999; cursor: pointer; line-height: 1; padding: 4px;" title="닫기">✕</div>
        
        <h4 style="margin: 0 16px 8px 0; font-size: 16px; font-weight: 800; color: #111; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; word-break: keep-all; letter-spacing: -0.5px;">${article.title}</h4>
        <p style="margin: 0 0 14px; font-size: 13px; color: #666; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden;">${article.subtitle || stripHtml(article.content || '').slice(0, 60)}</p>
        
        <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 12px; border-top: 1px solid #f0f0f0;">
          <span style="font-size: 12px; color: #a1a1aa; white-space: nowrap;">${formatDate(article.published_at || article.created_at)} · ${article.author_name || '공실뉴스'}</span>
          <span id="overlay-toggle-btn" onclick="window.__openArticleDetail('${article.id}')" style="font-size: 13px; font-weight: bold; color: ${(activeArticleIdRef.current === article.id && showDetailRef.current) ? '#d32f2f' : '#ff8e15'}; cursor: pointer; white-space: nowrap;">${(activeArticleIdRef.current === article.id && showDetailRef.current) ? '기사닫기 ✕' : '기사 보러가기 &gt;'}</span>
        </div>
        
        <!-- 꼬리 부분 (삼각형) - 라인 없이 이어진 느낌 구현 -->
        <div style="position: absolute; bottom: -11px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 11px solid transparent; border-right: 11px solid transparent; border-top: 11px solid #ddd;"></div>
        <div style="position: absolute; bottom: -10px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 11px solid transparent; border-right: 11px solid transparent; border-top: 11px solid #fff;"></div>
      </div>
    `;

    const customOverlay = new kakao.maps.CustomOverlay({
      content,
      position,
      clickable: true,
      xAnchor: 0.5,
      yAnchor: 1, // 마커 상단에 말풍선 밑면을 위치
      zIndex: 5
    });
    
    customOverlay.setMap(kakaoMapRef.current);
    infoWindowRef.current = customOverlay;

    // 지도 이동
    kakaoMapRef.current.panTo(position);
  }, [closeInfoWindow, handleSelectArticle]);

  /* ── 현재 지도 뷰포트에 보이는 기사만 필터링 ── */
  const updateVisibleArticles = useCallback(() => {
    if (!kakaoMapRef.current) { setFilteredArticles(geoArticles); return; }
    const bounds = kakaoMapRef.current.getBounds();
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    const visible = geoArticles.filter(a => 
      a.lat >= sw.getLat() && a.lat <= ne.getLat() && 
      a.lng >= sw.getLng() && a.lng <= ne.getLng()
    );
    setFilteredArticles(visible);
  }, [geoArticles]);

  /* ── 지도 검색 바를 통한 부드러운 위치 이동 ── */
  const panMapTo = useCallback((lat: number, lng: number) => {
    if (kakaoMapRef.current) {
      const kakao = (window as any).kakao;
      const moveLatLon = new kakao.maps.LatLng(lat, lng);
      // 부드러운 이동 (panTo)
      kakaoMapRef.current.panTo(moveLatLon);
      // 이동 시 지도 레벨을 동네 수준으로 당기기
      kakaoMapRef.current.setLevel(5, { animate: true });
    }
  }, []);

  // Ref 동기화: 이벤트 리스너 클로저에서 항상 최신 값 참조
  useEffect(() => { clusterModeRef.current = clusterMode; }, [clusterMode]);
  useEffect(() => { updateVisibleArticlesRef.current = updateVisibleArticles; }, [updateVisibleArticles]);

  // Preload Kakao Map script immediately on mount
  const [mapLoaded, setMapLoaded] = useState(false);
  useEffect(() => {
    if ((window as any).kakao && (window as any).kakao.maps && typeof (window as any).kakao.maps.LatLng === "function") {
      setMapLoaded(true);
      return;
    }
    const scriptId = "kakao-map-script";
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      const kakaoApiKey = process.env.NEXT_PUBLIC_KAKAO_APP_KEY || "435d3602201a49ea712e5f5a36fe6efc";
      script.id = scriptId;
      script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${kakaoApiKey}&libraries=services,clusterer&autoload=false`;
      script.onerror = () => setMapError("카카오맵 JS 키가 유효하지 않거나 등록되지 않았습니다.");
      document.head.appendChild(script);
      script.onload = () => {
        (window as any).kakao.maps.load(() => {
          setMapLoaded(true);
        });
      };
    } else {
      const check = setInterval(() => {
        if ((window as any).kakao && (window as any).kakao.maps && typeof (window as any).kakao.maps.LatLng === "function") {
          clearInterval(check);
          setMapLoaded(true);
        }
      }, 100);
    }
  }, []);

  /* ── 1. 빈 지도 즉시 렌더링 ── */
  useEffect(() => {
    if (!mapLoaded) return;
    const kakao = (window as any).kakao;
    if (!mapRef.current || kakaoMapRef.current) return;

    kakaoMapRef.current = new kakao.maps.Map(mapRef.current, {
      center: new kakao.maps.LatLng(37.498095, 127.027610),
      level: 8,
    });

    const map = kakaoMapRef.current;

    // 지도 이동/줌 완료 시 → 현재 뷰포트에 보이는 기사만 사이드바에 표시 + 주소 파악
    kakao.maps.event.addListener(map, 'idle', () => {
      if (!clusterModeRef.current) {
        updateVisibleArticlesRef.current();
      }
      
      // 중심 좌표로 주소 역지오코딩
      if (kakao.maps.services && kakao.maps.services.Geocoder) {
        const center = map.getCenter();
        const geocoder = new kakao.maps.services.Geocoder();
        geocoder.coord2RegionCode(center.getLng(), center.getLat(), (result: any, status: any) => {
          if (status === kakao.maps.services.Status.OK) {
            const hResult = result.find((r: any) => r.region_type === 'H') || result[0];
            if (hResult) {
              setMapCenterRegion({
                sido: hResult.region_1depth_name,
                gugun: hResult.region_2depth_name,
                dong: hResult.region_3depth_name
              });
            }
          }
        });
      }
    });
  }, [mapLoaded]);

  /* ── 2. 데이터가 불러와지면 마커 렌더링 ── */
  useEffect(() => {
    if (!kakaoMapRef.current || geoArticles.length === 0) return;

    const kakao = (window as any).kakao;
    const map = kakaoMapRef.current;

    let initialLat = 37.498095;
    let initialLng = 127.027610;

    const validArt = geoArticles.find(a => a.lat && a.lng);
    if (validArt) { initialLat = validArt.lat; initialLng = validArt.lng; }

    if (!clustererRef.current) {
        clustererRef.current = new kakao.maps.MarkerClusterer({
          map: map,
          averageCenter: true,
          minLevel: 4,
          gridSize: 60,
          calculator: [5, 10, 30, 50],
          texts: (count: number) => count.toString(),
          styles: [
            { width: '38px', height: '38px', background: 'rgba(255, 142, 21, 0.85)', color: '#fff', textAlign: 'center', lineHeight: '38px', borderRadius: '50%', fontWeight: 'bold', fontSize: '14px', border: '3px solid rgba(255,255,255,0.7)', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' },
            { width: '44px', height: '44px', background: 'rgba(255, 130, 0, 0.88)', color: '#fff', textAlign: 'center', lineHeight: '44px', borderRadius: '50%', fontWeight: 'bold', fontSize: '15px', border: '3px solid rgba(255,255,255,0.7)', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' },
            { width: '52px', height: '52px', background: 'rgba(230, 115, 0, 0.9)', color: '#fff', textAlign: 'center', lineHeight: '52px', borderRadius: '50%', fontWeight: 'bold', fontSize: '16px', border: '3px solid rgba(255,255,255,0.7)', boxShadow: '0 3px 10px rgba(0,0,0,0.25)' },
            { width: '60px', height: '60px', background: 'rgba(204, 102, 0, 0.92)', color: '#fff', textAlign: 'center', lineHeight: '60px', borderRadius: '50%', fontWeight: 'bold', fontSize: '17px', border: '3px solid rgba(255,255,255,0.7)', boxShadow: '0 3px 12px rgba(0,0,0,0.3)' },
            { width: '70px', height: '70px', background: 'rgba(178, 89, 0, 0.95)', color: '#fff', textAlign: 'center', lineHeight: '70px', borderRadius: '50%', fontWeight: 'bold', fontSize: '19px', border: '3px solid rgba(255,255,255,0.7)', boxShadow: '0 4px 14px rgba(0,0,0,0.35)' }
          ]
        });

        // 클러스터 클릭 이벤트: 해당 클러스터의 기사들만 사이드바에 표시
        kakao.maps.event.addListener(clustererRef.current, 'clusterclick', (cluster: any) => {
          const clusterMarkers = cluster.getMarkers();
          const clusterArticleIds = clusterMarkers.map((m: any) => m._articleId).filter(Boolean);
          const matched = geoArticles.filter(a => clusterArticleIds.includes(a.id));
          if (matched.length > 0) {
            setFilteredArticles(matched);
            setClusterMode(true);
            setActiveArticleId(null);
            setShowDetail(false);
            closeInfoWindow();
          }
        });
    }

    // 기존 마커 제거
    if (clustererRef.current) clustererRef.current.clear();
    markersRef.current = [];

    const newMarkers: any[] = [];
    geoArticles.forEach(art => {
      if (!art.lat || !art.lng) return;
      const position = new kakao.maps.LatLng(art.lat, art.lng);

      // 오렌지색 원 커스텀 마커 이미지 (SVG → DataURL)
      const size = 32;
      const svgStr = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><circle cx="${size/2}" cy="${size/2}" r="${size/2 - 2}" fill="%23ff8e15" stroke="white" stroke-width="2.5"/><text x="50%25" y="54%25" text-anchor="middle" dominant-baseline="middle" fill="white" font-size="13" font-weight="bold" font-family="sans-serif">1</text></svg>`;
      const markerImage = new kakao.maps.MarkerImage(
        `data:image/svg+xml,${svgStr}`,
        new kakao.maps.Size(size, size),
        { offset: new kakao.maps.Point(size / 2, size / 2) }
      );

      const marker = new kakao.maps.Marker({ position, image: markerImage });

      // 마커에 기사 ID 연결 (클러스터 필터에 사용)
      (marker as any)._articleId = art.id;

      // 마우스 오버 → 살짝 키운 원 마커 이미지
      const hoverSize = 40;
      const hoverSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${hoverSize}" height="${hoverSize}"><circle cx="${hoverSize/2}" cy="${hoverSize/2}" r="${hoverSize/2 - 2}" fill="%23e67300" stroke="white" stroke-width="3"/><text x="50%25" y="54%25" text-anchor="middle" dominant-baseline="middle" fill="white" font-size="15" font-weight="bold" font-family="sans-serif">1</text></svg>`;
      const hoverImage = new kakao.maps.MarkerImage(
        `data:image/svg+xml,${hoverSvg}`,
        new kakao.maps.Size(hoverSize, hoverSize),
        { offset: new kakao.maps.Point(hoverSize / 2, hoverSize / 2) }
      );

      kakao.maps.event.addListener(marker, 'mouseover', () => {
        marker.setImage(hoverImage);
        marker.setZIndex(100);
      });
      kakao.maps.event.addListener(marker, 'mouseout', () => {
        marker.setImage(markerImage);
        marker.setZIndex(0);
      });

      // 개별 마커 클릭 → 말풍선 표시
      kakao.maps.event.addListener(marker, 'click', () => {
        showArticleOnMap(art);
        setActiveArticleId(art.id);
      });

      newMarkers.push(marker);
      markersRef.current.push(marker);
    });

    if (clustererRef.current && newMarkers.length > 0) {
      clustererRef.current.addMarkers(newMarkers);
    }

    // relayout 안전 실행
    setTimeout(() => {
      if (map) {
        map.relayout();
        map.setCenter(new kakao.maps.LatLng(initialLat, initialLng));
        // 초기 로딩 후 현재 뷰포트 기사 필터링
        setTimeout(() => updateVisibleArticlesRef.current(), 200);
      }
    }, 500);

  }, [geoArticles, showArticleOnMap, closeInfoWindow]);

  /* ── 전체보기 (클러스터 필터 해제, 뷰포트 기반으로 복원) ── */
  const handleShowAll = useCallback(() => {
    setClusterMode(false);
    setActiveArticleId(null);
    setShowDetail(false);
    closeInfoWindow();
    updateVisibleArticles();
  }, [closeInfoWindow, updateVisibleArticles]);

  /* ── 사이드바 기사 클릭 시 지도 이동 + 말풍선 ── */
  const handleListArticleClick = useCallback((article: any) => {
    setActiveArticleId(article.id);
    showArticleOnMap(article);
    // 상세도 미리 로드
    handleSelectArticle(article.id, false);
  }, [showArticleOnMap, handleSelectArticle]);

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: "'Pretendard', sans-serif" }}>
      {/* ===== 슬림 헤더 ===== */}
      <header style={{ display: "flex", alignItems: "center", padding: "10px 20px", borderBottom: "2px solid #ff8e15", background: "linear-gradient(135deg, #fff5eb 0%, #fff 50%)", zIndex: 100, flexShrink: 0, gap: 12 }}>
        <Link href="/" style={{ marginRight: 8, display: "flex", alignItems: "center", textDecoration: "none" }}>
          <img src="/logo.png" alt="공실뉴스" style={{ height: 32 }} onError={(e) => { (e.target as HTMLImageElement).src = "https://via.placeholder.com/100x32?text=LOGO"; }} />
        </Link>
        <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0, color: "#111", letterSpacing: -0.5 }}>우리동네뉴스</h1>
        <div style={{ display: "flex", gap: 8, marginLeft: 12 }}>
          <select value={section1} onChange={(e) => { setSection1(e.target.value); setSection2(""); }}
            style={{ padding: "7px 12px", border: "1px solid #ddd", borderRadius: 6, outline: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", background: "#fff" }}>
            <option value="">1차섹션 전체</option>
            <option value="우리동네부동산">우리동네부동산</option>
            <option value="뉴스/칼럼">뉴스/칼럼</option>
          </select>
          <select value={section2} onChange={(e) => setSection2(e.target.value)}
            style={{ padding: "7px 12px", border: "1px solid #ddd", borderRadius: 6, outline: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", background: "#fff" }}>
            <option value="">2차섹션 전체</option>
            {section1 === "우리동네부동산" && (<>
              <option value="아파트·오피스텔">아파트·오피스텔</option>
              <option value="빌라·주택">빌라·주택</option>
              <option value="원룸·투룸">원룸·투룸</option>
              <option value="상가·업무·공장·토지">상가·업무·공장·토지</option>
              <option value="분양">분양</option>
            </>)}
            {section1 === "뉴스/칼럼" && (<>
              <option value="부동산·주식·재테크">부동산·주식·재테크</option>
              <option value="정치·경제·사회">정치·경제·사회</option>
              <option value="세무·법률">세무·법률</option>
              <option value="여행·건강·생활">여행·건강·생활</option>
              <option value="IT·가전·가구">IT·가전·가구</option>
              <option value="스포츠·연예·Car">스포츠·연예·Car</option>
              <option value="인물·미션·기타">인물·미션·기타</option>
            </>)}
          </select>
        </div>
        <MapTopAuthButtons />
      </header>

      {/* ===== 메인 (좌 사이드바 + 우 지도) ===== */}
      <main style={{ display: "flex", flex: 1, minHeight: 0, position: "relative" }}>

        {/* ── 좌측 사이드바 ── */}
        <aside style={{ width: 380, minWidth: 380, height: "100%", background: "#fff", borderRight: "1px solid #e5e5e5", display: "flex", flexDirection: "column", zIndex: 20 }}>
          {/* 상단 헤더 */}
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #eee", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, background: clusterMode ? "#fff7ed" : "#fff" }}>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "#111", display: "flex", alignItems: "center", gap: 6 }}>
              {clusterMode ? (
                <>
                  <span style={{ color: "#ff8e15" }}>📍 선택 지역</span> 기사 {filteredArticles.length}개
                </>
              ) : (
                <>
                  <span style={{ color: "#ff8e15" }}>🗺️</span> 지도영역 기사 {filteredArticles.length}개
                </>
              )}
            </h2>
            {clusterMode && (
              <button onClick={handleShowAll} style={{ padding: "5px 14px", background: "#f3f4f6", border: "1px solid #ddd", borderRadius: 20, fontSize: 12, fontWeight: 700, color: "#555", cursor: "pointer" }}>
                전체보기
              </button>
            )}
          </div>

          {/* 기사 리스트 */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {loading ? (
              <div style={{ padding: 80, textAlign: "center" }}>
                <div style={{ width: 32, height: 32, border: "3px solid #f0f0f0", borderTop: "3px solid #ff8e15", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }}></div>
                <div style={{ fontSize: 14, color: "#888", fontWeight: 500 }}>기사를 불러오는 중</div>
              </div>
            ) : filteredArticles.length === 0 ? (
              <div style={{ padding: 60, textAlign: "center" }}>
                <div style={{ fontSize: 14, color: "#aaa", fontWeight: 500 }}>
                  {clusterMode ? "선택한 영역에 기사가 없습니다." : "현재 지도 영역에 기사가 없습니다."}
                </div>
              </div>
            ) : filteredArticles.map((item) => {
              const isActive = activeArticleId === item.id;
              const isActiveAndShowing = isActive && showDetail;
              return (
                <div
                  key={item.id}
                  onClick={() => handleListArticleClick(item)}
                  style={{
                    padding: "16px 20px",
                    borderBottom: "1px solid #f0f0f0",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    background: isActive ? "#fff7ed" : "#fff",
                    borderLeft: isActive ? "4px solid #ff8e15" : "4px solid transparent",
                  }}
                  onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "#fafafa"; }}
                  onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "#fff"; }}
                >
                  <div style={{ fontSize: 11, color: "#ff8e15", fontWeight: "bold", marginBottom: 5, display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ background: "#fff7ed", padding: "2px 6px", borderRadius: 3, border: "1px solid #ffdfb8" }}>
                      {item.section1 || "뉴스"} &gt; {item.section2 || "전체"}
                    </span>
                    {item.section1 === "뉴스/칼럼" && <span style={{ color: "#ef4444" }}>NEWS</span>}
                    {item.location_name && <span style={{ color: "#999", fontSize: 10 }}>📍{item.location_name}</span>}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.45, wordBreak: "keep-all", marginBottom: 8, color: "#111", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: 13, color: "#666", marginBottom: 10, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", lineHeight: 1.5 }}>
                    {item.subtitle || stripHtml(item.content || "").slice(0, 100)}
                  </div>
                  <div style={{ fontSize: 12, color: "#999", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>{formatDate(item.published_at || item.created_at)} · {item.author_name || "공실뉴스"}</span>
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isActiveAndShowing) {
                          setShowDetail(false);
                        } else {
                          handleSelectArticle(item.id, true);
                        }
                      }}
                      style={{ color: isActiveAndShowing ? "#d32f2f" : "#ff8e15", fontSize: 12, fontWeight: "bold", cursor: "pointer" }}
                    >
                      {isActiveAndShowing ? "기사닫기 ✕" : "기사상세보기 >"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* ── 지도 + 기사 상세 래퍼 ── */}
        <div style={{ flex: 1, height: "100%", position: "relative", minWidth: 0, background: "#e8eaed", overflow: "hidden" }}>


          {/* 기사 상세 뷰 (좌→우 슬라이드) - 항상 렌더링 유지하여 CSS transform 애니메이션 발동 */}
          <div style={{
            position: "absolute", top: 0, left: 0, width: 750, maxWidth: "100%", height: "100%",
            borderRight: "1px solid #ddd", boxShadow: "5px 0 30px rgba(0,0,0,0.15)", background: "#fff",
            zIndex: 2000, overflowY: "auto",
            transform: showDetail ? "translateX(0)" : "translateX(-100%)",
            opacity: showDetail ? 1 : 0,
            visibility: showDetail ? "visible" : "hidden",
            transition: "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s ease, visibility 0.4s"
          }}>
            {/* 닫기 버튼은 항상 렌더링 (로딩 중에도 닫을 수 있게) */}
            <button onClick={() => setShowDetail(false)} style={{ position: "absolute", top: 10, right: 10, background: "none", border: "none", fontSize: 32, color: "#999", cursor: "pointer", padding: 10, lineHeight: 1, zIndex: 10 }} title="닫기">✕</button>

            {articleDetail ? (
              <div style={{ maxWidth: 1200, margin: "0 auto", padding: "20px 40px 40px", position: "relative" }}>

                <div style={{ fontSize: 14, color: "#666", marginBottom: 8, fontWeight: 600 }}>
                  [{articleDetail.section1 || "뉴스"} &gt; {articleDetail.section2 || "전체"}]
                </div>

                <h1 style={{ fontSize: 34, fontWeight: 800, color: "#111", lineHeight: 1.3, marginBottom: 16, letterSpacing: -1.5, wordBreak: "keep-all" }}>{articleDetail.title}</h1>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #ddd", paddingBottom: 16, marginBottom: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "#666" }}>
                    <span style={{ color: "#111", fontWeight: "bold" }}>{articleDetail.author_name || "공실뉴스"}</span>
                    <span style={{ display: "inline-block", width: 1, height: 12, background: "#ddd" }}></span>
                    <span>{formatDateFull(articleDetail.published_at || articleDetail.created_at)}</span>
                    <span style={{ display: "inline-block", width: 1, height: 12, background: "#ddd" }}></span>
                    <span>조회수 {articleDetail.view_count || 0}</span>
                  </div>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <Link href={`/news/${articleDetail.article_no || articleDetail.id}`} style={{ fontSize: 13, fontWeight: "bold", color: "#ff8e15", border: "1px solid #ff8e15", borderRadius: 20, padding: "4px 14px", textDecoration: "none" }}>원문보기</Link>
                  </div>
                </div>

                <div style={{ paddingTop: 0, marginTop: 30 }}>
                  {articleDetail.subtitle && <div className="article-subtitle-box map-subtitle-box">{articleDetail.subtitle}</div>}
                  <div className="article-body">
                    {youtubeId && !(articleDetail.content && articleDetail.content.includes('youtube.com/embed')) ? (
                      <div className="article-img-wrap">
                        <div style={{ position: "relative", width: "100%", paddingBottom: articleDetail.is_shorts ? "177.78%" : "56.25%", maxWidth: articleDetail.is_shorts ? 315 : "100%", margin: "0 auto", height: 0, overflow: "hidden", borderRadius: 8 }}>
                          <iframe src={`https://www.youtube.com/embed/${youtubeId}`} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none", borderRadius: 8 }} allowFullScreen />
                        </div>
                      </div>
                    ) : !youtubeId && articleDetail.thumbnail_url && !(articleDetail.content && articleDetail.content.includes(articleDetail.thumbnail_url)) ? (
                      <div className="article-img-wrap">
                        <img src={articleDetail.thumbnail_url} alt={articleDetail.title} style={{ width: "100%", maxHeight: 400, objectFit: "cover", borderRadius: 8 }} />
                      </div>
                    ) : null}

                    {articleDetail.content && <div dangerouslySetInnerHTML={{ __html: articleDetail.content }} />}
                  </div>

                  {articleDetail.article_keywords && articleDetail.article_keywords.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "24px 0", padding: "16px 0", borderTop: "1px solid #eee" }}>
                      {articleDetail.article_keywords.map((kw: any, i: number) => (
                        <span key={i} style={{ padding: "6px 14px", borderRadius: 20, background: "#fff7ed", color: "#b45309", fontSize: 13, fontWeight: 500, border: "1px solid #fde68a" }}>
                          #{kw.keyword}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="article-footer-bar" style={{ marginTop: 40 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontWeight: 800, color: "#111" }}>{articleDetail.author_name || "공실뉴스"}</span>
                    </div>
                    <div style={{ color: "#888", fontSize: 13 }}>저작권자 © 공실뉴스 무단전재 및 재배포 금지</div>
                  </div>

                  {/* 댓글 */}
                  <div className="comments-section">
                    <div className="comment-header">
                      <div className="comment-count">0개의 댓글</div>
                      <div style={{ fontSize: 14, color: "#555", cursor: "pointer" }}>내 댓글 〉</div>
                    </div>
                    <div className="comment-box">
                      <div className="comment-user-name">로그인이 필요합니다</div>
                      <textarea className="comment-textarea" placeholder="댓글을 남겨보세요" value={commentText} onChange={(e) => setCommentText(e.target.value.slice(0, 400))} />
                      <div className="comment-footer">
                        <div style={{ fontSize: 13, color: "#999", display: "flex", alignItems: "center", gap: 16 }}>
                          <span><span style={{ fontWeight: "bold", color: "#111" }}>{commentText.length}</span> / 400</span>
                          <label style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 4, color: "#555" }}><input type="checkbox" style={{ accentColor: "#ff8e15" }} /> 비밀댓글</label>
                        </div>
                        <button className="comment-submit-btn">등록</button>
                      </div>
                    </div>
                    <div style={{ padding: 20, textAlign: "center", color: "#999", fontSize: 14 }}>첫 댓글을 남겨보세요.</div>
                  </div>
                </div>
              </div>
            ) : activeArticleId ? (
              /* 로딩 표시자를 슬라이드 패널 내부로 통합 */
              <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
                <div style={{ width: 36, height: 36, border: "3px solid #f0f0f0", borderTop: "3px solid #ff8e15", borderRadius: "50%", animation: "spin 0.8s linear infinite" }}></div>
                <div style={{ fontSize: 15, color: "#888", fontWeight: 500 }}>기사를 불러오는 중</div>
              </div>
            ) : null}
          </div>

          {/* 지도 영역 */}
          <div ref={mapRef} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", background: "#e8eaed" }}>
            {mapError && (
              <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", background: "#ffefef", color: "#d32f2f", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, zIndex: 10 }}>
                <span style={{ fontSize: 40 }}>⚠️</span>
                <span style={{ fontSize: 16, fontWeight: "bold" }}>지도 로드 오류</span>
                <span style={{ fontSize: 14 }}>{mapError}</span>
              </div>
            )}
          </div>
          
          {/* 🔍 지도 지역/검색어 오버레이 UI */}
          <MapSearchBar onSearchCoord={panMapTo} mapCenterRegion={mapCenterRegion} />

        </div>
      </main>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
