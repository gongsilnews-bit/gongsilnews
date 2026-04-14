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
      <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8f9fa" }}>
        <span style={{ display: "inline-block", width: 32, height: 32, border: "3px solid #ddd", borderTop: `3px solid ${BRAND}`, borderRadius: "50%", animation: "spin 1s linear infinite", marginRight: 12 }}></span>
        <span style={{ color: "#888", fontSize: 15 }}>매물 상세정보를 불러오고 있습니다...</span>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!vacancy) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#f8f9fa" }}>
        <span style={{ fontSize: 48, marginBottom: 16 }}>🏠</span>
        <p style={{ fontSize: 16, color: "#888" }}>해당 매물을 찾을 수 없습니다.</p>
        <button onClick={() => router.push("/homepage")} style={{ marginTop: 16, padding: "10px 24px", background: BRAND, color: "#fff", borderRadius: 6, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>목록으로 돌아가기</button>
      </div>
    );
  }

  const photos = vacancy.photos || [];

  return (
    <div style={{ background: "#f8f9fa", minHeight: "100vh" }}>
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
          <div style={{ flex: 1, minWidth: 0 }}>

            {/* Title + Price */}
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: 24, marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: "#999", marginBottom: 6 }}>
                등록일 {vacancy.created_at ? new Date(vacancy.created_at).toLocaleDateString("ko-KR") : ""}
                {vacancy.property_type && <span style={{ marginLeft: 8 }}>| {vacancy.property_type}{vacancy.sub_category ? `/${vacancy.sub_category}` : ""}</span>}
              </div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: "#111", marginBottom: 12, letterSpacing: "-0.5px" }}>
                {vacancy.building_name || vacancy.dong || "매물 상세"}
              </h1>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ background: getPriceBg(vacancy), color: "#fff", fontSize: 13, fontWeight: 700, padding: "4px 12px", borderRadius: 4 }}>{getPriceLabel(vacancy)}</span>
                <span style={{ fontSize: 28, fontWeight: 900, color: "#c53030", letterSpacing: "-1px" }}>{getPriceText(vacancy)}</span>
              </div>
              {/* Action icons */}
              <div style={{ display: "flex", gap: 20, marginTop: 16, paddingTop: 16, borderTop: "1px solid #f0f0f0" }}>
                {[{ icon: "🔗", label: "공유" }, { icon: "🖨️", label: "인쇄" }, { icon: "⭐", label: "관심매물" }].map(a => (
                  <span key={a.label} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: "#888", cursor: "pointer" }}>{a.icon} {a.label}</span>
                ))}
              </div>
            </div>

            {/* ── 매물정보 Table ── */}
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, marginBottom: 16, overflow: "hidden" }}>
              <div style={{ padding: "14px 18px", borderBottom: `2px solid ${BRAND}`, fontWeight: 800, fontSize: 16, color: BRAND }}>📋 매물정보</div>
              <div style={ROW}><div style={LABEL}>매물번호</div><div style={VAL}>{vacancy.id}</div></div>
              <div style={ROW}><div style={LABEL}>소재지</div><div style={VAL}>{vacancy.sido} {vacancy.sigungu} {vacancy.dong} {vacancy.detail_addr || ""}</div></div>
              <div style={ROW}><div style={LABEL}>매물종류</div><div style={VAL}>{vacancy.property_type}{vacancy.sub_category ? ` / ${vacancy.sub_category}` : ""}</div></div>
              <div style={ROW}><div style={LABEL}>거래유형</div><div style={VAL}>{vacancy.trade_type}</div></div>
              <div style={ROW}><div style={LABEL}>보증금/월세</div><div style={VAL}>
                {vacancy.trade_type === "매매" ? `매매가 ${formatAmount(vacancy.deposit)}만원` :
                 vacancy.trade_type === "전세" ? `전세 ${formatAmount(vacancy.deposit)}만원` :
                 `보증금 ${formatAmount(vacancy.deposit)}만원 / 월 ${vacancy.monthly_rent ? Math.round(vacancy.monthly_rent / 10000).toLocaleString() : "0"}만원`}
              </div></div>
              {vacancy.maintenance_fee && <div style={ROW}><div style={LABEL}>관리비</div><div style={VAL}>{Math.round(vacancy.maintenance_fee / 10000).toLocaleString()}만원</div></div>}
              {vacancy.area_m2 && <div style={ROW}><div style={LABEL}>전용면적</div><div style={VAL}>{vacancy.area_m2}m² ({(vacancy.area_m2 * 0.3025).toFixed(1)}평)</div></div>}
              {vacancy.rooms && <div style={ROW}><div style={LABEL}>방/욕실</div><div style={VAL}>방 {vacancy.rooms}개{vacancy.bathrooms ? `, 욕실 ${vacancy.bathrooms}개` : ""}</div></div>}
              {vacancy.floor_info && <div style={ROW}><div style={LABEL}>층수</div><div style={VAL}>{vacancy.floor_info}</div></div>}
              {vacancy.move_in_date && <div style={ROW}><div style={LABEL}>입주가능일</div><div style={VAL}>{vacancy.move_in_date}</div></div>}
              {vacancy.parking && <div style={ROW}><div style={LABEL}>주차</div><div style={VAL}>{vacancy.parking}</div></div>}
              {vacancy.options?.length > 0 && <div style={ROW}><div style={LABEL}>옵션</div><div style={VAL}>{vacancy.options.join(", ")}</div></div>}
              {vacancy.description && <div style={ROW}><div style={LABEL}>상세설명</div><div style={VAL}>{vacancy.description}</div></div>}
            </div>

            {/* ── 사진정보 ── */}
            {photos.length > 0 && (
              <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, marginBottom: 16, overflow: "hidden" }}>
                <div style={{ padding: "14px 18px", borderBottom: `2px solid ${BRAND}`, fontWeight: 800, fontSize: 16, color: BRAND }}>📷 사진정보</div>
                <div style={{ position: "relative", background: "#111" }}>
                  <img src={photos[photoIdx]} alt={`사진 ${photoIdx + 1}`} style={{ width: "100%", height: 460, objectFit: "contain", display: "block" }} />
                  {photos.length > 1 && (
                    <>
                      <button onClick={() => setPhotoIdx(Math.max(0, photoIdx - 1))} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 40, height: 40, borderRadius: "50%", background: "rgba(0,0,0,0.5)", color: "#fff", fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", border: "none" }}>‹</button>
                      <button onClick={() => setPhotoIdx(Math.min(photos.length - 1, photoIdx + 1))} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", width: 40, height: 40, borderRadius: "50%", background: "rgba(0,0,0,0.5)", color: "#fff", fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", border: "none" }}>›</button>
                      <div style={{ position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)", background: "rgba(0,0,0,0.6)", color: "#fff", padding: "4px 14px", borderRadius: 12, fontSize: 12, fontWeight: 600 }}>{photoIdx + 1} / {photos.length}</div>
                    </>
                  )}
                </div>
                {/* Thumbnails */}
                {photos.length > 1 && (
                  <div style={{ display: "flex", gap: 6, padding: 12, overflowX: "auto" }}>
                    {photos.map((p: string, i: number) => (
                      <img key={i} src={p} alt="" onClick={() => setPhotoIdx(i)} style={{ width: 72, height: 54, objectFit: "cover", borderRadius: 4, cursor: "pointer", border: i === photoIdx ? `3px solid ${BRAND}` : "3px solid transparent", opacity: i === photoIdx ? 1 : 0.6, transition: "all 0.15s" }} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── 위치정보 (Map) ── */}
            {vacancy.lat && vacancy.lng && (
              <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, marginBottom: 16, overflow: "hidden" }}>
                <div style={{ padding: "14px 18px", borderBottom: `2px solid ${BRAND}`, fontWeight: 800, fontSize: 16, color: BRAND }}>📍 위치정보</div>
                <div ref={mapRef} style={{ width: "100%", height: 360, background: "#e8eaed" }}></div>
                <div style={{ padding: "10px 18px", fontSize: 13, color: "#666", background: "#fafafa", borderTop: "1px solid #e5e7eb" }}>
                  {vacancy.sido} {vacancy.sigungu} {vacancy.dong} {vacancy.detail_addr || ""}
                </div>
              </div>
            )}
          </div>

          {/* ── Right Sidebar ── */}
          <div style={{ width: 300, flexShrink: 0 }}>
            <div style={{ position: "sticky", top: 80 }}>

              {/* 중개사무소 정보 */}
              <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, marginBottom: 16, overflow: "hidden" }}>
                <div style={{ padding: "14px 18px", borderBottom: `2px solid ${BRAND}`, fontWeight: 800, fontSize: 15, color: BRAND }}>🏢 중개사무소</div>
                <div style={{ padding: 18 }}>
                  {vacancy.realtor_commission && (
                    <div style={{ marginBottom: 12 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: "#ea580c", border: "1px solid #fed7aa", padding: "3px 10px", borderRadius: 4, background: "#fff7ed" }}>{vacancy.realtor_commission}</span>
                    </div>
                  )}
                  {vacancy.client_phone && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", background: "#f0f7ff", borderRadius: 6, marginBottom: 8 }}>
                      <span style={{ fontSize: 18 }}>📞</span>
                      <span style={{ fontSize: 16, fontWeight: 800, color: "#1d4ed8" }}>{vacancy.client_phone}</span>
                    </div>
                  )}
                  <button onClick={() => { if (vacancy.client_phone) window.location.href = `tel:${vacancy.client_phone}`; }} style={{ width: "100%", padding: "12px 0", background: BRAND, color: "#fff", borderRadius: 6, fontSize: 14, fontWeight: 700, cursor: "pointer", border: "none", marginTop: 4 }}>
                    전화 문의하기
                  </button>
                </div>
              </div>

              {/* 같은 지역 다른 매물 */}
              {otherListings.length > 0 && (
                <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
                  <div style={{ padding: "14px 18px", borderBottom: `2px solid ${BRAND}`, fontWeight: 800, fontSize: 15, color: BRAND }}>🏠 같은 지역 매물</div>
                  <div style={{ padding: "8px 0" }}>
                    {otherListings.map((v: any) => (
                      <div key={v.id} onClick={() => router.push(`/homepage/${v.id}`)} style={{ display: "flex", gap: 10, padding: "10px 18px", cursor: "pointer", borderBottom: "1px solid #f5f5f5", transition: "background 0.15s" }} onMouseEnter={e => (e.currentTarget.style.background = "#f9fafb")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                        <div style={{ width: 64, height: 48, borderRadius: 4, overflow: "hidden", flexShrink: 0, background: "#f3f4f6" }}>
                          {v.photos?.length > 0 ? <img src={v.photos[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#ccc", fontSize: 10 }}>No</div>}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "#111", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 2 }}>{v.building_name || v.dong}</div>
                          <div style={{ fontSize: 12, fontWeight: 800, color: "#c53030" }}>
                            <span style={{ fontSize: 10, background: getPriceBg(v), color: "#fff", padding: "1px 5px", borderRadius: 2, marginRight: 4 }}>{getPriceLabel(v)}</span>
                            {getPriceText(v)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
