"use client";

/**
 * 뉴스·SNS자동화 › 자유 글쓰기 (2026-11-05 사장님: "자유글쓰기 뉴스 칼럼 밑에 별도로 만들어줘")
 *  기사쓰기 화면에서 공실 소개·공실 고르기·섹션·기자명·부제목을 뺀 것 — 왼쪽 글쓰기 도구 + 제목 + 본문만.
 *  다 쓰면  [이 글로 블로그·SNS·대본 만들기] → 뉴스칼럼 작업 화면(이 글이 소재, 사진도 함께)
 *          [뉴스 기사로 보내기] → 기사쓰기에 제목·본문·사진을 채워서 (기사 한도는 등록할 때만)
 */
import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ArticleAiTool, { type ArticleDraft } from "../writing/ArticleAiTool";
import { studioBridge } from "../studio-web";
import WorkCardGrid, { LinkNotice, type WorkCard } from "./WorkCardGrid";
import { CardMenu, IconLink, IconPen, IconTrash, LinksPanel, type MenuItem } from "./VacancyCardGrid";
import type { PromoChannel } from "@/utils/vacancyPromos";
import { listFreeDrafts, pickFreeDraft, saveFreeDraft, type FreeFile } from "../studio-web/freeWrite";

type Theme = { cardBg: string; textPrimary: string; textSecondary: string; border: string; bg?: string; darkMode?: boolean };
type Photo = { url: string; caption: string };
type Col = { id: string; label: string; createdAt: string; source: { mode: string; topic?: { subject?: string; memo?: string } }; thumb?: string | null; done?: Record<string, boolean>; links?: Record<string, string> };
type Bridge = { column: { create: (source: unknown) => Promise<{ id: string }>; list: (limit?: number) => Promise<Col[]>; get?: (id: string) => Promise<(Col & { captures?: { thumb: string; caption?: string; kind?: string }[] }) | null>; remove?: (id: string) => Promise<boolean>; setLink?: (id: string, channel: string, url: string) => Promise<unknown> } };
/** [링크체크] 채널 — 블로그·인스타·스레드·페북·유튜브 (공실뉴스 기사 칸은 빼고) */
export const COL_LINK_CH: [PromoChannel, string][] = [["blog", "네이버 블로그"], ["instagram", "인스타그램"], ["threads", "스레드"], ["facebook", "페이스북"], ["youtube", "유튜브"]];
const shortDay = (iso: string) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? "" : `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`; };

export default function StudioFreeWrite({ theme, onOpenColumn }: { theme: Theme; /** 만든 칼럼을 뉴스칼럼에서 연다 (tab — 그 채널부터) */ onOpenColumn: (id: string, tab?: string) => void }) {
  const router = useRouter();
  // 처음엔 목록 — [+ 새로 만들기] + 자유 글쓰기로 쓴 글 카드 (2026-11-05 사장님: "자유글쓰기도 이런 형식으로", 뉴스칼럼과 같이)
  const [view, setView] = useState<"list" | "write">("list");
  const [cards, setCards] = useState<WorkCard[] | null>(null);
  // 올린 게시물 주소 — 그 글의 작업 파일(회원 PC)에 저장, 서버에는 안 올림 (2026-11-06 사장님: "자유글쓰기에서 매칭이 되지 않음")
  const [linksFor, setLinksFor] = useState<{ id: string; x: number; y: number } | null>(null);
  // 카드 오른쪽 클릭 메뉴 (2026-11-10 사장님: "자유 글쓰기 우측 클릭 메뉴가 안나와") — 뉴스칼럼 카드 메뉴와 같은 모양
  const [menu, setMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const load = () => {
    studioBridge<Bridge>()?.column.list(200).then((l) => setCards(l.filter((c) => c.source?.mode === "topic").map((c) => ({
      id: c.id, badge: "내 글", date: shortDay(c.createdAt), title: c.label || c.source.topic?.subject || "자유 글", line1: `${String(c.source.topic?.memo || "").length.toLocaleString("ko-KR")}자`,
      thumb: c.thumb || null, done: c.done, links: c.links || {},
    })))).catch(() => setCards([]));
  };
  useEffect(() => {
    if (view !== "list") return;
    load();
    window.addEventListener("gs-col-links", load); // 도우미가 올린 주소를 잡으면
    return () => window.removeEventListener("gs-col-links", load);
  }, [view]); // eslint-disable-line react-hooks/exhaustive-deps
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  // [저장하기]·[불러오기] — 쓰는 중인 글을 PC 작업 파일(.gsn)로 (2026-11-07 사장님: "자유글쓰기는 저장하기 불러오기를 넣었으면 좋겠어")
  const [draftId, setDraftId] = useState("");
  const [fileName, setFileName] = useState(""); // 한 번 저장하면 그 파일에 덮어쓴다
  const sigOf = (t: string, b: string, ps: Photo[]) => JSON.stringify([t.trim(), b.trim(), ps.map((p) => p.url)]);
  const [savedSig, setSavedSig] = useState(sigOf("", "", []));
  const [savedNote, setSavedNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadList, setLoadList] = useState<FreeFile[] | null>(null);
  const dirty = view === "write" && Boolean(title.trim() || body.trim()) && sigOf(title, body, photos) !== savedSig;
  const leaveOk = () => !dirty || window.confirm("저장하지 않은 글이 있어요. 저장하지 않고 나갈까요?");
  useEffect(() => {
    if (!dirty) return;
    const stop = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", stop);
    return () => window.removeEventListener("beforeunload", stop);
  }, [dirty]);
  const startNew = () => {
    setTitle(""); setBody(""); setPhotos([]); setErr("");
    setDraftId(`free-${Date.now().toString(36)}`); setFileName(""); setSavedSig(sigOf("", "", [])); setSavedNote("");
  };
  const hhmm = () => new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false });
  const saveNow = async () => {
    if (!title.trim() && !body.trim()) { setErr("제목이나 본문을 쓴 뒤 저장해 주세요."); return; }
    setSaving(true); setErr("");
    try {
      const r = await saveFreeDraft({ id: draftId || `free-${Date.now().toString(36)}`, title: title.trim(), body, photos }, fileName);
      setFileName(r.name); setSavedSig(sigOf(title, body, photos));
      setSavedNote(r.where === "folder" ? `저장됨 · ${hhmm()} · 01 뉴스SNS발행 › ${r.name}` : `내려받음 · ${hhmm()} · ${r.name} (저장 폴더를 정하면 그 폴더에 저장돼요)`);
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setSaving(false); }
  };
  const fill = (name: string, d: FreeFile["draft"]) => {
    setTitle(d.title); setBody(d.body); setPhotos(d.photos); setErr("");
    setDraftId(d.id || `free-${Date.now().toString(36)}`); setFileName(name); setSavedSig(sigOf(d.title, d.body, d.photos));
    setSavedNote(`불러옴 · ${name}`); setLoadList(null);
  };
  const openLoad = async () => {
    if (!leaveOk()) return;
    setErr("");
    try {
      const l = await listFreeDrafts();
      if (l) { setLoadList(l); return; }
      const p = await pickFreeDraft(); // 폴더를 못 쓰면 파일 고르기
      if (p) fill(p.name, p.draft);
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
  };
  const openOther = async () => {
    try { const p = await pickFreeDraft(); if (p) fill(p.name, p.draft); } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
  };

  // 글쓰기 도구가 쓴 초안 → 제목 · 본문 (소제목은 한 줄로) · 사진
  const onDraft = (d: ArticleDraft) => {
    setTitle(d.title || "");
    const text = [...(d.subtitles || []), ...(d.paragraphs || []).map((p) => [p.heading, p.text].filter(Boolean).join("\n"))].filter(Boolean).join("\n\n");
    setBody(text);
    setPhotos((d.photos || []).filter((p) => p.url).map((p) => ({ url: p.url, caption: p.caption || "" })));
  };
  const ready = Boolean(title.trim() && body.trim());

  const toSns = async () => {
    const b = studioBridge<Bridge>();
    if (!b || !ready) return;
    setBusy("글을 준비하는 중…"); setErr("");
    try {
      const c = await b.column.create({ mode: "topic", angle: "", topic: { subject: title.trim(), intro: "", points: [], outro: "", memo: body.trim() }, media: photos });
      onOpenColumn(c.id);
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(""); }
  };
  // 기사쓰기에 채워 보내기 — 공실관리 [SNS뉴스발행]과 같은 길 (?studioDraft=…)
  const toArticle = () => { if (ready) goArticle(title.trim(), body, photos); };
  const goArticle = (tt: string, bb: string, ps: Photo[]) => {
    const id = `free-${Date.now().toString(36)}`;
    const paragraphs = bb.split(/\n{2,}/).map((x) => x.trim()).filter(Boolean);
    try {
      sessionStorage.setItem(`gsn-web-draft:${id}`, JSON.stringify({ title: tt, subtitles: [], paragraphs, keywords: [], saleKind: "", photos: ps.map((p, i) => ({ dataUrl: p.url, caption: p.caption, after: Math.min(i, paragraphs.length - 1) })) }));
    } catch { /* 저장 못 하면 빈 기사쓰기 */ }
    router.push(`?menu=article&action=write&studioDraft=${id}&return=${encodeURIComponent("realty_admin?menu=sns")}`, { scroll: false });
  };

  const cardMenu = (id: string, x: number, y: number): MenuItem[][] => [
    [
      { label: "블로그·SNS 글 쓰기", icon: <IconPen />, note: "이 글로", go: () => onOpenColumn(id, "blog") },
      { label: "쇼츠릴스 대본 쓰기", icon: <IconPen />, note: "이 글로", go: () => onOpenColumn(id, "youtube") },
    ],
    [
      { label: "뉴스 기사로 보내기", icon: <IconPen />, note: "기사쓰기에 채움", go: () => void sendToArticle(id) },
      { label: "링크 보기·복사", icon: <IconLink />, note: "올린 게시물", go: () => setLinksFor({ id, x, y }) },
    ],
    [
      { label: "삭제", icon: <IconTrash />, danger: true, go: async () => {
          const c = (cards || []).find((v) => v.id === id);
          if (!confirm(`"${c?.title || "이 글"}"을 목록에서 지울까요?
이 글로 쓴 블로그·SNS·대본도 함께 지워져요. 이미 올린 게시물은 그대로예요.`)) return;
          try { await studioBridge<Bridge>()?.column.remove?.(id); load(); } catch (e) { alert(e instanceof Error ? e.message : String(e)); }
        } },
    ],
  ];
  // 목록의 글을 기사쓰기로 — 글쓰기 화면의 [뉴스 기사로 보내기]와 같은 길
  const sendToArticle = async (id: string) => {
    const c = await studioBridge<Bridge>()?.column.get?.(id).catch(() => null);
    const t = c?.source?.topic;
    if (!c || !t) { alert("이 글을 찾지 못했어요. 새로고침한 뒤 다시 해 주세요."); return; }
    goArticle(String(t.subject || c.label || ""), String(t.memo || ""), (c.captures || []).filter((m) => m.kind !== "video" && m.thumb).map((m) => ({ url: m.thumb, caption: m.caption || "" })));
  };

  if (view === "list") return (
    <div>
      <LinkNotice darkMode={Boolean(theme.darkMode)} />
      <WorkCardGrid theme={theme} variant="article" addLabel="새로 만들기" cards={cards}
        onAdd={() => { startNew(); setView("write"); }}
        onOpen={(id, tab) => {
          const url = (cards || []).find((c) => c.id === id)?.links?.[tab];
          if (url) return void window.open(url, "_blank", "noopener"); // 올린 채널 — 그 게시물로
          onOpenColumn(id, tab === "article" ? "blog" : tab);
        }}
        onLinks={(id, x, y) => setLinksFor({ id, x, y })}
        onMenu={(id, x, y) => setMenu({ id, x, y })}
        placeholder={<span style={{ fontSize: 30 }}>✍</span>} empty="아직 쓴 글이 없어요. [새로 만들기]로 첫 글을 써 보세요." />
      {menu && (() => { const c = (cards || []).find((v) => v.id === menu.id); return (
        <CardMenu theme={theme as never} title={c?.title || "자유 글"} sub={["내 글", c?.date].filter(Boolean).join(" · ")} x={menu.x} y={menu.y}
          groups={cardMenu(menu.id, menu.x, menu.y)} onClose={() => setMenu(null)} />
      ); })()}
      {linksFor && (
        <LinksPanel theme={theme as never} x={linksFor.x} y={linksFor.y} channels={COL_LINK_CH} onClose={() => setLinksFor(null)}
          links={(cards || []).find((c) => c.id === linksFor.id)?.links || {}}
          onSave={async (ch, u) => {
            const b = studioBridge<Bridge>();
            if (!b?.column.setLink) return "이 화면을 새로고침해 주세요.";
            try { await b.column.setLink(linksFor.id, ch, u); load(); return ""; } catch (e) { return e instanceof Error ? e.message : String(e); }
          }} />
      )}
    </div>
  );

  const input: React.CSSProperties = { width: "100%", boxSizing: "border-box", padding: "11px 14px", border: `1px solid ${theme.border}`, borderRadius: 8, fontSize: 15, background: theme.cardBg, color: theme.textPrimary, fontFamily: "inherit" };
  return (
    <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
      <aside style={{ width: 400, minWidth: 400, position: "sticky", top: 0, height: "calc(100vh - 200px)", border: `1px solid ${theme.border}`, borderRadius: 8, overflow: "hidden", background: "#fff" }}>
        <ArticleAiTool onDraft={onDraft} hasContent={() => Boolean(title.trim() || body.trim())} noVacancy />
      </aside>
      {/* data-ai-dock — AI 창(ChatGPT·Gemini)이 이 칸 위에 작은 창으로 뜬다 (큰 새 탭 대신, 2026-11-05 사장님) */}
      <div data-ai-dock="" style={{ flex: 1, minWidth: 0, background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: 12, padding: "22px 26px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "0 0 18px" }}>
          <button onClick={() => { if (leaveOk()) setView("list"); }} style={{ padding: "7px 12px", borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.cardBg, color: theme.textPrimary, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>← 목록으로</button>
          <h2 style={{ margin: 0, fontSize: 21, fontWeight: 800, color: theme.textPrimary }}>자유 글쓰기</h2>
          <span style={{ marginLeft: "auto", fontSize: 12.5, color: dirty ? "#b45309" : theme.textSecondary, maxWidth: 360, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={savedNote}>
            {dirty ? (fileName ? "고친 내용이 아직 저장되지 않았어요" : "아직 저장하지 않았어요") : savedNote}
          </span>
          <button onClick={() => void openLoad()} title="저장해 둔 쓰던 글을 열어요"
            style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.cardBg, color: theme.textPrimary, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>불러오기</button>
          <button onClick={() => void saveNow()} disabled={saving} title="쓰는 중인 제목·본문·사진을 내 PC 공실뉴스 폴더에 저장해요"
            style={{ padding: "7px 14px", borderRadius: 8, border: 0, background: saving ? "#94a3b8" : "#1a3a6b", color: "#fff", fontSize: 13, fontWeight: 800, cursor: saving ? "default" : "pointer" }}>{saving ? "저장하는 중…" : "저장하기"}</button>
        </div>
        <label style={{ display: "block", fontSize: 14, fontWeight: 700, color: theme.textPrimary, marginBottom: 6 }}>제목</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="제목을 입력하세요" style={input} />
        <label style={{ display: "block", fontSize: 14, fontWeight: 700, color: theme.textPrimary, margin: "18px 0 6px" }}>본문</label>
        <textarea ref={bodyRef} value={body} onChange={(e) => setBody(e.target.value)} rows={20}
          placeholder={"형식 없이 자유롭게 써 주세요. 왼쪽 글쓰기 도구로 AI 초안을 받아 고쳐 써도 돼요.\n다 쓰면 아래에서 블로그·SNS·대본을 만들거나 뉴스 기사로 보낼 수 있어요."}
          style={{ ...input, lineHeight: 1.8, resize: "vertical", minHeight: 360 }} />
        <div style={{ fontSize: 12.5, color: theme.textSecondary, marginTop: 4 }}>{body.length.toLocaleString("ko-KR")}자</div>
        {photos.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: theme.textPrimary, marginBottom: 8 }}>사진 {photos.length}장 <span style={{ fontSize: 12.5, fontWeight: 500, color: theme.textSecondary }}>블로그·SNS·쇼츠·기사에 함께 들어가요</span></div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {photos.map((p, i) => (
                <div key={i} style={{ position: "relative" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt={p.caption} title={p.caption} style={{ width: 120, height: 84, objectFit: "cover", borderRadius: 6, border: `1px solid ${theme.border}`, display: "block" }} />
                  <button onClick={() => setPhotos((l) => l.filter((_, j) => j !== i))} title="빼기" style={{ position: "absolute", top: 3, right: 3, width: 20, height: 20, borderRadius: "50%", border: 0, background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: 11, cursor: "pointer" }}>✕</button>
                </div>
              ))}
            </div>
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 22, flexWrap: "wrap" }}>
          {busy && <span style={{ fontSize: 14, color: "#1a3a6b", fontWeight: 600 }}>{busy}</span>}
          <button onClick={toArticle} disabled={!ready || Boolean(busy)} title="기사쓰기 화면에 제목·본문·사진을 채워요. 기사 한도는 등록할 때만 세요"
            style={{ marginLeft: "auto", padding: "12px 18px", borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.cardBg, color: !ready ? "#94a3b8" : theme.textPrimary, fontSize: 14.5, fontWeight: 800, cursor: ready ? "pointer" : "default" }}>뉴스 기사로 보내기</button>
          <button onClick={() => void toSns()} disabled={!ready || Boolean(busy)}
            style={{ padding: "12px 20px", borderRadius: 8, border: 0, background: !ready || busy ? "#94a3b8" : "#1a3a6b", color: "#fff", fontSize: 14.5, fontWeight: 800, cursor: ready && !busy ? "pointer" : "default" }}>이 글로 블로그·SNS·대본 만들기</button>
        </div>
        {!ready && <div style={{ fontSize: 12.5, color: theme.textSecondary, marginTop: 8, textAlign: "right" }}>제목과 본문을 쓰면 눌러져요.</div>}
        {err && <div style={{ marginTop: 10, fontSize: 14, color: "#c53030" }}>{err}</div>}
      </div>
      {loadList && (
        <div onClick={() => setLoadList(null)} style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(15,23,42,.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 540, maxWidth: "92vw", maxHeight: "70vh", display: "flex", flexDirection: "column", background: "#fff", borderRadius: 10, overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,.25)" }}>
            <div style={{ display: "flex", alignItems: "center", padding: "14px 18px", borderBottom: "1px solid #e5e7eb" }}>
              <b style={{ flex: 1, fontSize: 16, color: "#111827" }}>쓰던 글 불러오기</b>
              <button type="button" onClick={() => setLoadList(null)} style={{ border: 0, background: "none", fontSize: 18, color: "#6b7280", cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ overflowY: "auto", padding: 8 }}>
              {!loadList.length && <div style={{ padding: 24, textAlign: "center", color: "#9ca3af", fontSize: 14 }}>저장한 글이 없어요. 글을 쓰고 [저장하기]를 눌러 주세요.</div>}
              {loadList.map((r) => (
                <button key={r.name} type="button" onClick={() => fill(r.name, r.draft)}
                  style={{ display: "block", width: "100%", textAlign: "left", padding: "11px 12px", border: 0, borderBottom: "1px solid #f1f3f5", background: "#fff", cursor: "pointer" }}>
                  <div style={{ fontSize: 14.5, fontWeight: 800, color: "#1f2937" }}>{r.title || "무제"}</div>
                  <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>
                    {r.savedAt ? new Date(r.savedAt).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit" }) : ""} · {r.chars.toLocaleString("ko-KR")}자 · {r.name}
                  </div>
                </button>
              ))}
            </div>
            <div style={{ padding: "10px 18px", borderTop: "1px solid #e5e7eb", textAlign: "right" }}>
              <button type="button" onClick={() => void openOther()} style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid #d1d5db", background: "#fff", color: "#374151", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>다른 곳에서 파일 열기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
