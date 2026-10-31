"use client";

// 가운데 클립 목록 — 브루처럼 문장 하나 = 클립 카드, 단어를 단추로. 단어를 지우면 그 소리·영상이 잘린다.
// 어르신도 쉽게: 고른 카드·단어 아래에 할 수 있는 일을 단추로 늘 보여 준다 (숨은 기능 없음)
import React from "react";
import { createPortal } from "react-dom";
import { WordDetail } from "./WordDetail";
import type { Clip, Project, Word } from "./types";
import { DRAG_MEDIA, DRAG_STICKER, fmtTime } from "./types";
import { clipText, type FlatItem, speedOf, srcSpeed, wordTimes } from "./timeline";
import { findVoice } from "@/lib/studio-video/voices";
import { C, Icon, FONT } from "./ui";
import { Gutter, SingleChips, isSticker, type LaneEntry, type LayerDrag } from "./Layers";
import { transLabel } from "./transitions";

export type ClipActions = {
  selectClip: (id: string, multi: boolean) => void;
  selectMany: (ids: string[], on: boolean) => void; // 씬 전체·클립 전체 고르기/풀기
  selectWord: (clipId: string, i: number, multi?: boolean) => void; // multi = Ctrl+클릭 (여러 단어)
  toggleWord: (clipId: string, i: number) => void;
  splitAt: (clipId: string, i: number) => void;
  editText: (clipId: string, text: string) => void;
  removeClip: (ids: string[]) => void;
  mergeUp: (id: string) => void;
  openVoice: (id: string) => void;
  openVisual: (id: string) => void;
  openMedia: (id: string, x: number, y: number) => void; // 화면 썸네일을 누르면 사진·영상 메뉴
  openTiming: (id: string, x?: number, y?: number) => void; // 시간을 누르면 볼륨·빠르기·길이 메뉴
  openLayer: (id: string) => void; // 단어 앞 작은 표시를 누르면 그 사진·글자 설정
  // 상세 편집 (촬영 영상 단어의 시작·끝)
  setWordTime: (clipId: string, i: number, s: number, e: number) => void;
  resetWordTime: (clipId: string, i: number) => void;
  playWord: (clipId: string, i: number) => void;
  setPad: (ids: string[], sec: number) => void; // AI 목소리 다 읽은 뒤 쉬기 (문장 끝 [..])
  moveClips: (ids: string[], targetId: string, before: boolean) => void; // 클립 끌어 옮기기 (Ctrl 로 고른 여러 개 함께)
  addAiVoice: (clipId: string, text: string) => void; // 원본 영상 클립에 글 → AI 목소리 (원본 소리도 그대로)
  // 단어를 누르면 위에 뜨는 단추 막대 (브루처럼) — 이 클립 잘라내기·복사·붙여넣기, 삽입
  cutClip: (id: string) => void;
  copyClip: (id: string) => void;
  pasteAfter: (id: string) => void;
  canPaste: () => boolean;
  insert: (kind: "mine" | "vacancy" | "free" | "ai" | "title" | "sticker") => void; // 브루 [삽입]처럼 — 사진·영상은 이 클립 화면 위에, 글자는 화면 글자
  toggleMute: (id: string) => void;
  setSource: (id: string, patch: { muted?: boolean; volume?: number }, first: boolean) => void; // 원본 소리 무음·크기
  openSound: (id: string, x: number, y: number) => void; // 소리 칩을 누르면 옆에 볼륨·빠르기 창
  sceneBreak: (id: string) => void;
  sceneMergeUp: (sceneId: string) => void; // 씬 제목 [↑ 위 씬과 합치기] (2026-10-19 사장님)
  renameScene: (sceneId: string, title: string) => void; // 씬 이름 고치기
  play: (id: string) => void;
  stop: () => void; // 재생 멈춤 (클립 칸 ■)
  editSub: (id: string, text: string | null) => void; // 자막만 고치기 (null = 원래대로)
  editSpoken: (id: string, text: string) => void; // 말한 내용 고치기 — 단어 칸까지 고치고 단어 시각을 소리에 다시 맞춤 (녹화 클립)
  restoreCut: (id: string, i: number | "all") => void; // 무음 줄이기 원래대로 (한 곳 / 모두)
  addCut: (id: string, g: { s: number; e: number }) => void; // 쉼 [..] 하나 줄이기
  newClipBefore: (id: string) => void; // 클립 사이 [+ 새 클립] — 이 클립 앞에 글 클립
  openTrans: (id: string, add: boolean) => void;
  /** 자막 아이콘 — 그 클립으로 가서 미리보기에서 메인자막 고르기 (2026-10-20 사장님) */
  pickSub?: (id: string) => void;
  /** 클립 아이콘 메뉴 (2026-10-21 사장님) — 메인자막 아이콘 · 화면전환 칩을 누르면 바로 옆에 1차 메뉴 → 2차 바로 고치기 */
  openSubMenu?: (id: string, x: number, y: number) => void;
  openTransMenu?: (id: string, x: number, y: number) => void;
  /** 메인 화면 잠금 풀기·잠그기 (썸네일 위 노란 자물쇠, 2026-10-21 사장님) */
  toggleVisualLock?: (id: string) => void; // 클립 사이 화면전환 — 이 클립 앞(앞 클립에서 넘어오는) 전환 열기 · add: 없으면 새로
  /** 클립 화면 오른쪽 클릭 — 바꾸기 · 삭제 · AI 이미지 생성하기 (2026-10-31 사장님) */
  openVisualMenu?: (id: string, x: number, y: number) => void;
};

type Props = {
  project: Project;
  items: FlatItem[];
  selected: string[];
  selWord: { clip: string; i: number } | null;
  curClip: string;
  curWord: number;
  selWordIs?: number[]; // 고른 단어들 (selWord 클립 안, Ctrl+클릭)
  playing?: boolean; // 지금 재생 중 (클립 칸 ▶/■)
  busy: Record<string, string>;
  actions: ClipActions;
  view: "detail" | "simple";
  lanes: { entries: LaneEntry[]; lanes: number; singles?: LaneEntry[] };
  selLayer: string;
  onLayerDrag: LayerDrag;
  /** 자료 칸에서 끌어 놓기 — before/after: 그 자리에 새 클립, replace: 그 클립 화면 바꾸기 */
  onDropMedia?: (clipId: string, where: "before" | "after" | "replace", raw: string) => void;
  /** 왼쪽 애셋 줄에 놓으면 그 클립부터 사진 올리기 (레이어) */
  onDropLayer?: (clipId: string, raw: string) => void;
  /** 스티커·템플릿을 끌어 클립에 놓기 — 그 클립에 넣는다 (2026-10-20) */
  onDropSticker?: (clipId: string) => void;
  /** 오른쪽 칸에 열린 화면전환 (뒤 클립 id) */
  transClip?: string;
  /** 미리보기에서 잠금이 풀린 메인 화면 (클립 id) */
  visualOpen?: string;
};

/** 썸네일 크게 보기 — 마우스를 올린 동안 썸네일 왼쪽에 크게 (영상은 소리 없이 재생). 왼쪽 자리가 모자라면 오른쪽에 */
function Peek({ asset, rect, start, flipX, flipY }: { asset: { url: string; kind: string; name: string }; rect: DOMRect; start: number; flipX?: boolean; flipY?: boolean }) {
  const W = 360;
  const H = Math.round((W * 9) / 16);
  const vh = typeof window !== "undefined" ? window.innerHeight : 900;
  const top = Math.max(8, Math.min(rect.top + rect.height / 2 - H / 2, vh - H - 40));
  const left = rect.left - W - 24 >= 8 ? rect.left - W - 24 : rect.right + 12;
  const transform = flipX || flipY ? `scale(${flipX ? -1 : 1}, ${flipY ? -1 : 1})` : undefined;
  return (
    <div style={{ position: "fixed", left, top, zIndex: 60, width: W + 12, padding: 6, borderRadius: 8, background: C.panel, border: `1px solid ${C.line2}`, boxShadow: "0 12px 36px rgba(0,0,0,0.5)", pointerEvents: "none" }}>
      <div style={{ width: "100%", height: H, borderRadius: 5, overflow: "hidden", background: "#000" }}>
        {asset.kind === "video"
          ? <video src={`${asset.url}#t=${start.toFixed(2)}`} muted autoPlay loop playsInline style={{ width: "100%", height: "100%", objectFit: "contain", display: "block", transform }} />
          : <img src={asset.url} alt="" style={{ width: "100%", height: "100%", objectFit: "contain", display: "block", transform }} />}
      </div>
      <div style={{ padding: "6px 4px 2px", fontSize: 12.5, color: C.sub, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{asset.name} · 눌러서 메뉴</div>
    </div>
  );
}

/** 여러 클립 한꺼번에 고르기/풀기 — 다 골랐으면 체크, 일부면 반쯤 */
export function AllBox({ ids, selected, onChange, title, label }: { ids: string[]; selected: string[]; onChange: (ids: string[], on: boolean) => void; title: string; label?: string }) {
  const n = ids.filter((id) => selected.includes(id)).length;
  const all = n > 0 && n === ids.length;
  const ref = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    if (ref.current) ref.current.indeterminate = n > 0 && !all;
  }, [n, all]);
  return (
    <label title={title} onClick={(e) => e.stopPropagation()} style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", alignSelf: "center", fontSize: 14, color: C.sub, fontWeight: 700 }}>
      <input ref={ref} type="checkbox" checked={all} onChange={() => onChange(ids, !all)} style={{ width: 18, height: 18, accentColor: C.accent, cursor: "pointer", margin: 0 }} />
      {label}
    </label>
  );
}

const voiceName = (id?: string) => findVoice(id)?.name || "AI 목소리";
/** 클립 목소리 단추에 쓸 짧은 이름 — "Yohan Koo - Confident authority…" 처럼 긴 이름은 앞부분만 (2026-10-23 사장님) */
const shortVoice = (id?: string) => { const n = voiceName(id).split(/s+[-–—|·(]s*/)[0].trim(); return n.length > 10 ? n.slice(0, 10) + "…" : n; };

function ActionBtn({ icon, label, onClick, danger }: { icon: string; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button type="button" onClick={(e) => { e.stopPropagation(); onClick(); }}
      style={{ display: "inline-flex", alignItems: "center", gap: 5, height: 32, padding: "0 10px", borderRadius: 5, border: `1px solid ${C.line2}`, background: C.panel2, color: danger ? C.danger : C.text, fontSize: 13.5, fontWeight: 700, fontFamily: FONT, cursor: "pointer", whiteSpace: "nowrap" }}>
      <Icon name={icon} size={16} />
      {label}
    </button>
  );
}

/** 자막 줄 — 누르면 자막 글만 고친다 (말소리·AI 목소리는 그대로) */
function SubLine({ c, p, empty, open = 0 }: { c: Clip; p: Props; empty?: string; open?: number }) {
  const [edit, setEdit] = React.useState(false);
  const custom = typeof c.subText === "string";
  const text = custom ? c.subText! : clipText(c);
  const [draft, setDraft] = React.useState(text);
  const spoken = c.type === "source" && Boolean(c.src) && Boolean(c.words?.length);
  // 촬영 클립의 연필·[자막 고치기]를 누르면 여기를 연다 (말한 내용은 못 고치고 자막만)
  React.useEffect(() => {
    if (!open) return;
    setDraft(text);
    setEdit(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  if (edit) {
    return (
      <div style={{ flex: 1, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }} onClick={(e) => e.stopPropagation()}
        onBlur={(e) => {
          // 다른 곳을 누르면 닫는다 — 고친 글은 그대로 남긴다 (열린 칸이 여기저기 남아 산만하지 않게)
          if (e.currentTarget.contains(e.relatedTarget as Node)) return;
          if (draft !== text) p.actions.editSub(c.id, draft);
          setEdit(false);
        }}>
        <textarea value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus placeholder="화면에 나올 자막 (엔터 = 줄바꿈)" rows={Math.max(1, draft.split("\n").length)}
          // 엔터 = 줄바꿈 (자막에서 그 자리에서 줄이 바뀐다, 2026-10-20 사장님) · Ctrl+엔터 = 자막 바꾸기 · Esc = 그만두기
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              p.actions.editSub(c.id, e.currentTarget.value);
              setEdit(false);
            }
            if (e.key === "Escape") setEdit(false);
          }}
          style={{ flex: 1, minWidth: 200, minHeight: 34, padding: "6px 10px", borderRadius: 5, border: `1px solid ${C.accent}`, background: C.bg, color: C.text, fontSize: 15, lineHeight: 1.45, fontFamily: FONT, resize: "none", boxSizing: "border-box" }} />
        <ActionBtn icon="check" label={spoken ? "자막만 바꾸기" : "자막 바꾸기"} onClick={() => { p.actions.editSub(c.id, draft); setEdit(false); }} />
        {/* 녹화 클립 — 자동 자막이 잘못 알아들었을 때: 단어 칸(편집 기준)까지 고친다 */}
        {spoken && <ActionBtn icon="pen" label="말한 내용 고치기" onClick={() => { p.actions.editSpoken(c.id, draft); setEdit(false); }} />}
        {custom && c.type !== "silence" && <ActionBtn icon="undo" label="말한 그대로" onClick={() => { p.actions.editSub(c.id, null); setEdit(false); }} />}
        <ActionBtn icon="close" label="그만두기" onClick={() => setEdit(false)} />
      </div>
    );
  }
  return (
    // 자막은 연필(✎)을 눌러야 고친다 — 글자를 눌러도 열리지 않게 (잘못 눌러 고치기 칸이 열리던 것)
    <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 8, height: 32, padding: "0 6px", borderRadius: 4, textAlign: "left", fontFamily: FONT }}>
      <span style={{ flex: "0 1 auto", minWidth: 0, fontSize: 15, color: c.sub === false ? C.dim : text ? "#9ecbff" : C.dim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{text ? text.replace(/\r?\n/g, " ↵ ") : empty || " "}</span>
      <button type="button" title={spoken ? "자막 고치기 · 말한 내용 고치기" : "자막만 고치기 (목소리는 그대로)"} onClick={(e) => { e.stopPropagation(); setDraft(text); setEdit(true); }}
        style={{ width: 28, height: 28, padding: 0, border: 0, borderRadius: 4, background: "transparent", color: C.sub, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
        onMouseEnter={(e) => (e.currentTarget.style.background = C.line2)} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
        <Icon name="pen" size={16} />
      </button>
      <span style={{ flex: 1 }} />
      {custom && text && <span style={{ fontSize: 12, color: C.dim, flexShrink: 0 }}>자막만 고침</span>}
      {/* 말한 단어와 자막이 다를 때 바로 되돌리기 */}
      {custom && c.type !== "silence" && (
        <span role="button" title="말한 단어 그대로 자막에 보여요" onClick={(e) => { e.stopPropagation(); p.actions.editSub(c.id, null); }}
          style={{ flexShrink: 0, padding: "2px 8px", borderRadius: 4, border: `1px solid ${C.line2}`, color: C.sub, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>말한 그대로</span>
      )}
    </div>
  );
}

function ClipCard({ project, it, n, p }: { project: Project; it: FlatItem; n: number; p: Props }) {
  const c = it.clip;
  const sel = p.selected.includes(c.id);
  const playingHere = p.curClip === c.id;
  const [editing, setEditing] = React.useState(false);
  const [padOpen, setPadOpen] = React.useState(false); // 문장 끝 [..] 메뉴
  const [aiOpen, setAiOpen] = React.useState(false); // 원본 영상 클립 [✎ AI 목소리 넣기]
  const [aiDraft, setAiDraft] = React.useState("");
  const [hoverW, setHoverW] = React.useState(-1); // 마우스를 올린 단어 — 오른쪽 위 ⓧ(지우기)
  const [insOpen, setInsOpen] = React.useState(false); // 단추 막대 [삽입 ▾]
  const [detail, setDetail] = React.useState(false); // 상세 편집 (파형) 펼침
  const wordsRow = React.useRef<HTMLDivElement>(null);
  const lead = p.selWord?.clip === c.id ? p.selWord.i : -1; // 마지막으로 누른 단어 (단추 막대·상세 편집 기준)
  const [padScope, setPadScope] = React.useState<"one" | "sel" | "all">("one"); // 적용 범위 — 처음엔 늘 이 클립에만
  // 촬영한 영상(원본 소리) 클립은 말한 내용·목소리를 못 바꾼다 — 연필·[자막 고치기]는 자막 줄을 연다 (AI 목소리 클립만 글 고치기)
  const isSrc = c.type !== "voice";
  const [subOpen, setSubOpen] = React.useState(0);
  const editPen = () => (isSrc ? setSubOpen((x) => x + 1) : (setDraft(clipText(c)), setEditing(true)));
  const [draft, setDraft] = React.useState("");
  const [peek, setPeek] = React.useState<DOMRect | null>(null); // 썸네일에 마우스를 올리면 크게
  const silent = Boolean(c.muted) || c.volume === 0; // 무음이면 빨갛게
  const asset = c.visual ? project.assets[c.visual.asset] : c.src ? project.assets[c.src.asset] : null;
  const thumb = asset?.thumb || (asset?.kind === "image" ? asset.url : "");
  const busy = p.busy[c.id];
  const words: Word[] = c.words && c.words.length ? c.words : String(c.text || "").split(/\s+/).filter(Boolean).map((w) => ({ w, s: 0, e: 0 }));
  const times = wordTimes(c, project.settings);
  const activeIdx = playingHere ? p.curWord : -1;
  // 쉼(무음) — 브루처럼 단어 사이 0.3초 넘게 쉰 곳에 [..] (클립 맨 앞·뒤 포함). 누르면 그 쉼을 줄이고(줄 그어짐), 다시 누르면 원래대로.
  //  [무음 줄이기]로 줄인 곳(clip.cuts)도 같은 [..] 로. 단어 시각이 없으면 아래 요약 한 줄로만
  const cuts = c.type === "source" ? (c.cuts || []).map((g, k) => ({ ...g, k })) : [];
  const timed = words.length > 0 && words.some((w) => w.e > 0);
  const pauses: { s: number; e: number; cut: number; at: number }[] = [];
  if (c.type === "source" && c.src && timed) {
    const S = c.src.s, E = c.src.e, MINP = 0.3;
    const edges: { s: number; e: number; at: number }[] = [];
    if (words[0].s - S >= MINP) edges.push({ s: S, e: words[0].s, at: 0 });
    for (let i = 1; i < words.length; i++) if (words[i].s - words[i - 1].e >= MINP) edges.push({ s: words[i - 1].e, e: words[i].s, at: i });
    if (E - words[words.length - 1].e >= MINP) edges.push({ s: words[words.length - 1].e, e: E, at: words.length });
    const used = new Set<number>();
    for (const g of edges) {
      const k = cuts.findIndex((x) => x.s < g.e && g.s < x.e);
      if (k >= 0) used.add(k);
      pauses.push({ ...g, cut: k });
    }
    for (const x of cuts) if (!used.has(x.k)) { const at = words.findIndex((w) => w.s >= x.e); pauses.push({ s: x.s, e: x.e, cut: x.k, at: at < 0 ? words.length : at }); }
  }
  const pauseChip = (g: { s: number; e: number; cut: number; at: number }, i: number) => {
    const on = g.cut >= 0; // 줄인 쉼
    const src = c.src!;
    const PAD = 0.15;
    const toggle = () => {
      if (on) return p.actions.restoreCut(c.id, g.cut);
      let a = g.s === src.s ? g.s : g.s + PAD, z = g.e === src.e ? g.e : g.e - PAD;
      if (z - a < 0.05) { a = g.s; z = g.e; }
      p.actions.addCut(c.id, { s: +a.toFixed(3), e: +z.toFixed(3) });
    };
    return (
      <button type="button" key={`p${i}`} title={on ? `쉼 ${(g.e - g.s).toFixed(1)}초를 줄였어요 — 누르면 원래대로` : `쉼 ${(g.e - g.s).toFixed(1)}초 — 누르면 줄여요`} onClick={(e) => { e.stopPropagation(); toggle(); }}
        style={{ height: 34, padding: "0 8px", borderRadius: 4, border: `1px ${on ? "dashed" : "solid"} ${C.line2}`, background: on ? "transparent" : C.panel2, color: on ? C.dim : "#9ecbff", textDecoration: on ? "line-through" : "none", fontSize: 14, fontWeight: 700, fontFamily: FONT, cursor: "pointer", whiteSpace: "nowrap" }}>
        [..]
      </button>
    );
  };
  const cutSec = cuts.reduce((a, g) => a + (g.e - g.s), 0);

  if (c.type === "silence") {
    return (
      <div onClick={() => p.actions.selectClip(c.id, false)}
        style={{ display: "flex", alignItems: "center", gap: 12, margin: "6px 0", padding: "8px 14px", borderRadius: 6, border: `1px solid ${sel ? C.accent : C.line}`, background: C.panel2, cursor: "pointer", color: C.sub, fontSize: 14 }}>
        <span style={{ width: 28, textAlign: "center", fontWeight: 700 }}>{n}</span>
        <Icon name="silence" size={18} />
        <span style={{ flexShrink: 0 }}>{c.gap ? `빈 공간 · 검은 화면 ${it.dur.toFixed(1)}초` : `말이 없는 구간 ${it.dur.toFixed(1)}초`}</span>
        <Icon name="sub" size={16} color={C.dim} />
        <SubLine c={c} p={p} empty="자막 넣기" />
        <ActionBtn icon="trash" label="이 구간 지우기" onClick={() => p.actions.removeClip([c.id])} />
      </div>
    );
  }

  return (
    <div onClick={(e) => p.actions.selectClip(c.id, e.ctrlKey || e.metaKey || e.shiftKey)} data-clip={c.id}
      // 끌어서 옮기기 — 고른 클립 중 하나를 끌면 고른 클립 모두.
      //  빈 곳·번호 쪽을 잡았을 때만 (막대·단추·단어·글 칸·떠 있는 칸을 끌 때 클립이 같이 끌려 흔들리던 문제)
      draggable={!editing && !aiOpen}
      onPointerDown={(e) => {
        const t = e.target as HTMLElement;
        e.currentTarget.draggable = !editing && !aiOpen && !t.closest("input, textarea, select, button, [data-keepword], [data-nodrag]");
      }}
      onDragStart={(e) => {
        if (!e.currentTarget.draggable) return e.preventDefault();
        dragging = p.selected.length > 1 && p.selected.includes(c.id) ? [...p.selected] : [c.id];
        e.dataTransfer.setData(DRAG_CLIP, JSON.stringify(dragging));
        e.dataTransfer.effectAllowed = "move";
      }}
      onDragEnd={() => (dragging = [])}
      // 파란 테두리는 지금 재생 위치 클립 하나만 (재생하면 말소리를 따라 내려간다) · 고른 클립은 체크칸으로
      style={{ position: "relative", display: "flex", gap: 0, margin: "8px 0", borderRadius: 8, border: `1px solid ${C.line}`, outline: playingHere ? `1px solid ${C.accent}` : "none", outlineOffset: -1, background: C.card, cursor: "pointer", fontFamily: FONT }}>
      {/* 번호 + 고르기 칸 */}
      <div style={{ width: 52, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 10, paddingTop: 14, borderRight: `1px solid ${C.line}` }}>
        <span style={{ fontSize: 15, fontWeight: 800, color: playingHere ? C.text : C.sub }}>{n}</span>
        <input type="checkbox" checked={sel} onChange={() => p.actions.selectClip(c.id, true)} onClick={(e) => e.stopPropagation()} style={{ width: 18, height: 18, accentColor: C.accent, cursor: "pointer" }} title="여러 클립 고르기" />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* 1줄: 목소리 + 단어 단추 */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px" }}>
          <button type="button" onClick={(e) => { e.stopPropagation(); const r = e.currentTarget.getBoundingClientRect(); p.actions.openSound(c.id, r.left, r.bottom + 6); }} title={`${c.type === "voice" ? voiceName(c.voiceId || project.settings.voice.id) + " · " : ""}눌러서 볼륨·빠르기·목소리 바꾸기`}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 32, padding: "0 10px", borderRadius: 5, border: `1px solid ${silent ? C.danger : C.line2}`, background: silent ? "rgba(239,68,68,0.12)" : "transparent", color: silent ? C.danger : C.sub, fontSize: 13.5, fontWeight: 700, fontFamily: FONT, cursor: "pointer", flexShrink: 0 }}>
            {busy && c.type === "voice" ? <span className="gsv-spin" title="목소리 만드는 중" style={{ display: "inline-block", width: 14, height: 14, borderRadius: "50%", border: `2px solid ${C.accent}`, borderRightColor: "transparent" }} /> : <Icon name={silent ? "mute" : c.type === "voice" ? "voice" : "mic"} size={16} />}
            {silent ? (c.type === "voice" ? `${shortVoice(c.voiceId || project.settings.voice.id)} 무음` : "원본 소리 무음") : c.type === "voice" ? shortVoice(c.voiceId || project.settings.voice.id) : "원본 소리"}
          </button>
          {editing ? (
            // 한 줄로 — 글 칸 + [고치기 끝][그만두기] (아래 자막 고치기와 같은 모양)
            <div style={{ flex: 1, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }} onClick={(e) => e.stopPropagation()}
              onBlur={(e) => {
                // 다른 곳을 누르면 닫는다 — 고친 게 있으면(AI 목소리를 새로 만들 수 있으니) 열어 둔다
                if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                if (draft === clipText(c)) setEditing(false);
              }}>
              <input value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus title={c.type === "voice" ? "엔터를 누르면 고쳐져요 · 고치면 AI 목소리를 새로 만들어요" : undefined}
                // 엔터 = 고치기 끝, Esc = 그만두기
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    p.actions.editText(c.id, e.currentTarget.value);
                    setEditing(false);
                  }
                  if (e.key === "Escape") setEditing(false);
                }}
                style={{ flex: 1, minWidth: 200, height: 34, padding: "0 10px", borderRadius: 5, border: `1px solid ${C.accent}`, background: C.bg, color: C.text, fontSize: 15.5, fontFamily: FONT }} />
              <ActionBtn icon="check" label="고치기 끝" onClick={() => { p.actions.editText(c.id, draft); setEditing(false); }} />
              <ActionBtn icon="close" label="그만두기" onClick={() => setEditing(false)} />
            </div>
          ) : (
            <div ref={wordsRow} style={{ flex: 1, display: "flex", flexWrap: "wrap", gap: 4 }}>
              {/* 고른 단어 단추 막대 — 맨 위 층에, 단어 줄 위 왼쪽에서 (오른쪽 속성 칸을 넘지 않게) */}
              {lead >= 0 && !editing && words[lead] && (() => {
                const i = lead;

                    const ib = (icon: string, tip: string, onClick: () => void, dis = false) => (
                      <button type="button" title={tip} disabled={dis} onClick={onClick}
                        style={{ width: 34, height: 32, padding: 0, border: 0, borderRadius: 5, background: "transparent", color: dis ? C.dim : C.text, cursor: dis ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                        onMouseEnter={(e) => !dis && (e.currentTarget.style.background = C.line2)} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                        <Icon name={icon} size={18} />
                      </button>
                    );
                    const tb = (icon: string, label: string, onClick: () => void, dis = false, tip?: string) => (
                      <button type="button" title={tip || label} disabled={dis} onClick={onClick}
                        style={{ height: 32, padding: "0 10px", border: 0, borderRadius: 5, background: "transparent", color: dis ? C.dim : C.text, cursor: dis ? "default" : "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 700, fontFamily: FONT, whiteSpace: "nowrap" }}
                        onMouseEnter={(e) => !dis && (e.currentTarget.style.background = C.line2)} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                        <Icon name={icon} size={17} />{label}
                      </button>
                    );
                    const sep = <span style={{ width: 1, height: 20, background: C.line2, margin: "0 3px" }} />;
                                    return <FloatBar anchor={wordsRow}>{<span onClick={(e) => e.stopPropagation()}
                        style={{ display: "flex", alignItems: "center", gap: 1, padding: 4, borderRadius: 8, background: C.panel, border: `1px solid ${C.line2}`, boxShadow: "0 8px 24px rgba(0,0,0,0.45)", whiteSpace: "nowrap", cursor: "default" }}>
                        {ib("cut", "고른 단어 잘라내기 (Ctrl+X)", () => p.actions.cutClip(c.id))}
                        {ib("copy", "고른 단어 복사하기 (Ctrl+C)", () => p.actions.copyClip(c.id))}
                        {ib("paste", "고른 단어 뒤에 붙여넣기 (Ctrl+V)", () => p.actions.pasteAfter(c.id), !p.actions.canPaste())}
                        {sep}
                        {/* 상세 편집 — 촬영·녹화 영상 클립만 (AI 목소리는 없음) */}
                        {isSrc && <>{tb("speed", "상세 편집", () => setDetail((v) => !v), false, "이 단어 소리 모양을 보며 시작·끝 맞추기")}{sep}</>}
                        {tb("split", "클립 나누기", () => p.actions.splitAt(c.id, i), i === 0, i === 0 ? "맨 앞 단어에서는 나눌 수 없어요" : "이 단어 앞에서 클립 나누기")}
                        {sep}
                        {tb("voice", c.type === "voice" ? "목소리 바꾸기" : "소리 크기", () => p.actions.openVoice(c.id))}
                        {sep}
                        <span style={{ position: "relative", display: "inline-flex" }}>
                          {tb("plus", "삽입 ▾", () => setInsOpen((v) => !v))}
                          {insOpen && (
                            <span style={{ position: "absolute", left: 0, top: "calc(100% + 6px)", zIndex: 21, display: "flex", flexDirection: "column", minWidth: 190, padding: 4, borderRadius: 8, background: C.panel, border: `1px solid ${C.line2}`, boxShadow: "0 8px 24px rgba(0,0,0,0.45)" }}>
                              {([["mine", "image", "내 이미지·비디오"], ["vacancy", "image", "공실 사진"], ["free", "search", "무료 이미지·비디오"], ["ai", "ai", "AI 이미지"], ["title", "font", "기본 텍스트"], ["sticker", "star", "그래픽"]] as const).map(([k, icon, label]) => (
                                <span key={k}>{tb(icon, label, () => { setInsOpen(false); p.actions.insert(k); })}</span>
                              ))}
                            </span>
                          )}
                        </span>
                      </span>}</FloatBar>;
              })()}
              {words.length === 0 && !aiOpen && <span style={{ fontSize: 15, color: C.dim, padding: "5px 0" }}>{c.type === "voice" ? "(글 없음 — 화면만 보여요)" : "(말소리 없음)"}</span>}
              {isSrc && c.src && (aiOpen ? (
                <span onClick={(e) => e.stopPropagation()} data-keepword="" style={{ display: "inline-flex", gap: 6, alignItems: "center", flex: "1 1 320px", minWidth: 260 }}>
                  <input value={aiDraft} onChange={(e) => setAiDraft(e.target.value)} autoFocus placeholder="AI 목소리가 읽을 글 (엔터 = 넣기, Esc = 그만두기)"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && e.currentTarget.value.trim()) {
                        e.preventDefault();
                        p.actions.addAiVoice(c.id, e.currentTarget.value);
                        setAiOpen(false);
                        setAiDraft("");
                      }
                      if (e.key === "Escape") setAiOpen(false);
                    }}
                    style={{ flex: 1, minWidth: 0, height: 34, padding: "0 10px", borderRadius: 5, border: `1px solid ${C.accent}`, background: C.bg, color: C.text, fontSize: 15, fontFamily: FONT }} />
                  <ActionBtn icon="check" label="넣기" onClick={() => { if (aiDraft.trim()) { p.actions.addAiVoice(c.id, aiDraft); setAiOpen(false); setAiDraft(""); } }} />
                  <ActionBtn icon="close" label="그만두기" onClick={() => setAiOpen(false)} />
                </span>
              ) : (
                <button type="button" onClick={(e) => { e.stopPropagation(); setAiOpen(true); }} title="이 영상 위에서 AI 목소리가 읽을 글 쓰기 (원본 소리도 같이 들려요)"
                  style={{ height: 34, padding: "0 10px", borderRadius: 4, border: `1px dashed ${C.line2}`, background: "transparent", color: C.sub, fontSize: 14, fontWeight: 700, fontFamily: FONT, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" }}>
                  <Icon name="pen" size={15} />AI 목소리 넣기
                </button>
              ))}
              {words.map((w, i) => {
                const isSel = p.selWord?.clip === c.id && (p.selWordIs?.length ? p.selWordIs.includes(i) : p.selWord.i === i);
                const active = !w.del && times.find((x) => (x as { i: number }).i === i) && activeIdx === i;
                // 이 단어 앞의 쉼 [..]
                const before = pauses.filter((g) => g.at === i);
                // 이 단어부터 나오는 사진·글자 (단어 구간 레이어) — 단어 앞에 작은 표시
                const marks = (project.layers || []).filter((l) => l.from === c.id && l.w0 === i && (l.type === "image" || l.type === "text"));
                return (
                  <React.Fragment key={i}>
                  {before.map((g, j) => pauseChip(g, i * 10 + j))}
                  {marks.map((l) => {
                    const a = l.type === "image" && l.asset ? project.assets[l.asset] : null;
                    const th = a ? a.thumb || (a.kind === "image" ? a.url : "") : "";
                    return (
                      <button key={l.id} type="button" onClick={(e) => { e.stopPropagation(); p.actions.openLayer(l.id); }} title={isSticker(l) ? "이 단어부터 나오는 그래픽 — 눌러서 설정" : l.type === "image" ? "이 단어부터 나오는 사진 — 눌러서 설정" : `텍스트 “${String(l.text || "").slice(0, 20)}” — 눌러서 설정`}
                        style={{ width: 30, height: 34, padding: 0, borderRadius: 4, border: `1px solid ${C.accent}`, background: C.panel2, overflow: "hidden", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: C.accent, fontSize: 14, fontWeight: 800, fontFamily: FONT, opacity: l.off ? 0.4 : 1 }}>
                        {l.type === "image" ? (th ? <img src={th} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : <Icon name="image" size={15} />) : "T"}
                      </button>
                    );
                  })}
                  <span style={{ position: "relative", display: "inline-flex" }} onMouseEnter={() => setHoverW(i)} onMouseLeave={() => setHoverW((h) => (h === i ? -1 : h))}>
                  {/* 마우스를 올리면 오른쪽 위 ⓧ — 누르면 바로 이 단어 지우기 (지운 단어는 ↺ 되살리기) */}
                  {hoverW === i && !editing && (
                    <button type="button" onClick={(e) => { e.stopPropagation(); p.actions.toggleWord(c.id, i); }} title={w.del ? "이 단어 되살리기" : "이 단어 지우기 (영상에서 잘려요)"}
                      style={{ position: "absolute", right: -7, top: -7, zIndex: 15, width: 18, height: 18, padding: 0, borderRadius: 9, border: `1.5px solid ${w.del ? C.accent : "#5fb8ff"}`, background: C.bg, color: w.del ? C.accent : "#5fb8ff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, lineHeight: 1 }}>
                      {w.del ? "↺" : "✕"}
                    </button>
                  )}
                  <button type="button" data-keepword="" onClick={(e) => { e.stopPropagation(); p.actions.selectWord(c.id, i, e.ctrlKey || e.metaKey); }} title={w.v ? `목소리: ${voiceName(w.v)} · 누르면 그 자리로` : "누르면 그 자리로 · Ctrl+누르기로 여러 단어 고르기"}
                    style={{ height: 34, padding: "0 10px", borderRadius: 4, border: `1px solid ${isSel ? C.accent : active ? "rgba(59,130,246,0.6)" : C.line2}`,
                      // 고른 단어(Ctrl 로 여러 개) = 파랗게 칠함 · 지금 재생 위치 = 연한 파랑
                      background: isSel ? C.accent : active ? "rgba(59,130,246,0.28)" : w.del ? "transparent" : C.panel2,
                      color: isSel ? "#fff" : w.del ? C.dim : active ? "#fff" : busy ? "#5fb8ff" : C.text, textDecoration: w.del ? "line-through" : w.fix ? "underline dotted #facc15" : "none", textUnderlineOffset: 4, fontSize: 15.5, fontFamily: FONT, cursor: "pointer", whiteSpace: "nowrap" }}>
                    {/* 목소리를 만드는 동안 — 고른 단어마다 앞에 돌아가는 동그라미 (클립 전체를 바꿀 땐 목소리 칩에만) */}
                    {busy && p.selWord?.clip === c.id && isSel && <span className="gsv-spin" style={{ display: "inline-block", width: 13, height: 13, marginRight: 6, verticalAlign: -2, borderRadius: "50%", border: `2px solid ${isSel ? "#fff" : C.accent}`, borderRightColor: "transparent" }} />}
                    {w.w}
                  </button>
                  </span>
                  </React.Fragment>
                );
              })}
              {/* 마지막 단어 뒤의 쉼 [..] */}
              {pauses.filter((g) => g.at === words.length).map((g, j) => pauseChip(g, 100000 + j))}
              {/* AI 목소리 — 다 읽은 뒤 쉬기 [..] (누르면 쉼 없음·0.5·1·2·3초) */}
              {c.type === "voice" && words.length > 0 && (() => {
                const pad = Number(c.pad) || 0;
                // 적용 범위 — 이 클립에만 / 선택 클립(고른 AI 목소리 클립) / 모든 클립(AI 목소리 클립 모두)
                const voiceIds = p.items.filter((x) => x.clip.type === "voice" && clipText(x.clip)).map((x) => x.clip.id);
                const selIds = p.selected.filter((id) => voiceIds.includes(id));
                const ids = padScope === "all" ? voiceIds : padScope === "sel" && selIds.length > 1 ? selIds : [c.id];
                const scopeBtn = (on: boolean, dis = false): React.CSSProperties => ({ flex: 1, height: 30, padding: "0 8px", borderRadius: 5, border: `1px solid ${on ? C.accent : C.line2}`, background: on ? C.accentDim : "transparent", color: C.text, fontSize: 12.5, fontWeight: 700, fontFamily: FONT, cursor: dis ? "default" : "pointer", opacity: dis ? 0.4 : 1, whiteSpace: "nowrap" });
                return (
                  <span style={{ position: "relative", display: "inline-flex" }}>
                    <button type="button" title={pad ? `다 읽고 ${pad}초 쉬어요 — 눌러서 바꾸기` : "다 읽고 쉬기 — 눌러서 정하기"} onClick={(e) => { e.stopPropagation(); setPadScope("one"); setPadOpen((v) => !v); }}
                      style={{ height: 34, padding: "0 8px", borderRadius: 4, border: `1px ${pad ? "solid" : "dashed"} ${pad ? C.accent : C.line2}`, background: pad ? C.accentDim : C.panel2, color: "#9ecbff", fontSize: 14, fontWeight: 700, fontFamily: FONT, cursor: "pointer", whiteSpace: "nowrap" }}>
                      {pad ? `[${pad}초]` : "[..]"}
                    </button>
                    {padOpen && (
                      <>
                        <span onClick={(e) => { e.stopPropagation(); setPadOpen(false); }} style={{ position: "fixed", inset: 0, zIndex: 60 }} />
                        <span onClick={(e) => e.stopPropagation()} style={{ position: "absolute", left: 0, top: 40, zIndex: 61, display: "flex", flexDirection: "column", gap: 6, padding: 10, borderRadius: 8, background: C.panel, border: `1px solid ${C.line2}`, boxShadow: "0 12px 30px rgba(0,0,0,0.45)", cursor: "default" }}>
                          <span style={{ fontSize: 13, fontWeight: 800, color: C.text, whiteSpace: "nowrap" }}>적용 범위</span>
                          <span style={{ display: "flex", gap: 5 }}>
                            <button type="button" onClick={() => setPadScope("one")} style={scopeBtn(padScope === "one")}>이 클립에만</button>
                            <button type="button" disabled={selIds.length < 2} onClick={() => setPadScope("sel")} title={selIds.length < 2 ? "클립을 2개 이상 고르면 쓸 수 있어요" : undefined} style={scopeBtn(padScope === "sel", selIds.length < 2)}>선택 클립 ({selIds.length}개)</button>
                            <button type="button" onClick={() => setPadScope("all")} style={scopeBtn(padScope === "all")}>모든 클립 ({voiceIds.length}개)</button>
                          </span>
                          <span style={{ fontSize: 13, fontWeight: 800, color: C.text, whiteSpace: "nowrap", marginTop: 4 }}>다 읽고 쉬기</span>
                          <span style={{ display: "flex", gap: 5 }}>
                            {[0, 0.5, 1, 2, 3].map((v) => (
                              <button key={v} type="button" onClick={() => { p.actions.setPad(ids, v); setPadOpen(false); }}
                                style={{ height: 32, padding: "0 10px", borderRadius: 5, border: `1px solid ${Math.abs(pad - v) < 0.01 ? C.accent : C.line2}`, background: Math.abs(pad - v) < 0.01 ? C.accentDim : "transparent", color: C.text, fontSize: 13.5, fontWeight: 700, fontFamily: FONT, cursor: "pointer", whiteSpace: "nowrap" }}>
                                {v ? `${v}초` : "없음"}
                              </button>
                            ))}
                          </span>
                        </span>
                      </>
                    )}
                  </span>
                );
              })()}
              {/* 글 고치기는 AI 목소리 클립만 — 촬영한 영상(원본 소리)은 말한 내용을 못 고치고, 자막 줄의 연필로 자막만 */}
              {!isSrc && (
                <button type="button" title="글 고치기" onClick={(e) => { e.stopPropagation(); editPen(); }}
                  style={{ height: 34, width: 34, display: "inline-flex", alignItems: "center", justifyContent: "center", border: 0, background: "transparent", color: C.sub, cursor: "pointer" }}>
                  <Icon name="pen" size={18} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* 상세 편집 — 고른 단어 소리 모양 (촬영·녹화 영상 클립만) */}
        {detail && isSrc && !editing && words.length > 0 && (
          <WordDetail project={project} clip={c} index={lead >= 0 ? lead : 0}
            onSet={(s, e) => p.actions.setWordTime(c.id, lead >= 0 ? lead : 0, s, e)}
            onReset={() => p.actions.resetWordTime(c.id, lead >= 0 ? lead : 0)}
            onPlay={() => p.actions.playWord(c.id, lead >= 0 ? lead : 0)}
            onClose={() => setDetail(false)} />
        )}

        {/* 무음 줄이기 요약 */}
        {cuts.length > 0 && !editing && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 12px 8px 12px", fontSize: 13, color: C.sub }} onClick={(e) => e.stopPropagation()}>
            <Icon name="silence" size={15} color={C.dim} />
            무음 {cuts.length}곳 줄임 · {cutSec.toFixed(1)}초 짧아짐
            <button type="button" onClick={() => p.actions.restoreCut(c.id, "all")} style={{ height: 24, padding: "0 8px", borderRadius: 4, border: `1px solid ${C.line2}`, background: "transparent", color: C.sub, fontSize: 12, fontWeight: 700, fontFamily: FONT, cursor: "pointer" }}>원래대로</button>
          </div>
        )}


        {/* 2줄: 화면 자료 + 자막 */}
        {(p.view === "detail" || (isSrc && subOpen > 0)) && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderTop: `1px solid ${C.line}` }}>
            {/* 이 클립에만 있는 애셋 (글자·그래픽·사진·효과음) — 2개 클립 이상이면 왼쪽 줄로 나간다 */}
            <SingleChips list={(p.lanes.singles || []).filter((x) => x.a === it.index)} selLayer={p.selLayer} onDrag={p.onLayerDrag} thumbOf={(l) => (l.asset ? project.assets[l.asset]?.thumb || "" : "")} />
            {/* 끌어서 다른 클립으로 화면 옮기기 (2026-10-21 사장님) — 화면이 있는 클립끼리면 서로 바꾼다 */}
            <button type="button" data-drop-replace="" draggable={Boolean(thumb)} onDragStart={(e) => { e.stopPropagation(); setPeek(null); e.dataTransfer.effectAllowed = "copyMove"; e.dataTransfer.setData(DRAG_MEDIA, JSON.stringify({ fromClip: c.id })); }} onMouseEnter={(e) => thumb && asset && setPeek(e.currentTarget.getBoundingClientRect())} onMouseLeave={() => setPeek(null)}
              onClick={(e) => { e.stopPropagation(); setPeek(null); if (!thumb) return p.actions.openVisual(c.id); const r = e.currentTarget.getBoundingClientRect(); p.actions.openMedia(c.id, r.right + 8, r.top - 4); }} title={thumb ? "눌러서 채우기·반전·교체·적용 범위 · 오른쪽 클릭: 바꾸기·삭제·AI 이미지" : "화면 넣기 · 오른쪽 클릭: AI 이미지"}
              onContextMenu={(e) => { if (!p.actions.openVisualMenu) return; e.preventDefault(); e.stopPropagation(); setPeek(null); p.actions.openVisualMenu(c.id, e.clientX, e.clientY); }}
              style={{ position: "relative", width: 54, height: 34, padding: 0, border: `1px solid ${C.line2}`, borderRadius: 4, background: "#000", overflow: "hidden", cursor: "pointer", flexShrink: 0 }}>
              {thumb ? <img src={thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : <span style={{ color: C.dim, fontSize: 11 }}>화면</span>}
              {/* 메인 화면 잠금 — 노란 자물쇠 = 잠김(미리보기에서 안 잡힘), 파란 = 풀림. 누르면 바꾸기 */}
              {thumb && p.actions.toggleVisualLock && (() => {
                const locked = p.visualOpen !== c.id;
                return (
                  <span role="button" title={locked ? "잠김 — 미리보기에서 안 잡혀요. 누르면 풀려서 끌어 옮기기·크기" : "풀림 — 미리보기에서 옮기기·크기. 누르면 다시 잠가요"}
                    onClick={(e) => { e.stopPropagation(); setPeek(null); p.actions.toggleVisualLock!(c.id); }}
                    style={{ position: "absolute", left: 1, top: 1, width: 15, height: 15, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 3, background: "rgba(0,0,0,.65)", color: locked ? "#FACC15" : "#5b9cff", cursor: "pointer" }}>
                    <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="9" rx="2" /><path d={locked ? "M8 11V8a4 4 0 0 1 8 0v3" : "M8 11V8a4 4 0 0 1 7.5-2"} /></svg>
                  </span>
                );
              })()}
              {/* 키프레임·필터 표시 — 타임라인 편집에서 넣은 것 (텍스트 편집에서도 보이게, 회의 10-19 5장 5) */}
              {(c.kf?.length || c.adj) && (
                <span title={[c.kf?.length ? `◆ 키프레임 ${c.kf.length}개` : "", c.adj ? "필터·색 보정" : ""].filter(Boolean).join(" · ")}
                  style={{ position: "absolute", right: 1, bottom: 1, display: "flex", gap: 1, padding: "0 2px", borderRadius: 3, background: "rgba(0,0,0,.65)", color: "#fde047" }}>
                  {c.kf?.length ? <Icon name="diamondFill" size={10} /> : null}
                  {c.adj ? <span style={{ color: "#fff", display: "flex" }}><Icon name="adjust" size={10} /></span> : null}
                </span>
              )}
            </button>
            {peek && asset && <Peek asset={asset} rect={peek} start={c.visual ? c.visual.s : c.src?.s || 0} flipX={c.flipX} flipY={c.flipY} />}
            {/* ▶ 여기부터 듣기 / ■ 멈춤 — 흰 선 아이콘 (스페이스바도 같다) */}
            {(() => {
              const on = Boolean(p.playing && playingHere);
              return (
                <button type="button" onClick={(e) => { e.stopPropagation(); if (on) p.actions.stop(); else p.actions.play(c.id); }} title={on ? "멈춤 (스페이스바)" : "여기부터 듣기 (스페이스바)"}
                  style={{ width: 30, height: 30, padding: 0, border: 0, background: "transparent", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {on ? <Icon name="pause" size={20} stroke={1.8} /> : <Icon name="play" size={20} stroke={1.8} />}
                </button>
              );
            })()}
            <button type="button" onClick={(e) => { e.stopPropagation(); const r = e.currentTarget.getBoundingClientRect(); if (p.actions.openSubMenu) p.actions.openSubMenu(c.id, r.right + 8, r.top - 4); else p.actions.pickSub?.(c.id); }} title="눌러서 메인자막 메뉴 — 글·크기·색·위치·애니메이션"
              style={{ width: 24, height: 24, padding: 0, border: 0, borderRadius: 4, background: "transparent", color: C.dim, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
              onMouseEnter={(e) => (e.currentTarget.style.color = C.text)} onMouseLeave={(e) => (e.currentTarget.style.color = C.dim)}>
              <Icon name="sub" size={18} />
            </button>
            <SubLine c={c} p={p} empty="자막 넣기" open={subOpen} />
            {busy && <span style={{ fontSize: 13, color: C.sub }}>{busy}</span>}
            {c.type === "voice" && !c.voice && !busy && clipText(c) && <span style={{ fontSize: 13, color: C.dim }}>목소리 없음</span>}
          </div>
        )}

      </div>

      {/* 오른쪽: 화면 + 시간 */}
      <div style={{ position: "relative", width: 128, flexShrink: 0, padding: "10px 12px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, borderLeft: `1px solid ${C.line}` }}>
        {/* 🗑 클립 지우기 (Del 키도 같다) */}
        <button type="button" onClick={(e) => { e.stopPropagation(); p.actions.removeClip([c.id]); }} title="클립 지우기 (Del)"
          style={{ position: "absolute", top: -1, right: -1, transform: "translate(40%, -40%)", width: 26, height: 26, borderRadius: 13, border: `1px solid ${C.line2}`, background: C.panel, color: C.sub, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2 }}
          onMouseEnter={(e) => { e.currentTarget.style.background = C.danger; e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderColor = C.danger; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = C.panel; e.currentTarget.style.color = C.sub; e.currentTarget.style.borderColor = C.line2; }}>
          <Icon name="trash" size={14} />
        </button>
        <div data-drop-replace="" draggable={Boolean(thumb)} onDragStart={(e) => { e.stopPropagation(); e.dataTransfer.effectAllowed = "copyMove"; e.dataTransfer.setData(DRAG_MEDIA, JSON.stringify({ fromClip: c.id })); }} title={thumb ? "끌어서 다른 클립으로 화면 옮기기" : undefined} style={{ width: 104, height: 58, borderRadius: 4, overflow: "hidden", background: "#000", cursor: thumb ? "grab" : undefined }}>
          {thumb && <img src={thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
        </div>
        <button type="button" data-cliptime="" onClick={(e) => { e.stopPropagation(); const r = e.currentTarget.getBoundingClientRect(); p.actions.openTiming(c.id, r.right - 320, r.bottom + 6); }} title="이 클립이 시작하는 때 + 길이 · 눌러서 길이 바꾸기"
          style={{ border: `1px solid transparent`, borderRadius: 4, background: "transparent", padding: "2px 4px", fontSize: 12.5, color: C.sub, fontVariantNumeric: "tabular-nums", fontFamily: FONT, cursor: "pointer" }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = C.line2)} onMouseLeave={(e) => (e.currentTarget.style.borderColor = "transparent")}>
          {fmtTime(it.start, false)} + {it.dur.toFixed(2)}초
        </button>
        {c.type === "voice" && speedOf(c, project.settings) !== 1 && <span style={{ fontSize: 12, color: C.dim }}>빠르기 {speedOf(c, project.settings)}배</span>}
        {c.type !== "voice" && srcSpeed(c) !== 1 && <span style={{ fontSize: 12, color: C.dim }}>빠르기 {srcSpeed(c)}배</span>}
        {c.subStyle && Object.keys(c.subStyle).length > 0 && <span title="이 클립은 메인자막 서식을 따로 바꿨어요" style={{ fontSize: 11.5, fontWeight: 700, color: C.accent, border: `1px solid ${C.accent}`, borderRadius: 4, padding: "0 5px" }}>자막 따로</span>}
      </div>
    </div>
  );
}

/** 클립 사이 화면전환 자리 — 카드 사이 틈에 겹쳐 띄운다 (자리를 차지하지 않게). 있으면 칩, 없으면 마우스를 올릴 때 [+ 화면전환] */
function TransSlot({ c, p, open }: { c: Clip; p: Props; open: boolean }) {
  // 틈에 0.3초 머물 때만 작은 (＋) 하나 — 누르면 메뉴 (지나가기만 해도 단추가 튀어나와 잘못 누르던 문제)
  const [hover, setHover] = React.useState(false);
  const [menu, setMenu] = React.useState(false);
  const timer = React.useRef(0);
  const t = c.trans;
  const enter = () => {
    clearTimeout(timer.current);
    if (dragging.length) return; // 클립을 끌어 옮기는 동안은 안 나온다
    timer.current = window.setTimeout(() => setHover(true), 300);
  };
  const leave = () => {
    clearTimeout(timer.current);
    if (!menu) setHover(false);
  };
  React.useEffect(() => () => clearTimeout(timer.current), []);
  // 가로 단추 (아까처럼 크게) — 누르면 실행하고 닫힘
  const item = (icon: string, label: string, run: () => void) => (
    <button type="button" onClick={(e) => { e.stopPropagation(); setMenu(false); setHover(false); run(); }}
      style={{ height: 30, padding: "0 14px", borderRadius: 15, border: `1px solid ${C.line2}`, background: C.panel, color: C.text, fontSize: 13.5, fontWeight: 700, fontFamily: FONT, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap", boxShadow: "0 4px 14px rgba(0,0,0,0.4)" }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = C.accent)} onMouseLeave={(e) => (e.currentTarget.style.borderColor = C.line2)}>
      <Icon name={icon} size={15} />{label}
    </button>
  );
  return (
    <div onMouseEnter={enter} onMouseLeave={leave}
      style={{ position: "absolute", left: 0, right: 0, top: -10, height: 20, zIndex: menu ? 30 : 3, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, pointerEvents: "auto" }}>
      {/* 넣은 화면전환은 늘 칩으로 · 오른쪽 칸에 열려 있으면 빼도 [화면전환 없음] 칩으로 (갑자기 사라지지 않게, 2026-10-21 사장님) */}
      {(t || open) && (
        <button type="button" onClick={(e) => { e.stopPropagation(); const r = e.currentTarget.getBoundingClientRect(); if (t && p.actions.openTransMenu) p.actions.openTransMenu(c.id, r.right + 8, r.top - 4); else p.actions.openTrans(c.id, false); }} title="눌러서 화면전환 메뉴 — 바꾸기·길이·모두 똑같이·삭제"
          style={{ height: 22, padding: "0 10px", borderRadius: 11, border: `1px solid ${C.accent}`, background: open ? C.accent : C.accentDim, color: open ? "#fff" : C.text, fontSize: 12, fontWeight: 700, fontFamily: FONT, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" }}>
          ↔ {t ? `${transLabel(t.type)} · ${(Number(t.a) + Number(t.b)).toFixed(1)}초` : "화면전환 없음"}
        </button>
      )}
      {(hover || menu) && !menu && (
        <button type="button" onClick={(e) => { e.stopPropagation(); setMenu(true); }} title="여기에 넣기 — 새 클립 · 화면전환 · 새 씬"
          style={{ width: 22, height: 22, padding: 0, borderRadius: 11, border: `1px solid ${C.line2}`, background: C.panel, color: C.sub, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800, lineHeight: 1 }}>＋</button>
      )}
      {/* (＋)를 누르면 — 좌우 가운데에 가로로 [＋ 새 클립] [↔ 화면전환] [⊟ 여기서 새 씬] */}
      {menu && (
        <>
          <span onClick={(e) => { e.stopPropagation(); setMenu(false); setHover(false); }} style={{ position: "fixed", inset: 0, zIndex: 30 }} />
          <span onClick={(e) => e.stopPropagation()} style={{ position: "relative", zIndex: 31, display: "inline-flex", alignItems: "center", gap: 8 }}>
            {item("plus", "새 클립", () => p.actions.newClipBefore(c.id))}
            {item("transition", t ? "화면전환 바꾸기" : "화면전환", () => p.actions.openTrans(c.id, !t))}
            {item("scene", "여기서 새 씬", () => p.actions.sceneBreak(c.id))}
          </span>
        </>
      )}
    </div>
  );
}

const SPARE_W = 30; // 애셋 줄 끝 빈 칸 (사진을 놓는 자리)

/**
 * 단어 단추 막대 — 맨 위 층(문서 맨 끝)에 띄운다. 단어 줄 위 왼쪽에서 시작하고, 클립 목록 오른쪽 끝(속성 칸)을 넘지 않게 왼쪽으로 당긴다.
 * 위에 자리가 없으면 단어 줄 아래에
 */
function FloatBar({ anchor, children }: { anchor: React.RefObject<HTMLDivElement | null>; children: React.ReactNode }) {
  const bar = React.useRef<HTMLDivElement>(null);
  const [pos, setPos] = React.useState<{ left: number; top: number } | null>(null);
  React.useLayoutEffect(() => {
    const place = () => {
      const a = anchor.current, el = bar.current;
      if (!a || !el) return;
      const r = a.getBoundingClientRect();
      const list = a.closest("[data-cliplist]")?.getBoundingClientRect();
      const right = (list ? list.right : window.innerWidth) - 8;
      const leftEdge = (list ? list.left : 0) + 8;
      const w = el.offsetWidth, h = el.offsetHeight;
      const left = Math.max(leftEdge, Math.min(r.left, right - w));
      const top = r.top - h - 8 < (list ? list.top : 0) ? r.bottom + 6 : r.top - h - 8;
      setPos((p) => (p && p.left === left && p.top === top ? p : { left, top }));
    };
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  });
  return createPortal(
    <div ref={bar} data-keepword="" onClick={(e) => e.stopPropagation()} style={{ position: "fixed", left: pos?.left ?? -9999, top: pos?.top ?? -9999, zIndex: 3000 }}>{children}</div>,
    document.body,
  );
}

// 클립 끌어 옮기기 — 끄는 동안 옮기는 클립 (dragover 에서는 dataTransfer 를 읽을 수 없어서)
const DRAG_CLIP = "application/x-gsv-clip";
let dragging: string[] = [];

// 돌아가는 동그라미 (목소리 만드는 중)
const SPIN_CSS = "@keyframes gsvSpin{to{transform:rotate(360deg)}}.gsv-spin{animation:gsvSpin .8s linear infinite}";

export default function ClipList(p: Props) {
  const { project } = p;
  const [drop, setDrop] = React.useState<{ id: string; where: "before" | "after" | "replace" | "sticker" } | null>(null);
  const dropProps = (id: string) =>
    p.onDropMedia
      ? {
          onDragOver: (e: React.DragEvent<HTMLDivElement>) => {
            if (e.dataTransfer.types.includes(DRAG_STICKER) && p.onDropSticker) {
              e.preventDefault();
              e.dataTransfer.dropEffect = "copy";
              if (!drop || drop.id !== id || drop.where !== "sticker") setDrop({ id, where: "sticker" });
              return;
            }
            if (e.dataTransfer.types.includes(DRAG_CLIP)) {
              if (dragging.includes(id)) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              const r = e.currentTarget.getBoundingClientRect();
              const where = e.clientY - r.top < r.height / 2 ? "before" : "after";
              if (!drop || drop.id !== id || drop.where !== where) setDrop({ id, where });
              return;
            }
            if (!e.dataTransfer.types.includes(DRAG_MEDIA)) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";
            // 클립의 화면 칸(작은 칸·오른쪽 큰 칸)에 놓으면 늘 화면 바꾸기. 앞뒤 새 클립은 카드 맨 위·아래 가장자리에서만 (2026-10-18 사장님)
            const r = e.currentTarget.getBoundingClientRect();
            const y = e.clientY - r.top;
            const onThumb = (e.target as HTMLElement).closest?.("[data-drop-replace]");
            const where = onThumb ? "replace" : y < 14 ? "before" : y > r.height - 14 ? "after" : "replace";
            if (!drop || drop.id !== id || drop.where !== where) setDrop({ id, where });
          },
          onDragLeave: (e: React.DragEvent<HTMLDivElement>) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) setDrop((d) => (d && d.id === id ? null : d));
          },
          onDrop: (e: React.DragEvent<HTMLDivElement>) => {
            if (e.dataTransfer.types.includes(DRAG_STICKER) && p.onDropSticker) {
              e.preventDefault();
              setDrop(null);
              p.onDropSticker(id);
              return;
            }
            const moved = e.dataTransfer.getData(DRAG_CLIP);
            if (moved) {
              e.preventDefault();
              const where = drop && drop.id === id ? drop.where : "after";
              setDrop(null);
              dragging = [];
              try {
                const ids = JSON.parse(moved) as string[];
                if (!ids.includes(id)) p.actions.moveClips(ids, id, where === "before");
              } catch {}
              return;
            }
            const raw = e.dataTransfer.getData(DRAG_MEDIA);
            const where = drop && drop.id === id && drop.where !== "sticker" ? drop.where : "replace";
            setDrop(null);
            if (!raw) return;
            e.preventDefault();
            p.onDropMedia!(id, where, raw);
          },
        }
      : {};
  // 왼쪽 애셋 줄 — 빈 칸 하나를 늘 두고, 클립 줄에서는 사진을 놓으면 그 클립부터 사진 올리기
  const [layerDrop, setLayerDrop] = React.useState("");
  const gutter = (idx: number, pass: boolean, clipId?: string) => {
    const on = Boolean(clipId) && layerDrop === clipId;
    const drop = clipId && p.onDropLayer
      ? {
          onDragOver: (e: React.DragEvent<HTMLDivElement>) => {
            if (!e.dataTransfer.types.includes(DRAG_MEDIA)) return;
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = "copy";
            if (layerDrop !== clipId) setLayerDrop(clipId);
          },
          onDragLeave: (e: React.DragEvent<HTMLDivElement>) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) setLayerDrop((d) => (d === clipId ? "" : d));
          },
          onDrop: (e: React.DragEvent<HTMLDivElement>) => {
            const raw = e.dataTransfer.getData(DRAG_MEDIA);
            setLayerDrop("");
            if (!raw) return;
            e.preventDefault();
            e.stopPropagation();
            p.onDropLayer!(clipId, raw);
          },
        }
      : {};
    const many = Boolean(clipId) && p.selected.length > 1 && p.selected.includes(clipId!);
    return (
      <div {...drop} style={{ display: "flex", flexShrink: 0, position: "relative", alignSelf: "stretch" }}>
        <Gutter entries={p.lanes.entries} lanes={p.lanes.lanes} idx={idx} pass={pass} selLayer={p.selLayer} onDrag={p.onLayerDrag} />
        <div data-layer-ui="" style={{ width: SPARE_W, position: "relative" }}>
          {/* 한 클립에만 있는 애셋을 고르면 — 그 클립 옆에 파란 세로줄 하나 (왼쪽 줄과 같은 모양, 브루처럼). 위·아래 손잡이를 끌면 범위가 늘어난다 */}
          {!pass && (() => {
            const one = (p.lanes.singles || []).find((x) => x.a === idx && x.layer.id === p.selLayer);
            if (!one) return null;
            const cap = (end: "from" | "to"): React.CSSProperties => ({ position: "absolute", left: SPARE_W / 2 - 11, width: 22, height: 12, [end === "from" ? "top" : "bottom"]: 2, cursor: "ns-resize", touchAction: "none", display: "flex", alignItems: "center", justifyContent: "center" });
            return (
              <>
                <span style={{ position: "absolute", left: SPARE_W / 2 - 1, width: 2, top: 8, bottom: 8, background: C.accent, borderRadius: 1, pointerEvents: "none" }} />
                {(["from", "to"] as const).map((end) => (
                  <span key={end} onPointerDown={(ev) => p.onLayerDrag(one.layer.id, end, ev)} onClick={(ev) => ev.stopPropagation()}
                    title={end === "from" ? "위로 끌면 앞 클립까지 늘어나요" : "아래로 끌면 뒤 클립까지 늘어나요"} style={cap(end)}>
                    <span style={{ width: 16, height: 5, borderRadius: 3, background: C.accent }} />
                  </span>
                ))}
              </>
            );
          })()}
        </div>
        {on && (
          <>
            <div style={{ position: "absolute", inset: "6px 0", border: `2px dashed ${C.accent}`, borderRadius: 8, background: "rgba(59,130,246,0.15)", pointerEvents: "none" }} />
            <span style={{ position: "absolute", left: "100%", top: 8, marginLeft: 4, zIndex: 5, whiteSpace: "nowrap", padding: "4px 10px", borderRadius: 5, background: C.accent, color: "#fff", fontSize: 13, fontWeight: 800, pointerEvents: "none" }}>
              {many ? `고른 클립 ${p.selected.length}개에 사진 올리기` : "이 클립부터 끝까지 사진 올리기"}
            </span>
          </>
        )}
      </div>
    );
  };
  let n = 0;
  const [sceneEdit, setSceneEdit] = React.useState(""); // 이름 고치는 씬
  const byId = new Map(p.items.map((x) => [x.clip.id, x]));
  return (
    <div data-cliplist="" style={{ padding: "8px 24px 120px" }}>
      <style>{SPIN_CSS + ".gsv-scene-merge{opacity:0;transition:opacity .15s}.gsv-scene-head:hover .gsv-scene-merge{opacity:1}"}</style>
      {project.scenes.map((sc, si) => {
        const its = sc.clips.map((c) => byId.get(c.id)).filter(Boolean) as FlatItem[];
        const prevHas = project.scenes.slice(0, si).some((x) => x.clips.length > 0);
        if (!its.length && project.scenes.length > 1) return null;
        const start = its[0]?.start || 0;
        const dur = its.reduce((a, x) => a + x.dur, 0);
        return (
          <div key={sc.id}>
            <div style={{ display: "flex" }}>
            {its.length > 0 && gutter(its[0].index, true)}
            <div className="gsv-scene-head" style={{ flex: 1, display: "flex", alignItems: "baseline", gap: 12, padding: "14px 4px 4px" }}>
              {its.length > 0 && <AllBox ids={its.map((x) => x.clip.id)} selected={p.selected} onChange={p.actions.selectMany} title={`씬 ${si + 1} 클립 모두 고르기 / 풀기`} />}
              <span style={{ fontSize: 19, fontWeight: 800, color: C.sub }}>씬 {si + 1}</span>
              {/* 씬 이름 — 누르면 바로 고치기 */}
              {sceneEdit === sc.id ? (
                <input autoFocus defaultValue={sc.title || ""} placeholder="씬 이름 (예: 도입, 가격·조건)"
                  onBlur={(e) => { p.actions.renameScene(sc.id, e.currentTarget.value); setSceneEdit(""); }}
                  onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") setSceneEdit(""); }}
                  style={{ height: 28, minWidth: 220, padding: "0 8px", borderRadius: 5, border: `1px solid ${C.accent}`, background: C.bg, color: C.text, fontSize: 14.5, fontFamily: "inherit" }} />
              ) : (
                <button type="button" onClick={() => setSceneEdit(sc.id)} title="씬 이름 고치기"
                  style={{ border: 0, background: "transparent", padding: 0, cursor: "text", fontSize: 15, color: sc.title ? C.dim : C.line2, fontFamily: "inherit" }}>{sc.title || "이름 넣기"}</button>
              )}
              {si > 0 && prevHas && its.length > 0 && (
                <button type="button" className="gsv-scene-merge" onClick={() => p.actions.sceneMergeUp(sc.id)} title="이 씬의 클립을 위 씬 끝에 붙여 하나로 (되돌리기 돼요)"
                  style={{ height: 26, padding: "0 10px", borderRadius: 13, border: `1px solid ${C.line2}`, background: "transparent", color: C.sub, fontSize: 12.5, fontWeight: 700, fontFamily: "inherit", cursor: "pointer" }}>↑ 위 씬과 합치기</button>
              )}
              <span style={{ flex: 1 }} />
              <span style={{ fontSize: 13.5, color: C.dim, fontVariantNumeric: "tabular-nums" }}>{fmtTime(start, false)} + {Math.floor(dur / 60) ? `${Math.floor(dur / 60)}분 ` : ""}{Math.round(dur % 60)}초</span>
            </div>
            </div>
            {its.map((it) => (
              <div key={it.clip.id} data-row={it.clip.id} style={{ display: "flex" }}>
                {gutter(it.index, false, it.clip.id)}
                <div style={{ flex: 1, minWidth: 0, position: "relative" }} {...dropProps(it.clip.id)}>
                  {n > 0 && <TransSlot c={it.clip} p={p} open={p.transClip === it.clip.id} />}
                  <ClipCard project={project} it={it} n={++n} p={p} />
                  {drop?.id === it.clip.id && drop.where === "sticker" && (
                    <div style={{ position: "absolute", inset: "6px 0", border: `2px solid ${C.accent}`, borderRadius: 8, pointerEvents: "none", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(59,130,246,0.12)" }}>
                      <span style={{ padding: "6px 12px", borderRadius: 5, background: C.accent, color: "#fff", fontSize: 14, fontWeight: 800 }}>여기 놓으면 이 클립에 그래픽을 넣어요</span>
                    </div>
                  )}
                  {drop?.id === it.clip.id && drop.where !== "sticker" && (drop.where === "replace" ? (
                    <div style={{ position: "absolute", inset: "6px 0", border: `2px solid ${C.accent}`, borderRadius: 8, pointerEvents: "none", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(59,130,246,0.12)" }}>
                      <span style={{ padding: "6px 12px", borderRadius: 5, background: C.accent, color: "#fff", fontSize: 14, fontWeight: 800 }}>{p.selected.length > 1 && p.selected.includes(it.clip.id) ? `여기 놓으면 고른 클립 ${p.selected.length}개 화면을 바꿔요` : "여기 놓으면 이 클립 화면을 바꿔요"}</span>
                    </div>
                  ) : (
                    <div style={{ position: "absolute", left: 0, right: 0, [drop.where === "before" ? "top" : "bottom"]: 1, height: 4, borderRadius: 2, background: C.accent, pointerEvents: "none" }}>
                      <span style={{ position: "absolute", left: 8, top: -12, padding: "2px 8px", borderRadius: 4, background: C.accent, color: "#fff", fontSize: 12.5, fontWeight: 800 }}>{dragging.length ? `여기로 옮기기${dragging.length > 1 ? ` (클립 ${dragging.length}개)` : ""}` : drop.where === "before" ? "이 클립 앞에 넣기" : "이 클립 뒤에 넣기"}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {its.length > 0 && (
              <div style={{ display: "flex", height: 20 }}>
                {gutter(its[its.length - 1].index + 1, true)}
              </div>
            )}
            {!its.length && <div style={{ padding: 30, textAlign: "center", color: C.dim, fontSize: 15, border: `1px dashed ${C.line2}`, borderRadius: 8 }}>아직 클립이 없어요. 위 [삽입] 탭이나 오른쪽 자료에서 넣어 주세요.</div>}
          </div>
        );
      })}
    </div>
  );
}

export type { Clip };
