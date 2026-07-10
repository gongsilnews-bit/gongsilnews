"use client";

import React, { useState, useEffect } from "react";
import { AdminTheme } from "../types";
import { getCustomerLogs, addCustomerLog, updateCustomerStatus, getRelatedCustomers, getCustomerDetail, sendSmsToCustomer, sendKakaoToCustomer } from "@/app/actions/customer";
import { getVacancyFlyers } from "@/app/actions/vacancy";

interface CustomerDetailPanelProps {
  theme: AdminTheme;
  customerId: string;
  customer?: any;
  onClose: () => void;
}

export default function CustomerDetailPanel({ theme, customerId, customer, onClose }: CustomerDetailPanelProps) {
  const { bg, cardBg, textPrimary, textSecondary, darkMode, border } = theme;
  
  const [localCustomer, setLocalCustomer] = useState<any>(customer || null);
  const [customerLoading, setCustomerLoading] = useState(!customer);
  
  // API로 연동할 데이터
  const [memos, setMemos] = useState<any[]>([]);
  const [newMemo, setNewMemo] = useState("");
  const [activeRightTab, setActiveRightTab] = useState<"memo" | "sms" | "kakao">("memo");
  const [smsContent, setSmsContent] = useState("");
  const [isSendingSms, setIsSendingSms] = useState(false);
  const [kakaoContent, setKakaoContent] = useState("");
  const [isSendingKakao, setIsSendingKakao] = useState(false);
  const [loading, setLoading] = useState(true);
  const [flyers, setFlyers] = useState<any[]>([]);
  const [selectedFlyer, setSelectedFlyer] = useState<any>(null);
  const [relatedCustomers, setRelatedCustomers] = useState<any[]>([]);

  const loadCustomer = async () => {
    if (!customer || String(customer.id) !== String(customerId)) {
      setCustomerLoading(true);
      const res = await getCustomerDetail(customerId);
      if (res.success && res.data) {
        setLocalCustomer(res.data);
      }
      setCustomerLoading(false);
    } else {
      setLocalCustomer(customer);
      setCustomerLoading(false);
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    const res = await getCustomerLogs(customerId);
    if (res.success && res.data) {
      setMemos(res.data);
    }
    setLoading(false);
  };

  const fetchFlyers = async () => {
    const res = await getVacancyFlyers();
    if (res.success && res.data) {
      setFlyers(res.data);
      if (res.data.length > 0) {
        setSelectedFlyer(res.data[0]);
      }
    }
  };

  const fetchRelatedCustomers = async () => {
    if (!localCustomer?.phone) return;
    const res = await getRelatedCustomers(localCustomer.phone, customerId);
    if (res.success && res.data) {
      setRelatedCustomers(res.data);
    }
  };

  useEffect(() => {
    loadCustomer();
  }, [customerId, customer]);

  useEffect(() => {
    if (localCustomer) {
      fetchLogs();
      fetchFlyers();
      fetchRelatedCustomers();
    }
  }, [customerId, localCustomer]);

  const handleAddMemo = async () => {
    if (!newMemo.trim()) return;
    
    // UI에 먼저 반영
    const tempMemo = {
      id: Date.now().toString(),
      type: "memo",
      content: newMemo,
      created_at: new Date().toISOString()
    };
    setMemos([...memos, tempMemo]);
    setNewMemo("");
    
    // DB 저장
    await addCustomerLog(customerId, "memo", newMemo);
    fetchLogs(); // 재조회
  };

  const handleSendSms = async () => {
    if (!smsContent.trim()) return;
    setIsSendingSms(true);
    try {
      const res = await sendSmsToCustomer(customerId, smsContent);
      if (res.success) {
        alert("💬 문자가 정상적으로 발송되었습니다.");
        setSmsContent("");
        fetchLogs();
      } else {
        alert("⚠️ 문자 발송 실패: " + res.message);
      }
    } catch (err: any) {
      alert("⚠️ 오류 발생: " + err.message);
    } finally {
      setIsSendingSms(false);
    }
  };

  const handleSendKakao = async () => {
    if (!kakaoContent.trim()) return;
    setIsSendingKakao(true);
    try {
      // 1. 클립보드 복사
      await navigator.clipboard.writeText(kakaoContent);
      
      // 2. DB 이력 저장 (카카오톡 공유 타입)
      await addCustomerLog(customerId, "kakao", `[🟡 카톡 공유]\n${kakaoContent}`);
      
      // 3. PC/모바일 카카오톡 앱 실행
      window.location.href = "kakaotalk://";
      
      alert("📋 문구가 클립보드에 복사되었으며 카카오톡이 열립니다!\n채팅창에 붙여넣기(Ctrl+V)하여 전송하세요.");
      setKakaoContent("");
      fetchLogs();
    } catch (err: any) {
      alert("⚠️ 오류 발생: " + err.message);
    } finally {
      setIsSendingKakao(false);
    }
  };

  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!localCustomer) return;
    const newStatus = e.target.value;
    
    // DB 업데이트
    await updateCustomerStatus(customerId, newStatus);
    await addCustomerLog(customerId, "system", `상태를 [${localCustomer.status}]에서 [${newStatus}](으)로 변경함.`);
    setLocalCustomer((prev: any) => ({ ...prev, status: newStatus }));
    fetchLogs();
  };

  if (customerLoading) {
    return (
      <div style={{ flex: 1, padding: 40, textAlign: "center", color: textSecondary, background: bg, fontSize: 14 }}>
        문의 상세 정보를 불러오는 중입니다...
      </div>
    );
  }

  if (!localCustomer) {
    return (
      <div style={{ flex: 1, padding: 40, textAlign: "center", color: textSecondary, background: bg, fontSize: 14 }}>
        문의 정보를 찾을 수 없습니다.
      </div>
    );
  }

  // 1. 거래 구분 및 금액 파싱
  const budgetStr = localCustomer.budget || "";
  let transactionType = "정보 없음";
  let priceText = budgetStr;
  
  if (budgetStr.startsWith("[")) {
    const match = budgetStr.match(/^\[(.*?)\]\s*(.*)$/);
    if (match) {
      transactionType = match[1]; // "매매", "월세", "전세" 등
      priceText = match[2]; // "매매 21억 (관비 10)"
    }
  }

  // 1-2. 매물 구분, 희망 지역, 입주 조건 파싱
  let propertyType = "아파트";
  let areaText = localCustomer.area || "지역 미정";
  let moveInCondition = "즉시 입주 / 협의 가능";
  if (localCustomer.area && localCustomer.area.includes(" / ")) {
    const parts = localCustomer.area.split(" / ");
    propertyType = parts[0];
    areaText = parts[1] || "지역 미정";
    if (parts[2]) {
      moveInCondition = parts[2];
    }
  }

  // 2. 접수일 포맷팅
  const dt = new Date(localCustomer.created_at);
  const dateStr = dt.toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" }) + ' ' + dt.toLocaleTimeString("ko-KR", { timeZone: "Asia/Seoul", hour: '2-digit', minute: '2-digit' });

  // 3. 상담 메모 파싱 (전체 메모를 역순으로 렌더링)
  const allNotes = memos.filter(memo => memo.type !== "system").reverse();

  const getByteLength = (str: string) => {
    let b = 0;
    for (let i = 0; i < str.length; i++) {
      const c = str.charCodeAt(i);
      b += c >> 7 ? 2 : 1;
    }
    return b;
  };
  const smsByteCount = getByteLength(smsContent);
  const isSmsLms = smsByteCount > 90;

  const templates = [
    {
      name: "접수안내",
      text: `안녕하세요, ${localCustomer.name} 고객님. 공실뉴스입니다. 신청해주신 [${propertyType}] ${areaText} ${localCustomer.type || "매물"} 문의 건에 대해 상담 준비가 완료되어 연락 드립니다.`
    },
    {
      name: "추천매물",
      text: `안녕하세요, ${localCustomer.name} 고객님. 찾으시는 조건(${areaText} ${priceText})에 맞는 추천 매물 리스트를 안내해 드립니다.\n\n[매물 링크: ]`
    },
    {
      name: "방문일정",
      text: `안녕하세요, ${localCustomer.name} 고객님. 예약하신 미팅 일정 안내입니다.\n• 일시: \n• 장소: [사무실 주소]`
    }
  ];

  const kakaoTemplates = [
    {
      name: "접수안내 (카톡)",
      text: `안녕하세요, ${localCustomer.name} 고객님. 공실뉴스입니다. 신청해주신 [${propertyType}] ${areaText} ${localCustomer.type || "매물"} 문의 건에 대해 상담 준비가 완료되어 연락 드립니다.`
    },
    {
      name: "추천매물 (카톡)",
      text: `안녕하세요, ${localCustomer.name} 고객님. 찾으시는 조건(${areaText} ${priceText})에 맞는 추천 매물 리스트를 안내해 드립니다.\n\n[매물 링크: ]`
    },
    {
      name: "방문일정 (카톡)",
      text: `안녕하세요, ${localCustomer.name} 고객님. 예약하신 미팅 일정 안내입니다.\n• 일시: \n• 장소: [사무실 주소]`
    }
  ];

  return (
    <div style={{
      display: "flex", gap: "24px", padding: "20px 28px", background: bg, minHeight: "100%", width: "100%", overflowY: "auto"
    }}>
      {/* 좌측 상세 정보 영역 */}
      <div style={{ flex: 1.5, display: "flex", flexDirection: "column", gap: "20px", minWidth: 0 }}>
        
        {/* 상단 컨트롤 바 */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: cardBg, padding: "16px 24px", borderRadius: 12, border: `1px solid ${border}`, boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
          <button onClick={onClose} style={{ display: "flex", alignItems: "center", gap: 6, background: darkMode ? "#2c2d31" : "#fff", border: `1px solid ${border}`, borderRadius: 6, padding: "8px 16px", fontSize: 13, fontWeight: 700, color: textPrimary, cursor: "pointer" }}>
            ← 문의 목록
          </button>
          
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: textSecondary }}>진행상태</span>
            <select value={localCustomer.status} onChange={handleStatusChange}
              style={{
                height: 36, padding: "0 12px", border: `1px solid ${border}`, borderRadius: 6, 
                fontSize: 13, fontWeight: 700,
                color: textPrimary,
                background: darkMode ? "#1f2023" : "#fff", outline: "none"
            }}>
              <option value="신규">신규접수</option>
              <option value="진행중">진행중</option>
              <option value="계약완료">계약 완료</option>
              <option value="보류/종료">보류 및 종료</option>
            </select>
          </div>
        </div>

        {/* 메인 상세 정보 카드 */}
        <div style={{ background: cardBg, borderRadius: 12, border: `1px solid ${border}`, padding: "28px", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
          {/* 고객 기본 정보 */}
          <div style={{ borderBottom: `1px solid ${border}`, paddingBottom: "20px", marginBottom: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
              <h2 style={{ margin: 0, fontSize: 24, fontWeight: 850, color: textPrimary }}>{localCustomer.name}</h2>
              <span style={{ 
                fontSize: 13, 
                fontWeight: 800, 
                padding: "4px 12px", 
                borderRadius: 30,
                background: localCustomer.source?.includes("오프라인")
                  ? (darkMode ? "rgba(245, 158, 11, 0.15)" : "#fef3c7")
                  : (darkMode ? "rgba(59, 130, 246, 0.15)" : "#eff6ff"),
                color: localCustomer.source?.includes("오프라인") ? "#d97706" : "#3b82f6",
                border: `1px solid ${
                  localCustomer.source?.includes("오프라인") ? "rgba(245, 158, 11, 0.2)" : "rgba(59, 130, 246, 0.2)"
                }`
              }}>
                {localCustomer.source || "유입 정보 없음"}
              </span>
              {localCustomer.user_id && (
                <span style={{ fontSize: 12, fontWeight: 700, padding: "2px 8px", background: "#dbeafe", color: "#1e40af", borderRadius: 4 }}>
                  가입회원
                </span>
              )}
            </div>
            
            <div style={{ fontSize: 20, color: textPrimary, fontWeight: 800, letterSpacing: "-0.5px" }}>{localCustomer.phone}</div>
            
            {localCustomer.user_id && (
              <div style={{ marginTop: 12, fontSize: 12, color: textSecondary, background: darkMode ? "#1f2023" : "#f8fafc", padding: "8px 12px", borderRadius: 6, border: `1px solid ${border}`, display: "inline-block" }}>
                웹사이트 계정: <span style={{ fontWeight: 700, color: textPrimary }}>{localCustomer.account_email}</span>
              </div>
            )}
          </div>

          {/* 상세 요약 그리드 */}
          <div style={{ display: "grid", gridTemplateColumns: "130px 1fr", gap: "20px 16px", fontSize: 15 }}>
            <div style={{ color: textSecondary, fontWeight: 700 }}>의뢰 구분</div>
            <div style={{ 
              color: localCustomer.type?.includes("구해요") || localCustomer.type?.includes("임차") || localCustomer.type?.includes("매수") ? "#3b82f6" : "#ef4444", 
              fontWeight: 800 
            }}>
              {localCustomer.type}
            </div>
            
            <div style={{ color: textSecondary, fontWeight: 700 }}>매물 구분</div>
            <div style={{ color: textPrimary, fontWeight: 800 }}>{propertyType}</div>

            <div style={{ color: textSecondary, fontWeight: 700 }}>희망 지역</div>
            <div style={{ color: textPrimary, fontWeight: 800 }}>{areaText}</div>
            
            <div style={{ color: textSecondary, fontWeight: 700 }}>거래 구분</div>
            <div style={{ color: textPrimary, fontWeight: 800 }}>{transactionType}</div>
            
            <div style={{ color: textSecondary, fontWeight: 700 }}>금액 / 예산</div>
            <div style={{ 
              color: localCustomer.type?.includes("구해요") || localCustomer.type?.includes("임차") || localCustomer.type?.includes("매수") ? "#3b82f6" : "#ef4444", 
              fontWeight: 800 
            }}>{priceText}</div>
            
            <div style={{ color: textSecondary, fontWeight: 700 }}>입주 조건</div>
            <div style={{ color: textPrimary, fontWeight: 800 }}>{moveInCondition}</div>
            
            <div style={{ color: textSecondary, fontWeight: 700 }}>접수일시</div>
            <div style={{ color: textPrimary, fontWeight: 800 }}>{dateStr}</div>
          </div>
        </div>

      </div>

      {/* 우측 상담 기록(상담 메모) 영역 */}
      <div style={{ width: 400, display: "flex", flexDirection: "column", gap: "20px", flexShrink: 0 }}>
        
        {/* 메모 입력 및 내역 카드 */}
        <div style={{ background: cardBg, borderRadius: 12, border: `1px solid ${border}`, padding: "24px", boxShadow: "0 2px 8px rgba(0,0,0,0.02)", display: "flex", flexDirection: "column", height: "calc(100vh - 120px)" }}>
          {/* 탭 헤더 */}
          <div style={{ display: "flex", gap: "6px", borderBottom: `1px solid ${border}`, paddingBottom: "12px", marginBottom: "16px" }}>
            <button 
              onClick={() => setActiveRightTab("memo")}
              style={{
                flex: 1, height: 34, borderRadius: "6px", fontSize: "12px", fontWeight: 700, cursor: "pointer", border: "none",
                background: activeRightTab === "memo" ? "#3b82f6" : (darkMode ? "#2c2d31" : "#f3f4f6"),
                color: activeRightTab === "memo" ? "#fff" : textSecondary,
                transition: "all 0.15s"
              }}
            >
              📝 메모
            </button>
            <button 
              onClick={() => setActiveRightTab("sms")}
              style={{
                flex: 1, height: 34, borderRadius: "6px", fontSize: "12px", fontWeight: 700, cursor: "pointer", border: "none",
                background: activeRightTab === "sms" ? "#3b82f6" : (darkMode ? "#2c2d31" : "#f3f4f6"),
                color: activeRightTab === "sms" ? "#fff" : textSecondary,
                transition: "all 0.15s"
              }}
            >
              💬 문자
            </button>
            <button 
              onClick={() => setActiveRightTab("kakao")}
              style={{
                flex: 1, height: 34, borderRadius: "6px", fontSize: "12px", fontWeight: 700, cursor: "pointer", border: "none",
                background: activeRightTab === "kakao" ? "#fee500" : (darkMode ? "#2c2d31" : "#f3f4f6"),
                color: activeRightTab === "kakao" ? "#191919" : textSecondary,
                transition: "all 0.15s"
              }}
            >
              🟡 카톡
            </button>
          </div>
          
          {activeRightTab === "memo" && (
            /* 메모 입력창 */
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20, padding: "16px", background: darkMode ? "#2c2d31" : "#f8fafc", borderRadius: 12, border: `1px solid ${border}` }}>
              <textarea 
                value={newMemo} onChange={(e) => setNewMemo(e.target.value)}
                placeholder="상담 내용, 특이사항, 다음 약속일정 등을 기록해 보세요."
                style={{ width: "100%", height: 80, padding: 0, border: "none", background: "transparent", color: textPrimary, outline: "none", resize: "none", fontFamily: "inherit", fontSize: 14 }}
              />
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button onClick={handleAddMemo} style={{ padding: "8px 16px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  기록 등록
                </button>
              </div>
            </div>
          )}

          {activeRightTab === "sms" && (
            /* 문자 발송창 */
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20, padding: "16px", background: darkMode ? "#2c2d31" : "#f8fafc", borderRadius: 12, border: `1px solid ${border}` }}>
              {/* 상용구 선택 목록 */}
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "4px" }}>
                {templates.map(t => (
                  <button 
                    key={t.name}
                    onClick={() => setSmsContent(t.text)}
                    style={{
                      padding: "4px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 700, cursor: "pointer",
                      border: `1px solid ${border}`,
                      background: darkMode ? "#1f2023" : "#fff",
                      color: textSecondary,
                      transition: "all 0.15s"
                    }}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
              <textarea 
                value={smsContent} onChange={(e) => setSmsContent(e.target.value)}
                placeholder="발송할 문자 메시지 내용을 입력하세요."
                style={{ width: "100%", height: 80, padding: 0, border: "none", background: "transparent", color: textPrimary, outline: "none", resize: "none", fontFamily: "inherit", fontSize: 14 }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "12px", color: textSecondary, fontWeight: 700 }}>
                  {smsByteCount} Byte ({isSmsLms ? "LMS 장문" : "SMS 단문"})
                </span>
                <button 
                  onClick={handleSendSms} 
                  disabled={isSendingSms || !smsContent.trim()}
                  style={{ 
                    padding: "8px 16px", background: "#10b981", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, 
                    cursor: isSendingSms || !smsContent.trim() ? "not-allowed" : "pointer",
                    opacity: isSendingSms || !smsContent.trim() ? 0.6 : 1
                  }}
                >
                  {isSendingSms ? "발송 중..." : "문자 발송"}
                </button>
              </div>
            </div>
          )}

          {activeRightTab === "kakao" && (
            /* 카카오톡 발송창 */
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20, padding: "16px", background: darkMode ? "#2c2d31" : "#f8fafc", borderRadius: 12, border: `1px solid ${border}` }}>
              {/* 상용구 선택 목록 */}
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "4px" }}>
                {kakaoTemplates.map(t => (
                  <button 
                    key={t.name}
                    onClick={() => setKakaoContent(t.text)}
                    style={{
                      padding: "4px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 700, cursor: "pointer",
                      border: `1px solid ${border}`,
                      background: darkMode ? "#1f2023" : "#fff",
                      color: textSecondary,
                      transition: "all 0.15s"
                    }}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
              <textarea 
                value={kakaoContent} onChange={(e) => setKakaoContent(e.target.value)}
                placeholder="발송할 알림톡 메시지 내용을 입력하세요."
                style={{ width: "100%", height: 80, padding: 0, border: "none", background: "transparent", color: textPrimary, outline: "none", resize: "none", fontFamily: "inherit", fontSize: 14 }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "12px", color: textSecondary, fontWeight: 700 }}>
                  카카오 알림톡
                </span>
                <button 
                  onClick={handleSendKakao} 
                  disabled={isSendingKakao || !kakaoContent.trim()}
                  style={{ 
                    padding: "8px 16px", background: "#fee500", color: "#191919", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, 
                    cursor: isSendingKakao || !kakaoContent.trim() ? "not-allowed" : "pointer",
                    opacity: isSendingKakao || !kakaoContent.trim() ? 0.6 : 1
                  }}
                >
                  {isSendingKakao ? "발송 중..." : "카톡 발송"}
                </button>
              </div>
            </div>
          )}

          <h3 style={{ margin: "0 0 12px 0", fontSize: 15, fontWeight: 800, color: textPrimary, borderTop: `1px solid ${border}`, paddingTop: "16px" }}>📋 상담 이력</h3>
          
          {/* 상담 이력 리스트 */}
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12, paddingRight: 4 }}>
            {allNotes.length === 0 ? (
              <div style={{ fontSize: 14, color: textSecondary, textAlign: "center", padding: "40px 0" }}>
                등록된 상담 기록이 없습니다.
              </div>
            ) : (
              allNotes.map(memo => {
                const dt = new Date(memo.created_at);
                const dateStr = dt.toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" }) + ' ' + dt.toLocaleTimeString("ko-KR", { timeZone: "Asia/Seoul", hour: '2-digit', minute: '2-digit' });
                const isSmsLog = memo.content?.startsWith("[💬");
                const isKakaoLog = memo.content?.startsWith("[🟡");
                
                let itemBg = darkMode ? "#2c2d31" : "#f8fafc";
                let itemBorder = `1px solid ${border}`;
                if (isSmsLog) {
                  itemBg = darkMode ? "rgba(16, 185, 129, 0.08)" : "rgba(16, 185, 129, 0.04)";
                  itemBorder = "1px solid rgba(16, 185, 129, 0.3)";
                } else if (isKakaoLog) {
                  itemBg = darkMode ? "rgba(234, 179, 8, 0.08)" : "rgba(234, 179, 8, 0.04)";
                  itemBorder = "1px solid rgba(234, 179, 8, 0.3)";
                }

                return (
                  <div key={memo.id} style={{ 
                    padding: "16px", 
                    background: itemBg, 
                    borderRadius: 12, 
                    border: itemBorder,
                    display: "flex",
                    flexDirection: "column",
                    gap: 6
                  }}>
                    <div style={{ fontSize: 11, color: textSecondary, fontWeight: 700 }}>{dateStr}</div>
                    <div style={{ fontSize: 14, color: textPrimary, fontWeight: 600, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                      {memo.content}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
