"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { getVacancies } from "@/app/actions/vacancy";

const BRAND = "#2845B3";
const LABEL: React.CSSProperties = { width: 120, fontSize: 13, fontWeight: 700, color: "#555", padding: "10px 14px", background: "#f8f9fa", borderRight: "1px solid #e5e7eb", whiteSpace: "nowrap" };
const VAL: React.CSSProperties = { flex: 1, fontSize: 13, color: "#111", padding: "10px 14px" };
const ROW: React.CSSProperties = { display: "flex", borderBottom: "1px solid #e5e7eb" };

export default function HomepageViewPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [vacancy, setVacancy] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [photoIdx, setPhotoIdx] = useState(0);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [otherListings, setOtherListings] = useState<any[]>([]);
  const mapRef = useRef<HTMLDivElement>(null);
  const roadviewRef = useRef<HTMLDivElement>(null);
  const infoRef = useRef<HTMLDivElement>(null);
  const locationRef = useRef<HTMLDivElement>(null);
  const envRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState('info');

  const scrollToRef = (ref: React.RefObject<HTMLDivElement | null>, tabItem: string) => {
    setActiveTab(tabItem);
    if (ref.current) {
      const y = ref.current.getBoundingClientRect().top + window.scrollY - 130;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  const TRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div style={{ display: "flex", borderBottom: "1px solid #eee" }}>
      <div style={{ width: 140, background: "#f9f9f9", padding: "16px", fontSize: 14, fontWeight: "bold", color: "#555", display: "flex", alignItems: "center" }}>{label}</div>
      <div style={{ flex: 1, padding: "16px", fontSize: 14, color: "#111", display: "flex", alignItems: "center", lineHeight: 1.5 }}>{value}</div>
    </div>
  );

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await getVacancies({ all: true });
      if (res.success && res.data) {
        const all = res.data.map((v: any) => ({
          ...v,
          photos: v.vacancy_photos ? [...v.vacancy_photos].sort((a: any, b: any) => a.sort_order - b.sort_order).map((p: any) => p.url) : [],
        }));
        const found = all.find((v: any) => String(v.id) === id);
        setVacancy(found || null);
        if (found) {
          const others = all.filter((v: any) => v.status === "ACTIVE" && String(v.id) !== id && v.sido === found.sido).slice(0, 5);
          setOtherListings(others);
        }
      }
      setLoading(false);
    }
    load();
  }, [id]);

  // Kakao Map
  useEffect(() => {
    if ((window as any).kakao?.maps?.LatLng) { setMapLoaded(true); return; }
    const sid = "kakao-map-script";
    if (!document.getElementById(sid)) {
      const s = document.createElement("script");
      s.id = sid;
      s.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_APP_KEY || "435d3602201a49ea712e5f5a36fe6efc"}&libraries=services,clusterer&autoload=false`;
      document.head.appendChild(s);
      s.onload = () => { (window as any).kakao.maps.load(() => setMapLoaded(true)); };
    } else {
      const iv = setInterval(() => { if ((window as any).kakao?.maps?.LatLng) { clearInterval(iv); setMapLoaded(true); } }, 100);
    }
  }, []);

  useEffect(() => {
    if (!mapLoaded || !vacancy?.lat || !vacancy?.lng || !mapRef.current) return;
    const kakao = (window as any).kakao;
    const pos = new kakao.maps.LatLng(vacancy.lat, vacancy.lng);
    const map = new kakao.maps.Map(mapRef.current, { center: pos, level: 3 });
    new kakao.maps.Marker({ position: pos, map });

    if (roadviewRef.current) {
      const roadview = new kakao.maps.Roadview(roadviewRef.current);
      const roadviewClient = new kakao.maps.RoadviewClient();
      roadviewClient.getNearestPanoId(pos, 50, (panoId: number | null) => {
        if (panoId) {
          roadview.setPanoId(panoId, pos);
        } else {
          // If no roadview available, hide it
          roadviewRef.current!.style.display = "none";
        }
      });
    }
  }, [mapLoaded, vacancy]);

  const formatAmount = (amt: number) => {
    if (!amt) return "0";
    const m = Math.round(amt / 10000);
    if (m >= 10000) { const e = Math.floor(m / 10000); const r = m % 10000; return `${e}억${r ? ` ${r.toLocaleString()}` : ""}`; }
    return `${m.toLocaleString()}`;
  };

  const getPriceLabel = (v: any) => v?.trade_type === "매매" ? "매매" : v?.trade_type === "전세" ? "전세" : "월세";
  const getPriceBg = (v: any) => v?.trade_type === "매매" ? "#e53e3e" : v?.trade_type === "전세" ? "#2b6cb0" : "#2f855a";
  const getPriceText = (v: any) => {
    if (!v) return "";
    if (v.trade_type === "매매" || v.trade_type === "전세") return `${formatAmount(v.deposit)}`;
    return `${formatAmount(v.deposit)} / ${v.monthly_rent ? Math.round(v.monthly_rent / 10000).toLocaleString() : "0"}`;
  };

  if (loading) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#fff" }}>
        <span style={{ display: "inline-block", width: 32, height: 32, border: "3px solid #ddd", borderTop: `3px solid ${BRAND}`, borderRadius: "50%", animation: "spin 1s linear infinite", marginRight: 12 }}></span>
        <span style={{ color: "#888", fontSize: 15 }}>매물 상세정보를 불러오고 있습니다...</span>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!vacancy) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#fff" }}>
        <span style={{ fontSize: 48, marginBottom: 16 }}>🏠</span>
        <p style={{ fontSize: 16, color: "#888" }}>해당 매물을 찾을 수 없습니다.</p>
        <button onClick={() => router.push("/homepage")} style={{ marginTop: 16, padding: "10px 24px", background: BRAND, color: "#fff", borderRadius: 6, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>목록으로 돌아가기</button>
      </div>
    );
  }

  const photos = vacancy.photos || [];

  return (
    <div style={{ background: "#fff", minHeight: "100vh" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 16px" }}>

        {/* Breadcrumb */}
        <div style={{ fontSize: 13, color: "#888", marginBottom: 16 }}>
          <span style={{ cursor: "pointer", color: BRAND, fontWeight: 600 }} onClick={() => router.push("/homepage")}>매물목록</span>
          <span style={{ margin: "0 8px" }}>›</span>
          <span>{vacancy.building_name || vacancy.dong || "매물 상세"}</span>
        </div>

        {/* ── Main Content ── */}
        <div style={{ display: "flex", gap: 24 }}>

          {/* Left Column */}
          <div style={{ flex: 1, minWidth: 0, background: "#fff", padding: "0 24px", borderRadius: 8, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>

            {/* Title + Price */}
            <div style={{ padding: "30px 0 20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                   <span style={{ fontSize: 11, fontWeight: "bold", color: "#e53e3e", border: "1px solid #fed7d7", padding: "4px 8px", background: "#fff5f5", borderRadius: 4 }}>법정수수료</span>
                   <span style={{ fontSize: 13, color: "#888" }}>등록 {vacancy.created_at ? new Date(vacancy.created_at).toLocaleDateString("ko-KR") : ""}</span>
                </div>
                <div style={{ display: "flex", gap: 12 }}>
                   <span style={{ fontSize: 13, color: "#ea580c", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>🚨 허위매물신고</span>
                   <span style={{ fontSize: 13, color: "#555", cursor: "pointer" }}>인쇄</span>
                </div>
              </div>
              <div style={{ fontSize: 15, color: "#555", marginBottom: 6, fontWeight: 600 }}>{vacancy.dong} {vacancy.building_name || "단독/다가구"}</div>
              <div style={{ fontSize: 32, fontWeight: 900, color: "#1a73e8", marginBottom: 12, letterSpacing: "-1px" }}>
                {vacancy.trade_type} {getPriceText(vacancy)}
              </div>
              <div style={{ fontSize: 14, color: "#666", marginBottom: 8 }}>
                아파트 · 오피스텔 · 방/욕실수 {vacancy.rooms || 0}/{vacancy.bathrooms || 0} · 공급/전용 {Math.round((vacancy.area_m2 || 0)*1.3)}m²/{vacancy.area_m2 || 0}m²
              </div>
              <div style={{ fontSize: 14, color: "#888", display: "flex", gap: 16 }}>
                <span>총 <strong style={{ color: "#333" }}>{vacancy.photos?.length || 0}</strong>개</span>
                <span>주차 {vacancy.parking_spots || "불가"}</span>
                <span>에어컨, 렌지, 세탁기 등</span>
              </div>
            </div>

            {/* Tabs (Visual) */}
            <div style={{ display: "flex", marginBottom: 30, alignItems: "stretch", position: "sticky", top: 60, zIndex: 50 }}>
              <div onClick={() => scrollToRef(infoRef, 'info')} style={{ flex: 1, textAlign: "center", padding: "16px 0", fontWeight: "bold", fontSize: 16, color: activeTab === 'info' ? "#111" : "#888", background: activeTab === 'info' ? "#fff" : "#f8fafc", borderTop: activeTab === 'info' ? "2px solid #111" : "1px solid #e5e7eb", borderLeft: "1px solid #e5e7eb", borderRight: "1px solid #e5e7eb", borderBottom: activeTab === 'info' ? "1px solid #fff" : "1px solid #e5e7eb", cursor: "pointer", zIndex: activeTab === 'info' ? 1 : 0, marginTop: activeTab === 'info' ? 0 : 1 }}>매물정보</div>
              <div onClick={() => scrollToRef(locationRef, 'location')} style={{ flex: 1, textAlign: "center", padding: "16px 0", fontWeight: "bold", fontSize: 16, color: activeTab === 'location' ? "#111" : "#888", background: activeTab === 'location' ? "#fff" : "#f8fafc", borderTop: activeTab === 'location' ? "2px solid #111" : "1px solid #e5e7eb", borderLeft: activeTab === 'location' ? "1px solid #e5e7eb" : "none", borderRight: activeTab === 'location' ? "1px solid #e5e7eb" : "none", borderBottom: activeTab === 'location' ? "1px solid #fff" : "1px solid #e5e7eb", cursor: "pointer", zIndex: activeTab === 'location' ? 1 : 0, marginTop: activeTab === 'location' ? 0 : 1 }}>위치</div>
              <div onClick={() => scrollToRef(envRef, 'env')} style={{ flex: 1, textAlign: "center", padding: "16px 0", fontWeight: "bold", fontSize: 16, color: activeTab === 'env' ? "#111" : "#888", background: activeTab === 'env' ? "#fff" : "#f8fafc", borderTop: activeTab === 'env' ? "2px solid #111" : "1px solid #e5e7eb", borderLeft: activeTab === 'env' ? "1px solid #e5e7eb" : "none", borderRight: "1px solid #e5e7eb", borderBottom: activeTab === 'env' ? "1px solid #fff" : "1px solid #e5e7eb", cursor: "pointer", zIndex: activeTab === 'env' ? 1 : 0, marginTop: activeTab === 'env' ? 0 : 1 }}>주변환경</div>
            </div>

            {/* 사진 표시 (리스트 상단에 사진이 있으면 출력) */}
            {photos.length > 0 && (
              <div style={{ marginBottom: 30 }}>
                <img src={photos[0]} alt="메인사진" style={{ width: "100%", height: 400, objectFit: "cover", borderRadius: 8 }} />
              </div>
            )}

            {/* ── 매물정보 Table ── */}
            <div ref={infoRef} style={{ background: "#fff", marginBottom: 50, scrollMarginTop: 130 }}>
              <TRow label="매물번호" value={String(vacancy.id).split('-')[0].toUpperCase()} />
              <TRow label="소재지" value={`${vacancy.sido} ${vacancy.sigungu} ${vacancy.dong} ${vacancy.detail_addr || ""}`} />
              <TRow label="매물특징" value={vacancy.building_name || "특징 없음"} />
              <TRow label="공급/전용면적" value={`${Math.round((vacancy.area_m2 || 0) * 1.3)}m² / ${vacancy.area_m2 || 0}m²`} />
              <TRow label="해당층/총층" value={`${vacancy.floor || "해당층"} / ${vacancy.total_floors || "전체층"}`} />
              <TRow label="방/욕실수" value={`${vacancy.rooms || 0}개 / ${vacancy.bathrooms || 0}개`} />
              <TRow label="방향" value={vacancy.direction || "방향정보 없음"} />
              <TRow label="주차가능 여부" value={vacancy.parking_spots ? `${vacancy.parking_spots}대` : "불가"} />
              <TRow label="입주가능일" value={vacancy.move_in_date || "즉시입주"} />
              <TRow label="관리비" value={vacancy.maintenance_fee ? `${Math.round(vacancy.maintenance_fee/10000)}만원` : "없음"} />
              <TRow label="상세설명" value={vacancy.description || "상세내용 없음"} />
            </div>

            {/* ── 옵션 ── */}
            {vacancy.options && vacancy.options.length > 0 && (
              <div style={{ marginBottom: 50 }}>
                <h3 style={{ fontSize: 18, fontWeight: "bold", color: "#111", marginBottom: 16 }}>옵션</h3>
                <div style={{ display: "flex", gap: 30, flexWrap: "wrap", padding: "20px 0" }}>
                  {vacancy.options.map((opt: string) => (
                    <div key={opt} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                       <div style={{ width: 60, height: 60, borderRadius: "50%", background: "#f8f9fa", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, border: "1px solid #eee" }}>✓</div>
                       <span style={{ fontSize: 14, color: "#444", fontWeight: 600 }}>{opt}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── 위치정보 및 로드뷰 ── */}
            {vacancy.lat && vacancy.lng && (
              <div ref={locationRef} style={{ marginBottom: 50, scrollMarginTop: 130 }}>
                <h3 style={{ fontSize: 18, fontWeight: "bold", color: "#111", marginBottom: 16 }}>위치정보</h3>
                <div ref={mapRef} style={{ width: "100%", height: 350, border: "1px solid #ddd", marginBottom: 40 }}></div>
                
                <h3 style={{ fontSize: 18, fontWeight: "bold", color: "#111", marginBottom: 16 }}>로드뷰</h3>
                <div ref={roadviewRef} style={{ width: "100%", height: 350, border: "1px solid #ddd" }}></div>
              </div>
            )}

            {/* ── 주변환경 ── */}
            {vacancy.infrastructure && Object.keys(vacancy.infrastructure).length > 0 && (
              <div ref={envRef} style={{ marginBottom: 50, scrollMarginTop: 130 }}>
                <h3 style={{ fontSize: 18, fontWeight: "bold", color: "#111", marginBottom: 16 }}>주변환경</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 16, borderTop: "2px solid #111", paddingTop: 20 }}>
                  {Object.entries(vacancy.infrastructure).map(([label, tags]) => {
                    const tagList = Array.isArray(tags) ? tags : [];
                    if (tagList.length === 0) return null;
                    return (
                      <div key={label} style={{ display: "flex", alignItems: "center" }}>
                        <div style={{ width: 120, fontSize: 15, fontWeight: "bold", color: "#666" }}>{label}</div>
                        <div style={{ flex: 1, display: "flex", gap: 10, flexWrap: "wrap" }}>
                          {tagList.map((tag: any) => (
                            <span key={tag} style={{ background: "#f1f5f9", color: "#475569", fontSize: 13, padding: "6px 16px", borderRadius: 20, fontWeight: 600 }}>{String(tag)}</span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── 댓글상담 ── */}
            <div style={{ background: "#f8f9fa", padding: 30, borderRadius: 12, border: "1px solid #e5e7eb", marginBottom: 40 }}>
              <div style={{ fontSize: 16, fontWeight: "bold", marginBottom: 16 }}>
                댓글상담 <span style={{ color: "#1a73e8" }}>1</span>개
              </div>
              <div style={{ background: "#fff", border: "1px solid #d1d5db", borderRadius: 6, overflow: "hidden", marginBottom: 30 }}>
                <textarea placeholder="로그인 후 이용하실 수 있습니다." style={{ width: "100%", height: 100, border: "none", padding: "16px", outline: "none", resize: "none", fontSize: 15 }} disabled></textarea>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", background: "#f8fafc", borderTop: "1px solid #e2e8f0" }}>
                  <label style={{ fontSize: 14, color: "#475569", display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}><input type="checkbox" style={{ zoom: 1.2 }} /> 비밀글</label>
                  <button style={{ background: "#cbd5e1", color: "#fff", border: "none", padding: "8px 24px", borderRadius: 4, cursor: "pointer", fontWeight: "bold", fontSize: 14 }}>등록</button>
                </div>
              </div>

              {/* Mock comment */}
              <div style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: 20, marginBottom: 20 }}>
                <div style={{ fontSize: 14, fontWeight: "bold", color: "#1e293b", marginBottom: 8 }}>공실뉴스 <span style={{ color: "#94a3b8", fontWeight: "normal", fontSize: 12, marginLeft: 10 }}>2026. 04. 14. 오전 10:17</span></div>
                <div style={{ fontSize: 15, color: "#334155", lineHeight: 1.5 }}>해당 매물 관심있습니다. 연락바랍니다.</div>
              </div>
            </div>

          </div>

          {/* ── Right Sidebar ── */}
          <div style={{ width: 340, flexShrink: 0 }}>
            <div style={{ position: "sticky", top: 80 }}>

              {/* 중개사무소 정보 */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #111", paddingBottom: 12, marginBottom: 16 }}>
                  <div style={{ fontWeight: 700, fontSize: 20, color: "#111" }}>중개사무소</div>
                  <div style={{ display: "flex", gap: 6, fontSize: 13, fontWeight: 600 }}>
                    <span style={{ border: "1px solid #1a365d", background: "#1a365d", color: "#fff", padding: "4px 8px", cursor: "pointer", borderRadius: 2 }}>오시는길</span>
                  </div>
                </div>
                
                <div style={{ padding: "0 4px" }}>
                  <div style={{ fontSize: 21, fontWeight: 800, color: "#111", marginBottom: 14 }}>
                    청실두꺼비공인중개사사무소
                  </div>
                  
                  <div style={{ fontSize: 16, color: "#555", lineHeight: 1.6, marginBottom: 18 }}>
                    대표 김민경<br/>
                    등록번호 11680-2017-00179<br/>
                    서울특별시 강남구 남부순환로 2917 133호<br/>
                    (대치동 626,청실상가)
                  </div>
                  
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 18, fontWeight: 800, color: "#111", marginBottom: 22 }}>
                    <span style={{ fontSize: 18 }}>📞</span>
                    02-564-7500 / 010-8456-2730
                  </div>
                  
                  <div style={{ fontSize: 15, color: "#555", display: "flex", alignItems: "center", gap: 10, marginBottom: 22 }}>
                    <span style={{ color: "#6b7280", fontWeight: 500 }}>매매 <span style={{ color: "#374151" }}>10</span></span>
                    <span style={{ color: "#e5e7eb" }}>|</span> 
                    <span style={{ color: "#6b7280", fontWeight: 500 }}>전세 <span style={{ color: "#374151" }}>3</span></span>
                    <span style={{ color: "#e5e7eb" }}>|</span> 
                    <span style={{ color: "#6b7280", fontWeight: 500 }}>월세 <span style={{ color: "#374151" }}>9</span></span>
                    <span style={{ color: "#e5e7eb" }}>|</span> 
                    <span style={{ color: "#6b7280", fontWeight: 500 }}>단기 <span style={{ color: "#374151" }}>0</span></span>
                  </div>
                  
                  <button onClick={() => { if (vacancy?.client_phone) window.location.href = `tel:${vacancy.client_phone}`; }} style={{ width: "100%", padding: "14px 0", background: "#f8fafc", color: "#111", borderRadius: 8, fontSize: 16, fontWeight: 700, cursor: "pointer", border: "1px solid #e2e8f0", transition: "0.2s" }} onMouseEnter={e => e.currentTarget.style.background = "#f1f5f9"} onMouseLeave={e => e.currentTarget.style.background = "#f8fafc"}>
                    공실내놔요
                  </button>
                </div>
              </div>

              {/* ── 추천 공실 ── */}
              <div style={{ background: "#fff", marginBottom: 40 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #111", paddingBottom: 10, marginBottom: 16 }}>
                  <h3 style={{ fontSize: 17, fontWeight: "bold", color: "#111", margin: 0 }}>추천 공실</h3>
                  <span style={{ fontSize: 12, color: "#888", cursor: "pointer" }}>더보기 {'>'}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {[
                    { id: 1, title: "관악드림타운 132동 8층호", price: "매매 11억 5000", details: "면적 82.01m²(25.1평) / 59.83m²(18.1평)\n방 3개, 욕실 1개", badge: "공동중개" },
                    { id: 2, title: "동부센트레빌 101동 101호", price: "매매 10억", details: "면적 84m²(25.4평) / 59m²(17.8평)\n방 3개, 욕실 1개", badge: "공동중개" }
                  ].map(item => (
                    <div key={item.id} style={{ display: "flex", gap: 16, cursor: "pointer", borderBottom: "1px solid #f1f5f9", paddingBottom: 16 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 15, fontWeight: "bold", color: "#111", marginBottom: 4 }}>{item.title}</div>
                        <div style={{ fontSize: 17, fontWeight: "bold", color: "#2563eb", marginBottom: 6 }}>{item.price}</div>
                        <div style={{ fontSize: 13, color: "#666", whiteSpace: "pre-wrap", lineHeight: 1.4, marginBottom: 6 }}>{item.details}</div>
                        <span style={{ fontSize: 11, color: "#ea580c", border: "1px solid #fed7aa", padding: "2px 6px", borderRadius: 2, fontWeight: 600 }}>{item.badge}</span>
                      </div>
                      <div style={{ width: 70, height: 70, background: "#f1f5f9", borderRadius: 4, flexShrink: 0 }}></div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── 많이 본 뉴스 ── */}
              <div style={{ background: "#fff", marginBottom: 40 }}>
                <h3 style={{ fontSize: 17, fontWeight: "bold", color: "#111", borderBottom: "1px solid #111", paddingBottom: 10, margin: "0 0 16px 0" }}>많이 본 뉴스</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {[
                    "“너도 에어비앤비 해볼까?”… 오피스텔·학세권 달러 겟 약올랐던 '신세자' 될 수도",
                    "관악구 대단지 관악드림타운 네이버 전세 매물 0건?",
                    "서울 아파트 공시가 18.7% 급등… '한강벨트' 보유세 50% 이상 오를 듯"
                  ].map((news, idx) => (
                    <div key={idx} style={{ display: "flex", gap: 12, cursor: "pointer" }}>
                      <span style={{ fontSize: 18, fontWeight: 900, color: "#111", fontStyle: "italic" }}>{idx + 1}</span>
                      <span style={{ fontSize: 15, color: "#333", lineHeight: 1.4, fontWeight: 600, wordBreak: "keep-all" }}>{news}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Back to list */}
        <div style={{ textAlign: "center", padding: "32px 0" }}>
          <button onClick={() => router.push("/homepage")} style={{ padding: "12px 40px", background: "#fff", color: "#555", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            ← 목록으로 돌아가기
          </button>
        </div>
      </div>

      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
