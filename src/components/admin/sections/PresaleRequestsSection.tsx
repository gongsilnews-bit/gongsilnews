"use client";

// 최고관리자 — 분양자료 신청 접수 현황 (2026-11-26 사장님 회의)
//  위: 단지별 접수 (신청 수 · 분양사 제공 동의 수 · 관심 평형) — 분양 대행사 영업 자료
//  아래: 신청 목록 (상태 새 접수 → 연락함 → 마침 · 메모). 분양사 제공 동의를 안 한 사람의 연락처는 분양사에 넘기지 않는다
import React, { useEffect, useMemo, useState } from "react";
import type { AdminTheme } from "./types";
import { listPresaleRequests, updatePresaleRequest, type PresaleRequestRow } from "@/app/actions/presale";

const PURPLE = "#6d28d9";
const STATUS: Record<string, string> = { new: "새 접수", contacted: "연락함", done: "마침" };
/** 회원 구분 색 (2026-11-26 사장님: 신청자 명단에 부동산회원·일반회원처럼) */
const TYPE_COLOR: Record<string, string> = { "공실뉴스부동산": "#ea580c", "부동산회원": "#1a2e5a", "비즈니스회원": "#0f766e", "일반회원": "#2563eb", "최고관리자": "#6b7280", "비회원": "#9ca3af" };

export default function PresaleRequestsSection({ theme }: { theme: AdminTheme }) {
  const [rows, setRows] = useState<PresaleRequestRow[] | null>(null);
  const [msg, setMsg] = useState("");
  const [pick, setPick] = useState<string | null>(null); // 고른 단지만
  const load = () => listPresaleRequests().then((r) => (r.success ? setRows(r.rows) : (setMsg(r.error), setRows([]))));
  useEffect(() => { load(); }, []);

  const groups = useMemo(() => {
    const m = new Map<string, { id: string; name: string; n: number; third: number; fresh: number; areas: Map<string, number>; types: Map<string, number>; last: string }>();
    for (const r of rows || []) {
      const g = m.get(r.presale_id) || { id: r.presale_id, name: r.presale_name, n: 0, third: 0, fresh: 0, areas: new Map(), types: new Map(), last: r.created_at };
      g.n++;
      if (r.agree_third) g.third++;
      if (r.status === "new") g.fresh++;
      g.types.set(r.member_type, (g.types.get(r.member_type) || 0) + 1);
      if (r.area_type) g.areas.set(r.area_type, (g.areas.get(r.area_type) || 0) + 1);
      if (r.created_at > g.last) g.last = r.created_at;
      m.set(r.presale_id, g);
    }
    return [...m.values()].sort((a, b) => b.n - a.n || b.last.localeCompare(a.last));
  }, [rows]);

  const shown = (rows || []).filter((r) => !pick || r.presale_id === pick);
  const save = async (r: PresaleRequestRow, patch: { status?: string; memo?: string }) => {
    const res = await updatePresaleRequest(r.id, patch);
    if (!res.success) { setMsg(res.error || "저장하지 못했습니다."); return; }
    setRows((list) => (list || []).map((x) => (x.id === r.id ? { ...x, ...patch } : x)));
  };

  const card: React.CSSProperties = { background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: 10, padding: "12px 14px", cursor: "pointer", textAlign: "left", fontFamily: "inherit", color: theme.textPrimary };
  const cell: React.CSSProperties = { padding: "10px 12px", borderBottom: `1px solid ${theme.border}`, fontSize: 14, color: theme.textPrimary, verticalAlign: "top" };
  const day = (iso: string) => new Date(iso).toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ margin: 0, fontSize: 21, fontWeight: 800, color: theme.textPrimary }}>분양 신청</h2>
      <div style={{ color: theme.textSecondary, fontSize: 13.5, marginTop: 6 }}>
        공실열람 분양 단지 [분양자료 신청하기]로 들어온 접수입니다. <b style={{ color: PURPLE }}>분양사 제공 동의</b>를 한 사람만 분양사에 연락처를 넘길 수 있습니다.
      </div>
      {msg && <div style={{ marginTop: 10, color: "#dc2626", fontWeight: 600 }}>{msg}</div>}
      {rows === null ? <div style={{ marginTop: 20, color: theme.textSecondary }}>불러오는 중…</div> : !rows.length ? <div style={{ marginTop: 20, color: theme.textSecondary }}>아직 신청이 없습니다.</div> : (<>
        {/* 단지별 */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10, marginTop: 18 }}>
          {groups.map((g) => (
            <button key={g.id} type="button" onClick={() => setPick(pick === g.id ? null : g.id)} style={{ ...card, borderColor: pick === g.id ? PURPLE : theme.border, boxShadow: pick === g.id ? `0 0 0 1px ${PURPLE}` : "none" }}>
              <div style={{ fontWeight: 800, fontSize: 15 }}>{g.name}</div>
              <div style={{ marginTop: 6, fontSize: 13.5 }}>
                신청 <b style={{ color: PURPLE, fontSize: 17 }}>{g.n}</b>명 · 분양사 제공 동의 <b>{g.third}</b>명{g.fresh ? <> · <span style={{ color: "#dc2626", fontWeight: 700 }}>새 접수 {g.fresh}</span></> : null}
              </div>
              <div style={{ marginTop: 4, fontSize: 12.5, display: "flex", flexWrap: "wrap", gap: "2px 8px" }}>{[...g.types.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => <span key={k} style={{ color: TYPE_COLOR[k] || theme.textSecondary, fontWeight: 700 }}>{k} {v}</span>)}</div>
              {g.areas.size > 0 && <div style={{ marginTop: 4, fontSize: 12.5, color: theme.textSecondary }}>{[...g.areas.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(" · ")}</div>}
            </button>
          ))}
        </div>

        {/* 목록 */}
        <div style={{ marginTop: 22, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 940 }}>
            <thead>
              <tr>{["접수", "단지", "이름", "회원", "휴대폰", "평형", "분양사 제공", "상태", "메모"].map((h) => <th key={h} style={{ ...cell, fontWeight: 700, color: theme.textSecondary, textAlign: "left", fontSize: 13 }}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id}>
                  <td style={{ ...cell, whiteSpace: "nowrap" }}>{day(r.created_at)}</td>
                  <td style={cell}>{r.presale_name}</td>
                  <td style={cell}>{r.name}</td>
                  <td style={{ ...cell, whiteSpace: "nowrap" }}><span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 10, fontSize: 12, fontWeight: 800, color: "#fff", background: TYPE_COLOR[r.member_type] || "#9ca3af" }}>{r.member_type}</span></td>
                  <td style={{ ...cell, whiteSpace: "nowrap" }}><a href={`tel:${r.phone}`} style={{ color: theme.textPrimary }}>{r.phone}</a></td>
                  <td style={cell}>{r.area_type || "-"}</td>
                  <td style={cell} title={r.third_party || ""}>{r.agree_third ? <span style={{ color: PURPLE, fontWeight: 700 }}>동의</span> : <span style={{ color: theme.textSecondary }}>안 함</span>}</td>
                  <td style={cell}>
                    <select value={r.status} onChange={(e) => save(r, { status: e.target.value })} style={{ padding: "4px 6px", borderRadius: 6, border: `1px solid ${theme.border}`, background: theme.cardBg, color: r.status === "new" ? "#dc2626" : theme.textPrimary, fontFamily: "inherit", fontWeight: 700 }}>
                      {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </td>
                  <td style={cell}>
                    <input defaultValue={r.memo || ""} onBlur={(e) => { if (e.target.value !== (r.memo || "")) save(r, { memo: e.target.value }); }} placeholder="메모"
                      style={{ width: 200, padding: "4px 8px", borderRadius: 6, border: `1px solid ${theme.border}`, background: theme.cardBg, color: theme.textPrimary, fontFamily: "inherit" }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>)}
    </div>
  );
}
