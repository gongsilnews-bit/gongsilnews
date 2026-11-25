"use client";

/**
 * 고객관리 · 문자 보내기 같이 쓰는 모양과 조건 고르기 (2026-11-25)
 *  - 고객관리 [고객 목록] 과 문자·카톡 보내기 [고객 명단] 이 같은 FilterBox 를 쓴다
 *  - 고객관리에서 거른 조건을 문자 화면으로 넘길 때 sessionStorage 에 잠깐 둔다 (HANDOFF_KEY)
 */

import React, { useState } from "react";
import type { AdminTheme } from "../types";
import type { CrmFilter, CrmOverview, CrmStatus } from "@/app/actions/adminCrm";

export const NAVY = "#1e3a6e";
export const STATUSES: CrmStatus[] = ["보냄가능", "쉬는중", "확인전", "보내지않음", "수신거부", "번호오류"];
export const STATUS_COLOR: Record<string, { bg: string; fg: string }> = {
  보냄가능: { bg: "#dcfce7", fg: "#166534" },
  쉬는중: { bg: "#fef3c7", fg: "#92400e" },
  확인전: { bg: "#e0e7ff", fg: "#3730a3" },
  보내지않음: { bg: "#f1f5f9", fg: "#475569" },
  수신거부: { bg: "#fee2e2", fg: "#991b1b" },
  번호오류: { bg: "#fee2e2", fg: "#991b1b" },
};
export const HANDOFF_KEY = "gs-crm-send-filter";

export function byteLength(str: string) {
  let b = 0;
  for (let i = 0; i < str.length; i++) b += str.charCodeAt(i) >> 7 ? 2 : 1;
  return b;
}
export function fmtDate(iso?: string | null, withTime = true) {
  if (!iso) return "-";
  const d = new Date(iso);
  const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return withTime ? `${day} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}` : day;
}
export const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 1000) / 10}%` : "-");

export type UI = {
  field: React.CSSProperties; card: React.CSSProperties; label: React.CSSProperties; secBtn: React.CSSProperties; priBtn: React.CSSProperties;
  chip: (on: boolean) => React.CSSProperties; badge: (s: string) => React.ReactNode;
  inputBg: string; textPrimary: string; textSecondary: string; border: string; darkMode: boolean; cardBg: string;
};

export function makeUI(theme: AdminTheme): UI {
  const { cardBg, textPrimary, textSecondary, border, darkMode } = theme;
  const inputBg = darkMode ? "#202124" : "#fff";
  const field: React.CSSProperties = { height: 34, padding: "0 10px", border: `1px solid ${border}`, borderRadius: 6, background: inputBg, color: textPrimary, fontSize: 13, fontFamily: "inherit" };
  const card: React.CSSProperties = { background: cardBg, border: `1px solid ${border}`, borderRadius: 8, padding: "18px 20px" };
  const label: React.CSSProperties = { fontSize: 12.5, fontWeight: 800, color: textPrimary, marginBottom: 6 };
  const secBtn: React.CSSProperties = { height: 32, padding: "0 12px", border: `1px solid ${border}`, borderRadius: 5, background: inputBg, color: textPrimary, fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" };
  const priBtn: React.CSSProperties = { ...secBtn, background: NAVY, color: "#fff", borderColor: NAVY };
  const chip = (on: boolean): React.CSSProperties => ({ ...secBtn, height: 28, padding: "0 10px", fontSize: 12, background: on ? NAVY : inputBg, color: on ? "#fff" : textPrimary, borderColor: on ? NAVY : border });
  const badge = (s: string) => (
    <span style={{ fontSize: 11.5, fontWeight: 800, padding: "2px 7px", borderRadius: 4, whiteSpace: "nowrap", background: STATUS_COLOR[s]?.bg || "#eee", color: STATUS_COLOR[s]?.fg || "#333" }}>{s}</span>
  );
  return { field, card, label, secBtn, priBtn, chip, badge, inputBg, textPrimary, textSecondary, border, darkMode, cardBg };
}

/** 꼬리표 · 지역 · (상태) · 공실뉴스 가입 */
export function FilterBox({ ov, ui, f, setF, showStatus }: { ov: CrmOverview; ui: UI; f: CrmFilter; setF: (f: CrmFilter) => void; showStatus: boolean }) {
  const [moreTags, setMoreTags] = useState(false);
  const tags = moreTags ? ov.tags : ov.tags.slice(0, 14);
  const toggleTag = (t: string) => {
    const cur = new Set(f.tags || []);
    if (cur.has(t)) cur.delete(t); else cur.add(t);
    setF({ ...f, tags: Array.from(cur) });
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div>
        <div style={ui.label}>꼬리표 <span style={{ fontWeight: 500, color: ui.textSecondary }}>(여러 개 고르면 하나라도 있는 사람)</span></div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {tags.map((t) => (
            <button key={t.tag} style={ui.chip(!!f.tags?.includes(t.tag))} onClick={() => toggleTag(t.tag)}>{t.tag} <span style={{ opacity: 0.7 }}>{t.n.toLocaleString()}</span></button>
          ))}
          {ov.tags.length > 14 && <button style={{ ...ui.chip(false), borderStyle: "dashed" }} onClick={() => setMoreTags((v) => !v)}>{moreTags ? "접기" : `더 보기 (${ov.tags.length - 14})`}</button>}
          {ov.tags.length === 0 && <span style={{ fontSize: 12.5, color: ui.textSecondary }}>아직 꼬리표가 없어요.</span>}
        </div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <select value={f.sido || ""} onChange={(e) => setF({ ...f, sido: e.target.value })} style={ui.field}>
          <option value="">지역 전체</option>
          {ov.sido.map((s) => <option key={s.sido} value={s.sido}>{s.sido} ({s.n.toLocaleString()})</option>)}
        </select>
        {showStatus && (
          <select value={f.status || ""} onChange={(e) => setF({ ...f, status: e.target.value as CrmStatus | "" })} style={ui.field}>
            <option value="">문자 상태 전체</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s} ({(ov.status[s] || 0).toLocaleString()})</option>)}
          </select>
        )}
        <select value={f.member || ""} onChange={(e) => setF({ ...f, member: e.target.value as CrmFilter["member"] })} style={ui.field}>
          <option value="">공실뉴스 가입 상관없음</option>
          <option value="member">가입한 사람</option>
          <option value="nonmember">가입 안 한 사람</option>
          <option value="pro">공실뉴스부동산(유료)</option>
        </select>
      </div>
    </div>
  );
}

/** 받는 사람 휴대폰에 보이는 모양 */
export function PhonePreview({ text, type, ui }: { text: string; type: "SMS" | "LMS"; ui: UI }) {
  return (
    <div style={{ display: "flex", justifyContent: "center" }}>
      <div style={{ width: 260, borderRadius: 30, padding: "14px 10px 18px", background: "#111827", boxShadow: "0 10px 30px rgba(0,0,0,0.18)" }}>
        <div style={{ width: 70, height: 6, borderRadius: 3, background: "#374151", margin: "0 auto 10px" }} />
        <div style={{ borderRadius: 18, background: ui.darkMode ? "#1f2937" : "#f3f4f6", minHeight: 300, maxHeight: 460, overflowY: "auto", padding: "12px 10px" }}>
          <div style={{ textAlign: "center", fontSize: 11, color: "#6b7280", marginBottom: 8 }}>공실뉴스 · {type === "LMS" ? "장문" : "단문"}</div>
          <div style={{ background: ui.darkMode ? "#374151" : "#fff", color: ui.darkMode ? "#f9fafb" : "#111827", borderRadius: "14px 14px 14px 4px", padding: "10px 12px", fontSize: 12.5, lineHeight: 1.55, whiteSpace: "pre-wrap", wordBreak: "break-all", boxShadow: "0 1px 2px rgba(0,0,0,0.06)" }}>
            {text}
          </div>
        </div>
      </div>
    </div>
  );
}
