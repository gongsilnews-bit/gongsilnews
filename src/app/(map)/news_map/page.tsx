"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { getArticles, getArticleDetail } from "@/app/actions/article";

export default function NewsLocalPage() {
  const [articles, setArticles] = useState<any[]>([]);
  const [activeArticleId, setActiveArticleId] = useState<string | null>(null);
  const [articleDetail, setArticleDetail] = useState<any>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [popularArticles, setPopularArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [section1, setSection1] = useState("");
  const [section2, setSection2] = useState("");
  const mapRef = React.useRef<HTMLDivElement>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const kakaoMapRef = React.useRef<any>(null);
  const clustererRef = React.useRef<any>(null);
  const markersRef = React.useRef<any[]>([]);

  // 날짜 포맷
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}. ${mm}. ${dd}.`;
  };

  const formatDateFull = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hour = d.getHours();
    const min = String(d.getMinutes()).padStart(2, "0");
    const sec = String(d.getSeconds()).padStart(2, "0");
    const ampm = hour >= 12 ? "오후" : "오전";
    const h12 = hour > 12 ? hour - 12 : hour || 12;
    return `입력 ${yyyy}. ${mm}. ${dd}. ${ampm} ${h12}:${min}:${sec}`;
  };

  // HTML 태그 제거
  const stripHtml = (html: string) => {
    if (!html) return "";
    return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
  };

  // 기사 목록 가져오기
  useEffect(() => {
    const fetchArticles = async () => {
      setLoading(true);
      const filters: any = { status: "APPROVED" };
      if (section1) filters.section1 = section1;
      if (section2) filters.section2 = section2;

      const res = await getArticles(filters);
      if (res.success && res.data) {
        setArticles(res.data);
        // 첫 번째 기사 자동 선택
        if (res.data.length > 0 && !activeArticleId) {
          handleSelectArticle(res.data[0].id);
        }
      }

      // 인기 기사
      const popRes = await getArticles({ status: "APPROVED", limit: 50 });
      if (popRes.success && popRes.data) {
        const sorted = [...popRes.data].sort((a, b) => (b.view_count || 0) - (a.view_count || 0));
        setPopularArticles(sorted.slice(0, 5));
      }

      setLoading(false);
    };
    fetchArticles();
  }, [section1, section2]);

  // 기사 선택 시 상세 가져오기 (리스트 영역용)
  const handleSelectArticle = async (id: string, forceShowDetail = false) => {
    setActiveArticleId(id);
    
    // 강제로 열어야 할 경우 열기
    if (forceShowDetail) {
      setShowDetail(true);
    }

    setArticleDetail(null);
    const res = await getArticleDetail(id);
    if (res.success && res.data) {
      setArticleDetail(res.data);
    }
  };

  // 유튜브 ID 추출
  const extractYoutubeId = (url: string): string | null => {
    if (!url) return null;
    const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([\w-]{11})/);
    return m ? m[1] : null;
  };

  const youtubeId = articleDetail ? extractYoutubeId(articleDetail.youtube_url) : null;

  // 카카오맵 초기화 및 기사 목록 변경 시 마커 렌더링
  useEffect(() => {
    const loadKakaoMap = () => {
      const kakao = (window as any).kakao;
      if (!kakao || !kakao.maps || !mapRef.current) return;
      
      const renderMap = () => {
        let initialLat = 37.498095;
        let initialLng = 127.027610;
        
        const validArt = articles.find(a => a.lat && a.lng);
        if (validArt) {
          initialLat = validArt.lat;
          initialLng = validArt.lng;
        }

        if (!kakaoMapRef.current) {
          const options = {
            center: new kakao.maps.LatLng(initialLat, initialLng),
            level: 7, // 클러스터링을 잘 보이게 하기 위해 기본 레벨을 조금 넓게 줌
          };
          kakaoMapRef.current = new kakao.maps.Map(mapRef.current, options);
          
          // 클러스터러 초기화
          clustererRef.current = new kakao.maps.MarkerClusterer({
            map: kakaoMapRef.current,
            averageCenter: true, 
            minLevel: 5, // 클러스터 할 최소 지도 레벨
            calculator: [10, 30, 50], // 클러스터의 크기 구분 기준
            texts: (count: number) => count.toString(),
            styles: [
              { // 작음
                width: '36px', height: '36px', background: '#ff8e15', color: '#fff', textAlign: 'center', lineHeight: '36px', borderRadius: '50%', fontWeight: 'bold', fontSize: '14px', border: '2px solid #fff', boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
              },
              { // 중간
                width: '46px', height: '46px', background: '#ff8e15', color: '#fff', textAlign: 'center', lineHeight: '46px', borderRadius: '50%', fontWeight: 'bold', fontSize: '15px', border: '2px solid #fff', boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
              },
              { // 큼
                width: '56px', height: '56px', background: '#e67300', color: '#fff', textAlign: 'center', lineHeight: '56px', borderRadius: '50%', fontWeight: 'bold', fontSize: '16px', border: '2px solid #fff', boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
              },
              { // 매우 큼
                width: '66px', height: '66px', background: '#cc6600', color: '#fff', textAlign: 'center', lineHeight: '66px', borderRadius: '50%', fontWeight: 'bold', fontSize: '18px', border: '2px solid #fff', boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
              }
            ]
          });
        }

        // 기존 마커 제거
        if (clustererRef.current) {
          clustererRef.current.clear();
        }
        markersRef.current = [];

        // 새 마커 배열
        const newMarkers: any[] = [];

        articles.forEach(art => {
          if (!art.lat || !art.lng) return;
          const position = new kakao.maps.LatLng(art.lat, art.lng);
          const marker = new kakao.maps.Marker({ position });
          
          // 마커 클릭 이벤트
          kakao.maps.event.addListener(marker, 'click', () => {
            handleSelectArticle(art.id, false);
          });

          newMarkers.push(marker);
          markersRef.current.push(marker);
        });

        if (clustererRef.current && newMarkers.length > 0) {
          clustererRef.current.addMarkers(newMarkers);
        }

        // Vercel 브라우저 사이즈 문제로 회색 화면이 뜨는 버그 방지 (강제 리렌더)
        setTimeout(() => {
          if (kakaoMapRef.current) {
            kakaoMapRef.current.relayout();
            kakaoMapRef.current.setCenter(new kakao.maps.LatLng(initialLat, initialLng));
          }
        }, 500);
      };

      kakao.maps.load(() => renderMap());
    };

    if (!(window as any).kakao || !(window as any).kakao.maps) {
      if (!document.getElementById("kakao-map-script")) {
        const script = document.createElement("script");
        const kakaoApiKey = process.env.NEXT_PUBLIC_KAKAO_APP_KEY || "535b712ad15df457168dcab800fcb4aa";
        script.id = "kakao-map-script";
        script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${kakaoApiKey}&libraries=services,clusterer&autoload=false`;
        script.onerror = () => {
          setMapError("카카오맵 JS 키가 유효하지 않거나 등록되지 않았습니다.");
        };
        document.head.appendChild(script);
        script.onload = loadKakaoMap;
      } else {
        // 스크립트 태그는 있는데 아직 로드가 안 끝난 상태이므로 조금 기다립니다.
        const checkReady = setInterval(() => {
          if ((window as any).kakao && (window as any).kakao.maps) {
            clearInterval(checkReady);
            loadKakaoMap();
          }
        }, 100);
      }
    } else {
      loadKakaoMap();
    }
  }, [articles]);

  // 활성화된 기사 변경 시 지도 부드럽게 이동 (PanTo)
  useEffect(() => {
    if (activeArticleId && kakaoMapRef.current && (window as any).kakao) {
      const activeArt = articles.find(a => a.id === activeArticleId);
      if (activeArt && activeArt.lat && activeArt.lng) {
        const moveLatLon = new (window as any).kakao.maps.LatLng(activeArt.lat, activeArt.lng);
        kakaoMapRef.current.panTo(moveLatLon);
      }
    }
  }, [activeArticleId, articles]);

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: "'Pretendard', sans-serif" }}>
      {/* ===== 슬림 헤더 ===== */}
      <header style={{ display: "flex", alignItems: "center", padding: "12px 20px", borderBottom: "1px solid #ddd", background: "#fff", zIndex: 100, position: "relative", flexShrink: 0 }}>
        <Link href="/" style={{ marginRight: 15, display: "flex", alignItems: "center", textDecoration: "none" }}>
          <img src="/logo.png" alt="공실뉴스" style={{ height: 34 }} onError={(e) => { (e.target as HTMLImageElement).src = "https://via.placeholder.com/100x34?text=LOGO"; }} />
        </Link>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, marginRight: 20, color: "#111" }}>우리동네뉴스</h1>
        <select
          value={section1}
          onChange={(e) => { setSection1(e.target.value); setSection2(""); }}
          style={{ padding: "6px 10px", border: "1px solid #ccc", borderRadius: 4, outline: "none", fontSize: 14, minWidth: 130, fontWeight: 600, cursor: "pointer" }}
        >
          <option value="">1차섹션 전체</option>
          <option value="우리동네부동산">우리동네부동산</option>
          <option value="뉴스/칼럼">뉴스/칼럼</option>
        </select>
        <select
          value={section2}
          onChange={(e) => setSection2(e.target.value)}
          style={{ padding: "6px 10px", border: "1px solid #ccc", borderRadius: 4, outline: "none", fontSize: 14, minWidth: 130, fontWeight: 600, cursor: "pointer", marginLeft: 8 }}
        >
          <option value="">2차섹션 전체</option>
          {section1 === "우리동네부동산" && (
            <>
              <option value="아파트·오피스텔">아파트·오피스텔</option>
              <option value="빌라·주택">빌라·주택</option>
              <option value="원룸·투룸">원룸·투룸</option>
              <option value="상가·업무·공장·토지">상가·업무·공장·토지</option>
              <option value="분양">분양</option>
            </>
          )}
          {section1 === "뉴스/칼럼" && (
            <>
              <option value="부동산·주식·재테크">부동산·주식·재테크</option>
              <option value="정치·경제·사회">정치·경제·사회</option>
              <option value="세무·법률">세무·법률</option>
              <option value="여행·건강·생활">여행·건강·생활</option>
              <option value="IT·가전·가구">IT·가전·가구</option>
              <option value="스포츠·연예·Car">스포츠·연예·Car</option>
              <option value="인물·미션·기타">인물·미션·기타</option>
            </>
          )}
        </select>
      </header>

      {/* ===== 메인 콘텐츠 (3단 레이아웃) ===== */}
      <main style={{ display: "flex", flex: 1, minHeight: 0, position: "relative" }}>
        {/* 좌측 사이드바: 뉴스 리스트 */}
        <aside style={{ width: 380, minWidth: 380, height: "100%", background: "#fff", borderRight: "1px solid #eee", display: "flex", flexDirection: "column", zIndex: 20 }}>
          <h2 style={{ padding: "15px 20px", margin: 0, fontSize: 15, fontWeight: 800, color: "#111", borderBottom: "1px solid #eee", display: "flex", alignItems: "center", flexShrink: 0 }}>
            {section1 || "전체"} 지도기사 {articles.length}개
          </h2>
          <div style={{ flex: 1, overflowY: "auto", padding: 0 }}>
            {loading ? (
              <div style={{ padding: 40, textAlign: "center", color: "#999", fontSize: 14 }}>기사를 불러오는 중...</div>
            ) : articles.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: "#999", fontSize: 14 }}>등록된 기사가 없습니다.</div>
            ) : articles.map((item) => {
              const isActiveAndShowing = activeArticleId === item.id && showDetail;
              return (
                <div
                  key={item.id}
                  onClick={() => handleSelectArticle(item.id)}
                  style={{
                    padding: 16,
                    borderBottom: "1px solid #eee",
                    cursor: "pointer",
                    transition: "background 0.2s",
                    background: activeArticleId === item.id ? "#eaf4ff" : "#fff",
                    borderLeft: activeArticleId === item.id ? "4px solid #508bf5" : "4px solid transparent",
                  }}
                >
                  <div style={{ fontSize: 11, color: "#508bf5", fontWeight: "bold", marginBottom: 4 }}>
                    [{item.section1 || "뉴스"} &gt; {item.section2 || "전체"}] ♥
                  </div>
                  <div style={{ fontSize: 15, fontWeight: "bold", lineHeight: 1.4, wordBreak: "keep-all", marginBottom: 8, color: "#111" }}>{item.title}</div>
                  <div style={{ fontSize: 13, color: "#666", marginBottom: 12, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
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
                      style={{ color: isActiveAndShowing ? "#d32f2f" : "#3b82f6", fontSize: 12, fontWeight: "bold", cursor: "pointer", zIndex: 10 }}
                    >
                      {isActiveAndShowing ? "기사닫기 X" : "기사상세보기 >"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* 지도 + 기사 상세 래퍼 */}
        <div style={{ flex: 1, height: "100%", position: "relative", minWidth: 0, background: "#eee", overflow: "hidden" }}>
          {/* 가상 마커 (말풍선 시뮬레이터) - 지도가 들어갈 구역 위 정중앙 */}
          {activeArticleId && articleDetail && !showDetail && (
            <div style={{
              position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -100%) translateY(-25px)", zIndex: 100, // 마커(핀 중앙)보다 약간 위로 위치시킴
              background: "#fff", padding: "14px 18px", borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
              border: "1px solid #e0e0e0", width: 280, animation: "fadeIn 0.2s ease"
            }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#222", marginBottom: 6, lineHeight: 1.3, wordBreak: "keep-all", display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                {articleDetail.title}
              </h3>
              <p style={{ fontSize: 12, color: "#777", display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden", marginBottom: 10 }}>
                {articleDetail.subtitle || stripHtml(articleDetail.content || "").slice(0, 50)}
              </p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 8, borderTop: "1px solid #f0f0f0" }}>
                <span style={{ fontSize: 11, color: "#999" }}>
                  {formatDate(articleDetail.published_at || articleDetail.created_at)} | {articleDetail.author_name || "공실뉴스"}
                </span>
                <button 
                  onClick={() => setShowDetail(true)}
                  style={{ background: "transparent", color: "#508bf5", border: "none", padding: 0, fontSize: 12, fontWeight: "bold", cursor: "pointer", transition: "color 0.2s" }}
                >
                  기사 보러가기 &gt;
                </button>
              </div>
              {/* 말풍선 꼬리 */}
              <div style={{ position: "absolute", bottom: -8, left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "8px solid transparent", borderRight: "8px solid transparent", borderTop: "8px solid #fff" }}></div>
            </div>
          )}

          {/* 기사 상세 뷰 (플로팅 - 좌 ➔ 우 애니메이션) */}
          {articleDetail && (
            <div style={{ 
              position: "absolute", top: 0, left: 0, width: 750, maxWidth: "100%", height: "100%", 
              borderRight: "1px solid #ddd", boxShadow: "5px 0 30px rgba(0,0,0,0.15)", background: "#fff", 
              zIndex: 2000, overflowY: "auto", 
              transform: showDetail ? "translateX(0)" : "translateX(-100%)",
              opacity: showDetail ? 1 : 0,
              visibility: showDetail ? "visible" : "hidden",
              transition: "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s ease, visibility 0.4s"
            }}>
              <div style={{ maxWidth: 1200, margin: "0 auto", padding: "20px 40px 40px", position: "relative" }}>
                {/* X 닫기 버튼 */}
                <button onClick={() => setShowDetail(false)} style={{ position: "absolute", top: -10, right: 0, background: "none", border: "none", fontSize: 32, color: "#999", cursor: "pointer", padding: 10, lineHeight: 1, zIndex: 10, transition: "color 0.15s" }} title="닫기">✕</button>

                {/* 카테고리 */}
                <div style={{ fontSize: 14, color: "#666", marginBottom: 8, fontWeight: 600 }}>
                  [{articleDetail.section1 || "뉴스"} &gt; {articleDetail.section2 || "전체"}]
                </div>

                {/* 제목 */}
                <h1 style={{ fontSize: 36, fontWeight: 800, color: "#111", lineHeight: 1.3, marginBottom: 16, letterSpacing: -1.5, wordBreak: "keep-all" }}>{articleDetail.title}</h1>

                {/* 메타 정보 바 */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #ddd", paddingBottom: 16, marginBottom: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "#666" }}>
                    <span style={{ color: "#111", fontWeight: "bold" }}>{articleDetail.author_name || "공실뉴스"}</span>
                    <span style={{ display: "inline-block", width: 1, height: 12, background: "#ddd" }}></span>
                    <span>{formatDateFull(articleDetail.published_at || articleDetail.created_at)}</span>
                    <span style={{ display: "inline-block", width: 1, height: 12, background: "#ddd" }}></span>
                    <span>조회수 {articleDetail.view_count || 0}</span>
                  </div>
                  <div style={{ display: "flex", gap: 16, alignItems: "center", color: "#333", fontSize: 20 }}>
                    <Link href={`/news/${articleDetail.article_no || articleDetail.id}`} style={{ fontSize: 13, fontWeight: "bold", color: "#508bf5", border: "1px solid #508bf5", borderRadius: 20, padding: "4px 14px", textDecoration: "none", transition: "all 0.2s" }}>원문보기</Link>
                    <span className="meta-icon" title="스크랩">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"></path></svg>
                    </span>
                    <span className="meta-icon" title="공유">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
                    </span>
                    <span className="meta-icon" title="글자 크기" style={{ fontSize: 14, fontWeight: 700, display: "flex", alignItems: "baseline", gap: 1, letterSpacing: -1 }}>
                      <span style={{ fontSize: 13 }}>가</span><span style={{ fontSize: 17 }}>가</span>
                    </span>
                    <span className="meta-icon" title="인쇄" onClick={() => window.print()}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                    </span>
                  </div>
                </div>

                {/* 본문 */}
                <div style={{ paddingTop: 0, marginTop: 30 }}>
                  {/* 서브타이틀 */}
                  {articleDetail.subtitle && (
                    <div className="article-subtitle-box">{articleDetail.subtitle}</div>
                  )}

                  <div className="article-body">
                    {/* 유튜브 영상 — 본문에 이미 포함된 경우 중복 표시 안 함 */}
                    {youtubeId && !(articleDetail.content && articleDetail.content.includes('youtube.com/embed')) ? (
                      <div className="article-img-wrap">
                        <div style={{
                          position: "relative",
                          width: "100%",
                          paddingBottom: articleDetail.is_shorts ? "177.78%" : "56.25%",
                          maxWidth: articleDetail.is_shorts ? 315 : "100%",
                          margin: "0 auto",
                          height: 0,
                          overflow: "hidden",
                          borderRadius: 8,
                        }}>
                          <iframe
                            src={`https://www.youtube.com/embed/${youtubeId}`}
                            style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none", borderRadius: 8 }}
                            allowFullScreen
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          />
                        </div>
                      </div>
                    ) : !youtubeId && articleDetail.thumbnail_url && !(articleDetail.content && articleDetail.content.includes(articleDetail.thumbnail_url)) ? (
                      <div className="article-img-wrap">
                        <img src={articleDetail.thumbnail_url} alt={articleDetail.title} style={{ width: "100%", maxHeight: 400, objectFit: "cover", borderRadius: 8 }} />
                      </div>
                    ) : null}

                    {/* HTML 본문 렌더링 */}
                    {articleDetail.content && (
                      <div dangerouslySetInnerHTML={{ __html: articleDetail.content }} />
                    )}
                  </div>

                  {/* 키워드 태그 */}
                  {articleDetail.article_keywords && articleDetail.article_keywords.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "24px 0", padding: "16px 0", borderTop: "1px solid #eee" }}>
                      {articleDetail.article_keywords.map((kw: any, i: number) => (
                        <span key={i} style={{ padding: "6px 14px", borderRadius: 20, background: "#fff", color: "#555", fontSize: 13, fontWeight: 500, border: "1px solid #ccc" }}>
                          #{kw.keyword}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* 기자 저작권 */}
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
                          <label style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 4, color: "#555" }}>
                            <input type="checkbox" style={{ accentColor: "#508bf5" }} /> 비밀댓글
                          </label>
                        </div>
                        <button className="comment-submit-btn">등록</button>
                      </div>
                    </div>
                    <div style={{ padding: 20, textAlign: "center", color: "#999", fontSize: 14 }}>첫 댓글을 남겨보세요.</div>
                  </div>
                </div>

                {/* 우측 사이드바 (포털 모드) */}
                <div style={{ position: "absolute", top: 20, right: -340, width: 300 }}>
                  {/* HOT 매물/광고 */}
                  <div style={{ background: "#f9f9f9", padding: 15, border: "1px solid #eee", marginBottom: 20, borderRadius: 8 }}>
                    <div className="sidebar-hot-title">HOT 매물/광고</div>
                    <div className="sidebar-hot-map">공실가이드맵 (지도 이미지)</div>
                    <div className="sidebar-hot-label">강남구 역삼동 신축 빌딩 (수익률 6%)</div>
                  </div>
                  {/* CTA */}
                  <div className="sidebar-cta-btn" style={{ background: "#00b894" }}>공실알림<br /><span>(관심도 1,000개 부동산 가입)</span></div>
                  <div className="sidebar-cta-btn" style={{ background: "#00cec9", marginBottom: 30 }}>신축/분양/권리조회<br /><span>(부동산 전문가에게 의뢰)</span></div>
                  {/* 많이 본 뉴스 */}
                  <h3 style={{ fontSize: 16, fontWeight: 800, borderBottom: "2px solid #111", paddingBottom: 10, marginBottom: 15 }}>많이 본 뉴스</h3>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                    {popularArticles.map((item, i) => (
                      <li key={item.id} style={{ display: "flex", fontSize: 14, marginBottom: 16, lineHeight: 1.4, cursor: "pointer" }}>
                        <span style={{ fontWeight: 900, color: "#508bf5", width: 24, flexShrink: 0, fontSize: 15 }}>{i + 1}</span>
                        <Link href={`/news/${item.article_no || item.id}`} style={{ textDecoration: "none", fontWeight: 600, color: "#555" }}>{item.title}</Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* 기사 상세 뷰 (래퍼 종료) */}
          
          {/* 기사 로딩 상태 표시창 추가 */}
          {activeArticleId && showDetail && !articleDetail && (
            <div style={{ position: "absolute", top: 0, left: 0, width: 750, maxWidth: "100%", height: "100%", background: "#fff", zIndex: 1999, display: "flex", alignItems: "center", justifyContent: "center", color: "#999", fontSize: 16 }}>
              기사를 불러오는 중...
            </div>
          )}

          {/* 지도 영역 플로팅 필터 */}
          <div style={{ display: "flex", position: "absolute", top: 15, left: showDetail ? 770 : 20, zIndex: 10, background: "#fff", padding: "5px 15px", borderRadius: 30, boxShadow: "0 4px 10px rgba(0,0,0,0.1)", border: "1px solid #ddd", alignItems: "center", gap: 10, fontSize: 14, color: "#333", transition: "left 0.3s" }}>
            <span style={{ background: "none", border: "none", cursor: "pointer", fontWeight: "bold", padding: "5px 10px" }}>경기도 ▼</span>
            <div style={{ width: 1, height: 12, background: "#ddd" }}></div>
            <span style={{ background: "none", border: "none", cursor: "pointer", fontWeight: "bold", padding: "5px 10px" }}>고양시 ▼</span>
            <div style={{ width: 1, height: 12, background: "#ddd" }}></div>
            <span style={{ background: "none", border: "none", cursor: "pointer", fontWeight: "bold", padding: "5px 10px" }}>가좌동 ▼</span>
            <div style={{ width: 1, height: 12, background: "#ddd" }}></div>
            <span style={{ background: "none", border: "none", cursor: "pointer", fontWeight: "bold", padding: "5px 10px", color: "#508bf5" }}>검색 🔍</span>
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
        </div>
      </main>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
