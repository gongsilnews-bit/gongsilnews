"use client";

import React, { useState, useEffect, useCallback } from "react";
import type { AdminTheme } from "@/components/admin/sections/types";
import { getAgentCostSummary, getAgentWorkStats, generateDailyReport, loadDailyReports, getOnbidCount, getOnbidHistoryStats, getRecentAgentCallLogs } from "@/app/actions/agentChat";

/* ── 에이전트 정의 ── */
const DEFAULT_AGENTS = [
  { id: "verify", emoji: "🛡️", defaultName: "회원승인 에이전트", description: "부동산 중개사 서류를 자동 검증합니다.", status: "running" as const },
  { id: "article", emoji: "📰", defaultName: "기사작성 에이전트", description: "부동산 뉴스 기사 초안을 작성합니다.", status: "running" as const },
  { id: "photoCuration", emoji: "📸", defaultName: "사진큐레이션·나노바나나", description: "기사 맞춤형 실사 사진 매칭 및 AI 이미지를 생성합니다.", status: "running" as const },
  { id: "remodeling", emoji: "🏢", defaultName: "건물 리모델링 AI", description: "건물 외관 리모델링 시뮬레이션 및 렌더링을 생성합니다.", status: "running" as const },
  { id: "homeInterior", emoji: "🎨", defaultName: "홈 인테리어 AI", description: "실내 인테리어 공간 시뮬레이션을 생성합니다.", status: "running" as const },
  { id: "studio", emoji: "🎬", defaultName: "AI 숏폼 스튜디오", description: "부동산 쇼츠 영상 대본 및 음성을 생성합니다.", status: "running" as const },
  { id: "marketingDraft", emoji: "✍️", defaultName: "마케팅 초안 마법사", description: "블로그/SNS/쇼츠 콘텐츠를 일괄 생성합니다.", status: "running" as const },
  { id: "articleReview", emoji: "🔍", defaultName: "기사심사 에이전트", description: "기사 품질·홍보성 문구를 자동 검토합니다.", status: "running" as const },
  { id: "pressRelease", emoji: "🏛️", defaultName: "보도자료 에이전트", description: "국토부 보도자료를 분석해 기사로 작성합니다.", status: "running" as const },
  { id: "propertyDescription", emoji: "🏠", defaultName: "매물설명 생성", description: "공실 등록 시 AI 설명글을 자동 생성합니다.", status: "running" as const },
  { id: "imageExtract", emoji: "🖼️", defaultName: "이미지 매물 추출", description: "사진에서 매물 정보를 AI로 자동 추출합니다.", status: "running" as const },
  { id: "onbid", emoji: "🤖", defaultName: "온비드 동기화 에이전트", description: "매일 온비드 경공매 물건을 연동하고 만료 건을 삭제합니다.", status: "running" as const },
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
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());
  const [recentLogs, setRecentLogs] = useState<any[]>([]);

  // 🔍 실시간 검색 및 에이전트 필터 상태
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChannelFilter, setSelectedChannelFilter] = useState("all");

  // Current stats
  const [agentStats, setAgentStats] = useState<Record<string, { totalTokens: number; costKrw: number; messageCount: number }>>({});
  const [workStats, setWorkStats] = useState<any>(null);
  const [onbidCount, setOnbidCount] = useState<number>(0);
  const [onbidHistory, setOnbidHistory] = useState<{
    todayRegistered: number;
    todayExpired: number;
    yesterdayRegistered: number;
    yesterdayExpired: number;
    historyList: any[];
  }>({
    todayRegistered: 0,
    todayExpired: 0,
    yesterdayRegistered: 0,
    yesterdayExpired: 0,
    historyList: []
  });

  // Previous stats
  const [prevAgentStats, setPrevAgentStats] = useState<Record<string, { totalTokens: number; costKrw: number; messageCount: number }>>({});
  const [prevWorkStats, setPrevWorkStats] = useState<any>(null);

  const [reportLoading, setReportLoading] = useState(false);
  const [dailyReport, setDailyReport] = useState<string | null>(null);
  const [reportDate, setReportDate] = useState<string>("");
  const [reportHistory, setReportHistory] = useState<{ id: string; content: string; created_at: string }[]>([]);
  const [selectedReportIdx, setSelectedReportIdx] = useState<number>(0);

  // Fetch Stats
  const fetchStats = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoadingStats(true);
    const dates = getPeriodDates(period);
    
    try {
      const [costRes, workRes, onbidRes, historyRes, callLogsRes] = await Promise.all([
        getAgentCostSummary(dates.start || undefined, dates.end || undefined),
        getAgentWorkStats(dates.start || undefined, dates.end || undefined),
        getOnbidCount(),
        getOnbidHistoryStats(),
        getRecentAgentCallLogs({
          limit: 100,
          search: searchQuery,
          channelId: selectedChannelFilter,
          startDate: dates.start || undefined,
          endDate: dates.end || undefined,
        }),
      ]);
      setAgentStats(costRes.perAgent || {});
      setWorkStats(workRes);
      setOnbidCount(onbidRes);
      if (historyRes.success) {
        setOnbidHistory(historyRes);
      }
      if (callLogsRes.success) {
        setRecentLogs(callLogsRes.data || []);
      }
      setLastRefreshedAt(new Date());

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
    } catch (err) {
      console.error("fetchStats error:", err);
    } finally {
      if (!isSilent) setLoadingStats(false);
    }
  }, [period, searchQuery, selectedChannelFilter]);

  useEffect(() => {
    fetchStats(false);
    // 15초마다 실시간 자동 갱신
    const timer = setInterval(() => {
      fetchStats(true);
    }, 15000);
    return () => clearInterval(timer);
  }, [fetchStats]);

  // DB에서 저장된 보고서 불러오기
  useEffect(() => {
    const fetchReports = async () => {
      const res = await loadDailyReports(10);
      if (res.success && res.data.length > 0) {
        setReportHistory(res.data);
        setDailyReport(res.data[0].content);
        setReportDate(new Date(res.data[0].created_at).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }));
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
      
      {/* ── 상단 필터 & 실시간 새로고침 ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: -6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={() => fetchStats(false)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "7px 14px", borderRadius: 8, fontSize: 13, fontWeight: 700,
              background: theme.darkMode ? "#2c2d33" : "#e2e8f0",
              color: theme.textPrimary, border: `1px solid ${theme.border}`,
              cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s"
            }}
            title="실시간 새로고침"
          >
            🔄 새로고침
          </button>
          <span style={{ fontSize: 12, color: theme.textSecondary, display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "#10b981" }}></span>
            실시간 연동 중 (갱신: {lastRefreshedAt.toLocaleTimeString("ko-KR")})
          </span>
        </div>

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

          const workKey = (agent.id === "articleReview" || agent.id === "pressRelease") ? "article" : agent.id;
          const agentWork = workStats ? workStats[workKey] : null;
          const pAgentWork = prevWorkStats ? prevWorkStats[workKey] : null;

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
                    {(agent.id === "articleReview" || agent.id === "article" || agent.id === "pressRelease") && [
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

              {agent.id === "onbid" && (
                <>
                  <div style={{ fontSize: 13, fontWeight: 700, color: theme.textSecondary, marginBottom: 8 }}>📋 업무 처리 현황</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 12 }}>
                    {[
                      { label: "전국 온비드 매물", value: onbidCount.toLocaleString() + "건", color: "#2563eb", icon: "⚖️" },
                      { label: "오늘 신규 수집", value: onbidHistory.todayRegistered + "건", color: "#10b981", icon: "✨" },
                      { label: "어제 만료 삭제", value: onbidHistory.yesterdayExpired + "건", color: "#ef4444", icon: "🧹" },
                    ].map((stat, i) => (
                      <div key={i} style={{
                        textAlign: "center", padding: "10px 6px",
                        background: theme.darkMode ? "#1a1b1e" : "#f8fafc",
                        borderRadius: 10, border: `1px solid ${theme.border}`,
                      }}>
                        <div style={{ fontSize: 11, color: theme.textSecondary, marginBottom: 2 }}>{stat.icon} {stat.label}</div>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                          <span style={{ fontSize: 16, fontWeight: 800, color: stat.color }}>{stat.value}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 최근 수집 이력 목록 */}
                  {onbidHistory.historyList && onbidHistory.historyList.length > 0 && (
                    <div style={{ marginTop: 8, borderTop: `1px solid ${theme.border}`, paddingTop: 8 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: theme.textSecondary, marginBottom: 6 }}>📜 최근 7일 동기화 이력</div>
                      <div style={{ maxHeight: 100, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
                        {onbidHistory.historyList.slice(0, 5).map((h, i) => (
                          <div key={i} style={{
                            display: "flex", justifyContent: "space-between", alignItems: "center",
                            fontSize: 11, padding: "4px 8px", background: theme.darkMode ? "#1e293b" : "#f1f5f9",
                            borderRadius: 6, color: theme.textPrimary
                          }}>
                            <span>📅 <b>{h.date} {h.time}</b> ({h.target})</span>
                            <span style={{ fontWeight: 700 }}>
                              <span style={{ color: "#10b981" }}>+{h.registered}</span> / <span style={{ color: "#ef4444" }}>-{h.expired}</span>
                              {h.isManual && <span style={{ marginLeft: 6, padding: "1px 4px", fontSize: 9, background: "#3b82f6", color: "#fff", borderRadius: 4 }}>수동</span>}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* API 사용 통계 */}
              {agent.id !== "onbid" && (
                <>
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
                </>
              )}

              {/* 기사작성 에이전트 전용: 자동화 스케줄러 UI */}
              {agent.id === "article" && (
                <div style={{ marginTop: 16, padding: 12, background: theme.darkMode ? "#1e293b" : "#f0fdf4", borderRadius: 10, border: `1px solid ${theme.darkMode ? "#334155" : "#bbf7d0"}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: theme.darkMode ? "#cbd5e1" : "#166534" }}>⏱️ 자동화 스케줄러 (일일 브리핑)</div>
                    <span style={{ fontSize: 11, background: "#22c55e", color: "#fff", padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>ON</span>
                  </div>
                  <div style={{ fontSize: 12, color: theme.darkMode ? "#94a3b8" : "#15803d", marginBottom: 10, lineHeight: 1.4 }}>
                    • <b>수집 시간:</b> 매일 08:00, 14:00, 23:00<br/>
                    • <b>수집 범위:</b> 7대 카테고리 (각 1건씩, 총 21건/일)<br/>
                    • <b>저장 방식:</b> 출처 미표기 원본 재창조 후 [작성중] 상태 보관
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <select id="manual-category-select" style={{ padding: "8px", borderRadius: "6px", border: "1px solid #10b981", fontSize: "12px", outline: "none", color: "#047857", fontWeight: "bold", background: "#ecfdf5" }}>
                      <option value="ALL">전체 7개 (오류 위험)</option>
                      <option value="부동산·주식·재테크">부동산·주식·재테크 1개만</option>
                      <option value="정치·경제·사회">정치·경제·사회 1개만</option>
                      <option value="세무·법률">세무·법률 1개만</option>
                      <option value="여행·건강·생활">여행·건강·생활 1개만</option>
                      <option value="IT·가전·가구">IT·가전·가구 1개만</option>
                      <option value="스포츠·연예·CAR">스포츠·연예·CAR 1개만</option>
                      <option value="인물·미션·기타">인물·미션·기타 1개만</option>
                    </select>
                    <button 
                      onClick={async () => {
                        const cat = (document.getElementById('manual-category-select') as HTMLSelectElement)?.value || 'ALL';
                        const msg = cat === 'ALL' ? "7개 카테고리의 뉴스를 수집합니다. 무료 한도 초과 오류가 발생할 수 있습니다.\\n진행하시겠습니까?" : `[${cat}] 카테고리 기사 1건만 안전하게 수집합니다.\\n진행하시겠습니까?`;
                        if (!confirm(msg)) return;
                        try {
                          const url = cat === 'ALL' ? "/api/cron/news-article?manual=true" : `/api/cron/news-article?manual=true&category=${encodeURIComponent(cat)}`;
                          const res = await fetch(url);
                        const data = await res.json();
                        
                        const hasErrors = data.results?.some((r: any) => r.status === 'error');
                        
                        if (data.success && !hasErrors) {
                          alert(`✅ 성공적으로 ${data.results?.length || 0}건의 기사가 생성되었습니다! [기사관리 > 작성중] 탭을 확인해주세요.`);
                        } else if (hasErrors) {
                          const errorMsgs = data.results.filter((r:any) => r.status === 'error').map((r:any) => `[${r.category}] ${r.message}`).join('\n');
                          alert("❌ 일부 기사 생성 중 구글 AI 한도 초과 등의 오류가 발생했습니다:\n\n" + errorMsgs);
                        } else {
                          alert("❌ 오류가 발생했습니다: " + JSON.stringify(data.results));
                        }
                      } catch (e) {
                        alert("❌ 네트워크 오류가 발생했습니다.");
                      }
                    }}
                    style={{
                      flex: 1, padding: "8px", background: "#10b981", color: "#fff",
                      border: "none", borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: "pointer"
                    }}>
                    ⚡ 실행하기
                  </button>
                  </div>
                </div>
              )}

              {/* 온비드 에이전트 전용: 실시간 수집 UI */}
              {agent.id === "onbid" && (
                <div style={{ marginTop: 16, padding: 12, background: theme.darkMode ? "#1e293b" : "#eff6ff", borderRadius: 10, border: `1px solid ${theme.darkMode ? "#334155" : "#bfdbfe"}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: theme.darkMode ? "#cbd5e1" : "#1e40af" }}>⏱️ 온비드 연동 스케줄러</div>
                    <span style={{ fontSize: 11, background: "#2563eb", color: "#fff", padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>ON</span>
                  </div>
                  <div style={{ fontSize: 12, color: theme.darkMode ? "#94a3b8" : "#1e3a8a", marginBottom: 10, lineHeight: 1.4 }}>
                    • <b>동기화 방식:</b> 공공데이터포털 실시간 연동 API (온비드 v2)<br/>
                    • <b>동기화 주기:</b> 매일 오전 1시 정각 자동 구동 (서울 ➡️ 전국 17개 시도 순차 진행)<br/>
                    • <b>주요 기능:</b> 공고관리번호 기준 UPSERT 및 만료 매물 자동 일괄 삭제
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <select id="manual-sido-select" style={{ padding: "8px", borderRadius: "6px", border: "1px solid #2563eb", fontSize: "12px", outline: "none", color: "#1e3a8a", fontWeight: "bold", background: "#f8fafc" }}>
                      <option value="ALL">전국 (전체 수집)</option>
                      <option value="서울특별시">서울특별시</option>
                      <option value="경기도">경기도</option>
                      <option value="인천광역시">인천광역시</option>
                      <option value="부산광역시">부산광역시</option>
                      <option value="대구광역시">대구광역시</option>
                      <option value="광주광역시">광주광역시</option>
                      <option value="대전광역시">대전광역시</option>
                      <option value="울산광역시">울산광역시</option>
                      <option value="세종특별자치시">세종특별자치시</option>
                      <option value="강원특별자치도">강원특별자치도</option>
                      <option value="충청북도">충청북도</option>
                      <option value="충청남도">충청남도</option>
                      <option value="전북특별자치도">전북특별자치도</option>
                      <option value="전라남도">전라남도</option>
                      <option value="경상북도">경상북도</option>
                      <option value="경상남도">경상남도</option>
                      <option value="제주특별자치도">제주특별자치도</option>
                    </select>
                    <button 
                      onClick={async (e) => {
                        const btn = e.currentTarget;
                        const originalText = btn.innerText;
                        const sido = (document.getElementById('manual-sido-select') as HTMLSelectElement)?.value || 'ALL';
                        const timeEstimate = sido === 'ALL' ? '1~3분' : '5~15초';
                        const msg = sido === 'ALL' 
                          ? `전국 17개 시도의 신규 경공매 매물을 실시간 수집하고 만료 물건을 자동 정리합니다.\n예상 소요 시간: 약 ${timeEstimate}\n\n진행하시겠습니까?` 
                          : `[${sido}] 지역의 신규 경공매 매물을 수집하고 만료 물건을 자동 정리합니다.\n예상 소요 시간: 약 ${timeEstimate}\n\n진행하시겠습니까?`;
                        
                        if (!confirm(msg)) return;
                        
                        btn.disabled = true;
                        btn.style.background = "#9ca3af";
                        const startTime = Date.now();
                        
                        // 진행률 타이머 (1초마다 경과 시간 표시)
                        const timer = setInterval(() => {
                          const elapsed = Math.round((Date.now() - startTime) / 1000);
                          btn.innerText = `⏳ 수집 중... (${elapsed}초)`;
                        }, 1000);
                        btn.innerText = "⏳ 수집 중... (0초)";
                        
                        // 4분 안전 타임아웃 (서버 5분 제한 대응)
                        const controller = new AbortController();
                        const timeout = setTimeout(() => controller.abort(), 240000);
                        
                        try {
                          const url = sido === 'ALL' 
                            ? "/api/cron/onbid?manual=true" 
                            : `/api/cron/onbid?manual=true&sido=${encodeURIComponent(sido)}`;
                          const res = await fetch(url, { signal: controller.signal });
                          clearTimeout(timeout);
                          const data = await res.json();
                          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
                          
                          if (data.success) {
                            const aggregated = (data.results || []).reduce((acc: any, r: any) => {
                              if (!r.skipped_reason) {
                                acc.inserted += r.inserted || 0;
                                acc.updated += r.updated || 0;
                                acc.deleted += r.deleted || 0;
                                acc.skipped += r.skipped || 0;
                              }
                              return acc;
                            }, { inserted: 0, updated: 0, deleted: 0, skipped: 0 });

                            alert(`✅ 온비드 v2 동기화 완료! (${elapsed}초)\n\n• 신규 등록: ${aggregated.inserted}건\n• 가격/일자 업데이트: ${aggregated.updated}건\n• 만료 삭제: ${aggregated.deleted}건\n• 스킵 (좌표 없음): ${aggregated.skipped}건`);
                            const count = await getOnbidCount();
                            setOnbidCount(count);
                            const historyRes = await getOnbidHistoryStats();
                            if (historyRes.success) {
                              setOnbidHistory(historyRes);
                            }
                          } else {
                            alert(`❌ 동기화 실패 (${elapsed}초): ${data.error || "알 수 없는 오류가 발생했습니다."}`);
                          }
                        } catch (err: any) {
                          clearTimeout(timeout);
                          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
                          if (err.name === 'AbortError') {
                            alert(`⏰ 동기화 시간 초과 (${elapsed}초)\n\n서버에서 처리가 계속 진행 중일 수 있습니다.\n잠시 후 통계를 새로고침 해주세요.`);
                          } else {
                            alert(`❌ 동기화 도중 오류가 발생했습니다. (${elapsed}초)`);
                          }
                        } finally {
                          clearInterval(timer);
                          btn.disabled = false;
                          btn.innerText = originalText;
                          btn.style.background = "#2563eb";
                        }
                      }}
                      style={{
                        flex: 1, padding: "8px", background: "#2563eb", color: "#fff",
                        border: "none", borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: "pointer"
                      }}>
                      ⚡ 실시간 수집 실행
                    </button>
                  </div>
                </div>
              )}

            </div>
          );
        })}
      </div>

      {/* ── ⚡ 실시간 AI 호출 및 크레딧 소모 로그 ── */}
      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 20 }}>⚡</span>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: theme.textPrimary }}>
              실시간 AI 호출 및 크레딧 소모 내역
            </h3>
            <span style={{ fontSize: 12, color: theme.textSecondary, marginLeft: 4 }}>
              (검색 결과: {recentLogs.length}건)
            </span>
          </div>
          <button
            onClick={() => fetchStats(false)}
            style={{
              padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 700,
              background: theme.darkMode ? "#2c2d33" : "#f1f5f9",
              color: "#2563eb", border: `1px solid ${theme.border}`,
              cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4
            }}
          >
            🔄 새로고침
          </button>
        </div>

        {/* ── 🔍 사용자 및 에이전트 실시간 검색/필터 바 ── */}
        <div style={{
          display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center",
          background: theme.darkMode ? "#1e1f23" : "#f8fafc", padding: "12px 14px", borderRadius: 8,
          border: `1px solid ${theme.border}`
        }}>
          {/* 사용자 이메일 / 키워드 검색창 */}
          <div style={{ display: "flex", alignItems: "center", position: "relative", flex: 1, minWidth: 260 }}>
            <span style={{ position: "absolute", left: 12, fontSize: 14, color: theme.textSecondary }}>🔍</span>
            <input
              type="text"
              placeholder="사용자 ID(이메일), 작업내용 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchStats(false)}
              style={{
                width: "100%",
                padding: "8px 30px 8px 34px",
                borderRadius: 6,
                fontSize: 13,
                border: `1px solid ${theme.border}`,
                background: theme.darkMode ? "#141517" : "#fff",
                color: theme.textPrimary,
                outline: "none",
                fontFamily: "inherit",
              }}
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(""); }}
                style={{
                  position: "absolute", right: 10, background: "none", border: "none",
                  cursor: "pointer", color: theme.textSecondary, fontSize: 13,
                }}
              >
                ✕
              </button>
            )}
          </div>

          {/* 기능 / 에이전트 필터 드롭다운 */}
          <select
            value={selectedChannelFilter}
            onChange={(e) => setSelectedChannelFilter(e.target.value)}
            style={{
              padding: "8px 12px",
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              border: `1px solid ${theme.border}`,
              background: theme.darkMode ? "#141517" : "#fff",
              color: theme.textPrimary,
              outline: "none",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            <option value="all">⚡ 모든 에이전트 & 마케팅 툴 전체</option>
            {DEFAULT_AGENTS.map((a) => (
              <option key={a.id} value={a.id}>
                {a.emoji} {agentNames[a.id] || a.defaultName}
              </option>
            ))}
          </select>

          <button
            onClick={() => fetchStats(false)}
            style={{
              padding: "8px 16px",
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 700,
              background: "#2563eb",
              color: "#fff",
              border: "none",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            조회하기
          </button>
        </div>

        {recentLogs.length > 0 ? (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${theme.border}`, textAlign: "left", color: theme.textSecondary }}>
                  <th style={{ padding: "10px 12px", fontWeight: 700 }}>회원 ID (사용자)</th>
                  <th style={{ padding: "10px 12px", fontWeight: 700 }}>시각 (KST)</th>
                  <th style={{ padding: "10px 12px", fontWeight: 700 }}>기능 / 에이전트</th>
                  <th style={{ padding: "10px 12px", fontWeight: 700 }}>작업 내용 요약</th>
                  <th style={{ padding: "10px 12px", fontWeight: 700, textAlign: "right" }}>사용량 (토큰/장수)</th>
                  <th style={{ padding: "10px 12px", fontWeight: 700, textAlign: "right" }}>총 사용량</th>
                  <th style={{ padding: "10px 12px", fontWeight: 700, textAlign: "right" }}>소모 크레딧 (원)</th>
                </tr>
              </thead>
              <tbody>
                {recentLogs.map((log) => {
                  const date = new Date(log.created_at);
                  const timeStr = date.toLocaleTimeString("ko-KR", { timeZone: "Asia/Seoul", hour12: false });
                  const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
                  
                  const agentObj = DEFAULT_AGENTS.find(a => a.id === log.channel_id);
                  const agentTitle = agentObj ? `${agentObj.emoji} ${agentNames[agentObj.id] || agentObj.defaultName}` : log.channel_id;

                  const cost = Number(log.cost_krw || 0);

                  // 사용자 정보 및 요약 파싱
                  const raw = log.content || "";
                  let userEmail = log.user_email || "SYSTEM (자동 크론)";
                  let cleanContent = raw;
                  const match = raw.match(/^\[(.*?)\]\s*(.*)$/);
                  if (match) {
                    userEmail = match[1];
                    cleanContent = match[2];
                  }

                  const isAdmin = userEmail.toLowerCase().includes("gongsilnews@gmail.com") || userEmail.toLowerCase().includes("admin");
                  const isSystem = userEmail.toUpperCase().includes("SYSTEM");
                  const isImage = raw.includes("(이미지)") || raw.includes("나노바나나") || raw.includes("gemini-3.1-flash-image") || raw.includes("실사") || log.channel_id === "photoCuration" || log.channel_id === "remodeling" || log.channel_id === "homeInterior";

                  let userDisplayName = userEmail;
                  if (isAdmin) {
                    userDisplayName = `${userEmail} (최고관리자 공실뉴스)`;
                  } else if (isSystem) {
                    userDisplayName = userEmail;
                  } else if (log.user_name) {
                    const rolePrefix = log.user_role === "REALTOR" ? "부동산 " : "";
                    userDisplayName = `${userEmail} (${rolePrefix}${log.user_name})`;
                  }

                  return (
                    <tr key={log.id} style={{ borderBottom: `1px solid ${theme.border}` }}>
                      {/* 1. 회원 ID (계정) - 맨 앞 */}
                      <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: 5,
                          padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 700,
                          background: isAdmin ? "#fef3c7" : (isSystem ? (theme.darkMode ? "#2c2d33" : "#f1f5f9") : "#e0e7ff"),
                          color: isAdmin ? "#92400e" : (isSystem ? theme.textSecondary : "#3730a3"),
                          border: `1px solid ${isAdmin ? "#fde68a" : (isSystem ? theme.border : "#c7d2fe")}`,
                        }}>
                          {isAdmin ? "👑 " : (isSystem ? "⚙️ " : "👤 ")}
                          {userDisplayName}
                        </span>
                      </td>

                      {/* 2. 시각 */}
                      <td style={{ padding: "10px 12px", color: theme.textSecondary, whiteSpace: "nowrap", fontSize: 12 }}>
                        {dateStr} {timeStr}
                      </td>

                      {/* 3. 기능 / 에이전트 */}
                      <td style={{ padding: "10px 12px", fontWeight: 700, color: theme.textPrimary, whiteSpace: "nowrap" }}>
                        <span style={{
                          padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700,
                          background: theme.darkMode ? "#2c2d33" : "#eff6ff",
                          color: "#2563eb",
                        }}>
                          {agentTitle}
                        </span>
                      </td>

                      {/* 4. 작업 내용 요약 */}
                      <td style={{ padding: "10px 12px", color: theme.textPrimary, maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={cleanContent}>
                        {cleanContent?.length > 55 ? cleanContent.substring(0, 55) + "..." : cleanContent}
                      </td>

                      {/* 5. 사용량 (토큰/장수) */}
                      <td style={{ padding: "10px 12px", textAlign: "right", color: theme.textSecondary, fontSize: 12 }}>
                        {isImage ? (
                          <span style={{ color: "#d97706", fontWeight: 700 }}>🖼️ 1장 (실사)</span>
                        ) : (
                          `${log.input_tokens?.toLocaleString() || 0} / ${log.output_tokens?.toLocaleString() || 0}`
                        )}
                      </td>

                      {/* 6. 총 사용량 */}
                      <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, color: theme.textPrimary }}>
                        {isImage ? "1장" : (log.total_tokens?.toLocaleString() || 0)}
                      </td>

                      {/* 7. 소모 크레딧 */}
                      <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 800, color: cost >= 10 ? "#ea580c" : (cost > 0 ? "#f59e0b" : theme.textSecondary) }}>
                        ₩{cost.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "30px 0", color: theme.textSecondary, fontSize: 13 }}>
            기록된 AI 호출 내역이 없습니다.
          </div>
        )}
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
                    setReportDate(d.toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }));
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
