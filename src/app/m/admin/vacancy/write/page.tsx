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

  // 기타
  const [parking, setParking] = useState("없음");
  const [moveInDate, setMoveInDate] = useState("즉시입주(공실)");
  const [description, setDescription] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [coords, setCoords] = useState<{lat:number;lng:number}|null>(null);

  // 사진
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreview, setPhotoPreview] = useState<string[]>([]);

  const isCommercial = propertyType === "상가·사무실·건물·공장·토지";

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/m"); return; }
      const { data } = await supabase.from("members").select("id, name, phone").eq("id", user.id).single();
      if (data) { setMemberId(data.id); setUserName(data.name||""); setUserPhone(data.phone||""); setClientName(data.name||""); setClientPhone(data.phone||""); }
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
        if (d.parking) setParking(d.parking);
        if (d.move_in_date) setMoveInDate(d.move_in_date);
        if (d.description) setDescription(d.description);
        if (d.client_name) setClientName(d.client_name);
        if (d.client_phone) setClientPhone(d.client_phone);
        if (d.lat && d.lng) setCoords({lat:d.lat,lng:d.lng});
      }
      setLoadingEdit(false);
    })();
  }, [editId]);

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
            if (res.success && res.lat && res.lng) setCoords({lat:res.lat, lng:res.lng});
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
    if (res.success && res.lat && res.lng) { setCoords({lat:res.lat, lng:res.lng}); alert("좌표 설정 완료!"); }
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
        lat: coords?.lat, lng: coords?.lng,
        parking, move_in_date: moveInDate, description: description||undefined,
        client_name: clientName, client_phone: clientPhone,
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
          <div style={{ fontSize:16, fontWeight:800, color:"#111", marginBottom:14 }}>📐 면적·층수</div>
          <div style={{ display:"flex", gap:10, marginBottom:10 }}>
            <div style={{flex:1}}><label style={labelStyle}>전용면적(m²)</label><input type="number" value={exclusiveM2} onChange={e=>setExclusiveM2(e.target.value)} placeholder="59" style={inputStyle}/></div>
            <div style={{flex:1}}><label style={labelStyle}>공급면적(m²)</label><input type="number" value={supplyM2} onChange={e=>setSupplyM2(e.target.value)} placeholder="84" style={inputStyle}/></div>
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
          <label style={labelStyle}>전달사항 / 매물설명</label>
          <textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="매물에 대한 추가 설명을 입력하세요" rows={4} style={{ ...inputStyle, height:"auto", padding:12, resize:"vertical", lineHeight:1.5 }}/>
        </div>

        {/* 6. 의뢰인 */}
        <div style={{ background:"#fff", borderRadius:14, padding:16, marginBottom:12, boxShadow:"0 1px 3px rgba(0,0,0,0.05)" }}>
          <div style={{ fontSize:16, fontWeight:800, color:"#111", marginBottom:14 }}>👤 의뢰인 정보</div>
          <div style={{ display:"flex", gap:10 }}>
            <div style={{flex:1}}><label style={labelStyle}>이름</label><input type="text" value={clientName} onChange={e=>setClientName(e.target.value)} style={inputStyle}/></div>
            <div style={{flex:1}}><label style={labelStyle}>연락처</label><input type="tel" value={clientPhone} onChange={e=>setClientPhone(e.target.value)} placeholder="010-0000-0000" style={inputStyle}/></div>
          </div>
        </div>

        {/* 7. 사진 */}
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

        {/* 저장 버튼 */}
        <div style={{ display:"flex", gap:10 }}>
          <button type="button" disabled={submitting} onClick={()=>handleSubmit("PENDING")}
            style={{ flex:1, height:52, background: submitting?"#9ca3af":"linear-gradient(135deg,#3b82f6,#2563eb)", color:"#fff", border:"none", borderRadius:12, fontSize:16, fontWeight:800, cursor: submitting?"not-allowed":"pointer", boxShadow:"0 4px 12px rgba(37,99,235,0.3)" }}>
            {submitting ? "처리 중..." : editId ? "✅ 수정완료" : "✅ 등록 (승인신청)"}
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
