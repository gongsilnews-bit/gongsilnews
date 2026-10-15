"use client";

import React, { useEffect, useRef, useState } from "react";

/**
 * 블로그 미리보기 편집기 (공실뉴스 스튜디오 SNS뉴스발행 3단계)
 *
 * 크롬 확장의 블로그 탭처럼, 네이버에 들어갈 순서 그대로 보여 주고 그 자리에서 고친다.
 *  - 대표 사진 → (0번 자리 사진) → 문단1 → (1번 자리 사진) → 문단2 … 순서. 네이버 채우기도 이 순서를 따른다.
 *  - 제목·문단은 눌러서 바로 고친다. "■"로 시작하는 문단은 소제목.
 *  - 사진: 대표로, 위로·아래로(앞·뒤 문단 사이로), 설명 고치기, 삭제, 자리마다 내 PC 사진 넣기.
 *  - AI 이미지: 자리마다 화풍(확장과 같은 5종)·장면 요청으로 ChatGPT 가 그린 그림을 넣는다.
 *  - 고친 내용은 잠시 뒤 앱(PC)에 저장된다.
 */

export type BlogMedia = { id: string; kind: string; caption: string; isCover: boolean; insertAfterParagraph: number | null; thumb: string | null };
export type BlogDraft = { vacancyId: string; style: string; length: string; title: string; paragraphs: string[]; keywords: string[]; media: BlogMedia[] };

type Bridge = {
  blog: {
    save: (patch: { vacancyId: string; title: string; paragraphs: string[]; keywords: string[]; media: Omit<BlogMedia, "thumb" | "kind">[] }) => Promise<unknown>;
    addPhoto: (opts: { vacancyId: string; dataUrl: string; slot: number }) => Promise<BlogMedia>;
    imageStyles: () => Promise<{ id: string; label: string }[]>;
    makeImage: (opts: { vacancyId: string; style: string; request: string; slot: number }) => Promise<BlogMedia>;
    onProgress: (fn: (t: string) => void) => () => void;
  };
};
const bridge = () => (window as unknown as { gongsilStudio?: Bridge }).gongsilStudio ?? null;

const KIND_LABEL: Record<string, string> = { photo: "등록 사진", proof: "공실열람 검증", map: "지도", roadview: "로드뷰", upload: "내 사진", ai: "AI 이미지" };
const isHeading = (p: string) => p.startsWith("■");
const stripHeading = (p: string) => p.replace(/^■\s*/, "");

type Theme = { cardBg: string; textPrimary: string; textSecondary: string; border: string; bg?: string };

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

export default function StudioBlogEditor({ theme, initial }: { theme: Theme; initial: BlogDraft }) {
  const [title, setTitle] = useState(initial.title);
  const [paragraphs, setParagraphs] = useState(initial.paragraphs);
  const [keywords, setKeywords] = useState(initial.keywords.join(", "));
  const [media, setMedia] = useState(initial.media);
  const [saved, setSaved] = useState<"saved" | "saving" | "error">("saved");
  const [adding, setAdding] = useState<number | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [imageStyles, setImageStyles] = useState<{ id: string; label: string }[]>([]);
  const [aiSlot, setAiSlot] = useState<number | null>(null); // AI 이미지 창을 연 자리
  const [openSlot, setOpenSlot] = useState<number | null>(null); // ⊕ 메뉴를 연 자리
  const [aiStyle, setAiStyle] = useState("news");
  const [aiRequest, setAiRequest] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiMsg, setAiMsg] = useState("");
  const [aiErr, setAiErr] = useState("");

  useEffect(() => {
    bridge()?.blog.imageStyles().then(setImageStyles).catch(() => {});
  }, []);

  const makeImage = async (slot: number) => {
    const b = bridge();
    if (!b) return;
    setAiBusy(true);
    setAiErr("");
    const off = b.blog.onProgress(setAiMsg);
    try {
      const item = await b.blog.makeImage({ vacancyId: initial.vacancyId, style: aiStyle, request: aiRequest, slot });
      setMedia((list) => [...list, item]);
      setAiSlot(null);
      setAiRequest("");
    } catch (e) {
      setAiErr((e instanceof Error ? e.message : String(e)).replace(/^Error invoking remote method '[^']+': (Error: )?/, ""));
    } finally {
      off();
      setAiMsg("");
      setAiBusy(false);
    }
  };
  const addSlot = useRef(0);
  const first = useRef(true);

  // 고친 내용 저장 (0.6초 동안 더 고치지 않으면)
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setSaved("saving");
    const t = setTimeout(() => {
      bridge()
        ?.blog.save({
          vacancyId: initial.vacancyId,
          title,
          paragraphs,
          keywords: keywords.split(/[,\n]/).map((k) => k.trim()).filter(Boolean),
          media: media.map(({ id, caption, isCover, insertAfterParagraph }) => ({ id, caption, isCover, insertAfterParagraph })),
        })
        .then(() => setSaved("saved"))
        .catch(() => setSaved("error"));
    }, 600);
    return () => clearTimeout(t);
  }, [title, paragraphs, keywords, media, initial.vacancyId]);

  const n = paragraphs.length;
  const cover = media.find((m) => m.isCover);
  const inSlot = (slot: number) => media.filter((m) => !m.isCover && (m.insertAfterParagraph ?? n) === slot);

  const update = (id: string, patch: Partial<BlogMedia>) => setMedia((list) => list.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  const makeCover = (id: string) =>
    setMedia((list) => list.map((m) => (m.id === id ? { ...m, isCover: true, insertAfterParagraph: null } : m.isCover ? { ...m, isCover: false, insertAfterParagraph: 0 } : m)));
  const move = (id: string, dir: -1 | 1) =>
    setMedia((list) => {
      const m = list.find((x) => x.id === id);
      if (!m) return list;
      if (m.isCover) {
        // 대표 사진을 아래로 내리면 대표를 풀고 첫 자리로
        if (dir === 1) return list.map((x) => (x.id === id ? { ...x, isCover: false, insertAfterParagraph: 0 } : x));
        return list;
      }
      const slot = m.insertAfterParagraph ?? n;
      const same = list.filter((x) => !x.isCover && (x.insertAfterParagraph ?? n) === slot);
      const pos = same.findIndex((x) => x.id === id);
      // 같은 자리 안에서 먼저 순서를 바꾸고, 끝에 닿으면 앞·뒤 문단 사이로 옮긴다
      if ((dir === -1 && pos > 0) || (dir === 1 && pos < same.length - 1)) {
        const other = same[pos + dir];
        const a = list.indexOf(m);
        const b = list.indexOf(other);
        const next = list.slice();
        next[a] = other;
        next[b] = m;
        return next;
      }
      const target = Math.max(0, Math.min(n, slot + dir));
      if (target === slot) return list;
      const rest = list.filter((x) => x.id !== id);
      const moved = { ...m, insertAfterParagraph: target };
      // 위로 가면 그 자리의 맨 뒤, 아래로 가면 맨 앞
      const targetItems = rest.filter((x) => !x.isCover && (x.insertAfterParagraph ?? n) === target);
      if (dir === 1 && targetItems.length) {
        const at = rest.indexOf(targetItems[0]);
        return [...rest.slice(0, at), moved, ...rest.slice(at)];
      }
      return [...rest, moved];
    });
  const remove = (id: string) =>
    setMedia((list) => {
      const next = list.filter((m) => m.id !== id);
      // 대표를 지우면 다음 사진을 대표로
      if (list.find((m) => m.id === id)?.isCover && next.length) next[0] = { ...next[0], isCover: true, insertAfterParagraph: null };
      return next;
    });

  const pickPhotos = (slot: number) => {
    addSlot.current = slot;
    fileInput.current?.click();
  };
  const onFiles = async (files: FileList | null) => {
    const b = bridge();
    if (!b || !files || !files.length) return;
    setAdding(addSlot.current);
    try {
      for (const f of Array.from(files)) {
        const item = await b.blog.addPhoto({ vacancyId: initial.vacancyId, dataUrl: await readAsDataUrl(f), slot: addSlot.current });
        setMedia((list) => [...list, item]);
      }
    } finally {
      setAdding(null);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  /* 사진 위 도구: 평소엔 숨기고 사진에 마우스를 올릴 때만 작은 아이콘 묶음으로 보인다 */
  const Ico = ({ d, fill = false }: { d: string; fill?: boolean }) => (
    <svg viewBox="0 0 24 24" width="15" height="15" fill={fill ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
  );
  const STAR = "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z";
  const UP = "M12 19V5M5 12l7-7 7 7";
  const DOWN = "M12 5v14M19 12l-7 7-7-7";
  const TRASH = "M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14";

  const photo = (m: BlogMedia) => (
    <figure key={m.id} className="sbe-photo" style={{ margin: "16px 0", borderRadius: 12, overflow: "hidden", background: theme.cardBg, boxShadow: m.isCover ? "0 0 0 2px #1a3a6b" : `0 0 0 1px ${theme.border}` }}>
      <div style={{ position: "relative", background: "#111" }}>
        {m.thumb ? <img src={m.thumb} alt={m.caption} style={{ width: "100%", maxHeight: 420, objectFit: "contain", display: "block" }} /> : <div style={{ height: 160 }} />}
        <span style={{ position: "absolute", top: 10, left: 10, fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 999, background: m.isCover ? "#1a3a6b" : "rgba(17,24,39,0.55)", color: "#fff", backdropFilter: "blur(6px)", letterSpacing: "-0.2px" }}>
          {m.isCover ? "대표 사진" : KIND_LABEL[m.kind] || m.kind}
        </span>
        <div className="sbe-tools">
          {!m.isCover && <button className="sbe-tool" onClick={() => makeCover(m.id)} title="대표 사진으로"><Ico d={STAR} /></button>}
          <button className="sbe-tool" onClick={() => move(m.id, -1)} title="위로"><Ico d={UP} /></button>
          <button className="sbe-tool" onClick={() => move(m.id, 1)} title="아래로"><Ico d={DOWN} /></button>
          <span className="sbe-sep" />
          <button className="sbe-tool sbe-danger" onClick={() => remove(m.id)} title="삭제"><Ico d={TRASH} /></button>
        </div>
      </div>
      <input value={m.caption} onChange={(e) => update(m.id, { caption: e.target.value })} placeholder="사진 설명"
        style={{ width: "100%", boxSizing: "border-box", border: 0, padding: "9px 12px", fontSize: 12.5, color: theme.textSecondary, background: theme.cardBg, textAlign: "center", outline: "none" }} />
    </figure>
  );

  /* 문단 사이: 평소엔 안 보이고, 마우스를 올리면 얇은 선과 ⊕ — 누르면 [내 사진]·[AI 이미지] */
  const slotBar = (slot: number) => (
    <div className={`sbe-slot${openSlot === slot || aiSlot === slot || adding === slot ? " sbe-slot-on" : ""}`}>
      <div className="sbe-slot-line">
        {openSlot === slot ? (
          <div className="sbe-menu">
            <button onClick={() => { setOpenSlot(null); pickPhotos(slot); }}>
              <Ico d="M4 16l4-4 4 4 3-3 5 5M4 4h16v16H4zM15 8.5h.01" /> 내 사진
            </button>
            <button onClick={() => { setOpenSlot(null); setAiSlot(slot); setAiErr(""); }} disabled={aiBusy}>
              <Ico d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8zM19 15l.8 2.2 2.2.8-2.2.8L19 21l-.8-2.2-2.2-.8 2.2-.8z" /> AI 이미지
            </button>
            <button className="sbe-menu-x" onClick={() => setOpenSlot(null)} title="닫기">✕</button>
          </div>
        ) : (
          <button className="sbe-plus" onClick={() => setOpenSlot(slot)} title="이 자리에 사진 넣기" disabled={adding !== null}>
            {adding === slot ? "…" : "+"}
          </button>
        )}
      </div>
      {aiSlot === slot && (
        <div style={{ margin: "6px 0 14px", padding: "16px 18px", borderRadius: 12, background: theme.cardBg, boxShadow: `0 0 0 1px ${theme.border}, 0 6px 18px rgba(15,23,42,0.06)` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: theme.textPrimary }}>이 자리에 넣을 AI 이미지</span>
            <button onClick={() => setAiSlot(null)} disabled={aiBusy} style={{ border: 0, background: "transparent", color: theme.textSecondary, cursor: "pointer", fontSize: 14 }}>✕</button>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
            {imageStyles.map((st) => (
              <button key={st.id} onClick={() => setAiStyle(st.id)}
                style={{ padding: "6px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: "pointer",
                  border: `1px solid ${aiStyle === st.id ? "#1a3a6b" : theme.border}`, background: aiStyle === st.id ? "#1a3a6b" : "transparent", color: aiStyle === st.id ? "#fff" : theme.textPrimary }}>
                {st.label}
              </button>
            ))}
          </div>
          <input value={aiRequest} onChange={(e) => setAiRequest(e.target.value)} placeholder="그리고 싶은 장면 (비워 두면 글에서 알아서 고릅니다) 예: 해 질 녘 건물 정면"
            style={{ width: "100%", boxSizing: "border-box", padding: "9px 11px", border: `1px solid ${theme.border}`, borderRadius: 8, fontSize: 13, background: theme.cardBg, color: theme.textPrimary }} />
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
            <button onClick={() => makeImage(slot)} disabled={aiBusy}
              style={{ padding: "9px 16px", borderRadius: 8, border: 0, background: "#1a3a6b", color: "#fff", fontSize: 13, fontWeight: 700, cursor: aiBusy ? "default" : "pointer", opacity: aiBusy ? 0.6 : 1 }}>
              {aiBusy ? "그리는 중…" : "ChatGPT로 그리기"}
            </button>
            <span style={{ fontSize: 12, color: aiErr ? "#c53030" : theme.textSecondary }}>{aiErr || aiMsg || "1~3분 걸립니다. 글자·사람 얼굴은 넣지 않습니다."}</span>
          </div>
        </div>
      )}
    </div>
  );

  const editorCss = `
    .sbe-photo .sbe-tools{position:absolute;top:10px;right:10px;display:flex;align-items:center;gap:2px;padding:3px;border-radius:999px;
      background:rgba(255,255,255,0.92);box-shadow:0 2px 10px rgba(0,0,0,0.18);opacity:0;transform:translateY(-4px);transition:opacity .15s,transform .15s;backdrop-filter:blur(6px)}
    .sbe-photo:hover .sbe-tools{opacity:1;transform:none}
    .sbe-tool{width:30px;height:30px;border:0;border-radius:999px;background:transparent;color:#1f2937;cursor:pointer;display:flex;align-items:center;justify-content:center}
    .sbe-tool:hover{background:#eef2f7}
    .sbe-danger:hover{background:#fee2e2;color:#dc2626}
    .sbe-sep{width:1px;height:16px;background:#e5e7eb;margin:0 2px}
    .sbe-slot{position:relative}
    .sbe-slot-line{height:22px;display:flex;align-items:center;justify-content:center;position:relative}
    .sbe-slot-line::before{content:"";position:absolute;left:0;right:0;top:50%;border-top:1px dashed #cbd5e1;opacity:0;transition:opacity .15s}
    .sbe-slot:hover .sbe-slot-line::before,.sbe-slot-on .sbe-slot-line::before{opacity:1}
    .sbe-plus{position:relative;width:24px;height:24px;border-radius:999px;border:1px solid #cbd5e1;background:#fff;color:#475569;font-size:16px;line-height:1;cursor:pointer;
      opacity:0;transition:opacity .15s,transform .15s}
    .sbe-slot:hover .sbe-plus,.sbe-slot-on .sbe-plus{opacity:1}
    .sbe-plus:hover{transform:scale(1.1);border-color:#1a3a6b;color:#1a3a6b}
    .sbe-menu{position:relative;display:flex;align-items:center;gap:2px;padding:3px;border-radius:999px;background:#fff;box-shadow:0 0 0 1px #e2e8f0,0 4px 14px rgba(15,23,42,0.10)}
    .sbe-menu button{display:flex;align-items:center;gap:6px;border:0;background:transparent;border-radius:999px;padding:6px 12px;font-size:12.5px;font-weight:600;color:#1f2937;cursor:pointer}
    .sbe-menu button:hover{background:#f1f5f9}
    .sbe-menu .sbe-menu-x{padding:6px 9px;color:#94a3b8}
  `;

  return (
    <div style={{ marginTop: 18, border: `1px solid ${theme.border}`, borderRadius: 12, background: theme.bg || "#f6f8fa" }}>
      <input ref={fileInput} type="file" accept="image/*" multiple hidden onChange={(e) => onFiles(e.target.files)} />
      <style>{editorCss}</style>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderBottom: `1px solid ${theme.border}`, fontSize: 12, color: theme.textSecondary }}>
        <span>네이버에 들어갈 순서 그대로입니다. 글은 눌러서 고치고, 사진은 마우스를 올려 다룹니다. 문단 사이 ⊕로 사진을 넣습니다.</span>
        <span style={{ fontWeight: 700, color: saved === "error" ? "#c53030" : saved === "saving" ? "#b45309" : "#16a34a" }}>
          {saved === "error" ? "저장 실패" : saved === "saving" ? "저장 중…" : "✓ 저장됨"}
        </span>
      </div>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "22px 24px" }}>
        <textarea value={title} onChange={(e) => setTitle(e.target.value)} rows={2}
          style={{ width: "100%", boxSizing: "border-box", resize: "none", border: `1px solid transparent`, borderRadius: 8, padding: "6px 8px", fontSize: 22, fontWeight: 800, lineHeight: 1.4, color: theme.textPrimary, background: "transparent", fontFamily: "inherit" }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "#93c5fd")} onBlur={(e) => (e.currentTarget.style.borderColor = "transparent")} />

        {cover && photo(cover)}
        {inSlot(0).map(photo)}
        {slotBar(0)}

        {paragraphs.map((p, i) => (
          <React.Fragment key={i}>
            <div contentEditable suppressContentEditableWarning
              onBlur={(e) => {
                const text = (e.currentTarget.innerText || "").replace(/\n+/g, " ").trim();
                setParagraphs((list) => list.map((x, j) => (j === i ? (isHeading(x) ? `■ ${text}` : text) : x)));
              }}
              style={isHeading(p)
                ? { margin: "22px 0 8px", padding: "4px 8px", borderRadius: 6, fontSize: 18, fontWeight: 800, color: theme.textPrimary, outline: "none" }
                : { margin: "0 0 6px", padding: "4px 8px", borderRadius: 6, fontSize: 15, lineHeight: 1.85, color: theme.textPrimary, wordBreak: "keep-all", outline: "none" }}
              onFocus={(e) => (e.currentTarget.style.background = "rgba(147,197,253,0.18)")}
              onBlurCapture={(e) => (e.currentTarget.style.background = "transparent")}>
              {isHeading(p) ? stripHeading(p) : p}
            </div>
            {inSlot(i + 1).map(photo)}
            {slotBar(i + 1)}
          </React.Fragment>
        ))}

        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: theme.textSecondary, marginBottom: 6 }}>태그 (쉼표로 구분 · 발행 창에 자동 입력)</div>
          <textarea value={keywords} onChange={(e) => setKeywords(e.target.value)} rows={2}
            style={{ width: "100%", boxSizing: "border-box", border: `1px solid ${theme.border}`, borderRadius: 8, padding: "8px 10px", fontSize: 13, color: theme.textPrimary, background: theme.cardBg, fontFamily: "inherit" }} />
        </div>
        <div style={{ marginTop: 10, fontSize: 12, color: theme.textSecondary }}>글 끝에는 매물 정보 출처(중개사무소 정보)와 공실뉴스 매물 상세 링크가 자동으로 붙습니다.</div>
      </div>
    </div>
  );
}
