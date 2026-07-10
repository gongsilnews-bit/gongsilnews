"use client";

import React, { useState, useEffect } from "react";
import { AdminTheme } from "./types";

interface LeadItem {
  id: string;
  agencyName: string;
  ceoName: string;
  city: string;
  district: string;
  phone: string;
  mobile: string;
  status: "wait" | "sent" | "failed" | "unsubscribed";
}

interface MarketingSectionProps {
  theme: AdminTheme;
}

// 모의 데이터베이스 구별 부동산 숫자 매핑
const REGION_COUNTS: Record<string, Record<string, number>> = {
  "서울특별시": {
    "전체": 45120,
    "강남구": 3450,
    "서초구": 2820,
    "송파구": 4120,
    "성북구": 1840,
    "마포구": 2210,
    "영등포구": 2540,
    "동대문구": 1680,
  },
  "경기도": {
    "전체": 38450,
    "성남시 분당구": 2910,
    "수원시 영통구": 2180,
    "고양시 일산동구": 1540,
    "용인시 수지구": 1870,
  },
  "인천광역시": {
    "전체": 18900,
    "남동구": 2130,
    "부평구": 1980,
    "연수구": 1670,
  }
};

export default function MarketingSection({ theme }: MarketingSectionProps) {
  const { cardBg, textPrimary, textSecondary, border, bg, darkMode } = theme;

  // 1. 상태 관리
  const [activeTab, setActiveTab] = useState<"general" | "ad" | "guide" | "data">("ad");
  const [activeRecipTab, setActiveRecipTab] = useState<"db" | "direct" | "excel">("db");
  
  // 메시지 입력
  const [msgTitle, setMsgTitle] = useState("");
  const [msgContent, setMsgContent] = useState("");
  
  // 내 문자함 모달 상태 및 템플릿 검색
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [templateSearchTerm, setTemplateSearchTerm] = useState("");
  const [selectedModalTab, setSelectedModalTab] = useState<"msg" | "photo">("msg");

  // 최근 발송 모달 상태
  const [isRecentModalOpen, setIsRecentModalOpen] = useState(false);

  // 내 문자함 템플릿 리스트
  const [savedTemplates, setSavedTemplates] = useState([
    { id: "t1", title: "공실접수 안내", content: "(광고) 공실뉴스\n\n안녕하세요, {대표자명} 대표님.\n{상호} 인근 신규 매물 접수 안내드립니다. 신속하고 투명한 중개 거래를 위해 공실뉴스 파트너에 무료 가입해보세요!\n\n무료수신거부: 080-1555-5343", byte: 172, date: "2026-07-10 14:30" },
    { id: "t2", title: "추천 매물 목록", content: "(광고) 공실뉴스\n\n안녕하세요, {대표자명} 대표님.\n오늘의 추천 매물 정보 공유드립니다. {지역} 지역 내 단독 독점 물건 다량 보유 중입니다.\n\n무료수신거부: 080-1555-5343", byte: 165, date: "2026-07-09 11:20" },
    { id: "t3", title: "서비스 혜택 안내", content: "(광고) 공실뉴스\n\n안녕하세요, {대표자명} 대표님.\n공실뉴스 프리미엄 멤버십 가입 시 첫달 무료 이벤트 적용 안내입니다.\n\n무료수신거부: 080-1555-5343", byte: 144, date: "2026-07-08 17:05" },
    { id: "t4", title: "[EVENT] 공실뉴스 무료특강", content: "안녕하세요, 공실뉴스 마케팅실입니다.\n오랜만에 인사 드립니다. 대표님들을 위한 세무/유튜브 무료특강이 있어 우선 안내 드립니다.\n\n무료수신거부: 080-1555-5343", byte: 154, date: "2026-07-05 09:52" }
  ]);

  // 최근 발송 리스트 (모바일 말풍선 포맷에 맞춘 데이터)
  const [recentMessages, setRecentMessages] = useState([
    {
      id: "r1",
      title: "특강 안내",
      content: "대표님에게만 우선 보내는 초청 문자입니다.\n\n# 특강 안내\n■ 일시 : 2026.05월 07일 (목)\n■ 시간 : 오후 4시~6시\n■ 대상 : 강남/서초, 부동산 대표님\n■ 강사 : 노정민 세무사 (로앤파트너스 대표), 김동현 마케팅 이사 (전, 공실닷컴)\n■ 금액 : 무료\n■ 장소 : 서울 서초구 서초동 1362-16 (지하철3호선, 신분당선 양재역 2분 출구에서 1분 거리 )\n\n세미나실 장소 때문에 선착순 마감됩니다. 아래 신청서에 우선 접수해주세요!\n감사합니다.\n\nhttps://forms.gle/ZaKLSKNQ1wdW4BfcA",
      type: "장문",
      date: "2026-05-06 오전 10:04"
    },
    {
      id: "r2",
      title: "추천 매물 안내",
      content: "공실뉴스\n안녕하세요, 김동현 고객님. 찾으시는 조건(논현동 보증금 5천/100만원)에 맞는 추천 매물 리스트를 안내해 드립니다.\n\n[매물 링크: ]",
      type: "장문",
      date: "2026-07-10 오후 3:38"
    }
  ]);

  // 발신 및 수신 타겟
  const [selectedCity, setSelectedCity] = useState("서울특별시");
  const [selectedDistrict, setSelectedDistrict] = useState("전체");
  const [directPhoneInput, setDirectPhoneInput] = useState("");
  const [recipients, setRecipients] = useState<any[]>([]);
  
  // 발송 및 설정 관련
  const [sendType, setSendType] = useState<"now" | "reserve">("now");
  const [reserveDateTime, setReserveDateTime] = useState("");
  const [showVariableMenu, setShowVariableMenu] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendProgress, setSendProgress] = useState(0);

  // ----------------------------------------
  // 주소록 (데이터 관리) 상태 관리
  // ----------------------------------------
  const [activeDataSubTab, setActiveDataSubTab] = useState<"realtor" | "lessor">("realtor");
  const [selectedDataIds, setSelectedDataIds] = useState<string[]>([]);
  const [searchRegionSido, setSearchRegionSido] = useState("전체");
  const [searchRegionSigungu, setSearchRegionSigungu] = useState("전체");
  const [searchKeyword, setSearchKeyword] = useState("");

  const [realtorData, setRealtorData] = useState([
    { id: "r1", name: "김동현", agency: "공실공인중개사사무소", phone: "010-1234-5678", sido: "서울특별시", sigungu: "강남구", date: "2026-07-10" },
    { id: "r2", name: "박영희", agency: "에이스부동산중개", phone: "010-9876-5432", sido: "서울특별시", sigungu: "서초구", date: "2026-07-09" },
    { id: "r3", name: "이철수", agency: "일등공인중개사", phone: "010-5555-4444", sido: "경기도", sigungu: "성남시 분당구", date: "2026-07-08" },
    { id: "r4", name: "최민수", agency: "코리아부동산", phone: "010-2222-7777", sido: "인천광역시", sigungu: "연수구", date: "2026-07-06" },
  ]);

  const [lessorData, setLessorData] = useState([
    { id: "l1", name: "최상호", propertyCount: 3, phone: "010-1111-2222", sido: "서울특별시", sigungu: "송파구", date: "2026-07-10" },
    { id: "l2", name: "정은지", propertyCount: 1, phone: "010-3333-4444", sido: "경기도", sigungu: "용인시 수지구", date: "2026-07-09" },
    { id: "l3", name: "강태우", propertyCount: 5, phone: "010-7777-8888", sido: "인천광역시", sigungu: "연수구", date: "2026-07-07" },
  ]);

  // 서브탭 전환 시 체크박스 초기화
  useEffect(() => {
    setSelectedDataIds([]);
  }, [activeDataSubTab]);

  // 2. 바이트 수 및 광고 설정 자동 적용
  useEffect(() => {
    if (activeTab === "ad") {
      setMsgTitle("[광고] 공실뉴스 파트너 가이드");
      setMsgContent(
        "(광고) 공실뉴스\n\n안녕하세요, {대표자명} 대표님.\n부동산 임대관리를 한번에 해결하는 공실뉴스 서비스 안내드립니다.\n\n{상호} 인근의 검증된 공실 매물을 지금 확인해보세요.\n\n🔗 상세정보: https://gongsilnews.com\n\n무료수신거부: 080-1555-5343"
      );
    } else if (activeTab === "general") {
      setMsgTitle("");
      setMsgContent("");
    }
  }, [activeTab]);

  const getByteLength = (str: string) => {
    let b = 0;
    for (let i = 0; i < str.length; i++) {
      const c = str.charCodeAt(i);
      b += c >> 7 ? 2 : 1;
    }
    return b;
  };
  const byteCount = getByteLength(msgContent);
  const isLms = byteCount > 90;
  
  // 수신자 자동 필터링 계산
  const currentDistricts = REGION_COUNTS[selectedCity] ? Object.keys(REGION_COUNTS[selectedCity]) : ["전체"];
  const targetRealtorCount = REGION_COUNTS[selectedCity]?.[selectedDistrict] || 0;
  const unsubscribedCount = Math.round(targetRealtorCount * 0.008); // 0.8% 수신거부 모의
  const finalLeadCount = targetRealtorCount - unsubscribedCount;

  // 3. 핸들러 함수들
  const insertPlaceholder = (tag: string) => {
    setMsgContent(prev => prev + tag);
    setShowVariableMenu(false);
  };

  const handleAddTemplate = () => {
    if (!msgContent.trim()) {
      alert("저장할 메시지 내용을 입력해주세요.");
      return;
    }
    const title = window.prompt("저장할 문자의 제목을 입력하세요:", msgTitle || "새 저장 문자");
    if (title === null) return; // 취소

    const now = new Date();
    const dateString = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const newTemplate = {
      id: `template_${Date.now()}`,
      title: title.trim() || "새 저장 문자",
      content: msgContent,
      byte: byteCount,
      date: dateString
    };

    setSavedTemplates([newTemplate, ...savedTemplates]);
    alert("💾 내 문자함에 성공적으로 저장되었습니다!");
  };

  const handleSelectTemplate = (t: { title: string; content: string }) => {
    setMsgTitle(t.title);
    setMsgContent(t.content);
    setIsTemplateModalOpen(false);
  };

  const handleSelectRecent = (r: { title: string; content: string }) => {
    setMsgTitle(r.title);
    setMsgContent(r.content);
    setIsRecentModalOpen(false);
  };

  const handleDeleteTemplate = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("이 문자를 저장함에서 삭제하시겠습니까?")) {
      setSavedTemplates(savedTemplates.filter(t => t.id !== id));
    }
  };

  const handleAddDbTarget = () => {
    const newGroup = {
      id: `group_${Date.now()}`,
      name: `${selectedCity} ${selectedDistrict} 부동산`,
      count: finalLeadCount,
      type: "db",
      city: selectedCity,
      district: selectedDistrict
    };
    
    if (recipients.some(r => r.type === "db" && r.city === selectedCity && r.district === selectedDistrict)) {
      alert("이미 추가된 지역 타겟입니다.");
      return;
    }
    
    setRecipients([...recipients, newGroup]);
  };

  const handleAddDirect = () => {
    if (!directPhoneInput.trim()) return;
    const lines = directPhoneInput.split("\n").map(l => l.trim()).filter(l => l.length > 0);
    
    const newItems = lines.map((phone, idx) => ({
      id: `direct_${Date.now()}_${idx}`,
      name: `직접입력 ${phone.slice(-4)}`,
      count: 1,
      type: "direct",
      phone: phone
    }));
    
    setRecipients([...recipients, ...newItems]);
    setDirectPhoneInput("");
  };

  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const mockExcelGroup = {
        id: `excel_${Date.now()}`,
        name: `엑셀: ${file.name}`,
        count: 1250,
        type: "excel"
      };
      setRecipients([...recipients, mockExcelGroup]);
      alert(`📁 [엑셀 임포트 완료]\n${file.name} (1,250명 수신 리스트 추가)`);
    }
  };

  const handleRemoveRecipient = (id: string) => {
    setRecipients(recipients.filter(r => r.id !== id));
  };

  const handleClearRecipients = () => {
    setRecipients([]);
  };

  const handleSendSubmit = () => {
    const totalRecips = recipients.reduce((sum, r) => sum + r.count, 0);
    if (totalRecips <= 0) {
      alert("수신번호를 추가해주세요.");
      return;
    }
    if (!msgContent.trim()) {
      alert("메시지 내용을 입력해주세요.");
      return;
    }

    const cost = totalRecips * (isLms ? 35 : 15);
    const confirmSend = window.confirm(
      `🚨 [발송 확인]\n\n수신 인원: ${totalRecips.toLocaleString()}명\n예상 비용: ₩ ${cost.toLocaleString()}\n\n이 메시지를 발송하시겠습니까?`
    );

    if (!confirmSend) return;

    setIsSending(true);
    setSendProgress(0);
    
    let progress = 0;
    const interval = setInterval(() => {
      progress += 20;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setIsSending(false);
        alert(`🎉 발송이 완료되었습니다!\n총 ${totalRecips.toLocaleString()}명 전송 완료.`);
        setRecipients([]);
      }
      setSendProgress(progress);
    }, 1000);
  };

  const totalRecipientCount = recipients.reduce((sum, r) => sum + r.count, 0);

  // 내 문자함 모달 필터링
  const filteredTemplates = savedTemplates.filter(t => 
    t.title.toLowerCase().includes(templateSearchTerm.toLowerCase()) ||
    t.content.toLowerCase().includes(templateSearchTerm.toLowerCase())
  );

  // ----------------------------------------
  // 주소록 (데이터 관리) 기능 구현
  // ----------------------------------------
  
  // 데이터 필터링 계산
  const isRealtorMode = activeDataSubTab === "realtor";
  const rawDataList = isRealtorMode ? realtorData : lessorData;

  const filteredDataList = rawDataList.filter(item => {
    // 시도 필터
    if (searchRegionSido !== "전체" && item.sido !== searchRegionSido) return false;
    // 시군구 필터
    if (searchRegionSigungu !== "전체" && item.sigungu !== searchRegionSigungu) return false;
    // 검색어 필터 (이름, 전화번호, 상호 등)
    if (searchKeyword.trim() !== "") {
      const kw = searchKeyword.toLowerCase();
      const matchName = item.name.toLowerCase().includes(kw);
      const matchPhone = item.phone.replace(/-/g, "").includes(kw.replace(/-/g, ""));
      const matchAgency = isRealtorMode 
        ? (item as any).agency.toLowerCase().includes(kw)
        : false;
      
      return matchName || matchPhone || matchAgency;
    }
    return true;
  });

  // 체크박스 선택 토글
  const handleToggleSelectRow = (id: string) => {
    if (selectedDataIds.includes(id)) {
      setSelectedDataIds(selectedDataIds.filter(x => x !== id));
    } else {
      setSelectedDataIds([...selectedDataIds, id]);
    }
  };

  const handleToggleSelectAll = () => {
    if (selectedDataIds.length === filteredDataList.length) {
      setSelectedDataIds([]);
    } else {
      setSelectedDataIds(filteredDataList.map(item => item.id));
    }
  };

  // 주소 삭제
  const handleDeleteAddress = (id: string, name: string) => {
    if (window.confirm(`[삭제 확인]\n주소록에서 ${name} 연락처를 제거하시겠습니까?`)) {
      if (isRealtorMode) {
        setRealtorData(realtorData.filter(r => r.id !== id));
      } else {
        setLessorData(lessorData.filter(l => l.id !== id));
      }
      setSelectedDataIds(selectedDataIds.filter(x => x !== id));
    }
  };

  // 엑셀 다운로드 (CSV 변환)
  const handleDownloadExcel = () => {
    const headers = isRealtorMode 
      ? "이름,상호,연락처,시도,시군구,등록일\n"
      : "이름,임대건물수,연락처,시도,시군구,등록일\n";
    
    const rows = filteredDataList.map(item => {
      if (isRealtorMode) {
        const r = item as any;
        return `"${r.name}","${r.agency}","${r.phone}","${r.sido}","${r.sigungu}","${r.date}"`;
      } else {
        const l = item as any;
        return `"${l.name}","${l.propertyCount}","${l.phone}","${l.sido}","${l.sigungu}","${l.date}"`;
      }
    }).join("\n");
    
    const csvContent = "\uFEFF" + headers + rows; // 엑셀 한글 깨짐 방지 BOM 추가
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", isRealtorMode ? "부동산_주소록.csv" : "임대인_주소록.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 샘플 파일 다운로드
  const handleDownloadSample = () => {
    const headers = isRealtorMode 
      ? "이름,상호,연락처,시도,시군구\n홍길동,대박공인중개사,010-1234-5678,서울특별시,강남구"
      : "이름,임대건물수,연락처,시도,시군구\n김갑동,2,010-1111-2222,서울특별시,서초구";
      
    const csvContent = "\uFEFF" + headers;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", isRealtorMode ? "부동산_주소록_샘플양식.csv" : "임대인_주소록_샘플양식.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 엑셀 업로드 파일 리더 연동
  const handleUploadExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (!text) return;
        const lines = text.split("\n").map(line => line.trim()).filter(line => line.length > 0);
        
        // 헤더 제외하고 데이터 파싱
        const dataLines = lines.slice(1);
        const newItems: any[] = [];
        
        dataLines.forEach((line, idx) => {
          const cols = line.split(",").map(c => c.trim().replace(/^["']|["']$/g, ""));
          if (cols.length >= 4) {
            if (isRealtorMode) {
              newItems.push({
                id: `realtor_csv_${Date.now()}_${idx}`,
                name: cols[0] || "엑셀회원",
                agency: cols[1] || "정보없음",
                phone: cols[2] || "010-0000-0000",
                sido: cols[3] || "서울특별시",
                sigungu: cols[4] || "전체",
                date: new Date().toISOString().split("T")[0]
              });
            } else {
              newItems.push({
                id: `lessor_csv_${Date.now()}_${idx}`,
                name: cols[0] || "엑셀임대인",
                propertyCount: parseInt(cols[1]) || 1,
                phone: cols[2] || "010-0000-0000",
                sido: cols[3] || "서울특별시",
                sigungu: cols[4] || "전체",
                date: new Date().toISOString().split("T")[0]
              });
            }
          }
        });

        if (newItems.length > 0) {
          if (isRealtorMode) {
            setRealtorData([...(newItems as any), ...realtorData]);
          } else {
            setLessorData([...(newItems as any), ...lessorData]);
          }
          alert(`🎉 엑셀 업로드 완료!\n총 ${newItems.length}행의 데이터가 주소록에 추가되었습니다.`);
        } else {
          // 데모용 샘플 데이터 자동 로드
          if (isRealtorMode) {
            const demoRealtors = [
              { id: `realtor_demo_${Date.now()}_1`, name: "강성호", agency: "스마트중개사", phone: "010-8888-9999", sido: "서울특별시", sigungu: "마포구", date: new Date().toISOString().split("T")[0] },
              { id: `realtor_demo_${Date.now()}_2`, name: "임하늘", agency: "파트너공인", phone: "010-7777-6666", sido: "경기도", sigungu: "성남시 분당구", date: new Date().toISOString().split("T")[0] }
            ];
            setRealtorData([...demoRealtors, ...realtorData]);
            alert(`📁 파일명: ${file.name}\n(양식 자동 규격 보완을 위해 데모 데이터 ${demoRealtors.length}건이 주소록에 자동 등록되었습니다.)`);
          } else {
            const demoLessors = [
              { id: `lessor_demo_${Date.now()}_1`, name: "홍길동", propertyCount: 2, phone: "010-4444-5555", sido: "서울특별시", sigungu: "강남구", date: new Date().toISOString().split("T")[0] },
              { id: `lessor_demo_${Date.now()}_2`, name: "심사임당", propertyCount: 4, phone: "010-2222-3333", sido: "인천광역시", sigungu: "부평구", date: new Date().toISOString().split("T")[0] }
            ];
            setLessorData([...demoLessors, ...lessorData]);
            alert(`📁 파일명: ${file.name}\n(양식 자동 규격 보완을 위해 데모 데이터 ${demoLessors.length}건이 주소록에 자동 등록되었습니다.)`);
          }
        }
      };
      reader.readAsText(file, "utf-8");
    }
  };

  // 선택된 항목 수신자로 등록 후 문자 발송 페이지로 복귀
  const handleAddSelectedToRecipients = () => {
    const selectedList = rawDataList.filter(item => selectedDataIds.includes(item.id));
    if (selectedList.length === 0) {
      alert("수신인으로 지정할 연락처를 체크박스로 선택해주세요.");
      return;
    }

    const newItems = selectedList.map(item => {
      const typeLabel = isRealtorMode ? `[부동산:${(item as any).agency}]` : "[임대인]";
      return {
        id: `addr_${Date.now()}_${item.id}`,
        name: `${item.name} ${typeLabel}`,
        count: 1,
        type: "direct",
        phone: item.phone
      };
    });

    setRecipients([...recipients, ...newItems]);
    setSelectedDataIds([]);
    setActiveTab("ad"); // 광고문자(작성) 탭으로 이동
    alert(`🎉 선택하신 주소록 인원 ${selectedList.length}명을 문자 발송 수신자로 지정하였습니다!`);
  };

  return (
    <div style={{ padding: "20px 32px", display: "flex", flexDirection: "column", gap: "16px", height: "calc(100vh - 64px)", overflowY: "auto", background: darkMode ? "#18191c" : "#f4f5f7" }}>
      {/* 1. 페이지 헤더 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${border}`, paddingBottom: 12 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: textPrimary, margin: 0 }}>문자</h1>
        <div style={{ fontSize: 13, color: textSecondary, fontWeight: 600 }}>
          잔액: <span style={{ color: "#3b82f6", fontWeight: 800 }}>9,955원</span> | 씨앗: <span style={{ color: "#10b981", fontWeight: 800 }}>8,326통</span>
        </div>
      </div>

      {/* 2. 뿌리오 서브 탭 (4번째에 데이터 관리 추가) */}
      <div style={{ display: "flex", gap: "2px", borderBottom: `2px solid ${darkMode ? "#333" : "#e5e7eb"}`, paddingBottom: 0 }}>
        <button 
          onClick={() => setActiveTab("general")}
          style={{
            padding: "10px 24px", fontSize: "14px", fontWeight: 800, cursor: "pointer", border: "none", background: "none",
            color: activeTab === "general" ? "#3b82f6" : textSecondary,
            borderBottom: activeTab === "general" ? "3px solid #3b82f6" : "3px solid transparent",
            marginBottom: -2, transition: "all 0.15s"
          }}
        >
          일반문자
        </button>
        <button 
          onClick={() => setActiveTab("ad")}
          style={{
            padding: "10px 24px", fontSize: "14px", fontWeight: 800, cursor: "pointer", border: "none", background: "none",
            color: activeTab === "ad" ? "#3b82f6" : textSecondary,
            borderBottom: activeTab === "ad" ? "3px solid #3b82f6" : "3px solid transparent",
            marginBottom: -2, transition: "all 0.15s"
          }}
        >
          광고문자
        </button>
        <button 
          onClick={() => setActiveTab("guide")}
          style={{
            padding: "10px 24px", fontSize: "14px", fontWeight: 800, cursor: "pointer", border: "none", background: "none",
            color: activeTab === "guide" ? "#3b82f6" : textSecondary,
            borderBottom: activeTab === "guide" ? "3px solid #3b82f6" : "3px solid transparent",
            marginBottom: -2, transition: "all 0.15s"
          }}
        >
          광고이용안내
        </button>
        <button 
          onClick={() => setActiveTab("data")}
          style={{
            padding: "10px 24px", fontSize: "14px", fontWeight: 800, cursor: "pointer", border: "none", background: "none",
            color: activeTab === "data" ? "#3b82f6" : textSecondary,
            borderBottom: activeTab === "data" ? "3px solid #3b82f6" : "3px solid transparent",
            marginBottom: -2, transition: "all 0.15s"
          }}
        >
          데이터 관리(주소록)
        </button>
      </div>

      {/* 3. 본문 레이아웃 */}
      {activeTab === "data" ? (
        
        // === [데이터 관리 주소록] 풀와이드 레이아웃 구현 ===
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", background: cardBg, padding: "20px 24px", borderRadius: 12, border: `1px solid ${border}`, boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
          
          {/* 상단 컨트롤 영역 */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${border}`, paddingBottom: 16 }}>
            {/* 서브 카테고리 (부동산 / 임대인) */}
            <div style={{ display: "flex", gap: 4, background: darkMode ? "#202124" : "#f1f5f9", padding: 3, borderRadius: 6 }}>
              <button 
                onClick={() => setActiveDataSubTab("realtor")}
                style={{
                  height: 30, padding: "0 18px", border: "none", borderRadius: 4, fontSize: 12, fontWeight: 800, cursor: "pointer",
                  background: isRealtorMode ? (darkMode ? "#374151" : "#fff") : "none",
                  color: isRealtorMode ? textPrimary : textSecondary,
                  boxShadow: isRealtorMode ? "0 1px 3px rgba(0,0,0,0.06)" : "none"
                }}
              >
                부동산 주소록 ({realtorData.length})
              </button>
              <button 
                onClick={() => setActiveDataSubTab("lessor")}
                style={{
                  height: 30, padding: "0 18px", border: "none", borderRadius: 4, fontSize: 12, fontWeight: 800, cursor: "pointer",
                  background: !isRealtorMode ? (darkMode ? "#374151" : "#fff") : "none",
                  color: !isRealtorMode ? textPrimary : textSecondary,
                  boxShadow: !isRealtorMode ? "0 1px 3px rgba(0,0,0,0.06)" : "none"
                }}
              >
                임대인 주소록 ({lessorData.length})
              </button>
            </div>

            {/* 엑셀 관련 일괄 기능 */}
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button 
                onClick={handleDownloadSample}
                style={{ height: 34, padding: "0 12px", background: darkMode ? "#2c2d31" : "#fff", border: `1px solid ${border}`, borderRadius: 6, fontSize: 12, fontWeight: 700, color: textPrimary, cursor: "pointer" }}
              >
                📥 샘플 양식 받기
              </button>
              <button 
                onClick={handleDownloadExcel}
                style={{ height: 34, padding: "0 12px", background: "#10b981", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
              >
                💚 엑셀 다운로드
              </button>
              <label style={{ height: 34, padding: "0 12px", background: "#3b82f6", color: "#fff", borderRadius: 6, fontSize: 12, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                📤 엑셀 파일 업로드
                <input type="file" accept=".csv, .xlsx" onChange={handleUploadExcel} style={{ display: "none" }} />
              </label>
            </div>
          </div>

          {/* 주소록 전용 세부 필터 및 검색창 */}
          <div style={{ display: "flex", gap: 12, background: darkMode ? "#202124" : "#f8fafc", padding: 14, borderRadius: 8, alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: textSecondary }}>지역 필터:</span>
              <select 
                value={searchRegionSido} onChange={(e) => { setSearchRegionSido(e.target.value); setSearchRegionSigungu("전체"); }}
                style={{ height: 32, padding: "0 8px", borderRadius: 4, border: `1px solid ${border}`, background: darkMode ? "#2c2d31" : "#fff", color: textPrimary, fontSize: 12, outline: "none", fontWeight: 700 }}
              >
                <option value="전체">시/도 전체</option>
                {Object.keys(REGION_COUNTS).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select 
                value={searchRegionSigungu} onChange={(e) => setSearchRegionSigungu(e.target.value)}
                style={{ height: 32, padding: "0 8px", borderRadius: 4, border: `1px solid ${border}`, background: darkMode ? "#2c2d31" : "#fff", color: textPrimary, fontSize: 12, outline: "none", fontWeight: 700 }}
              >
                <option value="전체">시/군/구 전체</option>
                {searchRegionSido !== "전체" && REGION_COUNTS[searchRegionSido] && 
                  Object.keys(REGION_COUNTS[searchRegionSido]).map(d => <option key={d} value={d}>{d}</option>)
                }
              </select>
            </div>

            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
              <input 
                type="text" 
                placeholder={isRealtorMode ? "이름, 상호, 또는 연락처 검색" : "이름 또는 연락처 검색"}
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                style={{
                  flex: 1, height: 32, padding: "0 12px", borderRadius: 4, border: `1px solid ${border}`,
                  background: darkMode ? "#2c2d31" : "#fff", color: textPrimary, fontSize: 12, outline: "none"
                }}
              />
              <button 
                onClick={() => { setSearchKeyword(""); setSearchRegionSido("전체"); setSearchRegionSigungu("전체"); }}
                style={{ height: 32, padding: "0 12px", background: darkMode ? "#2c2d31" : "#fff", border: `1px solid ${border}`, borderRadius: 4, fontSize: 12, fontWeight: 700, color: textPrimary, cursor: "pointer" }}
              >
                필터 초기화
              </button>
            </div>
          </div>

          {/* 주소록 테이블 */}
          <div style={{ border: `1px solid ${border}`, borderRadius: 8, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
              <thead>
                <tr style={{ background: darkMode ? "#202124" : "#f8fafc", borderBottom: `1px solid ${border}` }}>
                  <th style={{ padding: "12px 16px", width: 40, textAlign: "center" }}>
                    <input 
                      type="checkbox" 
                      checked={filteredDataList.length > 0 && selectedDataIds.length === filteredDataList.length}
                      onChange={handleToggleSelectAll}
                      style={{ cursor: "pointer" }}
                    />
                  </th>
                  <th style={{ padding: "12px 16px", fontWeight: 800, color: textPrimary }}>이름</th>
                  <th style={{ padding: "12px 16px", fontWeight: 800, color: textPrimary }}>
                    {isRealtorMode ? "상호명" : "보유 임대건물 수"}
                  </th>
                  <th style={{ padding: "12px 16px", fontWeight: 800, color: textPrimary }}>연락처</th>
                  <th style={{ padding: "12px 16px", fontWeight: 800, color: textPrimary }}>소속 지역</th>
                  <th style={{ padding: "12px 16px", fontWeight: 800, color: textPrimary }}>등록일</th>
                  <th style={{ padding: "12px 16px", width: 80, textAlign: "center", fontWeight: 800, color: textPrimary }}>작업</th>
                </tr>
              </thead>
              <tbody>
                {filteredDataList.map((item) => (
                  <tr 
                    key={item.id} 
                    style={{ 
                      borderBottom: `1px solid ${border}`, 
                      background: selectedDataIds.includes(item.id) 
                        ? (darkMode ? "#2a3b5c" : "#eff6ff") 
                        : "none",
                      transition: "background 0.15s"
                    }}
                  >
                    <td style={{ padding: "12px 16px", textAlign: "center" }}>
                      <input 
                        type="checkbox" 
                        checked={selectedDataIds.includes(item.id)}
                        onChange={() => handleToggleSelectRow(item.id)}
                        style={{ cursor: "pointer" }}
                      />
                    </td>
                    <td style={{ padding: "12px 16px", fontWeight: 700, color: textPrimary }}>{item.name}</td>
                    <td style={{ padding: "12px 16px", color: textSecondary, fontWeight: 600 }}>
                      {isRealtorMode ? (item as any).agency : `${(item as any).propertyCount}개 매물`}
                    </td>
                    <td style={{ padding: "12px 16px", fontWeight: 700, color: "#3b82f6" }}>{item.phone}</td>
                    <td style={{ padding: "12px 16px", color: textPrimary, fontWeight: 600 }}>
                      {item.sido} {item.sigungu}
                    </td>
                    <td style={{ padding: "12px 16px", color: textSecondary }}>{item.date}</td>
                    <td style={{ padding: "12px 16px", textAlign: "center" }}>
                      <button 
                        onClick={() => handleDeleteAddress(item.id, item.name)}
                        style={{ border: "none", background: "none", color: "#ef4444", cursor: "pointer", fontSize: 13, fontWeight: "bold" }}
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredDataList.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ padding: "40px 0", textAlign: "center", color: textSecondary, fontSize: 13 }}>
                      주소록에 등록된 연락처가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* 테이블 하단 수신인 일괄 등록 바 */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
            <span style={{ fontSize: 13, color: textSecondary, fontWeight: 700 }}>
              선택된 연락처: <span style={{ color: "#3b82f6", fontWeight: 800 }}>{selectedDataIds.length}</span> / {filteredDataList.length}건
            </span>

            <button 
              onClick={handleAddSelectedToRecipients}
              disabled={selectedDataIds.length === 0}
              style={{
                height: 40, padding: "0 20px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 6,
                fontSize: 13, fontWeight: 800, cursor: selectedDataIds.length === 0 ? "not-allowed" : "pointer",
                opacity: selectedDataIds.length === 0 ? 0.5 : 1, transition: "all 0.15s",
                boxShadow: "0 4px 6px rgba(59, 130, 246, 0.15)"
              }}
            >
              선택한 주소록 연락처를 [문자 발송 대상]으로 추가 🚀
            </button>
          </div>

        </div>

      ) : (
        
        // === [일반문자 / 광고문자] 기존 2열 레이아웃 구현 ===
        <div style={{ display: "flex", gap: "24px", alignItems: "flex-start", flex: 1 }}>
          
          {/* === 좌측: 메시지 입력 (Message Editor) === */}
          <div style={{ width: "460px", flexShrink: 0, display: "flex", flexDirection: "column", gap: "12px", background: cardBg, padding: 20, borderRadius: 12, border: `1px solid ${border}`, boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
            
            {/* 가이드 문구 */}
            <div style={{ fontSize: "12px", color: textSecondary, lineHeight: 1.5, background: darkMode ? "#202124" : "#f8fafc", padding: "12px", borderRadius: 8, borderLeft: "4px solid #3b82f6" }}>
              • 90byte 초과 시, 장문(LMS)으로 자동 전환됩니다.<br />
              • 광고성 문자는 반드시 <span style={{ color: "#ef4444", fontWeight: 700 }}>[광고문자]</span> 탭에서 발송해주세요.
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: textPrimary }}>메시지 입력</h3>
              
              {/* 제목 인풋 */}
              <input 
                type="text" 
                placeholder="제목을 입력해주세요. (최대30byte)"
                value={msgTitle}
                onChange={(e) => setMsgTitle(e.target.value)}
                style={{
                  width: "100%", height: 38, padding: "0 12px", borderRadius: 6, border: `1px solid ${border}`,
                  background: darkMode ? "#2c2d31" : "#fff", color: textPrimary, outline: "none", fontSize: 13, fontWeight: 600
                }}
              />

              {/* 에디터 툴바 */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
                <div style={{ display: "flex", gap: 6 }}>
                  <span style={{ padding: "4px 8px", background: "#fef3c7", color: "#d97706", borderRadius: 4, fontWeight: 800, fontSize: 11 }}>✦ AI 추천</span>
                  <span style={{ padding: "4px 8px", background: "#dbeafe", color: "#2563eb", borderRadius: 4, fontWeight: 800, fontSize: 11 }}>✦ AI 생성</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontWeight: 800, color: textPrimary }}>{byteCount}</span>
                  <span style={{ color: textSecondary }}>/ 90byte</span>
                  <span style={{
                    padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: 800,
                    background: isLms ? "#fecaca" : "#d1fae5",
                    color: isLms ? "#b91c1c" : "#065f46"
                  }}>
                    {isLms ? "장문" : "단문"}
                  </span>
                  <button 
                    onClick={() => setMsgContent("")}
                    style={{ border: "none", background: "none", cursor: "pointer", fontSize: 14, color: textSecondary }}
                    title="초기화"
                  >
                    🔄
                  </button>
                </div>
              </div>

              {/* 에디터 텍스트에어리어 */}
              <textarea 
                placeholder="내용을 입력해주세요. 90byte 초과 시 장문 문자로 자동 전환됩니다."
                value={msgContent}
                onChange={(e) => setMsgContent(e.target.value)}
                style={{
                  width: "100%", height: 340, padding: 14, borderRadius: 6, border: `1px solid ${border}`,
                  background: darkMode ? "#2c2d31" : "#fff", color: textPrimary, outline: "none", resize: "none",
                  fontSize: 13, lineHeight: 1.6, fontFamily: "inherit"
                }}
              />

              {/* 변수 및 특수문자 단축바 */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${border}`, paddingBottom: 12 }}>
                <div style={{ display: "flex", gap: 8, position: "relative" }}>
                  <button style={{ padding: "6px 12px", background: darkMode ? "#202124" : "#f1f5f9", border: `1px solid ${border}`, borderRadius: 6, fontSize: 12, fontWeight: 700, color: textPrimary, cursor: "pointer" }}>
                    특수문자 ▾
                  </button>
                  <button 
                    onClick={() => setShowVariableMenu(!showVariableMenu)}
                    style={{ padding: "6px 12px", background: darkMode ? "#202124" : "#f1f5f9", border: `1px solid ${border}`, borderRadius: 6, fontSize: 12, fontWeight: 700, color: textPrimary, cursor: "pointer" }}
                  >
                    변수추가 ▾
                  </button>
                  
                  {showVariableMenu && (
                    <div style={{
                      position: "absolute", bottom: "100%", left: 80, background: darkMode ? "#25262b" : "#fff", border: `1px solid ${border}`,
                      borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.15)", padding: 6, display: "flex", flexDirection: "column", gap: 4, zIndex: 10
                    }}>
                      {["{대표자명}", "{상호}", "{지역}"].map(v => (
                        <button 
                          key={v}
                          onClick={() => insertPlaceholder(v)}
                          style={{ padding: "8px 16px", background: "none", border: "none", color: textPrimary, fontSize: 12, fontWeight: 700, cursor: "pointer", textAlign: "left", borderRadius: 4 }}
                          onMouseEnter={e => e.currentTarget.style.background = darkMode ? "#333" : "#f3f4f6"}
                          onMouseLeave={e => e.currentTarget.style.background = "none"}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: textSecondary }}>
                  <label style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                    <input type="checkbox" style={{ cursor: "pointer" }} /> 변수 길게 사용
                  </label>
                </div>
              </div>

              {/* 에디터 하단 버튼 */}
              <div style={{ display: "flex", gap: 8 }}>
                <button 
                  type="button"
                  onClick={() => setIsRecentModalOpen(true)}
                  style={{ flex: 1, height: 38, background: darkMode ? "#202124" : "#f1f5f9", border: `1px solid ${border}`, borderRadius: 6, fontSize: 12, fontWeight: 700, color: textPrimary, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                >
                  🕒 최근발송
                </button>
                <button 
                  type="button"
                  onClick={() => setIsTemplateModalOpen(true)}
                  style={{ flex: 1, height: 38, background: "#3b82f6", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                >
                  📁 내 문자함
                </button>
                <button 
                  type="button"
                  onClick={handleAddTemplate}
                  style={{ flex: 1, height: 38, background: darkMode ? "#202124" : "#f1f5f9", border: `1px solid ${border}`, borderRadius: 6, fontSize: 12, fontWeight: 700, color: textPrimary, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                >
                  💾 문자저장
                </button>
              </div>

            </div>
          </div>

          {/* === 우측: 발신번호 & 수신번호 설정 (Target Panel - 최대 가로폭 680px로 제한) === */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "16px", minWidth: 0, maxWidth: "680px" }}>
            
            {/* 발신번호 설정 */}
            <div style={{ background: cardBg, padding: 16, borderRadius: 12, border: `1px solid ${border}`, boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
              <h3 style={{ margin: "0 0 12px 0", fontSize: 14, fontWeight: 800, color: textPrimary }}>발신번호 설정</h3>
              <div style={{ display: "flex", gap: 8 }}>
                <select style={{ flex: 1, height: 36, padding: "0 10px", borderRadius: 6, border: `1px solid ${border}`, background: darkMode ? "#2c2d31" : "#fff", color: textPrimary, outline: "none", fontWeight: 700 }}>
                  <option>1555-5343 (공식 대표번호)</option>
                </select>
                <button style={{ height: 36, padding: "0 12px", background: darkMode ? "#202124" : "#fff", border: `1px solid ${border}`, borderRadius: 6, fontSize: 12, fontWeight: 700, color: textPrimary, cursor: "pointer" }}>
                  발신번호 등록
                </button>
              </div>
            </div>

            {/* 수신번호 설정 */}
            <div style={{ background: cardBg, padding: 20, borderRadius: 12, border: `1px solid ${border}`, boxShadow: "0 2px 8px rgba(0,0,0,0.02)", display: "flex", flexDirection: "column", gap: 12 }}>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: textPrimary }}>수신번호 입력</h3>
              
              {/* 수신 탭 */}
              <div style={{ display: "flex", gap: 4, background: darkMode ? "#202124" : "#f1f5f9", padding: 3, borderRadius: 6 }}>
                <button 
                  onClick={() => setActiveRecipTab("db")}
                  style={{
                    flex: 1, height: 28, border: "none", borderRadius: 4, fontSize: 11, fontWeight: 800, cursor: "pointer",
                    background: activeRecipTab === "db" ? (darkMode ? "#374151" : "#fff") : "none",
                    color: activeRecipTab === "db" ? textPrimary : textSecondary,
                    boxShadow: activeRecipTab === "db" ? "0 1px 3px rgba(0,0,0,0.06)" : "none"
                  }}
                >
                  지역/DB 타겟
                </button>
                <button 
                  onClick={() => setActiveRecipTab("direct")}
                  style={{
                    flex: 1, height: 28, border: "none", borderRadius: 4, fontSize: 11, fontWeight: 800, cursor: "pointer",
                    background: activeRecipTab === "direct" ? (darkMode ? "#374151" : "#fff") : "none",
                    color: activeRecipTab === "direct" ? textPrimary : textSecondary,
                    boxShadow: activeRecipTab === "direct" ? "0 1px 3px rgba(0,0,0,0.06)" : "none"
                  }}
                >
                  직접입력
                </button>
                <button 
                  onClick={() => setActiveRecipTab("excel")}
                  style={{
                    flex: 1, height: 28, border: "none", borderRadius: 4, fontSize: 11, fontWeight: 800, cursor: "pointer",
                    background: activeRecipTab === "excel" ? (darkMode ? "#374151" : "#fff") : "none",
                    color: activeRecipTab === "excel" ? textPrimary : textSecondary,
                    boxShadow: activeRecipTab === "excel" ? "0 1px 3px rgba(0,0,0,0.06)" : "none"
                  }}
                >
                  엑셀 업로드
                </button>
              </div>

              {/* 수신 입력 카드 양방향 분할 레이아웃 (세로 높이 320px) */}
              <div style={{ display: "flex", gap: 12, height: 320 }}>
                
                {/* 좌측: 입력 컨트롤러 */}
                <div style={{ flex: 1.2, display: "flex", flexDirection: "column", gap: 8, height: "100%", justifyContent: "space-between" }}>
                  {activeRecipTab === "db" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, height: "100%", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <label style={{ fontSize: 11, fontWeight: 700, color: textSecondary }}>시/도</label>
                        <select 
                          value={selectedCity} onChange={(e) => { setSelectedCity(e.target.value); setSelectedDistrict("전체"); }}
                          style={{ width: "100%", height: 32, padding: "0 8px", borderRadius: 4, border: `1px solid ${border}`, background: darkMode ? "#2c2d31" : "#fff", color: textPrimary, fontSize: 12, outline: "none", fontWeight: 700 }}
                        >
                          {Object.keys(REGION_COUNTS).map(c => <option key={c}>{c}</option>)}
                        </select>
                        
                        <label style={{ fontSize: 11, fontWeight: 700, color: textSecondary }}>시/군/구</label>
                        <select 
                          value={selectedDistrict} onChange={(e) => setSelectedDistrict(e.target.value)}
                          style={{ width: "100%", height: 32, padding: "0 8px", borderRadius: 4, border: `1px solid ${border}`, background: darkMode ? "#2c2d31" : "#fff", color: textPrimary, fontSize: 12, outline: "none", fontWeight: 700 }}
                        >
                          {currentDistricts.map(d => <option key={d}>{d}</option>)}
                        </select>
                        
                        <span style={{ fontSize: 11, color: "#3b82f6", fontWeight: 800, marginTop: 4 }}>
                          추출 대상: {finalLeadCount.toLocaleString()}명
                        </span>
                      </div>
                      
                      <button 
                        onClick={handleAddDbTarget}
                        style={{ width: "100%", height: 36, background: "#3b82f6", color: "#fff", border: "none", borderRadius: 4, fontSize: 12, fontWeight: 800, cursor: "pointer", marginTop: 4 }}
                      >
                        타겟 그룹 추가 +
                      </button>
                    </div>
                  )}

                  {activeRecipTab === "direct" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, height: "100%" }}>
                      <textarea 
                        placeholder="휴대폰번호 입력 후 엔터&#13;1만 건까지 붙여넣기 가능&#13;(Shift+Enter 입력 시 연속입력)"
                        value={directPhoneInput}
                        onChange={(e) => setDirectPhoneInput(e.target.value)}
                        style={{ width: "100%", flex: 1, padding: 8, borderRadius: 4, border: `1px solid ${border}`, background: darkMode ? "#2c2d31" : "#fff", color: textPrimary, fontSize: 11, outline: "none", resize: "none", fontFamily: "inherit" }}
                      />
                      <button 
                        onClick={handleAddDirect}
                        style={{ height: 36, background: "#3b82f6", color: "#fff", border: "none", borderRadius: 4, fontSize: 12, fontWeight: 800, cursor: "pointer" }}
                      >
                        번호 추가 +
                      </button>
                    </div>
                  )}

                  {activeRecipTab === "excel" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10, height: "100%", justifyContent: "center", alignItems: "center", border: `2px dashed ${border}`, borderRadius: 6, padding: 12 }}>
                      <span style={{ fontSize: 32 }}>파일</span>
                      <span style={{ fontSize: 11, color: textSecondary, textAlign: "center" }}>
                        엑셀 파일을 드래그하거나<br />아래 버튼으로 업로드하세요.
                      </span>
                      <label style={{ padding: "8px 16px", background: "#10b981", color: "#fff", borderRadius: 4, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                        파일 선택
                        <input type="file" accept=".xlsx, .csv" onChange={handleExcelImport} style={{ display: "none" }} />
                      </label>
                    </div>
                  )}
                </div>

                {/* 우측: 추가된 수신자 목록 (받는사람) */}
                <div style={{ flex: 1, border: `1px solid ${border}`, borderRadius: 6, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                  <div style={{ padding: "6px 10px", background: darkMode ? "#202124" : "#f1f5f9", fontSize: 11, fontWeight: 800, color: textPrimary, borderBottom: `1px solid ${border}`, display: "flex", justifyContent: "space-between" }}>
                    <span>받는사람</span>
                    <button onClick={handleClearRecipients} style={{ border: "none", background: "none", color: "#ef4444", fontSize: 10, fontWeight: 800, cursor: "pointer" }}>전체 제거</button>
                  </div>
                  
                  <div style={{ flex: 1, overflowY: "auto", padding: 6, display: "flex", flexDirection: "column", gap: 4 }}>
                    {recipients.length === 0 ? (
                      <div style={{ margin: "auto", fontSize: 11, color: textSecondary, textAlign: "center", padding: "20px 0" }}>
                        추가된 수신번호가<br />없습니다.
                      </div>
                    ) : (
                      recipients.map(r => (
                        <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 8px", background: darkMode ? "#2c2d31" : "#f3f4f6", borderRadius: 4, fontSize: 11 }}>
                          <span style={{ fontWeight: 700, color: textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 110 }}>{r.name}</span>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ color: "#3b82f6", fontWeight: 800 }}>{r.count.toLocaleString()}명</span>
                            <button onClick={() => handleRemoveRecipient(r.id)} style={{ border: "none", background: "none", color: textSecondary, cursor: "pointer", fontSize: 12 }}>×</button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  
                  <div style={{ padding: "8px 10px", borderTop: `1px solid ${border}`, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
                    <span style={{ fontWeight: 800, color: textPrimary }}>전체 {totalRecipientCount.toLocaleString()} 명</span>
                    <button style={{ padding: "4px 8px", background: darkMode ? "#374151" : "#fff", border: `1px solid ${border}`, borderRadius: 4, fontSize: 10, fontWeight: 700, color: textPrimary, cursor: "pointer" }}>주소록에 저장</button>
                  </div>
                </div>

              </div>

              {/* 발송 설정 */}
              <div style={{ borderTop: `1px solid ${border}`, paddingTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: textPrimary }}>발송 설정</span>
                <div style={{ display: "flex", gap: 16, fontSize: 12 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontWeight: 700, color: textPrimary }}>
                    <input type="radio" checked={sendType === "now"} onChange={() => setSendType("now")} style={{ cursor: "pointer" }} /> 즉시 발송
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontWeight: 700, color: textPrimary }}>
                    <input type="radio" checked={sendType === "reserve"} onChange={() => setSendType("reserve")} style={{ cursor: "pointer" }} /> 예약 발송
                  </label>
                </div>

                {sendType === "reserve" && (
                  <input 
                    type="datetime-local" 
                    value={reserveDateTime} 
                    onChange={(e) => setReserveDateTime(e.target.value)}
                    style={{ width: "100%", height: 32, padding: "0 8px", borderRadius: 4, border: `1px solid ${border}`, background: darkMode ? "#2c2d31" : "#fff", color: textPrimary, fontSize: 12, outline: "none" }}
                  />
                )}
              </div>

              {/* 발송 진행률 바 */}
              {isSending && (
                <div style={{ width: "100%", background: darkMode ? "#222" : "#e5e7eb", borderRadius: 4, height: 12, overflow: "hidden", position: "relative" }}>
                  <div style={{ width: `${sendProgress}%`, background: "#3b82f6", height: "100%", transition: "width 0.4s" }} />
                </div>
              )}

              {/* 전송 버튼 */}
              <button 
                onClick={handleSendSubmit}
                disabled={isSending || totalRecipientCount <= 0}
                style={{
                  width: "100%", height: 44, background: "#3b82f6", color: "#fff", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 800,
                  cursor: isSending || totalRecipientCount <= 0 ? "not-allowed" : "pointer",
                  opacity: isSending || totalRecipientCount <= 0 ? 0.6 : 1,
                  boxShadow: "0 4px 6px rgba(59, 130, 246, 0.2)", display: "flex", alignItems: "center", justifyContent: "center"
                }}
              >
                {isSending ? "발송 중..." : "발송하기"}
              </button>
            </div>

          </div>

        </div>
      )}

      {/* === 고해상도 뿌리오 스타일 "내 문자함" 팝업 모달 === */}
      {isTemplateModalOpen && (
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
          backgroundColor: "rgba(0, 0, 0, 0.55)", display: "flex", justifyContent: "center",
          alignItems: "center", zIndex: 9999, backdropFilter: "blur(2px)"
        }}>
          <div style={{
            background: darkMode ? "#1f2023" : "#ffffff", width: 840, maxHeight: "90vh",
            borderRadius: 14, overflow: "hidden", boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
            border: `1px solid ${border}`, display: "flex", flexDirection: "column"
          }}>
            {/* 모달 헤더 */}
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "16px 24px", borderBottom: `1px solid ${border}`, background: darkMode ? "#25262b" : "#f8fafc"
            }}>
              <span style={{ fontSize: 16, fontWeight: 900, color: textPrimary }}>내 문자함</span>
              <button 
                onClick={() => setIsTemplateModalOpen(false)}
                style={{
                  background: "none", border: "none", fontSize: 20, color: textSecondary,
                  cursor: "pointer", fontWeight: "bold"
                }}
              >
                ✕
              </button>
            </div>

            {/* 모달 서브 탭 */}
            <div style={{
              display: "flex", gap: "2px", borderBottom: `1px solid ${border}`,
              padding: "0 24px", background: darkMode ? "#1f2023" : "#ffffff"
            }}>
              <button 
                onClick={() => setSelectedModalTab("msg")}
                style={{
                  padding: "12px 20px", fontSize: "13px", fontWeight: 800, cursor: "pointer", border: "none", background: "none",
                  color: selectedModalTab === "msg" ? "#3b82f6" : textSecondary,
                  borderBottom: selectedModalTab === "msg" ? "2px solid #3b82f6" : "2px solid transparent",
                  marginBottom: -1
                }}
              >
                문자({savedTemplates.length})
              </button>
              <button 
                onClick={() => setSelectedModalTab("photo")}
                style={{
                  padding: "12px 20px", fontSize: "13px", fontWeight: 800, cursor: "pointer", border: "none", background: "none",
                  color: selectedModalTab === "photo" ? "#3b82f6" : textSecondary,
                  borderBottom: selectedModalTab === "photo" ? "2px solid #3b82f6" : "2px solid transparent",
                  marginBottom: -1
                }}
              >
                포토문자(0)
              </button>
            </div>

            {/* 모달 본문 전체 */}
            <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: 12, flex: 1, overflowY: "auto" }}>
              
              {/* 알림 문구 */}
              <div style={{ fontSize: "11px", color: textSecondary, lineHeight: 1.6, background: darkMode ? "#25262b" : "#f1f5f9", padding: "10px 14px", borderRadius: 8 }}>
                * 메시지 내용을 선택하시면 메시지 내용을 본문으로 불러옵니다. (수정 및 저장한 내용은 발송창에서 작성 가능)<br />
                * 광고(선거)문자에서 단문을 불러오는 경우 수신거부 등의 문구 추가에 따라 자동으로 장문으로 전환될 수 있습니다.
              </div>

              {/* 검색 및 선택삭제 바 */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                <div style={{ display: "flex", gap: 6 }}>
                  <button style={{ padding: "6px 12px", background: darkMode ? "#2c2d31" : "#fff", border: `1px solid ${border}`, borderRadius: 4, fontSize: 11, fontWeight: 700, color: textPrimary, cursor: "pointer" }}>전체 선택</button>
                  <button style={{ padding: "6px 12px", background: darkMode ? "#2c2d31" : "#fff", border: `1px solid ${border}`, borderRadius: 4, fontSize: 11, fontWeight: 700, color: textPrimary, cursor: "pointer" }}>선택 삭제</button>
                </div>
                
                {/* 검색 상자 */}
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                    <input 
                      type="text" 
                      placeholder="검색어를 입력하세요"
                      value={templateSearchTerm}
                      onChange={(e) => setTemplateSearchTerm(e.target.value)}
                      style={{
                        width: 180, height: 28, padding: "0 28px 0 8px", borderRadius: 4, border: `1px solid ${border}`,
                        background: darkMode ? "#2c2d31" : "#fff", color: textPrimary, fontSize: 11, outline: "none"
                      }}
                    />
                    <span style={{ position: "absolute", right: 8, fontSize: 11, color: textSecondary }}>🔍</span>
                  </div>
                  <button 
                    onClick={() => setTemplateSearchTerm("")}
                    style={{
                      height: 28, padding: "0 8px", background: darkMode ? "#2c2d31" : "#fff", border: `1px solid ${border}`,
                      borderRadius: 4, fontSize: 11, color: textPrimary, cursor: "pointer"
                    }}
                    title="새로고침"
                  >
                    🔄
                  </button>
                </div>
              </div>

              {/* 3열 템플릿 카드 그리드 (진짜 휴대폰 문자 발송 포맷 스타일로 카드 높이를 250px로 확장) */}
              <div style={{
                display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginTop: 8,
                paddingBottom: 20
              }}>
                {filteredTemplates.map(t => (
                  <div 
                    key={t.id}
                    onClick={() => handleSelectTemplate(t)}
                    style={{
                      border: `1px solid ${border}`, borderRadius: 10, padding: 14, cursor: "pointer",
                      background: darkMode ? "#2c2d31" : "#fff", display: "flex", flexDirection: "column",
                      justifyContent: "space-between", height: 250, position: "relative",
                      transition: "all 0.15s", boxShadow: "0 2px 5px rgba(0,0,0,0.03)"
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = "#3b82f6";
                      e.currentTarget.style.boxShadow = "0 6px 16px rgba(59,130,246,0.12)";
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = border;
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    {/* 상단 체크박스 및 삭제 */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }} onClick={e => e.stopPropagation()}>
                      <input type="checkbox" style={{ cursor: "pointer" }} />
                      <button 
                        onClick={(e) => handleDeleteTemplate(t.id, e)}
                        style={{ border: "none", background: "none", color: textSecondary, cursor: "pointer", fontSize: 15, fontWeight: "bold" }}
                        title="삭제"
                      >
                        ×
                      </button>
                    </div>

                    {/* 카드 타이틀 */}
                    <div style={{ fontSize: 12, fontWeight: 800, color: textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 6 }}>
                      {t.title}
                    </div>

                    {/* 휴대폰 화면 스타일의 말풍선 문자함 뷰포트 (스크롤바 포함) */}
                    <div style={{
                      background: darkMode ? "#18191c" : "#e2e8f0", // 스마트폰 대화창 느낌의 배경색
                      borderRadius: 8,
                      padding: "8px 10px",
                      height: 135,
                      overflowY: "auto",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "flex-start",
                      border: `1px solid ${border}`,
                      gap: 4
                    }}>
                      {/* 진짜 문자 발송 말풍선 */}
                      <div style={{
                        background: darkMode ? "#374151" : "#ffffff",
                        color: textPrimary,
                        padding: "8px 12px",
                        borderRadius: "10px 10px 10px 0px", // 전형적인 말풍선 형태
                        fontSize: 11,
                        lineHeight: 1.5,
                        whiteSpace: "pre-wrap",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                        wordBreak: "break-all"
                      }}>
                        {t.content}
                      </div>
                    </div>

                    {/* 하단 바이트 & 일자 */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `1px solid ${border}`, paddingTop: 8, marginTop: 8, fontSize: 10, color: textSecondary }}>
                      <span style={{ color: t.byte > 90 ? "#ef4444" : "#10b981", fontWeight: 800 }}>{t.byte}byte {t.byte > 90 ? "장문" : "단문"}</span>
                      <span>{t.date}</span>
                    </div>
                  </div>
                ))}

                {filteredTemplates.length === 0 && (
                  <div style={{ gridColumn: "span 3", textAlign: "center", padding: "40px 0", color: textSecondary, fontSize: 12 }}>
                    검색 결과와 일치하는 문자가 없습니다.
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* === 고해상도 뿌리오 스타일 "최근발송 문자" 팝업 모달 === */}
      {isRecentModalOpen && (
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
          backgroundColor: "rgba(0, 0, 0, 0.55)", display: "flex", justifyContent: "center",
          alignItems: "center", zIndex: 9999, backdropFilter: "blur(2px)"
        }}>
          <div style={{
            background: darkMode ? "#1f2023" : "#ffffff", width: 520, maxHeight: "85vh",
            borderRadius: 14, overflow: "hidden", boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
            border: `1px solid ${border}`, display: "flex", flexDirection: "column"
          }}>
            {/* 모달 헤더 */}
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "16px 24px", borderBottom: `1px solid ${border}`, background: darkMode ? "#25262b" : "#f8fafc"
            }}>
              <span style={{ fontSize: 16, fontWeight: 900, color: textPrimary }}>최근발송 문자</span>
              <button 
                onClick={() => setIsRecentModalOpen(false)}
                style={{
                  background: "none", border: "none", fontSize: 20, color: textSecondary,
                  cursor: "pointer", fontWeight: "bold"
                }}
              >
                ✕
              </button>
            </div>

            {/* 모달 본문 리스트 */}
            <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 12, flex: 1, overflowY: "auto" }}>
              
              {/* 가이드 문구 */}
              <div style={{ fontSize: "11px", color: textSecondary, lineHeight: 1.6, marginBottom: 8 }}>
                * 가장 최근에 발송된 발송결과 내역이 보여집니다. (최대 10건)<br />
                * 메시지를 선택하시면 메시지 내용을 불러옵니다.
              </div>

              {/* 최근발송 리스트 컨테이너 */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {recentMessages.map((r, idx) => (
                  <div 
                    key={r.id}
                    onClick={() => handleSelectRecent(r)}
                    style={{
                      display: "flex",
                      gap: 16,
                      alignItems: "flex-start",
                      paddingBottom: 16,
                      borderBottom: idx < recentMessages.length - 1 ? `1px dotted ${border}` : "none",
                      cursor: "pointer"
                    }}
                  >
                    {/* 모바일 스타일의 말풍선 프레임 */}
                    <div style={{
                      flex: 1.3,
                      background: darkMode ? "#2c2d31" : "#f3f4f6",
                      borderRadius: "12px 12px 12px 0px", // 말풍선 모양
                      padding: "12px 16px",
                      border: `1px solid ${border}`,
                      maxHeight: 180,
                      overflowY: "auto",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                      transition: "all 0.15s"
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = "#3b82f6";
                      e.currentTarget.style.background = darkMode ? "#34353a" : "#ebf2ff";
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = border;
                      e.currentTarget.style.background = darkMode ? "#2c2d31" : "#f3f4f6";
                    }}
                    >
                      <div style={{
                        fontSize: 12,
                        color: textPrimary,
                        lineHeight: 1.55,
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-all"
                      }}>
                        {r.content}
                      </div>
                    </div>

                    {/* 우측 정보 영역 (구분, 날짜/시간) */}
                    <div style={{
                      flex: 0.7,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "flex-end",
                      height: "100%",
                      alignSelf: "stretch",
                      fontSize: 11,
                      paddingBottom: 4
                    }}>
                      <span style={{ color: "#ef4444", fontWeight: 800, marginBottom: 4 }}>{r.type}</span>
                      <span style={{ color: textSecondary, fontWeight: 600 }}>{r.date.split(" ")[0]}</span>
                      <span style={{ color: textSecondary, fontWeight: 600 }}>{r.date.split(" ").slice(1).join(" ")}</span>
                    </div>

                  </div>
                ))}
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
