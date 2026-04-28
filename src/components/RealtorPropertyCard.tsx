"use client";

import { useState, useEffect } from "react";
import { getAgencyInfo, getVacancyDetail } from "@/app/actions/vacancy";

interface RealtorPropertyCardProps {
  userId: string;
  userName: string;
  onClose: () => void;
  onInquiry?: (text: string) => void;
}

const NAVY = "#1a2e50";
const BLUE = "#508bf5";

const formatPrice = (deposit: number, monthlyRent?: number, tradeType?: string) => {
  const d = deposit || 0;
  if (d >= 100000000) {
    const eok = Math.floor(d / 100000000);
    const man = Math.floor((d % 100000000) / 10000);
    const eokStr = man > 0 ? `${eok}억 ${man.toLocaleString()}만` : `${eok}억`;
    if (tradeType === "월세" && monthlyRent) return `${eokStr} / ${(monthlyRent / 10000).toLocaleString()}만`;
    return eokStr;
  }
  const man = Math.floor(d / 10000);
  if (tradeType === "월세" && monthlyRent) return `${man.toLocaleString()}만 / ${(monthlyRent / 10000).toLocaleString()}만`;
  return `${man.toLocaleString()}만`;
};

// ── 매물 상세 뷰  ──
function VacancyDetailView({ vacancy, photos, onBack, onInquiry }: { vacancy: any; photos: any[]; onBack: () => void; onInquiry?: (text: string) => void }) {
  const [photoIdx, setPhotoIdx] = useState(0);
  const addr = [vacancy.sido, vacancy.sigungu, vacancy.dong, vacancy.detail_addr].filter(Boolean).join(" ");
  const price = formatPrice(vacancy.deposit, vacancy.monthly_rent, vacancy.trade_type);

  const specs = [
    { label: "거래유형", value: vacancy.trade_type },
    { label: "매물가격", value: price },
    { label: "관리비", value: vacancy.maintenance_fee ? `${(vacancy.maintenance_fee / 10000).toLocaleString()}만원` : "-" },
    { label: "공급/전용", value: vacancy.supply_m2 ? `${vacancy.supply_m2}㎡ / ${vacancy.exclusive_m2 || "-"}㎡` : "-" },
    { label: "방/욕실", value: `${vacancy.room_count || "-"}개 / ${vacancy.bath_count || "-"}개` },
    { label: "방향", value: vacancy.direction || "-" },
    { label: "층수", value: vacancy.current_floor ? `${vacancy.current_floor}층 / ${vacancy.total_floor || "-"}층` : "-" },
    { label: "주차", value: vacancy.parking || "-" },
    { label: "입주가능일", value: vacancy.move_in_date || "-" },
  ].filter(s => s.value && s.value !== "-");

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* 헤더 */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderBottom: "1px solid #eee", flexShrink: 0 }}>
        <button onClick={onBack} style={{ width: 30, height: 30, borderRadius: 8, background: "#f3f4f6", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <span style={{ fontWeight: 800, fontSize: 14, color: "#111" }}>매물 상세</span>
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {/* 사진 슬라이더 */}
        {photos.length > 0 && (
          <div style={{ position: "relative", width: "100%", height: 200, background: "#f0f0f0" }}>
            <img src={photos[photoIdx]?.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            {photos.length > 1 && (
              <>
                <button onClick={() => setPhotoIdx(p => Math.max(0, p - 1))} style={{ position: "absolute", left: 6, top: "50%", transform: "translateY(-50%)", width: 28, height: 28, borderRadius: "50%", background: "rgba(0,0,0,0.4)", border: "none", color: "#fff", cursor: "pointer", fontSize: 14 }}>‹</button>
                <button onClick={() => setPhotoIdx(p => Math.min(photos.length - 1, p + 1))} style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", width: 28, height: 28, borderRadius: "50%", background: "rgba(0,0,0,0.4)", border: "none", color: "#fff", cursor: "pointer", fontSize: 14 }}>›</button>
                <div style={{ position: "absolute", bottom: 8, right: 10, padding: "2px 8px", borderRadius: 10, background: "rgba(0,0,0,0.5)", color: "#fff", fontSize: 11, fontWeight: 600 }}>{photoIdx + 1}/{photos.length}</div>
              </>
            )}
          </div>
        )}

        {/* 기본 정보 */}
        <div style={{ padding: "14px 16px", borderBottom: "1px solid #f0f0f0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: vacancy.trade_type === "매매" ? "#fee2e2" : vacancy.trade_type === "전세" ? "#dbeafe" : "#fef3c7", color: vacancy.trade_type === "매매" ? "#dc2626" : vacancy.trade_type === "전세" ? "#2563eb" : "#d97706" }}>
              {vacancy.trade_type}
            </span>
            <span style={{ fontSize: 11, color: "#888" }}>{vacancy.property_type}</span>
          </div>
          <div style={{ fontWeight: 900, fontSize: 22, color: "#111", marginBottom: 4 }}>{price}</div>
          {vacancy.maintenance_fee > 0 && <div style={{ fontSize: 12, color: "#888" }}>관리비 {(vacancy.maintenance_fee / 10000).toLocaleString()}만원</div>}
          <div style={{ fontSize: 12, color: "#666", marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}>
            <span>📍</span> {addr || "주소 미공개"}
          </div>
        </div>

        {/* 스펙 테이블 */}
        <div style={{ padding: "10px 16px", borderBottom: "1px solid #f0f0f0" }}>
          {specs.map((s, i) => (
            <div key={i} style={{ display: "flex", padding: "7px 0", borderBottom: i < specs.length - 1 ? "1px solid #f5f5f5" : "none" }}>
              <span style={{ width: 80, fontSize: 12, color: "#888", flexShrink: 0 }}>{s.label}</span>
              <span style={{ fontSize: 12, color: "#333", fontWeight: 600 }}>{s.value}</span>
            </div>
          ))}
        </div>

        {/* 옵션 */}
        {vacancy.options?.length > 0 && (
          <div style={{ padding: "10px 16px", borderBottom: "1px solid #f0f0f0" }}>
            <div style={{ fontSize: 12, color: "#888", marginBottom: 6 }}>옵션</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {vacancy.options.map((opt: string, i: number) => (
                <span key={i} style={{ padding: "3px 8px", borderRadius: 6, background: "#f3f4f6", fontSize: 11, color: "#555" }}>{opt}</span>
              ))}
            </div>
          </div>
        )}

        {/* 설명 */}
        {vacancy.description && (
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #f0f0f0" }}>
            <div style={{ fontSize: 12, color: "#888", marginBottom: 6 }}>상세 설명</div>
            <div style={{ fontSize: 12, color: "#444", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{vacancy.description}</div>
          </div>
        )}
      </div>

      {/* 하단 문의 버튼 */}
      {onInquiry && (
        <div style={{ padding: "10px 16px", borderTop: "1px solid #eee", flexShrink: 0 }}>
          <button
            onClick={() => onInquiry(`${vacancy.dong || ""} ${vacancy.building_name || ""} ${vacancy.trade_type} ${price} 매물 문의드립니다.`)}
            style={{ width: "100%", padding: "10px 0", borderRadius: 10, background: BLUE, color: "#fff", fontWeight: 800, fontSize: 14, border: "none", cursor: "pointer" }}
          >
            이 매물 문의하기
          </button>
        </div>
      )}
    </div>
  );
}

// ── 메인 카드 ──
export default function RealtorPropertyCard({ userId, userName, onClose, onInquiry }: RealtorPropertyCardProps) {
  const [agency, setAgency] = useState<any>(null);
  const [vacancies, setVacancies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("전체");
  const [selectedVacancy, setSelectedVacancy] = useState<{ data: any; photos: any[] } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const agencyRes = await getAgencyInfo(userId);
        if (agencyRes.success && agencyRes.data) setAgency(agencyRes.data);

        const { getVacancies } = await import("@/app/actions/vacancy");
        const vacRes = await getVacancies({ ownerId: userId, status: "ACTIVE", all: false });
        if (vacRes.success && vacRes.data) setVacancies(vacRes.data);
      } catch (e) {
        console.error("RealtorPropertyCard load error:", e);
      }
      setLoading(false);
    }
    load();
  }, [userId]);

  const handleSelectVacancy = async (v: any) => {
    setDetailLoading(true);
    try {
      const res = await getVacancyDetail(v.id);
      if (res.success) {
        setSelectedVacancy({ data: res.data, photos: res.photos || [] });
      }
    } catch (e) {
      console.error("Detail load error:", e);
    }
    setDetailLoading(false);
  };

  const tradeTypes = ["전체", ...Array.from(new Set(vacancies.map(v => v.trade_type).filter(Boolean)))];
  const filtered = filter === "전체" ? vacancies : vacancies.filter(v => v.trade_type === filter);

  const tradeCounts: Record<string, number> = {};
  tradeCounts["전체"] = vacancies.length;
  vacancies.forEach(v => {
    if (v.trade_type) tradeCounts[v.trade_type] = (tradeCounts[v.trade_type] || 0) + 1;
  });

  // 상세 보기 모드
  if (selectedVacancy) {
    return (
      <div style={{ background: "#fff", borderRadius: 14, boxShadow: "0 4px 20px rgba(0,0,0,0.12)", overflow: "hidden", display: "flex", flexDirection: "column", maxHeight: "100%", border: "1px solid #e5e7eb" }}>
        <div style={{ background: `linear-gradient(135deg, ${NAVY} 0%, ${BLUE} 100%)`, padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 16 }}>🏢</span>
            <span style={{ color: "#fff", fontWeight: 800, fontSize: 15 }}>{agency?.name || userName} 매물 정보</span>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700 }}>✕</button>
        </div>
        <VacancyDetailView
          vacancy={selectedVacancy.data}
          photos={selectedVacancy.photos}
          onBack={() => setSelectedVacancy(null)}
          onInquiry={onInquiry}
        />
      </div>
    );
  }

  return (
    <div style={{ background: "#fff", borderRadius: 14, boxShadow: "0 4px 20px rgba(0,0,0,0.12)", overflow: "hidden", display: "flex", flexDirection: "column", maxHeight: "100%", border: "1px solid #e5e7eb" }}>
      {/* 헤더 */}
      <div style={{ background: `linear-gradient(135deg, ${NAVY} 0%, ${BLUE} 100%)`, padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 16 }}>🏢</span>
          <span style={{ color: "#fff", fontWeight: 800, fontSize: 15 }}>{agency?.name || userName} 매물 정보</span>
        </div>
        <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700 }}>✕</button>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "#aaa", fontSize: 13 }}>불러오는 중...</div>
      ) : detailLoading ? (
        <div style={{ padding: 40, textAlign: "center", color: "#aaa", fontSize: 13 }}>상세정보 로딩중...</div>
      ) : (
        <div style={{ flex: 1, overflowY: "auto" }}>
          {/* 부동산 정보 */}
          {agency && (
            <div style={{ padding: "14px 16px", borderBottom: "1px solid #f0f0f0" }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 10 }}>
                {agency.profile_image_url ? (
                  <img src={agency.profile_image_url} alt="" style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", border: "2px solid #e5e7eb" }} />
                ) : (
                  <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#e8f0fe", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🏠</div>
                )}
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: "#111" }}>{agency.name}</div>
                  {agency.ceo_name && <div style={{ fontSize: 12, color: "#666" }}>대표 {agency.ceo_name}</div>}
                </div>
              </div>
              {agency.address && (
                <div style={{ fontSize: 12, color: "#666", display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
                  <span>📍</span> {agency.address}
                </div>
              )}
              {agency.phone && (
                <div style={{ fontSize: 12, color: "#666", display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
                  <span>📞</span> <a href={`tel:${agency.phone}`} style={{ color: BLUE, textDecoration: "none", fontWeight: 600 }}>{agency.phone}</a>
                </div>
              )}
              {agency.introduction && (
                <div style={{ marginTop: 8, padding: "8px 12px", background: "#f0f7ff", borderRadius: 8, fontSize: 12, color: "#444", lineHeight: 1.6, borderLeft: `3px solid ${BLUE}` }}>
                  {agency.introduction}
                </div>
              )}
            </div>
          )}

          {/* 매물 필터 */}
          <div style={{ padding: "10px 16px 6px", display: "flex", gap: 6, flexWrap: "wrap", borderBottom: "1px solid #f0f0f0" }}>
            {tradeTypes.map(t => (
              <button key={t} onClick={() => setFilter(t)}
                style={{
                  padding: "4px 12px", borderRadius: 14, fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer",
                  background: filter === t ? NAVY : "#f3f4f6",
                  color: filter === t ? "#fff" : "#555",
                  transition: "all 0.15s"
                }}>
                {t} {tradeCounts[t] || 0}
              </button>
            ))}
          </div>

          {/* 매물 리스트 */}
          {filtered.length === 0 ? (
            <div style={{ padding: "30px 16px", textAlign: "center", color: "#bbb", fontSize: 13 }}>등록된 매물이 없습니다</div>
          ) : (
            <div>
              {filtered.map((v, i) => {
                const addr = [v.dong, v.building_name].filter(Boolean).join(" ");
                const price = formatPrice(v.deposit, v.monthly_rent, v.trade_type);
                const area = v.exclusive_m2 ? `${v.exclusive_m2}㎡` : "";
                const photo = v.vacancy_photos?.[0]?.url;

                return (
                  <div key={v.id || i}
                    onClick={() => handleSelectVacancy(v)}
                    style={{ padding: "12px 16px", borderBottom: "1px solid #f5f5f5", display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer", transition: "background 0.15s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#f9fafb"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    {photo && (
                      <img src={photo} alt="" style={{ width: 56, height: 56, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: "#888", marginBottom: 2 }}>{addr || "위치 미공개"}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "1px 6px", borderRadius: 4, background: v.trade_type === "매매" ? "#fee2e2" : v.trade_type === "전세" ? "#dbeafe" : "#fef3c7", color: v.trade_type === "매매" ? "#dc2626" : v.trade_type === "전세" ? "#2563eb" : "#d97706" }}>
                          {v.trade_type}
                        </span>
                        <span style={{ fontWeight: 800, fontSize: 14, color: "#111" }}>{price}</span>
                      </div>
                      <div style={{ fontSize: 11, color: "#999" }}>
                        {[v.property_type, area, v.direction, v.room_count ? `방${v.room_count}` : ""].filter(Boolean).join(" · ")}
                      </div>
                    </div>
                    {onInquiry && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onInquiry(`${addr} ${v.trade_type} ${price} 매물 문의드립니다.`);
                        }}
                        style={{ padding: "6px 10px", borderRadius: 8, background: BLUE, color: "#fff", fontSize: 11, fontWeight: 700, border: "none", cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap" }}
                      >
                        문의
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
