"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { generateFlyerHtml, COLORS, LAYOUTS } from "@/components/mobile/flyer-generator";

function FlyerWriteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const vacancyId = searchParams.get("vacancy_id");

  // Authentication & Loading States
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [vacancy, setVacancy] = useState<any>(null);
  const [vacancyPhotos, setVacancyPhotos] = useState<any[]>([]);
  const [photoPickerOpen, setPhotoPickerOpen] = useState<{ open: boolean; targetKey: string }>({ open: false, targetKey: "" });
  
  // Modal for share options after saving
  const [showShareModal, setShowShareModal] = useState(false);

  // Active Tab: 'basic' | 'text' | 'photos' | 'custom' | 'agent'
  const [activeTab, setActiveTab] = useState<'basic' | 'text' | 'photos' | 'custom' | 'agent'>('basic');

  // Main Flyer State
  const [state, setState] = useState<any>({
    info: {
      promotionText: "",
      address: "",
      subTitle: "",
      transactionType: "매매",
      priceMain: "",
      priceSub: "",
      managementFee: "",
      area: "",
      floor: "",
      direction: "",
      roomCount: "",
      parking: "",
      moveInDate: "",
      options: "",
      sections: [],
      agentName: "",
      agentRepresentative: "",
      agentPhone: "",
      agentMobile: "",
      agentAdditionalInfo: [],
      noticeTitle: "중개사 코멘트",
      noticeContent: ""
    },
    mainImage: null,
    subImage1: null,
    subImage2: null,
    featureImage1: null,
    featureImage2: null,
    mapImage: null,
    customQrImage: null,
    agentImage: null,
    colorTheme: COLORS[0],
    layoutTheme: LAYOUTS[0]
  });

  // Load Vacancy Detail on mount
  useEffect(() => {
    if (!vacancyId) {
      alert("공실 ID가 지정되지 않았습니다.");
      router.push("/m/admin/vacancy");
      return;
    }

    async function loadData() {
      try {
        const res = await fetch(`/api/vacancy/detail?id=${vacancyId}`);
        if (res.status === 401 || res.status === 403) {
          alert("로그인이 필요하거나 권한이 없습니다.");
          router.push("/m");
          return;
        }
        const json = await res.json();
        if (json.success && json.data) {
          const v = json.data;
          setVacancy(v);
          setVacancyPhotos(json.photos || []);

          // Map photos to standard slots if not previously saved
          const newImages: any = {};
          const imageSlots = [
            'mainImage',
            'subImage1',
            'subImage2',
            'featureImage1',
            'featureImage2'
          ];
          (json.photos || []).forEach((photo: any, index: number) => {
            if (index < imageSlots.length) {
              newImages[imageSlots[index]] = photo.url;
            }
          });

          // Check if there is an existing saved flyer/report state
          let savedState = json.flyer?.flyer_state;
          if (savedState) {
            if ('flyer' in savedState) {
              savedState = savedState.flyer;
            } else if ('report' in savedState) {
              savedState = null; // Ignore report settings
            }
          }

          if (savedState) {
            setState((prev: any) => ({
              ...prev,
              ...savedState,
              info: {
                ...prev.info,
                ...savedState.info
              }
            }));
          } else {
            // First time: Map vacancy database columns to the editor state
            const dongBunji = [v.dong, v.detail_addr].filter(Boolean).join(" ");
            const locationName = [dongBunji, v.building_name].filter(Boolean).join(" ");
            
            const formatAmount = (amt: number) => {
              if (!amt) return '';
              const m = Math.round(amt / 10000);
              if (m === 0) return '';
              const e = Math.floor(m / 10000);
              const r = m % 10000;
              let res = '';
              if (e > 0) res += `${e}억`;
              if (r > 0) res += `${res ? ' ' : ''}${r}천`;
              return res || '';
            };

            const supArea = v.supply_m2 ? parseFloat(v.supply_m2) : 0;
            const excArea = v.exclusive_m2 ? parseFloat(v.exclusive_m2) : 0;
            const fmtM2 = (m2: number) => m2 ? `${m2}㎡(${(m2 / 3.3058).toFixed(1)}평)` : '';
            let areaDisplay = '-';
            if (supArea && excArea) areaDisplay = `공급 ${fmtM2(supArea)} / 전용 ${fmtM2(excArea)}`;
            else if (supArea) areaDisplay = `공급 ${fmtM2(supArea)}`;
            else if (excArea) areaDisplay = `전용 ${fmtM2(excArea)}`;

            const owner = v.members || {};
            const agency = Array.isArray(owner.agencies) ? owner.agencies[0] : owner.agencies;

            // Agent Additional info array
            const addInfo = [];
            if (agency?.ceo_name || owner.name) addInfo.push(`대표자: ${agency?.ceo_name || owner.name}`);
            if (agency?.address || owner.address) addInfo.push(`주소: ${[agency?.address || owner.address, agency?.address_detail || owner.address_detail].filter(Boolean).join(" ")}`);
            if (agency?.reg_num || owner.company_reg_no) addInfo.push(`등록번호: ${agency?.reg_num || owner.company_reg_no}`);

            // Auto Color Theme based on building brand name
            let autoColor = COLORS[0];
            const lowerBuilding = (v.building_name || "").toLowerCase();
            if (lowerBuilding.includes("롯데") || lowerBuilding.includes("캐슬")) autoColor = COLORS[1];
            else if (lowerBuilding.includes("푸르지오")) autoColor = COLORS[2];
            else if (lowerBuilding.includes("힐스") || lowerBuilding.includes("현대")) autoColor = COLORS[3];
            else if (lowerBuilding.includes("아크로") || lowerBuilding.includes("자이")) autoColor = COLORS[4];

            setState((prev: any) => ({
              ...prev,
              ...newImages,
              colorTheme: autoColor,
              info: {
                ...prev.info,
                promotionText: `${v.building_name || "최적의 입지"} 공실 매물`,
                address: locationName || "공실 매물 정보",
                subTitle: `${v.sub_category || v.property_type || "프리미엄"} | ${v.direction || "방향 없음"} | ${areaDisplay}`,
                transactionType: v.trade_type || "월세",
                priceMain: formatAmount(v.deposit),
                priceSub: v.monthly_rent ? `${Math.round(v.monthly_rent / 10000)}만` : "",
                managementFee: v.maintenance_fee ? `${Math.round(v.maintenance_fee / 10000)}만원` : "없음",
                area: areaDisplay,
                floor: `${v.current_floor || "-"}층 / 총 ${v.total_floor || "-"}층`,
                direction: v.direction || "남향",
                roomCount: v.room_count && v.bathroom_count ? `${v.room_count}개 / ${v.bathroom_count}개` : `${v.room_count || "-"}개`,
                parking: v.parking || "협의",
                moveInDate: v.move_in_date || "즉시 입주가능",
                options: Array.isArray(v.options) ? v.options.join(", ") : (v.options || ""),
                agentName: agency?.name || owner.company_name || owner.name || "공실뉴스 중개소",
                agentRepresentative: owner.name || v.client_name || "담당자명",
                agentPhone: agency?.phone || owner.phone || owner.tel_num || v.client_phone || "",
                agentMobile: owner.cellphone || owner.phone || owner.cell_num || agency?.cell || v.client_phone || "",
                agentAdditionalInfo: addInfo,
                noticeContent: v.memo || "역세권 우수한 입지와 깔끔한 컨디션을 자랑하는 특급 추천 매물입니다. 상세 정보는 문의해 주시기 바랍니다."
              }
            }));
          }
        }
      } catch (err) {
        console.error("Error loading vacancy details:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [vacancyId]);

  // Update a field inside info state
  const handleUpdateInfo = (key: string, value: any) => {
    setState((prev: any) => ({
      ...prev,
      info: {
        ...prev.info,
        [key]: value
      }
    }));
  };

  // Image Upload helper
  const handleFileUpload = async (key: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("vacancyId", vacancyId || "");

    try {
      const res = await fetch("/api/vacancy/upload-image", {
        method: "POST",
        body: formData
      });
      const json = await res.json();
      if (json.success && json.url) {
        setState((prev: any) => ({
          ...prev,
          [key]: json.url
        }));
      } else {
        alert("이미지 업로드에 실패했습니다: " + (json.error || "알 수 없는 오류"));
      }
    } catch (err: any) {
      alert("이미지 업로드 중 오류가 발생했습니다: " + err.message);
    }
  };

  // Save the flyer to Supabase
  const handleSaveFlyer = async () => {
    if (saving) return;
    setSaving(true);

    try {
      // Compile current state to full standalone HTML using the flyer-generator template
      const compiledHtml = generateFlyerHtml(state);

      const res = await fetch("/api/vacancy/save-flyer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vacancyId,
          flyerState: {
            ...state,
            htmlContent: compiledHtml
          },
          type: "flyer"
        })
      });

      const json = await res.json();
      if (json.success) {
        // Show success share modal
        setShowShareModal(true);
      } else {
        alert("전단지 저장 중 오류가 발생했습니다: " + (json.error || "서버 응답 오류"));
      }
    } catch (err: any) {
      alert("전단지 저장 실패: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleShareModalCopyLink = () => {
    const shareUrl = `${window.location.origin}/flyer/${vacancyId}.html`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      alert("전단지 링크가 클립보드에 복사되었습니다!");
    }).catch(() => {
      const textArea = document.createElement("textarea");
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      alert("전단지 링크가 클립보드에 복사되었습니다!");
    });
  };

  const handleShareModalKakao = () => {
    const Kakao = (window as any).Kakao;
    if (!Kakao || !Kakao.isInitialized()) {
      alert("카카오 SDK 로딩 중입니다. 다시 시도해 주세요.");
      return;
    }
    const shareUrl = `${window.location.origin}/flyer/${vacancyId}.html`;
    Kakao.Share.sendDefault({
      objectType: "feed",
      content: {
        title: state.info.address,
        description: state.info.promotionText || "공실뉴스 온라인 전단지입니다.",
        imageUrl: state.mainImage || "https://gongsilnews.com/logo.png",
        link: { mobileWebUrl: shareUrl, webUrl: shareUrl },
      },
      buttons: [
        { title: "전단지 열기", link: { mobileWebUrl: shareUrl, webUrl: shareUrl } },
      ],
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-500 font-semibold p-4">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-sm">매물 정보 분석 중...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-28 text-gray-900 font-sans flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 bg-slate-900 text-white px-4 py-3.5 flex items-center justify-between shadow-md z-40">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/m/admin/vacancy")} className="p-1 text-gray-400 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <span className="font-extrabold text-base tracking-tight text-white">AI 온라인전단지 모바일 제작기</span>
        </div>
        <span className="bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider shadow-sm">Online</span>
      </header>

      {/* Tabs Menu */}
      <div className="sticky top-[52px] bg-white border-b border-gray-200 flex overflow-x-auto scrollbar-none shadow-sm z-30">
        {[
          { id: 'basic', label: '🎨 기본/테마' },
          { id: 'text', label: '📝 홍보/스펙' },
          { id: 'photos', label: '🖼️ 사진매핑' },
          { id: 'custom', label: '💬 소개코멘트' },
          { id: 'agent', label: '🏢 중개사정보' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4.5 py-3 text-xs font-black shrink-0 border-b-2 transition-all ${
              activeTab === tab.id
                ? 'border-emerald-600 text-emerald-600 bg-emerald-50/20'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Form Fields */}
      <main className="p-4 flex-1 flex flex-col gap-6 max-w-md mx-auto w-full">
        
        {/* Tab 1: Basic Theme Settings */}
        {activeTab === 'basic' && (
          <div className="flex flex-col gap-5">
            {/* Color Theme Selector */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <label className="block text-sm font-bold text-gray-800 mb-3">🎨 전단지 메인 색상 선택</label>
              <div className="flex gap-4 justify-around mt-1">
                {COLORS.map(color => (
                  <button
                    key={color.id}
                    onClick={() => setState((prev: any) => ({ ...prev, colorTheme: color }))}
                    className={`w-10 h-10 rounded-full border-4 flex items-center justify-center transition-all ${
                      state.colorTheme?.id === color.id ? 'border-gray-900 scale-110 shadow' : 'border-transparent opacity-80'
                    }`}
                    style={{ backgroundColor: color.primary }}
                    title={color.name}
                  >
                    {state.colorTheme?.id === color.id && (
                      <span className="text-white text-xs font-black">✓</span>
                    )}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-gray-400 text-center font-bold mt-3 uppercase tracking-wider">{state.colorTheme?.name}</p>
            </div>

            {/* Layout Style Selector */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <label className="block text-sm font-bold text-gray-800 mb-3">📐 디자인 레이아웃 타입</label>
              <div className="flex flex-col gap-2.5">
                {LAYOUTS.map(lay => (
                  <button
                    key={lay.id}
                    onClick={() => setState((prev: any) => ({ ...prev, layoutTheme: lay }))}
                    className={`flex items-center justify-between p-3.5 rounded-xl border text-left transition-all ${
                      state.layoutTheme?.id === lay.id
                        ? 'border-emerald-600 bg-emerald-50/20 text-emerald-700 font-extrabold shadow-sm'
                        : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-xs">{lay.name}</span>
                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Type {lay.type.slice(-1)}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Text / Promotion Info */}
        {activeTab === 'text' && (
          <div className="flex flex-col gap-5">
            {/* Promotion / Title */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col gap-4">
              <h3 className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2">📂 표지 및 제목 설정</h3>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5">홍보용 메인 카피 문구</label>
                <input
                  type="text"
                  value={state.info.promotionText}
                  onChange={(e) => handleUpdateInfo("promotionText", e.target.value)}
                  className="w-full text-xs p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-emerald-500"
                  placeholder="예: 햇살 가득한 남향, 올수리 완료"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5">매물 대표 이름 (위치 정보)</label>
                <input
                  type="text"
                  value={state.info.address}
                  onChange={(e) => handleUpdateInfo("address", e.target.value)}
                  className="w-full text-xs p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-emerald-500"
                  placeholder="예: 반포 자이 30평형"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5">서브 스펙 요약 라인</label>
                <input
                  type="text"
                  value={state.info.subTitle}
                  onChange={(e) => handleUpdateInfo("subTitle", e.target.value)}
                  className="w-full text-xs p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-emerald-500"
                  placeholder="예: 특올수리 | 입주협의 | 로얄동"
                />
              </div>
            </div>

            {/* Price Details */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col gap-4">
              <h3 className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2">💰 금액/거래 조건 설정</h3>
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5">거래 방식</label>
                  <select
                    value={state.info.transactionType}
                    onChange={(e) => handleUpdateInfo("transactionType", e.target.value)}
                    className="w-full text-xs p-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="매매">매매</option>
                    <option value="전세">전세</option>
                    <option value="월세">월세</option>
                    <option value="단기임대">단기임대</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5">보증금 / 매매가</label>
                  <input
                    type="text"
                    value={state.info.priceMain}
                    onChange={(e) => handleUpdateInfo("priceMain", e.target.value)}
                    className="w-full text-xs p-3 border border-gray-200 rounded-xl focus:outline-none"
                    placeholder="예: 10억 5천 또는 5,000"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5">월세 (해당 시)</label>
                  <input
                    type="text"
                    value={state.info.priceSub}
                    onChange={(e) => handleUpdateInfo("priceSub", e.target.value)}
                    className="w-full text-xs p-3 border border-gray-200 rounded-xl focus:outline-none"
                    placeholder="예: 120"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5">월 관리비</label>
                  <input
                    type="text"
                    value={state.info.managementFee}
                    onChange={(e) => handleUpdateInfo("managementFee", e.target.value)}
                    className="w-full text-xs p-3 border border-gray-200 rounded-xl focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Spec Details */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col gap-4">
              <h3 className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2">📐 매물 주요 규격 스펙</h3>
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5">공급 / 전용면적</label>
                  <input
                    type="text"
                    value={state.info.area}
                    onChange={(e) => handleUpdateInfo("area", e.target.value)}
                    className="w-full text-xs p-3 border border-gray-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5">해당층 / 총층수</label>
                  <input
                    type="text"
                    value={state.info.floor}
                    onChange={(e) => handleUpdateInfo("floor", e.target.value)}
                    className="w-full text-xs p-3 border border-gray-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5">방향 (거실 기준)</label>
                  <input
                    type="text"
                    value={state.info.direction}
                    onChange={(e) => handleUpdateInfo("direction", e.target.value)}
                    className="w-full text-xs p-3 border border-gray-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5">방 / 욕실수</label>
                  <input
                    type="text"
                    value={state.info.roomCount}
                    onChange={(e) => handleUpdateInfo("roomCount", e.target.value)}
                    className="w-full text-xs p-3 border border-gray-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5">주차 대수</label>
                  <input
                    type="text"
                    value={state.info.parking}
                    onChange={(e) => handleUpdateInfo("parking", e.target.value)}
                    className="w-full text-xs p-3 border border-gray-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5">입주가능일</label>
                  <input
                    type="text"
                    value={state.info.moveInDate}
                    onChange={(e) => handleUpdateInfo("moveInDate", e.target.value)}
                    className="w-full text-xs p-3 border border-gray-200 rounded-xl"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5">제공 옵션 목록</label>
                <input
                  type="text"
                  value={state.info.options}
                  onChange={(e) => handleUpdateInfo("options", e.target.value)}
                  className="w-full text-xs p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-emerald-500"
                  placeholder="예: 에어컨, 세탁기, 냉장고 풀옵션"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Photos Mapping */}
        {activeTab === 'photos' && (
          <div className="flex flex-col gap-5">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col gap-4">
              <h3 className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2">🖼️ 전단지 대표 사진 설정</h3>
              <p className="text-[11px] text-gray-400 font-bold -mt-2">온라인 전단지 메인에 나타날 매물 사진을 맵핑해 주세요.</p>
              
              {[
                { key: "mainImage", label: "표지 메인사진 (Hero)" },
                { key: "subImage1", label: "서브 상세사진 1" },
                { key: "subImage2", label: "서브 상세사진 2" },
                { key: "featureImage1", label: "특징 상세사진 1" },
                { key: "featureImage2", label: "특징 상세사진 2" }
              ].map(slot => (
                <div key={slot.key} className="flex flex-col gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-700">{slot.label}</span>
                    <button
                      onClick={() => setPhotoPickerOpen({ open: true, targetKey: slot.key })}
                      className="text-xs bg-white border border-gray-200 text-emerald-600 font-bold px-2.5 py-1 rounded-lg active:scale-95 transition-all shadow-xs"
                    >
                      사진 변경
                    </button>
                  </div>
                  
                  {state[slot.key] ? (
                    <div className="h-32 w-full rounded-lg overflow-hidden border border-gray-200 relative bg-slate-100">
                      <img src={state[slot.key]} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="h-32 w-full rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-400 text-xs font-semibold">
                      등록된 사진 없음
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: Notice Comment */}
        {activeTab === 'custom' && (
          <div className="flex flex-col gap-5">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col gap-3">
              <h3 className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2">💬 소개 코멘트 설정</h3>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5">코멘트 상단 제목</label>
                <input
                  type="text"
                  value={state.info.noticeTitle}
                  onChange={(e) => handleUpdateInfo("noticeTitle", e.target.value)}
                  className="w-full text-xs p-3 border border-gray-200 rounded-xl"
                  placeholder="예: 중개사 추천 포인트"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5">상세 소개 코멘트 내용</label>
                <textarea
                  rows={6}
                  value={state.info.noticeContent}
                  onChange={(e) => handleUpdateInfo("noticeContent", e.target.value)}
                  className="w-full text-xs p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-emerald-500"
                  placeholder="매물 소개 문구를 자유롭게 기입하세요."
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Agent Info */}
        {activeTab === 'agent' && (
          <div className="flex flex-col gap-5">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col gap-4">
              <h3 className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2">🏢 공인중개사사무소 정보</h3>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5">중개사무소 명칭</label>
                <input
                  type="text"
                  value={state.info.agentName}
                  onChange={(e) => handleUpdateInfo("agentName", e.target.value)}
                  className="w-full text-xs p-3 border border-gray-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5">대표 중개사 성명</label>
                <input
                  type="text"
                  value={state.info.agentRepresentative}
                  onChange={(e) => handleUpdateInfo("agentRepresentative", e.target.value)}
                  className="w-full text-xs p-3 border border-gray-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5">일반 사무실 번호</label>
                <input
                  type="text"
                  value={state.info.agentPhone}
                  onChange={(e) => handleUpdateInfo("agentPhone", e.target.value)}
                  className="w-full text-xs p-3 border border-gray-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5">휴대전화 번호</label>
                <input
                  type="text"
                  value={state.info.agentMobile}
                  onChange={(e) => handleUpdateInfo("agentMobile", e.target.value)}
                  className="w-full text-xs p-3 border border-gray-200 rounded-xl"
                />
              </div>
            </div>

            {/* Additional info lines */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col gap-4">
              <h3 className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2">📝 추가 표시 정보 (주소, 등록번호 등)</h3>
              {state.info.agentAdditionalInfo?.map((line: string, idx: number) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-400 shrink-0">#{idx + 1}</span>
                  <input
                    type="text"
                    value={line}
                    onChange={(e) => {
                      const val = e.target.value;
                      const arr = [...state.info.agentAdditionalInfo];
                      arr[idx] = val;
                      handleUpdateInfo("agentAdditionalInfo", arr);
                    }}
                    className="w-full text-xs p-3 border border-gray-200 rounded-xl"
                  />
                </div>
              ))}
              <button
                onClick={() => {
                  handleUpdateInfo("agentAdditionalInfo", [...(state.info.agentAdditionalInfo || []), ""]);
                }}
                className="w-full py-2 bg-gray-50 text-gray-600 border border-dashed border-gray-200 rounded-xl text-xs font-bold"
              >
                ＋ 정보 한 줄 더 추가하기
              </button>
            </div>
          </div>
        )}

      </main>

      {/* Floating Bottom action bar */}
      <footer className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 p-4 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] flex gap-3 z-40">
        <button
          onClick={() => router.push("/m/admin/vacancy")}
          className="flex-1 py-3.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-bold active:scale-95 transition-all text-center"
        >
          취소
        </button>
        <button
          onClick={handleSaveFlyer}
          disabled={saving}
          className="flex-[2] py-3.5 bg-emerald-600 text-white rounded-xl text-sm font-extrabold active:scale-95 transition-all shadow-md shadow-emerald-200 flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>저장 중...</span>
            </>
          ) : (
            <span>💾 저장하고 공유하기</span>
          )}
        </button>
      </footer>

      {/* PHOTO PICKER MODAL */}
      {photoPickerOpen.open && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-t-2xl max-h-[80vh] flex flex-col shadow-2xl">
            <div className="px-4 py-3.5 border-b border-gray-100 flex justify-between items-center">
              <span className="font-extrabold text-sm text-gray-800">매물 사진 선택</span>
              <button
                onClick={() => setPhotoPickerOpen({ open: false, targetKey: "" })}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1">
              {/* Native Upload Button */}
              <div className="mb-4">
                <label className="w-full py-3 border-2 border-dashed border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors flex flex-col items-center justify-center rounded-xl cursor-pointer">
                  <svg className="w-6 h-6 text-gray-400 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                  <span className="text-xs font-bold text-gray-500">내 기기에서 직접 업로드</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleFileUpload(photoPickerOpen.targetKey, file);
                        setPhotoPickerOpen({ open: false, targetKey: "" });
                      }
                    }}
                  />
                </label>
              </div>

              {/* Vacancy Existing Photos */}
              <h4 className="text-xs font-bold text-gray-400 mb-2.5">업로드된 매물 원본 사진 목록</h4>
              {vacancyPhotos.length === 0 ? (
                <div className="text-center py-8 text-xs text-gray-400">등록된 매물 사진이 없습니다.</div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {vacancyPhotos.map((photo: any) => (
                    <div
                      key={photo.id}
                      onClick={() => {
                        setState((prev: any) => ({
                          ...prev,
                          [photoPickerOpen.targetKey]: photo.url
                        }));
                        setPhotoPickerOpen({ open: false, targetKey: "" });
                      }}
                      className="aspect-square rounded-lg overflow-hidden border border-gray-100 relative cursor-pointer active:scale-95 transition-transform"
                    >
                      <img src={photo.url} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SHARE / COMPLETED POPUP MODAL */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/55 flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl text-center flex flex-col gap-4">
            <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-600 text-2xl">
              ✓
            </div>
            <div>
              <h3 className="font-extrabold text-base text-gray-900">온라인 전단지 저장 완료!</h3>
              <p className="text-xs text-gray-500 mt-1">전단지가 성공적으로 저장되었습니다. 카톡 공유나 복사된 링크를 사용하여 전송해 보세요.</p>
            </div>
            
            <div className="flex flex-col gap-2 mt-2">
              <button
                onClick={handleShareModalKakao}
                className="w-full py-3 bg-[#fee500] hover:bg-[#fee500]/90 text-[#191919] rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2"
              >
                💬 카카오톡 공유하기
              </button>
              <button
                onClick={handleShareModalCopyLink}
                className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-black transition-all"
              >
                🔗 링크 주소 복사하기
              </button>
              <button
                onClick={() => {
                  setShowShareModal(false);
                  router.push("/m/admin/vacancy");
                }}
                className="w-full py-3 bg-slate-900 text-white rounded-xl text-xs font-bold transition-all mt-1"
              >
                목록으로 이동
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function FlyerWritePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500 font-semibold">
        <span>로딩 중...</span>
      </div>
    }>
      <FlyerWriteContent />
    </Suspense>
  );
}
