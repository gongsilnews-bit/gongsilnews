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

type Period = "today" | "yesterday" | "week" | "month" | "all";

function getPeriodDates(period: Period) {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);
  const prevStart = new Date(now);
  const prevEnd = new Date(now);
  
  if (period === "all") {
    return { start: null, end: null, prevStart: null, prevEnd: null };
  }
  
  if (period === "today") {
    start.setHours(0,0,0,0);
    prevStart.setDate(start.getDate() - 1);
    prevStart.setHours(0,0,0,0);
    prevEnd.setDate(end.getDate() - 1);
    prevEnd.setHours(23,59,59,999);
    return { start: start.toISOString(), end: end.toISOString(), prevStart: prevStart.toISOString(), prevEnd: prevEnd.toISOString() };
  }
  
  if (period === "yesterday") {
    start.setDate(start.getDate() - 1);
    start.setHours(0,0,0,0);
    end.setDate(end.getDate() - 1);
    end.setHours(23,59,59,999);
    prevStart.setDate(start.getDate() - 1);
    prevStart.setHours(0,0,0,0);
    prevEnd.setDate(end.getDate() - 1);
    prevEnd.setHours(23,59,59,999);
    return { start: start.toISOString(), end: end.toISOString(), prevStart: prevStart.toISOString(), prevEnd: prevEnd.toISOString() };
  }

  if (period === "week") {
    start.setDate(start.getDate() - 7);
    start.setHours(0,0,0,0);
    prevStart.setDate(start.getDate() - 7);
    prevStart.setHours(0,0,0,0);
    prevEnd.setDate(start.getDate() - 1);
    prevEnd.setHours(23,59,59,999);
    return { start: start.toISOString(), end: end.toISOString(), prevStart: prevStart.toISOString(), prevEnd: prevEnd.toISOString() };
  }

  if (period === "month") {
    start.setDate(1);
    start.setHours(0,0,0,0);
    prevStart.setMonth(prevStart.getMonth() - 1);
    prevStart.setDate(1);
    prevStart.setHours(0,0,0,0);
    prevEnd.setDate(0);
    prevEnd.setHours(23,59,59,999);
    return { start: start.toISOString(), end: end.toISOString(), prevStart: prevStart.toISOString(), prevEnd: prevEnd.toISOString() };
  }
  return { start: null, end: null, prevStart: null, prevEnd: null };
}

export default function AgentDashboardTab({ theme, agentNames, onNameChange }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [period, setPeriod] = useState<Period>("all");
  const [loadingStats, setLoadingStats] = useState(false);

  // Current stats
  const [agentStats, setAgentStats] = useState<Record<string, { totalTokens: number; costKrw: number; messageCount: number }>>({});
  const [workStats, setWorkStats] = useState<any>(null);

  // Previous stats
  const [prevAgentStats, setPrevAgentStats] = useState<Record<string, { totalTokens: number; costKrw: number; messageCount: number }>>({});
  const [prevWorkStats, setPrevWorkStats] = useState<any>(null);

  const [reportLoading, setReportLoading] = useState(false);
  const [dailyReport, setDailyReport] = useState<string | null>(null);
  const [reportDate, setReportDate] = useState<string>("");
  const [reportHistory, setReportHistory] = useState<{ id: string; content: string; created_at: string }[]>([]);
  const [selectedReportIdx, setSelectedReportIdx] = useState<number>(0);

  // Fetch Stats when period changes
  useEffect(() => {
    const fetchStats = async () => {
      setLoadingStats(true);
      const dates = getPeriodDates(period);
      
      const [costRes, workRes] = await Promise.all([
        getAgentCostSummary(dates.start || undefined, dates.end || undefined),
        getAgentWorkStats(dates.start || undefined, dates.end || undefined),
      ]);
      setAgentStats(costRes.perAgent || {});
      setWorkStats(workRes);

      if (dates.prevStart) {
        const [pCostRes, pWorkRes] = await Promise.all([
          getAgentCostSummary(dates.prevStart, dates.prevEnd!),
          getAgentWorkStats(dates.prevStart, dates.prevEnd!),
        ]);
        setPrevAgentStats(pCostRes.perAgent || {});
        setPrevWorkStats(pWorkRes);
      } else {
        setPrevAgentStats({});
        setPrevWorkStats(null);
      }
      setLoadingStats(false);
    };
    fetchStats();
  }, [period]);

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
    position: "relative",
  };

  // 전체 합산
  const totalMessages = Object.values(agentStats).reduce((s, a) => s + a.messageCount, 0);
  const totalCost = Object.values(agentStats).reduce((s, a) => s + a.costKrw, 0);
  const totalTokens = Object.values(agentStats).reduce((s, a) => s + a.totalTokens, 0);

  const prevTotalMessages = Object.values(prevAgentStats).reduce((s, a) => s + a.messageCount, 0);
  const prevTotalCost = Object.values(prevAgentStats).reduce((s, a) => s + a.costKrw, 0);

  const renderDelta = (cur: number, prev: number | undefined, isCost = false) => {
    if (period === "all" || prev === undefined) return null;
    const diff = cur - prev;
    if (diff === 0) return <span style={{ fontSize: 11, color: theme.textSecondary, marginLeft: 6 }}>(-)</span>;
    const format = isCost ? `₩${Math.abs(diff).toFixed(1)}` : Math.abs(diff);
    if (diff > 0) return <span style={{ fontSize: 11, color: "#ef4444", marginLeft: 6 }}>▲ {format}</span>;
    return <span style={{ fontSize: 11, color: "#3b82f6", marginLeft: 6 }}>▼ {format}</span>;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, position: "relative" }}>
      
      {/* ── 상단 필터 ── */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: -10 }}>
        <div style={{ display: "flex", background: theme.darkMode ? "#1a1b1e" : "#f1f5f9", borderRadius: 8, padding: 4 }}>
          {[
            { id: "today", label: "오늘" },
            { id: "yesterday", label: "어제" },
            { id: "week", label: "최근 7일" },
            { id: "month", label: "이번 달" },
            { id: "all", label: "전체 (누적)" },
          ].map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id as Period)}
              style={{
                padding: "6px 12px", fontSize: 13, fontWeight: period === p.id ? 700 : 500,
                background: period === p.id ? "#fff" : "transparent",
                color: period === p.id ? "#2563eb" : theme.textSecondary,
                border: "none", borderRadius: 6, cursor: "pointer", fontFamily: "inherit",
                boxShadow: period === p.id ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                transition: "all 0.2s"
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loadingStats && (
        <div style={{ position: "absolute", top: 50, left: 0, right: 0, bottom: 0, background: "rgba(255,255,255,0.5)", zIndex: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#2563eb", background: "#fff", padding: "8px 16px", borderRadius: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>데이터 불러오는 중...</span>
        </div>
      )}

      {/* ── 전체 요약 카드 ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {[
          { label: "활성 에이전트", value: DEFAULT_AGENTS.filter(a => a.status === "running").length + "명", icon: "🟢", color: "#10b981", noDelta: true },
          { label: "대화 수", value: totalMessages + "건", prev: prevTotalMessages, icon: "📋", color: "#3b82f6" },
          { label: "API 비용", value: `₩${totalCost.toFixed(1)}`, prev: prevTotalCost, icon: "💸", color: "#f59e0b", isCost: true },
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
              <div style={{ display: "flex", alignItems: "center" }}>
                <span style={{ fontSize: 22, fontWeight: 800, color: theme.textPrimary }}>{card.value}</span>
                {!card.noDelta && renderDelta(card.isCost ? totalCost : totalMessages, card.prev, card.isCost)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── 에이전트별 상세 카드 ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
        {DEFAULT_AGENTS.map((agent) => {
          const stats = agentStats[agent.id] || { totalTokens: 0, costKrw: 0, messageCount: 0 };
          const pStats = prevAgentStats[agent.id] || { totalTokens: 0, costKrw: 0, messageCount: 0 };

          const agentWork = workStats ? workStats[agent.id === "articleReview" ? "article" : agent.id] : null;
          const pAgentWork = prevWorkStats ? prevWorkStats[agent.id === "articleReview" ? "article" : agent.id] : null;

          return (
            <div key={agent.id} style={{ ...cardStyle }}>
              {/* 헤더 */}
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
              {agentWork && (
                <>
                  <div style={{ fontSize: 13, fontWeight: 700, color: theme.textSecondary, marginBottom: 8 }}>📋 업무 처리 현황</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 16 }}>
                    {agent.id === "verify" && [
                      { label: "가입승인", value: agentWork.approved, prev: pAgentWork?.approved, color: "#10b981", icon: "✅" },
                      { label: "반려", value: agentWork.rejected, prev: pAgentWork?.rejected, color: "#ef4444", icon: "❌" },
                      { label: "대기중", value: agentWork.pending, prev: pAgentWork?.pending, color: "#f59e0b", icon: "⏳" },
                      { label: "서류보완", value: agentWork.supplement, prev: pAgentWork?.supplement, color: "#8b5cf6", icon: "📝" },
                    ].map((stat, i) => (
                      <div key={i} style={{
                        textAlign: "center", padding: "10px 6px",
                        background: theme.darkMode ? "#1a1b1e" : "#f8fafc",
                        borderRadius: 10, border: `1px solid ${theme.border}`,
                      }}>
                        <div style={{ fontSize: 11, color: theme.textSecondary, marginBottom: 2 }}>{stat.icon} {stat.label}</div>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                          <span style={{ fontSize: 20, fontWeight: 800, color: stat.color }}>{stat.value}</span>
                          {renderDelta(stat.value, stat.prev)}
                        </div>
                      </div>
                    ))}
                    {(agent.id === "articleReview" || agent.id === "article") && [
                      { label: "승인(게시)", value: agentWork.approved, prev: pAgentWork?.approved, color: "#10b981", icon: "✅" },
                      { label: "승인대기", value: agentWork.pending, prev: pAgentWork?.pending, color: "#f59e0b", icon: "⏳" },
                      { label: "작성중", value: agentWork.draft, prev: pAgentWork?.draft, color: "#3b82f6", icon: "✍️" },
                      { label: "반려", value: agentWork.rejected, prev: pAgentWork?.rejected, color: "#ef4444", icon: "❌" },
                    ].map((stat, i) => (
                      <div key={i} style={{
                        textAlign: "center", padding: "10px 6px",
                        background: theme.darkMode ? "#1a1b1e" : "#f8fafc",
                        borderRadius: 10, border: `1px solid ${theme.border}`,
                      }}>
                        <div style={{ fontSize: 11, color: theme.textSecondary, marginBottom: 2 }}>{stat.icon} {stat.label}</div>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                          <span style={{ fontSize: 20, fontWeight: 800, color: stat.color }}>{stat.value}</span>
                          {renderDelta(stat.value, stat.prev)}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* API 사용 통계 */}
              <div style={{ fontSize: 13, fontWeight: 700, color: theme.textSecondary, marginBottom: 8 }}>💸 API 사용 통계</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                {[
                  { label: "대화 수", value: stats.messageCount + "건", cur: stats.messageCount, prev: pStats.messageCount, color: "#3b82f6" },
                  { label: "토큰 사용", value: stats.totalTokens.toLocaleString(), cur: stats.totalTokens, prev: pStats.totalTokens, color: "#8b5cf6" },
                  { label: "API 비용", value: `₩${stats.costKrw.toFixed(1)}`, cur: stats.costKrw, prev: pStats.costKrw, color: "#f59e0b", isCost: true },
                ].map((stat, i) => (
                  <div key={i} style={{
                    textAlign: "center", padding: "10px 6px",
                    background: theme.darkMode ? "#1a1b1e" : "#f8fafc",
                    borderRadius: 10, border: `1px solid ${theme.border}`,
                  }}>
                    <div style={{ fontSize: 11, color: theme.textSecondary, marginBottom: 2 }}>{stat.label}</div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <span style={{ fontSize: 18, fontWeight: 800, color: stat.color }}>{stat.value}</span>
                      {renderDelta(stat.cur, stat.prev, stat.isCost)}
                    </div>
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
