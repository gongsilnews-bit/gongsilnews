"use client";

/**
 * 공실뉴스 홍보 달력 · 홍보현황 (2026-11-09 사장님 회의 — docs/2026-11-09_superadmin_page_plan.md ②)
 *  공실뉴스 회사 채널 6곳 × 이번 주 7일. 칸을 누르면 그날 그 채널에 올린 글 기록(제목·주소·메모)
 *  링크 꼬리표(?ref=채널-날짜)를 만들어 복사 → 그 링크로 가입하면 members.signup_ref 에 같은 값 → 홍보현황에 가입 수
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { AdminTheme } from "./types";
import { addPromoPost, deletePromoPost, listPromoPosts, listRecentPromoPosts, type PromoPost } from "@/app/actions/promoPosts";

const NAVY = "#1e3a6e";
const CHANNELS = [
  { key: "youtube", label: "유튜브" },
  { key: "blog", label: "블로그" },
  { key: "instagram", label: "인스타" },
  { key: "threads", label: "스레드" },
  { key: "facebook", label: "페이스북" },
  { key: "kakao", label: "카카오 채널" },
] as const;
const chLabel = (k: string) => CHANNELS.find((c) => c.key === k)?.label || k;
const DOW = ["월", "화", "수", "목", "금", "토", "일"];
const SITE = "https://www.gongsilnews.com";

const KST = 9 * 60 * 60 * 1000;
const kstDay = (t: number) => new Date(t + KST).toISOString().slice(0, 10);
/** 한국 시간 기준 그 주 월요일 */
function mondayOf(t: number) {
  const dow = (new Date(t + KST).getUTCDay() + 6) % 7;
  return kstDay(t - dow * 86400000);
}
const addDays = (day: string, n: number) => kstDay(new Date(`${day}T00:00:00+09:00`).getTime() + n * 86400000);

export default function PromoCalendarSection({ theme }: { theme: AdminTheme; adminId: string }) {
  const [thisMonday] = useState(() => mondayOf(Date.now()));
  const [today] = useState(() => kstDay(Date.now()));
  const [weekStart, setWeekStart] = useState(thisMonday);
  const [posts, setPosts] = useState<PromoPost[]>([]);
  const [recent, setRecent] = useState<PromoPost[]>([]);
  const [missing, setMissing] = useState(false);
  const [err, setErr] = useState("");
  const [open, setOpen] = useState<{ day: string; channel: string } | null>(null);

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const load = useCallback(async () => {
    setErr("");
    const [w, r] = await Promise.all([listPromoPosts(weekStart, addDays(weekStart, 6)), listRecentPromoPosts(30)]);
    setMissing(Boolean(w.missing || r.missing));
    if (!w.success && !w.missing) setErr(w.error || "불러오지 못했어요");
    setPosts(w.posts);
    setRecent(r.posts);
  }, [weekStart]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const cell = (day: string, ch: string) => posts.filter((p) => p.posted_on === day && p.channel === ch);
  const filled = days.reduce((n, d) => n + CHANNELS.filter((c) => cell(d, c.key).length > 0).length, 0);

  const dark = theme.darkMode;
  const card: React.CSSProperties = { background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: 8, padding: "18px 20px" };
  const accent = dark ? "#93c5fd" : NAVY;
  const btn: React.CSSProperties = { height: 32, padding: "0 12px", borderRadius: 6, border: `1px solid ${theme.border}`, background: theme.cardBg, color: theme.textPrimary, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" };

  return (
    <div style={{ flex: 1, padding: "22px 28px 40px", overflowY: "auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 21, fontWeight: 900, color: theme.textPrimary }}>홍보 달력</h1>
          <div style={{ marginTop: 4, fontSize: 13, color: theme.textSecondary }}>공실뉴스 채널 6곳에 올린 글을 날마다 적어 두는 곳</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button style={btn} onClick={() => setWeekStart(addDays(weekStart, -7))} aria-label="지난주">◀</button>
          <span style={{ fontSize: 14, fontWeight: 800, color: theme.textPrimary, minWidth: 150, textAlign: "center" }}>
            {weekStart.slice(5).replace("-", "/")} ~ {addDays(weekStart, 6).slice(5).replace("-", "/")}
          </span>
          <button style={btn} onClick={() => setWeekStart(addDays(weekStart, 7))} aria-label="다음 주">▶</button>
          {weekStart !== thisMonday && <button style={btn} onClick={() => setWeekStart(thisMonday)}>이번 주</button>}
        </div>
      </div>

      {missing && (
        <div style={{ ...card, marginBottom: 16, borderColor: "#f59e0b", color: dark ? "#fbbf24" : "#92400e", fontSize: 13.5, fontWeight: 700 }}>
          Supabase에서 SQL을 먼저 실행해 주세요 — supabase/migrations/20261109_promo_posts.sql
        </div>
      )}
      {err && <div style={{ ...card, marginBottom: 16, color: "#dc2626", fontSize: 13 }}>{err}</div>}

      <section style={{ ...card, marginBottom: 16, overflowX: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <b style={{ fontSize: 15, color: theme.textPrimary }}>이번 주 채운 칸</b>
          <span style={{ fontSize: 15, fontWeight: 900, color: accent }}>{filled} <span style={{ fontSize: 13, color: theme.textSecondary, fontWeight: 700 }}>/ 42</span></span>
        </div>
        <table style={{ width: "100%", minWidth: 720, borderCollapse: "collapse", fontSize: 13, tableLayout: "fixed" }}>
          <thead>
            <tr>
              <th style={{ width: 96, padding: 8, textAlign: "left", color: theme.textSecondary, fontWeight: 700 }}>채널</th>
              {days.map((d, i) => (
                <th key={d} style={{ padding: 8, color: d === today ? accent : theme.textSecondary, fontWeight: d === today ? 900 : 700 }}>
                  {DOW[i]} <span style={{ fontWeight: 600 }}>{d.slice(5).replace("-", "/")}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CHANNELS.map((c) => (
              <tr key={c.key}>
                <td style={{ padding: "6px 8px", fontWeight: 800, color: theme.textPrimary, borderTop: `1px solid ${theme.border}` }}>{c.label}</td>
                {days.map((d) => {
                  const list = cell(d, c.key);
                  const on = list.length > 0;
                  return (
                    <td key={d} style={{ padding: 4, borderTop: `1px solid ${theme.border}` }}>
                      <button onClick={() => setOpen({ day: d, channel: c.key })}
                        title={on ? list.map((p) => p.title || p.url).join("\n") : "눌러서 기록"}
                        style={{ width: "100%", height: 44, borderRadius: 6, cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, fontWeight: 800,
                          border: on ? `1px solid ${accent}` : `1px dashed ${theme.border}`,
                          background: on ? (dark ? "rgba(147,197,253,0.15)" : "#eef2f9") : "transparent",
                          color: on ? accent : theme.textSecondary }}>
                        {on ? `✓ ${list.length}건` : "+"}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* 홍보현황 */}
      <section style={card}>
        <h2 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 800, color: theme.textPrimary }}>홍보현황</h2>
        {recent.length === 0 ? (
          <div style={{ fontSize: 13, color: theme.textSecondary }}>아직 기록이 없어요.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", minWidth: 640, borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ color: theme.textSecondary, textAlign: "left" }}>
                  <th style={{ padding: "8px 6px", fontWeight: 700 }}>날짜</th>
                  <th style={{ padding: "8px 6px", fontWeight: 700 }}>채널</th>
                  <th style={{ padding: "8px 6px", fontWeight: 700 }}>제목</th>
                  <th style={{ padding: "8px 6px", fontWeight: 700 }}>꼬리표</th>
                  <th style={{ padding: "8px 6px", fontWeight: 700, textAlign: "right" }}>가입</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((p) => (
                  <tr key={p.id} style={{ borderTop: `1px solid ${theme.border}` }}>
                    <td style={{ padding: "9px 6px", whiteSpace: "nowrap", color: theme.textSecondary }}>{p.posted_on.slice(5).replace("-", "/")}</td>
                    <td style={{ padding: "9px 6px", whiteSpace: "nowrap", color: theme.textPrimary, fontWeight: 700 }}>{chLabel(p.channel)}</td>
                    <td style={{ padding: "9px 6px", color: theme.textPrimary }}>
                      {p.url ? <a href={p.url} target="_blank" rel="noopener noreferrer" style={{ color: accent, fontWeight: 700, textDecoration: "none" }}>{p.title || p.url}</a> : p.title}
                    </td>
                    <td style={{ padding: "9px 6px", color: theme.textSecondary, wordBreak: "break-all" }}>{p.ref_code || ""}</td>
                    <td style={{ padding: "9px 6px", textAlign: "right", fontWeight: 800, color: accent }}>{p.ref_code ? (p.signups == null ? "–" : `${p.signups}명`) : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {open && (
        <CellDialog theme={theme} day={open.day} channel={open.channel} posts={cell(open.day, open.channel)}
          onClose={() => setOpen(null)} onChanged={() => void load()} />
      )}
    </div>
  );
}

function CellDialog({ theme, day, channel, posts, onClose, onChanged }: { theme: AdminTheme; day: string; channel: string; posts: PromoPost[]; onClose: () => void; onChanged: () => void }) {
  const ref = `${channel}-${day.replace(/-/g, "")}`;
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [memo, setMemo] = useState("");
  const [withRef, setWithRef] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const link = `${SITE}/?ref=${encodeURIComponent(ref)}`;
  const dark = theme.darkMode;
  const accent = dark ? "#93c5fd" : NAVY;
  const input: React.CSSProperties = { width: "100%", height: 36, padding: "0 10px", borderRadius: 6, border: `1px solid ${theme.border}`, background: dark ? "#1a1b1e" : "#fff", color: theme.textPrimary, fontSize: 13.5, fontFamily: "inherit", boxSizing: "border-box" };

  const save = async () => {
    setBusy(true);
    setMsg("");
    const res = await addPromoPost({ posted_on: day, channel, title, url, memo, ref_code: withRef ? ref : "" });
    setBusy(false);
    if (!res.success) return setMsg(res.error || "저장하지 못했어요");
    setTitle("");
    setUrl("");
    setMemo("");
    onChanged();
  };
  const remove = async (id: string) => {
    if (!window.confirm("이 기록을 지울까요?")) return;
    const res = await deletePromoPost(id);
    if (!res.success) return setMsg(res.error || "지우지 못했어요");
    onChanged();
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setMsg("링크를 복사했어요");
    } catch {
      setMsg(link);
    }
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto", background: theme.cardBg, borderRadius: 10, border: `1px solid ${theme.border}`, padding: "20px 22px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <b style={{ fontSize: 16, color: theme.textPrimary }}>{chLabel(channel)} · {day.slice(5).replace("-", "/")}</b>
          <button onClick={onClose} aria-label="닫기" style={{ border: "none", background: "transparent", fontSize: 20, cursor: "pointer", color: theme.textSecondary }}>✕</button>
        </div>

        {posts.length > 0 && (
          <div style={{ marginBottom: 16, display: "flex", flexDirection: "column", gap: 8 }}>
            {posts.map((p) => (
              <div key={p.id} style={{ border: `1px solid ${theme.border}`, borderRadius: 6, padding: "10px 12px", fontSize: 13 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ fontWeight: 800, color: theme.textPrimary, wordBreak: "break-all" }}>
                    {p.url ? <a href={p.url} target="_blank" rel="noopener noreferrer" style={{ color: accent, textDecoration: "none" }}>{p.title || p.url}</a> : p.title}
                  </span>
                  <button onClick={() => void remove(p.id)} style={{ border: "none", background: "transparent", color: "#dc2626", fontSize: 12.5, fontWeight: 700, cursor: "pointer", flexShrink: 0, fontFamily: "inherit" }}>지우기</button>
                </div>
                {p.memo && <div style={{ marginTop: 4, color: theme.textSecondary, whiteSpace: "pre-wrap" }}>{p.memo}</div>}
                {p.ref_code && <div style={{ marginTop: 4, color: theme.textSecondary, fontSize: 12 }}>꼬리표 {p.ref_code}</div>}
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <input style={input} placeholder="제목" value={title} onChange={(e) => setTitle(e.target.value)} />
          <input style={input} placeholder="올린 글 주소 (https://…)" value={url} onChange={(e) => setUrl(e.target.value)} />
          <textarea style={{ ...input, height: 64, padding: "8px 10px", resize: "vertical" }} placeholder="메모" value={memo} onChange={(e) => setMemo(e.target.value)} />

          <div style={{ border: `1px solid ${theme.border}`, borderRadius: 6, padding: "10px 12px", fontSize: 12.5, color: theme.textSecondary }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, color: theme.textPrimary, cursor: "pointer" }}>
              <input type="checkbox" checked={withRef} onChange={(e) => setWithRef(e.target.checked)} /> 링크 꼬리표 {ref}
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
              <code style={{ flex: 1, fontSize: 12, wordBreak: "break-all", color: theme.textPrimary }}>{link}</code>
              <button onClick={() => void copy()} style={{ height: 30, padding: "0 10px", borderRadius: 6, border: `1px solid ${theme.border}`, background: theme.cardBg, color: theme.textPrimary, fontSize: 12.5, fontWeight: 700, cursor: "pointer", flexShrink: 0, fontFamily: "inherit" }}>복사</button>
            </div>
            <div style={{ marginTop: 6 }}>글에 이 링크를 넣으면, 이 링크로 들어와 가입한 사람이 홍보현황에 잡혀요.</div>
          </div>

          {msg && <div style={{ fontSize: 12.5, fontWeight: 700, color: msg.startsWith("링크") ? "#16a34a" : "#dc2626", wordBreak: "break-all" }}>{msg}</div>}
          <button onClick={() => void save()} disabled={busy}
            style={{ height: 40, borderRadius: 6, border: "none", background: NAVY, color: "#fff", fontSize: 14, fontWeight: 800, cursor: busy ? "default" : "pointer", fontFamily: "inherit" }}>
            {busy ? "저장하는 중…" : "기록하기"}
          </button>
        </div>
      </div>
    </div>
  );
}
