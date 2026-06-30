"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { generateReportHtml, COLORS, LAYOUTS } from "@/components/mobile/report-generator";

function ReportWriteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const vacancyId = searchParams.get("vacancy_id");

  // Authentication & State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [vacancy, setVacancy] = useState<any>(null);
  const [vacancyPhotos, setVacancyPhotos] = useState<any[]>([]);
  const [photoPickerOpen, setPhotoPickerOpen] = useState<{ open: boolean; targetKey: string }>({ open: false, targetKey: "" });
  
  // Modal for share options after saving
  const [showShareModal, setShowShareModal] = useState(false);

  // Active Tab: 'basic' | 'content' | 'photos' | 'lease' | 'location' | 'roadmap'
  const [activeTab, setActiveTab] = useState<'basic' | 'content' | 'photos' | 'lease' | 'location' | 'roadmap'>('basic');

  // Page Visibility: pages 1 to 6 can be turned on/off
  const [visiblePages, setVisiblePages] = useState<number[]>([1, 2, 3, 4, 5, 6]);

  // Main Report State
  const [state, setState] = useState<any>({
    info: {
      address: "",
      subTitle: "",
      coverSubtitle: "부동산 물건 보고서",
      agentLabel: "PREPARED BY",
      agentName: "",
      agentRepresentative: "",
      agencyRepresentative: "",
      agentPhone: "",
      agentMobile: "",
      agentRegistrationNumber: "",
      agentAddress: "",
      coverQRLink: "",
      priceMain: "",
      priceSub: "",
      transactionType: "매매",
      managementFee: "",
      area: "",
      floor: "",
      direction: "",
      parking: "",
      moveInDate: "",
      options: "",
      overviewTitle: "PROPERTY OVERVIEW",
      overviewSubtitle: "물건개요",
      overviewTable: [],
      investmentTitle: "INVESTMENT SUMMARY",
      investmentSubtitle: "투자요약",
      investmentSummary: {
        box1Title: "인수가",
        box1Text: "-",
        box2Title: "임대수익률",
        box2Text: "-",
        box3Title: "추천용도",
        box3Text: "-"
      },
      page2Title: "매물설명 & 시세",
      page2Subtitle: "Status & Valuation",
      page2HighlightHeader: "PROPERTY INFORMATION & VALUE",
      page2HighlightBoxTitle: "매물 핵심 하이라이트",
      highlights: ["역세권 도보 5분 이내 입지", "풍부한 유동인구 확보", "신축급 내외관 컨디션", "안정적인 임대 수익 확보"],
      valuationText: "본 자산은 우수한 입지적 강점과 안정적인 관리 상태를 보여주고 있습니다. 향후 지속적인 지가 상승 및 임대 수요 확대가 기대됩니다.",
      page2ChartBoxTitle: "주변시세 리포트",
      showChart: true,
      chartBars: [
        { label: "탁상감정가", value: "80", isHighlight: false },
        { label: "기존 희망가", value: "75", isHighlight: false },
        { label: "인근 시세", value: "85", isHighlight: false },
        { label: "현재 급매가", value: "65", isHighlight: true }
      ],
      chartAdviseText: "본 자산의 희망가는 주변 유사 거래 사례 및 공시지가를 감안했을 때 매우 경쟁력 있는 수준으로 책정되었습니다.",
      page3Title: "임대 정보",
      page3Subtitle: "Lease Status",
      leaseTable: {
        headers: ["층수", "호실", "보증금", "월세", "용도", "비고"],
        rows: [
          ["1F", "101호", "5,000만", "250만", "근린생활", "임대중"],
          ["2F", "201호", "3,000만", "180만", "사무실", "임대중"],
          ["3F", "301호", "3,000만", "170만", "사무실", "공실"]
        ]
      },
      leaseNotice: "※ 상기 임대 현황은 실제 임대차 계약 내용을 바탕으로 작성되었으며, 시장 상황에 따라 변동될 수 있습니다.",
      leaseRightTitle: "임대 핵심 가치 및 MD 추천 전략",
      leaseRightText: "역세권 유동인구를 타겟으로 한 식음료 업종 및 젊은 층 대상의 오피스 MD 구성이 최적화되어 있습니다.",
      page4Title: "매물 사진 특징",
      page4Subtitle: "Property Features",
      photoCaptions: {
        main: "건물 외관",
        sub1: "주차장 및 진입로",
        sub2: "건물 로비",
        feat1: "내부 실내 전경",
        feat2: "상세 인테리어"
      },
      page5Title: "위치 및 입지 분석",
      page5Subtitle: "Area & Location Analysis",
      page4TargetTitle: "입지분석 대상지",
      areaTargetName: "",
      areaTargetDesc: "본 물건지는 초역세권 입지로 버스정류장 및 주요 간선도로 접근성이 매우 우수합니다.",
      areaBox1Title: "교통 인프라",
      areaBox1Text: "지하철역 도보 5분 거리, 다수의 버스 노선 인접",
      areaBox2Title: "배후 수요",
      areaBox2Text: "인근 주거 단지 및 업무 지구 형성으로 풍부한 직주근접 수요",
      areaBox3Title: "개발 호재",
      areaBox3Text: "주변 지역 재개발 및 교통망 추가 확충 계획 예정",
      page6Title: "밸류업 로드맵",
      page6Subtitle: "Value-up Roadmap",
      roadmap: {
        box1Title: "1단계: 리모델링 기획",
        box1Text: "노후 설비 교체 및 트렌디한 외관 디자인 기획 수립",
        box2Title: "2단계: 공간 재구성",
        box2Text: "비효율적인 공간 분할 개선 및 공용 면적 리뉴얼",
        box3Title: "3단계: 임차인 유치",
        box3Text: "핵심 앵커 테넌트 유치를 통한 전체 건물 가치 상승",
        box4Title: "4단계: 자산 안정화",
        box4Text: "체계적인 건물 관리를 통한 공실 최소화 및 수익 극대화"
      },
      page6FooterQuote: "성공적인 부동산 밸류업은 체계적인 분석과 차별화된 실행 전략에서 시작됩니다.",
      footerText: "PROPERTY REPORT"
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
            if ('report' in savedState) {
              savedState = savedState.report;
            } else {
              savedState = null; // Ignore legacy formats
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
            if (savedState.info?.visiblePages) {
              setVisiblePages(savedState.info.visiblePages);
            }
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

            const priceText = v.trade_type === '매매' ? `매매 ${formatAmount(v.deposit)}`
              : v.trade_type === '전세' ? `전세 ${formatAmount(v.deposit)}`
              : `${v.trade_type} ${formatAmount(v.deposit)}/${Math.round((v.monthly_rent || 0) / 10000)}만`;

            const supArea = v.supply_m2 ? parseFloat(v.supply_m2) : 0;
            const excArea = v.exclusive_m2 ? parseFloat(v.exclusive_m2) : 0;
            const fmtM2 = (m2: number) => m2 ? `${m2}㎡(${(m2 / 3.3058).toFixed(1)}평)` : '';
            let areaDisplay = '-';
            if (supArea && excArea) areaDisplay = `공급 ${fmtM2(supArea)} / 전용 ${fmtM2(excArea)}`;
            else if (supArea) areaDisplay = `공급 ${fmtM2(supArea)}`;
            else if (excArea) areaDisplay = `전용 ${fmtM2(excArea)}`;

            const owner = v.members || {};
            const agency = Array.isArray(owner.agencies) ? owner.agencies[0] : owner.agencies;

            const mappedOverviewTable = [
              { label: "소재지", value: [v.sido, v.sigungu, v.dong].filter(Boolean).join(" ") },
              { label: "건물명", value: v.building_name || "-" },
              { label: "층/총층", value: v.current_floor && v.total_floor ? `${v.current_floor}층/${v.total_floor}층` : "-" },
              { label: "방/욕실수", value: v.room_count && v.bathroom_count ? `${v.room_count}개/${v.bathroom_count}개` : "-" },
              { label: "면적", value: areaDisplay },
              { label: "주차대수", value: v.parking || "협의" },
              { label: "방향", value: v.direction || "남향" },
              { label: "사용승인일", value: v.approval_year ? `${v.approval_year}년` : "-" }
            ];

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
                address: locationName || "공실 매물 정보",
                subTitle: `${v.sub_category || v.property_type || "프리미엄"} | ${v.direction || "방향 없음"} | ${areaDisplay}`,
                coverQRLink: `${window.location.origin}/report/${v.id}.html`,
                priceMain: formatAmount(v.deposit),
                priceSub: v.monthly_rent ? `${Math.round(v.monthly_rent / 10000)}만` : "",
                transactionType: v.trade_type || "월세",
                managementFee: v.maintenance_fee ? `${Math.round(v.maintenance_fee / 10000)}만원` : "없음",
                area: areaDisplay,
                floor: `${v.current_floor || "-"}층 / 총 ${v.total_floor || "-"}층`,
                direction: v.direction || "남향",
                parking: v.parking || "없음",
                moveInDate: v.move_in_date || "즉시 입주가능",
                options: Array.isArray(v.options) ? v.options.join(", ") : (v.options || ""),
                overviewTable: mappedOverviewTable,
                agentName: agency?.name || owner.company_name || owner.name || "공실뉴스 중개소",
                agentRepresentative: owner.name || v.client_name || "담당자명",
                agencyRepresentative: agency?.ceo_name || owner.name || "대표자명",
                agentPhone: agency?.phone || owner.phone || owner.tel_num || v.client_phone || "",
                agentMobile: owner.cellphone || owner.phone || owner.cell_num || agency?.cell || v.client_phone || "",
                agentAddress: [agency?.address || owner.address, agency?.address_detail || owner.address_detail].filter(Boolean).join(" "),
                agentRegistrationNumber: agency?.reg_num || owner.company_reg_no || "",
                areaTargetName: locationName || v.building_name || "입지분석 대상지",
                investmentSummary: {
                  box1Title: "임대 구분",
                  box1Text: v.trade_type || "월세",
                  box2Title: "보증금",
                  box2Text: formatAmount(v.deposit) || "-",
                  box3Title: "추천 용도",
                  box3Text: v.sub_category || "근린생활시설"
                }
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

  // Save the report to Supabase
  const handleSaveReport = async () => {
    if (saving) return;
    setSaving(true);

    try {
      const currentState = {
        ...state,
        info: {
          ...state.info,
          visiblePages
        }
      };

      // Compile current state to full standalone HTML using the report-generator template
      const compiledHtml = generateReportHtml(currentState);

      const res = await fetch("/api/vacancy/save-flyer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vacancyId,
          flyerState: {
            ...currentState,
            htmlContent: compiledHtml
          },
          type: "report"
        })
      });

      const json = await res.json();
      if (json.success) {
        // Show success popover
        setShowShareModal(true);
      } else {
        alert("리포트 저장 중 오류가 발생했습니다: " + (json.error || "서버 응답 오류"));
      }
    } catch (err: any) {
      alert("리포트 저장 실패: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleShareModalCopyLink = () => {
    const shareUrl = `${window.location.origin}/report/${vacancyId}.html`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      alert("보고서 링크가 클립보드에 복사되었습니다!");
    }).catch(() => {
      const textArea = document.createElement("textarea");
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      alert("보고서 링크가 클립보드에 복사되었습니다!");
    });
  };

  const handleShareModalKakao = () => {
    const Kakao = (window as any).Kakao;
    if (!Kakao || !Kakao.isInitialized()) {
      alert("카카오 SDK 로딩 중입니다. 다시 시도해 주세요.");
      return;
    }
    const shareUrl = `${window.location.origin}/report/${vacancyId}.html`;
    Kakao.Share.sendDefault({
      objectType: "feed",
      content: {
        title: `[AI 물건보고서] ${state.info.address}`,
        description: state.info.subTitle || "공실뉴스 프리미엄 물건보고서입니다.",
        imageUrl: state.mainImage || "https://gongsilnews.com/logo.png",
        link: { mobileWebUrl: shareUrl, webUrl: shareUrl },
      },
      buttons: [
        { title: "보고서 열기", link: { mobileWebUrl: shareUrl, webUrl: shareUrl } },
      ],
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-500 font-semibold p-4">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
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
          <span className="font-extrabold text-base tracking-tight text-white">AI 리포트 모바일 제작기</span>
        </div>
        <span className="bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider shadow-sm">Premium</span>
      </header>

      {/* Tabs Menu */}
      <div className="sticky top-[52px] bg-white border-b border-gray-200 flex overflow-x-auto scrollbar-none shadow-sm z-30">
        {[
          { id: 'basic', label: '🎨 기본/테마' },
          { id: 'content', label: '📝 개요/내용' },
          { id: 'photos', label: '🖼️ 사진매핑' },
          { id: 'lease', label: '📊 임대현황' },
          { id: 'location', label: '📍 위치분석' },
          { id: 'roadmap', label: '🚀 로드맵' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-3 text-xs font-black shrink-0 border-b-2 transition-all ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600 bg-blue-50/20'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Form Fields */}
      <main className="p-4 flex-1 flex flex-col gap-6 max-w-md mx-auto w-full">
        
        {/* Tab 1: Basic Settings & Themes */}
        {activeTab === 'basic' && (
          <div className="flex flex-col gap-5">
            {/* Color Theme Selector */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <label className="block text-sm font-bold text-gray-800 mb-3">🎨 레포트 강조 색상 선택</label>
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
                        ? 'border-blue-600 bg-blue-50/20 text-blue-700 font-extrabold shadow-sm'
                        : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-xs">{lay.name}</span>
                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Type {lay.type.slice(-1)}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Page Selection checkboxes */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <label className="block text-sm font-bold text-gray-800 mb-3">📄 포함할 보고서 페이지 선택</label>
              <div className="flex flex-col gap-3">
                {[
                  { num: 1, label: "1페이지: 물건개요 & 투자요약" },
                  { num: 2, label: "2페이지: 핵심 하이라이트 & 시세 그래프" },
                  { num: 3, label: "3페이지: 임대 계약 현황 (Rent Roll)" },
                  { num: 4, label: "4페이지: 현장 주요 사진 프리뷰" },
                  { num: 5, label: "5페이지: 교통 및 주변 입지 분석" },
                  { num: 6, label: "6페이지: 밸류업 타임라인 로드맵" }
                ].map(p => {
                  const checked = visiblePages.includes(p.num);
                  return (
                    <label key={p.num} className="flex items-center gap-3 p-2 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          if (checked) {
                            setVisiblePages(visiblePages.filter(n => n !== p.num));
                          } else {
                            setVisiblePages([...visiblePages, p.num].sort());
                          }
                        }}
                        className="w-4.5 h-4.5 rounded text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <span className="text-xs font-bold text-gray-700">{p.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Content Fields */}
        {activeTab === 'content' && (
          <div className="flex flex-col gap-5">
            {/* Header info */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col gap-4">
              <h3 className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2">📂 표지 및 제목 설정</h3>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5">표지 서브 타이틀</label>
                <input
                  type="text"
                  value={state.info.coverSubtitle}
                  onChange={(e) => handleUpdateInfo("coverSubtitle", e.target.value)}
                  className="w-full text-xs p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5">보고서 메인 주소/제목</label>
                <textarea
                  rows={2}
                  value={state.info.address}
                  onChange={(e) => handleUpdateInfo("address", e.target.value)}
                  className="w-full text-xs p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500"
                  placeholder="예: 서울특별시 강남구 역삼동 신축 빌딩 매매"
                />
              </div>
            </div>

            {/* Spec info */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col gap-4">
              <h3 className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2">🏢 기본 스펙 설정</h3>
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5">임대 종류</label>
                  <select
                    value={state.info.transactionType}
                    onChange={(e) => handleUpdateInfo("transactionType", e.target.value)}
                    className="w-full text-xs p-3 border border-gray-200 rounded-xl focus:outline-none bg-white focus:border-blue-500"
                  >
                    <option value="매매">매매</option>
                    <option value="전세">전세</option>
                    <option value="월세">월세</option>
                    <option value="단기임대">단기임대</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5">거래 금액 (대표가격)</label>
                  <input
                    type="text"
                    value={state.info.priceMain}
                    onChange={(e) => handleUpdateInfo("priceMain", e.target.value)}
                    className="w-full text-xs p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500"
                    placeholder="예: 75억 원 또는 5,000만"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5">월세 (해당 시)</label>
                  <input
                    type="text"
                    value={state.info.priceSub}
                    onChange={(e) => handleUpdateInfo("priceSub", e.target.value)}
                    className="w-full text-xs p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500"
                    placeholder="예: 250만"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5">관리비</label>
                  <input
                    type="text"
                    value={state.info.managementFee}
                    onChange={(e) => handleUpdateInfo("managementFee", e.target.value)}
                    className="w-full text-xs p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Investment summary boxes */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col gap-4">
              <h3 className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2">💰 투자요약 주요 3단 박스</h3>
              {[1, 2, 3].map(i => (
                <div key={i} className="flex flex-col gap-2 p-3 bg-gray-50 rounded-xl">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 mb-1">박스 {i} 타이틀</label>
                      <input
                        type="text"
                        value={(state.info.investmentSummary as any)?.[`box${i}Title`] || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setState((prev: any) => ({
                            ...prev,
                            info: {
                              ...prev.info,
                              investmentSummary: {
                                ...prev.info.investmentSummary,
                                [`box${i}Title`]: val
                              }
                            }
                          }));
                        }}
                        className="w-full text-xs p-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 mb-1">박스 {i} 내용</label>
                      <input
                        type="text"
                        value={(state.info.investmentSummary as any)?.[`box${i}Text`] || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setState((prev: any) => ({
                            ...prev,
                            info: {
                              ...prev.info,
                              investmentSummary: {
                                ...prev.info.investmentSummary,
                                [`box${i}Text`]: val
                              }
                            }
                          }));
                        }}
                        className="w-full text-xs p-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Highlights */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col gap-4">
              <h3 className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2">🎯 매물 하이라이트</h3>
              {state.info.highlights?.map((hl: string, idx: number) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-400 shrink-0">#{idx + 1}</span>
                  <input
                    type="text"
                    value={hl}
                    onChange={(e) => {
                      const val = e.target.value;
                      const arr = [...state.info.highlights];
                      arr[idx] = val;
                      handleUpdateInfo("highlights", arr);
                    }}
                    className="w-full text-xs p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500"
                  />
                </div>
              ))}
            </div>

            {/* Valuation text */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col gap-3">
              <h3 className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2">🖋️ 자산 평가 및 종합 자문</h3>
              <textarea
                rows={4}
                value={state.info.valuationText}
                onChange={(e) => handleUpdateInfo("valuationText", e.target.value)}
                className="w-full text-xs p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500"
                placeholder="핵심 평가 및 장점을 서술해 주세요."
              />
            </div>
          </div>
        )}

        {/* Tab 3: Photos Mapping */}
        {activeTab === 'photos' && (
          <div className="flex flex-col gap-5">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col gap-4">
              <h3 className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2">🖼️ 물건 보고서 사진 설정</h3>
              <p className="text-[11px] text-gray-400 font-bold -mt-2">아래 각 슬롯에 들어갈 매물 이미지를 맵핑해 주세요.</p>
              
              {[
                { key: "mainImage", label: "표지 및 1페이지 메인사진", capKey: "main" },
                { key: "subImage1", label: "서브사진 1", capKey: "sub1" },
                { key: "subImage2", label: "서브사진 2", capKey: "sub2" },
                { key: "featureImage1", label: "특징사진 1", capKey: "feat1" },
                { key: "featureImage2", label: "특징사진 2", capKey: "feat2" }
              ].map(slot => (
                <div key={slot.key} className="flex flex-col gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-700">{slot.label}</span>
                    <button
                      onClick={() => setPhotoPickerOpen({ open: true, targetKey: slot.key })}
                      className="text-xs bg-white border border-gray-200 text-blue-600 font-bold px-2.5 py-1 rounded-lg active:scale-95 transition-all shadow-xs"
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

                  {/* Caption input */}
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 mb-1">사진 설명 (캡션)</label>
                    <input
                      type="text"
                      value={state.info.photoCaptions?.[slot.capKey] || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setState((prev: any) => ({
                          ...prev,
                          info: {
                            ...prev.info,
                            photoCaptions: {
                              ...prev.info.photoCaptions,
                              [slot.capKey]: val
                            }
                          }
                        }));
                      }}
                      className="w-full text-xs p-2 bg-white border border-gray-200 rounded-lg focus:outline-none"
                      placeholder="사진 간단 캡션 설명..."
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: Lease table */}
        {activeTab === 'lease' && (
          <div className="flex flex-col gap-5">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col gap-4">
              <h3 className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2">📊 임대 계약 현황 (Rent Roll)</h3>
              
              {/* Row inputs */}
              <div className="flex flex-col gap-3">
                {state.info.leaseTable?.rows?.map((row: string[], rowIdx: number) => (
                  <div key={rowIdx} className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex flex-col gap-2.5">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black text-gray-400">임대 항목 #{rowIdx + 1}</span>
                      <button
                        onClick={() => {
                          const nextRows = state.info.leaseTable.rows.filter((_: any, idx: number) => idx !== rowIdx);
                          setState((prev: any) => ({
                            ...prev,
                            info: {
                              ...prev.info,
                              leaseTable: {
                                ...prev.info.leaseTable,
                                rows: nextRows
                              }
                            }
                          }));
                        }}
                        className="text-[10px] bg-red-50 text-red-500 font-bold px-2 py-0.5 rounded"
                      >
                        삭제
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {["층수", "호실", "보증금", "월세", "용도", "비고"].map((colName, colIdx) => (
                        <div key={colIdx}>
                          <label className="block text-[9px] font-bold text-gray-400 mb-0.5">{colName}</label>
                          <input
                            type="text"
                            value={row[colIdx] || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              const nextRows = [...state.info.leaseTable.rows];
                              const updatedRow = [...nextRows[rowIdx]];
                              updatedRow[colIdx] = val;
                              nextRows[rowIdx] = updatedRow;
                              setState((prev: any) => ({
                                ...prev,
                                info: {
                                  ...prev.info,
                                  leaseTable: {
                                    ...prev.info.leaseTable,
                                    rows: nextRows
                                  }
                                }
                              }));
                            }}
                            className="w-full text-xs p-2 bg-white border border-gray-200 rounded-lg focus:outline-none"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Add row button */}
              <button
                onClick={() => {
                  const newRow = ["", "", "", "", "", ""];
                  setState((prev: any) => ({
                    ...prev,
                    info: {
                      ...prev.info,
                      leaseTable: {
                        ...prev.info.leaseTable,
                        rows: [...(prev.info.leaseTable?.rows || []), newRow]
                      }
                    }
                  }));
                }}
                className="w-full py-2.5 bg-blue-50 text-blue-600 border border-dashed border-blue-200 rounded-xl text-xs font-bold active:scale-95 transition-all"
              >
                ＋ 임대 현황 줄 추가하기
              </button>
            </div>

            {/* Right strategy */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col gap-3">
              <h3 className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-1">💡 임대 전략 조언</h3>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5">임대 전략 제목</label>
                <input
                  type="text"
                  value={state.info.leaseRightTitle}
                  onChange={(e) => handleUpdateInfo("leaseRightTitle", e.target.value)}
                  className="w-full text-xs p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5">임대 권장 MD 내용</label>
                <textarea
                  rows={4}
                  value={state.info.leaseRightText}
                  onChange={(e) => handleUpdateInfo("leaseRightText", e.target.value)}
                  className="w-full text-xs p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Location Analysis */}
        {activeTab === 'location' && (
          <div className="flex flex-col gap-5">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col gap-4">
              <h3 className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2">📍 위치 및 주변 입지 분석</h3>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5">분석 대상 명칭</label>
                <input
                  type="text"
                  value={state.info.areaTargetName}
                  onChange={(e) => handleUpdateInfo("areaTargetName", e.target.value)}
                  className="w-full text-xs p-3 border border-gray-200 rounded-xl"
                  placeholder="예: 초역세권 서초대로 오피스 빌딩"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5">입지 설명 요약</label>
                <textarea
                  rows={3}
                  value={state.info.areaTargetDesc}
                  onChange={(e) => handleUpdateInfo("areaTargetDesc", e.target.value)}
                  className="w-full text-xs p-3 border border-gray-200 rounded-xl"
                />
              </div>
            </div>

            {/* 3 입지 특징 박스 */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col gap-4">
              <h3 className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2">🌟 입지 핵심 특징 3가지</h3>
              {[1, 2, 3].map(i => (
                <div key={i} className="flex flex-col gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 mb-1">특징 {i} 제목</label>
                    <input
                      type="text"
                      value={(state.info as any)[`areaBox${i}Title`] || ""}
                      onChange={(e) => handleUpdateInfo(`areaBox${i}Title`, e.target.value)}
                      className="w-full text-xs p-2 bg-white border border-gray-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 mb-1">특징 {i} 설명</label>
                    <input
                      type="text"
                      value={(state.info as any)[`areaBox${i}Text`] || ""}
                      onChange={(e) => handleUpdateInfo(`areaBox${i}Text`, e.target.value)}
                      className="w-full text-xs p-2 bg-white border border-gray-200 rounded-lg"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 6: Value-up Roadmap */}
        {activeTab === 'roadmap' && (
          <div className="flex flex-col gap-5">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col gap-4">
              <h3 className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2">🚀 밸류업 로드맵 (4단계)</h3>
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex flex-col gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 mb-1">{i}단계 타이틀</label>
                    <input
                      type="text"
                      value={(state.info.roadmap as any)?.[`box${i}Title`] || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setState((prev: any) => ({
                          ...prev,
                          info: {
                            ...prev.info,
                            roadmap: {
                              ...prev.info.roadmap,
                              [`box${i}Title`]: val
                            }
                          }
                        }));
                      }}
                      className="w-full text-xs p-2 bg-white border border-gray-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 mb-1">{i}단계 상세설명</label>
                    <input
                      type="text"
                      value={(state.info.roadmap as any)?.[`box${i}Text`] || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setState((prev: any) => ({
                          ...prev,
                          info: {
                            ...prev.info,
                            roadmap: {
                              ...prev.info.roadmap,
                              [`box${i}Text`]: val
                            }
                          }
                        }));
                      }}
                      className="w-full text-xs p-2 bg-white border border-gray-200 rounded-lg"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col gap-3">
              <h3 className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-1">💬 하단 인용 문구</h3>
              <input
                type="text"
                value={state.info.page6FooterQuote}
                onChange={(e) => handleUpdateInfo("page6FooterQuote", e.target.value)}
                className="w-full text-xs p-3 border border-gray-200 rounded-xl"
              />
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
          onClick={handleSaveReport}
          disabled={saving}
          className="flex-[2] py-3.5 bg-blue-600 text-white rounded-xl text-sm font-extrabold active:scale-95 transition-all shadow-md shadow-blue-200 flex items-center justify-center gap-2"
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
            <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto text-green-600 text-2xl">
              ✓
            </div>
            <div>
              <h3 className="font-extrabold text-base text-gray-900">보고서 저장 완료!</h3>
              <p className="text-xs text-gray-500 mt-1">리포트가 성공적으로 저장되었습니다. 카톡 공유나 복사된 링크를 사용하여 전송해 보세요.</p>
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

export default function ReportWritePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500 font-semibold">
        <span>로딩 중...</span>
      </div>
    }>
      <ReportWriteContent />
    </Suspense>
  );
}
