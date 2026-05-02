"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { createVacancy, updateVacancy, getVacancyDetail, saveVacancyPhoto } from "@/app/actions/vacancy";
import { uploadVacancyPhotoDirect } from "@/utils/uploadDirect";
import { geocodeAddress } from "@/app/actions/geocode";

const SUB_CATEGORIES: Record<string, string[]> = {
  "아파트·오피스텔": ["아파트", "오피스텔", "재건축", "재개발"],
  "빌라·주택": ["빌라/연립", "단독/다가구", "전원주택", "상가주택"],
  "원룸·투룸(풀옵션)": ["원룸", "투룸"],
  "상가·사무실·건물·공장·토지": ["상가", "사무실", "공장/창고", "건물", "토지"],
};

function MobileVacancyWrite() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");

  const [memberId, setMemberId] = useState("");
  const [userName, setUserName] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [userRole, setUserRole] = useState("USER");
  const [authChecked, setAuthChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);

  // 매물 기본
  const [propertyType, setPropertyType] = useState("아파트·오피스텔");
  const [subCategory, setSubCategory] = useState("아파트");
  const [tradeType, setTradeType] = useState("매매");

  // 금액
  const [deposit, setDeposit] = useState("");
  const [monthly, setMonthly] = useState("");
  const [maintenance, setMaintenance] = useState("");

  // 면적/층
  const [exclusiveM2, setExclusiveM2] = useState("");
  const [supplyM2, setSupplyM2] = useState("");
  const [areaUnit, setAreaUnit] = useState<"m2"|"py">("m2");
  const [currentFloor, setCurrentFloor] = useState("");
  const [totalFloor, setTotalFloor] = useState("");
  const [roomCount, setRoomCount] = useState("1");
  const [bathCount, setBathCount] = useState("1");
  const [direction, setDirection] = useState("남향");

  // 주소
  const [sido, setSido] = useState("");
  const [sigungu, setSigungu] = useState("");
  const [dong, setDong] = useState("");
  const [buildingName, setBuildingName] = useState("");
  const [detailAddr, setDetailAddr] = useState("");
  const [aptDong, setAptDong] = useState("");
  const [hosu, setHosu] = useState("");
  const [addressExposure, setAddressExposure] = useState("기본주소만공개");

  // 기타
  const [parking, setParking] = useState("없음");
  const [moveInDate, setMoveInDate] = useState("즉시입주(공실)");
  const [description, setDescription] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [coords, setCoords] = useState<{lat:number;lng:number}|null>(null);

  // 옵션/테마/주변환경
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [selectedThemes, setSelectedThemes] = useState<string[]>([]);
  const [customOptionInput, setCustomOptionInput] = useState("");
  const [customThemeInput, setCustomThemeInput] = useState("");
  const [infrastructure, setInfrastructure] = useState<any>({});

  // 부동산 전용
  const [realtorCommission, setRealtorCommission] = useState("공동중개 0%");
  const [exposureType, setExposureType] = useState("부동산노출");
  const [landlordName, setLandlordName] = useState("");
  const [landlordPhone, setLandlordPhone] = useState("");
  const [landlordMemo, setLandlordMemo] = useState("");

  // 사진
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreview, setPhotoPreview] = useState<string[]>([]);

  const isCommercial = propertyType === "상가·사무실·건물·공장·토지";
  const isRealtor = userRole === "REALTOR" || userRole === "ADMIN";

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/m"); return; }
      const { data } = await supabase.from("members").select("id, name, phone, role").eq("id", user.id).single();
      if (data) { setMemberId(data.id); setUserName(data.name||""); setUserPhone(data.phone||""); setClientName(data.name||""); setClientPhone(data.phone||""); setUserRole((data as any).role || "USER"); }
      setAuthChecked(true);
    })();
  }, []);

  // 수정 모드: 데이터 로드
  useEffect(() => {
    if (!editId) return;
    (async () => {
      setLoadingEdit(true);
      const res = await getVacancyDetail(editId);
      if (res.success && res.data) {
        const d = res.data;
        if (d.property_type) setPropertyType(d.property_type);
        if (d.sub_category) setSubCategory(d.sub_category);
        if (d.trade_type) setTradeType(d.trade_type);
        if (d.deposit) setDeposit(String(d.deposit / 10000));
        if (d.monthly_rent) setMonthly(String(d.monthly_rent / 10000));
        if (d.maintenance_fee) setMaintenance(String(d.maintenance_fee / 10000));
        if (d.exclusive_m2) setExclusiveM2(String(d.exclusive_m2));
        if (d.supply_m2) setSupplyM2(String(d.supply_m2));
        if (d.current_floor) setCurrentFloor(d.current_floor);
        if (d.total_floor) setTotalFloor(d.total_floor);
        if (d.room_count) setRoomCount(String(d.room_count));
        if (d.bath_count) setBathCount(String(d.bath_count));
        if (d.direction) setDirection(d.direction);
        if (d.sido) setSido(d.sido);
        if (d.sigungu) setSigungu(d.sigungu);
        if (d.dong) setDong(d.dong);
        if (d.building_name) setBuildingName(d.building_name);
        if (d.detail_addr) setDetailAddr(d.detail_addr);
        if (d.apt_dong) setAptDong(d.apt_dong);
        if (d.hosu) setHosu(d.hosu);
        if (d.address_exposure) setAddressExposure(d.address_exposure);
        if (d.parking) setParking(d.parking);
        if (d.move_in_date) setMoveInDate(d.move_in_date);
        if (d.description) setDescription(d.description);
        if (d.client_name) setClientName(d.client_name);
        if (d.client_phone) setClientPhone(d.client_phone);
        if (d.lat && d.lng) setCoords({lat:d.lat,lng:d.lng});
        if (d.realtor_commission) setRealtorCommission(d.realtor_commission);
        if (d.exposure_type) setExposureType(d.exposure_type);
        if (d.landlord_name) setLandlordName(d.landlord_name);
        if (d.landlord_phone) setLandlordPhone(d.landlord_phone);
        if (d.landlord_memo) setLandlordMemo(d.landlord_memo);
        if (d.options) setSelectedOptions(d.options);
        if (d.themes) setSelectedThemes(d.themes);
        if (d.infrastructure) setInfrastructure(d.infrastructure);
      }
      setLoadingEdit(false);
    })();
  }, [editId]);

  // 다이나믹 옵션 관리
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

  const currentThemeList = React.useMemo(() => {
    if (propertyType === "아파트·오피스텔") {
      return Array.from(new Set(["신축급", "올수리", "한강뷰", "역세권", "풀옵션", ...selectedThemes]));
    } else if (propertyType === "원룸·투룸(풀옵션)") {
      return Array.from(new Set(["가성비", "단기임대", "주차편리", "대로변안전", "여성안심", ...selectedThemes]));
    } else if (propertyType === "상가·사무실·건물·공장·토지") {
      return Array.from(new Set(["무권리", "코너자리", "유동인구많음", "주차대수많음", "인테리어잘됨", "층고높음", "대로변", ...selectedThemes]));
    } else if (propertyType === "빌라·주택") {
      return Array.from(new Set(["테라스", "복층", "마당있음", "투자용", ...selectedThemes]));
    }
    return Array.from(new Set(["급매", "추천매물", ...selectedThemes]));
  }, [propertyType, selectedThemes]);

  const toggleTheme = (theme: string) => {
    setSelectedThemes(prev => prev.includes(theme) ? prev.filter(t => t !== theme) : [...prev, theme]);
  };

  const addCustomTheme = () => {
    if (customThemeInput && customThemeInput.trim() && !currentThemeList.includes(customThemeInput.trim())) {
      setSelectedThemes(prev => [...prev, customThemeInput.trim()]);
      setCustomThemeInput("");
    }
  };

  const handlePostcodeSearch = () => {
    const script = document.createElement("script");
    script.src = "//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
    script.onload = () => {
      new (window as any).daum.Postcode({
        oncomplete: async (data: any) => {
          setSido(data.sido || "");
          setSigungu(data.sigungu || "");
          setDong(data.bname || "");
          setBuildingName(data.buildingName || "");
          setDetailAddr(data.jibunAddress || data.address || "");
          // 자동 좌표 설정
          const addr = data.address || data.jibunAddress || "";
          if (addr) {
            const res = await geocodeAddress(addr);
            if (res.success && res.lat && res.lng) {
              setCoords({lat:res.lat, lng:res.lng});
              try {
                const { searchNearbyInfrastructure } = await import("@/app/actions/geocode");
                const infra = await searchNearbyInfrastructure(res.lat, res.lng);
                setInfrastructure(infra);
              } catch (e) { console.error(e); }
            }
          }
        }
      }).open();
    };
    document.head.appendChild(script);
  };

  const handleGeocode = async () => {
    const addr = [sido, sigungu, dong, detailAddr].filter(Boolean).join(" ");
    if (!addr) { alert("주소를 입력해주세요."); return; }
    const res = await geocodeAddress(addr);
    if (res.success && res.lat && res.lng) { 
      setCoords({lat:res.lat, lng:res.lng}); 
      try {
        const { searchNearbyInfrastructure } = await import("@/app/actions/geocode");
        const infra = await searchNearbyInfrastructure(res.lat, res.lng);
        setInfrastructure(infra);
      } catch (e) { console.error(e); }
      alert("좌표 및 주변환경(인프라) 설정 완료!"); 
    }
    else alert("주소를 찾을 수 없습니다.");
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files).slice(0, 5 - photos.length);
    setPhotos(prev => [...prev, ...files]);
    files.forEach(f => { const r = new FileReader(); r.onload = () => setPhotoPreview(prev => [...prev, r.result as string]); r.readAsDataURL(f); });
  };

  const removePhoto = (i: number) => { setPhotos(prev => prev.filter((_,idx) => idx!==i)); setPhotoPreview(prev => prev.filter((_,idx) => idx!==i)); };

  const formatKorean = (v: string) => {
    const n = parseInt(v); if (isNaN(n) || n<=0) return "";
    const eok = Math.floor(n/10000); const man = n%10000;
    let result = "";
    if (eok > 0) result += `${eok}억`;
    if (man > 0) {
      const cheon = Math.floor(man/1000);
      const rest = man%1000;
      let manStr = "";
      if (cheon > 0) manStr += `${cheon}천`;
      if (rest > 0) manStr += `${rest}`;
      result += (result ? " " : "") + manStr + "만";
    }
    return (result || "0") + "원";
  };

  const handleSubmit = async (status: string) => {
    if (!propertyType || !tradeType) { alert("매물 분류와 거래유형을 선택하세요."); return; }
    if (!sido || !dong) { alert("주소를 입력하세요."); return; }
    setSubmitting(true);
    try {
      const payload: any = {
        owner_id: memberId, owner_role: "USER",
        property_type: propertyType, sub_category: subCategory, trade_type: tradeType,
        deposit: (parseInt(deposit)||0)*10000, monthly_rent: (parseInt(monthly)||0)*10000, maintenance_fee: (parseInt(maintenance)||0)*10000,
        exclusive_m2: exclusiveM2 ? parseFloat(exclusiveM2) : undefined,
        exclusive_py: exclusiveM2 ? (parseFloat(exclusiveM2)*0.3025).toFixed(1) : undefined,
        supply_m2: supplyM2 ? parseFloat(supplyM2) : undefined,
        current_floor: currentFloor||undefined, total_floor: totalFloor||undefined,
        room_count: isCommercial ? undefined : parseInt(roomCount)||1,
        bath_count: isCommercial ? undefined : parseInt(bathCount)||1,
        direction: isCommercial ? undefined : direction,
        sido, sigungu, dong, building_name: buildingName||undefined, detail_addr: detailAddr||undefined,
        apt_dong: aptDong||undefined, hosu: hosu||undefined, address_exposure: addressExposure,
        lat: coords?.lat, lng: coords?.lng,
        parking, move_in_date: moveInDate, description: description||undefined,
        client_name: clientName, client_phone: clientPhone,
        options: selectedOptions, themes: selectedThemes, infrastructure,
        realtor_commission: isRealtor ? realtorCommission : undefined,
        exposure_type: isRealtor ? exposureType : undefined,
        landlord_name: isRealtor ? landlordName : undefined,
        landlord_phone: isRealtor ? landlordPhone : undefined,
        landlord_memo: isRealtor ? landlordMemo : undefined,
        consent: true, status,
      };

      let result;
      if (editId) {
        const res = await updateVacancy(editId, payload);
        result = { success: res.success, id: editId, error: res.error };
      } else {
        result = await createVacancy(payload);
      }

      if (!result.success) { alert("실패: " + result.error); return; }

      if (photos.length > 0 && result.id) {
        for (let i = 0; i < photos.length; i++) {
          const path = `${result.id}/${i}_${Date.now()}.webp`;
          const up = await uploadVacancyPhotoDirect(photos[i], path);
          if (up.success && up.url) await saveVacancyPhoto(result.id, up.url, i);
        }
      }

      alert(status === "DRAFT" ? "임시저장 완료!" : editId ? "수정 완료! 승인신청되었습니다." : "등록 완료! 승인신청되었습니다.");
      router.push("/m/admin/vacancy");
    } catch (err: any) { alert("오류: " + err.message); } finally { setSubmitting(false); }
  };

  const inputStyle: React.CSSProperties = { width:"100%", height:44, padding:"0 12px", border:"1px solid #d1d5db", borderRadius:10, fontSize:15, outline:"none", background:"#fff" };
  const labelStyle: React.CSSProperties = { fontSize:13, fontWeight:700, color:"#374151", marginBottom:6, display:"block" };
  const SBtn = ({label,sel,onClick}:{label:string;sel:boolean;onClick:()=>void}) => (
    <button type="button" onClick={onClick} style={{ flex:1, height:42, border: sel?"2px solid #2563eb":"1px solid #d1d5db", borderRadius:10, background: sel?"#eff6ff":"#fff", color: sel?"#2563eb":"#374151", fontSize:14, fontWeight: sel?700:500, cursor:"pointer" }}>{label}</button>
  );

  if (!authChecked || loadingEdit) return (
    <div style={{ display:"flex", height:"100dvh", alignItems:"center", justifyContent:"center", background:"#f4f5f7" }}>
      <div style={{ textAlign:"center", color:"#9ca3af" }}>
        <div style={{ fontSize:36, marginBottom:12 }}>{loadingEdit?"📋":"🔐"}</div>
        <div style={{ fontSize:14, fontWeight:600 }}>{loadingEdit?"매물 정보 불러오는 중...":"권한 확인 중..."}</div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:"100dvh", background:"#f4f5f7", fontFamily:"'Pretendard Variable', -apple-system, sans-serif" }}>
      {/* 헤더 */}
      <div style={{ position:"sticky", top:0, zIndex:50, background:"#fff", borderBottom:"1px solid #e5e7eb", padding:"0 16px", height:56, display:"flex", alignItems:"center", gap:12 }}>
        <button onClick={() => router.push("/m/admin/vacancy")} style={{ background:"none", border:"none", cursor:"pointer", padding:4, display:"flex" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M15 18L9 12L15 6" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <h1 style={{ fontSize:18, fontWeight:800, color:"#111", margin:0 }}>{editId ? "공실수정" : "공실등록"}</h1>
      </div>

      <div style={{ padding:"16px 16px 120px" }}>
        {/* 1. 매물분류 */}
        <div style={{ background:"#fff", borderRadius:14, padding:16, marginBottom:12, boxShadow:"0 1px 3px rgba(0,0,0,0.05)" }}>
          <div style={{ fontSize:16, fontWeight:800, color:"#111", marginBottom:14 }}>📋 매물분류</div>
          <label style={labelStyle}>대분류</label>
          <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:12 }}>
            {Object.keys(SUB_CATEGORIES).map(t => <SBtn key={t} label={t.length>8?t.slice(0,8)+"..":t} sel={propertyType===t} onClick={() => { setPropertyType(t); setSubCategory(SUB_CATEGORIES[t][0]); }} />)}
          </div>
          <label style={labelStyle}>소분류</label>
          <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
            {(SUB_CATEGORIES[propertyType]||[]).map(s => <SBtn key={s} label={s} sel={subCategory===s} onClick={() => setSubCategory(s)} />)}
          </div>
        </div>

        {/* 2. 거래/금액 */}
        <div style={{ background:"#fff", borderRadius:14, padding:16, marginBottom:12, boxShadow:"0 1px 3px rgba(0,0,0,0.05)" }}>
          <div style={{ fontSize:16, fontWeight:800, color:"#111", marginBottom:14 }}>💰 거래정보</div>
          <label style={labelStyle}>거래유형</label>
          <div style={{ display:"flex", gap:8, marginBottom:14 }}>
            {["매매","전세","월세","단기"].map(t => <SBtn key={t} label={t} sel={tradeType===t} onClick={() => setTradeType(t)} />)}
          </div>

          <label style={labelStyle}>{tradeType==="매매"?"매매가":"보증금"} {deposit && <span style={{color:"#f97316", fontWeight:600}}>{formatKorean(deposit)}</span>}</label>
          <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:10 }}>
            <input type="number" value={deposit} onChange={e=>setDeposit(e.target.value)} placeholder="만원 단위" style={inputStyle} />
            <span style={{ color:"#6b7280", fontSize:13, flexShrink:0 }}>만원</span>
          </div>

          {(tradeType==="월세"||tradeType==="단기") && (<>
            <label style={labelStyle}>월세 {monthly && <span style={{color:"#f97316",fontWeight:600}}>{formatKorean(monthly)}</span>}</label>
            <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:10 }}>
              <input type="number" value={monthly} onChange={e=>setMonthly(e.target.value)} placeholder="만원 단위" style={inputStyle} />
              <span style={{ color:"#6b7280", fontSize:13, flexShrink:0 }}>만원</span>
            </div>
          </>)}

          <label style={labelStyle}>관리비</label>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <input type="number" value={maintenance} onChange={e=>setMaintenance(e.target.value)} placeholder="만원 단위" style={inputStyle} />
            <span style={{ color:"#6b7280", fontSize:13, flexShrink:0 }}>만원</span>
          </div>
        </div>

        {/* 3. 면적/층수 */}
        <div style={{ background:"#fff", borderRadius:14, padding:16, marginBottom:12, boxShadow:"0 1px 3px rgba(0,0,0,0.05)" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
            <div style={{ fontSize:16, fontWeight:800, color:"#111" }}>📐 면적·층수</div>
            <div style={{ display:"flex", borderRadius:8, overflow:"hidden", border:"1px solid #d1d5db" }}>
              <button type="button" onClick={()=>setAreaUnit("m2")} style={{ padding:"6px 14px", fontSize:12, fontWeight:700, border:"none", cursor:"pointer", background: areaUnit==="m2"?"#2563eb":"#fff", color: areaUnit==="m2"?"#fff":"#6b7280" }}>m²</button>
              <button type="button" onClick={()=>setAreaUnit("py")} style={{ padding:"6px 14px", fontSize:12, fontWeight:700, border:"none", cursor:"pointer", background: areaUnit==="py"?"#2563eb":"#fff", color: areaUnit==="py"?"#fff":"#6b7280" }}>평</button>
            </div>
          </div>
          <div style={{ display:"flex", gap:10, marginBottom:4 }}>
            <div style={{flex:1}}>
              <label style={labelStyle}>전용면적({areaUnit==="m2"?"m²":"평"})</label>
              {areaUnit==="m2" ? (
                <input type="number" value={exclusiveM2} onChange={e=>setExclusiveM2(e.target.value)} placeholder="59" style={inputStyle}/>
              ) : (
                <input type="number" value={exclusiveM2 ? (parseFloat(exclusiveM2)*0.3025).toFixed(1) : ""} onChange={e=>{ const py=e.target.value; setExclusiveM2(py ? (parseFloat(py)/0.3025).toFixed(1) : ""); }} placeholder="17.8" style={inputStyle}/>
              )}
            </div>
            <div style={{flex:1}}>
              <label style={labelStyle}>공급면적({areaUnit==="m2"?"m²":"평"})</label>
              {areaUnit==="m2" ? (
                <input type="number" value={supplyM2} onChange={e=>setSupplyM2(e.target.value)} placeholder="84" style={inputStyle}/>
              ) : (
                <input type="number" value={supplyM2 ? (parseFloat(supplyM2)*0.3025).toFixed(1) : ""} onChange={e=>{ const py=e.target.value; setSupplyM2(py ? (parseFloat(py)/0.3025).toFixed(1) : ""); }} placeholder="25.4" style={inputStyle}/>
              )}
            </div>
          </div>
          <div style={{ display:"flex", gap:10, marginBottom:10, fontSize:12, color:"#f97316", fontWeight:600, padding:"0 2px" }}>
            <div style={{flex:1}}>{exclusiveM2 ? (areaUnit==="m2" ? `≈ ${(parseFloat(exclusiveM2)*0.3025).toFixed(1)}평` : `≈ ${parseFloat(exclusiveM2).toFixed(1)}m²`) : ""}</div>
            <div style={{flex:1}}>{supplyM2 ? (areaUnit==="m2" ? `≈ ${(parseFloat(supplyM2)*0.3025).toFixed(1)}평` : `≈ ${parseFloat(supplyM2).toFixed(1)}m²`) : ""}</div>
          </div>
          <div style={{ display:"flex", gap:10, marginBottom:10 }}>
            <div style={{flex:1}}><label style={labelStyle}>해당층</label><input type="text" value={currentFloor} onChange={e=>setCurrentFloor(e.target.value)} placeholder="3" style={inputStyle}/></div>
            <div style={{flex:1}}><label style={labelStyle}>전체층</label><input type="number" value={totalFloor} onChange={e=>setTotalFloor(e.target.value)} placeholder="15" style={inputStyle}/></div>
          </div>
          {!isCommercial && (
            <div style={{ display:"flex", gap:10 }}>
              <div style={{flex:1}}>
                <label style={labelStyle}>방</label>
                <select value={roomCount} onChange={e=>setRoomCount(e.target.value)} style={{...inputStyle, cursor:"pointer"}}>
                  {["1","2","3","4","5"].map(n=><option key={n}>{n}</option>)}
                </select>
              </div>
              <div style={{flex:1}}>
                <label style={labelStyle}>욕실</label>
                <select value={bathCount} onChange={e=>setBathCount(e.target.value)} style={{...inputStyle, cursor:"pointer"}}>
                  {["1","2","3"].map(n=><option key={n}>{n}</option>)}
                </select>
              </div>
              <div style={{flex:1}}>
                <label style={labelStyle}>방향</label>
                <select value={direction} onChange={e=>setDirection(e.target.value)} style={{...inputStyle, cursor:"pointer"}}>
                  {["남향","남동향","남서향","동향","서향","북향"].map(d=><option key={d}>{d}</option>)}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* 4. 주소 */}
        <div style={{ background:"#fff", borderRadius:14, padding:16, marginBottom:12, boxShadow:"0 1px 3px rgba(0,0,0,0.05)" }}>
          <div style={{ fontSize:16, fontWeight:800, color:"#111", marginBottom:14 }}>📍 소재지</div>
          <button type="button" onClick={handlePostcodeSearch} style={{ width:"100%", height:46, background:"linear-gradient(135deg,#f97316,#ea580c)", color:"#fff", border:"none", borderRadius:10, fontSize:15, fontWeight:800, cursor:"pointer", marginBottom:14, display:"flex", alignItems:"center", justifyContent:"center", gap:8, boxShadow:"0 2px 8px rgba(249,115,22,0.3)" }}>
            🔍 주소검색 (우편번호)
          </button>
          <div style={{ display:"flex", gap:8, marginBottom:10 }}>
            <div style={{flex:1}}><label style={labelStyle}>시/도</label><input type="text" value={sido} onChange={e=>setSido(e.target.value)} placeholder="서울" style={inputStyle}/></div>
            <div style={{flex:1}}><label style={labelStyle}>시/군/구</label><input type="text" value={sigungu} onChange={e=>setSigungu(e.target.value)} placeholder="강남구" style={inputStyle}/></div>
          </div>
          <div style={{ display:"flex", gap:8, marginBottom:10 }}>
            <div style={{flex:1}}><label style={labelStyle}>동/읍/면</label><input type="text" value={dong} onChange={e=>setDong(e.target.value)} placeholder="논현동" style={inputStyle}/></div>
            <div style={{flex:1}}><label style={labelStyle}>건물명</label><input type="text" value={buildingName} onChange={e=>setBuildingName(e.target.value)} placeholder="건물명" style={inputStyle}/></div>
          </div>
          <label style={labelStyle}>상세주소</label>
          <input type="text" value={detailAddr} onChange={e=>setDetailAddr(e.target.value)} placeholder="상세주소 입력" style={{...inputStyle, marginBottom:10}}/>

          {/* 동/호수 (아파트인 경우) */}
          {propertyType === "아파트·오피스텔" && (
            <div style={{ display:"flex", gap:8, marginBottom:10 }}>
              <div style={{flex:1}}><label style={labelStyle}>동</label><input type="text" value={aptDong} onChange={e=>setAptDong(e.target.value)} placeholder="101동" style={inputStyle}/></div>
              <div style={{flex:1}}><label style={labelStyle}>호수</label><input type="text" value={hosu} onChange={e=>setHosu(e.target.value)} placeholder="405호" style={inputStyle}/></div>
            </div>
          )}
          {propertyType !== "아파트·오피스텔" && (
            <div style={{ marginBottom:10 }}>
              <label style={labelStyle}>호수</label>
              <input type="text" value={hosu} onChange={e=>setHosu(e.target.value)} placeholder="101호" style={inputStyle}/>
            </div>
          )}

          {/* 주소 공개 설정 */}
          <div style={{ background:"#f9fafb", padding:12, borderRadius:10, border:"1px solid #e5e7eb", marginBottom:12 }}>
            <div style={{ fontSize:13, fontWeight:700, color:"#374151", marginBottom:8 }}>🔒 주소 노출 범위</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
              {propertyType === "아파트·오피스텔" ? (
                <>
                  {["동/호수공개","동수공개","비공개"].map(opt => (
                    <label key={opt} style={{ display:"flex", alignItems:"center", gap:4, fontSize:13, cursor:"pointer", padding:"6px 10px", borderRadius:8, background: addressExposure===opt?"#eff6ff":"#fff", border: addressExposure===opt?"1px solid #3b82f6":"1px solid #d1d5db" }}>
                      <input type="radio" name="addrExp" checked={addressExposure===opt} onChange={()=>setAddressExposure(opt)} style={{accentColor:"#3b82f6"}}/>
                      {opt}
                    </label>
                  ))}
                </>
              ) : (
                <>
                  {["번지공개","본번지만공개","기본주소만공개"].map(opt => (
                    <label key={opt} style={{ display:"flex", alignItems:"center", gap:4, fontSize:13, cursor:"pointer", padding:"6px 10px", borderRadius:8, background: addressExposure===opt?"#eff6ff":"#fff", border: addressExposure===opt?"1px solid #3b82f6":"1px solid #d1d5db" }}>
                      <input type="radio" name="addrExp" checked={addressExposure===opt} onChange={()=>setAddressExposure(opt)} style={{accentColor:"#3b82f6"}}/>
                      {opt}
                    </label>
                  ))}
                </>
              )}
            </div>
          </div>

          <button type="button" onClick={handleGeocode} style={{ width:"100%", height:40, background:"#374151", color:"#fff", border:"none", borderRadius:8, fontSize:13, fontWeight:700, cursor:"pointer" }}>
            📍 좌표 자동설정
          </button>
          {coords && <div style={{ marginTop:6, fontSize:12, color:"#10b981", fontWeight:600 }}>✓ 좌표: {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</div>}
        </div>

        {/* 5. 추가 */}
        <div style={{ background:"#fff", borderRadius:14, padding:16, marginBottom:12, boxShadow:"0 1px 3px rgba(0,0,0,0.05)" }}>
          <div style={{ fontSize:16, fontWeight:800, color:"#111", marginBottom:14 }}>🏠 추가정보</div>
          <div style={{ display:"flex", gap:10, marginBottom:10 }}>
            <div style={{flex:1}}>
              <label style={labelStyle}>주차</label>
              <select value={parking} onChange={e=>setParking(e.target.value)} style={{...inputStyle,cursor:"pointer"}}>
                {["없음","가능","1대","2대"].map(o=><option key={o}>{o}</option>)}
              </select>
            </div>
            <div style={{flex:1}}>
              <label style={labelStyle}>입주가능일</label>
              <select value={moveInDate} onChange={e=>setMoveInDate(e.target.value)} style={{...inputStyle,cursor:"pointer"}}>
                {["즉시입주(공실)","1개월 이내","2개월 이내","3개월 이내","날짜 협의"].map(o=><option key={o}>{o}</option>)}
              </select>
            </div>
          </div>

          {/* 옵션 & 테마 & 주변환경 */}
          <div style={{ marginTop: 16, borderTop: "1px dashed #e5e7eb", paddingTop: 16 }}>
            {/* 테마 */}
            <label style={labelStyle}>테마 선택</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
              {currentThemeList.map(t => (
                <button key={t} type="button" onClick={()=>toggleTheme(t)} style={{ padding:"6px 12px", borderRadius:20, fontSize:13, fontWeight:600, cursor:"pointer", border: selectedThemes.includes(t)?"2px solid #3b82f6":"1px solid #d1d5db", background: selectedThemes.includes(t)?"#eff6ff":"#f8fafc", color: selectedThemes.includes(t)?"#2563eb":"#4b5563" }}>
                  {t.startsWith('#')?t:`#${t}`}
                </button>
              ))}
            </div>
            <div style={{ display:"flex", gap:6, marginBottom: 16 }}>
              <input type="text" value={customThemeInput} onChange={e=>setCustomThemeInput(e.target.value)} placeholder="직접 입력 (예: 반려동물)" style={{...inputStyle, flex:1}} onKeyDown={e=>{if(e.key==='Enter') {e.preventDefault(); addCustomTheme();}}} />
              <button type="button" onClick={addCustomTheme} style={{ background:"#374151", color:"#fff", border:"none", borderRadius:8, padding:"0 16px", fontWeight:700 }}>추가</button>
            </div>

            {/* 옵션 */}
            <label style={labelStyle}>옵션 선택</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
              {currentOptionList.map(opt => (
                <button key={opt} type="button" onClick={()=>toggleOption(opt)} style={{ padding:"6px 12px", borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer", border: selectedOptions.includes(opt)?"2px solid #3b82f6":"1px solid #d1d5db", background: selectedOptions.includes(opt)?"#eff6ff":"#fff", color: selectedOptions.includes(opt)?"#2563eb":"#4b5563" }}>
                  {opt}
                </button>
              ))}
            </div>
            <div style={{ display:"flex", gap:6, marginBottom: 16 }}>
              <input type="text" value={customOptionInput} onChange={e=>setCustomOptionInput(e.target.value)} placeholder="직접 입력 (예: 붙박이장)" style={{...inputStyle, flex:1}} onKeyDown={e=>{if(e.key==='Enter') {e.preventDefault(); addCustomOption();}}} />
              <button type="button" onClick={addCustomOption} style={{ background:"#374151", color:"#fff", border:"none", borderRadius:8, padding:"0 16px", fontWeight:700 }}>추가</button>
            </div>

            {/* 주변환경 (자동 검색) */}
            <label style={labelStyle}>주변환경 (좌표 기반 자동생성)</label>
            <div style={{ background:"#f9fafb", border:"1px solid #e5e7eb", borderRadius:8, padding:12, fontSize:13, color:"#6b7280" }}>
              {Object.keys(infrastructure).length > 0 ? (
                Object.entries(infrastructure).map(([category, items]: [string, any]) => (
                  <div key={category} style={{ marginBottom:6 }}>
                    <strong style={{ color:"#374151" }}>{category}:</strong> {Array.isArray(items) ? items.join(", ") : ""}
                  </div>
                ))
              ) : (
                "상단 소재지 '좌표 자동설정'을 누르면 주변 인프라가 자동 검색됩니다."
              )}
            </div>
          </div>

          <div style={{ marginTop: 16, borderTop: "1px dashed #e5e7eb", paddingTop: 16 }}>
            <label style={labelStyle}>전달사항 / 매물설명</label>
            <textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="매물에 대한 추가 설명을 입력하세요" rows={4} style={{ ...inputStyle, height:"auto", padding:12, resize:"vertical", lineHeight:1.5 }}/>
          </div>
        </div>

        {/* 6. 사진 */}
        <div style={{ background:"#fff", borderRadius:14, padding:16, marginBottom:12, boxShadow:"0 1px 3px rgba(0,0,0,0.05)" }}>
          <div style={{ fontSize:16, fontWeight:800, color:"#111", marginBottom:14 }}>📸 사진 ({photos.length}/5)</div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:10 }}>
            {photoPreview.map((src,i) => (
              <div key={i} style={{ position:"relative", width:80, height:80, borderRadius:10, overflow:"hidden" }}>
                <img src={src} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
                <button onClick={()=>removePhoto(i)} style={{ position:"absolute", top:2, right:2, width:22, height:22, borderRadius:"50%", background:"rgba(0,0,0,0.6)", color:"#fff", border:"none", fontSize:12, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
              </div>
            ))}
            {photos.length < 5 && (
              <label style={{ width:80, height:80, borderRadius:10, border:"2px dashed #d1d5db", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:28, color:"#9ca3af" }}>
                +<input type="file" accept="image/*" multiple hidden onChange={handlePhotoChange}/>
              </label>
            )}
          </div>
        </div>

        {/* 7. 등록자 */}
        <div style={{ background:"#fff", borderRadius:14, padding:16, marginBottom:12, boxShadow:"0 1px 3px rgba(0,0,0,0.05)" }}>
          <div style={{ fontSize:16, fontWeight:800, color:"#111", marginBottom:14 }}>👤 등록자 정보</div>
          <div style={{ display:"flex", gap:10 }}>
            <div style={{flex:1}}><label style={labelStyle}>이름</label><input type="text" value={clientName} onChange={e=>setClientName(e.target.value)} style={inputStyle}/></div>
            <div style={{flex:1}}><label style={labelStyle}>연락처</label><input type="tel" value={clientPhone} onChange={e=>setClientPhone(e.target.value)} placeholder="010-0000-0000" style={inputStyle}/></div>
          </div>
        </div>

        {/* 8. 부동산 전용 (REALTOR/ADMIN만) */}
        {isRealtor && (
          <div style={{ background:"#fff", borderRadius:14, padding:16, marginBottom:12, boxShadow:"0 1px 3px rgba(0,0,0,0.05)", border:"1px solid #dbeafe" }}>
            <div style={{ fontSize:16, fontWeight:800, color:"#2563eb", marginBottom:14 }}>🏘️ 부동산 전용</div>

            <label style={labelStyle}>공동중개 수수료</label>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:14 }}>
              {["공동중개 0%","공동중개 10%","공동중개 20%","공동중개 30%","공동중개 40%","공동중개 50%"].map(opt => (
                <button key={opt} type="button" onClick={()=>setRealtorCommission(opt)} style={{ padding:"8px 12px", borderRadius:8, fontSize:12, fontWeight: realtorCommission===opt?700:500, border: realtorCommission===opt?"2px solid #2563eb":"1px solid #d1d5db", background: realtorCommission===opt?"#eff6ff":"#fff", color: realtorCommission===opt?"#2563eb":"#374151", cursor:"pointer" }}>{opt}</button>
              ))}
            </div>

            <label style={labelStyle}>노출선택 <span style={{color:"#ef4444"}}>*</span></label>
            <div style={{ display:"flex", gap:10, marginBottom:14 }}>
              <div onClick={()=>setExposureType("부동산노출")} style={{ flex:1, padding:12, borderRadius:10, cursor:"pointer", border: exposureType==="부동산노출"?"2px solid #3b82f6":"1px solid #d1d5db", background: exposureType==="부동산노출"?"#eff6ff":"#fff" }}>
                <div style={{ fontSize:14, fontWeight:700, color: exposureType==="부동산노출"?"#2563eb":"#374151", marginBottom:4 }}>부동산노출</div>
                <div style={{ fontSize:11, color: exposureType==="부동산노출"?"#3b82f6":"#9ca3af", lineHeight:1.4 }}>부동산만 열람 가능, 일반인 비공개</div>
              </div>
              <div onClick={()=>setExposureType("부동산노출 + 일반인노출")} style={{ flex:1, padding:12, borderRadius:10, cursor:"pointer", border: exposureType==="부동산노출 + 일반인노출"?"2px solid #3b82f6":"1px solid #d1d5db", background: exposureType==="부동산노출 + 일반인노출"?"#eff6ff":"#fff" }}>
                <div style={{ fontSize:14, fontWeight:700, color: exposureType==="부동산노출 + 일반인노출"?"#2563eb":"#374151", marginBottom:4 }}>부동산+일반인</div>
                <div style={{ fontSize:11, color: exposureType==="부동산노출 + 일반인노출"?"#3b82f6":"#9ca3af" }}>모두에게 노출</div>
              </div>
            </div>

            {/* 임대인 정보 */}
            <div style={{ background:"#fff7ed", padding:12, borderRadius:10, border:"1px solid #fed7aa", borderLeft:"4px solid #ea580c" }}>
              <div style={{ fontSize:13, fontWeight:700, color:"#ea580c", marginBottom:8 }}>🔐 임대인 정보 (비공개)</div>
              <div style={{ display:"flex", gap:8, marginBottom:8 }}>
                <div style={{flex:1}}><label style={{...labelStyle,fontSize:12}}>임대인명</label><input type="text" value={landlordName} onChange={e=>setLandlordName(e.target.value)} placeholder="이름" style={inputStyle}/></div>
                <div style={{flex:1}}><label style={{...labelStyle,fontSize:12}}>연락처</label><input type="tel" value={landlordPhone} onChange={e=>setLandlordPhone(e.target.value)} placeholder="010-0000-0000" style={inputStyle}/></div>
              </div>
              <label style={{...labelStyle,fontSize:12}}>메모</label>
              <textarea value={landlordMemo} onChange={e=>setLandlordMemo(e.target.value)} placeholder="임대인 특이사항 등 중개사님만 보는 메모" rows={2} style={{...inputStyle, height:"auto", padding:10, resize:"vertical", lineHeight:1.4}}/>
            </div>
          </div>
        )}

        {/* 저장 버튼 */}
        <div style={{ position: "fixed", bottom: 65, left: 0, right: 0, background: "#fff", borderTop: "1px solid #e5e7eb", padding: "12px 16px", display: "flex", gap: 10, zIndex: 50 }}>
          <button type="button" disabled={submitting} onClick={()=>handleSubmit(isRealtor ? "ACTIVE" : "PENDING")}
            style={{ flex:1, height:52, background: submitting?"#9ca3af": isRealtor?"linear-gradient(135deg,#10b981,#059669)":"linear-gradient(135deg,#3b82f6,#2563eb)", color:"#fff", border:"none", borderRadius:12, fontSize:16, fontWeight:800, cursor: submitting?"not-allowed":"pointer", boxShadow: isRealtor?"0 4px 12px rgba(16,185,129,0.3)":"0 4px 12px rgba(37,99,235,0.3)" }}>
            {submitting ? "처리 중..." : editId ? "✅ 수정완료" : isRealtor ? "✅ 등록 (바로발행)" : "✅ 등록 (승인신청)"}
          </button>
          <button type="button" disabled={submitting} onClick={()=>handleSubmit("DRAFT")}
            style={{ height:52, padding:"0 20px", background:"#64748b", color:"#fff", border:"none", borderRadius:12, fontSize:14, fontWeight:700, cursor: submitting?"not-allowed":"pointer" }}>
            임시저장
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Page() { return <Suspense fallback={null}><MobileVacancyWrite/></Suspense>; }
