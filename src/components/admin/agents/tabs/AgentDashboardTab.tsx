"use client";

import React, { useState, useEffect } from "react";
import type { AdminTheme } from "@/components/admin/sections/types";
import { getAgentCostSummary, getAgentWorkStats, generateDailyReport, loadDailyReports } from "@/app/actions/agentChat";

/* ── 에이전트 정의 ── */
const DEFAULT_AGENTS = [
  { id: "verify", emoji: "🛡️", defaultName: "회원승인 에이전트", description: "부동산 중개사 서류를 자동 검증합니다.", status: "running" as const },
  { id: "articleReview", emoji: "🔍", defaultName: "기사심사 에이전트", description: "기사 품질·홍보성 문구를 자동 검토합니다.", status: "running" as const },
  { id: "article", emoji: "📰", defaultName: "기사작성 에이전트", description: "부동산 뉴스 기사 초안을 작성합니다.", status: "standby" as const },
];

interface Props {
  theme: AdminTheme;
  agentNames: Record<string, string>;
  onNameChange: (id: string, name: string) => void;
}

export default function AgentDashboardTab({ theme, agentNames, onNameChange }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [agentStats, setAgentStats] = useState<Record<string, { totalTokens: number; costKrw: number; messageCount: number }>>({});
  const [workStats, setWorkStats] = useState<any>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [dailyReport, setDailyReport] = useState<string | null>(null);
  const [reportDate, setReportDate] = useState<string>("");
  const [reportHistory, setReportHistory] = useState<{ id: string; content: string; created_at: string }[]>([]);
  const [selectedReportIdx, setSelectedReportIdx] = useState<number>(0);

  // DB에서 에이전트별 통계 불러오기
  useEffect(() => {
    const fetchStats = async () => {
      const [costRes, workRes] = await Promise.all([
        getAgentCostSummary(),
        getAgentWorkStats(),
      ]);
      if (costRes.perAgent) setAgentStats(costRes.perAgent);
      setWorkStats(workRes);
    };
    fetchStats();
  }, []);

  // DB에서 저장된 보고서 불러오기
  useEffect(() => {
    const fetchReports = async () => {
      const res = await loadDailyReports(10);
      if (res.success && res.data.length > 0) {
        setReportHistory(res.data);
        setDailyReport(res.data[0].content);
        setReportDate(new Date(res.data[0].created_at).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }));
        setSelectedReportIdx(0);
      }
    };
    fetchReports();
  }, []);

  // 이름 저장
  const saveName = (id: string) => {
    if (editValue.trim()) {
      onNameChange(id, editValue.trim());
    }
    setEditingId(null);
  };

  const cardStyle: React.CSSProperties = {
    background: theme.cardBg,
    borderRadius: 14,
    padding: "24px 28px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
    border: `1px solid ${theme.border}`,
  };

  // 전체 합산
  const totalMessages = Object.values(agentStats).reduce((s, a) => s + a.messageCount, 0);
  const totalCost = Object.values(agentStats).reduce((s, a) => s + a.costKrw, 0);
  const totalTokens = Object.values(agentStats).reduce((s, a) => s + a.totalTokens, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── 전체 요약 카드 ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {[
          { label: "활성 에이전트", value: DEFAULT_AGENTS.filter(a => a.status === "running").length + "명", icon: "🟢", color: "#10b981" },
          { label: "전체 대화 수", value: totalMessages + "건", icon: "📋", color: "#3b82f6" },
          { label: "전체 API 비용", value: `₩${totalCost.toFixed(1)}`, icon: "💸", color: "#f59e0b" },
        ].map((card, i) => (
          <div key={i} style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              background: card.color + "15",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
            }}>
              {card.icon}
            </div>
            <div>
              <div style={{ fontSize: 13, color: theme.textSecondary, marginBottom: 4 }}>{card.label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: theme.textPrimary }}>{card.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── 에이전트별 상세 카드 ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
        {DEFAULT_AGENTS.map((agent) => {
          const stats = agentStats[agent.id] || { totalTokens: 0, costKrw: 0, messageCount: 0 };
          return (
            <div key={agent.id} style={{ ...cardStyle }}>
              {/* 헤더: 이모지 + 이름(수정 가능) + 상태 */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                <span style={{ fontSize: 32 }}>{agent.emoji}</span>
                <div style={{ flex: 1 }}>
                  {editingId === agent.id ? (
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && saveName(agent.id)}
                        autoFocus
                        style={{
                          fontSize: 16, fontWeight: 700, color: theme.textPrimary,
                          background: theme.darkMode ? "#1a1b1e" : "#f8fafc",
                          border: `1px solid #2563eb`, borderRadius: 6, padding: "4px 8px",
                          outline: "none", fontFamily: "inherit", width: "100%",
                        }}
                      />
                      <button onClick={() => saveName(agent.id)} style={{
                        padding: "4px 10px", fontSize: 12, fontWeight: 700,
                        background: "#2563eb", color: "#fff", border: "none",
                        borderRadius: 6, cursor: "pointer", whiteSpace: "nowrap",
                      }}>확인</button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 17, fontWeight: 800, color: theme.textPrimary }}>
                        {agentNames[agent.id]}
                      </span>
                      <button onClick={() => { setEditingId(agent.id); setEditValue(agentNames[agent.id]); }} style={{
                        background: "none", border: "none", cursor: "pointer",
                        fontSize: 13, color: theme.textSecondary, padding: 2,
                      }} title="이름 수정">✏️</button>
                    </div>
                  )}
                  <div style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>{agent.description}</div>
                </div>
                <span style={{
                  padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700,
                  background: agent.status === "running" ? "#dcfce7" : "#fef9c3",
                  color: agent.status === "running" ? "#16a34a" : "#ca8a04",
                }}>
                  {agent.status === "running" ? "🟢 가동 중" : "🟡 대기 중"}
                </span>
              </div>

              {/* 업무 처리 현황 */}
              {workStats && (
                <>
                  <div style={{ fontSize: 13, fontWeight: 700, color: theme.textSecondary, marginBottom: 8 }}>📋 업무 처리 현황</div>
                  <div style={{ display: "grid", gridTemplateColumns: agent.id === "verify" ? "repeat(4, 1fr)" : "repeat(4, 1fr)", gap: 8, marginBottom: 16 }}>
                    {agent.id === "verify" && workStats.verify && [
                      { label: "가입승인", value: workStats.verify.approved, color: "#10b981", icon: "✅" },
                      { label: "반려", value: workStats.verify.rejected, color: "#ef4444", icon: "❌" },
                      { label: "대기중", value: workStats.verify.pending, color: "#f59e0b", icon: "⏳" },
                      { label: "서류보완", value: workStats.verify.supplement, color: "#8b5cf6", icon: "📝" },
                    ].map((stat, i) => (
                      <div key={i} style={{
                        textAlign: "center", padding: "10px 6px",
                        background: theme.darkMode ? "#1a1b1e" : "#f8fafc",
                        borderRadius: 10, border: `1px solid ${theme.border}`,
                      }}>
                        <div style={{ fontSize: 11, color: theme.textSecondary, marginBottom: 2 }}>{stat.icon} {stat.label}</div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: stat.color }}>{stat.value}</div>
                      </div>
                    ))}
                    {agent.id === "articleReview" && workStats.article && [
                      { label: "승인(게시)", value: workStats.article.approved, color: "#10b981", icon: "✅" },
                      { label: "승인대기", value: workStats.article.pending, color: "#f59e0b", icon: "⏳" },
                      { label: "작성중", value: workStats.article.draft, color: "#3b82f6", icon: "✍️" },
                      { label: "반려", value: workStats.article.rejected, color: "#ef4444", icon: "❌" },
                    ].map((stat, i) => (
                      <div key={i} style={{
                        textAlign: "center", padding: "10px 6px",
                        background: theme.darkMode ? "#1a1b1e" : "#f8fafc",
                        borderRadius: 10, border: `1px solid ${theme.border}`,
                      }}>
                        <div style={{ fontSize: 11, color: theme.textSecondary, marginBottom: 2 }}>{stat.icon} {stat.label}</div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: stat.color }}>{stat.value}</div>
                      </div>
                    ))}
                    {agent.id === "article" && workStats.article && [
                      { label: "승인(게시)", value: workStats.article.approved, color: "#10b981", icon: "✅" },
                      { label: "승인대기", value: workStats.article.pending, color: "#f59e0b", icon: "⏳" },
                      { label: "작성중", value: workStats.article.draft, color: "#3b82f6", icon: "✍️" },
                      { label: "반려", value: workStats.article.rejected, color: "#ef4444", icon: "❌" },
                    ].map((stat, i) => (
                      <div key={i} style={{
                        textAlign: "center", padding: "10px 6px",
                        background: theme.darkMode ? "#1a1b1e" : "#f8fafc",
                        borderRadius: 10, border: `1px solid ${theme.border}`,
                      }}>
                        <div style={{ fontSize: 11, color: theme.textSecondary, marginBottom: 2 }}>{stat.icon} {stat.label}</div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: stat.color }}>{stat.value}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* API 사용 통계 */}
              <div style={{ fontSize: 13, fontWeight: 700, color: theme.textSecondary, marginBottom: 8 }}>💸 API 사용 통계</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                {[
                  { label: "대화 수", value: stats.messageCount + "건", color: "#3b82f6" },
                  { label: "토큰 사용", value: stats.totalTokens.toLocaleString(), color: "#8b5cf6" },
                  { label: "API 비용", value: `₩${stats.costKrw.toFixed(1)}`, color: "#f59e0b" },
                ].map((stat, i) => (
                  <div key={i} style={{
                    textAlign: "center", padding: "10px 6px",
                    background: theme.darkMode ? "#1a1b1e" : "#f8fafc",
                    borderRadius: 10, border: `1px solid ${theme.border}`,
                  }}>
                    <div style={{ fontSize: 11, color: theme.textSecondary, marginBottom: 2 }}>{stat.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: stat.color }}>{stat.value}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── 일간보고 ── */}
      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: theme.textPrimary }}>
            📋 일간 업무 보고
          </h3>
          <button
            onClick={async () => {
              setReportLoading(true);
              try {
                const res = await generateDailyReport();
                if (res.success) {
                  setDailyReport(res.report);
                  setReportDate(res.date);
                  // 목록 갱신
                  const updated = await loadDailyReports(10);
                  if (updated.success) {
                    setReportHistory(updated.data);
                    setSelectedReportIdx(0);
                  }
                }
              } catch (e: any) {
                alert("보고서 생성 중 오류: " + e.message);
              } finally {
                setReportLoading(false);
              }
            }}
            disabled={reportLoading}
            style={{
              padding: "8px 20px", borderRadius: 8,
              background: reportLoading ? "#93c5fd" : "#2563eb",
              color: "#fff", border: "none", fontSize: 13, fontWeight: 700,
              cursor: reportLoading ? "wait" : "pointer", fontFamily: "inherit",
              display: "flex", alignItems: "center", gap: 6,
            }}
          >
            {reportLoading ? "⏳ 보고서 생성 중..." : "📝 일간보고 생성"}
          </button>
        </div>

        {/* 보고서 히스토리 탭 */}
        {reportHistory.length > 0 && (
          <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
            {reportHistory.map((r, i) => {
              const d = new Date(r.created_at);
              const label = `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
              return (
                <button
                  key={r.id}
                  onClick={() => {
                    setSelectedReportIdx(i);
                    setDailyReport(r.content);
                    setReportDate(d.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }));
                  }}
                  style={{
                    padding: "5px 12px", fontSize: 12, fontWeight: selectedReportIdx === i ? 700 : 500,
                    background: selectedReportIdx === i ? "#2563eb" : (theme.darkMode ? "#2c2d33" : "#f1f5f9"),
                    color: selectedReportIdx === i ? "#fff" : theme.textSecondary,
                    border: "none", borderRadius: 16, cursor: "pointer", fontFamily: "inherit",
                    transition: "all 0.15s",
                  }}
                >
                  {i === 0 ? `📌 ${label} (최신)` : label}
                </button>
              );
            })}
          </div>
        )}

        {dailyReport ? (
          <>
            {reportDate && (
              <div style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 10, fontWeight: 600 }}>
                🕐 {reportDate} 생성
              </div>
            )}
            <div style={{
              padding: "20px 24px",
              background: theme.darkMode ? "#1a1b1e" : "#f8fafc",
              borderRadius: 10,
              border: `1px solid ${theme.border}`,
              whiteSpace: "pre-wrap",
              fontSize: 14,
              lineHeight: 1.8,
              color: theme.textPrimary,
              maxHeight: 500,
              overflowY: "auto",
            }}>
              {dailyReport}
            </div>
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "40px 0", color: theme.textSecondary }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>📋</div>
            <div style={{ fontSize: 14 }}>아직 보고서가 없습니다.</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>"일간보고 생성" 버튼을 누르면 에이전트가 오늘의 업무 현황을 자동으로 분석해 보고합니다.</div>
          </div>
        )}
      </div>
    </div>
  );
}
