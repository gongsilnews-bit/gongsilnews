"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { getVacancyDetail, getAgencyInfo, getVacancies, updateVacancyStatus, deleteVacancy } from "@/app/actions/vacancy";
import { createClient } from "@/utils/supabase/client";
import "./vacancy-detail.css";

declare global {
  interface Window { kakao: any; }
}

interface VacancyDetailPanelProps {
  vacancyId: string;
  onBack: () => void;
  onEdit: () => void;
}

export default function VacancyDetailPanel({ vacancyId, onBack, onEdit }: VacancyDetailPanelProps) {
  const [vacancy, setVacancy] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deviceMode, setDeviceMode] = useState<"pc" | "tablet" | "mobile">("pc");
  const [activeTab, setActiveTab] = useState<"info" | "realtor">("info");
  
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [comments, setComments] = useState<any[]>([]);
  const [memoInput, setMemoInput] = useState("");

  // Realtor info
  const [realtorInfo, setRealtorInfo] = useState<any>(null);
  const [agencyInfo, setAgencyInfo] = useState<any>(null);

  // Comment section (inquiry)
  const [inquiryInput, setInquiryInput] = useState("");
  const [inquiries, setInquiries] = useState<any[]>([]);

  // Owner's other vacancies for registrant tab
  const [ownerVacancies, setOwnerVacancies] = useState<any[]>([]);
  const [realtorTradeType, setRealtorTradeType] = useState("전체");

  const mapRef = useRef<HTMLDivElement>(null);
  const roadviewRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    fetchData();
    const sub = supabase.channel(`vacancy_detail_${vacancyId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'vacancy_comments', filter: `vacancy_id=eq.${vacancyId}` }, (payload: any) => {
        setComments(prev => [...prev, payload.new]);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'property_inquiries', filter: `property_id=eq.${vacancyId}` }, (payload: any) => {
        setInquiries(prev => [payload.new, ...prev]);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'property_inquiries', filter: `property_id=eq.${vacancyId}` }, (payload: any) => {
        setInquiries(prev => prev.map(q => q.id === payload.new.id ? payload.new : q));
      })
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [vacancyId]);

  const fetchData = async () => {
    setLoading(true);
    const [res, { data: commentsData }, { data: inquiryData }] = await Promise.all([
      getVacancyDetail(vacancyId),
      supabase.from("vacancy_comments").select("*").eq("vacancy_id", vacancyId).order("created_at", { ascending: true }),
      supabase.from("property_inquiries").select("*").eq("property_id", vacancyId).order("created_at", { ascending: false })
    ]);
    if (res.success) {
      setVacancy(res.data);
      // Load realtor info
      if (res.data?.owner_id) {
        const { data: member } = await supabase.from("members").select("*").eq("id", res.data.owner_id).maybeSingle();
        if (member) setRealtorInfo(member);
        // Also load agency info for realtors
        if (member?.role === 'realtor' || res.data.owner_role === 'REALTOR') {
          const agencyRes = await getAgencyInfo(res.data.owner_id);
          if (agencyRes.success) setAgencyInfo(agencyRes.data);
        }
      }
    }
    if (commentsData) setComments(commentsData);
    if (inquiryData) setInquiries(inquiryData);

    // Fetch owner's other vacancies for registrant tab
    if (res.success && res.data?.owner_id) {
      const vacRes = await getVacancies({ ownerId: res.data.owner_id, all: false });
      if (vacRes.success) setOwnerVacancies(vacRes.data || []);
    }

    setLoading(false);
  };

  // Load Kakao Map
  const loadKakaoMap = useCallback((p: any) => {
    const searchAddr = [p.sido, p.sigungu, p.dong, p.detail_address].filter(Boolean).join(' ');
    if (!searchAddr) {
      if (mapRef.current) mapRef.current.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#999;font-size:13px;">주소 정보가 없습니다.</div>';
      if (roadviewRef.current) roadviewRef.current.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#999;font-size:13px;">주소 정보가 없습니다.</div>';
      return;
    }
    const kakaoApiKey = process.env.NEXT_PUBLIC_KAKAO_APP_KEY || "435d3602201a49ea712e5f5a36fe6efc";
    const doInit = () => {
      if (!window.kakao?.maps) return;
      window.kakao.maps.load(() => {
        const geocoder = new window.kakao.maps.services.Geocoder();
        geocoder.addressSearch(searchAddr, (result: any, status: any) => {
          if (status === window.kakao.maps.services.Status.OK) {
            const pos = new window.kakao.maps.LatLng(result[0].y, result[0].x);
            // Map
            if (mapRef.current) {
              mapRef.current.innerHTML = '';
              const map = new window.kakao.maps.Map(mapRef.current, { center: pos, level: 4 });
              new window.kakao.maps.Marker({ map, position: pos });
            }
            // Roadview
            if (roadviewRef.current) {
              roadviewRef.current.innerHTML = '';
              const rv = new window.kakao.maps.Roadview(roadviewRef.current);
              const client = new window.kakao.maps.RoadviewClient();
              client.getNearestPanoId(pos, 50, (panoId: any) => {
                if (panoId) rv.setPanoId(panoId, pos);
                else if (roadviewRef.current) roadviewRef.current.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#999;font-size:13px;">해당 위치의 로드뷰 정보가 없습니다.</div>';
              });
            }
          } else {
            if (mapRef.current) mapRef.current.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#999;font-size:13px;">지도 검색 실패</div>';
            if (roadviewRef.current) roadviewRef.current.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#999;font-size:13px;">로드뷰 검색 실패</div>';
          }
        });
      });
    };
    if (window.kakao?.maps) { doInit(); return; }
    const script = document.createElement('script');
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${kakaoApiKey}&libraries=services&autoload=false`;
    script.onload = doInit;
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (vacancy && activeTab === 'info') {
      setTimeout(() => loadKakaoMap(vacancy), 300);
    }
  }, [vacancy, activeTab, loadKakaoMap]);

  const submitComment = async () => {
    if (!memoInput.trim()) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return alert("로그인이 필요합니다.");
    const { data: member } = await supabase.from("members").select("name, role").eq("id", session.user.id).single();
    if (!member) return;
    await supabase.from("vacancy_comments").insert({
      vacancy_id: vacancyId,
      author_id: session.user.id,
      author_name: member.name || "사용자",
      author_role: member.role || "user",
      content: memoInput.trim()
    });
    setMemoInput("");
  };

  const submitInquiry = async () => {
    if (!inquiryInput.trim()) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return alert("로그인이 필요합니다.");
    const { data: member } = await supabase.from("members").select("name, role").eq("id", session.user.id).single();
    await supabase.from("property_inquiries").insert({
      property_id: vacancyId,
      author_id: session.user.id,
      realtor_id: vacancy?.user_id || null,
      content: inquiryInput.trim()
    });
    setInquiryInput("");
  };

  const toggleStatus = async () => {
    if (!vacancy) return;
    const isAdOn = vacancy.status === 'ACTIVE' || vacancy.status === 'PENDING';
    const next = isAdOn ? 'STOPPED' : 'ACTIVE';
    if (!confirm(isAdOn ? '광고를 종료하시겠습니까?' : '광고를 재개할까요?')) return;
    const res = await updateVacancyStatus(vacancy.id, next);
    if (res.success) setVacancy({ ...vacancy, status: next });
  };

  const copyShareLink = () => {
    const url = `https://gongsilnews.com/gongsil?id=${vacancyId}`;
    if (navigator.clipboard) navigator.clipboard.writeText(url).then(() => alert('공유 URL이 복사되었습니다.'));
  };

  if (loading) return <div className="gdv-page-body"><div style={{ textAlign: 'center', padding: '100px 20px', color: '#aaa', fontSize: 18 }}>⏳ 공실 데이터를 불러오는 중...</div></div>;
  if (!vacancy) return <div className="gdv-page-body"><div style={{ textAlign: 'center', padding: '100px 20px', color: '#aaa', fontSize: 18 }}>매물을 불러올 수 없습니다.</div></div>;

  const hasImages = vacancy.images && vacancy.images.length > 0;
  const images = hasImages ? vacancy.images : [];
  const propName = vacancy.building_name || vacancy.property_type || '공실매물';
  const isAdOn = vacancy.status === 'ACTIVE' || vacancy.status === 'PENDING';
  
  // Use the exact same formatAmount as GongsilClient (deposit is stored in 원)
  const formatAmount = (amt: number) => {
    if (!amt) return '';
    const m = Math.round(amt / 10000); // 원 → 만원
    if (m === 0) return '';
    const e = Math.floor(m / 10000); // 만원 → 억
    const r = m % 10000;
    let result = '';
    if (e > 0) result += `${e}억`;
    if (r > 0) {
      const c = Math.floor(r / 1000);
      const rem = r % 1000;
      let rest = '';
      if (c > 0) rest += `${c}천`;
      if (rem > 0) rest += `${rem}`;
      if (rest) {
        result += (result && !result.endsWith(' ') ? ' ' : '') + rest;
        if (e === 0 && c === 0 && rem > 0) result += '만';
      }
    }
    return result || '';
  };
  const priceStr = () => {
    const monthlyManwon = vacancy.monthly_rent ? Math.round(vacancy.monthly_rent / 10000) : 0;
    if (vacancy.trade_type === '매매') return `매매 ${formatAmount(vacancy.deposit)}`;
    if (vacancy.trade_type === '전세') return `전세 ${formatAmount(vacancy.deposit)}`;
    return `${formatAmount(vacancy.deposit)}/${monthlyManwon}만`;
  };

  // Use exact same field names as public listing
  const supArea = vacancy.supply_m2 ? parseFloat(vacancy.supply_m2) : 0;
  const excArea = vacancy.exclusive_m2 ? parseFloat(vacancy.exclusive_m2) : 0;
  const fmtM2 = (m2: number) => m2 ? `${m2}㎡(${(m2 / 3.3058).toFixed(1)}평)` : '';
  let areaDisplay = '-';
  if (supArea && excArea) areaDisplay = `${fmtM2(supArea)} / ${fmtM2(excArea)}`;
  else if (supArea) areaDisplay = fmtM2(supArea);
  else if (excArea) areaDisplay = fmtM2(excArea);

  const subInfoParts = [];
  if (vacancy.property_type) subInfoParts.push(vacancy.property_type);
  if (vacancy.direction) subInfoParts.push(vacancy.direction);
  if (areaDisplay !== '-') subInfoParts.push(`공급/전용 면적: ${areaDisplay}`);
  const subInfo = subInfoParts.join(' | ');

  const fmtDate = (dt: string) => {
    if (!dt) return '-';
    const d = new Date(dt);
    const pad = (n: number) => n < 10 ? '0' + n : n;
    return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}.`;
  };

  const getDeviceClass = () => {
    if (deviceMode === "tablet") return "gdv-tablet";
    if (deviceMode === "mobile") return "gdv-mobile";
    return "gdv-pc";
  };

  return (
    <div className="gdv-root gdv-page-body" style={{ flex: 1, overflowY: 'auto', height: '100%' }}>
      {/* Device Selector — centered across full width */}
      <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: '15px' }}>
        <div className="gdv-device-btns" style={{ transform: 'translateX(-150px)' }}>
          <button className={`gdv-device-btn ${deviceMode==='pc'?'gdv-active':''}`} onClick={() => setDeviceMode('pc')} title="PC">🖥️</button>
          <button className={`gdv-device-btn ${deviceMode==='tablet'?'gdv-active':''}`} onClick={() => setDeviceMode('tablet')} title="태블릿">📱</button>
          <button className={`gdv-device-btn ${deviceMode==='mobile'?'gdv-active':''}`} onClick={() => setDeviceMode('mobile')} title="모바일">📲</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '30px', width: '100%', alignItems: 'flex-start' }}>
        
        {/* Left Column — Preview */}
        <div style={{ flex: 1, minWidth: 0 }}>

          <div className={`gdv-preview-frame ${getDeviceClass()}`}>
            
            {/* Gallery — only show when images exist */}
            {hasImages && (
              <div className="gdv-gallery-wrap">
                <img src={images[galleryIndex]} alt="매물사진" />
                {images.length > 1 && (
                  <>
                    <button className="gdv-gallery-nav-btn gdv-prev" onClick={() => setGalleryIndex((i) => (i - 1 + images.length) % images.length)}>〈</button>
                    <button className="gdv-gallery-nav-btn gdv-next" onClick={() => setGalleryIndex((i) => (i + 1) % images.length)}>〉</button>
                  </>
                )}
                <span className="gdv-gallery-count">{galleryIndex + 1} / {images.length}</span>
              </div>
            )}

            {/* Header Info */}
            <div>
              <div className="gdv-prop-meta-row">
                <div>
                  <span className="gdv-tag-confirm">
                    {vacancy.realtor_commission || vacancy.commission_type || '법정수수료'}
                  </span>
                  <span style={{ fontSize: 13, color: '#fa5252', fontWeight: 'bold' }}>{vacancy.vacancy_no}</span>
                  <span className="gdv-prop-date">{fmtDate(vacancy.created_at)}</span>
                </div>
              </div>
              <div className="gdv-prop-name">{propName}</div>
              <div className="gdv-prop-price">{priceStr()}</div>
              <div className="gdv-prop-subinfo">{subInfo}</div>
              <div className="gdv-prop-desc-row">
                <span>룸 {vacancy.room_count || '-'}개</span>
                <span style={{ color: '#ddd' }}>|</span>
                <span>주차 {vacancy.parking || '정보없음'}</span>
                <span style={{ color: '#ddd' }}>|</span>
                <span>{Array.isArray(vacancy.options) ? vacancy.options.slice(0, 3).join(', ') : (vacancy.options || '옵션 미확인')}</span>
              </div>
            </div>

            {/* Toolbar */}
            <div className="gdv-article-toolbar">
              <button className="gdv-btn-toolbar" onClick={onBack}>➖ 목록</button>
              <button className="gdv-btn-toolbar" onClick={onEdit}>✏️ 수정</button>
              <button className="gdv-btn-toolbar" onClick={async () => { if(confirm('이 공실을 삭제하시겠습니까?')) { await deleteVacancy(vacancyId); onBack(); } }}>🗑️ 삭제</button>
              <button className="gdv-btn-toolbar" onClick={copyShareLink}>🔗 주소복사</button>
              <button className="gdv-btn-toolbar" onClick={() => window.open(`/gongsil?id=${vacancyId}`)}>💻 미리보기</button>
              <button className={`gdv-btn-toolbar ${isAdOn ? 'gdv-blue' : ''}`} onClick={toggleStatus}>
                {isAdOn ? '광고중' : '광고종료'}
              </button>
            </div>

            {/* Tabs */}
            <div className="gdv-detail-tabs">
              <div className={`gdv-tab-item ${activeTab === 'info' ? 'gdv-active' : ''}`} onClick={() => setActiveTab('info')}>매물정보</div>
              <div className={`gdv-tab-item ${activeTab === 'realtor' ? 'gdv-active' : ''}`} onClick={() => setActiveTab('realtor')}>등록자정보</div>
            </div>
            
            {/* Tab Contents */}
            {activeTab === 'info' ? (
              <div>
                {/* Info Grid */}
                <div className="gdv-info-grid">
                  <div className="gdv-info-label">매물번호</div><div className="gdv-info-value">{vacancy.vacancy_no || '-'}</div>
                  <div className="gdv-info-label">소재지</div><div className="gdv-info-value">{[vacancy.sido, vacancy.sigungu, vacancy.dong, vacancy.detail_address].filter(Boolean).join(' ')}</div>
                  <div className="gdv-info-label">매물특징</div><div className="gdv-info-value">{propName}</div>
                  <div className="gdv-info-label">공급/전용면적</div><div className="gdv-info-value">{areaDisplay}</div>
                  <div className="gdv-info-label">해당층/총층</div><div className="gdv-info-value">{vacancy.current_floor||'-'}층 / {vacancy.total_floor||'-'}층</div>
                  <div className="gdv-info-label">방/욕실수</div><div className="gdv-info-value">{vacancy.room_count||'-'}개 / {vacancy.bathroom_count||'-'}개</div>
                  <div className="gdv-info-label">방향</div><div className="gdv-info-value">{vacancy.direction || '-'}</div>
                  <div className="gdv-info-label">주차가능 여부</div><div className="gdv-info-value">{vacancy.parking || '없음'}</div>
                  <div className="gdv-info-label">입주가능일</div><div className="gdv-info-value">{vacancy.move_in_date || '즉시입주(공실)'}</div>
                  <div className="gdv-info-label">관리비</div><div className="gdv-info-value">{vacancy.maintenance_fee ? (vacancy.maintenance_fee / 10000) + '만원' : '없음'}</div>
                  <div className="gdv-info-label">상세설명</div><div className="gdv-info-value gdv-info-desc">{vacancy.description || ''}</div>
                </div>

                {/* Map Section */}
                <div className="gdv-extra-section">
                  <div className="gdv-extra-title">📍 위치정보</div>
                  <div ref={mapRef} className="gdv-map-box">로딩중...</div>
                </div>

                {/* Roadview Section */}
                <div className="gdv-extra-section">
                  <div className="gdv-extra-title">🛣️ 로드뷰</div>
                  <div ref={roadviewRef} className="gdv-map-box">로딩중...</div>
                </div>
              </div>
            ) : (
              <div style={{ padding: '20px 0' }}>
                <div className="gdv-realtor-card">
                  {agencyInfo ? (
                    <>
                      <div className="gdv-rc-name">{agencyInfo.name || vacancy.client_name || '-'}</div>
                      <div className="gdv-rc-sub">대표 {agencyInfo.ceo_name || '-'}{agencyInfo.reg_num ? ` | 등록번호 ${agencyInfo.reg_num}` : ''}</div>
                      <div className="gdv-rc-sub">{[agencyInfo.address, agencyInfo.address_detail].filter(Boolean).join(' ') || '-'}</div>
                      <div className="gdv-rc-phone">☎ {[agencyInfo.phone, agencyInfo.cell].filter(Boolean).join(', ') || vacancy.client_phone || '-'}</div>
                    </>
                  ) : realtorInfo ? (
                    realtorInfo.role === 'realtor' ? (
                      <>
                        <div className="gdv-rc-name">{realtorInfo.company_name || vacancy.client_name || '-'}</div>
                        <div className="gdv-rc-sub">대표 {realtorInfo.ceo_name || '-'}{realtorInfo.company_reg_no ? ` | 등록: ${realtorInfo.company_reg_no}` : ''}</div>
                        <div className="gdv-rc-sub">{[realtorInfo.address, realtorInfo.address_detail].filter(Boolean).join(' ')}</div>
                        <div className="gdv-rc-phone">☎ {[realtorInfo.tel_num, realtorInfo.cell_num].filter(Boolean).join(', ') || vacancy.client_phone || '-'}</div>
                      </>
                    ) : (
                      <>
                        <div className="gdv-rc-name">{realtorInfo.name || vacancy.client_name || '-'}</div>
                        <div className="gdv-rc-sub">일반 등록자</div>
                        <div className="gdv-rc-phone">☎ {vacancy.client_phone || realtorInfo.phone || '-'}</div>
                      </>
                    )
                  ) : (
                    <>
                      <div className="gdv-rc-name">{vacancy.client_name || '정보없음'}</div>
                      <div className="gdv-rc-sub">등록자</div>
                      <div className="gdv-rc-phone">☎ {vacancy.client_phone || '-'}</div>
                    </>
                  )}
                </div>

                {/* SNS Links */}
                {realtorInfo?.sns_links && Object.keys(realtorInfo.sns_links).filter(k => k !== 'api_info' && k !== 'api_list' && realtorInfo.sns_links[k]?.url).length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 16, padding: '0 4px' }}>
                    {Object.keys(realtorInfo.sns_links).filter(k => k !== 'api_info' && k !== 'api_list' && realtorInfo.sns_links[k]?.url).map(key => {
                      const link = realtorInfo.sns_links[key].url;
                      const validUrl = link.startsWith('http') ? link : `https://${link}`;
                      const titleNames: Record<string,string> = { homepage: '홈페이지', contact: '문의하기', shopping_mall: '쇼핑몰', blog: '블로그', cafe: '카페', youtube: '유튜브', facebook: '페이스북', twitter: '트위터', instagram: '인스타그램', kakao: '카카오', threads: '쓰레드' };
                      return (
                        <a key={key} href={validUrl} target="_blank" rel="noopener noreferrer" title={titleNames[key] || key}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '6px 14px', borderRadius: 20, background: '#f8f9fa', border: '1px solid #e0e0e0', color: '#444', fontSize: 13, fontWeight: 600, textDecoration: 'none', transition: 'all 0.2s' }}>
                          {titleNames[key] || key}
                        </a>
                      );
                    })}
                  </div>
                )}

                {/* Agency Intro */}
                {agencyInfo?.intro && (
                  <div style={{ marginTop: 16, padding: '12px 14px', background: '#f8f9fa', borderRadius: 8, fontSize: 13, color: '#444', border: '1px solid #eee', lineHeight: 1.5, wordBreak: 'keep-all' }}>
                    <div style={{ fontWeight: 'bold', fontSize: 12, color: '#888', marginBottom: 6 }}>부동산 소개</div>
                    {agencyInfo.intro}
                  </div>
                )}

                {/* Vacancy Stats */}
                {ownerVacancies.length > 0 && (
                  <div style={{ marginTop: 20 }}>
                    <div style={{ display: 'flex', background: '#f9f9f9', borderRadius: 8, overflow: 'hidden', border: '1px solid #eee' }}>
                      <div style={{ flex: 'none', padding: '12px 16px', fontSize: 13, fontWeight: 'bold', color: '#111', borderRight: '1px solid #eee', display: 'flex', alignItems: 'center' }}>공실등록현황</div>
                      <div style={{ display: 'flex', alignItems: 'center', padding: '0 16px', gap: 12, fontSize: 12, color: '#666', flexWrap: 'wrap' }}>
                        {[
                          { label: '전체', count: ownerVacancies.length },
                          { label: '매매', count: ownerVacancies.filter(v => v.trade_type === '매매').length },
                          { label: '전세', count: ownerVacancies.filter(v => v.trade_type === '전세').length },
                          { label: '월세', count: ownerVacancies.filter(v => v.trade_type === '월세').length },
                        ].map((stat, i, arr) => (
                          <React.Fragment key={stat.label}>
                            <span onClick={() => setRealtorTradeType(stat.label)}
                              style={{ cursor: 'pointer', color: realtorTradeType === stat.label ? '#1a73e8' : '#666', fontWeight: realtorTradeType === stat.label ? 'bold' : 'normal' }}>
                              {stat.label} <strong style={{color: realtorTradeType === stat.label ? '#1a73e8' : '#111'}}>{stat.count}</strong>
                            </span>
                            {i < arr.length - 1 && <span style={{width:1,height:12,background:'#ddd',display:'inline-block'}}></span>}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Owner's Property List */}
                {ownerVacancies.length > 0 && (
                  <div style={{ marginTop: 16, border: '1px solid #eee', borderRadius: 8, overflow: 'hidden' }}>
                    {ownerVacancies
                      .filter(v => realtorTradeType === '전체' || v.trade_type === realtorTradeType)
                      .slice(0, 10)
                      .map((vp: any) => (
                      <div key={vp.id}
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '14px 16px', borderBottom: '1px solid #f0f0f0', background: vp.id === vacancyId ? '#eaf4ff' : '#fff' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 'bold', color: '#111', marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{vp.building_name || vp.dong || '매물'}</div>
                          <div style={{ fontSize: 14, fontWeight: 800, color: '#1a73e8', marginBottom: 3 }}>{(() => {
                            const dep = vp.deposit || 0;
                            const monthly = vp.monthly_rent ? Math.round(vp.monthly_rent / 10000) : 0;
                            if (vp.trade_type === '매매') return `매매 ${formatAmount(dep)}`;
                            if (vp.trade_type === '전세') return `전세 ${formatAmount(dep)}`;
                            return `${formatAmount(dep)}/${monthly}만`;
                          })()}</div>
                          <div style={{ fontSize: 12, color: '#555' }}>{vp.property_type} | {vp.direction || '방향없음'} | {vp.exclusive_m2 ? `${vp.exclusive_m2}㎡` : '면적미상'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Inquiry / Comment Section (below tabs) */}
            <div className="gdv-comment-section">
              <div className="gdv-comment-header">📝 매물 문의 / 댓글</div>
              <div className="gdv-comment-input-box">
                <textarea value={inquiryInput} onChange={e => setInquiryInput(e.target.value)} placeholder="이 매물에 대해 궁금한 점을 남겨주세요." />
                <div className="gdv-comment-btn-row">
                  <span style={{ fontSize: 11, color: '#aaa' }}>비밀 댓글로 작성됩니다.</span>
                  <button className="gdv-comment-submit" onClick={submitInquiry}>등록</button>
                </div>
              </div>
              <div>
                {inquiries.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 20, color: '#aaa', fontSize: 13 }}>등록된 문의가 없습니다.</div>
                ) : (
                  inquiries.map(q => (
                    <div key={q.id} className="gdv-reply-item">
                      <div className="gdv-reply-meta">
                        <span className="gdv-reply-author">문의</span>
                        <span className="gdv-reply-date">{new Date(q.created_at).toLocaleString()}</span>
                      </div>
                      <div className="gdv-reply-content">{q.content}</div>
                      {q.answer && (
                        <div className="gdv-reply-answer-box">
                          <div className="gdv-reply-answer-lbl">등록자 답변</div>
                          <div className="gdv-reply-answer-txt">{q.answer}</div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Right Column (Sidebar) */}
        <div className="gdv-sidebar-wrap" style={{ marginRight: 220 }}>
          {/* Memo */}
          <div className="gdv-sidebar-card">
            <div className="gdv-sidebar-card-title">📝 공실기록</div>
            <textarea value={memoInput} onChange={e => setMemoInput(e.target.value)} placeholder="이곳에 서비스 메모를 남겨주세요..." style={{ width: '100%', height: '80px', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', resize: 'none', fontFamily: 'inherit', fontSize: '13px' }}></textarea>
            <div className="gdv-sidebar-memo-footer">
              <button onClick={submitComment} style={{ padding: '6px 14px', background: '#444', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}>등록</button>
            </div>
            <ul className="gdv-sidebar-log-list">
              {comments.length === 0 ? (
                <li className="gdv-log-empty">등록된 로그가 없습니다.</li>
              ) : (
                comments.slice().reverse().map((c, i) => (
                  <li key={c.id || i} className="gdv-log-item">
                    <div className="gdv-log-num">{i + 1}</div>
                    <div className="gdv-log-content">
                      <div className="gdv-log-title">{c.content}</div>
                      <div className="gdv-log-meta">{c.author_name || '사용자'} · {new Date(c.created_at).toLocaleString()}</div>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>

          {/* Recent Logs */}
          <div className="gdv-sidebar-card">
            <div className="gdv-sidebar-card-title">🕐 공실메모기록</div>
            <div style={{ fontSize: 13, color: '#555', paddingTop: 4 }}>
              {[
                { label: '작성', date: vacancy.created_at },
                { label: '최근 수정', date: vacancy.updated_at }
              ].filter(l => l.date).map((l, i) => (
                <div key={i} className="gdv-log-item">
                  <div className="gdv-log-num">{i + 1}</div>
                  <div className="gdv-log-content">
                    <div className="gdv-log-title">{l.label}</div>
                    <div className="gdv-log-meta">{new Date(l.date).toLocaleString('ko-KR')}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
