"use client";

import React, { useEffect, useState } from "react";
import { searchOnbidForStudio, type OnbidPick, type OnbidPreset } from "@/app/actions/studio";

/**
 * 뉴스·SNS자동화 [경매·공매] — 온비드 물건을 번호 없이 골라 찾기 (2026-11-09 사장님)
 *  지역 · 종류 · 바로 쓰기 좋은 묶음(반값 이하 · 이번 주 마감 · 유찰 2회 이상 · 1억 미만) · 이름
 *  고르면 onPick → 공실뉴스 칸과 같은 분석·글쓰기로
 */
const SIDO = ["서울특별시", "경기도", "인천광역시", "부산광역시", "대구광역시", "광주광역시", "대전광역시", "울산광역시", "세종특별자치시", "강원특별자치도", "충청북도", "충청남도", "전북특별자치도", "전라남도", "경상북도", "경상남도", "제주특별자치도"];
const KINDS = ["아파트·오피스텔", "빌라·주택", "상가·사무실·건물·공장·토지"];
const PRESETS: { id: OnbidPreset; label: string }[] = [
  { id: "", label: "전체" },
  { id: "half", label: "감정가 반값 이하" },
  { id: "week", label: "이번 주 입찰 마감" },
  { id: "fail2", label: "유찰 2회 이상" },
  { id: "under1", label: "1억 미만" },
];
type Theme = { cardBg: string; textPrimary: string; textSecondary: string; border: string; darkMode?: boolean };

const won = (n: number | null) => {
  if (!n) return "–";
  const eok = Math.floor(n / 1e8), man = Math.round((n % 1e8) / 1e4);
  return eok ? `${eok}억${man ? ` ${man.toLocaleString()}만` : ""}` : `${man.toLocaleString()}만`;
};

export default function OnbidPicker({ theme, onPick }: { theme: Theme; onPick: (r: OnbidPick) => void }) {
  const [sido, setSido] = useState("서울특별시");
  const [sigungu, setSigungu] = useState("");
  const [kind, setKind] = useState("");
  const [preset, setPreset] = useState<OnbidPreset>("");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<OnbidPick[] | null>(null);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const search = async (over?: Partial<{ sido: string; kind: string; preset: OnbidPreset }>) => {
    setBusy(true); setErr("");
    const r = await searchOnbidForStudio({ sido: over?.sido ?? sido, sigungu, kind: over?.kind ?? kind, preset: over?.preset ?? preset, q }).catch(() => null);
    if (!r?.success) { setErr(r?.error || "물건을 불러오지 못했어요."); setRows([]); setTotal(0); }
    else { setRows(r.data); setTotal(r.total); }
    setBusy(false);
  };
  useEffect(() => { void search(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const NAVY = theme.darkMode ? "#93c5fd" : "#1e3a6e";
  const sel: React.CSSProperties = { height: 36, padding: "0 10px", border: `1px solid ${theme.border}`, borderRadius: 8, fontSize: 13.5, background: theme.cardBg, color: theme.textPrimary, fontFamily: "inherit" };
  const chip = (on: boolean): React.CSSProperties => ({ height: 32, padding: "0 12px", borderRadius: 16, border: `1px solid ${on ? NAVY : theme.border}`, background: on ? NAVY : theme.cardBg, color: on ? (theme.darkMode ? "#111" : "#fff") : theme.textPrimary, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" });

  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: theme.textSecondary, marginBottom: 8 }}>온비드 물건 고르기 <span style={{ fontWeight: 500 }}>· 입찰 마감 전 물건만</span></div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
        {PRESETS.map((p) => <button key={p.id || "all"} type="button" style={chip(preset === p.id)} onClick={() => { setPreset(p.id); void search({ preset: p.id }); }}>{p.label}</button>)}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); void search(); }} style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        <select value={sido} onChange={(e) => { setSido(e.target.value); void search({ sido: e.target.value }); }} style={sel}>
          <option value="">전국</option>
          {SIDO.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <input value={sigungu} onChange={(e) => setSigungu(e.target.value)} placeholder="시·군·구 (예: 강남구)" style={{ ...sel, width: 150 }} />
        <select value={kind} onChange={(e) => { setKind(e.target.value); void search({ kind: e.target.value }); }} style={sel}>
          <option value="">모든 종류</option>
          {KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="물건 이름" style={{ ...sel, width: 150 }} />
        <button type="submit" disabled={busy} style={{ ...sel, background: NAVY, color: theme.darkMode ? "#111" : "#fff", border: 0, fontWeight: 800, padding: "0 16px", cursor: "pointer" }}>찾기</button>
      </form>
      {err && <div style={{ marginTop: 8, color: "#dc2626", fontSize: 13 }}>{err}</div>}
      <div style={{ marginTop: 10, fontSize: 12.5, color: theme.textSecondary }}>{busy ? "찾는 중…" : rows ? `${total.toLocaleString()}건${total > rows.length ? ` 중 마감이 가까운 ${rows.length}건` : ""}` : ""}</div>
      <div style={{ marginTop: 6, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 8, maxHeight: 420, overflowY: "auto" }}>
        {(rows || []).map((r) => {
          const rate = r.appraisal && r.lowest ? Math.round((r.lowest / r.appraisal) * 100) : null;
          return (
            <button key={r.id} type="button" onClick={() => onPick(r)} title={r.building_name || ""}
              style={{ textAlign: "left", padding: "10px 12px", border: `1px solid ${theme.border}`, borderRadius: 8, background: theme.cardBg, color: theme.textPrimary, cursor: "pointer", fontFamily: "inherit" }}>
              <div style={{ fontSize: 12, color: theme.textSecondary }}>{[r.sido, r.sigungu, r.dong].filter(Boolean).join(" ")} · {r.kind}</div>
              <div style={{ fontSize: 14, fontWeight: 800, margin: "3px 0 5px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.building_name || r.caseNo}</div>
              <div style={{ fontSize: 13 }}>
                최저가 <b>{won(r.lowest)}</b> <span style={{ color: theme.textSecondary }}>/ 감정가 {won(r.appraisal)}</span>
                {rate != null && rate < 100 && <span style={{ marginLeft: 6, color: "#dc2626", fontWeight: 800 }}>{rate}%</span>}
              </div>
              <div style={{ fontSize: 12, color: theme.textSecondary, marginTop: 3 }}>입찰 마감 {r.bidEnd}{r.failCount ? ` · 유찰 ${r.failCount}회` : ""}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
