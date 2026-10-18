"use client";

// 최고관리자 — 받아쓰기 낱말장. 대표님들이 스튜디오 자동 자막에서 고친 "잘못 들린 말 → 고친 말"을 모아 본다 (회의 2026-10-18 3-18)
//  모두에게 쓰기: 서로 다른 회원 N명 이상이 올렸으면 저절로, 또는 여기서 [모두에게 쓰기]. [쓰지 않기]는 회원이 많아도 빼기
import React, { useEffect, useState } from "react";
import type { AdminTheme } from "./types";
import { decideSttWord, listSttWords } from "@/app/actions/sttWords";
import type { SttRow } from "@/lib/sttWords";

export default function SttWordsSection({ theme }: { theme: AdminTheme }) {
  const [rows, setRows] = useState<SttRow[] | null>(null);
  const [min, setMin] = useState(3);
  const [msg, setMsg] = useState("");
  const [q, setQ] = useState("");
  const [add, setAdd] = useState({ wrong: "", right: "" });
  const load = () =>
    listSttWords().then((r) => {
      if (!r.success) return setMsg(r.error || "불러오지 못했습니다.");
      setRows(r.rows || []);
      setMin(r.shareMin || 3);
    });
  useEffect(() => {
    load();
  }, []);
  const decide = async (w: string, r: string, s: "approved" | "rejected" | null) => {
    const res = await decideSttWord(w, r, s);
    setMsg(res.success ? (s === "approved" ? `"${w} → ${r}" 모든 대표님에게 써요` : s === "rejected" ? `"${w} → ${r}" 쓰지 않아요` : "결정을 지웠어요 (회원 수 기준으로)") : res.error || "실패했습니다.");
    load();
  };
  const shared = (r: SttRow) => r.status === "approved" || (r.status !== "rejected" && r.members >= min);
  const list = (rows || []).filter((r) => !q || r.wrong.includes(q) || r.right.includes(q));
  const cell: React.CSSProperties = { padding: "10px 12px", borderBottom: `1px solid ${theme.border}`, fontSize: 14, color: theme.textPrimary, verticalAlign: "middle" };
  const btn = (bg: string): React.CSSProperties => ({ padding: "6px 10px", borderRadius: 6, border: `1px solid ${theme.border}`, background: bg, color: bg === "transparent" ? theme.textPrimary : "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginRight: 6 });
  const input: React.CSSProperties = { padding: "8px 10px", borderRadius: 6, border: `1px solid ${theme.border}`, background: theme.cardBg, color: theme.textPrimary, fontSize: 14, fontFamily: "inherit" };
  return (
    <div style={{ flex: 1, margin: 16, marginBottom: 0, padding: "22px 26px", overflowY: "auto", background: theme.cardBg, borderTopLeftRadius: 12, borderTopRightRadius: 12, boxShadow: "0 4px 6px rgba(0,0,0,0.05)" }}>
      <h2 style={{ margin: 0, fontSize: 21, fontWeight: 800, color: theme.textPrimary }}>받아쓰기 낱말장</h2>
      <p style={{ margin: "8px 0 18px", fontSize: 14, color: theme.textSecondary, lineHeight: 1.7 }}>
        대표님들이 스튜디오 자동 자막에서 고친 낱말이 모입니다 (녹음·대본은 받지 않고 낱말만). 고친 대표님 PC 에는 바로 쓰이고,<br />
        <b style={{ color: theme.textPrimary }}>서로 다른 회원 {min}명 이상</b>이 같은 고침을 올렸거나 여기서 <b style={{ color: theme.textPrimary }}>[모두에게 쓰기]</b>를 누르면 모든 대표님 앱에 쓰입니다.
      </p>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 14 }}>
        <input value={add.wrong} onChange={(e) => setAdd({ ...add, wrong: e.target.value })} placeholder="잘못 들린 말 (예: 남양입니다)" style={{ ...input, width: 220 }} />
        <span style={{ color: theme.textSecondary }}>→</span>
        <input value={add.right} onChange={(e) => setAdd({ ...add, right: e.target.value })} placeholder="고칠 말 (예: 남향입니다)" style={{ ...input, width: 220 }} />
        <button type="button" style={btn("#2563eb")} onClick={async () => { await decide(add.wrong, add.right, "approved"); setAdd({ wrong: "", right: "" }); }}>모두에게 쓰기로 넣기</button>
        <span style={{ flex: 1 }} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="찾기" style={{ ...input, width: 160 }} />
      </div>
      {msg && <div style={{ marginBottom: 12, fontSize: 14, color: theme.textPrimary }}>{msg}</div>}
      <div style={{ fontSize: 13, color: theme.textSecondary, marginBottom: 8 }}>
        잘못 들린 말은 낱말 앞이 띄어쓰기·문장 처음일 때만 바뀝니다 (예: ‘남양’ → ‘남향’으로 넣으면 ‘남양주’도 바뀌니, ‘남양입니다’처럼 길게 넣는 게 안전해요).
      </div>
      {rows === null ? (
        <div style={{ color: theme.textSecondary, padding: 20 }}>불러오는 중…</div>
      ) : list.length === 0 ? (
        <div style={{ color: theme.textSecondary, padding: 20 }}>아직 모인 낱말이 없습니다. (DB 표가 없으면 supabase/migrations/20261018_stt_word_fixes.sql 을 먼저 적용해 주세요)</div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["잘못 들린 말", "고친 말", "올린 회원", "앞뒤 글", "지금", ""].map((h) => (
                <th key={h} style={{ ...cell, textAlign: "left", fontWeight: 800, color: theme.textSecondary, fontSize: 13 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.map((r) => (
              <tr key={`${r.wrong}\n${r.right}`}>
                <td style={cell}>{r.wrong}</td>
                <td style={{ ...cell, fontWeight: 700 }}>{r.right}</td>
                <td style={cell}>{r.members}명</td>
                <td style={{ ...cell, color: theme.textSecondary, fontSize: 13 }}>{r.context}</td>
                <td style={cell}>
                  {shared(r) ? <span style={{ color: "#16a34a", fontWeight: 800 }}>모두에게 쓰는 중</span> : r.status === "rejected" ? <span style={{ color: "#dc2626", fontWeight: 700 }}>쓰지 않음</span> : <span style={{ color: theme.textSecondary }}>모으는 중</span>}
                  {r.status && <span style={{ fontSize: 12, color: theme.textSecondary }}> (관리자 결정)</span>}
                </td>
                <td style={{ ...cell, whiteSpace: "nowrap" }}>
                  {r.status !== "approved" && <button type="button" style={btn("#16a34a")} onClick={() => decide(r.wrong, r.right, "approved")}>모두에게 쓰기</button>}
                  {r.status !== "rejected" && <button type="button" style={btn("#dc2626")} onClick={() => decide(r.wrong, r.right, "rejected")}>쓰지 않기</button>}
                  {r.status && <button type="button" style={btn("transparent")} onClick={() => decide(r.wrong, r.right, null)}>결정 지우기</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
