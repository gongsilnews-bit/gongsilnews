"use client";

// 가운데 클립 목록 — 브루처럼 문장 하나 = 클립 카드, 단어를 단추로. 단어를 지우면 그 소리·영상이 잘린다.
// 어르신도 쉽게: 고른 카드·단어 아래에 할 수 있는 일을 단추로 늘 보여 준다 (숨은 기능 없음)
import React from "react";
import type { Clip, Project, Word } from "./types";
import { DRAG_MEDIA, fmtTime } from "./types";
import { clipText, type FlatItem, speedOf, srcSpeed, wordTimes } from "./timeline";
import { STUDIO_VOICES } from "@/lib/studio-video/voices";
import { C, Icon, FONT } from "./ui";
import { Gutter, type LaneEntry, type LayerDrag } from "./Layers";
import { transLabel } from "./transitions";

export type ClipActions = {
  selectClip: (id: string, multi: boolean) => void;
  selectMany: (ids: string[], on: boolean) => void; // 씬 전체·클립 전체 고르기/풀기
  selectWord: (clipId: string, i: number) => void;
  toggleWord: (clipId: string, i: number) => void;
  splitAt: (clipId: string, i: number) => void;
  editText: (clipId: string, text: string) => void;
  removeClip: (ids: string[]) => void;
  mergeUp: (id: string) => void;
  openVoice: (id: string) => void;
  openVisual: (id: string) => void;
  openMedia: (id: string, x: number, y: number) => void; // 화면 썸네일을 누르면 사진·영상 메뉴
  openTiming: (id: string) => void; // 시간을 누르면 속도·길이 칸
  toggleMute: (id: string) => void;
  setSource: (id: string, patch: { muted?: boolean; volume?: number }, first: boolean) => void; // 원본 소리 무음·크기
  openSound: (id: string, x: number, y: number) => void; // 소리 칩을 누르면 옆에 볼륨·빠르기 창
  sceneBreak: (id: string) => void;
  play: (id: string) => void;
  stop: () => void; // 재생 멈춤 (클립 칸 ■)
  editSub: (id: string, text: string | null) => void; // 자막만 고치기 (null = 원래대로)
  restoreCut: (id: string, i: number | "all") => void; // 무음 줄이기 원래대로 (한 곳 / 모두)
  addCut: (id: string, g: { s: number; e: number }) => void; // 쉼 [..] 하나 줄이기
  openTrans: (id: string, add: boolean) => void; // 클립 사이 화면전환 — 이 클립 앞(앞 클립에서 넘어오는) 전환 열기 · add: 없으면 새로
};

type Props = {
  project: Project;
  items: FlatItem[];
  selected: string[];
  selWord: { clip: string; i: number } | null;
  curClip: string;
  curWord: number;
  playing?: boolean; // 지금 재생 중 (클립 칸 ▶/■)
  busy: Record<string, string>;
  actions: ClipActions;
  view: "detail" | "simple";
  lanes: { entries: LaneEntry[]; lanes: number };
  selLayer: string;
  onLayerDrag: LayerDrag;
  /** 자료 칸에서 끌어 놓기 — before/after: 그 자리에 새 클립, replace: 그 클립 화면 바꾸기 */
  onDropMedia?: (clipId: string, where: "before" | "after" | "replace", raw: string) => void;
  /** 왼쪽 애셋 줄에 놓으면 그 클립부터 사진 올리기 (레이어) */
  onDropLayer?: (clipId: string, raw: string) => void;
  /** 오른쪽 칸에 열린 화면전환 (뒤 클립 id) */
  transClip?: string;
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

const voiceName = (id?: string) => STUDIO_VOICES.find((v) => v.id === id)?.name || "AI 목소리";

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
        <input value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus placeholder="화면에 나올 자막"
          // 엔터 = 자막 바꾸기 (한글을 치는 중이어도 칸에 보이는 글 그대로), Esc = 그만두기
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              p.actions.editSub(c.id, e.currentTarget.value);
              setEdit(false);
            }
            if (e.key === "Escape") setEdit(false);
          }}
          style={{ flex: 1, minWidth: 200, height: 34, padding: "0 10px", borderRadius: 5, border: `1px solid ${C.accent}`, background: C.bg, color: C.text, fontSize: 15, fontFamily: FONT }} />
        <ActionBtn icon="check" label="자막 바꾸기" onClick={() => { p.actions.editSub(c.id, draft); setEdit(false); }} />
        {custom && c.type !== "silence" && <ActionBtn icon="undo" label="말한 그대로" onClick={() => { p.actions.editSub(c.id, null); setEdit(false); }} />}
        <ActionBtn icon="close" label="그만두기" onClick={() => setEdit(false)} />
      </div>
    );
  }
  return (
    <button type="button" title="자막만 고치기 (목소리는 그대로)" onClick={(e) => { e.stopPropagation(); setDraft(text); setEdit(true); }}
      style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 8, height: 32, padding: "0 6px", border: 0, borderRadius: 4, background: "transparent", cursor: "text", textAlign: "left", fontFamily: FONT }}>
      <span style={{ flex: "0 1 auto", minWidth: 0, fontSize: 15, color: c.sub === false ? C.dim : text ? "#9ecbff" : C.dim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{text || empty || " "}</span>
      {/* 자막을 고치는 곳은 여기 — 연필 표시 */}
      <Icon name="pen" size={16} color={C.sub} />
      <span style={{ flex: 1 }} />
      {custom && text && <span style={{ fontSize: 12, color: C.dim, flexShrink: 0 }}>자막만 고침</span>}
      {/* 말한 단어와 자막이 다를 때 바로 되돌리기 */}
      {custom && c.type !== "silence" && (
        <span role="button" title="말한 단어 그대로 자막에 보여요" onClick={(e) => { e.stopPropagation(); p.actions.editSub(c.id, null); }}
          style={{ flexShrink: 0, padding: "2px 8px", borderRadius: 4, border: `1px solid ${C.line2}`, color: C.sub, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>말한 그대로</span>
      )}
    </button>
  );
}

function ClipCard({ project, it, n, p }: { project: Project; it: FlatItem; n: number; p: Props }) {
  const c = it.clip;
  const sel = p.selected.includes(c.id);
  const playingHere = p.curClip === c.id;
  const [editing, setEditing] = React.useState(false);
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
        <span style={{ flexShrink: 0 }}>말이 없는 구간 {it.dur.toFixed(1)}초</span>
        <Icon name="sub" size={16} color={C.dim} />
        <SubLine c={c} p={p} empty="자막 넣기" />
        <ActionBtn icon="trash" label="이 구간 지우기" onClick={() => p.actions.removeClip([c.id])} />
      </div>
    );
  }

  return (
    <div onClick={(e) => p.actions.selectClip(c.id, e.ctrlKey || e.metaKey || e.shiftKey)} data-clip={c.id}
      style={{ display: "flex", gap: 0, margin: "8px 0", borderRadius: 8, border: `1px solid ${sel ? C.accent : playingHere ? C.line2 : C.line}`, background: C.card, cursor: "pointer", fontFamily: FONT }}>
      {/* 번호 + 고르기 칸 */}
      <div style={{ width: 52, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 10, paddingTop: 14, borderRight: `1px solid ${C.line}` }}>
        <span style={{ fontSize: 15, fontWeight: 800, color: playingHere ? C.text : C.sub }}>{n}</span>
        <input type="checkbox" checked={sel} onChange={() => p.actions.selectClip(c.id, true)} onClick={(e) => e.stopPropagation()} style={{ width: 18, height: 18, accentColor: C.accent, cursor: "pointer" }} title="여러 클립 고르기" />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* 1줄: 목소리 + 단어 단추 */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px" }}>
          <button type="button" onClick={(e) => { e.stopPropagation(); const r = e.currentTarget.getBoundingClientRect(); p.actions.openSound(c.id, r.left, r.bottom + 6); }} title="눌러서 볼륨·빠르기·목소리 바꾸기"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 32, padding: "0 10px", borderRadius: 5, border: `1px solid ${silent ? C.danger : C.line2}`, background: silent ? "rgba(239,68,68,0.12)" : "transparent", color: silent ? C.danger : C.sub, fontSize: 13.5, fontWeight: 700, fontFamily: FONT, cursor: "pointer", flexShrink: 0 }}>
            <Icon name={silent ? "mute" : c.type === "voice" ? "voice" : "mic"} size={16} />
            {silent ? (c.type === "voice" ? `${voiceName(c.voiceId || project.settings.voice.id)} 무음` : "원본 소리 무음") : c.type === "voice" ? voiceName(c.voiceId || project.settings.voice.id) : "원본 소리"}
          </button>
          {editing ? (
            <div style={{ flex: 1 }} onClick={(e) => e.stopPropagation()}
              onBlur={(e) => {
                // 다른 곳을 누르면 닫는다 — 고친 게 있으면(AI 목소리를 새로 만들 수 있으니) 열어 둔다
                if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                if (draft === clipText(c)) setEditing(false);
              }}>
              <textarea value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus rows={2}
                // 엔터 = 고치기 끝 (줄 바꿈은 Shift+엔터), Esc = 그만두기
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    p.actions.editText(c.id, e.currentTarget.value);
                    setEditing(false);
                  }
                  if (e.key === "Escape") setEditing(false);
                }}
                style={{ width: "100%", boxSizing: "border-box", padding: 10, borderRadius: 6, border: `1px solid ${C.accent}`, background: C.bg, color: C.text, fontSize: 16, lineHeight: 1.5, fontFamily: FONT, resize: "vertical" }} />
              <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                <ActionBtn icon="check" label="고치기 끝" onClick={() => { p.actions.editText(c.id, draft); setEditing(false); }} />
                <ActionBtn icon="close" label="그만두기" onClick={() => setEditing(false)} />
                {c.type === "voice" && <span style={{ fontSize: 13, color: C.dim, alignSelf: "center" }}>엔터를 누르면 고쳐져요 · 고치면 AI 목소리를 새로 만들어요</span>}
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, display: "flex", flexWrap: "wrap", gap: 4 }}>
              {words.length === 0 && <span style={{ fontSize: 15, color: C.dim, padding: "5px 0" }}>{c.type === "voice" ? "(글 없음 — 화면만 보여요)" : "(말소리 없음)"}</span>}
              {words.map((w, i) => {
                const isSel = p.selWord?.clip === c.id && p.selWord.i === i;
                const active = !w.del && times.find((x) => (x as { i: number }).i === i) && activeIdx === i;
                // 이 단어 앞의 쉼 [..]
                const before = pauses.filter((g) => g.at === i);
                return (
                  <React.Fragment key={i}>
                  {before.map((g, j) => pauseChip(g, i * 10 + j))}
                  <button type="button" onClick={(e) => { e.stopPropagation(); p.actions.selectWord(c.id, i); }}
                    style={{ height: 34, padding: "0 10px", borderRadius: 4, border: `1px solid ${isSel ? C.accent : C.line2}`, background: active ? C.accent : w.del ? "transparent" : C.panel2,
                      color: w.del ? C.dim : active ? "#fff" : C.text, textDecoration: w.del ? "line-through" : "none", fontSize: 15.5, fontFamily: FONT, cursor: "pointer", whiteSpace: "nowrap" }}>
                    {w.w}
                  </button>
                  </React.Fragment>
                );
              })}
              {/* 마지막 단어 뒤의 쉼 [..] */}
              {pauses.filter((g) => g.at === words.length).map((g, j) => pauseChip(g, 100000 + j))}
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

        {/* 무음 줄이기 요약 */}
        {cuts.length > 0 && !editing && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 12px 8px 12px", fontSize: 13, color: C.sub }} onClick={(e) => e.stopPropagation()}>
            <Icon name="silence" size={15} color={C.dim} />
            무음 {cuts.length}곳 줄임 · {cutSec.toFixed(1)}초 짧아짐
            <button type="button" onClick={() => p.actions.restoreCut(c.id, "all")} style={{ height: 24, padding: "0 8px", borderRadius: 4, border: `1px solid ${C.line2}`, background: "transparent", color: C.sub, fontSize: 12, fontWeight: 700, fontFamily: FONT, cursor: "pointer" }}>원래대로</button>
          </div>
        )}

        {/* 고른 단어로 할 수 있는 일 */}
        {p.selWord?.clip === c.id && !editing && words[p.selWord.i] && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "0 12px 10px 12px" }} onClick={(e) => e.stopPropagation()}>
            <span style={{ fontSize: 13.5, color: C.sub, alignSelf: "center", marginRight: 4 }}>“{words[p.selWord.i].w}”</span>
            <ActionBtn icon={words[p.selWord.i].del ? "undo" : "trash"} label={words[p.selWord.i].del ? "이 단어 되살리기" : "이 단어 지우기"} onClick={() => p.actions.toggleWord(c.id, p.selWord!.i)} danger={!words[p.selWord.i].del} />
            {p.selWord.i > 0 && <ActionBtn icon="split" label="여기서 클립 나누기" onClick={() => p.actions.splitAt(c.id, p.selWord!.i)} />}
          </div>
        )}

        {/* 2줄: 화면 자료 + 자막 */}
        {(p.view === "detail" || (isSrc && subOpen > 0)) && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderTop: `1px solid ${C.line}` }}>
            <button type="button" onMouseEnter={(e) => thumb && asset && setPeek(e.currentTarget.getBoundingClientRect())} onMouseLeave={() => setPeek(null)}
              onClick={(e) => { e.stopPropagation(); setPeek(null); if (!thumb) return p.actions.openVisual(c.id); const r = e.currentTarget.getBoundingClientRect(); p.actions.openMedia(c.id, r.right + 8, r.top - 4); }} title={thumb ? "눌러서 채우기·반전·교체·적용 범위" : "화면 넣기"}
              style={{ width: 54, height: 34, padding: 0, border: `1px solid ${C.line2}`, borderRadius: 4, background: "#000", overflow: "hidden", cursor: "pointer", flexShrink: 0 }}>
              {thumb ? <img src={thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : <span style={{ color: C.dim, fontSize: 11 }}>화면</span>}
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
            <Icon name="sub" size={18} color={C.dim} />
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
        <div style={{ width: 104, height: 58, borderRadius: 4, overflow: "hidden", background: "#000" }}>
          {thumb && <img src={thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
        </div>
        <button type="button" onClick={(e) => { e.stopPropagation(); p.actions.openTiming(c.id); }} title="눌러서 속도·길이 바꾸기"
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
  const [hover, setHover] = React.useState(false);
  const t = c.trans;
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ position: "absolute", left: 0, right: 0, top: -10, height: 20, zIndex: 3, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "auto" }}>
      {(t || hover) && (
        <button type="button" onClick={(e) => { e.stopPropagation(); p.actions.openTrans(c.id, !t); }} title={t ? "눌러서 화면전환 바꾸기" : "이 두 클립 사이에 화면전환 넣기"}
          style={{ height: 22, padding: "0 10px", borderRadius: 11, border: `1px solid ${t || open ? C.accent : C.line2}`, background: t ? (open ? C.accent : C.accentDim) : C.panel, color: t && open ? "#fff" : t ? C.text : C.sub, fontSize: 12, fontWeight: 700, fontFamily: FONT, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" }}>
          {t ? <>↔ {transLabel(t.type)} · {(Number(t.a) + Number(t.b)).toFixed(1)}초</> : <>＋ 화면전환</>}
        </button>
      )}
    </div>
  );
}

const SPARE_W = 30; // 애셋 줄 끝 빈 칸 (사진을 놓는 자리)

export default function ClipList(p: Props) {
  const { project } = p;
  const [drop, setDrop] = React.useState<{ id: string; where: "before" | "after" | "replace" } | null>(null);
  const dropProps = (id: string) =>
    p.onDropMedia
      ? {
          onDragOver: (e: React.DragEvent<HTMLDivElement>) => {
            if (!e.dataTransfer.types.includes(DRAG_MEDIA)) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";
            const r = e.currentTarget.getBoundingClientRect();
            const f = (e.clientY - r.top) / Math.max(1, r.height);
            const where = f < 0.25 ? "before" : f > 0.75 ? "after" : "replace";
            if (!drop || drop.id !== id || drop.where !== where) setDrop({ id, where });
          },
          onDragLeave: (e: React.DragEvent<HTMLDivElement>) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) setDrop((d) => (d && d.id === id ? null : d));
          },
          onDrop: (e: React.DragEvent<HTMLDivElement>) => {
            const raw = e.dataTransfer.getData(DRAG_MEDIA);
            const where = drop && drop.id === id ? drop.where : "replace";
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
        <div style={{ width: SPARE_W }} />
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
  const byId = new Map(p.items.map((x) => [x.clip.id, x]));
  return (
    <div style={{ padding: "8px 24px 120px" }}>
      {project.scenes.map((sc, si) => {
        const its = sc.clips.map((c) => byId.get(c.id)).filter(Boolean) as FlatItem[];
        if (!its.length && project.scenes.length > 1) return null;
        const start = its[0]?.start || 0;
        const dur = its.reduce((a, x) => a + x.dur, 0);
        return (
          <div key={sc.id}>
            <div style={{ display: "flex" }}>
            {its.length > 0 && gutter(its[0].index, true)}
            <div style={{ flex: 1, display: "flex", alignItems: "baseline", gap: 12, padding: "14px 4px 4px" }}>
              {its.length > 0 && <AllBox ids={its.map((x) => x.clip.id)} selected={p.selected} onChange={p.actions.selectMany} title={`씬 ${si + 1} 클립 모두 고르기 / 풀기`} />}
              <span style={{ fontSize: 19, fontWeight: 800, color: C.sub }}>씬 {si + 1}</span>
              {sc.title && <span style={{ fontSize: 15, color: C.dim }}>{sc.title}</span>}
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
                  {drop?.id === it.clip.id && (drop.where === "replace" ? (
                    <div style={{ position: "absolute", inset: "6px 0", border: `2px solid ${C.accent}`, borderRadius: 8, pointerEvents: "none", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(59,130,246,0.12)" }}>
                      <span style={{ padding: "6px 12px", borderRadius: 5, background: C.accent, color: "#fff", fontSize: 14, fontWeight: 800 }}>{p.selected.length > 1 && p.selected.includes(it.clip.id) ? `여기 놓으면 고른 클립 ${p.selected.length}개 화면을 바꿔요` : "여기 놓으면 이 클립 화면을 바꿔요"}</span>
                    </div>
                  ) : (
                    <div style={{ position: "absolute", left: 0, right: 0, [drop.where === "before" ? "top" : "bottom"]: 1, height: 4, borderRadius: 2, background: C.accent, pointerEvents: "none" }}>
                      <span style={{ position: "absolute", left: 8, top: -12, padding: "2px 8px", borderRadius: 4, background: C.accent, color: "#fff", fontSize: 12.5, fontWeight: 800 }}>{drop.where === "before" ? "이 클립 앞에 넣기" : "이 클립 뒤에 넣기"}</span>
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
