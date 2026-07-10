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

const MOCK_LEADS: LeadItem[] = [
  { id: "1", agencyName: "(21세기)CENTURY21공인중개사사무소", ceoName: "조수경", city: "서울특별시", district: "동대문구", phone: "02-967-0900", mobile: "010-3755-6612", status: "wait" },
  { id: "2", agencyName: "(단지내)대성공인중개사사무소", ceoName: "강두형", city: "서울특별시", district: "성북구", phone: "02-981-2002", mobile: "010-8497-8801", status: "wait" },
  { id: "3", agencyName: "가람공인중개사사무소", ceoName: "조원진", city: "서울특별시", district: "강남구", phone: "02-574-0099", mobile: "010-4143-4586", status: "wait" },
  { id: "4", agencyName: "써밋공인중개사사무소", ceoName: "이주연", city: "서울특별시", district: "서초구", phone: "02-451-2323", mobile: "010-2455-2606", status: "wait" },
  { id: "5", agencyName: "정신공인중개사사무소", ceoName: "한정숙", city: "서울특별시", district: "송파구", phone: "02-578-3344", mobile: "010-4664-8140", status: "wait" }
];

export default function MarketingSection({ theme }: MarketingSectionProps) {
  const { cardBg, textPrimary, textSecondary, border, bg, darkMode } = theme;

  // 1. 상태 관리
  const [activeTab, setActiveTab] = useState<"general" | "ad" | "guide">("ad");
  const [activeRecipTab, setActiveRecipTab] = useState<"db" | "direct" | "excel">("db");
  
  // 메시지 입력
  const [msgTitle, setMsgTitle] = useState("");
  const [msgContent, setMsgContent] = useState("");
  
  // 내 문자함 템플릿 리스트
  const [savedTemplates, setSavedTemplates] = useState([
    { id: "t1", title: "공실접수 안내", content: "(광고) 공실뉴스\n\n안녕하세요, {대표자명} 대표님.\n{상호} 인근 신규 매물 접수 안내드립니다. 신속하고 투명한 중개 거래를 위해 공실뉴스 파트너에 무료 가입해보세요!\n\n무료수신거부: 080-1555-5343" },
    { id: "t2", title: "추천 매물 목록", content: "(광고) 공실뉴스\n\n안녕하세요, {대표자명} 대표님.\n오늘의 추천 매물 정보 공유드립니다. {지역} 지역 내 단독 독점 물건 다량 보유 중입니다.\n\n무료수신거부: 080-1555-5343" },
    { id: "t3", title: "서비스 혜택", content: "(광고) 공실뉴스\n\n안녕하세요, {대표자명} 대표님.\n공실뉴스 프리미엄 멤버십 가입 시 첫달 무료 이벤트 적용 안내입니다.\n\n무료수신거부: 080-1555-5343" }
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

  // 2. 바이트 수 및 광고 설정 자동 적용
  useEffect(() => {
    if (activeTab === "ad") {
      setMsgTitle("[광고] 공실뉴스 파트너 가이드");
      setMsgContent(
        "(광고) 공실뉴스\n\n안녕하세요, {대표자명} 대표님.\n부동산 임대관리를 한번에 해결하는 공실뉴스 서비스 안내드립니다.\n\n{상호} 인근의 검증된 공실 매물을 지금 확인해보세요.\n\n🔗 상세정보: https://gongsilnews.com\n\n무료수신거부: 080-1555-5343"
      );
    } else {
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

    const newTemplate = {
      id: `template_${Date.now()}`,
      title: title.trim() || "새 저장 문자",
      content: msgContent
    };

    setSavedTemplates([...savedTemplates, newTemplate]);
    alert("💾 내 문자함에 성공적으로 저장되었습니다!");
  };

  const handleSelectTemplate = (t: { title: string; content: string }) => {
    setMsgTitle(t.title);
    setMsgContent(t.content);
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

  return (
    <div style={{ padding: "20px 32px", display: "flex", flexDirection: "column", gap: "16px", height: "calc(100vh - 64px)", overflowY: "auto", background: darkMode ? "#18191c" : "#f4f5f7" }}>
      {/* 1. 페이지 헤더 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${border}`, paddingBottom: 12 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: textPrimary, margin: 0 }}>문자</h1>
        <div style={{ fontSize: 13, color: textSecondary, fontWeight: 600 }}>
          잔액: <span style={{ color: "#3b82f6", fontWeight: 800 }}>9,955원</span> | 씨앗: <span style={{ color: "#10b981", fontWeight: 800 }}>8,326통</span>
        </div>
      </div>

      {/* 2. 뿌리오 서브 탭 */}
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
      </div>

      {/* 3. 본문 레이아웃 */}
      <div style={{ display: "flex", gap: "24px", alignItems: "flex-start", flex: 1 }}>
        
        {/* === 좌측: 메시지 입력 및 내 문자함 (두 영역이 나란히) === */}
        <div style={{ flex: 1.8, display: "flex", gap: "16px", minWidth: 0 }}>
          
          {/* A. 메시지 입력 카드 (가로 너비 축소) */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "12px", background: cardBg, padding: 18, borderRadius: 12, border: `1px solid ${border}`, boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: textPrimary }}>메시지 입력</h3>
            
            {/* 제목 인풋 */}
            <input 
              type="text" 
              placeholder="제목을 입력해주세요. (최대30byte)"
              value={msgTitle}
              onChange={(e) => setMsgTitle(e.target.value)}
              style={{
                width: "100%", height: 36, padding: "0 10px", borderRadius: 6, border: `1px solid ${border}`,
                background: darkMode ? "#2c2d31" : "#fff", color: textPrimary, outline: "none", fontSize: 12, fontWeight: 600
              }}
            />

            {/* 에디터 툴바 */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11 }}>
              <div style={{ display: "flex", gap: 4 }}>
                <span style={{ padding: "3px 6px", background: "#fef3c7", color: "#d97706", borderRadius: 4, fontWeight: 800, fontSize: 10 }}>✦ AI 추천</span>
                <span style={{ padding: "3px 6px", background: "#dbeafe", color: "#2563eb", borderRadius: 4, fontWeight: 800, fontSize: 10 }}>✦ AI 생성</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontWeight: 800, color: textPrimary }}>{byteCount}</span>
                <span style={{ color: textSecondary }}>/ 90byte</span>
                <span style={{
                  padding: "1px 5px", borderRadius: 4, fontSize: 9, fontWeight: 800,
                  background: isLms ? "#fecaca" : "#d1fae5",
                  color: isLms ? "#b91c1c" : "#065f46"
                }}>
                  {isLms ? "장문" : "단문"}
                </span>
                <button 
                  onClick={() => setMsgContent("")}
                  style={{ border: "none", background: "none", cursor: "pointer", fontSize: 12, color: textSecondary }}
                  title="초기화"
                >
                  🔄
                </button>
              </div>
            </div>

            {/* 에디터 텍스트에어리어 (높이를 조금 콤팩트하게 조절) */}
            <textarea 
              placeholder="내용을 입력해주세요. 90byte 초과 시 장문 문자로 자동 전환됩니다."
              value={msgContent}
              onChange={(e) => setMsgContent(e.target.value)}
              style={{
                width: "100%", height: 200, padding: 12, borderRadius: 6, border: `1px solid ${border}`,
                background: darkMode ? "#2c2d31" : "#fff", color: textPrimary, outline: "none", resize: "none",
                fontSize: 13, lineHeight: 1.5, fontFamily: "inherit"
              }}
            />

            {/* 변수 및 특수문자 단축바 */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${border}`, paddingBottom: 10 }}>
              <div style={{ display: "flex", gap: 6, position: "relative" }}>
                <button style={{ padding: "5px 10px", background: darkMode ? "#202124" : "#f1f5f9", border: `1px solid ${border}`, borderRadius: 6, fontSize: 11, fontWeight: 700, color: textPrimary, cursor: "pointer" }}>
                  특수문자 ▾
                </button>
                <button 
                  onClick={() => setShowVariableMenu(!showVariableMenu)}
                  style={{ padding: "5px 10px", background: darkMode ? "#202124" : "#f1f5f9", border: `1px solid ${border}`, borderRadius: 6, fontSize: 11, fontWeight: 700, color: textPrimary, cursor: "pointer" }}
                >
                  변수추가 ▾
                </button>
                
                {showVariableMenu && (
                  <div style={{
                    position: "absolute", bottom: "100%", left: 70, background: darkMode ? "#25262b" : "#fff", border: `1px solid ${border}`,
                    borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.15)", padding: 4, display: "flex", flexDirection: "column", gap: 3, zIndex: 10
                  }}>
                    {["{대표자명}", "{상호}", "{지역}"].map(v => (
                      <button 
                        key={v}
                        onClick={() => insertPlaceholder(v)}
                        style={{ padding: "6px 12px", background: "none", border: "none", color: textPrimary, fontSize: 11, fontWeight: 700, cursor: "pointer", textAlign: "left", borderRadius: 4 }}
                        onMouseEnter={e => e.currentTarget.style.background = darkMode ? "#333" : "#f3f4f6"}
                        onMouseLeave={e => e.currentTarget.style.background = "none"}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: textSecondary }}>
                <label style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                  <input type="checkbox" style={{ cursor: "pointer" }} /> 변수 길게 사용
                </label>
              </div>
            </div>

            {/* 에디터 하단 버튼 (요청하신 대로 [내 문자함], [문자저장]은 제외하고 [최근발송]만 남김) */}
            <div style={{ display: "flex", gap: 8 }}>
              <button style={{ flex: 1, height: 34, background: darkMode ? "#202124" : "#f1f5f9", border: `1px solid ${border}`, borderRadius: 6, fontSize: 12, fontWeight: 700, color: textPrimary, cursor: "pointer" }}>
                🕒 최근발송
              </button>
            </div>
          </div>

          {/* B. 내 문자함 카드 (저장된 템플릿 그리드 및 + 저장 버튼) */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "12px", background: cardBg, padding: 18, borderRadius: 12, border: `1px solid ${border}`, boxShadow: "0 2px 8px rgba(0,0,0,0.02)", minHeight: 360 }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: textPrimary, borderBottom: `1px solid ${border}`, paddingBottom: 10 }}>📁 내 문자함</h3>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", flex: 1, alignContent: "start", overflowY: "auto", maxHeight: 310 }}>
              {savedTemplates.map(t => (
                <div 
                  key={t.id}
                  onClick={() => handleSelectTemplate(t)}
                  style={{
                    border: `1px solid ${border}`, borderRadius: 8, padding: 10, cursor: "pointer",
                    background: darkMode ? "#2c2d31" : "#fff", display: "flex", flexDirection: "column",
                    justifyContent: "space-between", height: 90, position: "relative",
                    transition: "all 0.2s", boxShadow: "0 2px 4px rgba(0,0,0,0.02)"
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = "#3b82f6";
                    e.currentTarget.style.transform = "translateY(-1px)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = border;
                    e.currentTarget.style.transform = "none";
                  }}
                >
                  {/* 삭제 버튼 */}
                  <button
                    onClick={(e) => handleDeleteTemplate(t.id, e)}
                    style={{
                      position: "absolute", top: 4, right: 6, border: "none", background: "none",
                      color: textSecondary, fontSize: 14, fontWeight: 800, cursor: "pointer"
                    }}
                    title="삭제"
                  >
                    ×
                  </button>
                  
                  <div style={{ fontSize: 11, fontWeight: 800, color: textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", width: "80%", marginBottom: 2 }}>
                    {t.title}
                  </div>
                  <div style={{ fontSize: 10, color: textSecondary, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", lineHeight: 1.3 }}>
                    {t.content}
                  </div>
                </div>
              ))}
              
              {/* 템플릿 추가 버튼 카드 */}
              <div 
                onClick={handleAddTemplate}
                style={{
                  border: `2px dashed ${darkMode ? "#555" : "#ccc"}`, borderRadius: 8, padding: 10, cursor: "pointer",
                  background: "none", display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center", height: 90, transition: "all 0.2s"
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = "#3b82f6";
                  e.currentTarget.style.background = darkMode ? "rgba(59, 130, 246, 0.05)" : "rgba(59, 130, 246, 0.02)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = darkMode ? "#555" : "#ccc";
                  e.currentTarget.style.background = "none";
                }}
              >
                <span style={{ fontSize: 20, color: "#3b82f6", fontWeight: 700 }}>+</span>
                <span style={{ fontSize: 10, color: textSecondary, fontWeight: 700, marginTop: 2 }}>문자 저장하기</span>
              </div>
            </div>
          </div>

        </div>

        {/* === 우측: 발신번호 & 수신번호 설정 (Target Panel) === */}
        <div style={{ width: 420, display: "flex", flexDirection: "column", gap: "16px", flexShrink: 0 }}>
          
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

            {/* 수신 입력 카드 양방향 분할 레이아웃 */}
            <div style={{ display: "flex", gap: 12, height: 200 }}>
              
              {/* 좌측: 입력 컨트롤러 */}
              <div style={{ flex: 1.2, display: "flex", flexDirection: "column", gap: 8, height: "100%", justifyContent: "space-between" }}>
                {activeRecipTab === "db" && (
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
                    
                    <button 
                      onClick={handleAddDbTarget}
                      style={{ height: 32, background: "#3b82f6", color: "#fff", border: "none", borderRadius: 4, fontSize: 12, fontWeight: 800, cursor: "pointer", marginTop: 4 }}
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
                      style={{ height: 32, background: "#3b82f6", color: "#fff", border: "none", borderRadius: 4, fontSize: 12, fontWeight: 800, cursor: "pointer" }}
                    >
                      번호 추가 +
                    </button>
                  </div>
                )}

                {activeRecipTab === "excel" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, height: "100%", justifyContent: "center", alignItems: "center", border: `2px dashed ${border}`, borderRadius: 6, padding: 12 }}>
                    <span style={{ fontSize: 24 }}>파일</span>
                    <span style={{ fontSize: 11, color: textSecondary, textAlign: "center" }}>
                      엑셀 파일을 드래그하거나<br />아래 버튼으로 업로드하세요.
                    </span>
                    <label style={{ padding: "6px 14px", background: "#10b981", color: "#fff", borderRadius: 4, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
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
    </div>
  );
}
