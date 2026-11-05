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

type Theme = { cardBg: string; textPrimary: string; textSecondary: string; border: string; bg?: string; darkMode?: boolean };
type Photo = { url: string; caption: string };
type Col = { id: string; label: string; createdAt: string; source: { mode: string; topic?: { subject?: string; memo?: string } }; thumb?: string | null; done?: Record<string, boolean> };
type Bridge = { column: { create: (source: unknown) => Promise<{ id: string }>; list: (limit?: number) => Promise<Col[]> } };
const shortDay = (iso: string) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? "" : `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`; };

export default function StudioFreeWrite({ theme, onOpenColumn }: { theme: Theme; /** 만든 칼럼을 뉴스칼럼에서 연다 (tab — 그 채널부터) */ onOpenColumn: (id: string, tab?: string) => void }) {
  const router = useRouter();
  // 처음엔 목록 — [+ 새로 만들기] + 자유 글쓰기로 쓴 글 카드 (2026-11-05 사장님: "자유글쓰기도 이런 형식으로", 뉴스칼럼과 같이)
  const [view, setView] = useState<"list" | "write">("list");
  const [cards, setCards] = useState<WorkCard[] | null>(null);
  useEffect(() => {
    if (view !== "list") return;
    studioBridge<Bridge>()?.column.list(200).then((l) => setCards(l.filter((c) => c.source?.mode === "topic").map((c) => ({
      id: c.id, badge: "내 글", date: shortDay(c.createdAt), title: c.label || c.source.topic?.subject || "자유 글", line1: `${String(c.source.topic?.memo || "").length.toLocaleString("ko-KR")}자`,
      thumb: c.thumb || null, done: c.done,
    })))).catch(() => setCards([]));
  }, [view]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const bodyRef = useRef<HTMLTextAreaElement>(null);

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
  const toArticle = () => {
    if (!ready) return;
    const id = `free-${Date.now().toString(36)}`;
    const paragraphs = body.split(/\n{2,}/).map((x) => x.trim()).filter(Boolean);
    try {
      sessionStorage.setItem(`gsn-web-draft:${id}`, JSON.stringify({ title: title.trim(), subtitles: [], paragraphs, keywords: [], saleKind: "", photos: photos.map((p, i) => ({ dataUrl: p.url, caption: p.caption, after: Math.min(i, paragraphs.length - 1) })) }));
    } catch { /* 저장 못 하면 빈 기사쓰기 */ }
    router.push(`?menu=article&action=write&studioDraft=${id}&return=${encodeURIComponent("realty_admin?menu=sns")}`, { scroll: false });
  };

  if (view === "list") return (
    <div>
      <LinkNotice darkMode={Boolean(theme.darkMode)} />
      <WorkCardGrid theme={theme} variant="article" addLabel="새로 만들기" cards={cards}
        onAdd={() => { setTitle(""); setBody(""); setPhotos([]); setErr(""); setView("write"); }}
        onOpen={(id, tab) => onOpenColumn(id, tab === "article" ? "blog" : tab)}
        placeholder={<span style={{ fontSize: 30 }}>✍</span>} empty="아직 쓴 글이 없어요. [새로 만들기]로 첫 글을 써 보세요." />
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
          <button onClick={() => setView("list")} style={{ padding: "7px 12px", borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.cardBg, color: theme.textPrimary, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>← 목록으로</button>
          <h2 style={{ margin: 0, fontSize: 21, fontWeight: 800, color: theme.textPrimary }}>자유 글쓰기</h2>
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
    </div>
  );
}
