"use client";

/**
 * 최고관리자 — 회원에게 문자 (2026-11-09, docs/2026-11-09_superadmin_page_plan.md ③ 회원에게 연락)
 *  예전 화면은 예시 값(잔액·지역별 숫자·주소록·엑셀 1,250명·가짜 발송 완료)뿐이라 실제 회원 기반으로 새로 만들었다.
 *  - [안내 문자] 정보성 (만료·공지·새 기능) — 수신 동의 없이 보낼 수 있다
 *  - [광고 문자] 수신 동의한 회원만 · 맨 앞 (광고)공실뉴스 · 끝에 수신거부 · 밤 9시~아침 8시 못 보냄 (서버가 붙이고 막는다)
 *  - [보낸 기록] message_logs 실제 기록
 *  - 저장 문자는 이 브라우저에만 (localStorage)
 *  - 예약 발송은 아직 없다 (가짜로 성공을 보여 주지 않는다)
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AdminTheme } from "./types";
import {
  adminFindRecipients, adminSendMemberSms, adminGetMessageLogs, adminPreviewMessage,
  type AudienceMember, type AudienceTier, type MessageLog,
} from "@/app/actions/adminMessage";

interface MarketingSectionProps {
  theme: AdminTheme;
}

type Tab = "info" | "ad" | "logs";
type Saved = { id: string; title: string; content: string; date: string };

const SAVED_KEY = "gs-admin-sms-saved";
const NAVY = "#1e3a6e";

const TIER_LABEL: Record<string, string> = { user: "일반회원", free: "부동산회원 (무료)", pro: "공실뉴스부동산 (유료)", biz: "비즈니스회원" };
const TIER_OPTIONS: { key: AudienceTier; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "free", label: "부동산회원 (무료)" },
  { key: "pro", label: "공실뉴스부동산 (유료)" },
  { key: "biz", label: "비즈니스회원" },
  { key: "user", label: "일반회원" },
];

function byteLength(str: string) {
  let b = 0;
  for (let i = 0; i < str.length; i++) b += str.charCodeAt(i) >> 7 ? 2 : 1;
  return b;
}
function loadSaved(): Saved[] {
  try { const v = JSON.parse(localStorage.getItem(SAVED_KEY) || "[]"); return Array.isArray(v) ? v : []; } catch { return []; }
}
function storeSaved(list: Saved[]) {
  try { localStorage.setItem(SAVED_KEY, JSON.stringify(list)); } catch {}
}
function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function MarketingSection({ theme }: MarketingSectionProps) {
  const { cardBg, textPrimary, textSecondary, border, darkMode } = theme;
  const [tab, setTab] = useState<Tab>("info");
  const isAd = tab === "ad";

  // 글
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [preview, setPreview] = useState<{ text: string; type: "SMS" | "LMS" } | null>(null);

  // 받는 사람 조건
  const [tier, setTier] = useState<AudienceTier>("all");
  const [joinedFrom, setJoinedFrom] = useState("");
  const [joinedTo, setJoinedTo] = useState("");
  const [expiringSoon, setExpiringSoon] = useState(false);
  const [found, setFound] = useState<AudienceMember[] | null>(null);
  const [consentMissing, setConsentMissing] = useState(false);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [finding, setFinding] = useState(false);
  const [findErr, setFindErr] = useState("");

  // 보내기
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  // 저장 문자 · 보낸 기록
  const [saved, setSaved] = useState<Saved[]>([]);
  const [savedOpen, setSavedOpen] = useState(false);
  const [logs, setLogs] = useState<MessageLog[]>([]);
  const [logsState, setLogsState] = useState<"idle" | "loading" | "missing" | "error" | "done">("idle");
  const [logsErr, setLogsErr] = useState("");

  useEffect(() => { setSaved(loadSaved()); }, []);

  // 탭이 바뀌면 받는 사람을 다시 찾게 한다 (광고는 동의자만이라 결과가 달라진다)
  useEffect(() => { setFound(null); setChecked(new Set()); setResult(null); }, [tab]);

  // 실제로 나갈 글 미리 보기 (광고 문구는 서버가 붙인다)
  useEffect(() => {
    if (tab === "logs") return;
    if (!content.trim()) { setPreview(null); return; }
    let alive = true;
    const t = setTimeout(() => { void adminPreviewMessage(content, isAd).then((p) => { if (alive) setPreview(p); }); }, 250);
    return () => { alive = false; clearTimeout(t); };
  }, [content, isAd, tab]);

  const loadLogs = useCallback(async () => {
    setLogsState("loading");
    const r = await adminGetMessageLogs(100);
    if (r.success) { setLogs(r.logs); setLogsState("done"); }
    else if (r.missingTable) setLogsState("missing");
    else { setLogsErr(r.error || ""); setLogsState("error"); }
  }, []);
  useEffect(() => { if (tab === "logs") void loadLogs(); }, [tab, loadLogs]);

  const find = async () => {
    setFinding(true); setFindErr(""); setResult(null);
    const r = await adminFindRecipients({ tier, joinedFrom: joinedFrom || undefined, joinedTo: joinedTo || undefined, expiringSoon, isAd });
    setFinding(false);
    if (!r.success) { setFindErr(r.error || "회원을 불러오지 못했어요."); return; }
    setFound(r.members);
    setConsentMissing(r.consentMissing);
    setChecked(new Set(r.members.map((m) => m.id)));
  };

  const count = checked.size;
  const sendText = preview?.text || content;
  const msgType = preview?.type || (byteLength(content) > 90 ? "LMS" : "SMS");

  const send = async () => {
    if (!content.trim()) { alert("보낼 내용을 써 주세요."); return; }
    if (!count) { alert("받는 사람을 골라 주세요."); return; }
    const ok = window.confirm(
      `[보내기 확인]\n\n종류: ${isAd ? "광고 문자" : "안내 문자 (정보성)"} · ${msgType === "LMS" ? "장문" : "단문"}\n받는 사람: ${count.toLocaleString()}명\n\n정말 보낼까요? 보낸 뒤에는 되돌릴 수 없어요.`
    );
    if (!ok) return;
    setSending(true); setResult(null);
    const r = await adminSendMemberSms({ memberIds: Array.from(checked), content, subject: subject || undefined, isAd });
    setSending(false);
    if (r.accepted > 0) {
      setResult({ ok: true, text: `${r.accepted.toLocaleString()}명에게 보냈어요${r.failed ? ` · ${r.failed.toLocaleString()}명은 못 보냈어요` : ""}.${r.warning ? ` ${r.warning}` : ""}${r.error ? ` (${r.error})` : ""}` });
    } else {
      setResult({ ok: false, text: r.error || "보내지 못했어요." });
    }
  };

  const saveCurrent = () => {
    if (!content.trim()) { alert("저장할 내용을 써 주세요."); return; }
    const title = window.prompt("저장할 이름", subject || content.trim().split("\n")[0].slice(0, 20));
    if (title === null) return;
    const next = [{ id: `s_${Date.now()}`, title: title.trim() || "저장한 문자", content, date: new Date().toISOString() }, ...saved];
    setSaved(next); storeSaved(next);
  };
  const removeSaved = (id: string) => {
    if (!window.confirm("이 저장 문자를 지울까요?")) return;
    const next = saved.filter((s) => s.id !== id);
    setSaved(next); storeSaved(next);
  };

  const allChecked = !!found && found.length > 0 && found.every((m) => checked.has(m.id));
  const toggleAll = () => setChecked(allChecked ? new Set() : new Set((found || []).map((m) => m.id)));
  const toggleOne = (id: string) => setChecked((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const inputBg = darkMode ? "#202124" : "#fff";
  const field: React.CSSProperties = { height: 36, padding: "0 10px", border: `1px solid ${border}`, borderRadius: 6, background: inputBg, color: textPrimary, fontSize: 13, fontFamily: "inherit" };
  const card: React.CSSProperties = { background: cardBg, border: `1px solid ${border}`, borderRadius: 8, padding: "18px 20px" };
  const label: React.CSSProperties = { fontSize: 12.5, fontWeight: 800, color: textPrimary, marginBottom: 6 };
  const secBtn: React.CSSProperties = { height: 32, padding: "0 12px", border: `1px solid ${border}`, borderRadius: 5, background: inputBg, color: textPrimary, fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" };

  const tabs: { key: Tab; label: string }[] = [
    { key: "info", label: "안내 문자" },
    { key: "ad", label: "광고 문자" },
    { key: "logs", label: "보낸 기록" },
  ];

  const sortedFound = useMemo(() => found || [], [found]);

  return (
    <div style={{ padding: "20px 32px", height: "calc(100vh - 64px)", overflowY: "auto", background: darkMode ? "#18191c" : "#f4f5f7" }}>
      <div style={{ width: "100%", maxWidth: 1200, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderBottom: `1px solid ${border}`, paddingBottom: 12 }}>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: textPrimary, margin: 0 }}>회원에게 문자</h1>
          <span style={{ fontSize: 12.5, color: textSecondary }}>뿌리오로 실제 발송돼요 · 문자 요금은 뿌리오 잔액에서 나가요</span>
        </div>

        <div style={{ display: "flex", gap: 2, borderBottom: `2px solid ${darkMode ? "#333" : "#e5e7eb"}` }}>
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{ padding: "10px 22px", fontSize: 14, fontWeight: 800, cursor: "pointer", border: "none", background: "none", fontFamily: "inherit",
                color: tab === t.key ? NAVY : textSecondary, borderBottom: tab === t.key ? `3px solid ${NAVY}` : "3px solid transparent", marginBottom: -2 }}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === "logs" ? (
          <div style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: textPrimary }}>보낸 기록</div>
              <button style={secBtn} onClick={() => void loadLogs()}>새로고침</button>
            </div>
            {logsState === "loading" && <div style={{ padding: 30, textAlign: "center", color: textSecondary }}>불러오는 중…</div>}
            {logsState === "missing" && <div style={{ padding: 30, textAlign: "center", color: textSecondary, lineHeight: 1.7 }}>보낸 기록 표가 아직 없어요.<br />Supabase SQL Editor 에서 <b>supabase/migrations/20261109_message_logs.sql</b> 을 실행해 주세요.</div>}
            {logsState === "error" && <div style={{ padding: 30, textAlign: "center", color: "#dc2626" }}>기록을 불러오지 못했어요. {logsErr}</div>}
            {logsState === "done" && logs.length === 0 && <div style={{ padding: 30, textAlign: "center", color: textSecondary }}>아직 보낸 문자가 없어요.</div>}
            {logsState === "done" && logs.length > 0 && (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${border}`, color: textSecondary, textAlign: "left" }}>
                    <th style={{ padding: "8px 6px", width: 140 }}>보낸 때</th>
                    <th style={{ padding: "8px 6px", width: 70 }}>종류</th>
                    <th style={{ padding: "8px 6px" }}>내용</th>
                    <th style={{ padding: "8px 6px", width: 120, textAlign: "right" }}>보냄 / 받는 사람</th>
                    <th style={{ padding: "8px 6px", width: 60 }} />
                  </tr>
                </thead>
                <tbody>
                  {logs.map((l) => (
                    <tr key={l.id} style={{ borderBottom: `1px solid ${border}`, color: textPrimary, verticalAlign: "top" }}>
                      <td style={{ padding: "10px 6px", whiteSpace: "nowrap" }}>{fmtDate(l.created_at)}</td>
                      <td style={{ padding: "10px 6px" }}><span style={{ fontSize: 11.5, fontWeight: 800, padding: "2px 6px", borderRadius: 4, background: l.is_ad ? "#fef3c7" : "#eef1f7", color: l.is_ad ? "#92400e" : NAVY }}>{l.is_ad ? "광고" : "안내"}</span></td>
                      <td style={{ padding: "10px 6px", whiteSpace: "pre-wrap", lineHeight: 1.5, maxWidth: 560 }}>{l.subject ? <b>{l.subject}<br /></b> : null}{l.content.length > 160 ? `${l.content.slice(0, 160)}…` : l.content}</td>
                      <td style={{ padding: "10px 6px", textAlign: "right", whiteSpace: "nowrap" }}>{l.success_count.toLocaleString()} / {l.recipient_count.toLocaleString()}{l.fail_count ? <div style={{ fontSize: 11.5, color: "#dc2626" }}>못 보냄 {l.fail_count.toLocaleString()}</div> : null}</td>
                      <td style={{ padding: "10px 6px" }}><button style={{ ...secBtn, height: 26, padding: "0 8px", fontSize: 11.5 }} onClick={() => { setTab(l.is_ad ? "ad" : "info"); setSubject(l.subject || ""); setContent(l.is_ad ? l.content.replace(/^\(광고\)공실뉴스\n/, "").replace(/\n\n수신거부:[^\n]*$/, "") : l.content); }}>다시 쓰기</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : (
          <>
            <div style={{ padding: "10px 14px", borderRadius: 6, fontSize: 12.5, lineHeight: 1.6, background: isAd ? "#fff7ed" : "#eef1f7", color: isAd ? "#9a3412" : NAVY, border: `1px solid ${isAd ? "#fed7aa" : "#d6dcea"}` }}>
              {isAd
                ? "광고 문자: 문자 수신에 동의한 회원에게만 가요. 맨 앞에 \"(광고)공실뉴스\", 끝에 수신거부 방법이 저절로 붙어요. 밤 9시부터 아침 8시까지는 보낼 수 없어요."
                : "안내 문자: 이용 기간 만료·공지·새 기능처럼 회원에게 꼭 알릴 내용이에요. 홍보·할인·가입 권유는 [광고 문자]로 보내 주세요."}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 16, alignItems: "start" }}>
              {/* 왼쪽 — 글 */}
              <div style={card}>
                <div style={label}>제목 <span style={{ fontWeight: 500, color: textSecondary }}>(장문일 때만 보여요)</span></div>
                <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="예: 이용 기간 안내" style={{ ...field, width: "100%", boxSizing: "border-box" }} />
                <div style={{ ...label, marginTop: 14 }}>내용</div>
                <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={10}
                  placeholder={isAd ? "알릴 내용만 쓰세요. (광고) 표시와 수신거부 문구는 저절로 붙어요." : "회원에게 알릴 내용을 쓰세요."}
                  style={{ width: "100%", boxSizing: "border-box", padding: 10, border: `1px solid ${border}`, borderRadius: 6, background: inputBg, color: textPrimary, fontSize: 13.5, lineHeight: 1.6, fontFamily: "inherit", resize: "vertical" }} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button style={secBtn} onClick={() => setSavedOpen((v) => !v)}>저장 문자 {saved.length ? `(${saved.length})` : ""}</button>
                    <button style={secBtn} onClick={saveCurrent}>지금 글 저장</button>
                  </div>
                  <span style={{ fontSize: 12, color: textSecondary }}>{byteLength(sendText)} byte · {msgType === "LMS" ? "장문" : "단문"}</span>
                </div>
                {savedOpen && (
                  <div style={{ marginTop: 10, border: `1px solid ${border}`, borderRadius: 6, maxHeight: 240, overflowY: "auto" }}>
                    {saved.length === 0 && <div style={{ padding: 16, fontSize: 12.5, color: textSecondary, textAlign: "center" }}>저장한 문자가 없어요. (이 브라우저에만 저장돼요)</div>}
                    {saved.map((s) => (
                      <div key={s.id} onClick={() => { setSubject(s.title); setContent(s.content); setSavedOpen(false); }}
                        style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "10px 12px", borderBottom: `1px solid ${border}`, cursor: "pointer" }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: textPrimary }}>{s.title}</div>
                          <div style={{ fontSize: 12, color: textSecondary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.content.replace(/\n/g, " ")}</div>
                        </div>
                        <span style={{ fontSize: 11, color: textSecondary, whiteSpace: "nowrap" }}>{fmtDate(s.date)}</span>
                        <button onClick={(e) => { e.stopPropagation(); removeSaved(s.id); }} title="지우기" style={{ border: "none", background: "none", color: textSecondary, cursor: "pointer", fontSize: 14 }}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
                {preview && (
                  <>
                    <div style={{ ...label, marginTop: 16 }}>실제로 나가는 글</div>
                    <div style={{ whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.6, padding: 12, borderRadius: 10, background: darkMode ? "#2a2b2f" : "#f1f5f9", color: textPrimary }}>{preview.text}</div>
                  </>
                )}
              </div>

              {/* 오른쪽 — 받는 사람 */}
              <div style={card}>
                <div style={{ fontSize: 15, fontWeight: 800, color: textPrimary, marginBottom: 12 }}>받는 사람 — 회원에서 고르기</div>
                <div style={label}>등급</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {TIER_OPTIONS.map((o) => (
                    <button key={o.key} onClick={() => setTier(o.key)}
                      style={{ ...secBtn, background: tier === o.key ? NAVY : inputBg, color: tier === o.key ? "#fff" : textPrimary, borderColor: tier === o.key ? NAVY : border }}>{o.label}</button>
                  ))}
                </div>
                <div style={{ ...label, marginTop: 14 }}>가입일</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <input type="date" value={joinedFrom} onChange={(e) => setJoinedFrom(e.target.value)} style={field} />
                  <span style={{ color: textSecondary }}>~</span>
                  <input type="date" value={joinedTo} onChange={(e) => setJoinedTo(e.target.value)} style={field} />
                  {(joinedFrom || joinedTo) && <button style={secBtn} onClick={() => { setJoinedFrom(""); setJoinedTo(""); }}>지우기</button>}
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 14, fontSize: 13, color: textPrimary, cursor: "pointer" }}>
                  <input type="checkbox" checked={expiringSoon} onChange={(e) => setExpiringSoon(e.target.checked)} />
                  공실뉴스부동산 이용 기간이 30일 안에 끝나는 회원만
                </label>
                <div style={{ fontSize: 12, color: textSecondary, marginTop: 8 }}>
                  휴대폰 번호가 있는 회원만 · 휴지통 회원 제외{isAd ? " · 문자 수신 동의한 회원만" : ""}
                </div>
                <button onClick={() => void find()} disabled={finding}
                  style={{ width: "100%", height: 38, marginTop: 14, border: "none", borderRadius: 6, background: NAVY, color: "#fff", fontSize: 13.5, fontWeight: 800, cursor: finding ? "default" : "pointer", fontFamily: "inherit" }}>
                  {finding ? "찾는 중…" : "회원 찾기"}
                </button>
                {findErr && <div style={{ marginTop: 8, fontSize: 12.5, color: "#dc2626" }}>{findErr}</div>}
                {isAd && consentMissing && found && (
                  <div style={{ marginTop: 10, fontSize: 12.5, lineHeight: 1.6, color: "#9a3412", background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 6, padding: "8px 10px" }}>
                    아직 회원 정보에 <b>문자 수신 동의</b> 칸이 없어 광고 문자를 보낼 수 있는 회원이 없어요. 동의 칸을 만든 뒤 동의한 회원에게만 보낼 수 있어요.
                  </div>
                )}

                {found && (
                  <div style={{ marginTop: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: textPrimary, cursor: "pointer" }}>
                        <input type="checkbox" checked={allChecked} onChange={toggleAll} disabled={!found.length} /> 모두
                      </label>
                      <span style={{ fontSize: 13, color: textPrimary }}><b>{count.toLocaleString()}</b>명 고름 / 찾은 회원 {found.length.toLocaleString()}명</span>
                    </div>
                    <div style={{ border: `1px solid ${border}`, borderRadius: 6, maxHeight: 280, overflowY: "auto" }}>
                      {sortedFound.length === 0 && <div style={{ padding: 16, fontSize: 12.5, color: textSecondary, textAlign: "center" }}>조건에 맞는 회원이 없어요.</div>}
                      {sortedFound.map((m) => (
                        <label key={m.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderBottom: `1px solid ${border}`, fontSize: 13, color: textPrimary, cursor: "pointer" }}>
                          <input type="checkbox" checked={checked.has(m.id)} onChange={() => toggleOne(m.id)} />
                          <span style={{ flex: 1 }}>{m.name}</span>
                          <span style={{ fontSize: 11.5, color: textSecondary }}>{TIER_LABEL[m.tier] || ""}</span>
                          <span style={{ fontSize: 12, color: textSecondary, width: 56, textAlign: "right" }}>…{m.phoneTail}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${border}` }}>
                  <div style={{ fontSize: 12, color: textSecondary, marginBottom: 8 }}>예약 발송은 아직 준비 중이에요 — 지금 바로 보내기만 돼요.</div>
                  <button onClick={() => void send()} disabled={sending || !count || !content.trim()}
                    style={{ width: "100%", height: 46, border: "none", borderRadius: 6, fontSize: 15, fontWeight: 800, fontFamily: "inherit",
                      background: sending || !count || !content.trim() ? "#9aa6b8" : NAVY, color: "#fff", cursor: sending || !count || !content.trim() ? "default" : "pointer" }}>
                    {sending ? "보내는 중…" : `${count ? `${count.toLocaleString()}명에게 ` : ""}${isAd ? "광고 문자" : "안내 문자"} 보내기`}
                  </button>
                  {result && <div style={{ marginTop: 8, fontSize: 13, fontWeight: 700, lineHeight: 1.5, color: result.ok ? "#16a34a" : "#dc2626" }}>{result.text}</div>}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
