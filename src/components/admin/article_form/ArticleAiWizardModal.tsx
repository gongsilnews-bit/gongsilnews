"use client";

import React, { useState, useEffect } from "react";
import { generateMarketingDrafts, saveAiDraft, getAiDraftHistory } from "@/app/actions/gemini";
import { createClient } from "@/utils/supabase/client";
import { formatKoreanPrice } from "./articleFormUtils";

export interface ArticleAiWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  isHistoryOpen: boolean;
  onCloseHistory: () => void;
  onOpenHistory?: () => void;
  onApplyDraft: (draftData: any) => void;
  myVacancies: any[];
  isLoadingVacancies: boolean;
  fetchMyVacancies: () => void;
  border?: string;
  textPrimary?: string;
  textSecondary?: string;
  textMuted?: string;
}

export default function ArticleAiWizardModal({
  isOpen,
  onClose,
  isHistoryOpen,
  onCloseHistory,
  onOpenHistory,
  onApplyDraft,
  myVacancies,
  isLoadingVacancies,
  fetchMyVacancies,
  border = "#e2e8f0",
  textPrimary = "#0f172a",
  textSecondary = "#64748b",
  textMuted = "#94a3b8",
}: ArticleAiWizardModalProps) {
  const showAiWizardModal = isOpen;
  const setShowAiWizardModal = (open: boolean) => { if (!open) onClose(); };
  const showAiHistoryModal = isHistoryOpen;
  const setShowAiHistoryModal = (open: boolean) => { if (!open) onCloseHistory(); };

  /* ── AI 마법사 전용 내부 상태 ── */
  const [aiWizardTab, setAiWizardTab] = useState<"vacancy" | "news">("vacancy");
  const [aiNewsSourceText, setAiNewsSourceText] = useState("");
  const [aiTone, setAiTone] = useState("전문적이고 신뢰감 있는");
  const [aiAudience, setAiAudience] = useState("일반 투자자 및 실수요자");
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  // 수동 매물 등록 모드 (선택형 vs 직접입력형)
  const [directVacancyMode, setDirectVacancyMode] = useState<"select" | "direct">("select");
  const [selectedVacancyId, setSelectedVacancyId] = useState<string>("");
  const [directBuildingName, setDirectBuildingName] = useState("");
  const [directPropertyType, setDirectPropertyType] = useState("상가");
  const [directTradeType, setDirectTradeType] = useState("월세");
  const [directDeposit, setDirectDeposit] = useState("");
  const [directMonthlyRent, setDirectMonthlyRent] = useState("");
  const [directExclusivePy, setDirectExclusivePy] = useState("");
  const [directSupplyPy, setDirectSupplyPy] = useState("");
  const [directRoomCount, setDirectRoomCount] = useState("1");
  const [directBathCount, setDirectBathCount] = useState("1");
  const [directCurrentFloor, setDirectCurrentFloor] = useState("1");
  const [directTotalFloor, setDirectTotalFloor] = useState("5");
  const [directDirection, setDirectDirection] = useState("남향");
  const [directParking, setDirectParking] = useState("가능");
  const [directOptions, setDirectOptions] = useState<string[]>([]);
  const [directMoveInDate, setDirectMoveInDate] = useState("즉시입주");
  const [directAddress, setDirectAddress] = useState("");
  const [directDescription, setDirectDescription] = useState("");

  // 상세 글쓰기 옵션
  const [aiLengthType, setAiLengthType] = useState<any>("standard");
  const [aiCustomLength, setAiCustomLength] = useState(1500);
  const [aiStyleType, setAiStyleType] = useState<any>("news");
  const [aiEndingType, setAiEndingType] = useState<any>("하십시오체");
  const [aiLayoutPattern, setAiLayoutPattern] = useState<any>("standard");
  const [aiAttachedImage, setAiAttachedImage] = useState<{ data: string; mimeType: string; name: string } | null>(null);

  // 과거 히스토리 상태
  const [aiHistory, setAiHistory] = useState<any[]>([]);

  useEffect(() => {
    if (showAiWizardModal) {
      fetchMyVacancies();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAiWizardModal]);

  useEffect(() => {
    if (myVacancies.length > 0 && !selectedVacancyId) {
      setSelectedVacancyId(myVacancies[0].id);
    }
  }, [myVacancies, selectedVacancyId]);

  useEffect(() => {
    if (showAiHistoryModal) {
      loadAiHistory();
    }
  }, [showAiHistoryModal]);

  const loadAiHistory = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const res = await getAiDraftHistory(user.id);
        if (res.success && res.data) {
          setAiHistory(res.data);
        }
      }
    } catch (err) {
      console.error("loadAiHistory error:", err);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(",")[1];
        setAiAttachedImage({
          data: base64String,
          mimeType: file.type,
          name: file.name
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerateAiDrafts = async () => {
    if (aiWizardTab === "news" && !aiNewsSourceText.trim()) {
      alert("분석할 뉴스 원문이나 자료를 입력해 주세요.");
      return;
    }
    if (aiWizardTab === "vacancy" && directVacancyMode === "direct" && !directBuildingName.trim()) {
      alert("건물명/단지명을 입력해 주세요.");
      return;
    }

    setIsGeneratingAi(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("로그인이 필요합니다.");
        return;
      }

      const customVacancyData = aiWizardTab === "vacancy" && directVacancyMode === "direct" ? {
        buildingName: directBuildingName,
        propertyType: directPropertyType,
        tradeType: directTradeType,
        deposit: directDeposit,
        monthlyRent: directMonthlyRent,
        exclusivePy: directExclusivePy,
        supplyPy: directSupplyPy,
        roomCount: directRoomCount,
        bathCount: directBathCount,
        currentFloor: directCurrentFloor,
        totalFloor: directTotalFloor,
        direction: directDirection,
        parking: directParking,
        options: directOptions,
        moveInDate: directMoveInDate,
        address: directAddress,
        description: directDescription,
      } : undefined;

      const res = await generateMarketingDrafts({
        memberId: user.id,
        vacancyId: (aiWizardTab === "vacancy" && directVacancyMode === "select") ? selectedVacancyId : undefined,
        sourceText: aiWizardTab === "news" ? aiNewsSourceText : undefined,
        tone: aiTone,
        audience: aiAudience,
        customVacancyData,
        lengthType: aiLengthType,
        customLength: aiCustomLength,
        styleType: aiStyleType,
        endingType: aiEndingType,
        layoutPattern: aiLayoutPattern,
        image: aiAttachedImage ? { data: aiAttachedImage.data, mimeType: aiAttachedImage.mimeType } : undefined,
      });

      if (res.success && res.data) {
        await saveAiDraft({
          member_id: user.id,
          vacancy_id: (aiWizardTab === "vacancy" && directVacancyMode === "select") ? selectedVacancyId : undefined,
          source_type: aiWizardTab === "vacancy" ? (directVacancyMode === "direct" ? "MANUAL" : "VACANCY") : "NEWS",
          original_source: aiWizardTab === "news" ? aiNewsSourceText : (directVacancyMode === "direct" ? `[직접 입력 매물] 건물명: ${directBuildingName}, 주소: ${directAddress}, 가격: ${directTradeType} ${directDeposit}/${directMonthlyRent}` : ""),
          title: res.data.title,
          subtitle: res.data.subtitle,
          content_article: res.data.content_article,
          content_blog: res.data.content_blog,
          content_shorts: res.data.content_shorts,
          content_sns: res.data.content_sns,
          image_urls: []
        });

        alert("✨ 5가지 채널용 마케팅 초안이 생성되었습니다! 우측 'AI 멀티채널 보관소'에서 확인해 보세요.");
        onApplyDraft(res.data);
        onClose();
      } else {
        alert("❌ 생성 실패: " + res.error);
      }
    } catch (err: any) {
      alert("❌ 생성 중 오류가 발생했습니다: " + err.message);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleLoadHistoryItem = (item: any) => {
    onApplyDraft({
      title: item.title || "",
      subtitle: item.subtitle || "",
      content_article: item.content_article || "",
      content_blog: item.content_blog || "",
      content_shorts: item.content_shorts || "",
      content_sns: item.content_sns || "",
    });
    onCloseHistory();
    alert("🕒 과거에 작성한 AI 초안을 성공적으로 불러왔습니다!");
  };

  if (!isOpen && !isHistoryOpen) return null;

  return (
    <>
      {showAiWizardModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(15, 23, 42, 0.65)", display: "flex", alignItems: "center", justifyContent: "center",
          backdropFilter: "blur(8px)", zIndex: 10000, padding: 20
        }}>
          <div style={{
            background: "rgba(255, 255, 255, 0.95)", borderRadius: 20, width: 960, maxWidth: "95%",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)", overflow: "hidden", display: "flex", flexDirection: "column",
            border: "1px solid rgba(255,255,255,0.8)", position: "relative"
          }}>
            
            {/* AI 생성 중 로딩 오버레이 */}
            {isGeneratingAi && (
              <div style={{
                position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                background: "rgba(15, 23, 42, 0.92)", zIndex: 11000,
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40,
                color: "#fff", textAlign: "center"
              }}>
                <div style={{
                  width: 80, height: 80, borderRadius: "50%",
                  background: "radial-gradient(circle, #f59e0b, #4f46e5)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  animation: "pulse 1.8s infinite alternate", marginBottom: 24,
                  boxShadow: "0 0 40px rgba(245, 158, 11, 0.6)"
                }}>
                  <span style={{ fontSize: 36, animation: "spin 3s linear infinite" }}>✨</span>
                </div>
                <h3 style={{ fontSize: 20, fontWeight: 900, marginBottom: 12, background: "linear-gradient(to right, #fbbf24, #f472b6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  AI 초안 마법사 가동 중...
                </h3>
                <p style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.6, maxWidth: 380, margin: 0 }}>
                  연동된 매물 속성을 정밀하게 교차 분석하여 <strong>기사 초안, 블로그글, 쇼츠대본, SNS글</strong> 5대 마케팅 채널 원고를 기적처럼 자동 빌드 중입니다. 잠시만 기다려 주세요!
                </p>
                <style>{`
                  @keyframes pulse {
                    0% { transform: scale(0.92); box-shadow: 0 0 20px rgba(245,158,11,0.4); }
                    100% { transform: scale(1.05); box-shadow: 0 0 50px rgba(79,70,229,0.8); }
                  }
                  @keyframes spin {
                    100% { transform: rotate(360deg); }
                  }
                `}</style>
              </div>
            )}

            {/* 헤더 */}
            <div style={{
              background: "#ffffff", padding: "20px 28px",
              display: "flex", alignItems: "center", justifyContent: "space-between", color: "#0f172a",
              borderBottom: "1px solid #f1f5f9"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72Z"/>
                  <path d="m14 7 3 3"/>
                  <path d="M5 6v1M19 17v1M20 12h1M3 12h1M19 8l.9.9M4 15l.9.9"/>
                </svg>
                <div>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, letterSpacing: "-0.03em", color: "#0f172a" }}>AI 초안 마법사 (Multi-Channel Writer)</h3>
                  <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>단 한 번의 입력으로 5개 채널 원고를 동시에 자동 작성합니다.</div>
                </div>
              </div>
              <button type="button" onClick={() => setShowAiWizardModal(false)}
                style={{ background: "none", border: "none", color: "#94a3b8", fontSize: 24, cursor: "pointer", transition: "color 0.2s" }}
                onMouseOver={e => e.currentTarget.style.color = "#0f172a"}
                onMouseOut={e => e.currentTarget.style.color = "#94a3b8"}>✕</button>
            </div>

            {/* 탭 네비게이션 */}
            <div style={{ display: "flex", borderBottom: "1px solid #f1f5f9", background: "#ffffff" }}>
              <button type="button" onClick={() => setAiWizardTab("vacancy")}
                style={{
                  flex: 1, padding: "16px 0", border: "none", background: "none",
                  borderBottom: aiWizardTab === "vacancy" ? "2px solid #6366f1" : "2px solid transparent",
                  fontSize: 15, fontWeight: aiWizardTab === "vacancy" ? 700 : 500,
                  color: aiWizardTab === "vacancy" ? "#6366f1" : "#64748b", cursor: "pointer", transition: "all 0.15s"
                }}>
                내 등록 매물 연동 초안 쓰기
              </button>
              <button type="button" onClick={() => setAiWizardTab("news")}
                style={{
                  flex: 1, padding: "16px 0", border: "none", background: "none",
                  borderBottom: aiWizardTab === "news" ? "2px solid #6366f1" : "2px solid transparent",
                  fontSize: 15, fontWeight: aiWizardTab === "news" ? 700 : 500,
                  color: aiWizardTab === "news" ? "#6366f1" : "#64748b", cursor: "pointer", transition: "all 0.15s"
                }}>
                일반 외부 자료/보도초안 쓰기
              </button>
            </div>

            {/* 본문 폼 영역 */}
            <div style={{ padding: "28px 32px", flex: 1, overflowY: "auto", maxHeight: "75vh" }}>
              {aiWizardTab === "vacancy" ? (
                <div>
                  {/* 매물 연동 방식 선택 토글 */}
                  <div style={{
                    display: "flex",
                    background: "#f1f5f9",
                    padding: 4,
                    borderRadius: 8,
                    marginBottom: 20
                  }}>
                    <button
                      type="button"
                      onClick={() => setDirectVacancyMode("select")}
                      style={{
                        flex: 1, padding: "8px 12px", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer",
                        border: "none",
                        background: directVacancyMode === "select" ? "#ffffff" : "transparent",
                        color: directVacancyMode === "select" ? "#0f172a" : "#64748b",
                        boxShadow: directVacancyMode === "select" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                        transition: "all 0.15s"
                      }}
                    >
                      내 등록 매물 연동하기
                    </button>
                    <button
                      type="button"
                      onClick={() => setDirectVacancyMode("direct")}
                      style={{
                        flex: 1, padding: "8px 12px", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer",
                        border: "none",
                        background: directVacancyMode === "direct" ? "#ffffff" : "transparent",
                        color: directVacancyMode === "direct" ? "#0f172a" : "#64748b",
                        boxShadow: directVacancyMode === "direct" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                        transition: "all 0.15s"
                      }}
                    >
                      매물 직접 입력하여 작성
                    </button>
                  </div>

                  {directVacancyMode === "direct" ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "16px", background: "#ffffff", borderRadius: 12, border: "1px solid #e2e8f0", marginBottom: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f1f5f9", paddingBottom: 10, marginBottom: 4 }}>
                        <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#0f172a" }}>
                          매물 상세정보 수동 입력
                        </h4>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <a
                            href="https://land.naver.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              padding: "4px 8px",
                              background: "#03c75a",
                              color: "#ffffff",
                              fontSize: 10,
                              fontWeight: 700,
                              borderRadius: 6,
                              textDecoration: "none",
                              transition: "all 0.15s"
                            }}
                            onMouseOver={e => {
                              (e.currentTarget as HTMLElement).style.background = "#02b34f";
                              (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
                            }}
                            onMouseOut={e => {
                              (e.currentTarget as HTMLElement).style.background = "#03c75a";
                              (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                            }}
                          >
                            네이버 부동산 ↗
                          </a>
                          
                          <label
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              padding: "4px 8px",
                              background: "#3b82f6",
                              color: "#ffffff",
                              fontSize: 10,
                              fontWeight: 700,
                              borderRadius: 6,
                              cursor: "pointer",
                              transition: "all 0.15s"
                            }}
                            onMouseOver={e => {
                              (e.currentTarget as HTMLElement).style.background = "#2563eb";
                              (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
                            }}
                            onMouseOut={e => {
                              (e.currentTarget as HTMLElement).style.background = "#3b82f6";
                              (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                            }}
                          >
                            사진 첨부
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleImageUpload}
                              style={{ display: "none" }}
                            />
                          </label>
                        </div>
                      </div>

                      {/* 이미지 프리뷰 영역 */}
                      {aiAttachedImage && aiWizardTab === "vacancy" && (
                        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#f8fafc", padding: "6px 10px", borderRadius: 8, border: "1px dashed #cbd5e1", marginBottom: 4 }}>
                          <img src={`data:${aiAttachedImage.mimeType};base64,${aiAttachedImage.data}`} style={{ width: 36, height: 36, borderRadius: 6, objectFit: "cover" }} />
                          <span style={{ fontSize: 11, color: textSecondary, flex: 1, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                            {aiAttachedImage.name}
                          </span>
                          <button type="button" onClick={() => setAiAttachedImage(null)} style={{ border: "none", background: "none", color: "#ef4444", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                            ❌ 삭제
                          </button>
                        </div>
                      )}
                      
                      {/* 건물명, 주소 */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        <div>
                          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6 }}>건물명/단지명 <span style={{ color: "#ef4444" }}>*</span></label>
                          <input type="text" placeholder="예: 한양아이클래스" value={directBuildingName} onChange={e => setDirectBuildingName(e.target.value)}
                            style={{ width: "100%", padding: "10px 14px", border: `1px solid ${border}`, borderRadius: 6, fontSize: 14, boxSizing: "border-box" }} />
                        </div>
                        <div>
                          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6 }}>소재지 주소</label>
                          <input type="text" placeholder="예: 서울시 강남구 역삼동" value={directAddress} onChange={e => setDirectAddress(e.target.value)}
                            style={{ width: "100%", padding: "10px 14px", border: `1px solid ${border}`, borderRadius: 6, fontSize: 14, boxSizing: "border-box" }} />
                        </div>
                      </div>

                      {/* 매물형태, 거래종류 */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        <div>
                          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6 }}>매물형태</label>
                          <select value={directPropertyType} onChange={e => setDirectPropertyType(e.target.value)}
                            style={{ width: "100%", padding: "10px 14px", border: `1px solid ${border}`, borderRadius: 6, fontSize: 14, background: "#fff" }}>
                            {["아파트", "오피스텔", "원룸/투룸", "빌라/연립", "상가/사무실", "토지/건물"].map(x => <option key={x} value={x}>{x}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6 }}>거래종류</label>
                          <div style={{ display: "flex", background: "#f1f5f9", padding: 4, borderRadius: 8 }}>
                            {["매매", "전세", "월세"].map(x => (
                              <button key={x} type="button" onClick={() => setDirectTradeType(x)}
                                style={{
                                  flex: 1, padding: "8px 0", border: "none",
                                  borderRadius: 6, fontSize: 13, fontWeight: 600, background: directTradeType === x ? "#ffffff" : "transparent",
                                  color: directTradeType === x ? "#0f172a" : "#64748b", cursor: "pointer",
                                  boxShadow: directTradeType === x ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                                  transition: "all 0.15s"
                                }}>{x}</button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* 가격 설정 */}
                      <div style={{ display: "grid", gridTemplateColumns: directTradeType === "월세" ? "1fr 1fr" : "1fr", gap: 10 }}>
                        <div>
                          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6 }}>
                            {directTradeType === "매매" ? "매매가 (만원)" : directTradeType === "전세" ? "전세금 (만원)" : "보증금 (만원)"}
                          </label>
                          <input type="number" placeholder="예: 5000" value={directDeposit} onChange={e => setDirectDeposit(e.target.value)}
                            style={{ width: "100%", padding: "10px 14px", border: `1px solid ${border}`, borderRadius: 6, fontSize: 14, boxSizing: "border-box" }} />
                        </div>
                        {directTradeType === "월세" && (
                          <div>
                            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6 }}>월세 (만원)</label>
                            <input type="number" placeholder="예: 60" value={directMonthlyRent} onChange={e => setDirectMonthlyRent(e.target.value)}
                              style={{ width: "100%", padding: "10px 14px", border: `1px solid ${border}`, borderRadius: 6, fontSize: 14, boxSizing: "border-box" }} />
                          </div>
                        )}
                      </div>

                      {/* 면적, 구조 */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        <div>
                          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6 }}>전용면적 (평)</label>
                          <input type="number" placeholder="예: 18" value={directExclusivePy} onChange={e => setDirectExclusivePy(e.target.value)}
                            style={{ width: "100%", padding: "10px 14px", border: `1px solid ${border}`, borderRadius: 6, fontSize: 14, boxSizing: "border-box" }} />
                        </div>
                        <div>
                          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6 }}>구조 (방 수 / 욕실 수)</label>
                          <div style={{ display: "flex", gap: 6 }}>
                            <input type="number" placeholder="방" value={directRoomCount} onChange={e => setDirectRoomCount(e.target.value)}
                              style={{ flex: 1, padding: "10px 8px", border: `1px solid ${border}`, borderRadius: 6, fontSize: 14, textAlign: "center", boxSizing: "border-box" }} />
                            <input type="number" placeholder="욕실" value={directBathCount} onChange={e => setDirectBathCount(e.target.value)}
                              style={{ flex: 1, padding: "10px 8px", border: `1px solid ${border}`, borderRadius: 6, fontSize: 14, textAlign: "center", boxSizing: "border-box" }} />
                          </div>
                        </div>
                      </div>

                      {/* 층수, 방향, 주차 */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                        <div>
                          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6 }}>층수 (해당/전체)</label>
                          <div style={{ display: "flex", gap: 4 }}>
                            <input type="number" placeholder="해당" value={directCurrentFloor} onChange={e => setDirectCurrentFloor(e.target.value)}
                              style={{ flex: 1, padding: "10px 4px", border: `1px solid ${border}`, borderRadius: 6, fontSize: 13, textAlign: "center", boxSizing: "border-box" }} />
                            <input type="number" placeholder="전체" value={directTotalFloor} onChange={e => setDirectTotalFloor(e.target.value)}
                              style={{ flex: 1, padding: "10px 4px", border: `1px solid ${border}`, borderRadius: 6, fontSize: 13, textAlign: "center", boxSizing: "border-box" }} />
                          </div>
                        </div>
                        <div>
                          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6 }}>방향 (향)</label>
                          <input type="text" placeholder="남향/동향" value={directDirection} onChange={e => setDirectDirection(e.target.value)}
                            style={{ width: "100%", padding: "10px 14px", border: `1px solid ${border}`, borderRadius: 6, fontSize: 14, boxSizing: "border-box" }} />
                        </div>
                        <div>
                          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6 }}>주차 가능 여부</label>
                          <div style={{ display: "flex", background: "#f1f5f9", padding: 4, borderRadius: 8 }}>
                            {["가능", "불가"].map(x => (
                              <button key={x} type="button" onClick={() => setDirectParking(x)}
                                style={{
                                  flex: 1, padding: "8px 0", border: "none",
                                  borderRadius: 6, fontSize: 13, fontWeight: 600, background: directParking === x ? "#ffffff" : "transparent",
                                  color: directParking === x ? "#0f172a" : "#64748b", cursor: "pointer",
                                  boxShadow: directParking === x ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                                  transition: "all 0.15s"
                                }}>{x}</button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* 제공 옵션 */}
                      <div style={{ marginTop: 6 }}>
                        <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6 }}>제공 옵션</label>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {["에어컨", "냉장고", "세탁기", "침대", "옷장", "신발장", "인덕션", "TV", "싱크대", "도어락", "엘리베이터"].map(opt => {
                            const isSelected = directOptions.includes(opt);
                            return (
                              <button
                                key={opt} type="button"
                                onClick={() => {
                                  if (isSelected) setDirectOptions(directOptions.filter(o => o !== opt));
                                  else setDirectOptions([...directOptions, opt]);
                                }}
                                style={{
                                  padding: "6px 12px", borderRadius: 14, fontSize: 13, fontWeight: 600, cursor: "pointer",
                                  border: isSelected ? "1px solid #6366f1" : `1px solid ${border}`,
                                  background: isSelected ? "#eff6ff" : "#fff",
                                  color: isSelected ? "#6366f1" : "#64748b",
                                  transition: "all 0.1s"
                                }}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* 입주예정일, 특장점 */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
                        <div>
                          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6 }}>입주 가능일</label>
                          <input type="text" placeholder="예: 즉시 입주 가능 또는 협의" value={directMoveInDate} onChange={e => setDirectMoveInDate(e.target.value)}
                            style={{ width: "100%", padding: "10px 14px", border: `1px solid ${border}`, borderRadius: 6, fontSize: 14, boxSizing: "border-box" }} />
                        </div>
                        <div>
                          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6 }}>매물 추가 특장점 요약</label>
                          <textarea placeholder="예: 역세권 5분 거리, 풀옵션 신축 빌라, 주변 학군 우수" value={directDescription} onChange={e => setDirectDescription(e.target.value)}
                            style={{ width: "100%", height: 80, padding: "10px 14px", border: `1px solid ${border}`, borderRadius: 6, fontSize: 14, resize: "none", boxSizing: "border-box", outline: "none" }} />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#0f172a", marginBottom: 8 }}>
                        연동할 매물 선택 <span style={{ color: "#ef4444" }}>*</span>
                      </label>
                      
                      {isLoadingVacancies ? (
                        <div style={{ padding: "16px", background: "#f3f4f6", borderRadius: 8, color: textSecondary, fontSize: 13, textAlign: "center" }}>
                          ⏳ 매물 목록을 실시간으로 가져오는 중입니다...
                        </div>
                      ) : myVacancies.length === 0 ? (
                        <div style={{ padding: "20px", background: "#fffbeb", border: "1px solid #fef3c7", borderRadius: 8, color: "#b45309", fontSize: 13, lineHeight: 1.5, marginBottom: 16 }}>
                          ⚠️ <strong>등록된 매물이 아직 없습니다.</strong><br />
                          '매물 직접 입력하여 작성' 탭을 선택하여 매물 정보를 바로 입력하거나, 또는 '공실등록' 메뉴에서 매물을 먼저 등록해 주세요.
                        </div>
                      ) : (
                        <select 
                          value={selectedVacancyId} 
                          onChange={e => setSelectedVacancyId(e.target.value)}
                          style={{
                            width: "100%", padding: "12px 14px", border: `1px solid ${border}`, borderRadius: 8,
                            fontSize: 13, color: textPrimary, outline: "none", background: "#fff", marginBottom: 16
                          }}
                        >
                          {myVacancies.map(v => (
                            <option key={v.id} value={v.id}>
                              [{v.trade_type}] {v.building_name || "무제 건물"} (매물번호 {v.vacancy_no}) ({v.sido} {v.sigungu} {v.dong}) - {
                                v.trade_type === "매매" || v.trade_type === "전세"
                                  ? formatKoreanPrice(v.deposit)
                                  : `${formatKoreanPrice(v.deposit)}/${formatKoreanPrice(v.monthly_rent)}`
                              }
                            </option>
                          ))}
                        </select>
                      )}

                      <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#0f172a", marginBottom: 8, marginTop: 14 }}>
                        보충 정보 및 참고 원문 (선택)
                      </label>
                      <textarea
                        value={aiNewsSourceText}
                        onChange={e => setAiNewsSourceText(e.target.value)}
                        placeholder="특이 장점이나 강조하고 싶은 부분, 또는 참고할 문구가 있다면 추가로 편하게 입력해 주세요."
                        style={{
                          width: "100%", height: 100, padding: "12px", border: `1px solid ${border}`, borderRadius: 8,
                          fontSize: 13, color: textPrimary, outline: "none", resize: "none", background: "#fff", boxSizing: "border-box"
                        }}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>
                      외부 뉴스 및 참고 자료 원문 입력 <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <a
                        href="https://news.naver.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          padding: "5px 11px",
                          background: "#03c75a",
                          color: "#ffffff",
                          fontSize: 11,
                          fontWeight: 700,
                          borderRadius: 6,
                          textDecoration: "none",
                          boxShadow: "0 2px 6px rgba(3, 199, 90, 0.1)",
                          transition: "all 0.15s"
                        }}
                        onMouseOver={e => {
                          (e.currentTarget as HTMLElement).style.background = "#02b34f";
                          (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
                        }}
                        onMouseOut={e => {
                          (e.currentTarget as HTMLElement).style.background = "#03c75a";
                          (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                        }}
                      >
                        네이버 뉴스 ↗
                      </a>
                      
                      <label
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          padding: "5px 11px",
                          background: "#3b82f6",
                          color: "#ffffff",
                          fontSize: 11,
                          fontWeight: 700,
                          borderRadius: 6,
                          cursor: "pointer",
                          transition: "all 0.15s"
                        }}
                        onMouseOver={e => {
                          (e.currentTarget as HTMLElement).style.background = "#2563eb";
                          (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
                        }}
                        onMouseOut={e => {
                          (e.currentTarget as HTMLElement).style.background = "#3b82f6";
                          (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                        }}
                      >
                        사진 첨부
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          style={{ display: "none" }}
                        />
                      </label>
                    </div>
                  </div>

                  {/* 이미지 프리뷰 영역 */}
                  {aiAttachedImage && aiWizardTab === "news" && (
                    <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#f8fafc", padding: "6px 10px", borderRadius: 8, border: "1px dashed #cbd5e1", marginBottom: 12 }}>
                      <img src={`data:${aiAttachedImage.mimeType};base64,${aiAttachedImage.data}`} style={{ width: 36, height: 36, borderRadius: 6, objectFit: "cover" }} />
                      <span style={{ fontSize: 11, color: textSecondary, flex: 1, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                        {aiAttachedImage.name}
                      </span>
                      <button type="button" onClick={() => setAiAttachedImage(null)} style={{ border: "none", background: "none", color: "#ef4444", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                        ❌ 삭제
                      </button>
                    </div>
                  )}
                  <textarea
                    value={aiNewsSourceText}
                    onChange={e => setAiNewsSourceText(e.target.value)}
                    placeholder="네이버 뉴스 등 일반 보도자료 내용이나, 홍보하고 싶은 매물의 세부 줄글 정보를 붙여넣어 주세요. AI가 고품격 마케팅 패키지로 완벽하게 변환해 드립니다."
                    style={{
                      width: "100%", height: 180, padding: "14px", border: `1px solid ${border}`, borderRadius: 8,
                      fontSize: 14, color: textPrimary, outline: "none", resize: "none", background: "#fff", boxSizing: "border-box", marginBottom: 18
                    }}
                  />
                </div>
              )}

              {/* 작성 톤앤매너 선택 */}
              <div style={{ marginTop: 22 }}>
                <label style={{ display: "block", fontSize: 14, fontWeight: 600, color: "#334155", marginBottom: 8 }}>
                  작성 톤앤매너 설정
                </label>
                <div style={{ display: "flex", background: "#f1f5f9", padding: 4, borderRadius: 8 }}>
                  {["오피셜 칼럼", "친근한 대화체", "전문가 정보 제공"].map(t => (
                    <button
                      key={t} type="button" onClick={() => setAiTone(t)}
                      style={{
                        flex: 1, padding: "10px 0", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer",
                        background: aiTone === t ? "#ffffff" : "transparent",
                        color: aiTone === t ? "#0f172a" : "#64748b",
                        boxShadow: aiTone === t ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                        transition: "all 0.15s"
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* 타깃 독자층 설정 */}
              <div style={{ marginTop: 22 }}>
                <label style={{ display: "block", fontSize: 14, fontWeight: 600, color: "#334155", marginBottom: 8 }}>
                  타깃 독자층 설정
                </label>
                <div style={{ display: "flex", background: "#f1f5f9", padding: 4, borderRadius: 8 }}>
                  {["일반 매수자/세입자", "부동산 투자자", "동료 중개업자"].map(a => (
                    <button
                      key={a} type="button" onClick={() => setAiAudience(a)}
                      style={{
                        flex: 1, padding: "10px 0", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer",
                        background: aiAudience === a ? "#ffffff" : "transparent",
                        color: aiAudience === a ? "#0f172a" : "#64748b",
                        boxShadow: aiAudience === a ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                        transition: "all 0.15s"
                      }}
                    >
                      {a.split(" ")[0]}
                    </button>
                  ))}
                </div>
              </div>

              {/* 전문가 전용 상세 옵션 설정 */}
              <div style={{ marginTop: 24, padding: "22px 0 0 0", borderTop: "1px dashed #e2e8f0" }}>
                <h4 style={{ margin: "0 0 16px 0", fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
                  전문가 전용 상세 옵션 설정
                </h4>
                
                {/* 글의 길이 */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 8 }}>
                    글의 길이 설정
                  </label>
                  <div style={{ display: "flex", background: "#f1f5f9", padding: 4, borderRadius: 8 }}>
                    {["짧게(500자)", "보통(1000자)", "길게(1500자)", "직접 입력"].map(len => {
                      const isSelected = aiLengthType === len.split("(")[0];
                      return (
                        <button
                          key={len} type="button" onClick={() => setAiLengthType(len.split("(")[0])}
                          style={{
                            flex: 1, padding: "8px 0", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer",
                            background: isSelected ? "#ffffff" : "transparent",
                            color: isSelected ? "#0f172a" : "#64748b",
                            boxShadow: isSelected ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                            transition: "all 0.15s"
                          }}
                        >
                          {len.split("(")[0]}
                        </button>
                      );
                    })}
                  </div>
                  
                  {aiLengthType === "직접 입력" && (
                    <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10 }}>
                      <input
                        type="number"
                        value={aiCustomLength}
                        onChange={e => setAiCustomLength(Number(e.target.value))}
                        style={{ width: 140, padding: "10px 14px", border: `1px solid ${border}`, borderRadius: 8, fontSize: 14, outline: "none" }}
                        placeholder="자수 입력 (예: 800)"
                      />
                      <span style={{ fontSize: 14, color: textSecondary, fontWeight: 600 }}>자 내외</span>
                    </div>
                  )}
                </div>

                {/* 기사 구성 패턴 */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 8 }}>
                    기사 구성 레이아웃 패턴 선택
                  </label>
                  <div style={{ display: "flex", background: "#f1f5f9", padding: 4, borderRadius: 8 }}>
                    {([
                      { k: "standard" as const, l: "정통 보도기사형", d: "연속 줄글" },
                      { k: "summary_header" as const, l: "요약 + 소제목형", d: "요약표 & 소제목" },
                      { k: "targeted" as const, l: "타깃 맞춤 추천형", d: "요약표 & 타깃" }
                    ]).map(pattern => {
                      const isSelected = aiLayoutPattern === pattern.k;
                      return (
                        <button
                          key={pattern.k} type="button" onClick={() => setAiLayoutPattern(pattern.k)}
                          style={{
                            flex: 1, padding: "8px 4px", border: "none",
                            borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer",
                            background: isSelected ? "#ffffff" : "transparent",
                            color: isSelected ? "#0f172a" : "#64748b",
                            boxShadow: isSelected ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                            transition: "all 0.15s",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 2
                          }}
                        >
                          <span style={{ fontSize: 13 }}>{pattern.l}</span>
                          <span style={{ fontSize: 10, fontWeight: 500, color: isSelected ? "#4f46e5" : "#94a3b8" }}>{pattern.d}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 상세 작성 스타일 */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 8 }}>
                    상세 작성 스타일
                  </label>
                  <div style={{ display: "flex", background: "#f1f5f9", padding: 4, borderRadius: 8 }}>
                    {["기본", "오피셜 보도기사", "블로그 정보성", "친근한 추천체", "유머러스 소통"].map(style => (
                      <button
                        key={style} type="button" onClick={() => setAiStyleType(style)}
                        style={{
                          flex: 1, padding: "8px 0", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer",
                          background: aiStyleType === style ? "#ffffff" : "transparent",
                          color: aiStyleType === style ? "#0f172a" : "#64748b",
                          boxShadow: aiStyleType === style ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                          transition: "all 0.15s"
                        }}
                      >
                        {style.includes("오피셜") ? "보도기사" : style.includes("블로그") ? "블로그형" : style.includes("친근한") ? "친근체" : style.includes("유머러스") ? "소통형" : "기본"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 말투 설정 */}
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 8 }}>
                    말투 / 종결어미
                  </label>
                  <div style={{ display: "flex", background: "#f1f5f9", padding: 4, borderRadius: 8 }}>
                    {["하십시오체", "해요체", "해라체/다체"].map(ending => (
                      <button
                        key={ending} type="button" onClick={() => setAiEndingType(ending)}
                        style={{
                          flex: 1, padding: "8px 0", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer",
                          background: aiEndingType === ending ? "#ffffff" : "transparent",
                          color: aiEndingType === ending ? "#0f172a" : "#64748b",
                          boxShadow: aiEndingType === ending ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                          transition: "all 0.15s"
                        }}
                      >
                        {ending === "하십시오체" ? "습니다체" : ending === "해요체" ? "해요체" : "다/한다체"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

            </div>

            {/* 푸터 */}
            <div style={{
              padding: "20px 32px", borderTop: "1px solid #f1f5f9", background: "#ffffff",
              display: "flex", gap: 12, justifyContent: "flex-end"
            }}>
              <button type="button" onClick={() => setShowAiWizardModal(false)}
                style={{ padding: "12px 28px", background: "#fff", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 15, fontWeight: 600, color: "#64748b", cursor: "pointer" }}>
                취소
              </button>
              <button 
                type="button" 
                onClick={handleGenerateAiDrafts}
                disabled={aiWizardTab === "vacancy" && directVacancyMode === "select" && myVacancies.length === 0}
                style={{
                  padding: "12px 36px",
                  background: (aiWizardTab === "vacancy" && directVacancyMode === "select" && myVacancies.length === 0) ? "#e2e8f0" : "#6366f1",
                  color: (aiWizardTab === "vacancy" && directVacancyMode === "select" && myVacancies.length === 0) ? "#94a3b8" : "#ffffff",
                  border: "none", borderRadius: 8, fontSize: 15, fontWeight: 600,
                  cursor: (aiWizardTab === "vacancy" && directVacancyMode === "select" && myVacancies.length === 0) ? "not-allowed" : "pointer",
                  display: "inline-flex", alignItems: "center", gap: 6, transition: "background 0.2s"
                }}
                onMouseOver={e => {
                  if (!(aiWizardTab === "vacancy" && directVacancyMode === "select" && myVacancies.length === 0)) {
                    e.currentTarget.style.background = "#4f46e5";
                  }
                }}
                onMouseOut={e => {
                  if (!(aiWizardTab === "vacancy" && directVacancyMode === "select" && myVacancies.length === 0)) {
                    e.currentTarget.style.background = "#6366f1";
                  }
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
                </svg>
                5대 초안 즉시 생성하기
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ═══ 🕒 과거 AI 초안 보관함 모달 ═══ */}
      {showAiHistoryModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(15, 23, 42, 0.6)", display: "flex", alignItems: "center", justifyContent: "center",
          backdropFilter: "blur(6px)", zIndex: 10000, padding: 20
        }}>
          <div style={{
            background: "#fff", borderRadius: 20, width: 680, maxWidth: "100%", height: 600, maxHeight: "85vh",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)", overflow: "hidden", display: "flex", flexDirection: "column",
            border: "1px solid rgba(0,0,0,0.08)"
          }}>
            {/* 헤더 */}
            <div style={{
              background: "linear-gradient(135deg, #0f172a, #1e293b)", padding: "20px 24px",
              display: "flex", alignItems: "center", justifyContent: "space-between", color: "#fff"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 20 }}>🕒</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>마케팅 초안 보관 기록</h3>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>과거에 AI로 생성하고 보관해 둔 마케팅 원고를 실시간으로 재사용합니다.</div>
                </div>
              </div>
              <button type="button" onClick={() => setShowAiHistoryModal(false)}
                style={{ background: "none", border: "none", color: "#94a3b8", fontSize: 22, cursor: "pointer" }}>✕</button>
            </div>

            {/* 목록 본문 */}
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px", background: "#f8fafc" }}>
              {aiHistory.length === 0 ? (
                <div style={{ textAlign: "center", color: "#64748b", padding: "160px 0" }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>📬</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>아직 보관된 AI 초안이 존재하지 않습니다.</div>
                  <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>기사쓰기 페이지에서 'AI 마법사'를 통해 첫 초안을 생성해 보세요!</div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {aiHistory.map((item) => (
                    <div 
                      key={item.id} 
                      onClick={() => handleLoadHistoryItem(item)}
                      style={{
                        background: "#fff", padding: "18px 20px", borderRadius: 12, border: `1px solid ${border}`,
                        cursor: "pointer", transition: "all 0.2s", boxShadow: "0 2px 4px rgba(0,0,0,0.02)"
                      }}
                      onMouseOver={e => {
                        e.currentTarget.style.borderColor = "#3b82f6";
                        e.currentTarget.style.transform = "translateY(-2px)";
                        e.currentTarget.style.boxShadow = "0 6px 12px rgba(59, 130, 246, 0.08)";
                      }}
                      onMouseOut={e => {
                        e.currentTarget.style.borderColor = border;
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.02)";
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <span style={{
                          padding: "3px 8px", borderRadius: 6, fontSize: 10, fontWeight: 800,
                          background: item.source_type === "VACANCY" ? "#dbeafe" : "#fef3c7",
                          color: item.source_type === "VACANCY" ? "#1e40af" : "#d97706"
                        }}>
                          {item.source_type === "VACANCY" ? "🏢 매물연동형" : "📰 일반참조형"}
                        </span>
                        <span style={{ fontSize: 11, color: textSecondary }}>
                          {new Date(item.created_at).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <h4 style={{ margin: "0 0 6px 0", fontSize: 14, fontWeight: 800, color: textPrimary }}>
                        {item.title}
                      </h4>
                      <p style={{ margin: 0, fontSize: 12, color: textSecondary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {item.subtitle || "부제 없음"}
                      </p>
                      {item.vacancies && (
                        <div style={{ fontSize: 11, color: "#4f46e5", fontWeight: 600, marginTop: 8, display: "flex", alignItems: "center", gap: 4 }}>
                          📍 연동매물: {item.vacancies.building_name} ({item.vacancies.sido} {item.vacancies.sigungu} {item.vacancies.dong})
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 푸터 */}
            <div style={{ padding: "16px 24px", borderTop: `1px solid ${border}`, textAlign: "center", background: "#f8fafc" }}>
              <button type="button" onClick={() => setShowAiHistoryModal(false)}
                style={{ padding: "10px 30px", background: "#475569", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                닫기
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
