"use client";

// 편집 화면 — 브루와 같은 짜임: 맨 위 탭 + 리본, 왼쪽 미리보기, 가운데 클립 목록, 오른쪽 자료·설정 칸
// 진짜 편집이 되면서 어르신도 쉽게: 모든 기능을 눈에 보이는 단추로, 되돌리기, 자동 저장
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Asset, Clip, Layer, LibItem, Project, Ratio, Scene, StockItem, Word } from "./types";
import { DRAG_MEDIA, errText, fmtTime, uid, videoBridge } from "./types";
import { GAP, clipOrder, clipText, flatten, keepRanges, layerItems, layersAt, speedOf, splitScript, srcSpeed, subStyleOf, wordTimes } from "./timeline";
import MediaMenu, { SoundMenu, type MediaFit, type MediaOrder } from "./MediaMenu";
import { NewClipDialog, type NewClipSpec } from "./NewClip";
import VideoStart from "./VideoStart";
import { STUDIO_VOICES } from "@/lib/studio-video/voices";
import Player, { type PlayerHandle } from "./Player";
import ClipList, { AllBox, type ClipActions } from "./ClipList";
import { LibraryPanel, MusicPanel, RatioPanel, SubtitlePanel, VoicePanel, type LibPickAction } from "./Panels";
import { Btn, C, FONT, Hint, Icon, Modal, Working, input, label } from "./ui";
import { TransPanel } from "./TransPanel";
import { TRANS_DEFAULT } from "./transitions";
import { LAYER_ICON, LayerPanel, LayerPopup, SourcePanel, VisualPanel, computeLanes, layerTitle } from "./Layers";

type PanelKind = "" | "library" | "voice" | "subtitle" | "ratio" | "music" | "layer" | "visual" | "timing" | "source" | "trans";
type RibbonBtn = { icon: string; label: string; onClick?: () => void; disabled?: boolean; title?: string } | "|";

const TABS = ["파일", "홈", "편집", "자막", "서식", "삽입", "AI 목소리", "효과", "도움말"] as const;

function findClip(p: Project, id: string): { scene: Scene; idx: number; clip: Clip } | null {
  for (const scene of p.scenes) {
    const idx = scene.clips.findIndex((c) => c.id === id);
    if (idx >= 0) return { scene, idx, clip: scene.clips[idx] };
  }
  return null;
}

/** 예전 프로젝트의 "전체 배경 음악"을 처음~끝 음악 애셋으로 바꾼다 */
function migrate(p0: Project): Project {
  const m = p0.settings.music;
  if (!m?.on || !m.file || (p0.layers || []).some((l) => l.type === "music")) return p0;
  const ids = flatten(p0).items.map((x) => x.clip.id);
  if (!ids.length) return p0;
  const p = structuredClone(p0) as Project;
  p.layers = [...(p.layers || []), { id: uid(), type: "music", from: ids[0], to: ids[ids.length - 1], name: m.name, file: m.file, url: m.url, volume: m.volume ?? 0.15, fadeIn: 0, fadeOut: 2, offset: 0, loop: true }];
  p.settings.music = { ...m, on: false };
  return p;
}

/** 클립을 지우거나 합친 뒤 애셋 범위를 남은 클립으로 맞춘다 (범위 안 클립이 다 사라지면 애셋도 지운다) */
function fixLayers(prev: Project, next: Project) {
  if (!next.layers?.length) return;
  const oldIds = [...clipOrder(prev).keys()];
  const now = clipOrder(next);
  next.layers = next.layers.flatMap((l) => {
    let f = l.from;
    let t = l.to;
    const oi = oldIds.indexOf(l.from);
    const ot = oldIds.indexOf(l.to);
    const span = oi >= 0 && ot >= 0 ? oldIds.slice(Math.min(oi, ot), Math.max(oi, ot) + 1) : [];
    if (!now.has(f)) f = span.find((id) => now.has(id)) || "";
    if (!now.has(t)) t = [...span].reverse().find((id) => now.has(id)) || "";
    if (!f || !t) return [];
    if (now.get(f)! > now.get(t)!) [f, t] = [t, f];
    return [{ ...l, from: f, to: t }];
  });
}


export default function Editor({ initial, onHome, onNew, onOpen, onSwitch }: { initial: Project; onHome: () => void; onNew: () => void; onOpen: () => void; onSwitch?: (p: Project) => void }) {
  const b = videoBridge()!;
  const [project, setProjectState] = useState<Project>(() => migrate(initial));
  const pref = useRef(project);
  const hist = useRef<{ past: string[]; future: string[] }>({ past: [], future: [] });
  const [, force] = useState(0);
  const [tab, setTab] = useState<(typeof TABS)[number]>("홈");
  const [panel, setPanel] = useState<PanelKind>("");
  const [transClip, setTransClip] = useState(""); // 오른쪽 칸에 연 화면전환 (뒤 클립 id)
  const [libTab, setLibTab] = useState("mine");
  const [libOpen, setLibOpenState] = useState(() => {
    try {
      const v = localStorage.getItem("gsv:libOpen");
      if (v === "1" || v === "0") return v === "1";
    } catch {}
    return typeof window === "undefined" || window.innerWidth > 1366;
  });
  const setLibOpen = (v: boolean) => {
    setLibOpenState(v);
    try {
      localStorage.setItem("gsv:libOpen", v ? "1" : "0");
    } catch {}
  };
  const [selected, setSelected] = useState<string[]>([]);
  const [selWord, setSelWord] = useState<{ clip: string; i: number } | null>(null);
  // Ctrl+클릭으로 더 고른 단어들 (selWord 와 같은 클립일 때만 쓴다)
  const [selWordSet, setSelWordSet] = useState<{ clip: string; is: number[] } | null>(null);
  const wordIs = (): number[] => (selWord ? (selWordSet && selWordSet.clip === selWord.clip && selWordSet.is.length ? [...selWordSet.is].sort((a, b) => a - b) : [selWord.i]) : []);
  // 단어 복사 보관함 — 촬영 영상은 그 단어를 말한 구간, AI 목소리는 글자
  const wordClip = useRef<{ kind: "src"; asset: string; runs: { s: number; e: number; words: Word[] }[] } | { kind: "text"; text: string } | null>(null);
  const lastCopy = useRef<"clips" | "words">("clips");
  const keepWordOnPlay = useRef(false); // 상세 편집 [▶ 이 단어 듣기]는 고른 단어를 그대로 둔다
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  // 왼쪽 메뉴 줄이 숨었는지 (관리자 화면이 알려 준다) — 숨었으면 [처음 화면] 옆에 [»]
  const [railHidden, setRailHidden] = useState(false);
  useEffect(() => {
    setRailHidden(Boolean((window as unknown as { __studioRailHidden?: boolean }).__studioRailHidden));
    const on = (e: Event) => setRailHidden(Boolean((e as CustomEvent<boolean>).detail));
    window.addEventListener("studio:rail-state", on);
    // 편집 화면이 열려 있다고 관리자 화면에 알린다 (메뉴 숨기기는 편집 화면에서만)
    window.dispatchEvent(new CustomEvent("studio:editor", { detail: true }));
    return () => {
      window.removeEventListener("studio:rail-state", on);
      window.dispatchEvent(new CustomEvent("studio:editor", { detail: false }));
    };
  }, []);
  const [busy, setBusy] = useState<Record<string, string>>({});
  const [toast, setToast] = useState("");
  const [saved, setSaved] = useState("");
  const view = "detail" as const; // 클립 목록은 늘 상세 (텍스트 편집). 타임라인 편집(캡컷식)은 준비 중
  const [dialog, setDialog] = useState<"" | "export" | "formats" | "addText" | "help" | "find" | "saveAs" | "autoSub" | "silence">("");
  const [autoScope, setAutoScope] = useState<"empty" | "selected" | "all">("empty");
  const [photoHintHide, setPhotoHintHide] = useState(false); // 클립 목록 위 "사진 클립에 글 쓰기" 안내 줄 닫기
  const [autoSubHide, setAutoSubHide] = useState(false); // 클립 목록 위 "자동 자막" 안내 줄 닫기
  const [work, setWork] = useState<{ title: string; detail?: string; frac?: number | null } | null>(null);
  const [selLayer, setSelLayer] = useState("");
  const [pop, setPop] = useState<{ id: string; x: number; y: number } | null>(null); // 아이콘 옆 작은 메뉴
  const [visualClip, setVisualClip] = useState(""); // 오른쪽 화면 속성 칸의 클립
  const [subMode, setSubMode] = useState<"all" | "sel">("all"); // 메인자막 서식 적용 범위
  const [soundScope, setSoundScope] = useState<"one" | "sel" | "all">("one"); // 소리 칩 메뉴 적용 범위 — 처음엔 늘 [이 클립에만]
  const [soundPop, setSoundPop] = useState<{ id: string; x: number; y: number } | null>(null); // 소리 칩 옆 작은 창
  const [startClip, setStartClip] = useState(""); // 비디오 시작점 변경 창의 클립
  const [media, setMedia] = useState<{ kind: "clip" | "layer"; id: string; x: number; y: number } | null>(null); // 사진·영상 메뉴
  const [libOverlay, setLibOverlay] = useState(false); // 자료 칸을 "사진 올리기"로 열었는지
  const [overlayTarget, setOverlayTarget] = useState(""); // 사진을 바꿀 애셋
  const [musicTarget, setMusicTarget] = useState(""); // 음악을 바꿀 애셋
  const clipboard = useRef<Clip[]>([]);
  const player = useRef<PlayerHandle>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [big, setBig] = useState(false);
  const [win, setWin] = useState({ w: 1440, h: 900 });
  // 왼쪽 미리보기 칸 너비 — 경계선을 끌어 크게·작게 (이 PC에 기억)
  const [leftW, setLeftW] = useState(412);
  useEffect(() => {
    try {
      const v = Number(localStorage.getItem("studioVideo.leftW"));
      if (v >= 300) setLeftW(v);
    } catch {}
  }, []);
  useEffect(() => {
    const on = () => setWin({ w: window.innerWidth, h: window.innerHeight });
    on();
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);

  const setProject = (next: Project, history = true) => {
    if (history) {
      hist.current.past.push(JSON.stringify(pref.current));
      if (hist.current.past.length > 100) hist.current.past.shift();
      hist.current.future = [];
    }
    pref.current = next;
    setProjectState(next);
  };
  const change = useCallback((fn: (p: Project) => void, history = true) => {
    const prev = pref.current;
    const next = structuredClone(prev) as Project;
    fn(next);
    fixLayers(prev, next);
    setProject(next, history);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const undo = () => {
    const prev = hist.current.past.pop();
    if (!prev) return;
    hist.current.future.push(JSON.stringify(pref.current));
    const p = JSON.parse(prev);
    pref.current = p;
    setProjectState(p);
    force((x) => x + 1);
  };
  const redo = () => {
    const nx = hist.current.future.pop();
    if (!nx) return;
    hist.current.past.push(JSON.stringify(pref.current));
    const p = JSON.parse(nx);
    pref.current = p;
    setProjectState(p);
    force((x) => x + 1);
  };
  const say = (t: string) => {
    setToast(t);
    setTimeout(() => setToast((x) => (x === t ? "" : x)), 3500);
  };

  // 저장 — 워드처럼: .gss 파일은 [저장]할 때만 바뀐다. 자동 저장은 보이지 않는 작업 폴더에만 (갑자기 꺼져도 복구용)
  //  고친 뒤 저장 안 했으면 "● 저장 안 함", 닫을 때 [저장 / 다른 이름으로 저장 / 저장 안 함 / 취소] 를 묻는다
  const gssMode = Boolean(project.file);
  const [dirty, setDirty] = useState(false);
  const dirtyRef = useRef(false);
  dirtyRef.current = dirty;
  const firstSave = useRef(true);
  useEffect(() => {
    if (firstSave.current) {
      firstSave.current = false; // 처음 열 때는 고친 게 아니다
      return;
    }
    setDirty(true);
    const t = setTimeout(() => {
      b.project.save(project).catch((e) => setSaved(`저장 실패: ${errText(e)}`));
    }, 800);
    return () => clearTimeout(t);
  }, [project, b]);
  useEffect(() => {
    b.project.setDirty?.(dirty && gssMode, pref.current.dir, pref.current.file).catch(() => {});
  }, [dirty, gssMode, b]);
  // F5·주소 이동 — 앱이 [저장하고 나가기 / 저장 안 함 / 취소] 를 묻는다 (main.js will-prevent-unload)
  // 왼쪽 메뉴로 다른 화면 — 편집 화면의 묻는 창 (realty_admin selectMenu 가 __gsvGuard 를 부른다)
  useEffect(() => {
    if (!(dirty && gssMode)) return;
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", h);
    const w = window as unknown as { __gsvGuard?: (next: () => void) => void };
    w.__gsvGuard = (next) => guard(next);
    return () => {
      window.removeEventListener("beforeunload", h);
      delete w.__gsvGuard;
    };
  }, [dirty, gssMode]); // eslint-disable-line react-hooks/exhaustive-deps
  // 자동 저장본 (프리미어처럼) — 고친 게 있으면 5분마다 .gss 옆 "자동 저장\이름\" 에 사본 (원래 .gss 는 그대로, 최근 20개)
  const [lastBackup, setLastBackup] = useState("");
  useEffect(() => {
    if (!gssMode || !b.project.backup) return;
    const t = setInterval(() => {
      if (!dirtyRef.current) return;
      b.project.save(pref.current)
        .then(() => b.project.backup!(pref.current))
        .then(() => setLastBackup(new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })))
        .catch(() => {});
    }, 5 * 60 * 1000);
    return () => clearInterval(t);
  }, [gssMode, b]);
  useEffect(() => () => void b.project.setDirty?.(false).catch(() => {}), [b]);

  const flat = useMemo(() => flatten(project), [project]);
  const lanes = useMemo(() => computeLanes(project, flat.items), [project, flat]);
  const blank = flat.items.filter((x) => x.clip.type === "voice" && !x.clip.visual);
  const cur = flat.items.find((x) => time >= x.start && time < x.start + x.dur) || null;
  const curWord = cur ? (wordTimes(cur.clip, project.settings).find((w) => time - cur.start >= w.s && time - cur.start < w.e)?.i ?? -1) : -1;

  // 재생 중에는 지금 클립이 보이게 목록을 따라 내린다
  useEffect(() => {
    if (!playing || !cur) return;
    document.querySelector(`[data-clip="${cur.clip.id}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [playing, cur?.clip.id]); // eslint-disable-line react-hooks/exhaustive-deps

  /** 영상 위에 얹은 AI 목소리 — 영상 구간(fitLen)보다 짧으면 끝에 머물기(pad)로 맞추고, 길면 알린다 */
  const fitVoice = (c: Clip, dur: number, p: Project) => {
    if (!c.fitLen) return;
    const need = c.fitLen - (dur / speedOf(c, p.settings) + GAP);
    c.pad = need > 0.01 ? +need.toFixed(2) : undefined;
    if (need < -0.3) setTimeout(() => say(`글이 영상보다 ${(-need).toFixed(1)}초 길어요 — 글을 줄이거나 목소리를 조금 빠르게 해 주세요`), 0);
  };

  /* ── AI 목소리 만들기 (한 번에 3개씩) ── */
  const revoice = useCallback(async (ids: string[]) => {
    const list = ids.filter((id) => findClip(pref.current, id)?.clip.type === "voice");
    let k = 0;
    const one = async () => {
      while (k < list.length) {
        const id = list[k++];
        const f = findClip(pref.current, id);
        if (!f) continue;
        const text = clipText(f.clip).trim();
        if (!text) {
          change((p) => {
            const c = findClip(p, id)?.clip;
            if (!c) return;
            c.voice = null;
            // 원본 영상에 AI 목소리를 얹었던 클립(fitLen)에서 글을 다 지우면 — 원래 원본 영상 클립으로 (원본 소리 크기는 그대로 이어서)
            const a = c.visual ? p.assets[c.visual.asset] : null;
            if (c.fitLen && c.visual && a?.kind === "video") {
              const s0 = c.visual.s || 0;
              c.type = "source";
              c.src = { asset: c.visual.asset, s: s0, e: +Math.min(a.duration || s0 + c.fitLen, s0 + c.fitLen).toFixed(3) };
              if (c.visualVolume && Math.abs(c.visualVolume - 1) > 0.001) c.volume = c.visualVolume;
              if (!c.visualVolume && a.hasAudio !== false) c.muted = true;
              c.text = "";
              c.words = [];
              delete c.visual;
              delete c.visualVolume;
              delete c.fitLen;
              delete c.pad;
              delete c.voiceId;
              delete c.speed;
            }
          }, false);
          continue;
        }
        setBusy((x) => ({ ...x, [id]: "목소리 만드는 중…" }));
        const t0 = Date.now();
        try {
          const base = f.clip.voiceId || pref.current.settings.voice.id;
          // 단어마다 목소리가 다르면 (고른 단어만 목소리 바꾸기) — 같은 목소리끼리 조각으로 만들어 한 파일로 잇는다
          const ws = (f.clip.words || []).filter((w) => !w.del);
          const runs: { v: string; tokens: string[] }[] = [];
          for (const w of ws) {
            const v = w.v || base;
            const last = runs[runs.length - 1];
            if (last && last.v === v) last.tokens.push(w.w);
            else runs.push({ v, tokens: [w.w] });
          }
          if (runs.length > 1 && b.voiceJoin) {
            const parts = [];
            for (const r of runs) parts.push(await b.voice(pref.current.dir, r.tokens.join(" "), r.v));
            const j = await b.voiceJoin(pref.current.dir, parts.map((x) => x.file));
            // 단어 시각 — 조각 길이만큼 밀어서 잇고, 다른 목소리 표시는 그대로
            const words: Word[] = [];
            let off = 0;
            parts.forEach((x, k) => {
              for (const w of x.words) words.push({ w: w.w, s: +(w.s + off).toFixed(3), e: +(w.e + off).toFixed(3), ...(runs[k].v !== base ? { v: runs[k].v } : {}) });
              off += x.duration;
            });
            change((p) => {
              const c = findClip(p, id)?.clip;
              if (!c) return;
              c.voice = { file: j.file, url: j.url, duration: j.duration, id: base, text };
              c.words = words;
              c.text = text;
              fitVoice(c, j.duration, p);
            }, false);
          } else {
            const r = await b.voice(pref.current.dir, text, base);
            change((p) => {
              const c = findClip(p, id)?.clip;
              if (!c) return;
              c.voice = { file: r.file, url: r.url, duration: r.duration, id: r.id, text: r.text };
              c.words = r.words;
              c.text = text;
              fitVoice(c, r.duration, p);
            }, false);
          }
        } catch (e) {
          say(`목소리를 만들지 못했어요: ${errText(e)}`);
        }
        // 전에 만든 목소리(PC에 저장된 것)면 순식간에 끝나 돌아가는 표시가 안 보인다 — 0.8초는 보이게
        const left = 800 - (Date.now() - t0);
        if (left > 0) await new Promise((r) => setTimeout(r, left));
        setBusy((x) => {
          const y = { ...x };
          delete y[id];
          return y;
        });
      }
    };
    await Promise.all([one(), one(), one()]);
  }, [b, change]);

  // 처음 열었을 때 목소리 없는 글 클립이 있으면 만든다
  useEffect(() => {
    const need: string[] = [];
    for (const sc of pref.current.scenes) for (const c of sc.clips) if (c.type === "voice" && !c.voice && clipText(c).trim() && !c.del) need.push(c.id);
    if (need.length) revoice(need);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── 클립 편집 ── */
  const seekClip = (id: string, local = 0) => {
    const it = flatten(pref.current).items.find((x) => x.clip.id === id);
    if (it) player.current?.seek(it.start + local + 0.001);
  };
  const insertAfter = (clips: Clip[], afterId?: string) => {
    change((p) => {
      const f = afterId ? findClip(p, afterId) : null;
      if (f) f.scene.clips.splice(f.idx + 1, 0, ...clips);
      else {
        if (!p.scenes.length) p.scenes.push({ id: uid(), clips: [] });
        p.scenes[p.scenes.length - 1].clips.push(...clips);
      }
    });
  };
  const lastSelected = () => selected[selected.length - 1];

  const actions: ClipActions = {
    selectClip: (id, multi) => {
      setSelWord(null);
      if (multi) setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
      else {
        setSelected([id]);
        if (!player.current?.playing()) seekClip(id);
      }
    },
    selectMany: (ids, on) => {
      setSelWord(null);
      setSelected((s) => (on ? [...s, ...ids.filter((id) => !s.includes(id))] : s.filter((id) => !ids.includes(id))));
    },
    selectWord: (clipId, i, multi) => {
      setSelected([clipId]);
      // Ctrl+클릭 — 같은 클립 안에서 단어를 더 고르거나 빼기
      if (multi && selWord && selWord.clip === clipId) {
        const cur = selWordSet && selWordSet.clip === clipId ? selWordSet.is : [selWord.i];
        const is = cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i];
        if (!is.length) {
          setSelWord(null);
          setSelWordSet(null);
          return;
        }
        setSelWordSet({ clip: clipId, is });
        setSelWord({ clip: clipId, i: is.includes(i) ? i : is[is.length - 1] });
        return;
      }
      // 고른 단어를 한 번 더 누르면 — 고르기 풀기 (단추 막대 닫힘)
      if (!multi && selWord && selWord.clip === clipId && selWord.i === i && !(selWordSet && selWordSet.clip === clipId && selWordSet.is.length > 1)) {
        setSelWord(null);
        setSelWordSet(null);
        return;
      }
      setSelWordSet(null);
      setSelWord({ clip: clipId, i });
      const f = findClip(pref.current, clipId);
      if (!f) return;
      const w = wordTimes(f.clip, pref.current.settings).find((x) => x.i === i);
      seekClip(clipId, w ? w.s : 0);
    },
    toggleWord: (clipId, i) => {
      const f = findClip(pref.current, clipId);
      if (!f || !f.clip.words?.[i]) return;
      change((p) => {
        const c = findClip(p, clipId)!.clip;
        c.words![i].del = !c.words![i].del;
        if (c.type === "voice") {
          c.text = clipText(c);
          c.words = c.words!.filter((w) => !w.del);
          c.voice = null;
        }
      });
      if (f.clip.type === "voice") {
        setSelWord(null);
        revoice([clipId]);
      }
    },
    splitAt: (clipId, i) => {
      const f = findClip(pref.current, clipId);
      if (!f || !f.clip.words || i <= 0) return;
      const newId = uid();
      change((p) => {
        const g = findClip(p, clipId)!;
        const c = g.clip;
        const a = c.words!.slice(0, i);
        const bw = c.words!.slice(i);
        const second: Clip = structuredClone(c);
        second.id = newId;
        delete second.subText; // 따로 고친 자막은 앞 클립에만 — 뒤 클립은 말한 그대로 (둘 다 같은 자막이 되지 않게)
        if (c.type === "voice") {
          c.words = a;
          c.text = a.filter((w) => !w.del).map((w) => w.w).join(" ");
          c.voice = null;
          second.words = bw;
          second.text = bw.filter((w) => !w.del).map((w) => w.w).join(" ");
          second.voice = null;
        } else if (c.src) {
          const t = bw[0].s;
          c.words = a;
          c.text = a.map((w) => w.w).join(" ");
          second.words = bw;
          second.text = bw.map((w) => w.w).join(" ");
          second.src = { ...c.src, s: t };
          c.src = { ...c.src, e: t };
        }
        g.scene.clips.splice(g.idx + 1, 0, second);
        for (const l of p.layers || []) if (l.to === clipId) l.to = newId;
      });
      setSelWord(null);
      setSelected([clipId, newId]);
      if (f.clip.type === "voice") revoice([clipId, newId]);
      say("클립을 둘로 나눴어요");
    },
    editText: (clipId, text) => {
      const f = findClip(pref.current, clipId);
      if (!f) return;
      // 촬영한 영상(원본 소리)은 말한 내용을 고치지 않는다 — 원본이라서. 자막은 [자막 고치기](editSub)로
      if (f.clip.type !== "voice") return actions.editSub(clipId, text);
      const t = text.replace(/\s+/g, " ").trim();
      change((p) => {
        const c = findClip(p, clipId)!.clip;
        c.text = t;
        c.words = t.split(/\s+/).filter(Boolean).map((w) => ({ w, s: 0, e: 0 }));
        c.voice = null;
      });
      if (f.clip.type === "voice") revoice([clipId]);
    },
    removeClip: (ids) => {
      change((p) => {
        for (const sc of p.scenes) sc.clips = sc.clips.filter((c) => !ids.includes(c.id));
        p.scenes = p.scenes.filter((sc, i) => sc.clips.length || i === 0);
      });
      setSelected([]);
      setSelWord(null);
      say(ids.length > 1 ? `클립 ${ids.length}개를 지웠어요 (되돌리기로 살릴 수 있어요)` : "클립을 지웠어요 (되돌리기로 살릴 수 있어요)");
    },
    mergeUp: (id) => {
      const f = findClip(pref.current, id);
      if (!f) return;
      let prevId = "";
      if (f.idx > 0) prevId = f.scene.clips[f.idx - 1].id;
      else {
        const si = pref.current.scenes.indexOf(f.scene);
        const ps = pref.current.scenes[si - 1];
        if (ps && ps.clips.length) prevId = ps.clips[ps.clips.length - 1].id;
      }
      if (!prevId) return;
      mergeClips([prevId, id]);
    },
    openSound: (id, x, y) => {
      if (!(selected.length > 1 && selected.includes(id))) setSelected([id]);
      const c = findClip(pref.current, id)?.clip;
      setSoundScope("one");
      setPanel(c && c.type !== "voice" ? "source" : "voice");
      setSoundPop({ id, x, y });
    },
    openVoice: (id) => {
      const c = findClip(pref.current, id)?.clip;
      // 촬영 클립 [원본 소리] → 원본 소리 설정 (고른 클립 중 하나면 고른 클립 모두)
      if (c && c.type !== "voice") {
        if (!(selected.length > 1 && selected.includes(id))) setSelected([id]);
        setPanel("source");
        return;
      }
      setSelected([id]);
      setPanel("voice");
    },
    openVisual: (id) => {
      setSelected([id]);
      openLib("mine");
    },
    // 상세 편집 — 촬영 영상 단어의 시작·끝 (앞뒤 단어와 클립 앞뒤 경계도 따라간다)
    setWordTime: (clipId, i, s, e) => {
      change((p) => {
        const c = findClip(p, clipId)?.clip;
        const w = c?.words?.[i];
        if (!c || !w || !c.src) return;
        if (!w.o) w.o = [w.s, w.e];
        w.s = s;
        w.e = e;
        const prev = c.words![i - 1], next = c.words![i + 1];
        if (prev && prev.e > s) prev.e = s;
        if (next && next.s < e) next.s = e;
        if (i === 0 && s < c.src.s) c.src.s = s;
        if (i === c.words!.length - 1 && e > c.src.e) c.src.e = e;
      });
    },
    resetWordTime: (clipId, i) => {
      change((p) => {
        const w = findClip(p, clipId)?.clip.words?.[i];
        if (!w?.o) return;
        [w.s, w.e] = w.o;
        delete w.o;
      });
      say("처음 받아쓴 자리로 되돌렸어요");
    },
    playWord: (clipId, i) => {
      const f = findClip(pref.current, clipId);
      if (!f) return;
      const t = wordTimes(f.clip, pref.current.settings).find((x) => x.i === i);
      if (!t) return;
      seekClip(clipId, t.s);
      keepWordOnPlay.current = true;
      setTimeout(() => player.current?.play(), 30);
      const ms = ((t.e - t.s) * 1000) / Math.max(0.1, rate || 1);
      setTimeout(() => player.current?.pause(), 30 + ms);
    },
    openLayer: (id) => {
      setSelLayer(id);
      setPanel("layer");
      // 미리보기도 그 자리로 — 단어 구간이면 그 단어 시작, 아니면 시작 클립 처음 (넣은 사진·글자가 바로 보이게)
      const l = (pref.current.layers || []).find((x) => x.id === id);
      const f = l ? findClip(pref.current, l.from) : null;
      if (!l || !f) return;
      player.current?.pause();
      const t = typeof l.w0 === "number" ? wordTimes(f.clip, pref.current.settings).find((x) => x.i === l.w0) : null;
      seekClip(l.from, t ? t.s + 0.02 : 0.02);
    },
    openTiming: (id, x, y) => {
      if (!(selected.length > 1 && selected.includes(id))) setSelected([id]);
      // 오른쪽 '속도·길이' 칸은 없앴다 — 목소리 칩과 같은 메뉴 (볼륨·빠르기·길이)를 시간 자리에
      const r = document.querySelector(`[data-clip="${id}"] [data-cliptime]`)?.getBoundingClientRect();
      setSoundScope("one");
      setSoundPop({ id, x: x ?? (r ? r.left - 200 : 400), y: y ?? (r ? r.bottom + 6 : 300) });
    },
    openMedia: (id, x, y) => {
      setSelected([id]);
      setMedia({ kind: "clip", id, x, y });
      setVisualClip(id);
      setPanel("visual");
    },
    setSource: (id, patch, first) => change((p) => {
      const c = findClip(p, id)?.clip;
      if (!c) return;
      if ("muted" in patch) c.muted = patch.muted || undefined;
      if ("volume" in patch) c.volume = patch.volume === undefined || Math.abs(patch.volume - 1) < 0.001 ? undefined : +patch.volume.toFixed(2);
    }, first),
    toggleMute: (id) => change((p) => {
      const c = findClip(p, id)?.clip;
      if (c) c.muted = !c.muted;
    }),
    // 클립 사이 [+ 새 클립] — 앞 클립 뒤(= 이 클립 앞)에 글 클립 넣기 창
    newClipBefore: (id) => {
      const it = flatten(pref.current).items;
      const k = it.findIndex((x) => x.clip.id === id);
      if (k > 0) setSelected([it[k - 1].clip.id]);
      setDialog("addText");
    },
    sceneBreak: (id) => {
      change((p) => {
        const f = findClip(p, id);
        if (!f || f.idx === 0) return;
        const moved = f.scene.clips.splice(f.idx);
        const si = p.scenes.indexOf(f.scene);
        p.scenes.splice(si + 1, 0, { id: uid(), clips: moved });
      });
      say("새 씬을 만들었어요");
    },
    play: (id) => {
      seekClip(id);
      setTimeout(() => player.current?.play(), 50);
    },
    stop: () => player.current?.pause(),
    // 단어 단추 막대 ✂ ⧉ 📋 — 고른 단어를 (Ctrl+X·C·V 와 같다). 단어를 안 골랐으면 클립을
    cutClip: (id) => {
      if (selWord?.clip === id) {
        copyWords();
        return deleteWords();
      }
      const c = findClip(pref.current, id)?.clip;
      if (!c) return;
      clipboard.current = [structuredClone(c)];
      lastCopy.current = "clips";
      actions.removeClip([id]);
    },
    copyClip: (id) => {
      if (selWord?.clip === id) return copyWords();
      const c = findClip(pref.current, id)?.clip;
      if (!c) return;
      clipboard.current = [structuredClone(c)];
      lastCopy.current = "clips";
      say("클립을 복사했어요");
    },
    pasteAfter: (id) => {
      // 마지막에 복사한 것 — 단어면 고른 단어 뒤에, 클립이면 이 클립 뒤에
      if (lastCopy.current === "words" && wordClip.current) return pasteWords();
      if (!clipboard.current.length) return say("먼저 복사하세요");
      insertAfter(clipboard.current.map((x) => ({ ...structuredClone(x), id: uid() })), id);
      say("붙여넣었어요");
    },
    canPaste: () => (lastCopy.current === "words" ? Boolean(wordClip.current) : clipboard.current.length > 0),
    insert: (kind) => {
      // 단어를 골랐으면 그 단어(Ctrl 로 여러 개면 첫 단어~끝 단어) 동안만
      const is = wordIs();
      wordPick.current = selWord && is.length ? { clip: selWord.clip, w0: is[0], w1: is[is.length - 1] } : null;
      if (kind === "title") return addTextLayer();
      // 이 클립(고른 클립) 화면 위에 사진·영상 올리기 — 자료 칸을 그 탭으로
      setOverlayTarget("");
      openLib(kind, true);
    },
    /**
     * 원본 영상 클립에 AI 목소리 넣기 — 영상은 화면으로, 원본 소리는 그대로 깔리고 ([원본 소리] 칩), 길이는 영상 구간에 맞춘다.
     * (말소리가 있던 클립도 같다. Ctrl+Z 로 원래대로)
     */
    addAiVoice: (clipId, text) => {
      const t = text.replace(/\s+/g, " ").trim();
      if (!t) return;
      change((p) => {
        const c = findClip(p, clipId)?.clip;
        if (!c?.src) return;
        const len = keepRanges(c).reduce((a, r) => a + (r.e - r.s), 0) / srcSpeed(c);
        const a = p.assets[c.src.asset];
        const orig = c.muted ? 0 : c.volume ?? 1;
        c.type = "voice";
        c.visual = { asset: c.src.asset, s: c.src.s };
        c.visualVolume = a?.hasAudio === false || orig <= 0 ? undefined : orig;
        c.fitLen = +len.toFixed(2);
        c.text = t;
        c.words = t.split(" ").map((w) => ({ w, s: 0, e: 0 }));
        c.voice = null;
        delete c.src;
        delete c.cuts;
        delete c.speed;
        delete c.volume;
        delete c.muted;
        delete c.subText;
      });
      setSelected([clipId]);
      revoice([clipId]);
      say("AI 목소리를 넣었어요 · 원본 소리는 [원본 소리] 칩에서 조절해요");
    },
    setOrigVolume: (clipId, v, muted, first) => change((p) => {
      const c = findClip(p, clipId)?.clip;
      if (c) c.visualVolume = muted || v <= 0 ? undefined : +v.toFixed(2);
    }, first),
    // 문장 끝 [..] — AI 목소리를 다 읽고 쉬는 시간 (빠르기를 바꿔도 그대로)
    setPad: (ids, sec) => {
      change((p) => {
        for (const id of ids) {
          const c = findClip(p, id)?.clip;
          if (c) c.pad = sec > 0 ? sec : undefined;
        }
      });
      const who = ids.length > 1 ? `클립 ${ids.length}개 모두 ` : "";
      say(sec > 0 ? `${who}다 읽고 ${sec}초 쉬어요` : `${who}쉬지 않고 바로 다음 클립으로 가요`);
    },
    openTrans: (id, add) => {
      if (add) change((p) => { const c = findClip(p, id)?.clip; if (c && !c.trans) c.trans = { ...TRANS_DEFAULT }; });
      setTransClip(id);
      setPanel("trans");
    },
    addCut: (id, g) => {
      change((p) => {
        const c = findClip(p, id)?.clip;
        if (!c?.src) return;
        c.cuts = [...(c.cuts || []), g].sort((x, y) => x.s - y.s);
      });
      say(`쉼 ${(g.e - g.s).toFixed(1)}초를 줄였어요 (다시 누르면 원래대로)`);
    },
    restoreCut: (id, i) => {
      change((p) => {
        const c = findClip(p, id)?.clip;
        if (!c?.cuts) return;
        if (i === "all") delete c.cuts;
        else {
          c.cuts = c.cuts.filter((_, k) => k !== i);
          if (!c.cuts.length) delete c.cuts;
        }
      });
      say(i === "all" ? "줄인 무음을 원래대로 돌렸어요" : "무음 한 곳을 원래대로 돌렸어요");
    },
    editSub: (id, text) => {
      change((p) => {
        const c = findClip(p, id)?.clip;
        if (!c) return;
        // 줄 안의 띄어쓰기만 정리하고, 직접 넣은 줄바꿈(엔터)은 남긴다
        const t = text === null ? null : text.split(/\r?\n/).map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean).join("\n");
        if (t === null || (c.type !== "silence" && t === clipText(c)) || (c.type === "silence" && !t)) delete c.subText;
        else c.subText = t;
      });
      say(text === null ? "말한 그대로 자막을 보여 줘요" : "자막을 바꿨어요 (목소리는 그대로예요)");
    },
  };

  /** 클립 합치기 — 같은 영상의 이어진 구간이거나 글 클립끼리 */
  const mergeClips = (ids: string[]) => {
    const p0 = pref.current;
    const order = flatten(p0).items.map((x) => x.clip.id).filter((x) => ids.includes(x));
    if (order.length < 2) return say("합칠 클립을 두 개 이상 골라 주세요 (카드 왼쪽 네모 칸)");
    const clips = order.map((id) => findClip(p0, id)!.clip);
    const allVoice = clips.every((c) => c.type === "voice");
    const allSrc = clips.every((c) => c.type !== "voice" && c.src && c.src.asset === clips[0].src!.asset);
    if (!allVoice && !allSrc) return say("글 클립끼리, 또는 같은 영상의 클립끼리만 합칠 수 있어요");
    if (allSrc) {
      for (let i = 1; i < clips.length; i++) if (Math.abs(clips[i].src!.s - clips[i - 1].src!.e) > 0.3) return say("이어진 구간끼리만 합칠 수 있어요");
    }
    change((p) => {
      const first = findClip(p, order[0])!;
      const c = first.clip;
      const rest = order.slice(1).map((id) => findClip(p, id)!.clip);
      if (allVoice) {
        c.text = [clipText(c), ...rest.map(clipText)].filter(Boolean).join(" ");
        c.words = c.text.split(/\s+/).filter(Boolean).map((w) => ({ w, s: 0, e: 0 }));
        c.voice = null;
      } else {
        c.type = "source";
        c.words = [...(c.words || []), ...rest.flatMap((r) => r.words || [])];
        c.text = (c.words || []).map((w) => w.w).join(" ");
        c.src = { ...c.src!, e: rest[rest.length - 1].src!.e };
      }
      for (const sc of p.scenes) sc.clips = sc.clips.filter((x) => !order.slice(1).includes(x.id));
    });
    setSelected([order[0]]);
    if (allVoice) revoice([order[0]]);
    say("클립을 합쳤어요");
  };

  /* ── 자동 자막 — 녹화·촬영 영상 클립의 말소리를 글로 (지금 클립은 그대로, 글만 채움). 소리만 서버로, AI 비용 있음 ── */
  const autoSub = async (ids: string[]) => {
    if (!b.transcribeClips) return say("공실뉴스 스튜디오를 껐다 켜 주세요 (자동 자막 기능을 새로 연결해요)");
    const targets = ids
      .map((id) => findClip(pref.current, id)?.clip)
      .filter((c): c is Clip => Boolean(c && c.type === "source" && c.src))
      .map((c) => ({ id: c.id, asset: c.src!.asset, s: c.src!.s, e: c.src!.e }));
    setDialog("");
    if (!targets.length) return say("받아쓸 클립이 없어요 (녹화·촬영 영상 클립만 돼요)");
    setWork({ title: "말소리를 글로 바꾸는 중…" });
    const off = b.onProgress((t, f) => setWork({ title: t, frac: typeof f === "number" ? f : null }));
    try {
      const r = await b.transcribeClips(pref.current, targets);
      let n = 0;
      let made = 0;
      change((p) => {
        for (const x of r) {
          const g = x.words.length ? findClip(p, x.id) : null;
          if (!g || !g.clip.src) continue;
          const c = g.clip;
          n++;
          c.sub = true;
          delete c.subText;
          const sents = x.sents && x.sents.length ? x.sents : [{ text: x.text, s: c.src!.s, e: c.src!.e, words: x.words }];
          // 문장마다 클립 하나 (브루처럼) — 첫 문장은 원래 클립, 나머지는 새 클립. 구간은 빈틈없이 이어진다
          const { s: S, e: E } = c.src!;
          const cut = sents.map((st, i) => (i === 0 ? S : Math.max(sents[i - 1].e, st.s - 0.08)));
          const pieces = sents.map((st, i) => {
            const s = cut[i], e = i + 1 < sents.length ? cut[i + 1] : E;
            const piece: Clip = i === 0 ? c : { ...structuredClone(c), id: uid() };
            piece.src = { ...c.src!, s, e };
            piece.words = st.words.map((w) => ({ ...w, s: Math.max(s, w.s), e: Math.min(e, w.e) }));
            piece.text = st.text;
            return piece;
          });
          g.scene.clips.splice(g.idx + 1, 0, ...pieces.slice(1));
          const lastId = pieces[pieces.length - 1].id;
          if (lastId !== c.id) for (const l of p.layers || []) if (l.to === c.id) l.to = lastId;
          made += pieces.length;
        }
        if (n) p.settings.subtitle.on = true; // 자동 자막을 만들면 미리보기 아래에 바로 보이게
      });
      setSelected([]);
      setSelWord(null);
      say(n ? `자막을 만들었어요 — 문장마다 나눠 클립 ${made}개` : "말소리를 찾지 못했어요");
    } catch (e) {
      say(errText(e));
    } finally {
      off();
      setWork(null);
    }
  };

  /* ── 자막 시각 맞추기 — 글은 그대로, 단어 시각만 실제 말소리에 다시 맞춘다 (PC에서, 무료). 지운 단어는 그대로 ── */
  const realignSubs = async () => {
    if (!b.realign) return say("공실뉴스 스튜디오를 껐다 켜 주세요 (자막 시각 맞추기 기능을 새로 연결해요)");
    const items = flatten(pref.current).items
      .filter((x) => x.clip.type === "source" && x.clip.src && x.clip.words?.length)
      .map((x) => ({ id: x.clip.id, asset: x.clip.src!.asset, s: x.clip.src!.s, e: x.clip.src!.e, text: x.clip.words!.map((w) => w.w).join(" ") }));
    if (!items.length) return say("맞출 자막이 없어요 (먼저 자동 자막을 만들어 주세요)");
    setWork({ title: "자막 시각을 맞추는 중… (PC에서)" });
    const off = b.onProgress((t, f) => setWork({ title: t, frac: typeof f === "number" ? f : null }));
    try {
      const r = await b.realign(pref.current, items);
      let n = 0;
      change((p) => {
        for (const x of r) {
          const c = findClip(p, x.id)?.clip;
          if (!c?.words || x.words.length !== c.words.length) continue;
          c.words = x.words.map((w, i) => (c.words![i].del ? { ...w, del: true } : w));
          n++;
        }
      });
      say(n ? `자막 시각을 맞췄어요 (클립 ${n}개)` : "맞출 자막이 없어요");
    } catch (e) {
      say(errText(e));
    } finally {
      off();
      setWork(null);
    }
  };

  /* ── 무음 줄이기 — 클립 안의 쉬는 곳을 건너뛴다 (클립 수는 그대로, 길이만 줄어든다). PC에서 말소리 구간을 찾아서 (무료) ──
     잘린 곳은 clip.cuts 에 적고, 영상·소리·자막 단어 시각이 모두 keepRanges 로 같이 당겨진다 (자막이 흐트러지지 않게) */
  const [runs, setRuns] = useState<Record<string, { s: number; e: number }[]> | null>(null);
  const [silScope, setSilScope] = useState<"all" | "selected">("all");
  const [silMin, setSilMin] = useState(0.5);
  const SIL_PAD = 0.15; // 말 앞뒤로 남기는 여유
  const cutsFor = (c: Clip, min: number) => {
    const sp = c.src && runs ? runs[c.src.asset] : null;
    if (!c.src || !sp) return [];
    const { s: S, e: E } = c.src;
    const inner = sp.filter((r) => r.e > S && r.s < E).map((r) => ({ s: Math.max(S, r.s), e: Math.min(E, r.e) }));
    if (!inner.length) return []; // 말이 하나도 없는 클립은 통째로 건드리지 않는다
    const gaps = [{ s: S, e: inner[0].s }, ...inner.slice(1).map((r, i) => ({ s: inner[i].e, e: r.s })), { s: inner[inner.length - 1].e, e: E }];
    return gaps
      .filter((g) => g.e - g.s >= min)
      .map((g) => ({ s: +(g.s === S ? S : g.s + SIL_PAD).toFixed(3), e: +(g.e === E ? E : g.e - SIL_PAD).toFixed(3) }))
      .filter((g) => g.e - g.s > 0.05);
  };
  const openSilence = async () => {
    const assets = [...new Set(flatten(pref.current).items.filter((x) => x.clip.type === "source" && x.clip.src).map((x) => x.clip.src!.asset))];
    const hasOld = flatten(pref.current).items.some((x) => x.clip.type === "silence");
    if (!assets.length && !hasOld) return say("무음을 줄일 영상 클립이 없어요 (녹화·촬영 영상 클립만 돼요)");
    if (!b.speech) return say("공실뉴스 스튜디오를 껐다 켜 주세요 (무음 줄이기 기능을 새로 연결해요)");
    setWork({ title: "말소리 구간을 찾는 중… (PC에서)" });
    const off = b.onProgress((t, f) => setWork({ title: t, frac: typeof f === "number" ? f : null }));
    try {
      setRuns(await b.speech(pref.current, assets));
      setSilScope(selected.length ? "selected" : "all");
      setDialog("silence");
    } catch (e) {
      say(errText(e));
    } finally {
      off();
      setWork(null);
    }
  };
  // 무음 원래대로 — 모든 클립에서 줄인 무음을 되돌린다 (되돌리기로 다시 줄일 수도 있다)
  const restoreAllCuts = () => {
    let n = 0;
    change((p) => {
      for (const sc of p.scenes) for (const c of sc.clips) if (c.cuts?.length) { n += c.cuts.length; delete c.cuts; }
    });
    say(n ? `줄인 무음 ${n}곳을 모두 원래대로 돌렸어요` : "줄인 무음이 없어요");
  };
  /* ── 화면전환 모두 넣기·빼기 — 첫 클립 앞은 빼고 모든 클립 사이 ── */
  const allTrans = (t: { type: string; a: number; b: number } | null) => {
    const ids = flatten(pref.current).items.slice(1).map((x) => x.clip.id);
    if (!ids.length) return say("클립이 두 개 이상 있어야 화면전환을 넣을 수 있어요");
    change((p) => {
      for (const id of ids) {
        const c = findClip(p, id)?.clip;
        if (!c) continue;
        if (t) c.trans = { ...t };
        else delete c.trans;
      }
    });
    say(t ? `모든 클립 사이(${ids.length}곳)에 화면전환을 넣었어요` : "화면전환을 모두 뺐어요");
  };
  const removeSilence = (ids: string[], min: number) => {
    let n = 0;
    let sec = 0;
    let old = 0;
    change((p) => {
      for (const sc of p.scenes) {
        const before = sc.clips.length;
        sc.clips = sc.clips.filter((c) => !(c.type === "silence" && ids.includes(c.id))); // 예전 "말 없는 구간" 클립
        old += before - sc.clips.length;
        for (const c of sc.clips) {
          if (!ids.includes(c.id) || c.type !== "source") continue;
          const cuts = cutsFor(c, min);
          if (cuts.length) c.cuts = cuts;
          else delete c.cuts;
          n += cuts.length;
          sec += cuts.reduce((a, g) => a + (g.e - g.s), 0);
        }
      }
    });
    setDialog("");
    say(n || old ? `무음 ${n + old}곳을 줄였어요 (${sec.toFixed(1)}초 짧아졌어요)` : "줄일 무음이 없어요");
  };

  /* ── 애셋(음악·사진·화면 글자) ── */
  const openLib = (tabName: string, overlay = false) => {
    setLibOverlay(overlay);
    setLibTab(tabName);
    setPanel("library");
  };
  const selRange = () => {
    const ids = flatten(pref.current).items.map((x) => x.clip.id).filter((id) => selected.includes(id));
    return ids.length ? { from: ids[0], to: ids[ids.length - 1], n: ids.length } : null;
  };
  /** 붙일 범위 — 고른 클립들, 없으면 (all) 처음~끝 또는 지금 클립 */
  const rangeFor = (all: boolean) => {
    const items = flatten(pref.current).items;
    if (!items.length) return null;
    const r = selRange();
    if (r) return r;
    if (all) return { from: items[0].clip.id, to: items[items.length - 1].clip.id, n: items.length };
    const id = cur?.clip.id || items[0].clip.id;
    return { from: id, to: id, n: 1 };
  };
  // 단어를 고르고 [삽입]을 눌렀으면 — 다음에 넣는 사진·글자는 그 단어 구간에만 (브루처럼)
  const wordPick = useRef<{ clip: string; w0: number; w1: number } | null>(null);
  const addLayer = (l: Omit<Layer, "id" | "from" | "to">, all: boolean) => {
    const wp = wordPick.current;
    wordPick.current = null;
    if (wp && l.type !== "music" && findClip(pref.current, wp.clip)) {
      const id = uid();
      change((p) => {
        p.layers = [...(p.layers || []), { ...l, id, from: wp.clip, to: wp.clip, w0: wp.w0, w1: wp.w1 } as Layer];
      });
      setSelLayer(id);
      setPanel("layer");
      say(`${l.type === "image" ? "사진을" : "화면 글자를"} 고른 단어 동안만 넣었어요`);
      return;
    }
    const r = rangeFor(all);
    if (!r) return say("클립을 먼저 넣어 주세요");
    const id = uid();
    change((p) => {
      p.layers = [...(p.layers || []), { ...l, id, from: r.from, to: r.to } as Layer];
    });
    setSelLayer(id);
    setPanel("layer");
    say(`${l.type === "music" ? "음악을" : l.type === "image" ? "사진을" : "화면 글자를"} 클립 ${r.n}개에 넣었어요`);
  };
  const updateLayer = (id: string, patch: Partial<Layer>) => change((p) => {
    const l = (p.layers || []).find((x) => x.id === id);
    if (l) Object.assign(l, patch);
  });
  const removeLayer = (id: string) => {
    setPop(null);
    change((p) => {
      p.layers = (p.layers || []).filter((x) => x.id !== id);
    });
    setSelLayer("");
    setPanel("");
    say("지웠어요 (되돌리기로 살릴 수 있어요)");
  };
  const openLayer = (id: string) => {
    setSelLayer(id);
    setPanel("layer");
  };
  /** 막대 끌기 — 시작(아이콘)·끝(손잡이)을 위아래로 끌어 범위를 바꾼다. 거의 안 움직이면 설정 칸을 연다 */
  const dragLayer = (id: string, end: "from" | "to", e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const y0 = e.clientY;
    const r0 = (e.currentTarget as HTMLElement).getBoundingClientRect();
    let moved = false;
    let pushed = false;
    const move = (ev: PointerEvent) => {
      if (!moved && Math.abs(ev.clientY - y0) < 5) return;
      moved = true;
      // 목록 위·아래 끝에 가면 목록을 굴린다
      const box = listRef.current?.getBoundingClientRect();
      if (box && listRef.current) {
        if (ev.clientY > box.bottom - 40) listRef.current.scrollBy(0, 24);
        else if (ev.clientY < box.top + 40) listRef.current.scrollBy(0, -24);
      }
      const row = document.elementsFromPoint(ev.clientX, ev.clientY).map((el) => (el as HTMLElement).closest<HTMLElement>("[data-row]")).find(Boolean);
      const cid = row?.dataset.row;
      const l = (pref.current.layers || []).find((x) => x.id === id);
      if (!cid || !l || l[end] === cid) return;
      change((p) => {
        const L = (p.layers || []).find((x) => x.id === id);
        if (!L) return;
        L[end] = cid;
        const ord = clipOrder(p);
        if ((ord.get(L.from) ?? 0) > (ord.get(L.to) ?? 0)) [L.from, L.to] = [L.to, L.from];
      }, !pushed); // 한 번 끄는 동안은 되돌리기 한 번으로
      pushed = true;
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      if (!moved) {
        openLayer(id);
        // 브루처럼 아이콘 바로 옆에 — 사진은 사진·영상 메뉴, 음악·글자는 작은 메뉴
        if ((pref.current.layers || []).find((x) => x.id === id)?.type === "image") setMedia({ kind: "layer", id, x: r0.right + 8, y: r0.top - 4 });
        else setPop({ id, x: r0.right + 8, y: r0.top - 4 });
      }
      else {
        setSelLayer(id);
        setPanel("layer");
        say("범위를 바꿨어요");
      }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up, { once: true });
  };
  /* ── 사진·영상 메뉴 (채우기·반전·교체·적용 범위·순서·삭제) ── */
  const clipFit = (id: string, f: MediaFit) => change((p) => {
    const c = findClip(p, id)?.clip;
    if (c && f !== "free") {
      c.fill = f;
      delete c.box; // 채우기를 고르면 직접 크기는 풀린다
    }
  });
  const clipFlip = (id: string, axis: "x" | "y") => change((p) => {
    const c = findClip(p, id)?.clip;
    if (!c) return;
    if (axis === "x") c.flipX = !c.flipX || undefined;
    else c.flipY = !c.flipY || undefined;
  });
  /** 이 클립 화면을 a~b번 클립에 똑같이 (채우기·반전도) */
  const clipRange = (id: string, a: number, b: number) => {
    const ids = flat.items.slice(a - 1, b).map((x) => x.clip.id);
    change((p) => {
      const c0 = findClip(p, id)?.clip;
      if (!c0) return;
      const vis = c0.visual ? { ...c0.visual } : c0.src ? { asset: c0.src.asset, s: c0.src.s } : null;
      if (!vis) return;
      for (const cid of ids) {
        const c = findClip(p, cid)?.clip;
        if (!c || c === c0) continue;
        c.visual = c.src && c.src.asset === vis.asset ? null : { ...vis };
        c.fill = c0.fill;
        c.box = c0.box ? { ...c0.box } : undefined;
        c.flipX = c0.flipX;
        c.flipY = c0.flipY;
      }
    });
    setSelected(ids);
    say(`클립 ${a}~${b}번 화면을 똑같이 했어요`);
  };
  /** 영상 화면이면 시작점을 고를 수 있다 (촬영 원본 그대로인 클립은 빼고) */
  // 영상 화면 메뉴 — 원본 클립은 [시작·끝 자르기](프리미어·캡컷처럼 앞뒤), 교체한 화면은 [시작점 변경](길이는 원래 클립 그대로)
  //  · 원본 = 녹화·촬영 영상 클립(화면 = 그 영상) · 영상만 넣은 클립(글·목소리 없이 영상 길이만큼)
  const isVid = (id?: string) => Boolean(id && project.assets[id]?.kind === "video");
  const srcTrim = (c: Clip) => c.type === "source" && Boolean(c.src) && isVid(c.src?.asset) && (!c.visual || c.visual.asset === c.src!.asset);
  const holdTrim = (c: Clip) => c.type === "voice" && isVid(c.visual?.asset) && !c.voice && !clipText(c).trim();
  const canTrim = (c: Clip) => srcTrim(c) || holdTrim(c);
  const canStart = (c: Clip) => canTrim(c) || isVid(c.visual?.asset);
  /** 클립 소리 — 원본 소리가 있는 영상 클립 (촬영·불러온 영상) */
  /* ── 원본 소리 설정 (촬영 클립) — 고른 클립 / 모든 클립 ── */
  const isSrc = (c?: Clip | null) => Boolean(c && c.type !== "voice" && c.src);
  /**
   * 썸네일 메뉴의 볼륨 — 영상이 보이면 늘 있다.
   *  넣은 영상: 그 영상 소리만 (클립 볼륨과 곱해진다) · 녹화·촬영 영상 자체: 원본 소리 칩과 같은 값 · 소리 없는 영상: 흐리게
   */
  const soundOf = (c: Clip) => {
    const own = !c.visual && c.src ? project.assets[c.src.asset] : c.visual && c.src && c.src.asset === c.visual.asset ? project.assets[c.src.asset] : null;
    const a = own || (c.visual ? project.assets[c.visual.asset] : null);
    if (!a || a.kind !== "video") return undefined;
    const set = (fn: (x: Clip) => void, first = true) => change((p) => { const x = findClip(p, c.id)?.clip; if (x) fn(x); }, first);
    if (own) {
      return {
        none: a.hasAudio === false,
        note: "이 클립의 원본 소리예요 (위 [원본 소리] 칩과 같은 값)",
        muted: Boolean(c.muted),
        value: c.volume ?? 1,
        onMute: (v: boolean) => set((x) => { x.muted = v || undefined; }),
        onVolume: (v: number, first: boolean) => set((x) => { x.volume = Math.abs(v - 1) < 0.001 ? undefined : +v.toFixed(2); }, first),
      };
    }
    return {
      none: a.hasAudio === false,
      note: "화면에 넣은 영상의 소리예요 (위 [원본 소리] 칩과 같은 값, AI 목소리 크기와는 따로)",
      muted: !(c.visualVolume && c.visualVolume > 0),
      value: c.visualVolume && c.visualVolume > 0 ? c.visualVolume : 1,
      onMute: (v: boolean) => set((x) => { x.visualVolume = v ? undefined : x.visualVolume || 1; }),
      onVolume: (v: number, first: boolean) => set((x) => { x.visualVolume = v > 0 ? +v.toFixed(2) : undefined; }, first),
    };
  };
  /**
   * 클립 길이 (소리 칩 메뉴) — AI 목소리: 다 읽는 시간보다 짧게는 안 되고, 길면 끝에 쉼(pad). 빠르기는 그대로.
   * 촬영 영상: 시작점은 그대로 끝만 (빠르기 그대로), 원본 영상 끝까지만
   */
  const setClipLength = (id: string, T: number) => change((p) => {
    const c = findClip(p, id)?.clip;
    if (!c) return;
    if (c.type === "voice") {
      if (c.voice?.duration) {
        const nat = c.voice.duration / speedOf(c, p.settings) + GAP;
        const extra = Math.max(0, T - nat);
        c.pad = extra > 0.01 ? +extra.toFixed(2) : undefined;
      } else c.hold = +Math.max(0.5, T).toFixed(2);
      return;
    }
    if (c.src) {
      const sp = srcSpeed(c);
      const end = p.assets[c.src.asset]?.duration ?? c.src.e;
      c.src.e = +Math.min(end, Math.max(c.src.s + 0.3, c.src.s + T * sp)).toFixed(3);
    }
  });

  /* ── 메인자막 서식 — 전체 / 고른 클립만 ── */
  const subSel = subMode === "sel" && selected.length > 0;
  /** 서식 바꾸기 — 고른 클립만이면 그 클립들에 바꾼 항목만 따로 (값이 undefined 면 그 항목을 지운다) */
  const applySub = (patch: Partial<Project["settings"]["subtitle"]>, history = true) => change((p) => {
    if (!subSel) {
      p.settings.subtitle = { ...p.settings.subtitle, ...patch };
      return;
    }
    for (const id of selected) {
      const c = findClip(p, id)?.clip;
      if (!c) continue;
      const o: Record<string, unknown> = { ...(c.subStyle || {}) };
      for (const [k, v] of Object.entries(patch)) {
        if (v === undefined) delete o[k];
        else o[k] = v;
      }
      c.subStyle = Object.keys(o).length ? (o as Clip["subStyle"]) : undefined;
    }
  }, history);
  /** 지금 서식 (고른 클립만이면 처음 고른 클립 것) */
  const subNow = () => (subSel ? subStyleOf(project.settings, findClip(project, selected[0])?.clip) : project.settings.subtitle);
  const clipRemoveVisual = (id: string) => {
    change((p) => {
      const c = findClip(p, id)?.clip;
      if (c) c.visual = null;
    });
    say("화면을 지웠어요 (되돌리기로 살릴 수 있어요)");
  };
  /** 사진 올리기끼리 겹치는 순서 — 배열 뒤쪽이 위 */
  const layerOrder = (id: string, o: MediaOrder) => change((p) => {
    const all = p.layers || [];
    const imgs = all.filter((l) => l.type === "image");
    const i = imgs.findIndex((l) => l.id === id);
    if (i < 0) return;
    const [l] = imgs.splice(i, 1);
    const j = o === "top" ? imgs.length : o === "bottom" ? 0 : o === "up" ? Math.min(imgs.length, i + 1) : Math.max(0, i - 1);
    imgs.splice(j, 0, l);
    let k = 0;
    p.layers = all.map((x) => (x.type === "image" ? imgs[k++] : x));
  });
  const addTextLayer = () => addLayer({ type: "text", text: "글자를 써 주세요", pos: "top", size: 100, color: "#FFFFFF", font: "Pretendard", box: false }, false);
  const openMusic = (target = "") => {
    setMusicTarget(target);
    setPanel("music");
  };
  const onMusic = (m: { file: string; url: string; name: string }) => {
    if (musicTarget) {
      updateLayer(musicTarget, m);
      openLayer(musicTarget);
      say("음악을 바꿨어요");
    } else addLayer({ type: "music", ...m, volume: 0.15, fadeIn: 0, fadeOut: 2, offset: 0, loop: true }, true);
  };

  /* ── 자료 넣기 ── */
  const ensureAsset = async (item: LibItem): Promise<Asset> => {
    if (pref.current.assets[item.id] && !pref.current.assets[item.id].missing) return pref.current.assets[item.id];
    setWork({ title: "자료를 준비하는 중…", detail: item.name });
    const off = b.onProgress((t, f) => setWork({ title: t, detail: item.name, frac: typeof f === "number" ? f : null }));
    try {
      const a = await b.project.addAsset(item.id);
      change((p) => {
        p.assets[a.id] = a;
      }, false);
      return a;
    } finally {
      off();
      setWork(null);
    }
  };
  const onPick = async (item: LibItem, action: LibPickAction) => {
    const a = await ensureAsset(item);
    if (action === "overlay") {
      if (a.kind !== "image") return say("사진만 화면 위에 올릴 수 있어요");
      if (overlayTarget) {
        updateLayer(overlayTarget, { asset: a.id, name: a.name });
        openLayer(overlayTarget);
        say("사진을 바꿨어요");
      } else addLayer({ type: "image", asset: a.id, name: a.name, x: 0.8, y: 0.18, w: 0.3, opacity: 1 }, false);
      return;
    }
    if (action === "replace" && selected.length) {
      change((p) => {
        for (const id of selected) {
          const c = findClip(p, id)?.clip;
          if (!c) continue;
          c.visual = c.src && c.src.asset === a.id ? null : { asset: a.id, s: 0 };
        }
      });
      say(`화면을 바꿨어요 (클립 ${selected.length}개)${a.kind === "video" ? " · 영상 시작점은 썸네일을 눌러 고를 수 있어요" : ""}`);
      return;
    }
    await placeMedia(a, lastSelected(), false);
  };

  /** 자료를 클립으로 넣기 — 말소리 있는 영상은 받아써서 클립으로, 사진·소리 없는 영상은 화면 클립으로 (refId 앞/뒤, 없으면 끝) */
  const insertAt = (clips: Clip[], refId: string | undefined, before: boolean) => {
    if (!before) return insertAfter(clips, refId);
    change((p) => {
      const f = refId ? findClip(p, refId) : null;
      if (f) f.scene.clips.splice(f.idx, 0, ...clips);
      else p.scenes[p.scenes.length - 1].clips.push(...clips);
    });
  };
  const placeMedia = async (a: Asset, refId: string | undefined, before: boolean) => {
    if (a.kind === "video" && a.hasAudio) {
      // 영상 통째로 한 클립 (전체 구간) — 앞뒤는 화면 메뉴 [시작·끝 자르기], 문장 나누기는 [자동 자막 만들기]
      const clip: Clip = { id: uid(), type: "source", text: "", words: [], src: { asset: a.id, s: 0, e: a.duration } };
      insertAt([clip], refId, before);
      setSelected([clip.id]);
      say("영상을 넣었어요. 화면을 누르면 앞뒤를 자를 수 있어요");
      return;
    }
    const clip: Clip = { id: uid(), type: "voice", text: "", words: [], voice: null, visual: { asset: a.id, s: 0 }, hold: a.kind === "video" ? a.duration || 5 : 3 }; // 영상은 원본 길이 그대로 (앞뒤는 화면 메뉴 [시작·끝 자르기]로)
    insertAt([clip], refId, before);
    setSelected([clip.id]);
    say("화면 클립을 넣었어요. 글을 쓰면 AI 목소리로 읽어요");
  };

  /* ── 오른쪽 자료 칸에서 끌어 놓기 ── */
  const dropItem = async (raw: string): Promise<LibItem | null> => {
    try {
      const d = JSON.parse(raw) as { lib?: LibItem; stock?: StockItem };
      if (d.lib) return d.lib;
      if (d.stock) {
        setWork({ title: "무료 자료를 PC로 받는 중…" });
        try {
          return await b.stock.get(pref.current.dir, d.stock);
        } finally {
          setWork(null);
        }
      }
    } catch (e) {
      say(errText(e));
    }
    return null;
  };
  const onDropMedia = async (clipId: string, where: "before" | "after" | "replace", raw: string) => {
    const item = await dropItem(raw);
    if (!item) return;
    const a = await ensureAsset(item);
    if (where === "replace") {
      // 고른 클립 중 하나에 놓으면 고른 클립 전부
      const ids = selected.length > 1 && selected.includes(clipId) ? selected : [clipId];
      change((p) => {
        for (const id of ids) {
          const c = findClip(p, id)?.clip;
          if (c) c.visual = c.src && c.src.asset === a.id ? null : { asset: a.id, s: 0 };
        }
      });
      setSelected(ids);
      say((ids.length > 1 ? `고른 클립 ${ids.length}개 화면을 바꿨어요` : "이 클립 화면을 바꿨어요") + (a.kind === "video" ? " · 영상 시작점은 썸네일을 눌러 고를 수 있어요" : ""));
    } else await placeMedia(a, clipId, where === "before");
  };
  /** 왼쪽 애셋 줄에 놓으면 사진 올리기 — 그 클립부터 끝까지 (고른 클립 중 하나에 놓으면 고른 범위) */
  const onDropLayer = async (clipId: string, raw: string) => {
    const item = await dropItem(raw);
    if (!item) return;
    if (item.kind !== "image") return say("왼쪽 줄에는 사진만 올릴 수 있어요. 영상은 클립에 놓아 주세요");
    const a = await ensureAsset(item);
    const items = flatten(pref.current).items;
    const sel = selected.length > 1 && selected.includes(clipId) ? selRange() : null;
    const r = sel || (items.length ? { from: clipId, to: items[items.length - 1].clip.id, n: items.length - items.findIndex((x) => x.clip.id === clipId) } : null);
    if (!r) return;
    const id = uid();
    change((p) => {
      p.layers = [...(p.layers || []), { id, type: "image", asset: a.id, name: a.name, x: 0.8, y: 0.18, w: 0.3, opacity: 1, from: r.from, to: r.to } as Layer];
    });
    setSelLayer(id);
    setPanel("layer");
    say(`사진을 클립 ${r.n}개 위에 올렸어요`);
  };
  /** 미리보기에 놓으면 그 자리에 사진 올리기 */
  const onDropPreview = async (e: React.DragEvent<HTMLDivElement>) => {
    const raw = e.dataTransfer.getData(DRAG_MEDIA);
    if (!raw) return;
    e.preventDefault();
    const box = (e.currentTarget.firstElementChild as HTMLElement | null)?.getBoundingClientRect();
    const x = box ? Math.max(0, Math.min(1, (e.clientX - box.left) / box.width)) : 0.5;
    const y = box ? Math.max(0, Math.min(1, (e.clientY - box.top) / box.height)) : 0.5;
    const item = await dropItem(raw);
    if (!item) return;
    if (item.kind !== "image") return say("화면 위에는 사진만 올릴 수 있어요. 영상은 클립 목록에 놓아 주세요");
    const a = await ensureAsset(item);
    addLayer({ type: "image", asset: a.id, name: a.name, x: +x.toFixed(4), y: +y.toFixed(4), w: 0.3, opacity: 1 }, false);
  };

  /* ── 다른 이름으로 저장 ── */
  const [saveAsName, setSaveAsName] = useState("");
  const [saveAsDir, setSaveAsDir] = useState(""); // 저장할 폴더 (처음엔 지금 프로젝트가 있는 폴더)
  const pickSaveAsDir = async () => {
    if (!b.project.pickFolder) return say("앱을 새 버전으로 업데이트하면 쓸 수 있어요");
    const d = await b.project.pickFolder("새 프로젝트를 저장할 폴더", saveAsDir);
    if (d) setSaveAsDir(d);
  };
  /* ── .gss 파일 — 저장·위치·패키지·예전 폴더 바꾸기·원본 다시 연결 ── */
  const saveNow = async (): Promise<boolean> => {
    try {
      await b.project.save(pref.current);
      const r = await b.project.flush?.(pref.current);
      if (r?.savedAt) pref.current.savedAt = r.savedAt;
      setDirty(false);
      setSaved(new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }));
      say(pref.current.file ? `저장했어요 (${pref.current.name}.gss)` : "저장했어요");
      return true;
    } catch (e) {
      say(errText(e));
      return false;
    }
  };
  // 닫기 전에 — 저장 안 한 내용이 있으면 묻고, 고른 대로 한 뒤 next (처음 화면·새로 만들기·열기·앱 창 X)
  const [closeAsk, setCloseAsk] = useState(false);
  const pendingNext = useRef<(() => void) | null>(null);
  const guard = (next: () => void) => {
    if (!dirty || !gssMode) return next();
    pendingNext.current = next;
    setCloseAsk(true);
  };
  const runNext = () => {
    const n = pendingNext.current;
    pendingNext.current = null;
    setCloseAsk(false);
    n?.();
  };
  const askSave = async () => {
    if (await saveNow()) runNext();
  };
  const askDiscard = async () => {
    await b.project.discard?.(pref.current).catch(() => {});
    setDirty(false);
    runNext();
  };
  const askSaveAs = () => {
    setCloseAsk(false);
    setSaveAsName(`${pref.current.name}_사본`);
    setSaveAsDir((pref.current.file || pref.current.dir).replace(/[\\/][^\\/]+[\\/]?$/, ""));
    setDialog("saveAs");
  };
  useEffect(() => b.project.onWantClose?.(() => guard(() => void b.project.closeNow?.())), [b, dirty, gssMode]); // eslint-disable-line react-hooks/exhaustive-deps
  const goHome = () => guard(onHome);
  const goNew = () => guard(onNew);
  const goOpen = () => guard(onOpen);
  const openWhere = () => (pref.current.file ? b.showFile(pref.current.file) : b.openPath(pref.current.dir));
  const [pkg, setPkg] = useState<{ count: number; bytes: number; missing: string[] } | null>(null);
  const [backups, setBackups] = useState<{ file: string; at: string; size: number }[] | null>(null);
  const openBackups = async () => {
    try {
      setBackups((await b.project.backups?.(pref.current)) || []);
    } catch (e) {
      say(errText(e));
    }
  };
  // 자동 저장본 열기 — 지금 프로젝트를 닫고(저장 묻기) 그 사본을 연다
  const openBackup = (f: string) => {
    setBackups(null);
    guard(() => {
      b.project.open(f, "file").then((r) => onSwitch?.(r as Project)).catch((e) => say(errText(e)));
    });
  };
  const openPackage = async () => {
    if (!b.project.packageInfo) return say("공실뉴스 스튜디오를 껐다 켜 주세요 (프로젝트 패키지 기능을 새로 연결해요)");
    try {
      setPkg(await b.project.packageInfo(pref.current));
    } catch (e) {
      say(errText(e));
    }
  };
  const makePackage = async () => {
    setPkg(null);
    setWork({ title: "프로젝트 패키지를 만드는 중…" });
    const off = b.onProgress((t, f) => setWork({ title: t, frac: typeof f === "number" ? f : null }));
    try {
      const r = await b.project.makePackage!(pref.current);
      if (r) say(`패키지를 만들었어요 — 원본 ${r.count}개를 모았어요 (탐색기에서 열렸어요)`);
    } catch (e) {
      say(errText(e));
    } finally {
      off();
      setWork(null);
    }
  };
  const convertGss = async () => {
    if (!b.project.convert) return;
    setWork({ title: "프로젝트 파일(.gss)로 바꾸는 중…" });
    try {
      const np = await b.project.convert(pref.current);
      say(`${np.name}.gss 파일로 바꿨어요 (예전 폴더는 휴지통에 있어요)`);
      onSwitch?.(np);
    } catch (e) {
      say(errText(e));
    } finally {
      setWork(null);
    }
  };
  const missingAssets = Object.entries(project.assets || {}).filter(([, a]) => a.missing);
  const relinkAll = async () => {
    if (!b.project.relink) return;
    let n = 0;
    for (const [id] of missingAssets) {
      const r = await b.project.relink(pref.current, id).catch((e) => (say(errText(e)), null));
      if (!r) break; // 그만두면 멈춘다
      change((p) => { if (p.assets[id]) Object.assign(p.assets[id], r); });
      n++;
    }
    if (n) say(`원본 ${n}개를 다시 연결했어요`);
  };

  const doSaveAs = async () => {
    const name = saveAsName.trim();
    if (!name) return;
    if (!b.project.saveAs) return say("앱을 새 버전으로 업데이트하면 쓸 수 있어요");
    setDialog("");
    setWork({ title: "다른 이름으로 저장하는 중…", detail: name });
    try {
      const orig = pref.current;
      const np = await b.project.saveAs(orig, name, saveAsDir || undefined);
      await b.project.flush?.(np).catch(() => {}); // 새 파일은 저장된 상태로
      if (orig.file) await b.project.discard?.({ ...orig, savedAt: orig.savedAt ?? "x" }).catch(() => {});
      setWork(null);
      setDirty(false);
      if (pendingNext.current) runNext(); // 닫으려다 [다른 이름으로 저장]을 골랐으면 이어서 닫기
      else onSwitch?.(np);
    } catch (e) {
      setWork(null);
      say(errText(e));
    }
  };

  /* ── 글 클립 넣기 ── */

  /** 새 클립 넣기 — AI 목소리 글 / 빈 클립 / 사진 / 영상(앞뒤·소리) / 텍스트. 고른 클립 뒤에 (없으면 맨 끝) */
  const addNewClip = (sp: NewClipSpec) => {
    const after = lastSelected();
    const prev = after ? findClip(pref.current, after) : null;
    const words = (t: string) => t.split(/\s+/).filter(Boolean).map((w) => ({ w, s: 0, e: 0 }));
    setDialog("");
    if (sp.kind === "ai") {
      const clips: Clip[] = splitScript(sp.text).flat().map((t) => ({ id: uid(), type: "voice", text: t, words: words(t), voice: null, visual: prev?.clip.visual || null }));
      if (!clips.length) return;
      insertAfter(clips, after);
      setSelected([clips[clips.length - 1].id]);
      revoice(clips.map((c) => c.id));
      return say(`AI 목소리 클립 ${clips.length}개를 넣었어요`);
    }
    if (sp.kind === "empty") {
      const clip: Clip = { id: uid(), type: "voice", text: "", words: [], voice: null, visual: prev?.clip.visual || null, hold: sp.sec };
      insertAfter([clip], after);
      setSelected([clip.id]);
      return say("빈 클립을 넣었어요 · 연필을 눌러 글을 쓰면 AI 목소리로 읽어요");
    }
    if (sp.kind === "photo") {
      const clip: Clip = { id: uid(), type: "voice", text: "", words: [], voice: null, visual: { asset: sp.asset.id, s: 0 }, hold: sp.sec };
      insertAfter([clip], after);
      setSelected([clip.id]);
      return say("사진 클립을 넣었어요 · 글을 쓰면 AI 목소리로 읽어요");
    }
    if (sp.kind === "video") {
      const len = Math.max(0.3, sp.e - sp.s);
      let clip: Clip;
      if (sp.sound === "orig" && sp.asset.hasAudio) clip = { id: uid(), type: "source", text: "", words: [], src: { asset: sp.asset.id, s: sp.s, e: sp.e } };
      else if (sp.sound === "ai" && sp.text.trim()) {
        const t = sp.text.replace(/\s+/g, " ").trim();
        clip = { id: uid(), type: "voice", text: t, words: words(t), voice: null, visual: { asset: sp.asset.id, s: sp.s }, visualVolume: sp.asset.hasAudio && sp.vol > 0 ? sp.vol : undefined, fitLen: len };
      } else clip = { id: uid(), type: "voice", text: "", words: [], voice: null, visual: { asset: sp.asset.id, s: sp.s }, hold: len };
      insertAfter([clip], after);
      setSelected([clip.id]);
      if (clip.type === "voice" && clip.text) revoice([clip.id]);
      return say(sp.sound === "ai" ? "영상 위에 AI 목소리를 얹어 넣었어요" : `영상 ${len.toFixed(1)}초를 넣었어요`);
    }
    // 텍스트 화면 — 글 없는 클립 + 그 클립에만 큰 화면 글자
    const clip: Clip = { id: uid(), type: "voice", text: "", words: [], voice: null, visual: sp.bg === "prev" ? prev?.clip.visual || null : null, hold: sp.sec };
    const lid = uid();
    insertAfter([clip], after);
    change((p) => {
      p.layers = [...(p.layers || []), { id: lid, type: "text", from: clip.id, to: clip.id, text: sp.text.trim(), pos: "middle", size: 160, color: "#FFFFFF", font: "Pretendard", box: false } as Layer];
    });
    setSelected([clip.id]);
    setSelLayer(lid);
    setPanel("layer");
    say("텍스트 화면을 넣었어요 · 오른쪽에서 글자 모양을 바꿀 수 있어요");
  };

  /* ── 목소리 바꾸기 ── */
  const applyVoice = async (o: { id: string; speed: number; volume: number; scope: "all" | "selected" | "words" }) => {
    if (o.scope === "words") return voiceForWords(o);
    const ids: string[] = [];
    change((p) => {
      if (o.scope === "all") {
        const changed = p.settings.voice.id !== o.id;
        p.settings.voice = { id: o.id, speed: o.speed, volume: o.volume };
        for (const sc of p.scenes) for (const c of sc.clips) {
          if (c.type !== "voice") continue;
          delete c.speed;
          if (changed || c.voiceId) {
            delete c.voiceId;
            c.voice = null;
            ids.push(c.id);
          }
        }
      } else {
        for (const id of selected) {
          const c = findClip(p, id)?.clip;
          // 촬영한 영상(원본 소리) 클립은 목소리를 바꾸지 않는다 — 원본이라서 (사장님 원칙). AI 목소리 클립만
          if (!c || c.type !== "voice") continue;
          const was = c.voiceId || p.settings.voice.id;
          c.voiceId = o.id;
          c.speed = o.speed;
          if (was !== o.id) {
            c.voice = null;
            ids.push(c.id);
          }
        }
      }
    });
    setPanel("");
    if (ids.length) {
      say(`목소리를 새로 만들어요 (클립 ${ids.length}개)`);
      await revoice(ids);
    } else say("목소리 설정을 바꿨어요");
  };

  /** 고른 단어만 목소리 바꾸기 — 클립은 그대로 하나, 고른 단어에 목소리 표시만 하고 소리 안에서 조각을 잇는다 (되돌리기 한 번) */
  const voiceForWords = async (o: { id: string; speed: number }) => {
    if (!selWord) return;
    const f = findClip(pref.current, selWord.clip);
    if (!f || f.clip.type !== "voice" || !f.clip.words?.length) return say("AI 목소리 클립의 단어를 골라 주세요");
    if (!b.voiceJoin) return say("공실뉴스 스튜디오를 새 버전으로 다시 켜 주세요 (단어 목소리 잇기)");
    const is = wordIs();
    const id = f.clip.id;
    change((p) => {
      const c = findClip(p, id)?.clip;
      if (!c?.words) return;
      const base = c.voiceId || p.settings.voice.id;
      for (const i of is) if (c.words[i]) c.words[i].v = o.id === base ? undefined : o.id;
      c.voice = null;
    });
    setPanel("");
    say(`고른 단어 ${is.length}개만 새 목소리로 만들어요 (클립은 그대로)`);
    await revoice([id]);
  };

  /* ── 단어 복사·붙여넣기·지우기 (Ctrl+클릭으로 여러 단어) ── */
  const deleteWords = () => {
    if (!selWord) return;
    const is = wordIs();
    const f = findClip(pref.current, selWord.clip);
    if (!f?.clip.words) return;
    change((p) => {
      const c = findClip(p, selWord.clip)!.clip;
      // 모두 지운 단어면 되살리고, 아니면 모두 지운다
      const allDel = is.every((i) => c.words![i]?.del);
      for (const i of is) if (c.words![i]) c.words![i].del = !allDel;
      if (c.type === "voice") {
        c.text = clipText(c);
        c.words = c.words!.filter((w) => !w.del);
        c.voice = null;
      }
    });
    setSelWord(null);
    setSelWordSet(null);
    if (f.clip.type === "voice") revoice([f.clip.id]);
  };
  const copyWords = () => {
    if (!selWord) return;
    const c = findClip(pref.current, selWord.clip)?.clip;
    if (!c?.words) return;
    const is = wordIs().filter((i) => c.words![i]);
    if (!is.length) return;
    if (c.type === "voice" || !c.src) wordClip.current = { kind: "text", text: is.map((i) => c.words![i].w).join(" ") };
    else {
      // 이어진 단어끼리 한 구간 (떨어져 있으면 구간 여러 개)
      const runs: { s: number; e: number; words: Word[] }[] = [];
      let prev = -2;
      for (const i of is) {
        const w = { ...c.words[i], del: undefined };
        const last = runs[runs.length - 1];
        if (last && i === prev + 1) {
          last.e = w.e;
          last.words.push(w);
        } else runs.push({ s: w.s, e: w.e, words: [w] });
        prev = i;
      }
      wordClip.current = { kind: "src", asset: c.src.asset, runs };
    }
    lastCopy.current = "words";
    say(is.length > 1 ? `단어 ${is.length}개를 복사했어요 (단어를 고르고 Ctrl+V)` : "단어를 복사했어요 (단어를 고르고 Ctrl+V)");
  };
  /** 고른 단어 바로 뒤에 붙여넣기 — AI 목소리에 글자면 그 자리에 글을 넣고, 아니면 그 자리에서 클립을 나눠 사이에 새 클립 */
  const pasteWords = () => {
    const wc = wordClip.current;
    if (!wc) return;
    const target = selWord ? findClip(pref.current, selWord.clip) : null;
    const t = selWord ? Math.max(...wordIs()) : -1;
    if (wc.kind === "text" && target?.clip.type === "voice") {
      const ws = (target.clip.words || []).map((w) => w.w);
      ws.splice(t + 1, 0, ...wc.text.split(/\s+/).filter(Boolean));
      actions.editText(target.clip.id, ws.join(" "));
      say("글을 넣었어요 · 목소리를 새로 만들어요");
      return;
    }
    const made: Clip[] = wc.kind === "src"
      ? wc.runs.map((r) => ({ id: uid(), type: "source", text: r.words.map((w) => w.w).join(" "), words: r.words.map((w) => ({ ...w })), src: { asset: wc.asset, s: r.s, e: r.e } }) as Clip)
      : [{ id: uid(), type: "voice", text: wc.text, words: wc.text.split(/\s+/).filter(Boolean).map((w) => ({ w, s: 0, e: 0 })), voice: null, visual: target?.clip.visual || null } as Clip];
    let tail = "";
    change((p) => {
      const g = target ? findClip(p, target.clip.id) : null;
      if (!g) {
        if (!p.scenes.length) p.scenes.push({ id: uid(), clips: [] });
        p.scenes[p.scenes.length - 1].clips.push(...made);
        return;
      }
      const c = g.clip;
      // 고른 단어가 끝 단어가 아니면 그 뒤에서 나눈다 (splitAt 과 같은 방식)
      if (c.words && t >= 0 && t < c.words.length - 1) {
        const a = c.words.slice(0, t + 1), bw = c.words.slice(t + 1);
        const second: Clip = structuredClone(c);
        second.id = tail = uid();
        delete second.subText;
        if (c.type === "voice") {
          c.words = a;
          c.text = a.filter((w) => !w.del).map((w) => w.w).join(" ");
          c.voice = null;
          second.words = bw;
          second.text = bw.filter((w) => !w.del).map((w) => w.w).join(" ");
          second.voice = null;
        } else if (c.src) {
          const at = bw[0].s;
          c.words = a;
          c.text = a.map((w) => w.w).join(" ");
          second.words = bw;
          second.text = bw.map((w) => w.w).join(" ");
          second.src = { ...c.src, s: at };
          c.src = { ...c.src, e: at };
        }
        g.scene.clips.splice(g.idx + 1, 0, second);
        for (const l of p.layers || []) if (l.to === c.id) l.to = second.id;
      }
      g.scene.clips.splice(g.idx + 1, 0, ...made);
    });
    setSelWord(null);
    setSelWordSet(null);
    setSelected(made.map((x) => x.id));
    const re = [...made.filter((x) => x.type === "voice").map((x) => x.id), ...(tail && target?.clip.type === "voice" ? [target.clip.id, tail] : [])];
    if (re.length) revoice(re);
    say(made.length > 1 ? `구간 ${made.length}개를 붙여넣었어요` : "붙여넣었어요");
  };

  // 다른 곳을 누르면 고른 단어를 푼다 — 단어·단추 막대·오른쪽 설정 칸(목소리 바꾸기 등)·창은 빼고
  useEffect(() => {
    if (!selWord) return;
    const down = (e: PointerEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest?.("[data-keepword], aside, [data-gsv-modal]")) return;
      setSelWord(null);
      setSelWordSet(null);
    };
    document.addEventListener("pointerdown", down, true);
    return () => document.removeEventListener("pointerdown", down, true);
  }, [selWord]);
  // 재생을 시작하면(스페이스바·▶) 고른 단어를 푼다 — 단추 막대가 재생 화면을 가리지 않게
  useEffect(() => {
    if (!playing) return;
    if (keepWordOnPlay.current) {
      keepWordOnPlay.current = false;
      return;
    }
    setSelWord(null);
    setSelWordSet(null);
  }, [playing]);

  /* ── 키보드 ── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return; // 화면 위 글 고치기 칸 등에서 이미 처리한 키 (Esc 로 고치기만 취소)
      const tg = e.target as HTMLElement;
      // 글을 치는 칸에서만 무시 — 체크칸·막대·단추에 초점이 있어도 Del·스페이스바는 된다 (클립 체크 후 Del 이 안 먹던 문제)
      const typing = tg && (tg.tagName === "TEXTAREA" || tg.tagName === "SELECT" || tg.isContentEditable || (tg.tagName === "INPUT" && !/^(checkbox|radio|range|button|submit|color)$/i.test((tg as HTMLInputElement).type)));
      if (typing) return;
      // 체크칸·단추에서 스페이스바는 그 칸을 누르는 대신 재생·멈춤으로
      if (e.code === "Space" && tg && (tg.tagName === "INPUT" || tg.tagName === "BUTTON")) tg.blur();
      const ctrl = e.ctrlKey || e.metaKey;
      if (e.key === "Escape" && big) {
        setBig(false);
        return;
      }
      if (e.code === "Space") {
        e.preventDefault();
        player.current?.toggle();
      } else if (ctrl && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (ctrl && (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey))) {
        e.preventDefault();
        redo();
      } else if (e.key === "Delete") {
        if (selWord) deleteWords();
        else if (selected.length) actions.removeClip(selected);
        else if (panel === "layer" && selLayer) removeLayer(selLayer);
      } else if (ctrl && (e.key.toLowerCase() === "c" || e.key.toLowerCase() === "x") && selWord) {
        // 단어를 골랐으면 — 고른 단어만 복사 (Ctrl+X 는 복사하고 지우기)
        e.preventDefault();
        copyWords();
        if (e.key.toLowerCase() === "x") deleteWords();
      } else if (ctrl && e.key.toLowerCase() === "v" && lastCopy.current === "words" && wordClip.current) {
        e.preventDefault();
        pasteWords();
      } else if (ctrl && (e.key.toLowerCase() === "c" || e.key.toLowerCase() === "x") && selected.length) {
        // Ctrl+C 복사 · Ctrl+X 잘라내기 — 고른 클립 (리본 [복사하기][잘라내기]와 같다)
        e.preventDefault();
        clipboard.current = selected.map((id) => structuredClone(findClip(pref.current, id)!.clip)).filter(Boolean);
        lastCopy.current = "clips";
        if (e.key.toLowerCase() === "x") actions.removeClip(selected);
        else say(`클립 ${selected.length}개를 복사했어요 (Ctrl+V 로 붙여넣기)`);
      } else if (ctrl && e.key.toLowerCase() === "v" && clipboard.current.length) {
        // Ctrl+V 붙여넣기 — 고른 클립 뒤에 (없으면 맨 끝)
        e.preventDefault();
        insertAfter(clipboard.current.map((c) => ({ ...structuredClone(c), id: uid() })), lastSelected());
        say(clipboard.current.length > 1 ? `클립 ${clipboard.current.length}개를 붙여넣었어요` : "붙여넣었어요");
      } else if (ctrl && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveNow(); // .gss 파일로 바로 묶기
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  /* ── 리본 ── */
  const sel1 = selected.length === 1 ? findClip(project, selected[0]) : null;
  // 자동 자막 대상 — 녹화·촬영 영상 클립 중 글이 없는 것 / 고른 것
  const srcItems = flat.items.filter((x) => x.clip.type === "source" && x.clip.src);
  const noTextIds = srcItems.filter((x) => !clipText(x.clip)).map((x) => x.clip.id);
  // 사진·화면만 있고 글이 없는 클립 — 소리 없이 넘어간다 (사진·영상으로 편집하기로 시작하면 처음엔 전부 이렇다)
  const silentShots = flat.items.filter((x) => x.clip.type === "voice" && x.clip.visual && !clipText(x.clip).trim());
  const selSrcIds = srcItems.filter((x) => selected.includes(x.clip.id)).map((x) => x.clip.id);
  const hasCuts = flat.items.some((x) => x.clip.cuts?.length);
  const secOf = (ids: string[]) => srcItems.filter((x) => ids.includes(x.clip.id)).reduce((a, x) => a + (x.clip.src!.e - x.clip.src!.s), 0);
  const ribbon: Record<string, RibbonBtn[]> = {
    파일: [
      { icon: "plus", label: "새로 만들기", onClick: goNew },
      { icon: "open", label: "프로젝트 열기", onClick: goOpen },
      "|",
      { icon: "video", label: "영상 추가하기", onClick: () => { openLib("mine"); } },
      { icon: "ratio", label: "화면 비율", onClick: () => setPanel("ratio") },
      "|",
      { icon: "save", label: "프로젝트 저장하기", onClick: () => void saveNow(), title: "Ctrl+S · 프로젝트 파일(.gss) 하나로 저장해요" },
      { icon: "copy", label: "다른 이름으로 저장", onClick: () => { setSaveAsName(`${pref.current.name}_사본`); setSaveAsDir((pref.current.file || pref.current.dir).replace(/[\\/][^\\/]+[\\/]?$/, "")); setDialog("saveAs"); } },
      { icon: "folder", label: project.file ? "파일 위치 열기" : "프로젝트 폴더 열기", onClick: openWhere },
      { icon: "undo", label: "자동 저장본 보기", onClick: openBackups, disabled: !project.file || !b.project.backups, title: "5분마다 따로 저장해 둔 사본 — 골라서 열 수 있어요" },
      { icon: "layers", label: "프로젝트 패키지 만들기", onClick: openPackage, title: "원본 영상·사진·음악을 한 폴더에 모아요 — 그 폴더만 옮기면 다른 PC에서도 열려요" },
      "|",
      { icon: "export", label: "영상으로 내보내기", onClick: () => setDialog("export") },
      { icon: "file", label: "다른 형식으로 내보내기", onClick: () => setDialog("formats") },
    ],
    홈: [
      { icon: "save", label: "저장", onClick: () => void saveNow(), title: "Ctrl+S · 프로젝트 파일(.gss)에 저장해요" },
      "|",
      { icon: "plus", label: "새로 만들기", onClick: goNew },
      { icon: "open", label: "프로젝트 열기", onClick: goOpen },
      "|",
      { icon: playing ? "pause" : "play", label: playing ? "멈춤" : "재생", onClick: () => player.current?.toggle() },
      "|",
      { icon: "undo", label: "되돌리기", onClick: undo, disabled: !hist.current.past.length },
      { icon: "redo", label: "다시실행", onClick: redo, disabled: !hist.current.future.length },
      "|",
      { icon: "cut", label: "잘라내기", disabled: !selected.length, onClick: () => { clipboard.current = selected.map((id) => structuredClone(findClip(pref.current, id)!.clip)); actions.removeClip(selected); } },
      { icon: "copy", label: "복사하기", disabled: !selected.length, onClick: () => { clipboard.current = selected.map((id) => structuredClone(findClip(pref.current, id)!.clip)); say(`클립 ${selected.length}개를 복사했어요`); } },
      { icon: "paste", label: "붙여넣기", disabled: !clipboard.current.length, onClick: () => { insertAfter(clipboard.current.map((c) => ({ ...structuredClone(c), id: uid() })), lastSelected()); say("붙여넣었어요"); } },
      "|",
      { icon: "merge", label: "클립 합치기", onClick: () => mergeClips(selected), disabled: selected.length < 2, title: "왼쪽 네모 칸으로 두 개 이상 고르세요" },
      { icon: "split", label: "클립 나누기", onClick: () => (selWord ? actions.splitAt(selWord.clip, selWord.i) : say("나눌 자리의 단어를 먼저 누르세요")) },
      "|",
      { icon: "silence", label: "무음 줄이기", onClick: openSilence, title: "말 사이 쉬는 곳을 줄여요 (클립은 그대로, 길이만 짧아져요)" },
      { icon: "undo", label: "무음 원래대로", onClick: restoreAllCuts, disabled: !hasCuts, title: "줄인 무음을 모든 클립에서 원래대로 돌려요" },
    ],
    편집: [
      { icon: "undo", label: "되돌리기", onClick: undo, disabled: !hist.current.past.length },
      { icon: "redo", label: "다시실행", onClick: redo, disabled: !hist.current.future.length },
      "|",
      { icon: "check", label: "모든 클립 고르기", onClick: () => setSelected(flat.items.map((x) => x.clip.id)) },
      { icon: "close", label: "고르기 풀기", onClick: () => { setSelected([]); setSelWord(null); } },
      "|",
      { icon: "speed", label: "속도·길이", disabled: !lastSelected(), onClick: () => lastSelected() && actions.openTiming(lastSelected()), title: "고른 클립의 빠르기와 길이 (클립 시간을 눌러도 열려요)" },
      "|",
      { icon: "trash", label: selWord ? "단어 지우기/되살리기" : "단어 지우기", onClick: () => (selWord ? actions.toggleWord(selWord.clip, selWord.i) : say("지울 단어를 먼저 누르세요")) },
      { icon: "trash", label: "클립 지우기", onClick: () => actions.removeClip(selected), disabled: !selected.length },
      "|",
      { icon: "merge", label: "클립 합치기", onClick: () => mergeClips(selected), disabled: selected.length < 2 },
      { icon: "split", label: "클립 나누기", onClick: () => (selWord ? actions.splitAt(selWord.clip, selWord.i) : say("나눌 자리의 단어를 먼저 누르세요")) },
      { icon: "scene", label: "씬 나누기", onClick: () => sel1 && actions.sceneBreak(sel1.clip.id), disabled: !sel1 },
      "|",
      { icon: "silence", label: "무음 줄이기", onClick: openSilence, title: "말 사이 쉬는 곳을 줄여요 (클립은 그대로, 길이만 짧아져요)" },
      { icon: "undo", label: "무음 원래대로", onClick: restoreAllCuts, disabled: !hasCuts, title: "줄인 무음을 모든 클립에서 원래대로 돌려요" },
      "|",
      { icon: "merge", label: "화면전환 모두 넣기", onClick: () => allTrans({ ...TRANS_DEFAULT }), disabled: flat.items.length < 2, title: "모든 클립 사이에 디졸브 0.6초 (클립 사이 칩을 누르면 바꿀 수 있어요)" },
      { icon: "close", label: "화면전환 모두 빼기", onClick: () => allTrans(null), disabled: !flat.items.slice(1).some((x) => x.clip.trans) },
      "|",
      { icon: "search", label: "찾아서 편집하기", onClick: () => setDialog("find") },
    ],
    자막: [
      { icon: "mic", label: "자동 자막 만들기", onClick: () => { setAutoScope(noTextIds.length ? "empty" : selSrcIds.length ? "selected" : "all"); setDialog("autoSub"); }, title: "녹화·촬영 영상의 말소리를 글로 바꿔 자막을 만들어요 (지금 클립은 그대로)" },
      { icon: "speed", label: "자막 시각 맞추기", onClick: realignSubs, disabled: !srcItems.some((x) => x.clip.words?.length), title: "글은 그대로 두고 단어 시각만 실제 말소리에 다시 맞춰요 (PC에서, 무료)" },
      "|",
      { icon: "sub", label: project.settings.subtitle.on ? "자막 숨기기" : "자막 보이기", onClick: () => change((p) => { p.settings.subtitle.on = !p.settings.subtitle.on; }) },
      { icon: "font", label: "메인자막 서식", onClick: () => setPanel("subtitle") },
      "|",
      { icon: "copy", label: "전체 자막 복사하기", onClick: () => { navigator.clipboard.writeText(flat.items.map((x) => (typeof x.clip.subText === "string" ? x.clip.subText : clipText(x.clip))).filter(Boolean).join("\n")); say("전체 자막을 복사했어요"); } },
      { icon: "file", label: "자막 파일 내보내기", onClick: () => b.project.exportText(pref.current, "srt").then(() => say("자막 파일(.srt)을 저장했어요")) },
      "|",
      { icon: "undo", label: "고친 자막 모두 되돌리기", disabled: !flat.items.some((x) => x.clip.type !== "silence" && typeof x.clip.subText === "string"), title: "자막만 따로 고친 클립을 모두 말한 그대로 되돌려요",
        onClick: () => { change((p) => { for (const sc of p.scenes) for (const c of sc.clips) if (c.type !== "silence") delete c.subText; }); say("모든 자막을 말한 그대로 되돌렸어요"); } },
      { icon: "pen", label: "자막만 고치기", onClick: () => say("클립 아래 파란 자막 글자를 누르면 자막만 고칠 수 있어요 (목소리는 그대로)") },
      { icon: "font", label: "화면 글자 넣기", onClick: addTextLayer },
      "|",
      { icon: "sub", label: "고른 클립 자막 끄기/켜기", disabled: !selected.length, onClick: () => change((p) => { for (const id of selected) { const c = findClip(p, id)?.clip; if (c) c.sub = c.sub === false; } }) },
    ],
    서식: [
      { icon: "font", label: "메인자막 서식 열기", onClick: () => setPanel("subtitle") },
      "|",
      { icon: "zoom", label: "글자 크게", onClick: () => applySub({ size: Math.min(260, (subNow().size || 100) + 10) }) },
      { icon: "zoom", label: "글자 작게", onClick: () => applySub({ size: Math.max(40, (subNow().size || 100) - 10) }) },
      "|",
      { icon: "sub", label: "위치: 하단", onClick: () => applySub({ position: "bottom", x: undefined, y: undefined }) },
      { icon: "sub", label: "위치: 중단", onClick: () => applySub({ position: "middle", x: undefined, y: undefined }) },
      { icon: "sub", label: "위치: 상단", onClick: () => applySub({ position: "top", x: undefined, y: undefined }) },
      "|",
      { icon: "bg", label: subNow().bg ? "검은 상자 빼기" : "검은 상자 넣기", onClick: () => applySub({ bg: !subNow().bg }) },
    ],
    삽입: [
      { icon: "plus", label: "새 클립 넣기", onClick: () => setDialog("addText"), title: "AI 목소리 글 · 빈 클립 · 사진 · 영상 · 텍스트" },
      "|",
      { icon: "font", label: "화면 글자", onClick: addTextLayer, title: "고른 클립(없으면 지금 클립)에 글자를 올려요" },
      { icon: "image", label: "사진 올리기", onClick: () => { setOverlayTarget(""); openLib("mine", true); }, title: "고른 클립(없으면 지금 클립) 화면 위에 사진을 올려요" },
      { icon: "music", label: "배경 음악", onClick: () => openMusic(""), title: "고른 클립(없으면 영상 전체)에 음악을 깔아요" },
      "|",
      { icon: "image", label: "내 이미지·비디오", onClick: () => { openLib("mine"); } },
      { icon: "image", label: "공실 사진", onClick: () => { openLib("vacancy"); } },
      { icon: "search", label: "무료 이미지·비디오", onClick: () => { openLib("free"); } },
      { icon: "ai", label: "AI 이미지", onClick: () => { openLib("ai"); } },
    ],
    "AI 목소리": [
      { icon: "voice", label: "목소리 바꾸기", onClick: () => setPanel("voice") },
      { icon: "redo", label: "목소리 다시 만들기", disabled: !selected.length, onClick: () => revoice(selected) },
      "|",
      { icon: "plus", label: "새 클립 넣기", onClick: () => setDialog("addText") },
    ],
    효과: [
      { icon: "merge", label: "화면전환 모두 넣기", onClick: () => allTrans({ ...TRANS_DEFAULT }), disabled: flat.items.length < 2, title: "모든 클립 사이에 디졸브 0.6초 (클립 사이 칩을 누르면 바꿀 수 있어요)" },
      { icon: "close", label: "화면전환 모두 빼기", onClick: () => allTrans(null), disabled: !flat.items.slice(1).some((x) => x.clip.trans) },
      "|",
      { icon: "fill", label: "꽉 채우기", onClick: () => change((p) => { if (selected.length) for (const id of selected) { const c = findClip(p, id)?.clip; if (c) c.fill = "cover"; } else p.settings.fill = "cover"; }) },
      { icon: "fill", label: "맞추기", onClick: () => change((p) => { if (selected.length) for (const id of selected) { const c = findClip(p, id)?.clip; if (c) c.fill = "contain"; } else p.settings.fill = "contain"; }) },
      { icon: "fill", label: "흐린 배경", onClick: () => change((p) => { if (selected.length) for (const id of selected) { const c = findClip(p, id)?.clip; if (c) c.fill = "blur"; } else p.settings.fill = "blur"; }) },
      "|",
      { icon: "mute", label: "소리 끄기/켜기", disabled: !selected.length, onClick: () => change((p) => { for (const id of selected) { const c = findClip(p, id)?.clip; if (c) c.muted = !c.muted; } }) },
      { icon: "volume", label: "원본 소리 크게", onClick: () => change((p) => { p.settings.sourceVolume = Math.min(3, (p.settings.sourceVolume || 1) + 0.25); }) },
      { icon: "volume", label: "원본 소리 작게", onClick: () => change((p) => { p.settings.sourceVolume = Math.max(0, (p.settings.sourceVolume || 1) - 0.25); }) },
      "|",
      { icon: "speed", label: "글 클립 빠르기", onClick: () => setPanel("voice") },
    ],
    도움말: [
      { icon: "help", label: "쉬운 사용법", onClick: () => setDialog("help") },
      { icon: "key", label: "단축키", onClick: () => setDialog("help") },
      { icon: "folder", label: project.file ? "파일 위치 열기" : "저장 폴더 열기", onClick: openWhere },
    ],
  };

  /* ── 레이아웃 ── */
  const [W, H] = project.ratio === "9:16" ? [9, 16] : project.ratio === "4:5" ? [4, 5] : project.ratio === "1:1" ? [1, 1] : project.ratio === "4:3" ? [4, 3] : [16, 9];
  // 오른쪽 칸 — 다른 속성 창이 없으면 사진·영상 고르기(자료 칸)가 기본으로 떠 있다
  const side = panel || (libOpen ? "library" : "");
  const sideW0 = side ? 380 : 0;
  const leftMax = Math.max(300, win.w - sideW0 - 72 - 520); // 클립 목록은 520 은 남긴다
  const leftNow = Math.max(300, Math.min(leftMax, leftW));
  const previewW = Math.round(Math.min(leftNow - 32, ((win.h - 330) * W) / H));
  /** 경계선 끌기 — 두 번 누르면 처음 너비로 */
  const dragSplit = (e: React.PointerEvent) => {
    e.preventDefault();
    const x0 = e.clientX;
    const w0 = leftNow;
    let last = w0;
    const move = (ev: PointerEvent) => {
      last = Math.max(300, Math.min(leftMax, w0 + ev.clientX - x0));
      setLeftW(last);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      document.body.style.cursor = "";
      try {
        localStorage.setItem("studioVideo.leftW", String(Math.round(last)));
      } catch {}
    };
    document.body.style.cursor = "col-resize";
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up, { once: true });
  };
  // 크게 보기 — 미리보기만 화면 가운데에 크게 (클립 목록 위에 겹쳐서)
  // 오른쪽 설정 칸(속성값)은 가리지 않고 그 왼쪽 자리에 크게
  const sideW = side ? 380 : 0;
  const bigW = Math.round(Math.min(win.w - sideW - 160, ((win.h - 230) * W) / H, 1600));

  return (
    <div className="sv-dark" style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, background: C.bg, color: C.text, fontFamily: FONT, colorScheme: "dark" }}>
      {/* 다크 모드 스크롤바 — 진한 회색 (편집 화면 안과 그 위에 뜨는 창들) */}
      <style>{`
        .sv-dark ::-webkit-scrollbar, body:has(.sv-dark) ::-webkit-scrollbar { width: 10px; height: 10px; }
        .sv-dark ::-webkit-scrollbar-track, body:has(.sv-dark) ::-webkit-scrollbar-track { background: #1b1d22; }
        .sv-dark ::-webkit-scrollbar-thumb, body:has(.sv-dark) ::-webkit-scrollbar-thumb { background: #3a3e46; border-radius: 6px; border: 2px solid #1b1d22; }
        .sv-dark ::-webkit-scrollbar-thumb:hover, body:has(.sv-dark) ::-webkit-scrollbar-thumb:hover { background: #4b505a; }
        .sv-dark ::-webkit-scrollbar-thumb:active, body:has(.sv-dark) ::-webkit-scrollbar-thumb:active { background: ${C.accent}; }
        .sv-dark ::-webkit-scrollbar-corner, body:has(.sv-dark) ::-webkit-scrollbar-corner { background: #1b1d22; }
        .sv-dark ::-webkit-scrollbar-button, body:has(.sv-dark) ::-webkit-scrollbar-button { display: none; }
      `}</style>
      {/* 맨 위 탭 */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, height: 44, padding: "0 12px", background: C.panel, borderBottom: `1px solid ${C.line}` }}>
        {railHidden && (
          <button type="button" onClick={() => window.dispatchEvent(new CustomEvent("studio:rail", { detail: false }))} title="왼쪽 메뉴 보이기"
            style={{ width: 32, height: 32, border: `1px solid ${C.line2}`, borderRadius: 5, background: "transparent", color: C.text, fontSize: 17, fontWeight: 800, cursor: "pointer", marginRight: 4 }}>»</button>
        )}
        <button type="button" onClick={goHome} title="처음 화면" style={{ display: "flex", alignItems: "center", gap: 6, height: 32, padding: "0 10px", border: 0, borderRadius: 4, background: "transparent", color: C.sub, fontSize: 14, fontWeight: 700, fontFamily: FONT, cursor: "pointer" }}>
          <span style={{ transform: "rotate(180deg)", display: "inline-flex" }}><Icon name="chevron" size={16} /></span>처음 화면
        </button>
        <span style={{ width: 1, height: 20, background: C.line, margin: "0 6px" }} />
        {TABS.map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)}
            style={{ height: 44, padding: "0 12px", border: 0, borderBottom: `2px solid ${tab === t ? C.text : "transparent"}`, background: "transparent", color: tab === t ? C.text : C.sub, fontSize: 15, fontWeight: tab === t ? 800 : 600, fontFamily: FONT, cursor: "pointer" }}>
            {t}
          </button>
        ))}
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 13.5, color: C.dim, marginRight: 10, maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {project.name}{gssMode ? ".gss" : ""}
          {gssMode && dirty ? <span style={{ color: "#facc15", fontWeight: 700 }}> · ● 저장 안 함</span> : saved ? ` · 저장됨 ${saved}` : ""}
          {gssMode && lastBackup ? ` · 자동 저장본 ${lastBackup}` : ""}
        </span>
        {/* 저장 — 단색 아이콘 (Ctrl+S) */}
        <button type="button" onClick={() => void saveNow()} title="저장 (Ctrl+S)" aria-label="저장"
          style={{ width: 34, height: 32, marginRight: 8, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${C.line2}`, borderRadius: 5, background: "transparent", color: dirty && gssMode ? C.text : C.sub, cursor: "pointer" }}>
          <Icon name="save" size={18} />
        </button>
        <Btn primary small onClick={() => setDialog("export")}><Icon name="export" size={16} />내보내기</Btn>
      </div>
      {/* 리본 */}
      <div style={{ display: "flex", alignItems: "stretch", gap: 2, minHeight: 74, padding: "6px 10px", background: C.panel, borderBottom: `1px solid ${C.line}`, overflowX: "auto" }}>
        {ribbon[tab].map((btn, i) =>
          btn === "|" ? (
            <span key={i} style={{ width: 1, margin: "6px 6px", background: C.line, flexShrink: 0 }} />
          ) : (
            <button key={i} type="button" onClick={btn.onClick} disabled={btn.disabled || !btn.onClick} title={btn.title || btn.label}
              style={{ minWidth: 70, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, padding: "4px 6px", border: 0, borderRadius: 5, background: "transparent", color: C.text, opacity: btn.disabled || !btn.onClick ? 0.35 : 1, fontSize: 12.5, fontWeight: 600, fontFamily: FONT, cursor: btn.disabled ? "default" : "pointer", lineHeight: 1.25, textAlign: "center", flexShrink: 0 }}
              onMouseEnter={(e) => !btn.disabled && (e.currentTarget.style.background = C.card)} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
              <Icon name={btn.icon} size={22} />
              <span style={{ whiteSpace: "nowrap" }}>{btn.label}</span>
            </button>
          )
        )}
      </div>

      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {/* 왼쪽: 미리보기 */}
        <div style={{ width: leftNow, flexShrink: 0, display: "flex", flexDirection: "column", gap: 10, padding: 16, background: C.panel, overflowY: "auto" }}>
          {big && (
            <>
              <div onClick={() => setBig(false)} style={{ position: "fixed", top: 0, bottom: 0, left: 0, right: sideW, background: "rgba(0,0,0,0.65)", zIndex: 60 }} />
              <div style={{ height: Math.round((previewW * H) / W), display: "flex", alignItems: "center", justifyContent: "center", background: "#000", borderRadius: 4, color: C.sub, fontSize: 14 }}>크게 보는 중</div>
            </>
          )}
          <div style={big ? { position: "fixed", left: `calc((100vw - ${sideW}px) / 2)`, top: "50%", transform: "translate(-50%, -50%)", zIndex: 61, width: bigW + 32, padding: 16, boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 10, background: C.panel, border: `1px solid ${C.line2}`, borderRadius: 8, boxShadow: "0 20px 60px rgba(0,0,0,0.5)" } : { display: "flex", flexDirection: "column", gap: 10 }}>
          {big && (
            <div style={{ display: "flex", alignItems: "center" }}>
              <span style={{ flex: 1, fontSize: 16, fontWeight: 800 }}>크게 보기 <span style={{ fontSize: 13.5, color: C.sub, fontWeight: 600 }}>· 글자·사진을 끌어 옮길 수 있어요 · Esc 로 닫기</span></span>
              <button type="button" onClick={() => setBig(false)} title="작게 보기 (Esc)" style={{ border: 0, background: "transparent", color: C.sub, cursor: "pointer" }}><Icon name="close" size={22} /></button>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "center", background: "#000", borderRadius: 4 }}
            onDragOver={(e) => { if (e.dataTransfer.types.includes(DRAG_MEDIA)) { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; } }} onDrop={onDropPreview}>
            <Player ref={player} project={project} width={big ? bigW : previewW} onTime={setTime} onPlaying={setPlaying} previewRate={rate}
              selLayer={panel === "layer" ? selLayer : ""} onLayerPick={openLayer}
              onBoxPick={(kind, id) => {
                setSelLayer("");
                if (kind === "sub") setPanel("subtitle");
                else { setVisualClip(id); setPanel("visual"); }
              }}
              onVisualMove={(id, box, first) => change((p) => { const c = findClip(p, id)?.clip; if (c) c.box = box; }, first)}
              onSubMove={(patch, first) => applySub(patch, first)}
              onLayerMove={(id, patch, first) => change((p) => {
                const l = (p.layers || []).find((x) => x.id === id);
                if (l) Object.assign(l, patch);
              }, first)}
              onLayerText={(id, text) => { updateLayer(id, { text }); say("글자를 바꿨어요"); }}
              onSubText={(clipId, text) => actions.editSub(clipId, text)} />
          </div>
          <input type="range" min={0} max={Math.max(0.1, flat.total)} step={0.01} value={Math.min(time, flat.total)} onChange={(e) => player.current?.seek(Number(e.target.value))} style={{ width: "100%", accentColor: C.accent }} />
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button type="button" onClick={() => player.current?.toggle()} title="재생 (스페이스)" style={{ width: 48, height: 48, borderRadius: 24, border: 0, background: C.text, color: C.bg, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name={playing ? "pause" : "play"} size={22} stroke={2.2} />
            </button>
            <span style={{ fontSize: 16, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{fmtTime(time)} <span style={{ color: C.dim }}>/ {fmtTime(flat.total)}</span></span>
            <span style={{ flex: 1 }} />
            <select value={rate} onChange={(e) => setRate(Number(e.target.value))} title="미리보기만 빠르게·느리게 봐요 (만든 영상의 빠르기는 그대로)" style={{ height: 34, borderRadius: 5, border: `1px solid ${C.line2}`, background: C.card, color: C.text, fontSize: 14, fontFamily: FONT }}>
              {[0.75, 1, 1.25, 1.5, 2].map((r) => <option key={r} value={r}>미리보기 {r}배</option>)}
            </select>
            <button type="button" onClick={() => { if (!big && !panel && selLayer) setPanel("layer"); setBig(!big); }} title={big ? "작게 보기 (Esc)" : "미리보기를 크게 보기"}
              style={{ height: 34, padding: "0 10px", display: "flex", alignItems: "center", gap: 5, borderRadius: 5, border: `1px solid ${C.line2}`, background: C.card, color: C.text, fontSize: 13.5, fontWeight: 700, fontFamily: FONT, cursor: "pointer", whiteSpace: "nowrap" }}>
              <Icon name="zoom" size={16} />{big ? "작게" : "크게"}
            </button>
          </div>
          </div>
          {/* 지금 클립 정보 */}
          {cur && (
            <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 6, padding: 12 }}>
              <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 8 }}>클립 {cur.index + 1}</div>
              {(() => {
                const c = cur.clip;
                const vis = c.visual ? project.assets[c.visual.asset] : c.src ? project.assets[c.src.asset] : null;
                const off = project.settings.off || {};
                const setOff = (k: "visual" | "source" | "voice", v: boolean) => change((p) => { p.settings.off = { ...(p.settings.off || {}), [k]: v || undefined }; });
                const silent = c.muted || c.volume === 0;
                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 14, color: C.sub }}>
                    <TrackRow kind="eye" on={!off.visual} icon={vis?.kind === "image" ? "image" : "video"} name={vis ? vis.name : "화면 없음 (검은 화면)"} hint="화면 레이어 — 모든 클립"
                      onToggle={() => setOff("visual", !off.visual)} onOpen={() => (vis ? actions.openMedia(c.id, 420, 300) : actions.openVisual(c.id))} />
                    {c.type === "voice" ? (
                      <TrackRow kind="ear" on={!off.voice} icon="voice" name={c.voice ? `AI 목소리 ${(c.voice.duration || 0).toFixed(1)}초${silent ? " · 이 클립 무음" : ""}` : "목소리 없음"} danger={silent} hint="AI 목소리 레이어 — 모든 클립"
                        onToggle={() => setOff("voice", !off.voice)} onOpen={() => { setSelected([c.id]); setPanel("voice"); }} />
                    ) : (
                      <TrackRow kind="ear" on={!off.source} icon={silent ? "mute" : "mic"} name={silent ? "원본 소리 무음" : `원본 소리${c.volume && c.volume !== 1 ? ` ${Math.round(c.volume * 100)}%` : ""}`} danger={silent} hint="원본 소리 레이어 — 모든 클립"
                        onToggle={() => setOff("source", !off.source)} onOpen={() => { setSelected([c.id]); setPanel("source"); }} />
                    )}
                    <TrackRow kind="eye" on={project.settings.subtitle.on} icon="sub" name="메인자막" hint="메인자막 — 모든 클립"
                      onToggle={() => change((p) => { p.settings.subtitle.on = !p.settings.subtitle.on; })} onOpen={() => setPanel("subtitle")} />
                    {layersAt(project, c.id).map((l) => (
                      <TrackRow key={l.id} kind={l.type === "music" ? "ear" : "eye"} on={!l.off} icon={LAYER_ICON[l.type]} name={layerTitle(l)} active={l.id === selLayer} hint="이 애셋 전체"
                        onToggle={() => updateLayer(l.id, { off: !l.off || undefined })} onOpen={() => openLayer(l.id)} />
                    ))}
                  </div>
                );
              })()}
            </div>
          )}
          <Hint>단어를 누르면 그 자리로 가요. 단어에 마우스를 올려 오른쪽 위 ⓧ를 누르면 그 부분이 영상에서 잘려요.</Hint>
        </div>

        {/* 경계선 — 끌어서 미리보기 크게·작게 */}
        <div onPointerDown={dragSplit} onDoubleClick={() => { setLeftW(412); try { localStorage.removeItem("studioVideo.leftW"); } catch {} }}
          title="끌어서 미리보기 크게·작게 (두 번 누르면 처음 크기)"
          style={{ width: 7, flexShrink: 0, cursor: "col-resize", background: C.line, position: "relative", touchAction: "none" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = C.accent)} onMouseLeave={(e) => (e.currentTarget.style.background = C.line)}>
          <span style={{ position: "absolute", top: "50%", left: 1, width: 5, height: 36, marginTop: -18, borderRadius: 3, background: C.sub, opacity: 0.7, pointerEvents: "none" }} />
        </div>

        {/* 가운데: 클립 목록 */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 24px", borderBottom: `1px solid ${C.line}` }}>
            {flat.items.length > 0 && <AllBox ids={flat.items.map((x) => x.clip.id)} selected={selected} onChange={actions.selectMany} title="클립 모두 고르기 / 풀기" label="전체" />}
            <span style={{ fontSize: 14, color: C.sub }}>클립 {flat.items.length}개 · {fmtTime(flat.total, false)}{selected.length ? ` · ${selected.length}개 고름` : ""}</span>
            <span style={{ flex: 1 }} />
            {toast && <span style={{ fontSize: 14, color: C.text, background: C.card, border: `1px solid ${C.line2}`, padding: "5px 12px", borderRadius: 5 }}>{toast}</span>}
            <div style={{ display: "flex", border: `1px solid ${C.line2}`, borderRadius: 5, overflow: "hidden" }}>
              {([["text", "텍스트 편집"], ["timeline", "타임라인 편집"]] as const).map(([v, t]) => (
                <button key={v} type="button" title={v === "timeline" ? "캡컷처럼 시간 막대에서 편집해요 — 준비 중이에요" : "글(단어)을 보며 편집해요"}
                  onClick={() => (v === "timeline" ? say("타임라인 편집(캡컷식)은 준비 중이에요. 지금은 텍스트 편집으로 해 주세요") : undefined)}
                  style={{ height: 32, padding: "0 12px", border: 0, background: v === "text" ? C.card : "transparent", color: v === "text" ? C.text : C.sub, fontSize: 13.5, fontWeight: 700, fontFamily: FONT, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
                  {t}{v === "timeline" && <span style={{ fontSize: 11, fontWeight: 700, color: C.dim, border: `1px solid ${C.line2}`, borderRadius: 3, padding: "0 4px" }}>준비 중</span>}
                </button>
              ))}
            </div>
            {/* 사진·영상 고르기(오른쪽 자료 칸) 열기·닫기 */}
            <button type="button" onClick={() => { if (side === "library") { setPanel(""); setLibOpen(false); } else { setPanel(""); setLibOpen(true); } }} title={side === "library" ? "사진·영상 고르기 닫기" : "사진·영상 고르기 열기"}
              style={{ height: 34, padding: "0 12px", display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 5, border: `1px solid ${side === "library" ? C.accent : C.line2}`, background: side === "library" ? C.accentDim : "transparent", color: C.text, fontSize: 13.5, fontWeight: 700, fontFamily: FONT, cursor: "pointer", whiteSpace: "nowrap" }}>
              <Icon name="image" size={16} />사진·영상
            </button>
          </div>
          {!project.file && b.project.convert && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 24px", borderBottom: `1px solid ${C.line}`, background: C.panel, fontSize: 14.5 }}>
              <Icon name="file" size={18} />
              <span style={{ flex: 1 }}>예전 폴더 방식 프로젝트예요. 파일 하나(.gss)로 바꾸면 옮기고 관리하기 쉬워요. 예전 폴더는 휴지통으로 옮겨 둬요.</span>
              <Btn small primary onClick={convertGss}>.gss 파일로 바꾸기</Btn>
            </div>
          )}
          {missingAssets.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 24px", borderBottom: `1px solid ${C.line}`, background: "rgba(239,68,68,0.10)", fontSize: 14.5 }}>
              <Icon name="video" size={18} color={C.danger} />
              <span style={{ flex: 1 }}>원본 파일 {missingAssets.length}개를 찾지 못했어요: {missingAssets.slice(0, 3).map(([, a]) => a.name).join(", ")}{missingAssets.length > 3 ? " …" : ""}. 옮겼다면 다시 연결해 주세요.</span>
              {b.project.relink && <Btn small primary onClick={relinkAll}>찾아서 연결</Btn>}
            </div>
          )}
          {blank.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 24px", borderBottom: `1px solid ${C.line}`, background: C.panel, fontSize: 14.5 }}>
              <Icon name="image" size={18} />
              <span style={{ flex: 1 }}>화면이 비어 있는 클립이 {blank.length}개 있어요 (검은 화면으로 나와요). 사진이나 영상을 넣어 주세요.</span>
              <Btn small primary onClick={() => { setSelected(blank.map((x) => x.clip.id)); openLib("mine"); }}>빈 클립에 화면 넣기</Btn>
            </div>
          )}
          {!photoHintHide && silentShots.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 24px", borderBottom: `1px solid ${C.line}`, background: C.panel, fontSize: 14.5 }}>
              <Icon name="text" size={18} />
              <span style={{ flex: 1 }}>글이 없는 사진 클립이 {silentShots.length}개 있어요 (소리 없이 넘어가요). 클립에 글을 쓰면 AI 목소리로 읽어 줘요.</span>
              <Btn small primary onClick={() => setSelected([silentShots[0].clip.id])}>첫 클립 고르기</Btn>
              <button type="button" onClick={() => setPhotoHintHide(true)} title="닫기" style={{ border: 0, background: "transparent", color: C.sub, cursor: "pointer", display: "flex" }}><Icon name="close" size={18} /></button>
            </div>
          )}
          {/* 녹화·촬영 영상에 글이 하나도 없을 때만 — 자동 자막 안내 */}
          {!autoSubHide && noTextIds.length > 0 && noTextIds.length === srcItems.length && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 24px", borderBottom: `1px solid ${C.line}`, background: C.panel, fontSize: 14.5 }}>
              <Icon name="mic" size={18} />
              <span style={{ flex: 1 }}>말소리를 글로 바꿔 자막을 만들까요? 문장마다 클립이 나뉘어요. 앞뒤를 먼저 자르면 그만큼 빨라지고 비용도 줄어요.</span>
              <Btn small primary onClick={() => { setAutoScope("empty"); setDialog("autoSub"); }}>자동 자막 만들기</Btn>
              <button type="button" onClick={() => setAutoSubHide(true)} title="닫기" style={{ border: 0, background: "transparent", color: C.sub, cursor: "pointer", display: "flex" }}><Icon name="close" size={18} /></button>
            </div>
          )}
          <div ref={listRef} style={{ flex: 1, overflowY: "auto", minHeight: 0 }} onClick={(e) => { if (e.target === e.currentTarget) { setSelected([]); setSelWord(null); } }}>
            <ClipList project={project} items={flat.items} selected={selected} selWord={selWord} curClip={cur?.clip.id || ""} curWord={curWord} selWordIs={wordIs()} playing={playing} busy={busy} actions={actions} view={view} lanes={lanes} selLayer={panel === "layer" ? selLayer : ""} onLayerDrag={dragLayer} onDropMedia={onDropMedia} onDropLayer={onDropLayer} transClip={panel === "trans" ? transClip : ""} />
          </div>
        </div>

        {/* 오른쪽 칸 */}
        {side === "library" && <LibraryPanel key={panel ? `${libTab}${libOverlay}` : "default"} project={project} canReplace={selected.length > 0} onPick={onPick} initialTab={panel ? libTab : "mine"} overlay={panel ? libOverlay : false}
          onClose={() => {
            if (panel && libOverlay && overlayTarget && (project.layers || []).some((l) => l.id === overlayTarget)) return openLayer(overlayTarget);
            // 자료 칸 X = 닫기 ([개요·상세] 옆 [사진·영상]으로 다시 연다)
            setPanel("");
            setLibOpen(false);
          }} />}
        {panel === "voice" && <VoicePanel project={project} wordCount={selWord && findClip(project, selWord.clip)?.clip.type === "voice" ? wordIs().length : 0} targetCount={selected.filter((id) => { const c = findClip(project, id)?.clip; return c && (c.type === "voice" || c.src); }).length} onApply={applyVoice} onClose={() => setPanel("")} />}
        {panel === "subtitle" && (() => {
          // 이 클립 자막 — 고른 클립(하나)이 있으면 그것, 없으면 지금 재생 위치 클립
          const it = (selected.length === 1 && flat.items.find((x) => x.clip.id === selected[0])) || cur;
          const sc = it ? { id: it.clip.id, n: flat.items.indexOf(it) + 1, text: typeof it.clip.subText === "string" ? it.clip.subText : clipText(it.clip), custom: typeof it.clip.subText === "string" } : null;
          const own = flat.items.filter((x) => x.clip.subStyle && Object.keys(x.clip.subStyle).length).length;
          return <SubtitlePanel settings={project.settings} onChange={(patch) => applySub(patch)} onClose={() => setPanel("")}
            clip={sc} onSubText={(id, t) => actions.editSub(id, t)}
            range={{ mode: subSel ? "sel" : "all", selCount: selected.length, own, style: subNow(), onMode: setSubMode,
              onReset: () => { change((p) => { for (const id of selected) { const c = findClip(p, id)?.clip; if (c) delete c.subStyle; } }); say("고른 클립 자막을 전체 서식으로 되돌렸어요"); } }} />;
        })()}
        {panel === "ratio" && <RatioPanel ratio={project.ratio} fill={project.settings.fill} onRatio={(r: Ratio) => change((p) => { p.ratio = r; })} onFill={(f) => change((p) => { p.settings.fill = f; })} onClose={() => setPanel("")} />}
        {panel === "music" && (
          <MusicPanel project={project} current={(project.layers || []).find((l) => l.id === musicTarget) || null}
            rangeText={selected.length ? `고른 클립 ${selected.length}개` : "영상 처음부터 끝까지"} onPick={onMusic}
            onClose={() => (musicTarget && (project.layers || []).some((l) => l.id === musicTarget) ? openLayer(musicTarget) : setPanel(""))} />
        )}
        {panel === "source" && (() => {
          const sel = selected.filter((id) => isSrc(findClip(project, id)?.clip));
          const all = flat.items.map((x) => x.clip).filter(isSrc).map((c) => c.id);
          const c0 = findClip(project, sel[0] || all[0] || "")?.clip;
          if (!c0) return null;
          return (
            <SourcePanel selCount={sel.length} allCount={all.length} muted={Boolean(c0.muted)} value={c0.volume ?? 1} speed={srcSpeed(c0)}
              onApply={(o, scope) => {
                const ids = scope === "all" ? all : sel;
                change((p) => {
                  for (const id of ids) {
                    const c = findClip(p, id)?.clip;
                    if (!c) continue;
                    c.muted = o.muted || undefined;
                    c.volume = Math.abs(o.volume - 1) < 0.001 ? undefined : +o.volume.toFixed(2);
                    c.speed = Math.abs(o.speed - 1) < 0.001 ? undefined : +o.speed.toFixed(2);
                  }
                });
                say(`원본 소리를 바꿨어요 (클립 ${ids.length}개)`);
              }}
              onToVoice={() => { if (!sel.length) setSelected(all); setPanel("voice"); }} onClose={() => setPanel("")} />
          );
        })()}
        {panel === "trans" && (() => {
          const i = flat.items.findIndex((x) => x.clip.id === transClip);
          const it = flat.items[i];
          if (i <= 0 || !it?.clip.trans) return null;
          const prev = flat.items[i - 1];
          const tr = it.clip.trans;
          return (
            <TransPanel key={transClip} trans={tr} from={i} to={i + 1} maxA={prev.dur * 0.45} maxB={it.dur * 0.45}
              onChange={(patch, first) => change((p) => { const c = findClip(p, transClip)?.clip; if (c?.trans) c.trans = { ...c.trans, ...patch }; }, first)}
              onRemove={() => { change((p) => { const c = findClip(p, transClip)?.clip; if (c) delete c.trans; }); setPanel(""); say("화면전환을 뺐어요"); }}
              onAll={() => { allTrans({ ...tr }); }}
              onPreview={() => { player.current?.seek(Math.max(0, it.start - Math.min(tr.a, prev.dur * 0.45) - 0.8)); setTimeout(() => player.current?.play(), 50); }}
              onClose={() => setPanel("")} />
          );
        })()}
        {panel === "visual" && (() => {
          const i = flat.items.findIndex((x) => x.clip.id === visualClip);
          if (i < 0) return null;
          const c = flat.items[i].clip;
          const r = selected.length > 1 ? selRange() : null;
          const pos = (id: string) => flat.items.findIndex((x) => x.clip.id === id) + 1;
          return (
            <VisualPanel key={c.id} project={project} clip={c} n={i + 1} total={flat.items.length} cur={i + 1}
              many={r ? { a: pos(r.from), b: pos(r.to), n: r.n } : null}
              onFit={(f) => clipFit(c.id, f)} onFlip={(ax) => clipFlip(c.id, ax)} onReplace={() => actions.openVisual(c.id)}
              onStart={canStart(c) ? () => setStartClip(c.id) : undefined} sound={soundOf(c)}
              trim={srcTrim(c) ? { s: c.src!.s, e: c.src!.e } : holdTrim(c) ? { s: c.visual!.s, e: c.visual!.s + (Number(c.hold) || flat.items[i].dur) } : null}
              onRange={(a, b) => clipRange(c.id, a, b)} onRemove={() => clipRemoveVisual(c.id)} onClose={() => openLib("mine")} />
          );
        })()}
        {panel === "layer" && (() => {
          const l = (project.layers || []).find((x) => x.id === selLayer);
          if (!l) return null;
          return (
            <LayerPanel key={l.id} project={project} layer={l} items={flat.items} selRange={selRange()}
              onChange={(patch) => updateLayer(l.id, patch)} onRemove={() => removeLayer(l.id)}
              onReplace={() => (l.type === "music" ? openMusic(l.id) : l.type === "image" ? (setOverlayTarget(l.id), openLib("mine", true)) : undefined)}
              onClose={() => { setPanel(""); setSelLayer(""); }} />
          );
        })()}
      </div>

      {startClip && (() => {
        const it = flat.items.find((x) => x.clip.id === startClip);
        if (it && holdTrim(it.clip)) {
          // 영상만 넣은 클립 — 시작점(visual.s)과 길이(hold)를 자른다
          const v = it.clip.visual!;
          const hold = Number(it.clip.hold) || it.dur;
          return <VideoStart key={startClip} trim asset={project.assets[v.asset]} dur={it.dur} start={v.s} end={v.s + hold} onClose={() => setStartClip("")}
            onApply={(s, e) => {
              change((p) => {
                const c = findClip(p, startClip)?.clip;
                if (!c?.visual) return;
                c.visual = { ...c.visual, s };
                c.hold = +(e - s).toFixed(2);
              });
              say(`앞뒤를 잘랐어요 (${fmtTime(e - s, false)})`);
            }} />;
        }
        if (it && srcTrim(it.clip)) {
          const src = it.clip.src!;
          return <VideoStart key={startClip} trim asset={project.assets[src.asset]} dur={it.dur} start={src.s} end={src.e} onClose={() => setStartClip("")}
            onApply={(s, e) => {
              change((p) => {
                const c = findClip(p, startClip)?.clip;
                if (!c?.src) return;
                c.src = { ...c.src, s, e };
                // 잘라낸 곳의 단어는 빼고, 남은 단어 시각은 구간 안으로
                if (c.words?.length) {
                  c.words = c.words.filter((w) => (w.s + w.e) / 2 >= s && (w.s + w.e) / 2 <= e).map((w) => ({ ...w, s: Math.max(s, w.s), e: Math.min(e, w.e) }));
                  c.text = c.words.map((w) => w.w).join(" ");
                }
              });
              say(`앞뒤를 잘랐어요 (${fmtTime(e - s, false)})`);
            }} />;
        }
        const a = it?.clip.visual ? project.assets[it.clip.visual.asset] : null;
        if (!it || !a || a.kind !== "video") return null;
        return <VideoStart key={startClip} asset={a} dur={it.dur} start={it.clip.visual?.s || 0} onClose={() => setStartClip("")}
          onApply={(s) => { change((p) => { const c = findClip(p, startClip)?.clip; if (c?.visual) c.visual.s = s; }); say(s > 0 ? "시작점을 바꿨어요" : "처음부터 나가요"); }} />;
      })()}
      {soundPop && (() => {
        const c = findClip(project, soundPop.id)?.clip;
        if (!c) return null;
        const isVoice = c.type === "voice";
        // 모든 클립 = 같은 종류(AI 목소리 / 원본 소리) 클립 모두
        const same = flat.items.map((x) => x.clip).filter((x) => (isVoice ? x.type === "voice" : isSrc(x))).map((x) => x.id);
        // 적용 범위 — 이 클립에만(처음) / 선택 클립(고른 클립) / 모든 클립(같은 종류)
        const sel = selected.length > 1 && selected.includes(c.id) ? selected : [c.id];
        // 바꾸는 동안은 이 클립만 — 위 [이 클립에만][선택 클립][모든 클립]을 누르면 그 클립들에 넣고 닫는다
        const ids = [c.id];
        const applyScope = (sc: "one" | "sel" | "all") => {
          const targets = (sc === "all" ? same : sc === "sel" ? sel : []).filter((x) => x !== c.id);
          if (targets.length) {
            change((p) => {
              const src = findClip(p, c.id)?.clip;
              if (!src) return;
              for (const id of targets) {
                const x = findClip(p, id)?.clip;
                if (!x) continue;
                x.volume = src.volume;
                x.muted = src.muted;
                if (x.type === "voice" ? x.voice?.duration || src.speed : x.src) x.speed = src.speed;
              }
            });
            say(`볼륨·빠르기를 클립 ${targets.length + 1}개에 넣었어요`);
          }
          setSoundPop(null);
        };
        const each = (fn: (x: Clip) => void, first = true) => change((p) => { for (const id of ids) { const x = findClip(p, id)?.clip; if (x) fn(x); } }, first);
        const sp = isVoice ? speedOf(c, project.settings) : srcSpeed(c);
        return <SoundMenu title={isVoice ? `AI 목소리 · ${STUDIO_VOICES.find((v) => v.id === (c.voiceId || project.settings.voice.id))?.name || ""}` : "원본 소리"} x={soundPop.x} y={soundPop.y} count={ids.length} scope={soundScope} selCount={sel.length} allCount={same.length} onScope={applyScope}
          muted={Boolean(c.muted)} value={c.volume ?? 1} speed={sp}
          onMute={(v) => each((x) => { x.muted = v || undefined; })}
          onVolume={(v, first) => each((x) => { x.volume = Math.abs(v - 1) < 0.001 ? undefined : +v.toFixed(2); }, first)}
          onSpeed={(v) => each((x) => { if (x.type === "voice" ? x.voice?.duration : x.src) x.speed = x.type !== "voice" && Math.abs(v - 1) < 0.001 ? undefined : v; })}
          onVoice={isVoice ? () => setPanel("voice") : undefined} onClose={() => setSoundPop(null)}
          len={flat.items.find((x) => x.clip.id === c.id)?.dur}
          base={isVoice ? (c.voice?.duration ? c.voice.duration / speedOf(c, project.settings) + GAP : undefined) : c.src ? keepRanges(c).reduce((a, r) => a + (r.e - r.s), 0) / srcSpeed(c) : undefined}
          pad={isVoice ? Number(c.pad) || 0 : 0}
          onLength={(T) => setClipLength(c.id, T)}
          lenMin={isVoice ? (c.voice?.duration ? c.voice.duration / speedOf(c, project.settings) + GAP : 0.5) : 0.3}
          lenMax={isVoice ? undefined : c.src ? (project.assets[c.src.asset]?.duration ?? c.src.e) - c.src.s : undefined} />;
      })()}
      {media && (() => {
        const items = flat.items;
        const total = items.length;
        const pos = new Map(items.map((x, i) => [x.clip.id, i + 1]));
        const close = () => setMedia(null);
        if (media.kind === "clip") {
          const c = items.find((x) => x.clip.id === media.id)?.clip;
          if (!c) return null;
          const n = pos.get(c.id) || 1;
          const a = c.visual ? project.assets[c.visual.asset] : c.src ? project.assets[c.src.asset] : null;
          return <MediaMenu key={"c" + c.id} title={`클립 ${n} · ${a?.name || "화면"}`} x={media.x} y={media.y} kind="clip"
            fit={c.fill || project.settings.fill} fits={["contain", "cover", "blur"]} flipX={c.flipX} flipY={c.flipY}
            range={{ a: n, b: n, cur: n, total }} canRemove={Boolean(c.visual)}
            onFit={(f) => clipFit(c.id, f)} onFlip={(ax) => clipFlip(c.id, ax)} onReplace={() => actions.openVisual(c.id)}
            onStart={canStart(c) ? () => setStartClip(c.id) : undefined} trim={canTrim(c)} sound={soundOf(c)}
            onRange={(x, y) => clipRange(c.id, x, y)} onRemove={() => clipRemoveVisual(c.id)} onClose={close} />;
        }
        const l = (project.layers || []).find((x) => x.id === media.id);
        if (!l) return null;
        const cov = layerItems(project, l, items);
        const a = cov.length ? pos.get(cov[0].clip.id) || 1 : 1;
        const b = cov.length ? pos.get(cov[cov.length - 1].clip.id) || a : a;
        const curN = cur ? pos.get(cur.clip.id) || a : a;
        const imgs = (project.layers || []).filter((x) => x.type === "image");
        const oi = imgs.findIndex((x) => x.id === l.id);
        return <MediaMenu key={"l" + l.id} title={`사진 올리기 · ${layerTitle(l)}`} x={media.x} y={media.y} kind="layer"
          fit={l.fit || "free"} fits={["free", "contain", "cover"]} flipX={l.flipX} flipY={l.flipY}
          range={{ a, b, cur: curN, total }} order={{ up: oi < imgs.length - 1, down: oi > 0 }} canRemove
          onFit={(f) => updateLayer(l.id, { fit: f === "blur" ? "contain" : f })}
          onFlip={(ax) => updateLayer(l.id, ax === "x" ? { flipX: !l.flipX || undefined } : { flipY: !l.flipY || undefined })}
          onReplace={() => { setOverlayTarget(l.id); openLib("mine", true); }}
          onRange={(x, y) => total && updateLayer(l.id, { from: items[x - 1].clip.id, to: items[y - 1].clip.id })}
          onOrder={(o) => layerOrder(l.id, o)} onRemove={() => removeLayer(l.id)} onClose={close} />;
      })()}
      {pop && (() => {
        const l = (project.layers || []).find((x) => x.id === pop.id);
        if (!l) return null;
        return <LayerPopup key={l.id} project={project} layer={l} items={flat.items} selRange={selRange()} x={pop.x} y={pop.y}
          onChange={(patch) => updateLayer(l.id, patch)} onRemove={() => removeLayer(l.id)} onClose={() => setPop(null)} />;
      })()}
      {work && <Modal title=""><Working title={work.title} detail={work.detail} frac={work.frac} /></Modal>}
      {dialog === "export" && <ExportDialog project={project} selected={selected} sceneOf={sel1?.scene.id} onClose={() => setDialog("")} />}
      {dialog === "formats" && <FormatsDialog project={project} onClose={() => setDialog("")} />}
      {dialog === "saveAs" && (
        <Modal title="다른 이름으로 저장" onClose={() => setDialog("")} width={520}
          footer={<><Btn onClick={() => setDialog("")}>취소</Btn><Btn primary onClick={doSaveAs} disabled={!saveAsName.trim()}>저장</Btn></>}>
          <div style={{ padding: 20 }}>
            <div style={{ ...label, marginBottom: 8 }}>새 프로젝트 이름</div>
            <input value={saveAsName} onChange={(e) => setSaveAsName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && doSaveAs()} autoFocus
              onFocus={(e) => e.currentTarget.select()} style={{ ...input }} />
            <div style={{ ...label, margin: "16px 0 8px" }}>저장할 위치</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div title={saveAsDir} style={{ flex: 1, minWidth: 0, height: 40, display: "flex", alignItems: "center", gap: 8, padding: "0 12px", border: `1px solid ${C.line2}`, borderRadius: 6, background: C.card, fontSize: 13.5, color: C.text }}>
                <Icon name="folder" size={17} color={C.sub} />
                <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", direction: "rtl", textAlign: "left" }}>{"\u200e" + saveAsDir}</span>
              </div>
              <Btn onClick={pickSaveAsDir}><Icon name="open" size={16} />위치 바꾸기</Btn>
            </div>
            <div style={{ fontSize: 12.5, color: C.dim, marginTop: 6 }}>이 폴더 안에 「{saveAsName.trim() || "새 이름"}」 폴더가 만들어져요.</div>
            <div style={{ fontSize: 13.5, color: C.sub, marginTop: 10, lineHeight: 1.6 }}>
              지금 편집한 내용 그대로 새 프로젝트로 복사하고, 새 프로젝트를 열어요.<br />
              원래 프로젝트 「{project.name}」는 그대로 남아요.
            </div>
          </div>
        </Modal>
      )}
      {dialog === "addText" && (
        <NewClipDialog where={selected.length ? "고른 클립 뒤에" : "맨 끝에"} ensureAsset={ensureAsset} onAdd={addNewClip} onClose={() => setDialog("")} />
      )}
      {backups && (
        <Modal title="자동 저장본" onClose={() => setBackups(null)} width={600} footer={<><Btn onClick={() => backups[0] && b.showFile(backups[0].file)}><Icon name="folder" size={15} />폴더 열기</Btn><Btn primary onClick={() => setBackups(null)}>닫기</Btn></>}>
          <div style={{ padding: "14px 20px", display: "flex", flexDirection: "column", gap: 8 }}>
            <Hint>고친 내용이 있으면 5분마다 따로 저장해 둔 사본이에요 (최근 20개). 열면 그 사본이 하나의 프로젝트로 열려요 — 계속 쓰려면 [다른 이름으로 저장] 해 주세요.</Hint>
            {backups.length === 0 ? <div style={{ color: C.sub, padding: 12 }}>아직 자동 저장본이 없어요.</div> : backups.map((x) => (
              <div key={x.file} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 6, border: `1px solid ${C.line}`, background: C.card }}>
                <Icon name="file" size={16} />
                <span style={{ flex: 1, fontSize: 14.5, fontWeight: 700 }}>{new Date(x.at).toLocaleString("ko-KR", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                <span style={{ fontSize: 13, color: C.dim }}>{Math.max(1, Math.round(x.size / 1024))}KB</span>
                <Btn small onClick={() => openBackup(x.file)}>열기</Btn>
              </div>
            ))}
          </div>
        </Modal>
      )}
      {closeAsk && (
        <Modal title="저장하지 않은 내용이 있어요" onClose={() => { pendingNext.current = null; setCloseAsk(false); }} width={560}
          footer={<><Btn primary onClick={askSave}><Icon name="save" size={16} />저장</Btn><Btn onClick={askSaveAs}>다른 이름으로 저장</Btn><Btn onClick={askDiscard} style={{ color: C.danger }}>저장 안 함</Btn><Btn onClick={() => { pendingNext.current = null; setCloseAsk(false); }}>취소</Btn></>}>
          <div style={{ padding: 20, fontSize: 15, lineHeight: 1.7 }}>
            <b>{project.name}</b>을(를) 고친 뒤 아직 저장하지 않았어요. 저장할까요?
            <div style={{ fontSize: 13.5, color: C.sub, marginTop: 6 }}>{project.savedAt === "" ? "[저장 안 함]을 누르면 한 번도 저장하지 않은 이 새 프로젝트는 지워져요." : "[저장 안 함]을 누르면 마지막으로 저장한 상태로 돌아가요."}</div>
          </div>
        </Modal>
      )}
      {pkg && (
        <Modal title="프로젝트 패키지 만들기" onClose={() => setPkg(null)} width={560}
          footer={<><Btn onClick={() => setPkg(null)}>취소</Btn><Btn primary onClick={makePackage}><Icon name="folder" size={16} />만들 곳 고르기</Btn></>}>
          <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12, fontSize: 15 }}>
            <div>이 프로젝트가 쓰는 원본 <b>{pkg.count}개 · {pkg.bytes >= 1e9 ? `${(pkg.bytes / 1e9).toFixed(1)}GB` : `${Math.max(1, Math.round(pkg.bytes / 1e6))}MB`}</b>를 한 폴더에 복사해 모아요.</div>
            <pre style={{ margin: 0, padding: "10px 12px", borderRadius: 6, background: C.bg, color: C.sub, fontSize: 13.5, lineHeight: 1.6, fontFamily: "Consolas, monospace" }}>{`${project.name}_패키지/\n├ ${project.name}.gss\n└ 미디어/  (원본 영상·사진·음악)`}</pre>
            {pkg.missing.length > 0 && <div style={{ color: C.danger, fontSize: 14 }}>원본을 찾지 못한 {pkg.missing.length}개는 빠져요: {pkg.missing.slice(0, 3).join(", ")}{pkg.missing.length > 3 ? " …" : ""}</div>}
            <Hint>그 폴더만 USB·다른 PC로 옮기면 그대로 열려요. 원본은 복사만 하고 지우지 않아요.</Hint>
          </div>
        </Modal>
      )}
      {dialog === "silence" && (() => {
        const srcIds = srcItems.map((x) => x.clip.id);
        const oldIds = flat.items.filter((x) => x.clip.type === "silence").map((x) => x.clip.id);
        const scopeIds = silScope === "selected" ? [...selSrcIds, ...oldIds.filter((id) => selected.includes(id))] : [...srcIds, ...oldIds];
        const sum = (min: number) => {
          let n = 0;
          let sec = 0;
          for (const x of srcItems) {
            if (!scopeIds.includes(x.clip.id)) continue;
            const cs = cutsFor(x.clip, min);
            n += cs.length;
            // 이미 잘라 둔 곳은 빼고 더 줄어드는 만큼
            sec += cs.reduce((a, g) => a + (g.e - g.s), 0) - (x.clip.cuts || []).reduce((a, g) => a + (g.e - g.s), 0);
          }
          for (const x of flat.items) if (x.clip.type === "silence" && scopeIds.includes(x.clip.id)) { n += 1; sec += x.dur; }
          return { n, sec };
        };
        const now = sum(silMin);
        const chipS = (on: boolean): React.CSSProperties => ({ flex: 1, padding: "10px 8px", borderRadius: 6, border: `1px solid ${on ? C.accent : C.line2}`, background: on ? C.accentDim : "transparent", color: C.text, fontFamily: FONT, cursor: "pointer", textAlign: "center" });
        return (
          <Modal title="무음 줄이기" onClose={() => setDialog("")} width={560}
            footer={<><Btn onClick={() => setDialog("")}>취소</Btn><Btn primary disabled={!now.n} onClick={() => removeSilence(scopeIds, silMin)}><Icon name="silence" size={16} />{now.n ? `${now.n}곳 줄이기` : "줄일 곳 없음"}</Btn></>}>
            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <div style={{ ...label, marginBottom: 8 }}>범위</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" onClick={() => setSilScope("all")} style={chipS(silScope === "all")}><b>모든 클립</b><div style={{ fontSize: 12.5, color: C.sub, marginTop: 3 }}>영상 클립 {srcIds.length}개</div></button>
                  <button type="button" disabled={!selSrcIds.length} onClick={() => setSilScope("selected")} style={{ ...chipS(silScope === "selected"), opacity: selSrcIds.length ? 1 : 0.45 }}><b>고른 클립만</b><div style={{ fontSize: 12.5, color: C.sub, marginTop: 3 }}>{selSrcIds.length}개</div></button>
                </div>
              </div>
              <div>
                <div style={{ ...label, marginBottom: 8 }}>얼마나 쉬면 지울까요?</div>
                <div style={{ display: "flex", gap: 8 }}>
                  {([[0.3, "짧게", "0.3초 이상"], [0.5, "보통", "0.5초 이상"], [1, "길게", "1초 이상"]] as const).map(([v, t, d]) => {
                    const r = sum(v);
                    return (
                      <button key={v} type="button" onClick={() => setSilMin(v)} style={chipS(silMin === v)}>
                        <b>{t}</b><div style={{ fontSize: 12.5, color: C.sub, marginTop: 3 }}>{d}</div>
                        <div style={{ fontSize: 12.5, color: C.text, marginTop: 4 }}>{r.n}곳 · {r.sec.toFixed(1)}초</div>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>무음 {now.n}곳 · {now.sec.toFixed(1)}초가 줄어요 <span style={{ color: C.sub, fontWeight: 600 }}>({fmtTime(flat.total, false)} → {fmtTime(Math.max(0, flat.total - now.sec), false)})</span></div>
              <Hint>클립은 그대로 두고 쉬는 곳만 건너뛰어요. 말 앞뒤로 0.15초씩 남겨 말이 끊기지 않게 하고, 자막도 같이 당겨져요. 줄인 곳은 클립에서 ⏸ 표시를 누르면 원래대로 돌아가요. [무음 원래대로]로 한 번에 되돌릴 수도 있어요.</Hint>
            </div>
          </Modal>
        );
      })()}
      {dialog === "autoSub" && (() => {
        const allIds = srcItems.map((x) => x.clip.id);
        const ids = autoScope === "empty" ? noTextIds : autoScope === "all" ? allIds : selSrcIds;
        const opt = (v: "empty" | "selected" | "all", title: string, n: number, sec: number, note?: string) => (
          <label style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px", borderRadius: 6, border: `1px solid ${autoScope === v ? C.accent : C.line2}`, cursor: n ? "pointer" : "default", opacity: n ? 1 : 0.45 }}>
            <input type="radio" checked={autoScope === v} disabled={!n} onChange={() => setAutoScope(v)} style={{ marginTop: 3, accentColor: C.accent }} />
            <span>
              <span style={{ fontSize: 15, fontWeight: 700 }}>{title}</span>
              <span style={{ display: "block", fontSize: 13.5, color: C.sub, marginTop: 3 }}>클립 {n}개 · 길이 {fmtTime(sec, false)}{note ? ` · ${note}` : ""}</span>
            </span>
          </label>
        );
        return (
          <Modal title="자동 자막 만들기" onClose={() => setDialog("")} width={560}
            footer={<><Btn onClick={() => setDialog("")}>취소</Btn><Btn primary disabled={!ids.length} onClick={() => autoSub(ids)}><Icon name="mic" size={16} />만들기</Btn></>}>
            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 10 }}>
              {opt("all", "모든 클립 다시 받아쓰기", allIds.length, secOf(allIds), "이미 만든 자막도 새로 · 지운 단어도 되살아나요")}
              {opt("selected", "고른 클립만 다시 받아쓰기", selSrcIds.length, secOf(selSrcIds), "지운 단어도 되살아나요")}
              {opt("empty", "글이 없는 클립 모두", noTextIds.length, secOf(noTextIds))}
              <Hint>받아쓴 문장마다 클립이 나뉘고 자막이 켜져요. 영상은 보내지 않고 소리만 공실뉴스 서버로 보내 글로 바꾸며, 말소리 길이만큼 AI 비용이 들어요.</Hint>
            </div>
          </Modal>
        );
      })()}
      {dialog === "find" && <FindDialog project={project} onJump={(id) => { setDialog(""); actions.selectClip(id, false); document.querySelector(`[data-clip="${id}"]`)?.scrollIntoView({ block: "center" }); }} onClose={() => setDialog("")} />}
      {dialog === "help" && (
        <Modal title="쉬운 사용법" onClose={() => setDialog("")} width={640}>
          <div style={{ padding: 22, fontSize: 15.5, lineHeight: 1.9, color: C.text }}>
            <div>1. <b>단어를 누르면</b> 그 자리로 가요. 단어에 마우스를 올려 오른쪽 위 ⓧ를 누르면 그 부분이 영상에서 잘려요 (Del 키도 돼요).</div>
            <div>2. <b>클립을 누르면</b> 아래에 [글 고치기] [화면 바꾸기] [목소리] [클립 지우기] 단추가 나와요.</div>
            <div>3. 실수했으면 위 [홈] 탭의 <b>[되돌리기]</b>를 누르세요. 몇 번이든 돼요.</div>
            <div>4. 다 됐으면 오른쪽 위 <b>[내보내기]</b>를 누르면 영상 파일이 만들어져요.</div>
            <div>5. 자동으로 저장돼요. 껐다 켜도 [프로젝트 열기]에서 이어서 할 수 있어요.</div>
            <div>6. <b>음악·사진·화면 글자</b>는 클립을 고르고 [삽입] 탭에서 넣어요. 클립 왼쪽 아이콘을 누르면 설정이 열리고, 아이콘이나 막대 끝 손잡이를 위아래로 끌면 범위가 바뀌어요.</div>
            <div>7. 클립 아래 <b>파란 자막 글자</b>를 누르면 목소리는 두고 자막만 고칠 수 있어요.</div>
            <div style={{ marginTop: 14, ...label }}>단축키</div>
            <div style={{ color: C.sub }}>스페이스: 재생/멈춤 · Ctrl+Z: 되돌리기 · Ctrl+Y: 다시실행 · Delete: 고른 단어(또는 클립) 지우기 · Ctrl+S: 저장</div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ── 내보내기 ── */
/** 레이어 줄 — 앞 단추로 보이기(눈)·듣기(스피커) 켜고 끄기, 이름을 누르면 설정. 끄기는 설정과 따로라 다시 켜면 그대로 */
function TrackRow({ kind, on, icon, name, hint, danger, active, onToggle, onOpen }: { kind: "eye" | "ear"; on: boolean; icon: string; name: string; hint: string; danger?: boolean; active?: boolean; onToggle: () => void; onOpen: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, opacity: on ? 1 : 0.45 }}>
      <button type="button" onClick={onToggle} title={`${on ? (kind === "eye" ? "숨기기" : "소리 끄기") : kind === "eye" ? "보이기" : "소리 켜기"} · ${hint}`}
        style={{ width: 28, height: 26, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${on ? C.line2 : C.danger}`, borderRadius: 5, background: on ? "transparent" : "rgba(239,68,68,0.12)", color: on ? C.text : C.danger, cursor: "pointer", padding: 0 }}>
        {kind === "eye" ? (
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" />{!on && <path d="M3 3l18 18" />}</svg>
        ) : (
          <Icon name={on ? "volume" : "mute"} size={16} />
        )}
      </button>
      <button type="button" onClick={onOpen} title="눌러서 설정"
        style={{ flex: 1, minWidth: 0, display: "flex", gap: 8, alignItems: "center", padding: "3px 4px", border: 0, borderRadius: 4, background: "transparent", color: danger ? C.danger : active ? C.text : C.sub, fontSize: 14, fontFamily: FONT, cursor: "pointer", textAlign: "left", textDecoration: on ? undefined : "line-through" }}>
        <Icon name={icon} size={16} /><span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
      </button>
    </div>
  );
}

/** 꺼 둔 레이어 이름들 (내보내기 전에 알려 주기) */
function offNames(p: Project) {
  const o = p.settings.off || {};
  const n: string[] = [];
  if (o.visual) n.push("화면");
  if (o.source) n.push("원본 소리");
  if (o.voice) n.push("AI 목소리");
  if (!p.settings.subtitle.on) n.push("메인자막");
  for (const l of p.layers || []) if (l.off) n.push(layerTitle(l));
  return n;
}

function ExportDialog({ project, selected, sceneOf, onClose }: { project: Project; selected: string[]; sceneOf?: string; onClose: () => void }) {
  const b = videoBridge()!;
  const [scope, setScope] = useState<"all" | "scene" | "selected">("all");
  const [height, setHeight] = useState(0);
  const [state, setState] = useState<{ text: string; frac: number } | null>(null);
  const [job, setJob] = useState("");
  const [done, setDone] = useState<{ file: string; seconds: number; took: number } | null>(null);
  const [err, setErr] = useState("");
  const [W0, H0] = project.ratio === "16:9" ? [1920, 1080] : project.ratio === "9:16" ? [1080, 1920] : project.ratio === "4:5" ? [1080, 1350] : project.ratio === "4:3" ? [1440, 1080] : [1080, 1080];
  const go = async () => {
    setErr("");
    setState({ text: "준비하는 중…", frac: 0 });
    const off = b.onRender((text, frac, id) => {
      if (id) setJob(id);
      else setState({ text, frac });
    });
    try {
      const r = await b.render(project, { scope, sceneId: sceneOf, clipIds: selected, height: height || undefined });
      setDone(r);
    } catch (e) {
      setErr(errText(e));
    } finally {
      off();
      setState(null);
    }
  };
  if (done) {
    return (
      <Modal title="영상이 완성됐어요" onClose={onClose} width={560} footer={<><Btn onClick={() => b.showFile(done.file)}><Icon name="folder" size={16} />폴더에서 보기</Btn><Btn primary onClick={() => b.openPath(done.file)}><Icon name="play" size={16} />영상 열어 보기</Btn></>}>
        <div style={{ padding: 22, fontSize: 15.5, lineHeight: 1.8 }}>
          <div>길이 {fmtTime(done.seconds, false)} · 만드는 데 {Math.round(done.took)}초 걸렸어요.</div>
          <div style={{ color: C.sub, fontSize: 14, wordBreak: "break-all" }}>{done.file}</div>
        </div>
      </Modal>
    );
  }
  if (state) {
    return (
      <Modal title="영상 내보내기" width={560} footer={<Btn onClick={() => job && b.renderCancel(job)}>멈추기</Btn>}>
        <Working title={state.text} frac={state.frac} detail="PC에서 만들고 있어요. 이 창을 닫지 마세요." />
      </Modal>
    );
  }
  const radio = (on: boolean, text: string, pick: () => void, disabled = false) => (
    <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 15.5, color: disabled ? C.dim : C.text, cursor: disabled ? "default" : "pointer" }}>
      <input type="radio" checked={on} onChange={pick} disabled={disabled} style={{ width: 18, height: 18, accentColor: C.accent }} />
      {text}
    </label>
  );
  return (
    <Modal title="영상 내보내기" onClose={onClose} width={560} footer={<><Btn onClick={onClose}>취소</Btn><Btn primary onClick={go}><Icon name="export" size={16} />내보내기</Btn></>}>
      <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 18 }}>
        {offNames(project).length > 0 && (
          <div style={{ padding: "10px 12px", borderRadius: 6, border: `1px solid ${C.danger}`, background: "rgba(239,68,68,0.1)", fontSize: 14, lineHeight: 1.6 }}>
            <b style={{ color: C.danger }}>꺼 둔 레이어가 있어요:</b> {offNames(project).join(", ")}<br />
            <span style={{ color: C.sub }}>꺼 둔 것은 영상에 들어가지 않아요. 넣으려면 미리보기 아래에서 다시 켜 주세요.</span>
          </div>
        )}
        <div>
          <div style={{ ...label, marginBottom: 10 }}>내보낼 클립</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {radio(scope === "all", "모든 씬, 모든 클립", () => setScope("all"))}
            {radio(scope === "scene", "지금 씬만", () => setScope("scene"), !sceneOf)}
            {radio(scope === "selected", `고른 클립만 (${selected.length}개)`, () => setScope("selected"), !selected.length)}
          </div>
        </div>
        <div>
          <div style={{ ...label, marginBottom: 10 }}>해상도</div>
          <select value={height} onChange={(e) => setHeight(Number(e.target.value))} style={{ ...input }}>
            <option value={0}>원본 ({W0} × {H0})</option>
            <option value={720}>720p (파일이 작아요)</option>
            <option value={480}>480p (카톡으로 보내기 좋아요)</option>
          </select>
        </div>
        <div style={{ fontSize: 14, color: C.sub }}>저장 위치: 프로젝트 폴더의 output</div>
        {err && <div style={{ fontSize: 14.5, color: C.danger, lineHeight: 1.6 }}>{err}</div>}
      </div>
    </Modal>
  );
}

function FormatsDialog({ project, onClose }: { project: Project; onClose: () => void }) {
  const b = videoBridge()!;
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<unknown>, okMsg: string) => {
    setBusy(true);
    setMsg("");
    try {
      await fn();
      setMsg(okMsg);
    } catch (e) {
      setMsg(errText(e));
    }
    setBusy(false);
  };
  const row = (icon: string, title: string, desc: string, fn: () => void) => (
    <button type="button" onClick={fn} disabled={busy} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "12px 14px", borderRadius: 6, border: `1px solid ${C.line2}`, background: C.card, color: C.text, cursor: "pointer", fontFamily: FONT, textAlign: "left" }}>
      <Icon name={icon} size={22} />
      <span style={{ flex: 1 }}>
        <span style={{ display: "block", fontSize: 15.5, fontWeight: 800 }}>{title}</span>
        <span style={{ display: "block", fontSize: 13, color: C.sub, marginTop: 2 }}>{desc}</span>
      </span>
    </button>
  );
  return (
    <Modal title="다른 형식으로 내보내기" onClose={onClose} width={560}>
      <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 8 }}>
        {row("sub", "자막 (.srt)", "유튜브에 자막으로 올릴 수 있어요", () => run(() => b.project.exportText(project, "srt"), "자막 파일을 저장했어요"))}
        {row("file", "텍스트 (.txt)", "대본 글만", () => run(() => b.project.exportText(project, "txt"), "텍스트 파일을 저장했어요"))}
        {row("music", "소리 (.mp3)", "목소리·음악 소리만", () => run(() => b.exportAudio(project, "mp3").then((f) => b.showFile(f)), "소리 파일을 저장했어요"))}
        {row("music", "소리 (.wav)", "편집용 고음질 소리", () => run(() => b.exportAudio(project, "wav").then((f) => b.showFile(f)), "소리 파일을 저장했어요"))}
        {busy && <Working title="만드는 중…" />}
        {msg && <div style={{ fontSize: 14.5, color: C.sub, marginTop: 6 }}>{msg}</div>}
      </div>
    </Modal>
  );
}

function FindDialog({ project, onJump, onClose }: { project: Project; onJump: (id: string) => void; onClose: () => void }) {
  const [q, setQ] = useState("");
  const hits = useMemo(() => {
    if (!q.trim()) return [];
    const out: { id: string; n: number; text: string }[] = [];
    let n = 0;
    for (const sc of project.scenes) for (const c of sc.clips) {
      n++;
      const t = clipText(c);
      if (t.includes(q.trim())) out.push({ id: c.id, n, text: t });
    }
    return out;
  }, [q, project]);
  return (
    <Modal title="찾아서 편집하기" onClose={onClose} width={620}>
      <div style={{ padding: 20 }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} autoFocus placeholder="찾을 말 (예: 전세)" style={input} />
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6, maxHeight: 380, overflowY: "auto" }}>
          {hits.map((h) => (
            <button key={h.id} type="button" onClick={() => onJump(h.id)} style={{ textAlign: "left", padding: "10px 12px", borderRadius: 6, border: `1px solid ${C.line2}`, background: C.card, color: C.text, fontSize: 15, fontFamily: FONT, cursor: "pointer" }}>
              <b style={{ marginRight: 8 }}>클립 {h.n}</b>{h.text}
            </button>
          ))}
          {q.trim() && !hits.length && <div style={{ color: C.sub, fontSize: 14 }}>찾은 클립이 없어요.</div>}
        </div>
      </div>
    </Modal>
  );
}
