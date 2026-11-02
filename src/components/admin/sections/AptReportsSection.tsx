"use client";

// 최고관리자 — 시세 지도 단지 정보 수정 요청 (2026-11-02 사장님)
//  공실등록 때 넣은 공급·전용㎡(공공 자료와 다른 것) + 부동산 회원의 [정보 수정 요청]이 모인다. [반영]하면 지도·상세 창에 바로 쓰인다.
//  공공 자료에 없는 공급면적을 서로 다른 부동산 2곳 이상이 같은 값으로 넣은 것은 저절로 반영돼 "반영함"에 있다.
import React, { useEffect, useState } from "react";
import type { AdminTheme } from "./types";
import { adminSetAptInfo, decideAptReport, listAptReports, type AptReportRow } from "@/app/actions/aptReports";

const LABEL: Record<string, string> = {
  capture: "캡처 요청", supply: "공급면적", contract: "계약면적", rooms: "방/욕실", useAprDay: "사용승인일", vlRat: "용적률", bcRat: "건폐율", households: "세대수", dongs: "동수", topFloor: "최고층", parking: "주차대수", heating: "난방", hall: "구조", builder: "시공사",
};

/** 캡처를 보고 값을 직접 넣어 바로 반영 — 여러 항목이면 하나씩 넣고 마지막에 [처리 완료] */
const SET_FIELDS = ["supply", "contract", "rooms", "households", "dongs", "topFloor", "parking", "useAprDay", "vlRat", "bcRat", "heating", "hall", "builder"];
const PER_AREA = ["supply", "contract", "rooms"];
function AdminSetForm({ complexId, theme, onDone, onApplied }: { complexId: string; theme: AdminTheme; onDone: (msg: string) => void; onApplied?: () => void }) {
  const [field, setField] = useState("households");
  const [ex, setEx] = useState("");
  const [value, setValue] = useState("");
  const input: React.CSSProperties = { padding: "5px 8px", borderRadius: 6, border: `1px solid ${theme.border}`, background: theme.cardBg, color: theme.textPrimary, fontSize: 13, fontFamily: "inherit" };
  const save = async () => {
    const r = await adminSetAptInfo({ complexId, field, exArea: PER_AREA.includes(field) ? Number(ex) : null, value });
    onDone(r.success ? `${LABEL[field]} ${value} — 반영했어요` : r.error || "실패했습니다.");
    if (r.success) onApplied?.();
    if (r.success) setValue("");
  };
  return (
    <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap", alignItems: "center" }}>
      <select value={field} onChange={(e) => setField(e.target.value)} style={input}>
        {SET_FIELDS.map((k) => <option key={k} value={k}>{LABEL[k]}</option>)}
      </select>
      {PER_AREA.includes(field) && <input value={ex} onChange={(e) => setEx(e.target.value)} placeholder="전용㎡" style={{ ...input, width: 72 }} />}
      <input value={value} onChange={(e) => setValue(e.target.value)} placeholder={field === "useAprDay" ? "20060630" : "값"} style={{ ...input, width: 110 }} />
      <button type="button" onClick={save} style={{ padding: "5px 10px", borderRadius: 6, border: "none", background: "#2563eb", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>값 반영</button>
    </div>
  );
}

export default function AptReportsSection({ theme }: { theme: AdminTheme }) {
  const [status, setStatus] = useState<"pending" | "approved" | "rejected">("pending");
  const [rows, setRows] = useState<AptReportRow[] | null>(null);
  const [msg, setMsg] = useState("");
  const load = () => {
    setRows(null);
    listAptReports(status).then((r) => (r.success ? setRows(r.rows || []) : (setMsg(r.error || "불러오지 못했습니다."), setRows([]))));
  };
  useEffect(load, [status]); // eslint-disable-line react-hooks/exhaustive-deps
  const [applied, setApplied] = useState<Set<number>>(new Set()); // 캡처 요청에서 [값 반영]을 한 줄
  const decide = async (r: AptReportRow, ok: boolean) => {
    // 캡처 요청은 [처리 완료]만으로는 값이 안 들어간다 — 값을 하나도 안 넣었으면 한 번 묻는다 (2026-11-02)
    if (ok && r.field === "capture" && !applied.has(r.id) && !window.confirm("아직 값을 넣지 않았습니다. 지도에는 아무것도 바뀌지 않는데 처리 완료할까요?\n(캡처를 보고 아래 칸에 항목·값을 넣어 [값 반영]을 먼저 누르세요)")) return;
    const res = await decideAptReport(r.id, ok);
    setMsg(res.success ? `${r.complex_name} ${LABEL[r.field] || r.field} — ${ok ? "반영했어요" : "반영하지 않기로 했어요"}` : res.error || "실패했습니다.");
    load();
  };
  const cell: React.CSSProperties = { padding: "10px 12px", borderBottom: `1px solid ${theme.border}`, fontSize: 14, color: theme.textPrimary, verticalAlign: "top" };
  const btn = (bg: string): React.CSSProperties => ({ padding: "6px 10px", borderRadius: 6, border: `1px solid ${theme.border}`, background: bg, color: bg === "transparent" ? theme.textPrimary : "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginRight: 6 });
  const tab = (k: typeof status, label: string) => (
    <button type="button" onClick={() => setStatus(k)} style={{ ...btn(status === k ? "#2563eb" : "transparent"), marginRight: 8 }}>{label}</button>
  );
  return (
    <div style={{ flex: 1, margin: 16, marginBottom: 0, padding: "22px 26px", overflowY: "auto", background: theme.cardBg, borderTopLeftRadius: 12, borderTopRightRadius: 12, boxShadow: "0 4px 6px rgba(0,0,0,0.05)" }}>
      <h2 style={{ margin: 0, fontSize: 21, fontWeight: 800, color: theme.textPrimary }}>단지 정보 요청</h2>
      <p style={{ margin: "8px 0 18px", fontSize: 14, color: theme.textSecondary, lineHeight: 1.7 }}>
        공실열람 시세 지도 단지 창의 <b style={{ color: theme.textPrimary }}>[정보 수정 요청]</b>이 모입니다 (공실등록 값은 쓰지 않습니다).<br />
        숫자·글 요청은 접수 때 자동 심사해 맞으면 바로 반영하고, 캡처 요청은 1시간마다 클로드가 읽고 심사해 반영합니다. 여기에는 판단이 어려운 것만 남습니다. 실거래 가격은 고치지 않습니다.
      </p>
      <div style={{ marginBottom: 14 }}>{tab("pending", "확인 기다림")}{tab("approved", "반영함")}{tab("rejected", "반영 안 함")}</div>
      {msg && <div style={{ marginBottom: 12, fontSize: 14, color: theme.textPrimary }}>{msg}</div>}
      {rows === null ? (
        <div style={{ color: theme.textSecondary, padding: 20 }}>불러오는 중…</div>
      ) : rows.length === 0 ? (
        <div style={{ color: theme.textSecondary, padding: 20 }}>없습니다. (DB 표가 없으면 supabase/migrations/20261102_apt_info_reports.sql 을 먼저 적용해 주세요)</div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>{["단지", "항목", "지금 값", "요청 값", "근거", "보낸 곳", "날짜", ""].map((h) => <th key={h} style={{ ...cell, fontWeight: 700, color: theme.textSecondary, textAlign: "left" }}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td style={cell}>{r.complex_name}</td>
                <td style={cell}>{LABEL[r.field] || r.field}{r.ex_area ? <div style={{ fontSize: 12, color: theme.textSecondary }}>전용 {r.ex_area}㎡</div> : null}</td>
                <td style={cell}>{r.current}</td>
                <td style={{ ...cell, fontWeight: r.field === "capture" ? 500 : 800, maxWidth: 320, whiteSpace: "pre-wrap" }}>
                  {r.value}{r.field === "supply" || r.field === "contract" ? "㎡" : ""}
                  {/* 캡처 첨부 — 누르면 크게 (WebP 로 압축해 받은 것) */}
                  {r.images.length > 0 && (
                    <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                      {r.images.map((src) => (
                        <a key={src} href={src} target="_blank" rel="noreferrer">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={src} alt="첨부 캡처" style={{ width: 96, height: 96, objectFit: "cover", borderRadius: 6, border: `1px solid ${theme.border}` }} />
                        </a>
                      ))}
                    </div>
                  )}
                  {r.field === "capture" && status === "pending" && <AdminSetForm complexId={r.complex_id} theme={theme} onDone={(m) => setMsg(m)} onApplied={() => setApplied((v) => new Set(v).add(r.id))} />}
                </td>
                <td style={{ ...cell, maxWidth: 260, color: theme.textSecondary }}>{r.note || "-"}</td>
                <td style={cell}>{r.member_name}<div style={{ fontSize: 12, color: theme.textSecondary }}>{r.source === "vacancy" ? "공실등록 값" : "수정 요청"}</div></td>
                <td style={{ ...cell, whiteSpace: "nowrap" }}>{r.created_at.slice(0, 10)}</td>
                <td style={{ ...cell, whiteSpace: "nowrap" }}>
                  {status !== "approved" && <button type="button" style={btn("#16a34a")} onClick={() => decide(r, true)}>{r.field === "capture" ? "처리 완료" : "반영"}</button>}
                  {status === "pending" && <button type="button" style={btn("#6b7280")} onClick={() => decide(r, false)}>반영 안 함</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
