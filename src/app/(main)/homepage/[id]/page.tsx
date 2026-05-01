"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { getVacancies, getVacancyDetail } from "@/app/actions/vacancy";

const BRAND = "#2845B3";
const LABEL: React.CSSProperties = { width: 120, fontSize: 13, fontWeight: 700, color: "#555", padding: "10px 14px", background: "#f8f9fa", borderRight: "1px solid #e5e7eb", whiteSpace: "nowrap" };
const VAL: React.CSSProperties = { flex: 1, fontSize: 13, color: "#111", padding: "10px 14px" };
const ROW: React.CSSProperties = { display: "flex", borderBottom: "1px solid #e5e7eb" };

const OptionIcon = ({ name }: { name: string }) => {
  const sz = 26;
  const str = 1.8;
  switch (name) {
    case "에어컨":
      return <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={str} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="6" width="18" height="8" rx="2"/><path d="M7 14v4"/><path d="M17 14v4"/><path d="M12 14v4"/></svg>;
    case "침대":
      return <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={str} strokeLinecap="round" strokeLinejoin="round"><path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/></svg>;
    case "도어락":
    case "전자도어락":
      return <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={str} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
    case "전자렌지":
    case "전자레인지":
      return <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={str} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M17 10h.01"/><path d="M17 14h.01"/><path d="M7 12h5"/></svg>;
    case "비데":
      return <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={str} strokeLinecap="round" strokeLinejoin="round"><path d="M9 22H15C20 22 22 20 22 15V9C22 4 20 2 15 2H9C4 2 2 4 2 9V15C2 20 4 22 9 22Z"/><path d="M7 12.5L10 15.5L17 8.5"/></svg>;
    case "TV":
      return <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={str} strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"/><polyline points="17 2 12 7 7 2"/></svg>;
    case "옷장":
      return <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={str} strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M12 2v20"/><path d="M8 12h.01"/><path d="M16 12h.01"/></svg>;
    case "세탁기":
      return <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={str} strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><circle cx="12" cy="13" r="5"/><path d="M8 6h.01"/><path d="M10 6h.01"/></svg>;
    case "냉장고":
      return <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={str} strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M5 10h14"/><path d="M9 14v2"/><path d="M9 5v2"/></svg>;
    case "가스레인지":
    case "인덕션":
      return <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={str} strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="6" width="16" height="14" rx="2"/><path d="M4 10h16"/><circle cx="8" cy="15" r="2"/><circle cx="16" cy="15" r="2"/></svg>;
    default:
      return <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={str} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>;
  }
};

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
      const y = ref.current.getBoundingClientRect().top + window.scrollY - 200;
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
      const docRes = await getVacancyDetail(id);
      if (docRes.success && docRes.data) {
        const found = {
          ...docRes.data,
          photos: docRes.photos ? docRes.photos.sort((a: any, b: any) => a.sort_order - b.sort_order).map((p: any) => p.url) : []
        };
        setVacancy(found);

        const res = await getVacancies({ all: true });
        if (res.success && res.data) {
          const others = res.data.filter((v: any) => v.status === "ACTIVE" && String(v.id) !== id && v.sido === found.sido).slice(0, 5);
          setOtherListings(others);
        }
      } else {
        setVacancy(null);
      }
      setLoading(false);
      setTimeout(() => window.scrollTo(0, 0), 10);
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
      if (rest) result += result ? " " + rest : rest;
      if (e === 0 && c === 0 && rem > 0) result += "만";
    }
    return result || "0";
  };

  const getPriceLabel = (v: any) => v?.trade_type === "매매" ? "매매" : v?.trade_type === "전세" ? "전세" : "월세";
  const getPriceBg = (v: any) => v?.trade_type === "매매" ? "#e53e3e" : v?.trade_type === "전세" ? "#2b6cb0" : "#2f855a";
  const getPriceText = (v: any) => {
    if (!v) return "";
    if (v.trade_type === "매매" || v.trade_type === "전세") return formatAmount(v.deposit);
    return `${formatAmount(v.deposit)} / ${formatAmount(v.monthly_rent)}`;
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
        <div style={{ fontSize: 13, color: "#888", marginBottom: 16, paddingLeft: 24 }}>
          <span style={{ cursor: "pointer", color: BRAND, fontWeight: 600 }} onClick={() => router.push("/homepage")}>매물목록</span>
          <span style={{ margin: "0 8px" }}>›</span>
          <span>{vacancy.building_name || vacancy.dong || "매물 상세"}</span>
        </div>

        {/* ── Main Content ── */}
        <div style={{ display: "flex", gap: 24 }}>

          {/* Left Column */}
          <div style={{ flex: 1, minWidth: 0, background: "#fff", padding: "0 24px", borderRadius: 8, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>

            {/* 사진 슬라이더 (맨 앞으로 이동) */}
            {photos.length > 0 && (
              <div style={{ position: "relative", marginTop: 24, marginBottom: 20, width: "100%", height: 450, borderRadius: 8, overflow: "hidden", background: "#f1f5f9" }}>
                <img src={photos[photoIdx]} alt={`사진 ${photoIdx + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                {photos.length > 1 && (
                  <>
                    <button onClick={() => setPhotoIdx((prev) => (prev > 0 ? prev - 1 : photos.length - 1))} style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.5)", color: "#fff", border: "none", width: 44, height: 44, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, transition: "0.2s" }} onMouseEnter={e => e.currentTarget.style.background="rgba(0,0,0,0.8)"} onMouseLeave={e => e.currentTarget.style.background="rgba(0,0,0,0.5)"}>‹</button>
                    <button onClick={() => setPhotoIdx((prev) => (prev < photos.length - 1 ? prev + 1 : 0))} style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.5)", color: "#fff", border: "none", width: 44, height: 44, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, transition: "0.2s" }} onMouseEnter={e => e.currentTarget.style.background="rgba(0,0,0,0.8)"} onMouseLeave={e => e.currentTarget.style.background="rgba(0,0,0,0.5)"}>›</button>
                    <div style={{ position: "absolute", bottom: 16, right: 16, background: "rgba(0,0,0,0.6)", color: "#fff", padding: "6px 14px", borderRadius: 20, fontSize: 13, fontWeight: "bold", zIndex: 10 }}>
                      {photoIdx + 1} / {photos.length}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── Header Info (scrolls away) ── */}
            <div style={{ background: "#fff", margin: "0 -24px", padding: "16px 24px 0 24px", borderBottom: "1px solid #e5e7eb" }}>
              {/* Row 1: Badges & Links */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                 <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                   <span style={{ fontSize: 13, fontWeight: 800, color: "#fa5252", border: "1px solid #fa5252", padding: "4px 12px", background: "#fff", borderRadius: 4 }}>{vacancy.realtor_commission || "법정수수료"}</span>
                   <span style={{ fontSize: 13, color: "#888", fontWeight: 600 }}>등록 {vacancy.created_at ? new Date(vacancy.created_at).toLocaleDateString("ko-KR") : ""}</span>
                 </div>
                 <div style={{ display: "flex", gap: 12 }}>
                    <span style={{ fontSize: 13, color: "#fa5252", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>🚨 허위매물신고</span>
                    <span style={{ fontSize: 13, color: "#999", cursor: "pointer" }}>인쇄</span>
                 </div>
              </div>

              {/* Row 2: Title/Price & Buttons */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, color: "#555", marginBottom: 6, fontWeight: 600 }}>{vacancy.dong} {vacancy.building_name || "단독/다가구"}</div>
                  <div style={{ fontSize: 32, fontWeight: 900, color: "#111", letterSpacing: "-1px", lineHeight: 1.1, marginBottom: 12 }}>
                    {vacancy.trade_type} {getPriceText(vacancy)}
                  </div>
                  {/* Themes */}
                  {vacancy.themes && vacancy.themes.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {vacancy.themes.map((theme: string, idx: number) => (
                        <span key={idx} style={{ background: "#f8fafc", color: "#3b82f6", fontSize: 13, padding: "4px 12px", borderRadius: 20, fontWeight: 700, border: "1px solid #bfdbfe" }}>
                          {theme.startsWith('#') ? theme : `# ${theme}`}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8, paddingBottom: 4 }}>
                  <button style={{ width: 44, height: 44, borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#64748b", transition: "0.2s" }} onMouseEnter={e=>e.currentTarget.style.background="#f1f5f9"} onMouseLeave={e=>e.currentTarget.style.background="#fff"} title="찜하기">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m19 21-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"></path></svg>
                  </button>
                  <button style={{ width: 44, height: 44, borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#64748b", transition: "0.2s" }} onMouseEnter={e=>e.currentTarget.style.background="#f1f5f9"} onMouseLeave={e=>e.currentTarget.style.background="#fff"} title="공유하기">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"></line><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"></line></svg>
                  </button>
                </div>
              </div>
              
              {/* Row 3: Detail Specs */}
              <div style={{ paddingBottom: 20 }}>
                <div style={{ fontSize: 14, color: "#666", marginBottom: 8 }}>
                  아파트 · 오피스텔 · 방/욕실수 {vacancy.rooms || 0}/{vacancy.bathrooms || 0} · 공급/전용 {Math.round((vacancy.area_m2 || 0)*1.3)}m²/{vacancy.area_m2 || 0}m²
                </div>
                <div style={{ fontSize: 14, color: "#888", display: "flex", gap: 16 }}>
                  <span>총 <strong style={{ color: "#333" }}>{vacancy.photos?.length || 0}</strong>개</span>
                  <span>주차 {vacancy.parking_spots || "불가"}</span>
                  <span>에어컨, 렌지, 세탁기 등</span>
                </div>
              </div>
            </div>

            {/* ── Sticky Tabs Only ── */}
            <div style={{ position: "sticky", top: 130, zIndex: 50, background: "#fff", margin: "0 -24px", padding: "0 24px", borderBottom: "1px solid #e5e7eb" }}>
              <div style={{ display: "flex", alignItems: "stretch", transform: "translateY(1px)" }}>
                <div onClick={() => scrollToRef(infoRef, 'info')} style={{ flex: 1, textAlign: "center", padding: "16px 0", fontWeight: "bold", fontSize: 16, color: activeTab === 'info' ? "#111" : "#888", background: activeTab === 'info' ? "#fff" : "#f8fafc", borderTop: activeTab === 'info' ? "2px solid #111" : "1px solid transparent", borderLeft: "1px solid transparent", borderRight: "1px solid transparent", borderBottom: activeTab === 'info' ? "1px solid #fff" : "1px solid transparent", cursor: "pointer", zIndex: activeTab === 'info' ? 1 : 0 }}>매물정보</div>
                <div onClick={() => scrollToRef(locationRef, 'location')} style={{ flex: 1, textAlign: "center", padding: "16px 0", fontWeight: "bold", fontSize: 16, color: activeTab === 'location' ? "#111" : "#888", background: activeTab === 'location' ? "#fff" : "#f8fafc", borderTop: activeTab === 'location' ? "2px solid #111" : "1px solid transparent", borderLeft: activeTab === 'location' ? "1px solid #e5e7eb" : "none", borderRight: activeTab === 'location' ? "1px solid #e5e7eb" : "none", borderBottom: activeTab === 'location' ? "1px solid #fff" : "1px solid transparent", cursor: "pointer", zIndex: activeTab === 'location' ? 1 : 0 }}>위치</div>
                <div onClick={() => scrollToRef(envRef, 'env')} style={{ flex: 1, textAlign: "center", padding: "16px 0", fontWeight: "bold", fontSize: 16, color: activeTab === 'env' ? "#111" : "#888", background: activeTab === 'env' ? "#fff" : "#f8fafc", borderTop: activeTab === 'env' ? "2px solid #111" : "1px solid transparent", borderLeft: "1px solid transparent", borderRight: "1px solid transparent", borderBottom: activeTab === 'env' ? "1px solid #fff" : "1px solid transparent", cursor: "pointer", zIndex: activeTab === 'env' ? 1 : 0 }}>주변환경</div>
              </div>
            </div>

            {/* 사진 표시 (리스트 위치 이동됨) */}

            {/* ── 매물정보 Table ── */}
            <div ref={infoRef} style={{ background: "#fff", marginBottom: 50, scrollMarginTop: 200, paddingTop: 30 }}>
              <TRow label="매물번호" value={String(vacancy.id).split('-')[0].toUpperCase()} />
              <TRow label="소재지" value={`${vacancy.sido} ${vacancy.sigungu} ${vacancy.dong} ${vacancy.detail_addr || ""}`} />
              <TRow label="매물특징" value={vacancy.building_name || "특징 없음"} />
              <TRow label="공급/전용면적" value={`${Math.round((vacancy.area_m2 || 0) * 1.3)}m² / ${vacancy.area_m2 || 0}m²`} />
              <TRow label="해당층/총층" value={`${vacancy.floor || "해당층"} / ${vacancy.total_floors || "전체층"}`} />
              <TRow label="등록자명" value={(() => {
                const m = vacancy.members;
                if (!m) return vacancy.client_name || "-";
                let name = m.name || vacancy.client_name || "-";
                  if (m.role === 'REALTOR' && m.agencies && m.agencies.length > 0) {
                    name = m.agencies[0].name || name;
                  }
                const tag = m.role === "REALTOR" ? "부동산" : m.role === "ADMIN" ? "관리자" : "일반";
                return <span>{name} <span style={{ fontSize: 11, padding: "2px 6px", borderRadius: 4, marginLeft: 6, background: m.role === "REALTOR" ? "#dbeafe" : "#f3f4f6", color: m.role === "REALTOR" ? "#1e40af" : "#6b7280", fontWeight: 600 }}>{tag}</span></span>;
              })()} />
              <TRow label="방/욕실수" value={`${vacancy.rooms || 0}개 / ${vacancy.bathrooms || 0}개`} />
              <TRow label="방향" value={vacancy.direction || "방향정보 없음"} />
              <TRow label="주차가능 여부" value={vacancy.parking_spots ? `${vacancy.parking_spots}대` : "불가"} />
              <TRow label="입주가능일" value={vacancy.move_in_date || "즉시입주"} />
              <TRow label="관리비" value={vacancy.maintenance_fee ? `${Math.round(vacancy.maintenance_fee/10000)}만원` : "없음"} />
              <TRow label="연락처" value={(() => {
                const m = vacancy.members;
                if (!m) return vacancy.client_phone || "-";
                if (m.role === 'REALTOR' && m.agencies && m.agencies.length > 0) return m.agencies[0].phone || m.phone || vacancy.client_phone || "-";
                return m.phone || vacancy.client_phone || "-";
              })()} />
              <TRow label="상세설명" value={vacancy.description || "상세내용 없음"} />
            </div>

            {/* ── 옵션 ── */}
            {vacancy.options && vacancy.options.length > 0 && (
              <div style={{ marginBottom: 50 }}>
                <h3 style={{ fontSize: 18, fontWeight: "bold", color: "#111", marginBottom: 16 }}>옵션</h3>
                <div style={{ display: "flex", gap: 30, flexWrap: "wrap", padding: "20px 0" }}>
                  {vacancy.options.map((opt: string) => (
                    <div key={opt} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                       <div style={{ width: 60, height: 60, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", color: "#333" }}>
                         <OptionIcon name={opt} />
                       </div>
                       <span style={{ fontSize: 14, color: "#444", fontWeight: 600 }}>{opt}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── 위치정보 및 로드뷰 ── */}
            {vacancy.lat && vacancy.lng && (
              <div ref={locationRef} style={{ marginBottom: 50, scrollMarginTop: 200 }}>
                <h3 style={{ fontSize: 18, fontWeight: "bold", color: "#111", marginBottom: 16 }}>위치정보</h3>
                <div ref={mapRef} style={{ width: "100%", height: 350, border: "1px solid #ddd", marginBottom: 40 }}></div>
                
                <h3 style={{ fontSize: 18, fontWeight: "bold", color: "#111", marginBottom: 16 }}>로드뷰</h3>
                <div ref={roadviewRef} style={{ width: "100%", height: 350, border: "1px solid #ddd" }}></div>
              </div>
            )}

            {/* ── 주변환경 ── */}
            {vacancy.infrastructure && Object.keys(vacancy.infrastructure).length > 0 && (
              <div ref={envRef} style={{ marginBottom: 50, scrollMarginTop: 200 }}>
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
            <div style={{ marginTop: 20, borderTop: "2px solid #111", paddingTop: "30px", paddingBottom: "40px", marginBottom: 50 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#222", marginBottom: 15, display: "flex", alignItems: "center", gap: 8 }}>
                댓글상담 <span style={{ color: "#1a73e8", fontSize: 15 }}>0개</span>
              </div>
              
              {/* 입력 영역 */}
              <div style={{ marginBottom: 30, border: "1px solid #ddd", borderRadius: 6, overflow: "hidden", background: "#fff", position: "relative" }}>
                <textarea
                  placeholder="로그인 후 이용하실 수 있습니다."
                  style={{ width: "100%", minHeight: 90, border: "none", outline: "none", padding: "14px 15px", fontSize: 14, color: "#333", resize: "vertical", fontFamily: "inherit", background: "#fff", boxSizing: "border-box" }}
                  disabled
                />
                <div style={{ padding: "10px 15px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fafafa", borderTop: "1px solid #eee" }}>
                  <label style={{ fontSize: 13, color: "#555", display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontWeight: "bold" }}>
                    <input type="checkbox" style={{ width: 16, height: 16 }} />
                    비밀글
                  </label>
                  <button disabled style={{ background: "#ccc", color: "#fff", border: "none", padding: "8px 24px", borderRadius: 4, fontWeight: "bold", cursor: "default", fontSize: 14, fontFamily: "inherit" }}>등록</button>
                </div>
              </div>

              {/* 댓글 리스트 */}
              <div>
                <div style={{ textAlign: "center", padding: 30, color: "#888", fontSize: 13 }}>아직 등록된 문의가 없습니다.</div>
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
                    { id: 1, title: "관악드림타운 132동 8층호", price: "매매 11억 5천", details: "면적 82.01m²(25.1평) / 59.83m²(18.1평)\n방 3개, 욕실 1개", badge: "공동중개" },
                    { id: 2, title: "동부센트레빌 101동 101호", price: "전세 5천", details: "면적 84m²(25.4평) / 59m²(17.8평)\n방 3개, 욕실 1개", badge: "공동중개" }
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
