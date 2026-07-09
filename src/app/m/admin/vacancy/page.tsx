"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { getVacancies, updateVacancyStatus, deleteVacancy, updateVacancy } from "@/app/actions/vacancy";
import { generateReportHtml, COLORS as REPORT_COLORS, LAYOUTS as REPORT_LAYOUTS } from "@/components/mobile/report-generator";
import { generateFlyerHtml, COLORS as FLYER_COLORS, LAYOUTS as FLYER_LAYOUTS } from "@/components/mobile/flyer-generator";

function MobileVacancyAdmin() {
  const router = useRouter();
  const [vacancies, setVacancies] = useState<any[]>([]);
  const [filter, setFilter] = useState("전체");
  const [loading, setLoading] = useState(true);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [userName, setUserName] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [authChecked, setAuthChecked] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [activeKeyword, setActiveKeyword] = useState("");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [flyerMap, setFlyerMap] = useState<Record<string, { flyer: boolean; report: boolean }>>({});
  const [userRole, setUserRole] = useState<string | null>(null);
  const [shareTarget, setShareTarget] = useState<{ id: string; type: "report" | "flyer"; row: any } | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [generatingType, setGeneratingType] = useState<"report" | "flyer" | null>(null);

  // 카카오 Share SDK 로드 (공유 기능용)
  useEffect(() => {
    const scriptId = "kakao-share-script";
    if (document.getElementById(scriptId)) return;
    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js";
    script.onload = () => {
      const Kakao = (window as any).Kakao;
      if (Kakao && !Kakao.isInitialized()) {
        const kakaoJsKey = "435d3602201a49ea712e5f5a36fe6efc";
        Kakao.init(kakaoJsKey);
      }
    };
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/m"); return; }
      const { data } = await supabase.from("members").select("id, name, phone, role").eq("id", user.id).single();
      if (data) {
        setMemberId(data.id);
        setUserName(data.name || "이름없음");
        setUserPhone(data.phone || "");
        setUserRole(data.role);
        if (data.role === 'ADMIN' || data.role === 'SUPER_ADMIN' || data.role === '최고관리자') {
          setIsAdmin(true);
        }
      }
      setAuthChecked(true);
    }
    init();
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      if (previewId) {
        setPreviewId(null);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [previewId]);

  const closePreview = () => {
    if (previewId) {
      setPreviewId(null);
      if (window.history.state?.previewOpen) {
        window.history.back();
      }
    }
  };

  const openPreview = (id: string) => {
    window.history.pushState({ previewOpen: true }, "");
    setPreviewId(id);
  };

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'CLOSE_VACANCY_OVERLAY') {
        closePreview();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [previewId]);

  const handleMobileKakaoShare = (target: { id: string; type: "report" | "flyer"; row: any }) => {
    const Kakao = (window as any).Kakao;
    if (!Kakao || !Kakao.isInitialized()) {
      alert("카카오 SDK 로드 중입니다. 잠시 후 시도해 주세요.");
      return;
    }
    const { id, type, row } = target;
    const shareUrl = `${window.location.origin}/${type}/${id}.html`;

    const addrText = [
      row.dong,
      row.detail_addr,
      row.building_name,
      row.apt_dong ? (row.apt_dong.includes("동") ? row.apt_dong : `${row.apt_dong}동`) : "",
      row.hosu ? (row.hosu.includes("호") ? row.hosu : `${row.hosu}호`) : ""
    ].filter(Boolean).join(" ") || [row.sido, row.sigungu, row.dong].filter(Boolean).join(" ");

    const priceText = row.trade_type === "매매" ? `매매 ${formatAmount(row.deposit)}`
      : row.trade_type === "전세" ? `전세 ${formatAmount(row.deposit)}`
      : `${formatAmount(row.deposit)}/${formatAmount(row.monthly_rent)}`;

    const title = type === "report" ? `[AI 물건보고서] ${addrText}` : `[AI 온라인전단지] ${addrText}`;
    const description = `${priceText}\n공실뉴스에서 제공하는 검증된 매물 정보입니다.`;
    const imageUrl = row.vacancy_photos?.[0]?.url || "https://gongsilnews.com/logo.png";

    Kakao.Share.sendDefault({
      objectType: "feed",
      content: {
        title,
        description,
        imageUrl,
        link: { mobileWebUrl: shareUrl, webUrl: shareUrl },
      },
      buttons: [
        { title: type === "report" ? "보고서 보기" : "전단지 보기", link: { mobileWebUrl: shareUrl, webUrl: shareUrl } },
      ],
    });
    setShareTarget(null);
  };

  const handleMobileCopyUrl = (target: { id: string; type: "report" | "flyer"; row: any }) => {
    const { id, type } = target;
    const shareUrl = `${window.location.origin}/${type}/${id}.html`;
    const typeLabel = type === "report" ? "물건보고서" : "온라인전단지";

    navigator.clipboard.writeText(shareUrl).then(() => {
      alert(`${typeLabel} 링크 주소가 복사되었습니다.\n원하는 대화방에 붙여넣어 전송해보세요!`);
    }).catch(() => {
      const textArea = document.createElement("textarea");
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      alert(`${typeLabel} 링크 주소가 복사되었습니다.\n원하는 대화방에 붙여넣어 전송해보세요!`);
    });
    setShareTarget(null);
  };

  const fetchVacancies = async () => {
    if (!memberId) return;
    setLoading(true);
    const res = await getVacancies({ ownerId: memberId, excludeOnbid: true });
    if (res.success) {
      const list = Array.isArray(res.data) ? res.data : [];
      setVacancies(list);
      
      if (list.length > 0) {
        const supabase = createClient();
        const ids = list.map((v: any) => v.id);
        const { data: flyers } = await supabase
          .from("vacancy_flyers")
          .select("vacancy_id, flyer_state")
          .in("vacancy_id", ids);
          
        if (flyers) {
          const map: Record<string, { flyer: boolean; report: boolean }> = {};
          flyers.forEach((f: any) => {
            const state = f.flyer_state;
            const hasFlyer = state ? (('flyer' in state) ? !!state.flyer : true) : false;
            const hasReport = state ? (('report' in state) ? !!state.report : false) : false;
            map[f.vacancy_id] = { flyer: hasFlyer, report: hasReport };
          });
          setFlyerMap(map);
        }
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    if (memberId) fetchVacancies();
  }, [memberId]);

  const handleAutoCreate = async (row: any, type: "report" | "flyer") => {
    if (generatingId) return;
    setGeneratingId(row.id);
    setGeneratingType(type);

    try {
      const detailRes = await fetch(`/api/vacancy/detail?id=${row.id}`);
      if (detailRes.status === 401 || detailRes.status === 403) {
        alert("로그인이 필요하거나 권한이 없습니다.");
        router.push("/m");
        return;
      }
      const json = await detailRes.status === 200 ? await detailRes.json() : null;
      if (!json || !json.success || !json.data) {
        alert("공실 정보를 가져오지 못했습니다.");
        return;
      }

      const v = json.data;
      const photos = json.photos || [];

      const dongBunji = [v.dong, v.detail_addr].filter(Boolean).join(" ");
      const locationName = [dongBunji, v.building_name].filter(Boolean).join(" ");
      
      const formatAmtHelper = (amt: number) => {
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

      const newImages: any = {};
      const imageSlots = ['mainImage', 'subImage1', 'subImage2', 'featureImage1', 'featureImage2'];
      photos.forEach((photo: any, index: number) => {
        if (index < imageSlots.length) {
          newImages[imageSlots[index]] = photo.url;
        }
      });

      let compiledHtml = "";
      let finalState: any = null;

      if (type === "report") {
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

        let autoColor = REPORT_COLORS[0];
        const lowerBuilding = (v.building_name || "").toLowerCase();
        if (lowerBuilding.includes("롯데") || lowerBuilding.includes("캐슬")) autoColor = REPORT_COLORS[1];
        else if (lowerBuilding.includes("푸르지오")) autoColor = REPORT_COLORS[2];
        else if (lowerBuilding.includes("힐스") || lowerBuilding.includes("현대")) autoColor = REPORT_COLORS[3];
        else if (lowerBuilding.includes("아크로") || lowerBuilding.includes("자이")) autoColor = REPORT_COLORS[4];

        finalState = {
          ...newImages,
          colorTheme: autoColor,
          layoutTheme: REPORT_LAYOUTS[0],
          info: {
            address: locationName || "공실 매물 정보",
            subTitle: `${v.sub_category || v.property_type || "프리미엄"} | ${v.direction || "방향 없음"} | ${areaDisplay}`,
            coverSubtitle: "부동산 물건 보고서",
            agentLabel: "PREPARED BY",
            agentName: agency?.name || owner.company_name || owner.name || "공실뉴스 중개소",
            agentRepresentative: owner.name || v.client_name || "담당자명",
            agencyRepresentative: agency?.ceo_name || owner.name || "대표자명",
            agentPhone: agency?.phone || owner.phone || owner.tel_num || v.client_phone || "",
            agentMobile: owner.cellphone || owner.phone || owner.cell_num || agency?.cell || v.client_phone || "",
            agentRegistrationNumber: agency?.reg_num || owner.company_reg_no || "",
            agentAddress: [agency?.address || owner.address, agency?.address_detail || owner.address_detail].filter(Boolean).join(" "),
            coverQRLink: `${window.location.origin}/report/${v.id}.html`,
            priceMain: formatAmtHelper(v.deposit),
            priceSub: v.monthly_rent ? `${Math.round(v.monthly_rent / 10000)}만` : "",
            transactionType: v.trade_type || "월세",
            managementFee: v.maintenance_fee ? `${Math.round(v.maintenance_fee / 10000)}만원` : "없음",
            area: areaDisplay,
            floor: `${v.current_floor || "-"}층 / 총 ${v.total_floor || "-"}층`,
            direction: v.direction || "남향",
            parking: v.parking || "없음",
            moveInDate: v.move_in_date || "즉시 입주가능",
            options: Array.isArray(v.options) ? v.options.join(", ") : (v.options || ""),
            overviewTitle: "PROPERTY OVERVIEW",
            overviewSubtitle: "물건개요",
            overviewTable: mappedOverviewTable,
            investmentTitle: "INVESTMENT SUMMARY",
            investmentSubtitle: "투자요약",
            investmentSummary: {
              box1Title: "임대 구분",
              box1Text: v.trade_type || "월세",
              box2Title: "보증금",
              box2Text: formatAmtHelper(v.deposit) || "-",
              box3Title: "추천 용도",
              box3Text: v.sub_category || "근린생활시설"
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
            areaTargetName: locationName || v.building_name || "입지분석 대상지",
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
            footerText: "PROPERTY REPORT",
            visiblePages: [1, 2, 3, 4, 5, 6]
          }
        };

        compiledHtml = generateReportHtml(finalState);
      } else {
        const addInfo = [];
        if (agency?.ceo_name || owner.name) addInfo.push(`대표자: ${agency?.ceo_name || owner.name}`);
        if (agency?.address || owner.address) addInfo.push(`주소: ${[agency?.address || owner.address, agency?.address_detail || owner.address_detail].filter(Boolean).join(" ")}`);
        if (agency?.reg_num || owner.company_reg_no) addInfo.push(`등록번호: ${agency?.reg_num || owner.company_reg_no}`);

        let autoColor = FLYER_COLORS[0];
        const lowerBuilding = (v.building_name || "").toLowerCase();
        if (lowerBuilding.includes("롯데") || lowerBuilding.includes("캐슬")) autoColor = FLYER_COLORS[1];
        else if (lowerBuilding.includes("푸르지오")) autoColor = FLYER_COLORS[2];
        else if (lowerBuilding.includes("힐스") || lowerBuilding.includes("현대")) autoColor = FLYER_COLORS[3];
        else if (lowerBuilding.includes("아크로") || lowerBuilding.includes("자이")) autoColor = FLYER_COLORS[4];

        finalState = {
          ...newImages,
          colorTheme: autoColor,
          layoutTheme: FLYER_LAYOUTS[0],
          info: {
            promotionText: `${v.building_name || "최적의 입지"} 공실 매물`,
            address: locationName || "공실 매물 정보",
            subTitle: `${v.sub_category || v.property_type || "프리미엄"} | ${v.direction || "방향 없음"} | ${areaDisplay}`,
            transactionType: v.trade_type || "월세",
            priceMain: formatAmtHelper(v.deposit),
            priceSub: v.monthly_rent ? `${Math.round(v.monthly_rent / 10000)}만` : "",
            managementFee: v.maintenance_fee ? `${Math.round(v.maintenance_fee / 10000)}만원` : "없음",
            area: areaDisplay,
            floor: `${v.current_floor || "-"}층 / 총 ${v.total_floor || "-"}층`,
            direction: v.direction || "남향",
            roomCount: v.room_count && v.bathroom_count ? `${v.room_count}개 / ${v.bathroom_count}개` : `${v.room_count || "-"}개`,
            parking: v.parking || "협의",
            moveInDate: v.move_in_date || "즉시 입주가능",
            options: Array.isArray(v.options) ? v.options.join(", ") : (v.options || ""),
            sections: [],
            agentName: agency?.name || owner.company_name || owner.name || "공실뉴스 중개소",
            agentRepresentative: owner.name || v.client_name || "담당자명",
            agentPhone: agency?.phone || owner.phone || owner.tel_num || v.client_phone || "",
            agentMobile: owner.cellphone || owner.phone || owner.cell_num || agency?.cell || v.client_phone || "",
            agentAdditionalInfo: addInfo,
            noticeTitle: "중개사 코멘트",
            noticeContent: v.memo || "역세권 우수한 입지와 깔끔한 컨디션을 자랑하는 특급 추천 매물입니다. 상세 정보는 문의해 주시기 바랍니다."
          }
        };

        compiledHtml = generateFlyerHtml(finalState);
      }

      const res = await fetch("/api/vacancy/save-flyer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vacancyId: row.id,
          flyerState: {
            ...finalState,
            htmlContent: compiledHtml
          },
          type
        })
      });

      const saveJson = await res.json();
      if (saveJson.success) {
        await fetchVacancies();
        setShareTarget({ id: row.id, type, row });
      } else {
        alert("생성 중 오류가 발생했습니다: " + (saveJson.error || "알 수 없는 오류"));
      }
    } catch (err: any) {
      alert("생성 실패: " + err.message);
    } finally {
      setGeneratingId(null);
      setGeneratingType(null);
    }
  };

  const filtered = vacancies.filter(v => {
    if (filter === "광고중" && v.status !== "ACTIVE") return false;
    if (filter === "광고종료" && v.status !== "STOPPED") return false;
    if (filter === "임시저장" && v.status !== "DRAFT") return false;
    if (activeKeyword) {
      const k = activeKeyword.toLowerCase();
      const addr = [v.sido, v.sigungu, v.dong, v.building_name].filter(Boolean).join(" ").toLowerCase();
      if (!addr.includes(k) && 
          !(v.client_name && v.client_name.toLowerCase().includes(k)) &&
          !(v.vacancy_no && String(v.vacancy_no).includes(k)) &&
          !(v.id && String(v.id).includes(k))) return false;
    }
    return true;
  });

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

  const statusInfo: Record<string, { bg: string; label: string }> = {
    ACTIVE: { bg: "#10b981", label: "광고중" },
    STOPPED: { bg: "#ef4444", label: "광고종료" },
    DRAFT: { bg: "#9ca3af", label: "임시저장" },
  };

  const tabs = [
    { key: "전체", count: vacancies.length },
    { key: "광고중", count: vacancies.filter(v => v.status === "ACTIVE").length },
    { key: "광고종료", count: vacancies.filter(v => v.status === "STOPPED").length },
    { key: "임시저장", count: vacancies.filter(v => v.status === "DRAFT").length },
  ];

  if (!authChecked) {
    return (
      <div style={{ display: "flex", height: "100dvh", alignItems: "center", justifyContent: "center", background: "#f4f5f7" }}>
        <div style={{ textAlign: "center", color: "#9ca3af" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🔐</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>권한을 확인하고 있습니다...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100dvh", background: "#f4f5f7", fontFamily: "'Pretendard Variable', -apple-system, sans-serif" }}>
      {/* 상단 헤더 */}
      <div style={{ position: "sticky", top: 0, zIndex: 50, background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "0 16px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => router.back()} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M15 18L9 12L15 6" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: "#111", margin: 0 }}>공실관리</h1>
          <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>
            광고 {vacancies.filter(v => v.status === "ACTIVE").length}건 / 전체 {vacancies.length}건
          </span>
        </div>
        <button onClick={() => setSearchOpen(!searchOpen)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </button>
      </div>

      {/* 검색 영역 (접이식) */}
      {searchOpen && (
        <div style={{ background: "#fff", padding: "12px 16px", borderBottom: "1px solid #e5e7eb", display: "flex", gap: 8 }}>
          <input
            type="text"
            value={searchKeyword}
            onChange={e => setSearchKeyword(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { setActiveKeyword(searchKeyword); setFilter("전체"); } }}
            placeholder="주소, 건물명, 등록자 또는 공실번호 검색"
            style={{ flex: 1, height: 40, padding: "0 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, outline: "none" }}
          />
          <button onClick={() => { setActiveKeyword(searchKeyword); setFilter("전체"); }} style={{ height: 40, padding: "0 16px", background: "#374151", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700 }}>검색</button>
          {activeKeyword && (
            <button onClick={() => { setSearchKeyword(""); setActiveKeyword(""); }} style={{ height: 40, padding: "0 12px", background: "#fff", color: "#6b7280", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, fontWeight: 600 }}>초기화</button>
          )}
        </div>
      )}

      {/* 필터 탭 */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "0 12px", display: "flex", overflowX: "auto", WebkitOverflowScrolling: "touch" }} className="hide-scrollbar">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => { setFilter(tab.key); setActiveKeyword(""); setSearchKeyword(""); }}
            style={{
              flexShrink: 0, border: "none", background: "none", padding: "14px 14px", fontSize: 14,
              fontWeight: filter === tab.key ? 800 : 500,
              color: filter === tab.key ? "#3b82f6" : "#6b7280",
              borderBottom: filter === tab.key ? "3px solid #3b82f6" : "3px solid transparent",
              cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
            }}
          >
            {tab.key}
            <span style={{
              background: tab.key === "전체" ? "#e5e7eb" : tab.key === "광고중" ? "#10b981" : tab.key === "광고종료" ? "#ef4444" : tab.key === "임시저장" ? "#9ca3af" : "#ef4444",
              color: tab.key === "전체" ? "#4b5563" : "#fff",
              padding: "2px 7px", borderRadius: 10, fontSize: 11, fontWeight: 700,
            }}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* 공실 카드 리스트 */}
      <div style={{ padding: "8px 8px 100px" }}>
        {loading ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: "#9ca3af" }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>불러오는 중...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "60px 0", textAlign: "center", color: "#9ca3af" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🏢</div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>
              {filter === "전체" ? "등록된 공실이 없습니다." : "조건에 맞는 공실이 없습니다."}
            </div>
          </div>
        ) : filtered.map(row => {
          const st = statusInfo[row.status] || { bg: "#9ca3af", label: row.status };
          const addrText = [
            row.dong,
            row.detail_addr,
            row.building_name,
            row.apt_dong ? (row.apt_dong.includes("동") ? row.apt_dong : `${row.apt_dong}동`) : "",
            row.hosu ? (row.hosu.includes("호") ? row.hosu : `${row.hosu}호`) : ""
          ].filter(Boolean).join(" ") || [row.sido, row.sigungu, row.dong].filter(Boolean).join(" ");
          const priceText = row.trade_type === "매매" ? `매매 ${formatAmount(row.deposit)}`
            : row.trade_type === "전세" ? `전세 ${formatAmount(row.deposit)}`
            : `${formatAmount(row.deposit)}/${formatAmount(row.monthly_rent)}`;
          const dateStr = row.created_at ? new Date(row.created_at).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' }) : "-";
          const daysSinceCreated = row.created_at ? Math.floor((Date.now() - new Date(row.created_at).getTime()) / 86400000) : 0;

          return (
            <div key={row.id} style={{
              background: "#fff", borderRadius: 12, padding: "14px", marginBottom: 8,
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)", border: "1px solid #f0f0f0",
            }}>
              {/* 상단: 상태 + 공실광고 종류 + 번호 */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {(row.status === "ACTIVE" || row.status === "STOPPED") ? (
                    <button
                      onClick={async () => {
                        const isActive = row.status === "ACTIVE";
                        const msg = isActive ? "광고를 종료하시겠습니까?" : "광고를 시작하시겠습니까?";
                        if (!confirm(msg)) return;
                        const newStatus = isActive ? "STOPPED" : "ACTIVE";
                        const res = await updateVacancyStatus(row.id, newStatus);
                        if (res.success) fetchVacancies();
                      }}
                      style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", background: st.bg, color: "#fff", borderRadius: 6, fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer" }}
                    >
                      {row.status === "ACTIVE" && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>}
                      {st.label}
                    </button>
                  ) : (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", background: st.bg, color: "#fff", borderRadius: 6, fontSize: 12, fontWeight: 700 }}>
                      {row.status === "ACTIVE" && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>}
                      {st.label}
                    </span>
                  )}
                  <span style={{ fontSize: 13, color: "#374151", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                    {row.sub_category || row.property_type}
                    <span style={{ color: "#ef4444", fontSize: 12 }}>No.{row.vacancy_no || "-"}</span>
                  </span>
                </div>
                <span style={{ fontSize: 11, color: "#9ca3af" }}>{daysSinceCreated}일</span>
              </div>

              {/* 주소 */}
              <div
                onClick={() => openPreview(row.id)}
                style={{ fontSize: 16, fontWeight: 800, color: "#111", marginBottom: 6, cursor: "pointer", wordBreak: "keep-all" }}
              >
                {addrText || "주소 미입력"}
              </div>

              {/* 가격 + 스펙 */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                <span style={{ fontSize: 16, fontWeight: 800, color: "#ef4444" }}>{priceText}</span>
                <span style={{ fontSize: 13, color: "#6b7280" }}>
                  {row.trade_type === "매매" && ((row.property_type === "빌라·주택" && ["단독/다가구", "전원주택", "상가주택"].includes(row.sub_category)) || (row.property_type === "상가·사무실·건물·공장·토지" && ["건물/빌딩", "공장/창고"].includes(row.sub_category))) ? (
                    `연면적 ${row.supply_m2 ? `${row.supply_m2}m²` : "-"}`
                  ) : (
                    `${row.room_count || "-"}방 / ${row.exclusive_m2 ? `${row.exclusive_m2}m²` : "-"} / ${row.current_floor || "-"}층`
                  )}
                </span>
              </div>

              {/* 등록자 + 날짜 */}
              <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 12, display: "flex", gap: 12 }}>
                <span>{row.client_name || userName} · {row.client_phone || userPhone}</span>
                <span>{dateStr} 등록</span>
              </div>

              {/* 액션 버튼 */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {/* 기본 3종 버튼 (미리보기, 수정, 삭제) - 항상 동일한 크기로 한 줄에 노출 */}
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => openPreview(row.id)} style={{ flex: 1, height: 36, background: "#f0f9ff", color: "#2563eb", border: "1px solid #bfdbfe", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                    👁️ 미리보기
                  </button>
                  <button onClick={() => router.push(`/m/admin/vacancy/write?id=${row.id}`)} style={{ flex: 1, height: 36, background: "#4b5563", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                    ✏️ 수정
                  </button>
                  <button onClick={async () => {
                    if (!confirm("이 공실을 삭제하시겠습니까?")) return;
                    const res = await deleteVacancy(row.id);
                    if (res.success) fetchVacancies();
                  }} style={{ flex: 1, height: 36, background: "#fff", color: "#ef4444", border: "1px solid #fecaca", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                    🗑️ 삭제
                  </button>
                </div>

                {/* AI 온라인 전단지 및 물건보고서 공유 / 비활성 버튼 */}
                {(userRole === 'ADMIN' || userRole === 'SUPER_ADMIN' || userRole === '최고관리자' || userRole === '부동산' || userRole === 'REALTOR') && (() => {
                  const status = flyerMap[row.id] || { flyer: false, report: false };
                  const hasFlyer = status.flyer;
                  const hasReport = status.report;

                  return (
                    <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                      {/* AI 물건보고서 버튼 */}
                      {hasReport ? (
                        <button 
                          onClick={() => {
                            setShareTarget({ id: row.id, type: "report", row });
                          }}
                          style={{ 
                            flex: 1, 
                            height: 38, 
                            background: "linear-gradient(135deg, #3b82f6, #1d4ed8)", 
                            color: "#fff", 
                            border: "none", 
                            borderRadius: 8, 
                            fontSize: 12, 
                            fontWeight: 800, 
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 4,
                            boxShadow: "0 2px 4px rgba(59, 130, 246, 0.15)"
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
                          보고서 공유
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleAutoCreate(row, "report")}
                          disabled={generatingId === row.id}
                          style={{ 
                            flex: 1, 
                            height: 38, 
                            background: "#eff6ff", 
                            color: "#3b82f6", 
                            border: "1px solid #bfdbfe", 
                            borderRadius: 8, 
                            fontSize: 12, 
                            fontWeight: 700, 
                            cursor: generatingId === row.id ? "not-allowed" : "pointer",
                            opacity: generatingId === row.id ? 0.7 : 1,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 4
                          }}
                        >
                          {generatingId === row.id && generatingType === "report" ? (
                            <>
                              <span style={{ display: "inline-block", width: 12, height: 12, border: "2px solid #3b82f6", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                              생성 중...
                            </>
                          ) : (
                            "➕ 보고서 생성"
                          )}
                        </button>
                      )}

                      {/* AI 온라인 전단지 버튼 */}
                      {hasFlyer ? (
                        <button 
                          onClick={() => {
                            setShareTarget({ id: row.id, type: "flyer", row });
                          }}
                          style={{ 
                            flex: 1, 
                            height: 38, 
                            background: "linear-gradient(135deg, #10b981, #059669)", 
                            color: "#fff", 
                            border: "none", 
                            borderRadius: 8, 
                            fontSize: 12, 
                            fontWeight: 800, 
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 4,
                            boxShadow: "0 2px 4px rgba(16, 185, 129, 0.15)"
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
                          전단지 공유
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleAutoCreate(row, "flyer")}
                          disabled={generatingId === row.id}
                          style={{ 
                            flex: 1, 
                            height: 38, 
                            background: "#ecfdf5", 
                            color: "#10b981", 
                            border: "1px solid #a7f3d0", 
                            borderRadius: 8, 
                            fontSize: 12, 
                            fontWeight: 700, 
                            cursor: generatingId === row.id ? "not-allowed" : "pointer",
                            opacity: generatingId === row.id ? 0.7 : 1,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 4
                          }}
                        >
                          {generatingId === row.id && generatingType === "flyer" ? (
                            <>
                              <span style={{ display: "inline-block", width: 12, height: 12, border: "2px solid #10b981", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                              생성 중...
                            </>
                          ) : (
                            "➕ 전단지 생성"
                          )}
                        </button>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          );
        })}
      </div>

      {/* FAB: 공실등록 */}
      <button
        onClick={() => router.push("/m/admin/vacancy/write")}
        style={{
          position: "fixed", bottom: 80, right: 20, width: 56, height: 56,
          borderRadius: "50%", background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
          color: "#fff", border: "none", boxShadow: "0 6px 20px rgba(29, 78, 216, 0.4)",
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 40,
          transition: "transform 0.15s ease",
        }}
        onMouseDown={(e) => { e.currentTarget.style.transform = "scale(0.92)"; }}
        onMouseUp={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
        onTouchStart={(e) => { e.currentTarget.style.transform = "scale(0.92)"; }}
        onTouchEnd={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ pointerEvents: "none" }}>
          <rect x="4" y="2" width="10" height="15" rx="1.5" ry="1.5" />
          <line x1="7" y1="5" x2="8" y2="5" />
          <line x1="7" y1="8" x2="8" y2="8" />
          <line x1="7" y1="11" x2="8" y2="11" />
          <line x1="11" y1="5" x2="12" y2="5" />
          <line x1="11" y1="8" x2="12" y2="8" />
          <line x1="11" y1="11" x2="12" y2="11" />
          <path d="M9 17v-3h2v3" />
          <path d="M14 17h6M17 14v6" stroke="#ffffff" strokeWidth="2.5" />
        </svg>
      </button>



      {/* 미리보기 오버레이 (iframe) */}
      {previewId && (
        <div style={{ position: "fixed", inset: 0, zIndex: 99999, background: "rgba(0,0,0,0.6)" }}>
          <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
            <div style={{ height: "40px", background: "rgba(0,0,0,0.8)", display: "flex", justifyContent: "flex-end", padding: "0 16px" }}>
              <button onClick={closePreview} style={{ background: "none", border: "none", color: "#fff", fontSize: "24px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                &times;
              </button>
            </div>
            <iframe 
              src={`/m/gongsil?id=${previewId}&embed=true`} 
              style={{ width: "100%", flex: 1, border: "none", background: "#f4f6f8" }}
            />
          </div>
        </div>
      )}

      {/* 공유하기 모달/바텀시트 */}
      {shareTarget && (() => {
        const { type, row } = shareTarget;
        const typeLabel = type === "report" ? "AI 물건보고서" : "AI 온라인 전단지";
        const addrText = [
          row.dong,
          row.detail_addr,
          row.building_name
        ].filter(Boolean).join(" ") || "공실 매물";

        return (
          <div 
            onClick={() => setShareTarget(null)}
            style={{ 
              position: "fixed", 
              inset: 0, 
              zIndex: 100000, 
              background: "rgba(0,0,0,0.6)", 
              display: "flex", 
              boxSizing: "border-box",
              alignItems: "flex-end", 
              justifyContent: "center" 
            }}
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              style={{ 
                width: "100%", 
                maxWidth: "448px", 
                background: "#fff", 
                borderTopLeftRadius: "20px", 
                borderTopRightRadius: "20px", 
                padding: "24px 20px 32px", 
                boxShadow: "0 -4px 20px rgba(0,0,0,0.15)",
                display: "flex",
                flexDirection: "column",
                boxSizing: "border-box",
                gap: 16,
                animation: "slideUp 0.25s ease-out forwards"
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
                <span style={{ fontSize: "12px", color: "#3b82f6", fontWeight: 800 }}>{typeLabel} 공유하기</span>
                <span style={{ fontSize: "16px", color: "#111", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {addrText}
                </span>
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <button 
                  onClick={() => handleMobileKakaoShare(shareTarget)}
                  style={{ 
                    flex: 1, 
                    height: "52px", 
                    background: "#FEE500", 
                    color: "#3C1E1E", 
                    border: "none", 
                    borderRadius: "12px", 
                    fontSize: "14px", 
                    fontWeight: 700, 
                    cursor: "pointer", 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center", 
                    gap: 8 
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#3C1E1E">
                    <path d="M12 3c-5.5 0-10 3.5-10 7.8 0 2.8 1.8 5.2 4.4 6.5l-1 3.7c-.1.3.3.6.5.4l4.3-2.9c.6.1 1.2.1 1.8.1 5.5 0 10-3.5 10-7.8S17.5 3 12 3z"></path>
                  </svg>
                  카카오톡 공유
                </button>

                <button 
                  onClick={() => handleMobileCopyUrl(shareTarget)}
                  style={{ 
                    flex: 1, 
                    height: "52px", 
                    background: "#f3f4f6", 
                    color: "#374151", 
                    border: "none", 
                    borderRadius: "12px", 
                    fontSize: "14px", 
                    fontWeight: 700, 
                    cursor: "pointer", 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center", 
                    gap: 8 
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                  </svg>
                  URL 복사
                </button>
              </div>



              <button 
                onClick={() => setShareTarget(null)}
                style={{ 
                  width: "100%", 
                  height: "48px", 
                  background: "#fff", 
                  color: "#9ca3af", 
                  border: "1px solid #e5e7eb", 
                  borderRadius: "12px", 
                  fontSize: "14px", 
                  fontWeight: 600, 
                  cursor: "pointer",
                  marginTop: 4
                }}
              >
                닫기
              </button>
            </div>
          </div>
        );
      })()}

      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default function MobileVacancyAdminPage() {
  return (
    <Suspense fallback={null}>
      <MobileVacancyAdmin />
    </Suspense>
  );
}
