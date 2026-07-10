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
  lastSentAt?: string;
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
  { id: "5", agencyName: "정신공인중개사사무소", ceoName: "한정숙", city: "서울특별시", district: "송파구", phone: "02-578-3344", mobile: "010-4664-8140", status: "wait" },
  { id: "6", agencyName: "대교공인중개사사무소", ceoName: "윤건율", city: "서울특별시", district: "마포구", phone: "02-164-5445", mobile: "010-2446-2003", status: "wait" },
  { id: "7", agencyName: "미래공인중개사사무소", ceoName: "박용순", city: "서울특별시", district: "영등포구", phone: "02-3412-0119", mobile: "010-7567-0580", status: "unsubscribed" }
];

export default function MarketingSection({ theme }: MarketingSectionProps) {
  const { cardBg, textPrimary, textSecondary, border, bg, darkMode } = theme;

  // 1. 상태 변수 정의
  const [selectedCity, setSelectedCity] = useState("서울특별시");
  const [selectedDistrict, setSelectedDistrict] = useState("전체");
  const [targetStatus, setTargetStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [msgTitle, setMsgTitle] = useState("[광고] 공실뉴스 신규 서비스 안내");
  const [msgContent, setMsgContent] = useState(
    "안녕하세요, {대표자명} 대표님.\n부동산 전문 파트너 공실뉴스입니다.\n\n{상호} 인근의 검증된 공실 매물 정보를 실시간으로 확인하고 중개 성공율을 높여보세요!\n\n💡 공실뉴스만의 차별점:\n1. 100% 실시간 현장 확인된 공실\n2. AI 기반 매물 제안서 자동 생성\n3. 임대인-중개업소 자동 매칭 시스템\n\n지금 가입하시면 첫 달 프리미엄 멤버십 무료 혜택을 드립니다.\n\n🔗 무료 가입하기: https://gongsilnews.com\n\n무료수신거부: 080-1555-5343"
  );
  
  const [isSending, setIsSending] = useState(false);
  const [sendProgress, setSendProgress] = useState(0);
  const [sendLogs, setSendLogs] = useState<string[]>([]);
  const [testPhone, setTestPhone] = useState("010-8831-9450");
  const [leads, setLeads] = useState<LeadItem[]>(MOCK_LEADS);

  // 2. 파생 데이터 계산
  const currentDistricts = REGION_COUNTS[selectedCity] ? Object.keys(REGION_COUNTS[selectedCity]) : ["전체"];
  const rawCount = REGION_COUNTS[selectedCity]?.[selectedDistrict] || 0;
  const unsubscribedCount = Math.round(rawCount * 0.008); // 모의 수신거부 비율 (약 0.8%)
  const finalTargetCount = rawCount - unsubscribedCount;

  // 바이트 계산
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
  const costPerMsg = isLms ? 35 : 15; // LMS: 35원, SMS: 15원
  const estimatedCost = finalTargetCount * costPerMsg;

  // 3. 핸들러 함수들
  const insertPlaceholder = (tag: string) => {
    setMsgContent(prev => prev + tag);
  };

  const handleTestSend = () => {
    if (!testPhone.trim()) {
      alert("테스트 발송할 휴대폰 번호를 입력해주세요.");
      return;
    }
    alert(`📱 [테스트 발송 성공]\n\n수신번호: ${testPhone}\n타입: ${isLms ? "LMS 장문" : "SMS 단문"}\n\n내용이 정상적으로 전송되었습니다.`);
  };

  const handleStartBulkSend = () => {
    if (finalTargetCount <= 0) {
      alert("발송할 대상자가 존재하지 않습니다.");
      return;
    }

    const confirmSend = window.confirm(
      `🚨 [단체 발송 경고]\n\n타겟 지역: ${selectedCity} > ${selectedDistrict}\n발송 대상: ${finalTargetCount.toLocaleString()}명\n예상 비용: ${estimatedCost.toLocaleString()}원\n\n정말로 단체 마케팅 발송을 시작하시겠습니까?`
    );

    if (!confirmSend) return;

    setIsSending(true);
    setSendProgress(0);
    setSendLogs([`[시스템] ${selectedCity} ${selectedDistrict} 지역 대량 발송 작업 시작 (대상: ${finalTargetCount.toLocaleString()}명)`]);

    // 발송 진행 시뮬레이션
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setIsSending(false);
        setSendLogs(prev => [
          ...prev,
          `[완료] 성공: ${(finalTargetCount - 2).toLocaleString()}건 / 실패: 2건`,
          `[시스템] 단체 발송이 성공적으로 완료되었습니다.`
        ]);
        alert("🎉 단체 발송 작업이 완료되었습니다!");
      } else {
        setSendLogs(prev => [
          ...prev,
          `[전송중] ${((finalTargetCount * progress) / 100).toFixed(0)}건 완료 (${progress}%)`
        ]);
      }
      setSendProgress(progress);
    }, 1500);
  };

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      alert(`📁 [엑셀 파일 임포트 성공]\n파일명: ${file.name}\n\n112,450개의 부동산 Leads 데이터가 데이터베이스에 정상적으로 동기화/업데이트 되었습니다.`);
    }
  };

  return (
    <div style={{ padding: "24px 32px", display: "flex", flexDirection: "column", gap: "24px", height: "calc(100vh - 64px)", overflowY: "auto" }}>
      {/* 타이틀 및 헤더 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: textPrimary, margin: 0 }}>💬 부동산 대량 마케팅 관리</h1>
          <p style={{ fontSize: 14, color: textSecondary, margin: "6px 0 0 0" }}>엑셀로 등록된 부동산 비회원 DB에 타겟별 맞춤 광고를 발송하고 관리합니다.</p>
        </div>
        
        {/* 엑셀 업로드 버튼 */}
        <label style={{
          padding: "10px 18px", background: "#10b981", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, boxShadow: "0 2px 4px rgba(16, 185, 129, 0.2)"
        }}>
          📥 최신 부동산 엑셀 업로드
          <input type="file" accept=".xlsx, .csv" onChange={handleExcelUpload} style={{ display: "none" }} />
        </label>
      </div>

      <div style={{ display: "flex", gap: "24px", flex: 1, minHeight: 0 }}>
        {/* 1. 좌측 설정 & 필터 영역 */}
        <div style={{ flex: 1.2, display: "flex", flexDirection: "column", gap: "20px", overflowY: "auto", paddingRight: 4 }}>
          
          {/* 타겟 설정 카드 */}
          <div style={{ background: cardBg, borderRadius: 12, border: `1px solid ${border}`, padding: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
            <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 800, color: textPrimary, display: "flex", alignItems: "center", gap: 6 }}>
              🎯 발송 타겟 설정
            </h3>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: textSecondary, display: "block", marginBottom: 6 }}>시/도</label>
                  <select 
                    value={selectedCity} 
                    onChange={(e) => { setSelectedCity(e.target.value); setSelectedDistrict("전체"); }}
                    style={{ width: "100%", height: 38, padding: "0 10px", borderRadius: 6, border: `1px solid ${border}`, background: darkMode ? "#2c2d31" : "#fff", color: textPrimary, outline: "none", fontWeight: 600 }}
                  >
                    {Object.keys(REGION_COUNTS).map(city => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: textSecondary, display: "block", marginBottom: 6 }}>시/군/구</label>
                  <select 
                    value={selectedDistrict} 
                    onChange={(e) => setSelectedDistrict(e.target.value)}
                    style={{ width: "100%", height: 38, padding: "0 10px", borderRadius: 6, border: `1px solid ${border}`, background: darkMode ? "#2c2d31" : "#fff", color: textPrimary, outline: "none", fontWeight: 600 }}
                  >
                    {currentDistricts.map(dist => (
                      <option key={dist} value={dist}>{dist}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: textSecondary, display: "block", marginBottom: 6 }}>수신 상태 필터</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {["all", "wait", "sent", "unsubscribed"].map(status => (
                    <button
                      key={status}
                      onClick={() => setTargetStatus(status)}
                      style={{
                        padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer", border: `1px solid ${border}`,
                        background: targetStatus === status ? "#3b82f6" : (darkMode ? "#1f2023" : "#fff"),
                        color: targetStatus === status ? "#fff" : textSecondary,
                        transition: "all 0.15s"
                      }}
                    >
                      {status === "all" ? "전체" : status === "wait" ? "미발송" : status === "sent" ? "발송완료" : "수신거부"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 비용 실시간 시뮬레이터 카드 */}
          <div style={{ background: cardBg, borderRadius: 12, border: `1px solid ${border}`, padding: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
            <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 800, color: textPrimary }}>
              📊 실시간 발송 예측
            </h3>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={{ background: darkMode ? "#202124" : "#f8fafc", borderRadius: 8, padding: 12, border: `1px solid ${border}` }}>
                  <span style={{ fontSize: 12, color: textSecondary, display: "block", marginBottom: 4 }}>발송 대상 부동산</span>
                  <span style={{ fontSize: 20, fontWeight: 900, color: "#3b82f6" }}>{finalTargetCount.toLocaleString()} <span style={{ fontSize: 13, fontWeight: 500 }}>개소</span></span>
                </div>
                <div style={{ background: darkMode ? "#202124" : "#f8fafc", borderRadius: 8, padding: 12, border: `1px solid ${border}` }}>
                  <span style={{ fontSize: 12, color: textSecondary, display: "block", marginBottom: 4 }}>수신거부 제외 인원</span>
                  <span style={{ fontSize: 20, fontWeight: 900, color: "#ef4444" }}>-{unsubscribedCount.toLocaleString()} <span style={{ fontSize: 13, fontWeight: 500 }}>개소</span></span>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `1px solid ${border}`, paddingTop: 12 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: textPrimary }}>예상 차감 금액 (뿌리오)</span>
                <span style={{ fontSize: 22, fontWeight: 900, color: "#10b981" }}>
                  ₩ {estimatedCost.toLocaleString()}
                  <span style={{ fontSize: 12, fontWeight: 500, color: textSecondary, marginLeft: 6 }}>
                    ({costPerMsg}원 / 건)
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* 발송 현황 로그 */}
          {isSending || sendLogs.length > 0 ? (
            <div style={{ background: cardBg, borderRadius: 12, border: `1px solid ${border}`, padding: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.02)", display: "flex", flexDirection: "column", gap: 12 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: textPrimary, display: "flex", alignItems: "center", gap: 8 }}>
                {isSending ? "⚡ 발송 작업 진행 중" : "📋 최근 발송 작업 이력"}
              </h3>
              
              {isSending && (
                <div style={{ width: "100%", background: darkMode ? "#222" : "#e5e7eb", borderRadius: 8, height: 16, overflow: "hidden", position: "relative" }}>
                  <div style={{ width: `${sendProgress}%`, background: "#3b82f6", height: "100%", transition: "width 0.4s" }} />
                  <span style={{ position: "absolute", width: "100%", textAlign: "center", fontSize: 11, fontWeight: 800, color: sendProgress > 55 ? "#fff" : "#555", left: 0, top: 0, lineHeight: "16px" }}>
                    {sendProgress}%
                  </span>
                </div>
              )}

              <div style={{ background: darkMode ? "#18191c" : "#1e293b", color: "#38bdf8", padding: 12, borderRadius: 8, fontFamily: "monospace", fontSize: 12, height: 140, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
                {sendLogs.slice().reverse().map((log, idx) => (
                  <div key={idx}>{log}</div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {/* 2. 우측 문자 편집기 & 프리뷰 영역 */}
        <div style={{ flex: 1.5, display: "flex", gap: "24px", minWidth: 0 }}>
          
          {/* 메시지 작성 Panel */}
          <div style={{ flex: 1, background: cardBg, borderRadius: 12, border: `1px solid ${border}`, padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: textPrimary }}>✍️ 광고 메시지 구성</h3>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: textSecondary, display: "block", marginBottom: 6 }}>제목 (LMS 장문용)</label>
                <input 
                  type="text" 
                  value={msgTitle} 
                  onChange={(e) => setMsgTitle(e.target.value)} 
                  style={{ width: "100%", height: 38, padding: "0 12px", borderRadius: 6, border: `1px solid ${border}`, background: darkMode ? "#2c2d31" : "#fff", color: textPrimary, outline: "none", fontSize: 13, fontWeight: 600 }}
                />
              </div>

              {/* 치환 태그 입력 단축버튼 */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: textSecondary, display: "block", marginBottom: 6 }}>치환용 예약어 삽입</label>
                <div style={{ display: "flex", gap: 6 }}>
                  {["{대표자명}", "{상호}", "{지역}"].map(tag => (
                    <button
                      key={tag}
                      onClick={() => insertPlaceholder(tag)}
                      style={{
                        padding: "6px 12px", borderRadius: 6, fontSize: 11, fontWeight: 800, cursor: "pointer", border: `1px solid ${border}`,
                        background: darkMode ? "#202124" : "#f1f5f9",
                        color: textPrimary
                      }}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: textSecondary, display: "block", marginBottom: 6 }}>본문 내용 작성</label>
                <textarea 
                  value={msgContent} 
                  onChange={(e) => setMsgContent(e.target.value)} 
                  style={{ width: "100%", flex: 1, padding: 12, borderRadius: 6, border: `1px solid ${border}`, background: darkMode ? "#2c2d31" : "#fff", color: textPrimary, outline: "none", resize: "none", fontSize: 13, lineHeight: 1.5, fontFamily: "inherit" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: textSecondary, fontWeight: 700 }}>
                  {byteCount} Byte ({isLms ? "LMS 장문" : "SMS 단문"})
                </span>
                <span style={{ fontSize: 11, color: "#ef4444", fontWeight: 700 }}>
                  (광고) 수신거부 번호가 필수 포함되어 있습니다.
                </span>
              </div>
            </div>

            {/* 테스트 발송 판넬 */}
            <div style={{ borderTop: `1px solid ${border}`, paddingTop: 16, display: "flex", gap: 8, alignItems: "flex-end" }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: textSecondary, display: "block", marginBottom: 4 }}>테스트 수신번호</label>
                <input 
                  type="text" 
                  value={testPhone} 
                  onChange={(e) => setTestPhone(e.target.value)}
                  style={{ width: "100%", height: 34, padding: "0 10px", borderRadius: 6, border: `1px solid ${border}`, background: darkMode ? "#2c2d31" : "#fff", color: textPrimary, outline: "none", fontSize: 12 }} 
                />
              </div>
              <button 
                onClick={handleTestSend}
                style={{ height: 34, padding: "0 14px", background: darkMode ? "#374151" : "#f3f4f6", border: `1px solid ${border}`, borderRadius: 6, fontSize: 12, fontWeight: 700, color: textPrimary, cursor: "pointer" }}
              >
                테스트 발송
              </button>
            </div>

            {/* 단체 발송 전송 실행 */}
            <button 
              onClick={handleStartBulkSend}
              disabled={isSending || finalTargetCount <= 0}
              style={{
                width: "100%", height: 44, background: "#3b82f6", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 800, cursor: isSending || finalTargetCount <= 0 ? "not-allowed" : "pointer", opacity: isSending || finalTargetCount <= 0 ? 0.6 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 4px 6px rgba(59, 130, 246, 0.2)"
              }}
            >
              🚀 {finalTargetCount.toLocaleString()}명 대상 단체 발송 시작
            </button>
          </div>

          {/* 스마트폰 목업 프리뷰 */}
          <div style={{ width: 280, display: "flex", flexDirection: "column", gap: "10px", flexShrink: 0 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: textSecondary, textAlign: "center" }}>📱 실시간 수신 화면 미리보기</span>
            
            {/* 폰 외관 */}
            <div style={{
              flex: 1, background: "#000", borderRadius: 36, padding: "14px", border: "4px solid #444", boxShadow: "0 8px 24px rgba(0,0,0,0.12)", display: "flex", flexDirection: "column", height: 480, position: "relative"
            }}>
              {/* 스피커 노치 */}
              <div style={{ width: 60, height: 16, background: "#000", borderRadius: 8, margin: "0 auto 10px auto" }} />
              
              {/* 액정 내부 */}
              <div style={{
                flex: 1, background: darkMode ? "#1a1a1a" : "#fff", borderRadius: 24, padding: "12px", display: "flex", flexDirection: "column", overflow: "hidden", fontSize: 11
              }}>
                {/* 문자 헤더 */}
                <div style={{ textAlign: "center", borderBottom: `1px solid ${border}`, paddingBottom: 8, marginBottom: 8 }}>
                  <div style={{ fontWeight: 800, color: textPrimary }}>1555-5343</div>
                  <div style={{ fontSize: 9, color: textSecondary }}>공실뉴스 알림봇</div>
                </div>

                {/* 말풍선 */}
                <div style={{
                  background: darkMode ? "#2a2a2a" : "#e9e9eb",
                  color: textPrimary,
                  padding: "10px 12px",
                  borderRadius: "14px 14px 14px 2px",
                  alignSelf: "flex-start",
                  maxWidth: "92%",
                  lineHeight: 1.4,
                  whiteSpace: "pre-wrap",
                  overflowY: "auto",
                  maxHeight: "300px",
                  fontSize: 10
                }}>
                  {isLms && (
                    <div style={{ fontWeight: 800, marginBottom: 6, color: "#3b82f6" }}>
                      {msgTitle}
                    </div>
                  )}
                  {msgContent
                    .replace("{대표자명}", "조수경")
                    .replace("{상호}", "(21세기)CENTURY21")}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* 3. 하단 부동산 목록 테이블 영역 */}
      <div style={{ background: cardBg, borderRadius: 12, border: `1px solid ${border}`, padding: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: textPrimary }}>📋 추출된 마케팅 Leads 명단 (목업 데이터)</h3>
          <span style={{ fontSize: 12, color: textSecondary }}>총 {leads.length}명 조회됨</span>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${border}`, color: textSecondary }}>
                <th style={{ padding: "10px 12px", fontWeight: 700 }}>상호</th>
                <th style={{ padding: "10px 12px", fontWeight: 700 }}>대표자명</th>
                <th style={{ padding: "10px 12px", fontWeight: 700 }}>지역</th>
                <th style={{ padding: "10px 12px", fontWeight: 700 }}>일반전화</th>
                <th style={{ padding: "10px 12px", fontWeight: 700 }}>휴대폰번호</th>
                <th style={{ padding: "10px 12px", fontWeight: 700 }}>상태</th>
              </tr>
            </thead>
            <tbody>
              {leads.map(lead => (
                <tr key={lead.id} style={{ borderBottom: `1px solid ${border}`, color: textPrimary }}>
                  <td style={{ padding: "12px", fontWeight: 600 }}>{lead.agencyName}</td>
                  <td style={{ padding: "12px" }}>{lead.ceoName}</td>
                  <td style={{ padding: "12px" }}>{lead.city} {lead.district}</td>
                  <td style={{ padding: "12px", color: textSecondary }}>{lead.phone}</td>
                  <td style={{ padding: "12px" }}>{lead.mobile}</td>
                  <td style={{ padding: "12px" }}>
                    <span style={{
                      padding: "3px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700,
                      background: lead.status === "wait" ? "#f3f4f6" : lead.status === "sent" ? "#d1fae5" : lead.status === "failed" ? "#fee2e2" : "#fef3c7",
                      color: lead.status === "wait" ? "#4b5563" : lead.status === "sent" ? "#065f46" : lead.status === "failed" ? "#991b1b" : "#92400e"
                    }}>
                      {lead.status === "wait" ? "발송대기" : lead.status === "sent" ? "발송성공" : lead.status === "failed" ? "발송실패" : "수신거부"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
