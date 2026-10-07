"use client";

// 공실 릴스 편집기 (브루식): 대사 한 줄 = 클립 하나. 고치면 미리보기가 바로 바뀌고 자동 저장된다.
// 매물마다 프로젝트가 저장되어 다시 열면 이어서 편집한다. 미리보기는 MP4 렌더와 같은 템플릿(buildReel)을 쓴다.
import { Fragment, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import ClipMenu from "./ClipMenu";
import MusicPicker, { type MyTrack } from "./MusicPicker";
import { isMyMusic, musicAsset, musicLabel } from "@/lib/reels/music-catalog";
import { instagramCaption } from "@/lib/reels/ad-text";
import StageEditor from "./StageEditor";
import VideoTrimmer from "./VideoTrimmer";
import { defaultVideo, MediaLibrary, type MediaItem } from "./VideoParts";
import { buildReel, CAPTION_COLOR, type Plan, type TemplateScene } from "@/lib/reels/template";
import { REEL_STYLES, type ReelStyle, FX_OPTIONS, sceneUnits, sceneWords, spokenText, type ReelPhoto, type ReelScene, type ReelScript, type ReelSettings, type SceneFx } from "@/lib/reels/types";
import st from "./reels.module.css";

const VOICES = [
  { id: "Aoede", g: "여성", label: "밝은 여성", desc: "산뜻하고 경쾌한" },
  { id: "Kore", g: "여성", label: "차분한 여성", desc: "단정하고 또박또박" },
  { id: "Leda", g: "여성", label: "발랄한 여성", desc: "젊고 생기 있는" },
  { id: "Zephyr", g: "여성", label: "또렷한 여성", desc: "맑고 선명한" },
  { id: "Sulafat", g: "여성", label: "따뜻한 여성", desc: "포근하고 친절한" },
  { id: "Achernar", g: "여성", label: "부드러운 여성", desc: "나긋하고 고급스러운" },
  { id: "Puck", g: "남성", label: "활기찬 남성", desc: "힘차고 밝은" },
  { id: "Charon", g: "남성", label: "신뢰감 남성", desc: "안정적인 안내" },
  { id: "Fenrir", g: "남성", label: "신나는 남성", desc: "들뜨고 에너지 넘치는" },
  { id: "Achird", g: "남성", label: "친근한 남성", desc: "옆집 형처럼 편한" },
  { id: "Algieba", g: "남성", label: "부드러운 남성", desc: "차분하고 매끄러운" },
  { id: "Sadaltager", g: "남성", label: "전문가 남성", desc: "똑 부러지는 설명" },
] as const;
const MUSIC = [
  { id: "upbeat", label: "경쾌한 음악" },
  { id: "calm", label: "잔잔한 음악" },
  { id: "none", label: "음악 없음" },
];
const KIND_LABEL: Record<string, string> = { hook: "첫 클립", photo: "사진", price: "가격 · 교통", cta: "마무리" };
const STAGE_LABEL: Record<string, string> = { voice: "성우 준비", verify: "숫자 확인", render: "영상 굽는 중", upload: "저장 중" };

type Voice = { url: string; duration: number };
type Video = { id: string; status: string; stage: string | null; duration_s: number | null; error: string | null; created_at: string; videoUrl: string | null; downloadUrl?: string | null; expiresAt?: string | null; expired?: boolean };

// 받기: 서버는 24시간만 보관하므로 완성되면 바로 PC·휴대폰에 저장한다
const saveFile = (url: string) => {
  const a = document.createElement("a");
  a.href = url;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
};
const leftTime = (iso?: string | null) => {
  if (!iso) return "";
  const h = (new Date(iso).getTime() - Date.now()) / 3600_000;
  return h <= 0 ? "곧 삭제" : h < 1 ? `${Math.max(1, Math.round(h * 60))}분 뒤 삭제` : `${Math.floor(h)}시간 뒤 삭제`;
};
type PlayerEl = HTMLElement & { seek(t: number): void; play(): void; pause(): void; paused: boolean };

const voiceKey = (voice: string, text: string) => `${voice}\n${text}`;
const estimate = (text: string) => Math.max(1.5, text.replace(/\s/g, "").length / 7 + 0.3);

async function api<T>(url: string, init?: RequestInit): Promise<T & { success: boolean; error?: string }> {
  try {
    const res = await fetch(url, init);
    return await res.json();
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) } as T & { success: boolean; error?: string };
  }
}
const json = (method: string, body: unknown): RequestInit => ({ method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

function Editor({ vacancyId }: { vacancyId: string }) {
  const [script, setScript] = useState<ReelScript | null>(null);
  const [scenes, setScenes] = useState<ReelScene[]>([]);
  const [voice, setVoice] = useState("Aoede");
  const [settings, setSettings] = useState<ReelSettings>({});
  const [fxOpen, setFxOpen] = useState<{ i: number; tab: FxTab } | null>(null);
  const [music, setMusic] = useState("upbeat");
  const [voices, setVoices] = useState<Record<string, Voice>>({});
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [warnings, setWarnings] = useState<string[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState<string | null>("프로젝트를 여는 중…");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState("");
  const [unsaved, setUnsaved] = useState(false);
  const [active, setActive] = useState(0);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  // 재생 중인 클립 번호 (멈추면 그 클립이 선택되도록)
  const curRef = useRef(0);
  const [libOpen, setLibOpen] = useState(true); // 오른쪽 "내 사진·영상" 칸
  const [menu, setMenu] = useState<{ i: number; x: number; y: number } | null>(null); // 클립 메뉴
  const [trimClip, setTrimClip] = useState<number | null>(null); // 영상 구간 정하기 창
  const [transOpen, setTransOpen] = useState<number | null>(null);
  const [musicOpen, setMusicOpen] = useState(false); // 배경음악 고르기 창
  const [captionOpen, setCaptionOpen] = useState(false); // 인스타 게시글 문구 창
  const [pop, setPop] = useState<"settings" | "videos" | null>(null); // 위쪽 [⚙ 전체 설정] [🎬 만든 영상] 펼침
  const [myMusic, setMyMusic] = useState<MyTrack[]>([]); // 클립 사이 전환 고르기 (i = 들어오는 클립)
  const [making, setMaking] = useState<string | null>(null);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const autoPut = useRef<{ media: string; clip: number } | null>(null); // 변환이 끝나면 이 클립에 넣기
  const [setup, setSetup] = useState(false); // 초안 화면 (대본 다듬기 + 성우·스타일·음악)
  const [watch, setWatch] = useState<string | null>(null); // 왼쪽 화면에서 완성 영상 보기
  const player = useRef<PlayerEl | null>(null);
  const dirty = useRef(false);

  // ── 열기: 저장된 프로젝트가 있으면 그대로, 없을 때만 AI 초안 ──
  const applyProject = useCallback((p: { script: ReelScript; voice: string; music: string }) => {
    setScript(p.script);
    setScenes(p.script.scenes);
    setSettings(p.script.settings || {});
    setVoice(p.voice);
    setMusic(p.music);
    dirty.current = false;
  }, []);

  // ── 올린 영상: 목록 + 올리는 중·변환 중이면 4초마다 확인 ──
  // 내 음악 목록 (한 번)
  useEffect(() => {
    let alive = true;
    api<{ music: MyTrack[] }>(`/api/reels/music?vacancyId=${vacancyId}`).then((d) => alive && d.success && setMyMusic(d.music));
    return () => {
      alive = false;
    };
  }, [vacancyId]);

  const loadMedia = useCallback(async () => {
    const d = await api<{ media: MediaItem[] }>(`/api/reels/media?vacancyId=${vacancyId}`);
    if (d.success) setMedia(d.media);
  }, [vacancyId]);
  useEffect(() => {
    const t = setTimeout(loadMedia, 0);
    return () => clearTimeout(t);
  }, [loadMedia]);
  useEffect(() => {
    const want = autoPut.current;
    const m = want && media.find((x) => x.id === want.media);
    if (!want || !m || m.status === "uploading" || m.status === "processing") return;
    autoPut.current = null;
    if (m.status !== "ready") return;
    const t = setTimeout(() => {
      dirty.current = true;
      setUnsaved(true);
      setScenes((sc) => sc.map((x, n) => (n === want.clip && (x.kind === "hook" || x.kind === "photo") ? { ...x, video: defaultVideo(m, 3) } : x)));
    }, 0);
    return () => clearTimeout(t);
  }, [media]);
  const busyMedia = media.some((m) => m.status === "uploading" || m.status === "processing");
  useEffect(() => {
    if (!busyMedia) return;
    const t = setInterval(loadMedia, 4000);
    return () => clearInterval(t);
  }, [busyMedia, loadMedia]);

  const loadVideos = useCallback(async () => {
    const d = await api<{ videos: Video[] }>(`/api/reels/project?vacancyId=${vacancyId}`);
    if (d.success) setVideos(d.videos);
    return d.success ? d.videos : [];
  }, [vacancyId]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const d = await api<{ project: { script: ReelScript; voice: string; music: string } | null; warnings: string[]; videos: Video[] }>(`/api/reels/project?vacancyId=${vacancyId}`);
      if (!alive) return;
      if (!d.success) return void (setLoading(null), setError(d.error || "열지 못했습니다."));
      setVideos(d.videos || []);
      if (d.project) {
        applyProject(d.project);
        setWarnings(d.warnings || []);
        setLoading(null);
        if (d.project.script.draft) setSetup(true);
        return;
      }
      // 처음 여는 매물: 바로 AI 초안을 쓰고 초안 화면으로
      setLoading("AI가 사진과 매물 정보를 보고 초안을 쓰는 중… (약 10~30초)");
      const c = await api<{ project: { script: ReelScript; voice: string; music: string }; warnings: string[] }>("/api/reels/project", json("POST", { vacancyId, mode: "auto" }));
      if (!alive) return;
      setLoading(null);
      if (!c.success) return void setError(c.error || "초안을 만들지 못했습니다.");
      applyProject(c.project);
      setWarnings(c.warnings || []);
      setSetup(true);
    })();
    return () => {
      alive = false;
    };
  }, [vacancyId, applyProject]);

  // ── 저장: [저장] 버튼으로 바로, 또는 고친 뒤 1초 지나면 자동 ──
  const latest = useRef({ scenes, voice, music, settings });
  useEffect(() => {
    latest.current = { scenes, voice, music, settings };
  }, [scenes, voice, music, settings]);

  const saveNow = useCallback(async () => {
    if (!dirty.current) return true;
    dirty.current = false;
    setSaved("저장 중…");
    const d = await api<{ warnings: string[] }>("/api/reels/project", json("PUT", { vacancyId, ...latest.current }));
    if (!d.success) {
      dirty.current = true;
      setSaved("저장 실패 — 다시 눌러 주세요");
      return false;
    }
    if (!dirty.current) setUnsaved(false);
    setSaved(`${new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })} 저장`);
    setWarnings(d.warnings || []);
    return true;
  }, [vacancyId]);

  useEffect(() => {
    if (!script || !dirty.current) return;
    const t = setTimeout(saveNow, 1000);
    return () => clearTimeout(t);
  }, [scenes, voice, music, settings, script, saveNow]);

  // 저장 안 된 채 창을 닫으려 하면 경고
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  const markDirty = () => {
    dirty.current = true;
    setUnsaved(true);
  };

  const change = (fn: (s: ReelScene[]) => ReelScene[]) => {
    markDirty();
    setScenes((s) => fn(s).map((x, i) => ({ ...x, id: `s${i + 1}`, kind: x.kind === "price" || x.kind === "cta" ? x.kind : i === 0 ? "hook" : "photo" })));
  };

  // ── 성우: 입력칸에서 나가면 바로, 아니면 손을 떼고 2.5초 뒤 녹음 (같은 대사는 저장본) ──
  // 0.8초로 했더니 천천히 칠 때 쓰다 만 대사까지 녹음돼 파일·요청만 늘었다.
  const flushNow = useRef(false);
  const [flush, setFlush] = useState(0);
  const recordNow = () => {
    flushNow.current = true;
    setFlush((n) => n + 1);
  };
  useEffect(() => {
    const missing = scenes.filter((s) => s.tts.trim() && !voices[voiceKey(voice, spokenText(s))] && !pending[voiceKey(voice, spokenText(s))]);
    if (!missing.length) return;
    const t = setTimeout(() => {
      flushNow.current = false;
      missing.forEach(async (s) => {
        const text = spokenText(s);
        const key = voiceKey(voice, text);
        setPending((p) => ({ ...p, [key]: true }));
        const d = await api<Voice>("/api/reels/voice", json("POST", { vacancyId, text, voice }));
        setPending((p) => ({ ...p, [key]: false }));
        if (d.success) setVoices((v) => ({ ...v, [key]: { url: d.url, duration: d.duration } }));
      });
    }, flushNow.current ? 0 : 2500);
    return () => clearTimeout(t);
  }, [scenes, voice, voices, pending, vacancyId, flush]);

  // ── 미리보기 구성 (MP4 와 같은 템플릿) ──
  const preview = useMemo(() => {
    if (!script || !scenes.length) return null;
    const tScenes: TemplateScene[] = scenes.map((s) => {
      const v = voices[voiceKey(voice, spokenText(s))];
      const mv = s.video ? media.find((m) => m.id === s.video!.media && m.status === "ready" && m.url) : undefined;
      const video = s.video && mv ? { ...s.video, src: mv.url!, poster: mv.poster, dur: mv.duration || 0, hasAudio: mv.hasAudio, speed: s.video.speed ?? "auto", sound: s.video.sound ?? "off", fit: s.video.fit ?? "cover" } : null;
      return { id: s.id, kind: s.kind, photo: s.photo, ...sceneWords(s), highlight: s.highlight || [], sticker: s.sticker, fx: s.fx, video, audioSrc: v?.url || "", duration: v?.duration || estimate(s.tts) };
    });
    return buildReel({
      facts: script.facts,
      agency: script.agency,
      scenes: tScenes,
      photoSize: Object.fromEntries(script.photos.map((p) => [p.url, { w: p.w, h: p.h }])),
      photoSrc: (u) => u,
      assetBase: "/reels-assets/",
      bgmSrc: music === "none" ? null : isMyMusic(music) ? myMusic.find((m) => m.id === music)?.url || null : musicAsset(music) ? `/reels-assets/${musicAsset(music)}` : null,
      bgmStart: settings.musicStart || 0,
      previewRuntimeSrc: "/reels-assets/js/hyperframe.runtime.js",
      settings,
    });
  }, [script, scenes, voices, voice, music, settings, media, myMusic]);

  // 재생기 준비: 휴대폰 화면 칸이 생기는 순간 만든다 (선택 창·불러오는 중에는 칸이 없다).
  // 재생기 스크립트를 불러오는 사이에 미리보기가 먼저 만들어질 수 있어, 준비되면 최신 미리보기를 바로 넣는다.
  // ── 미리보기 화면 두 개를 번갈아 쓴다 ──
  // 고치면 뒤에서 새 화면을 준비하고, 다 그려지면 보던 위치 그대로 바꿔 끼운다 (하얀 화면·처음으로 돌아가기 없음)
  type Shown = { plan: Plan; keys: string[] };
  const slot = useRef<HTMLDivElement | null>(null);
  const nextShow = useRef<{ html: string } & Shown | null>(null);
  const shown = useRef<Shown | null>(null);
  const pendingEl = useRef<PlayerEl | null>(null);
  const [shownTick, setShownTick] = useState(0); // 미리보기를 바꿔 끼울 때마다 +1 (편집 상자 다시 재기)
  const getPlayer = useCallback(() => player.current, []);

  const makePlayer = useCallback(() => {
    const el = document.createElement("hyperframes-player") as PlayerEl;
    el.setAttribute("controls", "");
    el.setAttribute("width", "1080");
    el.setAttribute("height", "1920");
    // 뒤에서 준비 중인 화면이 내는 신호는 무시
    el.addEventListener("timeupdate", (e) => {
      if (player.current === el) setTime((e as CustomEvent).detail?.currentTime ?? 0);
    });
    el.addEventListener("play", () => {
      if (player.current === el) setPlaying(true);
    });
    el.addEventListener("pause", () => {
      if (player.current !== el) return;
      setPlaying(false);
      setActive(curRef.current);
    });
    el.addEventListener("ended", () => {
      if (player.current === el) setPlaying(false);
    });
    return el;
  }, []);

  const load = useCallback((next: { html: string } & Shown) => {
    const node = slot.current;
    if (!node || !customElements.get("hyperframes-player")) return;
    const old = player.current;
    if (!old) {
      const el = makePlayer();
      node.appendChild(el);
      player.current = el;
      shown.current = next;
      el.setAttribute("srcdoc", next.html);
      el.addEventListener("painted", () => setShownTick((n) => n + 1), { once: true });
      return;
    }
    pendingEl.current?.remove();
    const el = makePlayer();
    el.classList.add(st.backstage);
    node.appendChild(el);
    pendingEl.current = el;
    el.setAttribute("srcdoc", next.html);
    let done = false;
    const swap = () => {
      if (done || pendingEl.current !== el) return;
      done = true;
      pendingEl.current = null;
      const wasPlaying = !old.paused;
      const prev = shown.current;
      const t = Number((old as unknown as { currentTime: number }).currentTime) || 0;
      // 보던 클립을 대사로 찾아 같은 자리로 (지워졌으면 그다음 클립)
      let target = 0;
      if (prev && t > 0.05) {
        const end = prev.plan.end;
        if (t >= end) target = next.plan.end + Math.min(t - end, next.plan.total - next.plan.end - 0.05);
        else {
          const oi = Math.max(0, prev.plan.scenes.findLastIndex((x) => x.cut <= t + 0.01));
          const found = next.keys.indexOf(prev.keys[oi]);
          const ni = found >= 0 ? found : Math.min(oi, next.plan.scenes.length - 1);
          const from = next.plan.scenes[ni].cut;
          const until = next.plan.scenes[ni + 1]?.cut ?? next.plan.end;
          target = found >= 0 ? Math.min(from + (t - prev.plan.scenes[oi].cut), until - 0.05) : from + 0.05;
        }
      }
      if (target > 0) el.seek(target);
      old.pause();
      player.current = el;
      shown.current = next;
      el.classList.remove(st.backstage);
      old.remove();
      setTime(target);
      setShownTick((n) => n + 1);
      if (wasPlaying) el.play();
    };
    el.addEventListener("painted", swap, { once: true });
    setTimeout(swap, 10000); // 다 못 그려도 10초면 바꿔 끼움
  }, [makePlayer]);

  const attachPlayer = useCallback((node: HTMLDivElement | null) => {
    slot.current = node;
    if (!node) {
      pendingEl.current?.remove();
      pendingEl.current = null;
      player.current?.remove();
      player.current = null;
      return;
    }
    import("@hyperframes/player").then(() => {
      if (!player.current && nextShow.current) load(nextShow.current);
    });
  }, [load]);

  // 고친 뒤 0.6초 지나면 미리보기 다시 그림
  useEffect(() => {
    if (!preview) return;
    const next = { html: preview.html, plan: preview.plan, keys: scenes.map((x) => spokenText(x)) };
    nextShow.current = next;
    const t = setTimeout(() => load(next), 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- scenes 는 preview 를 만들 때 이미 반영됨
  }, [preview, load]);

  const plan = preview?.plan;
  const current = plan ? Math.max(0, plan.scenes.findLastIndex((s) => s.cut <= time + 0.01)) : 0;
  const seekTo = (i: number) => {
    setActive(i);
    const s = plan?.scenes[i];
    if (s && player.current) player.current.seek(s.cut + 0.05);
  };
  useEffect(() => {
    if (!playing) return;
    document.querySelector(`[data-clip="${current}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [playing, current]);
  useEffect(() => {
    curRef.current = current;
  }, [current]);
  // 클립 ▶: 그 클립부터 끝까지 이어서 재생. 재생 중에 다시 누르면 일시정지(⏸)
  const toggleClip = (i: number) => {
    const p = player.current;
    if (!p || !plan) return;
    if (playing && current === i) {
      p.pause();
      return;
    }
    const s = plan.scenes[i];
    const next = plan.scenes[i + 1];
    // 일시정지했던 클립이면 그 자리에서 이어서
    const resume = current === i && time > s.cut && time < (next ? next.cut : plan.end) - 0.1;
    if (resume) setActive(i);
    else seekTo(i);
    p.play();
  };
  // 스페이스바: 선택한 클립부터 재생 / 재생 중이면 정지 (글 입력 중에는 띄어쓰기)
  const spaceKey = useRef<() => void>(() => {});
  useEffect(() => {
    spaceKey.current = () => {
      if (playing) player.current?.pause();
      else toggleClip(active);
    };
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.closest("input, textarea, select, [contenteditable='true']") || t.tagName === "HYPERFRAMES-PLAYER")) return;
      e.preventDefault();
      spaceKey.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const photos: ReelPhoto[] = script?.photos || [];
  const usable = photos.filter((p) => p.keep);
  const photoLabel = (url: string | null) => photos.find((p) => p.url === url)?.label || "사진";

  const move = (i: number, d: number) => change((s) => {
    const n = [...s];
    const j = i + d;
    if (j < 0 || j >= n.length) return s;
    [n[i], n[j]] = [n[j], n[i]];
    return n;
  });
  const remove = (i: number) => change((s) => s.filter((_, k) => k !== i));
  const addClip = () =>
    change((s) => {
      const used = new Set(s.map((x) => x.photo));
      const photo = usable.find((p) => !used.has(p.url))?.url || usable[0]?.url || null;
      const at = s.findIndex((x) => x.locked);
      const n = [...s];
      n.splice(at < 0 ? n.length : at, 0, { id: "", kind: "photo", photo, tts: "이 공간도 한번 볼까요?", highlight: [], sticker: null });
      return n;
    });
  // ── 클립 나누기·합치기 (브루처럼: Enter 로 나누고, 맨 앞에서 Backspace 로 위 클립과 합침) ──
  const caret = useRef<{ i: number; pos: number } | null>(null);
  const editable = (x?: ReelScene) => !!x && (x.kind === "hook" || x.kind === "photo");
  const focusTts = (i: number, pos: number) =>
    requestAnimationFrame(() => {
      const el = document.querySelector<HTMLTextAreaElement>(`textarea[data-tts="${i}"]`);
      if (!el) return;
      el.focus();
      el.setSelectionRange(pos, pos);
    });
  const split = (i: number, at?: number) => {
    const x = scenes[i];
    if (!editable(x)) return;
    const text = x.tts;
    let pos = at ?? (caret.current?.i === i ? caret.current.pos : -1);
    // 커서가 맨 앞·맨 끝이면 어절 기준으로 반으로
    if (pos <= 0 || pos >= text.trim().length) {
      const w = text.trim().split(/\s+/);
      if (w.length < 2) return;
      pos = w.slice(0, Math.ceil(w.length / 2)).join(" ").length;
    }
    const a = text.slice(0, pos).trim();
    const b = text.slice(pos).trim();
    if (!a || !b) return;
    const na = a.split(/\s+/).length;
    const used = new Set(scenes.map((c) => c.photo));
    const photo = usable.find((p) => !used.has(p.url))?.url || x.photo;
    change((s) => {
      const n = [...s];
      n.splice(i, 1,
        { ...x, tts: a, caption: null, highlight: x.caption ? [] : x.highlight.filter((h) => h < na) },
        { ...x, id: "", photo, tts: b, caption: null, sticker: null, highlight: x.caption ? [] : x.highlight.filter((h) => h >= na).map((h) => h - na) },
      );
      return n;
    });
    setActive(i + 1);
    focusTts(i + 1, 0);
  };
  const canMerge = (i: number) => editable(scenes[i]) && editable(scenes[i + 1]);
  const merge = (i: number) => {
    const a = scenes[i], b = scenes[i + 1];
    if (!editable(a) || !editable(b)) return;
    const wa = sceneWords(a).words, wb = sceneWords(b).words;
    const caption = a.caption != null || b.caption != null ? [...wa, ...wb].join(" ") : null;
    const at = a.tts.trim().length;
    change((s) => {
      const n = [...s];
      n.splice(i, 2, { ...a, tts: `${a.tts.trim()} ${b.tts.trim()}`, caption, sticker: a.sticker || b.sticker, highlight: [...a.highlight, ...b.highlight.map((h) => h + wa.length)] });
      return n;
    });
    setActive(i);
    focusTts(i, at + 1);
  };
  const ttsKeys = (i: number) => (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget;
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      split(i, el.selectionStart);
    } else if (e.key === "Backspace" && el.selectionStart === 0 && el.selectionEnd === 0 && canMerge(i - 1)) {
      e.preventDefault();
      merge(i - 1);
    }
  };
  const setFx = (i: number, patch: Partial<SceneFx>) => change((s) => s.map((x, n) => (n === i ? { ...x, fx: { ...(x.fx || {}), ...patch } } : x)));
  const setSetting = (patch: Partial<ReelSettings>) => {
    markDirty();
    setSettings((v) => ({ ...v, ...patch }));
  };
  // 이 클립의 효과(탭 하나 분량)를 모든 클립에 똑같이 (자동으로 둔 값은 다른 클립도 자동으로)
  const applyToAll = (i: number, keys: (keyof SceneFx)[]) => {
    const f = scenes[i].fx || {};
    change((s) => s.map((x) => {
      const fx: SceneFx = { ...(x.fx || {}) };
      keys.forEach((k) => {
        if (f[k] === undefined) delete fx[k];
        else (fx as Record<string, unknown>)[k] = f[k];
      });
      return { ...x, fx: Object.keys(fx).length ? fx : undefined };
    }));
  };
  // 이 클립의 자막 스타일을 모든 클립에 적용
  const captionToAll = (i: number) => {
    const f = scenes[i].fx || {};
    change((s) => s.map((x) => ({ ...x, fx: { ...(x.fx || {}), captionOn: f.captionOn, captionPos: f.captionPos, captionSize: f.captionSize, captionColor: f.captionColor, captionY: f.captionY, captionScale: f.captionScale } })));
  };
  // 자막·스티커 위치만 따로: 모든 클립에 같은 위치 / 처음 자리로 (색·크기 버튼 설정은 그대로)
  const capPlace = (f: SceneFx = {}) => ({ captionPos: f.captionPos, captionY: f.captionY, captionScale: f.captionScale });
  const captionPlaceToAll = (i: number) => {
    const p = capPlace(scenes[i].fx);
    change((s) => s.map((x) => ({ ...x, fx: { ...(x.fx || {}), ...p } })));
  };
  const resetPlace = (i: number | "all", what: "cap" | "stk") => {
    const keys: (keyof SceneFx)[] = what === "cap" ? ["captionPos", "captionY", "captionScale"] : ["stickerPos", "stickerSide", "stickerXY", "stickerScale"];
    change((s) => s.map((x, n) => {
      if (i !== "all" && n !== i) return x;
      const fx = { ...(x.fx || {}) };
      keys.forEach((k) => delete fx[k]);
      return { ...x, fx: Object.keys(fx).length ? fx : undefined };
    }));
  };
  const placedCaptions = scenes.filter((x) => x.fx?.captionY != null || x.fx?.captionScale != null || x.fx?.captionPos).length;
  // 잠긴 가격·마무리 클립을 직접 고칠 수 있게 풀기 / 되돌리기
  const unlock = (i: number) =>
    change((s) => s.map((x, n) => (n === i ? { ...x, custom: true, tts: sceneUnits(x).map((u) => u.d).join(" ") } : x)));
  const relock = (i: number) =>
    change((s) => s.map((x, n) => (n === i ? { ...x, custom: false, tts: (x.units || []).map((u) => u.s).join(" ") || x.tts } : x)));
  const toggleWord = (i: number, k: number) =>
    change((s) => s.map((x, n) => (n === i ? { ...x, highlight: x.highlight.includes(k) ? x.highlight.filter((h) => h !== k) : [...x.highlight, k].slice(-4) } : x)));

  // 사진 올리기 (AI 검사 포함). apply: 한 장만 올렸으면 선택한 클립에 바로 넣기
  const uploadPhoto = async (file: File, apply: boolean) => {
    const form = new FormData();
    form.append("vacancyId", vacancyId);
    form.append("file", file);
    const d = await api<{ photo: ReelPhoto; photos: ReelPhoto[] }>("/api/reels/photo", { method: "POST", body: form });
    if (!d.success) throw new Error(d.error || "사진을 올리지 못했습니다.");
    setScript((sc) => (sc ? { ...sc, photos: d.photos } : sc));
    if (!d.photo.keep) throw new Error(`"${file.name}" 은 쓸 수 없는 사진이에요: ${d.photo.reason}`);
    if (apply) pickPhoto(d.photo.url);
  };
  const pickPhoto = (url: string) => change((s) => s.map((x, n) => (n === active ? { ...x, photo: url, video: null } : x)));
  const pickVideo = (m: MediaItem) => {
    const clipSec = plan?.scenes[active] ? (plan.scenes[active + 1]?.cut ?? plan.end) - plan.scenes[active].cut : 3;
    change((x) => x.map((c, n) => (n === active && (c.kind === "hook" || c.kind === "photo") ? { ...c, video: c.video?.media === m.id ? c.video : defaultVideo(m, clipSec) } : c)));
  };

  const make = async () => {
    setError(null);
    setMaking("제작 요청 중…");
    // 저장된 최신 상태로 굽는다
    if (!(await saveNow())) return void (setMaking(null), setError("저장하지 못해 영상을 만들 수 없습니다."));
    const d = await api<{ jobId: string }>("/api/reels", json("POST", { vacancyId }));
    if (!d.success) return void (setMaking(null), setError(d.error || "제작 요청 실패"));
    const poll = setInterval(async () => {
      const r = await api<{ job: Video & { warnings: string[] }; videoUrl: string | null; downloadUrl: string | null }>(`/api/reels/${d.jobId}`);
      if (!r.success) return;
      setMaking(r.job.stage ? `${STAGE_LABEL[r.job.stage] || r.job.stage}…` : "대기 중…");
      if (r.job.status === "done" || r.job.status === "failed") {
        clearInterval(poll);
        setMaking(null);
        if (r.job.status === "failed") setError(r.job.error);
        if (r.job.warnings?.length) setWarnings((w) => [...new Set([...w, ...r.job.warnings])]);
        if (r.videoUrl) setWatch(r.videoUrl); // 완성되면 왼쪽 화면에서 바로 재생
        if (r.downloadUrl) saveFile(r.downloadUrl); // 그리고 바로 PC·휴대폰에 저장
        loadVideos();
      }
    }, 3000);
  };

  // 초안 화면: [AI 초안 다시 받기] / [이대로 클립 만들기]
  const redraft = async () => {
    setError(null);
    setLoading("AI가 사진과 매물 정보를 보고 초안을 다시 쓰는 중… (약 10~30초)");
    const c = await api<{ project: { script: ReelScript; voice: string; music: string }; warnings: string[] }>("/api/reels/project", json("POST", { vacancyId, mode: "auto" }));
    setLoading(null);
    if (!c.success) return setError(c.error || "초안을 만들지 못했습니다.");
    applyProject(c.project);
    setWarnings(c.warnings || []);
  };
  const confirm = async (b: { text: string; voice: string; music: string; style: ReelStyle }) => {
    setError(null);
    setLoading("클립을 만드는 중…");
    const c = await api<{ project: { script: ReelScript; voice: string; music: string }; warnings: string[] }>("/api/reels/project", json("POST", { vacancyId, mode: "confirm", ...b }));
    setLoading(null);
    if (!c.success) return setError(c.error || "클립을 만들지 못했습니다.");
    applyProject(c.project);
    setWarnings(c.warnings || []);
    setSetup(false);
  };

  if (setup && script)
    return (
      <Setup
        key={script.scenes.map((x) => x.tts).join("|")}
        vacancyId={vacancyId}
        text={script.scenes.filter((x) => !x.locked).map((x) => x.tts).join("\n")}
        voice={voice}
        music={music}
        style={settings.style || "lively"}
        busy={loading}
        error={error}
        onRedraft={redraft}
        onConfirm={confirm}
        onCancel={script.draft ? undefined : () => setSetup(false)}
      />
    );
  if (loading && !script)
    return (
      <div className={st.app}>
        <div className={st.loading}><div className={st.spin} />{loading}</div>
      </div>
    );
  if (!script)
    return (
      <div className={st.app}>
        <div className={st.loading}><div className={st.error}>{error}</div></div>
      </div>
    );

  const f = script.facts;
  const voicingCount = Object.values(pending).filter(Boolean).length;

  return (
    <div className={`${st.app} ${st.editor}`}>
      <header className={st.top}>
        <div className={st.brand}><i />공실 릴스</div>
        <span className={st.badge}>관리자 시험판</span>
        <span className={st.listing}>매물번호 {f.vacancyNo} · {f.area} {f.type} {f.trade}</span>
        <div className={st.spacer} />
        <span className={st.saved}>{saved}</span>
        <button className={`${st.btn} ${unsaved ? st.saveOn : st.saveDone}`} onClick={saveNow} disabled={!unsaved}>{unsaved ? "저장" : "✓ 저장됨"}</button>
        <select className={st.select} value={voice} onChange={(e) => { markDirty(); setVoice(e.target.value); recordNow(); }}>
          {(["여성", "남성"] as const).map((g) => (
            <optgroup key={g} label={g}>
              {VOICES.filter((v) => v.g === g).map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
            </optgroup>
          ))}
        </select>
        <button className={st.btn} onClick={() => setMusicOpen(true)} title="배경음악 바꾸기">🎵 {musicLabel(music, myMusic)}</button>
        <button className={`${st.btn} ${pop === "settings" ? st.btnOn : ""}`} onClick={() => setPop(pop === "settings" ? null : "settings")}>⚙ 전체 설정</button>
        <button className={`${st.btn} ${pop === "videos" ? st.btnOn : ""}`} onClick={() => setPop(pop === "videos" ? null : "videos")}>🎬 만든 영상{videos.length ? ` ${videos.length}` : ""}</button>
        <button className={`${st.btn} ${libOpen ? st.btnOn : ""}`} onClick={() => setLibOpen((v) => !v)}>🖼 내 사진·영상</button>
        <button className={st.btn} onClick={async () => { await saveNow(); setSetup(true); }} disabled={!!loading || !!making}>대본·스타일 다시 고르기</button>
        <button className={`${st.btn} ${st.primary}`} onClick={make} disabled={!!making || voicingCount > 0}>{making || "영상 만들기"}</button>
      </header>

      <div className={`${st.body} ${libOpen ? st.withLib : ""}`}>
        <aside className={st.left}>
          <div className={st.phone}>
            <div className={st.screen}>
              <div className={st.playerSlot} ref={attachPlayer} style={{ visibility: watch ? "hidden" : "visible" }} />
              <StageEditor
                getPlayer={getPlayer}
                sceneId={plan?.scenes[current]?.id ?? null}
                show={!playing && !watch && !!plan}
                tick={`${time}|${shownTick}`}
                fx={scenes[current]?.fx}
                onCommit={(p) => setFx(current, p)}
                onCaptionToAll={() => captionPlaceToAll(current)}
                onReset={(what) => resetPlace(current, what)}
              />
              {watch && <video key={watch} className={st.watch} src={watch} controls autoPlay playsInline />}
            </div>
          </div>
          {watch && <button className={st.btn} onClick={() => setWatch(null)}>← 편집 미리보기로 돌아가기</button>}
          <div className={st.previewNote}>
            {voicingCount > 0 ? `성우 녹음 중… (${voicingCount})` : plan ? `미리보기 ${plan.total.toFixed(1)}초 · 완성 영상과 같은 화면입니다` : ""}
          </div>
        </aside>

        <main className={st.right}>
          {error && <div className={st.error}>{error}</div>}
          {loading && <div className={st.info}>{loading}</div>}
          {warnings.length > 0 && <div className={st.warn}>{warnings.map((w) => <div key={w}>⚠ {w}</div>)}</div>}

          {scenes.map((s, i) => {
            const { words } = sceneWords(s);
            const v = voices[voiceKey(voice, spokenText(s))];
            const isPending = pending[voiceKey(voice, spokenText(s))];
            return (
              <Fragment key={i}>
              {i > 0 && (
                <TransitionGap
                  fx={s.fx}
                  open={transOpen === i}
                  onToggle={() => setTransOpen(transOpen === i ? null : i)}
                  onChange={(p) => setFx(i, p)}
                  onApplyAll={() => applyToAll(i, ["transition", "transitionSound"])}
                  onReset={() => setFx(i, { transition: undefined, transitionSound: undefined })}
                />
              )}
              <div data-clip={i} className={`${st.clip} ${i === current || i === active ? st.active : ""}`} onClick={() => setActive(i)} onContextMenu={(e) => { if ((e.target as HTMLElement).closest("textarea, input")) return; e.preventDefault(); setActive(i); setMenu({ i, x: e.clientX, y: e.clientY }); }}>
                <div className={st.num}>{i + 1}</div>
                <button className={st.thumb} onClick={(e) => { e.stopPropagation(); setActive(i); setMenu({ i, x: e.clientX, y: e.clientY }); }} title="클립 메뉴">
                  {(() => {
                    const mv = s.video && media.find((m) => m.id === s.video!.media);
                    if (mv?.poster) return <><img src={mv.poster} alt="" /><em className={st.vbadge}>🎬 영상</em></>;
                    return s.photo ? <img src={s.photo} alt="" /> : null;
                  })()}
                  <span>{s.video ? "🎬 영상 바꾸기" : "🖼 사진·영상 바꾸기"}</span>
                </button>
                <div>
                  <div className={st.kind}>
                    <b>{KIND_LABEL[s.kind]}</b>{s.photo && photoLabel(s.photo)}
                    {s.locked && !s.custom && <span> · 🔒 등록 정보로 자동 작성 <button className={st.link} onClick={(e) => { e.stopPropagation(); unlock(i); }}>✏️ 문장 직접 고치기</button></span>}
                    {s.locked && s.custom && <span> · ✏️ 직접 고침 <button className={st.link} onClick={(e) => { e.stopPropagation(); relock(i); }}>등록 정보 문장으로 되돌리기</button></span>}
                  </div>
                  {s.locked && !s.custom ? (
                    <div className={st.locked}>{s.tts}</div>
                  ) : (
                    <textarea className={st.tts} rows={2} value={s.tts} placeholder="성우가 읽을 대사" data-tts={i} onBlur={recordNow} onKeyDown={editable(s) ? ttsKeys(i) : undefined} onSelect={(e) => { caret.current = { i, pos: e.currentTarget.selectionStart }; }} onChange={(e) => change((x) => x.map((c, n) => (n === i ? { ...c, tts: e.target.value, highlight: c.caption ? c.highlight : c.highlight.filter((h) => h < e.target.value.trim().split(/\s+/).length) } : c)))} />
                  )}
                  {s.caption != null && (
                    <textarea className={`${st.tts} ${st.captionArea}`} rows={1} onBlur={recordNow} value={s.caption} placeholder="화면에 보일 자막 (비우면 대사가 자막)" onChange={(e) => change((x) => x.map((c, n) => (n === i ? { ...c, caption: e.target.value, highlight: c.highlight.filter((h) => h < e.target.value.trim().split(/\s+/).length) } : c)))} />
                  )}
                  <div className={st.words}>
                    {words.map((w, k) => (
                      <button key={k} className={`${st.word} ${s.highlight.includes(k) ? st.on : ""}`} style={s.highlight.includes(k) ? (([bg, ink]) => ({ background: bg, borderColor: bg, color: ink }))(CAPTION_COLOR[s.fx?.captionColor || "yellow"]) : undefined} disabled={s.locked && !s.custom && s.caption == null} onClick={(e) => { e.stopPropagation(); toggleWord(i, k); }}>{w}</button>
                    ))}
                    <span className={st.hint}>단어를 누르면 강조{editable(s) ? " · Enter 로 클립 나누기 · 맨 앞에서 ⌫ 로 위 클립과 합치기" : ""}</span>
                  </div>
                  <div className={st.row}>
                    {(s.kind === "hook" || s.kind === "photo") && (
                      <>
                        <span className={st.label}>스티커</span>
                        <input className={st.sticker} value={s.sticker || ""} maxLength={10} placeholder="예: 채광 굿" onChange={(e) => change((x) => x.map((c, n) => (n === i ? { ...c, sticker: e.target.value || null } : c)))} />
                      </>
                    )}
                  </div>
                  <div className={st.tabs}>
                    {FX_TABS.filter((t) => t.key !== "sticker" || s.kind === "hook" || s.kind === "photo").map((t) => {
                      const on = fxOpen?.i === i && fxOpen.tab === t.key;
                      const changed = t.keys.some((k) => s.fx?.[k] !== undefined) || (t.key === "caption" && s.caption != null);
                      return (
                        <button key={t.key} className={`${st.tab} ${on ? st.tabOn : ""}`} onClick={(e) => { e.stopPropagation(); setFxOpen(on ? null : { i, tab: t.key }); }}>
                          {t.label}{changed && <i className={st.dot} title="자동에서 바꿈" />}
                        </button>
                      );
                    })}
                  </div>
                  {fxOpen?.i === i && (
                    <FxPanel
                      tab={fxOpen.tab}
                      onClose={() => setFxOpen(null)}
                      scene={s}
                      onChange={(p) => setFx(i, p)}
                      onCaptionText={() => change((x) => x.map((c, n) => (n === i ? { ...c, caption: c.caption == null ? sceneWords(c).words.join(" ") : null } : c)))}
                      onCaptionAll={() => captionToAll(i)}
                      first={i === 0}
                      onApplyAll={() => applyToAll(i, FX_TABS.find((t) => t.key === fxOpen.tab)!.keys)}
                      onReset={() => change((x) => x.map((c, n) => {
                        if (n !== i) return c;
                        const fx = { ...(c.fx || {}) };
                        FX_TABS.find((t) => t.key === fxOpen.tab)!.keys.forEach((k) => delete fx[k]);
                        return { ...c, fx: Object.keys(fx).length ? fx : undefined };
                      }))}
                    />
                  )}
                </div>
                <div className={st.side}>
                  <span className={st.dur}>{isPending ? "녹음 중…" : v ? `${v.duration.toFixed(1)}초` : ""}</span>
                  <div className={st.icons}>
                    <button className={`${st.icon} ${playing && current === i ? st.iconOn : ""}`} title={playing && current === i ? "일시정지" : "이 클립 미리보기"} onClick={(e) => { e.stopPropagation(); toggleClip(i); }}>{playing && current === i ? "⏸" : "▶"}</button>
                    <button className={st.icon} title="커서 자리에서 클립 나누기" disabled={!editable(s) || s.tts.trim().split(/\s+/).length < 2} onClick={(e) => { e.stopPropagation(); split(i); }}>✂</button>
                    <button className={st.icon} title="아래 클립과 합치기" disabled={!canMerge(i)} onClick={(e) => { e.stopPropagation(); merge(i); }}>⧉</button>
                    <button className={st.icon} title="위로" disabled={i === 0} onClick={(e) => { e.stopPropagation(); move(i, -1); }}>↑</button>
                    <button className={st.icon} title="아래로" disabled={i === scenes.length - 1} onClick={(e) => { e.stopPropagation(); move(i, 1); }}>↓</button>
                    <button className={st.icon} title="삭제" disabled={!s.locked && scenes.filter((x) => !x.locked).length <= 1} onClick={(e) => { e.stopPropagation(); remove(i); }}>🗑</button>
                  </div>
                </div>
              </div>
              </Fragment>
            );
          })}
          <button className={st.add} onClick={addClip}>+ 사진 클립 추가</button>
        </main>
        {menu && scenes[menu.i] && (() => {
          const i = menu.i;
          const sc = scenes[i];
          const mv = sc.video ? media.find((m) => m.id === sc.video!.media) : undefined;
          return (
            <ClipMenu
              x={menu.x}
              y={menu.y}
              scene={sc}
              hasAudio={!!mv?.hasAudio}
              landscape={(mv?.width || 0) > (mv?.height || 0)}
              canSplit={editable(sc) && sc.tts.trim().split(/\s+/).length > 1}
              canMerge={canMerge(i)}
              canDelete={sc.locked || scenes.filter((x) => !x.locked).length > 1}
              onClose={() => setMenu(null)}
              onReplace={() => { setActive(i); setLibOpen(true); }}
              onTrim={() => setTrimClip(i)}
              onVideo={(p) => change((x) => x.map((c, n) => (n === i && c.video ? { ...c, video: { ...c.video, ...p } } : c)))}
              onToPhoto={() => change((x) => x.map((c, n) => (n === i ? { ...c, video: null } : c)))}
              onSplit={() => split(i)}
              onMerge={() => merge(i)}
              onDelete={() => remove(i)}
            />
          );
        })()}
        {trimClip !== null && scenes[trimClip]?.video && (() => {
          const i = trimClip;
          const v = scenes[i].video!;
          const mv = media.find((m) => m.id === v.media);
          if (!mv?.url) return null;
          const dur = mv.duration || v.to;
          return (
            <VideoTrimmer
              url={mv.url}
              poster={mv.poster}
              dur={dur}
              video={{ ...v, from: Math.min(v.from, dur), to: Math.min(v.to, dur) }}
              clipSec={plan?.scenes[i] ? (plan.scenes[i + 1]?.cut ?? plan.end) - plan.scenes[i].cut : 3}
              onApply={(nv) => change((x) => x.map((c, n) => (n === i ? { ...c, video: nv } : c)))}
              onClose={() => setTrimClip(null)}
            />
          );
        })()}
        {pop === "settings" && (
          <div className={st.popBack} onClick={() => setPop(null)}>
            <div className={st.pop} onClick={(e) => e.stopPropagation()}>
          <div className={st.panel}>
            <div className={st.panelTitle}>전체 설정</div>
            <div className={st.setRow}>
              <span>스타일</span>
              <Seg value={settings.style || "lively"} options={REEL_STYLES.map((x) => [x.id, `${x.icon} ${x.label}`] as const)} onChange={(v) => setSetting({ style: v as ReelStyle })} />
            </div>
            <div className={st.setRow}>
              <span>효과음</span>
              <Seg value={settings.sfx === false ? "off" : "on"} options={[["on", "켜기"], ["off", "모두 끄기"]]} onChange={(v) => setSetting({ sfx: v === "on" })} />
            </div>
            <div className={st.setRow}>
              <span>음악 크기</span>
              <Seg value={settings.musicLevel || "mid"} options={[["low", "작게"], ["mid", "보통"], ["high", "크게"]]} onChange={(v) => setSetting({ musicLevel: v as ReelSettings["musicLevel"] })} />
            </div>
            <div className={st.setRow}>
              <span>공실뉴스 배지</span>
              <Seg value={settings.badge === false ? "off" : "on"} options={[["on", "표시"], ["off", "숨기기"]]} onChange={(v) => setSetting({ badge: v === "on" })} />
            </div>
            <div className={st.setRow}>
              <span>표시·광고 정보</span>
              <Seg value={settings.disclosure === false ? "off" : "on"} options={[["on", "나타내기"], ["off", "나타내지 않기"]]} onChange={(v) => setSetting({ disclosure: v === "on" })} />
            </div>
            {settings.disclosure === false ? (
              <p className={st.warnSmall}>⚠ 영상에 중개사무소·매물 표시가 빠집니다. 공인중개사법상 SNS 광고에도 표시 의무가 있어 빠지면 과태료 대상이 될 수 있어요. 인스타 게시글에 아래 [📋 게시글 문구]를 꼭 붙여 주세요.</p>
            ) : (
              <p className={st.small} style={{ margin: "-2px 0 4px" }}>영상 아래쪽에 중개사무소·매물 정보가 작은 글씨로 계속 나옵니다 (공인중개사법 표시·광고).</p>
            )}
            <div className={st.setRow}>
              <span>자막 위치</span>
              <button className={st.chip} disabled={!placedCaptions} onClick={() => resetPlace("all", "cap")}>
                모든 클립 처음 자리로{placedCaptions ? ` (${placedCaptions})` : ""}
              </button>
            </div>
          </div>
            </div>
          </div>
        )}
        {pop === "videos" && (
          <div className={st.popBack} onClick={() => setPop(null)}>
            <div className={st.pop} onClick={(e) => e.stopPropagation()}>
          <div className={st.panel}>
            <div className={st.panelTitle} style={{ display: "flex", alignItems: "center" }}>이 매물로 만든 영상<button className={st.chip} style={{ marginLeft: "auto" }} onClick={() => setCaptionOpen(true)}>📋 인스타 게시글 문구</button></div>
            <p className={st.small} style={{ margin: "-4px 0 8px" }}>완성되면 자동으로 내 PC·휴대폰에 저장됩니다. 서버에는 24시간만 보관해요.</p>
            <div className={st.videos}>
              {videos.length === 0 && <div className={st.dur}>아직 없습니다.</div>}
              {videos.map((v) => (
                <div key={v.id} className={st.video}>
                  <span className={st.status} style={{ color: v.expired ? "#8a93a6" : v.status === "done" ? "#16a34a" : v.status === "failed" ? "#dc2626" : "#d97706" }}>
                    {v.expired ? "보관 끝남" : v.status === "done" ? "완료" : v.status === "failed" ? "실패" : "제작 중"}
                  </span>
                  <span>{new Date(v.created_at).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                  {v.duration_s && <span>{Number(v.duration_s).toFixed(0)}초</span>}
                  {v.videoUrl && <button className={st.link} onClick={() => { player.current?.pause(); setWatch(v.videoUrl); setPop(null); }}>{watch === v.videoUrl ? "재생 중" : "보기"}</button>}
                  {v.downloadUrl && <a href={v.downloadUrl}>다운로드</a>}
                  {v.expiresAt && <span className={st.small}>{leftTime(v.expiresAt)}</span>}
                  {v.expired && <button className={st.link} onClick={make} disabled={!!making}>지금 편집본으로 다시 만들기</button>}
                </div>
              ))}
            </div>
          </div>
            </div>
          </div>
        )}
        {captionOpen && (
          <div className={st.modalBack} onClick={() => setCaptionOpen(false)}>
            <div className={st.modal} style={{ width: "min(560px, 94vw)" }} onClick={(e) => e.stopPropagation()}>
              <div className={st.modalHead}>📋 인스타 게시글 문구<div className={st.spacer} /><button className={st.btn} onClick={() => setCaptionOpen(false)}>닫기</button></div>
              <p className={st.small}>릴스를 올릴 때 설명 글에 붙여 넣으세요. 아래 [중개대상물 표시·광고] 부분은 법정 표시라 지우지 않는 게 안전합니다. 필요하면 여기서 고쳐서 복사하세요.</p>
              <textarea className={st.scriptArea} rows={16} defaultValue={instagramCaption(script.facts, script.agency)} id="igCaption" />
              <div className={st.row} style={{ justifyContent: "flex-end" }}>
                <button className={`${st.btn} ${st.primary}`} onClick={async (e) => {
                  const t = (document.getElementById("igCaption") as HTMLTextAreaElement).value;
                  await navigator.clipboard.writeText(t).catch(() => {});
                  (e.currentTarget as HTMLButtonElement).textContent = "✓ 복사됨";
                }}>복사하기</button>
              </div>
            </div>
          </div>
        )}
        {musicOpen && (
          <MusicPicker
            vacancyId={vacancyId}
            music={music}
            start={settings.musicStart || 0}
            level={settings.musicLevel || "mid"}
            mine={myMusic}
            onPick={(id) => { markDirty(); setMusic(id); if (id !== music) setSetting({ musicStart: 0 }); }}
            onStart={(sec) => setSetting({ musicStart: sec })}
            onLevel={(v) => setSetting({ musicLevel: v })}
            onMine={setMyMusic}
            onClose={() => setMusicOpen(false)}
          />
        )}
        {libOpen && (
          <MediaLibrary
            vacancyId={vacancyId}
            clipNo={active + 1}
            clipKind={scenes[active]?.kind || "photo"}
            currentPhoto={scenes[active]?.photo ?? null}
            currentVideo={scenes[active]?.video?.media ?? null}
            photos={photos}
            media={media}
            uploadPhoto={uploadPhoto}
            onPickPhoto={pickPhoto}
            onPickVideo={pickVideo}
            onVideoUploaded={(id, apply) => { if (apply) autoPut.current = { media: id, clip: active }; }}
            onDeleteVideo={async (id) => {
              const d = await api<{ media: MediaItem[] }>("/api/reels/media", json("DELETE", { vacancyId, id }));
              if (d.success) setMedia(d.media);
              change((x) => x.map((c) => (c.video?.media === id ? { ...c, video: null } : c)));
            }}
            onRefresh={loadMedia}
            onClose={() => setLibOpen(false)}
          />
        )}
      </div>


    </div>
  );
}

// 고르기 버튼 묶음
function Seg({ value, options, onChange }: { value: string | number; options: readonly (readonly [string | number, string])[]; onChange: (v: string) => void }) {
  return (
    <div className={st.seg}>
      {options.map(([v, label]) => (
        <button key={String(v)} className={String(v) === String(value) ? st.segOn : ""} onClick={(e) => { e.stopPropagation(); onChange(String(v)); }}>{label}</button>
      ))}
    </div>
  );
}

// 클립과 클립 사이 전환 (브루·캡컷처럼 두 카드 사이에서 고른다). fx 는 "들어오는 클립"(아래 카드)에 저장
const TRANS_ICON: Record<string, string> = { auto: "✨", "whip-left": "⇠", "whip-right": "⇢", flash: "⚡", punch: "🔍", fade: "🌫", cut: "✂" };
function TransitionGap({ fx, open, onToggle, onChange, onApplyAll, onReset }: {
  fx?: SceneFx;
  open: boolean;
  onToggle: () => void;
  onChange: (p: Partial<SceneFx>) => void;
  onApplyAll: () => void;
  onReset: () => void;
}) {
  const t = fx?.transition || "auto";
  const label = FX_OPTIONS.transition.find(([k]) => k === t)?.[1] || "자동";
  const snd = FX_OPTIONS.transitionSound.find(([k]) => k === (fx?.transitionSound || "auto"))?.[1] || "자동";
  const changed = !!fx?.transition || !!fx?.transitionSound;
  return (
    <div className={st.gap}>
      <button className={`${st.gapBtn} ${open ? st.gapOn : ""} ${changed ? st.gapSet : ""}`} onClick={onToggle} title="클립 사이 전환 바꾸기">
        <span>{TRANS_ICON[t] || "✨"}</span> 전환: {label}
        {fx?.transitionSound && fx.transitionSound !== "auto" && <em>· 소리 {snd}</em>}
      </button>
      {open && (
        <div className={st.gapPanel} onClick={(e) => e.stopPropagation()}>
          <div className={st.gapGrid}>
            {FX_OPTIONS.transition.map(([k, name]) => (
              <button key={k} className={t === k ? st.gapPick : ""} onClick={() => onChange({ transition: k === "auto" ? undefined : k })}>
                <b>{TRANS_ICON[k]}</b>{name}
              </button>
            ))}
          </div>
          <div className={st.fxRow}>
            <span className={st.fxLabel}>전환 효과음</span>
            <Seg value={fx?.transitionSound || "auto"} options={FX_OPTIONS.transitionSound} onChange={(v) => onChange({ transitionSound: v === "auto" ? undefined : (v as SceneFx["transitionSound"]) })} />
          </div>
          <div className={st.fxFoot}>
            <span className={st.small} style={{ marginRight: "auto" }}>자동: 스타일에 맞춰 알아서 고릅니다.</span>
            <button className={`${st.chip} ${st.chipOn}`} onClick={onApplyAll}>모든 클립 사이에 적용</button>
            <button className={st.chip} onClick={onReset}>자동으로</button>
            <button className={st.chip} onClick={onToggle}>✕ 닫기</button>
          </div>
        </div>
      )}
    </div>
  );
}

// 클립 효과는 종류별 탭으로 따로 연다 (한 번에 다 펼치면 산만하다는 의견, 2026-10-06)
type FxTab = "screen" | "trans" | "sticker" | "caption" | "sound"; // trans: 클립 사이 전환 줄로 옮김 (탭에는 없음)
const FX_TABS: { key: FxTab; label: string; keys: (keyof SceneFx)[] }[] = [
  { key: "screen", label: "🎥 화면", keys: ["camera", "hold"] },
  { key: "sticker", label: "🏷 스티커", keys: ["stickerOn", "stickerStyle", "stickerAnim", "stickerSound", "stickerPos", "stickerSide", "stickerAt", "stickerXY", "stickerScale"] },
  { key: "caption", label: "💬 자막", keys: ["captionOn", "captionPos", "captionSize", "captionColor", "captionY", "captionScale"] },
  { key: "sound", label: "🔊 소리", keys: ["sfxOn"] },
];

// 클립 효과 패널 (브루식 속성 창): 기본은 전부 "자동", 고른 탭 하나만 보여 준다
function FxPanel({ tab, scene, first, onChange, onCaptionText, onCaptionAll, onApplyAll, onReset, onClose }: { first: boolean; onApplyAll: () => void; onClose: () => void; tab: FxTab; scene: ReelScene; onChange: (p: Partial<SceneFx>) => void; onCaptionText: () => void; onCaptionAll: () => void; onReset: () => void }) {
  const fx = scene.fx || {};
  const stickerOn = fx.stickerOn !== false;
  const captionOn = fx.captionOn !== false;
  const row = (label: string, el: React.ReactNode) => (
    <div className={st.fxRow}><span className={st.fxLabel}>{label}</span>{el}</div>
  );
  return (
    <div className={st.fx} onClick={(e) => e.stopPropagation()}>
      <div className={st.fxTop}>
        <b>{FX_TABS.find((t) => t.key === tab)?.label} 설정</b>
        <button className={st.fxClose} title="닫기" onClick={onClose}>✕ 닫기</button>
      </div>
      {tab === "screen" && (
        <>
          {scene.kind !== "price" && !scene.video && row("사진 움직임", <Seg value={fx.camera || "auto"} options={FX_OPTIONS.camera} onChange={(v) => onChange({ camera: v as SceneFx["camera"] })} />)}
          {row("대사 뒤 여유", <Seg value={fx.hold ?? 0} options={FX_OPTIONS.hold} onChange={(v) => onChange({ hold: Number(v) })} />)}
        </>
      )}

      {tab === "trans" && (
        first ? (
          <div className={st.hint}>첫 클립은 영상이 시작되는 곳이라 전환이 없어요. [모든 클립에 적용]을 누르면 2번 클립부터 적용됩니다.</div>
        ) : null
      )}
      {tab === "trans" && (
        <>
          {!first && row("들어올 때 전환", <Seg value={fx.transition || "auto"} options={FX_OPTIONS.transition} onChange={(v) => onChange({ transition: v as SceneFx["transition"] })} />)}
          {!first && row("전환 효과음", <Seg value={fx.transitionSound || "auto"} options={FX_OPTIONS.transitionSound} onChange={(v) => onChange({ transitionSound: v as SceneFx["transitionSound"] })} />)}
          {!first && <div className={st.hint}>자동: 스타일에 맞춰 휙 넘기기·번쩍·부드럽게 등을 알아서 고릅니다. 이 클립이 시작될 때(앞 클립에서 넘어올 때) 나오는 전환입니다.</div>}
        </>
      )}

      {tab === "sticker" && (!scene.sticker ? (
        <div className={st.hint}>위 [스티커] 칸에 문구를 먼저 넣으면 모양·움직임을 고를 수 있어요.</div>
      ) : (
        <>
          {row("표시", <Seg value={stickerOn ? "on" : "off"} options={[["on", "켜기"], ["off", "끄기"]]} onChange={(v) => onChange({ stickerOn: v === "on" })} />)}
          {stickerOn && (
            <>
              {row("모양", <Seg value={fx.stickerStyle || "auto"} options={FX_OPTIONS.stickerStyle} onChange={(v) => onChange({ stickerStyle: v as SceneFx["stickerStyle"] })} />)}
              {row("등장 방식", <Seg value={fx.stickerAnim || "auto"} options={FX_OPTIONS.stickerAnim} onChange={(v) => onChange({ stickerAnim: v as SceneFx["stickerAnim"] })} />)}
              {row("효과음", <Seg value={fx.stickerSound || "auto"} options={FX_OPTIONS.stickerSound} onChange={(v) => onChange({ stickerSound: v as SceneFx["stickerSound"] })} />)}
              {row("높이", <Seg value={fx.stickerXY ? "" : fx.stickerPos || ""} options={FX_OPTIONS.stickerPos} onChange={(v) => onChange({ stickerPos: v as SceneFx["stickerPos"], stickerXY: undefined })} />)}
              {row("좌우", <Seg value={fx.stickerXY ? "" : fx.stickerSide || ""} options={FX_OPTIONS.stickerSide} onChange={(v) => onChange({ stickerSide: v as SceneFx["stickerSide"], stickerXY: undefined })} />)}
              {row("나오는 때", <Seg value={fx.stickerAt || ""} options={FX_OPTIONS.stickerAt} onChange={(v) => onChange({ stickerAt: v as SceneFx["stickerAt"] })} />)}
            </>
          )}
        </>
      ))}

      {tab === "caption" && (
        <>
          {row("표시", <Seg value={captionOn ? "on" : "off"} options={[["on", "켜기"], ["off", "끄기"]]} onChange={(v) => onChange({ captionOn: v === "on" })} />)}
          {captionOn && (
            <>
              {row("자막 글", <Seg value={scene.caption == null ? "same" : "own"} options={[["same", "대사와 같게"], ["own", "따로 쓰기"]]} onChange={(v) => { if ((v === "own") !== (scene.caption != null)) onCaptionText(); }} />)}
              {row("위치", <Seg value={fx.captionY != null ? "" : fx.captionPos || "bottom"} options={FX_OPTIONS.captionPos} onChange={(v) => onChange({ captionPos: v as SceneFx["captionPos"], captionY: undefined })} />)}
              {row("크기", <Seg value={fx.captionSize || "m"} options={FX_OPTIONS.captionSize} onChange={(v) => onChange({ captionSize: v as SceneFx["captionSize"] })} />)}
              {row("강조색", <Seg value={fx.captionColor || "yellow"} options={FX_OPTIONS.captionColor} onChange={(v) => onChange({ captionColor: v as SceneFx["captionColor"] })} />)}
            </>
          )}
        </>
      )}

      {tab === "sound" && (
        <>
          {row("효과음", <Seg value={fx.sfxOn === false ? "off" : "on"} options={[["on", "켜기"], ["off", "이 클립은 끄기"]]} onChange={(v) => onChange({ sfxOn: v === "on" })} />)}
          <div className={st.hint}>전환 소리는 [🔀 전환], 스티커 소리는 [🏷 스티커]에서 고를 수 있어요.</div>
        </>
      )}

      <div className={st.fxFoot}>
        {tab === "caption" && <button className={st.chip} onClick={onCaptionAll}>이 자막 스타일을 모든 클립에</button>}
        {(tab === "trans" || tab === "screen" || tab === "sound") && (
          <button className={`${st.chip} ${st.chipOn}`} onClick={onApplyAll} disabled={tab === "trans" && first && !fx.transition && !fx.transitionSound}>
            {tab === "trans" ? "이 전환을 모든 클립에 적용" : "모든 클립에 적용"}
          </button>
        )}
        <button className={st.chip} onClick={onReset}>자동으로 되돌리기</button>
      </div>
    </div>
  );
}

// 초안 화면: AI 초안 대사를 다듬고 성우·스타일·배경음악을 고른 뒤 클립으로 만든다 (처음 열 때, [대본·스타일 다시 고르기])
function Setup({ vacancyId, text: initText, voice: initVoice, music: initMusic, style: initStyle, busy, error, onRedraft, onConfirm, onCancel }: {
  vacancyId: string;
  text: string;
  voice: string;
  music: string;
  style: ReelStyle;
  busy: string | null;
  error: string | null;
  onRedraft: () => void;
  onConfirm: (b: { text: string; voice: string; music: string; style: ReelStyle }) => void;
  onCancel?: () => void;
}) {
  const [text, setText] = useState(initText);
  const [voice, setVoice] = useState(initVoice);
  const [music, setMusic] = useState(initMusic);
  const [style, setStyle] = useState<ReelStyle>(initStyle);
  const [musicTouched, setMusicTouched] = useState(false);
  const [listening, setListening] = useState<string | null>(null); // 미리 듣는 중: "v:Aoede" / "m:upbeat"
  const audio = useRef<HTMLAudioElement | null>(null);
  const lines = text.split("\n").filter((l) => l.trim()).length;

  useEffect(() => () => audio.current?.pause(), []);

  const stop = () => {
    audio.current?.pause();
    audio.current = null;
    setListening(null);
  };
  const play = (key: string, url: string, seconds?: number) => {
    stop();
    const a = new Audio(url);
    audio.current = a;
    setListening(key);
    a.onended = () => audio.current === a && setListening(null);
    if (seconds) a.ontimeupdate = () => a.currentTime > seconds && audio.current === a && stop();
    a.play().catch(() => setListening(null));
  };
  const listenVoice = async (id: string) => {
    if (listening === `v:${id}`) return stop();
    setListening(`v:${id}`);
    // 초안 첫 줄로 들려준다 (같은 대사는 저장돼 클립 만들 때 다시 녹음하지 않음)
    const sample = text.split("\n").find((l) => l.trim())?.trim() || "안녕하세요, 공실뉴스에 새로 나온 매물 보러 왔어요!";
    const d = await api<Voice>("/api/reels/voice", json("POST", { vacancyId, text: sample, voice: id }));
    if (d.success) play(`v:${id}`, d.url);
    else setListening(null);
  };
  const pickStyle = (id: ReelStyle) => {
    setStyle(id);
    if (!musicTouched) setMusic(REEL_STYLES.find((x) => x.id === id)!.music);
  };

  return (
    <div className={st.app}>
      <div className={st.chooser}>
        <h1>릴스 초안</h1>
        <p>AI가 사진과 매물 정보를 보고 쓴 대사입니다. 한 줄이 클립 하나가 됩니다. 마음대로 고치거나 지우고 새로 써도 됩니다.</p>
        {error && <div className={st.error}>{error}</div>}

        <div className={st.setupStep}><b>1</b> 대사 다듬기</div>
        <textarea className={st.scriptArea} rows={8} value={text} onChange={(e) => setText(e.target.value)} disabled={!!busy} placeholder={"한 줄에 한 클립씩 써 주세요. 예)\n수서동에 화이트톤 오피스텔 보러 왔어요!\n남향이라 햇살이 가득 들어와요."} />
        <div className={st.row}>
          <span className={st.small}>➕ 가격·교통 클립과 마무리(매물번호 검색) 클립은 등록 정보로 끝에 자동으로 붙습니다. 숫자는 그대로 써도 됩니다.</span>
          <div className={st.spacer} />
          <span className={st.dur}>클립 {lines}개{lines > 8 ? " (8개까지만 씁니다)" : ""}</span>
        </div>
        <div className={st.row}>
          <button className={st.chip} onClick={() => confirmRedraft() && onRedraft()} disabled={!!busy}>🤖 AI 초안 다시 받기</button>
          <button className={st.chip} onClick={() => setText("")} disabled={!!busy || !text}>🧹 모두 지우고 직접 쓰기</button>
        </div>

        <div className={st.setupStep}><b>2</b> 스타일</div>
        <div className={st.styleCards}>
          {REEL_STYLES.map((x) => (
            <button key={x.id} className={`${st.card} ${style === x.id ? st.cardOn : ""}`} onClick={() => pickStyle(x.id)} disabled={!!busy}>
              <span className={st.cardIcon}>{x.icon}</span>
              <b>{x.label}</b>
              <span>{x.desc}</span>
              <em>어울리는 매물: {x.fit}</em>
            </button>
          ))}
        </div>

        <div className={st.setupStep}><b>3</b> 성우 <span className={st.small}>▶ 를 누르면 초안 첫 줄을 그 목소리로 들려줍니다</span></div>
        {(["여성", "남성"] as const).map((g) => (
          <div key={g} className={st.voiceRow}>
            <span className={st.voiceG}>{g}</span>
            <div className={st.opts}>
              {VOICES.filter((v) => v.g === g).map((v) => (
                <div key={v.id} className={`${st.opt} ${voice === v.id ? st.optOn : ""}`}>
                  <button className={st.optPick} onClick={() => setVoice(v.id)} disabled={!!busy}>
                    {v.label}<small>{v.desc}</small>
                  </button>
                  <button className={st.optPlay} title="미리 듣기" onClick={() => listenVoice(v.id)}>{listening === `v:${v.id}` ? "■" : "▶"}</button>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className={st.setupStep}><b>4</b> 배경음악</div>
        <div className={st.opts}>
          {MUSIC.map((v) => (
            <div key={v.id} className={`${st.opt} ${music === v.id ? st.optOn : ""}`}>
              <button className={st.optPick} onClick={() => { setMusic(v.id); setMusicTouched(true); }} disabled={!!busy}>{v.label}</button>
              {v.id !== "none" && <button className={st.optPlay} title="미리 듣기" onClick={() => (listening === `m:${v.id}` ? stop() : play(`m:${v.id}`, `/reels-assets/bgm/${v.id}.mp3`, 12))}>{listening === `m:${v.id}` ? "■" : "▶"}</button>}
            </div>
          ))}
          {!MUSIC.some((v) => v.id === music) && (
            <div className={`${st.opt} ${st.optOn}`}><button className={st.optPick}>{musicLabel(music)}</button></div>
          )}
        </div>
        <p className={st.small}>🎵 무료 음악 더 보기 · 내 음악 올리기 · 유행곡 쓰는 방법은 클립을 만든 뒤 편집 화면 위쪽 [🎵] 버튼에서 할 수 있어요.</p>

        <div className={st.row} style={{ justifyContent: "flex-end", marginTop: 24 }}>
          {busy && <span className={st.dur}><span className={st.spinSmall} /> {busy}</span>}
          {onCancel && <button className={st.btn} onClick={() => { stop(); onCancel(); }} disabled={!!busy}>취소</button>}
          <button className={`${st.btn} ${st.primary}`} disabled={!!busy || !lines} onClick={() => { stop(); onConfirm({ text, voice, music, style }); }}>
            이대로 클립 만들기 →
          </button>
        </div>
        <p className={st.small} style={{ textAlign: "right" }}>만든 뒤에도 클립마다 대사·사진·효과를 자유롭게 고칠 수 있습니다.</p>
      </div>
    </div>
  );
}

const confirmRedraft = () => window.confirm("AI 초안을 새로 받으면 지금 대사가 바뀝니다. 계속할까요?");

function ReelsInner() {
  const vacancyId = useSearchParams().get("vacancy_id");
  if (!vacancyId) return <div className={st.app}><div className={st.loading}>vacancy_id 가 없습니다.</div></div>;
  return <Editor vacancyId={vacancyId} />;
}

export default function ReelsPage() {
  return (
    <Suspense fallback={null}>
      <ReelsInner />
    </Suspense>
  );
}
