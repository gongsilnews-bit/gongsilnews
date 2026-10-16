"use client";

// 편집 화면 — 브루와 같은 짜임: 맨 위 탭 + 리본, 왼쪽 미리보기, 가운데 클립 목록, 오른쪽 자료·설정 칸
// 진짜 편집이 되면서 어르신도 쉽게: 모든 기능을 눈에 보이는 단추로, 되돌리기, 자동 저장
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Asset, Clip, Layer, LibItem, Project, Ratio, Scene, StockItem } from "./types";
import { DRAG_MEDIA, errText, fmtTime, uid, videoBridge } from "./types";
import { GAP, clipOrder, clipText, flatten, keepRanges, layerItems, layersAt, speedOf, splitScript, srcSpeed, subStyleOf, wordTimes } from "./timeline";
import MediaMenu, { type MediaFit, type MediaOrder } from "./MediaMenu";
import VideoStart from "./VideoStart";
import Player, { type PlayerHandle } from "./Player";
import ClipList, { AllBox, type ClipActions } from "./ClipList";
import { LibraryPanel, MusicPanel, RatioPanel, SubtitlePanel, VoicePanel, type LibPickAction } from "./Panels";
import { Btn, C, FONT, Hint, Icon, Modal, Working, input, label } from "./ui";
import { LAYER_ICON, LayerPanel, LayerPopup, TimingPanel, VisualPanel, computeLanes, layerTitle } from "./Layers";

type PanelKind = "" | "library" | "voice" | "subtitle" | "ratio" | "music" | "layer" | "visual" | "timing";
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

/** 글을 단어로 나누고 [s, e] 안에 글자 수만큼 시각을 나눈다 (글을 고친 촬영 클립) */
function spreadIn(text: string, s: number, e: number) {
  const tokens = text.split(/\s+/).filter(Boolean);
  const total = tokens.reduce((a, w) => a + w.length + 0.5, 0) || 1;
  let t = s;
  return tokens.map((w) => {
    const d = ((w.length + 0.5) / total) * (e - s);
    const r = { w, s: +t.toFixed(3), e: +(t + d).toFixed(3) };
    t += d;
    return r;
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
  const [libTab, setLibTab] = useState("mine");
  const [selected, setSelected] = useState<string[]>([]);
  const [selWord, setSelWord] = useState<{ clip: string; i: number } | null>(null);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  const [busy, setBusy] = useState<Record<string, string>>({});
  const [toast, setToast] = useState("");
  const [saved, setSaved] = useState("");
  const [view, setView] = useState<"detail" | "simple">("detail");
  const [dialog, setDialog] = useState<"" | "export" | "formats" | "addText" | "help" | "find" | "saveAs">("");
  const [work, setWork] = useState<{ title: string; detail?: string; frac?: number | null } | null>(null);
  const [selLayer, setSelLayer] = useState("");
  const [pop, setPop] = useState<{ id: string; x: number; y: number } | null>(null); // 아이콘 옆 작은 메뉴
  const [visualClip, setVisualClip] = useState(""); // 오른쪽 화면 속성 칸의 클립
  const [subMode, setSubMode] = useState<"all" | "sel">("all"); // 메인자막 서식 적용 범위
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

  // 자동 저장
  useEffect(() => {
    const t = setTimeout(() => {
      b.project.save(project).then(() => setSaved(new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }))).catch((e) => setSaved(`저장 실패: ${errText(e)}`));
    }, 800);
    return () => clearTimeout(t);
  }, [project, b]);

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
            if (c) c.voice = null;
          }, false);
          continue;
        }
        setBusy((x) => ({ ...x, [id]: "목소리 만드는 중…" }));
        try {
          const r = await b.voice(pref.current.dir, text, f.clip.voiceId || pref.current.settings.voice.id);
          change((p) => {
            const c = findClip(p, id)?.clip;
            if (!c) return;
            c.voice = { file: r.file, url: r.url, duration: r.duration, id: r.id, text: r.text };
            c.words = r.words;
            c.text = text;
          }, false);
        } catch (e) {
          say(`목소리를 만들지 못했어요: ${errText(e)}`);
        }
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
    selectWord: (clipId, i) => {
      setSelected([clipId]);
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
      const t = text.replace(/\s+/g, " ").trim();
      change((p) => {
        const c = findClip(p, clipId)!.clip;
        if (c.type === "voice") {
          c.text = t;
          c.words = t.split(/\s+/).filter(Boolean).map((w) => ({ w, s: 0, e: 0 }));
          c.voice = null;
        } else if (c.src) {
          c.text = t;
          c.words = spreadIn(t, c.src.s, c.src.e);
        }
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
    openVoice: (id) => {
      setSelected([id]);
      setPanel("voice");
    },
    openVisual: (id) => {
      setSelected([id]);
      openLib("mine");
    },
    openTiming: (id) => {
      if (!(selected.length > 1 && selected.includes(id))) setSelected([id]);
      setPanel("timing");
    },
    openMedia: (id, x, y) => {
      setSelected([id]);
      setMedia({ kind: "clip", id, x, y });
      setVisualClip(id);
      setPanel("visual");
    },
    toggleMute: (id) => change((p) => {
      const c = findClip(p, id)?.clip;
      if (c) c.muted = !c.muted;
    }),
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

  const removeSilence = () => {
    let n = 0;
    change((p) => {
      for (const sc of p.scenes) {
        const before = sc.clips.length;
        sc.clips = sc.clips.filter((c) => c.type !== "silence");
        n += before - sc.clips.length;
      }
    });
    say(n ? `말이 없는 구간 ${n}개를 지웠어요` : "지울 무음 구간이 없어요");
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
  const addLayer = (l: Omit<Layer, "id" | "from" | "to">, all: boolean) => {
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
  const canStart = (c: Clip) => Boolean(c.visual && project.assets[c.visual.asset]?.kind === "video" && !(c.src && c.src.asset === c.visual.asset));
  /** 클립 소리 — 원본 소리가 있는 영상 클립 (촬영·불러온 영상) */
  const soundOf = (c: Clip) =>
    c.type === "voice" && c.visual && project.assets[c.visual.asset]?.kind === "video" && project.assets[c.visual.asset]?.hasAudio
      ? {
          // AI 목소리 클립의 화면 영상 소리 — 기본 무음, 올리면 목소리와 섞인다
          label: "이 클립 화면 영상의 소리 (AI 목소리와 섞여요)",
          muted: !(c.visualVolume && c.visualVolume > 0),
          value: c.visualVolume && c.visualVolume > 0 ? c.visualVolume : 1,
          onMute: (v: boolean) => change((p) => { const x = findClip(p, c.id)?.clip; if (x) x.visualVolume = v ? undefined : x.visualVolume || 1; }),
          onVolume: (v: number, first: boolean) => change((p) => { const x = findClip(p, c.id)?.clip; if (x) x.visualVolume = v > 0 ? +v.toFixed(2) : undefined; }, first),
        }
      : soundOfSource(c);
  const soundOfSource = (c: Clip) =>
    // 보이는 화면이 영상일 때만 (사진으로 바꾼 클립은 카드의 [소리 끄기]로)
    c.type !== "voice" && c.src && project.assets[c.src.asset]?.hasAudio && project.assets[(c.visual || c.src).asset]?.kind === "video"
      ? {
          muted: Boolean(c.muted),
          value: c.volume ?? 1,
          onMute: (v: boolean) => change((p) => { const x = findClip(p, c.id)?.clip; if (x) x.muted = v || undefined; }),
          onVolume: (v: number, first: boolean) => change((p) => { const x = findClip(p, c.id)?.clip; if (x) x.volume = Math.abs(v - 1) < 0.001 ? undefined : +v.toFixed(2); }, first),
        }
      : undefined;
  /* ── 속도·길이 (고른 클립 모두) ── */
  const timingIds = () => (selected.length ? selected : cur ? [cur.clip.id] : []);
  /** 빠르기를 바꿀 수 있는 클립: 목소리가 있는 AI 목소리 클립, 촬영 영상 클립 */
  const canSpeed = (c: Clip) => (c.type === "voice" ? Boolean(c.voice?.duration) : Boolean(c.src));
  const setSpeed = (v: number, first: boolean) => change((p) => {
    for (const id of timingIds()) {
      const c = findClip(p, id)?.clip;
      if (!c || !canSpeed(c)) continue;
      c.speed = Math.abs(v - 1) < 0.001 && c.type !== "voice" ? undefined : +v.toFixed(2);
    }
  }, first);
  /** 길이 맞추기 — 목소리 클립: 늘리면 끝에 머물기(pad), 줄이면 빠르게 / 화면만: 그 시간 / 촬영: 빠르기로 */
  const setLength = (T: number) => {
    change((p) => {
      for (const id of timingIds()) {
        const c = findClip(p, id)?.clip;
        if (!c) continue;
        if (c.type === "voice" && c.voice?.duration) {
          const vd = c.voice.duration;
          const nat = vd / speedOf(c, p.settings) + GAP;
          if (T >= nat - 0.01) c.pad = T - nat > 0.01 ? +(T - nat).toFixed(2) : undefined;
          else {
            c.speed = +Math.max(0.1, Math.min(20, vd / Math.max(0.05, T - GAP))).toFixed(3);
            c.pad = undefined;
          }
        } else if (c.type === "voice") c.hold = +Math.max(0.5, T).toFixed(2);
        else {
          const raw = keepRanges(c).reduce((a, r) => a + (r.e - r.s), 0);
          if (raw > 0) c.speed = +Math.max(0.1, Math.min(20, raw / T)).toFixed(3);
        }
      }
    });
    say(`길이를 ${T}초로 맞췄어요 (속도는 0.1~20배 안에서)`);
  };
  const resetTiming = () => change((p) => {
    for (const id of timingIds()) {
      const c = findClip(p, id)?.clip;
      if (!c) continue;
      delete c.speed;
      delete c.pad;
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
      setWork({ title: "영상 속 말소리를 글로 바꾸는 중…" });
      const off = b.onProgress((t, f) => setWork({ title: t, frac: typeof f === "number" ? f : null }));
      try {
        const r = await b.transcribe(pref.current, a.id);
        insertAt(r.clips, refId, before);
        say(`영상을 넣었어요 (클립 ${r.clips.length}개)`);
      } catch (e) {
        say(errText(e));
      } finally {
        off();
        setWork(null);
      }
      return;
    }
    const clip: Clip = { id: uid(), type: "voice", text: "", words: [], voice: null, visual: { asset: a.id, s: 0 }, hold: a.kind === "video" ? Math.min(10, a.duration || 5) : 3 };
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
  const doSaveAs = async () => {
    const name = saveAsName.trim();
    if (!name) return;
    if (!b.project.saveAs) return say("앱을 새 버전으로 업데이트하면 쓸 수 있어요");
    setDialog("");
    setWork({ title: "다른 이름으로 저장하는 중…", detail: name });
    try {
      const np = await b.project.saveAs(pref.current, name, saveAsDir || undefined);
      setWork(null);
      onSwitch?.(np);
    } catch (e) {
      setWork(null);
      say(errText(e));
    }
  };

  /* ── 글 클립 넣기 ── */
  const [addText, setAddText] = useState("");
  const doAddText = () => {
    const sentences = splitScript(addText).flat();
    if (!sentences.length) return;
    const prev = lastSelected() ? findClip(pref.current, lastSelected()) : null;
    const visual = prev?.clip.visual || null;
    const clips: Clip[] = sentences.map((t) => ({ id: uid(), type: "voice", text: t, words: t.split(/\s+/).map((w) => ({ w, s: 0, e: 0 })), voice: null, visual }));
    insertAfter(clips, lastSelected());
    setDialog("");
    setAddText("");
    revoice(clips.map((c) => c.id));
  };

  /* ── 목소리 바꾸기 ── */
  const applyVoice = async (o: { id: string; speed: number; volume: number; scope: "all" | "selected" }) => {
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

  /* ── 키보드 ── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return; // 화면 위 글 고치기 칸 등에서 이미 처리한 키 (Esc 로 고치기만 취소)
      const tg = e.target as HTMLElement;
      if (tg && (tg.tagName === "INPUT" || tg.tagName === "TEXTAREA" || tg.tagName === "SELECT" || tg.isContentEditable)) return;
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
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (selWord) actions.toggleWord(selWord.clip, selWord.i);
        else if (selected.length) actions.removeClip(selected);
        else if (panel === "layer" && selLayer) removeLayer(selLayer);
      } else if (ctrl && e.key.toLowerCase() === "s") {
        e.preventDefault();
        b.project.save(pref.current).then(() => say("저장했어요"));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  /* ── 리본 ── */
  const sel1 = selected.length === 1 ? findClip(project, selected[0]) : null;
  const ribbon: Record<string, RibbonBtn[]> = {
    파일: [
      { icon: "plus", label: "새로 만들기", onClick: onNew },
      { icon: "open", label: "프로젝트 열기", onClick: onOpen },
      "|",
      { icon: "video", label: "영상 추가하기", onClick: () => { openLib("mine"); } },
      { icon: "ratio", label: "화면 비율", onClick: () => setPanel("ratio") },
      "|",
      { icon: "save", label: "프로젝트 저장하기", onClick: () => b.project.save(pref.current).then(() => say("저장했어요")) },
      { icon: "copy", label: "다른 이름으로 저장", onClick: () => { setSaveAsName(`${pref.current.name}_사본`); setSaveAsDir(pref.current.dir.replace(/[\\/][^\\/]+[\\/]?$/, "")); setDialog("saveAs"); } },
      { icon: "folder", label: "프로젝트 폴더 열기", onClick: () => b.openPath(project.dir) },
      "|",
      { icon: "export", label: "영상으로 내보내기", onClick: () => setDialog("export") },
      { icon: "file", label: "다른 형식으로 내보내기", onClick: () => setDialog("formats") },
    ],
    홈: [
      { icon: "plus", label: "새로 만들기", onClick: onNew },
      { icon: "open", label: "프로젝트 열기", onClick: onOpen },
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
      { icon: "silence", label: "무음 구간 줄이기", onClick: removeSilence },
    ],
    편집: [
      { icon: "undo", label: "되돌리기", onClick: undo, disabled: !hist.current.past.length },
      { icon: "redo", label: "다시실행", onClick: redo, disabled: !hist.current.future.length },
      "|",
      { icon: "check", label: "모든 클립 고르기", onClick: () => setSelected(flat.items.map((x) => x.clip.id)) },
      { icon: "close", label: "고르기 풀기", onClick: () => { setSelected([]); setSelWord(null); } },
      "|",
      { icon: "speed", label: "속도·길이", onClick: () => setPanel("timing"), title: "고른 클립의 속도와 길이 (클립 시간을 눌러도 열려요)" },
      "|",
      { icon: "trash", label: selWord ? "단어 지우기/되살리기" : "단어 지우기", onClick: () => (selWord ? actions.toggleWord(selWord.clip, selWord.i) : say("지울 단어를 먼저 누르세요")) },
      { icon: "trash", label: "클립 지우기", onClick: () => actions.removeClip(selected), disabled: !selected.length },
      "|",
      { icon: "merge", label: "클립 합치기", onClick: () => mergeClips(selected), disabled: selected.length < 2 },
      { icon: "split", label: "클립 나누기", onClick: () => (selWord ? actions.splitAt(selWord.clip, selWord.i) : say("나눌 자리의 단어를 먼저 누르세요")) },
      { icon: "scene", label: "씬 나누기", onClick: () => sel1 && actions.sceneBreak(sel1.clip.id), disabled: !sel1 },
      "|",
      { icon: "silence", label: "무음 구간 줄이기", onClick: removeSilence },
      { icon: "search", label: "찾아서 편집하기", onClick: () => setDialog("find") },
    ],
    자막: [
      { icon: "sub", label: project.settings.subtitle.on ? "자막 숨기기" : "자막 보이기", onClick: () => change((p) => { p.settings.subtitle.on = !p.settings.subtitle.on; }) },
      { icon: "font", label: "메인자막 서식", onClick: () => setPanel("subtitle") },
      "|",
      { icon: "copy", label: "전체 자막 복사하기", onClick: () => { navigator.clipboard.writeText(flat.items.map((x) => (typeof x.clip.subText === "string" ? x.clip.subText : clipText(x.clip))).filter(Boolean).join("\n")); say("전체 자막을 복사했어요"); } },
      { icon: "file", label: "자막 파일 내보내기", onClick: () => b.project.exportText(pref.current, "srt").then(() => say("자막 파일(.srt)을 저장했어요")) },
      "|",
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
      { icon: "text", label: "글 클립 넣기", onClick: () => setDialog("addText") },
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
      { icon: "text", label: "AI 목소리 클립 넣기", onClick: () => setDialog("addText") },
    ],
    효과: [
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
      { icon: "folder", label: "저장 폴더 열기", onClick: () => b.openPath(project.dir) },
    ],
  };

  /* ── 레이아웃 ── */
  const [W, H] = project.ratio === "9:16" ? [9, 16] : project.ratio === "4:5" ? [4, 5] : project.ratio === "1:1" ? [1, 1] : project.ratio === "4:3" ? [4, 3] : [16, 9];
  const sideW0 = panel ? 380 : 0;
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
  const sideW = panel ? 380 : 0;
  const bigW = Math.round(Math.min(win.w - sideW - 160, ((win.h - 230) * W) / H, 1600));

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, background: C.bg, color: C.text, fontFamily: FONT }}>
      {/* 맨 위 탭 */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, height: 44, padding: "0 12px", background: C.panel, borderBottom: `1px solid ${C.line}` }}>
        <button type="button" onClick={onHome} title="처음 화면" style={{ display: "flex", alignItems: "center", gap: 6, height: 32, padding: "0 10px", border: 0, borderRadius: 4, background: "transparent", color: C.sub, fontSize: 14, fontWeight: 700, fontFamily: FONT, cursor: "pointer" }}>
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
        <span style={{ fontSize: 13.5, color: C.dim, marginRight: 10, maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{project.name}{saved ? ` · 저장됨 ${saved}` : ""}</span>
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
            <select value={rate} onChange={(e) => setRate(Number(e.target.value))} title="미리보기 빠르기" style={{ height: 34, borderRadius: 5, border: `1px solid ${C.line2}`, background: C.card, color: C.text, fontSize: 14, fontFamily: FONT }}>
              {[0.75, 1, 1.25, 1.5, 2].map((r) => <option key={r} value={r}>{r}배</option>)}
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
                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 14, color: C.sub }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}><Icon name={vis?.kind === "image" ? "image" : "video"} size={16} /><span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{vis ? vis.name : "화면 없음 (검은 화면)"}</span></div>
                    {c.type === "voice" ? <div style={{ display: "flex", gap: 8, alignItems: "center" }}><Icon name="voice" size={16} />{c.voice ? `AI 목소리 ${(c.voice.duration || 0).toFixed(1)}초` : "목소리 없음"}</div> : <div style={{ display: "flex", gap: 8, alignItems: "center" }}><Icon name="mic" size={16} />{c.muted ? "원본 소리 끔" : "원본 소리"}</div>}
                    {layersAt(project, c.id).map((l) => (
                      <button key={l.id} type="button" onClick={() => openLayer(l.id)} title="눌러서 고치기"
                        style={{ display: "flex", gap: 8, alignItems: "center", padding: 0, border: 0, background: "transparent", color: l.id === selLayer ? C.text : C.sub, fontSize: 14, fontFamily: FONT, cursor: "pointer", textAlign: "left" }}>
                        <Icon name={LAYER_ICON[l.type]} size={16} /><span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{layerTitle(l)}</span>
                      </button>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}
          <Hint>단어를 누르면 그 자리로 가요. 지울 단어를 누르고 [이 단어 지우기]를 누르면 그 부분이 영상에서 잘려요.</Hint>
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
              {(["simple", "detail"] as const).map((v) => <button key={v} type="button" onClick={() => setView(v)} style={{ height: 32, padding: "0 12px", border: 0, background: view === v ? C.card : "transparent", color: view === v ? C.text : C.sub, fontSize: 13.5, fontWeight: 700, fontFamily: FONT, cursor: "pointer" }}>{v === "simple" ? "개요" : "상세"}</button>)}
            </div>
          </div>
          {blank.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 24px", borderBottom: `1px solid ${C.line}`, background: C.panel, fontSize: 14.5 }}>
              <Icon name="image" size={18} />
              <span style={{ flex: 1 }}>화면이 비어 있는 클립이 {blank.length}개 있어요 (검은 화면으로 나와요). 사진이나 영상을 넣어 주세요.</span>
              <Btn small primary onClick={() => { setSelected(blank.map((x) => x.clip.id)); openLib("mine"); }}>빈 클립에 화면 넣기</Btn>
            </div>
          )}
          <div ref={listRef} style={{ flex: 1, overflowY: "auto", minHeight: 0 }} onClick={(e) => { if (e.target === e.currentTarget) { setSelected([]); setSelWord(null); } }}>
            <ClipList project={project} items={flat.items} selected={selected} selWord={selWord} curClip={cur?.clip.id || ""} curWord={curWord} busy={busy} actions={actions} view={view} lanes={lanes} selLayer={panel === "layer" ? selLayer : ""} onLayerDrag={dragLayer} onDropMedia={onDropMedia} onDropLayer={onDropLayer} />
          </div>
        </div>

        {/* 오른쪽 칸 */}
        {panel === "library" && <LibraryPanel key={`${libTab}${libOverlay}`} project={project} canReplace={selected.length > 0} onPick={onPick} initialTab={libTab} overlay={libOverlay}
          onClose={() => (libOverlay && overlayTarget && (project.layers || []).some((l) => l.id === overlayTarget) ? openLayer(overlayTarget) : setPanel(""))} />}
        {panel === "voice" && <VoicePanel project={project} targetCount={selected.filter((id) => findClip(project, id)?.clip.type === "voice").length} onApply={applyVoice} onClose={() => setPanel("")} />}
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
        {panel === "timing" && (() => {
          const ids = timingIds();
          const its = flat.items.filter((x) => ids.includes(x.clip.id));
          if (!its.length) return null;
          return (
            <TimingPanel clips={its.map((x) => x.clip)} nums={its.map((x) => flat.items.indexOf(x) + 1)} durs={its.map((x) => x.dur)}
              speeds={its.map((x) => (canSpeed(x.clip) ? (x.clip.type === "voice" ? speedOf(x.clip, project.settings) : srcSpeed(x.clip)) : null))}
              onSpeed={setSpeed} onLength={setLength} onReset={resetTiming} onClose={() => setPanel("")} />
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
        const a = it?.clip.visual ? project.assets[it.clip.visual.asset] : null;
        if (!it || !a || a.kind !== "video") return null;
        return <VideoStart key={startClip} asset={a} dur={it.dur} start={it.clip.visual?.s || 0} onClose={() => setStartClip("")}
          onApply={(s) => { change((p) => { const c = findClip(p, startClip)?.clip; if (c?.visual) c.visual.s = s; }); say(s > 0 ? "시작점을 바꿨어요" : "처음부터 나가요"); }} />;
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
            onStart={canStart(c) ? () => setStartClip(c.id) : undefined} sound={soundOf(c)}
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
        <Modal title="글 클립 넣기 (AI 목소리)" onClose={() => setDialog("")} width={620} footer={<><Btn onClick={() => setDialog("")}>취소</Btn><Btn primary onClick={doAddText} disabled={!addText.trim()}>넣기</Btn></>}>
          <div style={{ padding: 20 }}>
            <div style={{ ...label, marginBottom: 8 }}>AI 목소리가 읽을 글</div>
            <textarea value={addText} onChange={(e) => setAddText(e.target.value)} rows={7} autoFocus placeholder={"문장마다 클립 하나가 돼요.\n예) 이번에 소개할 곳은 논현동 빌라입니다. 지하철역까지 걸어서 5분이에요."}
              style={{ ...input, height: "auto", padding: 12, lineHeight: 1.6, resize: "vertical" }} />
            <div style={{ fontSize: 13.5, color: C.sub, marginTop: 8 }}>{selected.length ? "고른 클립 뒤에" : "맨 끝에"} 넣어요. 화면은 앞 클립과 같게 시작해요.</div>
          </div>
        </Modal>
      )}
      {dialog === "find" && <FindDialog project={project} onJump={(id) => { setDialog(""); actions.selectClip(id, false); document.querySelector(`[data-clip="${id}"]`)?.scrollIntoView({ block: "center" }); }} onClose={() => setDialog("")} />}
      {dialog === "help" && (
        <Modal title="쉬운 사용법" onClose={() => setDialog("")} width={640}>
          <div style={{ padding: 22, fontSize: 15.5, lineHeight: 1.9, color: C.text }}>
            <div>1. <b>단어를 누르면</b> 그 자리로 가요. [이 단어 지우기]를 누르면 그 부분이 영상에서 잘려요.</div>
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
