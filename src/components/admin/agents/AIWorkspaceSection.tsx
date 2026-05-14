"use client";

import React, { useState } from "react";
import type { AdminTheme } from "@/components/admin/sections/types";
import AgentDashboardTab from "./tabs/AgentDashboardTab";
import AgentChatTab from "./tabs/AgentChatTab";
import AgentSettingsTab from "./tabs/AgentSettingsTab";

/* 에이전트 기본 이름 */
const DEFAULT_NAMES: Record<string, string> = {
  verify: "회원승인 에이전트",
  articleReview: "기사심사 에이전트",
  article: "기사작성 에이전트",
  pressRelease: "보도자료 에이전트",
};

/* 탭 정의 */
const TABS = [
  { key: "dashboard", label: "현황판", icon: "📊" },
  { key: "chat", label: "업무 회의실", icon: "💬" },
  { key: "settings", label: "규칙 설정", icon: "⚙️" },
] as const;

type TabKey = typeof TABS[number]["key"];

interface Props {
  theme: AdminTheme;
}

export default function AIWorkspaceSection({ theme }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>("dashboard");

  // 에이전트 이름 상태 (모든 탭에서 공유)
  const [agentNames, setAgentNames] = useState<Record<string, string>>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("agent_names");
      if (saved) return { ...DEFAULT_NAMES, ...JSON.parse(saved) };
    }
    return DEFAULT_NAMES;
  });

  const updateAgentName = (id: string, name: string) => {
    const updated = { ...agentNames, [id]: name };
    setAgentNames(updated);
    localStorage.setItem("agent_names", JSON.stringify(updated));
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* ── 상단 헤더 + 탭 ── */}
      <div style={{
        background: theme.cardBg,
        borderBottom: `1px solid ${theme.border}`,
        padding: "20px 28px 0",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <span style={{ fontSize: 28 }}>🤖</span>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: theme.textPrimary }}>
              AI 비서실
            </h2>
            <p style={{ margin: "2px 0 0", fontSize: 13, color: theme.textSecondary }}>
              에이전트 현황 관리 · 업무 지시 · 학습 설정
            </p>
          </div>
        </div>

        {/* 탭 바 */}
        <div style={{ display: "flex", gap: 0 }}>
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: "10px 20px",
                fontSize: 14,
                fontWeight: activeTab === tab.key ? 700 : 500,
                color: activeTab === tab.key ? "#2563eb" : theme.textSecondary,
                background: "none",
                border: "none",
                borderBottom: activeTab === tab.key ? "2px solid #2563eb" : "2px solid transparent",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                transition: "all 0.2s",
                fontFamily: "inherit",
              }}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── 탭 콘텐츠 ── */}
      <div style={{ flex: 1, overflow: "auto", padding: "20px 28px" }}>
        {activeTab === "dashboard" && <AgentDashboardTab theme={theme} agentNames={agentNames} onNameChange={updateAgentName} />}
        {activeTab === "chat" && <AgentChatTab theme={theme} agentNames={agentNames} />}
        {activeTab === "settings" && <AgentSettingsTab theme={theme} agentNames={agentNames} />}
      </div>
    </div>
  );
}
