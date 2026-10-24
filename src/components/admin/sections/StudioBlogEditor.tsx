"use client";

import React, { useEffect, useRef, useState } from "react";
import StudioReviseBar from "./StudioReviseBar";
import StudioWorking from "./StudioWorking";
import { useStudioImager } from "./useStudioWriter";
import { IMAGE_STYLES } from "@/lib/studio-video/imageStyles";

/**
 * 블로그 미리보기 편집기 (공실스튜디오 SNS뉴스발행 3단계)
 *
 * 크롬 확장의 블로그 탭처럼, 네이버에 들어갈 순서 그대로 보여 주고 그 자리에서 고친다.
 *  - 대표 사진 → (0번 자리 사진) → 문단1 → (1번 자리 사진) → 문단2 … 순서. 네이버 채우기도 이 순서를 따른다.
 *  - 제목·문단은 눌러서 바로 고친다. "■"로 시작하는 문단은 소제목.
 *  - 사진: 대표로, 위로·아래로(앞·뒤 문단 사이로), 설명 고치기, 삭제, 자리마다 내 PC 사진 넣기.
 *  - AI 이미지: 자리마다 화풍(확장과 같은 5종)·장면 요청으로 ChatGPT 가 그린 그림을 넣는다.
 *  - [수정]: 그 사진을 내 사진이나 AI 이미지로 바꾼다 (자리·대표·순서는 그대로).
 *  - 고친 내용은 잠시 뒤 앱(PC)에 저장된다 (화면을 떠나면 바로 저장).
 *  - [수정 요청]: 확장과 같이 처음 쓴 ChatGPT 대화에 이어 보내 고친 글 전체를 받는다 (사진·자리는 그대로).
 */

export type BlogMedia = { id: string; kind: string; caption: string; isCover: boolean; insertAfterParagraph: number | null; thumb: string | null };
export type BlogDraft = { doc?: "blog" | "article"; vacancyId: string; style: string; length: string; title: string; subtitles?: string[]; paragraphs: string[]; keywords: string[]; media: BlogMedia[]; section1?: string; section2?: string; version?: string };
type SavePatch = { vacancyId: string; doc: string; title: string; subtitles?: string[]; paragraphs: string[]; keywords: string[]; media: Omit<BlogMedia, "thumb" | "kind">[] };

type Bridge = {
  blog: {
    save: (patch: SavePatch) => Promise<unknown>;
    revise: (opts: { vacancyId: string; doc: string; request: string }) => Promise<BlogDraft>;
    addPhoto: (opts: { vacancyId: string; doc: string; dataUrl: string; slot?: number; replaceId?: string }) => Promise<BlogMedia>;
    imageStyles: (vacancyId?: string) => Promise<{ id: string; label: string }[]>;
    makeImage: (opts: { vacancyId: string; doc: string; style: string; request: string; slot?: number; replaceId?: string; styleLabel?: string; stylePrompt?: string }) => Promise<BlogMedia>;
    onProgress: (fn: (t: string) => void) => () => void;
  };
};
const bridge = () => (window as unknown as { gongsilStudio?: Bridge }).gongsilStudio ?? null;

const KIND_LABEL: Record<string, string> = { photo: "등록 사진", proof: "공실열람 검증", map: "지도", roadview: "로드뷰", upload: "내 사진", ai: "AI 이미지", capture: "기사 화면" };
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
  const imgAi = useStudioImager(); // 고른 이미지 생성 AI (ChatGPT · Gemini)
  const doc = initial.doc || "blog"; // 'article' 이면 공실뉴스 기사 (부제 3줄)
  const [title, setTitle] = useState(initial.title);
  const [subtitles, setSubtitles] = useState<string[]>(() => [0, 1, 2].map((i) => (initial.subtitles || [])[i] || ""));
  const [paragraphs, setParagraphs] = useState(initial.paragraphs);
  const [keywords, setKeywords] = useState(initial.keywords.join(", "));
  const [media, setMedia] = useState(initial.media);
  const [saved, setSaved] = useState<"saved" | "saving" | "error">("saved");
  const [adding, setAdding] = useState<number | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [imageStyles, setImageStyles] = useState<{ id: string; label: string }[]>([]);
  const [aiSlot, setAiSlot] = useState<number | null>(null); // AI 이미지 창을 연 자리
  const [openSlot, setOpenSlot] = useState<number | null>(null); // ⊕ 메뉴를 연 자리
  const [editId, setEditId] = useState<string | null>(null); // [수정] 메뉴를 연 사진
  const [aiReplace, setAiReplace] = useState<string | null>(null); // AI 이미지로 바꿀 사진
  const replaceRef = useRef<string | null>(null); // 내 사진으로 바꿀 사진
  const [aiStyle, setAiStyle] = useState("news");
  const [aiRequest, setAiRequest] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiMsg, setAiMsg] = useState("");
  const [aiErr, setAiErr] = useState("");
  // AI 이미지는 공실스터디 멤버십 전용 (2026-10-24 사장님) — null 은 아직 모름(막지 않음, 서버가 한 번 더 막는다)
  const [paid, setPaid] = useState<boolean | null>(null);
  useEffect(() => {
    fetch("/api/studio/usage", { cache: "no-store" }).then((r) => r.json()).then((d) => setPaid(d.success ? d.simAllowed === true : null)).catch(() => {});
  }, []);
  const openStudy = () => {
    const url = `${window.location.origin}/study`;
    const studio = (window as unknown as { gongsilStudio?: { openInBrowser?: (u: string) => Promise<void> } }).gongsilStudio;
    if (studio?.openInBrowser) void studio.openInBrowser(url);
    else window.open(url, "_blank", "noopener");
  };

  useEffect(() => {
    // 칼럼이면 뉴스메이커 화풍(AI 추천 포함)
    bridge()?.blog.imageStyles(initial.vacancyId).then((list) => {
      setImageStyles(list);
      if (list.length && !list.some((x) => x.id === "news")) setAiStyle(list[0].id);
    }).catch(() => {});
  }, [initial.vacancyId]);

  const makeImage = async (target: { slot?: number; replaceId?: string }) => {
    const b = bridge();
    if (!b) return;
    setAiBusy(true);
    setAiErr("");
    const off = b.blog.onProgress(setAiMsg);
    try {
      // "vs:…" = 영상 편집기 그림 스타일 16가지 — 이름·조건을 함께 보내 그 화풍으로 (기사용 스타일은 첫 것을 바탕으로)
      const vs = aiStyle.startsWith("vs:") ? IMAGE_STYLES.find((x) => x.id === aiStyle.slice(3)) : undefined;
      const item = await b.blog.makeImage({ vacancyId: initial.vacancyId, doc, style: vs ? imageStyles[0]?.id || "news" : aiStyle, request: aiRequest, ...(vs ? { styleLabel: vs.label, stylePrompt: vs.prompt } : {}), ...target });
      setMedia((list) => (target.replaceId ? list.map((m) => (m.id === item.id ? { ...m, ...item } : m)) : [...list, item]));
      setAiSlot(null);
      setAiReplace(null);
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
  const pending = useRef<SavePatch | null>(null); // 아직 저장하지 않은 고친 내용
  const [rev, setRev] = useState(0); // [수정 요청]으로 글이 바뀌면 문단 칸을 새로 그린다

  const payload = (): SavePatch => ({
    vacancyId: initial.vacancyId,
    doc,
    title,
    subtitles,
    paragraphs,
    keywords: keywords.split(/[,\n]/).map((k) => k.trim()).filter(Boolean),
    media: media.map(({ id, caption, isCover, insertAfterParagraph }) => ({ id, caption, isCover, insertAfterParagraph })),
  });
  const flush = () => {
    const patch = pending.current;
    pending.current = null;
    return patch ? bridge()?.blog.save(patch) : undefined;
  };

  // 고친 내용 저장 (0.6초 동안 더 고치지 않으면)
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setSaved("saving");
    pending.current = payload();
    const t = setTimeout(() => {
      Promise.resolve(flush())
        .then(() => setSaved("saved"))
        .catch(() => setSaved("error"));
    }, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, subtitles, paragraphs, keywords, media, initial.vacancyId, doc]);
  // 다른 탭으로 가면 기다리지 않고 바로 저장한다
  useEffect(() => () => void flush(), []);

  /* [수정 요청] — 고친 내용을 먼저 저장하고 같은 대화에 이어 보낸다 */
  const revise = async (request: string, onProgress: (t: string) => void) => {
    const b = bridge();
    if (!b) return;
    pending.current = payload();
    await flush();
    const off = b.blog.onProgress(onProgress);
    try {
      const d = await b.blog.revise({ vacancyId: initial.vacancyId, doc, request });
      first.current = true; // 받은 글은 이미 저장돼 있다
      setTitle(d.title);
      setSubtitles([0, 1, 2].map((i) => (d.subtitles || [])[i] || ""));
      setParagraphs(d.paragraphs);
      setKeywords(d.keywords.join(", "));
      setMedia(d.media);
      setRev((r) => r + 1);
      setSaved("saved");
    } finally {
      off();
    }
  };

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
    replaceRef.current = null;
    fileInput.current?.click();
  };
  const pickReplace = (id: string) => {
    replaceRef.current = id;
    if (fileInput.current) fileInput.current.multiple = false;
    fileInput.current?.click();
  };
  const onFiles = async (files: FileList | null) => {
    const b = bridge();
    if (!b || !files || !files.length) return;
    setAdding(addSlot.current);
    try {
      const replaceId = replaceRef.current;
      if (replaceId) {
        const item = await b.blog.addPhoto({ vacancyId: initial.vacancyId, doc, dataUrl: await readAsDataUrl(files[0]), replaceId });
        setMedia((list) => list.map((m) => (m.id === item.id ? { ...m, ...item } : m)));
      } else {
        for (const f of Array.from(files)) {
          const item = await b.blog.addPhoto({ vacancyId: initial.vacancyId, doc, dataUrl: await readAsDataUrl(f), slot: addSlot.current });
          setMedia((list) => [...list, item]);
        }
      }
    } finally {
      setAdding(null);
      replaceRef.current = null;
      if (fileInput.current) {
        fileInput.current.value = "";
        fileInput.current.multiple = true;
      }
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
  const PENCIL = "M4 20h4L19 9l-4-4L4 16zM14 6l4 4";
  const SPARK = "M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8zM19 15l.8 2.2 2.2.8-2.2.8L19 21l-.8-2.2-2.2-.8 2.2-.8z";

  const aiPanel = (target: { slot?: number; replaceId?: string }, heading: string, onClose: () => void) => paid === false ? (
    <div style={{ padding: "16px 18px", borderRadius: 12, background: theme.cardBg, boxShadow: `0 0 0 1px ${theme.border}, 0 6px 18px rgba(15,23,42,0.06)`, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
      <span style={{ flex: 1, minWidth: 220, fontSize: 13.5, color: theme.textPrimary }}><b>AI 이미지</b>는 공실스터디 멤버십 전용 기능이에요.</span>
      <button onClick={openStudy} style={{ padding: "8px 14px", borderRadius: 8, border: 0, background: "#f97316", color: "#fff", fontSize: 13, fontWeight: 800, cursor: "pointer" }}>공실스터디 멤버십 보기 →</button>
      <button onClick={onClose} style={{ border: 0, background: "transparent", color: theme.textSecondary, cursor: "pointer", fontSize: 14 }}>✕</button>
    </div>
  ) : (
    <div style={{ padding: "16px 18px", borderRadius: 12, background: theme.cardBg, boxShadow: `0 0 0 1px ${theme.border}, 0 6px 18px rgba(15,23,42,0.06)` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: theme.textPrimary }}>{heading}</span>
        <button onClick={onClose} disabled={aiBusy} style={{ border: 0, background: "transparent", color: theme.textSecondary, cursor: "pointer", fontSize: 14 }}>✕</button>
      </div>
      {/* 그림 스타일 — 기사용(보도 실사·건물 전경…)과 영상 편집기 스타일을 한 묶음 카드로 (2026-10-24 사장님) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(112px, 1fr))", gap: 6, marginBottom: 10 }}>
        {[
          // 기사용 견본 그림 — public/studio-styles/<id>.jpg (Flow 로 같은 장면, 2026-10-24). 없는 id 는 남색 바탕
          ...imageStyles.map((st) => ({ key: st.id, label: st.label, desc: "기사용 스타일", bg: "linear-gradient(135deg,#1a3a6b,#3b6fb6)", thumb: ["news", "building", "area", "animation", "infographic"].includes(st.id) ? `/studio-styles/${st.id}.jpg` : "" })),
          ...IMAGE_STYLES.map((st) => ({ key: `vs:${st.id}`, label: st.label, desc: st.desc, bg: st.bg, thumb: st.thumb || "" })),
        ].map((c) => {
          const on = aiStyle === c.key;
          return (
            <button key={c.key} type="button" onClick={() => setAiStyle(c.key)} title={c.desc}
              style={{ position: "relative", height: 50, borderRadius: 8, border: 0, outline: on ? "3px solid #f97316" : "none", outlineOffset: -3, background: c.thumb ? `center / cover no-repeat url("${c.thumb}"), ${c.bg}` : c.bg, cursor: "pointer", overflow: "hidden", padding: 0 }}>
              <span style={{ position: "absolute", inset: 0, background: on ? "rgba(0,0,0,0.15)" : "rgba(0,0,0,0.45)" }} />
              <span style={{ position: "relative", color: "#fff", fontSize: 12.5, fontWeight: 800, textShadow: "0 1px 3px rgba(0,0,0,.6)" }}>{on ? "✓ " : ""}{c.label}</span>
            </button>
          );
        })}
      </div>
      <input value={aiRequest} onChange={(e) => setAiRequest(e.target.value)} placeholder="그리고 싶은 장면 (비워 두면 글에서 알아서 고릅니다) 예: 해 질 녘 건물 정면"
        style={{ width: "100%", boxSizing: "border-box", padding: "9px 11px", border: `1px solid ${theme.border}`, borderRadius: 8, fontSize: 13, background: theme.cardBg, color: theme.textPrimary }} />
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
        <button onClick={() => makeImage(target)} disabled={aiBusy}
          style={{ padding: "9px 16px", borderRadius: 8, border: 0, background: "#1a3a6b", color: "#fff", fontSize: 13, fontWeight: 700, cursor: aiBusy ? "default" : "pointer", opacity: aiBusy ? 0.6 : 1 }}>
          {aiBusy ? "그리는 중…" : `${imgAi}로 그리기`}
        </button>
        {!aiBusy && <span style={{ fontSize: 12, color: aiErr ? "#c53030" : theme.textSecondary }}>{aiErr || "1~3분 걸립니다. 글자·사람 얼굴은 넣지 않습니다."}</span>}
      </div>
      {/* 그리는 동안: 점점점 + 쉬운 말 + 걸린 시간 */}
      {aiBusy && <StudioWorking title="AI가 이미지를 만들고 있어요" detail={aiMsg} />}
    </div>
  );

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
          <button className="sbe-tool" onClick={() => setEditId(editId === m.id ? null : m.id)} title="수정"><Ico d={PENCIL} /></button>
          <span className="sbe-sep" />
          <button className="sbe-tool sbe-danger" onClick={() => remove(m.id)} title="삭제"><Ico d={TRASH} /></button>
        </div>
        {editId === m.id && (
          <div className="sbe-menu sbe-edit-menu">
            <button onClick={() => { setEditId(null); pickReplace(m.id); }}>
              <Ico d="M4 16l4-4 4 4 3-3 5 5M4 4h16v16H4zM15 8.5h.01" /> 내 사진으로 바꾸기
            </button>
            <button onClick={() => { setEditId(null); setAiReplace(m.id); setAiSlot(null); setAiErr(""); }} disabled={aiBusy}>
              <Ico d={SPARK} /> AI 이미지로 바꾸기 <span title="공실뉴스부동산(유료 회원) 전용" style={{ marginLeft: 4, padding: "1px 6px", borderRadius: 4, background: "#f97316", color: "#fff", fontSize: 10, fontWeight: 800, letterSpacing: 0.2, lineHeight: 1.4 }}>Membership</span>
            </button>
            <button className="sbe-menu-x" onClick={() => setEditId(null)} title="닫기">✕</button>
          </div>
        )}
      </div>
      <input value={m.caption} onChange={(e) => update(m.id, { caption: e.target.value })} placeholder="사진 설명"
        style={{ width: "100%", boxSizing: "border-box", border: 0, padding: "9px 12px", fontSize: 12.5, color: theme.textSecondary, background: theme.cardBg, textAlign: "center", outline: "none" }} />
      {aiReplace === m.id && <div style={{ padding: "0 12px 12px" }}>{aiPanel({ replaceId: m.id }, "이 사진을 바꿀 AI 이미지", () => setAiReplace(null))}</div>}
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
            <button onClick={() => { setOpenSlot(null); setAiSlot(slot); setAiReplace(null); setAiErr(""); }} disabled={aiBusy}>
              <Ico d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8zM19 15l.8 2.2 2.2.8-2.2.8L19 21l-.8-2.2-2.2-.8 2.2-.8z" /> AI 이미지 <span title="공실뉴스부동산(유료 회원) 전용" style={{ marginLeft: 4, padding: "1px 6px", borderRadius: 4, background: "#f97316", color: "#fff", fontSize: 10, fontWeight: 800, letterSpacing: 0.2, lineHeight: 1.4 }}>Membership</span>{/* 유료 전용 표시 — 왼쪽 메뉴와 같은 주황 (2026-10-24 사장님) */}
            </button>
            <button className="sbe-menu-x" onClick={() => setOpenSlot(null)} title="닫기">✕</button>
          </div>
        ) : (
          <button className="sbe-plus" onClick={() => setOpenSlot(slot)} title="이 자리에 사진 넣기" disabled={adding !== null}>
            {adding === slot ? "…" : "+"}
          </button>
        )}
      </div>
      {aiSlot === slot && <div style={{ margin: "6px 0 14px" }}>{aiPanel({ slot }, "이 자리에 넣을 AI 이미지", () => setAiSlot(null))}</div>}
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
    .sbe-edit-menu{position:absolute;top:50px;right:10px;z-index:2}
  `;

  return (
    <div style={{ marginTop: 18, border: `1px solid ${theme.border}`, borderRadius: 12, background: theme.bg || "#f6f8fa" }}>
      <input ref={fileInput} type="file" accept="image/*" multiple hidden onChange={(e) => onFiles(e.target.files)} />
      <style>{editorCss}</style>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderBottom: `1px solid ${theme.border}`, fontSize: 12, color: theme.textSecondary }}>
        <span>{doc === "article" ? "기사에 들어갈" : "네이버에 들어갈"} 순서 그대로입니다. 글은 눌러서 고치고, 사진은 마우스를 올려 다룹니다. 문단 사이 ⊕로 사진을 넣습니다.</span>
        <span style={{ fontWeight: 700, color: saved === "error" ? "#c53030" : saved === "saving" ? "#b45309" : "#16a34a" }}>
          {saved === "error" ? "저장 실패" : saved === "saving" ? "저장 중…" : "✓ 저장됨"}
        </span>
      </div>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "22px 24px" }}>
        <textarea value={title} onChange={(e) => setTitle(e.target.value)} rows={2}
          style={{ width: "100%", boxSizing: "border-box", resize: "none", border: `1px solid transparent`, borderRadius: 8, padding: "6px 8px", fontSize: 22, fontWeight: 800, lineHeight: 1.4, color: theme.textPrimary, background: "transparent", fontFamily: "inherit" }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "#93c5fd")} onBlur={(e) => (e.currentTarget.style.borderColor = "transparent")} />
        {doc === "article" && (
          <div style={{ margin: "4px 0 6px", padding: "10px 12px", borderLeft: "3px solid #1a3a6b", background: theme.cardBg, borderRadius: "0 8px 8px 0" }}>
            {subtitles.map((st, i) => (
              <input key={i} value={st} onChange={(e) => setSubtitles((list) => list.map((x, j) => (j === i ? e.target.value : x)))} placeholder={`부제 ${i + 1}`}
                style={{ display: "block", width: "100%", boxSizing: "border-box", border: 0, outline: "none", background: "transparent", padding: "3px 0", fontSize: 14.5, fontWeight: 600, color: theme.textSecondary, fontFamily: "inherit" }} />
            ))}
          </div>
        )}

        {cover && photo(cover)}
        {inSlot(0).map(photo)}
        {slotBar(0)}

        {paragraphs.map((p, i) => (
          <React.Fragment key={`${rev}-${i}`}>
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
          <div style={{ fontSize: 12, fontWeight: 700, color: theme.textSecondary, marginBottom: 6 }}>{doc === "article" ? "키워드 (쉼표로 구분)" : "태그 (쉼표로 구분 · 발행 창에 자동 입력)"}</div>
          <textarea value={keywords} onChange={(e) => setKeywords(e.target.value)} rows={2}
            style={{ width: "100%", boxSizing: "border-box", border: `1px solid ${theme.border}`, borderRadius: 8, padding: "8px 10px", fontSize: 13, color: theme.textPrimary, background: theme.cardBg, fontFamily: "inherit" }} />
        </div>
        <div style={{ marginTop: 10, fontSize: 12, color: theme.textSecondary }}>
          {doc === "article"
            ? "키워드는 기사쓰기 화면의 키워드 칸에 들어갑니다."
            : initial.vacancyId.startsWith("col-")
              ? "글 끝에는 [참고 자료](원문 언론사·제목·링크)와 공실뉴스 서명이 자동으로 붙습니다."
              : "글 끝에는 매물 정보 출처(중개사무소 정보)와 공실뉴스 매물 상세 링크가 자동으로 붙습니다."}
        </div>
        <StudioReviseBar theme={theme} label={doc === "article" ? "기사" : "블로그 글"} onRevise={revise}
          examples={doc === "article" ? "제목을 더 짧게, 둘째 문단에 배경 설명을 더해 줘" : "도입부를 더 짧게, 소제목을 질문형으로 바꿔 줘"} />
      </div>
    </div>
  );
}
