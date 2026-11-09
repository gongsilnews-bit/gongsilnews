"use client";

import React, { useEffect, useState } from "react";
import type { AdminTheme } from "@/components/admin/sections/types";
import { getAptDataStats, type AptDataStats } from "@/app/actions/aptDataStats";

/**
 * AI 비서실 — 실거래·단지정보 수집 에이전트 카드 (2026-11-09 사장님: 온비드 동기화 에이전트처럼 하단에)
 *  실제로 하는 일은 /api/cron/apt-prices/round (vercel.json) — 이 카드는 보여 주기만
 */
const KIND_NAME = { apt: "아파트", offi: "오피스텔", villa: "빌라" } as const;
const n = (v: number | null | undefined) => (v == null ? "–" : v.toLocaleString("ko-KR"));
const pct = (a: number | null, b: number | null) => (a == null || !b ? "" : ` (${Math.round((a / b) * 100)}%)`);
const dayLabel = (d: string) => {
  const [, m, dd] = d.split("-");
  const w = "일월화수목금토"[new Date(`${d}T00:00:00Z`).getUTCDay()];
  return `${Number(m)}월 ${Number(dd)}일 (${w})`;
};
const kstTime = (iso: string | null) => (iso ? new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "–");

export default function AptDataCard({ theme, cardStyle }: { theme: AdminTheme; cardStyle: React.CSSProperties }) {
  const [st, setSt] = useState<AptDataStats | null>(null);
  const [err, setErr] = useState("");
  const load = () => {
    setErr("");
    getAptDataStats().then((r) => (r.success ? setSt(r.data) : setErr(r.error))).catch(() => setErr("현황을 불러오지 못했어요."));
  };
  useEffect(load, []);

  const soft = theme.darkMode ? "#1a1b1e" : "#f8fafc";
  const today = st?.days[0];
  const box = (label: string, value: string, color: string, sub?: string) => (
    <div style={{ textAlign: "center", padding: "10px 6px", background: soft, borderRadius: 10, border: `1px solid ${theme.border}` }}>
      <div style={{ fontSize: 11, color: theme.textSecondary, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 800, color }}>{value}</div>
      {sub && <div style={{ fontSize: 10.5, color: theme.textSecondary, marginTop: 2 }}>{sub}</div>}
    </div>
  );
  const kinds = st?.kinds || (["apt", "offi", "villa"] as const).map((kind) => ({ kind, total: null, households: null, waiting: null }));

  return (
    <div style={{ ...cardStyle }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: theme.textPrimary }}>실거래·단지정보 수집 에이전트</div>
          <div style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>매일 밤 국토부 실거래가를 받고, 건축물대장으로 세대수·용적률을 채웁니다.</div>
        </div>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: "#059669", background: theme.darkMode ? "#064e3b" : "#d1fae5", padding: "4px 10px", borderRadius: 999 }}>● 가동 중</span>
      </div>

      {err && (
        <div style={{ fontSize: 13, color: "#ef4444", marginBottom: 10 }}>
          {err} <button onClick={load} style={{ marginLeft: 6, fontSize: 12, cursor: "pointer" }}>다시</button>
        </div>
      )}

      <div style={{ fontSize: 13, fontWeight: 700, color: theme.textSecondary, marginBottom: 8 }}>업무 처리 현황</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 12 }}>
        {box("오늘 바뀐 단지", st ? `${n(today?.updated)}곳` : "…", "#2563eb")}
        {box("오늘 새 거래 단지", st ? `${n(today?.newTrades)}곳` : "…", "#10b981")}
        {box("가장 최근 거래일", st?.latestTrade ? `${Number(st.latestTrade.slice(5, 7))}월 ${Number(st.latestTrade.slice(8, 10))}일` : st ? "–" : "…", "#f59e0b", st ? `마지막 갱신 ${kstTime(st.lastUpdated)}` : undefined)}
      </div>

      <div style={{ fontSize: 13, fontWeight: 700, color: theme.textSecondary, marginBottom: 8 }}>세대수 채운 정도</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 12 }}>
        {kinds.map((k) => (
          <React.Fragment key={k.kind}>
            {box(KIND_NAME[k.kind], st ? `${n(k.households)}${pct(k.households, k.total)}` : "…", "#7c3aed", st ? `전체 ${n(k.total)} · 남음 ${n(k.waiting)}` : undefined)}
          </React.Fragment>
        ))}
      </div>

      {st && (
        <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: theme.textSecondary, marginBottom: 6 }}>
            최근 7일 수집 이력 <span style={{ fontWeight: 500 }}>(바뀐 단지 / 새 거래 / 세대수 찾아본 단지)</span>
          </div>
          <div style={{ maxHeight: 130, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
            {st.days.map((d) => (
              <div key={d.day} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, padding: "4px 8px", background: theme.darkMode ? "#1e293b" : "#f1f5f9", borderRadius: 6, color: theme.textPrimary }}>
                <b>{dayLabel(d.day)}</b>
                <span style={{ fontWeight: 700 }}>
                  <span style={{ color: "#2563eb" }}>{n(d.updated)}</span> / <span style={{ color: "#10b981" }}>{n(d.newTrades)}</span> / <span style={{ color: "#7c3aed" }}>{n(d.infoTried)}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: 16, padding: 12, background: theme.darkMode ? "#1e293b" : "#eff6ff", borderRadius: 10, border: `1px solid ${theme.darkMode ? "#334155" : "#bfdbfe"}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: theme.darkMode ? "#cbd5e1" : "#1e40af" }}>⏱️ 수집 스케줄러</div>
          <span style={{ fontSize: 11, background: "#2563eb", color: "#fff", padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>ON</span>
        </div>
        <div style={{ fontSize: 12, color: theme.darkMode ? "#94a3b8" : "#1e3a8a", lineHeight: 1.5 }}>
          • <b>실거래:</b> 매일 새벽 2시~오전 11시 55분, 전국 시군구 × 아파트·오피스텔·빌라 최근 3개월 (두 바퀴)<br />
          • <b>전체 다시 받기:</b> 매일 밤 0시~2시, 28일에 한 바퀴씩 36개월 전체<br />
          • <b>세대수·용적률:</b> 낮 12시~밤 12시, 5분마다 40곳 (아파트 → 오피스텔 → 빌라 순) · 공공데이터포털 하루 한도에 걸리면 다음 날 이어서
        </div>
      </div>
    </div>
  );
}
