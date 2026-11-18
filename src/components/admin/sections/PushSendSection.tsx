"use client";

/**
 * 최고관리자 — 앱 푸시 보내기 (2026-11-18 사장님: "어떤 회원에게 보내고, 어떤 내용과 기사를 보낼지")
 *  ① 받는 회원(등급·지역) → ② 내용(제목·내용) → ③ 누르면 열릴 곳(기사 고르기 또는 주소 직접) → ④ 그림(선택, 잠금화면 큰 그림)
 *  - [안내 푸시] 속보·추천 기사 등. 앱 설정 "속보·추천 기사"를 끈 회원은 빠진다
 *  - [광고 푸시] 광고·혜택 알림에 동의한 회원만 · 제목 앞 (광고) · 끝에 수신 거부 · 밤 9시~아침 8시 못 보냄 (서버가 붙이고 막는다)
 *  - [나에게 시험] 내 휴대폰에만 먼저
 *  - [보낸 기록] push_campaigns 실제 기록 (누른 수 포함)
 *  서버: src/app/actions/adminPush.ts
 */

import React, { useCallback, useEffect, useState } from "react";
import { AdminTheme } from "./types";
import { adminPushFindArticles, adminPushLogs, adminPushPreview, adminPushUploadImage, adminSendPush, type PushTier } from "@/app/actions/adminPush";

const NAVY = "#1e3a6e";
const ORANGE = "#ff8e15";
type Tab = "info" | "ad" | "logs";
type Art = { id: string; article_no: number | null; title: string; section1: string | null; section2: string | null; thumbnail_url: string | null; published_at: string | null };
type Log = { id: string; kind: string; title: string; body: string | null; link: string | null; audience: { tier?: string; region?: string; image?: string } | null; recipients: number; devices: number; failed: number; opened: number; created_at: string };

const TIERS: { key: PushTier; label: string }[] = [
  { key: "everyone", label: "앱 설치한 모든 사람" }, // 로그인 안 한 설치자 포함 (2026-11-18)
  { key: "all", label: "로그인한 회원 전체" },
  { key: "free", label: "부동산회원 (무료)" },
  { key: "pro", label: "공실뉴스부동산 (유료)" },
  { key: "biz", label: "비즈니스회원" },
  { key: "user", label: "일반회원" },
];
const TIER_NAME: Record<string, string> = Object.fromEntries(TIERS.map((t) => [t.key, t.label]));
const AD_TAIL = "수신 거부: 앱 [설정] › 알림 › 광고·혜택 알림 끄기";

const fmt = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

export default function PushSendSection({ theme }: { theme: AdminTheme }) {
  const { cardBg, textPrimary, textSecondary, border, darkMode } = theme;
  const [tab, setTab] = useState<Tab>("info");
  const isAd = tab === "ad";

  // ① 받는 회원
  const [tier, setTier] = useState<PushTier>("everyone");
  const [region, setRegion] = useState("");
  const [count, setCount] = useState<{ members: number; guests?: number; devices: number; adNight?: boolean; error?: string } | null>(null);
  // ② 내용
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  // ③ 기사
  const [q, setQ] = useState("");
  const [arts, setArts] = useState<Art[]>([]);
  const [art, setArt] = useState<Art | null>(null);
  // ③ 기사 대신 주소를 직접 (2026-11-18 사장님: url 입력)
  const [linkMode, setLinkMode] = useState<"article" | "url">("article");
  const [url, setUrl] = useState("");
  // ④ 그림 — 올리거나 주소를 넣음, 기사를 고르면 대표 사진을 쓸 수 있음
  const [image, setImage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [logs, setLogs] = useState<Log[] | null>(null);
  const [logErr, setLogErr] = useState("");

  // 대상이 바뀌면 몇 명에게 가는지 다시 센다
  useEffect(() => {
    if (tab === "logs") return;
    let alive = true;
    const t = setTimeout(() => {
      adminPushPreview({ tier, region, kind: isAd ? "ad" : "info" })
        .then((r) => { if (alive) setCount(r.success ? { members: r.members + (r.guests || 0), guests: r.guests || 0, devices: r.devices, adNight: r.adNight } : { members: 0, devices: 0, error: r.error }); })
        .catch(() => { if (alive) setCount({ members: 0, devices: 0, error: "세지 못했습니다." }); });
    }, 300);
    return () => { alive = false; clearTimeout(t); };
  }, [tier, region, isAd, tab]);

  const findArts = useCallback((text: string) => {
    adminPushFindArticles(text).then((r) => setArts((r.articles || []) as Art[])).catch(() => setArts([]));
  }, []);
  useEffect(() => { const t = setTimeout(() => findArts(q), 300); return () => clearTimeout(t); }, [q, findArts]);

  const loadLogs = useCallback(() => {
    adminPushLogs().then((r) => {
      if (r.success) { setLogs(r.logs as Log[]); setLogErr(""); }
      else { setLogs([]); setLogErr("missingTable" in r && r.missingTable ? "보낸 기록 표가 아직 없습니다. (SQL 실행 필요)" : "기록을 불러오지 못했습니다."); }
    }).catch(() => { setLogs([]); setLogErr("기록을 불러오지 못했습니다."); });
  }, []);
  useEffect(() => { if (tab === "logs") loadLogs(); }, [tab, loadLogs]);

  // 보낸 기록 — 줄을 누르면 보낸 내용 펼쳐 보기, [다시 보내기]는 그 내용을 보내기 화면에 채운다 (2026-11-18 사장님)
  const [openLog, setOpenLog] = useState<string | null>(null);
  const reuse = async (l: Log) => {
    const ad = l.kind === "ad";
    setTab(ad ? "ad" : "info");
    setTier(((l.audience?.tier as PushTier) && l.kind !== "test" ? l.audience!.tier : "everyone") as PushTier);
    setRegion(l.kind === "test" ? "" : l.audience?.region || "");
    setTitle(ad ? l.title.replace(/^\(광고\)\s*/, "") : l.title);
    setBody((l.body || "").replace(AD_TAIL, "").trim()); // 광고 끝에 붙은 수신 거부 줄은 빼고 (보낼 때 다시 붙는다)
    setImage(l.audience?.image || "");
    setArt(null); setUrl("");
    const m = (l.link || "").match(/^\/m\/news\/([\w-]+)$/);
    if (m) {
      setLinkMode("article");
      const r = await adminPushFindArticles(m[1]).catch(() => null);
      const a = (r?.articles || []) as Art[];
      const hit = a.find((x) => String(x.article_no) === m[1] || x.id === m[1]);
      if (hit) setArt(hit); else { setLinkMode("url"); setUrl(l.link || ""); }
    } else if (l.link) { setLinkMode("url"); setUrl(l.link); }
    else setLinkMode("article");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const pickArt = (a: Art) => {
    setArt(a);
    if (!title.trim()) setTitle(a.title.slice(0, 60));
  };
  const link = linkMode === "url" ? url.trim() : art ? `/m/news/${art.article_no || art.id}` : "";
  const upload = async (f: File | undefined) => {
    if (!f) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", f);
    try {
      const r = await adminPushUploadImage(fd);
      if (r.success && r.url) setImage(r.url); else alert(r.error || "그림을 올리지 못했습니다.");
    } catch { alert("그림을 올리지 못했습니다."); }
    setUploading(false);
  };
  const shownTitle = (isAd && !title.trim().startsWith("(광고)") ? "(광고) " : "") + (title.trim() || "제목");
  const shownBody = [body.trim(), isAd ? AD_TAIL : ""].filter(Boolean).join("\n");

  const send = async (test: boolean) => {
    if (!title.trim()) return alert("제목을 써 주세요.");
    if (!test) {
      if (!count || count.devices === 0) return alert("받을 휴대폰이 없습니다.");
      if (!confirm(`${count.members.toLocaleString()}명(휴대폰 ${count.devices.toLocaleString()}대)에게 ${isAd ? "광고" : "안내"} 푸시를 보냅니다.\n\n제목: ${shownTitle}\n\n보낸 뒤에는 되돌릴 수 없습니다. 보낼까요?`)) return;
    }
    setSending(true);
    try {
      if (linkMode === "url" && url.trim() && !/^(https?:\/\/|\/)/.test(url.trim())) { setSending(false); return alert("주소는 https:// 로 시작해 주세요."); }
      const r = await adminSendPush({ kind: test ? "test" : isAd ? "ad" : "info", title, body, link, image, tier, region });
      if (!r.success) alert(r.error || "보내지 못했습니다.");
      else alert(test ? `내 휴대폰으로 보냈습니다. (${r.sent}대)` : `보냈습니다. 회원 ${r.members}명 · 휴대폰 ${r.sent}대${r.failed ? ` · 실패 ${r.failed}대` : ""}`);
    } catch {
      alert("보내지 못했습니다.");
    }
    setSending(false);
  };

  const card: React.CSSProperties = { background: cardBg, border: `1px solid ${border}`, borderRadius: 12, padding: 20 };
  const label: React.CSSProperties = { fontSize: 15, fontWeight: 800, color: textPrimary, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 };
  const num = (n: number) => <span style={{ width: 22, height: 22, borderRadius: 11, background: NAVY, color: "#fff", fontSize: 12, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{n}</span>;
  const input: React.CSSProperties = { width: "100%", height: 42, border: `1px solid ${border}`, borderRadius: 8, padding: "0 12px", fontSize: 14, background: darkMode ? "#1a1b1e" : "#fff", color: textPrimary, boxSizing: "border-box" };
  const chip = (on: boolean): React.CSSProperties => ({ padding: "8px 14px", borderRadius: 999, border: `1px solid ${on ? NAVY : border}`, background: on ? NAVY : "transparent", color: on ? "#fff" : textSecondary, fontSize: 13.5, fontWeight: on ? 700 : 500, cursor: "pointer" });

  return (
    <div style={{ padding: 24, maxWidth: 1200 }}>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: textPrimary, margin: "0 0 4px" }}>앱 푸시 보내기</h2>
      <p style={{ fontSize: 13.5, color: textSecondary, margin: "0 0 18px" }}>공실뉴스 앱을 깔고 알림을 허락한 회원의 휴대폰 잠금화면으로 보냅니다.</p>

      <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
        {([["info", "안내 푸시"], ["ad", "광고 푸시"], ["logs", "보낸 기록"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} style={{ padding: "9px 18px", borderRadius: 8, border: `1px solid ${tab === k ? NAVY : border}`, background: tab === k ? NAVY : cardBg, color: tab === k ? "#fff" : textPrimary, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>{l}</button>
        ))}
      </div>

      {tab === "logs" ? (
        <div style={card}>
          {logs === null ? <div style={{ color: textSecondary }}>불러오는 중…</div> : logErr ? <div style={{ color: "#ef4444" }}>{logErr}</div> : logs.length === 0 ? (
            <div style={{ color: textSecondary, padding: "30px 0", textAlign: "center" }}>아직 보낸 푸시가 없습니다.</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5, color: textPrimary }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${NAVY}`, textAlign: "left" }}>
                  {["보낸 때", "종류", "제목", "대상", "회원", "휴대폰", "누름", ""].map((h, i) => <th key={i} style={{ padding: "10px 8px", fontWeight: 800 }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <React.Fragment key={l.id}>
                  <tr onClick={() => setOpenLog(openLog === l.id ? null : l.id)} style={{ borderBottom: openLog === l.id ? "none" : `1px solid ${border}`, cursor: "pointer", background: openLog === l.id ? (darkMode ? "#1f2023" : "#f8fafc") : undefined }}>
                    <td style={{ padding: "10px 8px", whiteSpace: "nowrap", color: textSecondary }}>{fmt(l.created_at)}</td>
                    <td style={{ padding: "10px 8px" }}>{l.kind === "ad" ? "광고" : l.kind === "test" ? "시험" : "안내"}</td>
                    <td style={{ padding: "10px 8px", maxWidth: 360 }}>
                      <div style={{ fontWeight: 700 }}>{l.title}</div>
                      {l.link && <div style={{ fontSize: 12, color: textSecondary }}>{l.link}</div>}
                    </td>
                    <td style={{ padding: "10px 8px", color: textSecondary }}>{l.kind === "test" ? "나" : `${TIER_NAME[l.audience?.tier || "all"] || "전체"}${l.audience?.region ? ` · ${l.audience.region}` : ""}`}</td>
                    <td style={{ padding: "10px 8px" }}>{l.recipients.toLocaleString()}</td>
                    <td style={{ padding: "10px 8px" }}>{l.devices.toLocaleString()}{l.failed ? <span style={{ color: "#ef4444" }}> (실패 {l.failed})</span> : null}</td>
                    <td style={{ padding: "10px 8px", fontWeight: 700 }}>{l.opened.toLocaleString()}</td>
                    <td style={{ padding: "10px 8px", whiteSpace: "nowrap" }}>
                      <button onClick={(e) => { e.stopPropagation(); void reuse(l); }} style={{ padding: "6px 12px", borderRadius: 6, border: `1px solid ${NAVY}`, background: "transparent", color: NAVY, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>다시 보내기</button>
                    </td>
                  </tr>
                  {openLog === l.id && (
                    <tr style={{ borderBottom: `1px solid ${border}`, background: darkMode ? "#1f2023" : "#f8fafc" }}>
                      <td colSpan={8} style={{ padding: "4px 8px 16px" }}>
                        <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, color: textSecondary, marginBottom: 4 }}>보낸 내용</div>
                            <div style={{ fontWeight: 800 }}>{l.title}</div>
                            <div style={{ whiteSpace: "pre-wrap", marginTop: 4, color: textPrimary }}>{l.body || <span style={{ color: textSecondary }}>(내용 없음)</span>}</div>
                            <div style={{ fontSize: 12, color: textSecondary, marginTop: 8 }}>누르면 → {l.link || "앱 알림함"}</div>
                          </div>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          {l.audience?.image && <img src={l.audience.image} alt="" style={{ width: 200, aspectRatio: "2 / 1", objectFit: "cover", borderRadius: 8, border: `1px solid ${border}` }} />}
                        </div>
                      </td>
                    </tr>
                  )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 340px", gap: 20, alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {isAd && (
              <div style={{ ...card, background: darkMode ? "#2b2418" : "#fff7ed", borderColor: ORANGE, fontSize: 13, color: textPrimary, lineHeight: 1.7 }}>
                <b>광고 푸시 규칙 (정보통신망법)</b> — 광고·혜택 알림에 동의한 회원에게만 갑니다. 제목 앞에 <b>(광고)</b>, 끝에 수신 거부 방법이 저절로 붙고,
                밤 9시~아침 8시에는 보낼 수 없습니다.
              </div>
            )}

            {/* ① 받는 회원 */}
            <div style={card}>
              <div style={label}>{num(1)} 어떤 회원에게</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                {TIERS.map((t) => <button key={t.key} onClick={() => setTier(t.key)} style={chip(tier === t.key)}>{t.label}</button>)}
              </div>
              <input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="지역 (선택) — 예: 강남구 · 서초동. 부동산 사무소 주소로 고릅니다" style={input} />
              <div style={{ marginTop: 12, fontSize: 14, color: textPrimary }}>
                {!count ? <span style={{ color: textSecondary }}>세는 중…</span> : count.error ? <span style={{ color: "#ef4444" }}>{count.error}</span> : (
                  <>받는 사람 <b style={{ color: NAVY, fontSize: 17 }}>{count.members.toLocaleString()}명</b>{count.guests ? <span style={{ color: textSecondary }}> (로그인 안 한 설치자 {count.guests.toLocaleString()}명 포함)</span> : null} · 휴대폰 <b>{count.devices.toLocaleString()}대</b>
                    {count.adNight && <span style={{ color: "#ef4444", marginLeft: 8 }}>지금은 광고를 보낼 수 없는 시간입니다 (밤 9시~아침 8시)</span>}</>
                )}
              </div>
              <div style={{ marginTop: 6, fontSize: 12, color: textSecondary }}>앱을 깔고 알림을 허락한 휴대폰만 셉니다. &quot;앱 설치한 모든 사람&quot;은 로그인 안 한 설치자도 포함하고, 나머지 칸은 로그인한 회원만입니다{isAd ? " · 광고는 광고·혜택 알림에 동의한 회원만(로그인 안 한 설치자 제외)" : " · \"속보·추천 기사\" 알림을 끈 사람은 빠집니다"}.</div>
            </div>

            {/* ② 내용 */}
            <div style={card}>
              <div style={label}>{num(2)} 어떤 내용을</div>
              <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} placeholder="제목 (잠금화면 첫 줄, 60자까지)" style={{ ...input, marginBottom: 8 }} />
              <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={300} placeholder="내용 (300자까지, 짧을수록 잘 읽힙니다)" style={{ ...input, height: 90, padding: 12, resize: "vertical", lineHeight: 1.6 }} />
            </div>

            {/* ③ 기사 */}
            <div style={card}>
              <div style={label}>{num(3)} 누르면 열릴 곳 <span style={{ fontSize: 12, fontWeight: 500, color: textSecondary }}>(비워 두면 앱 알림함이 열립니다)</span></div>
              <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                <button onClick={() => setLinkMode("article")} style={chip(linkMode === "article")}>기사 고르기</button>
                <button onClick={() => setLinkMode("url")} style={chip(linkMode === "url")}>주소 직접 입력</button>
              </div>
              {linkMode === "url" ? (
                <>
                  <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.gongsilnews.com/... 또는 다른 사이트 주소" style={input} />
                  <div style={{ marginTop: 6, fontSize: 12, color: textSecondary }}>공실뉴스 주소(공실·기사·특강)는 앱 화면으로, 다른 사이트는 앱 안 웹 화면으로 열립니다.</div>
                </>
              ) : art ? (
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 10, border: `2px solid ${NAVY}`, borderRadius: 10 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {art.thumbnail_url && <img src={art.thumbnail_url} alt="" style={{ width: 64, height: 48, objectFit: "cover", borderRadius: 6 }} />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: textPrimary }}>{art.title}</div>
                    <div style={{ fontSize: 12, color: textSecondary }}>{art.article_no ? `${art.article_no}번 · ` : ""}{[art.section1, art.section2].filter(Boolean).join(" › ")}</div>
                  </div>
                  <button onClick={() => setArt(null)} style={{ border: `1px solid ${border}`, background: "transparent", color: textSecondary, borderRadius: 6, padding: "6px 10px", cursor: "pointer" }}>바꾸기</button>
                </div>
              ) : (
                <>
                  <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="기사 제목이나 기사 번호로 찾기 (비우면 최근 기사)" style={input} />
                  <div style={{ marginTop: 8, maxHeight: 300, overflowY: "auto", border: `1px solid ${border}`, borderRadius: 8 }}>
                    {arts.length === 0 ? <div style={{ padding: 16, fontSize: 13, color: textSecondary, textAlign: "center" }}>맞는 기사가 없습니다.</div> : arts.map((a) => (
                      <button key={a.id} onClick={() => pickArt(a)} style={{ display: "flex", width: "100%", gap: 10, alignItems: "center", padding: "8px 10px", border: "none", borderBottom: `1px solid ${border}`, background: "transparent", cursor: "pointer", textAlign: "left" }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {a.thumbnail_url ? <img src={a.thumbnail_url} alt="" style={{ width: 52, height: 38, objectFit: "cover", borderRadius: 4, flexShrink: 0 }} /> : <div style={{ width: 52, height: 38, borderRadius: 4, background: border, flexShrink: 0 }} />}
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13.5, fontWeight: 600, color: textPrimary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.title}</div>
                          <div style={{ fontSize: 11.5, color: textSecondary }}>{a.article_no ? `${a.article_no}번 · ` : ""}{a.published_at ? fmt(a.published_at).slice(0, 10) : ""}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* ④ 그림 */}
            <div style={card}>
              <div style={label}>{num(4)} 그림 <span style={{ fontSize: 12, fontWeight: 500, color: textSecondary }}>(선택 · 잠금화면에 큰 그림으로 보입니다)</span></div>
              {image ? (
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image} alt="" style={{ width: 160, height: 90, objectFit: "cover", borderRadius: 8, border: `1px solid ${border}` }} />
                  <button onClick={() => setImage("")} style={{ border: `1px solid ${border}`, background: "transparent", color: textSecondary, borderRadius: 6, padding: "6px 12px", cursor: "pointer" }}>빼기</button>
                </div>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                  <label style={{ ...chip(false), display: "inline-flex", alignItems: "center", cursor: uploading ? "wait" : "pointer" }}>
                    {uploading ? "올리는 중…" : "그림 올리기"}
                    <input type="file" accept="image/*" onChange={(e) => { void upload(e.target.files?.[0]); e.target.value = ""; }} style={{ display: "none" }} disabled={uploading} />
                  </label>
                  {art?.thumbnail_url && linkMode === "article" && (
                    <button onClick={() => setImage(art.thumbnail_url!)} style={chip(false)}>고른 기사 대표 사진 쓰기</button>
                  )}
                  <input placeholder="또는 그림 주소 붙여넣기 (https://…)" onBlur={(e) => { const v = e.target.value.trim(); if (/^https:\/\//.test(v)) setImage(v); }} style={{ ...input, flex: 1, minWidth: 220 }} />
                </div>
              )}
              <div style={{ marginTop: 6, fontSize: 12, color: textSecondary }}>가로로 긴 그림(2:1 정도)이 잘 보입니다. 안드로이드 휴대폰에서 알림을 펼치면 크게 나옵니다.</div>
            </div>
          </div>

          {/* 미리 보기 + 보내기 */}
          <div style={{ position: "sticky", top: 16, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ ...card, background: darkMode ? "#111" : "#1f2937", padding: 16 }}>
              <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 8 }}>휴대폰 잠금화면 미리 보기</div>
              <div style={{ background: "rgba(255,255,255,0.95)", borderRadius: 14, padding: "12px 14px" }}>
                <div style={{ fontSize: 11.5, color: "#6b7280", marginBottom: 4 }}>🔔 공실뉴스 · 지금</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#111827" }}>{shownTitle}</div>
                {shownBody && <div style={{ fontSize: 13, color: "#374151", marginTop: 2, whiteSpace: "pre-wrap" }}>{shownBody}</div>}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {image && <img src={image} alt="" style={{ width: "100%", aspectRatio: "2 / 1", objectFit: "cover", borderRadius: 8, marginTop: 8 }} />}
              </div>
              <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 8, wordBreak: "break-all" }}>누르면 → {linkMode === "url" ? (url.trim() || "앱 알림함") : art ? `기사 「${art.title.slice(0, 24)}${art.title.length > 24 ? "…" : ""}」` : "앱 알림함"}</div>
            </div>
            <button onClick={() => send(true)} disabled={sending} style={{ height: 46, borderRadius: 10, border: `1px solid ${NAVY}`, background: cardBg, color: NAVY, fontWeight: 800, fontSize: 14.5, cursor: "pointer" }}>나에게 시험 보내기</button>
            <button onClick={() => send(false)} disabled={sending || !count || count.devices === 0 || !!count.adNight}
              style={{ height: 50, borderRadius: 10, border: "none", background: sending || !count || count.devices === 0 || count.adNight ? "#9ca3af" : isAd ? ORANGE : NAVY, color: "#fff", fontWeight: 800, fontSize: 15.5, cursor: sending ? "wait" : "pointer" }}>
              {sending ? "보내는 중…" : `${(count?.members || 0).toLocaleString()}명에게 ${isAd ? "광고" : "안내"} 푸시 보내기`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
