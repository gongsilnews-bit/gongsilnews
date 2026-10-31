"use client";

// 편집 화면 — 브루와 같은 짜임: 맨 위 탭 + 리본, 왼쪽 미리보기, 가운데 클립 목록, 오른쪽 자료·설정 칸
// 진짜 편집이 되면서 어르신도 쉽게: 모든 기능을 눈에 보이는 단추로, 되돌리기, 자동 저장
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SubFormatBar } from "./SubFormatBar";
import type { Asset, Clip, Keyframe, KfProp, Layer, LibItem, MotionOpts, Project, Ratio, Roll, Scene, StockItem, VolKf, Word } from "./types";
import MotionDialog from "./MotionDialog";
import MotionAutoDialog, { type AutoRun } from "./MotionAutoDialog";
import { STYLE_PACKS, outroOfIntro, packOfIntro } from "./stylePacks";
import { SUB_PRESETS } from "./SubPresets";
import { MUSIC_LIBRARY } from "@/lib/reels/music-catalog";
import { DRAG_MEDIA, DRAG_STICKER, RATIO_LABEL, RATIO_SIZE, autoSubPosition, errText, fmtTime, isStopped, stickerDrag, uid, videoBridge } from "./types";
import { IMAGE_STYLES, imagePrompt } from "@/lib/studio-video/imageStyles";
import { chainVisuals, layLeads, tailGap, layRolls, zLayers, gapOf, voiceGap, clipOrder, clipText, flatten, isPhotoClip, layerSpan, subtitleLines, keepRanges, layerItems, layersAt, speedOf, splitScript, srcSpeed, subStyleOf, wordTimes, layerRange, kfAt, kfUpsert, kfIndexAt, kfSort, kfAny, kfHasAt, kfSetProps, kfToggleProp, kfClearProps, kfMoveProps, cropOf, KF_PROPS, clipKeyBase, clipBaseRect, imgRect, clipDuration, sourceTimeAt } from "./timeline";
import Timeline, { AudioMeter, type Pick, type TlTool, type TrackOp } from "./TimelineView";
import { EffectControls, type EcGroup } from "./EffectControls";
import { PropsFrame, Transform, TimeBox, Sec, SlimRow, Chip, Embed } from "./TimelineProps";
import { AdjustBox, Bar as KfBar } from "./Keyframes";
import MediaMenu, { QuickMenu, QuickSlider, QuickText, RatioBox, SoundMenu, quickChip, type MediaFit, type MediaOrder } from "./MediaMenu";
import { NewClipDialog, type NewClipSpec } from "./NewClip";
import { fixByScript, scriptSentences } from "./scriptFix";
import VideoStart from "./VideoStart";
import RollDialog, { newRoll } from "./RollDialog";
import { addExtraVoices, findVoice, setMyVoiceName } from "@/lib/studio-video/voices";
import Player, { type PlayerHandle } from "./Player";
import ClipList, { AllBox, type ClipActions } from "./ClipList";
import { LibraryPanel, MusicPanel, RatioPanel, SubtitlePanel, VoicePanel, type LibPickAction } from "./Panels";
import { Btn, C, FONT, Hint, Icon, Modal, Working, input, label } from "./ui";
import { TransBin, TransPanel, type TransDrop } from "./TransPanel";
import { SourceMonitor, type SrcRange } from "./SourceMonitor";
import { ThumbPanel } from "./ThumbPanel";
import { AiEditPanel } from "./AiEdit";
import { bakeAnim } from "./AnimBake";
import { focusTextBasic, resetTextTabs } from "./TextTabs";
import { SfxInsertPanel, TextInsertPanel } from "./InsertPanels";
import { ChannelMark, PostDialog } from "./PostDialog";
import type { TextLook } from "./SubPresets";
import { StickerPanel, stickerFileName, stickerPng, stickerSpecOf, warmStickers } from "./Stickers";
import { TemplatePanel, drawTemplate, isTplStyle, tplFonts, tplOptsOf } from "./Templates";
import type { SubLook } from "./SubPresets";
import { AnimPanel, type AnimBodyProps } from "./Anim";
import { TRANS_DEFAULT, TRANS_MAX, TRANS_MIN, TRANSITIONS, transLabel } from "./transitions";
import { isSticker, isVideoLayer, layerIcon, layerName, LANE_W, zCan, zReorder, LayerPanel, LayerPopup, SourcePanel, VisualPanel, computeLanes, layerTitle } from "./Layers";

/** 타임라인 편집 왼쪽 자료 칸에 뜨는 칸 */
const LIB_KINDS: string[] = ["library", "text", "sticker", "tplText", "tplSticker", "sfx", "music", "aiedit", "aimake"];

type PanelKind = "" | "library" | "voice" | "subtitle" | "ratio" | "music" | "layer" | "visual" | "timing" | "source" | "trans" | "anim" | "subanim" | "aiedit" | "aimake" | "sticker" | "text" | "sfx" | "tplText" | "tplSticker" | "thumb";
type RibbonBtn = { icon: string; label: string; onClick?: () => void; disabled?: boolean; title?: string } | { node: React.ReactNode } | "|";

const TABS = ["파일", "홈", "편집", "자막", "서식", "삽입", "AI 목소리", "효과", "도움말"] as const;

/** 변형(자리·크기·회전·진하기)을 고칠 대상 — 사진·스티커·글자 레이어 / 클립 화면 / 클립 메인자막 */
type XfTarget = { kind: "layer" | "clip" | "sub"; id: string };

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
  const [voiceMe, setVoiceMe] = useState(false); // 목소리 창을 [내 목소리] 탭으로 열기
  useEffect(() => {
    b.typecast?.voices().then((v) => { addExtraVoices(v.map((x) => ({ id: x.id, name: x.name }))); setVoiceNameTick((x) => x + 1); }).catch(() => {});
    b.eleven?.voices().then((v) => { addExtraVoices(v.map((x) => ({ id: x.id, name: x.name, kind: "일레븐랩스 성우" }))); setVoiceNameTick((x) => x + 1); }).catch(() => {});
  }, [b]);
  // 내 목소리 이름 (예: 공실뉴스편집장) — 클립 목소리 단추에 "내 목소리" 대신 그 이름
  const [, setVoiceNameTick] = useState(0);
  useEffect(() => {
    b.myVoice?.status().then((st) => { setMyVoiceName(st?.name); setVoiceNameTick((x) => x + 1); }).catch(() => {});
  }, [b]);
  const [panel, setPanel] = useState<PanelKind>("");
  // 텍스트로 만들기 [AI가 다 꾸미기] — 열리자마자 AI 편집(자막 스타일·효과·스티커) 시작
  const [aiAuto] = useState(() => Boolean(initial.settings?.aiAuto));
  useEffect(() => {
    if (aiAuto) setPanel("aiedit");
  }, [aiAuto]);
  useEffect(() => {
    // 목소리 창을 닫으면 (이름을 바꿨을 수 있어서) 다시 읽는다
    if (panel) return;
    b.myVoice?.status().then((st) => { setMyVoiceName(st?.name); setVoiceNameTick((x) => x + 1); }).catch(() => {});
  }, [b, panel]); // eslint-disable-line react-hooks/exhaustive-deps
  const [animTarget, setAnimTarget] = useState(""); // 애니메이션 칸이 맡은 사진·글자 레이어
  // 애니메이션을 고르면 미리보기에서 그 구간을 잠깐 틀어 보여 준다 (a~b = 영상 전체 시각)
  const demoTimer = useRef(0);
  const demoPlay = (a: number, b: number, part: "in" | "out" | "all") => {
    const pl = player.current;
    if (!pl || !(b > a)) return;
    const dur = 1.6;
    const from = part === "out" ? Math.max(a, b - dur) : a;
    const to = part === "out" ? b - 0.02 : Math.min(b - 0.02, a + (part === "in" ? 1.4 : 2.4));
    window.clearTimeout(demoTimer.current);
    pl.pause();
    pl.seek(from + 0.001);
    pl.play();
    demoTimer.current = window.setTimeout(() => { player.current?.pause(); player.current?.seek(to); }, Math.max(300, (to - from) * 1000));
  };
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
  // 편집 방식 — 텍스트 편집(브루식) / 타임라인 편집(캡컷식). 같은 프로젝트를 두 가지로 본다 (회의 10-19 A안, 2026-10-20). 이 PC 에 기억
  const [mode, setModeState] = useState<"text" | "timeline">(() => {
    try {
      return localStorage.getItem("studioVideo.mode") === "timeline" ? "timeline" : "text";
    } catch {
      return "text";
    }
  });
  const setMode = (m: "text" | "timeline") => {
    setModeState(m);
    try {
      localStorage.setItem("studioVideo.mode", m);
    } catch {}
    // 미리보기가 새 자리에서 다시 생기므로 — 보던 시각 그대로
    const t = player.current?.time() ?? 0;
    setTimeout(() => player.current?.seek(t), 60);
  };
  // 타임라인에서 고른 것 중 클립·레이어가 아닌 것 — 메인자막·AI 목소리·원본(영상) 소리·화면전환 (id = 클립 id)
  const [tlSel, setTlSel] = useState<{ kind: "sub" | "voice" | "src" | "trans"; id: string } | null>(null);
  // 타임라인 편집 — 위(미리보기) 높이, 경계선을 끌어 바꾼다 (이 PC 에 기억)
  const [tlTop, setTlTop] = useState(0);
  useEffect(() => {
    try {
      const v = Number(localStorage.getItem("studioVideo.tlTop"));
      if (v >= 200) setTlTop(v);
    } catch {}
  }, []);
  const [dialog, setDialog] = useState<"" | "export" | "formats" | "addText" | "help" | "find" | "saveAs" | "autoSub" | "silence">("");
  const [autoScope, setAutoScope] = useState<"empty" | "selected" | "all">("empty");
  const [photoHintHide, setPhotoHintHide] = useState(false); // 클립 목록 위 "사진 클립에 글 쓰기" 안내 줄 닫기
  const [autoSubHide, setAutoSubHide] = useState(false); // 클립 목록 위 "자동 자막" 안내 줄 닫기
  const [work, setWork] = useState<{ title: string; detail?: string; frac?: number | null } | null>(null);
  const [selLayer, setSelLayer] = useState("");
  const [subPick, setSubPick] = useState<{ clipId: string; n: number } | null>(null); // 자막 아이콘으로 미리보기 자막 고르기
  const [subClip, setSubClip] = useState(""); // 오른쪽 메인자막 속성이 보여 주는 클립 — 메인자막 아이콘을 누른 그 클립 (클립을 옮겨도 따라가지 않는다, 2026-10-25 사장님)
  const [pop, setPop] = useState<{ id: string; x: number; y: number } | null>(null); // 아이콘 옆 작은 메뉴
  const [visualClip, setVisualClip] = useState(""); // 오른쪽 화면 속성 칸의 클립
  const [subMode, setSubMode] = useState<"all" | "sel">("all"); // 메인자막 서식 적용 범위
  const [soundScope, setSoundScope] = useState<"one" | "sel" | "all">("one"); // 소리 칩 메뉴 적용 범위 — 처음엔 늘 [이 클립에만]
  const [soundPop, setSoundPop] = useState<{ id: string; x: number; y: number; lenOnly?: boolean } | null>(null); // 소리 칩 옆 작은 창 (오른쪽 시간을 누르면 길이만)
  const [startClip, setStartClip] = useState(""); // 비디오 시작점 변경 창의 클립
  const [startLayer, setStartLayer] = useState(""); // 화면 위 영상의 시작점 변경 (2026-10-21 사장님)
  const [rollEdit, setRollEdit] = useState<Roll | null>(null); // 영상 이어 깔기 창 (컷편집처럼)
  const [media, setMedia] = useState<{ kind: "clip" | "layer"; id: string; x: number; y: number } | null>(null); // 사진·영상 메뉴
  // 메인 화면 잠금 — 미리보기에서 기본은 안 잡힘. 이 클립 id 일 때만 옮기기·크기 (2026-10-21 사장님: 다른 요소를 고르다 자꾸 잡히고 사진 움직임이 풀림)
  const [visualOpen, setVisualOpen] = useState("");
  const [previewMenu, setPreviewMenu] = useState<{ x: number; y: number; target: string; clipId: string } | null>(null); // 미리보기 오른쪽 클릭
  const [ratioMenu, setRatioMenu] = useState<{ x: number; y: number } | null>(null); // 위쪽 화면 비율 단추 (2026-10-21 사장님)
  const [quick, setQuick] = useState<{ kind: "sub" | "trans"; id: string; x: number; y: number } | null>(null); // 메인자막·화면전환 아이콘 메뉴 (2026-10-21)
  const [libOverlay, setLibOverlay] = useState(false); // 자료 칸을 "사진 올리기"로 열었는지
  const [overlayTarget, setOverlayTarget] = useState(""); // 사진을 바꿀 애셋
  const [stickerTarget, setStickerTarget] = useState("");
  const [elTip, setElTip] = useState<{ text: string; x: number; y: number } | null>(null); // 오른쪽 위 요소 단추 이름 (마우스를 올리면 바로) // [스티커 바꾸기] — 모양을 바꿀 스티커 (비면 새로 넣기)
  const [musicTarget, setMusicTarget] = useState(""); // 음악을 바꿀 애셋
  const clipboard = useRef<Clip[]>([]);
  const [learn, setLearn] = useState<{ wrong: string; right: string; context: string; on: boolean }[] | null>(null); // 받아쓰기 낱말장에 넣을까
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
  // 스티커 칸 미리 준비 (글꼴·첫 분류 그림) — 편집 화면이 뜨고 잠시 뒤 쉬는 틈에
  useEffect(() => {
    const t = setTimeout(warmStickers, 4000);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    // 위 머리줄이 보이면 그 높이만큼 뺀다 (메뉴를 완전히 숨기면 머리줄도 숨는다, 2026-10-24)
    const on = () => {
      const head = document.querySelector<HTMLElement>("[data-admin-head]");
      setWin({ w: window.innerWidth, h: window.innerHeight - (head?.offsetHeight || 0) });
    };
    on();
    const raf = requestAnimationFrame(on);
    window.addEventListener("resize", on);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", on);
    };
  }, [railHidden]);

  const setProject = (next: Project, history = true) => {
    if (history) {
      hist.current.past.push(JSON.stringify(pref.current));
      if (hist.current.past.length > 100) hist.current.past.shift();
      hist.current.future = [];
    }
    pref.current = next;
    setProjectState(next);
  };
  // 녹화를 열자마자 뒤에서 자막을 만드는 동안(2026-10-28 사장님) — 보기·듣기만, 고치기는 잠시 막는다 (끝난 자막과 엉키지 않게)
  const subLock = useRef<null | (() => void)>(null);
  const change = useCallback((fn: (p: Project) => void, history = true) => {
    if (subLock.current && history) return subLock.current(); // 앱이 스스로 하는 바로잡기(history=false)는 그대로
    const prev = pref.current;
    const next = structuredClone(prev) as Project;
    fn(next);
    fixLayers(prev, next);
    chainVisuals(next); // 화면 영상 이어 붙이기 — 클립 길이가 바뀌어도 이어지게
    layLeads(next); // 앞 클립 모자란 끝을 이 클립 영상으로 앞당겨 채우기
    layRolls(next); // 영상 이어 깔기 — 클립 길이가 바뀌어도 시간 순서대로 다시 깐다
    setProject(next, history);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // 프로젝트를 열면 한 번 — 이어 붙이기 시작점 바로잡기 (예전에 남은 잘못된 시작점, 2026-10-21). 되돌리기 기록 없이
  useEffect(() => {
    const t = setTimeout(() => change(() => {}, false), 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id]);
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
  // 처음 열 때의 프로젝트 — 이것과 같으면 고친 게 아니다 (2026-10-20: 예전엔 "첫 번째 실행만 건너뛰기"라서,
  //  개발판(React 엄격 모드)이 효과를 두 번 돌리면 아무것도 안 고쳐도 "저장 안 함"이 떴다)
  const opened = useRef(project);
  // 마지막으로 저장한 내용 — 이것과 내용이 같으면 고친 게 아니다 (2026-10-28 사장님: 고친 게 없는데도 늘 "저장하지 않은 내용"이 떴다.
  //  열자마자 앱이 스스로 채우는 값(길이 재기·미리보기 그림 등)이나 시각만 바뀐 것은 고친 것으로 치지 않는다)
  const snapOf = (p: unknown) => JSON.stringify(p, (k, v) => (k === "updatedAt" || k === "savedAt" ? undefined : v));
  const savedSnap = useRef(snapOf(project));
  const openedAt = useRef(Date.now());
  const markSaved = (p: unknown = pref.current) => { savedSnap.current = snapOf(p); };
  useEffect(() => {
    if (project === opened.current) return;
    const s = snapOf(project);
    if (Date.now() - openedAt.current < 2500 && !dirtyRef.current) savedSnap.current = s; // 열면서 앱이 채운 값
    setDirty(s !== savedSnap.current);
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
    const need = c.fitLen - (dur / speedOf(c, p.settings) + voiceGap(c, p.settings));
    c.pad = need > 0.01 ? +need.toFixed(2) : undefined;
    if (need < -0.3) setTimeout(() => say(`글이 영상보다 ${(-need).toFixed(1)}초 길어요 — 글을 줄이거나 목소리를 조금 빠르게 해 주세요`), 0);
  };

  /**
   * 글 없는 AI 목소리 클립인데 화면이 소리 있는 영상이면 — 원본 영상 클립으로 (원본 소리 크기는 그대로 이어서).
   * 원본 영상에 AI 목소리를 얹었다가 글을 다 지운 경우. 바꿨으면 true
   */
  const toSource = (c: Clip, p: Project): boolean => {
    if (c.type !== "voice" || clipText(c).trim() || !c.visual) return false;
    const a = p.assets[c.visual.asset];
    if (!a || a.kind !== "video" || a.hasAudio === false) return false;
    const s0 = c.visual.s || 0;
    const len = c.fitLen || c.hold || Math.max(0.3, (a.duration || s0 + 3) - s0);
    c.type = "source";
    c.src = { asset: c.visual.asset, s: s0, e: +Math.min(a.duration || s0 + len, s0 + len).toFixed(3) };
    c.volume = c.visualVolume && Math.abs(c.visualVolume - 1) > 0.001 ? c.visualVolume : undefined;
    c.muted = c.visualVolume ? undefined : true;
    c.voice = null;
    c.text = "";
    c.words = [];
    delete c.visual;
    delete c.visualVolume;
    delete c.fitLen;
    delete c.pad;
    delete c.hold;
    delete c.voiceId;
    delete c.speed;
    return true;
  };
  // 열려 있는 프로젝트에 이미 그런 클립이 있으면 한 번 고친다
  useEffect(() => {
    const need = flatten(pref.current).items.some((x) => {
      const c = x.clip;
      const a = c.visual ? pref.current.assets[c.visual.asset] : null;
      return c.type === "voice" && !clipText(c).trim() && a?.kind === "video" && a.hasAudio !== false && (c.fitLen || typeof c.visualVolume === "number");
    });
    if (need) change((p) => { for (const sc of p.scenes) for (const c of sc.clips) if (c.fitLen || typeof c.visualVolume === "number") toSource(c, p); }, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project]);

  /* ── AI 목소리 만들기 (한 번에 3개씩) ── */
  /** fresh — [목소리 다시 만들기]: 저장해 둔 목소리를 쓰지 않고 새로 만든다 (내 목소리처럼 만들 때마다 다른 것) */
  const revoice = useCallback(async (ids: string[], fresh = false) => {
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
            toSource(c, p);
          }, false);
          continue;
        }
        setBusy((x) => ({ ...x, [id]: "목소리 만드는 중…" }));
        const t0 = Date.now();
        try {
          const base = f.clip.voiceId || pref.current.settings.voice.id;
          // 타입캐스트 성우 — 감정(기본 "스마트": 앞뒤 문장에 맞춰 말투), 앞뒤 클립 글을 같이 보낸다
          const its0 = flatten(pref.current).items;
          const k0 = its0.findIndex((x) => x.clip.id === id);
          const tcOpts = { emotion: (pref.current.settings.voice as { emotion?: string }).emotion, prev: k0 > 0 ? clipText(its0[k0 - 1].clip) : "", next: k0 >= 0 && its0[k0 + 1] ? clipText(its0[k0 + 1].clip) : "" };
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
            for (const r of runs) parts.push(await b.voice(pref.current.dir, r.tokens.join(" "), r.v, { fresh, ...tcOpts }));
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
            const r = await b.voice(pref.current.dir, text, base, { fresh, ...tcOpts });
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
    // 요청이 몰려 기다리는 동안 만드는 중인 클립 표시를 바꾼다 (2026-10-31)
    const offWait = b.onVoiceWait?.((w) => setBusy((x) => Object.fromEntries(Object.entries(x).map(([id, t]) => [id, /목소리 만드는|기다리는 중/.test(String(t)) ? (w.sec ? `몰려서 ${w.sec}초 기다리는 중…` : "목소리 만드는 중…") : t]))));
    await Promise.all([one(), one()]); // 둘씩 (셋이면 성우 API 분당 한도에 자주 걸렸다, 2026-10-23)
    offWait?.();
  }, [b, change]);
  // 목소리 없는 클립 — 프로젝트를 열면 저절로 다시 만든다 (2026-10-23 사장님: 목소리 없음이 너무 자주). 글이 있고 끄지 않은 클립만, 열 때 한 번
  const autoVoiced = useRef("");
  useEffect(() => {
    const key = project.file || project.dir;
    if (!key || autoVoiced.current === key) return;
    autoVoiced.current = key;
    const ids = flatten(pref.current).items.filter((x) => x.clip.type === "voice" && !x.clip.voice && !x.clip.muted && clipText(x.clip).trim()).map((x) => x.clip.id);
    if (ids.length) void revoice(ids);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.file, project.dir]);

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

  /**
   * AI 목소리 클립 나누기 — 목소리를 다시 만들지 않고 같은 소리 파일을 cut 초(이 클립 구간 안, 빠르기 전)에서 둘로 (2026-10-20 사장님)
   *  앞 조각: 파일 o ~ o+cut, 뒤에 쉼 없음(말이 바로 이어진다) · 뒤 조각: o+cut ~ 끝, 원래 쉼·늘린 길이는 뒤 조각에
   *  단어 시각은 뒤 조각 시작만큼 당긴다. c·second 는 이미 단어를 나눠 둔 사본
   */
  const splitVoice = (c: Clip, second: Clip, cut: number) => {
    const v = c.voice!;
    const o = Number(v.o) || 0;
    const t = Math.max(0.05, Math.min(v.duration - 0.05, cut));
    c.voice = { ...v, o, duration: +t.toFixed(3), ng: true };
    const nv: NonNullable<Clip["voice"]> = { ...v, o: +(o + t).toFixed(3), duration: +(v.duration - t).toFixed(3) };
    if (!v.ng) delete nv.ng;
    second.voice = nv;
    second.words = (second.words || []).map((w) => ({ ...w, s: +Math.max(0, w.s - t).toFixed(3), e: +Math.max(0, w.e - t).toFixed(3) }));
    delete c.pad;
  };

  const actions: ClipActions = {
    selectClip: (id, multi) => {
      setSelWord(null);
      // 클립을 고르면 고른 요소(글자·스티커·사진)는 놓는다 — 마지막에 고른 것이 Delete 로 지워진다 (2026-10-20 사장님: 클립 고르고 삭제하면 클립이)
      // 텍스트 속성을 보던 중이면 텍스트 첫 페이지로 (2026-10-25)
      if (selLayer) { const wasText = (pref.current.layers || []).find((x) => x.id === selLayer)?.type === "text"; setSelLayer(""); if (panel === "layer" || panel === "anim") setPanel(wasText && panel === "layer" ? "text" : ""); }
      // 메인자막 속성을 보던 중 다른 클립 카드를 누르면 — 속성이 따라가지 않고 텍스트 첫 페이지로. 체크칸(여러 개 고르기)은 그대로 두어 [선택 클립 적용]을 쓴다
      if (!multi && subClip && (panel === "subtitle" || panel === "subanim") && id !== subClip) setPanel("text");
      if (multi) setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
      else {
        setSelected([id]);
        // 재생 중에 클립을 누르면 멈추고 그 클립 처음으로 (2026-10-19 사장님)
        if (player.current?.playing()) player.current.pause();
        seekClip(id);
      }
    },
    selectMany: (ids, on) => {
      setSelWord(null);
      if (selLayer) { setSelLayer(""); if (panel === "layer" || panel === "anim") setPanel(""); }
      setSelected((s) => (on ? [...s, ...ids.filter((id) => !s.includes(id))] : s.filter((id) => !ids.includes(id))));
    },
    selectWord: (clipId, i, multi) => {
      if (subClip && (panel === "subtitle" || panel === "subanim") && clipId !== subClip) setPanel("text"); // 다른 클립 단어 — 텍스트 첫 페이지로
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
      if (player.current?.playing()) player.current.pause(); // 재생 중이면 멈추고 그 단어로
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
          second.words = bw;
          second.text = bw.filter((w) => !w.del).map((w) => w.w).join(" ");
          // 목소리는 다시 만들지 않고 같은 소리 파일을 나눠 쓴다 (2026-10-20 사장님)
          if (c.voice && a.length && bw.length) splitVoice(c, second, (a[a.length - 1].e + bw[0].s) / 2);
          else {
            c.voice = null;
            second.voice = null;
          }
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
      // 목소리는 다시 만들지 않는다 — 같은 소리 파일을 나눠 쓴다 (2026-10-20 사장님). 목소리가 없던 클립만 새로
      if (f.clip.type === "voice" && !findClip(pref.current, clipId)?.clip.voice) revoice([clipId, newId]);
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
      if (c && c.type !== "voice") setPanel("source"); // AI 목소리 칩은 작은 메뉴만 — 목소리 설정은 가운데 큰 창이라 [AI 목소리 바꾸기]를 누를 때만
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
      setSoundPop({ id, x: x ?? (r ? r.left - 200 : 400), y: y ?? (r ? r.bottom + 6 : 300), lenOnly: true });
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
    // 클립 끌어 옮기기 — 옮기는 클립들은 목록 순서대로 붙여서 대상 클립 앞/뒤에 (빈 씬은 지운다, 첫 씬은 남긴다)
    moveClips: (ids, targetId, before) => {
      if (ids.includes(targetId)) return;
      change((p) => {
        const order = flatten(p).items.map((x) => x.clip.id);
        const want = order.filter((id) => ids.includes(id));
        const moved: Clip[] = [];
        for (const id of want) {
          const f = findClip(p, id);
          if (!f) continue;
          moved.push(f.clip);
          f.scene.clips.splice(f.idx, 1);
        }
        const t = findClip(p, targetId);
        if (!t || !moved.length) return;
        t.scene.clips.splice(before ? t.idx : t.idx + 1, 0, ...moved);
        p.scenes = p.scenes.filter((sc, i) => sc.clips.length || i === 0);
      });
      setSelected(ids);
      // 파란 테두리(재생 위치)도 옮긴 클립으로 — 옮긴 클립 중 맨 앞 클립의 처음으로
      const first = flatten(pref.current).items.find((x) => ids.includes(x.clip.id));
      if (first) {
        player.current?.pause();
        seekClip(first.clip.id, 0.01);
      }
      say(ids.length > 1 ? `클립 ${ids.length}개를 옮겼어요` : "클립을 옮겼어요");
    },
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
    // 씬 합치기 — 이 씬의 클립을 바로 위(클립이 있는) 씬 끝에 붙인다. 이름은 위 씬 것 (2026-10-19 사장님)
    sceneMergeUp: (sceneId) => {
      let ok = false;
      change((p) => {
        const si = p.scenes.findIndex((x) => x.id === sceneId);
        let ti = si - 1;
        while (ti >= 0 && !p.scenes[ti].clips.length) ti--;
        if (si <= 0 || ti < 0) return;
        p.scenes[ti].clips.push(...p.scenes[si].clips);
        p.scenes.splice(ti + 1, si - ti); // 사이의 빈 씬도 함께 없앤다
        ok = true;
      });
      say(ok ? "위 씬과 합쳤어요 (Ctrl+Z 로 되돌리기)" : "합칠 위 씬이 없어요");
    },
    renameScene: (sceneId, title) => {
      const t = String(title || "").replace(/\s+/g, " ").trim().slice(0, 30);
      const cur = pref.current.scenes.find((x) => x.id === sceneId);
      if (!cur || (cur.title || "") === t) return;
      change((p) => {
        const sc = p.scenes.find((x) => x.id === sceneId);
        if (sc) sc.title = t || undefined;
      });
    },
    play: (id) => {
      seekClip(id);
      setTimeout(() => player.current?.play(), 50);
    },
    stop: () => player.current?.pause(),
    // 단어 단추 막대 ✂ ⧉ 📋 — 고른 단어를 (Ctrl+X·C·V 와 같다). 단어를 안 골랐으면 클립을
    cutClip: (id) => {
      if (selWord?.clip === id) {
        if (copyWords()) deleteWords();
        return;
      }
      const c = findClip(pref.current, id)?.clip;
      if (!c) return;
      clipboard.current = [structuredClone(c)];
      lastCopy.current = "clips";
      actions.removeClip([id]);
    },
    copyClip: (id) => {
      if (selWord?.clip === id) {
        copyWords();
        return;
      }
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
      if (kind === "sticker") { setStickerTarget(""); return setPanel("sticker"); } // 단어를 골랐으면 그 말 할 때만
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
      say("AI 목소리를 넣었어요 · 영상 소리 크기는 썸네일을 눌러 [볼륨 조절]에서 바꿔요");
    },
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
    pickSub: (id) => {
      if (!(selected.length > 1 && selected.includes(id))) actions.selectClip(id, false); // 여러 개 체크해 둔 클립 중 하나면 체크 그대로 ([선택 클립 적용])
      setSubClip(id);
      setSelLayer("");
      setSubPick({ clipId: id, n: Date.now() });
      setPanel("subtitle");
    },
    toggleVisualLock: (id) => { if (visualOpen === id) setVisualOpen(""); else openVisualXf(id); },
    // 메인자막 아이콘 — 메뉴는 그대로 띄우고, 오른쪽 칸도 [텍스트](이 클립 메인자막 속성)로 (2026-10-25 사장님)
    openSubMenu: (id, x, y) => { setMedia(null); actions.pickSub?.(id); setQuick({ kind: "sub", id, x, y }); },
    openTransMenu: (id, x, y) => { setMedia(null); setQuick({ kind: "trans", id, x, y }); },
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
    // 말한 내용 고치기 — 자동 자막이 잘못 알아들었을 때. 단어 칸을 새 글로 바꾸고 단어 시각을 실제 말소리에 다시 맞춘다 (PC에서, 무료)
    editSpoken: async (id, text) => {
      const t = text.replace(/\s+/g, " ").trim();
      const c0 = findClip(pref.current, id)?.clip;
      if (!c0?.src || c0.type !== "source") return;
      if (!t) return say("말한 내용을 적어 주세요");
      if (!b.realign) return say("공실마케팅를 껐다 켜 주세요 (말한 내용 고치기 기능을 새로 연결해요)");
      setWork({ title: "단어 시각을 말소리에 맞추는 중… (PC에서)" });
      try {
        const before = (c0.words || []).map((w) => w.w);
        const [r] = await b.realign(pref.current, [{ id, asset: c0.src.asset, s: c0.src.s, e: c0.src.e, text: t }]);
        if (!r?.words?.length) return say("단어 시각을 맞추지 못했어요");
        change((p) => {
          const c = findClip(p, id)?.clip;
          if (!c) return;
          c.words = r.words; // 지운 단어 표시는 새로 시작 (글이 바뀌었으니)
          c.text = t;
          delete c.subText;
        });
        setSelWord(null);
        say("말한 내용을 고쳤어요 — 단어 칸·자막이 함께 바뀌었어요");
        // 받아쓰기 낱말장 — 바뀐 낱말을 찾아 "다음에도 이렇게 고칠까요?" (회의 3-18)
        const pairs = changedWords(before, t.split(" "));
        if (pairs.length && b.sttWords) setLearn(pairs.map((x) => ({ ...x, on: true })));
      } catch (e) {
        say(errText(e));
      } finally {
        setWork(null);
      }
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
    // 나눴던 목소리 클립을 다시 합치면 — 같은 소리 파일에서 이어지는 구간이라 다시 만들지 않고 붙인다 (2026-10-20)
    const sameVoice = allVoice && clips.every((c, i) => c.voice && (!i || (c.voice.file === clips[0].voice!.file && Math.abs((Number(c.voice.o) || 0) - (Number(clips[i - 1].voice!.o) || 0) - clips[i - 1].voice!.duration) < 0.002)));
    change((p) => {
      const first = findClip(p, order[0])!;
      const c = first.clip;
      const rest = order.slice(1).map((id) => findClip(p, id)!.clip);
      if (allVoice && sameVoice) {
        let off = c.voice!.duration;
        const words = [...(c.words || [])];
        for (const r of rest) {
          for (const w of r.words || []) words.push({ ...w, s: +(w.s + off).toFixed(3), e: +(w.e + off).toFixed(3) });
          off += r.voice!.duration;
        }
        const last = rest[rest.length - 1];
        c.words = words;
        c.text = words.filter((w) => !w.del).map((w) => w.w).join(" ");
        c.voice = { ...c.voice!, duration: +off.toFixed(3), ng: last.voice!.ng };
        if (!c.voice.ng) delete c.voice.ng;
        if (last.pad) c.pad = last.pad;
        else delete c.pad;
      } else if (allVoice) {
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
    if (allVoice && !sameVoice) revoice([order[0]]);
    say("클립을 합쳤어요");
  };

  /* ── 자동 자막 — 녹화·촬영 영상 클립의 말소리를 글로 (지금 클립은 그대로, 글만 채움). 소리만 서버로, AI 비용 있음 ── */
  const [bgSub, setBgSub] = useState<{ title: string; frac: number | null } | null>(null);
  const bgStop = useRef(false);
  const autoSub = async (ids: string[], bg = false) => {
    if (!b.transcribeClips) return say("공실마케팅를 껐다 켜 주세요 (자동 자막 기능을 새로 연결해요)");
    const targets = ids
      .map((id) => findClip(pref.current, id)?.clip)
      .filter((c): c is Clip => Boolean(c && c.type === "source" && c.src))
      .map((c) => ({ id: c.id, asset: c.src!.asset, s: c.src!.s, e: c.src!.e }));
    setDialog("");
    if (!targets.length) return say("받아쓸 클립이 없어요 (녹화·촬영 영상 클립만 돼요)");
    // bg: 화면을 막지 않고 뒤에서 — 영상은 바로 보고, 위쪽 작은 띠에 진행 · [그만]
    if (bg) {
      bgStop.current = false;
      setBgSub({ title: "자막 만드는 중…", frac: null });
      subLock.current = () => say("자막을 만드는 중이에요 — 끝나면 고칠 수 있어요 (필요 없으면 위쪽 [그만])");
    } else setWork({ title: "말소리를 글로 바꾸는 중…" });
    const off = b.onProgress((t, f) => (bg ? setBgSub({ title: t, frac: typeof f === "number" ? f : null }) : setWork({ title: t, frac: typeof f === "number" ? f : null })));
    try {
      const r = await b.transcribeClips(pref.current, targets);
      subLock.current = null;
      if (bg && bgStop.current) return;
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
      // 녹화 대본(프롬프터)이 있으면 — 받아쓴 낱말 중 대본과 거의 같은 것만 대본 글자로 (따로 되돌릴 수 있게 한 번 더)
      const script = pref.current.recScript;
      let fixedN = 0;
      if (script) {
        const ss = scriptSentences(script);
        change((p) => {
          delete p.recScript;
          for (const sc of p.scenes) for (const c of sc.clips) {
            if (c.type !== "source" || !c.words?.length) continue;
            const r = fixByScript(c.words, ss);
            if (!r.fixed) continue;
            c.words = r.words;
            c.text = r.words.filter((w) => !w.del).map((w) => w.w).join(" ");
            fixedN += r.fixed;
          }
        });
      }
      say(n ? `자막을 만들었어요 — 문장마다 나눠 클립 ${made}개${fixedN ? ` · 대본으로 낱말 ${fixedN}개를 고쳤어요 (밑줄, 되돌리기 Ctrl+Z)` : ""}` : "말소리를 찾지 못했어요");
    } catch (e) {
      say(errText(e));
    } finally {
      off();
      subLock.current = null;
      if (bg) setBgSub(null);
      else setWork(null);
    }
  };
  // 오디오로 편집하기·녹화 — 처음 열면 받아쓰기를 바로 (한 번만, 2026-10-20). 2026-10-28: 화면을 막지 않고 뒤에서
  const stopBgSub = () => {
    bgStop.current = true;
    subLock.current = null;
    setBgSub(null);
    say("자막 만들기를 멈췄어요 — 영상은 통째로 한 클립이에요. 필요하면 [자동 자막 만들기]");
  };
  const autoOnce = useRef(false);
  useEffect(() => {
    if (autoOnce.current || !project.autoSubOnOpen) return;
    autoOnce.current = true;
    const ids = project.scenes.flatMap((s) => s.clips).filter((c) => c.type === "source" && c.src && !c.words?.length).map((c) => c.id);
    change((p) => { delete p.autoSubOnOpen; });
    if (ids.length) setTimeout(() => void autoSub(ids, true), 300);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── 자막 시각 맞추기 — 글은 그대로, 단어 시각만 실제 말소리에 다시 맞춘다 (PC에서, 무료). 지운 단어는 그대로 ── */
  const realignSubs = async () => {
    if (!b.realign) return say("공실마케팅를 껐다 켜 주세요 (자막 시각 맞추기 기능을 새로 연결해요)");
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
    if (!b.speech) return say("공실마케팅를 껐다 켜 주세요 (무음 줄이기 기능을 새로 연결해요)");
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
    if (!overlay) setOverlayTarget(""); // 그냥 연 자료 칸의 [삽입하기]는 늘 새로 올리기 (전에 바꾸던 사진이 바뀌지 않게)
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
      say(`${l.type === "sfx" ? "효과음을" : l.sticker ? "그래픽을" : l.type === "image" ? "사진을" : "텍스트를"} 고른 단어 ${l.type === "sfx" ? "에" : "동안만"} 넣었어요`);
      return;
    }
    // 타임라인 편집 — 캡컷처럼 재생 막대 자리부터 3초 (효과음은 그 자리 한 번)
    if (mode === "timeline" && !all && l.type !== "music") {
      const its = flatten(pref.current).items;
      if (its.length) {
        const tot = its[its.length - 1].start + its[its.length - 1].dur;
        const s0 = Math.max(0, Math.min(time, tot - 0.3));
        const sp = spanOfTimes(its, s0, Math.min(tot, s0 + 3));
        const id = uid();
        change((p) => {
          const nl = { ...l, id, from: sp.from, to: sp.to } as Layer;
          if (sp.ts !== undefined) nl.ts = sp.ts;
          if (sp.te !== undefined && l.type !== "sfx") nl.te = sp.te;
          p.layers = [...(p.layers || []), nl];
        });
        setSelLayer(id);
        setPanel("layer");
        say(`${l.type === "sfx" ? "효과음을" : l.sticker ? "그래픽을" : l.type === "image" ? "사진을" : "텍스트를"} 재생 막대 자리에 넣었어요 — 타임라인에서 끌어 시각·길이를 바꿀 수 있어요`);
        return;
      }
    }
    const r = rangeFor(all);
    if (!r) return say("클립을 먼저 넣어 주세요");
    const id = uid();
    change((p) => {
      p.layers = [...(p.layers || []), { ...l, id, from: r.from, to: r.to } as Layer];
    });
    setSelLayer(id);
    setPanel("layer");
    say(`${l.type === "music" ? "음악을" : l.type === "sfx" ? "효과음을" : l.sticker ? "그래픽을" : l.type === "image" ? "사진을" : "텍스트를"} 클립 ${r.n}개에 넣었어요`);
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
  /** 스티커·사진 고르는 칸에서 레이어를 고르면 — 그 칸을 밑에 살려 둔다 (속성 X 면 보던 탭·자리 그대로, 2026-10-20 사장님) */
  const [under, setUnder] = useState<{ kind: string; layer: string } | null>(null);
  useEffect(() => { if (selLayer) setVisualOpen(""); }, [selLayer]);
  useEffect(() => {
    if (!visualOpen) return;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") setVisualOpen(""); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [visualOpen]);
  /** 메인 화면 잠금 풀기 — 그 클립으로 가서 테두리·손잡이 */
  const openVisualXf = (id: string) => {
    setVisualOpen(id);
    setSelLayer("");
    const it = flat.items.find((x) => x.clip.id === id);
    if (it && (time < it.start || time >= it.start + it.dur)) player.current?.seek(it.start + Math.min(0.05, it.dur / 2));
    say("메인 화면 잠금을 풀었어요 — 끌어 옮기기·모서리로 크기 · 다른 곳을 누르거나 Esc 면 다시 잠겨요");
  };
  /** 메인 화면을 처음 옮길 때 — 사진 움직임이 쉰다는 것을 한 줄로 */
  const noteVisualMove = (id: string, first: boolean) => {
    if (!first) return;
    const c = findClip(project, id)?.clip;
    if (c && !c.box && isPhotoClip(project, c) && (c.motion || project.settings.motion) !== "none") say("직접 옮기면 사진 움직임(줌인 등)은 쉬어요 · [채우기]로 돌리면 다시 움직여요");
  };
  /** 화면 비율 바꾸기 — 오른쪽 [화면 비율] 칸 · 위쪽 비율 단추가 같이 쓴다 */
  const setRatio = (r: Ratio) => change((p) => { p.ratio = r; if (p.settings.subtitle.posAuto && typeof p.settings.subtitle.x !== "number") p.settings.subtitle.position = autoSubPosition(r); });
  const openLayer = (id: string) => {
    const lay = (project.layers || []).find((x) => x.id === id);
    // 그래픽은 무엇을 보다가 골랐든 밑에 그래픽 창 — 속성 X 면 그래픽으로 (2026-10-21 사장님)
    const base = lay && isSticker(lay) ? "sticker" : panel === "sticker" ? "sticker" : !panel && libOpen ? "library" : panel === "library" ? "library" : panel === "layer" && under ? under.kind : "";
    setUnder(base ? { kind: base, layer: id } : null);
    setSelLayer(id);
    setPanel("layer");
  };
  /**
   * 막대 끌기 — 시작(아이콘)·끝(손잡이)을 위아래로 끌어 범위를 바꾼다. 거의 안 움직이면 설정 칸을 연다
   *  아이콘을 좌우로 끌면 겹치는 순서 — 브루처럼 왼쪽 = 앞, 오른쪽(클립 쪽) = 뒤 (한 줄 넘을 때마다 한 칸, 회의 3-26)
   */
  const dragLayer = (id: string, end: "from" | "to", e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const y0 = e.clientY;
    const x0 = e.clientX;
    const r0 = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const isIcon = (e.currentTarget as HTMLElement).tagName === "BUTTON"; // 아이콘(줄 맨 위·카드 안) — 손잡이가 아니라
    const lt = (pref.current.layers || []).find((x) => x.id === id)?.type;
    const canZ = lt === "image" || lt === "text"; // 좌우로 끌면 겹치는 순서 (왼쪽 줄 아이콘 · 카드 안 아이콘 모두)
    let mode: "" | "range" | "z" = "";
    let zx = x0;
    let zMoved = 0;
    let moved = false;
    let pushed = false;
    const move = (ev: PointerEvent) => {
      if (!mode) {
        const dx = Math.abs(ev.clientX - x0), dy = Math.abs(ev.clientY - y0);
        if (dx < 6 && dy < 6) return;
        mode = canZ && dx > dy ? "z" : "range";
      }
      moved = true;
      // 좌우로 끌다가 다른 클립 카드 위로 들어가면 — 순서 바꾸기 대신 그 클립으로 옮기기
      if (mode === "z" && isIcon) {
        const card = (document.elementsFromPoint(ev.clientX, ev.clientY) as HTMLElement[]).map((el) => el.closest<HTMLElement>("[data-clip]")).find(Boolean);
        const cc = card?.dataset.clip;
        const L0 = (pref.current.layers || []).find((x) => x.id === id);
        if (cc && L0 && !(L0.from === cc && L0.to === cc)) mode = "range";
      }
      if (mode === "z") {
        const step = Math.trunc((ev.clientX - zx) / LANE_W);
        if (!step) return;
        zx += Math.sign(step) * LANE_W;
        let ok = false;
        change((p) => { ok = zReorder(p, flatten(p).items, id, step < 0 ? "up" : "down"); }, !pushed);
        pushed = true;
        if (ok) zMoved += -Math.sign(step); // 왼쪽 = 앞
        return;
      }
      // 목록 위·아래 끝에 가면 목록을 굴린다
      const box = listRef.current?.getBoundingClientRect();
      if (box && listRef.current) {
        if (ev.clientY > box.bottom - 40) listRef.current.scrollBy(0, 24);
        else if (ev.clientY < box.top + 40) listRef.current.scrollBy(0, -24);
      }
      const under = document.elementsFromPoint(ev.clientX, ev.clientY) as HTMLElement[];
      const row = under.map((el) => el.closest<HTMLElement>("[data-row]")).find(Boolean);
      const cid = row?.dataset.row;
      const l = (pref.current.layers || []).find((x) => x.id === id);
      if (!cid || !l) return;
      // 아이콘을 클립 카드 위로 옮기면 — 그 클립 하나로 (카드 안으로 들어간다, 2026-10-19 사장님). 왼쪽 줄 쪽이면 범위 늘이기·줄이기
      const intoCard = isIcon && under.some((el) => el.closest("[data-clip]"));
      if (intoCard ? l.from === cid && l.to === cid : l[end] === cid) return;
      change((p) => {
        const L = (p.layers || []).find((x) => x.id === id);
        if (!L) return;
        if (intoCard) {
          L.from = cid;
          L.to = cid;
          return;
        }
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
        // 모든 애셋(글자·스티커·사진·음악·효과음)이 같은 목록 메뉴 (회의 2026-10-19)
        setMedia({ kind: "layer", id, x: r0.right + 8, y: r0.top - 4 });
      }
      else if (mode === "z") {
        setSelLayer(id);
        say(zMoved > 0 ? "앞으로 가져왔어요 (왼쪽 줄일수록 앞)" : zMoved < 0 ? "뒤로 보냈어요 (클립 쪽 줄일수록 뒤)" : "겹치는 것이 없어 순서가 그대로예요");
      } else {
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

  /* ── 키프레임 (2026-10-20, 캡컷처럼) ──
     레이어 점 시각 = 나타난 때부터 초, 클립 화면 점 시각 = 클립 처음부터 초. 점이 하나라도 있으면 끌어 옮기기·크기·회전이 그 시각 점을 고친다 */
  const [RW, RH] = RATIO_SIZE[project.ratio] || RATIO_SIZE["16:9"];
  /** 레이어 지금 모습 (첫 점) — 글자는 미리보기에서 보이는 가운데 자리 (상단·하단 자리였어도), 사진은 화면 안으로 당긴 자리 */
  const layerKeyBase = (p: Project, l: Layer): Keyframe => {
    let x = l.x, y = l.y;
    if (l.type === "image") {
      const r = imgRect(l, l.asset ? p.assets[l.asset] : undefined, RW, RH);
      x = (r.left + r.width / 2) / RW;
      y = (r.top + r.height / 2) / RH;
    } else if (typeof x !== "number" || typeof y !== "number") {
      const el = document.querySelector<HTMLElement>(`[data-layer="${l.id}"]`);
      const box = el?.closest<HTMLElement>("[data-preview]") || null;
      if (el && box) {
        const a = el.getBoundingClientRect(), bb = box.getBoundingClientRect();
        x = +((a.left + a.width / 2 - bb.left) / bb.width).toFixed(4);
        y = +((a.top + a.height / 2 - bb.top) / bb.height).toFixed(4);
      } else {
        x = 0.5;
        y = l.pos === "middle" ? 0.5 : l.pos === "bottom" ? 0.88 : 0.12;
      }
    }
    return { t: 0, x: x ?? 0.5, y: y ?? 0.5, s: 1, r: Number(l.rot) || 0, o: 1 };
  };
  /*
   * 변형 (자리·크기·회전·진하기) 읽기·쓰기 — 대상: 사진·스티커·글자 레이어 / 클립 화면 / 클립 메인자막 (2026-10-20 캡컷식 항목마다 ◇)
   *  k 값(점에 저장하는 값): x·y = 가운데 0~1, r = 도, s·o = 배수(레이어·자막 s, 레이어 o) 또는 절대(클립 o)
   *  보이는 값(속성 칸 숫자): 크기 % · 위치 % · 회전 ° · 진하기 %
   *  그 항목에 점이 있으면 그 시각 점을 고치거나 찍고, 없으면 고정 값을 고친다
   */
  type XfShow = Record<KfProp, number>;
  const fillRectOf = (p: Project, c: Clip) => clipBaseRect(p, { ...c, box: undefined }, RW, RH);
  /** 자막 지금 가운데 자리 (옮긴 자리 없으면 미리보기에서 잰다) */
  const subBase = (p: Project, c: Clip): Keyframe => {
    const st = subStyleOf(p.settings, c);
    let x = typeof st.x === "number" ? st.x : 0.5, y = typeof st.y === "number" ? st.y : 0.85;
    if (typeof st.x !== "number") {
      const el = document.querySelector<HTMLElement>('[data-preview] [data-layer="__sub"]');
      const box = el?.closest<HTMLElement>("[data-preview]");
      if (el && box) {
        const a = el.getBoundingClientRect(), bb = box.getBoundingClientRect();
        x = +((a.left + a.width / 2 - bb.left) / bb.width).toFixed(4);
        y = +((a.top + a.height / 2 - bb.top) / bb.height).toFixed(4);
      }
    }
    return { t: 0, x, y, s: 1, r: Number(st.rot) || 0, o: 1 };
  };
  /** 대상의 키프레임·고정 모습(base, k 값)·보이는 값 바꾸기 규칙 */
  const xfModel = (p: Project, tg: XfTarget) => {
    if (tg.kind === "layer") {
      const l = (p.layers || []).find((x) => x.id === tg.id);
      if (!l) return null;
      const base = { ...layerKeyBase(p, l), o: 1 };
      const sz = l.type === "text" ? l.size ?? 100 : (l.w ?? 0.35) * 100; // 크기 % — 글자 크기 / 화면 폭에 대한 %
      const op = l.opacity ?? 1;
      return { kf: l.kf, base, show: { s: (k: number) => sz * k, o: (k: number) => op * k * 100 }, raw: { s: (v: number) => v / Math.max(0.01, sz), o: (v: number) => v / 100 / Math.max(0.01, op) } };
    }
    const c = findClip(p, tg.id)?.clip;
    if (!c) return null;
    if (tg.kind === "clip") {
      const base = clipKeyBase(p, c, RW, RH);
      const sc = c.box ? c.box.w / Math.max(0.0001, fillRectOf(p, c).w) : 1;
      return { kf: c.kf, base, show: { s: (k: number) => sc * k * 100, o: (k: number) => k * 100 }, raw: { s: (v: number) => v / 100 / Math.max(0.0001, sc), o: (v: number) => v / 100 } };
    }
    const sz = subStyleOf(p.settings, c).size || 100;
    return { kf: c.subKf, base: subBase(p, c), show: { s: (k: number) => sz * k, o: (k: number) => k * 100 }, raw: { s: (v: number) => v / sz, o: (v: number) => v / 100 } };
  };
  /** 속성 칸에 보일 값 · 항목마다 점 있음/이 시각 점 있음 */
  const xfRead = (p: Project, tg: XfTarget, tau: number | null) => {
    const m = xfModel(p, tg);
    if (!m) return null;
    const k = (m.kf?.length ? kfAt(m.kf, tau ?? 0, m.base) : m.base)!;
    const show: XfShow = { x: k.x * 100, y: k.y * 100, s: m.show.s(k.s), r: k.r, o: m.show.o(k.o) };
    const any = Object.fromEntries(KF_PROPS.map((q) => [q, kfAny(m.kf, q)])) as Record<KfProp, boolean>;
    const at = Object.fromEntries(KF_PROPS.map((q) => [q, tau !== null && kfHasAt(m.kf, q, tau)])) as Record<KfProp, boolean>;
    return { show, any, at, k, kf: m.kf };
  };
  /** 메인자막 고정 값 — 적용 범위(전체 / 고른 클립만)를 따른다 (applySub 와 같은 규칙, p 안에서) */
  const subPatchIn = (p: Project, clipId: string, sp: Partial<Project["settings"]["subtitle"]>) => {
    if (subSel) {
      for (const id of selected) { const x = findClip(p, id)?.clip; if (x) x.subStyle = { ...(x.subStyle || {}), ...sp }; }
      if (!selected.includes(clipId)) { const x = findClip(p, clipId)?.clip; if (x) x.subStyle = { ...(x.subStyle || {}), ...sp }; }
    } else p.settings.subtitle = { ...p.settings.subtitle, ...sp };
  };
  /** 보이는 값으로 고치기 (p 안에서) — 점이 있는 항목은 그 시각 점, 없는 항목은 고정 값 */
  const xfApply = (p: Project, tg: XfTarget, tau: number, vals: Partial<XfShow>) => {
    const m = xfModel(p, tg);
    if (!m) return;
    const cur = (m.kf?.length ? kfAt(m.kf, tau, m.base) : m.base)!;
    const kp: Partial<Record<KfProp, number>> = {};
    if (typeof vals.x === "number") kp.x = +(vals.x / 100).toFixed(4);
    if (typeof vals.y === "number") kp.y = +(vals.y / 100).toFixed(4);
    if (typeof vals.r === "number") kp.r = +vals.r.toFixed(2);
    if (typeof vals.s === "number") kp.s = +m.raw.s(vals.s).toFixed(4);
    if (typeof vals.o === "number") kp.o = +Math.max(0, m.raw.o(vals.o)).toFixed(4);
    const { kf, rest } = kfSetProps(m.kf, tau, kp, cur);
    if (tg.kind === "layer") {
      const l = (p.layers || []).find((x) => x.id === tg.id)!;
      if (kf) l.kf = kf;
      // 글자를 돌리거나 옮기거나 점을 찍으면 가운데 기준 자리로 (굽기와 같은 축)
      if (l.type === "text" && (typeof l.x !== "number" || typeof l.y !== "number") && (kf?.length || "x" in rest || "y" in rest || "r" in rest)) { l.x = m.base.x; l.y = m.base.y; }
      if (typeof rest.x === "number") l.x = rest.x;
      if (typeof rest.y === "number") l.y = rest.y;
      if (typeof rest.r === "number") l.rot = Math.abs(rest.r) < 0.05 ? undefined : rest.r;
      if (typeof rest.s === "number") { if (l.type === "text") l.size = Math.max(10, Math.round((l.size ?? 100) * rest.s)); else l.w = +Math.max(0.02, Math.min(4, (l.w ?? 0.35) * rest.s)).toFixed(4); }
      if (typeof rest.o === "number") { const o = Math.max(0, Math.min(1, (l.opacity ?? 1) * rest.o)); l.opacity = o >= 0.999 ? undefined : +o.toFixed(3); }
      return;
    }
    const c = findClip(p, tg.id)!.clip;
    if (tg.kind === "clip") {
      if (kf) c.kf = kf;
      if (typeof rest.r === "number") c.rot = Math.abs(rest.r) < 0.05 ? undefined : rest.r;
      if (typeof rest.o === "number") c.opacity = rest.o >= 0.999 ? undefined : +Math.max(0, rest.o).toFixed(3);
      if (typeof rest.x === "number" || typeof rest.y === "number" || typeof rest.s === "number") {
        const br = clipBaseRect(p, c, RW, RH);
        c.box = { x: rest.x ?? br.x, y: rest.y ?? br.y, w: +(br.w * (rest.s ?? 1)).toFixed(4) };
      }
      return;
    }
    if (kf) c.subKf = kf;
    const sp: Partial<Project["settings"]["subtitle"]> = {};
    if (typeof rest.x === "number" || typeof rest.y === "number") { sp.x = rest.x ?? m.base.x; sp.y = rest.y ?? m.base.y; }
    if (typeof rest.r === "number") sp.rot = rest.r;
    if (typeof rest.s === "number") sp.size = Math.round((subStyleOf(p.settings, c).size || 100) * rest.s);
    if (Object.keys(sp).length) subPatchIn(p, c.id, sp);
  };
  const xfSet = (tg: XfTarget, tau: number, vals: Partial<XfShow>, first = true) => change((p) => xfApply(p, tg, tau, vals), first);
  /** 항목 ◇ — 이 시각에 이 항목 점을 찍거나 뺀다 */
  const xfToggle = (tg: XfTarget, tau: number, q: KfProp) => change((p) => {
    const m = xfModel(p, tg);
    if (!m) return;
    const cur = (m.kf?.length ? kfAt(m.kf, tau, m.base) : m.base)!;
    const kf = kfToggleProp(m.kf, tau, q, cur);
    if (tg.kind === "layer") {
      const l = (p.layers || []).find((x) => x.id === tg.id)!;
      if (l.type === "text" && (typeof l.x !== "number" || typeof l.y !== "number")) { l.x = m.base.x; l.y = m.base.y; }
      if (kf) l.kf = kf; else delete l.kf;
    } else {
      const c = findClip(p, tg.id)!.clip;
      if (tg.kind === "clip") { if (kf) c.kf = kf; else delete c.kf; }
      else { if (kf) c.subKf = kf; else delete c.subKf; }
    }
  });
  /** 레이어 점 넣기·고치기 (돌리기 단추 등) */
  const setLayerKey = (p: Project, l: Layer, tau: number, patch: Partial<Keyframe>) => {
    const m = xfModel(p, { kind: "layer", id: l.id })!;
    const vals: Partial<XfShow> = {};
    if (typeof patch.x === "number") vals.x = patch.x * 100;
    if (typeof patch.y === "number") vals.y = patch.y * 100;
    if (typeof patch.r === "number") vals.r = patch.r;
    if (typeof patch.s === "number") vals.s = m.show.s(patch.s);
    xfApply(p, { kind: "layer", id: l.id }, tau, vals);
  };
  /** 미리보기에서 끈 값(자리·크기·회전) → 점이 있는 항목은 그 시각 점, 없으면 고정 값 */
  const moveLayer = (id: string, patch: Partial<Layer>, first: boolean, tau: number) => change((p) => {
    const l = (p.layers || []).find((x) => x.id === id);
    if (!l) return;
    if (!l.kf?.length || (l.type === "image" && (l.fit === "cover" || l.fit === "contain"))) {
      Object.assign(l, patch);
      return;
    }
    const vals: Partial<XfShow> = {};
    if (typeof patch.x === "number") vals.x = patch.x * 100;
    if (typeof patch.y === "number") vals.y = patch.y * 100;
    if (typeof patch.rot === "number") vals.r = patch.rot;
    if (typeof patch.w === "number") vals.s = patch.w * 100;
    if (typeof patch.size === "number") vals.s = patch.size;
    xfApply(p, { kind: "layer", id }, tau, vals);
  }, first);
  /** 클립 화면 — 미리보기 회전 손잡이·키프레임 화면 옮기기·크기 (s = 지금 모습 배수 k.s) */
  const xfVisual = (id: string, patch: { x?: number; y?: number; s?: number; r?: number }, first: boolean, tau: number) => change((p) => {
    const m = xfModel(p, { kind: "clip", id });
    if (!m) return;
    const vals: Partial<XfShow> = {};
    if (typeof patch.x === "number") vals.x = patch.x * 100;
    if (typeof patch.y === "number") vals.y = patch.y * 100;
    if (typeof patch.r === "number") vals.r = patch.r;
    if (typeof patch.s === "number") vals.s = m.show.s(patch.s);
    xfApply(p, { kind: "clip", id }, tau, vals);
  }, first);
  /** 고른 것의 키프레임 대상·시각 — 레이어(사진·스티커·글자) 또는 클립 화면 */
  const kfTarget = (): { kind: "layer"; l: Layer; tau: number | null; dur: number } | { kind: "clip"; c: Clip; tau: number | null; dur: number } | null => {
    const its = flat.items;
    if (selLayer && (panel === "layer" || panel === "anim" || mode === "timeline")) {
      const l = (project.layers || []).find((x) => x.id === selLayer);
      if (l && (l.type === "text" || (l.type === "image" && l.fit !== "cover" && l.fit !== "contain"))) {
        const r = layerRange(project, l, its);
        if (!r) return null;
        return { kind: "layer", l, tau: time >= r.s - 0.001 && time <= r.e + 0.001 ? Math.max(0, Math.min(r.e - r.s, time - r.s)) : null, dur: r.e - r.s };
      }
      if (l) return null;
    }
    const id = panel === "visual" ? visualClip : selected.length === 1 ? selected[0] : "";
    const it = id ? its.find((x) => x.clip.id === id) : null;
    if (!it) return null;
    const vis = it.clip.visual?.asset || (it.clip.type !== "voice" ? it.clip.src?.asset : "");
    if (!vis || !project.assets[vis]) return null;
    return { kind: "clip", c: it.clip, tau: time >= it.start - 0.001 && time <= it.start + it.dur + 0.001 ? Math.max(0, Math.min(it.dur, time - it.start)) : null, dur: it.dur };
  };
  /** [◆ 키프레임] — 그 시각에 점이 있으면 빼고, 없으면 모든 항목을 지금 모습으로 찍기 */
  const toggleKey = () => {
    const tg = kfTarget();
    if (!tg) return say("키프레임을 넣을 글자·그래픽·사진이나 클립 화면을 먼저 고르세요");
    if (tg.tau === null) return say("재생 막대를 고른 것이 나오는 곳에 두세요");
    const tau = tg.tau;
    const had = kfIndexAt(tg.kind === "layer" ? tg.l.kf : tg.c.kf, tau) >= 0;
    change((p) => {
      const t2: XfTarget = { kind: tg.kind, id: tg.kind === "layer" ? tg.l.id : tg.c.id };
      const m = xfModel(p, t2);
      if (!m) return;
      const i = kfIndexAt(m.kf, tau);
      let kf: Keyframe[] | undefined;
      if (i >= 0) {
        kf = m.kf!.filter((_, j) => j !== i);
        if (!kf.length) kf = undefined;
      } else {
        const cur = (m.kf?.length ? kfAt(m.kf, tau, m.base) : m.base)!;
        kf = kfSort([...(m.kf || []), { ...cur, t: Math.max(0, +tau.toFixed(3)), e: undefined, only: undefined }]);
      }
      if (tg.kind === "layer") {
        const l = (p.layers || []).find((x) => x.id === tg.l.id)!;
        if (l.type === "text" && (typeof l.x !== "number" || typeof l.y !== "number")) { l.x = m.base.x; l.y = m.base.y; }
        if (kf) l.kf = kf; else delete l.kf;
      } else {
        const c = findClip(p, tg.c.id)!.clip;
        if (kf) c.kf = kf; else delete c.kf;
      }
    });
    say(had ? "이 시각 키프레임을 뺐어요" : "키프레임을 찍었어요 — 재생 막대를 옮겨 모습을 바꾸면 그 사이를 저절로 움직여요");
  };
  /** 고른 것 → 변형 대상·지금 시각 (타임라인의 레이어·클립 화면·자막) */
  const selXf = (): { tg: XfTarget; tau: number | null; dur: number } | null => {
    if (tlSel?.kind === "sub") {
      const it = flat.items.find((x) => x.clip.id === tlSel.id);
      if (!it) return null;
      return { tg: { kind: "sub", id: it.clip.id }, tau: time >= it.start - 0.001 && time <= it.start + it.dur + 0.001 ? Math.max(0, Math.min(it.dur, time - it.start)) : null, dur: it.dur };
    }
    const tg = kfTarget();
    if (!tg) return null;
    return { tg: { kind: tg.kind, id: tg.kind === "layer" ? tg.l.id : tg.c.id }, tau: tg.tau, dur: tg.dur };
  };
  const keyState = (() => {
    const tg = kfTarget();
    if (!tg || tg.tau === null) return { can: false, on: false };
    return { can: true, on: kfIndexAt(tg.kind === "layer" ? tg.l.kf : tg.c.kf, tg.tau) >= 0 };
  })();

  /* ── 타임라인 편집 (캡컷처럼) — 다듬기·나누기·시각 옮기기 ── */
  /** 영상 전체 시각 [s, e] → 레이어 구간 (시작 클립 + 몇 초 뒤, 끝 클립 + 몇 초까지) */
  const spanOfTimes = (its: ReturnType<typeof flatten>["items"], s: number, e: number) => {
    const a = its.find((x) => s >= x.start - 1e-6 && s < x.start + x.dur - 1e-6) || its[its.length - 1];
    const b = its.find((x) => e > x.start + 1e-6 && e <= x.start + x.dur + 1e-6) || its[its.length - 1];
    const ts = s - a.start, te = e - b.start;
    return { from: a.clip.id, to: b.clip.id, ts: ts > 0.005 ? +ts.toFixed(3) : undefined, te: te < b.dur - 0.005 ? +Math.max(0.05, te).toFixed(3) : undefined };
  };
  const layerTimeOrig = useRef<{ id: string; s: number; e: number; kf?: Keyframe[] } | null>(null);
  const setLayerTime = (id: string, s: number, e: number, first: boolean) => {
    const its = flatten(pref.current).items;
    if (!its.length) return;
    const l0 = (pref.current.layers || []).find((x) => x.id === id);
    if (!l0) return;
    if (first || layerTimeOrig.current?.id !== id) {
      const r = layerRange(pref.current, l0, its);
      layerTimeOrig.current = r ? { id, s: r.s, e: r.e, kf: l0.kf } : null;
    }
    const o = layerTimeOrig.current;
    const sp = spanOfTimes(its, s, e);
    change((p) => {
      const l = (p.layers || []).find((x) => x.id === id);
      if (!l) return;
      l.from = sp.from;
      l.to = sp.to;
      if (sp.ts === undefined) delete l.ts; else l.ts = sp.ts;
      if (sp.te === undefined || l.type === "sfx") delete l.te; else l.te = sp.te;
      delete l.w0;
      delete l.w1;
      // 앞 끝을 줄이거나 늘였으면 키프레임은 그 자리 그대로 (나타난 때가 바뀐 만큼 당긴다)
      if (o?.kf?.length && Math.abs(e - s - (o.e - o.s)) > 1e-3 && Math.abs(s - o.s) > 1e-3) l.kf = o.kf.map((k) => ({ ...k, t: +(k.t - (s - o.s)).toFixed(3) }));
    }, first);
  };
  /** 클립 다듬기 — dt: 끈 초 (오른쪽 +). 원본 영상은 쓰는 구간, 사진·글 클립은 길이, AI 목소리 클립은 끝에 머무는 시간 */
  const trimOrig = useRef<Clip | null>(null);
  const applyTrim = (p: Project, c: Clip, o: Clip, side: "l" | "r", dt: number): string => {
    const d0 = clipDuration(o, p.settings);
    const shiftKf = (sh: number) => { if (o.kf?.length) c.kf = o.kf.map((k) => ({ ...k, t: +(k.t - sh).toFixed(3) })); };
    if (o.type !== "voice" && o.src && isVid(o.src.asset) && (!o.visual || o.visual.asset === o.src.asset)) {
      // 원본 영상 — 쓰는 구간 (말 사이 가까운 단어 경계에 붙는다)
      const ss = srcSpeed(o);
      const max = p.assets[o.src.asset]?.duration || o.src.e;
      const wsnap = (t: number) => {
        let best = t, bd = 0.12;
        for (const w of o.words || []) for (const v of [w.s, w.e]) if (Math.abs(v - t) < bd) { bd = Math.abs(v - t); best = v; }
        return best;
      };
      if (side === "r") {
        const e = Math.max(o.src.s + 0.2, Math.min(max, wsnap(o.src.e + dt * ss)));
        c.src = { ...o.src, e: +e.toFixed(3) };
      } else {
        const s = Math.max(0, Math.min(o.src.e - 0.2, wsnap(o.src.s + dt * ss)));
        c.src = { ...o.src, s: +s.toFixed(3) };
        shiftKf((s - o.src.s) / ss);
      }
      if (o.words?.length) {
        c.words = o.words.filter((w) => (w.s + w.e) / 2 >= c.src!.s && (w.s + w.e) / 2 <= c.src!.e).map((w) => ({ ...w, s: Math.max(c.src!.s, w.s), e: Math.min(c.src!.e, w.e) }));
        c.text = c.words.map((w) => w.w).join(" ");
      }
      return "";
    }
    if (o.type === "voice" && o.voice) {
      // AI 목소리 클립 — 다시 만들지 않고 같은 소리 파일에서 잘라 쓴다 (2026-10-20 사장님). 잘린 단어는 글에서도 빠진다
      const v = o.voice;
      const sp = speedOf(o, p.settings);
      const vo = Number(v.o) || 0;
      const keepWords = (a: number, b: number, shift: number) => {
        c.words = (o.words || []).filter((w) => (w.s + w.e) / 2 > a && (w.s + w.e) / 2 < b).map((w) => ({ ...w, s: +Math.max(0, w.s - shift).toFixed(3), e: +Math.max(0, Math.min(b, w.e) - shift).toFixed(3) }));
        c.text = c.words.filter((w) => !w.del).map((w) => w.w).join(" ");
      };
      if (side === "r") {
        const len = Math.max(0.2, d0 + dt);
        const vl = v.duration / sp;
        const gap = voiceGap({ ...c, voice: v } as Clip, p.settings);
        if (len >= vl + gap) { c.voice = { ...v }; c.pad = +(len - vl - gap).toFixed(2) || undefined; c.words = o.words; c.text = o.text; }
        else if (len >= vl) { c.voice = { ...v, ng: true }; delete c.pad; c.words = o.words; c.text = o.text; }
        else {
          const nd = Math.max(0.1, len * sp);
          c.voice = { ...v, duration: +nd.toFixed(3), ng: true };
          delete c.pad;
          keepWords(-1, nd, 0);
        }
        return "";
      }
      // 앞 — 파일 안 시작을 옮긴다 (앞으로 늘리는 것은 이미 잘라 둔 곳까지만)
      const cut = Math.max(-vo, Math.min(v.duration - 0.1, dt * sp));
      c.voice = { ...v, o: +(vo + cut).toFixed(3), duration: +(v.duration - cut).toFixed(3) };
      if (cut < 0) {
        // 잘라 둔 앞을 되살리면 그 말은 글로 되돌리지 못한다 (소리만) — 단어 시각은 뒤로 민다
        c.words = (o.words || []).map((w) => ({ ...w, s: +(w.s - cut).toFixed(3), e: +(w.e - cut).toFixed(3) }));
        c.text = o.text;
      } else keepWords(cut, v.duration + 1, cut);
      shiftKf(cut / sp);
      return "";
    }
    // 사진·영상만 넣은 클립·말 없는 구간 — 길이 (영상이면 앞을 자르면 시작점도)
    const hold0 = Number(o.hold) || d0;
    if (side === "r") c.hold = Math.max(0.3, +(hold0 + dt).toFixed(2));
    else {
      const cut = Math.min(hold0 - 0.3, dt);
      if (o.visual && isVid(o.visual.asset)) c.visual = { ...o.visual, s: Math.max(0, +(o.visual.s + cut).toFixed(3)) };
      c.hold = Math.max(0.3, +(hold0 - cut).toFixed(2));
      shiftKf(cut);
    }
    return "";
  };
  const trimClip = (id: string, side: "l" | "r", dt: number, first: boolean) => {
    if (first || trimOrig.current?.id !== id) trimOrig.current = structuredClone(findClip(pref.current, id)?.clip ?? null);
    const o = trimOrig.current;
    if (!o) return;
    let msg = "";
    change((p) => {
      const c = findClip(p, id)?.clip;
      if (c) msg = applyTrim(p, c, o, side, dt);
    }, first);
    if (msg && first) say(msg);
  };
  /** 재생 막대 앞(l)·뒤(r) 지우기 — 지금 클립 안에서 */
  const trimHere = (side: "l" | "r") => {
    const it = flatten(pref.current).items.find((x) => time > x.start + 0.02 && time < x.start + x.dur - 0.02);
    if (!it) return say("재생 막대를 클립 가운데에 두세요");
    const loc = time - it.start;
    const o = structuredClone(it.clip);
    let msg = "";
    change((p) => {
      const c = findClip(p, it.clip.id)?.clip;
      if (c) msg = applyTrim(p, c, o, side, side === "l" ? loc : -(it.dur - loc));
    });
    if (msg) say(msg);
    else {
      say(side === "l" ? "재생 막대 앞을 잘라 냈어요" : "재생 막대 뒤를 잘라 냈어요");
      if (side === "l") setTimeout(() => seekClip(it.clip.id, 0.01), 30);
    }
  };
  /** 재생 막대 자리에서 나누기 (Ctrl+B) — 원본 영상은 그 시각, AI 목소리는 가장 가까운 말 사이, 사진·말 없는 구간은 길이로 */
  const splitHere = (at = time) => {
    const its = flatten(pref.current).items;
    const it = its.find((x) => at > x.start + 0.05 && at < x.start + x.dur - 0.05);
    if (!it) return say("나눌 클립 안에 재생 막대를 두세요 (클립 끝과 너무 가까우면 안 돼요)");
    const c0 = it.clip;
    const loc = at - it.start;
    // 나눈 자리 앞뒤 끝에 점을 이어 둔다 — 점이 있던 항목만 (항목마다 ◇)
    const cutKeys = (keys: Keyframe[] | undefined, a: number, b: number, shift: number, base: Keyframe) => {
      if (!keys?.length) return undefined;
      const props = KF_PROPS.filter((q) => kfAny(keys, q));
      const only = props.length === KF_PROPS.length ? undefined : props;
      const inside = keys.filter((k) => k.t > a + 1e-3 && k.t < b - 1e-3).map((k) => ({ ...k, t: +(k.t - shift).toFixed(3) }));
      const ka = kfAt(keys, a, base)!, kb = kfAt(keys, b, base)!;
      return kfSort([{ ...ka, t: +(a - shift).toFixed(3), e: (keys.filter((k) => k.t <= a).pop() || keys[0]).e, only }, ...inside, { ...kb, t: +(b - shift).toFixed(3), e: undefined, only }]);
    };
    if (c0.type === "voice" && c0.voice) {
      // AI 목소리 — 재생 막대 자리에서 정확히, 다시 만들지 않고 같은 소리 파일을 나눈다 (2026-10-20 사장님)
      const sp = speedOf(c0, pref.current.settings);
      const cutF = loc * sp;
      if (cutF >= c0.voice.duration - 0.05) return say("말이 끝난 뒤라 나눌 수 없어요 — [뒤 지우기]로 줄여 주세요");
      const id2 = uid();
      change((p) => {
        const g = findClip(p, c0.id);
        if (!g) return;
        const c = g.clip;
        const second: Clip = structuredClone(c);
        second.id = id2;
        delete second.subText;
        delete second.trans;
        const ws = c.words || [];
        c.words = ws.filter((w) => (w.s + w.e) / 2 < cutF);
        second.words = ws.filter((w) => (w.s + w.e) / 2 >= cutF);
        c.text = c.words.filter((w) => !w.del).map((w) => w.w).join(" ");
        second.text = second.words.filter((w) => !w.del).map((w) => w.w).join(" ");
        splitVoice(c, second, cutF);
        const cb = clipKeyBase(p, c, RW, RH);
        const k1 = cutKeys(c.kf, 0, loc, 0, cb), k2 = cutKeys(c.kf, loc, it.dur, loc, cb);
        if (k1) c.kf = k1;
        if (k2) second.kf = k2;
        g.scene.clips.splice(g.idx + 1, 0, second);
        for (const l of p.layers || []) {
          if (typeof l.w0 === "number") { if (l.from === c.id && l.w0 >= c.words.length) { l.from = id2; if (l.to === c.id) l.to = id2; l.w0 -= c.words.length; if (typeof l.w1 === "number") l.w1 -= c.words.length; } continue; }
          if (l.from === c.id && (Number(l.ts) || 0) >= loc) { l.from = id2; l.ts = +((Number(l.ts) || 0) - loc).toFixed(3) || undefined; }
          if (l.to === c.id && !(typeof l.te === "number" && l.te <= loc)) { l.to = id2; if (typeof l.te === "number") l.te = +(l.te - loc).toFixed(3); }
        }
      });
      if (mode === "timeline") setPicks([{ kind: "clip", id: c0.id }, { kind: "clip", id: id2 }]);
      else setSelected([c0.id, id2]);
      return say("재생 막대 자리에서 나눴어요 (목소리는 그대로)");
    }
    const newId = uid();
    change((p) => {
      const g = findClip(p, c0.id);
      if (!g) return;
      const c = g.clip;
      const second: Clip = structuredClone(c);
      second.id = newId;
      delete second.subText; // 따로 고친 자막은 앞 클립에만
      delete second.trans; // 앞에서 들어오는 화면전환은 앞 클립 것
      if (c.type !== "voice" && c.src) {
        const ts = sourceTimeAt(c, loc);
        const nA = (c.words || []).filter((w) => (w.s + w.e) / 2 < ts).length;
        second.words = (c.words || []).slice(nA);
        second.text = second.words.map((w) => w.w).join(" ");
        c.words = (c.words || []).slice(0, nA);
        c.text = c.words.map((w) => w.w).join(" ");
        second.src = { ...c.src, s: +ts.toFixed(3) };
        c.src = { ...c.src, e: +ts.toFixed(3) };
        // 단어 구간 레이어 — 뒤로 간 단어면 뒤 클립으로
        for (const l of p.layers || []) if (l.from === c.id && typeof l.w0 === "number" && l.w0 >= nA) { l.from = newId; l.to = l.to === c.id ? newId : l.to; l.w0 -= nA; if (typeof l.w1 === "number") l.w1 -= nA; }
      } else {
        const hold = it.dur;
        c.hold = +loc.toFixed(2);
        second.hold = +(hold - loc).toFixed(2);
        if (second.visual && isVid(second.visual.asset)) second.visual = { ...second.visual, s: +(second.visual.s + loc).toFixed(3) };
        if (c.type === "voice") { delete second.pad; delete c.pad; }
      }
      const cb = clipKeyBase(p, c, RW, RH);
      const k1 = cutKeys(c.kf, 0, loc, 0, cb), k2 = cutKeys(c.kf, loc, it.dur, loc, cb);
      if (k1) c.kf = k1;
      if (k2) second.kf = k2;
      g.scene.clips.splice(g.idx + 1, 0, second);
      // 초 단위 구간 레이어 — 나눈 자리 뒤에서 시작·끝나면 뒤 클립 기준으로
      for (const l of p.layers || []) {
        if (typeof l.w0 === "number") continue;
        if (l.from === c.id && (Number(l.ts) || 0) >= loc) { l.from = newId; l.ts = +((Number(l.ts) || 0) - loc).toFixed(3) || undefined; }
        if (l.to === c.id && !(typeof l.te === "number" && l.te <= loc)) { l.to = newId; if (typeof l.te === "number") l.te = +(l.te - loc).toFixed(3); }
      }
    });
    if (mode === "timeline") setPicks([{ kind: "clip", id: c0.id }, { kind: "clip", id: newId }]);
    else setSelected([c0.id, newId]);
    say("재생 막대 자리에서 클립을 나눴어요");
  };
  /* ── 타임라인에서 고른 것 (프리미어처럼 모든 것) ── */
  const [picks, setPicksState] = useState<Pick[]>([]);
  const [magnet, setMagnet] = useState(true);
  const layerClip = useRef<{ l: Layer; ds: number; len: number }[]>([]); // 타임라인 복사한 레이어 (첫 것 시작에서 떨어진 초 · 길이)
  /** 고르기 — 미리보기 손잡이·오른쪽 속성 칸이 따라오게 예전 상태(selLayer·selected·visualClip·transClip·tlSel)도 맞춘다 */
  const setPicks = (list: Pick[]) => {
    setPicksState(list);
    const f = list[0];
    setSelWord(null);
    const lay = list.find((x) => x.kind === "layer");
    setSelLayer(lay ? lay.id : "");
    if (lay) setAnimTarget(lay.id);
    setSelected([...new Set(list.filter((x) => x.kind !== "layer").map((x) => x.id))]);
    setTlSel(f && f.kind !== "clip" && f.kind !== "layer" ? { kind: f.kind, id: f.id } : null);
    if (f?.kind === "clip") setVisualClip(f.id);
    if (f?.kind === "trans") {
      const c = findClip(pref.current, f.id)?.clip;
      if (c && !c.trans) actions.openTrans(f.id, true);
      setTransClip(f.id);
    }
    // 오른쪽 속성 칸은 고른 것을 따라간다 — 덮어 띄운 칸(애니메이션·목소리…)은 닫는다
    if (panel && !LIB_KINDS.includes(panel)) setPanel("");
  };
  // 넣기·미리보기에서 고른 레이어 → 타임라인도 그것을 고른다
  useEffect(() => {
    if (mode !== "timeline" || !selLayer || picks.some((x) => x.kind === "layer" && x.id === selLayer)) return;
    setPicksState([{ kind: "layer", id: selLayer }]);
  }, [selLayer, mode]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * V·A 트랙 정하기 — 정해 둔 트랙(track) 그대로, 없으면 TimelineView 와 같은 규칙으로 쌓은 자리를 굳힌다.
   *  V 트랙 순서 = 겹치는 순서 (위가 앞) → layers 배열도 트랙 순서로 다시 놓는다 (layerZ = 1, 텍스트 편집·굽기는 배열 순서 그대로)
   *  want: 옮길 레이어 → 트랙. 그 트랙 그 시간에 다른 것이 있으면 위(V)·아래(A) 빈 트랙으로
   */
  const settleTracks = (p: Project, want: Record<string, number> = {}) => {
    const its = flatten(p).items;
    const rg = new Map<string, { s: number; e: number }>();
    for (const l of p.layers || []) { const r = layerRange(p, l, its); if (r) rg.set(l.id, r); }
    const overlap = (a: string, b: string) => { const x = rg.get(a), y2 = rg.get(b); return Boolean(x && y2 && x.s < y2.e - 0.001 && y2.s < x.e - 0.001); };
    // 지금 자리 (TimelineView vPlace·aPlace 와 같은 규칙)
    const vis = zLayers(p, p.layers || []).filter((l) => rg.has(l.id));
    const vt = new Map<string, number>();
    for (const l of vis) {
      let t = typeof l.track === "number" && l.track >= 2 ? l.track : 2;
      if (!(typeof l.track === "number" && l.track >= 2)) for (const [id, tr] of vt) if (overlap(id, l.id)) t = Math.max(t, tr + 1);
      vt.set(l.id, t);
    }
    const aud = (p.layers || []).filter((l) => (l.type === "music" || l.type === "sfx") && rg.has(l.id));
    const at = new Map<string, number>();
    for (const l of aud.filter((x) => typeof x.track === "number" && x.track >= 3)) at.set(l.id, l.track!);
    for (const l of [...aud.filter((x) => !(typeof x.track === "number" && x.track >= 3) && x.type === "music"), ...aud.filter((x) => !(typeof x.track === "number" && x.track >= 3) && x.type === "sfx")]) {
      let t = 3;
      while ([...at].some(([id, tr]) => tr === t && overlap(id, l.id))) t++;
      at.set(l.id, t);
    }
    // 옮기기 — 겹치면 빈 트랙으로
    for (const [id, t0] of Object.entries(want)) {
      const isA = at.has(id);
      const m = isA ? at : vt;
      m.delete(id);
      let t = Math.max(isA ? 3 : 2, t0);
      while ([...m].some(([o, tr]) => tr === t && overlap(o, id))) t++;
      m.set(id, t);
    }
    for (const l of p.layers || []) {
      if (vt.has(l.id)) l.track = vt.get(l.id);
      else if (at.has(l.id)) l.track = at.get(l.id);
    }
    // 겹치는 순서 = 트랙 순서 (같은 트랙 안은 예전 순서)
    const zi = new Map(vis.map((l, i) => [l.id, i]));
    const visSorted = [...vis].sort((a, b) => (vt.get(a.id)! - vt.get(b.id)!) || (zi.get(a.id)! - zi.get(b.id)!));
    const visIds = new Set(visSorted.map((l) => l.id));
    p.layers = [...(p.layers || []).filter((l) => !visIds.has(l.id)), ...visSorted];
    p.layerZ = 1;
    const nv = Math.max(1, ...[...vt.values()]), na = Math.max(2, ...[...at.values()]);
    p.tl = { ...(p.tl || {}), v: Math.max(p.tl?.v ?? 1, nv), a: Math.max(p.tl?.a ?? 2, na) };
  };

  /** 레이어 끌기 — 시각 [s, e] (영상 전체 초) · 트랙. 앞 끝을 바꾸면 키프레임은 그 자리 그대로 */
  const moveOrig = useRef<Map<string, { s: number; e: number; kf?: Keyframe[]; vs?: number; offset?: number }>>(new Map());
  const layersMove = (moves: { id: string; s: number; e: number; track?: number }[], first: boolean) => {
    const its = flatten(pref.current).items;
    if (!its.length) return;
    if (first) {
      moveOrig.current = new Map();
      for (const m of moves) {
        const l0 = (pref.current.layers || []).find((x) => x.id === m.id);
        const r = l0 ? layerRange(pref.current, l0, its) : null;
        if (l0 && r) moveOrig.current.set(m.id, { s: r.s, e: r.e, kf: l0.kf, vs: l0.vs, offset: l0.offset });
      }
    }
    change((p) => {
      const want: Record<string, number> = {};
      for (const m of moves) {
        const l = (p.layers || []).find((x) => x.id === m.id);
        const o = moveOrig.current.get(m.id);
        if (!l || !o) continue;
        const sp = spanOfTimes(its, m.s, m.e);
        l.from = sp.from;
        l.to = sp.to;
        if (sp.ts === undefined) delete l.ts; else l.ts = sp.ts;
        if (sp.te === undefined || l.type === "sfx") delete l.te; else l.te = sp.te;
        delete l.w0;
        delete l.w1;
        // 앞 끝 다듬기 (길이가 바뀜) — 키프레임·영상 시작·음악 시작이 그 자리에 머물게
        const resized = Math.abs(m.e - m.s - (o.e - o.s)) > 1e-3;
        const dS = m.s - o.s;
        if (resized && Math.abs(dS) > 1e-3) {
          if (o.kf?.length) l.kf = o.kf.map((k) => ({ ...k, t: +(k.t - dS).toFixed(3) }));
          if (l.asset && p.assets[l.asset]?.kind === "video") l.vs = Math.max(0, +((o.vs || 0) + dS).toFixed(3));
          if (l.type === "music") l.offset = Math.max(0, +((o.offset || 0) + dS).toFixed(3));
        }
        if (typeof m.track === "number") want[m.id] = m.track;
      }
      if (Object.keys(want).length || mode === "timeline") settleTracks(p, want);
    }, first);
  };

  /** 트랙 단추·메뉴 */
  const trackOp = (op: TrackOp, track: string, arg?: string) => change((p) => {
    settleTracks(p);
    const tl = { ...(p.tl || {}) };
    const nm = /^([VA])(\d+)$/.exec(track);
    if (op === "addV") tl.v = (tl.v ?? 1) + 1;
    else if (op === "addA") tl.a = (tl.a ?? 2) + 1;
    else if (op === "rename") tl.names = { ...(tl.names || {}), [track]: String(arg || "").trim() || undefined } as Record<string, string>;
    else if (op === "lock") tl.lock = tl.lock?.includes(track) ? tl.lock.filter((x) => x !== track) : [...(tl.lock || []), track];
    else if (op === "hide") {
      if (track === "V1") p.settings.off = { ...(p.settings.off || {}), visual: !p.settings.off?.visual || undefined };
      else if (track === "A1") p.settings.off = { ...(p.settings.off || {}), source: !p.settings.off?.source || undefined };
      else if (track === "A2") p.settings.off = { ...(p.settings.off || {}), voice: !p.settings.off?.voice || undefined };
      else if (track === "SUB") p.settings.subtitle.on = !p.settings.subtitle.on;
      else if (nm) {
        const isA = nm[1] === "A";
        const ls = (p.layers || []).filter((l) => l.track === Number(nm[2]) && (isA ? l.type === "music" || l.type === "sfx" : l.type === "image" || l.type === "text"));
        const allOff = ls.length > 0 && ls.every((l) => l.off);
        for (const l of ls) l.off = allOff ? undefined : true;
      }
    } else if (op === "del" && nm) {
      const n = Number(nm[2]);
      const isA = nm[1] === "A";
      const on = (l: Layer) => (isA ? l.type === "music" || l.type === "sfx" : l.type === "image" || l.type === "text");
      p.layers = (p.layers || []).filter((l) => !(on(l) && l.track === n));
      for (const l of p.layers) if (on(l) && typeof l.track === "number" && l.track > n) l.track -= 1;
      if (isA) tl.a = Math.max(2, (tl.a ?? 2) - 1);
      else tl.v = Math.max(1, (tl.v ?? 1) - 1);
      if (tl.names) delete tl.names[track];
    }
    p.tl = tl;
  });

  /** 오른쪽 위 트랙에 사진·영상·소리 놓기 — 놓은 시각부터 (사진 3초, 영상은 그 길이) */
  const dropOver = async (t: number, track: number, raw: string) => {
    const item = await dropItem(raw);
    if (!item) return;
    const a = await ensureAsset(item);
    const rg = rangeOf(raw); // 소스 모니터 시작·끝
    const its = flatten(pref.current).items;
    if (!its.length) return;
    const tot = its[its.length - 1].start + its[its.length - 1].dur;
    const s0 = Math.max(0, Math.min(t, tot - 0.3));
    const len = a.kind === "video" ? Math.max(0.5, rg ? rg.e - rg.s : a.duration || 3) : a.kind === "audio" ? Math.max(0.5, a.duration || 5) : 3;
    const sp = spanOfTimes(its, s0, Math.min(tot, s0 + len));
    const id = uid();
    change((p) => {
      const l = (a.kind === "audio"
        ? { id, type: "music", name: a.name, file: a.path, url: a.url, volume: 0.6, fadeIn: 0, fadeOut: 0, offset: 0, loop: false, from: sp.from, to: sp.to }
        : { id, type: "image", asset: a.id, name: a.name, x: 0.5, y: 0.5, w: a.kind === "video" ? 0.5 : 0.35, opacity: 1, from: sp.from, to: sp.to, ...(a.kind === "video" ? { vs: rg ? +rg.s.toFixed(3) : 0, volume: 1 } : {}) }) as Layer;
      if (sp.ts !== undefined) l.ts = sp.ts;
      if (sp.te !== undefined) l.te = sp.te;
      p.layers = [...(p.layers || []), l];
      settleTracks(p, { [id]: a.kind === "audio" ? 3 : track });
    });
    setPicks([{ kind: "layer", id }]);
    say(a.kind === "video" ? "영상을 위 트랙에 올렸어요 (화면 속 화면) — 미리보기에서 끌어 옮기고 크기를 바꿔요" : a.kind === "audio" ? "소리를 넣었어요" : "사진을 위 트랙에 올렸어요");
  };

  /** 고른 것 기준 시각 — 레이어 [s, e] / 클립 */
  const pickRange = (pk: Pick) => {
    const its = flatten(pref.current).items;
    if (pk.kind === "layer") {
      const l = (pref.current.layers || []).find((x) => x.id === pk.id);
      return l ? layerRange(pref.current, l, its) : null;
    }
    const it = its.find((x) => x.clip.id === pk.id);
    return it ? { s: it.start, e: it.start + it.dur } : null;
  };
  /** 레이어를 재생 막대 자리에서 둘로 (키프레임·영상 시작·음악 시작 이어서) */
  const splitLayer = (p: Project, id: string, t: number) => {
    const its = flatten(p).items;
    const l = (p.layers || []).find((x) => x.id === id);
    const r = l ? layerRange(p, l, its) : null;
    if (!l || !r || t <= r.s + 0.05 || t >= r.e - 0.05 || l.type === "sfx") return false;
    const cut = t - r.s;
    const b: Layer = structuredClone(l);
    b.id = uid();
    const s1 = spanOfTimes(its, r.s, t), s2 = spanOfTimes(its, t, r.e);
    const put = (x: Layer, sp: ReturnType<typeof spanOfTimes>) => {
      x.from = sp.from;
      x.to = sp.to;
      if (sp.ts === undefined) delete x.ts; else x.ts = sp.ts;
      if (sp.te === undefined) delete x.te; else x.te = sp.te;
      delete x.w0;
      delete x.w1;
    };
    put(l, s1);
    put(b, s2);
    if (l.kf?.length) {
      const base = { x: l.x ?? 0.5, y: l.y ?? 0.5, s: 1, r: Number(l.rot) || 0, o: 1, t: 0 };
      const props = KF_PROPS.filter((q) => kfAny(l.kf, q));
      const only = props.length === KF_PROPS.length ? undefined : props;
      const ka = kfAt(l.kf, cut, base)!;
      const k1 = l.kf.filter((k) => k.t < cut - 1e-3), k2 = l.kf.filter((k) => k.t > cut + 1e-3).map((k) => ({ ...k, t: +(k.t - cut).toFixed(3) }));
      l.kf = kfSort([...k1, { ...ka, t: +cut.toFixed(3), e: undefined, only }]);
      b.kf = kfSort([{ ...ka, t: 0, e: (l.kf.filter((k) => k.t <= cut).pop() || ka).e, only }, ...k2]);
    }
    if (l.asset && p.assets[l.asset]?.kind === "video") b.vs = +((l.vs || 0) + cut).toFixed(3);
    if (l.type === "music") { b.offset = +((l.offset || 0) + cut).toFixed(3); l.fadeOut = 0; b.fadeIn = 0; }
    if (l.anim) { l.anim = { ...l.anim, out: undefined }; b.anim = { ...b.anim, in: undefined }; } // 이어지는 곳에서 사라졌다 나타나지 않게
    const i = p.layers!.findIndex((x) => x.id === id);
    p.layers!.splice(i + 1, 0, b);
    return true;
  };

  /** 재생 막대 자리에서 나누기 (Ctrl+B) — 고른 것 (레이어들 / 클립), 아무것도 안 골랐으면 메인 클립 */
  const splitPicked = () => {
    const lays = picks.filter((x) => x.kind === "layer").map((x) => x.id);
    if (mode === "timeline" && lays.length) {
      let n = 0;
      change((p) => { for (const id of lays) if (splitLayer(p, id, time)) n++; });
      return say(n ? `재생 막대 자리에서 ${n}개를 나눴어요` : "고른 것이 재생 막대 자리에 없어요");
    }
    splitHere();
  };
  /** 재생 막대 앞(l)·뒤(r) 지우기 — 고른 레이어, 아니면 지금 클립 */
  const trimPicked = (side: "l" | "r") => {
    const lays = picks.filter((x) => x.kind === "layer").map((x) => x.id);
    if (mode === "timeline" && lays.length) {
      const moves = lays.map((id) => {
        const r = pickRange({ kind: "layer", id });
        if (!r || time <= r.s + 0.05 || time >= r.e - 0.05) return null;
        return side === "l" ? { id, s: time, e: r.e } : { id, s: r.s, e: time };
      }).filter(Boolean) as { id: string; s: number; e: number }[];
      if (!moves.length) return say("고른 것이 재생 막대 자리에 없어요");
      layersMove(moves, true);
      return say(side === "l" ? "재생 막대 앞을 잘라 냈어요" : "재생 막대 뒤를 잘라 냈어요");
    }
    trimHere(side);
  };
  /** [전환] 탭에서 끌어 클립 사이에 놓기 (2026-10-25 사장님) — 비디오: 화면전환 · 오디오: 크로스페이드 1초 */
  const dropTrans = (clipId: string, d: TransDrop) => {
    change((p) => {
      const c = findClip(p, clipId)?.clip;
      if (!c) return;
      if (d.kind === "audio") c.xfade = c.xfade || 1;
      else c.trans = { ...(c.trans || {}), type: d.type, a: c.trans?.a ?? 0.5, b: c.trans?.b ?? 0.5 };
    });
    setPicks([{ kind: "trans", id: d.kind === "audio" ? clipId + ":a" : clipId }]);
    say(d.kind === "audio" ? "크로스페이드를 넣었어요 — 막대 끝을 끌면 길이가 바뀌어요" : `${transLabel(d.type)} 전환을 넣었어요 — 막대 끝을 끌면 길이가 바뀌어요`);
  };
  /** 소리 크기 선 (타임라인 소리 트랙을 넓혔을 때) — 전체 크기 또는 볼륨 키프레임 (2026-10-25) */
  const volSet = (tg: { kind: "clip" | "layer"; id: string }, pt: { volume?: number; volKf?: VolKf[] | null }, first: boolean) => {
    change((p) => {
      const x = tg.kind === "clip" ? findClip(p, tg.id)?.clip : (p.layers || []).find((l) => l.id === tg.id);
      if (!x) return;
      if (typeof pt.volume === "number") {
        const v = +Math.max(0, Math.min(2, pt.volume)).toFixed(3);
        x.volume = tg.kind === "clip" && Math.abs(v - 1) < 0.01 ? undefined : v;
        x.muted = v <= 0.0101 || undefined;
      }
      if (pt.volKf === null) delete x.volKf;
      else if (pt.volKf) { x.volKf = pt.volKf; x.muted = undefined; }
    }, first);
  };
  /** 전환 막대 끝 끌기 — 경계 앞뒤 같은 길이 */
  const transLen = (clipId: string, half: number, audio: boolean, first: boolean) => {
    change((p) => {
      const c = findClip(p, clipId)?.clip;
      if (!c) return;
      if (audio) c.xfade = +Math.max(0.1, Math.min(4, half * 2)).toFixed(2);
      else if (c.trans) { const h = +Math.max(TRANS_MIN / 2, Math.min(TRANS_MAX, half)).toFixed(2); c.trans.a = h; c.trans.b = h; }
    }, first);
  };
  /** [연결 해제] · [연결] (타임라인 오른쪽 클릭, 2026-10-25 사장님 — 프리미어처럼)
   *  메인 클립 = 화면·소리를 따로 고르게 (unlink 표시만). 올린 영상 = 소리를 음악 레이어로 떼어 따로 옮기게 (영상은 소리 끔), 연결하면 다시 하나로 */
  const linkPick = (pk: Pick, link: boolean) => {
    change((p) => {
      if (pk.kind !== "layer") {
        const c = findClip(p, pk.id)?.clip;
        if (c) c.unlink = link ? undefined : true;
        return;
      }
      const ls = p.layers || [];
      const l = ls.find((x) => x.id === pk.id);
      if (!l) return;
      if (link) {
        // 짝을 찾아 하나로 — 영상 쪽에 소리 크기를 돌려주고 소리 레이어는 지운다
        const v = l.type === "music" ? ls.find((x) => x.id === l.pair) : l;
        const au = l.type === "music" ? l : ls.find((x) => x.id === l.pair);
        if (v) { v.muted = au && (au.volume ?? 1) > 0 ? undefined : v.muted; if (au) v.volume = au.volume; delete v.pair; }
        if (au && v) p.layers = ls.filter((x) => x.id !== au.id);
        else if (au) delete au.pair; // 영상을 지운 뒤라면 소리만 남긴다
        return;
      }
      const a = l.asset ? p.assets[l.asset] : null;
      if (!a) return;
      const au: Layer = { id: uid(), type: "music", name: a.name, file: a.path, url: a.url, volume: l.muted ? 0 : l.volume ?? 1, fadeIn: 0, fadeOut: 0, offset: l.vs || 0, loop: false,
        from: l.from, to: l.to, ts: l.ts, te: l.te, w0: l.w0, w1: l.w1, pair: l.id };
      l.muted = true;
      l.pair = au.id;
      p.layers = [...ls, au];
    });
    setPicks([pk]);
    say(link ? "화면과 소리를 다시 연결했어요" : "연결을 풀었어요 — 화면과 소리를 따로 고르고 옮길 수 있어요");
  };
  /** 고른 것 지우기 — 레이어는 지우고, 클립은 지우고, 자막은 끄고, 소리는 무음, 화면전환은 빼기 */
  const removePicked = () => {
    if (mode !== "timeline" || !picks.length) return removeSel();
    const clips = picks.filter((x) => x.kind === "clip").map((x) => x.id);
    // 자석을 끄면 지운 클립 자리를 빈 공간(검은 화면)으로 남긴다 — 뒤 클립이 당겨지지 않게 (프리미어처럼, 2026-10-25 사장님)
    const durOf = new Map(flat.items.map((x) => [x.clip.id, x.dur]));
    change((p) => {
      const lays = new Set(picks.filter((x) => x.kind === "layer").map((x) => x.id));
      p.layers = (p.layers || []).filter((l) => !lays.has(l.id));
      for (const pk of picks) {
        if (pk.kind === "trans" && pk.id.endsWith(":s")) { const sc = findClip(p, pk.id.slice(0, -2))?.clip; if (sc?.trans) delete sc.trans.sfx; continue; } // 화면전환 효과음만 빼기
        if (pk.kind === "trans" && pk.id.endsWith(":a")) { const xc = findClip(p, pk.id.slice(0, -2))?.clip; if (xc) delete xc.xfade; continue; } // 오디오 크로스페이드 빼기
        const c = findClip(p, pk.id)?.clip;
        if (!c) continue;
        if (pk.kind === "sub") c.sub = false;
        else if (pk.kind === "voice" || pk.kind === "src") c.muted = true;
        else if (pk.kind === "trans") delete c.trans;
      }
      if (clips.length && !magnet) {
        for (const sc of p.scenes) for (const c of sc.clips) {
          if (!clips.includes(c.id)) continue;
          const hold = +(durOf.get(c.id) || 1).toFixed(3);
          for (const k of Object.keys(c)) if (k !== "id") delete (c as Record<string, unknown>)[k]; // 같은 id 그대로 — 그 자리에 붙은 사진·글자도 제자리에
          Object.assign(c, { type: "silence", text: "", hold, gap: true, blank: true, sub: false });
        }
      } else if (clips.length) {
        for (const sc of p.scenes) sc.clips = sc.clips.filter((c) => !clips.includes(c.id));
        p.scenes = p.scenes.filter((sc, i) => sc.clips.length || i === 0);
      }
    });
    setPicks([]);
    say(clips.length && !magnet ? "지웠어요 — 자석이 꺼져 있어 그 자리는 빈 공간으로 남겨요" : "지웠어요 (되돌리기로 살릴 수 있어요)");
  };
  /** 고른 것 좌우 반전 */
  const flipPicked = () => {
    if (mode !== "timeline" || !picks.length) return flipSel();
    change((p) => {
      for (const pk of picks) {
        if (pk.kind === "layer") { const l = (p.layers || []).find((x) => x.id === pk.id); if (l && l.type === "image") l.flipX = !l.flipX || undefined; }
        else if (pk.kind === "clip") { const c = findClip(p, pk.id)?.clip; if (c) c.flipX = !c.flipX || undefined; }
      }
    });
  };
  /** 자르기 도구 (C) — 누른 것을 누른 자리에서 나누기 */
  const razorAt = (pk: Pick, t: number) => {
    if (pk.kind === "layer") {
      let ok = false;
      change((p) => { ok = splitLayer(p, pk.id, t); });
      return say(ok ? "누른 자리에서 나눴어요" : "끝과 너무 가까워서 나눌 수 없어요");
    }
    splitHere(t);
  };
  /** 문자 도구 (T) — 누른 트랙·시각에 글자 (3초) */
  const addTextAt = (t: number, track: number) => {
    const its = flatten(pref.current).items;
    if (!its.length) return say("클립을 먼저 넣어 주세요");
    const tot = its[its.length - 1].start + its[its.length - 1].dur;
    const s0 = Math.max(0, Math.min(t, tot - 0.3));
    const sp = spanOfTimes(its, s0, Math.min(tot, s0 + 3));
    const id = uid();
    change((p) => {
      const l = { id, type: "text", text: "글자를 써 주세요", size: 100, color: "#FFFFFF", font: "Pretendard", x: 0.5, y: 0.5, from: sp.from, to: sp.to } as Layer;
      if (sp.ts !== undefined) l.ts = sp.ts;
      if (sp.te !== undefined) l.te = sp.te;
      p.layers = [...(p.layers || []), l];
      settleTracks(p, { [id]: Math.max(2, track) });
    });
    setPicks([{ kind: "layer", id }]);
    setTool("v");
    say("글자를 넣었어요 — 미리보기에서 두 번 누르면 글을 고쳐요");
  };
  /** 고른 것 지우기 (타임라인) */
  const removeSel = () => {
    if (selLayer && (panel === "layer" || panel === "anim" || mode === "timeline")) return removeLayer(selLayer);
    if (selected.length) actions.removeClip(selected);
  };
  /** 고른 것 좌우 반전 */
  const flipSel = () => {
    const l = selLayer ? (project.layers || []).find((x) => x.id === selLayer) : null;
    if (l && l.type === "image") return updateLayer(l.id, { flipX: !l.flipX || undefined });
    if (l) return say("글자는 반전할 수 없어요");
    for (const id of selected) clipFlip(id, "x");
  };
  /** 고른 것 90도 돌리기 — 점이 있으면 지금 시각 점을 */
  const rotateSel = () => {
    const tg = selXf();
    if (!tg) return say("돌릴 화면·글자·그래픽을 먼저 고르세요");
    const norm = (r: number) => (((r % 360) + 540) % 360) - 180;
    change((p) => {
      const rd = xfRead(p, tg.tg, tg.tau);
      if (rd) xfApply(p, tg.tg, tg.tau ?? 0, { r: norm(rd.show.r + 90) });
    });
  };
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
      note: "화면 영상의 소리예요 (AI 목소리 크기와는 따로)",
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
        const nat = c.voice.duration / speedOf(c, p.settings) + voiceGap(c, p.settings);
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
  const applySub = (patch: Partial<Project["settings"]["subtitle"]>, history = true, all = false) => change((p) => {
    if (!subSel || all) {
      p.settings.subtitle = { ...p.settings.subtitle, ...patch };
      // 전체 클립 적용 — 그 항목을 클립마다 따로 바꿔 둔 것도 지워 모든 클립에 실제로 들어가게 (2026-10-19 사장님: 글자 크기가 안 바뀐다)
      //  끌어 옮기기(x·y)는 위치(position)와 한 묶음으로 본다
      const keys = Object.keys(patch);
      if ("x" in patch || "y" in patch || "position" in patch) keys.push("x", "y", "position");
      for (const c of p.scenes.flatMap((sc) => sc.clips)) {
        if (!c.subStyle) continue;
        const o: Record<string, unknown> = { ...c.subStyle };
        for (const k of keys) delete o[k];
        c.subStyle = Object.keys(o).length ? (o as Clip["subStyle"]) : undefined;
      }
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
  /**
   * 사전 설정 스타일 — 그 모양 그대로 (2026-10-19 사장님: 예전 색·글꼴이 섞이면 안 된다)
   *  전체: 전체 서식을 바꾸고, 클립마다 따로 넣어 둔 모양 항목(AI 편집 강조 노랑 등)은 지운다 (자리·크기·글은 그대로)
   *  고른 클립만: 그 클립들에 모양 항목을 모두 덮어쓴다
   */
  const applyPreset = (look: SubLook) => change((p) => {
    const keys = Object.keys(look) as (keyof SubLook)[];
    if (!subSel) {
      p.settings.subtitle = { ...p.settings.subtitle, ...look, on: true };
      for (const c of p.scenes.flatMap((s) => s.clips)) {
        if (!c.subStyle) continue;
        const o: Record<string, unknown> = { ...c.subStyle };
        for (const k of keys) delete o[k];
        c.subStyle = Object.keys(o).length ? (o as Clip["subStyle"]) : undefined;
      }
      return;
    }
    for (const id of selected) {
      const c = findClip(p, id)?.clip;
      if (c) c.subStyle = { ...(c.subStyle || {}), ...look };
    }
  });
  /** 사진·스티커·화면 글자 애니메이션 (따로 칸 · 화면 글자 칸 [애니메이션] 탭 같이 씀) */
  const layerAnimProps = (l: Layer): AnimBodyProps => ({
    value: l.anim, what: isSticker(l) ? "그래픽" : l.type === "image" ? "사진" : "글자",
    thumb: l.type === "image" && l.asset ? project.assets[l.asset]?.url : undefined, text: l.type === "text" ? String(l.text || "가").trim().slice(0, 4) : undefined,
    count: (project.layers || []).filter((x) => x.type === l.type).length,
    onPreview: (part) => {
      const cov = layerItems(project, l, flat.items);
      if (!cov.length) return;
      const sp = layerSpan(project, l, flat.items, cov[0].clip.id, project.settings);
      if (sp) demoPlay(cov[0].start + sp.a, cov[0].start + sp.b, part);
    },
    onChange: (fn, all) => change((p) => {
      for (const x of p.layers || []) {
        if (all ? x.type !== l.type : x.id !== l.id) continue;
        const n = fn({ ...(x.anim || {}) });
        const clean = Object.fromEntries(Object.entries(n).filter(([, v]) => v !== undefined));
        if (Object.keys(clean).length) x.anim = clean; else delete x.anim;
      }
    }),
  });
  /** 메인자막 애니메이션 — 메인자막 칸의 적용 범위(전체 / 고른 클립만)를 따른다 */
  const subAnimProps = (): AnimBodyProps => ({
    what: "자막", text: "자막", sfxDefault: "none", value: subNow().anim,
    onPreview: (part) => {
      // 고른 클립(없으면 지금 클립)의 첫 자막 조각
      const it = (subSel && flat.items.find((x) => selected.includes(x.clip.id))) || cur || flat.items[0];
      if (!it) return;
      const ln = subtitleLines(it.clip, it.dur, project.settings, RATIO_SIZE[project.ratio][0], RATIO_SIZE[project.ratio][1])[0];
      if (ln) demoPlay(it.start + ln.s, it.start + ln.e, part);
    },
    scopeNote: subSel ? `고른 클립 ${selected.length}개에만 ([텍스트] 탭 맨 위에서 바꿔요)` : "전체 클립 ([텍스트] 탭 맨 위에서 바꿔요)",
    onChange: (fn) => {
      const n = fn({ ...(subNow().anim || {}) });
      const clean = Object.fromEntries(Object.entries(n).filter(([, v]) => v !== undefined));
      applySub({ anim: Object.keys(clean).length ? clean : undefined });
    },
  });
  /** 지금 서식 (고른 클립만이면 처음 고른 클립 것) */
  const subNow = () => (subSel ? subStyleOf(project.settings, findClip(project, selected[0])?.clip) : project.settings.subtitle);
  const clipRemoveVisual = (id: string) => {
    change((p) => {
      const c = findClip(p, id)?.clip;
      if (c) c.visual = null;
    });
    say("화면을 지웠어요 (되돌리기로 살릴 수 있어요)");
  };
  /**
   * 스티커 글자 고치기 — 같은 모양으로 다시 그려 그림만 바꾼다 (자리·움직임·순서·범위 그대로)
   *  글자 길이가 바뀌어도 글자 크기가 그대로 보이게, 높이를 맞춰 너비를 다시 잡는다
   */
  const stickerText = async (id: string, text: string) => {
    const l = (pref.current.layers || []).find((x) => x.id === id);
    const spec = l && stickerSpecOf(l);
    if (!l || !spec || !b.lib.saveImage) return say("공실마케팅를 껐다 켜 주세요 (그래픽 기능을 새로 연결해요)");
    try {
      const s = { ...spec, text };
      const item = await b.lib.saveImage(pref.current.dir, await stickerPng(s), stickerFileName(text));
      const a = await ensureAsset(item);
      const a0 = l.asset ? pref.current.assets[l.asset] : undefined;
      const r0 = a0?.width && a0?.height ? a0.width / a0.height : 0;
      const r1 = a.width && a.height ? a.width / a.height : 0;
      const w = r0 && r1 ? Math.max(0.05, Math.min(1, (l.w ?? 0.35) * (r1 / r0))) : l.w;
      updateLayer(id, { asset: a.id, name: item.name.replace(/_\d+(\.\w+)?$/, ""), stk: { style: s.style, text: s.text, icon: s.icon, color: s.color, ...(s.mo ? { mo: s.mo } : {}) }, sticker: true, w });
      say("그래픽 글자를 바꿨어요");
    } catch (e) {
      say(errText(e));
    }
  };
  /** 템플릿 글·색 고치기 — 같은 모양으로 다시 그려 그림만 바꾼다 (자리·움직임·범위 그대로, 높이를 맞춰 너비를 다시 잡는다) */
  const templateText = async (id: string, text: string, color?: string) => {
    const l = (pref.current.layers || []).find((x) => x.id === id);
    if (!l?.stk || !isTplStyle(l.stk.style) || !b.lib.saveImage) return say("공실마케팅를 껐다 켜 주세요 (템플릿 기능을 새로 연결해요)");
    try {
      await tplFonts();
      const item = await b.lib.saveImage(pref.current.dir, drawTemplate(l.stk.style, text, color).toDataURL("image/png"), l.name || "템플릿");
      const a = await ensureAsset(item);
      const a0 = l.asset ? pref.current.assets[l.asset] : undefined;
      const r0 = a0?.width && a0?.height ? a0.width / a0.height : 0;
      const r1 = a.width && a.height ? a.width / a.height : 0;
      // 글꼴·글자 크기를 바꾸면 그림 크기만큼 (글자가 실제로 커지고 작아지게), 글만 바꾸면 높이를 맞춘다
      const optChanged = JSON.stringify(tplOptsOf(text)) !== JSON.stringify(tplOptsOf(l.stk.text));
      const w = optChanged && a0?.width && a.width ? Math.max(0.05, Math.min(1, (l.w ?? 0.35) * (a.width / a0.width)))
        : r0 && r1 ? Math.max(0.05, Math.min(1, (l.w ?? 0.35) * (r1 / r0))) : l.w;
      updateLayer(id, { asset: a.id, stk: { ...l.stk, text, color }, w });
      say("템플릿 글을 바꿨어요");
    } catch (e) {
      say(errText(e));
    }
  };
  /** 화면 글자 → 그 글자가 든 말풍선 스티커로 (회의 3-28 ④) — 자리·범위·애니메이션·겹치는 순서 그대로 */
  const textToBubble = async (id: string, st: { text: string; style: string; icon?: string; color?: string }) => {
    const l = (pref.current.layers || []).find((x) => x.id === id);
    if (!l || !b.lib.saveImage) return say("공실마케팅를 껐다 켜 주세요 (그래픽 기능을 새로 연결해요)");
    try {
      const spec = { text: st.text, style: st.style as Parameters<typeof stickerPng>[0]["style"], icon: st.icon, color: st.color };
      const item = await b.lib.saveImage(pref.current.dir, await stickerPng(spec), stickerFileName(st.text));
      const a = await ensureAsset(item);
      const free = typeof l.x === "number" && typeof l.y === "number";
      const y = free ? (l.y as number) : l.pos === "middle" ? 0.5 : l.pos === "bottom" ? 0.85 : 0.14;
      change((p) => {
        // 예전 순서(사진 먼저·글자 위)였으면 지금 보이는 순서를 배열에 옮겨 적고 — 그 자리에서 바꾼다 (보이는 앞뒤 그대로)
        if (!p.layerZ) {
          p.layers = [...(p.layers || []).filter((x) => x.type !== "image" && x.type !== "text"), ...zLayers(p, p.layers || [])];
          p.layerZ = 1;
        }
        p.layers = (p.layers || []).map((x) => x.id !== id ? x : ({
          id: x.id, type: "image", from: x.from, to: x.to, w0: x.w0, w1: x.w1, anim: x.anim, off: x.off,
          asset: a.id, name: item.name.replace(/_\d+(\.\w+)?$/, ""), sticker: true, stk: spec,
          x: free ? (x.x as number) : 0.5, y, w: Math.max(0.25, Math.min(0.8, 0.12 + st.text.length * 0.045)), opacity: 1,
        } as Layer));
      });
      openLayer(id);
      say("말풍선으로 바꿨어요 — 글자는 [그래픽 글자]에서 고쳐요 (되돌리기 가능)");
    } catch (e) {
      say(errText(e));
    }
  };
  /** 겹치는 순서 — 스티커·사진·화면 글자 함께, 시간이 겹치는 것끼리만 (회의 3-26) */
  const layerOrder = (id: string, o: MediaOrder) => {
    let ok = false;
    change((p) => { ok = zReorder(p, flatten(p).items, id, o); });
    say(ok ? (o === "top" ? "맨 앞으로 가져왔어요" : o === "up" ? "앞으로 가져왔어요" : o === "down" ? "뒤로 보냈어요" : "맨 뒤로 보냈어요") : "겹치는 것이 없어요");
  };
  const addTextLayer = () => { resetTextTabs(); addLayer({ type: "text", text: "글자를 써 주세요", pos: "top", size: 100, color: "#FFFFFF", font: "Pretendard", box: false }, false); }; // 넣으면 글자 칸 [텍스트 › 기본]부터
  /** [텍스트] 칸 — 고른 모양(꾸민 글자·내 사전설정) 그대로 화면 글자 넣기 */
  /* ── 메인자막 ↔ 텍스트 (2026-10-25 사장님) ── */
  /** 이 클립 메인자막을 같은 자리·모양의 텍스트로 떼어 낸다 — 클립 자막은 비운다 (클립 카드 자막 줄은 "자막 넣기"로 남음) */
  const detachSub = (clipId: string) => {
    const p0 = pref.current;
    const c = findClip(p0, clipId)?.clip;
    if (!c) return;
    const text = (typeof c.subText === "string" ? c.subText : clipText(c)).trim();
    if (!text) return say("떼어 낼 자막이 없어요");
    const st = subStyleOf(p0.settings, c);
    const look: Record<string, unknown> = {};
    const KEYS = ["font", "color", "outline", "outlineWidth", "bold", "shadow", "shadowColor", "glow", "outline2", "outline2Width", "gradTo", "gradType", "gradAngle", "gradA", "gradB", "spacing", "italic", "underline", "textCase", "align", "textAlpha", "outlineAlpha", "bgPad", "shadowAlpha", "glowSize", "glowAlpha"] as const;
    for (const k of KEYS) if (st[k] !== undefined) look[k] = st[k];
    look.box = Boolean(st.bg);
    if (st.bg) { look.boxColor = st.bgColor; look.boxOpacity = st.bgOpacity; }
    // 자리 — 끌어 옮긴 자리면 그대로, 아니면 위치(상단~하단)의 가운데쯤 (Player 자막 자리와 같게)
    const Y: Record<string, number> = { top: 0.12, "middle-high": 0.28, middle: 0.5, "middle-low": 0.72, bottom: 0.88 };
    const x = typeof st.x === "number" ? st.x : 0.5;
    const y = typeof st.y === "number" ? st.y : Y[st.position] ?? 0.88;
    const id = uid();
    change((p) => {
      const cc = findClip(p, clipId)?.clip;
      if (cc) cc.subText = "";
      // 글자 크기 100% — 자막은 짧은 변 × 0.062, 텍스트는 × 0.08 이라 같은 크기로 맞춘다
      p.layers = [...(p.layers || []), { id, type: "text", text, size: Math.round((st.size || 100) * 0.775), x, y, ...(st.rot ? { rot: st.rot } : {}), ...look, from: clipId, to: clipId } as Layer];
    });
    setSelLayer(id);
    setPanel("layer");
    say("자막을 텍스트로 떼어 냈어요 — 미리보기에서 끌어 옮기고 마음대로 꾸며요");
  };
  /** 텍스트를 그 텍스트가 시작하는 클립의 메인자막으로 — 텍스트는 지운다 (모양은 메인자막 서식을 따름) */
  const textToSub = (layerId: string) => {
    const l = (pref.current.layers || []).find((x) => x.id === layerId);
    const text = (l?.text || "").trim();
    if (!l || !text) return say("바꿀 글이 없어요");
    const tc = findClip(pref.current, l.from)?.clip;
    if (!tc) return say("텍스트가 걸친 클립을 찾지 못했어요");
    // 그 클립에 메인자막이 이미 있으면 — 바뀐다고 먼저 알린다 (2026-10-25 사장님)
    const old = (typeof tc.subText === "string" ? tc.subText : clipText(tc)).trim();
    if (old && tc.sub !== false) {
      const n = flatten(pref.current).items.findIndex((x) => x.clip.id === tc.id) + 1;
      if (!window.confirm(`클립 ${n}에 이미 메인자막이 있어요.\n\n지금 메인자막: "${old.length > 40 ? old.slice(0, 40) + "…" : old}"\n\n지금 있는 메인자막은 없어지고 이 글로 바뀝니다. 바꿀까요?`)) return;
    }
    change((p) => {
      const c = findClip(p, l.from)?.clip;
      if (c) { c.subText = text; delete c.sub; }
      p.layers = (p.layers || []).filter((x) => x.id !== layerId);
    });
    setSelLayer("");
    setSelected([l.from]);
    setSubClip(l.from);
    setPanel("subtitle");
    say(pref.current.settings.subtitle.on ? "메인자막으로 바꿨어요" : "메인자막으로 바꿨어요 — 지금 메인자막이 꺼져 있어요 (자막 보이기를 켜 주세요)");
  };
  /** 오른쪽 칸 제목 — 메인자막·텍스트 모두 "텍스트" 하나, 옆에 지금 고치는 것만 회색 글로 (2026-10-25 사장님: 보이는 것은 텍스트 하나) */
  const textHead = (note: string, back = false) => (
    <span style={{ display: "flex", alignItems: "baseline", gap: 8, minWidth: 0 }}>
      {back ? (
        // ‹ 텍스트 — 속성에서 첫 페이지(새로 넣기·디자인)로
        <button type="button" onClick={() => { setSelLayer(""); setPanel("text"); }} title="텍스트 첫 페이지로 (새로 넣기·디자인)"
          style={{ display: "flex", alignItems: "baseline", gap: 4, padding: 0, border: 0, background: "transparent", color: C.text, fontSize: 17, fontWeight: 800, fontFamily: FONT, cursor: "pointer", whiteSpace: "nowrap" }}>
          <span style={{ fontSize: 20, color: C.sub }}>‹</span>텍스트
        </button>
      ) : <span style={{ fontSize: 17, fontWeight: 800, whiteSpace: "nowrap" }}>텍스트</span>}
      {/* 앞말(메인자막)은 흰 글로 — 지금 무엇을 고치는지 (2026-10-25 사장님), 뒤(· 클립 3)는 회색 */}
      {note && (() => {
        const [head, ...rest] = note.split(" · ");
        return (
          <span style={{ fontSize: 13, color: C.dim, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            <span style={{ color: C.text, fontWeight: 800 }}>{head}</span>
            {rest.length > 0 && ` · ${rest.join(" · ")}`}
          </span>
        );
      })()}
    </span>
  );
  const addStyledText = (look: TextLook, anim?: Layer["anim"]) => {
    const o: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(look)) {
      if (v === undefined || k === "leading") continue;
      o[k === "bg" ? "box" : k === "bgColor" ? "boxColor" : k === "bgOpacity" ? "boxOpacity" : k] = v;
    }
    addLayer({ type: "text", text: "글자를 써 주세요", pos: "top", size: 100, color: "#FFFFFF", font: "Pretendard", box: false, ...o, ...(anim && Object.keys(anim).length ? { anim } : {}) } as Omit<Layer, "id" | "from" | "to">, false);
  };
  /** [효과음] 칸 — 고른 클립(단어를 골랐으면 그 단어) 시작에 한 번 */
  const addSfx = (id: string, label: string, volume: number, mine?: { file: string; url: string }) => {
    const wp = wordPick.current;
    wordPick.current = null;
    const nid = uid();
    if (wp && findClip(pref.current, wp.clip)) {
      change((p) => { p.layers = [...(p.layers || []), { id: nid, type: "sfx", sfx: id, name: label, volume, ...(mine || {}), from: wp.clip, to: wp.clip, w0: wp.w0, w1: wp.w1 } as Layer]; });
    } else {
      const r = rangeFor(false);
      if (!r) return say("클립을 먼저 넣어 주세요");
      change((p) => { p.layers = [...(p.layers || []), { id: nid, type: "sfx", sfx: id, name: label, volume, ...(mine || {}), from: r.from, to: r.from } as Layer]; });
    }
    say(`효과음 "${label}"을 넣었어요`);
  };
  const openMusic = (target = "") => {
    setMusicTarget(target);
    setPanel("music");
  };
  const onMusic = (m: { file: string; url: string; name: string }, range?: SrcRange | null) => {
    if (range && !musicTarget) {
      // 쓸 부분만 (2026-10-25 사장님) — 고른 클립 처음(없으면 영상 처음)부터 구간 길이만큼, 그 구간 소리만 (반복 없이)
      const its = flatten(pref.current).items;
      if (!its.length) return say("클립을 먼저 넣어 주세요");
      const tot = its[its.length - 1].start + its[its.length - 1].dur;
      const first = its.find((x) => selected.includes(x.clip.id));
      const s0 = first ? first.start : 0;
      const len = Math.max(0.5, range.e - range.s);
      const sp = spanOfTimes(its, s0, Math.min(tot, s0 + len));
      const id = uid();
      change((p) => {
        const l = { id, type: "music", ...m, volume: 0.5, fadeIn: 0, fadeOut: Math.min(2, +(len / 4).toFixed(2)), offset: +range.s.toFixed(2), loop: false, from: sp.from, to: sp.to } as Layer;
        if (sp.ts !== undefined) l.ts = sp.ts;
        if (sp.te !== undefined) l.te = sp.te;
        p.layers = [...(p.layers || []), l];
      });
      setSelLayer(id);
      setPanel("layer");
      say(`음악 ${fmtTime(range.s, false)}~${fmtTime(range.e, false)} 부분만 ${first ? "고른 클립부터" : "영상 처음부터"} 넣었어요`);
      return;
    }
    if (musicTarget) {
      updateLayer(musicTarget, m);
      openLayer(musicTarget);
      say("음악을 바꿨어요");
    } else addLayer({ type: "music", ...m, volume: 0.5, fadeIn: 0, fadeOut: 2, offset: 0, loop: true }, true); // 편집에서 직접 넣는 음악은 50 (BGM 자동으로 깔 때만 5 — 2026-10-23 사장님)
  };

  /* 클립 화면 → AI 이미지 (2026-10-31 사장님) — 고른 스타일로, 글 AI 가 이 클립 대사로 장면 설명 → 이미지 AI 가 그림 → 이 클립 화면으로.
     클립 화면 왼쪽 클릭 메뉴 [교체] 아래 [AI 이미지 생성하기]. 스타일은 [사진·영상 고르기 › AI 그림] 탭과 같이 기억한다 ("○○ 스타일로 다시 만들기") */
  const AI_STYLE_KEY = "gsv:aiImgStyle";
  const lastAiStyle = () => { try { return localStorage.getItem(AI_STYLE_KEY) || ""; } catch { return ""; } };
  const aiVisual = async (id: string, styleId: string) => {
    const st = IMAGE_STYLES.find((x) => x.id === styleId) || IMAGE_STYLES[0];
    try { localStorage.setItem(AI_STYLE_KEY, st.id); } catch {}
    const f = findClip(pref.current, id);
    const text = f ? clipText(f.clip).trim() : "";
    if (!text) return say("대사가 없는 클립이라 그림을 만들 수 없어요");
    if (!b.ai.imagePrompts) return say("공실마케팅을 껐다 켜 주세요 (AI 이미지 기능을 새로 연결해요)");
    setBusy((x) => ({ ...x, [id]: "AI가 장면 설명을 쓰는 중…" }));
    try {
      const [prompt] = await b.ai.imagePrompts([text], { kinds: ["auto"], style: st.label, character: st.character });
      // 수동(내 계정)에서 AI 가 설명 대신 그림을 바로 줬으면 그 그림을 그대로 쓴다 (2026-10-31)
      const given = /^data:image\//.test(prompt || "");
      if (!given) setBusy((x) => ({ ...x, [id]: `${st.label} 그림을 그리는 중… (30초~1분)` }));
      const it = await b.ai.image(pref.current.dir, given ? prompt : imagePrompt(prompt || text, st), { ratio: pref.current.ratio });
      const a = await ensureAsset(it);
      change((p) => {
        const c = findClip(p, id)?.clip;
        if (c) { c.visual = { asset: a.id, s: 0 }; delete c.box; }
      });
      say(`${st.label} 그림으로 바꿨어요 (Ctrl+Z 로 되돌리기)`);
    } catch (e) {
      if (!isStopped(e)) say(`그림을 만들지 못했어요: ${errText(e)}`);
    } finally {
      setBusy((x) => { const y = { ...x }; delete y[id]; return y; });
    }
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
  const onPick = async (item: LibItem, action: LibPickAction, opt?: { range?: SrcRange | null; hold?: number }) => {
    const a = await ensureAsset(item);
    const rg = a.kind === "video" && opt?.range ? opt.range : null; // 두 번 눌러 고른 쓸 부분 (2026-10-25)
    if (action === "overlay") {
      // 영상도 화면 위에 (2026-10-21 사장님) — 영상 소리는 처음엔 무음 (목소리와 겹치지 않게, 속성에서 키운다)
      if (a.kind !== "image" && a.kind !== "video") return say("사진·영상만 화면 위에 올릴 수 있어요");
      if (overlayTarget) {
        updateLayer(overlayTarget, { asset: a.id, name: a.name, ...(a.kind === "video" ? { vs: 0, volume: 0 } : {}) });
        openLayer(overlayTarget);
        say(a.kind === "video" ? "영상으로 바꿨어요" : "사진을 바꿨어요");
      } else addLayer({ type: "image", asset: a.id, name: a.name, x: 0.8, y: 0.18, w: 0.3, opacity: 1, ...(a.kind === "video" ? { vs: 0, volume: 0 } : {}) }, false);
      return;
    }
    if (action === "replace" && selected.length) {
      change((p) => {
        const order = flatten(p).items.map((x) => x.clip.id).filter((x) => selected.includes(x));
        order.forEach((id, k) => {
          const c = findClip(p, id)?.clip;
          if (!c) return;
          c.visual = c.src && c.src.asset === a.id ? null : rg ? { asset: a.id, s: rg.s, e: rg.e } : { asset: a.id, s: 0 };
          if (a.kind === "video" && k > 0 && c.visual && !rg) { c.visualCont = true; c.visualHold = true; } else delete c.visualCont;
        });
      });
      say(`화면을 바꿨어요 (클립 ${selected.length}개)${a.kind === "video" && !rg ? " · 영상 시작점은 썸네일을 눌러 고를 수 있어요" : ""}`);
      return;
    }
    await placeMedia(a, lastSelected(), false, rg, opt?.hold);
  };

  /** 모션그래픽 틀 (2026-10-28 사장님) — 이 영상 공실 정보로 구워 맨 앞에 넣는다 */
  const [motionAsk, setMotionAsk] = useState<"" | "intro" | "outro">(""); // 인트로·끝 화면 고르기 창
  const openMotion = (kind: "intro" | "outro" = "intro") => {
    const p = pref.current;
    if (!b.project.motionRender) return say("앱을 새 버전으로 다시 켜 주세요");
    // 공실이 없어도 된다 — 글자를 직접 쓰거나 공실을 불러온다 (2026-10-28 사장님)
    if (!b.project.motionOptions) return p.vacancyId ? void insertMotion({ template: "intro", vacancyId: p.vacancyId, ratio: p.ratio }) : say("앱을 새 버전으로 다시 켜 주세요");
    setMotionAsk(kind);
  };
  /* ── 모션 자동 입히기 (2026-10-28 사장님) — 장면마다 문장을 읽어 고른 모션을, 그 장면 화면을 배경으로 구워 화면을 바꾼다 ── */
  const [autoMotion, setAutoMotion] = useState(false);
  const runAutoMotion = async (r: AutoRun) => {
    setAutoMotion(false);
    const p0 = pref.current;
    const P = STYLE_PACKS.find((x) => x.id === r.packId) || STYLE_PACKS[0];
    const font = SUB_PRESETS.flatMap((g) => g.items).find((x) => x.id === P.sub)?.look.font || "Pretendard";
    const accent = P.swatch[1];
    let done = 0;
    for (const { clipId, plan } of r.plans) {
      const it = flatten(pref.current).items.find((x) => x.clip.id === clipId);
      if (!it) continue;
      const c = it.clip;
      const vis = c.visual || (c.src ? { asset: c.src.asset, s: c.src.s } : null);
      const a = vis ? pref.current.assets[vis.asset] : null;
      setWork({ title: `장면 ${++done}/${r.plans.length} — ${plan.label} 입히는 중…`, detail: clipText(c).slice(0, 40), frac: done / (r.plans.length + 1) });
      try {
        const item = await b.project.motionScene!({ template: plan.template, data: plan.data, ratio: p0.ratio, seconds: it.dur, bg: a ? a.edit || a.path : "", bgStart: vis?.s || 0, font, accent, dir: p0.dir });
        setWork(null);
        const na = await ensureAsset(item);
        change((p) => { const cc = findClip(p, clipId)?.clip; if (!cc) return; cc.mg = { template: plan.template, data: plan.data, prev: cc.mg?.prev ?? (cc.visual ? { ...cc.visual } : null) }; cc.visual = { asset: na.id, s: 0 }; cc.visualHold = true; });
      } catch (e) {
        say(`장면 ${done} 모션을 못 입혔어요: ${errText(e)}`);
      }
    }
    setWork(null);
    say(`장면 ${done}개에 모션을 입혔어요`);
    // 인트로 · 끝 화면 · 자막·전환·음악까지 같은 스타일로
    if (r.intro && b.project.motionRender) await insertMotion({ template: r.intro, vacancyId: p0.vacancyId || "", ratio: p0.ratio, font, accent }, true);
  };
  /** 모션 빼기 — 입히기 전 화면으로 */
  const removeMotion = (ids: string[]) => change((p) => { for (const id of ids) { const c = findClip(p, id)?.clip; if (!c?.mg) continue; c.visual = c.mg.prev || null; delete c.mg; delete c.visualHold; } });
  /** 인트로와 짝인 편집 스타일을 영상 전체에 (2026-10-28 사장님) — 자막 모양·나타나기 · 클립 사이 전환 · 배경음악(없을 때) */
  const applyIntroPack = async (template: string, font?: string) => {
    const P = packOfIntro(template);
    const base = SUB_PRESETS.flatMap((g) => g.items).find((x) => x.id === P.sub)?.look;
    // 인트로에서 고른 글씨를 자막·화면 글자에도 (2026-10-28 사장님: 폰트부터 전체가 맞아야)
    const look = base ? { ...base, ...(font ? { font } : {}) } : font ? { font } : undefined;
    let music: { file: string; url: string; name: string } | null = null;
    if (!(pref.current.layers || []).some((l) => l.type === "music")) {
      const track = MUSIC_LIBRARY.find((t) => t.mood === P.music) || MUSIC_LIBRARY[0];
      if (track) { const r = await b.musicGet(pref.current.dir, `bgm/lib/${track.id.slice(4)}.mp3`).catch(() => null); if (r) music = { file: r.file, url: r.url, name: track.label }; }
    }
    change((p) => {
      for (const l of p.layers || []) if (l.type === "text" && font) l.font = font; // 화면 글자도 같은 글씨
      if (look) p.settings.subtitle = { ...p.settings.subtitle, ...look, anim: { ...(p.settings.subtitle.anim || {}), in: P.subIn, ...(P.word ? { wshow: "word" as const, whl: "color" as const } : {}) } };
      const items = flatten(p).items;
      items.forEach((x, i) => { if (i === 0) return; const c = findClip(p, x.clip.id)?.clip; if (c) c.trans = { type: P.trans[(i - 1) % P.trans.length], a: 0.3, b: 0.3 }; });
      if (music && items.length) p.layers = [...(p.layers || []), { id: uid(), type: "music", from: items[0].clip.id, to: items[items.length - 1].clip.id, name: music.name, file: music.file, url: music.url, volume: 0.15, fadeIn: 0, fadeOut: 2, offset: 0, loop: true } as Layer];
    });
    say(`영상 전체를 "${P.label}" 스타일로 맞췄어요 (글씨·자막·전환${music ? "·배경음악" : ""})`);
  };
  const insertMotion = async (o: MotionOpts, styleAll = false, at: "start" | "end" = "start") => {
    const p = pref.current;
    if (!b.project.motionRender) return;
    setMotionAsk("");
    const what = at === "end" ? "끝 화면" : "인트로";
    setWork({ title: `모션그래픽 ${what}을 굽는 중…`, detail: "3초 장면을 만들어요" });
    const off = b.onProgress((t) => setWork({ title: t, detail: `${what} 장면을 만들어요` }));
    let item: LibItem;
    try {
      item = await b.project.motionRender({ ...o, ratio: p.ratio, dir: p.dir });
    } catch (e) {
      off();
      setWork(null);
      return say(errText(e));
    }
    off();
    setWork(null);
    const a = await ensureAsset(item);
    const its = flatten(pref.current).items;
    if (at === "end") await placeMedia(a, its[its.length - 1]?.clip.id, false);
    else await placeMedia(a, its[0]?.clip.id, true);
    say(`${what}을 맨 ${at === "end" ? "끝" : "앞"}에 넣었어요`);
    if (styleAll && at === "start") {
      await applyIntroPack(o.template, o.font).catch((e) => say(errText(e)));
      // 짝 끝 화면도 맨 끝에 (같은 글씨·색·글자) — 이미 끝 화면을 넣었으면 그대로
      await insertMotion({ ...o, template: outroOfIntro(o.template) }, false, "end");
    }
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
  const placeMedia = async (a: Asset, refId: string | undefined, before: boolean, range?: SrcRange | null, photoHold?: number): Promise<string | undefined> => {
    // range = 소스 모니터에서 찍은 시작·끝 (2026-10-25) — 그 구간만
    const rs = a.kind === "video" && range ? Math.max(0, range.s) : 0;
    const re = a.kind === "video" && range ? Math.min(a.duration || range.e, range.e) : a.duration;
    if (a.kind === "video" && a.hasAudio) {
      // 영상 통째로 한 클립 (전체 구간) — 앞뒤는 화면 메뉴 [시작·끝 자르기], 문장 나누기는 [자동 자막 만들기]
      const clip: Clip = { id: uid(), type: "source", text: "", words: [], src: { asset: a.id, s: rs, e: re } };
      insertAt([clip], refId, before);
      setSelected([clip.id]);
      say("영상을 넣었어요. 화면을 누르면 앞뒤를 자를 수 있어요");
      return clip.id;
    }
    const clip: Clip = { id: uid(), type: "voice", text: "", words: [], voice: null, visual: { asset: a.id, s: rs, ...(range && a.kind === "video" ? { e: re } : {}) }, hold: a.kind === "video" ? (range ? Math.max(0.1, re - rs) : a.duration || 5) : photoHold || 3 }; // 영상은 원본 길이 그대로 (앞뒤는 화면 메뉴 [시작·끝 자르기]로)
    insertAt([clip], refId, before);
    setSelected([clip.id]);
    say("화면 클립을 넣었어요. 글을 쓰면 AI 목소리로 읽어요");
    return clip.id;
  };

  /** 사진 넣기 창에서 끌어 온 보여 줄 시간 */
  const holdOf = (raw: string): number | undefined => {
    try {
      const h = Number((JSON.parse(raw) as { hold?: number }).hold);
      return h > 0 ? h : undefined;
    } catch {
      return undefined;
    }
  };
  /** 끌어 온 것에 소스 모니터 구간이 있으면 */
  const rangeOf = (raw: string): SrcRange | null => {
    try {
      const r = (JSON.parse(raw) as { range?: SrcRange }).range;
      return r && r.e > r.s ? r : null;
    } catch {
      return null;
    }
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
  /** 클립 화면을 끌어서 다른 클립으로 (2026-10-21 사장님) — 받는 클립에 화면이 있으면 서로 바꾼다. 촬영 클립 원본 화면은 옮길 수 없어 복사 */
  const moveVisual = (fromId: string, toId: string) => {
    if (fromId === toId) return;
    const KEYS = ["visual", "visualHold", "fillFrom", "fill", "box", "flipX", "flipY", "rot", "opacity"] as const;
    let msg = "";
    change((p) => {
      const a = findClip(p, fromId)?.clip, t = findClip(p, toId)?.clip;
      if (!a || !t) return;
      const take = (c: Clip) => Object.fromEntries(KEYS.map((k) => [k, structuredClone(c[k])])) as Partial<Clip>;
      const put = (c: Clip, v: Partial<Clip>) => { for (const k of KEYS) { if (v[k] === undefined || v[k] === null && k !== "visual") delete c[k]; else (c as Record<string, unknown>)[k] = v[k]; } };
      if (!a.visual && a.src) { // 촬영 원본 화면 — 그 영상을 받는 클립 화면으로 (원본은 그대로)
        t.visual = { asset: a.src.asset, s: a.src.s };
        msg = "촬영 화면을 이 클립에 넣었어요";
        return;
      }
      const va = take(a), vt = take(t);
      // 이어 붙인 구간(앞 클립에 이어서)이던 화면은 옮기면 처음(0초)부터 — 다른 자리에선 그 시작점이 맞지 않는다
      const fresh = (v: Partial<Clip>, wasCont?: boolean) => (wasCont && v.visual ? { ...v, visual: { asset: v.visual.asset, s: 0 } } : v);
      const ca = a.visualCont, ct = t.visualCont;
      delete a.visualCont; delete t.visualCont;
      put(t, fresh(va, ca));
      if (vt.visual) { put(a, fresh(vt, ct)); msg = "두 클립 화면을 서로 바꿨어요"; }
      else { put(a, { visual: null }); msg = "화면을 옮겼어요"; }
    });
    setSelected([toId]);
    if (msg) say(msg);
  };
  const onDropMedia = async (clipId: string, where: "before" | "after" | "replace", raw: string) => {
    try {
      const d = JSON.parse(raw) as { fromClip?: string };
      if (d.fromClip) return moveVisual(d.fromClip, clipId);
    } catch {}
    const item = await dropItem(raw);
    if (!item) return;
    const a = await ensureAsset(item);
    const rg = a.kind === "video" ? rangeOf(raw) : null; // 쓸 부분 고르기 창에서 끌어 온 구간
    if (where === "replace") {
      // 고른 클립 중 하나에 놓으면 고른 클립 전부
      const ids = selected.length > 1 && selected.includes(clipId) ? selected : [clipId];
      change((p) => {
        const order = flatten(p).items.map((x) => x.clip.id).filter((x) => ids.includes(x));
        order.forEach((id, k) => {
          const c = findClip(p, id)?.clip;
          if (!c) return;
          c.visual = c.src && c.src.asset === a.id ? null : rg ? { asset: a.id, s: rg.s, e: rg.e } : { asset: a.id, s: 0 };
          // 영상을 여러 클립에 — 이어서 (붙어 있는 클립끼리, chainVisuals 가 시작점을 맞춘다)
          if (a.kind === "video" && k > 0 && c.visual && !rg) { c.visualCont = true; c.visualHold = true; } else delete c.visualCont;
        });
      });
      setSelected(ids);
      say((ids.length > 1 ? `고른 클립 ${ids.length}개 화면을 바꿨어요` : "이 클립 화면을 바꿨어요") + (a.kind === "video" && !rg ? " · 영상 시작점은 썸네일을 눌러 고를 수 있어요" : ""));
    } else await placeMedia(a, clipId, where === "before", rg, holdOf(raw));
  };
  /**
   * 스티커·템플릿 끌어 놓기 (2026-10-20 사장님) — 클립 카드 = 그 클립에, 미리보기 = 지금 클립 그 자리에, 타임라인 = 놓은 시각부터 3초
   *  그림은 놓는 순간 그린다 (스티커 칸이 끌기 시작할 때 stickerDrag.make 를 채워 둔다)
   */
  const onDropSticker = async (to: { clipId?: string; t?: number; x?: number; y?: number; track?: number }) => {
    const make = stickerDrag.make;
    stickerDrag.make = null;
    if (!make) return;
    say("그래픽을 넣는 중…");
    try {
      const { item, o } = await make();
      const a = await ensureAsset(item);
      const its = flatten(pref.current).items;
      if (!its.length) return say("클립을 먼저 넣어 주세요");
      let span: { from: string; to: string; ts?: number; te?: number };
      if (typeof to.t === "number") {
        const tot = its[its.length - 1].start + its[its.length - 1].dur;
        const s0 = Math.max(0, Math.min(to.t, tot - 0.3));
        span = spanOfTimes(its, s0, Math.min(tot, s0 + 3));
      } else {
        const id = to.clipId && its.some((x) => x.clip.id === to.clipId) ? to.clipId : its[0].clip.id;
        span = { from: id, to: id };
      }
      const id = uid();
      change((p) => {
        const l = { id, type: "image", asset: a.id, name: item.name.replace(/_\d+(\.\w+)?$/, ""), x: to.x ?? 0.5, y: to.y ?? o.y ?? 0.32, w: o.w, opacity: 1, anim: o.anim, sticker: true, stk: o.spec, from: span.from, to: span.to } as Layer;
        if (span.ts !== undefined) l.ts = span.ts;
        if (span.te !== undefined) l.te = span.te;
        p.layers = [...(p.layers || []), l];
        if (mode === "timeline") settleTracks(p, typeof to.track === "number" ? { [id]: to.track } : {});
      });
      setSelLayer(id);
      const n = its.findIndex((x) => x.clip.id === span.from) + 1;
      say(typeof to.t === "number" ? "그래픽을 놓은 시각에 넣었어요 — 미리보기에서 끌어 옮기고 크기를 바꿔요" : `클립 ${n}에 그래픽을 넣었어요 — 미리보기에서 끌어 옮기고 크기를 바꿔요`);
      if (typeof to.t !== "number") seekClip(span.from, 0.05);
    } catch (e) {
      say(`그래픽을 넣지 못했어요: ${errText(e)}`);
    }
  };
  /** 왼쪽 애셋 줄에 놓으면 사진 올리기 — 그 클립부터 끝까지 (고른 클립 중 하나에 놓으면 고른 범위) */
  const onDropLayer = async (clipId: string, raw: string) => {
    const item = await dropItem(raw);
    if (!item) return;
    if (item.kind !== "image" && item.kind !== "video") return say("왼쪽 줄에는 사진·영상만 올릴 수 있어요");
    const a = await ensureAsset(item);
    const items = flatten(pref.current).items;
    const sel = selected.length > 1 && selected.includes(clipId) ? selRange() : null;
    const r = sel || (items.length ? { from: clipId, to: items[items.length - 1].clip.id, n: items.length - items.findIndex((x) => x.clip.id === clipId) } : null);
    if (!r) return;
    const id = uid();
    change((p) => {
      p.layers = [...(p.layers || []), { id, type: "image", asset: a.id, name: a.name, x: 0.8, y: 0.18, w: 0.3, opacity: 1, from: r.from, to: r.to, ...(a.kind === "video" ? { vs: 0, volume: 0 } : {}) } as Layer];
    });
    setSelLayer(id);
    setPanel("layer");
    say(`사진을 클립 ${r.n}개 위에 올렸어요`);
  };
  /** 미리보기에 놓으면 그 자리에 사진 올리기 */
  /** 메인 줄에 클립을 넣기 전 레이어 길이 — 넣은 뒤 걸쳐 있던 레이어가 늘어나지 않게 (캡컷처럼 시작은 붙은 클립 따라, 길이는 그대로) */
  const layerLens = () => {
    const its = flatten(pref.current).items;
    const m = new Map<string, number>();
    for (const l of pref.current.layers || []) { const r = layerRange(pref.current, l, its); if (r && typeof l.w0 !== "number") m.set(l.id, r.e - r.s); }
    return m;
  };
  const keepLayerLens = (m: Map<string, number>) => {
    if (mode !== "timeline" || !m.size) return;
    change((p) => {
      const its = flatten(p).items;
      if (!its.length) return;
      const tot = its[its.length - 1].start + its[its.length - 1].dur;
      for (const l of p.layers || []) {
        const len = m.get(l.id);
        const r = len === undefined ? null : layerRange(p, l, its);
        if (!r || len === undefined || Math.abs(r.e - r.s - len) < 0.01) continue;
        const sp = spanOfTimes(its, r.s, Math.min(tot, r.s + len));
        l.to = sp.to;
        if (sp.te === undefined || l.type === "sfx") delete l.te; else l.te = sp.te;
      }
    }, false);
  };
  /** 타임라인 자료 칸 ＋ (캡컷처럼) — 사진·영상은 메인(V1) 재생 막대 자리(그 클립 뒤)에, 소리는 A 트랙 재생 막대 자리에. 넣은 것을 고른다 */
  const plusAdd = async (item: LibItem) => {
    const a = await ensureAsset(item);
    if (a.kind === "audio") return void (await dropOver(time, 3, JSON.stringify({ lib: item })));
    const its = flatten(pref.current).items;
    const it = its.find((x) => time >= x.start && time < x.start + x.dur) || its[its.length - 1];
    const before = Boolean(it && time - it.start < it.dur / 2 && time > 0.001 && it === its[0] && time - it.start < 0.05);
    const lens = layerLens();
    const id = await placeMedia(a, it?.clip.id, before);
    keepLayerLens(lens);
    if (id) {
      setPicks([{ kind: "clip", id }]);
      setTimeout(() => seekClip(id, 0.01), 60);
    }
  };
  /** 빈 타임라인에 사진·영상 놓기 — 첫 클립으로 */
  const onDropPreview2 = async (raw: string) => {
    const item = await dropItem(raw);
    if (!item) return;
    const a = await ensureAsset(item);
    await placeMedia(a, undefined, false);
  };
  const onDropPreview = async (e: React.DragEvent<HTMLDivElement>) => {
    const raw = e.dataTransfer.getData(DRAG_MEDIA);
    if (!raw) return;
    e.preventDefault();
    const box = (e.currentTarget.firstElementChild as HTMLElement | null)?.getBoundingClientRect();
    const x = box ? Math.max(0, Math.min(1, (e.clientX - box.left) / box.width)) : 0.5;
    const y = box ? Math.max(0, Math.min(1, (e.clientY - box.top) / box.height)) : 0.5;
    const item = await dropItem(raw);
    if (!item) return;
    if (item.kind !== "image" && item.kind !== "video") return say("화면 위에는 사진·영상만 올릴 수 있어요");
    const a = await ensureAsset(item);
    addLayer({ type: "image", asset: a.id, name: a.name, x: +x.toFixed(4), y: +y.toFixed(4), w: 0.3, opacity: 1, ...(a.kind === "video" ? { vs: 0, volume: 0 } : {}) }, false);
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
      markSaved();
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
    // 지금 내용이 저장한 것과 같으면 묻지 않는다 (고쳤다가 되돌린 경우 포함)
    if (!gssMode || snapOf(pref.current) === savedSnap.current) { if (dirty) setDirty(false); return next(); }
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
    if (!b.project.packageInfo) return say("공실마케팅를 껐다 켜 주세요 (프로젝트 패키지 기능을 새로 연결해요)");
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
      markSaved(np);
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
      const clip: Clip = { id: uid(), type: "voice", text: "", words: [], voice: null, visual: null, hold: sp.sec }; // 빈 클립 = 검은 화면 (2026-10-20 사장님)
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
  const applyVoice = async (o: { id: string; speed: number; volume: number; scope: "all" | "selected" | "words"; emotion?: string }) => {
    if (o.scope === "words") return voiceForWords(o);
    const ids: string[] = [];
    change((p) => {
      // 타입캐스트 감정(말투) — 바뀌면 그 성우 클립은 새로 만든다
      const emoWas = (p.settings.voice as { emotion?: string }).emotion;
      const emoChanged = o.emotion !== undefined && o.emotion !== emoWas;
      if (o.emotion !== undefined) (p.settings.voice as { emotion?: string }).emotion = o.emotion;
      if (o.scope === "all") {
        const changed = p.settings.voice.id !== o.id || (emoChanged && /^(tc|el)_/.test(o.id));
        p.settings.voice = { ...p.settings.voice, id: o.id, speed: o.speed, volume: o.volume };
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
          if (was !== o.id || (emoChanged && /^(tc|el)_/.test(o.id))) {
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
    if (!b.voiceJoin) return say("공실마케팅를 새 버전으로 다시 켜 주세요 (단어 목소리 잇기)");
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
  /** 고른 단어 복사 — 복사했으면 true. 녹화·촬영(원본 소리) 클립은 단어를 옮기지 않는다 (2026-10-18 회의: 떼어 붙이면 어색하고 클립이 쪼개짐) */
  const copyWords = (): boolean => {
    if (!selWord) return false;
    const c = findClip(pref.current, selWord.clip)?.clip;
    if (!c?.words) return false;
    const is = wordIs().filter((i) => c.words![i]);
    if (!is.length) return false;
    if (c.type !== "voice" && c.src) {
      say("녹화한 말은 단어를 옮길 수 없어요 — 지우려면 단어의 ⓧ, 문장째 옮기려면 클립을 옮겨 주세요");
      return false;
    }
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
    return true;
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
      // 고른 단어가 끝 단어가 아니면 그 뒤에서 나눈다 (splitAt 과 같은 방식) — AI 목소리 클립만. 녹화 클립은 쪼개지 않고 클립 뒤에 붙인다
      if (c.type === "voice" && c.words && t >= 0 && t < c.words.length - 1) {
        const a = c.words.slice(0, t + 1), bw = c.words.slice(t + 1);
        const second: Clip = structuredClone(c);
        second.id = tail = uid();
        delete second.subText;
        if (c.type === "voice") {
          c.words = a;
          c.text = a.filter((w) => !w.del).map((w) => w.w).join(" ");
          second.words = bw;
          second.text = bw.filter((w) => !w.del).map((w) => w.w).join(" ");
          // 목소리는 다시 만들지 않고 같은 소리 파일을 나눠 쓴다 (2026-10-20 사장님)
          if (c.voice && a.length && bw.length) splitVoice(c, second, (a[a.length - 1].e + bw[0].s) / 2);
          else {
            c.voice = null;
            second.voice = null;
          }
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
    const re = [...made.filter((x) => x.type === "voice").map((x) => x.id), ...(tail && target?.clip.type === "voice" && !findClip(pref.current, target.clip.id)?.clip.voice ? [target.clip.id, tail] : [])];
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
      // 타임라인 편집 단축키 (프리미어·캡컷처럼) — 고른 것 기준
      if (mode === "timeline" && !e.code.startsWith("Space")) {
        const key = e.key.toLowerCase();
        if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); removePicked(); return; }
        if (!ctrl && !e.altKey && ["v", "a", "c", "h", "t"].includes(key)) { e.preventDefault(); setTool(key as TlTool); return; } // 도구 (프리미어와 같은 글쇠)
        if (!ctrl && key === "q") { e.preventDefault(); trimPicked("l"); return; }
        if (!ctrl && key === "w") { e.preventDefault(); trimPicked("r"); return; }
        if (ctrl && key === "b") { e.preventDefault(); splitPicked(); return; }
        if (ctrl && key === "a") { e.preventDefault(); setPicks([...flat.items.map((x) => ({ kind: "clip" as const, id: x.clip.id })), ...(project.layers || []).map((l) => ({ kind: "layer" as const, id: l.id }))]); return; }
        const lays = picks.filter((x) => x.kind === "layer");
        if (ctrl && (key === "c" || key === "x") && lays.length) {
          e.preventDefault();
          const its = flatten(pref.current).items;
          const list = lays.map((x) => (pref.current.layers || []).find((l) => l.id === x.id)).filter(Boolean) as Layer[];
          const rgs = list.map((l) => layerRange(pref.current, l, its)).filter(Boolean) as { s: number; e: number }[];
          const s0 = Math.min(...rgs.map((r) => r.s));
          layerClip.current = list.map((l, i) => ({ l: structuredClone(l), ds: rgs[i] ? rgs[i].s - s0 : 0, len: rgs[i] ? rgs[i].e - rgs[i].s : 1 }));
          if (key === "x") removePicked();
          else say(`${list.length}개를 복사했어요 (Ctrl+V 로 재생 막대 자리에 붙여넣기)`);
          return;
        }
        if (ctrl && key === "v" && layerClip.current.length) {
          e.preventDefault();
          const its = flatten(pref.current).items;
          if (!its.length) return;
          const tot = its[its.length - 1].start + its[its.length - 1].dur;
          const ids: string[] = [];
          change((p) => {
            const want: Record<string, number> = {};
            for (const q of layerClip.current) {
              const s1 = Math.min(tot - 0.1, time + q.ds), e1 = Math.min(tot, s1 + q.len);
              const sp = spanOfTimes(its, s1, e1);
              const l = { ...structuredClone(q.l), id: uid(), from: sp.from, to: sp.to } as Layer;
              delete l.ts; delete l.te; delete l.w0; delete l.w1;
              if (sp.ts !== undefined) l.ts = sp.ts;
              if (sp.te !== undefined && l.type !== "sfx") l.te = sp.te;
              p.layers = [...(p.layers || []), l];
              if (typeof q.l.track === "number") want[l.id] = q.l.track;
              ids.push(l.id);
            }
            settleTracks(p, want);
          });
          setPicks(ids.map((id) => ({ kind: "layer", id })));
          say("붙여넣었어요");
          return;
        }
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
      } else if ((e.key === "Delete" || e.key === "Backspace") && panel === "layer" && selLayer) {
        // 고른 요소(스티커·화면 글자·사진·효과음·음악)가 먼저 — 클립 체크가 남아 있어도 클립을 지우지 않게 (2026-10-19 사장님). Ctrl+Z 로 되돌리기
        e.preventDefault();
        removeLayer(selLayer);
      } else if (e.key === "Delete" || (e.key === "Backspace" && !selWord && selected.length)) {
        // Delete · Backspace — 고른 단어, 아니면 고른 클립 전부 (여러 개 고르면 다)
        e.preventDefault();
        if (selWord) deleteWords();
        else if (selected.length) actions.removeClip(selected);
      } else if (ctrl && (e.key.toLowerCase() === "c" || e.key.toLowerCase() === "x") && selWord) {
        // 단어를 골랐으면 — 고른 단어만 복사 (Ctrl+X 는 복사하고 지우기)
        e.preventDefault();
        if (copyWords() && e.key.toLowerCase() === "x") deleteWords();
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
      } else if (ctrl && e.key.toLowerCase() === "b") {
        // 캡컷처럼 — 재생 막대 자리에서 나누기
        e.preventDefault();
        splitPicked();
      } else if (!ctrl && mode === "timeline" && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
        // 타임라인 — ←→ 한 칸(1/30초)씩, Shift 와 함께 1초씩
        e.preventDefault();
        const d = (e.shiftKey ? 1 : 1 / 30) * (e.key === "ArrowLeft" ? -1 : 1);
        player.current?.pause();
        player.current?.seek(Math.max(0, (player.current?.time() ?? time) + d));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  /* ── 리본 ── */
  const sel1 = selected.length === 1 ? findClip(project, selected[0]) : null;
  // 고른 클립이 들어 있는 씬들 (씬 합치기)
  const selScenes = project.scenes.map((sc, i) => (sc.clips.some((c) => selected.includes(c.id)) ? i : -1)).filter((i) => i >= 0);
  const mergeScenes = () => {
    if (selScenes.length < 2) return say("합칠 씬들의 체크박스를 먼저 고르세요");
    // 붙어 있는 씬끼리만 (사이에 클립이 있는 씬이 끼면 순서가 바뀌어서 막는다)
    const a = selScenes[0], b = selScenes[selScenes.length - 1];
    const gap = project.scenes.slice(a, b + 1).some((sc, k) => !selScenes.includes(a + k) && sc.clips.length > 0);
    if (gap) return say("붙어 있는 씬끼리만 합칠 수 있어요 (사이에 다른 씬이 있어요)");
    change((p) => {
      const into = p.scenes[a];
      for (let i = a + 1; i <= b; i++) into.clips.push(...p.scenes[i].clips);
      p.scenes.splice(a + 1, b - a);
    });
    say(`씬 ${b - a + 1}개를 하나로 합쳤어요 (Ctrl+Z 로 되돌리기)`);
  };
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
      { icon: "ratio", label: "화면 비율", onClick: () => setPanel("ratio") }, // [영상 추가하기]는 뺐다 — 사진·영상은 [삽입]·오른쪽 위 사진·영상 단추로 (2026-10-19 사장님)
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
      // [홈]의 무음 줄이기·무음 원래대로·메인자막 칸은 뺐다 — 무음은 [편집] 탭, 메인자막은 [서식] 탭에 있다 (2026-10-19 사장님)
    ],
    편집: [
      { icon: "undo", label: "되돌리기", onClick: undo, disabled: !hist.current.past.length },
      { icon: "redo", label: "다시실행", onClick: redo, disabled: !hist.current.future.length },
      "|",
      { icon: "check", label: "모든 클립 고르기", onClick: () => setSelected(flat.items.map((x) => x.clip.id)) },
      { icon: "close", label: "고르기 풀기", onClick: () => { setSelected([]); setSelWord(null); } },
      "|",
      { icon: "speed", label: "길이", disabled: !lastSelected(), onClick: () => lastSelected() && actions.openTiming(lastSelected()), title: "고른 클립의 길이 (클립 시간을 눌러도 열려요)" },
      "|",
      { icon: "trash", label: selWord ? "단어 지우기/되살리기" : "단어 지우기", onClick: () => (selWord ? actions.toggleWord(selWord.clip, selWord.i) : say("지울 단어를 먼저 누르세요")) },
      { icon: "trash", label: "클립 지우기", onClick: () => actions.removeClip(selected), disabled: !selected.length },
      "|",
      { icon: "merge", label: "클립 합치기", onClick: () => mergeClips(selected), disabled: selected.length < 2 },
      { icon: "split", label: "클립 나누기", onClick: () => (selWord ? actions.splitAt(selWord.clip, selWord.i) : say("나눌 자리의 단어를 먼저 누르세요")) },
      { icon: "scene", label: "씬 나누기", onClick: () => sel1 && actions.sceneBreak(sel1.clip.id), disabled: !sel1 },
      { icon: "merge", label: "씬 합치기", onClick: mergeScenes, disabled: selScenes.length < 2, title: "고른 클립이 들어 있는 씬들을 하나로 (씬 체크박스로 고르기 · 붙어 있는 씬끼리만)" },
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
      { icon: "font", label: "메인자막 서식", onClick: () => { setSubClip(""); setPanel("subtitle"); } },
      "|",
      { icon: "copy", label: "전체 자막 복사하기", onClick: () => { navigator.clipboard.writeText(flat.items.map((x) => (typeof x.clip.subText === "string" ? x.clip.subText : clipText(x.clip))).filter(Boolean).join("\n")); say("전체 자막을 복사했어요"); } },
      // 저장할 폴더·이름을 먼저 고른다 (취소하면 안 만든다, 2026-10-19 사장님)
      { icon: "file", label: "자막 파일 내보내기", onClick: async () => {
        const f = b.exportPick ? await b.exportPick(pref.current, "srt") : undefined;
        if (f === null) return;
        await b.project.exportText(pref.current, "srt", f);
        say("자막 파일(.srt)을 저장했어요");
      } },
      "|",
      { icon: "undo", label: "고친 자막 모두 되돌리기", disabled: !flat.items.some((x) => x.clip.type !== "silence" && typeof x.clip.subText === "string"), title: "자막만 따로 고친 클립을 모두 말한 그대로 되돌려요",
        onClick: () => { change((p) => { for (const sc of p.scenes) for (const c of sc.clips) if (c.type !== "silence") delete c.subText; }); say("모든 자막을 말한 그대로 되돌렸어요"); } },
      { icon: "pen", label: "자막만 고치기", onClick: () => say("클립 아래 파란 자막 글자를 누르면 자막만 고칠 수 있어요 (목소리는 그대로)") },
      { icon: "font", label: "텍스트 넣기", onClick: addTextLayer },
      "|",
      { icon: "sub", label: "고른 클립 자막 끄기/켜기", disabled: !selected.length, onClick: () => change((p) => { for (const id of selected) { const c = findClip(p, id)?.clip; if (c) c.sub = c.sub === false; } }) },
    ],
    // 서식 — 브루처럼 메인자막 서식만 한 줄에 (2026-10-19 사장님)
    서식: [
      { node: <SubFormatBar key="subfmt" sub={project.settings.subtitle} ratio={project.ratio} pxPer100={Math.round(Math.min(...RATIO_SIZE[project.ratio]) * 0.062)}
        onPatch={(patch, first = true) => applySub(patch, first, true)} onMore={() => setPanel("subtitle")} onAnim={() => setPanel("subanim")} onPresets={() => setPanel("subtitle")} /> },
    ],
    삽입: [
      { icon: "plus", label: "새 클립 넣기", onClick: () => setDialog("addText"), title: "AI 목소리 글 · 빈 클립 · 사진 · 영상 · 텍스트" },
      "|",
      { icon: "font", label: "텍스트", onClick: addTextLayer, title: "고른 클립(없으면 지금 클립)에 글자를 올려요" },
      { icon: "image", label: "사진·영상 올리기", onClick: () => { setOverlayTarget(""); openLib("mine", true); }, title: "고른 클립(없으면 지금 클립) 화면 위에 사진이나 영상을 올려요" },
      { icon: "star", label: "그래픽", onClick: () => { setStickerTarget(""); setPanel(panel === "sticker" ? "" : "sticker"); }, title: "가격대비 짱! · 역 1분! · 초품아! — 부동산 그래픽 (반짝이·움직임·효과음 자동)" },
      ...(b.project.motionScene ? [{ icon: "ai", label: "모션 자동 입히기", onClick: () => setAutoMotion(true), title: "장면마다 성우 문장을 읽어 어울리는 모션(가격·정보 카드·위치 핀·장점 체크·키네틱)을 한 번에 입혀요" }] : []),
      ...(b.project.motionRender ? [{ icon: "ai", label: "끝 화면 (모션)", onClick: () => openMotion("outro"), title: "맨 끝에 사무소·대표·등록번호·전화·QR 이 나오는 끝 화면을 넣어요" }] : []),
      ...(b.project.motionRender ? [{ icon: "ai", label: "인트로 (모션)", onClick: () => openMotion("intro"), title: "이 영상 공실의 동네·종류·가격·면적이 튀어나오는 3초 인트로를 맨 앞에 넣어요" }] : []),
      { icon: "music", label: "배경 음악", onClick: () => openMusic(""), title: "고른 클립(없으면 영상 전체)에 음악을 깔아요" },
      "|",
      { icon: "image", label: "내 이미지·비디오", onClick: () => { openLib("mine"); } },
      { icon: "image", label: "공실 사진", onClick: () => { openLib("vacancy"); } },
      { icon: "search", label: "무료 이미지·비디오", onClick: () => { openLib("free"); } },
      { icon: "video", label: "영상 이어 깔기", title: "고른 클립 구간에 영상 여러 개를 시간 순서로 꽉 채워 깔아요 — 영상이 끝나는 순간 다음 영상 (컷편집처럼)", onClick: () => { const sr = selRange(); const its = flatten(pref.current).items; if (!its.length) return; setRollEdit(newRoll(sr?.from || its[0].clip.id, sr?.to || its[its.length - 1].clip.id)); } },
      { icon: "ai", label: "AI 이미지·영상 제작", title: "클립마다 이미지 스타일·캐릭터로 프롬프트·이미지·동영상을 만들어요 (Flow TXT · 한 번에 올리기)", onClick: () => { setPanel("aimake"); } },
    ],
    "AI 목소리": [
      { icon: "voice", label: "AI 목소리", title: "AI 목소리 고르기·바꾸기 (성우 · 빠르기 · 볼륨)", onClick: () => { setVoiceMe(false); setPanel("voice"); } },
      { icon: "mic", label: "AI 내 목소리 만들기", title: "내 목소리를 녹음해 두면 대본을 내 목소리로 읽어요 (이 PC에서, 무료)", onClick: () => { setVoiceMe(true); setPanel("voice"); } },
      { icon: "redo", label: "목소리 다시 만들기", disabled: !selected.length, title: "고른 클립 목소리를 새로 만들어요 (전에 만든 것을 다시 쓰지 않아요)", onClick: () => revoice(selected, true) },
    ], // [새 클립 넣기]는 뺐다 — [삽입] 탭에 있다 (2026-10-19 사장님)
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

  /* ── 오른쪽 속성 칸의 키프레임·돌리기·진하기·필터 (2026-10-20) ── */
  /** 클립 화면 — 돌리기·진하기 / 키프레임 / 필터·색 보정 */
  const visualExtra = (c: Clip, it?: { start: number; dur: number }) => {
    if (mode === "timeline") return null; // 타임라인 편집은 속성 칸 [기본]·[필터] 탭에서
    const aid = c.visual?.asset || (c.type !== "voice" ? c.src?.asset : "");
    const a = aid ? project.assets[aid] : null;
    if (!a || !it) return null;
    const tau = time >= it.start - 0.001 && time <= it.start + it.dur + 0.001 ? Math.max(0, Math.min(it.dur, time - it.start)) : null;
    const norm = (r: number) => (((r % 360) + 540) % 360) - 180;
    return (
      <>
        {!c.kf?.length && (
          <div style={{ padding: "14px 16px", borderBottom: `1px solid ${C.line}`, display: "flex", flexDirection: "column", gap: 10 }}>
            <KfBar title="돌리기" value={Math.round(Number(c.rot) || 0)} min={-180} max={180} step={1} show={`${Math.round(Number(c.rot) || 0)}°`}
              onChange={(v, first) => change((p) => { const x = findClip(p, c.id)?.clip; if (x) x.rot = v ? v : undefined; }, first)}
              onReset={() => change((p) => { const x = findClip(p, c.id)?.clip; if (x) delete x.rot; })} />
            <div style={{ display: "flex", gap: 6 }}>
              <Btn small onClick={() => change((p) => { const x = findClip(p, c.id)?.clip; if (x) x.rot = norm((Number(x.rot) || 0) - 90) || undefined; })}>↺ 왼쪽 90°</Btn>
              <Btn small onClick={() => change((p) => { const x = findClip(p, c.id)?.clip; if (x) x.rot = norm((Number(x.rot) || 0) + 90) || undefined; })}>↻ 오른쪽 90°</Btn>
            </div>
            <KfBar title="진하기" value={Math.round((c.opacity ?? 1) * 100)} min={0} max={100} step={1} show={`${Math.round((c.opacity ?? 1) * 100)}%`}
              onChange={(v, first) => change((p) => { const x = findClip(p, c.id)?.clip; if (x) x.opacity = v >= 100 ? undefined : v / 100; }, first)}
              onReset={() => change((p) => { const x = findClip(p, c.id)?.clip; if (x) delete x.opacity; })} />
          </div>
        )}
        <AdjustBox adj={c.adj} thumb={a.thumb || (a.kind === "image" ? a.url : "")}
          onChange={(adj, first) => change((p) => { const x = findClip(p, c.id)?.clip; if (!x) return; if (adj) x.adj = adj; else delete x.adj; }, first)}
          onAll={() => {
            let n = 0;
            change((p) => {
              for (const sc of p.scenes) for (const x of sc.clips) {
                const vid = x.visual?.asset || (x.type !== "voice" ? x.src?.asset : "");
                if (!vid || !p.assets[vid]) continue;
                if (c.adj) x.adj = structuredClone(c.adj); else delete x.adj;
                n++;
              }
            });
            say(`필터·색 보정을 클립 ${n}개에 똑같이 넣었어요`);
          }} />
      </>
    );
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
  // 타임라인 편집 — 위: 미리보기 (가운데), 아래: 타임라인 (캡컷처럼). 경계선을 끌어 위아래 크기
  const centerW = win.w - (railHidden ? 0 : 72) - sideW;
  const tlTopH = Math.max(240, Math.min(win.h - 330, tlTop || Math.round((win.h - 120) * 0.5)));
  const tlPreviewW = Math.max(200, Math.round(Math.min(centerW - 48, ((tlTopH - 112) * W) / H)));
  const dragTl = (e: React.PointerEvent) => {
    e.preventDefault();
    const y0 = e.clientY;
    const h0 = tlTopH;
    let last = h0;
    const move = (ev: PointerEvent) => {
      last = Math.max(240, Math.min(win.h - 330, h0 + ev.clientY - y0));
      setTlTop(last);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      document.body.style.cursor = "";
      try {
        localStorage.setItem("studioVideo.tlTop", String(Math.round(last)));
      } catch {}
    };
    document.body.style.cursor = "row-resize";
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up, { once: true });
  };

  /** 옆 칸 (자료·설정) — kind 에 따라. 텍스트 편집은 오른쪽 칸(side) 그대로, 타임라인 편집은 왼쪽 자료 칸·오른쪽 속성 칸에서 같은 것을 쓴다 */
  const sidePanels = (kind: string) => (
      <>
        {kind === "sticker" && <StickerPanel project={project} onClose={() => { setStickerTarget(""); setPanel(""); }}
          tplInsert={async (item, o) => {
            // 템플릿 (반응·움직이는·글자) — 스티커 분류 안에서 (2026-10-20 사장님)
            const a = await ensureAsset(item);
            // [그래픽 바꾸기]로 열었으면 — 그 그래픽을 이 템플릿으로 (자리·크기(높이 맞춤)·순서·범위·움직임 그대로, 2026-10-21 사장님)
            const old = stickerTarget ? (pref.current.layers || []).find((x) => x.id === stickerTarget) : undefined;
            if (old) {
              const a0 = old.asset ? pref.current.assets[old.asset] : undefined;
              const r0 = a0?.width && a0?.height ? a0.width / a0.height : 0;
              const r1 = a.width && a.height ? a.width / a.height : 0;
              const w = r0 && r1 ? Math.max(0.05, Math.min(1, (old.w ?? 0.35) * (r1 / r0))) : old.w;
              updateLayer(old.id, { asset: a.id, name: item.name.replace(/_\d+(\.\w+)?$/, ""), stk: o.spec, sticker: true, w, clicks: o.clicks?.length ? o.clicks : undefined });
              setStickerTarget("");
              openLayer(old.id);
              say("그래픽을 바꿨어요");
              return;
            }
            addLayer({ type: "image", asset: a.id, name: item.name.replace(/_\d+(\.\w+)?$/, ""), x: 0.5, y: o.y ?? 0.5, w: o.w, opacity: 1, anim: o.anim, sticker: true, stk: o.spec, ...(o.clicks?.length ? { clicks: o.clicks } : {}) }, false);
            setPanel("sticker"); // 이어서 더 넣을 수 있게
          }}
          replacing={Boolean(stickerTarget && (project.layers || []).some((x) => x.id === stickerTarget))}
          onInsert={async (item, o) => {
            const a = await ensureAsset(item);
            const old = stickerTarget ? (pref.current.layers || []).find((x) => x.id === stickerTarget) : undefined;
            if (old) {
              // 모양만 바꾸기 — 자리·크기(높이 맞춤)·순서·범위·움직임 그대로
              const a0 = old.asset ? pref.current.assets[old.asset] : undefined;
              const r0 = a0?.width && a0?.height ? a0.width / a0.height : 0;
              const r1 = a.width && a.height ? a.width / a.height : 0;
              const w = r0 && r1 ? Math.max(0.05, Math.min(1, (old.w ?? 0.35) * (r1 / r0))) : old.w;
              updateLayer(old.id, { asset: a.id, name: item.name.replace(/_\d+(\.\w+)?$/, ""), stk: o.spec, sticker: true, w });
              setStickerTarget("");
              openLayer(old.id);
              say("그래픽을 바꿨어요");
              return;
            }
            addLayer({ type: "image", asset: a.id, name: item.name.replace(/_\d+(\.\w+)?$/, ""), x: 0.5, y: 0.32, w: o.w, opacity: 1, anim: o.anim, sticker: true, stk: o.spec }, false);
            setPanel("sticker"); // 이어서 더 넣을 수 있게 스티커 칸 그대로
          }} />}
        {kind === "text" && <TextInsertPanel onAdd={addStyledText} onClose={() => setPanel("")} kindTabs={textHead("새로 넣기")} />}
        {/* 템플릿 127종 (론박 견본을 보고 새로 그림, 2026-10-19 사장님) — 글자 템플릿 / 가리키기·반응·움직이는 */}
        {(kind === "tplText" || kind === "tplSticker") && <TemplatePanel key={kind} project={project} kind={kind === "tplText" ? "text" : "sticker"} onClose={() => setPanel("")}
          onInsert={async (item, o) => {
            const a = await ensureAsset(item);
            const keep = kind;
            addLayer({ type: "image", asset: a.id, name: item.name.replace(/_\d+(\.\w+)?$/, ""), x: 0.5, y: o.y ?? 0.5, w: o.w, opacity: 1, anim: o.anim, sticker: true, stk: o.spec, ...(o.clicks?.length ? { clicks: o.clicks } : {}) }, false);
            setPanel(keep); // 이어서 더 넣을 수 있게
          }} />}
        {kind === "thumb" && <ThumbPanel project={project} onClose={() => setPanel("")} say={say} />}
        {kind === "sfx" && <SfxInsertPanel dir={project.dir} onAdd={addSfx} onClose={() => setPanel("")} />}
        {kind === "aiedit" && <AiEditPanel mode="auto" onSwitch={(to) => setPanel(to === "make" ? "aimake" : "aiedit")} project={project} selected={selected} ensureAsset={ensureAsset} apply={(fn) => change(fn)} keep={(fn) => change(fn, false)} onUndo={undo} onClose={() => setPanel("")} autoStart={aiAuto && Boolean(project.settings.aiAuto)} />}
        {kind === "aimake" && <AiEditPanel mode="make" onSwitch={(to) => setPanel(to === "make" ? "aimake" : "aiedit")} project={project} selected={selected} ensureAsset={ensureAsset} apply={(fn) => change(fn)} keep={(fn) => change(fn, false)} onUndo={undo} onClose={() => setPanel("")} />}
        {kind === "library" && <LibraryPanel key={panel ? `${libTab}${libOverlay}` : "default"} onAiMake={() => setPanel("aimake")} project={project} canReplace={selected.length > 0} onPick={onPick} pro={mode === "timeline" ? { onPlus: plusAdd, onSource: openSource } : undefined} onTrim={mode === "timeline" || (panel && libOverlay) ? undefined : (it) => void openTrim(it)} initialTab={panel ? libTab : "mine"} overlay={panel ? libOverlay : false}
          aiClips={{ selected, ensureAsset, apply: (fn) => change(fn) }}
          target={(() => {
            // 무료 자료 [교체할 이미지]·찾기 낱말 — 마지막으로 고른 클립
            const c = selected.length ? findClip(project, selected[selected.length - 1])?.clip : null;
            if (!c) return null;
            const a = project.assets[c.visual?.asset || c.src?.asset || ""];
            return { thumb: a ? a.thumb || (a.kind === "image" ? a.url : "") : "", text: clipText(c) };
          })()}
          onClose={() => {
            if (panel && libOverlay && overlayTarget && (project.layers || []).some((l) => l.id === overlayTarget)) return openLayer(overlayTarget);
            // 자료 칸 X = 닫기 ([개요·상세] 옆 [사진·영상]으로 다시 연다)
            setPanel("");
            setLibOpen(false);
          }} />}
        {kind === "voice" && <VoicePanel key={voiceMe ? "me" : "all"} startMe={voiceMe} project={project} gap={gapOf(project.settings)} onGap={(g) => change((p) => { p.settings.voice = { ...p.settings.voice, gap: g }; })} wordCount={selWord && findClip(project, selWord.clip)?.clip.type === "voice" ? wordIs().length : 0} targetCount={selected.filter((id) => { const c = findClip(project, id)?.clip; return c && (c.type === "voice" || c.src); }).length} onApply={applyVoice} onClose={() => setPanel("")} />}
        {kind === "subtitle" && (() => {
          // 이 클립 자막 — 고른 클립(하나)이 있으면 그것, 없으면 지금 재생 위치 클립
          const it = flat.items.find((x) => x.clip.id === subClip) || (selected.length === 1 && flat.items.find((x) => x.clip.id === selected[0])) || cur;
          const sc = it ? { id: it.clip.id, n: flat.items.indexOf(it) + 1, text: typeof it.clip.subText === "string" ? it.clip.subText : clipText(it.clip), custom: typeof it.clip.subText === "string" } : null;
          const own = flat.items.filter((x) => x.clip.subStyle && Object.keys(x.clip.subStyle).length).length;
          return <SubtitlePanel kindTabs={textHead(sc ? `메인자막 · 클립 ${sc.n}` : "메인자막", true)} onDetach={detachSub} settings={project.settings} onChange={(patch) => applySub(patch)} onPreset={applyPreset} onClose={() => setPanel("")}
            clip={sc} onSubText={(id, t) => actions.editSub(id, t)} anim={subAnimProps()} pxPer100={Math.round(Math.min(...RATIO_SIZE[project.ratio]) * 0.062)} ratio={project.ratio}
            range={{ mode: subSel ? "sel" : "all", selCount: selected.length, own, style: subNow(), onMode: setSubMode,
              onReset: () => { change((p) => { for (const id of selected) { const c = findClip(p, id)?.clip; if (c) delete c.subStyle; } }); say("고른 클립 자막을 전체 서식으로 되돌렸어요"); } }} />;
        })()}
        {kind === "ratio" && <RatioPanel ratio={project.ratio} fill={project.settings.fill} onRatio={setRatio} onFill={(f) => change((p) => { p.settings.fill = f; })} onClose={() => setPanel("")} />}
        {kind === "music" && (
          <MusicPanel project={project} current={(project.layers || []).find((l) => l.id === musicTarget) || null}
            rangeText={selected.length ? `고른 클립 ${selected.length}개` : "영상 처음부터 끝까지"} onPick={onMusic} onTrim={musicTarget ? undefined : (m) => void openMusicTrim(m)}
            onClose={() => (musicTarget && (project.layers || []).some((l) => l.id === musicTarget) ? openLayer(musicTarget) : setPanel(""))} />
        )}
        {kind === "anim" && (() => {
          const l = (project.layers || []).find((x) => x.id === animTarget);
          if (!l) return null;
          return <AnimPanel key={l.id} {...layerAnimProps(l)} onClose={() => setPanel("")} />;
        })()}
        {kind === "subanim" && (
          // 메인자막 애니메이션 — 메인자막 칸의 적용 범위(전체 / 고른 클립만)를 따른다
          <AnimPanel {...subAnimProps()} onClose={() => setPanel("")} onBack={() => setPanel("subtitle")} />
        )}
        {kind === "source" && (() => {
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
        {kind === "trans" && (() => {
          const i = flat.items.findIndex((x) => x.clip.id === transClip);
          const it = flat.items[i];
          // 다음 클립이 없으면 안내만 (칸은 열린다)
          if (i <= 0 || !it) return (
            <div style={{ padding: 18, color: C.sub, fontSize: 14, lineHeight: 1.7 }}>
              <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}><b style={{ color: C.text, fontSize: 15 }}>화면전환</b>
                <button type="button" onClick={() => setPanel("")} style={{ marginLeft: "auto", border: 0, background: "transparent", color: C.sub, fontSize: 20, cursor: "pointer" }}>×</button></div>
              화면전환은 클립과 클립 사이에 넣어요. 클립이 두 개 이상이면 클립 사이의 ↔ 표시를 누르거나, 클립을 고른 뒤 다시 눌러 주세요.
            </div>
          );
          const prev = flat.items[i - 1];
          const tr = it.clip.trans || null;
          return (
            <TransPanel key={transClip} trans={tr} from={i} to={i + 1} maxA={prev.dur * 0.45} maxB={it.dur * 0.45}
              fromThumb={(() => { const c = prev.clip, a = project.assets[c.visual?.asset || (c.type !== "voice" && c.src ? c.src.asset : "")]; return a ? a.thumb || (a.kind === "image" ? a.url : "") : ""; })()}
              toThumb={(() => { const c = it.clip, a = project.assets[c.visual?.asset || (c.type !== "voice" && c.src ? c.src.asset : "")]; return a ? a.thumb || (a.kind === "image" ? a.url : "") : ""; })()}
              onChange={(patch, first) => change((p) => { const c = findClip(p, transClip)?.clip; if (c) c.trans = { ...(c.trans || TRANS_DEFAULT), ...patch } as NonNullable<Clip["trans"]>; }, first)}
              onRemove={() => { change((p) => { const c = findClip(p, transClip)?.clip; if (c) delete c.trans; }); say("화면전환 없음으로 바꿨어요"); }}
              onAll={() => { allTrans(tr ? { ...tr } : null); }}
              onPreview={() => { player.current?.seek(Math.max(0, it.start - Math.min(tr?.a ?? 0, prev.dur * 0.45) - 0.8)); setTimeout(() => player.current?.play(), 50); }}
              onClose={() => setPanel("")} />
          );
        })()}
        {kind === "visual" && (() => {
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
              onRange={(a, b) => clipRange(c.id, a, b)} onRemove={() => clipRemoveVisual(c.id)} onClose={() => openLib("mine")}
              extra={visualExtra(c, flat.items[i])} />
          );
        })()}
        {kind === "layer" && (() => {
          const l = (project.layers || []).find((x) => x.id === selLayer);
          if (!l) return null;
          return (
            <LayerPanel key={l.id} project={project} layer={l} items={flat.items} selRange={selRange()}
              onChange={(patch) => updateLayer(l.id, patch)} onRemove={() => removeLayer(l.id)} onZ={(o) => layerOrder(l.id, o)}
              textAnim={l.type === "text" ? layerAnimProps(l) : undefined} imgAnim={l.type === "image" ? layerAnimProps(l) : undefined} curClip={cur?.clip.id}
              onBubble={l.type === "text" ? (st) => textToBubble(l.id, st) : undefined}
              kindTabs={l.type === "text" ? textHead("", true) : undefined} onToSub={l.type === "text" ? () => textToSub(l.id) : undefined}
              template={l.stk && isTplStyle(l.stk.style) ? { style: l.stk.style, text: l.stk.text, color: l.stk.color, onSave: (t: string, c?: string) => templateText(l.id, t, c) } : undefined}
              sticker={isSticker(l) && !(l.stk && isTplStyle(l.stk.style)) ? (() => {
                const spec = stickerSpecOf(l);
                return { text: spec?.text || "", ok: Boolean(spec), onText: (t: string) => stickerText(l.id, t) };
              })() : undefined}
              onReplace={() => (l.type === "music" ? openMusic(l.id) : isSticker(l) ? (setStickerTarget(l.id), setPanel("sticker")) : l.type === "image" ? (setOverlayTarget(l.id), openLib("mine", true)) : undefined)}
              onClose={() => {
                // 닫으면 그 종류를 고르는 창으로 (회의 3-27) — 스티커 → 스티커 창, 사진 → 사진·영상 고르기, 음악 → 배경 음악, 글자 → 닫기
                setSelLayer("");
                if (under && under.layer === l.id) { setStickerTarget(""); setPanel(under.kind as PanelKind); } // 밑에 살려 둔 칸 그대로 (탭·자리)
                else if (isSticker(l)) { setStickerTarget(""); setPanel("sticker"); }
                else if (l.type === "image") { setOverlayTarget(""); openLib("mine", true); }
                else if (l.type === "music") openMusic("");
                else setPanel("");
              }} />
          );
        })()}
      </>
  );
  // 미리보기 (텍스트 편집 = 왼쪽 칸, 타임라인 편집 = 위 가운데) — 같은 미리보기를 두 자리에서 쓴다
  const pvW = mode === "timeline" ? tlPreviewW : previewW;
  const previewEl = (
        <>
          {big && (
            <>
              <div onClick={() => setBig(false)} style={{ position: "fixed", top: 0, bottom: 0, left: 0, right: sideW, background: "rgba(0,0,0,0.65)", zIndex: 60 }} />
              <div style={{ height: Math.round((pvW * H) / W), display: "flex", alignItems: "center", justifyContent: "center", background: "#000", borderRadius: 4, color: C.sub, fontSize: 14 }}>크게 보는 중</div>
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
            onDragOver={(e) => { if (e.dataTransfer.types.includes(DRAG_MEDIA) || e.dataTransfer.types.includes(DRAG_STICKER)) { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; } }}
            onDrop={(e) => {
              // 스티커 — 지금 보이는 클립의 놓은 자리에
              if (e.dataTransfer.types.includes(DRAG_STICKER)) {
                e.preventDefault();
                const box = (e.currentTarget as HTMLElement).querySelector<HTMLElement>("[data-preview]")?.getBoundingClientRect();
                const x = box ? Math.max(0.05, Math.min(0.95, (e.clientX - box.left) / box.width)) : undefined;
                const y = box ? Math.max(0.05, Math.min(0.95, (e.clientY - box.top) / box.height)) : undefined;
                void onDropSticker({ clipId: cur?.clip.id, x, y });
                return;
              }
              void onDropPreview(e);
            }}>
            <Player ref={player} project={project} width={big ? bigW : pvW} onTime={setTime} onPlaying={setPlaying} previewRate={rate}
              selLayer={panel === "layer" ? selLayer : ""} onLayerPick={(id) => { if (project.layers?.find((l) => l.id === id)?.type === "text") focusTextBasic(); openLayer(id); }}
              onBoxPick={(kind, id) => {
                setSelLayer("");
                if (kind === "sub") { focusTextBasic(); setPanel("subtitle"); } // 미리보기에서 글자를 누르면 [텍스트 › 기본] — 크기 등 바로 고치게 (2026-10-21 사장님)
                else { setVisualClip(id); setPanel("visual"); }
              }}
              onVisualMove={(id, box, first) => { noteVisualMove(id, first); change((p) => { const c = findClip(p, id)?.clip; if (c) c.box = box; }, first); }}
              visualOpen={visualOpen} onVisualOpen={openVisualXf} onVisualLock={() => setVisualOpen("")} onPreviewMenu={setPreviewMenu}
              onSubMove={(patch, first, tau, clipId) => {
                // 이 클립 메인자막에 키프레임이 있으면 — 점이 있는 항목은 그 시각 점으로 (줄 너비는 서식 그대로)
                const c0 = findClip(pref.current, clipId)?.clip;
                if (!c0?.subKf?.length) return applySub(patch, first);
                const { wrap, ...rest } = patch;
                const vals: Partial<Record<KfProp, number>> = {};
                if (typeof rest.x === "number") vals.x = rest.x * 100;
                if (typeof rest.y === "number") vals.y = rest.y * 100;
                if (typeof rest.size === "number") vals.s = rest.size;
                if (typeof rest.rot === "number") vals.r = rest.rot;
                if (Object.keys(vals).length) xfSet({ kind: "sub", id: clipId }, tau, vals, first);
                if (typeof wrap === "number") applySub({ wrap }, first);
              }}
              onLayerMove={moveLayer}
              onVisualXf={xfVisual}
              onLayerText={(id, text) => { updateLayer(id, { text }); say("글자를 바꿨어요"); }}
              onSubText={(clipId, text) => actions.editSub(clipId, text)} subPick={subPick} />
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
        </>
  );
  /* ════ 타임라인 편집 화면 (프리미어·캡컷처럼, 2026-10-20 사장님 — 텍스트 편집과 따로) ════ */
  // 소스 모니터 (2026-10-25 사장님) — 왼쪽 위 [소스] 탭. 프로젝트 칸에서 두 번 누른 자료 · 시작·끝
  const [srcItem, setSrcItem] = useState<LibItem | null>(null);
  // 텍스트 편집 — 자료 고르기·배경 음악에서 두 번 누르면 쓸 부분(사진은 길이) 고르는 창 (2026-10-25 사장님)
  const [trimPick, setTrimPick] = useState<{ item: LibItem; music?: { file: string; url: string; name: string } } | null>(null);
  const probeDur = (url: string, audio: boolean) => new Promise<number>((res) => {
    const m = document.createElement(audio ? "audio" : "video");
    m.preload = "metadata";
    m.onloadedmetadata = () => res(isFinite(m.duration) ? m.duration : 0);
    m.onerror = () => res(0);
    m.src = url;
  });
  const openTrim = async (item: LibItem) => {
    if (item.kind !== "image" && !item.duration) item = { ...item, duration: await probeDur(item.url, item.kind === "audio") };
    if (item.kind !== "image" && !item.duration) return say("길이를 읽지 못했어요 — 한 번 눌러 바로 넣어 주세요");
    setTrimPick({ item });
  };
  const openMusicTrim = async (m: { file: string; url: string; name: string }) => {
    const d = await probeDur(m.url, true);
    if (!d) return say("음악 길이를 읽지 못했어요 — [고르기]로 넣어 주세요");
    setTrimPick({ item: { id: "music:" + m.file, name: m.name, kind: "audio", source: "", fav: false, duration: d, width: 0, height: 0, url: m.url, thumb: "", ready: true }, music: m });
  };
  const [srcRange, setSrcRange] = useState<SrcRange | null>(null);
  const [ecTab, setEcTab] = useState<"src" | "ec">("ec");
  const openSource = (it: LibItem) => { setSrcItem(it); setSrcRange(null); setEcTab("src"); };
  const srcRaw = () => (srcItem ? JSON.stringify({ lib: srcItem, ...(srcItem.kind === "video" && srcRange ? { range: srcRange } : {}) }) : "");
  /** [삽입] — 재생 막대 자리 V1 에 끼워 넣기 (클립 가운데면 거기서 나눈 뒤), 뒤 클립은 밀림 */
  const srcInsert = async () => {
    if (!srcItem) return;
    if (srcItem.kind === "audio") return say("소리 파일은 [덮어쓰기]로 넣어 주세요");
    const a = await ensureAsset(srcItem);
    let its = flatten(pref.current).items;
    let it = its.find((x) => time >= x.start && time < x.start + x.dur);
    if (it && time > it.start + 0.05 && time < it.start + it.dur - 0.05) {
      splitHere(time);
      its = flatten(pref.current).items;
      it = its.find((x) => time - 0.01 >= x.start && time - 0.01 < x.start + x.dur);
      if (it) await placeMedia(a, it.clip.id, false, srcRange);
    } else if (it) await placeMedia(a, it.clip.id, time <= it.start + 0.05, srcRange);
    else await placeMedia(a, undefined, false, srcRange);
    say("재생 막대 자리에 끼워 넣었어요");
  };
  /** [덮어쓰기] — 재생 막대 자리 V2 에 올리기 (뒤 클립은 그대로) */
  const srcOverwrite = async () => {
    if (!srcItem) return;
    await dropOver(time, 2, srcRaw());
  };
  const [leftKind, setLeftKind] = useState("library");
  useEffect(() => {
    if (mode === "timeline" && LIB_KINDS.includes(panel) && panel !== "aiedit") setLeftKind(panel);
  }, [panel, mode]);
  const [tlMenu, setTlMenu] = useState("");
  useEffect(() => {
    if (!tlMenu) return;
    const close = () => setTlMenu("");
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [tlMenu]);
  // 칸 켜고 끄기 ([창] 메뉴, 이 PC 에 기억) — 효과 컨트롤 · 속성 · 프로젝트 · 오디오 미터
  const [tlWin, setTlWinState] = useState<{ ec: boolean; props: boolean; proj: boolean; meter: boolean }>(() => {
    try {
      return { ec: true, props: true, proj: true, meter: true, ...JSON.parse(localStorage.getItem("studioVideo.tlWin") || "{}") };
    } catch {
      return { ec: true, props: true, proj: true, meter: true };
    }
  });
  const setTlWin = (k: keyof typeof tlWin) => {
    const n = { ...tlWin, [k]: !tlWin[k] };
    setTlWinState(n);
    try { localStorage.setItem("studioVideo.tlWin", JSON.stringify(n)); } catch {}
  };
  const [tool, setTool] = useState<TlTool>("v");
  const TL_PR = 290, TL_PJ = 340; // 속성 · 프로젝트 너비
  // 왼쪽 위(소스·효과 컨트롤)는 가운데 프로그램과 반반 — 소스 영상이 16:9 로 크게 (2026-10-25 사장님, 프리미어처럼)
  const TL_EC = Math.max(400, Math.round((win.w - (railHidden ? 0 : 72) - (tlWin.props ? TL_PR : 0) - 2) / 2));
  const tlCenterW = win.w - (railHidden ? 0 : 72) - (tlWin.ec ? TL_EC : 0) - (tlWin.props ? TL_PR : 0) - 2;
  const tlPrevW = Math.max(200, Math.round(Math.min(tlCenterW - 20, ((tlTopH - 64) * W) / H)));
  /** 정렬 — 미리보기에서 고른 것의 크기를 재서 화면 가장자리·가운데로 */
  const alignPick = (tg: XfTarget, tau: number, a: "l" | "ch" | "r" | "t" | "cv" | "b") => {
    const sel = tg.kind === "clip" ? '[data-preview] [data-layer="__visual"]' : tg.kind === "sub" ? '[data-preview] [data-layer="__sub"]' : `[data-preview] [data-layer="${tg.id}"]`;
    const el = document.querySelector<HTMLElement>(sel);
    const box = el?.closest<HTMLElement>("[data-preview]");
    if (!el || !box) return say("미리보기에 보이는 곳에 재생 막대를 두세요");
    const r = el.getBoundingClientRect(), bb = box.getBoundingClientRect();
    const hw = (r.width / bb.width / 2) * 100, hh = (r.height / bb.height / 2) * 100;
    const v: Partial<Record<KfProp, number>> = a === "l" ? { x: hw } : a === "ch" ? { x: 50 } : a === "r" ? { x: 100 - hw } : a === "t" ? { y: hh } : a === "cv" ? { y: 50 } : { y: 100 - hh };
    xfSet(tg, tau, v);
  };
  /** 항목 키프레임으로 재생 막대 옮기기 */
  const seekKey = (tg: XfTarget, start: number, tau: number | null, q: KfProp, dir: -1 | 1) => {
    const m = xfModel(project, tg);
    const ts = (m?.kf || []).filter((k) => kfHasAt([k], q, k.t)).map((k) => k.t).sort((a, b) => a - b);
    const now = tau ?? 0;
    const t = dir < 0 ? [...ts].reverse().find((x) => x < now - 0.02) : ts.find((x) => x > now + 0.02);
    if (t === undefined) return;
    player.current?.pause();
    player.current?.seek(start + t + 0.0005);
  };
  /** 변형 칸 — 대상·나오는 구간(영상 전체 초) */
  const xfSec = (tg: XfTarget, start: number, end: number, opts: { noOpacity?: boolean; sizeLabel?: string } = {}) => {
    const tau = time >= start - 0.001 && time <= end + 0.001 ? Math.max(0, Math.min(end - start, time - start)) : null;
    const rd = xfRead(project, tg, tau);
    const m = xfModel(project, tg);
    if (!rd || !m) return null;
    const base = { x: m.base.x * 100, y: m.base.y * 100, s: m.show.s(1), r: tg.kind === "layer" ? 0 : 0, o: 100 };
    return (
      <Sec title="변형" right={rd.any.x || rd.any.y || rd.any.s || rd.any.r || rd.any.o ? <span style={{ fontSize: 10.5, color: "#fde047" }}>◆ 키프레임</span> : undefined}>
        <Transform rd={rd} can={tau !== null} base={base} noOpacity={opts.noOpacity} sizeLabel={opts.sizeLabel}
          onSet={(v, first) => xfSet(tg, tau ?? 0, v, first)} onToggle={(q) => tau !== null && xfToggle(tg, tau, q)}
          onSeekKey={(q, dir) => seekKey(tg, start, tau, q, dir)} onAlign={(a) => alignPick(tg, tau ?? 0, a)} />
      </Sec>
    );
  };
  const embed = (kind: string, noHead = false) => <Embed noHead={noHead}>{sidePanels(kind)}</Embed>;
  /** 오른쪽 속성 칸 — 고른 것에 따라 탭 */
  const tlPropsEl = () => {
    const pk = picks[0];
    const its = flat.items;
    const many = picks.length > 1 ? ` 외 ${picks.length - 1}개` : "";
    if (!pk) return <PropsFrame key="none" title="속성" icon="adjust" tabs={[]} empty />;
    const close = () => setPicks([]);
    if (pk.kind === "layer") {
      const l = (project.layers || []).find((x) => x.id === pk.id);
      const r = l ? layerRange(project, l, its) : null;
      if (!l || !r) return <PropsFrame key="none" title="속성" icon="adjust" tabs={[]} empty />;
      const vid = Boolean(l.asset && project.assets[l.asset]?.kind === "video");
      const full = l.fit === "cover" || l.fit === "contain";
      const timeSec = (
        <Sec title="시간">
          <TimeBox s={r.s} e={r.e} total={flat.total} onChange={(s, e) => layersMove([{ id: l.id, s, e }], true)} />
        </Sec>
      );
      if (l.type === "music" || l.type === "sfx") {
        const basic = (
          <>
            <Sec title="소리">
              <SlimRow label="크기" value={Math.round((l.volume ?? (l.type === "music" ? 0.15 : 0.8)) * 100)} min={0} max={100} step={1} unit="%" onChange={(v, f) => change((p) => { const x = (p.layers || []).find((y2) => y2.id === l.id); if (x) x.volume = v / 100; }, f)} />
              {l.type === "music" && <SlimRow label="페이드인" value={l.fadeIn ?? 0} min={0} max={5} step={0.1} digits={1} unit="초" onChange={(v, f) => change((p) => { const x = (p.layers || []).find((y2) => y2.id === l.id); if (x) x.fadeIn = v; }, f)} />}
              {l.type === "music" && <SlimRow label="페이드아웃" value={l.fadeOut ?? 0} min={0} max={5} step={0.1} digits={1} unit="초" onChange={(v, f) => change((p) => { const x = (p.layers || []).find((y2) => y2.id === l.id); if (x) x.fadeOut = v; }, f)} />}
            </Sec>
            {timeSec}
          </>
        );
        return <PropsFrame key={l.id} title={`${l.type === "music" ? "배경 음악" : "효과음"} · ${layerTitle(l)}${many}`} icon={l.type === "music" ? "music" : "bell"} onClose={close}
          tabs={[{ id: "basic", label: "기본", node: basic }, { id: "set", label: "설정", node: embed("layer"), embed: true }]} />;
      }
      const basic = (
        <>
          {!full && xfSec({ kind: "layer", id: l.id }, r.s, r.e, { sizeLabel: l.type === "text" ? "글자 크기" : "크기" })}
          {l.type === "image" && (
            <Sec title="화면">
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {([["free", "직접 크기"], ["contain", "비율 유지"], ["cover", "잘라서 채우기"]] as const).map(([v, t]) => <Chip key={v} on={(l.fit || "free") === v} onClick={() => updateLayer(l.id, { fit: v === "free" ? undefined : v })}>{t}</Chip>)}
              </div>
              <div style={{ display: "flex", gap: 4, marginTop: 5 }}>
                <Chip on={Boolean(l.flipX)} onClick={() => updateLayer(l.id, { flipX: !l.flipX || undefined })}><Icon name="flipH" size={13} />좌우 반전</Chip>
                <Chip on={Boolean(l.flipY)} onClick={() => updateLayer(l.id, { flipY: !l.flipY || undefined })}><Icon name="flipV" size={13} />상하 반전</Chip>
              </div>
            </Sec>
          )}
          {vid && (
            <Sec title="영상 소리">
              <SlimRow label="크기" value={l.muted ? 0 : Math.round((l.volume ?? 1) * 100)} min={0} max={100} step={1} unit="%" onChange={(v, f) => change((p) => { const x = (p.layers || []).find((y2) => y2.id === l.id); if (x) { x.volume = v / 100; x.muted = v <= 0 || undefined; } }, f)} />
              <SlimRow label="영상 시작" value={l.vs || 0} min={0} max={Math.max(1, project.assets[l.asset!]?.duration || 1)} step={0.1} digits={1} unit="초" onChange={(v, f) => change((p) => { const x = (p.layers || []).find((y2) => y2.id === l.id); if (x) x.vs = v || undefined; }, f)} />
            </Sec>
          )}
          {timeSec}
        </>
      );
      const tabs = [{ id: "basic", label: "기본", node: basic }];
      if (l.type === "text") tabs.push({ id: "text", label: "텍스트·애니메이션", node: embed("layer"), embed: true } as (typeof tabs)[number]);
      else if (!vid) tabs.push({ id: "set", label: isSticker(l) ? "그래픽" : "사진", node: embed("layer"), embed: true } as (typeof tabs)[number], { id: "anim", label: "애니메이션", node: embed("anim"), embed: true } as (typeof tabs)[number]);
      else tabs.push({ id: "set", label: "영상", node: embed("layer"), embed: true } as (typeof tabs)[number]);
      return <PropsFrame key={l.id} title={vid ? `영상 올리기 · ${project.assets[l.asset!]?.name || "영상"}${many}` : `${layerName(l)} · ${layerTitle(l)}${many}`} icon={vid ? "video" : layerIcon(l)} onClose={close} tabs={tabs} />;
    }
    const it = its.find((x) => x.clip.id === pk.id);
    if (!it) return <PropsFrame key="none" title="속성" icon="adjust" tabs={[]} empty />;
    const c = it.clip;
    const n = its.indexOf(it) + 1;
    if (pk.kind === "trans") return <PropsFrame key={"t" + c.id} title={`화면전환 · 클립 ${n - 1} → ${n}`} icon="transition" onClose={close} tabs={[{ id: "t", label: "효과", node: embed("trans"), embed: true }]} />;
    if (pk.kind === "sub") {
      return <PropsFrame key={"s" + c.id} title={`메인자막 · 클립 ${n}${many}`} icon="sub" onClose={close}
        tabs={[
          { id: "basic", label: "기본", node: <>{xfSec({ kind: "sub", id: c.id }, it.start, it.start + it.dur, { sizeLabel: "글자 크기" })}<div style={{ padding: "8px 10px", fontSize: 11, color: C.dim, lineHeight: 1.6 }}>자막은 말소리에 붙어 있어서 시간은 클립을 따라가요. 글·글꼴·색은 [자막] 탭에서 고쳐요.</div></> },
          { id: "sub", label: "자막", node: embed("subtitle"), embed: true },
          { id: "anim", label: "애니메이션", node: embed("subanim"), embed: true },
        ]} />;
    }
    if (pk.kind === "voice" || pk.kind === "src") {
      const isV = pk.kind === "voice";
      const basic = (
        <Sec title={isV ? "AI 목소리" : "영상 소리"}>
          <SlimRow label="크기" value={c.muted ? 0 : Math.round((isV || c.type !== "voice" ? c.volume ?? 1 : c.visualVolume ?? 0) * 100)} min={0} max={200} step={1} unit="%"
            onChange={(v, f) => change((p) => { const x = findClip(p, c.id)?.clip; if (!x) return; if (!isV && x.type === "voice") x.visualVolume = v / 100 || undefined; else { x.volume = Math.abs(v - 100) < 0.5 ? undefined : v / 100; x.muted = v <= 0 || undefined; } }, f)} />
          {(isV ? Boolean(c.voice) : c.type !== "voice") && (
            <SlimRow label="빠르기" value={isV ? speedOf(c, project.settings) : srcSpeed(c)} min={0.5} max={2} step={0.05} digits={2} unit="배"
              onChange={(v, f) => change((p) => { const x = findClip(p, c.id)?.clip; if (x) x.speed = Math.abs(v - 1) < 0.001 && !isV ? undefined : +v.toFixed(2); }, f)} />
          )}
          <div style={{ display: "flex", gap: 4, marginTop: 5 }}>
            <Chip on={Boolean(c.muted)} onClick={() => change((p) => { const x = findClip(p, c.id)?.clip; if (x) x.muted = !x.muted || undefined; })}><Icon name="mute" size={13} />이 클립 소리 끄기</Chip>
          </div>
          <div style={{ fontSize: 11, color: C.dim, marginTop: 6, lineHeight: 1.6 }}>소리는 화면과 연결돼 있어 같이 움직여요. 재생 막대 자리 [나누기]·[앞·뒤 지우기]는 목소리를 다시 만들지 않아요.</div>
        </Sec>
      );
      const tabs = [{ id: "basic", label: "기본", node: basic }];
      if (isV) tabs.push({ id: "v", label: "목소리 바꾸기", node: embed("voice"), embed: true } as (typeof tabs)[number]);
      return <PropsFrame key={pk.kind + c.id} title={`${isV ? "AI 목소리" : "영상 소리"} · 클립 ${n}${many}`} icon={isV ? "voice" : "mic"} onClose={close} tabs={tabs} />;
    }
    // 클립 화면
    const a = project.assets[c.visual?.asset || (c.type !== "voice" ? c.src?.asset || "" : "")];
    const basic = (
      <>
        {a && xfSec({ kind: "clip", id: c.id }, it.start, it.start + it.dur)}
        {a && (
          <Sec title="화면">
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {([["contain", "비율 유지"], ["cover", "잘라서 채우기"], ["blur", "흐린 배경"]] as const).map(([v, t]) => <Chip key={v} on={!c.box && (c.fill || project.settings.fill) === v} onClick={() => clipFit(c.id, v)}>{t}</Chip>)}
            </div>
            <div style={{ display: "flex", gap: 4, marginTop: 5 }}>
              <Chip on={Boolean(c.flipX)} onClick={() => clipFlip(c.id, "x")}><Icon name="flipH" size={13} />좌우 반전</Chip>
              <Chip on={Boolean(c.flipY)} onClick={() => clipFlip(c.id, "y")}><Icon name="flipV" size={13} />상하 반전</Chip>
            </div>
          </Sec>
        )}
        <Sec title="시간">
          <TimeBox s={it.start} e={it.start + it.dur} total={flat.total} lenOnly onChange={(s, e) => setClipLength(c.id, e - s)} />
          {c.type !== "voice" && c.src && isVid(c.src.asset) && <SlimRow label="빠르기" value={srcSpeed(c)} min={0.25} max={4} step={0.05} digits={2} unit="배" onChange={(v, f) => change((p) => { const x = findClip(p, c.id)?.clip; if (x) x.speed = Math.abs(v - 1) < 0.001 ? undefined : +v.toFixed(2); }, f)} />}
        </Sec>
        {!a && <div style={{ padding: 10, fontSize: 11.5, color: C.dim }}>화면이 없는 클립이에요. 왼쪽 사진·영상을 이 클립에 끌어 놓으세요.</div>}
      </>
    );
    return <PropsFrame key={"c" + c.id} title={`클립 ${n} · ${a?.name || "화면"}${many}`} icon={a?.kind === "image" ? "image" : "video"} onClose={close}
      tabs={[
        { id: "basic", label: "기본", node: basic },
        ...(a ? [{ id: "adj", label: "필터·조정", node: <AdjustBox adj={c.adj} thumb={a.thumb || (a.kind === "image" ? a.url : "")} onChange={(adj, first) => change((p) => { const x = findClip(p, c.id)?.clip; if (!x) return; if (adj) x.adj = adj; else delete x.adj; }, first)} onAll={() => change((p) => { for (const sc of p.scenes) for (const x of sc.clips) { if (x.visual?.asset || (x.type !== "voice" && x.src)) { if (c.adj) x.adj = structuredClone(c.adj); else delete x.adj; } } })} /> }] : []),
        { id: "media", label: "화면 바꾸기", node: embed("visual"), embed: true },
      ]} />;
  };
  /** 위 메뉴 (파일·편집·클립·트랙·보기) */
  const TL_MENUS: { id: string; label: string; items: ([string, string, () => void] | "|")[] }[] = [
    { id: "file", label: "파일", items: [["새로 만들기", "", goNew], ["프로젝트 열기", "", goOpen], "|", ["저장", "Ctrl+S", () => void saveNow()], ["다른 이름으로 저장", "", askSaveAs], "|", ["내보내기", "", () => setDialog("export")]] },
    { id: "edit", label: "편집", items: [["되돌리기", "Ctrl+Z", undo], ["다시 하기", "Ctrl+Y", redo], "|", ["지우기", "Delete", removePicked], ["모두 고르기", "Ctrl+A", () => setPicks([...flat.items.map((x) => ({ kind: "clip" as const, id: x.clip.id })), ...(project.layers || []).map((l) => ({ kind: "layer" as const, id: l.id }))])]] },
    { id: "clip", label: "클립", items: [["재생 막대 자리에서 나누기", "Ctrl+B", splitPicked], ["앞 지우기", "Q", () => trimPicked("l")], ["뒤 지우기", "W", () => trimPicked("r")], "|", ["좌우 반전", "", flipPicked], ["90도 돌리기", "", rotateSel], ["키프레임 찍기·빼기", "", toggleKey]] },
    { id: "track", label: "트랙", items: [["영상 트랙 추가", "", () => trackOp("addV", "")], ["소리 트랙 추가", "", () => trackOp("addA", "")], "|", [magnet ? "자석 끄기" : "자석 켜기", "", () => setMagnet(!magnet)]] },
    { id: "view", label: "보기", items: [["텍스트 편집으로", "", () => setMode("text")], ["미리보기 크게", "", () => setBig(true)]] },
    { id: "win", label: "창", items: [[`${tlWin.ec ? "✓ " : "　"}효과 컨트롤`, "", () => setTlWin("ec")], [`${tlWin.props ? "✓ " : "　"}속성`, "", () => setTlWin("props")], [`${tlWin.proj ? "✓ " : "　"}프로젝트`, "", () => setTlWin("proj")], [`${tlWin.meter ? "✓ " : "　"}오디오 미터`, "", () => setTlWin("meter")]] },
  ];
  const tlTopBar = (
    <div style={{ display: "flex", alignItems: "center", gap: 2, height: 34, padding: "0 8px", background: C.panel, borderBottom: `1px solid ${C.line}`, flexShrink: 0, fontFamily: FONT }}>
      {railHidden && <button type="button" onClick={() => window.dispatchEvent(new CustomEvent("studio:rail", { detail: false }))} title="왼쪽 메뉴 보이기" style={{ width: 26, height: 24, border: `1px solid ${C.line2}`, borderRadius: 4, background: "transparent", color: C.text, fontSize: 14, fontWeight: 800, cursor: "pointer", marginRight: 4 }}>»</button>}
      <button type="button" onClick={goHome} title="처음 화면" style={{ height: 26, padding: "0 8px", border: 0, borderRadius: 4, background: "transparent", color: C.sub, fontSize: 12, fontWeight: 700, fontFamily: FONT, cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }}>
        <span style={{ transform: "rotate(180deg)", display: "inline-flex" }}><Icon name="chevron" size={12} /></span>처음
      </button>
      <span style={{ width: 1, height: 16, background: C.line, margin: "0 4px" }} />
      {TL_MENUS.map((m) => (
        <div key={m.id} style={{ position: "relative" }} onPointerDown={(e) => e.stopPropagation()}>
          <button type="button" onClick={() => setTlMenu(tlMenu === m.id ? "" : m.id)} onMouseEnter={() => tlMenu && setTlMenu(m.id)}
            style={{ height: 26, padding: "0 9px", border: 0, borderRadius: 4, background: tlMenu === m.id ? C.cardHover : "transparent", color: C.text, fontSize: 12, fontWeight: 600, fontFamily: FONT, cursor: "pointer" }}>{m.label}</button>
          {tlMenu === m.id && (
            <div style={{ position: "absolute", left: 0, top: 28, zIndex: 90, minWidth: 210, padding: 4, borderRadius: 5, background: C.card, border: `1px solid ${C.line2}`, boxShadow: "0 8px 24px rgba(0,0,0,.5)" }}>
              {m.items.map((x, i) => x === "|" ? <div key={i} style={{ height: 1, background: C.line, margin: "4px 2px" }} /> : (
                <button key={x[0]} type="button" onClick={() => { setTlMenu(""); x[2](); }}
                  style={{ width: "100%", display: "flex", alignItems: "center", padding: "5px 9px", border: 0, borderRadius: 3, background: "transparent", color: C.text, fontSize: 12, fontFamily: FONT, cursor: "pointer", textAlign: "left" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = C.cardHover)} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                  <span style={{ flex: 1 }}>{x[0]}</span><span style={{ color: C.dim, fontSize: 11 }}>{x[1]}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
      <span style={{ flex: 1 }} />
      {toast && <span style={{ fontSize: 11.5, color: C.text, background: C.card, border: `1px solid ${C.line2}`, padding: "3px 9px", borderRadius: 4, marginRight: 8, maxWidth: 520, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{toast}</span>}
      <span onClick={() => b.showFile(project.file || project.dir)} title={`${project.file || project.dir}\n누르면 저장된 폴더를 열어요`} style={{ fontSize: 11.5, color: C.dim, marginRight: 8, maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "pointer" }}>
        {project.name}{gssMode ? ".gss" : ""}{gssMode && dirty ? <span style={{ color: "#facc15", fontWeight: 700 }}> · ● 저장 안 함</span> : ""}
      </span>
      <button type="button" title="화면 비율 — 눌러서 바로 고르기" onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); setRatioMenu(ratioMenu ? null : { x: r.left, y: r.bottom + 6 }); }}
                style={{ height: 24, padding: "0 10px", border: `1px solid ${C.line2}`, borderRadius: 5, background: ratioMenu ? C.accentDim : "transparent", color: C.text, fontSize: 11.5, fontWeight: 700, fontFamily: FONT, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, marginRight: 8, whiteSpace: "nowrap" }}>
                <RatioBox ratio={project.ratio} size={15} />{RATIO_LABEL[project.ratio]} {project.ratio}<Icon name="down" size={12} />
              </button>
      <div style={{ display: "flex", border: `1px solid ${C.line2}`, borderRadius: 4, overflow: "hidden", marginRight: 8 }}>
        {([["text", "텍스트 편집"], ["timeline", "타임라인 편집"]] as const).map(([v, t]) => (
          <button key={v} type="button" onClick={() => setMode(v)} style={{ height: 24, padding: "0 9px", border: 0, background: mode === v ? C.accent : "transparent", color: mode === v ? "#fff" : C.sub, fontSize: 11.5, fontWeight: 700, fontFamily: FONT, cursor: "pointer" }}>{t}</button>
        ))}
      </div>
      <button type="button" onClick={() => void saveNow()} title="저장 (Ctrl+S)" style={{ width: 28, height: 24, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${C.line2}`, borderRadius: 4, background: "transparent", color: C.text, cursor: "pointer", marginRight: 6 }}><Icon name="save" size={14} /></button>
      <button type="button" onClick={() => setDialog("export")} style={{ height: 24, padding: "0 10px", display: "flex", alignItems: "center", gap: 4, border: 0, borderRadius: 4, background: C.accent, color: "#fff", fontSize: 11.5, fontWeight: 700, fontFamily: FONT, cursor: "pointer" }}><Icon name="export" size={13} />내보내기</button>
    </div>
  );
  /* ── 효과 컨트롤 (프리미어처럼) — 고른 것의 fx 묶음 ── */
  const setKfOf = (p: Project, tg: XfTarget, kf: Keyframe[] | undefined, base: Keyframe) => {
    if (tg.kind === "layer") {
      const l = (p.layers || []).find((x) => x.id === tg.id);
      if (!l) return;
      if (l.type === "text" && (typeof l.x !== "number" || typeof l.y !== "number")) { l.x = base.x; l.y = base.y; }
      if (kf?.length) l.kf = kf; else delete l.kf;
      return;
    }
    const c = findClip(p, tg.id)?.clip;
    if (!c) return;
    if (tg.kind === "clip") { if (kf?.length) c.kf = kf; else delete c.kf; }
    else { if (kf?.length) c.subKf = kf; else delete c.subKf; }
  };
  const ecWatch = (tg: XfTarget, tau: number | null, props: KfProp[]) => change((p) => {
    const m = xfModel(p, tg);
    if (!m) return;
    if (props.some((q) => kfAny(m.kf, q))) return setKfOf(p, tg, kfClearProps(m.kf, props), m.base);
    if (tau === null) return;
    const cur = (m.kf?.length ? kfAt(m.kf, tau, m.base) : m.base)!;
    let kf = m.kf;
    for (const q of props) kf = kfToggleProp(kf, tau, q, cur);
    setKfOf(p, tg, kf, m.base);
  });
  const ecToggle = (tg: XfTarget, tau: number | null, props: KfProp[]) => {
    if (tau === null) return;
    change((p) => {
      const m = xfModel(p, tg);
      if (!m) return;
      const cur = (m.kf?.length ? kfAt(m.kf, tau, m.base) : m.base)!;
      const allAt = props.every((q) => kfHasAt(m.kf, q, tau));
      let kf = m.kf;
      for (const q of props) if (allAt || !kfHasAt(kf, q, tau)) kf = kfToggleProp(kf, tau, q, cur);
      setKfOf(p, tg, kf, m.base);
    });
  };
  const ecMove = (tg: XfTarget, props: KfProp[], from: number, to: number, first: boolean) => change((p) => {
    const m = xfModel(p, tg);
    if (m) setKfOf(p, tg, kfMoveProps(m.kf, props, from, to), m.base);
  }, first);
  const ecDel = (tg: XfTarget, props: KfProp[], t: number) => change((p) => {
    const m = xfModel(p, tg);
    if (!m) return;
    const cur = (m.kf?.length ? kfAt(m.kf, t, m.base) : m.base)!;
    let kf = m.kf;
    for (const q of props) if (kfHasAt(kf, q, t)) kf = kfToggleProp(kf, t, q, cur);
    setKfOf(p, tg, kf, m.base);
  });
  const cropGroup = (cr: { l?: number; t?: number; r?: number; b?: number } | undefined, set: (k: "l" | "t" | "r" | "b", v: number, first: boolean) => void, reset: () => void): EcGroup => ({
    title: "자르기", reset, open: false,
    rows: ([["l", "왼쪽 자르기"], ["t", "위쪽 자르기"], ["r", "오른쪽 자르기"], ["b", "아래쪽 자르기"]] as const).map(([k2, lb]) => ({
      label: lb, values: [{ v: (cr?.[k2] || 0) * 100, unit: "%", digits: 1, step: 0.2, min: 0, max: 95, set: (v: number, f: boolean) => set(k2, v / 100, f) }], reset: () => set(k2, 0, true),
    })),
  });
  const ecEl = () => {
    const pk = picks[0];
    const its = flat.items;
    const none = <EffectControls name="" groups={[]} tau={null} dur={1} onSeek={() => {}} onWatch={() => {}} onToggle={() => {}} onMoveKey={() => {}} onDelKey={() => {}} empty />;
    if (!pk) return none;
    let tg: XfTarget | null = null, start = 0, end = 1, name = "";
    let crop: EcGroup | null = null;
    const extra: EcGroup[] = [];
    let noOp = false;
    if (pk.kind === "layer") {
      const l = (project.layers || []).find((x) => x.id === pk.id);
      const r = l ? layerRange(project, l, its) : null;
      if (!l || !r) return none;
      start = r.s; end = r.e;
      const vid = Boolean(l.asset && project.assets[l.asset]?.kind === "video");
      name = vid ? project.assets[l.asset!]?.name || "영상" : `${layerName(l)} · ${layerTitle(l)}`;
      const full = l.fit === "cover" || l.fit === "contain";
      if ((l.type === "image" || l.type === "text") && !full) tg = { kind: "layer", id: l.id };
      if (l.type === "image" && !full) {
        const setC = (k2: "l" | "t" | "r" | "b", v: number, f: boolean) => change((p) => { const x = (p.layers || []).find((y2) => y2.id === l.id); if (!x) return; x.crop = { ...(x.crop || {}), [k2]: v || undefined }; if (!cropOf(x.crop)) delete x.crop; }, f);
        crop = cropGroup(l.crop, setC, () => updateLayer(l.id, { crop: undefined }));
      }
      if (vid || l.type === "music" || l.type === "sfx") {
        const dv = l.type === "music" ? 0.15 : l.type === "sfx" ? 0.8 : 1;
        extra.push({ title: "볼륨", rows: [{ label: "레벨", values: [{ v: (l.muted ? 0 : l.volume ?? dv) * 100, unit: "%", digits: 0, step: 1, min: 0, max: 200, set: (v, f) => change((p) => { const x = (p.layers || []).find((y2) => y2.id === l.id); if (x) { x.volume = v / 100; x.muted = v <= 0 || undefined; } }, f) }], reset: () => updateLayer(l.id, { volume: dv, muted: undefined }) }] });
      }
    } else {
      const it = its.find((x) => x.clip.id === pk.id);
      if (!it) return none;
      const c = it.clip;
      start = it.start; end = it.start + it.dur;
      const a = project.assets[c.visual?.asset || (c.type !== "voice" ? c.src?.asset || "" : "")];
      const n = its.indexOf(it) + 1;
      if (pk.kind === "clip") {
        name = `클립 ${n} · ${a?.name || "화면"}`;
        if (a) {
          tg = { kind: "clip", id: c.id };
          const setC = (k2: "l" | "t" | "r" | "b", v: number, f: boolean) => change((p) => { const x = findClip(p, c.id)?.clip; if (!x) return; x.crop = { ...(x.crop || {}), [k2]: v || undefined }; if (!cropOf(x.crop)) delete x.crop; }, f);
          crop = cropGroup(c.crop, setC, () => change((p) => { const x = findClip(p, c.id)?.clip; if (x) delete x.crop; }));
          const adj = c.adj || {};
          const setA = (k2: "b" | "c" | "s" | "t", v: number, f: boolean) => change((p) => { const x = findClip(p, c.id)?.clip; if (!x) return; const nx = { ...(x.adj || {}), [k2]: v || undefined }; for (const kk of Object.keys(nx) as (keyof typeof nx)[]) if (nx[kk] === undefined) delete nx[kk]; if (Object.keys(nx).length) x.adj = nx; else delete x.adj; }, f);
          extra.push({ title: "색 보정", open: false, reset: () => change((p) => { const x = findClip(p, c.id)?.clip; if (x) delete x.adj; }), rows: ([["b", "밝기"], ["c", "대비"], ["s", "채도"], ["t", "색온도"]] as const).map(([k2, lb]) => ({ label: lb, values: [{ v: (adj[k2] || 0) * 100, digits: 0, step: 1, min: -100, max: 100, set: (v: number, f: boolean) => setA(k2, v / 100, f) }], reset: () => setA(k2, 0, true) })) });
        }
      } else if (pk.kind === "sub") {
        name = `메인자막 · 클립 ${n}`;
        tg = { kind: "sub", id: c.id };
        noOp = true;
      } else name = `${pk.kind === "voice" ? "AI 목소리" : pk.kind === "src" ? "영상 소리" : "화면전환"} · 클립 ${n}`;
      if (pk.kind === "clip" || pk.kind === "voice" || pk.kind === "src") {
        const hasSnd = c.type === "voice" ? Boolean(c.voice) || (c.visualVolume || 0) > 0 : Boolean(c.src && project.assets[c.src.asset]?.hasAudio);
        if (hasSnd) extra.push({ title: "볼륨", rows: [{ label: "레벨", values: [{ v: (c.muted ? 0 : c.volume ?? 1) * 100, unit: "%", digits: 0, step: 1, min: 0, max: 200, set: (v, f) => change((p) => { const x = findClip(p, c.id)?.clip; if (x) { x.volume = Math.abs(v - 100) < 0.5 ? undefined : v / 100; x.muted = v <= 0 || undefined; } }, f) }], reset: () => change((p) => { const x = findClip(p, c.id)?.clip; if (x) { delete x.volume; delete x.muted; } }) }] });
      }
    }
    const tau = time >= start - 0.001 && time <= end + 0.001 ? Math.max(0, Math.min(end - start, time - start)) : null;
    const groups: EcGroup[] = [];
    let kf: Keyframe[] | undefined;
    if (tg) {
      const rd = xfRead(project, tg, tau);
      const m = xfModel(project, tg);
      if (rd && m) {
        kf = rd.kf;
        const t2 = tg;
        const at = tau ?? 0;
        const sv = (v: Partial<Record<KfProp, number>>, f: boolean) => xfSet(t2, at, v, f);
        const base = { x: m.base.x * 100, y: m.base.y * 100, s: m.show.s(1), o: 100 };
        groups.push({
          title: "모션",
          reset: () => change((p) => { xfApply(p, t2, at, { x: base.x, y: base.y, s: base.s, r: 0 }); }),
          rows: [
            { label: "위치", props: ["x", "y"], values: [
              { v: (rd.show.x / 100) * RW, digits: 1, step: 1, set: (v, f) => sv({ x: (v / RW) * 100 }, f) },
              { v: (rd.show.y / 100) * RH, digits: 1, step: 1, set: (v, f) => sv({ y: (v / RH) * 100 }, f) },
            ], reset: () => sv({ x: base.x, y: base.y }, true) },
            { label: t2.kind === "layer" && (project.layers || []).find((x) => x.id === t2.id)?.type === "text" || t2.kind === "sub" ? "글자 크기" : "비율 조정", props: ["s"], values: [{ v: rd.show.s, digits: 1, step: 0.5, min: 1, max: 2000, set: (v, f) => sv({ s: v }, f) }], reset: () => sv({ s: base.s }, true) },
            { label: "", note: "☑ 균일 비율" },
            { label: "회전", props: ["r"], values: [{ v: rd.show.r, unit: "°", digits: 1, step: 0.5, set: (v, f) => sv({ r: v }, f) }], reset: () => sv({ r: 0 }, true) },
          ],
        });
        if (!noOp) groups.push({ title: "불투명도", reset: () => sv({ o: 100 }, true), rows: [{ label: "불투명도", props: ["o"], values: [{ v: rd.show.o, unit: "%", digits: 1, step: 0.5, min: 0, max: 100, set: (v, f) => sv({ o: v }, f) }], reset: () => sv({ o: 100 }, true) }] });
      }
    }
    if (crop) groups.push(crop);
    groups.push(...extra);
    if (!groups.length) groups.push({ title: "효과", rows: [{ label: "", note: "이 항목은 효과 컨트롤 값이 없어요 — 오른쪽 속성 칸에서 고쳐요" }] });
    const t3 = tg;
    return (
      <EffectControls key={pk.kind + pk.id} name={name} groups={groups} kf={kf} tau={tau} dur={Math.max(0.1, end - start)}
        onSeek={(t) => { player.current?.pause(); player.current?.seek(start + t + 0.0005); }}
        onWatch={(ps) => t3 && ecWatch(t3, tau, ps)} onToggle={(ps) => t3 && ecToggle(t3, tau, ps)}
        onMoveKey={(ps, from, to, f) => t3 && ecMove(t3, ps, from, to, f)} onDelKey={(ps, t) => t3 && ecDel(t3, ps, t)} />
    );
  };

  /* ── 칸 머리 (프리미어처럼 글자 탭 + ≡) ── */
  const PanelHead = ({ tabs, active, onTab, right }: { tabs: [string, string][]; active: string; onTab?: (k: string) => void; right?: React.ReactNode }) => (
    <div style={{ display: "flex", alignItems: "center", height: 26, padding: "0 4px", borderBottom: `1px solid ${C.line}`, background: C.panel, flexShrink: 0, overflowX: "auto", overflowY: "hidden" }}>
      {tabs.map(([k2, t]) => (
        <button key={k2} type="button" onClick={() => onTab?.(k2)}
          style={{ height: 26, padding: "0 9px", border: 0, borderBottom: `2px solid ${active === k2 ? C.sel : "transparent"}`, background: "transparent", color: active === k2 ? C.text : C.sub, fontSize: 11.5, fontWeight: active === k2 ? 700 : 500, fontFamily: FONT, cursor: onTab ? "pointer" : "default", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 5 }}>
          {t}{active === k2 && <span style={{ color: C.dim, fontSize: 11 }}>≡</span>}
        </button>
      ))}
      <span style={{ flex: 1 }} />
      {right}
    </div>
  );
  // 템플릿은 스티커 분류 안에 (2026-10-20) · AI 자동 편집은 타임라인 편집에서 뺌, 대신 [전환] (2026-10-25 사장님)
  const TL_LEFT: [string, string][] = [["library", "프로젝트"], ["text", "텍스트"], ["sticker", "그래픽"], ["trans", "전환"], ["sfx", "효과음"], ["music", "음악"]];
  const tlRightOverride = ["anim", "subanim", "voice", "source", "ratio"].includes(panel) ? panel : "";
  const TOOLS: [TlTool, string, string][] = [["v", "선택 도구 (V)", "M5 3l13 8-6 1.5L9 19z"], ["a", "앞으로 트랙 선택 도구 (A) — 누른 곳부터 뒤에 있는 것 모두", "M4 5v14M8 12h12M15 7l5 5-5 5"], ["c", "자르기 도구 · 면도칼 (C) — 누른 자리에서 나누기", "M15.5 2.5l6 6L8.5 21.5l-6-6zM10 11.5l2.5 2.5M3 21l2.5-2.5"], ["h", "손 도구 (H) — 타임라인 끌어 보기", "M8 12V6a1.5 1.5 0 013 0v5V4.5a1.5 1.5 0 013 0V11V6a1.5 1.5 0 013 0v8c0 4-2.5 6-6 6s-5-2-7-5l-2-3a1.5 1.5 0 012.5-1.5L8 14"], ["t", "문자 도구 (T) — 누른 트랙·시각에 글자 넣기", "M5 6V4h14v2M12 4v16M9 20h6"]];
  const tlLayout = (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      {tlTopBar}
      <div style={{ height: tlTopH, flexShrink: 0, display: "flex", minHeight: 0 }}>
        {/* 왼쪽 위 — 효과 컨트롤 */}
        {tlWin.ec && (
          <div style={{ width: TL_EC, flexShrink: 0, display: "flex", flexDirection: "column", minHeight: 0, borderRight: `1px solid ${C.line}`, background: C.panel }}
            // 효과 컨트롤 탭을 보고 있어도 — 프로젝트 칸 영상을 끌어다 놓으면 소스 탭으로 열기
            onDragOver={(e) => { if (ecTab === "ec" && e.dataTransfer.types.includes(DRAG_MEDIA)) { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; } }}
            onDrop={(e) => {
              if (ecTab !== "ec") return;
              try { const d = JSON.parse(e.dataTransfer.getData(DRAG_MEDIA) || "{}") as { lib?: LibItem; range?: unknown }; if (d.lib && !d.range && d.lib.kind !== "audio") { e.preventDefault(); openSource(d.lib); } } catch {}
            }}>
            <PanelHead tabs={[["src", `소스: ${srcItem?.name || "(없음)"}`], ["ec", "효과 컨트롤"]]} active={ecTab} onTab={(k2) => setEcTab(k2 as "src" | "ec")} />
            {ecTab === "src" ? <SourceMonitor item={srcItem} range={srcRange} onRange={setSrcRange} onOpen={openSource} onInsert={() => void srcInsert()} onOverwrite={() => void srcOverwrite()} /> : ecEl()}
          </div>
        )}
        {/* 가운데 위 — 프로그램 */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", background: "#141518" }}>
          <PanelHead tabs={[["pg", `프로그램: ${project.name}`]]} active="pg" />
          <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", alignItems: "center", padding: "6px 10px 4px", gap: 5 }}>
            <div style={{ display: "flex", justifyContent: "center", background: "#000" }}
              onDragOver={(e) => { if (e.dataTransfer.types.includes(DRAG_MEDIA) || e.dataTransfer.types.includes(DRAG_STICKER)) { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; } }}
              onDrop={(e) => {
                if (e.dataTransfer.types.includes(DRAG_STICKER)) {
                  e.preventDefault();
                  const box = (e.currentTarget as HTMLElement).querySelector<HTMLElement>("[data-preview]")?.getBoundingClientRect();
                  void onDropSticker({ clipId: cur?.clip.id, x: box ? Math.max(0.05, Math.min(0.95, (e.clientX - box.left) / box.width)) : undefined, y: box ? Math.max(0.05, Math.min(0.95, (e.clientY - box.top) / box.height)) : undefined });
                  return;
                }
                const raw = e.dataTransfer.getData(DRAG_MEDIA);
                if (raw) { e.preventDefault(); void dropOver(time, 0, raw); }
              }}>
              <Player ref={player} project={project} width={big ? bigW : tlPrevW} onTime={setTime} onPlaying={setPlaying} previewRate={rate}
                selLayer={selLayer} onLayerPick={(id) => setPicks([{ kind: "layer", id }])}
                onBoxPick={(kind, id) => setPicks([{ kind: kind === "sub" ? "sub" : "clip", id }])}
                onVisualMove={(id, box2, first) => { noteVisualMove(id, first); change((p) => { const c = findClip(p, id)?.clip; if (c) c.box = box2; }, first); }}
                visualOpen={mode === "timeline" && picks.some((x) => x.kind === "clip" && x.id === cur?.clip.id) ? cur!.clip.id : visualOpen} onVisualOpen={openVisualXf} onVisualLock={() => setVisualOpen("")} onPreviewMenu={setPreviewMenu}
                onSubMove={(patch, first, tau, clipId) => {
                  const c0 = findClip(pref.current, clipId)?.clip;
                  if (!c0?.subKf?.length) return applySub(patch, first);
                  const { wrap, ...rest } = patch;
                  const vals: Partial<Record<KfProp, number>> = {};
                  if (typeof rest.x === "number") vals.x = rest.x * 100;
                  if (typeof rest.y === "number") vals.y = rest.y * 100;
                  if (typeof rest.size === "number") vals.s = rest.size;
                  if (typeof rest.rot === "number") vals.r = rest.rot;
                  if (Object.keys(vals).length) xfSet({ kind: "sub", id: clipId }, tau, vals, first);
                  if (typeof wrap === "number") applySub({ wrap }, first);
                }}
                onLayerMove={moveLayer} onVisualXf={xfVisual}
                onLayerText={(id, text) => { updateLayer(id, { text }); say("글자를 바꿨어요"); }}
                onSubText={(clipId, text) => actions.editSub(clipId, text)} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, width: tlPrevW }}>
              <span style={{ fontSize: 12, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: "#5ea2ff" }}>{fmtTime(time)}</span>
              <span style={{ flex: 1 }} />
              <button type="button" onClick={() => player.current?.seek(Math.max(0, time - 1 / 30))} title="한 프레임 뒤로 (←)" style={{ width: 22, height: 22, border: 0, background: "transparent", color: C.text, cursor: "pointer", fontSize: 11 }}>◀|</button>
              <button type="button" onClick={() => player.current?.toggle()} title="재생·정지 (스페이스)" style={{ width: 26, height: 26, border: 0, background: "transparent", color: C.text, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name={playing ? "pause" : "play"} size={16} stroke={2} /></button>
              <button type="button" onClick={() => player.current?.seek(Math.min(flat.total, time + 1 / 30))} title="한 프레임 앞으로 (→)" style={{ width: 22, height: 22, border: 0, background: "transparent", color: C.text, cursor: "pointer", fontSize: 11 }}>|▶</button>
              <span style={{ flex: 1 }} />
              <select value={rate} onChange={(e) => setRate(Number(e.target.value))} title="미리보기만 빠르게·느리게" style={{ height: 20, borderRadius: 3, border: `1px solid ${C.line2}`, background: C.card, color: C.text, fontSize: 11, fontFamily: FONT }}>
                {[0.5, 0.75, 1, 1.25, 1.5, 2].map((r) => <option key={r} value={r}>{r}배</option>)}
              </select>
              <span style={{ fontSize: 12, color: C.text, fontVariantNumeric: "tabular-nums" }}>{fmtTime(flat.total)}</span>
              <button type="button" onClick={() => setBig(!big)} title="크게 보기" style={{ width: 22, height: 20, border: 0, background: "transparent", color: C.text, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="zoom" size={13} /></button>
            </div>
          </div>
        </div>
        {/* 오른쪽 위 — 속성 */}
        {tlWin.props && (
          <div style={{ width: TL_PR, flexShrink: 0, display: "flex", flexDirection: "column", minHeight: 0, borderLeft: `1px solid ${C.line}` }}>
            <PanelHead tabs={[["pr", "속성"]]} active="pr" />
            <div style={{ flex: 1, minHeight: 0, display: "flex" }}>{tlRightOverride ? embed(tlRightOverride) : tlPropsEl()}</div>
          </div>
        )}
      </div>
      {/* 경계선 — 끌어서 위아래 크기 */}
      <div onPointerDown={dragTl} onDoubleClick={() => { setTlTop(0); try { localStorage.removeItem("studioVideo.tlTop"); } catch {} }} title="끌어서 위·아래 크기 (두 번 누르면 처음 크기)"
        style={{ height: 5, flexShrink: 0, cursor: "row-resize", background: C.line, touchAction: "none" }}
        onMouseEnter={(e) => (e.currentTarget.style.background = C.accent)} onMouseLeave={(e) => (e.currentTarget.style.background = C.line)} />
      <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
        {/* 왼쪽 아래 — 프로젝트 (자료) */}
        {tlWin.proj && (
          <div style={{ width: TL_PJ, flexShrink: 0, display: "flex", flexDirection: "column", minHeight: 0, borderRight: `1px solid ${C.line}`, background: C.panel }}>
            <PanelHead tabs={TL_LEFT} active={leftKind} onTab={(k2) => { setLeftKind(k2); if (k2 === "library") setLibOpen(true); }} />
            <div style={{ flex: 1, minHeight: 0, display: "flex" }}>{leftKind === "trans" ? <TransBin /> : embed(leftKind === "aiedit" ? "library" : leftKind, true)}</div>
          </div>
        )}
        {/* 도구 막대 */}
        <div style={{ width: 34, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, paddingTop: 30, background: C.panel, borderRight: `1px solid ${C.line}` }}>
          {TOOLS.map(([k2, t, d]) => (
            <button key={k2} type="button" title={t} onClick={() => setTool(k2)}
              style={{ width: 28, height: 28, padding: 0, border: 0, borderRadius: 4, background: tool === k2 ? C.accent : "transparent", color: tool === k2 ? "#fff" : C.sub, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
            </button>
          ))}
        </div>
        {/* 타임라인 */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          <PanelHead tabs={[["tl", project.name]]} active="tl" />
          <Timeline project={project} items={flat.items} total={flat.total} time={time} playing={playing} picks={picks} tool={tool}
            tools={{ undo, redo, split: splitPicked, trimHere: trimPicked, remove: removePicked, flip: flipPicked, rotate: rotateSel, key: toggleKey, keyState, magnet, onMagnet: () => setMagnet(!magnet) }}
            onSeek={(t) => player.current?.seek(t)}
            onPicks={(list) => setPicks(list)}
            onTrimClip={trimClip}
            onMoveClip={(id, target, before) => actions.moveClips([id], target, before)}
            onLayersMove={layersMove}
            onTrack={trackOp}
            onDropMedia={(id, where, raw) => void (async () => { const lens = layerLens(); if (id) await onDropMedia(id, where, raw); else await onDropPreview2(raw); if (where !== "replace") keepLayerLens(lens); })()}
            onDropOver={(t, track, raw) => void dropOver(t, track, raw)}
            onDropSticker={(t, track) => void onDropSticker({ t, track })}
            onRazor={razorAt}
            onLink={linkPick}
            onDropTrans={dropTrans}
            onTransLen={transLen}
            onTrackH={(id, h, first) => change((p) => { p.tl = { ...(p.tl || {}), h: { ...(p.tl?.h || {}), [id]: h } }; }, first)}
            onVol={volSet}
            onAddText={addTextAt}
            onOpenText={(id) => { setMode("text"); setSelected([id]); setTimeout(() => document.querySelector(`[data-clip="${id}"]`)?.scrollIntoView({ block: "center" }), 200); }} />
        </div>
        {/* 오디오 미터 */}
        {tlWin.meter && <AudioMeter project={project} items={flat.items} time={time} playing={playing} />}
      </div>
    </div>
  );
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
      {mode === "text" && (<>
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
            style={{ height: 44, padding: "0 12px", border: 0, borderBottom: `2px solid ${tab === t ? C.sel : "transparent"}`, background: "transparent", color: tab === t ? C.text : C.sub, fontSize: 15, fontWeight: tab === t ? 800 : 600, fontFamily: FONT, cursor: "pointer" }}>
            {t}
          </button>
        ))}
        <span style={{ flex: 1 }} />
        {/* 파일 이름 — 누르면 저장된 폴더를 연다 (그 파일을 골라 둔 채로, 2026-10-19 사장님) */}
        <span onClick={() => b.showFile(project.file || project.dir)} title={`${project.file || project.dir}\n누르면 저장된 폴더를 열어요`}
          onMouseEnter={(e) => { e.currentTarget.style.color = C.text; }} onMouseLeave={(e) => { e.currentTarget.style.color = C.dim; }}
          style={{ fontSize: 13.5, color: C.dim, marginRight: 10, maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "pointer" }}>
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
      </>)}
      {elTip && (
        <div style={{ position: "fixed", left: elTip.x, top: elTip.y, transform: "translateX(-50%)", zIndex: 90, padding: "5px 10px", borderRadius: 6, background: C.text, color: C.bg, fontSize: 13, fontWeight: 800, fontFamily: FONT, whiteSpace: "nowrap", pointerEvents: "none", boxShadow: "0 6px 18px rgba(0,0,0,0.4)" }}>
          {elTip.text}
        </div>
      )}
      {mode === "text" && (<>
      {/* 리본 */}
      <div style={{ display: "flex", alignItems: "stretch", gap: 2, minHeight: 74, padding: "6px 10px", background: C.panel, borderBottom: `1px solid ${C.line}`, overflowX: "auto" }}>
        {ribbon[tab].map((btn, i) =>
          btn === "|" ? (
            <span key={i} style={{ width: 1, margin: "6px 6px", background: C.line, flexShrink: 0 }} />
          ) : "node" in btn ? (
            <React.Fragment key={i}>{btn.node}</React.Fragment>
          ) : (
            <button key={i} type="button" onClick={btn.onClick} disabled={btn.disabled || !btn.onClick} title={btn.title || btn.label}
              style={{ minWidth: 70, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, padding: "4px 6px", border: 0, borderRadius: 5, background: "transparent", color: C.text, opacity: btn.disabled || !btn.onClick ? 0.35 : 1, fontSize: 12.5, fontWeight: 600, fontFamily: FONT, cursor: btn.disabled ? "default" : "pointer", lineHeight: 1.25, textAlign: "center", flexShrink: 0 }}
              onMouseEnter={(e) => !btn.disabled && (e.currentTarget.style.background = C.card)} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
              <Icon name={btn.icon} size={22} />
              <span style={{ whiteSpace: "nowrap" }}>{btn.label}</span>
            </button>
          )
        )}
        {/* 요소 단추 — 오른쪽 끝, 아이콘만 한 줄 · 마우스를 올리면 바로 이름 (회의 3-29, 2026-10-19 사장님) */}
        <span style={{ flex: 1, minWidth: 12 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
          {(() => {
            const selL = panel === "layer" ? (project.layers || []).find((x) => x.id === selLayer) : undefined;
            const el: { icon: string; label: string; on: boolean; off?: boolean; title: string; go: () => void; txt?: string }[] = [
              { icon: "ai", label: "AI 자동 편집", on: panel === "aiedit", title: "내 사진·영상과 무료 자료로 화면을 채우고 음악·전환·그래픽·자막까지 — 완성 초안 한 번에", go: () => setPanel(panel === "aiedit" ? "" : "aiedit") },
              // [AI] — AI 이미지·영상 제작 창 바로 열기 (이미지 편집의 [AI] 처럼, 2026-10-22 사장님)
              { icon: "ai", txt: "AI", label: "AI 이미지·영상 제작", on: panel === "aimake", title: "클립마다 AI 이미지·동영상 만들기", go: () => setPanel(panel === "aimake" ? "" : "aimake") },
              { icon: "image", label: "사진·영상", on: side === "library", title: "사진·영상 고르기", go: () => { if (side === "library") { setPanel(""); setLibOpen(false); } else { setPanel(""); setLibOpen(true); } } },
              // 메인자막 + 텍스트 = [텍스트] 하나 — 칸 위 [메인자막][텍스트] 탭 (2026-10-25 사장님)
              { icon: "font", label: "텍스트", on: panel === "subtitle" || panel === "subanim" || panel === "text" || selL?.type === "text", title: "텍스트 — [메인자막] 모양·애니메이션 · [텍스트] 넣기·꾸미기",
                go: () => {
                  if (panel === "subtitle" || panel === "subanim" || panel === "text" || selL?.type === "text") return setPanel("");
                  setSelLayer(""); // 늘 첫 페이지 (새로 넣기·디자인) — 속성은 메인자막·T 아이콘을 누를 때만 (2026-10-25 사장님)
                  setPanel("text");
                } },
              { icon: "sticker", label: "그래픽", on: panel === "sticker" || Boolean(selL && isSticker(selL)), title: "가격대비 짱! · 역 1분! · 초품아! — 부동산 그래픽", go: () => { setStickerTarget(""); setPanel(panel === "sticker" ? "" : "sticker"); } },
              // 화면전환 — 고른(또는 지금) 클립과 다음 클립 사이 (2026-10-19 사장님)
              { icon: "transition", label: "화면전환", on: panel === "trans", title: "화면전환 — 고른 클립과 다음 클립 사이", go: () => {
                if (panel === "trans") return setPanel("");
                const its = flat.items;
                const from = selected.length ? its.findIndex((x) => x.clip.id === selected[0]) : its.findIndex((x) => x.clip.id === cur?.clip.id);
                const next = its[Math.max(0, from) + 1];
                // 누르면 칸만 연다 — 전환은 칸에서 고를 때만 들어간다 (2026-10-30 사장님: 화면전환은 안 해도 칸은 그냥 나타나야)
                if (!next) { setTransClip(""); setPanel("trans"); return; }
                actions.openTrans(next.clip.id, false);
              } },
              { icon: "bell", label: "효과음", on: panel === "sfx" || selL?.type === "sfx", title: "효과음 — 클립(단어) 시작에 한 번", go: () => setPanel(panel === "sfx" ? "" : "sfx") },
              // [썸] 칸은 뺐다 (2026-10-30 사장님) — 썸네일은 포토studio 에서. 칸 그리기(ThumbPanel)는 남겨 둔다
              { icon: "music", label: "배경음악", on: panel === "music" || selL?.type === "music", title: "배경 음악", go: () => (panel === "music" ? setPanel("") : openMusic("")) },
              { icon: "palette", label: "테마", on: false, off: true, title: "테마 — 영상 전체 분위기 한 번에 (준비 중)", go: () => {} },
            ];
            return el.map((x) => (
              <button key={x.label} type="button" onClick={x.go} disabled={x.off} aria-label={x.label}
                style={{ width: 42, height: 42, display: "flex", alignItems: "center", justifyContent: "center", border: 0, borderRadius: 7, background: x.on ? C.accentDim : "transparent", color: x.on ? C.text : x.off ? C.dim : C.sub, opacity: x.off ? 0.45 : 1, cursor: x.off ? "default" : "pointer", padding: 0, boxShadow: x.on ? `inset 0 -2px 0 ${C.accent}` : undefined }}
                onMouseEnter={(e) => {
                  if (!x.on && !x.off) e.currentTarget.style.background = C.card;
                  const r = e.currentTarget.getBoundingClientRect();
                  setElTip({ text: x.off ? `${x.label} (준비 중)` : x.label, x: r.left + r.width / 2, y: r.bottom + 6 });
                }}
                onMouseLeave={(e) => { e.currentTarget.style.background = x.on ? C.accentDim : "transparent"; setElTip(null); }}>
                {x.txt ? <span style={{ fontSize: 14, fontWeight: 900, letterSpacing: -0.5 }}>{x.txt}</span> : <Icon name={x.icon} size={21} />}
              </button>
            ));
          })()}
        </div>
      </div>

      </>)}
      {mode === "timeline" ? tlLayout : (
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {mode === "text" && (<>
        {/* 왼쪽: 미리보기 */}
        <div style={{ width: leftNow, flexShrink: 0, display: "flex", flexDirection: "column", gap: 10, padding: 16, background: C.panel, overflowY: "auto" }}>
          {previewEl}
          {/* 지금 클립 정보 */}
          {cur && (
            <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 6, padding: 12 }}>
              {(() => {
                // 잠긴 것 [모두 풀기] — 2개 이상일 때만 (배경 화면은 빼고 늘 잠금, 2026-10-21 사장님)
                const ls = layersAt(project, cur.clip.id).filter((x) => x.lock);
                const n = ls.length + (project.settings.subLock ? 1 : 0);
                return (
                  <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ flex: 1, fontSize: 15, fontWeight: 800 }}>클립 {cur.index + 1}</span>
                    {n >= 2 && <button type="button" onClick={() => change((p) => { for (const x of p.layers || []) if (ls.some((y) => y.id === x.id)) delete x.lock; delete p.settings.subLock; })} title="이 클립의 잠긴 것을 모두 풀어요 (배경 화면은 그대로 잠금)"
                      style={{ height: 26, padding: "0 10px", borderRadius: 5, border: `1px solid ${C.line2}`, background: "transparent", color: "#FACC15", fontSize: 12.5, fontWeight: 700, fontFamily: FONT, cursor: "pointer" }}>🔓 모두 풀기 ({n})</button>}
                  </div>
                );
              })()}
              {(() => {
                const c = cur.clip;
                const vis = c.visual ? project.assets[c.visual.asset] : c.src ? project.assets[c.src.asset] : null;
                const off = project.settings.off || {};
                const setOff = (k: "visual" | "source" | "voice", v: boolean) => change((p) => { p.settings.off = { ...(p.settings.off || {}), [k]: v || undefined }; });
                const silent = c.muted || c.volume === 0;
                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 14, color: C.sub }}>
                    <TrackRow kind="eye" on={!off.visual} icon={vis?.kind === "image" ? "image" : "video"} name={vis ? vis.name : "화면 없음 (검은 화면)"} hint="화면 레이어 — 모든 클립"
                      onToggle={() => setOff("visual", !off.visual)} onOpen={() => (vis ? actions.openMedia(c.id, 420, 300) : actions.openVisual(c.id))}
                      lock={vis ? { locked: visualOpen !== c.id, onToggle: () => (visualOpen === c.id ? setVisualOpen("") : openVisualXf(c.id)) } : undefined} />
                    {c.type === "voice" ? (
                      <TrackRow kind="ear" on={!off.voice} icon="voice" name={c.voice ? `AI 목소리 ${(c.voice.duration || 0).toFixed(1)}초${silent ? " · 이 클립 무음" : ""}` : "목소리 없음"} danger={silent} hint="AI 목소리 레이어 — 모든 클립"
                        onToggle={() => setOff("voice", !off.voice)} onOpen={() => { setSelected([c.id]); setPanel("voice"); }} />
                    ) : (
                      <TrackRow kind="ear" on={!off.source} icon={silent ? "mute" : "mic"} name={silent ? "원본 소리 무음" : `원본 소리${c.volume && c.volume !== 1 ? ` ${Math.round(c.volume * 100)}%` : ""}`} danger={silent} hint="원본 소리 레이어 — 모든 클립"
                        onToggle={() => setOff("source", !off.source)} onOpen={() => { setSelected([c.id]); setPanel("source"); }} />
                    )}
                    <TrackRow kind="eye" on={project.settings.subtitle.on} icon="sub" name="메인자막" hint="메인자막 — 모든 클립"
                      onToggle={() => change((p) => { p.settings.subtitle.on = !p.settings.subtitle.on; })} onOpen={() => setPanel("subtitle")}
                      lock={project.settings.subLock ? { locked: true, onToggle: () => change((p) => { delete p.settings.subLock; }) } : undefined} />
                    {layersAt(project, c.id).map((l) => (
                      <TrackRow key={l.id} kind={l.type === "music" ? "ear" : "eye"} on={!l.off} icon={layerIcon(l)} name={layerTitle(l)} active={l.id === selLayer} hint="이 애셋 전체"
                        onToggle={() => updateLayer(l.id, { off: !l.off || undefined })} onOpen={() => openLayer(l.id)}
                        lock={l.lock ? { locked: true, onToggle: () => updateLayer(l.id, { lock: undefined }) } : undefined} />
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
        </>)}

        {/* 가운데: 클립 목록 */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 24px", borderBottom: `1px solid ${C.line}` }}>
            {flat.items.length > 0 && <AllBox ids={flat.items.map((x) => x.clip.id)} selected={selected} onChange={actions.selectMany} title="클립 모두 고르기 / 풀기" label="전체" />}
            <span style={{ fontSize: 14, color: C.sub }}>클립 {flat.items.length}개 · {fmtTime(flat.total, false)}{selected.length ? ` · ${selected.length}개 고름` : ""}</span>
            <span style={{ flex: 1 }} />
            {toast && <span style={{ fontSize: 14, color: C.text, background: C.card, border: `1px solid ${C.line2}`, padding: "5px 12px", borderRadius: 5 }}>{toast}</span>}
            <button type="button" title="화면 비율 — 눌러서 바로 고르기" onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); setRatioMenu(ratioMenu ? null : { x: r.left, y: r.bottom + 6 }); }}
                style={{ height: 32, padding: "0 10px", border: `1px solid ${C.line2}`, borderRadius: 5, background: ratioMenu ? C.accentDim : "transparent", color: C.text, fontSize: 13.5, fontWeight: 700, fontFamily: FONT, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, marginRight: 8, whiteSpace: "nowrap" }}>
                <RatioBox ratio={project.ratio} size={15} />{RATIO_LABEL[project.ratio]} {project.ratio}<Icon name="down" size={12} />
              </button>
            <div style={{ display: "flex", border: `1px solid ${C.line2}`, borderRadius: 5, overflow: "hidden" }}>
              {([["text", "텍스트 편집", "text"], ["timeline", "타임라인 편집", "timeline"]] as const).map(([v, t, ic]) => (
                <button key={v} type="button" title={v === "timeline" ? "캡컷처럼 시간 막대에서 편집해요 — 키프레임·다듬기·나누기 (같은 프로젝트, 언제든 바꿀 수 있어요)" : "글(단어)을 보며 편집해요 (같은 프로젝트, 언제든 바꿀 수 있어요)"}
                  onClick={() => { setMode(v); if (v === "timeline") setSelWord(null); }}
                  style={{ height: 32, padding: "0 12px", border: 0, background: mode === v ? C.accent : "transparent", color: mode === v ? "#fff" : C.sub, fontSize: 13.5, fontWeight: 700, fontFamily: FONT, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <Icon name={ic} size={15} />{t}
                </button>
              ))}
            </div>
          </div>
          {(<>
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
          {/* 글은 있는데 AI 목소리가 없는 클립 — 한 번에 만들기 (2026-10-28 사장님: 목소리 없으면 자동 생성 요청) */}
          {(() => {
            const need = flat.items.filter((x) => x.clip.type === "voice" && !x.clip.voice && !x.clip.muted && clipText(x.clip).trim() && !busy[x.clip.id]).map((x) => x.clip.id);
            const making = Object.keys(busy).length > 0;
            if (!need.length && !making) return null;
            return (
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 24px", borderBottom: `1px solid ${C.line}`, background: C.panel, fontSize: 14.5 }}>
                <Icon name="voice" size={18} />
                <span style={{ flex: 1 }}>{making ? `AI 목소리를 만드는 중… (${Object.keys(busy).length}개 남음)` : `AI 목소리가 없는 클립이 ${need.length}개 있어요. 글을 그대로 성우가 읽어요.`}</span>
                {!making && <Btn small primary onClick={() => void revoice(need)}>AI 목소리 모두 만들기</Btn>}
              </div>
            );
          })()}
          {/* 녹화·촬영 영상에 글이 하나도 없을 때만 — 자동 자막 안내 */}
          {!autoSubHide && noTextIds.length > 0 && noTextIds.length === srcItems.length && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 24px", borderBottom: `1px solid ${C.line}`, background: C.panel, fontSize: 14.5 }}>
              <Icon name="mic" size={18} />
              <span style={{ flex: 1 }}>말소리를 글로 바꿔 자막을 만들까요? 문장마다 클립이 나뉘어요. 앞뒤를 먼저 자르면 그만큼 빨라지고 비용도 줄어요.</span>
              <Btn small primary onClick={() => { setAutoScope("empty"); setDialog("autoSub"); }}>자동 자막 만들기</Btn>
              <button type="button" onClick={() => setAutoSubHide(true)} title="닫기" style={{ border: 0, background: "transparent", color: C.sub, cursor: "pointer", display: "flex" }}><Icon name="close" size={18} /></button>
            </div>
          )}
          <div ref={listRef} style={{ flex: 1, overflowY: "auto", minHeight: 0 }}
            // 애셋(글자·스티커·사진·효과음·음악)을 고른 뒤 목록의 다른 곳을 누르면 — 고르기 풀기 (2026-10-19 사장님)
            onPointerDown={(e) => {
              if ((e.target as HTMLElement).closest("[data-layer-ui]")) return;
              if (panel === "layer" || panel === "anim") { setPanel(""); setSelLayer(""); }
            }}
            onClick={(e) => { if (e.target === e.currentTarget) { setSelected([]); setSelWord(null); } }}>
            <ClipList project={project} items={flat.items} selected={selected} selWord={selWord} curClip={cur?.clip.id || ""} curWord={curWord} selWordIs={wordIs()} playing={playing} busy={busy} actions={actions} view={view} lanes={lanes} selLayer={media?.kind === "layer" ? media.id : panel === "layer" || panel === "anim" ? selLayer : ""} onLayerDrag={dragLayer} onDropMedia={onDropMedia} onDropLayer={onDropLayer} onDropSticker={(id) => void onDropSticker({ clipId: id })} transClip={panel === "trans" ? transClip : ""} visualOpen={visualOpen} />
          </div>
          </>)}
        </div>

        {/* 오른쪽 칸 */}
        {mode === "text" && (() => {
          const keep = side === "layer" && under && under.layer === selLayer ? under.kind : "";
          return (
            <div style={{ position: "relative", display: "flex", flexShrink: 0 }}>
              {sidePanels(keep || side)}
              {keep && <div style={{ position: "absolute", inset: 0, display: "flex", zIndex: 5 }}>{sidePanels("layer")}</div>}
            </div>
          );
        })()}
      </div>
      )}

      {trimPick && (() => {
        const it = trimPick.item;
        const close = () => setTrimPick(null);
        // 사진도 같은 창 — 막대 0~30초, 끝 손잡이로 보여 줄 시간 (처음 3초)
        const still = it.kind === "image";
        const D = still ? 30 : it.duration;
        const holdOf2 = (s0: number, e0: number) => +Math.max(0.5, e0 - s0).toFixed(1);
        const asset: Asset = { id: it.id, path: it.path || "", url: it.url, kind: it.kind, name: it.name, duration: D, width: it.width, height: it.height };
        return <VideoStart key={it.id} trim asset={asset} dur={D} start={0} end={still ? 3 : D} onClose={close} onApply={() => {}}
          place={{ canReplace: selected.length > 0,
            drag: it.kind === "video" ? (s0, e0) => JSON.stringify({ lib: it, range: { s: s0, e: e0 } }) : still ? (s0, e0) => JSON.stringify({ lib: it, hold: holdOf2(s0, e0) }) : undefined,
            onPlace: (s0, e0, action) => {
            if (still) return void onPick(it, action, { hold: holdOf2(s0, e0) }).catch((e) => say(errText(e)));
            const range = { s: s0, e: e0 };
            if (it.kind === "audio") {
              if (trimPick.music) return onMusic(trimPick.music, range);
              void b.musicUse(project.dir, it.id).then((m) => onMusic(m, range)).catch((e) => say(errText(e)));
              return;
            }
            void onPick(it, action, { range }).catch((e) => say(errText(e)));
          } }} />;
      })()}
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
        // 목소리 클립에 넣은 영상 — 앞뒤 자르기 (2026-10-21 사장님: 시작·끝을 잘라 쓸 부분만). 짧으면 끝 장면에서 멈춤
        const v0 = it.clip.visual!;
        // 이어 붙일 수 있는 다음 클립 — 같은 씬에서 바로 뒤로 (목소리 클립만, 최대 12개). 지금 이어진 수 = 같은 영상 + visualCont 가 이어지는 만큼
        const k0 = flat.items.indexOf(it);
        const nexts: { id: string; label: string; dur: number; on: boolean }[] = [];
        for (let k = k0 + 1; k < flat.items.length && nexts.length < 12; k++) {
          const x = flat.items[k];
          if (x.sceneId !== it.sceneId || x.clip.type !== "voice" || x.clip.card) break;
          nexts.push({ id: x.clip.id, label: `${k + 1}번`, dur: x.dur, on: Boolean(x.clip.visualCont && x.clip.visual?.asset === v0.asset) });
        }
        let had = 0;
        while (had < nexts.length && nexts[had].on) had++;
        // 앞쪽 빈칸 클립 — 같은 씬에서 바로 앞으로, 화면이 없는 목소리 클립만 (가까운 것부터, 최대 12개)
        const prevs: { id: string; label: string; dur: number }[] = [];
        for (let k = k0 - 1; k >= 0 && prevs.length < 12; k--) {
          const x = flat.items[k];
          if (x.sceneId !== it.sceneId || x.clip.type !== "voice" || x.clip.card || x.clip.visual) break;
          prevs.push({ id: x.clip.id, label: `${k + 1}번`, dur: x.dur });
        }
        const lead0 = Number(it.clip.visualLead) || 0;
        return <VideoStart key={startClip} trim need={it.dur} asset={a} dur={it.dur} start={Math.max(0, (v0.s || 0) - lead0)} end={v0.e ?? Math.min(a.duration || it.dur, (v0.s || 0) + it.dur)} onClose={() => setStartClip("")}
          chain={{ self: `${k0 + 1}번`, next: nexts, count: had, prev: prevs }}
          lead={k0 > 0 && !prevs.length ? (() => { const pv = flat.items[k0 - 1]; const g = Math.max(tailGap(project, pv), Number(it.clip.visualLead) || 0); return g > 0.05 ? { label: `${k0}번 끝`, gap: g, on: (Number(it.clip.visualLead) || 0) > 0.05 } : undefined; })() : undefined}
          onApply={(s, e, n = 0, m = 0, lead = 0) => {
            change((p) => {
              const c = findClip(p, startClip)?.clip;
              if (!c?.visual) return;
              // 앞 클립 모자란 끝 채우기 — 창 시작(s)은 앞 클립 끝부분부터, 이 클립 자기 부분은 s + lead 부터
              if (lead > 0.05) { c.visualLead = +lead.toFixed(3); s = +(s + lead).toFixed(3); } else delete c.visualLead;
              // 앞 빈칸부터 — 맨 앞 클립이 시작점, 그 뒤(이 클립 포함)는 이어서
              const front = prevs.slice(0, m).reverse();
              if (front.length) {
                front.forEach((x, k) => {
                  const d = findClip(p, x.id)?.clip;
                  if (!d) return;
                  d.visual = { asset: v0.asset, s: k === 0 ? s : 0 };
                  d.visualHold = true;
                  if (k === 0) delete d.visualCont; else d.visualCont = true;
                });
                c.visual = { asset: c.visual.asset, s: 0 };
                c.visualCont = true;
              } else c.visual = n > 0 ? { asset: c.visual.asset, s } : { ...c.visual, s, e };
              c.visualHold = true;
              nexts.forEach((x, k) => {
                const d = findClip(p, x.id)?.clip;
                if (!d) return;
                if (k < n) { d.visual = { asset: v0.asset, s: 0 }; d.visualCont = true; d.visualHold = true; }
                else if (x.on) { d.visual = null; delete d.visualCont; delete d.visualHold; } // 이어 붙이기를 줄였으면 — 그 클립은 빈칸으로
              });
            });
            say(n + m > 0 ? `영상 하나를 ${n + m + 1}개 클립에 이어 붙였어요` : `앞뒤를 잘랐어요 (${fmtTime(e - s, false)})`);
          }} />;
      })()}
      {/* 영상 이어 깔기 (컷편집처럼, 2026-10-21 사장님) */}
      {rollEdit && (
        <RollDialog project={project} roll={rollEdit} ensureAsset={ensureAsset} onClose={() => setRollEdit(null)}
          onSave={(r) => { change((p) => { p.rolls = [...(p.rolls || []).filter((x) => x.id !== r.id), r]; }); say(`영상 ${r.items.length}개를 이어 깔았어요`); }}
          onRemove={(project.rolls || []).some((x) => x.id === rollEdit.id) ? () => { change((p) => { p.rolls = (p.rolls || []).filter((x) => x.id !== rollEdit.id); }); say("영상 이어 깔기를 지웠어요"); } : undefined} />
      )}
      {/* 화면 위 영상 — 비디오 시작점 변경 (영상 안 어디부터 쓸지 · 적용 범위 길이만큼 파란 창) */}
      {startLayer && (() => {
        const l = (project.layers || []).find((x) => x.id === startLayer);
        const a = l?.asset ? project.assets[l.asset] : null;
        if (!l || !a || a.kind !== "video") return null;
        const ids = flat.items.map((x) => x.clip.id);
        const i0 = ids.indexOf(l.from), i1 = ids.indexOf(l.to);
        const span = i0 >= 0 && i1 >= i0 ? flat.items.slice(i0, i1 + 1).reduce((t, x) => t + x.dur, 0) : 3;
        return <VideoStart key={startLayer} asset={a} dur={span} start={Number(l.vs) || 0} onClose={() => setStartLayer("")}
          onApply={(s0) => { updateLayer(l.id, { vs: +s0.toFixed(2) }); say(`영상 시작점을 ${fmtTime(s0, false)}로 바꿨어요`); }} />;
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
        return <SoundMenu title={isVoice ? `AI 목소리 · ${findVoice(c.voiceId || project.settings.voice.id)?.name || ""}` : "원본 소리"} x={soundPop.x} y={soundPop.y} lenOnly={soundPop.lenOnly} count={ids.length} scope={soundScope} selCount={sel.length} allCount={same.length} onScope={applyScope}
          muted={Boolean(c.muted)} value={c.volume ?? 1} speed={sp}
          onMute={(v) => each((x) => { x.muted = v || undefined; })}
          onVolume={(v, first) => each((x) => { x.volume = Math.abs(v - 1) < 0.001 ? undefined : +v.toFixed(2); }, first)}
          onSpeed={(v) => each((x) => { if (x.type === "voice" ? x.voice?.duration : x.src) x.speed = x.type !== "voice" && Math.abs(v - 1) < 0.001 ? undefined : v; })}
          onVoice={isVoice ? () => setPanel("voice") : undefined} onRedo={isVoice ? () => revoice(ids, true) : undefined} onClose={() => setSoundPop(null)}
          len={flat.items.find((x) => x.clip.id === c.id)?.dur}
          base={isVoice ? (c.voice?.duration ? c.voice.duration / speedOf(c, project.settings) + voiceGap(c, project.settings) : undefined) : c.src ? keepRanges(c).reduce((a, r) => a + (r.e - r.s), 0) / srcSpeed(c) : undefined}
          pad={isVoice ? Number(c.pad) || 0 : 0}
          onLength={(T) => setClipLength(c.id, T)}
          lenMin={isVoice ? (c.voice?.duration ? c.voice.duration / speedOf(c, project.settings) + voiceGap(c, project.settings) : 0.5) : 0.3}
          lenMax={isVoice ? undefined : c.src ? (project.assets[c.src.asset]?.duration ?? c.src.e) - c.src.s : undefined} />;
      })()}
      {/* 미리보기 오른쪽 클릭 — 잠그기 · 잠긴 것 풀기 (클립 메뉴와 같은 모양, 2026-10-21 사장님) */}
      {previewMenu && (() => {
        const close = () => setPreviewMenu(null);
        const t = previewMenu.target;
        const l = t && !t.startsWith("__") ? (project.layers || []).find((x) => x.id === t) : null;
        if (l) return <QuickMenu key={"pm" + l.id} title={`${layerName(l)} · ${layerTitle(l)}`} what="미리보기" x={previewMenu.x} y={previewMenu.y} onClose={close} items={[
          { icon: "lock", label: "잠그기", desc: "미리보기에서 눌러도 안 잡혀요. 왼쪽 목록의 노란 자물쇠나 빈 곳 오른쪽 클릭으로 풀어요", run: () => { updateLayer(l.id, { lock: true }); setSelLayer(""); setPanel(""); say(`"${layerTitle(l)}"을 잠갔어요`); } },
          { icon: "gear", label: "속성", desc: "오른쪽 칸에서 고쳐요", run: () => openLayer(l.id) },
        ]} />;
        if (t === "__sub") return <QuickMenu key="pmsub" title="메인자막" what="미리보기" x={previewMenu.x} y={previewMenu.y} onClose={close} items={[
          { icon: "lock", label: "잠그기", desc: "메인자막이 미리보기에서 안 잡혀요 (모든 클립)", run: () => { change((p) => { p.settings.subLock = true; }); say("메인자막을 잠갔어요"); } },
          { icon: "gear", label: "속성", desc: "오른쪽 메인자막 칸", run: () => actions.pickSub?.(previewMenu.clipId) },
        ]} />;
        if (t === "__visual") return <QuickMenu key="pmvis" title="배경 화면" what="미리보기" x={previewMenu.x} y={previewMenu.y} onClose={close} items={[
          { icon: "lock", label: "다시 잠그기", desc: "배경 화면은 기본으로 잠겨 있어요", run: () => setVisualOpen("") },
        ]} />;
        // 빈 곳 — 이 화면에서 잠긴 것 풀기
        const locked = [
          ...layersAt(project, previewMenu.clipId).filter((x) => x.lock && x.type !== "music" && x.type !== "sfx").map((x) => ({ key: x.id, name: layerTitle(x), icon: layerIcon(x), go: () => updateLayer(x.id, { lock: undefined }) })),
          ...(project.settings.subLock ? [{ key: "__sub", name: "메인자막", icon: "sub", go: () => change((p) => { delete p.settings.subLock; }) }] : []),
        ];
        const it = flat.items.find((x) => x.clip.id === previewMenu.clipId);
        const hasBg = Boolean(it && (it.clip.visual || (it.clip.type !== "voice" && it.clip.src)));
        return <QuickMenu key="pmempty" title={locked.length ? `잠긴 것 ${locked.length}개 — 누르면 풀려요` : "이 화면에 잠긴 것이 없어요"} what="미리보기" x={previewMenu.x} y={previewMenu.y} onClose={close} items={[
          // 잠긴 것을 바로 — 누르면 풀림 (2026-10-21 사장님: 두 번 들어가지 않게)
          ...locked.map((x) => ({ icon: x.icon, label: `${x.name} 풀기`, desc: "잠금을 풀어 미리보기에서 다시 잡히게 해요", run: x.go })),
          ...(hasBg ? [{ icon: "screen", label: "배경 화면 옮기기·크기", desc: "배경 화면은 기본으로 잠겨 있어요. 누르면 이 클립만 풀려요", run: () => openVisualXf(previewMenu.clipId) }] : []),
        ]} />;
      })()}
      {ratioMenu && <QuickMenu title="화면 비율 — 누르면 바로 바뀌어요" what="화면 비율" x={ratioMenu.x} y={ratioMenu.y} onClose={() => setRatioMenu(null)}
        items={[...(Object.keys(RATIO_LABEL) as Ratio[]).map((r) => ({ icon: "ratio", iconEl: <RatioBox ratio={r} />, label: `${RATIO_LABEL[r]} (${r})`, desc: r === "9:16" ? "세로 영상 — 쇼츠·릴스·틱톡" : r === "16:9" ? "가로 영상 — 유튜브" : r === "1:1" ? "정사각형 — 피드" : r === "4:5" ? "인스타그램 피드 세로" : "예전 TV 화면 비율", on: project.ratio === r, run: () => setRatio(r) })),
          { icon: "gear", label: "채우기·자세히", desc: "사진·영상을 화면에 어떻게 채울지 (오른쪽 칸)", run: () => setPanel("ratio") }]} />}
      {/* 클립 아이콘 메뉴 — 메인자막 · 화면전환 (사진·글자·효과음 메뉴와 같은 생김새, 2026-10-21 사장님) */}
      {quick && (() => {
        const items = flat.items;
        const i = items.findIndex((x) => x.clip.id === quick.id);
        const it = items[i];
        if (!it) return null;
        const close = () => setQuick(null);
        const n = i + 1;
        if (quick.kind === "sub") {
          const s = subNow();
          const px = Math.round(Math.min(...RATIO_SIZE[project.ratio]) * 0.062);
          const subText = typeof it.clip.subText === "string" ? it.clip.subText : clipText(it.clip);
          const scope = subSel ? `고른 클립 ${selected.length}개에 적용` : "전체 클립에 적용";
          const COLORS = ["#FFFFFF", "#FFE000", "#FF8A00", "#FF3B30", "#3DFF7A", "#38D9FF", "#FF4FA3", "#111111"];
          const auto = s.posAuto === true && typeof s.x !== "number";
          return <QuickMenu key={"qs" + it.clip.id} title={`메인자막 · 클립 ${n} · ${scope}`} what="메인자막" x={quick.x} y={quick.y} onClose={close} items={[
            { icon: "pen", label: "글 고치기", desc: "이 클립 자막 글만 고쳐요 (목소리는 그대로)", page: () => <QuickText value={subText} onSave={(t) => { actions.editSub(it.clip.id, t); close(); }} /> },
            { icon: "text", label: "글자 크기", desc: `${scope} — 끌면 바로 바뀌어요`, page: () => <QuickSlider label="글자 크기" value={s.size ?? 100} min={40} max={260} step={5} show={`${Math.round(((s.size ?? 100) / 100) * px)}`} onChange={(v) => applySub({ size: v })} /> },
            { icon: "palette", label: "색·테두리", desc: `${scope} — 글자 색과 테두리`, page: () => (
              <>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>글자 색</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 4, marginBottom: 10 }}>
                  {COLORS.map((c) => <button key={c} type="button" onClick={() => applySub({ color: c })} title={c} style={{ height: 22, borderRadius: 4, border: `2px solid ${(s.color || "#FFFFFF").toUpperCase() === c ? C.accent : C.line2}`, background: c, cursor: "pointer", padding: 0 }} />)}
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, padding: "3px 0", cursor: "pointer" }}>
                  <input type="checkbox" checked={Number(s.outlineWidth ?? 3) > 0} onChange={(e) => applySub({ outlineWidth: e.target.checked ? 3 : 0 })} style={{ width: 16, height: 16, accentColor: C.accent }} />테두리
                </label>
              </>
            ) },
            { icon: "screen", label: "위치", desc: `${scope} — 화면 위아래 어디에 둘지`, page: () => (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 5 }}>
                <button type="button" onClick={() => applySub({ posAuto: true, position: autoSubPosition(project.ratio), x: undefined, y: undefined })} style={quickChip(auto)}>자동</button>
                {([["top", "상단"], ["middle-high", "중상단"], ["middle", "중단"], ["middle-low", "중하단"], ["bottom", "하단"]] as const).map(([k, l]) => (
                  <button key={k} type="button" onClick={() => applySub({ position: k, x: undefined, y: undefined, posAuto: false })} style={quickChip(!auto && typeof s.x !== "number" && s.position === k)}>{l}</button>
                ))}
              </div>
            ) },
            { icon: "transition", label: "애니메이션", desc: "나타날 때·사라질 때 움직임을 넣어요 (오른쪽 칸)", run: () => { actions.selectClip(it.clip.id, false); setPanel("subanim"); } },
            // 숨기기 — [이 클립에서만] / [전체] 두 갈래 (2026-10-21 사장님)
            ...(() => {
              const clipOn = subStyleOf(project.settings, it.clip).on !== false;
              const allOn = project.settings.subtitle.on !== false;
              const setClip = (on: boolean) => change((p) => {
                const c = findClip(p, it.clip.id)?.clip;
                if (!c) return;
                const o: Record<string, unknown> = { ...(c.subStyle || {}) };
                if (on === allOn) delete o.on; else o.on = on;
                c.subStyle = Object.keys(o).length ? (o as Clip["subStyle"]) : undefined;
              });
              const row = (on: boolean, label: string, go: () => void) => <button key={label} type="button" onClick={() => { go(); close(); }} style={{ ...quickChip(on), width: "100%", height: 34, marginBottom: 5, fontSize: 13 }}>{label}</button>;
              return [{ icon: "eye", label: clipOn ? "자막 숨기기" : "자막 보이기", desc: "이 클립에서만 또는 영상 전체에서 자막을 끄거나 켜요", page: () => (
                <>
                  {clipOn ? row(false, "이 클립에서만 숨기기", () => setClip(false)) : row(false, "이 클립 다시 보이기", () => setClip(true))}
                  {allOn ? row(false, "전체 숨기기", () => applySub({ on: false }, true, true)) : row(false, "전체 보이기", () => applySub({ on: true }, true, true))}
                </>
              ) }];
            })(),
            { icon: "font", label: "텍스트로 떼어 내기", desc: "이 클립 자막을 같은 자리·모양의 텍스트로 떼어 내요. 텍스트는 마음대로 옮기고 꾸밀 수 있어요", run: () => detachSub(it.clip.id) },
            { icon: "gear", label: "자세히 (오른쪽 칸)", desc: "글꼴·디자인·템플릿까지 오른쪽 메인자막 칸에서", run: () => actions.pickSub?.(it.clip.id) },
          ]} />;
        }
        const tr = it.clip.trans;
        const prev = items[i - 1];
        if (!tr || !prev) return null;
        const setTr = (patch: Partial<NonNullable<Clip["trans"]>>) => change((p) => { const c = findClip(p, it.clip.id)?.clip; if (c?.trans) c.trans = { ...c.trans, ...patch }; });
        const len = Number(tr.a) + Number(tr.b);
        return <QuickMenu key={"qt" + it.clip.id} title={`화면전환 · 클립 ${n - 1} → ${n} · ${transLabel(tr.type)}`} what="화면전환" x={quick.x} y={quick.y} onClose={close} items={[
          { icon: "transition", label: "전환 바꾸기", desc: "자주 쓰는 전환 — 전체 목록은 [더 보기]", page: () => (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 5 }}>
                {TRANSITIONS.filter((x) => x.tier === "basic").map((x) => <button key={x.id} type="button" onClick={() => setTr({ type: x.id })} style={quickChip(tr.type === x.id)}>{x.label}</button>)}
              </div>
              <button type="button" onClick={() => { close(); actions.openTrans(it.clip.id, false); }} style={{ ...quickChip(false), width: "100%", marginTop: 8 }}>더 보기 (오른쪽 칸)</button>
            </>
          ) },
          { icon: "speed", label: "길이", desc: `지금 ${len.toFixed(1)}초 — 앞뒤 클립이 섞이는 시간`, page: () => (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 5 }}>
              {[0.3, 0.6, 1, 1.5].map((v) => <button key={v} type="button" onClick={() => setTr({ a: v / 2, b: v / 2 })} style={quickChip(Math.abs(len - v) < 0.01)}>{v}초</button>)}
            </div>
          ) },
          { icon: "play", label: "이 부분 보기", desc: "미리보기에서 전환 앞뒤를 틀어 봐요", run: () => { player.current?.seek(Math.max(0, it.start - Math.min(tr.a, prev.dur * 0.45) - 0.8)); setTimeout(() => player.current?.play(), 50); } },
          { icon: "copy", label: "모든 클립 사이에 똑같이", desc: "이 전환을 모든 클립 사이에 넣어요", run: () => allTrans({ ...tr }) },
          { icon: "close", label: "화면전환 없음", desc: "전환을 빼요 — 오른쪽 칸에 [없음]으로 보여요", danger: true, run: () => { change((p) => { const c = findClip(p, it.clip.id)?.clip; if (c) delete c.trans; }); setTransClip(it.clip.id); setPanel("trans"); say("화면전환 없음으로 바꿨어요"); } },
        ]} />;
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
            extra={c.visual || c.src ? [{ icon: "lock", label: "미리보기에서 옮기기·크기", desc: "메인 화면은 미리보기에서 잠겨 있어요. 누르면 이 클립 화면만 잠금이 풀려 끌어 옮기고 모서리로 크기를 바꿔요 (미리보기에서 두 번 눌러도 돼요)", run: () => openVisualXf(c.id) }] : undefined}
            fit={c.fill || project.settings.fill} fits={["contain", "cover", "blur"]} flipX={c.flipX} flipY={c.flipY}
            range={{ a: n, b: n, cur: n, total }} canRemove={Boolean(c.visual)}
            onFit={(f) => clipFit(c.id, f)} onFlip={(ax) => clipFlip(c.id, ax)} onReplace={() => actions.openVisual(c.id)}
            ai={{ last: IMAGE_STYLES.find((x) => x.id === lastAiStyle()), styles: IMAGE_STYLES, onPick: (sid) => void aiVisual(c.id, sid) }}
            onStart={canStart(c) ? () => setStartClip(c.id) : undefined} trim={canTrim(c)} sound={soundOf(c)}
            // 영상 속도 — 촬영·녹화 영상 클립 (2026-10-19 사장님). 원본 소리 칩의 빠르기와 같은 값
            speedCtl={c.type !== "voice" && c.src && project.assets[c.src.asset]?.kind === "video" ? { value: srcSpeed(c), onChange: (v) => change((p) => { const x = findClip(p, c.id)?.clip; if (x) x.speed = Math.abs(v - 1) < 0.001 ? undefined : v; }) } : undefined}
            onRange={(x, y) => clipRange(c.id, x, y)} onRemove={() => clipRemoveVisual(c.id)} onClose={close}
            motion={isPhotoClip(project, c) ? (() => {
              const photos = items.map((x) => x.clip).filter((x) => isPhotoClip(project, x)).map((x) => x.id);
              const sel = selected.filter((id) => photos.includes(id));
              const ids = (sc: "one" | "sel" | "all") => (sc === "all" ? photos : sc === "sel" && sel.length > 1 ? sel : [c.id]);
              return {
                value: c.motion || "auto", power: c.motionPower || "mid", selCount: sel.length, allCount: photos.length,
                // 사진 움직임 — 모든 사진에 [자동]이면 클립 값을 지워 전체 설정(자동)을 따르게
                onPick: (m, sc) => change((p) => { for (const id of ids(sc)) { const x = findClip(p, id)?.clip; if (x) x.motion = m === "auto" ? undefined : (m as Clip["motion"]); } if (sc === "all") p.settings.motion = m === "none" ? "none" : "auto"; }),
                onPower: (pw, sc) => change((p) => { for (const id of ids(sc)) { const x = findClip(p, id)?.clip; if (x) x.motionPower = pw === "mid" ? undefined : (pw as Clip["motionPower"]); } }),
              };
            })() : undefined} />;
        }
        const l = (project.layers || []).find((x) => x.id === media.id);
        if (!l) return null;
        const cov = layerItems(project, l, items);
        const a = cov.length ? pos.get(cov[0].clip.id) || 1 : 1;
        const b = cov.length ? pos.get(cov[cov.length - 1].clip.id) || a : a;
        const curN = cur ? pos.get(cur.clip.id) || a : a;
        const zc = zCan(project, items, l.id);
        const sr = selRange();
        const sel = sr ? { a: pos.get(sr.from) || 1, b: pos.get(sr.to) || 1, n: sr.n } : null;
        const panelOpen = () => { setSelLayer(l.id); setPanel("layer"); };
        const anim = () => { setAnimTarget(l.id); setSelLayer(l.id); setPanel("anim"); };
        const common = {
          title: `${layerName(l)} · ${layerTitle(l)}`, x: media.x, y: media.y, kind: "layer" as const, range: { a, b, cur: curN, total }, sel, canRemove: true,
          onRange: (x: number, y: number) => { if (total) updateLayer(l.id, { from: items[x - 1].clip.id, to: items[y - 1].clip.id }); },
          onRemove: () => removeLayer(l.id), onClose: close,
        };
        // 글자 — 글 고치기 · 글자 크기 · 애니메이션 · 적용 범위 · 순서 · 삭제
        if (l.type === "text")
          return <MediaMenu key={"l" + l.id} {...common} what="글자" order={zc} onOrder={(o) => layerOrder(l.id, o)} onAnim={anim}
            extra={[{ icon: "pen", label: "글 고치기", desc: "오른쪽 칸에서 글·글꼴·색·테두리를 고쳐요 (미리보기에서 두 번 눌러도 돼요)", run: panelOpen }]}
            extraEnd={[{ icon: "sub", label: "메인자막으로 바꾸기", desc: "이 글을 텍스트가 시작하는 클립의 메인자막으로 넣고 텍스트는 지워요", run: () => textToSub(l.id) }]}
            sliders={[{ label: "글자 크기", value: l.size ?? 100, min: 40, max: 260, step: 5, show: `${l.size ?? 100}%`, onChange: (v) => updateLayer(l.id, { size: v }) }]} />;
        // 음악 — 음악 바꾸기 · 소리 크기·페이드 · 적용 범위 · 삭제
        if (l.type === "music")
          return <MediaMenu key={"l" + l.id} {...common} what="음악"
            extra={[{ icon: "music", label: "음악 설정", desc: "오른쪽 칸에서 시작 지점·반복 등을 바꿔요", run: panelOpen }]}
            sliders={[{ label: "볼륨", value: l.volume ?? 0.15, min: 0, max: 2, step: 0.01, show: `${Math.round((l.volume ?? 0.15) * 100)}%`, onChange: (v) => updateLayer(l.id, { volume: v }) }]}
            toggles={[
              { label: "페이드인 (점점 커지며 시작)", on: (l.fadeIn ?? 0) > 0, set: (v) => updateLayer(l.id, { fadeIn: v ? 2 : 0 }) },
              { label: "페이드아웃 (점점 작아지며 끝)", on: (l.fadeOut ?? 0) > 0, set: (v) => updateLayer(l.id, { fadeOut: v ? 2 : 0 }) },
              { label: "반복 (루프)", on: l.loop !== false, set: (v) => updateLayer(l.id, { loop: v }) },
            ]} />;
        // 효과음 — 효과음 바꾸기 · 소리 크기 · 적용 범위 · 삭제
        if (l.type === "sfx")
          return <MediaMenu key={"l" + l.id} {...common} what="효과음"
            extra={[{ icon: "bell", label: "효과음 바꾸기", desc: "오른쪽 칸에서 다른 소리를 골라 들어 봐요", run: panelOpen }]}
            sliders={[{ label: "소리 크기", value: l.volume ?? 0.8, min: 0.1, max: 1, step: 0.05, show: `${Math.round((l.volume ?? 0.8) * 100)}%`, onChange: (v) => updateLayer(l.id, { volume: v }) }]} />;
        // 영상 이어 깔기 조각 — 묶음에서 저절로 만들어지니 묶음을 고친다
        if (l.roll) {
          const r = (project.rolls || []).find((x) => x.id === l.roll);
          return <QuickMenu key={"r" + l.id} title={`영상 이어 깔기 · ${l.name || ""}`} what="이어 깔기" x={media.x} y={media.y} onClose={close} items={[
            { icon: "video", label: "이어 깔기 편집", desc: "영상 차례·자르기·구간·소리를 고쳐요", run: () => { close(); if (r) setRollEdit(structuredClone(r)); } },
            { icon: "trash", label: "이어 깔기 지우기", desc: "이 묶음의 영상 조각을 모두 지워요 (클립 화면은 그대로)", danger: true, run: () => { close(); change((p) => { p.rolls = (p.rolls || []).filter((x) => x.id !== l.roll); }); say("영상 이어 깔기를 지웠어요"); } },
          ]} />;
        }
        // 사진 올리기 · 스티커
        const stk = isSticker(l);
        const vidL = isVideoLayer(l);
        const la = l.asset ? project.assets[l.asset] : null;
        return <MediaMenu key={"l" + l.id} {...common} what={stk ? "그래픽" : vidL ? "영상" : "사진"}
          // 화면 위 영상 — [볼륨 조절] 맨 위 줄 (클립 화면 영상과 같은 칸, 처음엔 무음 · 2026-10-21 사장님)
          onStart={vidL ? () => setStartLayer(l.id) : undefined}
          sound={vidL ? { none: la?.hasAudio === false, note: "화면 위 영상의 소리예요 (AI 목소리 크기와는 따로)", muted: !((l.volume ?? 0) > 0), value: (l.volume ?? 0) > 0 ? l.volume! : 1, onMute: (v: boolean) => updateLayer(l.id, { volume: v ? 0 : (l.volume || 1) }), onVolume: (v: number) => updateLayer(l.id, { volume: v > 0 ? +v.toFixed(2) : 0 }) } : undefined}
          extra={stk ? [{ icon: "pen", label: "그래픽 글자 바꾸기", desc: "오른쪽 칸에서 그래픽 안 글자를 바꿔요 (모양·움직임은 그대로)", run: panelOpen }] : []}
          sliders={[
            { label: "크기", value: l.w ?? 0.35, min: 0.1, max: 1, step: 0.01, show: `${Math.round((l.w ?? 0.35) * 100)}%`, onChange: (v) => updateLayer(l.id, { w: v }) },
            { label: "진하기", value: l.opacity ?? 1, min: 0.2, max: 1, step: 0.05, show: `${Math.round((l.opacity ?? 1) * 100)}%`, onChange: (v) => updateLayer(l.id, { opacity: v }) },
          ]}
          fit={l.fit || "free"} fits={["free", "contain", "cover"]} flipX={l.flipX} flipY={l.flipY} order={zc}
          onFit={(f) => updateLayer(l.id, { fit: f === "blur" ? "contain" : f })}
          onFlip={(ax) => updateLayer(l.id, ax === "x" ? { flipX: !l.flipX || undefined } : { flipY: !l.flipY || undefined })}
          onReplace={() => { if (stk) { setStickerTarget(l.id); setPanel("sticker"); } else { setOverlayTarget(l.id); openLib("mine", true); } }}
          onOrder={(o) => layerOrder(l.id, o)} onAnim={anim} />;
      })()}
      {pop && (() => {
        const l = (project.layers || []).find((x) => x.id === pop.id);
        if (!l) return null;
        return <LayerPopup key={l.id} project={project} layer={l} items={flat.items} selRange={selRange()} x={pop.x} y={pop.y}
          onChange={(patch) => updateLayer(l.id, patch)} onRemove={() => removeLayer(l.id)} onClose={() => setPop(null)} onZ={(o) => layerOrder(l.id, o)}
          onAnim={l.type === "text" ? () => { setAnimTarget(l.id); setSelLayer(l.id); setPanel("anim"); setPop(null); } : undefined} />;
      })()}
      {work && <Modal title=""><Working title={work.title} detail={work.detail} frac={work.frac} /></Modal>}
      {bgSub && (
        <div style={{ position: "fixed", top: 76, left: "50%", transform: "translateX(-50%)", zIndex: 900, display: "flex", alignItems: "center", gap: 12, padding: "9px 12px 9px 16px", borderRadius: 8, border: `1px solid ${C.line2}`, background: C.card, boxShadow: "0 6px 24px rgba(0,0,0,.45)", fontFamily: FONT }}>
          <span style={{ fontSize: 13.5, fontWeight: 800, color: C.text, whiteSpace: "nowrap" }}>{bgSub.title}{typeof bgSub.frac === "number" ? ` ${Math.round(bgSub.frac * 100)}%` : ""}</span>
          <div style={{ width: 140, height: 5, borderRadius: 3, background: C.line2, overflow: "hidden" }}>
            <div style={{ width: `${typeof bgSub.frac === "number" ? Math.round(bgSub.frac * 100) : 30}%`, height: "100%", background: C.accent, transition: "width .3s" }} />
          </div>
          <span style={{ fontSize: 12.5, color: C.sub, whiteSpace: "nowrap" }}>영상은 지금 볼 수 있어요 · 고치기는 끝난 뒤에</span>
          <Btn small onClick={stopBgSub}>그만</Btn>
        </div>
      )}
      {learn && (
        <Modal title="다음에도 이렇게 고칠까요?" onClose={() => setLearn(null)} width={560}
          footer={<><Btn onClick={() => setLearn(null)}>아니요</Btn><Btn primary onClick={async () => {
            const on = learn.filter((x) => x.on).map(({ wrong, right, context }) => ({ wrong, right, context }));
            setLearn(null);
            if (!on.length || !b.sttWords) return;
            const n = await b.sttWords.add(on).catch(() => 0);
            say(n ? `낱말 ${n}개를 기억했어요 — 다음 자동 자막부터 저절로 고쳐요` : "기억하지 못했어요");
          }}><Icon name="check" size={16} />네, 기억하기</Btn></>}>
          <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 10, fontSize: 15.5 }}>
            {learn.map((x, i) => (
              <label key={i} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                <input type="checkbox" checked={x.on} onChange={() => setLearn(learn.map((y, j) => (j === i ? { ...y, on: !y.on } : y)))} style={{ width: 18, height: 18, accentColor: C.accent }} />
                <span style={{ color: C.sub, textDecoration: "line-through" }}>{x.wrong}</span> → <b>{x.right}</b>
              </label>
            ))}
            <div style={{ fontSize: 13.5, color: C.sub, lineHeight: 1.6, marginTop: 6 }}>
              이 PC 의 자동 자막에 바로 쓰여요. 다른 대표님들 받아쓰기도 좋아지도록 공실뉴스에 낱말만 모아요 (녹음·대본은 보내지 않아요).
            </div>
          </div>
        </Modal>
      )}
      {dialog === "export" && <ExportDialog project={project} selected={selected} sceneOf={sel1?.scene.id} onClose={() => setDialog("")} />}
      {dialog === "formats" && <FormatsDialog project={project} onClose={() => setDialog("")} />}
      {autoMotion && <MotionAutoDialog items={flat.items} onClose={() => setAutoMotion(false)} onRun={(r) => void runAutoMotion(r)} />}
      {selected.some((id) => flat.items.find((x) => x.clip.id === id)?.clip.mg) && (
        <div style={{ position: "fixed", right: 24, bottom: 24, zIndex: 50 }}>
          <Btn onClick={() => { removeMotion(selected); say("고른 장면의 모션을 뺐어요"); }}>고른 장면 모션 빼기</Btn>
        </div>
      )}
      {motionAsk && <MotionDialog key={motionAsk} kind={motionAsk} vacancyId={project.vacancyId || ""} ratio={project.ratio} onClose={() => setMotionAsk("")} onInsert={(o, all) => void insertMotion(o, all, motionAsk === "outro" ? "end" : "start")} />}
      {dialog === "saveAs" && (
        <Modal title="다른 이름으로 저장" onClose={() => setDialog("")} width={520}
          footer={<><Btn onClick={() => setDialog("")}>취소</Btn><Btn primary onClick={doSaveAs} disabled={!saveAsName.trim()}>저장</Btn></>}>
          <div style={{ padding: 20 }}>
            <div style={{ ...label, marginBottom: 8 }}>새 프로젝트 이름</div>
            <input value={saveAsName} onChange={(e) => setSaveAsName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && doSaveAs()} autoFocus
              onFocus={(e) => e.currentTarget.select()} style={{ ...input, border: `2px solid ${C.accent}`, boxShadow: "0 0 0 3px rgba(59,130,246,0.18)" }} />
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
            <div>6. <b>음악·사진·텍스트</b>는 클립을 고르고 [삽입] 탭에서 넣어요. 클립 왼쪽 아이콘을 누르면 설정이 열리고, 아이콘이나 막대 끝 손잡이를 위아래로 끌면 범위가 바뀌어요.</div>
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
function TrackRow({ kind, on, icon, name, hint, danger, active, onToggle, onOpen, lock }: { kind: "eye" | "ear"; on: boolean; icon: string; name: string; hint: string; danger?: boolean; active?: boolean; onToggle: () => void; onOpen: () => void; /** 메인 화면 잠금 (2026-10-21) — locked 면 🔒, 누르면 풀기·잠그기 */ lock?: { locked: boolean; onToggle: () => void } }) {
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
      {lock && (
        <button type="button" onClick={lock.onToggle} title={lock.locked ? "잠김 — 미리보기에서 안 잡혀요. 누르면 풀려서 끌어 옮기기·크기" : "풀림 — 미리보기에서 옮기기·크기. 누르면 다시 잠가요"}
          style={{ width: 28, height: 26, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${lock.locked ? C.line2 : C.accent}`, borderRadius: 5, background: lock.locked ? "transparent" : C.accentDim, color: lock.locked ? "#FACC15" : "#5b9cff", cursor: "pointer", padding: 0 }}>
          <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="9" rx="2" /><path d={lock.locked ? "M8 11V8a4 4 0 0 1 8 0v3" : "M8 11V8a4 4 0 0 1 7.5-2"} /></svg>
        </button>
      )}
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

/** 받아쓰기 낱말장 — 고치기 전·후 단어를 맞대어 바뀐 낱말 쌍 (글자 순서 맞추기, 짧은 것만) */
function changedWords(a: string[], b: string[]) {
  const strip = (w: string) => w.replace(/[.,?!~…"']+$/g, "");
  const A = a.map(strip), B = b.map(strip);
  const n = A.length, m = B.length;
  const L = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = A[i] === B[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const out: { wrong: string; right: string; context: string }[] = [];
  let i = 0, j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && A[i] === B[j]) { i++; j++; continue; }
    const i0 = i, j0 = j;
    while ((i < n || j < m) && !(i < n && j < m && A[i] === B[j])) {
      if (j >= m || (i < n && L[i + 1][j] >= L[i][j + 1])) i++;
      else j++;
    }
    const wrong = A.slice(i0, i).join(" "), right = B.slice(j0, j).join(" ");
    if (wrong.length >= 2 && right && wrong !== right && wrong.length <= 20 && right.length <= 20 && i - i0 <= 3 && j - j0 <= 3)
      out.push({ wrong, right, context: [A[i0 - 1], wrong, A[i]].filter(Boolean).join(" ") });
  }
  return out;
}

function ExportDialog({ project, selected, sceneOf, onClose }: { project: Project; selected: string[]; sceneOf?: string; onClose: () => void }) {
  const b = videoBridge()!;
  const [scope, setScope] = useState<"all" | "scene" | "selected">("all");
  const [height, setHeight] = useState(0);
  const [kind, setKind] = useState<"mp4" | "mp3">(project.method === "audio" ? "mp3" : "mp4"); // 영상 / 소리만(MP3) — 오디오로 편집하기는 소리만이 기본
  const [state, setState] = useState<{ text: string; frac: number } | null>(null);
  const [job, setJob] = useState("");
  const [done, setDone] = useState<{ file: string; seconds: number; took: number; url?: string } | null>(null);
  const [post, setPost] = useState<"" | "youtube" | "instagram">(""); // 완성 영상 SNS 올리기 (2026-10-21)
  // 만드는 중 — 다 만든 클립을 바로 틀어 보여 준다 (2026-10-22 사장님: 실시간으로 영상 보여 주기)
  const [made, setMade] = useState<{ url: string; i: number; n: number }[]>([]);
  const [watch, setWatch] = useState(-1); // 크게 보는 클립 (-1 = 늘 방금 만든 것)
  const [t0, setT0] = useState(0);
  const [err, setErr] = useState("");
  const [W0, H0] = project.ratio === "16:9" ? [1920, 1080] : project.ratio === "9:16" ? [1080, 1920] : project.ratio === "4:5" ? [1080, 1350] : project.ratio === "4:3" ? [1440, 1080] : [1080, 1080];
  const go = async () => {
    setErr("");
    // 저장할 곳·파일 이름 고르기 (윈도우 저장 창) — 취소하면 내보내지 않는다. 옛 앱은 저장 폴더 설정대로
    let outFile: string | undefined;
    if (b.exportPick) {
      const f = await b.exportPick(project, kind);
      if (!f) return;
      outFile = f;
    }
    setState({ text: "준비하는 중…", frac: 0 });
    setMade([]);
    setWatch(-1);
    setT0(Date.now());
    const off = b.onRender((text, frac, id, x) => {
      if (id) setJob(id);
      else {
        setState({ text, frac });
        if (x?.clip) { const c = { url: x.clip, i: x.i ?? 0, n: x.n ?? 0 }; setMade((m) => [...m, c]); }
      }
    });
    try {
      const o = { scope, sceneId: sceneOf, clipIds: selected, outFile };
      if (kind === "mp3") {
        const r = await b.exportAudio(project, "mp3", o);
        setDone(typeof r === "string" ? { file: r, seconds: 0, took: 0 } : r);
      } else {
        // 스티커·사진 움직임을 칸마다 그려 두고 굽는다 (완성 영상 = 미리보기)
        const p2 = await bakeAnim(project, o, b, (text, frac) => setState({ text, frac }));
        setDone(await b.render(p2, { ...o, height: height || undefined }));
      }
    } catch (e) {
      setErr(errText(e));
    } finally {
      off();
      setState(null);
    }
  };
  if (done && post) return <PostDialog project={project} file={done.file} seconds={done.seconds} channel={post} onClose={() => setPost("")} />;
  if (done) {
    return (
      <Modal title={kind === "mp3" ? "소리 파일이 완성됐어요" : "영상이 완성됐어요"} onClose={onClose} width={kind === "mp4" && done.url ? 760 : 560} footer={<><Btn onClick={() => b.showFile(done.file)}><Icon name="folder" size={16} />폴더에서 보기</Btn><Btn primary onClick={() => b.openPath(done.file)}><Icon name="play" size={16} />{kind === "mp3" ? "소리 들어 보기" : "영상 열어 보기"}</Btn></>}>
        <div style={{ padding: 22, fontSize: 15.5, lineHeight: 1.8 }}>
          {/* 완성본 바로 재생 (2026-10-22 사장님) */}
          {kind === "mp4" && done.url && (
            <video key={done.url} src={done.url} controls autoPlay playsInline
              style={{ width: "100%", maxHeight: 420, background: "#000", borderRadius: 8, display: "block", marginBottom: 12, aspectRatio: project.ratio.replace(":", " / ") }} />
          )}
          {done.seconds > 0 && <div>길이 {fmtTime(done.seconds, false)} · 만드는 데 {Math.round(done.took)}초 걸렸어요.</div>}
          <div style={{ color: C.sub, fontSize: 14, wordBreak: "break-all" }}>{done.file}</div>
          {/* SNS 올리기 — 반자동: 크롬에서 파일·글을 채우고 [게시]는 직접 (2026-10-21 사장님) */}
          {kind === "mp4" && (
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${C.line}` }}>
              <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 8 }}>내 SNS에 올리기</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Btn onClick={() => setPost("youtube")}><ChannelMark ch="youtube" />유튜브에 올리기</Btn>
                <Btn onClick={() => setPost("instagram")}><ChannelMark ch="instagram" />인스타그램에 올리기</Btn>
              </div>
              <div style={{ fontSize: 12.5, color: C.dim, marginTop: 6 }}>AI가 제목·설명을 쓰고, 크롬에서 영상과 글을 채워 둬요. 마지막 [게시]는 직접 눌러요.</div>
            </div>
          )}
        </div>
      </Modal>
    );
  }
  if (state) {
    const big = watch >= 0 ? made[watch] : made[made.length - 1];
    const el = t0 ? (Date.now() - t0) / 1000 : 0;
    // 남은 시간 — 클립 만드는 단계(90% 까지)만. 잇기·전환·음악 섞기는 진행률이 멈춰 있어 맞지 않는다
    const left = state.frac > 0.05 && state.frac < 0.9 ? Math.max(1, Math.round((el / state.frac) * 0.9 - el) + 5) : 0;
    return (
      <Modal title="영상 내보내기" width={kind === "mp4" ? 760 : 560} footer={<Btn onClick={() => job && b.renderCancel(job)}>멈추기</Btn>}>
        {kind === "mp4" && (
          <div style={{ padding: "16px 20px 0" }}>
            {/* 방금 만든 클립을 틀어 보여 준다 — 자막·그래픽이 들어간 실제 영상 */}
            <div style={{ position: "relative", width: "100%", aspectRatio: project.ratio.replace(":", " / "), maxHeight: 400, margin: "0 auto", background: "#000", borderRadius: 8, overflow: "hidden" }}>
              {big ? (
                <video key={big.url} src={big.url} autoPlay muted loop playsInline style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
              ) : (
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: C.sub, fontSize: 14 }}>첫 클립을 만드는 중…</div>
              )}
              {big && <span style={{ position: "absolute", left: 10, top: 10, padding: "3px 9px", borderRadius: 4, background: "rgba(0,0,0,0.65)", color: "#fff", fontSize: 12.5, fontWeight: 700 }}>클립 {big.i + 1} / {big.n}{watch < 0 ? " · 방금 완성" : ""}</span>}
            </div>
            {made.length > 0 && (
              <div style={{ display: "flex", gap: 6, overflowX: "auto", padding: "10px 0 2px" }}>
                {made.map((m, k) => (
                  <button key={m.url} type="button" onClick={() => setWatch(watch === k ? -1 : k)} title={`클립 ${m.i + 1}`}
                    style={{ flex: "0 0 auto", width: 96, padding: 0, borderRadius: 4, overflow: "hidden", border: `2px solid ${(watch < 0 ? k === made.length - 1 : watch === k) ? C.accent : "transparent"}`, background: "#000", cursor: "pointer", aspectRatio: project.ratio.replace(":", " / "), maxHeight: 96 }}>
                    <video src={`${m.url}#t=0.3`} muted preload="metadata" playsInline style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", pointerEvents: "none" }} />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <Working ad={false} title={state.text} frac={state.frac} detail={left > 0 ? `남은 시간 약 ${left >= 60 ? `${Math.floor(left / 60)}분 ` : ""}${left % 60}초 · 이 창을 닫지 마세요.` : "PC에서 만들고 있어요. 이 창을 닫지 마세요."} />
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
        {kind === "mp4" && (() => {
          // 이 앱이 키프레임·색 보정을 못 그리면 (옛 앱) — 미리 알린다
          const clips = project.scenes.flatMap((s) => s.clips);
          const usesKf = clips.some((c) => c.kf?.length || c.rot || (c.opacity ?? 1) < 1) || (project.layers || []).some((l) => l.kf?.length || typeof l.ts === "number" || typeof l.te === "number");
          const usesAdj = clips.some((c) => c.adj);
          const f = b.features || [];
          const usesTrx = clips.some((c) => String(c.trans?.type || "").startsWith("x_"));
          const miss = [usesKf && !f.includes("kf") ? "키프레임·화면 돌리기·진하기" : "", usesAdj && !f.includes("adj") ? "필터·색 보정" : "", usesTrx && !f.includes("trx") ? "고급 화면전환" : ""].filter(Boolean);
          return miss.length ? (
            <div style={{ padding: "10px 12px", borderRadius: 6, border: `1px solid ${C.danger}`, background: "rgba(239,68,68,0.1)", fontSize: 14, lineHeight: 1.6 }}>
              <b style={{ color: C.danger }}>이 앱은 {miss.join("·")}을(를) 영상에 넣지 못해요.</b><br />
              <span style={{ color: C.sub }}>공실마케팅를 최신 버전으로 업데이트한 뒤 내보내 주세요. (지금 내보내면 그 부분은 움직이지 않아요)</span>
            </div>
          ) : null;
        })()}
        {offNames(project).length > 0 && (
          <div style={{ padding: "10px 12px", borderRadius: 6, border: `1px solid ${C.danger}`, background: "rgba(239,68,68,0.1)", fontSize: 14, lineHeight: 1.6 }}>
            <b style={{ color: C.danger }}>꺼 둔 레이어가 있어요:</b> {offNames(project).join(", ")}<br />
            <span style={{ color: C.sub }}>꺼 둔 것은 영상에 들어가지 않아요. 넣으려면 미리보기 아래에서 다시 켜 주세요.</span>
          </div>
        )}
        <div>
          <div style={{ ...label, marginBottom: 10 }}>내보낼 형식</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {radio(kind === "mp4", "영상 (MP4)", () => setKind("mp4"))}
            {radio(kind === "mp3", "소리만 (MP3) — 목소리·음악 소리만", () => setKind("mp3"))}
          </div>
        </div>
        <div>
          <div style={{ ...label, marginBottom: 10 }}>내보낼 클립</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {radio(scope === "all", "모든 씬, 모든 클립", () => setScope("all"))}
            {radio(scope === "scene", "지금 씬만", () => setScope("scene"), !sceneOf)}
            {radio(scope === "selected", `고른 클립만 (${selected.length}개)`, () => setScope("selected"), !selected.length)}
          </div>
        </div>
        {kind === "mp4" && <div>
          <div style={{ ...label, marginBottom: 10 }}>해상도</div>
          <select value={height} onChange={(e) => setHeight(Number(e.target.value))} style={{ ...input }}>
            <option value={0}>원본 ({W0} × {H0})</option>
            <option value={720}>720p (파일이 작아요)</option>
            <option value={480}>480p (카톡으로 보내기 좋아요)</option>
          </select>
        </div>}
        <div style={{ fontSize: 14, color: C.sub }}>{b.exportPick ? "[내보내기]를 누르면 저장할 폴더와 파일 이름을 고르는 창이 떠요." : "저장 위치: 저장 폴더 설정의 내보내기 폴더 (앱을 업데이트하면 직접 고를 수 있어요)"}</div>
        {err && <div style={{ fontSize: 14.5, color: C.danger, lineHeight: 1.6 }}>{err}</div>}
      </div>
    </Modal>
  );
}

function FormatsDialog({ project, onClose }: { project: Project; onClose: () => void }) {
  const b = videoBridge()!;
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  // 저장할 폴더·파일 이름을 먼저 고른다 (취소하면 만들지 않는다). 옛 앱은 저장 폴더 설정대로
  const pick = async (kind: "mp3" | "wav" | "srt" | "txt"): Promise<string | undefined | null> => (b.exportPick ? b.exportPick(project, kind) : undefined);
  const run = async (fn: () => Promise<unknown>, okMsg: string) => {
    setBusy(true);
    setMsg("");
    try {
      const r = await fn();
      if (r === null) { setBusy(false); return; } // 저장 창에서 취소
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
        {row("sub", "자막 (.srt)", "유튜브에 자막으로 올릴 수 있어요", () => run(async () => { const f = await pick("srt"); return f === null ? null : b.project.exportText(project, "srt", f); }, "자막 파일을 저장했어요"))}
        {row("file", "텍스트 (.txt)", "대본 글만", () => run(async () => { const f = await pick("txt"); return f === null ? null : b.project.exportText(project, "txt", f); }, "텍스트 파일을 저장했어요"))}
        {row("music", "소리 (.mp3)", "목소리·음악 소리만", () => run(async () => { const f = await pick("mp3"); if (f === null) return null; const r = await b.exportAudio(project, "mp3", { outFile: f }); return b.showFile(typeof r === "string" ? r : r.file); }, "소리 파일을 저장했어요"))}
        {row("music", "소리 (.wav)", "편집용 고음질 소리", () => run(async () => { const f = await pick("wav"); if (f === null) return null; const r = await b.exportAudio(project, "wav", { outFile: f }); return b.showFile(typeof r === "string" ? r : r.file); }, "소리 파일을 저장했어요"))}
        {busy && <Working title="만드는 중…" ad={false} />}
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
