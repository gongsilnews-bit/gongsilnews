"use client";

import React, { useState, useEffect, useRef } from "react";
import { getVacanciesByOwnerId } from "@/app/actions/vacancy";
import { getBusinessArticles } from "@/app/actions/businessProfile";

interface SubdomainClientProps {
  initialData: {
    settings: any;
    member: any;
    companyProfile: any;
  };
}

export default function SubdomainClient({ initialData }: SubdomainClientProps) {
  const { settings, member, companyProfile } = initialData;
  const [vacancies, setVacancies] = useState<any[]>([]);
  const [articles, setArticles] = useState<any[]>([]);
  const [loadingListings, setLoadingListings] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);

  // 필터링 상태
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedTradeType, setSelectedTradeType] = useState("");

  // 테마 선택에 따른 브랜드 색상 정의
  const themeColors: Record<string, { primary: string; hover: string; bgLight: string }> = {
    template01: { primary: "#2563eb", hover: "#1d4ed8", bgLight: "#eff6ff" },
    office: { primary: "#1e293b", hover: "#0f172a", bgLight: "#f1f5f9" },
    gold: { primary: "#b45309", hover: "#78350f", bgLight: "#fef3c7" },
    green: { primary: "#059669", hover: "#047857", bgLight: "#ecfdf5" },
    purple: { primary: "#7c3aed", hover: "#6d28d9", bgLight: "#f5f3ff" },
  };

  const themeName = settings.theme_name || "template01";
  const colors = themeColors[themeName] || themeColors.template01;

  // 부동산 매물 또는 비즈니스 글 로드
  useEffect(() => {
    async function loadData() {
      setLoadingListings(true);
      if (member.role === "REALTOR") {
        const res = await getVacanciesByOwnerId(member.id);
        if (res.success && res.data) {
          setVacancies(res.data);
        }
      } else if (member.role === "BIZ") {
        const res = await getBusinessArticles(member.id);
        if (res.success && res.data) {
          setArticles(res.data);
        }
      }
      setLoadingListings(false);
    }
    loadData();
  }, [member]);

  // Kakao 지도 스크립트 로드
  useEffect(() => {
    if ((window as any).kakao?.maps?.LatLng) {
      setMapLoaded(true);
      return;
    }
    const sid = "kakao-map-script";
    if (!document.getElementById(sid)) {
      const s = document.createElement("script");
      s.id = sid;
      s.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_APP_KEY || "435d3602201a49ea712e5f5a36fe6efc"}&libraries=services,clusterer&autoload=false`;
      document.head.appendChild(s);
      s.onload = () => {
        (window as any).kakao.maps.load(() => setMapLoaded(true));
      };
    } else {
      const iv = setInterval(() => {
        if ((window as any).kakao?.maps?.LatLng) {
          clearInterval(iv);
          setMapLoaded(true);
        }
      }, 100);
    }
  }, []);

  // 주소를 활용한 지도 표시
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !companyProfile?.address) return;
    const kakao = (window as any).kakao;
    if (!kakao?.maps?.services) return;

    const geocoder = new kakao.maps.services.Geocoder();
    geocoder.addressSearch(companyProfile.address, (result: any, status: any) => {
      if (status === kakao.maps.services.Status.OK) {
        const coords = new kakao.maps.LatLng(result[0].y, result[0].x);
        const mapOption = {
          center: coords,
          level: 3,
        };
        const map = new kakao.maps.Map(mapRef.current, mapOption);

        const marker = new kakao.maps.Marker({
          position: coords,
          map: map,
        });

        const infowindow = new kakao.maps.InfoWindow({
          content: `<div style="padding:5px 10px;font-size:12px;font-weight:bold;color:#333;text-align:center;">${companyProfile.name || companyProfile.company_name}</div>`,
        });
        infowindow.open(map, marker);

        // 반응형 리사이즈 대응
        map.setCenter(coords);
      }
    });
  }, [mapLoaded, companyProfile]);

  // 필터링 적용된 매물 목록
  const filteredVacancies = vacancies.filter((v) => {
    const matchesCategory = selectedCategory ? v.property_type === selectedCategory : true;
    const matchesTradeType = selectedTradeType ? v.trade_type === selectedTradeType : true;
    return matchesCategory && matchesTradeType;
  });

  // 금액 포맷 함수
  const formatAmount = (amt: number) => {
    if (!amt) return "0";
    const m = Math.round(amt / 10000);
    if (m === 0) return "0";
    const e = Math.floor(m / 10000);
    const r = m % 10000;
    let result = "";
    if (e > 0) result += `${e}억`;
    if (r > 0) {
      const c = Math.floor(r / 1000);
      const rem = r % 1000;
      let rest = "";
      if (c > 0) rest += `${c}천`;
      if (rem > 0) rest += `${rem}`;
      result += (result ? " " : "") + rest + "만";
    }
    return result || "0";
  };

  const getPriceText = (v: any) => {
    if (v.trade_type === "경매") return formatAmount(v.deposit);
    if (v.trade_type === "매매" || v.trade_type === "전세") return formatAmount(v.deposit);
    return `${formatAmount(v.deposit)} / ${formatAmount(v.monthly_rent)}`;
  };

  const getPriceBg = (tradeType: string) => {
    switch (tradeType) {
      case "경매":
        return "#ff8c00";
      case "매매":
        return "#ef4444";
      case "전세":
        return "#3b82f6";
      case "월세":
        return "#10b981";
      default:
        return "#6b7280";
    }
  };

  return (
    <div style={{ background: "#f8fafc", minHeight: "100vh", fontFamily: "'Pretendard', sans-serif" }}>
      {/* ── 마이크로 애니메이션용 전역 CSS ── */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .hover-card {
          transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease;
        }
        .hover-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1) !important;
        }
      `}</style>

      {/* ── 1. GNB 헤더 ── */}
      <header style={{
        background: "#ffffff",
        borderBottom: "1px solid #e2e8f0",
        height: 72,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 40px",
        position: "sticky",
        top: 0,
        zIndex: 1000,
        boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {settings.logo_url ? (
            <img src={settings.logo_url} alt="로고" style={{ height: 36, objectFit: "contain" }} />
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 24 }}>🌐</span>
              <span style={{ fontWeight: 800, fontSize: 18, color: "#1e293b", letterSpacing: "-0.5px" }}>
                {companyProfile?.name || companyProfile?.company_name || member.name}
              </span>
            </div>
          )}
        </div>
        
        <nav style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <a href="#intro" style={{ textDecoration: "none", fontSize: 14, fontWeight: 700, color: "#475569" }}>인사말</a>
          <a href="#listings" style={{ textDecoration: "none", fontSize: 14, fontWeight: 700, color: "#475569" }}>
            {member.role === "REALTOR" ? "보유 공실" : "작성 기사"}
          </a>
          <a href="#location" style={{ textDecoration: "none", fontSize: 14, fontWeight: 700, color: "#475569" }}>오시는길</a>
          {companyProfile?.phone || companyProfile?.contact_number ? (
            <a href={`tel:${(companyProfile.phone || companyProfile.contact_number).replace(/-/g, "")}`} style={{
              textDecoration: "none",
              fontSize: 13,
              fontWeight: 800,
              color: "#ffffff",
              background: colors.primary,
              padding: "10px 18px",
              borderRadius: 8,
              boxShadow: `0 4px 12px ${colors.primary}25`,
              transition: "background 0.2s"
            }}>
              📞 바로 문의하기
            </a>
          ) : null}
        </nav>
      </header>

      {/* ── 2. 히어로 배너 섹션 ── */}
      <section id="intro" className="animate-fade-in" style={{
        background: `linear-gradient(135deg, ${colors.primary}12 0%, #ffffff 100%)`,
        padding: "80px 24px 70px 24px",
        borderBottom: "1px solid #e2e8f0"
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 40 }}>
          <div style={{ flex: 1, minWidth: 320 }}>
            {member.role === "REALTOR" ? (
              <span style={{ fontSize: 12, fontWeight: 800, color: colors.primary, background: colors.bgLight, padding: "6px 14px", borderRadius: 20, textTransform: "uppercase", letterSpacing: "1px" }}>
                Premium Real Estate Partner
              </span>
            ) : (
              <span style={{ fontSize: 12, fontWeight: 800, color: colors.primary, background: colors.bgLight, padding: "6px 14px", borderRadius: 20, textTransform: "uppercase", letterSpacing: "1px" }}>
                Premium Business Affiliate
              </span>
            )}
            
            <h1 style={{ fontSize: 42, fontWeight: 900, color: "#0f172a", margin: "20px 0 16px 0", letterSpacing: "-1.5px", lineHeight: 1.2 }}>
              {settings.site_title || `${companyProfile?.name || companyProfile?.company_name || member.name}에 오신 것을 환영합니다.`}
            </h1>
            
            <p style={{ fontSize: 16, color: "#475569", lineHeight: 1.8, whiteSpace: "pre-wrap", margin: "0 0 32px 0", maxWidth: 650 }}>
              {settings.company_intro || `${companyProfile?.name || companyProfile?.company_name}입니다. 신뢰를 바탕으로 최상의 가치와 만족스러운 결과물을 제공해 드립니다. 편안하게 상담 받아보시기 바랍니다.`}
            </p>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {companyProfile?.phone || companyProfile?.contact_number ? (
                <a href={`tel:${(companyProfile.phone || companyProfile.contact_number).replace(/-/g, "")}`} style={{
                  textDecoration: "none",
                  padding: "14px 28px",
                  background: colors.primary,
                  color: "#ffffff",
                  borderRadius: 10,
                  fontSize: 15,
                  fontWeight: 800,
                  boxShadow: `0 4px 14px ${colors.primary}33`,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8
                }}>
                  전화 상담 연결
                </a>
              ) : null}
              <a href="#listings" style={{
                textDecoration: "none",
                padding: "14px 28px",
                background: "#ffffff",
                color: "#1e293b",
                border: "1px solid #cbd5e1",
                borderRadius: 10,
                fontSize: 15,
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
                gap: 8
              }}>
                {member.role === "REALTOR" ? "보유 공실 광고 둘러보기" : "작성한 부동산 정보 보기"}
              </a>
            </div>
          </div>

          <div style={{
            width: 320,
            height: 320,
            borderRadius: 24,
            background: "#ffffff",
            boxShadow: "0 20px 25px -5px rgba(0,0,0,0.05), 0 8px 10px -6px rgba(0,0,0,0.05)",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "1px solid #f1f5f9"
          }}>
            {member.profile_image_url || companyProfile?.logo_url ? (
              <img src={member.profile_image_url || companyProfile?.logo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{ textAlign: "center" }}>
                <span style={{ fontSize: 72 }}>🏠</span>
                <div style={{ marginTop: 12, fontWeight: 700, color: "#64748b" }}>Premium Member</div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── 3. 컨텐츠 목록 섹션 (부동산 매물 or 비즈니스 글) ── */}
      <section id="listings" style={{ padding: "80px 24px", maxWidth: 1100, margin: "0 auto" }}>
        {member.role === "REALTOR" ? (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 40, borderBottom: "2px solid #e2e8f0", paddingBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", margin: 0 }}>📋 보유 공실 광고</h2>
                <p style={{ fontSize: 14, color: "#64748b", marginTop: 6, marginBottom: 0 }}>현재 당 업소에서 보유 중인 고품격 실매물 목록입니다.</p>
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, color: colors.primary }}>
                총 <strong style={{ fontSize: 18 }}>{filteredVacancies.length}</strong>건 등록됨
              </span>
            </div>

            {/* 필터 툴바 */}
            <div style={{ display: "flex", gap: 12, marginBottom: 28, flexWrap: "wrap" }}>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                style={{ padding: "10px 16px", borderRadius: 8, border: "1px solid #cbd5e1", outline: "none", fontSize: 14, fontWeight: 600, color: "#334155" }}
              >
                <option value="">전체 물건타입</option>
                <option value="아파트·오피스텔">아파트·오피스텔</option>
                <option value="빌라·주택">빌라·주택</option>
                <option value="원룸·투룸(풀옵션)">원룸·투룸(풀옵션)</option>
                <option value="상가·사무실·건물·공장·토지">상가·사무실</option>
              </select>

              <select
                value={selectedTradeType}
                onChange={(e) => setSelectedTradeType(e.target.value)}
                style={{ padding: "10px 16px", borderRadius: 8, border: "1px solid #cbd5e1", outline: "none", fontSize: 14, fontWeight: 600, color: "#334155" }}
              >
                <option value="">전체 거래구분</option>
                <option value="매매">매매</option>
                <option value="전세">전세</option>
                <option value="월세">월세</option>
              </select>
            </div>

            {loadingListings ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: "#64748b" }}>데이터를 로딩하고 있습니다...</div>
            ) : filteredVacancies.length === 0 ? (
              <div style={{ textAlign: "center", padding: "80px 0", background: "#ffffff", borderRadius: 16, border: "1px dashed #cbd5e1", color: "#64748b" }}>
                <span style={{ fontSize: 48, display: "block", marginBottom: 12 }}>🏠</span>
                등록된 실매물이 없습니다.
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 24 }}>
                {filteredVacancies.map((v) => {
                  const coverPhoto = v.vacancy_photos?.[0]?.url;
                  return (
                    <a key={v.id} href={`/homepage/${v.id}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
                      <div className="hover-card" style={{
                        background: "#ffffff",
                        borderRadius: 16,
                        overflow: "hidden",
                        border: "1px solid #e2e8f0",
                        boxShadow: "0 4px 6px -1px rgba(0,0,0,0.02), 0 2px 4px -2px rgba(0,0,0,0.02)",
                        display: "flex",
                        flexDirection: "column",
                        height: "100%"
                      }}>
                        <div style={{ height: 200, background: "#f1f5f9", position: "relative" }}>
                          {coverPhoto ? (
                            <img src={coverPhoto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          ) : (
                            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "#94a3b8" }}>No Image</div>
                          )}
                          <span style={{
                            position: "absolute",
                            top: 12,
                            left: 12,
                            background: getPriceBg(v.trade_type),
                            color: "#ffffff",
                            fontSize: 12,
                            fontWeight: 800,
                            padding: "4px 10px",
                            borderRadius: 4
                          }}>
                            {v.trade_type}
                          </span>
                        </div>

                        <div style={{ padding: 20, flex: 1, display: "flex", flexDirection: "column" }}>
                          <div style={{ fontSize: 13, color: colors.primary, fontWeight: 700, marginBottom: 6 }}>{v.property_type}</div>
                          <h3 style={{ fontSize: 18, fontWeight: 800, color: "#1e293b", margin: "0 0 8px 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {v.building_name || `${v.sigungu} ${v.dong} 공실광고`}
                          </h3>
                          <div style={{ fontSize: 20, fontWeight: 900, color: colors.primary, marginBottom: 12 }}>
                            {getPriceText(v)}
                          </div>
                          <div style={{ fontSize: 13, color: "#64748b", borderTop: "1px solid #f1f5f9", paddingTop: 12, marginTop: "auto", display: "flex", gap: 10 }}>
                            <span>면적 {v.exclusive_py ? `${v.exclusive_py}평` : `${v.exclusive_m2}㎡`}</span>
                            <span>·</span>
                            <span>방 {v.room_count || 0} / 욕실 {v.bath_count || 0}</span>
                          </div>
                        </div>
                      </div>
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 40, borderBottom: "2px solid #e2e8f0", paddingBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", margin: 0 }}>📰 작성한 부동산 뉴스 & 지식</h2>
                <p style={{ fontSize: 14, color: "#64748b", marginTop: 6, marginBottom: 0 }}>직접 기고하고 분석한 전문 지식 콘텐츠 목록입니다.</p>
              </div>
            </div>

            {loadingListings ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: "#64748b" }}>데이터를 로딩하고 있습니다...</div>
            ) : articles.length === 0 ? (
              <div style={{ textAlign: "center", padding: "80px 0", background: "#ffffff", borderRadius: 16, border: "1px dashed #cbd5e1", color: "#64748b" }}>
                <span style={{ fontSize: 48, display: "block", marginBottom: 12 }}>📝</span>
                등록된 기사글이 없습니다.
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 24 }}>
                {articles.map((art) => (
                  <a key={art.id} href={`/news/${art.id}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
                    <div className="hover-card" style={{
                      background: "#ffffff",
                      borderRadius: 16,
                      overflow: "hidden",
                      border: "1px solid #e2e8f0",
                      boxShadow: "0 4px 6px -1px rgba(0,0,0,0.02), 0 2px 4px -2px rgba(0,0,0,0.02)",
                      display: "flex",
                      flexDirection: "column",
                      height: "100%"
                    }}>
                      <div style={{ height: 180, background: "#f1f5f9" }}>
                        {art.thumbnail_url ? (
                          <img src={art.thumbnail_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "#94a3b8" }}>No Image</div>
                        )}
                      </div>

                      <div style={{ padding: 20, flex: 1, display: "flex", flexDirection: "column" }}>
                        <div style={{ fontSize: 11, color: colors.primary, fontWeight: 700, marginBottom: 6, textTransform: "uppercase" }}>{art.category || "뉴스"}</div>
                        <h3 style={{ fontSize: 16, fontWeight: 800, color: "#1e293b", margin: "0 0 8px 0", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", height: 44 }}>
                          {art.title}
                        </h3>
                        <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 16px 0", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", height: 36, lineHeight: 1.4 }}>
                          {art.summary}
                        </p>
                        <div style={{ fontSize: 12, color: "#94a3b8", borderTop: "1px solid #f1f5f9", paddingTop: 12, marginTop: "auto", display: "flex", justifyContent: "space-between" }}>
                          <span>{art.created_at ? new Date(art.created_at).toLocaleDateString() : ""}</span>
                          <span>조회 {art.views || 0}</span>
                        </div>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── 4. 오시는길 및 상세정보 섹션 ── */}
      <section id="location" style={{ background: "#ffffff", borderTop: "1px solid #e2e8f0", padding: "80px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", marginBottom: 40, borderBottom: "2px solid #e2e8f0", paddingBottom: 16 }}>
            📍 오시는 길 & 상세 정보
          </h2>
          
          <div style={{ display: "flex", gap: 40, flexWrap: "wrap" }}>
            {/* 회사 정보 테이블 */}
            <div style={{ flex: 1, minWidth: 320 }}>
              <div style={{ background: "#f8fafc", borderRadius: 16, padding: 32, border: "1px solid #e2e8f0", height: "100%", boxSizing: "border-box" }}>
                <h3 style={{ fontSize: 20, fontWeight: 800, color: "#1e293b", marginBottom: 20 }}>
                  {companyProfile?.name || companyProfile?.company_name || member.name}
                </h3>
                
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                  <tbody>
                    <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                      <td style={{ padding: "14px 0", fontWeight: 700, color: "#64748b", width: 120 }}>대표자</td>
                      <td style={{ padding: "14px 0", color: "#1e293b" }}>{companyProfile?.ceo_name || member.name}</td>
                    </tr>
                    {companyProfile?.reg_num || companyProfile?.biz_num ? (
                      <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                        <td style={{ padding: "14px 0", fontWeight: 700, color: "#64748b" }}>
                          {member.role === "REALTOR" ? "등록번호" : "사업자번호"}
                        </td>
                        <td style={{ padding: "14px 0", color: "#1e293b" }}>{companyProfile.reg_num || companyProfile.biz_num}</td>
                      </tr>
                    ) : null}
                    <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                      <td style={{ padding: "14px 0", fontWeight: 700, color: "#64748b" }}>주소</td>
                      <td style={{ padding: "14px 0", color: "#1e293b" }}>
                        {companyProfile?.address} {companyProfile?.address_detail}
                      </td>
                    </tr>
                    {companyProfile?.phone || companyProfile?.contact_number ? (
                      <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                        <td style={{ padding: "14px 0", fontWeight: 700, color: "#64748b" }}>연락처</td>
                        <td style={{ padding: "14px 0", color: "#1e293b", fontWeight: 700 }}>
                          {companyProfile.phone || companyProfile.contact_number}
                        </td>
                      </tr>
                    ) : null}
                    {settings.business_hours || companyProfile?.business_hours ? (
                      <tr>
                        <td style={{ padding: "14px 0", fontWeight: 700, color: "#64748b" }}>영업시간</td>
                        <td style={{ padding: "14px 0", color: "#1e293b" }}>
                          {settings.business_hours || companyProfile.business_hours}
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Kakao 지도 박스 */}
            {companyProfile?.address ? (
              <div style={{ flex: 1.2, minWidth: 320, display: "flex", flexDirection: "column", gap: 12 }}>
                <div ref={mapRef} style={{
                  width: "100%",
                  height: 380,
                  borderRadius: 16,
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 4px 6px -1px rgba(0,0,0,0.02)",
                  background: "#f1f5f9"
                }} />
                
                {/* SNS 연동 칩들 */}
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
                  {settings.sns_blog && (
                    <a href={settings.sns_blog} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", fontSize: 13, fontWeight: 700, color: "#03c75a", border: "1px solid #03c75a", padding: "6px 14px", borderRadius: 20 }}>
                      🍀 Naver Blog
                    </a>
                  )}
                  {settings.sns_instagram && (
                    <a href={settings.sns_instagram} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", fontSize: 13, fontWeight: 700, color: "#e1306c", border: "1px solid #e1306c", padding: "6px 14px", borderRadius: 20 }}>
                      📸 Instagram
                    </a>
                  )}
                  {settings.sns_youtube && (
                    <a href={settings.sns_youtube} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", fontSize: 13, fontWeight: 700, color: "#ff0000", border: "1px solid #ff0000", padding: "6px 14px", borderRadius: 20 }}>
                      🎥 YouTube
                    </a>
                  )}
                  {settings.sns_kakao && (
                    <a href={settings.sns_kakao} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", fontSize: 13, fontWeight: 700, color: "#fef01b", background: "#3e2723", padding: "6px 14px", borderRadius: 20 }}>
                      💬 KakaoTalk 채널
                    </a>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {/* ── 5. 푸터 ── */}
      <footer style={{ background: "#0f172a", padding: "40px 24px", color: "#94a3b8", textAlign: "center" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <p style={{ fontSize: 14, margin: "0 0 10px 0", color: "#cbd5e1", fontWeight: 700 }}>
            {companyProfile?.name || companyProfile?.company_name || member.name}
          </p>
          <p style={{ fontSize: 12, margin: 0, lineHeight: 1.6 }}>
            {companyProfile?.address} {companyProfile?.address_detail} | 대표 {companyProfile?.ceo_name || member.name}<br />
            © {new Date().getFullYear()} {companyProfile?.name || companyProfile?.company_name || member.name} · Powered by <a href="https://gongsilnews.com" style={{ color: "#ffffff", textDecoration: "none", fontWeight: 700 }}>공실뉴스</a>
          </p>
        </div>
      </footer>
    </div>
  );
}
