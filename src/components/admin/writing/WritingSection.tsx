"use client";
/**
 * 글쓰기 (2026-11-03 사장님) — 홍보가 아니라 "글을 정말 잘 쓰는 곳". 공실마케팅 앱 전용.
 *  왼쪽 작은 메뉴: 업무 글 · 블로그 글 · 유튜브 대본 · 내 이야기 · 빈 글로 직접 쓰기 · ★ 자주 쓰는 글 · 최근 쓴 글
 *  설정 칸: ① 어떤 글 ② 재료(공실뉴스 데이터: 내 공실·단지 시세·지역 현황·기사) ③ 더 할 말 ④ 스타일·길이 → [✨ AI 초안 작성]
 *  가운데: 스타일이 다른 3개 버전 → 고르기 → 큰 글 칸(직접 고치기) · 고른 부분만 다듬기 · 이전 버전
 *  아래: 복사 · 카톡 · 파일로(txt·워드·PDF) · ★ 자주 쓰는 글로. 저장은 내 PC 에만 (문서\공실마케팅\10 글쓰기).
 *  작성법·지시문은 cards.ts. AI 는 회원 본인 계정 (서버 AI 안 씀).
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CATS, cardById, cardsOf, draftPrompt, parseJson, polishPrompt, type Cat, type Material } from "./cards";
import { writingAreaDongs, writingAreaFacts, writingArticleFacts, writingArticles, writingComplexFacts, writingMyVacancies, writingSearchComplexes, writingVacancyFacts } from "@/app/actions/writingFacts";
import { LAWD_NAMES } from "@/utils/aptMapShared";

type Theme = { cardBg: string; textPrimary: string; textSecondary: string; border: string; bg?: string; darkMode?: boolean };
type Doc = { id: string; cat: Cat | "free"; card: string; title: string; text: string; aiBase: string; mine: string[]; history: { at: string; text: string }[]; versions?: Ver[]; mats?: Material[]; file?: string; fav?: boolean };
type Ver = { style: string; title: string; text: string };
type Row = { file: string; id: string; cat: string; card: string; title: string; preview: string; updatedAt: string };
type Bridge = {
  openAiConnect?: () => Promise<void>;
  ai?: { list: () => Promise<{ id: string; name: string; ok: boolean }[]> };
  write?: {
    ask: (prompt: string, opts?: { json?: boolean; busyLabel?: string }) => Promise<string>;
    onProgress: (fn: (t: string) => void) => () => void;
    save: (doc: Doc) => Promise<{ file: string; savedAt: string }>;
    list: (o?: { fav?: boolean; limit?: number }) => Promise<Row[]>;
    load: (file: string) => Promise<Doc | null>;
    remove: (file: string) => Promise<boolean>;
    exportFile: (o: { title: string; text: string; kind: "txt" | "doc" | "pdf" }) => Promise<{ file?: string; canceled?: boolean }>;
    openFolder: () => Promise<string>;
  };
};
const bridge = (): Bridge | null => (typeof window === "undefined" ? null : ((window as unknown as { gongsilStudio?: Bridge }).gongsilStudio ?? null));
const newId = () => `w${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const cleanErr = (e: unknown) => (e instanceof Error ? e.message : String(e)).replace(/^Error invoking remote method '[^']+': (Error: )?/, "");
const when = (iso: string) => {
  const d = new Date(iso), n = new Date();
  if (d.toDateString() === n.toDateString()) return d.toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit" });
  return `${d.getMonth() + 1}. ${d.getDate()}.`;
};
const BLUE = "#2563eb";
type Menu = Cat | "free" | "fav" | "recent";

export default function WritingSection({ theme }: { theme: Theme }) {
  const dark = Boolean(theme.darkMode);
  const soft = dark ? "rgba(255,255,255,0.05)" : "#f8fafc";
  const b = bridge();
  const ready = Boolean(b?.write);

  const [menu, setMenu] = useState<Menu>("work");
  const cat: Cat = menu === "blog" || menu === "youtube" || menu === "story" ? menu : "work";
  const [cardIds, setCardIds] = useState<Record<string, string>>({});
  const cards = cardsOf(cat);
  const card = cardById(cardIds[cat] || "") || cards[0];
  const [more, setMore] = useState("");
  const [style, setStyle] = useState("");
  const [duration, setDuration] = useState("60s");
  const [mats, setMats] = useState<Material[]>([]);
  const [doc, setDoc] = useState<Doc | null>(null);
  const [versions, setVersions] = useState<Ver[]>([]);
  const [busy, setBusy] = useState("");
  const [progress, setProgress] = useState("");
  const [err, setErr] = useState("");
  const [toast, setToast] = useState("");
  const [savedAt, setSavedAt] = useState("");
  const [recent, setRecent] = useState<Row[]>([]);
  const [favs, setFavs] = useState<Row[]>([]);
  const [ais, setAis] = useState<string[]>([]);
  const [sel, setSel] = useState<[number, number]>([0, 0]);
  const [askText, setAskText] = useState("");
  const [fileMenu, setFileMenu] = useState(false);
  const [histMenu, setHistMenu] = useState(false);
  const ta = useRef<HTMLTextAreaElement>(null);
  const say = (t: string) => { setToast(t); setTimeout(() => setToast(""), 2400); };

  const loadLists = useCallback(() => {
    if (!b?.write) return;
    b.write.list({ limit: 30 }).then(setRecent).catch(() => {});
    b.write.list({ fav: true, limit: 50 }).then(setFavs).catch(() => {});
  }, [b]);
  useEffect(() => {
    loadLists();
    b?.ai?.list().then((l) => setAis(l.filter((a) => a.ok).map((a) => a.name))).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 저절로 저장 — 고치면 1.5초 뒤 내 PC 에
  useEffect(() => {
    if (!doc || !doc.text.trim() || !b?.write) return;
    const t = setTimeout(() => {
      b.write!.save(doc).then((r) => { setSavedAt(r.savedAt); if (!doc.file) setDoc((d) => (d && d.id === doc.id ? { ...d, file: r.file } : d)); loadLists(); }).catch(() => {});
    }, 1500);
    return () => clearTimeout(t);
  }, [doc?.text, doc?.title]); // eslint-disable-line react-hooks/exhaustive-deps

  const ask = async (prompt: string, label: string) => {
    if (!b?.write) throw new Error("공실마케팅 앱을 새 버전으로 다시 켜 주세요. (글쓰기는 0.1.18부터)");
    setBusy(label); setErr(""); setProgress("");
    const off = b.write.onProgress(setProgress);
    try { return await b.write.ask(prompt, { json: true, busyLabel: label }); }
    finally { off(); setBusy(""); setProgress(""); }
  };

  /* ── AI 초안 작성 — 3개 버전 ── */
  const draft = async () => {
    try {
      const mine = favs.filter((f) => f.card === card.id).map((f) => f.preview);
      const raw = await ask(draftPrompt(card, { mats, more, style, duration, mine }), "초안을 쓰고 있습니다");
      const j = parseJson<{ versions?: Ver[] }>(raw);
      const vs = (j?.versions || []).filter((v) => v && String(v.text || "").trim()).map((v) => ({ style: String(v.style || ""), title: String(v.title || ""), text: String(v.text || "").replace(/\\n/g, "\n") }));
      if (!vs.length) throw new Error("AI 답을 읽지 못했어요. 다시 눌러 주세요.");
      setVersions(vs);
    } catch (e) { setErr(cleanErr(e)); }
  };
  const pick = (v: Ver) => {
    setDoc({ id: newId(), cat, card: card.id, title: v.title || card.label, text: v.text, aiBase: v.text, mine: [], history: [], versions, mats });
    setVersions([]);
  };
  const blank = () => { setMenu("free"); setVersions([]); setDoc({ id: newId(), cat: "free", card: "", title: "새 글", text: "", aiBase: "", mine: [], history: [] }); setTimeout(() => ta.current?.focus(), 50); };

  /* 회원이 손으로 쓴 줄 — AI 가 준 글(aiBase)에 없던 줄 */
  const handLines = (d: Doc) => {
    const base = new Set(d.aiBase.split("\n").map((l) => l.trim()).filter(Boolean));
    const now = d.text.split("\n").map((l) => l.trim()).filter(Boolean);
    return [...new Set([...d.mine.filter((l) => now.includes(l)), ...now.filter((l) => !base.has(l))])];
  };

  /* ── 다듬기 — 고른 부분이 있으면 그 부분만 ── */
  const polish = async (how: string, req = "") => {
    if (!doc || !doc.text.trim()) return;
    const [s, e] = sel;
    const part = e > s ? doc.text.slice(s, e) : "";
    const keep = handLines(doc);
    try {
      const raw = await ask(polishPrompt(cardById(doc.card), { text: doc.text, how, ask: req, part, keep: part ? [] : keep, mats: doc.mats || mats }), part ? "고른 부분을 고치고 있습니다" : "글을 다듬고 있습니다");
      if (part) {
        const j = parseJson<{ replace?: string }>(raw);
        const rep = String(j?.replace || "").replace(/\\n/g, "\n");
        if (!rep.trim()) throw new Error("AI 답을 읽지 못했어요. 다시 눌러 주세요.");
        const text = doc.text.slice(0, s) + rep + doc.text.slice(e);
        setDoc({ ...doc, text, aiBase: text, mine: keep, history: [{ at: new Date().toISOString(), text: doc.text }, ...doc.history].slice(0, 30) });
        setSel([s, s + rep.length]);
        setTimeout(() => { ta.current?.focus(); ta.current?.setSelectionRange(s, s + rep.length); }, 30);
      } else {
        const j = parseJson<{ title?: string; text?: string }>(raw);
        const text = String(j?.text || "").replace(/\\n/g, "\n");
        if (!text.trim()) throw new Error("AI 답을 읽지 못했어요. 다시 눌러 주세요.");
        setDoc({ ...doc, title: String(j?.title || "").trim() || doc.title, text, aiBase: text, mine: keep, history: [{ at: new Date().toISOString(), text: doc.text }, ...doc.history].slice(0, 30) });
      }
      setAskText("");
    } catch (e2) { setErr(cleanErr(e2)); }
  };

  /* ── 재료 ── */
  const addMat = (m: Material) => setMats((l) => [...l.filter((x) => !(x.kind === m.kind && x.title === m.title)), m]);
  const blanks = useMemo(() => [...new Set((doc?.text.match(/\[[^\]\n]{1,20}\]/g) || []))], [doc?.text]);
  const goBlank = (t: string) => {
    if (!doc || !ta.current) return;
    const i = doc.text.indexOf(t);
    if (i < 0) return;
    ta.current.focus(); ta.current.setSelectionRange(i, i + t.length); setSel([i, i + t.length]);
  };

  /* ── 저장·내보내기 ── */
  const copy = async (kakao = false) => {
    if (!doc) return;
    try { await navigator.clipboard.writeText(doc.text); say(kakao ? "복사했어요. 카톡 대화창에서 Ctrl+V 로 붙여 넣으세요." : "복사했어요."); } catch { setErr("복사하지 못했어요."); }
  };
  const exportAs = async (kind: "txt" | "doc" | "pdf") => {
    setFileMenu(false);
    if (!doc || !b?.write) return;
    try { const r = await b.write.exportFile({ title: doc.title, text: doc.text, kind }); if (r.file) say("저장했어요."); } catch (e) { setErr(cleanErr(e)); }
  };
  const toFav = async () => {
    if (!doc || !b?.write) return;
    try { await b.write.save({ ...doc, id: newId(), file: undefined, fav: true }); say("★ 자주 쓰는 글에 저장했어요."); loadLists(); } catch (e) { setErr(cleanErr(e)); }
  };
  const openRow = async (r: Row, asCopy = false) => {
    if (!b?.write) return;
    const d = await b.write.load(r.file).catch(() => null);
    if (!d) return setErr("글을 열지 못했어요.");
    const c = (d.cat as Menu) || "work";
    if (c !== "free") { setMenu(c); if (d.card) setCardIds((m) => ({ ...m, [c]: d.card })); } else setMenu("free");
    setMats(d.mats || []);
    setVersions([]);
    setDoc(asCopy ? { ...d, id: newId(), file: undefined, fav: false, history: [] } : { ...d, mine: d.mine || [], history: d.history || [], aiBase: d.aiBase ?? d.text });
  };
  const removeRow = async (r: Row) => { if (!b?.write || !confirm(`"${r.title}"을(를) 지울까요?`)) return; await b.write.remove(r.file).catch(() => {}); loadLists(); };

  /* ── 모양 ── */
  const lab = (n: number | string, t: string, sub?: string) => (
    <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, fontWeight: 800, color: theme.textSecondary, margin: "0 0 8px" }}>
      <span style={{ width: 20, height: 20, borderRadius: "50%", background: BLUE, color: "#fff", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center" }}>{n}</span>{t}
      {sub && <span style={{ fontWeight: 600, color: theme.textSecondary, opacity: 0.75 }}>{sub}</span>}
    </div>
  );
  const chip = (on: boolean): React.CSSProperties => ({ padding: "7px 11px", borderRadius: 9, border: `1px solid ${on ? BLUE : theme.border}`, background: on ? (dark ? "rgba(37,99,235,0.2)" : "#eff5ff") : "transparent", color: on ? (dark ? "#93c5fd" : "#1d4ed8") : theme.textPrimary, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" });
  const btn = (primary = false): React.CSSProperties => ({ height: 40, padding: "0 16px", borderRadius: 10, border: primary ? 0 : `1px solid ${theme.border}`, background: primary ? (dark ? "#fff" : "#111827") : theme.cardBg, color: primary ? (dark ? "#111827" : "#fff") : theme.textPrimary, fontSize: 13.5, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit" });
  const aiBtn: React.CSSProperties = { height: 32, padding: "0 12px", borderRadius: 16, border: `1px solid ${dark ? "#6d28d9" : "#ddd6fe"}`, background: dark ? "rgba(124,58,237,0.15)" : "#f5f3ff", color: dark ? "#c4b5fd" : "#6d28d9", fontSize: 12.5, fontWeight: 700, cursor: busy ? "default" : "pointer", whiteSpace: "nowrap", fontFamily: "inherit" };
  const subItem = (id: Menu, label: string, icon: string) => {
    const on = menu === id;
    return (
      <button key={id} onClick={() => { if (id === "free") return blank(); setMenu(id); setVersions([]); }}
        style={{ display: "flex", alignItems: "center", gap: 8, textAlign: "left", padding: "9px 12px", border: 0, borderRadius: 8, cursor: "pointer", fontFamily: "inherit", fontSize: 14,
          fontWeight: on ? 800 : 500, color: on ? (dark ? "#fff" : "#1a3a6b") : theme.textSecondary, background: on ? (dark ? "rgba(255,255,255,0.10)" : "rgba(26,58,107,0.08)") : "transparent", boxShadow: on ? `inset 3px 0 0 ${dark ? "#fff" : "#1a3a6b"}` : "none" }}>
        <span style={{ width: 18, textAlign: "center", fontWeight: 900 }}>{icon}</span>{label}
      </button>
    );
  };
  const isList = menu === "fav" || menu === "recent";
  const selPart = sel[1] > sel[0];

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden", minWidth: 0 }}>
      {/* 작은 메뉴 */}
      <aside style={{ width: 210, flexShrink: 0, background: theme.cardBg, borderRight: `1px solid ${theme.border}`, padding: "22px 14px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 3 }}>
        <h2 style={{ margin: "0 4px 10px", fontSize: 19, fontWeight: 800, color: theme.textPrimary }}>글쓰기</h2>
        <button onClick={() => b?.openAiConnect?.()} title="내 AI 연결"
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "9px 10px", borderRadius: 10, cursor: "pointer", fontSize: 12.5, fontWeight: 700, marginBottom: 10, fontFamily: "inherit",
            background: ais.length ? (dark ? "rgba(34,197,94,0.12)" : "#ecfdf5") : theme.cardBg, border: `1px solid ${ais.length ? (dark ? "rgba(110,231,183,0.6)" : "#6ee7b7") : theme.border}`, color: ais.length ? (dark ? "#6ee7b7" : "#047857") : theme.textPrimary }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: ais.length ? "#22c55e" : "#cbd5e1" }} />{ais.length ? `AI 설정 · ${ais.join(", ")}` : "AI 설정"}
        </button>
        {CATS.map((c) => subItem(c.id, c.label, c.icon))}
        <div style={{ height: 1, background: theme.border, margin: "10px 4px" }} />
        {subItem("free", "빈 글로 직접 쓰기", "📝")}
        {subItem("fav", `자주 쓰는 글${favs.length ? ` ${favs.length}` : ""}`, "★")}
        {subItem("recent", "최근 쓴 글", "🕘")}
        <button onClick={() => b?.write?.openFolder()} style={{ marginTop: "auto", border: 0, background: "transparent", color: theme.textSecondary, fontSize: 12, cursor: "pointer", padding: 8, fontFamily: "inherit" }} title="문서\공실마케팅\10 글쓰기">📁 내 글 폴더 열기</button>
      </aside>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
        {/* 위 줄 */}
        <div style={{ height: 56, flexShrink: 0, display: "flex", alignItems: "center", gap: 12, padding: "0 24px", background: theme.cardBg, borderBottom: `1px solid ${theme.border}` }}>
          <h3 style={{ margin: 0, fontSize: 19, fontWeight: 800, color: theme.textPrimary }}>{menu === "free" ? "빈 글로 직접 쓰기" : menu === "fav" ? "★ 자주 쓰는 글" : menu === "recent" ? "최근 쓴 글" : CATS.find((c) => c.id === cat)?.label}</h3>
          <span style={{ fontSize: 12.5, color: theme.textSecondary }}>{menu === "free" ? "직접 쓰고, 필요한 부분만 AI 로 다듬어요" : isList ? "누르면 열려요" : CATS.find((c) => c.id === cat)?.hint}</span>
          <span style={{ flex: 1 }} />
          <span style={{ fontSize: 12.5, color: theme.textSecondary }}>{savedAt ? `✓ 내 PC에 저장 · ${when(savedAt)}` : "쓴 글은 내 PC에만 저장돼요"}</span>
        </div>
        {!ready && <div style={{ padding: "10px 24px", background: "#fef3c7", color: "#92400e", fontSize: 13, fontWeight: 700 }}>글쓰기는 공실마케팅 앱 새 버전(0.1.18)부터 쓸 수 있어요. 앱을 업데이트해 주세요.</div>}

        <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
          {/* 설정 칸 */}
          {menu !== "free" && (
            <aside style={{ width: 380, flexShrink: 0, display: "flex", flexDirection: "column", background: theme.cardBg, borderRight: `1px solid ${theme.border}` }}>
              {isList ? (
                <div style={{ flex: 1, overflowY: "auto", padding: 14 }}>
                  {(menu === "fav" ? favs : recent).map((r) => (
                    <div key={r.file} role="button" tabIndex={0} onClick={() => void openRow(r, menu === "fav")}
                      style={{ position: "relative", padding: "11px 34px 11px 12px", borderRadius: 10, cursor: "pointer", marginBottom: 4, background: doc?.file === r.file ? soft : "transparent", border: `1px solid ${doc?.file === r.file ? theme.border : "transparent"}` }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: theme.textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{CATS.find((c) => c.id === r.cat)?.icon || "📝"} {r.title}</div>
                      <div style={{ fontSize: 12, color: theme.textSecondary, marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{when(r.updatedAt)} · {r.preview}</div>
                      <button onClick={(e) => { e.stopPropagation(); void removeRow(r); }} title="지우기" style={{ position: "absolute", right: 8, top: 10, border: 0, background: "transparent", color: theme.textSecondary, cursor: "pointer", fontSize: 14 }}>✕</button>
                    </div>
                  ))}
                  {!(menu === "fav" ? favs : recent).length && <div style={{ padding: 20, fontSize: 13, color: theme.textSecondary, lineHeight: 1.7 }}>{menu === "fav" ? "잘 다듬은 글을 [★ 자주 쓰는 글로]를 누르면 여기에 모여요. 누르면 사본으로 열려서 손님·날짜만 바꿔 바로 쓸 수 있어요." : "아직 쓴 글이 없어요."}</div>}
                </div>
              ) : (<>
                <div style={{ flex: 1, overflowY: "auto", padding: "18px 18px 10px", display: "flex", flexDirection: "column", gap: 18 }}>
                  <div>{lab(1, "어떤 글")}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {cards.map((c) => <button key={c.id} onClick={() => setCardIds((m) => ({ ...m, [cat]: c.id }))} title={c.brief} style={chip(card.id === c.id)}>{c.label}</button>)}
                    </div>
                    <div style={{ fontSize: 12, color: theme.textSecondary, marginTop: 7, lineHeight: 1.5 }}>{card.brief} · {card.length}</div>
                  </div>
                  <div>{lab(2, "재료", "공실뉴스에서 불러오기")}
                    <MaterialPicker theme={theme} suggest={card.materials || []} onAdd={addMat} />
                    {mats.map((m, i) => (
                      <details key={i} style={{ marginTop: 6, border: `1px solid ${theme.border}`, borderRadius: 9, padding: "7px 10px", fontSize: 12.5 }}>
                        <summary style={{ cursor: "pointer", fontWeight: 700, color: theme.textPrimary, display: "flex", alignItems: "center", gap: 6 }}>
                          <span>{({ vacancy: "🏠", complex: "🏢", area: "📊", article: "📰" } as const)[m.kind]} {m.title}</span>
                          <span style={{ flex: 1 }} />
                          <span role="button" onClick={(e) => { e.preventDefault(); setMats((l) => l.filter((_, k) => k !== i)); }} style={{ color: theme.textSecondary, cursor: "pointer" }}>✕</span>
                        </summary>
                        <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", margin: "6px 0 0", color: theme.textSecondary, lineHeight: 1.55, maxHeight: 180, overflowY: "auto" }}>{m.text}</pre>
                      </details>
                    ))}
                  </div>
                  <div>{lab(3, "더 할 말", "(선택)")}
                    <textarea value={more} onChange={(e) => setMore(e.target.value)} rows={3} placeholder={cat === "work" ? "예: 내일 오후 3시, 주차는 건물 뒤편, 짧고 정중하게" : cat === "youtube" ? "예: 신혼부부 시청자, 마지막에 상담 안내" : "예: 신혼부부가 읽을 글, 따뜻하게"}
                      style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.cardBg, color: theme.textPrimary, fontSize: 13.5, fontFamily: "inherit", resize: "vertical", lineHeight: 1.6 }} />
                  </div>
                  <div>{lab(4, "스타일")}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      <button onClick={() => setStyle("")} style={chip(style === "")} title="스타일이 다른 3개를 받아 보고 고르기">여러 스타일로 3개 ✓추천</button>
                      {card.styles.map((s) => <button key={s} onClick={() => setStyle(s)} style={chip(style === s)}>{s}</button>)}
                    </div>
                    {cat === "youtube" && (
                      <div style={{ display: "flex", gap: 6, marginTop: 8, alignItems: "center" }}>
                        <span style={{ fontSize: 12.5, fontWeight: 700, color: theme.textSecondary, marginRight: 4 }}>길이</span>
                        {([["60s", "60초 쇼츠"], ["2m", "약 2분"], ["5m", "약 5분"]] as const).map(([k, l]) => <button key={k} onClick={() => setDuration(k)} style={chip(duration === k)}>{l}</button>)}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ padding: "14px 18px 18px", borderTop: `1px solid ${theme.border}` }}>
                  <button onClick={() => void draft()} disabled={Boolean(busy) || !ready}
                    style={{ width: "100%", height: 50, borderRadius: 12, border: 0, background: busy || !ready ? "#94a3b8" : BLUE, color: "#fff", fontSize: 16, fontWeight: 800, cursor: busy || !ready ? "default" : "pointer", fontFamily: "inherit" }}>
                    {busy ? "쓰는 중…" : "✨ AI 초안 작성"}
                  </button>
                  <div style={{ marginTop: 7, fontSize: 12, textAlign: "center", color: busy ? (dark ? "#93c5fd" : "#1a3a6b") : theme.textSecondary, fontWeight: busy ? 700 : 500 }}>
                    {busy ? progress || busy : style ? `"${style}" 스타일로 3가지` : "스타일이 다른 3개 버전을 써서 보여 드려요"}
                  </div>
                </div>
              </>)}
            </aside>
          )}

          {/* 가운데 */}
          <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", padding: "18px 26px 0", background: dark ? undefined : "#f4f6f9", overflow: "hidden" }}>
            {err && <div style={{ marginBottom: 10, padding: "10px 14px", borderRadius: 10, background: dark ? "rgba(220,38,38,0.15)" : "#fef2f2", color: "#dc2626", fontSize: 13.5, fontWeight: 700, display: "flex", gap: 10 }}><span style={{ flex: 1 }}>{err}</span><button onClick={() => setErr("")} style={{ border: 0, background: "transparent", color: "#dc2626", cursor: "pointer" }}>✕</button></div>}

            {versions.length > 0 ? (
              /* 3개 버전 — 고르기 */
              <div style={{ flex: 1, overflowY: "auto", paddingBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <b style={{ fontSize: 15, color: theme.textPrimary }}>마음에 드는 버전을 고르세요</b>
                  <span style={{ fontSize: 12.5, color: theme.textSecondary }}>고른 뒤에 직접 고치거나 부분만 다시 쓸 수 있어요</span>
                  <span style={{ flex: 1 }} />
                  <button onClick={() => void draft()} disabled={Boolean(busy)} style={btn()}>{busy ? "쓰는 중…" : "↻ 다른 3개 더"}</button>
                  {doc && <button onClick={() => setVersions([])} style={btn()}>쓰던 글로 돌아가기</button>}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(3, versions.length)}, minmax(0, 1fr))`, gap: 14 }}>
                  {versions.map((v, i) => (
                    <div key={i} style={{ background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: 14, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                      <div style={{ padding: "12px 16px", borderBottom: `1px solid ${theme.border}`, display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 11.5, fontWeight: 800, padding: "2px 8px", borderRadius: 10, background: dark ? "rgba(37,99,235,0.2)" : "#eff5ff", color: dark ? "#93c5fd" : "#1d4ed8" }}>{String.fromCharCode(65 + i)} · {v.style}</span>
                      </div>
                      <div style={{ padding: "14px 16px 6px", fontSize: 15, fontWeight: 800, color: theme.textPrimary }}>{v.title}</div>
                      <div style={{ padding: "0 16px 14px", fontSize: 14, lineHeight: 1.85, color: theme.textPrimary, whiteSpace: "pre-wrap", flex: 1 }}>{v.text}</div>
                      <div style={{ padding: 12, borderTop: `1px solid ${theme.border}` }}><button onClick={() => pick(v)} style={{ ...btn(true), width: "100%" }}>이 버전으로 고르기</button></div>
                    </div>
                  ))}
                </div>
              </div>
            ) : doc ? (
              /* 큰 글 칸 */
              <div style={{ flex: 1, display: "flex", flexDirection: "column", background: theme.cardBg, borderRadius: 14, border: `1px solid ${theme.border}`, overflow: "hidden", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 20px", borderBottom: `1px solid ${theme.border}` }}>
                  <input value={doc.title} onChange={(e) => setDoc({ ...doc, title: e.target.value })} placeholder="제목"
                    style={{ flex: 1, border: 0, outline: "none", background: "transparent", fontSize: 19, fontWeight: 800, color: theme.textPrimary, fontFamily: "inherit" }} />
                  {doc.versions && doc.versions.length > 1 && <button onClick={() => setVersions(doc.versions || [])} style={{ ...btn(), height: 32 }}>다른 버전 보기</button>}
                  <div style={{ position: "relative" }}>
                    <button onClick={() => setHistMenu((v) => !v)} disabled={!doc.history.length} style={{ ...btn(), height: 32, opacity: doc.history.length ? 1 : 0.45 }}>이전 버전 {doc.history.length ? doc.history.length : ""} ▾</button>
                    {histMenu && doc.history.length > 0 && (<>
                      <div onClick={() => setHistMenu(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
                      <div style={{ position: "absolute", right: 0, top: 38, zIndex: 41, width: 320, maxHeight: 320, overflowY: "auto", background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.15)" }}>
                        {doc.history.map((h, i) => (
                          <button key={i} onClick={() => { setDoc({ ...doc, text: h.text, history: [{ at: new Date().toISOString(), text: doc.text }, ...doc.history.filter((_, k) => k !== i)] }); setHistMenu(false); }}
                            style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 12px", border: 0, borderBottom: `1px solid ${theme.border}`, background: "transparent", color: theme.textPrimary, cursor: "pointer", fontFamily: "inherit" }}>
                            <div style={{ fontSize: 11.5, color: theme.textSecondary }}>{when(h.at)} 이전</div>
                            <div style={{ fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.text.slice(0, 60)}</div>
                          </button>
                        ))}
                      </div>
                    </>)}
                  </div>
                </div>
                {/* 고른 부분만 고치기 */}
                {selPart && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 20px", background: dark ? "rgba(124,58,237,0.12)" : "#faf5ff", borderBottom: `1px solid ${theme.border}`, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 12.5, fontWeight: 800, color: dark ? "#c4b5fd" : "#6d28d9" }}>고른 부분만:</span>
                    {([["again", "다시 쓰기"], ["short", "짧게"], ["polite", "정중하게"], ["strong", "더 강하게"], ["spell", "맞춤법"]] as const).map(([k, l]) => <button key={k} disabled={Boolean(busy)} onClick={() => void polish(k)} style={aiBtn}>✨ {l}</button>)}
                  </div>
                )}
                <textarea ref={ta} value={doc.text} onChange={(e) => setDoc({ ...doc, text: e.target.value })}
                  onSelect={(e) => setSel([e.currentTarget.selectionStart, e.currentTarget.selectionEnd])}
                  placeholder={doc.cat === "free" ? "여기에 직접 쓰세요. 다 쓰고 아래 단추로 다듬을 수 있어요. 일부를 드래그하면 그 부분만 고칠 수 있어요." : ""}
                  style={{ flex: 1, border: 0, outline: "none", resize: "none", padding: "20px 24px", fontSize: 16, lineHeight: 1.95, color: theme.textPrimary, background: "transparent", fontFamily: "inherit" }} />
                {blanks.length > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 20px", borderTop: `1px solid ${theme.border}`, flexWrap: "wrap", background: dark ? "rgba(234,179,8,0.08)" : "#fffbeb" }}>
                    <span style={{ fontSize: 12.5, fontWeight: 800, color: "#b45309" }}>채울 빈칸:</span>
                    {blanks.map((t) => <button key={t} onClick={() => goBlank(t)} title="눌러서 바로 고쳐 쓰기" style={{ padding: "3px 9px", borderRadius: 6, border: 0, background: "#fef3c7", color: "#92400e", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>{t}</button>)}
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 20px", borderTop: `1px solid ${theme.border}`, flexWrap: "wrap" }}>
                  {([["spell", "맞춤법"], ["hook", "첫 줄 더 강하게"], ["read", "더 읽히게"], ["polite", "더 정중하게"], ["friendly", "더 친근하게"], ["short", "짧게"], ["long", "길게"]] as const).map(([k, l]) => <button key={k} disabled={Boolean(busy) || !doc.text.trim()} onClick={() => void polish(k)} style={aiBtn}>✨ {l}</button>)}
                  <input value={askText} onChange={(e) => setAskText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && askText.trim() && !busy) void polish("ask", askText.trim()); }}
                    placeholder={selPart ? "고른 부분을 어떻게 고칠까요? (Enter)" : "✍ 고쳐 달라고 하기 — 예: 둘째 문단에 주차 안내 더해 줘 (Enter)"}
                    style={{ flex: 1, minWidth: 220, height: 32, borderRadius: 16, border: `1px solid ${theme.border}`, padding: "0 14px", fontSize: 12.5, background: theme.cardBg, color: theme.textPrimary, fontFamily: "inherit" }} />
                </div>
                {busy && <div style={{ padding: "8px 20px", fontSize: 12.5, fontWeight: 700, color: dark ? "#93c5fd" : "#1a3a6b", borderTop: `1px solid ${theme.border}` }}>{progress || busy}…</div>}
              </div>
            ) : (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 10, color: theme.textSecondary, textAlign: "center", lineHeight: 1.8 }}>
                <div style={{ fontSize: 40 }}>✍</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: theme.textPrimary }}>{isList ? "왼쪽에서 글을 고르세요" : "왼쪽에서 글 종류와 재료를 고르고 [✨ AI 초안 작성]"}</div>
                <div style={{ fontSize: 13.5 }}>스타일이 다른 3개 버전을 써 드려요. 고른 뒤에 직접 고치고, 부분만 다시 쓰고, 저장하세요.</div>
                <button onClick={blank} style={{ ...btn(), marginTop: 6 }}>📝 빈 글로 직접 쓰기</button>
              </div>
            )}
          </main>
        </div>

        {/* 아래 — 내보내기 */}
        <div style={{ height: 64, flexShrink: 0, display: "flex", alignItems: "center", gap: 8, padding: "0 24px", background: theme.cardBg, borderTop: `1px solid ${theme.border}` }}>
          <span style={{ fontSize: 13, color: toast ? "#16a34a" : theme.textSecondary, fontWeight: toast ? 800 : 500 }}>{toast || (doc ? "고치면 저절로 내 PC에 저장돼요" : "")}</span>
          <span style={{ flex: 1 }} />
          {doc && (<>
            <button onClick={() => void toFav()} style={btn()} title="잘 다듬은 글을 틀로 저장 — 다음엔 손님·날짜만 바꿔 바로">★ 자주 쓰는 글로</button>
            <div style={{ position: "relative" }}>
              <button onClick={() => setFileMenu((v) => !v)} style={btn()}>📄 파일로 ▾</button>
              {fileMenu && (<>
                <div onClick={() => setFileMenu(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
                <div style={{ position: "absolute", right: 0, bottom: 46, zIndex: 41, minWidth: 170, background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.15)", padding: "6px 0" }}>
                  {([["txt", "메모장 (.txt)"], ["doc", "워드 (.doc)"], ["pdf", "PDF (.pdf)"]] as const).map(([k, l]) => (
                    <button key={k} onClick={() => void exportAs(k)} style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 14px", border: 0, background: "transparent", color: theme.textPrimary, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>{l}</button>
                  ))}
                </div>
              </>)}
            </div>
            <button onClick={() => void copy(false)} style={btn()}>📋 복사</button>
            {(doc.cat === "work" || doc.cat === "story" || doc.cat === "free") && <button onClick={() => void copy(true)} style={{ ...btn(), background: "#fee500", color: "#191919", border: 0 }}>💬 카톡에 붙여 넣기</button>}
          </>)}
        </div>
      </div>
    </div>
  );
}

/* ── 재료 고르기 — 공실뉴스 데이터 ── */
function MaterialPicker({ theme, suggest, onAdd }: { theme: Theme; suggest: string[]; onAdd: (m: Material) => void }) {
  const dark = Boolean(theme.darkMode);
  const [open, setOpen] = useState<"" | "vacancy" | "complex" | "area" | "article">("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [list, setList] = useState<{ id: string; label: string }[]>([]);
  const [q, setQ] = useState("");
  const [lawd, setLawd] = useState("");
  const [dongs, setDongs] = useState<string[]>([]);
  const [dong, setDong] = useState("");
  const [kinds, setKinds] = useState<string[]>(["apt", "offi"]);
  const [months, setMonths] = useState(3);
  const inp: React.CSSProperties = { width: "100%", boxSizing: "border-box", height: 36, padding: "0 10px", borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.cardBg, color: theme.textPrimary, fontSize: 13, fontFamily: "inherit" };
  const run = async <T,>(p: Promise<{ success: true; data: T } | { success: false; error: string }>) => {
    setBusy(true); setErr("");
    try { const r = await p; if (!r.success) { setErr(r.error); return null; } return r.data; } finally { setBusy(false); }
  };
  const show = async (k: typeof open) => {
    setOpen(open === k ? "" : k); setList([]); setQ(""); setErr("");
    if (k === "vacancy" && open !== k) { const d = await run(writingMyVacancies()); if (d) setList(d); }
    if (k === "article" && open !== k) { const d = await run(writingArticles("")); if (d) setList(d); }
  };
  const take = async (k: "vacancy" | "complex" | "article", id: string) => {
    if (k === "vacancy") {
      const d = await run(writingVacancyFacts(id));
      if (!d) return;
      onAdd({ kind: "vacancy", title: d.title, text: d.text });
      if (d.complexId) { const c = await run(writingComplexFacts(d.complexId)); if (c) onAdd({ kind: "complex", title: c.title, text: c.text }); }
    } else if (k === "complex") { const d = await run(writingComplexFacts(id)); if (d) onAdd({ kind: "complex", title: d.title, text: d.text }); }
    else { const d = await run(writingArticleFacts(id)); if (d) onAdd({ kind: "article", title: d.title, text: d.text }); }
    setOpen("");
  };
  const BTN: [typeof open, string, string][] = [["vacancy", "🏠", "내 공실"], ["complex", "🏢", "단지 시세"], ["area", "📊", "지역 현황"], ["article", "📰", "공실뉴스 기사"]];
  const lawds = useMemo(() => Object.entries(LAWD_NAMES).sort((a, b) => a[1].localeCompare(b[1], "ko")), []);
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        {BTN.map(([k, ic, l]) => (
          <button key={k} onClick={() => void show(k)}
            style={{ height: 36, borderRadius: 9, cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "inherit", position: "relative",
              border: `1px solid ${open === k ? BLUE : theme.border}`, background: open === k ? (dark ? "rgba(37,99,235,0.2)" : "#eff5ff") : "transparent", color: theme.textPrimary }}>
            {ic} {l}{suggest.includes(k) && <span style={{ position: "absolute", top: -6, right: -4, fontSize: 9.5, fontWeight: 800, background: "#16a34a", color: "#fff", borderRadius: 6, padding: "1px 5px" }}>추천</span>}
          </button>
        ))}
      </div>
      {open && (
        <div style={{ marginTop: 8, padding: 10, borderRadius: 10, border: `1px solid ${theme.border}`, background: dark ? "rgba(255,255,255,0.03)" : "#f8fafc", display: "flex", flexDirection: "column", gap: 6 }}>
          {(open === "complex" || open === "article") && (
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={open === "complex" ? "단지 이름 (2글자 이상) — Enter" : "기사 제목 찾기 — Enter"}
              onKeyDown={async (e) => { if (e.key !== "Enter") return; const d = await run(open === "complex" ? writingSearchComplexes(q) : writingArticles(q)); if (d) setList(d); }} style={inp} />
          )}
          {open === "area" ? (<>
            <select value={lawd} onChange={async (e) => { setLawd(e.target.value); setDong(""); const d = await run(writingAreaDongs(e.target.value)); setDongs(d || []); }} style={inp}>
              <option value="">시·군·구 고르기</option>
              {lawds.map(([k, n]) => <option key={k} value={k}>{n}</option>)}
            </select>
            <select value={dong} onChange={(e) => setDong(e.target.value)} disabled={!lawd} style={inp}>
              <option value="">동 전체</option>
              {dongs.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <div style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 12.5, color: theme.textPrimary }}>
              {([["apt", "아파트"], ["offi", "오피스텔"]] as const).map(([k, l]) => (
                <label key={k} style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}><input type="checkbox" checked={kinds.includes(k)} onChange={(e) => setKinds((v) => (e.target.checked ? [...v, k] : v.filter((x) => x !== k)))} />{l}</label>
              ))}
              <span style={{ flex: 1 }} />
              <select value={months} onChange={(e) => setMonths(Number(e.target.value))} style={{ ...inp, width: 110 }}>
                {[1, 3, 6, 12].map((m) => <option key={m} value={m}>최근 {m}개월</option>)}
              </select>
            </div>
            <button disabled={!lawd || busy} onClick={async () => { const d = await run(writingAreaFacts(lawd, dong, kinds, months)); if (d) { onAdd({ kind: "area", title: d.title, text: d.text }); setOpen(""); } }}
              style={{ height: 36, borderRadius: 9, border: 0, background: !lawd || busy ? "#94a3b8" : BLUE, color: "#fff", fontWeight: 800, cursor: lawd && !busy ? "pointer" : "default", fontFamily: "inherit" }}>{busy ? "불러오는 중…" : "이 지역 현황 넣기"}</button>
          </>) : (
            <div style={{ maxHeight: 220, overflowY: "auto" }}>
              {list.map((x) => (
                <button key={x.id} onClick={() => void take(open as "vacancy" | "complex" | "article", x.id)} disabled={busy}
                  style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 10px", border: 0, borderRadius: 7, background: "transparent", color: theme.textPrimary, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = dark ? "rgba(255,255,255,0.08)" : "#eef2ff")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>{x.label}</button>
              ))}
              {!list.length && !busy && <div style={{ fontSize: 12.5, color: theme.textSecondary, padding: 6 }}>{open === "vacancy" ? "광고 중인 내 공실이 없어요." : "찾을 말을 넣고 Enter"}</div>}
            </div>
          )}
          {busy && <div style={{ fontSize: 12, color: theme.textSecondary }}>공실뉴스에서 불러오는 중…</div>}
          {err && <div style={{ fontSize: 12, color: "#dc2626" }}>{err}</div>}
        </div>
      )}
    </div>
  );
}
