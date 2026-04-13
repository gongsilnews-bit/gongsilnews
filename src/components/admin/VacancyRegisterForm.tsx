"use client";

import React, { useState, useCallback } from "react";
import { geocodeAddress } from "@/app/actions/geocode";

/* ──────────────────────────────────────────────
   공실등록 폼 컴포넌트 (register.html 1:1 복제)
   - 챗봇 제외
   - 건축물대장 자동등록 제외
   ────────────────────────────────────────────── */

interface VacancyRegisterFormProps {
  onBack: () => void;
  darkMode?: boolean;
  userRole?: "admin" | "realtor" | "user";
}

// ── 1차→2차 카테고리 매핑 (원본 register.html에서 추출) ──
const SUB_CATEGORIES: Record<string, string[]> = {
  "아파트·오피스텔": ["아파트", "아파트분양권", "재건축", "오피스텔", "오피스텔분양권", "재개발"],
  "빌라·주택": ["빌라/연립", "단독/다가구", "전원주택", "상가주택"],
  "원룸·투룸(풀옵션)": ["원룸", "투룸"],
  "상가·사무실·건물·공장·토지": ["상가", "사무실", "공장/창고", "지식산업센터", "건물", "토지"],
  "분양": ["아파트", "오피스텔", "빌라", "도시형생활주택", "생활숙박시설", "상가/업무"],
};

// 상업용 카테고리 (해당층/전체층 표시, 방/욕실/방향 숨김)
const COMMERCIAL_CATEGORY = "상가·사무실·건물·공장·토지";

export default function VacancyRegisterForm({ onBack, darkMode = false, userRole = "admin" }: VacancyRegisterFormProps) {
  // ── 상태 관리 ──
  const [propertyType, setPropertyType] = useState<string>("아파트·오피스텔");
  const [subCategory, setSubCategory] = useState<string>("아파트");
  const [tradeType, setTradeType] = useState<string>("매매");
  const [commissionType, setCommissionType] = useState<string>("법정수수료");
  const [commissionAmount, setCommissionAmount] = useState("");
  const [commissionEtc, setCommissionEtc] = useState("");
  const [parking, setParking] = useState<string>("없음");
  const [moveInDate, setMoveInDate] = useState<string>("즉시입주(공실)");
  const [ownerRelation, setOwnerRelation] = useState<string>("본인");
  const [consent, setConsent] = useState(false);

  // 주거형 추가 필드
  const [roomCount, setRoomCount] = useState("1");
  const [bathCount, setBathCount] = useState("1");
  const [direction, setDirection] = useState("남향");

  // 상업형 추가 필드
  const [currentFloor, setCurrentFloor] = useState("");
  const [totalFloor, setTotalFloor] = useState("");

  const isCommercial = propertyType === COMMERCIAL_CATEGORY;

  // 금액 필드
  const [deposit, setDeposit] = useState("");
  const [monthly, setMonthly] = useState("");
  const [maintenance, setMaintenance] = useState("");

  // 면적
  const [supplyM2, setSupplyM2] = useState("");
  const [supplyPy, setSupplyPy] = useState("");
  const [exclusiveM2, setExclusiveM2] = useState("");
  const [exclusivePy, setExclusivePy] = useState("");

  // 주소
  const [sido, setSido] = useState("");
  const [sigungu, setSigungu] = useState("");
  const [dong, setDong] = useState("");
  const [detailAddr, setDetailAddr] = useState("");
  const [buildingName, setBuildingName] = useState("");
  const [aptDong, setAptDong] = useState("");
  const [hosu, setHosu] = useState("");
  const [addressExposure, setAddressExposure] = useState("기본주소만공개");

  // 인프라 기능
  const [infraRadius, setInfraRadius] = useState("2000");
  const [infrastructure, setInfrastructure] = useState<Record<string, string[]>>({});
  const [addInfraInput, setAddInfraInput] = useState<Record<string, string>>({});

  // 동적 옵션 기능
  const [customOptionInput, setCustomOptionInput] = useState("");
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);

  // 전달사항
  const [description, setDescription] = useState("");

  // 의뢰인
  const [clientName, setClientName] = useState("김미숙");
  const [clientPhone, setClientPhone] = useState("");

  // 좌표
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geocoding, setGeocoding] = useState(false);

  // 좌측 도구 - 면적 계산기
  const [calcM2, setCalcM2] = useState("");
  const [calcPy, setCalcPy] = useState("");

  // 사진
  const [photos, setPhotos] = useState<File[]>([]);

  // ── 면적 자동 변환 ──
  const handleM2Change = useCallback((val: string, setter: (v: string) => void, pySetter: (v: string) => void) => {
    setter(val);
    if (val && !isNaN(Number(val))) {
      pySetter((Number(val) * 0.3025).toFixed(1));
    } else {
      pySetter("");
    }
  }, []);

  // ── 주소 노출 여부 판별 ──
  const isFieldExposed = (field: "detailAddr" | "buildingName" | "aptDong" | "hosu") => {
    if (propertyType === "아파트·오피스텔") {
      if (field === "detailAddr") return addressExposure !== "비공개"; 
      if (field === "buildingName") return true; 
      if (field === "aptDong") return addressExposure !== "비공개"; 
      if (field === "hosu") return addressExposure === "동/호수공개";
    } else {
      if (field === "detailAddr") return addressExposure !== "기본주소만공개";
      if (field === "buildingName" || field === "hosu") return addressExposure === "번지공개";
    }
    return true;
  };

  // ── 인프라 관리 ──
  const handleRadiusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRadius = e.target.value;
    setInfraRadius(newRadius);
    if (coords) {
      try {
        const { searchNearbyInfrastructure } = await import("@/app/actions/geocode");
        const infra = await searchNearbyInfrastructure(coords.lat, coords.lng, parseInt(newRadius, 10));
        setInfrastructure(infra);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleAddInfra = (category: string) => {
    const value = addInfraInput[category];
    if (value && value.trim()) {
      setInfrastructure(prev => ({
        ...prev,
        [category]: [...(prev[category] || []), value.trim()]
      }));
      setAddInfraInput(prev => ({ ...prev, [category]: "" }));
    }
  };

  const handleRemoveInfra = (category: string, index: number) => {
    setInfrastructure(prev => ({
      ...prev,
      [category]: prev[category].filter((_, i) => i !== index)
    }));
  };

  // ── 다이나믹 옵션 관리 ──
  const currentOptionList = React.useMemo(() => {
    let base = ["주차", "엘리베이터"];
    if (propertyType === "아파트·오피스텔" || propertyType === "원룸·투룸(풀옵션)") {
      base = ["에어컨", "세탁기", "냉장고", "가스렌지", "전자렌지", "침대", "옷장", "TV", "신발장", "비데", "도어락"];
    } else if (propertyType === "상가·사무실·건물·공장·토지") {
      base = ["냉난방기", "수도설비", "가스설비", "화물용승강기", "보안시스템"];
    }
    return Array.from(new Set([...base, ...selectedOptions]));
  }, [propertyType, subCategory, selectedOptions]);

  const toggleOption = (opt: string) => {
    setSelectedOptions(prev => prev.includes(opt) ? prev.filter(o => o !== opt) : [...prev, opt]);
  };

  const addCustomOption = () => {
    if (customOptionInput && customOptionInput.trim() && !currentOptionList.includes(customOptionInput.trim())) {
      setSelectedOptions(prev => [...prev, customOptionInput.trim()]);
      setCustomOptionInput("");
    }
  };

  // ── 한글 금액 변환 및 키패드 ──
  const formatKoreanAmount = (value: string) => {
    const num = parseInt(value, 10);
    if (isNaN(num) || num <= 0) return "";
    let eok = Math.floor(num / 10000);
    let man = num % 10000;
    let result = "";
    if (eok > 0) result += `${eok}억 `;
    if (man > 0) {
      let manStr = "";
      const cheon = Math.floor(man / 1000);
      const baek = Math.floor((man % 1000) / 100);
      let rest = man % 100;

      if (cheon > 0) manStr += `${cheon}천`;
      if (baek > 0) manStr += `${baek}백`;
      
      if (rest > 0) {
        if (manStr === "") {
          manStr += rest; 
        } else {
          const sip = Math.floor(rest / 10);
          const il = rest % 10;
          if (sip > 0) manStr += `${sip}십`;
          if (il > 0) manStr += `${il}`;
        }
      }
      result += `${manStr}만`;
    }
    return result.trim() + "원";
  };

  const addAmount = (amount: number, setter: (val: string) => void, currentValue: string) => {
    const currentNum = parseInt(currentValue || "0", 10);
    setter(String(currentNum + amount));
  };

  const AmountKeypad = ({ value, setter }: { value: string, setter: (val: string) => void }) => (
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
      {[
        { label: "+50억", val: 50000 },
        { label: "+5억", val: 5000 },
        { label: "+1억", val: 1000 },
        { label: "+5000만", val: 5000 },
        { label: "+1000만", val: 1000 },
        { label: "+500만", val: 500 },
        { label: "+100만", val: 100 },
        { label: "+50만", val: 50 },
        { label: "+10만", val: 10 },
      ].map((btn, i) => (
        <button key={i} type="button" onClick={() => addAmount(btn.val, setter, value)}
          style={{ padding: "4px 8px", fontSize: 12, background: darkMode ? "#2c2d33" : "#f1f3f5", border: `1px solid ${darkMode ? "#444" : "#e5e7eb"}`, borderRadius: 6, cursor: "pointer", color: textSecondary }}>
          {btn.label}
        </button>
      ))}
      <button type="button" onClick={() => setter("")}
        style={{ padding: "4px 8px", fontSize: 12, background: "#fef2f2", border: `1px solid #fca5a5`, borderRadius: 6, cursor: "pointer", color: "#ef4444" }}>
        초기화
      </button>
    </div>
  );

  // ── 스타일 토큰 ──
  const bg = darkMode ? "#1a1b1e" : "#f4f5f7";
  const cardBg = darkMode ? "#25262b" : "#fff";
  const textPrimary = darkMode ? "#e1e4e8" : "#111827";
  const textSecondary = darkMode ? "#9ca3af" : "#6b7280";
  const border = darkMode ? "#333" : "#e1e4e8";
  const inputBg = darkMode ? "#2c2d31" : "#fff";

  // ── 공통 입력 스타일 ──
  const inputStyle: React.CSSProperties = {
    width: "100%", height: 48, padding: "0 16px",
    border: `1px solid ${border}`, borderRadius: 8, fontSize: 14,
    color: textPrimary, background: inputBg, outline: "none",
    transition: "border-color 0.2s",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 14, fontWeight: 700, color: textPrimary, marginBottom: 10, display: "block",
  };

  const reqMark = <span style={{ color: "#ef4444", marginLeft: 4 }}>*</span>;

  // ── 선택 버튼 렌더러 ──
  const SelectBtn = ({ label, selected, onClick, flex }: { label: string; selected: boolean; onClick: () => void; flex?: number }) => (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: flex || 1, minHeight: 48, border: selected ? "2px solid #1d4ed8" : `1px solid ${border}`,
        borderRadius: 8, background: selected ? (darkMode ? "#1e3a5f" : "#eff6ff") : cardBg,
        color: selected ? "#1d4ed8" : textPrimary, fontSize: 14, fontWeight: selected ? 700 : 500,
        cursor: "pointer", transition: "all 0.2s",
        whiteSpace: "normal", wordBreak: "keep-all", lineHeight: 1.3, padding: "4px"
      }}
    >
      {label}
    </button>
  );

  // ── 체크리스트 계산 ──
  const checkItems = [
    { label: "매물 분류 선택 완료", done: !!propertyType },
    { label: "거래유형/금액 입력", done: !!tradeType && (!!deposit || tradeType === "매매") },
    { label: "소재지 상세 주소", done: !!sido && !!sigungu && !!dong },
    { label: "홍보용 사진 등록", done: photos.length > 0 },
    { label: "의뢰인 정보 기입", done: !!clientName && !!clientPhone },
  ];
  const doneCount = checkItems.filter(c => c.done).length;
  const progress = Math.round((doneCount / checkItems.length) * 100);

  return (
    <div style={{ flex: 1, overflowY: "auto", background: bg, position: "relative" }}>
      {/* ── 타이틀 ── */}
      <div style={{ textAlign: "center", padding: "28px 0 20px", borderBottom: `1px solid ${border}`, background: cardBg }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: textPrimary, margin: 0 }}>공실등록</h1>
      </div>

      {/* ── 3단 레이아웃 ── */}
      <div style={{ display: "flex", gap: 0, maxWidth: 1400, margin: "0 auto", padding: "24px 20px 120px", alignItems: "flex-start" }}>

        {/* ============ 좌측 사이드바: 빠른 입력 / 도구 ============ */}
        <div style={{ width: 300, flexShrink: 0, marginRight: 20, position: "sticky", top: 24 }}>
          <div style={{ background: cardBg, borderRadius: 14, padding: "28px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <h2 style={{ fontSize: 17, fontWeight: 800, color: textPrimary, margin: "0 0 8px", borderBottom: `2px solid ${textPrimary}`, paddingBottom: 12 }}>빠른 입력 / 도구</h2>

            {/* 이전 매물 불러오기 */}
            <button type="button" style={{ width: "100%", height: 48, border: `1px solid ${border}`, borderRadius: 8, background: cardBg, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 14, fontWeight: 600, color: textPrimary, marginTop: 16 }}>
              ↻ 이전 매물 불러오기
            </button>

            {/* 이미지로 등록하기 */}
            <button type="button" style={{ width: "100%", height: 56, border: "none", borderRadius: 8, background: darkMode ? "#1e3a5f" : "#dbeafe", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, padding: "0 16px", marginTop: 10 }}>
              <span style={{ fontSize: 22 }}>🖼️</span>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#1d4ed8" }}>이미지로 등록하기</div>
                <div style={{ fontSize: 11, color: "#6b7280" }}>전단지, 매신저 캡처 자동 분석</div>
              </div>
            </button>



            {/* 구분선 */}
            <div style={{ borderTop: `1px dashed ${border}`, margin: "20px 0" }} />

            {/* 면적 계산기 */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: textPrimary, marginBottom: 10 }}>면적 계산기 (m² ↔ 평)</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, overflow: "hidden" }}>
                <input type="number" placeholder="m²" value={calcM2} onChange={(e) => { setCalcM2(e.target.value); if (e.target.value) setCalcPy((Number(e.target.value) * 0.3025).toFixed(1)); else setCalcPy(""); }}
                  style={{ ...inputStyle, width: 80, minWidth: 0, flex: "1 1 0", height: 40, padding: "0 8px" }} />
                <span style={{ color: textSecondary, fontSize: 14, fontWeight: 600, flexShrink: 0 }}>=</span>
                <input type="text" placeholder="평" value={calcPy} readOnly
                  style={{ ...inputStyle, width: 80, minWidth: 0, flex: "1 1 0", height: 40, padding: "0 8px", background: darkMode ? "#1a1b1e" : "#f9fafb" }} />
              </div>
            </div>

            {/* 중개보수 계산기 */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: textPrimary }}>중개보수 계산기</span>
                <button type="button" style={{ fontSize: 13, fontWeight: 700, color: "#3b82f6", background: "none", border: "none", cursor: "pointer" }}>계산</button>
              </div>
              <div style={{ fontSize: 12, color: textSecondary }}>매물 금액 입력 후 계산을 누르세요.</div>
            </div>

            {/* 홍보용 이모지 */}
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: textPrimary, marginBottom: 10 }}>홍보용 이모지</div>
              <div style={{ display: "flex", gap: 6, fontSize: 20, flexWrap: "wrap" }}>
                {["✓", "✨", "🔥", "🏠", "💡", "📊", "💯", "⭐"].map((e, i) => (
                  <span key={i} style={{ cursor: "pointer", padding: "2px 4px", borderRadius: 4, transition: "background 0.2s" }}
                    onMouseEnter={(ev) => { ev.currentTarget.style.background = darkMode ? "#333" : "#f3f4f6"; }}
                    onMouseLeave={(ev) => { ev.currentTarget.style.background = "transparent"; }}
                  >{e}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ============ 중앙 메인 폼 ============ */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ background: cardBg, borderRadius: 14, padding: "36px 40px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>

            {/* ── 섹션 1: 매물정보 ── */}
            <h2 style={{ fontSize: 20, fontWeight: 800, color: textPrimary, margin: "0 0 24px", borderBottom: `2px solid ${textPrimary}`, paddingBottom: 16 }}>
              매물정보 (전세, 월세, 단기 임대정보)
            </h2>

            {/* 매물 대분류 */}
            <label style={labelStyle}>매물 대분류 (1차) {reqMark}</label>
            <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
              {["아파트·오피스텔", "빌라·주택", "원룸·투룸(풀옵션)", "상가·사무실·건물·공장·토지", "분양"].map(t => (
                <SelectBtn key={t} label={t} selected={propertyType === t} onClick={() => { setPropertyType(t); setSubCategory(SUB_CATEGORIES[t]?.[0] || ""); }} />
              ))}
            </div>

            {/* 상세 종류 선택 (2차) */}
            {SUB_CATEGORIES[propertyType] && (
              <div style={{ marginBottom: 24 }}>
                <label style={{ ...labelStyle, color: "#f97316", fontSize: 13 }}>상세 종류 선택 (2차) {reqMark}</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {SUB_CATEGORIES[propertyType].map(s => (
                    <SelectBtn key={s} label={s} selected={subCategory === s} onClick={() => setSubCategory(s)} />
                  ))}
                </div>
              </div>
            )}

            {/* 거래유형 */}
            <label style={labelStyle}>거래유형 {reqMark}</label>
            <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
              {["매매", "전세", "월세", "단기"].map(t => (
                <SelectBtn key={t} label={t} selected={tradeType === t} onClick={() => setTradeType(t)} />
              ))}
            </div>

            {/* 금액 입력 (거래유형에 따라 동적) */}
            {tradeType === "매매" && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <label style={{ ...labelStyle, marginBottom: 0 }}>매매가</label>
                  {deposit && <span style={{ color: "#f97316", fontSize: 13, fontWeight: 700 }}>{formatKoreanAmount(deposit)}</span>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <input type="number" placeholder="예: 30000" value={deposit} onChange={(e) => setDeposit(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
                  <span style={{ color: textSecondary, fontSize: 14, flexShrink: 0 }}>만원</span>
                </div>
                <AmountKeypad value={deposit} setter={setDeposit} />
              </div>
            )}
            {(tradeType === "전세") && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <label style={{ ...labelStyle, marginBottom: 0 }}>보증금</label>
                  {deposit && <span style={{ color: "#f97316", fontSize: 13, fontWeight: 700 }}>{formatKoreanAmount(deposit)}</span>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <input type="number" placeholder="예: 20000" value={deposit} onChange={(e) => setDeposit(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
                  <span style={{ color: textSecondary, fontSize: 14, flexShrink: 0 }}>만원</span>
                </div>
                <AmountKeypad value={deposit} setter={setDeposit} />
              </div>
            )}
            {(tradeType === "월세" || tradeType === "단기") && (
              <>
                <div style={{ display: "flex", gap: 24, marginBottom: 24 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <label style={{ ...labelStyle, marginBottom: 0 }}>보증금</label>
                      {deposit && <span style={{ color: "#f97316", fontSize: 13, fontWeight: 700 }}>{formatKoreanAmount(deposit)}</span>}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <input type="number" placeholder="예: 1000" value={deposit} onChange={(e) => setDeposit(e.target.value)} style={{ ...inputStyle }} />
                      <span style={{ color: textSecondary, fontSize: 14, flexShrink: 0 }}>만원</span>
                    </div>
                    <AmountKeypad value={deposit} setter={setDeposit} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                       <label style={{ ...labelStyle, marginBottom: 0 }}>월세</label>
                       {monthly && <span style={{ color: "#f97316", fontSize: 13, fontWeight: 700 }}>{formatKoreanAmount(monthly)}</span>}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <input type="number" placeholder="예: 50" value={monthly} onChange={(e) => setMonthly(e.target.value)} style={{ ...inputStyle }} />
                      <span style={{ color: textSecondary, fontSize: 14, flexShrink: 0 }}>만원</span>
                    </div>
                    <AmountKeypad value={monthly} setter={setMonthly} />
                  </div>
                </div>
              </>
            )}

            {/* 관리비 */}
            <label style={labelStyle}>관리비</label>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24, maxWidth: 400 }}>
              <input type="text" placeholder="예: 10" value={maintenance} onChange={(e) => setMaintenance(e.target.value)} style={{ ...inputStyle }} />
              <span style={{ color: textSecondary, fontSize: 14, flexShrink: 0 }}>만원</span>
            </div>

            {/* 동적 필드: 주거형 = 방/욕실/방향, 상업형 = 해당층/전체층 */}
            {isCommercial ? (
              <div style={{ display: "flex", gap: 24, marginBottom: 24 }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>해당층</label>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input type="number" placeholder="예: 3" value={currentFloor} onChange={(e) => setCurrentFloor(e.target.value)} style={inputStyle} />
                    <span style={{ color: textSecondary, fontSize: 14, flexShrink: 0 }}>층</span>
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>전체층</label>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input type="number" placeholder="예: 5" value={totalFloor} onChange={(e) => setTotalFloor(e.target.value)} style={inputStyle} />
                    <span style={{ color: textSecondary, fontSize: 14, flexShrink: 0 }}>층</span>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", gap: 24, marginBottom: 16 }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>방 개수</label>
                    <select value={roomCount} onChange={(e) => setRoomCount(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                      {["1","2","3","4","5","6","7+"].map(n => <option key={n}>{n}</option>)}
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>욕실 개수</label>
                    <select value={bathCount} onChange={(e) => setBathCount(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                      {["1","2","3","4+"].map(n => <option key={n}>{n}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ marginBottom: 24, maxWidth: "50%" }}>
                  <label style={labelStyle}>방향 (거실 등 주실 기준)</label>
                  <select value={direction} onChange={(e) => setDirection(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                    {["남향","남동향","남서향","동향","서향","북향","북동향","북서향"].map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
              </>
            )}

            {/* 면적 */}
            <div style={{ display: "flex", gap: 24, marginBottom: 24 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>공급면적</label>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <input type="number" placeholder="예: 84" value={supplyM2}
                    onChange={(e) => handleM2Change(e.target.value, setSupplyM2, setSupplyPy)}
                    style={{ ...inputStyle, flex: 1 }} />
                  <span style={{ color: textSecondary, fontSize: 13, flexShrink: 0 }}>m²</span>
                  <span style={{ color: textSecondary, fontSize: 13, flexShrink: 0 }}>=</span>
                  <input type="text" placeholder="평환산" value={supplyPy} readOnly
                    style={{ ...inputStyle, flex: 1, background: darkMode ? "#1a1b1e" : "#f9fafb" }} />
                  <span style={{ color: textSecondary, fontSize: 13, flexShrink: 0 }}>평</span>
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>전용면적</label>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <input type="number" placeholder="예: 59" value={exclusiveM2}
                    onChange={(e) => handleM2Change(e.target.value, setExclusiveM2, setExclusivePy)}
                    style={{ ...inputStyle, flex: 1 }} />
                  <span style={{ color: textSecondary, fontSize: 13, flexShrink: 0 }}>m²</span>
                  <span style={{ color: textSecondary, fontSize: 13, flexShrink: 0 }}>=</span>
                  <input type="text" placeholder="평환산" value={exclusivePy} readOnly
                    style={{ ...inputStyle, flex: 1, background: darkMode ? "#1a1b1e" : "#f9fafb" }} />
                  <span style={{ color: textSecondary, fontSize: 13, flexShrink: 0 }}>평</span>
                </div>
              </div>
            </div>

            {/* 주차 / 입주가능일 */}
            <div style={{ display: "flex", gap: 24, marginBottom: 24 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>주차가능 여부</label>
                <select value={parking} onChange={(e) => setParking(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                  <option>없음</option><option>가능</option><option>1대</option><option>2대</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>입주가능일</label>
                <select value={moveInDate} onChange={(e) => setMoveInDate(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                  <option>즉시입주(공실)</option><option>1개월 이내</option><option>2개월 이내</option><option>3개월 이내</option><option>날짜 협의</option>
                </select>
              </div>
            </div>

            {/* ── 편의시설 / 옵션 ── */}
            <div style={{ display: "flex", gap: 24, marginBottom: 24 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>옵션</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, background: darkMode ? "#1a1b1e" : "#f9fafb", padding: 16, borderRadius: 8, border: `1px solid ${border}` }}>
                  {currentOptionList.map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => toggleOption(opt)}
                      style={{
                        padding: "6px 14px", borderRadius: 20, fontSize: 13, cursor: "pointer",
                        border: selectedOptions.includes(opt) ? "1px solid #3b82f6" : `1px solid ${border}`,
                        background: selectedOptions.includes(opt) ? (darkMode ? "#1e3a8a" : "#eff6ff") : cardBg,
                        color: selectedOptions.includes(opt) ? "#3b82f6" : textSecondary,
                        fontWeight: selectedOptions.includes(opt) ? 700 : 500,
                        transition: "all 0.2s"
                      }}
                    >
                      {opt} {selectedOptions.includes(opt) && "✓"}
                    </button>
                  ))}
                  <div style={{ display: "flex", alignItems: "center", width: "100%", marginTop: 8 }}>
                    <input type="text" placeholder="+ 옵션 직접 입력" value={customOptionInput} onChange={e => setCustomOptionInput(e.target.value)} onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addCustomOption())}
                      style={{ flex: 1, padding: "8px 12px", border: `1px dashed ${border}`, borderRadius: 20, fontSize: 13, background: "transparent", outline: "none", color: textPrimary }} />
                    <button type="button" onClick={addCustomOption} style={{ marginLeft: 8, padding: "6px 12px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 20, fontSize: 13, cursor: "pointer" }}>추가</button>
                  </div>
                </div>
              </div>
            </div>

            {/* ── 구분선 ── */}
            <div style={{ borderTop: `1px dashed ${border}`, margin: "32px 0" }} />

            {/* ── 섹션 2: 위치/주소 ── */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: textPrimary, margin: 0 }}>위치/주소</h2>
              <button type="button" onClick={() => {
                if (typeof window !== "undefined") {
                  const script = document.createElement("script");
                  script.src = "//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
                  script.onload = () => {
                    new (window as any).daum.Postcode({
                      oncomplete: async (data: any) => {
                        const parsedSido = data.sido || "";
                        const parsedSigungu = data.sigungu || "";
                        const parsedDong = data.bname || "";
                        setSido(parsedSido);
                        setSigungu(parsedSigungu);
                        setDong(parsedDong);
                        
                        let remainingAddr = data.roadAddress || data.jibunAddress || "";
                        const prefixes = [parsedSido, parsedSigungu, parsedDong].filter(Boolean);
                        prefixes.forEach(p => {
                          if (remainingAddr.startsWith(p)) remainingAddr = remainingAddr.slice(p.length).trim();
                        });
                        
                        setDetailAddr(remainingAddr);
                        setBuildingName(data.buildingName || "");

                        // 카카오 Geocoder REST API로 좌표 자동 추출
                        setGeocoding(true);
                        try {
                          const result = await geocodeAddress(data.address || data.roadAddress || data.jibunAddress);
                          if (result.success && result.lat && result.lng) {
                            setCoords({ lat: result.lat, lng: result.lng });
                            console.log(`\u2705 좌표 변환 성공: ${result.lat}, ${result.lng}`);
                            
                            try {
                              const { searchNearbyInfrastructure } = await import("@/app/actions/geocode");
                              // infraRadius 초기값이 2000이므로 2000으로 인프라 기본 탐색 실행
                              const infra = await searchNearbyInfrastructure(result.lat, result.lng, 2000);
                              setInfrastructure(infra);
                            } catch(e) {
                              console.error("인프라 추출 실패:", e);
                            }
                          } else {
                            console.warn('\u26a0\ufe0f 좌표 변환 실패:', result.error);
                            setCoords(null);
                          }
                        } catch (err) {
                          console.error('\uc88c\ud45c \ubcc0\ud658 \uc911 \uc624\ub958:', err);
                          setCoords(null);
                        } finally {
                          setGeocoding(false);
                        }
                      }
                    }).open();
                  };
                  document.head.appendChild(script);
                }
              }} style={{ height: 36, padding: "0 16px", background: "#10b981", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                🔍 찾기
              </button>
            </div>

            {/* 노출 범위 설정 */}
            <div style={{ background: darkMode ? "#1a1b1e" : "#f9fafb", padding: "16px 20px", borderRadius: 10, border: `1px solid ${border}`, marginBottom: 24 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: textPrimary, marginBottom: 12 }}>주소 노출 범위 설정</div>
              <div style={{ display: "flex", gap: 20 }}>
                {propertyType === "아파트·오피스텔" ? (
                  <>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, cursor: "pointer" }}>
                      <input type="radio" name="addressExposure" checked={addressExposure === "동/호수공개"} onChange={() => setAddressExposure("동/호수공개")} /> 동/호수공개
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, cursor: "pointer" }}>
                      <input type="radio" name="addressExposure" checked={addressExposure === "동수공개"} onChange={() => setAddressExposure("동수공개")} /> 동수공개
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, cursor: "pointer" }}>
                      <input type="radio" name="addressExposure" checked={addressExposure === "비공개"} onChange={() => setAddressExposure("비공개")} /> 비공개
                    </label>
                  </>
                ) : (
                  <>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, cursor: "pointer" }}>
                      <input type="radio" name="addressExposure" checked={addressExposure === "번지공개"} onChange={() => setAddressExposure("번지공개")} /> 번지공개
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, cursor: "pointer" }}>
                      <input type="radio" name="addressExposure" checked={addressExposure === "본번지만공개"} onChange={() => setAddressExposure("본번지만공개")} /> 본번지만공개
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, cursor: "pointer" }}>
                      <input type="radio" name="addressExposure" checked={addressExposure === "기본주소만공개"} onChange={() => setAddressExposure("기본주소만공개")} /> 기본주소만공개
                    </label>
                  </>
                )}
              </div>
            </div>

            <div style={{ display: "flex", gap: 24, marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>시/도 {reqMark}</label>
                <input type="text" placeholder="예: 서울특별시" value={sido} onChange={(e) => setSido(e.target.value)} style={inputStyle} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>시/군/구 {reqMark}</label>
                <input type="text" placeholder="예: 강남구" value={sigungu} onChange={(e) => setSigungu(e.target.value)} style={inputStyle} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 24, marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>읍/면/동/리 {reqMark}</label>
                <input type="text" placeholder="예: 양평읍 창대리" value={dong} onChange={(e) => setDong(e.target.value)} style={inputStyle} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>나머지 주소 {!isFieldExposed("detailAddr") && <span style={{ color: "#f97316", fontSize: 12 }}>(비공개)</span>}</label>
                <input type="text" placeholder="예: 남북로 53" value={detailAddr} onChange={(e) => setDetailAddr(e.target.value)} style={inputStyle} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 24, marginBottom: 16 }}>
              <div style={{ flex: propertyType === "아파트·오피스텔" ? 1.5 : 1 }}>
                <label style={labelStyle}>{propertyType === "아파트·오피스텔" ? "단지명" : "건물명"} {!isFieldExposed("buildingName") && <span style={{ color: "#f97316", fontSize: 12 }}>(비공개)</span>}</label>
                <input type="text" placeholder={propertyType === "아파트·오피스텔" ? "예: 래미안아파트" : "예: 행복빌라"} value={buildingName} onChange={(e) => setBuildingName(e.target.value)} style={inputStyle} />
              </div>
              
              {propertyType === "아파트·오피스텔" ? (
                <>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>동 {!isFieldExposed("aptDong") && <span style={{ color: "#f97316", fontSize: 12 }}>(비공개)</span>}</label>
                    <input type="text" placeholder="예: 101동" value={aptDong} onChange={(e) => setAptDong(e.target.value)} style={inputStyle} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>호수 {!isFieldExposed("hosu") && <span style={{ color: "#f97316", fontSize: 12 }}>(비공개)</span>}</label>
                    <input type="text" placeholder="예: 405호" value={hosu} onChange={(e) => setHosu(e.target.value)} style={inputStyle} />
                  </div>
                </>
              ) : (
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>호수 {!isFieldExposed("hosu") && <span style={{ color: "#f97316", fontSize: 12 }}>(비공개)</span>}</label>
                  <input type="text" placeholder="예: 101호" value={hosu} onChange={(e) => setHosu(e.target.value)} style={inputStyle} />
                </div>
              )}
            </div>

            <div style={{ background: darkMode ? "#1e3a5f" : "#eff6ff", borderRadius: 8, padding: "12px 16px", marginBottom: 8, fontSize: 13, color: "#3b82f6", fontWeight: 600 }}>
              확인 주소: {(() => {
                if (!sido) return "주소를 입력해주세요.";
                const parts = [sido, sigungu, dong];
                
                let exposedDetail = "";
                if (isFieldExposed("detailAddr") && detailAddr) {
                  if (addressExposure === "본번지만공개") {
                    if (detailAddr.includes("-")) {
                      exposedDetail = detailAddr.split("-")[0].trim();
                    } else {
                      const dParts = detailAddr.trim().split(" ");
                      if (dParts.length > 1 && !isNaN(Number(dParts[dParts.length - 1]))) {
                        dParts.pop();
                      }
                      exposedDetail = dParts.join(" ");
                    }
                  } else {
                    exposedDetail = detailAddr;
                  }
                }
                if (exposedDetail) parts.push(exposedDetail);

                if (isFieldExposed("buildingName") && buildingName) parts.push(buildingName);
                if (propertyType === "아파트·오피스텔" && isFieldExposed("aptDong") && aptDong) parts.push(aptDong);
                if (isFieldExposed("hosu") && hosu) parts.push(hosu);
                return parts.join(" ");
              })()}
            </div>
            {geocoding && (
              <div style={{ fontSize: 12, color: "#3b82f6", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                ⏳ 주소로부터 좌표를 추출하는 중...
              </div>
            )}
            {!geocoding && coords && (
              <div style={{ fontSize: 12, color: "#10b981", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                ✅ 좌표 추출 완료: 위도 {coords.lat.toFixed(6)}, 경도 {coords.lng.toFixed(6)}
              </div>
            )}
            {!geocoding && sido && !coords && (
              <div style={{ fontSize: 12, color: "#f59e0b", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                ⚠️ 좌표 추출 실패 — 주소를 다시 검색해 주세요.
              </div>
            )}

            {/* 인프라/주변정보 */}
            {coords && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <label style={{ ...labelStyle, margin: 0 }}>주변 인프라 (자동 완성)</label>
                  <select value={infraRadius} onChange={handleRadiusChange} style={{ padding: "4px 8px", fontSize: 12, borderRadius: 6, border: `1px solid ${border}`, background: cardBg, color: textPrimary, outline: "none", cursor: "pointer" }}>
                    <option value="500">반경 500m</option>
                    <option value="1000">반경 1km</option>
                    <option value="2000">반경 2km</option>
                    <option value="3000">반경 3km</option>
                    <option value="5000">반경 5km</option>
                  </select>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12, background: darkMode ? "#1a1b1e" : "#f9fafb", padding: 16, borderRadius: 8, border: `1px solid ${border}` }}>
                  {Object.entries(infrastructure).map(([catName, places]) => (
                    <div key={catName} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: textPrimary, width: 65, flexShrink: 0, marginTop: 4 }}>
                        {catName}
                      </span>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, flex: 1 }}>
                        {places.map((place, idx) => (
                          <div key={idx} style={{ display: "flex", alignItems: "center", padding: "2px 8px 2px 10px", background: cardBg, border: `1px solid ${border}`, borderRadius: 16 }}>
                            <span style={{ fontSize: 13, color: textSecondary }}>{place}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveInfra(catName, idx)}
                              style={{ marginLeft: 4, background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 14, fontWeight: 700, padding: "0 4px", display: "flex", alignItems: "center" }}
                              title="삭제"
                            >✕</button>
                          </div>
                        ))}
                        <div style={{ display: "flex", alignItems: "center" }}>
                          <input type="text" value={addInfraInput[catName] || ""} onChange={(e) => setAddInfraInput(prev => ({ ...prev, [catName]: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddInfra(catName); } }}
                            placeholder="+ 직접 추가 (엔터)"
                            style={{ fontSize: 12, padding: "3px 10px", borderRadius: 16, border: `1px dashed ${border}`, background: "transparent", outline: "none", width: 120, color: textPrimary }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  {Object.keys(infrastructure).length === 0 && (
                    <div style={{ fontSize: 13, color: textSecondary, textAlign: "center", padding: "10px 0" }}>지정된 반경 내에 추출된 인프라 정보가 없습니다. 직접 추가 기능을 이용해 보세요.</div>
                  )}
                </div>
              </div>
            )}

            {/* ── 전달사항 ── */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-start", gap: 12, marginTop: 32, marginBottom: 10 }}>
              <label style={{ ...labelStyle, margin: 0 }}>전달사항 (특징, 입주일 등)</label>
              <button type="button" style={{ height: 32, padding: "0 14px", border: "none", borderRadius: 8, background: darkMode ? "#3b2f1e" : "#fef3c7", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 13, fontWeight: 700, color: "#d97706", transition: "opacity 0.2s" }} onMouseEnter={e => e.currentTarget.style.opacity = "0.8"} onMouseLeave={e => e.currentTarget.style.opacity = "1"}>
                ✨ AI 멘트 마법사
              </button>
            </div>
            <textarea
              placeholder="매물의 특징, 입주 가능일 등 상세 내용을 입력해주세요."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              style={{ ...inputStyle, height: "auto", padding: "14px 16px", resize: "vertical", fontFamily: "inherit", lineHeight: 1.6 }}
            />

            {userRole !== "realtor" ? (
              <>
                {/* ── 구분선 ── */}
                <div style={{ borderTop: `1px dashed ${border}`, margin: "32px 0" }} />

                {/* ── 섹션 3: 중개수수료 ── */}
                <label style={labelStyle}>중개수수료 {reqMark}</label>
                <div style={{ border: `1px solid ${border}`, borderRadius: 10, padding: "20px 24px", marginBottom: 24 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 14, fontWeight: 600, color: textPrimary }}>
                      <input type="radio" name="commissionType" checked={commissionType === "법정수수료"} onChange={() => setCommissionType("법정수수료")} style={{ accentColor: "#3b82f6", width: 18, height: 18 }} />
                      법정수수료 지급
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 14, color: textPrimary }}>
                      <input type="radio" name="commissionType" checked={commissionType === "금액직접"} onChange={() => setCommissionType("금액직접")} style={{ accentColor: "#3b82f6", width: 18, height: 18 }} />
                      <input type="text" placeholder="" value={commissionAmount} onChange={(e) => setCommissionAmount(e.target.value)} disabled={commissionType !== "금액직접"}
                        style={{ ...inputStyle, width: 120, height: 36, padding: "0 12px", opacity: commissionType === "금액직접" ? 1 : 0.4 }} />
                      <span style={{ fontSize: 14, color: textSecondary }}>만</span>
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 14, color: textPrimary }}>
                      <input type="radio" name="commissionType" checked={commissionType === "기타"} onChange={() => setCommissionType("기타")} style={{ accentColor: "#3b82f6", width: 18, height: 18 }} />
                      기타
                      <input type="text" placeholder="" value={commissionEtc} onChange={(e) => setCommissionEtc(e.target.value)} disabled={commissionType !== "기타"}
                        style={{ ...inputStyle, flex: 1, height: 36, padding: "0 12px", opacity: commissionType === "기타" ? 1 : 0.4 }} />
                    </label>
                  </div>
                  <div style={{ marginTop: 16, background: darkMode ? "#1e3a5f" : "#eff6ff", borderRadius: 8, padding: "12px 16px", fontSize: 12, color: "#3b82f6", lineHeight: 1.6 }}>
                    ⓘ 매물의뢰서 작성자는 법정수수료를 지급하는 것에 대하여 동의하며, 중개수수료 지급관련 민원이 발생될 경우 <strong>공실뉴스</strong> 매물 등록에 제한이 될 수 있음을 확인합니다.
                  </div>
                </div>

                {/* ── 구분선 ── */}
                <div style={{ borderTop: `1px dashed ${border}`, margin: "32px 0" }} />

                {/* ── 섹션 4: 의뢰인 정보 ── */}
                <h2 style={{ fontSize: 20, fontWeight: 800, color: textPrimary, margin: "0 0 24px" }}>의뢰인 정보</h2>

                <label style={labelStyle}>의뢰인명 {reqMark}</label>
                <input type="text" placeholder="의뢰인 이름" value={clientName} onChange={(e) => setClientName(e.target.value)} style={{ ...inputStyle, marginBottom: 20 }} />

                <label style={labelStyle}>의뢰인 연락처 {reqMark}</label>
                <input type="tel" placeholder="010-0000-0000" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} style={{ ...inputStyle, marginBottom: 20 }} />

                <label style={labelStyle}>소유주와의 관계</label>
                <select value={ownerRelation} onChange={(e) => setOwnerRelation(e.target.value)} style={{ ...inputStyle, marginBottom: 24, cursor: "pointer" }}>
                  <option>본인</option><option>가족</option><option>지인</option><option>임차인</option><option>법인</option><option>기타</option>
                </select>

                {/* 동의 체크박스 */}
                <div style={{ display: "flex", gap: 12, padding: "20px", border: `1px solid ${border}`, borderRadius: 10, marginBottom: 24, alignItems: "flex-start" }}>
                  <input type="checkbox" id="consent" checked={consent} onChange={(e) => setConsent(e.target.checked)}
                    style={{ marginTop: 3, accentColor: "#3b82f6", width: 18, height: 18, flexShrink: 0 }} />
                  <label htmlFor="consent" style={{ fontSize: 13, color: textSecondary, lineHeight: 1.6, cursor: "pointer" }}>
                    <strong style={{ color: textPrimary }}>매물 광고 진행에 동의합니다. (필수)</strong><br />
                    공실뉴스 부동산 위원이 빠른 계약을 위해 네이버부동산, 유튜브, 블로그 등 다양한 광고를 진행하는 것에 동의합니다.
                  </label>
                </div>
              </>
            ) : (
              <>
                {/* ── 구분선 ── */}
                <div style={{ borderTop: `1px dashed ${border}`, margin: "32px 0" }} />

                {/* ── 섹션 3: 부동산 회원 정보 ── */}
                <h2 style={{ fontSize: 20, fontWeight: 800, color: textPrimary, margin: "0 0 24px" }}>부동산 회원 정보</h2>
                <div style={{ border: `1px solid ${border}`, borderRadius: 10, padding: "20px 24px", marginBottom: 24, background: darkMode ? "#1e3a5f" : "#eff6ff" }}>
                  <div style={{ fontSize: 14, color: "#3b82f6", fontWeight: 700, marginBottom: 8 }}>
                    ✅ 중개수수료 및 의뢰인 정보 자동 대체
                  </div>
                  <div style={{ fontSize: 13, color: textSecondary, lineHeight: 1.6 }}>
                    부동산 회원 공실 등록 시, 회원님의 <strong>중개사무소 정보가 매물에 자동으로 노출</strong>됩니다.<br />
                    (정보 수정은 좌측 메뉴의 '정보설정'에서 가능합니다)
                  </div>
                </div>
              </>
            )}



            {/* ── 공실 등록하기 버튼 ── */}
            <button
              type="button"
              onClick={() => { alert("공실 등록이 완료되었습니다!"); onBack(); }}
              style={{
                width: "100%", height: 56, border: "none", borderRadius: 10,
                background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                color: "#fff", fontSize: 18, fontWeight: 800, cursor: "pointer",
                letterSpacing: 1, marginTop: 32,
                transition: "opacity 0.2s, transform 0.1s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.9"; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
            >
              공실 등록하기
            </button>
          </div>
        </div>

        {/* ============ 우측 사이드바: 매물 사진 / 라이브러리 ============ */}
        <div style={{ width: 320, flexShrink: 0, marginLeft: 20, position: "sticky", top: 24 }}>
          {/* 매물 사진 / 라이브러리 */}
          <div style={{ background: cardBg, borderRadius: 14, padding: "28px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", marginBottom: 20 }}>
            <h2 style={{ fontSize: 17, fontWeight: 800, color: textPrimary, margin: "0 0 8px", borderBottom: `2px solid ${textPrimary}`, paddingBottom: 12 }}>매물 사진 / 라이브러리</h2>

            {/* 포토DB 간편검색 */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "16px 0 20px" }}>
              <input type="text" placeholder="포토DB 간편검색" style={{ ...inputStyle, height: 40, flex: 1 }} />
              <button type="button" style={{ width: 40, height: 40, border: `1px solid ${border}`, borderRadius: 8, background: cardBg, cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>🔍</button>
            </div>

            {/* 사진 등록 */}
            <label style={{ ...labelStyle, fontSize: 15 }}>사진 등록 (최대 5장) {reqMark}</label>
            <div
              style={{
                border: `2px dashed ${border}`, borderRadius: 12, padding: "40px 20px",
                textAlign: "center", cursor: "pointer", marginBottom: 16,
                transition: "border-color 0.2s, background 0.2s",
              }}
              onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = "#3b82f6"; e.currentTarget.style.background = darkMode ? "#1e3a5f" : "#eff6ff"; }}
              onDragLeave={(e) => { e.currentTarget.style.borderColor = border; e.currentTarget.style.background = "transparent"; }}
              onDrop={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = border; e.currentTarget.style.background = "transparent"; const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/")); setPhotos(prev => [...prev, ...files].slice(0, 5)); }}
              onClick={() => { const input = document.createElement("input"); input.type = "file"; input.accept = "image/*"; input.multiple = true; input.onchange = (e: any) => { const files = Array.from(e.target.files || []) as File[]; setPhotos(prev => [...prev, ...files].slice(0, 5)); }; input.click(); }}
            >
              <div style={{ fontSize: 36, color: "#9ca3af", marginBottom: 8 }}>☁️</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: textPrimary }}>사진 마우스 끌어오기</div>
              <div style={{ fontSize: 12, color: textSecondary, marginTop: 4 }}>또는 클릭하여 업로드 (자동 압축)</div>
            </div>

            {/* 업로드된 사진 미리보기 */}
            {photos.length > 0 && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                {photos.map((p, i) => (
                  <div key={i} style={{ width: 56, height: 56, borderRadius: 8, overflow: "hidden", position: "relative", border: `1px solid ${border}` }}>
                    <img src={URL.createObjectURL(p)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <button type="button" onClick={() => setPhotos(prev => prev.filter((_, j) => j !== i))}
                      style={{ position: "absolute", top: 2, right: 2, width: 18, height: 18, borderRadius: "50%", background: "rgba(0,0,0,0.5)", color: "#fff", border: "none", fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
                  </div>
                ))}
              </div>
            )}

            {/* Tip */}
            <div style={{ background: darkMode ? "#1a1b1e" : "#fffbeb", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#92400e", lineHeight: 1.5 }}>
              💡 <strong>Tip:</strong> 드래그 앤 드롭으로 방 사진을 편리하게 추가하세요. 사진은 워터마크가 자동으로 적용됩니다.
            </div>
          </div>

          {/* 주변 시세 정보 */}
          <div style={{ background: cardBg, borderRadius: 14, padding: "28px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", marginBottom: 20 }}>
            <h2 style={{ fontSize: 17, fontWeight: 800, color: textPrimary, margin: "0 0 8px", borderBottom: `2px solid ${textPrimary}`, paddingBottom: 12 }}>주변 시세 정보</h2>
            <div style={{ background: darkMode ? "#1a1b1e" : "#f8f9fa", borderRadius: 10, padding: "40px 20px", textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>📊</div>
              <div style={{ fontSize: 13, color: textSecondary, lineHeight: 1.6 }}>
                주소를 입력하시면 주변 실거래가 및<br />건축물대장 정보가 요약됩니다.
              </div>
              <div style={{ fontSize: 13, color: "#ef4444", fontWeight: 600, marginTop: 8 }}>(서비스 준비 중)</div>
            </div>
          </div>

          {/* 작성 체크리스트 */}
          <div style={{ background: cardBg, borderRadius: 14, padding: "28px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <h2 style={{ fontSize: 17, fontWeight: 800, color: textPrimary, margin: "0 0 16px", borderBottom: `2px solid ${textPrimary}`, paddingBottom: 12 }}>작성 체크리스트</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
              {checkItems.map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
                  {item.done ? (
                    <span style={{ color: "#10b981", fontWeight: 700 }}>✓</span>
                  ) : (
                    <span style={{ color: "#d1d5db", fontSize: 16 }}>○</span>
                  )}
                  <span style={{ color: item.done ? "#10b981" : textSecondary, fontWeight: item.done ? 600 : 400 }}>{item.label}</span>
                </div>
              ))}
            </div>
            {/* 프로그레스 바 */}
            <div style={{ height: 8, background: darkMode ? "#333" : "#e5e7eb", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${progress}%`, background: "#10b981", borderRadius: 4, transition: "width 0.4s ease" }} />
            </div>
            <div style={{ textAlign: "right", fontSize: 12, color: textSecondary, marginTop: 6 }}>진행률 {progress}%</div>
          </div>
        </div>
      </div>
    </div>
  );
}
