"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { getVacancies, getVacancyDetail } from "@/app/actions/vacancy";
import { getMaskedAddress } from "@/app/(map)/gongsil/gongsilHelpers";

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

  const getDynamicFields = (v: any) => {
    const formatManwon = (val: number | string | null | undefined): string => {
      if (val === undefined || val === null) return "-";
      const num = typeof val === "string" ? parseInt(val, 10) : val;
      if (isNaN(num) || num <= 0) return "-";
      
      const eok = Math.floor(num / 10000);
      const man = num % 10000;
      
      let result = "";
      if (eok > 0) result += `${eok}억`;
      if (man > 0) {
        const formattedMan = man.toLocaleString("ko-KR");
        result += (result ? " " : "") + `${formattedMan}만`;
      }
      return result + "원";
    };

    const propType = v.property_type || "";
    const subCategory = v.sub_category || "";
    const tradeType = v.trade_type || "";
    const meta = v.metadata || {};

    const fields: { label: string; value: string }[] = [];

    // 1. 단지명 / 건물명
    const isApt = ["아파트", "오피스텔", "도시형생활주택"].some(t => propType.includes(t) || subCategory.includes(t));
    const exp = v.address_exposure;
    const isPrivateAddr = !isApt && exp && exp !== "번지공개" && exp !== "지번공개" && exp !== "동/호수공개";
    const displayBuildingName = isPrivateAddr ? "-" : (v.building_name || "-");
    fields.push({
      label: isApt ? "단지명" : "건물명",
      value: displayBuildingName
    });

    // 1-2. 동/호수
    const showDongHosu = !isPrivateAddr && (exp === "동/호수공개" || exp === "번지공개" || exp === "지번공개" || !exp);
    let displayDongHosu = "-";
    if (showDongHosu) {
      const dongParts = [];
      if (v.apt_dong) dongParts.push(v.apt_dong);
      if (v.hosu) dongParts.push(v.hosu);
      if (dongParts.length > 0) {
        displayDongHosu = dongParts.join(" ");
      }
    }
    fields.push({
      label: "동/호수",
      value: displayDongHosu
    });

    // 1-3. 거래구분
    fields.push({
      label: "거래구분",
      value: tradeType || "-"
    });

    // 1-4. 금액
    let displayPrice = "-";
    const monthlyManwon = v.monthly_rent ? Math.round(v.monthly_rent / 10000) : 0;
    if (v.trade_type === "매매" || v.trade_type === "전세") {
      displayPrice = v.deposit ? formatAmount(v.deposit) : "-";
    } else if (v.trade_type) {
      displayPrice = `${v.deposit ? formatAmount(v.deposit) : "0"}/${monthlyManwon > 0 ? `${monthlyManwon}만` : "0"}`;
    }
    fields.push({
      label: "금액",
      value: displayPrice
    });

    // 1-5. 관리비
    fields.push({
      label: "관리비",
      value: v.maintenance_fee ? `${v.maintenance_fee / 10000}만원` : "없음"
    });

    // 카테고리 분류
    const isVillaHouse = propType === "빌라·주택";
    const isCommercial = propType === "상가·사무실·건물·공장·토지";

    // 2. 용도지역 (빌라·주택 또는 상업용인 경우)
    if (isVillaHouse || isCommercial) {
      fields.push({ label: "용도지역", value: meta.zoning || "-" });
    }

    // 3. 지목 (토지인 경우)
    if (subCategory === "토지") {
      fields.push({ label: "지목", value: meta.land_purpose || "-" });
    }

    // 4. 도로 폭
    if (meta.road_width !== undefined && meta.road_width !== null && meta.road_width !== "") {
      fields.push({ label: "도로 폭", value: `${meta.road_width}m` });
    }

    // 4-1. 준공연도 (도로 폭 직후)
    fields.push({
      label: "준공연도",
      value: v.metadata?.approval_year ? (v.metadata.approval_year <= 1979 ? "1980년 이전" : `${v.metadata.approval_year}년`) : "-"
    });

    // 5. 건물구조 (상업용 - 토지/지산 제외)
    if (isCommercial && subCategory !== "토지" && subCategory !== "지식산업센터") {
      fields.push({ label: "건물구조", value: meta.building_structure || "-" });
    }

    // 6. 주용도 (상업용 - 토지/지산 제외)
    if (isCommercial && subCategory !== "토지" && subCategory !== "지식산업센터") {
      fields.push({ label: "주용도", value: meta.main_usage || "-" });
    }

    // 7. 건물규모
    const hasScale = meta.ground_floors !== undefined || meta.underground_floors !== undefined;
    if (hasScale) {
      const parts = [];
      if (meta.ground_floors !== undefined && meta.ground_floors !== null && meta.ground_floors !== "") {
        parts.push(`지상 ${meta.ground_floors}층`);
      }
      if (meta.underground_floors !== undefined && meta.underground_floors !== null && meta.underground_floors !== "") {
        parts.push(`지하 ${meta.underground_floors}층`);
      }
      if (parts.length > 0) {
        fields.push({ label: "건물규모", value: parts.join(" / ") });
      }
    }

    // 8. 대지면적
    if (meta.land_share_m2) {
      const pyVal = meta.land_share_py || (parseFloat(meta.land_share_m2) / 3.3058).toFixed(1);
      fields.push({ label: "대지면적", value: `${meta.land_share_m2}m² (${pyVal}평)` });
    }

    // 9. 공급/전용면적 또는 연면적
    if (subCategory !== "토지") {
      const isStandaloneBuilding = (isVillaHouse && ["단독/다가구", "전원주택", "상가주택"].includes(subCategory)) ||
                                   (isCommercial && ["건물/빌딩", "공장/창고"].includes(subCategory));
      
      if (tradeType === "매매" && isStandaloneBuilding) {
        const pyVal = v.supply_py || (v.supply_m2 ? (parseFloat(v.supply_m2) / 3.3058).toFixed(1) : "0");
        fields.push({
          label: "연면적",
          value: v.supply_m2 ? `${v.supply_m2}m² (${pyVal}평)` : "-"
        });
      } else {
        const supplyPyVal = v.supply_py || (v.supply_m2 ? (parseFloat(v.supply_m2) / 3.3058).toFixed(1) : "-");
        const exclusivePyVal = v.exclusive_py || (v.exclusive_m2 ? (parseFloat(v.exclusive_m2) / 3.3058).toFixed(1) : "-");
        fields.push({
          label: "공급/전용면적",
          value: `${v.supply_m2 ? `${v.supply_m2}m²(${supplyPyVal}평)` : "-"} / ${v.exclusive_m2 ? `${v.exclusive_m2}m²(${exclusivePyVal}평)` : "-"}`
        });
      }
    }

    // 10. 건폐율/용적률
    if (tradeType === "매매" && (isVillaHouse || isCommercial)) {
      const cov = meta.building_coverage ? `${meta.building_coverage}%` : "-";
      const far = meta.floor_area_ratio ? `${meta.floor_area_ratio}%` : "-";
      fields.push({
        label: "건폐율/용적률",
        value: `${cov} / ${far}`
      });
    }

    // 11. 현용도 (상업용 - 상가/사무실)
    if (isCommercial && ["상가", "사무실"].includes(subCategory)) {
      fields.push({ label: "현용도", value: meta.current_usage || "-" });
    }

    // 12. 해당층/총층
    if (!hasScale && subCategory !== "토지") {
      fields.push({
        label: "해당층/총층",
        value: `${v.current_floor || "-"} / ${v.total_floor || v.floor || "-"}`
      });
    }

    // 13. 방/욕실수 (주거형)
    if (!isCommercial) {
      fields.push({
        label: "방/욕실수",
        value: `${v.room_count || 0}개 / ${v.bathroom_count || v.bath_count || 0}개`
      });
    }

    // 14. 방향 (주거형)
    if (!isCommercial) {
      fields.push({
        label: "방향",
        value: v.direction || "-"
      });
    }

    // 15. 주차
    if (subCategory !== "토지") {
      fields.push({
        label: isCommercial ? "주차대수" : "주차가능 여부",
        value: v.parking || "없음"
      });
    }

    // 16. 엘리베이터 갯수 (상업용 - 토지/지산 제외)
    if (isCommercial && subCategory !== "토지" && subCategory !== "지식산업센터") {
      fields.push({ label: "엘리베이터 갯수", value: meta.elevator_cnt || "-" });
    }

    // 17. 위반건축물 (상업용 - 토지/지산 제외)
    if (isCommercial && subCategory !== "토지" && subCategory !== "지식산업센터") {
      fields.push({
        label: "위반건축물",
        value: meta.is_illegal ? "적발(위반)" : "해당없음"
      });
    }

    // 18. 지식산업센터 특화 제원
    if (subCategory === "지식산업센터") {
      if (meta.jisan_usage) {
        fields.push({ label: "호실 용도", value: meta.jisan_usage });
      }
      if (meta.ceiling_height) {
        fields.push({ label: "층고", value: `${meta.ceiling_height}m` });
      }
      if (meta.power_capacity) {
        fields.push({ label: "사용 전력", value: `${meta.power_capacity}kW` });
      }
      if (meta.free_parking_cnt) {
        fields.push({ label: "무료 주차", value: `${meta.free_parking_cnt}대` });
      }
      
      const specs = [];
      if (meta.has_drive_in) specs.push("드라이브인");
      if (meta.has_door_to_door) specs.push("도어투도어");
      if (meta.has_freight_elevator) specs.push("화물승강기");
      if (specs.length > 0) {
        fields.push({ label: "특화구조", value: specs.join(", ") });
      }
    }

    // 19. 입주가능일
    fields.push({
      label: subCategory === "토지" ? "사용 가능일" : "입주가능일",
      value: v.move_in_date || (subCategory === "토지" ? "즉시사용" : "즉시입주(공실)")
    });

    // 19-1. 도로방향 (건물/빌딩, 공장/창고 매매)
    if (isCommercial && meta.road_direction) {
      fields.push({ label: "도로방향", value: meta.road_direction });
    }

    // 19-2. 권리금 (상가)
    if (isCommercial && subCategory === "상가" && meta.premium_fee) {
      fields.push({ label: "권리금", value: formatManwon(meta.premium_fee) });
    }

    // 19-3. 현재임대 보증금/월세 (건물 매매)
    if (tradeType === "매매" && isCommercial && (meta.current_rental_deposit || meta.current_rental_monthly)) {
      const rentalDep = meta.current_rental_deposit ? formatManwon(meta.current_rental_deposit) : "-";
      const rentalMon = meta.current_rental_monthly ? formatManwon(meta.current_rental_monthly) : "-";
      fields.push({ label: "현재임대 보증금/월세", value: `${rentalDep} / ${rentalMon}` });
    }

    // 19-4. 융자금/대출이율 (매매)
    if (tradeType === "매매" && meta.loan_amount) {
      const loanText = formatManwon(meta.loan_amount);
      const rateText = meta.loan_rate ? ` (연 ${meta.loan_rate}%)` : "";
      fields.push({ label: "융자금", value: `${loanText}${rateText}` });
    }

    // 19-7. 수익률 계산 및 추가 (매매이고 임대 월세 정보가 있으며, 매매가가 0보다 큰 경우)
    if (tradeType === "매매" && meta.current_rental_monthly && parseFloat(meta.current_rental_monthly) > 0 && v.deposit && parseFloat(v.deposit) > 0) {
      const monthlyRent = parseFloat(meta.current_rental_monthly);
      const salePrice = parseFloat(v.deposit) / 10000; // deposit is in won, convert to manwon
      const simpleYield = ((monthlyRent * 12) / salePrice) * 100;
      fields.push({
        label: "단순 수익률",
        value: `연 ${simpleYield.toFixed(2)}%`
      });

      // 실투자 수익률 (융자금 및 대출이율이 있는 경우)
      if (meta.loan_amount && meta.loan_rate && parseFloat(meta.loan_amount) > 0 && parseFloat(meta.loan_rate) > 0) {
        const tenantDeposit = parseFloat(meta.current_rental_deposit || "0");
        const loan = parseFloat(meta.loan_amount);
        const rate = parseFloat(meta.loan_rate);
        const monthlyInterest = loan * (rate / 100) / 12;
        const netMonthly = monthlyRent - monthlyInterest;
        const realInvestment = salePrice - tenantDeposit - loan;
        
        if (realInvestment > 0) {
          const leveragedYield = (netMonthly * 12 / realInvestment) * 100;

          fields.push({
            label: "실투자 수익률",
            value: `연 ${leveragedYield.toFixed(2)}% (실투자금: ${formatManwon(realInvestment)})`
          });
        }
      }
    }

    // 19-5. 지형/형상 (토지)
    if (subCategory === "토지" && meta.terrain) {
      fields.push({ label: "지형/형상", value: meta.terrain });
    }

    // 19-6. 개발가능 여부 (토지)
    if (subCategory === "토지" && meta.development_potential) {
      fields.push({ label: "개발가능", value: meta.development_potential });
    }

    // 20-2. 중개보수/수수료
    const commParts = [];
    const baseComm = v.realtor_commission || v.commission_type;
    if (baseComm) commParts.push(baseComm);
    if (v.commission_amount) commParts.push(`${v.commission_amount}만원`);
    if (v.commission_etc) commParts.push(`(${v.commission_etc})`);
    if (commParts.length > 0) {
      fields.push({
        label: "중개보수",
        value: commParts.join(" ")
      });
    }

    const filteredFields = fields.filter(field => {
      const isRequired = [
        "공실광고번호",
        "소재지",
        "단지명",
        "건물명",
        "동/호수",
        "거래구분",
        "금액",
        "공급/전용면적",
        "연면적",
        "관리비",
        "입주가능일",
        "사용 가능일"
      ].includes(field.label);
      if (isRequired) return true;

      const val = field.value?.trim();
      return val && val !== "-" && val !== "없음" && val !== "0/0" && val !== "0층 / 0층" && val !== "지하 0층 / 지상 0층" && val !== "-개 / -개";
    });

    return filteredFields;
  };

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

  const getPriceLabel = (v: any) => v?.trade_type === "매매" ? "매매" : v?.trade_type === "전세" ? "전세" : v?.trade_type === "경매" ? "경매" : "월세";
  const getPriceBg = (v: any) => v?.trade_type === "매매" ? "#e53e3e" : v?.trade_type === "전세" ? "#2b6cb0" : v?.trade_type === "경매" ? "#ff8c00" : "#2f855a";
  const getPriceText = (v: any) => {
    if (!v) return "";
    if (v.trade_type === "경매") return formatAmount(v.deposit);
    if (v.trade_type === "매매" || v.trade_type === "전세") return formatAmount(v.deposit);
    return `${formatAmount(v.deposit)} / ${formatAmount(v.monthly_rent)}`;
  };

  if (loading) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#fff" }}>
        <span style={{ display: "inline-block", width: 32, height: 32, border: "3px solid #ddd", borderTop: `3px solid ${BRAND}`, borderRadius: "50%", animation: "spin 1s linear infinite", marginRight: 12 }}></span>
        <span style={{ color: "#888", fontSize: 15 }}>공실광고 상세정보를 불러오고 있습니다...</span>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!vacancy) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#fff" }}>
        <span style={{ fontSize: 48, marginBottom: 16 }}>🏠</span>
        <p style={{ fontSize: 16, color: "#888" }}>해당 공실광고을 찾을 수 없습니다.</p>
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
          <span style={{ cursor: "pointer", color: BRAND, fontWeight: 600 }} onClick={() => router.push("/homepage")}>공실광고목록</span>
          <span style={{ margin: "0 8px" }}>›</span>
          <span>{vacancy.building_name || vacancy.dong || "공실광고 상세"}</span>
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
                    <span onClick={() => alert('준비중입니다.')} style={{ fontSize: 13, color: "#fa5252", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>🚨 허위공실광고신고</span>
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
                  {[
                    vacancy.property_type || vacancy.sub_category,
                    (vacancy.room_count !== undefined || vacancy.bathroom_count !== undefined || vacancy.bath_count !== undefined)
                      ? `방/욕실수 ${vacancy.room_count || 0}/${vacancy.bathroom_count || vacancy.bath_count || 0}`
                      : null,
                    (vacancy.supply_m2 || vacancy.exclusive_m2)
                      ? `공급/전용 ${vacancy.supply_m2 ? `${vacancy.supply_m2}㎡` : "-"}/${vacancy.exclusive_m2 ? `${vacancy.exclusive_m2}㎡` : "-"}`
                      : null
                  ].filter(Boolean).join(" · ")}
                </div>
                <div style={{ fontSize: 14, color: "#888", display: "flex", gap: 16 }}>
                  <span>총 <strong style={{ color: "#333" }}>{vacancy.photos?.length || 0}</strong>개</span>
                  <span>주차 {vacancy.parking || "없음"}</span>
                  {vacancy.options && vacancy.options.length > 0 && (
                    <span>{vacancy.options.slice(0, 4).join(", ")}{vacancy.options.length > 4 ? " 등" : ""}</span>
                  )}
                </div>
              </div>
            </div>

            {/* ── Sticky Tabs Only ── */}
            <div style={{ position: "sticky", top: 130, zIndex: 50, background: "#fff", margin: "0 -24px", padding: "0 24px", borderBottom: "1px solid #e5e7eb" }}>
              <div style={{ display: "flex", alignItems: "stretch", transform: "translateY(1px)" }}>
                <div onClick={() => scrollToRef(infoRef, 'info')} style={{ flex: 1, textAlign: "center", padding: "16px 0", fontWeight: "bold", fontSize: 16, color: activeTab === 'info' ? "#111" : "#888", background: activeTab === 'info' ? "#fff" : "#f8fafc", borderTop: activeTab === 'info' ? "2px solid #111" : "1px solid transparent", borderLeft: "1px solid transparent", borderRight: "1px solid transparent", borderBottom: activeTab === 'info' ? "1px solid #fff" : "1px solid transparent", cursor: "pointer", zIndex: activeTab === 'info' ? 1 : 0 }}>공실광고정보</div>
                <div onClick={() => scrollToRef(locationRef, 'location')} style={{ flex: 1, textAlign: "center", padding: "16px 0", fontWeight: "bold", fontSize: 16, color: activeTab === 'location' ? "#111" : "#888", background: activeTab === 'location' ? "#fff" : "#f8fafc", borderTop: activeTab === 'location' ? "2px solid #111" : "1px solid transparent", borderLeft: activeTab === 'location' ? "1px solid #e5e7eb" : "none", borderRight: activeTab === 'location' ? "1px solid #e5e7eb" : "none", borderBottom: activeTab === 'location' ? "1px solid #fff" : "1px solid transparent", cursor: "pointer", zIndex: activeTab === 'location' ? 1 : 0 }}>위치</div>
                <div onClick={() => scrollToRef(envRef, 'env')} style={{ flex: 1, textAlign: "center", padding: "16px 0", fontWeight: "bold", fontSize: 16, color: activeTab === 'env' ? "#111" : "#888", background: activeTab === 'env' ? "#fff" : "#f8fafc", borderTop: activeTab === 'env' ? "2px solid #111" : "1px solid transparent", borderLeft: "1px solid transparent", borderRight: "1px solid transparent", borderBottom: activeTab === 'env' ? "1px solid #fff" : "1px solid transparent", cursor: "pointer", zIndex: activeTab === 'env' ? 1 : 0 }}>주변환경</div>
              </div>
            </div>

            {/* 사진 표시 (리스트 위치 이동됨) */}

            {/* ── 공실광고정보 Table ── */}
            <div ref={infoRef} style={{ background: "#fff", marginBottom: 50, scrollMarginTop: 200, paddingTop: 30 }}>
              <TRow label="공실광고번호" value={vacancy.vacancy_no || String(vacancy.id).split('-')[0].toUpperCase()} />
              <TRow label="소재지" value={getMaskedAddress(vacancy)} />
              {(() => {
                const allFields = getDynamicFields(vacancy);
                
                const basicLabels = ["단지명", "건물명", "동/호수", "거래구분", "금액", "관리비", "용도지역", "지목", "공급/전용면적", "연면적", "대지면적", "입주가능일", "사용 가능일"];
                const facilityLabels = ["준공연도", "건물규모", "주용도", "건물구조", "위반건축물", "엘리베이터 수", "도로 폭", "방/욕실수", "방향", "주차대수", "호실 용도", "층고", "사용 전력", "무료 주차", "특화구조", "지형/형상", "개발가능"];
                const financeLabels = ["도로방향", "권리금", "현재임대 보증금/월세", "융자금", "단순 수익률", "실투자 수익률", "중개보수"];

                const basicFields = allFields.filter(f => basicLabels.includes(f.label) || (!facilityLabels.includes(f.label) && !financeLabels.includes(f.label)));
                const facilityFields = allFields.filter(f => facilityLabels.includes(f.label));
                const financeFields = allFields.filter(f => financeLabels.includes(f.label));

                const renderHeader = (title: string) => (
                  <div style={{ background: "#f1f3f5", color: "#495057", padding: "10px 16px", fontSize: 12, fontWeight: "bold", borderBottom: "1px solid #dee2e6" }}>
                    📍 {title}
                  </div>
                );

                return (
                  <>
                    {basicFields.length > 0 && (
                      <>
                        {renderHeader("기본 정보")}
                        {basicFields.map((f, idx) => (
                          <TRow key={`basic-${idx}`} label={f.label} value={f.value} />
                        ))}
                      </>
                    )}
                    {facilityFields.length > 0 && (
                      <>
                        {renderHeader("시설 및 건물 상세")}
                        {facilityFields.map((f, idx) => (
                          <TRow key={`fac-${idx}`} label={f.label} value={f.value} />
                        ))}
                      </>
                    )}
                    {financeFields.length > 0 && (
                      <>
                        {renderHeader("재무 및 계약 정보")}
                        {financeFields.map((f, idx) => (
                          <TRow key={`fin-${idx}`} label={f.label} value={f.value} />
                        ))}
                      </>
                    )}
                  </>
                );
              })()}
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
                    "관악구 대단지 관악드림타운 네이버 전세 공실광고 0건?",
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
