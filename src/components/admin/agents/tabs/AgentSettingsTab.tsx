"use client";

import React, { useState, useEffect } from "react";
import type { AdminTheme } from "@/components/admin/sections/types";
import { loadAgentModeConfig, saveAgentModeConfig, AgentModeConfig } from "@/app/actions/agentChat";

/* ── 에이전트별 기본 프롬프트 ── */
const DEFAULT_PROMPTS: Record<string, { name: string; emoji: string; systemPrompt: string; examples: string }> = {
  verify: {
    name: "회원승인 에이전트",
    emoji: "🛡️",
    systemPrompt: `너는 공실뉴스의 엄격한 서류 심사관이야.
첨부된 사업자등록증/중개사무소등록증 이미지에서 상호명과 대표자명을 추출하고,
회원이 입력한 정보와 비교하여 일치 여부를 판단해.
1글자라도 다르면 반려하고, 정확한 불일치 내용을 안내해.`,
    examples: `[모범 반려 답변 예시]
"입력하신 상호명 '강남부동산'과 서류상 상호명 '강남공인중개사사무소'가 일치하지 않습니다.
정확한 상호명으로 수정 후 다시 제출해 주세요."`,
  },
  articleReview: {
    name: "기사심사 에이전트",
    emoji: "🔍",
    systemPrompt: `너는 공실뉴스의 기사 심사관이야.
[최우선 원칙] 언론 기사에는 기자의 주관적인 판단, 의견, 예측이 들어가는 것이 매우 당연합니다. "객관적이지 않다"며 훈수하거나 반려하지 마세요.
너의 진짜 목표는 '스팸 및 대놓고 광고하는 글'을 차단하는 것입니다.
1. 기사 품질 및 카테고리 연관성: 기사 형태의 글이면 무조건 통과 (칼럼, 사설 등 모두 환영). 단, 기사 내용과 선택한 카테고리(분류)가 전혀 맞지 않으면 수정요청 처리.
2. 홍보성 필터링: 특정 업체의 전화번호나 "상담 환영", "분양 문의" 등 노골적인 영업 문구만 차단.
3. 사실성: 주관적 예측은 허용하되, 심한 욕설이나 의미없는 도배글만 차단.`,
    examples: `[모범 반려 답변 예시]
"기사 본문에 '010-1234-5678로 분양 문의 바랍니다'라는 노골적인 영업 홍보 문구가 포함되어 있습니다.
공실뉴스는 전화번호가 포함된 홍보성 기사를 금지하고 있습니다. 해당 문구를 삭제 후 다시 제출해 주세요."`,
  },
  article: {
    name: "기사작성 에이전트",
    emoji: "📰",
    systemPrompt: `너는 10년 차 부동산 전문 기자야.
공실뉴스의 톤앤매너에 맞춰 전문적이면서도 읽기 쉬운 해요체로 기사를 작성해.
마지막에는 관련 해시태그 3~5개를 달아줘.
주관적 의견은 최소화하고, 데이터와 사실 기반으로 작성해.`,
    examples: `[기사 문체 예시]
"강남구 오피스텔 전세 시장이 올해 들어 눈에 띄는 변화를 보이고 있어요.
국토교통부 실거래가 기준으로 1분기 평균 전세가가 전년 동기 대비 약 5% 하락했는데요..."`,
  },
};

interface Props {
  theme: AdminTheme;
  agentNames: Record<string, string>;
}

export default function AgentSettingsTab({ theme, agentNames }: Props) {
  const [selectedAgent, setSelectedAgent] = useState("verify");
  const [prompts, setPrompts] = useState(DEFAULT_PROMPTS);
  const [modes, setModes] = useState<AgentModeConfig>({
    verify: { mode: "auto" },
    articleReview: { mode: "auto" },
    article: { mode: "manual" },
  });
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAgentModeConfig().then((config) => {
      setModes(config);
    });
  }, []);

  const current = prompts[selectedAgent];
  const currentMode = modes[selectedAgent] || { mode: "manual" };

  const handleModeChange = (mode: "manual" | "auto" | "scheduled") => {
    setModes(prev => ({
      ...prev,
      [selectedAgent]: { ...prev[selectedAgent], mode }
    }));
  };

  const handleTimeChange = (type: "scheduleStart" | "scheduleEnd", val: number) => {
    setModes(prev => ({
      ...prev,
      [selectedAgent]: { ...prev[selectedAgent], [type]: val }
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await saveAgentModeConfig(modes);
      // TODO: 프롬프트 DB 저장 연동 (Phase 3)
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      alert("설정 저장 실패");
    } finally {
      setLoading(false);
    }
    setTimeout(() => setSaved(false), 2000);
  };

  const cardStyle: React.CSSProperties = {
    background: theme.cardBg,
    borderRadius: 14,
    padding: "24px 28px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
    border: `1px solid ${theme.border}`,
  };

  const textareaStyle: React.CSSProperties = {
    width: "100%",
    minHeight: 140,
    padding: 16,
    border: `1px solid ${theme.border}`,
    borderRadius: 10,
    fontSize: 14,
    color: theme.textPrimary,
    background: theme.darkMode ? "#1a1b1e" : "#f8fafc",
    outline: "none",
    fontFamily: "'Pretendard Variable', monospace",
    lineHeight: 1.7,
    resize: "vertical" as const,
  };

  return (
    <div style={{ display: "flex", gap: 20 }}>
      {/* ── 좌측: 에이전트 선택 ── */}
      <div style={{ width: 220, flexShrink: 0 }}>
        <div style={{ ...cardStyle, padding: "16px" }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: theme.textSecondary, marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>
            에이전트 선택
          </div>
          {Object.entries(prompts).map(([key, agent]) => (
            <button key={key} onClick={() => setSelectedAgent(key)} style={{
              display: "flex", alignItems: "center", gap: 10,
              width: "100%", padding: "12px 14px",
              border: selectedAgent === key ? "2px solid #2563eb" : `1px solid ${theme.border}`,
              borderRadius: 10, cursor: "pointer",
              background: selectedAgent === key ? (theme.darkMode ? "#1e3a5f" : "#eff6ff") : theme.cardBg,
              color: theme.textPrimary, fontSize: 14, fontWeight: 600,
              fontFamily: "inherit", marginBottom: 8, textAlign: "left",
              transition: "all 0.15s",
            }}>
              <span style={{ fontSize: 20 }}>{agent.emoji}</span>
              {agentNames[key] || agent.name}
            </button>
          ))}
        </div>
      </div>

      {/* ── 우측: 프롬프트 편집 ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={cardStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <span style={{ fontSize: 28 }}>{current.emoji}</span>
            <div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: theme.textPrimary }}>{agentNames[selectedAgent] || current.name} 학습 설정</h3>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: theme.textSecondary }}>시스템 프롬프트와 모범 사례를 수정하여 에이전트를 교육합니다.</p>
            </div>
          </div>

          {/* 가동 모드 설정 */}
          <div style={{ padding: "16px", background: theme.darkMode ? "#2c2d33" : "#f1f5f9", borderRadius: 10, marginBottom: 20 }}>
            <label style={{ fontSize: 14, fontWeight: 700, color: theme.textPrimary, marginBottom: 12, display: "block" }}>
              ⚙️ 가동 모드 설정
            </label>
            <div style={{ display: "flex", gap: 16, marginBottom: currentMode.mode === "scheduled" ? 12 : 0 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, color: theme.textPrimary, cursor: "pointer" }}>
                <input type="radio" checked={currentMode.mode === "auto"} onChange={() => handleModeChange("auto")} style={{ accentColor: "#3b82f6" }} />
                자동 (항상 가동)
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, color: theme.textPrimary, cursor: "pointer" }}>
                <input type="radio" checked={currentMode.mode === "manual"} onChange={() => handleModeChange("manual")} style={{ accentColor: "#3b82f6" }} />
                수동 (버튼 클릭 시에만)
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, color: theme.textPrimary, cursor: "pointer" }}>
                <input type="radio" checked={currentMode.mode === "scheduled"} onChange={() => handleModeChange("scheduled")} style={{ accentColor: "#3b82f6" }} />
                시간대 설정
              </label>
            </div>
            
            {currentMode.mode === "scheduled" && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, background: theme.darkMode ? "#1a1b1e" : "#fff", padding: "12px", borderRadius: 8, border: `1px solid ${theme.border}` }}>
                <span style={{ fontSize: 13, color: theme.textSecondary }}>자동 가동 시간:</span>
                <select value={currentMode.scheduleStart ?? 0} onChange={(e) => handleTimeChange("scheduleStart", Number(e.target.value))} style={{ padding: "4px 8px", borderRadius: 4, background: theme.darkMode ? "#2c2d31" : "#f9fafb", border: `1px solid ${theme.border}`, color: theme.textPrimary }}>
                  {Array.from({ length: 24 }).map((_, i) => <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>)}
                </select>
                <span style={{ fontSize: 13, color: theme.textSecondary }}>~</span>
                <select value={currentMode.scheduleEnd ?? 23} onChange={(e) => handleTimeChange("scheduleEnd", Number(e.target.value))} style={{ padding: "4px 8px", borderRadius: 4, background: theme.darkMode ? "#2c2d31" : "#f9fafb", border: `1px solid ${theme.border}`, color: theme.textPrimary }}>
                  {Array.from({ length: 24 }).map((_, i) => <option key={i} value={i}>{String(i).padStart(2, '0')}:59</option>)}
                </select>
              </div>
            )}
            <div style={{ fontSize: 12, color: theme.textSecondary, marginTop: 8 }}>
              {currentMode.mode === "auto" && "해당 작업이 발생하면 즉시 에이전트가 처리합니다."}
              {currentMode.mode === "manual" && "관리자가 직접 버튼을 눌러야 심사가 진행됩니다."}
              {currentMode.mode === "scheduled" && "설정된 시간에만 자동으로 처리하며, 그 외 시간은 수동으로 전환됩니다."}
            </div>
          </div>

          {/* 시스템 프롬프트 */}
          <label style={{ fontSize: 14, fontWeight: 700, color: theme.textPrimary, marginBottom: 8, display: "block" }}>
            🧠 시스템 프롬프트 (성격 및 판단 기준)
          </label>
          <textarea
            value={current.systemPrompt}
            onChange={(e) => setPrompts(prev => ({ ...prev, [selectedAgent]: { ...prev[selectedAgent], systemPrompt: e.target.value } }))}
            style={textareaStyle}
          />

          {/* 모범 사례 */}
          <label style={{ fontSize: 14, fontWeight: 700, color: theme.textPrimary, marginBottom: 8, marginTop: 20, display: "block" }}>
            📝 모범 사례 (Few-Shot 예시)
          </label>
          <textarea
            value={current.examples}
            onChange={(e) => setPrompts(prev => ({ ...prev, [selectedAgent]: { ...prev[selectedAgent], examples: e.target.value } }))}
            style={{ ...textareaStyle, minHeight: 100 }}
          />

          {/* 저장 버튼 */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20, gap: 10 }}>
            {saved && (
              <span style={{ display: "flex", alignItems: "center", fontSize: 13, color: "#16a34a", fontWeight: 600 }}>
                ✅ 저장되었습니다!
              </span>
            )}
            <button onClick={handleSave} disabled={loading} style={{
              padding: "10px 28px", borderRadius: 10,
              background: loading ? "#9ca3af" : "#2563eb", color: "#fff",
              border: "none", fontSize: 14, fontWeight: 700,
              cursor: loading ? "wait" : "pointer", fontFamily: "inherit",
              transition: "background 0.15s",
            }}>
              {loading ? "💾 저장 중..." : "💾 설정 저장"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
