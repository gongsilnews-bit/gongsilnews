"use client";

// [AI 편집] — 스튜디오의 핵심 (2026-10-20 사장님: 오른쪽 좁은 칸 말고 대본 쓸 때처럼 화면 가운데 큰 창)
//  ① 영상 종류 → ② 화면 채우기 → ③ 자막 스타일·효과 → ④ 그래픽·효과음 → ⑤ 화면 전환 → ⑥ 제목·채널명·구독 → ⑦ 끝 화면 → ⑧ AI에게 요청 → ⑨ 쓸 AI
//  ③~⑦ 은 처음엔 [자동]으로 접어 둔다. 빈 클립만 채우고, 회원이 넣은 화면은 건드리지 않는다. 한 번에 넣고 한 번에 되돌리기.
//  회의 자료: docs/2026-10-20_studio_ai_edit_meeting.md
import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { AiEditCatalog, Asset, Clip, Layer, LayerAnim, LibItem, Project, StockItem } from "./types";
import { RATIO_LABEL, autoSubPosition, errText, isStopped, uid, videoBridge, type Ratio } from "./types";
import { flatten, clipText, regroupScenes, SFX_LIST } from "./timeline";
import { SUB_PRESETS } from "./SubPresets";
import { PLAIN_LOOK } from "./SubFormatBar";
import { EMPH_LIST, IN_LIST, WHL_LIST } from "./Anim";
import { CATS, STYLE_LABEL, stickerAnim, stickerFileName, stickerGlyphs, stickerPng, type Sticker, type StickerStyle } from "./Stickers";
import { TRANSITIONS, type TransType } from "./transitions";
import { AD_LAW_LABELS, TEMPLATES, TPL_PREFIX, drawTemplate, tplFonts, tplTextOf } from "./Templates";
import { STYLE_PACKS, defaultPack, packOf, type StylePack } from "./stylePacks";
import { MUSIC_LIBRARY, MUSIC_MOODS } from "@/lib/reels/music-catalog";
import { IMAGE_STYLES, imagePrompt, type ImageStyle } from "@/lib/studio-video/imageStyles";
import { useStudioImager, useStudioWriter } from "@/components/admin/sections/useStudioWriter";
import { findStudioVacancyByNo, getStudioAgency, listMyStudioVacancies } from "@/app/actions/studio";
import { AiPick, aiChoiceName, effectiveAi, useAiPick } from "./AiPick";
import { QuickMenu, RatioBox } from "./MediaMenu";
import VideoStart from "./VideoStart";
import { Btn, C, FONT, Icon, Modal, input } from "./ui";

type Row = { n: number; text: string; what: string };
type Kind = "vacancy" | "news" | "topic";
type Amount = "none" | "some" | "many";
type TransMode = "none" | "auto" | "basic" | "adv";
type Agency = { name: string; ceo: string; regNum: string; phone: string; address: string };

/** AI 에게 보낼 고를 목록 — 자막 스타일 50개 · 나타나기 · 움직임 · 단어 강조 · 스티커 모양 · 효과음 (2026-10-19 사장님: AI 가 다 꾸미기) */
export function aiEditCatalog(): AiEditCatalog {
  return {
    presets: SUB_PRESETS.flatMap((g) => g.items.map((x) => ({ id: x.id, label: `${g.group}·${x.label}` }))),
    ins: IN_LIST.filter((x) => x.id !== "auto"),
    emphs: EMPH_LIST,
    whl: WHL_LIST,
    stickers: (Object.keys(STYLE_LABEL) as StickerStyle[]).map((id) => ({ id, label: STYLE_LABEL[id] })),
    sfx: SFX_LIST,
    examples: CATS.flatMap((c) => c.items.slice(0, 4).map((x) => `${x.text}(${x.style})`)),
  };
}

/**
 * 화면 바뀌는 곳 부드럽게 — 앞 클립과 화면(자료)이 다른 곳에 겹치기 전환 (이미 전환이 있으면 그대로)
 *  2026-10-18 사장님: 클립마다 화면이 툭툭 바뀌어 부자연스럽다. pickType: 전환 종류 고르기 (고급 전환 등)
 */
export function softCuts(p: Project, pickType?: (i: number) => TransType) {
  const items = flatten(p).items;
  const scr = (c: Clip) => c.visual?.asset || (c.type !== "voice" ? c.src?.asset : "") || "";
  let n = 0;
  for (let i = 1; i < items.length; i++) {
    const a = items[i - 1].clip, c = items[i].clip;
    if (c.trans || !scr(a) || !scr(c) || scr(a) === scr(c)) continue;
    c.trans = pickType ? { type: pickType(n), a: 0.3, b: 0.3 } : { type: "fade", a: 0.15, b: 0.15 };
    n++;
  }
  return n;
}

/* ── 선택 기억 (다음 AI 편집 때도 그대로) ── */
type Prefs = {
  order: "ai" | "seq"; stock: boolean; aiOn: boolean; aiMax: number; aiStyle: string;
  sub: string; emph: boolean; appear: boolean; graphics: Amount; sfx: Amount; trans: TransMode;
  titleOn: boolean; channelOn: boolean; channel: string; subscribe: boolean; subAt: "mid" | "start" | "end"; endCard: boolean; request: string; /** 자막 모양은 그대로 두기 (대본 쓰고 편집에서 고른 것) */ keepLook?: boolean;
  pack: string; // 스타일 팩 — "auto" = AI 가 대본을 읽고 고름 (2026-10-20 사장님)
  keyText: boolean; // 핵심 글자 (가격·면적을 화면 가운데 크게) — 처음엔 끔 (2026-10-20 사장님: 촌스럽다)
  endDesign: string; // 끝 화면 디자인 — [그래픽 › 부동산 › 부동산 표시광고] 10가지 중 하나
  // 화면 채우기 (2026-10-21 사장님: 스타일 팩보다 화면을 한 번에 잘 채우기 — 레이아웃 잡기)
  rest: "" | "ai" | "blank" | "reuse"; // 내 화면·무료로도 빈 곳 — AI 그림 / 빈칸으로 두기 / 내 화면 다시 ("" = 예전 aiOn 값)
  reuse?: boolean; // ② 빈 곳 — 내 사진 다시 쓰기
  stockKind?: "both" | "video" | "photo"; // 무료 자료 — 영상·사진 / 영상만 / 사진만 (2026-10-21 사장님)
  over: "empty" | "all"; // 채울 클립 — 빈 클립만 / 모두 다시 (AI가 채운 화면·촬영 화면도, 내가 직접 넣은 화면은 그대로)
  intro: LibItem | null; outro: LibItem | null; // 기본 인트로·아웃트로 (내 자료)
  introAuto: boolean; outroAuto: boolean; // AI 편집 때마다 자동으로 붙이기
  music?: boolean; // 자동 편집 — 배경음악 (없으면 넣기)
  // 내 맞춤 프롬프트 (2026-10-21 사장님) — 모든 AI 그림에 붙는 말 · 이름 붙여 저장해 둔 것
  myPrompt: string; myPrompts: { id: string; label: string; text: string }[];
  charSheet: LibItem[]; // 캐릭터 시트 (2026-10-21 사장님: 캐릭터 일관성) — 모든 그림에 참고 사진으로 함께 보낸다, 3장까지
};
const PREF_KEY = "gsv:aiEditPrefs";
const DEF: Prefs = {
  order: "ai", stock: true, aiOn: false, aiMax: 4, aiStyle: "auto",
  sub: "", emph: true, appear: true, graphics: "some", sfx: "some", trans: "auto",
  titleOn: true, channelOn: true, channel: "", subscribe: true, subAt: "mid", endCard: true, request: "", pack: "auto", keyText: true, endDesign: "",
  rest: "", over: "empty", intro: null, outro: null, introAuto: true, outroAuto: true,
  myPrompt: "", myPrompts: [], charSheet: [],
};
const loadPrefs = (): Prefs => {
  try {
    return { ...DEF, ...JSON.parse(localStorage.getItem(PREF_KEY) || "{}") };
  } catch {
    return DEF;
  }
};

const KIND_LABEL: Record<Kind, string> = { vacancy: "매물 소개", news: "뉴스·보도자료", topic: "자유 주제" };
const KIND_DESC: Record<Kind, string> = { vacancy: "공실·매물 영상 — 끝에 표시·광고 정보", news: "기사·보도자료를 영상으로", topic: "정보·생각·강의 등 자유롭게" };
const KIND_ICON: Record<Kind, string> = { vacancy: "camera", news: "file", topic: "text" };
/** 동영상 움직임 견본 (2026-10-21 사장님: 사진 먼저 → 그 사진으로 동영상, 움직임 프롬프트는 저장해 다시 쓴다) — 영어로 AI 에 보낸다 */
type Motion = { id: string; label: string; prompt: string };
/** [자동] — 움직임을 정하지 않으면 영상 AI 가 장면에 맞게 고른다 */
const AUTO_MOTION = "Choose the most fitting natural, cinematic camera and subject motion for this scene. Keep it smooth and subtle; do not change the scene.";
const MOTIONS: Motion[] = [
  { id: "auto", label: "자동", prompt: "" },
  { id: "timelapse", label: "타임랩스", prompt: "Time-lapse: light shifts from day to dusk, clouds and shadows move quickly across the scene, people and cars blur by. The camera stays locked." },
  { id: "pushin", label: "천천히 다가가기", prompt: "Slow, smooth dolly push-in toward the main subject. Gentle, cinematic and steady." },
  { id: "pan", label: "옆으로 흐르기", prompt: "Slow lateral pan from left to right across the scene, steady and smooth." },
  { id: "drone", label: "드론 위로", prompt: "Drone shot rising slowly upward and pulling back to reveal the wider surroundings." },
  { id: "walkin", label: "걸어 들어가기", prompt: "First-person walk-through: the camera moves forward into the space at walking pace, as if entering through the door." },
  { id: "subtle", label: "인물 살짝 움직임", prompt: "The camera stays still. The person moves naturally and subtly: small head turns, blinking, hand gestures, a soft change of expression." },
  { id: "still", label: "고정 화면", prompt: "Almost static shot: only very subtle ambient motion (light flicker, gentle air movement). No camera movement." },
  { id: "orbit", label: "돌아보기", prompt: "Slow orbit around the main subject, about 30 degrees, smooth and cinematic." },
];
const MY_MOTION_KEY = "gsv:myMotions";
const REQ_CHIPS = ["가격 크게 강조", "사람 얼굴 나오는 화면은 빼 줘", "밝고 경쾌하게", "고급스럽게", "차분하게"];
const SUB_AT: ["mid" | "start" | "end", string][] = [["mid", "중간쯤"], ["start", "처음 5초 뒤"], ["end", "끝 화면 바로 앞"]];
// 끝 화면 매물 정보 — 공인중개사법 중개대상물 표시·광고 기준 항목 (공실 등록 값 그대로, 없는 값은 비움)
/** 화면 채우기에서 온 곳 — 화면 편집판 표시 */
const FROM_LABEL: Record<string, string> = { mine: "내 화면", stock: "무료", ai: "AI 그림", reuse: "내 화면 다시", vacancy: "매물 사진" };
const CARD_LABEL: Record<string, string> = { intro: "인트로", outro: "아웃트로", pause: "중간 쉼", end: "표시·광고 정보" };
type PicKind = NonNullable<NonNullable<Clip["aiPic"]>["kind"]>;
const PIC_KINDS: [PicKind, string][] = [["auto", "자동"], ["background", "배경"], ["character", "인물"], ["graph", "그래프"]];
const LISTING_LABEL = /소재지|거래|금액|가격|보증금|월세|면적|층|사용승인|준공|방향|방\s*수|방\/|욕실|입주|주차|관리비|종류|용도/;

export function AiEditPanel({ project, selected, ensureAsset, apply, keep, onUndo, onClose, autoStart, mode = "auto", onSwitch }: {
  /** 두 페이지 오가기 — 자동 편집 ② [AI 이미지·영상 만들기 →] · 제작 [← AI 자동 편집으로] (2026-10-21 사장님) */
  onSwitch?: (to: "auto" | "make") => void;
  /** auto = AI 자동 영상 편집 · 초안 (내 사진·영상 + 무료 자료 + 꾸미기 한 번에) / make = AI 이미지·영상 제작 (프롬프트·이미지·동영상) — 2026-10-21 사장님 */
  mode?: "auto" | "make";
  project: Project;
  selected: string[];
  ensureAsset: (item: LibItem) => Promise<Asset>;
  apply: (fn: (p: Project) => void) => void; // 한 번에 (되돌리기 한 번)
  /** 되돌리기 기록 없이 저장 — 장면 설명처럼 [한 번에 되돌리기]에 섞이면 안 되는 것 */
  keep?: (fn: (p: Project) => void) => void;
  onUndo: () => void;
  onClose: () => void;
  /** 열자마자 [AI 편집 시작] — 예전 [AI가 다 꾸미기] */
  autoStart?: boolean;
}) {
  const b = videoBridge()!;
  const writer = useStudioWriter();
  const imager = useStudioImager();
  const [pfRaw, setPf] = useState<Prefs>(loadPrefs);
  const pf: Prefs = { ...DEF, ...pfRaw }; // 새로 생긴 칸(캐릭터 시트 등)은 옛 설정에 없다 — 늘 기본값으로 채운다
  // 내 이미지 스타일 — 내 맞춤 프롬프트를 [이미지 스타일에 추가]로 저장한 것 (2026-10-21 사장님). 고르면 모든 클립이 그 스타일
  const myStyles: ImageStyle[] = pf.myPrompts.map((m) => ({ id: "my:" + m.id, label: m.label, desc: `내 이미지 스타일 — ${m.text}`, prompt: `Art style: ${m.text}.`, bg: "linear-gradient(135deg,#334155,#0f172a)" }));
  const allStyles: ImageStyle[] = [...IMAGE_STYLES, ...myStyles];
  const set = <K extends keyof Prefs>(k: K, v: Prefs[K]) => setPf((x) => {
    const n = { ...x, [k]: v };
    try { localStorage.setItem(PREF_KEY, JSON.stringify(n)); } catch {}
    return n;
  });
  const [kind, setKind] = useState<Kind>(project.kind || (project.vacancyId ? "vacancy" : "topic"));
  // 창 제목 옆 — 영상 종류·화면 비율 (2026-10-21 사장님: 위에 보이고 눌러서 고치기)
  const [topMenu, setTopMenu] = useState<{ what: "kind" | "ratio"; x: number; y: number } | null>(null);
  const pickKind = (k: Kind) => { setKind(k); apply((p) => { p.kind = k; }); };
  const pickRatio = (r: Ratio) => apply((p) => { p.ratio = r; if (p.settings.subtitle.posAuto && typeof p.settings.subtitle.x !== "number") p.settings.subtitle.position = autoSubPosition(r); });
  const [mats, setMats] = useState<LibItem[]>(() => (project.materials || []).slice(0, 30));
  const [onlySel, setOnlySel] = useState(false);
  const [open, setOpen] = useState<Record<string, boolean>>({}); // ③~⑦ 펼침
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [note, setNote] = useState(""); // 화면 채우기 결과 한 줄
  const [noteAt, setNoteAt] = useState<"mine" | "rest">("rest"); // 누른 단추 아래에 보여 준다
  const [selEmpty, setSelEmpty] = useState<string[]>([]); // 화면 편집판에서 고른 클립 — 그릴 클립 (빈칸·화면 있는 클립 모두, 2026-10-21 사장님: 전체 선택)
  const [trimFor, setTrimFor] = useState(""); // 앞뒤 자르기 창
  const [rows, setRows] = useState<Row[] | null>(null);
  const [aiSel, setAiSel, aiList] = useAiPick();
  const aiUse = effectiveAi(aiSel, aiList);
  const aiName = aiChoiceName(aiUse, aiList, writer);
  const [agency, setAgency] = useState<Agency | null>(null);
  const [title, setTitle] = useState(() => project.name.replace(/^(\d{8}|\d{6})\s+/, "").replace(/^무제$/, ""));
  useEffect(() => {
    getStudioAgency().then((r) => setAgency(r.success ? r.data : null)).catch(() => setAgency(null));
  }, []);
  const channel = pf.channel || agency?.name || "";

  // 클립 — 오른쪽 목록 · 빈 클립
  const flat = useMemo(() => flatten(project).items.filter((x) => x.clip.type !== "silence" && !x.clip.card), [project]); // 인트로·아웃트로·쉼·끝 화면 칸은 빼고
  // 화면 — 넣은 화면, 없으면 촬영 원본이 "영상"일 때만 (AI 보이스·녹음처럼 소리만 있는 원본은 화면이 아니다, 2026-10-21: 빈칸 0개로 잘못 셌다)
  const screenOf = (c: Clip) => (c.blank ? "" : c.visual?.asset || (c.type !== "voice" && c.src && project.assets[c.src.asset]?.kind === "video" ? c.src.asset : "")) || ""; // [빈칸으로 두기]면 화면 없음
  const emptyN = flat.filter((x) => !screenOf(x.clip) && !x.clip.blank).length; // [빈칸으로 두기]는 빼고
  const pickable = flat.filter((x) => clipText(x.clip).trim()).map((x) => x.clip.id); // 고를 수 있는 클립 (글이 있는)
  const allSel = pickable.length > 0 && pickable.every((id) => selEmpty.includes(id));
  const thumbOf = (c: Clip) => {
    const a = project.assets[screenOf(c)];
    return a ? a.thumb || (a.kind === "image" ? a.url : "") : "";
  };


  /* ── 화면 채우기 (2026-10-21 사장님: 스타일 팩보다 화면을 한 번에 잘 채우기 — docs/2026-10-21_studio_ai_fill_plan.md) ──
     순서 고정: ① 내 화면·영상 → ② 무료 영상·사진 → ③ 그래도 빈 곳: AI 그림 / 빈칸 / 내 화면 다시 (회원이 고름)
     넣은 영상이 문장보다 짧으면 마지막 장면에서 멈춤 (visualHold). 회원이 넣어 둔 화면은 건드리지 않는다 */
  const rest = pf.rest || (pf.aiOn ? "ai" : "blank");
  const orientOf = () => (project.ratio === "9:16" || project.ratio === "4:5" ? "portrait" : project.ratio === "1:1" ? "square" : "landscape");
  /** AI 그림 스타일 — 고른 것, [스타일 팩에 맞춤]이면 팩의 것 */
  // [자동] — [프롬프트 만들기] 때 AI 가 대본을 읽고 고른 스타일 하나 (project.aiStyle) 를 모든 클립에 (2026-10-21 사장님)
  const styleOf = (packImg?: string) => (pf.aiStyle !== "auto" && allStyles.find((x) => x.id === pf.aiStyle)) || (pf.aiStyle === "auto" && allStyles.find((x) => x.id === project.aiStyle)) || allStyles.find((x) => x.id === packImg) || allStyles.find((x) => x.id === "realistic")!;
  // 캐릭터 시트를 첨부할 수 있는 앱인지 — 0.1.12(동영상과 같이 나옴)부터. 옛 앱은 사진을 버려서 "첨부한 시트" 말만 가면 AI 가 그림을 거절한다 (2026-10-21)
  const charApp = Boolean(b.ai.video);
  const charOn = pf.charSheet.length > 0 && charApp;
  /** 내 맞춤 프롬프트 — 모든 그림 끝에 붙인다 */
  const mine = () => (pf.myPrompt.trim() ? `\nAlways follow these instructions: ${pf.myPrompt.trim()}` : "")
    + (charOn ? "\nCharacter reference: the attached image(s) are a character sheet. Whenever a person appears, draw exactly this same character (same face, hairstyle, outfit, age and body type). Do not copy the sheet layout or its background — create a new scene." : "");
  const refs = () => (charOn ? { files: pf.charSheet.map((x) => x.path || "").filter(Boolean) } : {});
  const [myName, setMyName] = useState<string | null>(null); // [저장] 이름 칸
  /** 이 클립 그림 스타일 — 클립에서 고른 것, 없으면 왼쪽 ① */
  // 2026-10-21 사장님: 그림 스타일은 왼쪽 하나로 모든 클립에 똑같이 — 클립마다 다른 스타일은 쓰지 않는다 (옛 프로젝트의 클립 스타일도 무시)
  const picStyle = (_c: Clip) => styleOf(undefined);
  /** 건드리지 않는 클립 — [빈 클립만]: 화면이 있는 클립 / [모두 다시]: 내가 직접 넣은 화면만 (2026-10-21 사장님: 화면이 다 있으면 아무 반응이 없었다) */
  const keepOf = (c: Clip) => Boolean(c.blank) || (pf.over === "all" ? Boolean(c.visual && !c.fillFrom) : Boolean(screenOf(c)));
  type FillVis = { asset: string; s: number; hold?: boolean; from: NonNullable<Clip["fillFrom"]> };
  type PlanClip = { act: string; v?: number; t?: number; desc?: string; keywords?: string };
  /** opts — 이번에 쓸 재료 (① 내 사진·영상 / ② 빈 곳: 무료 → AI 그림 → 내 사진 다시) · skip — 건드리지 않을 클립 */
  type FillOpts = { mine: boolean; stock: boolean; ai: boolean; reuse: boolean; aiMax?: number };
  const fillCore = async (targets: typeof flat, plan: { clips: PlanClip[] }, sty: (typeof IMAGE_STYLES)[number], o: FillOpts, skip: (c: Clip) => boolean = keepOf) => {
    const vis: Record<string, FillVis> = {};
    const done: Row[] = [];
    const ok = mats.filter((f) => f.path);
    const seq = pf.order === "seq";
    const orient = orientOf();
    const usedStock = new Set<string>();
    const aiMax = o.ai ? o.aiMax ?? pf.aiMax : 0;
    let aiNo = 0;
    let seqK = 0;
    const put = async (it: LibItem, from: FillVis["from"], s = 0): Promise<FillVis> => {
      const a = await ensureAsset(it);
      return { asset: a.id, s, hold: a.kind === "video", from };
    };
    const stockTry = async (q: string): Promise<FillVis | null> => {
      if (!o.stock || !q.trim()) return null;
      setBusy(`무료 영상·사진을 찾는 중… "${q}"`);
      let pick: StockItem | undefined;
      const kinds = pf.stockKind === "video" ? (["video"] as const) : pf.stockKind === "photo" ? (["photo"] as const) : (["video", "photo"] as const);
      for (const kindS of kinds) {
        const r = await b.stock.search(q, kindS, orient).catch(() => ({ items: [] as StockItem[] }));
        pick = (r.items || []).find((x) => !usedStock.has(x.id));
        if (pick) break;
      }
      if (!pick) return null;
      usedStock.add(pick.id);
      return put(await b.stock.get(project.dir, pick), "stock");
    };
    const aiTry = async (desc: string, c?: Clip): Promise<FillVis | null> => {
      if (aiNo >= aiMax || !desc.trim()) return null;
      aiNo++;
      setBusy(`${imager}가 그림을 그리는 중… (${aiNo}/${aiMax}) — 한 장에 30초~1분`);
      const it = await b.ai.image(project.dir, `${imagePrompt(c?.aiPic?.prompt || desc, c ? picStyle(c) : sty)}${mine()} ${orient === "portrait" ? "Vertical 9:16 composition." : orient === "square" ? "Square composition." : "Horizontal 16:9 composition."}`, { ratio: project.ratio, ...refs(), ai: aiUse });
      return put(it, "ai");
    };
    for (let i = 0; i < targets.length; i++) {
      const c = targets[i].clip;
      const text = clipText(c);
      if (skip(c)) {
        done.push({ n: i + 1, text, what: "그대로 (넣어 둔 화면)" });
        continue;
      }
      const pl: PlanClip = plan.clips[i] || { act: "keep" };
      const prevId = i > 0 ? targets[i - 1].clip.id : "";
      let v: FillVis | null = null;
      try {
        // ① 내 화면·영상
        if (o.mine && seq && seqK < ok.length) { v = await put(ok[seqK], ok[seqK].source === "vacancy" ? "vacancy" : "mine"); seqK++; }
        else if (o.mine && !seq && pl.act === "foot" && typeof pl.v === "number" && ok[pl.v]) v = await put(ok[pl.v], ok[pl.v].source === "vacancy" ? "vacancy" : "mine", pl.t || 0);
        else if (pl.act === "same" && prevId && vis[prevId]) v = { ...vis[prevId], s: vis[prevId].s + targets[i - 1].dur };
        // ② 무료 영상·사진
        if (!v) v = await stockTry(pl.keywords || pl.desc || text.replace(/\s+/g, " ").slice(0, 24));
        // ③ 그래도 빈 곳 — 회원이 고른 대로
        if (!v && o.ai) v = await aiTry(pl.desc || text, c);
        if (!v && o.reuse && ok.length) {
          const prev = prevId ? vis[prevId]?.asset || screenOf(targets[i - 1].clip) : "";
          for (let k = 0; k < ok.length && !v; k++) {
            const cand = await put(ok[(i + k) % ok.length], "reuse");
            if (cand.asset !== prev) v = cand;
          }
        }
      } catch (e) {
        if (isStopped(e)) throw e; // [중지] — 남은 클립은 하지 않는다
        done.push({ n: i + 1, text, what: `빈칸 (못 넣음: ${errText(e)})` });
        continue;
      }
      if (v) vis[c.id] = v;
      done.push({ n: i + 1, text, what: v ? FROM_LABEL[v.from] + (v.from === "ai" ? ` (${sty.label})` : "") : "빈칸" });
    }
    return { vis, done };
  };
  /** 채운 화면을 프로젝트에 (apply 안에서) */
  const putVis = (c: Clip, v?: FillVis) => {
    if (!v || keepOf(c)) return;
    c.visual = { asset: v.asset, s: v.s };
    c.fillFrom = v.from;
    if (v.hold) c.visualHold = true;
    else delete c.visualHold;
  };
  /** 인트로·아웃트로·중간 쉼 칸 (클립 하나) — 글·목소리 없이 그 화면만 */
  const cardClip = (card: "intro" | "outro" | "pause", a: Asset | null, s = 0, hold?: number): Clip =>
    ({ id: uid(), type: "voice", text: "", words: [], voice: null, visual: a ? { asset: a.id, s } : null, hold: hold ?? (a && a.kind === "video" ? Math.max(1, Math.min(10, a.duration || 3)) : 3), sub: false, card, ...(a && a.kind === "video" ? { visualHold: true } : {}) }) as Clip;
  /** 기본 인트로·아웃트로 자동으로 (없을 때만) — apply 전에 자료를 준비
   *  2026-10-21 사장님: 인트로·아웃트로는 화면 편집판에서만 넣는다 → 왼쪽 설정 칸이 없어져 자동으로 붙이지 않음 (보이지 않는 설정이 몰래 붙지 않게) */
  const autoCards = async () => {
    const intro: Asset | null = null;
    const outro: Asset | null = null;
    return (p: Project) => {
      const all = p.scenes.flatMap((s) => s.clips);
      if (intro && !all.some((c) => c.card === "intro") && p.scenes[0]) p.scenes[0].clips.unshift(cardClip("intro", intro));
      if (outro && !all.some((c) => c.card === "outro") && p.scenes.length) {
        const last = p.scenes[p.scenes.length - 1].clips;
        const e = last.findIndex((c) => c.card === "end");
        last.splice(e >= 0 ? e : last.length, 0, cardClip("outro", outro));
      }
    };
  };

  /** 화면 채우기 — AI 요청 ①·② (2026-10-21 사장님: AI 편집 = 클립에 화면을 먼저 쭉 깔기, 레이아웃 컷편집을 쉽게)
   *  mine — ① 내 사진·영상을 대본에 맞춰 (AI 요청 1번)
   *  rest — ② 빈 곳 (오른쪽에서 고른 빈칸, 안 골랐으면 빈칸 모두): 무료 → AI 그림 → 내 사진 다시 (AI 요청 2번)
   *  한 번에 되돌리기 한 칸. 회원이 직접 넣은 화면은 그대로 */
  const fillOnly = async (mode: "mine" | "rest") => {
    if (!b.ai.edit) return setErr("공실스튜디오를 껐다 켜 주세요 (AI 편집 기능을 새로 연결해요)");
    setErr("");
    setRows(null);
    setNote("");
    setNoteAt(mode);
    const off = b.onProgress((t) => setBusy(t));
    try {
      const targets = flat.filter((x) => clipText(x.clip).trim());
      const pick = mode === "rest" && selEmpty.length ? selEmpty : null;
      const skip = mode === "mine" ? keepOf : (c: Clip) => Boolean(screenOf(c)) || Boolean(pick && !pick.includes(c.id));
      const todo = targets.filter((x) => !skip(x.clip));
      const ok = mats.filter((f) => f.path);
      if (mode === "mine" && !ok.length) throw new Error("내 사진·영상을 먼저 넣어 주세요 ([PC에서 추가]·[내 자료에서 고르기]).");
      const o: FillOpts = mode === "mine" ? { mine: true, stock: false, ai: false, reuse: false } : { mine: false, stock: false, ai: true, reuse: false, aiMax: todo.length };
            let plan: { clips: PlanClip[] } = { clips: [] };
      const seq = pf.order === "seq";
      if (todo.length && !(mode === "mine" && seq)) {
        const locked = targets.map((x, i) => (skip(x.clip) ? i + 1 : 0)).filter(Boolean);
        setBusy(mode === "mine" ? `${aiName}가 대본에 맞는 내 사진·영상을 고르는 중… (1분 안팎)` : `${aiName}가 빈 곳에 어울리는 화면을 정하는 중… (1분 안팎)`);
        const cat = aiEditCatalog();
        cat.presets = []; cat.stickers = []; cat.sfx = [];
        plan = await b.ai.edit(targets.map((x) => clipText(x.clip)), mode === "mine" ? ok.map((f) => ({ path: f.path!, kind: f.kind, duration: f.duration })) : [],
          { aiMax: o.ai ? o.aiMax ?? pf.aiMax : 0, moods: [...MUSIC_MOODS], screen: true, ratio: project.ratio, catalog: cat, kind, request: pf.request, locked, stock: o.stock, graphics: "none", sfx: "none", ai: aiUse });
      }
      const chosen = (null as StylePack | null) /* 스타일 팩 고르기 없음 — AI 가 고름 */;
      const { vis } = await fillCore(targets, plan, styleOf(chosen?.img), o, skip);
      const cards = await autoCards();
      apply((p) => {
        p.kind = kind;
        p.materials = mats;
        const find = (id: string) => p.scenes.flatMap((s) => s.clips).find((x) => x.id === id);
        for (const x of targets) { const c = find(x.clip.id); const v = vis[x.clip.id]; if (c && v) { c.visual = { asset: v.asset, s: v.s }; c.fillFrom = v.from; if (v.hold) c.visualHold = true; else delete c.visualHold; } }
        cards(p);
      });
      setSelEmpty([]);
      const n = Object.keys(vis).length, left = todo.length - n;
      setNote(!todo.length
        ? mode === "mine" ? "넣을 클립이 없어요 — 모든 클립에 화면이 있어요. [모두 다시]를 고르면 AI가 넣었던 화면·촬영 화면도 다시 골라요." : "빈 클립이 없어요 — 화면이 다 채워졌어요."
        : n ? `${todo.length}개 중 ${n}개를 채웠어요${left > 0 ? ` · ${left}개는 아직 빈칸${mode === "mine" ? " → ②에서 채워요" : ""}` : ""} — 오른쪽에서 바꾸거나 잘라요`
        : mode === "mine" ? "대본에 맞는 내 사진·영상을 찾지 못했어요. 오른쪽에서 직접 넣거나 ②로 채워요." : "채울 화면을 찾지 못했어요. 재료(무료·AI 그림)를 바꿔 다시 해 주세요.");
    } catch (e) {
      setErr(errText(e));
    } finally {
      off();
      setBusy("");
    }
  };

  /** 자동 편집 — 빈 클립 화면 채우기 한 번 (AI 가 내 사진·영상을 문장에 맞춰 배치, 빈 곳은 무료·AI 이미지). 넣은 화면 수 */
  const fillAuto = async (targets: typeof flat) => {
    const ok = mats.filter((f) => f.path);
    const todo = targets.filter((x) => !keepOf(x.clip));
    if (!todo.length) return 0;
    const o: FillOpts = { mine: ok.length > 0, stock: pf.stock, ai: pf.aiOn, reuse: ok.length > 0, aiMax: pf.aiMax };
    let plan: { clips: PlanClip[] } = { clips: [] };
    if (!(o.mine && pf.order === "seq")) {
      const locked = targets.map((x, i) => (keepOf(x.clip) ? i + 1 : 0)).filter(Boolean);
      setBusy(`${aiName}가 클립마다 화면을 정하는 중… (1분 안팎)`);
      const cat = aiEditCatalog();
      cat.presets = []; cat.stickers = []; cat.sfx = [];
      plan = await b.ai.edit!(targets.map((x) => clipText(x.clip)), ok.map((f) => ({ path: f.path!, kind: f.kind, duration: f.duration })),
        { aiMax: o.ai ? pf.aiMax : 0, moods: [...MUSIC_MOODS], screen: true, ratio: project.ratio, catalog: cat, kind, request: pf.request, locked, stock: o.stock, graphics: "none", sfx: "none", ai: aiUse });
    }
    const { vis } = await fillCore(targets, plan, styleOf(undefined), o, keepOf);
    if (!Object.keys(vis).length) return 0;
    steps.current++;
    apply((p) => {
      p.materials = mats;
      const find = (id: string) => p.scenes.flatMap((s) => s.clips).find((x) => x.id === id);
      for (const x of targets) { const c = find(x.clip.id); const v = vis[x.clip.id]; if (c && v) { c.visual = { asset: v.asset, s: v.s }; c.fillFrom = v.from; if (v.hold) c.visualHold = true; else delete c.visualHold; } }
    });
    return Object.keys(vis).length;
  };
  const steps = React.useRef(0); // 자동 편집이 넣은 되돌리기 칸 수 — [한 번에 되돌리기]는 이만큼 되돌린다

  /* ── ② 자료 넣기 ── */
  const addMats = (items: LibItem[]) => setMats((v) => [...v, ...items.filter((x) => (x.kind === "image" || x.kind === "video") && !v.some((y) => y.id === x.id))].slice(0, 30));
  const [picker, setPicker] = useState<LibItem[] | null>(null);
  const [pickSel, setPickSel] = useState<string[]>([]);
  const [vacOpen, setVacOpen] = useState(false);
  const [vacs, setVacs] = useState<{ id: string; label: string }[] | null>(null);
  const [vacNo, setVacNo] = useState("");
  const loadVac = async (id: string) => {
    setErr("");
    setBusy("공실 사진을 받는 중…");
    try {
      const r = await b.vacancy(id);
      addMats([...(r.photos || []), ...(r.shots || [])]);
      setVacOpen(false);
    } catch (e) {
      setErr(errText(e));
    }
    setBusy("");
  };
  const openVac = () => {
    setVacOpen(true);
    if (!vacs) listMyStudioVacancies().then((r) => setVacs(r.success ? r.data.map((v) => ({ id: v.id, label: `[${v.trade_type || "-"}] ${v.building_name || v.property_type || "공실"} · ${v.address} · 사진 ${v.photoCount}장` })) : [])).catch(() => setVacs([]));
  };
  const findVac = async () => {
    const r = await findStudioVacancyByNo(vacNo).catch((e) => ({ success: false as const, error: errText(e) }));
    if (!r.success) return setErr(r.error);
    setVacNo("");
    void loadVac((r.data as { id: string }).id);
  };
  const moveMat = (i: number, d: number) => setMats((v) => {
    const j = i + d;
    if (j < 0 || j >= v.length) return v;
    const n = v.slice();
    [n[i], n[j]] = [n[j], n[i]];
    return n;
  });

  /* ── 끝 화면 글 (매물 소개는 반드시) ── */
  const [listing, setListing] = useState<{ title?: string; fields?: { label: string; value: string }[] } | null>(null);
  useEffect(() => {
    if (!project.vacancyId) return;
    b.vacancy(project.vacancyId).then((r) => setListing(r.vacancy)).catch(() => {});
  }, [b, project.vacancyId]);
  const endMust = false; // 2026-10-21 사장님: 표시광고 화면은 회원이 켜고 끈다 (뉴스 영상엔 필요 없음) — 기본값만 영상 종류로
  const endOn = pf.endCard;
  const missing = endOn && agency !== null ? ([["상호", agency.name], ["대표 공인중개사", agency.ceo], ["등록번호", agency.regNum], ["연락처", agency.phone], ["소재지", agency.address]] as const).filter(([, v]) => !v).map(([k]) => k) : [];
  /** 부동산 표시광고 칸 — 상호 · 대표 · 등록번호 · 소재지 · 연락처 · 매물 정보 (빈 값은 비움) */
  const endFields = () => {
    const a = agency || { name: "", ceo: "", regNum: "", phone: "", address: "" };
    let info = "";
    if (kind === "vacancy" && listing) {
      const fs = (listing.fields || []).filter((f) => f && f.value && LISTING_LABEL.test(f.label) && !/공실광고번호/.test(f.label)).map((f) => `${f.label} ${String(f.value).slice(0, 30)}`);
      const rowsOut: string[] = listing.title ? [String(listing.title)] : [];
      for (let i = 0; i < fs.length && rowsOut.length < 4; i += 3) rowsOut.push(fs.slice(i, i + 3).join(" · "));
      info = rowsOut.join("\n");
    }
    return [a.name, a.ceo, a.regNum, a.address, a.phone, info];
  };
  const endDef = TEMPLATES.find((x) => x.cat === "부동산 표시광고" && x.label === pf.endDesign) || TEMPLATES.find((x) => x.cat === "부동산 표시광고");
  const endThumbs = useMemo(() => {
    if (!open.end || !agency) return {} as Record<string, string>;
    const out: Record<string, string> = {};
    const text = tplTextOf(endFields());
    for (const lb of AD_LAW_LABELS) {
      const d = TEMPLATES.find((x) => x.cat === "부동산 표시광고" && x.label === lb);
      if (!d) continue;
      try {
        const big = drawTemplate(TPL_PREFIX + d.id, text, d.color);
        const k = Math.min(1, 320 / big.width);
        const cv = document.createElement("canvas");
        cv.width = Math.round(big.width * k); cv.height = Math.round(big.height * k);
        cv.getContext("2d")!.drawImage(big, 0, 0, cv.width, cv.height);
        out[lb] = cv.toDataURL("image/png");
      } catch {}
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open.end, agency, listing, kind]);
  const endText = () => {
    const a = agency || { name: "", ceo: "", regNum: "", phone: "", address: "" };
    const lines = [a.name, a.ceo && `대표 공인중개사 ${a.ceo}`, a.regNum && `등록번호 ${a.regNum}`, [a.address, a.phone].filter(Boolean).join(" · ")].filter(Boolean) as string[];
    if (kind === "vacancy" && listing) {
      const fs = (listing.fields || []).filter((f) => f && f.value && LISTING_LABEL.test(f.label) && !/공실광고번호/.test(f.label)).map((f) => `${f.label} ${String(f.value).slice(0, 30)}`);
      const head = [listing.title].filter(Boolean) as string[];
      const rowsOut: string[] = [];
      for (let i = 0; i < fs.length; i += 3) rowsOut.push(fs.slice(i, i + 3).join(" · "));
      if (head.length || rowsOut.length) lines.push("", ...head, ...rowsOut);
    }
    return lines.join("\n");
  };

  /** [씬 정리] — 글 AI 가 클립 글을 읽고 이야기 묶음(씬)으로 다시 나누고 이름 붙이기 (회의 3-22) */
  const group = async () => {
    if (!b.ai.group) return setErr("공실스튜디오를 껐다 켜 주세요 (씬 정리 기능을 새로 연결해요)");
    const clips = project.scenes.flatMap((s) => s.clips);
    if (clips.length < 2) return setErr("클립이 2개 이상 있어야 씬을 나눌 수 있어요.");
    setErr("");
    setRows(null);
    setBusy(`${writer}가 씬을 나누는 중… (1분 안팎)`);
    const off = b.onProgress((t) => setBusy(t));
    try {
      const groups = await b.ai.group(clips.map((c) => clipText(c)));
      let names: string[] = [];
      apply((p) => {
        regroupScenes(p, groups);
        names = p.scenes.map((s, i) => `씬 ${i + 1}${s.title ? ` ${s.title}` : ""} — 클립 ${s.clips.length}개`);
      });
      setRows(names.map((what) => ({ n: 0, text: "", what })));
    } catch (e) {
      setErr(errText(e));
    } finally {
      off();
      setBusy("");
    }
  };

  const started = React.useRef(false);
  const [go, setGo] = useState(false);
  useEffect(() => {
    if (autoStart && !started.current) {
      started.current = true;
      const r = project.settings.aiAutoReq;
      if (r) {
        // 대본 쓰고 편집의 [편집 요청 사항] — 이번 한 번만 (저장하지 않음). 꾸미기에서 고른 제목·채널명·엔딩·음악·자막 모양은 그대로
        setPf((x) => ({ ...x, request: r.request, titleOn: false, channelOn: false, endCard: false, subscribe: false, music: false, keepLook: true, ...(r.keepTrans ? { trans: "none" as const } : {}) }));
        setGo(true);
      } else void start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);
  useEffect(() => {
    if (!go) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGo(false);
    void start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [go]);

  /* ── AI 편집 시작 ── */
  const start = async () => {
    if (!b.ai.edit) return setErr("공실스튜디오를 껐다 켜 주세요 (AI 편집 기능을 새로 연결해요)");
    setErr("");
    setRows(null);
    const off = b.onProgress((t) => setBusy(t));
    try {
      const all = flat;
      const targets = (onlySel && selected.length ? all.filter((x) => selected.includes(x.clip.id)) : all).filter((x) => clipText(x.clip).trim());
      if (!targets.length) throw new Error("편집할 클립이 없어요 (자막·글이 있는 클립이 필요해요). 먼저 [자동 자막 만들기]를 해 주세요.");
      steps.current = 0;
      // 자동 편집 — 내 사진·영상 + 무료(+AI 이미지)로 빈 곳부터 채우고, 이어서 꾸미기 (2026-10-21 사장님: 완성 초안 한 번에)
      const filled = mode === "auto" ? await fillAuto(targets) : 0;
      if (mode !== "auto" && (emptyN > 0 || selEmpty.length)) await drawEmpty();
      const locked = targets.map((_, i) => i + 1); // 화면은 바꾸지 않는다 (①·② 에서)
      // 1) 글 AI — 꾸미기 계획
      setBusy(`${aiName}가 편집 계획을 세우는 중… (1~2분)`);
      // 스타일 팩 — 고른 팩, [자동]이면 AI 가 대본을 읽고 고른다. 모양(자막·정보 바·제목·전환·소리)은 팩이 정하고 AI 는 어디에 넣을지만
      const chosen = (null as StylePack | null) /* 스타일 팩 고르기 없음 — AI 가 고름 */;
      const cat = aiEditCatalog();
      cat.presets = []; // 자막 모양은 팩이
      if (chosen && chosen.graphics === "none") cat.stickers = [];
      if (chosen && chosen.sfx === "none") cat.sfx = [];
      const plan = await b.ai.edit(targets.map((x) => clipText(x.clip)), [],
        { aiMax: 0, moods: [...MUSIC_MOODS], screen: false, ratio: project.ratio, catalog: cat, kind, request: pf.request, locked, stock: false, graphics: chosen?.graphics || "some", sfx: chosen?.sfx || "some", ai: aiUse,
          ...(chosen ? {} : { packs: STYLE_PACKS.map((x) => ({ id: x.id, label: x.label, desc: x.desc })) }) });
      const P: StylePack = chosen || packOf(plan.pack || "") || defaultPack(kind, project.ratio);
      const doStk = P.graphics !== "none" && pf.graphics !== "none";
      const SX = pf.sfx === "none" ? "none" : P.sfx;
      const doTrans = pf.trans !== "none";
      // 스티커(그래픽) 그림 — 편집기에서 그려 프로젝트에 저장
      const stk: Record<string, { item: LibItem; spec: Sticker }> = {};
      const wantStk = doStk ? plan.clips.map((x, i) => ({ i, s: x.sticker })).filter((x) => x.s) : [];
      if (wantStk.length && b.lib.saveImage) {
        setBusy(`그래픽을 그리는 중… (${wantStk.length}개)`);
        await stickerGlyphs(wantStk.map((x) => x.s!.text)).catch(() => {});
        for (const x of wantStk) {
          try {
            const spec: Sticker = { text: x.s!.text, style: x.s!.style as StickerStyle };
            const item = await b.lib.saveImage(project.dir, await stickerPng(spec), stickerFileName(spec.text));
            stk[targets[x.i].clip.id] = { item, spec };
          } catch {}
        }
      }
      const stkAsset: Record<string, Asset> = {};
      for (const [cid, v] of Object.entries(stk)) stkAsset[cid] = await ensureAsset(v.item);
      // 2) 화면 — 빈 클립만 (화면 채우기와 같은 순서: 내 화면 → 무료 → AI 그림/빈칸/다시)
      // ③ 꾸미기만 — 화면은 ①·② 에서 (2026-10-21 사장님: AI 요청 3번째, 화면은 건드리지 않는다)
      const vis: Record<string, FillVis> = {};
      const done: Row[] = targets.map((x, i) => ({ n: i + 1, text: clipText(x.clip), what: screenOf(x.clip) ? "화면 그대로" : "빈칸 (①·②에서 채워요)" }));
      done.forEach((r, i) => {
        const c = targets[i].clip, pl = plan.clips[i];
        if (!pl) return;
        const extra = [pf.keyText && pl.title && `정보 바 "${pl.title}"`, pl.emph && "자막 강조", pl.trans && "화면전환", stk[c.id] && `그래픽 "${stk[c.id].spec.text}"`, SX !== "none" && pl.sfx && `효과음 ${SFX_LIST.find((x) => x.id === pl.sfx)?.label || pl.sfx}`].filter(Boolean).join(" · ");
        if (extra) r.what = `${r.what} · ${extra}`;
      });
      const cards = await autoCards();
      // 3) 배경음악 — 없을 때만
      let music: { file: string; url: string; name: string } | null = null;
      if (pf.music !== false && !(project.layers || []).some((l) => l.type === "music")) {
        const track = MUSIC_LIBRARY.find((t) => t.mood === P.music) || MUSIC_LIBRARY.find((t) => t.mood === plan.music) || MUSIC_LIBRARY.find((t) => t.mood === "잔잔한");
        if (track) {
          setBusy(`배경음악을 넣는 중… (${track.mood})`);
          const r = await b.musicGet(project.dir, `bgm/lib/${track.id.slice(4)}.mp3`).catch(() => null);
          if (r) music = { file: r.file, url: r.url, name: track.label };
        }
      }
      const transType = (n: number): TransType => (P.trans[n % P.trans.length] || "fade") as TransType; // 팩의 전환을 차례로
      const transSfx = (ty: string) => (SX === "none" ? undefined : TRANSITIONS.find((x) => x.id === ty)?.sfx);
      // 핵심 정보 바 — 팩의 자막바 템플릿으로 (가운데 큰 상자 말고 아래 왼쪽 정보 바, 영상 하나에 3번까지)
      const keyG: Record<string, { asset: string; style: string; text: string; color: string; w: number; anim: LayerAnim }> = {};
      const keyDef = TEMPLATES.find((x) => x.label === P.key.tpl);
      if (pf.keyText && keyDef && b.lib.saveImage) {
        const picks = plan.clips.map((x, i) => ({ i, t: String(x.title || "").trim() })).filter((x) => x.t);
        const chosenKeys: typeof picks = [];
        for (const x of picks) if (chosenKeys.length < 3 && (!chosenKeys.length || x.i - chosenKeys[chosenKeys.length - 1].i >= 3)) chosenKeys.push(x);
        if (chosenKeys.length) {
          setBusy(`정보 바를 그리는 중… (${chosenKeys.length}개)`);
          await tplFonts();
          for (const x of chosenKeys) {
            try {
              const vals = keyDef.fields.map((f) => f.def);
              if (vals.length >= 2) { vals[0] = P.key.label || vals[0]; vals[1] = x.t; } else vals[0] = x.t;
              const style = TPL_PREFIX + keyDef.id, text = tplTextOf(vals);
              const item = await b.lib.saveImage(project.dir, drawTemplate(style, text, P.key.color).toDataURL("image/png"), `템플릿_${keyDef.label}`);
              const a = await ensureAsset(item);
              keyG[targets[x.i].clip.id] = { asset: a.id, style, text, color: P.key.color, w: keyDef.w, anim: keyDef.anim };
            } catch {}
          }
        }
      }
      const endTxt = endOn ? endText() : "";
      // 끝 화면 — 고른 부동산 표시광고 디자인 (움직이는 그래픽)
      let endG: { asset: string; style: string; text: string; color: string; anim: LayerAnim } | null = null;
      const endD = pf.endDesign ? endDef : TEMPLATES.find((x) => x.cat === "부동산 표시광고" && x.label === P.end) || endDef;
      if (endOn && endD && b.lib.saveImage) {
        try {
          await tplFonts();
          const style = TPL_PREFIX + endD.id, text = tplTextOf(endFields());
          const item = await b.lib.saveImage(project.dir, drawTemplate(style, text, endD.color).toDataURL("image/png"), `템플릿_${endD.label}`);
          const a = await ensureAsset(item);
          endG = { asset: a.id, style, text, color: endD.color, anim: endD.anim };
        } catch {}
      }
      // 구독·좋아요 — [그래픽 › 구독·좋아요]의 움직이는 그래픽 (2026-10-20 사장님). 가로는 채널명이 있으면 채널 구독 카드, 없으면 좋아요·구독·알림 / 세로는 구독 누르기
      let subG: { asset: string; label: string; style: string; text: string; color: string; w: number; y: number; anim: LayerAnim; clicks: number[] } | null = null;
      if (pf.subscribe && b.lib.saveImage) {
        try {
          const tallR = project.ratio === "9:16" || project.ratio === "4:5";
          const want = tallR ? "구독 누르기 (빨강)" : channel.trim() ? "채널 구독 카드" : "좋아요 · 구독 · 알림";
          const d = TEMPLATES.find((x) => x.label === want);
          if (d) {
            await tplFonts();
            const vals = d.fields.map((f) => f.def);
            if (want === "채널 구독 카드") { vals[0] = channel.trim().slice(0, 20); vals[1] = kind === "news" ? "부동산 뉴스 · 해설" : "부동산 매물 · 정보"; }
            const style = TPL_PREFIX + d.id, text = tplTextOf(vals);
            const item = await b.lib.saveImage(project.dir, drawTemplate(style, text, d.color).toDataURL("image/png"), `템플릿_${d.label}`);
            const a = await ensureAsset(item);
            subG = { asset: a.id, label: d.label, style, text, color: d.color, w: tallR ? Math.min(0.9, d.w * 2.2) : d.w, y: d.y ?? 0.8, anim: d.anim, clicks: want === "좋아요 · 구독 · 알림" ? [0.9, 1.6, 2.3] : want === "채널 구독 카드" ? [1.3] : [1.0] };
          }
        } catch {}
      }
      // 4) 한 번에 넣기 (되돌리기 한 번)
      steps.current++;
      apply((p) => {
        delete p.settings.aiAuto;
        delete p.settings.aiAutoReq;
        p.kind = kind;
        p.materials = mats;
        const find = (id: string): Clip | undefined => p.scenes.flatMap((s) => s.clips).find((x) => x.id === id);
        p.layers = (p.layers || []).filter((l) => !/^AI (제목|채널명|구독|핵심 글자|정보 바)$/.test(l.name || "") && !(l.type === "text" && !l.name && l.box && l.boxColor === "#1A3A6B" && l.size === 120)); // 다시 AI 편집하면 고쳐 쓴다 (예전 남색 상자 핵심 글자도 지움)
        targets.forEach((x, i) => {
          const c = find(x.clip.id);
          const pl = plan.clips[i];
          if (!c || !pl) return;
          putVis(c, vis[c.id]);
          if (doTrans && pl.trans) { const ty = transType(i); const sx = transSfx(ty); c.trans = { type: ty, a: 0.3, b: 0.3, ...(sx ? { sfx: sx } : {}) }; }
          const kg = keyG[c.id];
          if (kg) {
            const tallK = p.ratio === "9:16" || p.ratio === "4:5";
            const w = tallK ? Math.min(0.9, kg.w * 1.8) : kg.w;
            p.layers!.push({ id: uid(), type: "image", name: "AI 정보 바", from: c.id, to: c.id, asset: kg.asset, x: tallK ? 0.5 : Math.min(0.5, 0.05 + w / 2), y: tallK ? 0.3 : 0.7, w, opacity: 1, anim: kg.anim, sticker: true, stk: { style: kg.style, text: kg.text, color: kg.color } } as Layer);
          }
          const sa = stkAsset[c.id], sv = stk[c.id];
          if (sa && sv) {
            const tall = p.ratio === "9:16" || p.ratio === "4:5";
            const k = Object.keys(stkAsset).indexOf(c.id);
            p.layers!.push({ id: uid(), type: "image", from: c.id, to: c.id, asset: sa.id, name: sv.item.name.replace(/_\d+(\.\w+)?$/, ""), x: k % 2 ? 0.25 : 0.75, y: pl.title ? 0.45 : 0.3, w: tall ? 0.5 : 0.3, opacity: 1, anim: stickerAnim(sv.spec.style), sticker: true, stk: sv.spec } as Layer);
          } else if (SX !== "none" && pl.sfx) {
            p.layers!.push({ id: uid(), type: "sfx", sfx: pl.sfx, name: SFX_LIST.find((s) => s.id === pl.sfx)?.label || pl.sfx, volume: 0.6, from: c.id, to: c.id } as Layer);
          }
        });
        // 자막 모양 — 팩의 자막 스타일 + 나타나기 (쇼츠 팩은 한 단어씩·말하는 단어 강조)
        {
          const sub = p.settings.subtitle;
          const lk = plan.look;
          const pre = pf.keepLook ? null : SUB_PRESETS.flatMap((g) => g.items).find((x) => x.id === P.sub);
          const anim: LayerAnim = { ...(sub.anim || {}), in: P.subIn as LayerAnim["in"], out: "fade", emph: undefined };
          // 쇼츠(세로) — 한 단어씩 + 말하는 단어 색+커지기 로 고정 (2026-10-20 사장님). 쇼츠 팩도 같다
          const shortsV = P.word || p.ratio === "9:16" || p.ratio === "4:5";
          if (shortsV) { anim.wshow = "word"; anim.whl = "both"; anim.wcolor = (lk && /^#[0-9a-f]{6}$/i.test(lk.wcolor || "") && lk.wcolor) || "#FFE000"; }
          else { anim.wshow = undefined; anim.whl = undefined; }
          p.settings.subtitle = { ...sub, ...(pre ? { ...(PLAIN_LOOK as Partial<typeof sub>), ...pre.look } : {}), anim };
        }
        cards(p); // 기본 인트로·아웃트로
        if (doTrans) softCuts(p, transType); // 화면이 바뀌는 곳마다 팩의 전환
        for (const it of flatten(p).items) { const tr = it.clip.trans; if (tr && !tr.sfx) { const sx = transSfx(tr.type); if (sx) tr.sfx = sx; } }
        const items = flatten(p).items.filter((x) => !x.clip.card);
        const first = items[0]?.clip.id, last = items[items.length - 1]?.clip.id;
        const tall = p.ratio === "9:16" || p.ratio === "4:5";
        // 제목 (왼쪽 위 · 세로는 위쪽 크게) · 채널명 (오른쪽 위)
        if (first && last && pf.titleOn && title.trim()) {
          p.layers!.push({ id: uid(), type: "text", name: "AI 제목", from: first, to: last, text: title.trim().slice(0, 30), pos: "top", align: tall ? "center" : "left", size: tall ? 95 : 55, color: P.title.fg, bold: true, box: true, boxColor: P.title.box, boxOpacity: P.title.op } as Layer);
        }
        if (first && last && pf.channelOn && channel.trim()) {
          p.layers!.push({ id: uid(), type: "text", name: "AI 채널명", from: first, to: last, text: channel.trim().slice(0, 24), ...(tall ? { x: 0.5, y: 0.16 } : { pos: "top", align: "right" }), size: tall ? 45 : 45, color: "#FFFFFF", bold: true, box: false, outline: "#000000", outlineWidth: 3 } as Layer);
        }
        // 구독·좋아요 — 움직이는 그래픽 한 번 (누르는 장면까지 다 보이게 3~4초, 짧은 클립이면 다음 클립까지 걸쳐서)
        if (subG && items.length) {
          const idx = pf.subAt === "start" ? Math.max(0, items.findIndex((x) => x.start >= 5)) : pf.subAt === "end" ? items.length - 1 : Math.floor(items.length / 2);
          const it = items[Math.max(0, idx)];
          const need = subG.clicks[subG.clicks.length - 1] + 1.4;
          const t0 = it.start + 0.2, t1 = t0 + need;
          const endIt = items.find((x) => x.start <= t1 && x.start + x.dur > t1) || items[items.length - 1];
          p.layers!.push({ id: uid(), type: "image", name: "AI 구독", from: it.clip.id, to: endIt.clip.id, ts: 0.2, te: Math.max(0.3, Math.min(endIt.dur, t1 - endIt.start)), asset: subG.asset, x: 0.5, y: subG.y, w: subG.w, opacity: 1, anim: subG.anim, sticker: true, stk: { style: subG.style, text: subG.text, color: subG.color }, clicks: subG.clicks } as Layer); // 누르는 순간마다 큰 딸깍
        }
        // 끝 화면 — 중개사무소 정보 (상호부터). 이미 넣은 끝 화면은 글만 고친다
        if (endTxt) {
          let card = p.scenes.flatMap((s) => s.clips).find((c) => c.card === "end");
          if (!card) {
            card = { id: uid(), type: "voice", text: "", words: [], voice: null, visual: null, hold: 5, sub: false, card: "end" } as Clip;
            p.scenes[p.scenes.length - 1].clips.push(card);
          }
          const cid = card.id;
          p.layers = p.layers!.filter((l) => !(l.name === "AI 끝 화면" && l.from === cid));
          if (endG) p.layers!.push({ id: uid(), type: "image", name: "AI 끝 화면", from: cid, to: cid, asset: endG.asset, x: 0.5, y: 0.5, w: tall ? 0.94 : 0.86, opacity: 1, anim: endG.anim, sticker: true, stk: { style: endG.style, text: endG.text, color: endG.color } } as Layer);
          else p.layers!.push({ id: uid(), type: "text", name: "AI 끝 화면", from: cid, to: cid, text: endTxt, pos: "middle", size: tall ? 52 : 46, color: "#FFFFFF", bold: true, box: true, boxColor: "#0B1A33", boxOpacity: 0.92 } as Layer);
        }
        if (music && first && last) p.layers!.push({ id: uid(), type: "music", from: first, to: last, ...music, volume: 0.03, fadeIn: 0, fadeOut: 2, offset: 0, loop: true } as Layer);
      });
      if (music) done.push({ n: 0, text: "", what: `배경음악 · ${music.name}` });
      if (endTxt) done.push({ n: 0, text: "", what: `끝 화면 · 부동산 표시광고 "${(pf.endDesign ? endDef?.label : P.end) || ""}" · ${agency?.name || "중개사무소 정보"} (5초)` });
      done.unshift({ n: 0, text: "", what: `스타일 팩 · ${P.label} (AI가 골랐어요) — ${P.desc}` });
      if (filled) done.unshift({ n: 0, text: "", what: `화면 채우기 · 빈 클립 ${filled}개 (내 사진·영상${pf.stock ? " · 무료" : ""}${pf.aiOn ? " · AI 이미지" : ""})` });
      setRows(done);
    } catch (e) {
      if (autoStart) apply((p) => { delete p.settings.aiAuto; delete p.settings.aiAutoReq; });
      setErr(errText(e));
    } finally {
      off();
      setBusy("");
    }
  };

  /* ── 오른쪽 화면 편집판 — 클립마다 바꾸기·빼기, 인트로·아웃트로·중간 쉼 넣기 (2026-10-21 사장님) ── */
  type PickFor = { mode: "char" } | { mode: "clip"; id: string } | { mode: "insert"; card: "intro" | "outro" | "pause"; after?: string } | { mode: "default"; card: "intro" | "outro" };
  const [pickFor, setPickFor] = useState<PickFor | null>(null); // [내 자료에서 고르기]를 한 장 고르기로 열었을 때
  const [menu, setMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [pauseMenu, setPauseMenu] = useState<{ after: string; x: number; y: number } | null>(null);
  const [stockFor, setStockFor] = useState<{ id: string; q: string; items: StockItem[] | null } | null>(null);
  const allItems = useMemo(() => flatten(project).items.filter((x) => x.clip.type !== "silence"), [project]);
  /** 클립 화면을 바꾸기 (한 번에 되돌리기 한 칸) */
  const setScreen = async (id: string, it: LibItem, from: NonNullable<Clip["fillFrom"]>) => {
    const a = await ensureAsset(it);
    apply((p) => {
      const c = p.scenes.flatMap((s) => s.clips).find((x) => x.id === id);
      if (!c) return;
      c.visual = { asset: a.id, s: 0 };
      c.fillFrom = from;
      if (a.kind === "video") c.visualHold = true;
      else delete c.visualHold;
      if (c.blank) { delete c.blank; if (c.opacity === 0) delete c.opacity; }
    });
  };
  const clearScreen = (id: string) => apply((p) => {
    const c = p.scenes.flatMap((s) => s.clips).find((x) => x.id === id);
    if (!c) return;
    c.visual = null;
    delete c.fillFrom;
    delete c.visualHold;
    // 촬영 클립(원본 영상) — 화면을 뗄 수 없으니 검은 화면으로 (소리는 그대로) · 빈칸으로 둔다
    if (c.type !== "voice" && c.src) c.blank = true;
  });
  /** 빈칸으로 두기 / 풀기 — AI 채우기가 건너뛴다 (2026-10-21 사장님) */
  const toggleBlank = (id: string) => apply((p) => {
    const c = p.scenes.flatMap((s) => s.clips).find((x) => x.id === id);
    if (!c) return;
    if (c.blank) { delete c.blank; if (c.opacity === 0) delete c.opacity; return; }
    c.blank = true;
    c.visual = null;
    delete c.fillFrom;
    delete c.visualHold;
  });
  /** 칸 넣기 — 인트로(맨 앞) · 아웃트로(끝 화면 앞) · 중간 쉼(그 클립 뒤) */
  const insertCard = async (card: "intro" | "outro" | "pause", it: LibItem | null, after?: string, same?: boolean) => {
    const a = it ? await ensureAsset(it) : null;
    apply((p) => {
      const clips = p.scenes.flatMap((s) => s.clips);
      if (card === "intro") { p.scenes[0]?.clips.unshift(cardClip("intro", a)); return; }
      if (card === "outro") {
        const last = p.scenes[p.scenes.length - 1].clips;
        const e = last.findIndex((c) => c.card === "end");
        last.splice(e >= 0 ? e : last.length, 0, cardClip("outro", a));
        return;
      }
      // 중간 쉼 — 그 클립 바로 뒤, 화면은 고른 것 또는 앞 화면 이어서 (1초)
      for (const sc of p.scenes) {
        const k = sc.clips.findIndex((c) => c.id === after);
        if (k < 0) continue;
        const prev = sc.clips[k];
        const pa = same && prev.visual ? p.assets[prev.visual.asset] : null;
        const c = cardClip("pause", a || pa || null, same && prev.visual ? prev.visual.s : 0, 1);
        if (!a && same && prev.visual) c.visual = { ...prev.visual };
        sc.clips.splice(k + 1, 0, c);
        return;
      }
      void clips;
    });
  };
  /** 끌어 옮기기 (2026-10-21 사장님: 클립별로 이동) — 글·목소리·화면이 함께, 놓은 클립 앞/뒤로. 편집 화면 moveClips 와 같은 방식 */
  const [dragId, setDragId] = useState("");
  const [dropAt, setDropAt] = useState<{ id: string; before: boolean } | null>(null);
  const moveClip = (id: string, target: string, before: boolean) => {
    if (!id || id === target) return;
    apply((p) => {
      let moved: Clip | null = null;
      for (const sc of p.scenes) {
        const k = sc.clips.findIndex((c) => c.id === id);
        if (k >= 0) { moved = sc.clips.splice(k, 1)[0]; break; }
      }
      if (!moved) return;
      for (const sc of p.scenes) {
        const k = sc.clips.findIndex((c) => c.id === target);
        if (k >= 0) { sc.clips.splice(before ? k : k + 1, 0, moved); moved = null; break; }
      }
      if (moved) p.scenes[p.scenes.length - 1]?.clips.push(moved);
      p.scenes = p.scenes.filter((sc, i) => sc.clips.length || i === 0);
    });
  };
  const removeCard = (id: string) => apply((p) => {
    for (const sc of p.scenes) sc.clips = sc.clips.filter((c) => c.id !== id);
    p.layers = (p.layers || []).filter((l) => !(l.from === id && l.to === id));
  });
  /** 한 장 고르기 창에서 골랐을 때 */
  const onPickOne = async (it: LibItem) => {
    const f = pickFor;
    setPicker(null);
    setPickFor(null);
    if (!f) return;
    try {
      if (f.mode === "char") { if (it.kind === "image" && !pf.charSheet.some((x) => x.id === it.id)) set("charSheet", [...pf.charSheet, it].slice(0, 3)); }
      else if (f.mode === "clip") await setScreen(f.id, it, it.source === "vacancy" ? "vacancy" : "mine");
      else if (f.mode === "insert") await insertCard(f.card, it, f.after);
      else set(f.card, it);
    } catch (e) {
      setErr(errText(e));
    }
  };
  const openPickOne = async (f: PickFor) => {
    setPickFor(f);
    setPickSel([]);
    setPicker(await b.lib.list({ kind: "all" }).catch(() => []));
  };
  /** 무료에서 찾기 — 검색어 (처음엔 그 클립 글 앞부분) */
  const stockSearch = async (q: string) => {
    if (!stockFor) return;
    setStockFor({ ...stockFor, q, items: null });
    const orient = orientOf();
    const none = Promise.resolve({ items: [] as StockItem[] });
    const [v, i] = await Promise.all([
      pf.stockKind === "photo" ? none : b.stock.search(q, "video", orient).catch(() => ({ items: [] as StockItem[] })),
      pf.stockKind === "video" ? none : b.stock.search(q, "photo", orient).catch(() => ({ items: [] as StockItem[] })),
    ]);
    setStockFor((s) => (s ? { ...s, items: [...(v.items || []).slice(0, 12), ...(i.items || []).slice(0, 12)] } : s));
  };
  const takeStock = async (x: StockItem) => {
    if (!stockFor) return;
    const id = stockFor.id;
    setStockFor(null);
    setBusy("무료 자료를 받는 중…");
    try {
      await setScreen(id, await b.stock.get(project.dir, x), "stock");
    } catch (e) {
      setErr(errText(e));
    }
    setBusy("");
  };
  /* ── 장면 설명 (영어 프롬프트) — 클립마다 다 만들어 둔다 (2026-10-21 사장님: 내 화면을 넣은 클립도, 나중에 AI 로 바꿀 때 바로 [그리기])
     왼쪽 ① 스타일을 먼저 고르고 만든다. 스타일을 바꾸면 주인공이 달라지는 스타일(공실이 등)만 설명을 다시 쓴다 — 나머지 스타일은 그림 그릴 때 붙는다 */
  const save = keep || apply;
  const pref = React.useRef(project);
  useEffect(() => { pref.current = project; }, [project]);
  const [picBusy, setPicBusy] = useState(""); // 장면 설명 쓰는 중 — 창은 막지 않는다
  const [picOpen, setPicOpen] = useState<Record<string, boolean>>({});
  const [picAll, setPicAll] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({}); // 고치는 중인 설명 (칸을 떠나면 저장)
  const [fix, setFix] = useState<Record<string, string>>({}); // 고쳐 달라는 말
  const [drawing, setDrawing] = useState<string[]>([]);
  const savePic = (id: string, patch: Partial<NonNullable<Clip["aiPic"]>>) => save((p) => {
    const c = p.scenes.flatMap((s) => s.clips).find((x) => x.id === id);
    if (c) c.aiPic = { prompt: "", ...(c.aiPic || {}), ...patch };
  });
  /** 글 AI 로 장면 설명 — ids 클립만 (스타일마다 따로 묶어 한 번씩) */
  const writePics = async (ids: string[], modify?: { current: string; request: string }, mode: "both" | "image" | "video" = "both") => {
    if (!b.ai.imagePrompts) throw new Error("공실스튜디오를 껐다 켜 주세요 (장면 설명 기능을 새로 연결해요)");
    if (mode === "video" && !b.ai.clipPrompts) throw new Error("공실스튜디오를 껐다 켜 주세요 (동영상 프롬프트 만들기를 새로 연결해요)");
    const cs = flatten(pref.current).items.map((x) => x.clip).filter((c) => ids.includes(c.id) && clipText(c).trim());
    const made: Record<string, string> = {};
    // [자동] — 아직 안 골랐거나 전체를 다시 만들 때: AI 가 스타일 하나를 고르며 프롬프트를 쓴다 (고쳐 달라는 말은 빼고)
    if (pf.aiStyle === "auto" && !modify && b.ai.clipPrompts && cs.length && (!pref.current.aiStyle || cs.length >= pickable.length)) {
      const r = await b.ai.clipPrompts(cs.map((c) => clipText(c)), {
        kinds: cs.map((c) => c.aiPic?.kind || "auto"), extra: pf.myPrompt.trim(), ai: aiUse,
        styles: IMAGE_STYLES.map((x) => ({ id: x.id, label: x.label, desc: x.desc, character: x.character })),
      });
      const res = Array.isArray(r) ? { style: "", clips: r } : r;
      const sid = IMAGE_STYLES.some((x) => x.id === res.style) ? res.style : "realistic";
      save((p) => {
        p.aiStyle = sid;
        for (const [i, c0] of cs.entries()) {
          const c = p.scenes.flatMap((s) => s.clips).find((x) => x.id === c0.id);
          const o = res.clips[i];
          if (!c || !o) continue;
          const mot = mode !== "image" && o.motion ? { motion: o.motion, motionId: "ai" } : {};
          if (mode === "video" && c.aiPic?.prompt) c.aiPic = { ...c.aiPic, ...mot, by: sid };
          else if (o.image) c.aiPic = { ...(c.aiPic || {}), prompt: o.image, by: sid, hand: false, stale: false, ...mot };
          if (o.image) made[c.id] = o.image;
        }
      });
      setDraft((d) => { const n = { ...d }; for (const c of cs) delete n[c.id]; return n; });
      setMotionDraft((d) => { const n = { ...d }; for (const c of cs) delete n[c.id]; return n; });
      setNote(`AI가 이 영상에 맞는 이미지 스타일로 [${allStyles.find((x) => x.id === sid)?.label}]을 골랐어요 — 모든 클립에 같아요`);
      return made;
    }
    const groups = new Map<string, Clip[]>();
    for (const c of cs) { const k = picStyle(c).id; groups.set(k, [...(groups.get(k) || []), c]); }
    for (const [sid, list] of groups) {
      const sty = allStyles.find((x) => x.id === sid)!;
      // 이미지 + 동영상 프롬프트 한 번에 (앱 0.1.12부터) — 고쳐 달라는 말(modify)은 이미지 프롬프트만
      const both0 = !modify && mode !== "image" && b.ai.clipPrompts ? await b.ai.clipPrompts(list.map((c) => clipText(c)), { kinds: list.map((c) => c.aiPic?.kind || "auto"), style: sty.label, character: sty.character, extra: pf.myPrompt.trim(), ai: aiUse }) : null;
      const both = both0 ? (Array.isArray(both0) ? both0 : both0.clips) : null;
      const out = both ? both.map((x) => x.image) : await b.ai.imagePrompts(list.map((c) => clipText(c)), { kinds: list.map((c) => c.aiPic?.kind || "auto"), style: sty.label, character: sty.character, modify, ai: aiUse });
      save((p) => {
        for (const [i, c0] of list.entries()) {
          const c = p.scenes.flatMap((s) => s.clips).find((x) => x.id === c0.id);
          if (!c || !out[i]) continue;
          const mot = both && both[i]?.motion ? { motion: both[i].motion, motionId: "ai" } : {};
          // [동영상 프롬프트 만들기] — 이미지 프롬프트는 그대로 (없을 때만 채운다)
          if (mode === "video" && c.aiPic?.prompt) c.aiPic = { ...c.aiPic, ...mot };
          else c.aiPic = { ...(c.aiPic || {}), prompt: out[i], by: sid, hand: false, stale: false, ...mot };
        }
      });
      if (both) setMotionDraft((d) => { const n = { ...d }; for (const c of list) delete n[c.id]; return n; });
      list.forEach((c, i) => { if (out[i]) made[c.id] = out[i]; });
      setDraft((d) => { const n = { ...d }; for (const c of list) delete n[c.id]; return n; });
    }
    return made;
  };
  const runPics = async (ids: string[], msg: string, modify?: { current: string; request: string }, mode: "both" | "image" | "video" = "both") => {
    if (!ids.length) return;
    setPicBusy(msg);
    try {
      await writePics(ids, modify, mode);
    } catch (e) {
      setErr(errText(e));
    } finally {
      setPicBusy("");
    }
  };
  /** 그리기 전에 장면 설명을 다시 써야 하는지 — 설명이 없거나, 자동·배경·인물·그래프를 바꿨거나, 스타일을 주인공이 다른 것(공실이 등)으로 바꿨을 때
   *  (2026-10-21 사장님: 고를 때마다 바로 만들지 말고 그릴 때 한 번에) — 직접 고친 설명은 스타일이 바뀌어도 그대로 */
  const charOf = (id?: string) => allStyles.find((x) => x.id === id)?.character || "";
  const needsWrite = (c: Clip) => !c.aiPic?.prompt || Boolean(c.aiPic.stale) || (!c.aiPic.hand && charOf(c.aiPic.by) !== (picStyle(c).character || ""));

  /** 그림 한 장 — 이 클립 장면 설명 + 스타일 (없으면 대본 글) */
  const drawPic = async (c: Clip, made?: string) => {
    const orient = orientOf();
    const desc = (made || draft[c.id] || c.aiPic?.prompt) || clipText(c) || "부동산 매물 소개 장면";
    return b.ai.image(project.dir, `${imagePrompt(desc, picStyle(c))}${mine()} ${orient === "portrait" ? "Vertical 9:16 composition." : orient === "square" ? "Square composition." : "Horizontal 16:9 composition."}`, { ratio: project.ratio, ...refs(), ai: aiUse });
  };
  const aiOne = async (id: string) => {
    const c = flatten(pref.current).items.find((x) => x.clip.id === id)?.clip;
    if (!c) return;
    setErr("");
    setDrawing((v) => [...v, id]);
    try {
      const made = needsWrite(c) && clipText(c).trim() ? (await writePics([id]))[id] : undefined;
      await setScreen(id, await drawPic(c, made), "ai");
    } catch (e) {
      setErr(errText(e));
    }
    setDrawing((v) => v.filter((x) => x !== id));
  };
  /** AI 영상 한 편 — 클립마다 하나씩 (2026-10-21 사장님: 영상은 비싸고 오래 걸려 [빈칸 모두 그리기]에는 안 넣는다)
   *  그 클립 화면이 그림이면 첫 장면으로 써서 움직이게 (그림 → 영상), 없으면 장면 설명만으로 */
  const [vidAsk, setVidAsk] = useState(""); // 만들기 전 확인 (요금·시간)
  const [motionDraft, setMotionDraft] = useState<Record<string, string>>({});
  const [saveName, setSaveName] = useState<{ id: string; name: string } | null>(null); // [내 견본으로 저장] 이름 칸
  const [myMotions, setMyMotions] = useState<Motion[]>(() => {
    try { return JSON.parse(localStorage.getItem(MY_MOTION_KEY) || "[]"); } catch { return []; }
  });
  const keepMotions = (list: Motion[]) => { setMyMotions(list); try { localStorage.setItem(MY_MOTION_KEY, JSON.stringify(list)); } catch {} };
  /** 돌려주는 것: true 만듦 · false 못 만듦 · "stop" [중지] (여러 개 만들 때 멈춘다) */
  const makeVideo = async (id: string): Promise<boolean | "stop"> => {
    setVidAsk("");
    const c = flatten(pref.current).items.find((x) => x.clip.id === id)?.clip;
    if (!c) return false;
    if (!b.ai.video) { setErr("공실스튜디오를 껐다 켜 주세요 (AI 영상 기능을 새로 연결해요 — 앱 0.1.12부터)"); return "stop"; }
    let r: boolean | "stop" = false;
    setErr("");
    setDrawing((v) => [...v, id]);
    try {
      const a = c.visual ? pref.current.assets[c.visual.asset] : null;
      if (!a || a.kind !== "image") throw new Error("동영상은 사진으로 만들어요 — 먼저 이 클립 사진을 그리거나 넣어 주세요.");
      const motion = (motionDraft[c.id] ?? c.aiPic?.motion ?? "").trim() || AUTO_MOTION; // 비어 있으면 [자동]
      const desc = (draft[c.id] || c.aiPic?.prompt || clipText(c)).trim();
      // 첫 장면 = 이 사진 (그림 → 동영상). 움직임이 주인공, 장면 설명은 무엇이 보이는지 참고로
      const it = await b.ai.video(project.dir, `${motion}\nScene (keep it exactly as in the first frame): ${desc}`, { ratio: project.ratio, image: a.path });
      await setScreen(id, it, "ai");
      r = true;
    } catch (e) {
      if (isStopped(e)) r = "stop";
      else setErr(`${clipName(noOf(id))}: ${errText(e)}`);
    }
    setDrawing((v) => v.filter((x) => x !== id));
    return r;
  };
  const drawAll = async () => {
    setErr("");
    try {
      await drawEmpty();
    } catch (e) {
      if (!isStopped(e)) setErr(errText(e));
      setBusy("");
    }
  };
  /** 빈칸 모두 그리기 — 고른 빈칸(안 골랐으면 빈칸 모두), 설명이 없으면 먼저 쓰고. 한 번에 넣어 되돌리기 한 칸 */
  const drawEmpty = async () => {
    // 고른 클립이 있으면 그것만 (화면이 있어도 AI 그림으로 바꾼다), 없으면 빈칸 모두
    const pick = (c: Clip) => !c.card && !c.blank && clipText(c).trim() && (selEmpty.length ? selEmpty.includes(c.id) : !screenOf(c));
    const need = flatten(pref.current).items.map((x) => x.clip).filter((c) => pick(c) && needsWrite(c)).map((c) => c.id);
    const made = need.length ? (setBusy(`${writer}가 장면 설명을 쓰는 중…`), await writePics(need)) : {};
    const todo = flatten(pref.current).items.map((x) => x.clip).filter(pick);
    const got: { id: string; a: Asset }[] = [];
    let stopped = false;
    for (const [i, c] of todo.entries()) {
      setBusy(`${imager}가 빈칸을 그리는 중… (${i + 1}/${todo.length}) — 한 장에 30초~1분`);
      try {
        got.push({ id: c.id, a: await ensureAsset(await drawPic(c, made[c.id])) });
      } catch (e) {
        if (isStopped(e)) { stopped = true; break; } // [중지] — 그린 것까지만 넣는다
        setErr(`${flat.findIndex((x) => x.clip.id === c.id) + 1}번 클립: ${errText(e)}`);
      }
    }
    if (got.length) apply((p) => {
      for (const g of got) {
        const c = p.scenes.flatMap((s) => s.clips).find((x) => x.id === g.id);
        if (c) { c.visual = { asset: g.a.id, s: 0 }; c.fillFrom = "ai"; delete c.visualHold; }
      }
    });
    setSelEmpty([]);
    setNote(todo.length ? `${selEmpty.length ? "고른 클립" : "빈칸"} ${todo.length}개 중 ${got.length}개를 AI 그림으로 채웠어요${stopped ? " — 중지했어요" : ""}` : "");
    setBusy("");
    if (stopped) throw new Error("중지했어요");
  };

  /* ── 화면 ── */
  const chip = (on: boolean): React.CSSProperties => ({ height: 34, padding: "0 13px", borderRadius: 5, border: `1px solid ${on ? C.text : C.line2}`, background: on ? C.text : "transparent", color: on ? C.bg : C.sub, fontSize: 13.5, fontWeight: 700, fontFamily: FONT, cursor: "pointer" });
  let no = 0;
  const head = (text: React.ReactNode, right?: React.ReactNode) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
      <span style={{ width: 22, height: 22, flexShrink: 0, borderRadius: 11, background: C.accent, color: "#fff", fontSize: 12.5, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{++no}</span>
      <span style={{ fontSize: 15, fontWeight: 800, flex: 1 }}>{text}</span>
      {right}
    </div>
  );
  const sec: React.CSSProperties = { padding: "16px 0", borderBottom: `1px solid ${C.line}` };
  /** [더 바꾸기] 안 — 번호 없이 접는 칸 */
  const fold2 = (id: string, title: string, summary: string, body: React.ReactNode) => (
    <div style={sec}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 800, flex: 1 }}>{title} <span style={{ fontSize: 12.5, color: C.sub, fontWeight: 600 }}>· {summary}</span></span>
        <button type="button" onClick={() => setOpen((o) => ({ ...o, [id]: !o[id] }))} style={{ ...chip(false), height: 28, padding: "0 10px", fontSize: 12.5 }}>{open[id] ? "접기" : "바꾸기"}</button>
      </div>
      {open[id] && <div style={{ marginTop: 8 }}>{body}</div>}
    </div>
  );

  /** 화면 편집판 클립 아래 — 장면 설명 (접힘: 한 줄 미리보기 / 펼침: 사진·영상 · 스타일 · 자동·배경·인물·그래프 · 설명 · 고쳐 달라는 말 · [그리기]) */
  /* ── 고른 클립으로 한 번에 (2026-10-21 사장님) — 프롬프트 TXT 내보내기 · 이미지 만들기 · 동영상 만들기 · 한 번에 올리기 · Flow ──
     고른 클립이 없으면 전체. 이름은 clip 1, clip 2 … (TXT·올리기 짝 맞추기 모두 같은 이름) */
  const clipName = (n: number) => `clip ${n + 1}`;
  const scopeIds = selEmpty.length ? flat.filter((x) => selEmpty.includes(x.clip.id)).map((x) => x.clip.id) : pickable;
  // 만들어진 프롬프트가 있으면 [받기] 단추가 보인다
  const scopeHasImg = flat.some((x) => scopeIds.includes(x.clip.id) && x.clip.aiPic?.prompt);
  const scopeHasMotion = flat.some((x) => scopeIds.includes(x.clip.id) && x.clip.aiPic?.motion);
  const scopeClips = () => flatten(pref.current).items.filter((x) => scopeIds.includes(x.clip.id)).map((x) => x.clip);
  const noOf = (id: string) => flat.findIndex((x) => x.clip.id === id);
  const [batchAsk, setBatchAsk] = useState(false); // 동영상 여러 개 — 만들기 전 확인
  const [upPlan, setUpPlan] = useState<{ id: string; n: number; item: LibItem }[] | null>(null); // 한 번에 올리기 — 짝 목록
  /** TXT 내려받기 — Flow 에 그대로 붙여 넣는 모양 ([clip 1] … ------) */
  const saveTxt = (what: "image" | "video") => {
    const cs = scopeClips();
    const lines: string[] = [];
    let miss = 0;
    for (const c of cs) {
      const sty = picStyle(c);
      const pr = (draft[c.id] ?? c.aiPic?.prompt ?? "").trim();
      if (!pr) { miss++; continue; }
      const head = `[${clipName(noOf(c.id))}]`;
      const extra = mine().replace(/\n/g, " ").trim();
      if (what === "image") lines.push(`${head}\r\nNarrative: ${clipText(c)}\r\nStyle: ${sty.label} — NO TEXT, NO WORDS, NO SPEECH BUBBLES\r\nVisual Prompt: ${imagePrompt(pr, sty)}${extra ? ` ${extra}` : ""}\r\n-----------------------------------`);
      else {
        // Flow 용 — 사진이 없어도 글만으로 만들 수 있게 하나로 (2026-10-21 사장님): 화풍 + 장면(이미지 프롬프트) + 맞춤 프롬프트 + 움직임 + 같은 인물 + 글자 없음
        const motion = (motionDraft[c.id] ?? c.aiPic?.motion ?? "").trim() || AUTO_MOTION;
        const a = c.visual ? project.assets[c.visual.asset] : null;
        const parts = [
          imagePrompt(pr, sty),
          extra,
          `Camera & motion: ${motion}`,
          pf.charSheet.length ? "Same character in every clip (use the character sheet ingredient)." : "Keep the same people and place consistent across clips.",
          "No text, no subtitles, no logos.",
        ].filter(Boolean);
        lines.push(`${head}\r\nVideo Prompt: ${parts.join(" ")}${a && a.kind === "image" ? `\r\nFirst frame (optional): ${clipName(noOf(c.id))} image` : ""}\r\n-----------------------------------`);
      }
    }
    if (!lines.length) return setErr("내보낼 프롬프트가 없어요 — 먼저 아래 [프롬프트 만들기]를 눌러 주세요.");
    // 머리말 — Flow 쓰는 법 (2026-10-21 사장님: 캐릭터 시트는 Flow 재료로 직접 올린다)
    const sty0 = styleOf(undefined);
    const header = [
      `# 공실스튜디오 — ${project.name || "무제"} · ${what === "image" ? "이미지" : "동영상"} 프롬프트 · 이미지 스타일: ${sty0.label} · ${lines.length}개 clip`,
      "# [clip N] 아래 프롬프트를 하나씩 Flow에 붙여 넣으세요. 만든 파일 이름을 clip 1, clip 2 … 로 바꾸면 [한 번에 올리기]에서 바로 맞춰져요.",
      pf.charSheet.length ? "# 캐릭터 시트 사진은 Flow의 재료(참고 이미지)로 직접 올려 주세요 — 모든 clip에 같은 인물이 나와요." : "",
      what === "video" ? "# 첫 장면 이미지가 있는 clip은 그 이미지를 첫 프레임으로 올리면 더 똑같이 나와요. 없어도 글만으로 만들 수 있어요." : "",
    ].filter(Boolean).join("\r\n");
    const blob = new Blob(["﻿" + header + "\r\n\r\n" + lines.join("\r\n\r\n") + "\r\n"], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${project.name || "무제"}_${what === "image" ? "이미지프롬프트" : "동영상프롬프트"}.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    setErr("");
    setNote(`${lines.length}개 클립 ${what === "image" ? "이미지" : "동영상"} 프롬프트를 TXT로 내보냈어요${miss ? ` · 프롬프트가 없는 ${miss}개는 뺐어요` : ""}`);
  };
  /** 동영상 여러 개 — 사진이 있는 클립만 차례로, [중지]면 멈춘다 */
  const videoTargets = () => scopeClips().filter((c) => { const a = c.visual ? project.assets[c.visual.asset] : null; return a && a.kind === "image"; });
  const makeVideos = async () => {
    setBatchAsk(false);
    const list = videoTargets();
    let ok = 0;
    for (const [i, c] of list.entries()) {
      setBusy(`Gemini가 동영상을 만드는 중… (${i + 1}/${list.length}) — ${clipName(noOf(c.id))}`);
      const r = await makeVideo(c.id);
      if (r === "stop") break;
      if (r) ok++;
    }
    setBusy("");
    setNote(`동영상 ${list.length}개 중 ${ok}개를 만들었어요`);
  };
  /** 한 번에 올리기 — 파일 이름 속 번호(clip 1 · clip01 · 1.png)로 클립에 맞추고, 번호가 없으면 남은 클립에 이름순으로 */
  const bulkPick = async () => {
    const items = (await b.lib.pick().catch(() => [])).filter((x) => x.kind === "image" || x.kind === "video");
    if (!items.length) return;
    const numOf = (name: string) => {
      const base = name.replace(/\.[^.]+$/, "");
      const m = /clip[\s_-]*0*(\d{1,3})/i.exec(base) || /^0*(\d{1,3})(?!\d)/.exec(base) || /(?:^|[\s_-])0*(\d{1,3})$/.exec(base);
      return m ? Number(m[1]) : 0;
    };
    const plan: { id: string; n: number; item: LibItem }[] = [];
    const rest: LibItem[] = [];
    for (const it of items) {
      const k = numOf(it.name || "");
      if (k >= 1 && k <= flat.length) plan.push({ id: flat[k - 1].clip.id, n: k - 1, item: it });
      else rest.push(it);
    }
    rest.sort((x, y) => String(x.name).localeCompare(String(y.name), "ko", { numeric: true }));
    const free = flat.map((x, n) => ({ id: x.clip.id, n })).filter((x) => !plan.some((p) => p.id === x.id));
    for (const it of rest) { const f = free.shift(); if (f) plan.push({ ...f, item: it }); }
    // 같은 클립에 사진·동영상이 둘 다 있으면 동영상
    const one = new Map<string, { id: string; n: number; item: LibItem }>();
    for (const p of plan) { const o = one.get(p.id); if (!o || (p.item.kind === "video" && o.item.kind !== "video")) one.set(p.id, p); }
    setUpPlan([...one.values()].sort((x, y) => x.n - y.n));
  };
  const bulkPut = async () => {
    const plan = upPlan || [];
    setUpPlan(null);
    setBusy("올린 파일을 클립에 넣는 중…");
    try {
      const got: { id: string; a: Asset; ai: boolean }[] = [];
      for (const p of plan) got.push({ id: p.id, a: await ensureAsset(p.item), ai: /^AI|flow|veo|gemini/i.test(p.item.name || "") });
      apply((pp) => {
        for (const g of got) {
          const c = pp.scenes.flatMap((s) => s.clips).find((x) => x.id === g.id);
          if (!c) continue;
          c.visual = { asset: g.a.id, s: 0 };
          c.fillFrom = g.ai ? "ai" : "mine";
          if (g.a.kind === "video") c.visualHold = true;
          else delete c.visualHold;
        }
      });
      setNote(`${got.length}개 파일을 클립에 넣었어요 — 끌어서 바꾸거나 [바꾸기]로 고쳐요`);
    } catch (e) {
      setErr(errText(e));
    }
    setBusy("");
  };
  /** 동영상 칸 (선택 — [동영상]을 고른 클립에서만, 사진이 있어야 만든다) */
  // Gemini API 키 — [AI 설정]에 넣었는지 (모르면 null = 막지 않는다). 2026-10-21 사장님: 없으면 누를 때 경고
  const gemKey: boolean | null = aiList.length ? Boolean((aiList as { id: string; keyHas?: boolean }[]).find((x) => x.id === "gemini")?.keyHas) : null;
  const [noKeyFor, setNoKeyFor] = useState("");
  const openAiSettings = () => (window as unknown as { gongsilStudio?: { openAiConnect?: () => void } }).gongsilStudio?.openAiConnect?.();
  const videoBox = (c: Clip) => {
    const a = c.visual ? project.assets[c.visual.asset] : null;
    const pic = Boolean(a && a.kind === "image");
    const isVid = Boolean(a && a.kind === "video" && c.fillFrom === "ai");
    const motion = motionDraft[c.id] ?? c.aiPic?.motion ?? "";
    const run = drawing.includes(c.id);
    const all = [...MOTIONS, ...myMotions];
    const sm = (on: boolean): React.CSSProperties => ({ ...chip(on), height: 24, padding: "0 8px", fontSize: 12 });
    const pick = (m: Motion) => { setMotionDraft((d) => { const n = { ...d }; delete n[c.id]; return n; }); savePic(c.id, { motion: m.prompt, motionId: m.id }); };
    const saveMine = () => {
      if (!saveName || !saveName.name.trim() || !motion.trim()) return;
      keepMotions([...myMotions, { id: "my" + Date.now(), label: saveName.name.trim().slice(0, 16), prompt: motion.trim() }]);
      setSaveName(null);
    };
    return (
      <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px dashed ${C.line2}` }}>
        <div style={{ fontSize: 12.5, fontWeight: 800, marginBottom: 6 }}>동영상 <span style={{ color: C.dim, fontWeight: 600 }}>· 이 클립 사진을 첫 장면으로 움직여요 · 회원 Gemini API 키 (유료 등급)</span></div>
        {!pic && !isVid && <div style={{ fontSize: 12, color: "#facc15", marginBottom: 6 }}>먼저 위에서 사진을 그리거나 넣어 주세요 — 동영상은 그 사진으로 만들어요.</div>}
        {isVid && <div style={{ fontSize: 12, color: C.sub, marginBottom: 6 }}>이 클립은 이미 AI 동영상이에요. 다시 만들려면 [그려서 바꾸기]로 사진을 먼저 만든 뒤 만들어요.</div>}
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {all.map((m) => {
            const mine = myMotions.some((x) => x.id === m.id);
            return (
              <span key={m.id} style={{ display: "inline-flex", alignItems: "center" }}>
                <button type="button" title={m.prompt || "영상 AI가 장면에 맞는 움직임을 골라요"} onClick={() => pick(m)} style={sm(motionDraft[c.id] === undefined && (m.id === "auto" ? !c.aiPic?.motion : c.aiPic?.motionId === m.id))}>{mine ? "★ " : ""}{m.label}</button>
                {mine && <button type="button" title="내 견본 지우기" onClick={() => keepMotions(myMotions.filter((x) => x.id !== m.id))} style={{ ...mini, marginLeft: 2, background: "transparent", color: C.dim }}>×</button>}
              </span>
            );
          })}
        </div>
        <textarea value={motion} rows={2} placeholder="[자동] — 비워 두면 영상 AI가 장면에 맞는 움직임을 골라요. 견본을 누르거나 직접 써도 돼요 (예: Slow push-in toward the sofa)"
          onChange={(e) => setMotionDraft((d) => ({ ...d, [c.id]: e.target.value }))} onKeyDown={(e) => e.stopPropagation()}
          onBlur={() => { if (motionDraft[c.id] !== undefined && motionDraft[c.id] !== (c.aiPic?.motion || "")) savePic(c.id, { motion: motionDraft[c.id], motionId: "" }); }}
          style={{ width: "100%", boxSizing: "border-box", marginTop: 6, padding: 8, borderRadius: 6, border: `1px solid ${C.line2}`, background: C.bg, color: C.text, fontSize: 12.5, lineHeight: 1.5, fontFamily: FONT, resize: "vertical" }} />
        <div style={{ display: "flex", gap: 6, marginTop: 6, alignItems: "center" }}>
          {saveName?.id === c.id ? (
            <>
              <input autoFocus value={saveName.name} onChange={(e) => setSaveName({ id: c.id, name: e.target.value })} placeholder="견본 이름 (예: 거실 천천히)"
                onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Enter") saveMine(); if (e.key === "Escape") setSaveName(null); }}
                style={{ ...input, height: 28, fontSize: 12.5, width: 180 }} />
              <Btn small disabled={!saveName.name.trim() || !motion.trim()} onClick={saveMine}>저장</Btn>
              <Btn small onClick={() => setSaveName(null)}>취소</Btn>
            </>
          ) : <Btn small disabled={!motion.trim()} onClick={() => setSaveName({ id: c.id, name: "" })}>★ 내 견본으로 저장</Btn>}
          <span style={{ flex: 1 }} />
          <Btn small primary disabled={!pic || run || Boolean(busy)} onClick={() => { if (gemKey === false) { setVidAsk(""); setNoKeyFor(noKeyFor === c.id ? "" : c.id); return; } setNoKeyFor(""); setVidAsk(vidAsk === c.id ? "" : c.id); }}>{run ? "만드는 중…" : "동영상 만들기"}</Btn>
        </div>
        {noKeyFor === c.id && gemKey === false && (
          <div style={{ marginTop: 8, padding: 10, borderRadius: 6, border: "1px solid #facc15", background: "rgba(250,204,21,0.08)", fontSize: 12.5, lineHeight: 1.6 }}>
            <b style={{ color: "#facc15" }}>⚠ Gemini API 키가 없어요</b><br />
            AI 동영상은 회원 본인의 <b>Gemini API 키(유료 등급)</b>로만 만들 수 있어요. 계정 연결(웹 창)로는 동영상을 만들 수 없어요.<br />
            [AI 설정]에서 Gemini API 키를 넣은 뒤 다시 눌러 주세요. 키는 Google AI Studio에서 만들고, 결제(유료 등급)를 켜야 해요.
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              <Btn small primary onClick={() => { setNoKeyFor(""); openAiSettings(); }}>AI 설정 열기</Btn>
              <Btn small onClick={() => setNoKeyFor("")}>닫기</Btn>
            </div>
          </div>
        )}
        {vidAsk === c.id && (
          <div style={{ marginTop: 8, padding: 10, borderRadius: 6, border: `1px solid ${C.accent}`, background: C.bg, fontSize: 12.5, lineHeight: 1.6 }}>
            <b>AI 동영상 1편 만들기</b> — Gemini Omni Flash · 회원 Gemini API 키 (유료 등급만)<br />
            요금: 720p 초당 약 $0.10 (만들어진 영상만, Google 가격표 2026-10-21) · 보통 1~3분 · 만드는 동안 [중지] 가능<br />
            이 클립 사진을 첫 장면으로 써서 {motion.trim() ? "위 프롬프트대로" : "장면에 맞는 움직임으로 (자동)"} 움직여요. 다 만들면 이 클립 화면이 동영상으로 바뀌어요 (되돌리기 가능).
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              <Btn small primary onClick={() => void makeVideo(c.id)}>만들기</Btn>
              <Btn small onClick={() => setVidAsk("")}>취소</Btn>
            </div>
          </div>
        )}
      </div>
    );
  };
  const picRow = (c: Clip) => {
    const on = picAll || picOpen[c.id];
    const pic = c.aiPic;
    const sty = picStyle(c);
    const text = draft[c.id] ?? pic?.prompt ?? "";
    const run = drawing.includes(c.id);
    const has = Boolean(screenOf(c));
    const redo = Boolean(pic?.prompt) && needsWrite(c);
    const small = (sel: boolean): React.CSSProperties => ({ ...chip(sel), height: 24, padding: "0 8px", fontSize: 12 });
    return (
      <div style={{ margin: "0 8px 2px 144px" }}>
        <button type="button" onClick={() => setPicOpen((o) => ({ ...o, [c.id]: !on }))} title={on ? "접기" : "장면 설명 펼치기"}
          style={{ width: "100%", display: "flex", alignItems: "center", gap: 6, height: 22, padding: 0, border: 0, background: "transparent", color: C.dim, fontSize: 12, fontFamily: FONT, cursor: "pointer", textAlign: "left" }}>
          <span style={{ flexShrink: 0 }}>{on ? "▾" : "▸"} 장면 설명</span>
          <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontStyle: text ? "normal" : "italic" }}>{text || (picBusy ? "쓰는 중…" : "아직 없어요")}</span>
          {redo && <span style={{ flexShrink: 0, color: "#facc15" }}>바뀜 · 그릴 때 다시 써요</span>}
          <span style={{ flexShrink: 0, color: C.dim }}>{sty.label}{pic?.media === "video" ? " · 동영상" : ""}</span>
          {/* 이 클립만 프롬프트 만들기 (2026-10-21 사장님: 꼭 다 만들어야 해서 불편) — 펼치지 않아도 바로 */}
          <span role="button" title="이 클립만 이미지·동영상 프롬프트를 AI가 써요" onClick={(e) => { e.stopPropagation(); if (!picBusy && !busy) void runPics([c.id], `${clipName(flat.findIndex((y) => y.clip.id === c.id))} 프롬프트를 쓰는 중…`); }}
            style={{ flexShrink: 0, height: 20, padding: "0 8px", borderRadius: 10, border: `1px solid ${C.accent}`, color: C.accent, fontSize: 11.5, fontWeight: 700, lineHeight: "18px", opacity: picBusy || busy ? 0.4 : 1 }}>{text ? "↻ 이 클립만 다시" : "✎ 이 클립만 만들기"}</span>
        </button>
        {on && (
          <div style={{ padding: 8, margin: "2px 0 6px", borderRadius: 6, border: `1px solid ${C.line2}`, background: C.card }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
              <button type="button" onClick={() => savePic(c.id, { media: "image" })} style={small(pic?.media !== "video")}>사진</button>
              <button type="button" onClick={() => savePic(c.id, { media: "video" })} title="사진으로 동영상 만들기 (선택 · API 키)" style={small(pic?.media === "video")}>동영상</button>
              <span style={{ fontSize: 12, color: C.dim, marginLeft: 6 }}>스타일: {styleOf(undefined).label} (모든 클립 같음 · 왼쪽에서 바꿔요)</span>
              <button type="button" disabled={Boolean(picBusy)} title="이 클립 이미지·동영상 프롬프트를 AI가 다시 써요" onClick={() => void runPics([c.id], `${clipName(flat.findIndex((y) => y.clip.id === c.id))} 프롬프트를 다시 쓰는 중…`)} style={{ ...small(false), marginLeft: 6 }}>↻ 프롬프트 다시 만들기</button>
              <span style={{ width: 8 }} />
              {PIC_KINDS.map(([k, l]) => <button key={k} type="button" disabled={Boolean(picBusy)} title={`${l} 중심으로 — 그릴 때 설명을 다시 써요`}
                onClick={() => { if ((pic?.kind || "auto") !== k) savePic(c.id, { kind: k, stale: true }); }} style={small((pic?.kind || "auto") === k)}>{l}</button>)}
            </div>
            <textarea value={text} rows={3} placeholder="장면 설명 (영어) — 창을 열면 AI가 써 두고, 직접 고쳐도 돼요"
              onChange={(e) => setDraft((d) => ({ ...d, [c.id]: e.target.value }))} onKeyDown={(e) => e.stopPropagation()}
              onBlur={() => { if (draft[c.id] !== undefined && draft[c.id] !== (pic?.prompt || "")) savePic(c.id, { prompt: draft[c.id], hand: true }); }}
              style={{ width: "100%", boxSizing: "border-box", marginTop: 6, padding: 8, borderRadius: 6, border: `1px solid ${C.line2}`, background: C.bg, color: C.text, fontSize: 12.5, lineHeight: 1.5, fontFamily: FONT, resize: "vertical" }} />
            <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
              <input value={fix[c.id] || ""} onChange={(e) => setFix((f) => ({ ...f, [c.id]: e.target.value }))} placeholder="고쳐 달라는 말 (예: 밤 장면으로)" disabled={!text}
                onKeyDown={(e) => { e.stopPropagation(); const t = (fix[c.id] || "").trim(); if (e.key === "Enter" && t) { setFix((f) => ({ ...f, [c.id]: "" })); void runPics([c.id], "장면 설명을 고치는 중…", { current: text, request: t }); } }}
                style={{ ...input, flex: 1, minWidth: 0, height: 30, fontSize: 12.5 }} />
              <Btn small disabled={run || Boolean(busy)} onClick={() => void aiOne(c.id)}>{run ? "그리는 중…" : has ? "그려서 바꾸기" : "그리기"}</Btn>
            </div>
            {pic?.media === "video" && videoBox(c)}
          </div>
        )}
      </div>
    );
  };

  const topChip: React.CSSProperties = { height: 30, padding: "0 10px", display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 6, border: `1px solid ${C.line2}`, background: C.card, color: C.text, fontSize: 13, fontWeight: 700, fontFamily: FONT, cursor: "pointer" };
  const openTop = (what: "kind" | "ratio") => (e: React.MouseEvent<HTMLButtonElement>) => { const r = e.currentTarget.getBoundingClientRect(); setTopMenu({ what, x: r.left, y: r.bottom + 4 }); };
  const titleBar = (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
      {mode === "make" ? "AI 이미지·영상 제작" : "AI 자동 영상 편집 · 초안"}
      <button type="button" title="영상 종류 바꾸기" onClick={openTop("kind")} onPointerDown={(e) => e.stopPropagation()} style={topChip}>
        <Icon name={KIND_ICON[kind]} size={14} />{KIND_LABEL[kind]}<Icon name="down" size={12} />
      </button>
      <button type="button" title="화면 비율 바꾸기" onClick={openTop("ratio")} onPointerDown={(e) => e.stopPropagation()} style={topChip}>
        <RatioBox ratio={project.ratio} size={14} />{RATIO_LABEL[project.ratio]} {project.ratio}<Icon name="down" size={12} />
      </button>
    </span>
  );

  const footer = rows ? (
    <>
      <Btn onClick={() => { for (let k = 0; k < Math.max(1, steps.current); k++) onUndo(); steps.current = 0; setRows(null); }}><Icon name="undo" size={15} />한 번에 되돌리기</Btn>
      <Btn primary onClick={onClose} style={{ height: 46, padding: "0 26px", fontSize: 16 }}><Icon name="check" size={17} />확인</Btn>
    </>
  ) : (
    <>
      {mode === "auto" ? (
        <>
          <Btn onClick={onClose}>닫기</Btn>
          <Btn primary disabled={Boolean(busy)} onClick={() => void start()} style={{ height: 46, padding: "0 26px", fontSize: 16 }}><Icon name="ai" size={18} />{busy ? "편집하는 중…" : "AI 자동 편집 시작"}</Btn>
        </>
      ) : (
        <>
      {/* 한 번에 올리기 · Flow — 아래 줄 맨 왼쪽 (2026-10-21 사장님) */}
      <div style={{ display: "flex", gap: 8, marginRight: "auto" }}>
        {onSwitch && <Btn onClick={() => onSwitch("auto")} title="만든 이미지·동영상은 그대로 두고, 남은 빈 곳 채우기·꾸미기로"><Icon name="back" size={15} />AI 자동 편집으로</Btn>}
        <Btn disabled={Boolean(busy)} onClick={() => void bulkPick()} title="Flow 등에서 만든 사진·동영상 여러 개 — 파일 이름 번호(clip 1)로 클립에 맞춰 넣어요"><Icon name="open" size={15} />한 번에 올리기</Btn>
        <Btn onClick={() => window.open("https://labs.google/flow", "_blank")} title="Google Flow 열기 (브라우저)">Flow 열기 ↗</Btn>
      </div>
      <Btn onClick={onClose}>닫기</Btn>
      {/* 아래 오른쪽 — 선택한 클립 이미지 만들기 · 동영상 만들기 (2026-10-21 사장님) */}
      <Btn primary disabled={Boolean(busy) || Boolean(picBusy) || (!emptyN && !selEmpty.length)} onClick={() => void drawAll()} style={{ height: 46, padding: "0 20px", fontSize: 15 }}><Icon name="image" size={17} />{selEmpty.length ? `선택한 클립 이미지 만들기 (${selEmpty.length})` : `빈칸 이미지 만들기 (${emptyN})`}</Btn>
      <Btn primary disabled={Boolean(busy) || Boolean(picBusy)} onClick={() => { if (gemKey === false) { setBatchAsk(false); setNoKeyFor("__all"); return; } setNoKeyFor(""); setBatchAsk(!batchAsk); }} style={{ height: 46, padding: "0 20px", fontSize: 15 }}><Icon name="video" size={17} />{selEmpty.length ? "선택한 클립" : "전체"} 동영상 만들기 ({videoTargets().length})</Btn>
        </>
      )}
    </>
  );

  // 편집 화면 바깥(문서 맨 위)에 띄운다 — 타임라인 편집의 작은 칸 안에서 불러도 늘 화면 가운데 큰 창으로
  return createPortal(
    <Modal title={titleBar} onClose={busy ? undefined : onClose} width={1440} footer={footer}>
      <div style={{ display: "flex", minHeight: "calc(92vh - 140px)", fontFamily: FONT, color: C.text }}>
        {/* 왼쪽 — 설정 */}
        <div style={{ width: 560, flexShrink: 0, padding: "6px 26px 20px", borderRight: `1px solid ${C.line}`, overflowY: "auto" }}>
          {/* [영상 종류·화면 비율] 칸은 뺐다 (2026-10-21 사장님) — 종류는 프로젝트 값(매물이면 매물 소개), 비율은 위쪽 화면 비율 단추 */}
          {/* [내 사진·영상 채우기] 칸은 뺐다 (2026-10-21 사장님) — 내 사진·영상은 오른쪽 화면 편집판에서 클립마다 직접 넣는다 */}
          {mode === "make" && (<>
          {/* ③ 빈 곳 채우기 — AI 요청 2번 */}
          <div style={sec}>
            {head(<>AI 영상·이미지 생성 <span style={{ fontSize: 13, color: C.sub, fontWeight: 600 }}>· 스타일·캐릭터를 정하고 아래 [프롬프트 만들기]</span></>)}
            {/* 무료 영상·사진 · 최대 장수는 뺐다 (2026-10-21 사장님) — 빈 곳은 AI 그림으로, 빈칸 수만큼 */}
            <div style={{ fontSize: 12.5, color: C.dim, marginBottom: 8 }}>① 스타일·캐릭터 시트 정하기 → ② [프롬프트 만들기] (이미지·동영상 프롬프트 한 번에) → ③ 오른쪽 위 줄에서 이미지·동영상 만들기, TXT 내보내기(Flow), 한 번에 올리기. 클립을 고르면 고른 것만, 안 고르면 전체.</div>
            {(
              <div style={{ marginTop: 4 }}>
                {/* 그림 스타일 — [AI 사진] 칸과 같은 스타일 (2026-10-21 사장님) */}
                <div style={{ fontSize: 13, color: C.sub, marginBottom: 6 }}>이미지 스타일</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 6 }}>
                  {[{ id: "auto", label: pf.aiStyle === "auto" && project.aiStyle ? `자동 · ${allStyles.find((x) => x.id === project.aiStyle)?.label || ""}` : "자동 (AI가 맞춤)", thumb: "", title: "AI가 대본을 읽고 하나를 골라 모든 클립에" }, ...myStyles.map((x) => ({ id: x.id, label: "★ " + x.label, thumb: "", title: x.desc })), ...IMAGE_STYLES.map((x) => ({ id: x.id, label: x.label, thumb: x.thumb || "", title: x.desc }))].slice(0, open.styles ? 999 : 9 + myStyles.length).map((x) => {
                    const on = pf.aiStyle === x.id;
                    const mine = x.id.startsWith("my:");
                    return (
                      <button key={x.id} type="button" onClick={() => set("aiStyle", x.id)} title={x.title}
                        style={{ position: "relative", height: 46, padding: 0, borderRadius: 6, overflow: "hidden", border: `2px solid ${on ? C.accent : C.line2}`, background: x.thumb ? `#000 url(${x.thumb}) center/cover` : C.card, cursor: "pointer", fontFamily: FONT }}>
                        <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: x.thumb ? "rgba(0,0,0,0.35)" : mine ? "linear-gradient(135deg,#334155,#0f172a)" : "transparent", color: "#fff", fontSize: 12.5, fontWeight: 800, textShadow: "0 1px 3px rgba(0,0,0,.8)", padding: "0 16px", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{on ? "✓ " : ""}{x.label}</span>
                        {mine && <span role="button" title="내 이미지 스타일 지우기" onClick={(ev) => { ev.stopPropagation(); const id = x.id.slice(3); set("myPrompts", pf.myPrompts.filter((m) => m.id !== id)); if (pf.aiStyle === x.id) set("aiStyle", "auto"); }} style={{ position: "absolute", right: 2, top: 2, width: 16, height: 16, borderRadius: 8, background: "rgba(0,0,0,.6)", color: "#fff", fontSize: 11, lineHeight: "16px" }}>×</span>}
                      </button>
                    );
                  })}
                </div>
                <button type="button" onClick={() => setOpen((o) => ({ ...o, styles: !o.styles }))} style={{ ...chip(false), height: 28, padding: "0 10px", fontSize: 12.5, marginTop: 6 }}>{open.styles ? "▲ 접기" : `▼ 모두 보기 (${IMAGE_STYLES.length}가지)`}</button>
                {/* 내 맞춤 프롬프트 — 이미지 스타일 아래 (2026-10-21 사장님). 쓰면 모든 그림에 붙고, [이미지 스타일에 추가]하면 ★ 카드로 남아 골라 쓴다 */}
                <div style={{ fontSize: 13, color: C.sub, margin: "14px 0 6px" }}>내 맞춤 프롬프트 <span style={{ color: C.dim }}>· 모든 그림에 함께 붙어요 · 저장하면 ★ 이미지 스타일로 (선택)</span></div>
                <textarea value={pf.myPrompt} onChange={(e) => set("myPrompt", e.target.value)} onKeyDown={(e) => e.stopPropagation()} rows={2}
                  placeholder="예: 따뜻한 수채화 느낌, 파스텔 색, 부드러운 오후 햇살 · 인물은 늘 30대 한국인 여성 중개사"
                  style={{ ...input, height: "auto", width: "100%", boxSizing: "border-box", padding: 10, lineHeight: 1.5, resize: "vertical", fontSize: 13 }} />
                <div style={{ display: "flex", gap: 6, marginTop: 6, alignItems: "center" }}>
                  {myName !== null ? (
                    <>
                      <input autoFocus value={myName} onChange={(e) => setMyName(e.target.value)} placeholder="스타일 이름 (예: 우리 사무실 톤)"
                        onKeyDown={(e) => {
                          e.stopPropagation();
                          if (e.key === "Escape") setMyName(null);
                          if (e.key === "Enter" && myName.trim()) { const id = "mp" + Date.now(); set("myPrompts", [...pf.myPrompts, { id, label: myName.trim().slice(0, 14), text: pf.myPrompt.trim() }]); set("aiStyle", "my:" + id); set("myPrompt", ""); setMyName(null); }
                        }}
                        style={{ ...input, height: 28, fontSize: 12.5, width: 200 }} />
                      <Btn small disabled={!myName.trim()} onClick={() => { const id = "mp" + Date.now(); set("myPrompts", [...pf.myPrompts, { id, label: myName.trim().slice(0, 14), text: pf.myPrompt.trim() }]); set("aiStyle", "my:" + id); set("myPrompt", ""); setMyName(null); }}>추가</Btn>
                      <Btn small onClick={() => setMyName(null)}>취소</Btn>
                    </>
                  ) : (
                    <>
                      <Btn small disabled={!pf.myPrompt.trim()} onClick={() => setMyName("")} title="이 프롬프트를 이미지 스타일 칸에 ★ 카드로 남겨요 (고르면 모든 클립이 그 스타일)">★ 이미지 스타일에 추가</Btn>
                      {pf.myPrompt.trim() && <Btn small onClick={() => set("myPrompt", "")}>비우기</Btn>}
                    </>
                  )}
                </div>
                <div style={{ height: 14 }} />
                {/* 캐릭터 시트 (2026-10-21 사장님) — 같은 인물이 모든 그림에 나오게, 참고 사진으로 함께 보낸다 */}
                <div style={{ fontSize: 13, color: C.sub, margin: "0 0 6px" }}>캐릭터 시트 <span style={{ color: C.dim }}>· 넣으면 모든 그림에 같은 인물이 나와요 (선택 · 3장까지)</span></div>
                <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                  {pf.charSheet.map((x) => (
                    <div key={x.id} title={x.name} style={{ position: "relative", width: 64, height: 64, borderRadius: 6, overflow: "hidden", border: `1px solid ${C.accent}`, background: "#000", flexShrink: 0 }}>
                      {(x.thumb || x.url) && <img src={x.thumb || x.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
                      <button type="button" title="빼기" onClick={() => set("charSheet", pf.charSheet.filter((y) => y.id !== x.id))} style={{ ...mini, position: "absolute", right: 2, top: 2 }}>×</button>
                    </div>
                  ))}
                  {pf.charSheet.length < 3 && (
                    <>
                      <Btn small onClick={() => void openPickOne({ mode: "char" })}><Icon name="folder" size={14} />내 자료에서</Btn>
                      <Btn small onClick={async () => { const it = (await b.lib.pick().catch(() => [])).find((x) => x.kind === "image"); if (it && !pf.charSheet.some((y) => y.id === it.id)) set("charSheet", [...pf.charSheet, it].slice(0, 3)); }}><Icon name="plus" size={14} />PC에서</Btn>
                    </>
                  )}
                </div>
                {pf.charSheet.length > 0 && (charApp
                  ? <div style={{ fontSize: 12, color: C.dim, marginTop: 6, lineHeight: 1.5 }}>사람이 나오는 그림마다 이 인물로 그려요 (얼굴·머리·옷·나이). 배경만 나오는 그림은 그대로예요.</div>
                  : <div style={{ fontSize: 12, color: "#facc15", marginTop: 6, lineHeight: 1.5 }}>⚠ 공실스튜디오를 껐다 켜야 캐릭터 시트가 그림에 첨부돼요 (지금은 빼고 그려요).</div>)}
              </div>
            )}
            {/* [빈 곳 AI로 채우기] 단추는 뺐다 (2026-10-21 사장님) — [AI 편집 시작]을 누르면 빈 곳부터 AI 그림으로 채우고 이어서 꾸민다 */}
            {note && noteAt === "rest" && <div style={{ fontSize: 13, color: C.accent, marginTop: 8, lineHeight: 1.5 }}>{note}</div>}
          </div>

          </>)}
          {/* ── AI 자동 영상 편집 · 초안 (2026-10-21 사장님) — 내 사진·영상 + 무료 자료(+AI 이미지) + 음악·전환·그래픽·효과음·자막까지 한 번에 ── */}
          {mode === "auto" && (
            <>
              <div style={sec}>
                {head(<>내 사진·영상 <span style={{ fontSize: 13, color: C.sub, fontWeight: 600 }}>· AI가 문장에 맞춰 넣어요 ({mats.length}/30)</span></>)}
                {mats.length > 0 && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: 5, marginBottom: 8 }}>
                    {mats.map((f, i) => (
                      <div key={f.id} title={f.name} style={{ position: "relative", aspectRatio: "16 / 10", borderRadius: 4, overflow: "hidden", background: "#000", border: `1px solid ${C.line2}` }}>
                        {(f.thumb || f.kind === "image") && <img src={f.thumb || f.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
                        {f.kind === "video" && <span style={{ position: "absolute", left: 3, bottom: 2, fontSize: 10, color: "#fff", textShadow: "0 1px 2px #000" }}>▶</span>}
                        <button type="button" title="빼기" onClick={() => setMats((v) => v.filter((x) => x.id !== f.id))} style={{ ...mini, position: "absolute", right: 2, top: 2 }}>×</button>
                        {i > 0 && <button type="button" title="앞으로" onClick={() => moveMat(i, -1)} style={{ ...mini, position: "absolute", left: 2, top: 2 }}>‹</button>}
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <Btn small onClick={async () => addMats(await b.lib.pick().catch(() => []))}><Icon name="plus" size={14} />PC에서</Btn>
                  <Btn small onClick={async () => { setPickFor(null); setPickSel([]); setPicker(await b.lib.list({ kind: "all" }).catch(() => [])); }}><Icon name="folder" size={14} />내 자료에서</Btn>
                  <Btn small onClick={openVac}><Icon name="image" size={14} />공실 불러오기</Btn>
                  {mats.length > 0 && <Btn small onClick={() => setMats([])}>모두 빼기</Btn>}
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 8 }}>
                  <span style={{ fontSize: 12.5, color: C.sub }}>넣는 방식</span>
                  <button type="button" onClick={() => set("order", "ai")} style={{ ...chip(pf.order !== "seq"), height: 28, padding: "0 10px", fontSize: 12.5 }}>AI가 문장에 맞춰</button>
                  <button type="button" onClick={() => set("order", "seq")} style={{ ...chip(pf.order === "seq"), height: 28, padding: "0 10px", fontSize: 12.5 }}>넣은 순서대로</button>
                </div>
              </div>

              <div style={sec}>
                {head(<>빈 곳 채우기 <span style={{ fontSize: 13, color: C.sub, fontWeight: 600 }}>· 내 화면이 모자란 클립</span></>)}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <button type="button" onClick={() => set("stock", !pf.stock)} style={chip(pf.stock)}>{pf.stock ? "✓ " : ""}무료 영상·사진</button>
                  <button type="button" onClick={() => set("aiOn", !pf.aiOn)} title="느리고 요금이 들 수 있어요 — 초안은 무료 자료로 빠르게" style={chip(pf.aiOn)}>{pf.aiOn ? "✓ " : ""}AI 이미지</button>
                </div>
                {pf.aiOn && (
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginTop: 8 }}>
                    <span style={{ fontSize: 12.5, color: C.sub }}>이미지 스타일</span>
                    <select value={pf.aiStyle} onChange={(e) => set("aiStyle", e.target.value)} style={{ ...input, height: 30, fontSize: 12.5 }}>
                      <option value="auto">자동 (AI가 맞춤)</option>
                      {allStyles.map((x) => <option key={x.id} value={x.id}>{x.id.startsWith("my:") ? "★ " : ""}{x.label}</option>)}
                    </select>
                    <span style={{ fontSize: 12.5, color: C.sub, marginLeft: 6 }}>최대</span>
                    {[2, 4, 8, 12].map((n) => <button key={n} type="button" onClick={() => set("aiMax", n)} style={{ ...chip(pf.aiMax === n), height: 28, padding: "0 9px", fontSize: 12.5 }}>{n}장</button>)}
                  </div>
                )}
                {onSwitch && (
                  <Btn small onClick={() => onSwitch("make")} title="이미지 스타일·캐릭터 시트로 필요한 클립만 AI 이미지·동영상을 자세히 만들어요. 만든 화면은 자동 편집이 그대로 둬요" style={{ marginTop: 8 }}><Icon name="ai" size={14} />AI 이미지·영상 만들기 →</Btn>
                )}
                <div style={{ fontSize: 12, color: C.dim, marginTop: 6 }}>순서: 내 사진·영상 → {pf.stock ? "무료 영상·사진 → " : ""}{pf.aiOn ? "AI 이미지 → " : ""}그래도 빈 곳은 내 사진 다시 · 이미 넣어 둔 화면은 그대로</div>
              </div>

              <div style={sec}>
                {head(<>꾸미기 <span style={{ fontSize: 13, color: C.sub, fontWeight: 600 }}>· 모양은 AI가 대본에 맞춰 골라요</span></>)}
                {([
                  ["음악", [["넣기", pf.music !== false, () => set("music", true)], ["빼기", pf.music === false, () => set("music", false)]]],
                  ["화면 전환", [["자동", pf.trans !== "none", () => set("trans", "auto")], ["없음", pf.trans === "none", () => set("trans", "none")]]],
                  ["그래픽·스티커", [["조금", pf.graphics === "some", () => set("graphics", "some")], ["많이", pf.graphics === "many", () => set("graphics", "many")], ["없음", pf.graphics === "none", () => set("graphics", "none")]]],
                  ["효과음", [["넣기", pf.sfx !== "none", () => set("sfx", "some")], ["없음", pf.sfx === "none", () => set("sfx", "none")]]],
                  ["정보 바 (가격·면적)", [["넣기", pf.keyText, () => set("keyText", true)], ["빼기", !pf.keyText, () => set("keyText", false)]]],
                  ["구독·좋아요", [["넣기", pf.subscribe, () => set("subscribe", true)], ["빼기", !pf.subscribe, () => set("subscribe", false)]]],
                  ["표시·광고 끝 화면", [["넣기", pf.endCard, () => set("endCard", true)], ["빼기", !pf.endCard, () => set("endCard", false)]]],
                ] as [string, [string, boolean, () => void][]][]).map(([lb, opts]) => (
                  <div key={lb} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0" }}>
                    <span style={{ width: 130, fontSize: 13, color: C.sub }}>{lb}</span>
                    {opts.map(([t, on, go]) => <button key={t} type="button" onClick={go} style={{ ...chip(on), height: 28, padding: "0 10px", fontSize: 12.5 }}>{t}</button>)}
                  </div>
                ))}
                <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0" }}>
                  <span style={{ width: 130, fontSize: 13, color: C.sub }}>제목</span>
                  <button type="button" onClick={() => set("titleOn", !pf.titleOn)} style={{ ...chip(pf.titleOn), height: 28, padding: "0 10px", fontSize: 12.5 }}>{pf.titleOn ? "넣기" : "빼기"}</button>
                  {pf.titleOn && <input value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.stopPropagation()} placeholder="영상 제목" style={{ ...input, height: 28, fontSize: 12.5, flex: 1 }} />}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0" }}>
                  <span style={{ width: 130, fontSize: 13, color: C.sub }}>채널명</span>
                  <button type="button" onClick={() => set("channelOn", !pf.channelOn)} style={{ ...chip(pf.channelOn), height: 28, padding: "0 10px", fontSize: 12.5 }}>{pf.channelOn ? "넣기" : "빼기"}</button>
                  {pf.channelOn && <input value={pf.channel || agency?.name || ""} onChange={(e) => set("channel", e.target.value)} onKeyDown={(e) => e.stopPropagation()} placeholder="채널 이름" style={{ ...input, height: 28, fontSize: 12.5, flex: 1 }} />}
                </div>
              </div>
            </>
          )}
          {/* [인트로·아웃트로·표시광고] 칸은 오른쪽 화면 편집판으로 옮겼다 (2026-10-21 사장님) */}
          {mode === "auto" && (<>
          {/* 꾸미기 — 다음 단계 (2026-10-21: 화면 채우기에 집중, 꾸미기는 그다음) */}

          {/* 스타일 팩 고르기는 뺐다 (2026-10-21 사장님) — [AI 편집 시작] 때 AI 가 대본을 읽고 어울리는 디자인을 고른다 */}
          {/* ⑧ AI에게 요청 */}
          <div style={sec}>
            {head(<>AI에게 요청 <span style={{ fontSize: 13, color: C.dim, fontWeight: 600 }}>(선택)</span></>)}
            <textarea value={pf.request} onChange={(e) => set("request", e.target.value)} onKeyDown={(e) => e.stopPropagation()} rows={2} placeholder="예: 가격은 빨간색으로 크게, 사람 얼굴 나오는 영상은 빼 줘"
              style={{ ...input, height: "auto", width: "100%", boxSizing: "border-box", padding: 10, lineHeight: 1.5, resize: "vertical", fontSize: 13.5 }} />
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 6 }}>
              {REQ_CHIPS.map((t) => <button key={t} type="button" onClick={() => set("request", pf.request.includes(t) ? pf.request : `${pf.request.trim() ? `${pf.request.trim()}, ` : ""}${t}`)} style={{ ...chip(false), height: 28, padding: "0 9px", fontSize: 12.5 }}>+ {t}</button>)}
            </div>
          </div>

          </>)}
          {/* ⑨ 쓸 AI */}
          <div style={{ ...sec, borderBottom: 0 }}>
            {head("쓸 AI")}
            <AiPick value={aiSel} onChange={setAiSel} list={aiList} noTitle />
            {mode === "make" && (<>
            {/* 프롬프트 만들기 · 받기 · 올리기 — ③ 쓸 AI 아래 (2026-10-21 사장님). 클립을 고르면 고른 것만, 안 고르면 전체 */}
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 16 }}>
        {/* 이미지·동영상 프롬프트 한 번에 (2026-10-21 사장님: 단추 하나로) — AI 한 번 부르기로 둘 다 */}
        <Btn primary disabled={Boolean(busy) || Boolean(picBusy) || !scopeIds.length} onClick={() => void runPics(scopeIds, `${writer}가 ${scopeIds.length}개 클립의 이미지·동영상 프롬프트를 쓰는 중…`, undefined, "both")}><Icon name="ai" size={15} />{selEmpty.length ? "선택한 클립" : "전체"} 이미지·동영상 프롬프트 만들기 ({scopeIds.length})</Btn>
        {scopeHasImg && <Btn disabled={Boolean(busy)} onClick={() => saveTxt("image")} title="[clip 1] … 모양 TXT — Flow에 붙여 넣기"><Icon name="export" size={15} />이미지 프롬프트 받기</Btn>}
        {scopeHasMotion && <Btn disabled={Boolean(busy)} onClick={() => saveTxt("video")} title="[clip 1] … 모양 TXT — Flow에 붙여 넣기"><Icon name="export" size={15} />동영상 프롬프트 받기</Btn>}
            </div>
            </>)}
          </div>

          {/* [더 바꾸기] 칸은 뺐다 (2026-10-21 사장님: 필요 없음) — 제목·채널명·구독·끝 화면·정보 바는 저장된 기본값대로 */}
        </div>

        {/* 오른쪽 — 클립 한눈에 · 진행 · 결과 */}
        <div style={{ flex: 1, minWidth: 0, padding: "18px 24px", overflowY: "auto" }}>
          {busy && <div style={{ marginBottom: 12, padding: 14, borderRadius: 8, background: C.card, border: `1px solid ${C.accent}`, fontSize: 14.5, lineHeight: 1.6 }}>{busy}<div style={{ fontSize: 12.5, color: C.sub, marginTop: 4 }}>이 창을 닫지 마세요. 끝나면 결과를 여기에 보여 줘요.</div></div>}
          {err && <div style={{ marginBottom: 12, fontSize: 14, color: C.danger, lineHeight: 1.6 }}>{err}</div>}
          {rows && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 8 }}>{rows.some((r) => r.n > 0) ? "편집했어요 — 아래 화면 편집판에서 바꾸거나 한 번에 되돌리기" : "다 했어요"}</div>
              {rows.filter((r) => r.n === 0).map((r, i) => (
                <div key={i} style={{ padding: "6px 0", borderBottom: `1px solid ${C.line}`, fontSize: 13.5, fontWeight: 700 }}>→ {r.what}</div>
              ))}
            </div>
          )}
          {/* 화면 편집판 — 클립마다 어디서 온 화면인지 · 바꾸기 · 빼기 · 인트로·아웃트로·중간 쉼 (2026-10-21 사장님) */}
          <div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 15, fontWeight: 800 }}>화면 편집판</span>
              <span style={{ fontSize: 13, color: C.sub, flex: 1 }}>클립 {flat.length}개 · 빈칸 {emptyN}개 — 눌러서 바꾸거나 빼요</span>
              <button type="button" onClick={() => { setPicAll(!picAll); setPicOpen({}); }} style={{ ...chip(picAll), height: 28, padding: "0 10px", fontSize: 12.5 }}>{picAll ? "장면 설명 모두 접기" : "장면 설명 모두 펼치기"}</button>
            </div>
            {picBusy && <div style={{ marginBottom: 8, padding: "6px 10px", borderRadius: 6, border: `1px solid ${C.accent}`, fontSize: 12.5, color: C.sub }}>{picBusy}</div>}
            {/* 전체 선택 (2026-10-21 사장님) — 고른 클립만 그린다. 화면이 있는 클립도 고르면 AI 그림으로 바꾼다 */}
            {(
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "2px 8px 8px", fontSize: 13, color: C.sub }}>
                <input type="checkbox" checked={allSel} ref={(el) => { if (el) el.indeterminate = selEmpty.length > 0 && !allSel; }} onChange={() => setSelEmpty(allSel ? [] : pickable)} title="전체 선택" style={{ width: 16, height: 16, accentColor: C.accent, flexShrink: 0, cursor: "pointer" }} />
                <span style={{ cursor: "pointer", fontWeight: 700 }} onClick={() => setSelEmpty(allSel ? [] : pickable)}>전체 선택</span>
                {emptyN > 0 && <button type="button" onClick={() => setSelEmpty(flat.filter((x) => !screenOf(x.clip) && clipText(x.clip).trim()).map((x) => x.clip.id))} style={{ height: 24, padding: "0 8px", border: `1px solid ${C.line2}`, borderRadius: 4, background: "transparent", color: C.sub, fontSize: 12, fontFamily: FONT, cursor: "pointer" }}>빈칸만</button>}
                {selEmpty.length > 0 && <span style={{ color: C.dim, flex: 1, minWidth: 0 }}>{selEmpty.length}개 고름{selEmpty.some((id) => { const x = flat.find((y) => y.clip.id === id); return x && screenOf(x.clip); }) ? " · 화면이 있는 클립은 AI 그림으로 바뀌어요" : ""}</span>}
                <span style={{ flex: 1 }} />
                {!allItems.some((x) => x.clip.card === "intro") && <button type="button" onClick={() => void openPickOne({ mode: "insert", card: "intro" })} style={{ height: 28, padding: "0 10px", display: "inline-flex", alignItems: "center", gap: 4, border: `1px dashed ${C.line2}`, borderRadius: 5, background: "transparent", color: C.sub, fontSize: 12.5, fontWeight: 700, fontFamily: FONT, cursor: "pointer", flexShrink: 0 }}><Icon name="plus" size={13} />인트로 넣기 <span style={{ color: C.dim, fontWeight: 600 }}>· 맨 앞</span></button>}
                {!allItems.some((x) => x.clip.card === "outro") && <button type="button" onClick={() => void openPickOne({ mode: "insert", card: "outro" })} style={{ height: 28, padding: "0 10px", display: "inline-flex", alignItems: "center", gap: 4, border: `1px dashed ${C.line2}`, borderRadius: 5, background: "transparent", color: C.sub, fontSize: 12.5, fontWeight: 700, fontFamily: FONT, cursor: "pointer", flexShrink: 0 }}><Icon name="plus" size={13} />아웃트로 넣기 <span style={{ color: C.dim, fontWeight: 600 }}>· 맨 끝</span></button>}
              </div>
            )}
            {/* 인트로·아웃트로 넣기는 [전체 선택] 줄 오른쪽으로 옮겼다 (2026-10-21 사장님) */}
            {note && <div style={{ margin: "0 8px 8px", fontSize: 12.5, color: C.accent }}>{note}</div>}
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {allItems.map((x) => {
                const c = x.clip;
                const th = thumbOf(c);
                const has = Boolean(screenOf(c));
                const n = flat.findIndex((y) => y.clip.id === c.id);
                const badge = c.card ? CARD_LABEL[c.card] : c.blank ? "빈칸 두기" : !has ? "빈칸" : c.fillFrom ? FROM_LABEL[c.fillFrom] : c.type !== "voice" && c.src && !c.visual ? "촬영 화면" : "넣어 둔 화면";
                const badgeColor = c.card ? "#a78bfa" : c.blank ? C.dim : !has ? C.accent : c.fillFrom === "ai" ? "#f472b6" : c.fillFrom === "stock" ? "#34d399" : C.sub;
                return (
                  <React.Fragment key={c.id}>
                    <div draggable title="끌어서 옮기기"
                      onDragStart={(e) => { setDragId(c.id); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", c.id); }}
                      onDragOver={(e) => { if (!dragId || dragId === c.id) return; e.preventDefault(); const r = e.currentTarget.getBoundingClientRect(); const before = e.clientY < r.top + r.height / 2; if (dropAt?.id !== c.id || dropAt.before !== before) setDropAt({ id: c.id, before }); }}
                      onDragLeave={() => setDropAt((d) => (d?.id === c.id ? null : d))}
                      onDrop={(e) => { e.preventDefault(); if (dragId && dropAt) moveClip(dragId, c.id, dropAt.before); setDragId(""); setDropAt(null); }}
                      onDragEnd={() => { setDragId(""); setDropAt(null); }}
                      style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 8px", borderRadius: 6, background: c.card ? "rgba(167,139,250,0.08)" : has ? "transparent" : "rgba(59,130,246,0.07)", opacity: dragId === c.id ? 0.4 : 1, cursor: "grab",
                        boxShadow: dropAt?.id === c.id ? `inset 0 ${dropAt.before ? 3 : -3}px 0 ${C.accent}` : "none" }}>
                      {/* 빈칸 고르기 — ③ 빈 곳 채우기에서 이 클립만 (2026-10-21) */}
                      {!c.card && clipText(c).trim() ? <input type="checkbox" checked={selEmpty.includes(c.id)} onChange={(e) => setSelEmpty((v) => (e.target.checked ? [...v, c.id] : v.filter((y) => y !== c.id)))} title={has ? "고르기 — 그리면 이 화면을 AI 그림으로 바꿔요" : "고르기 — 이 빈칸을 그려요"} style={{ width: 16, height: 16, accentColor: C.accent, flexShrink: 0 }} /> : <span style={{ width: 16, flexShrink: 0 }} />}
                      <span style={{ width: 44, fontSize: 12, color: C.dim, textAlign: "right", whiteSpace: "nowrap" }}>{n >= 0 ? clipName(n) : ""}</span>
                      <button type="button" title="눌러서 화면 바꾸기"
                        onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); setMenu({ id: c.id, x: r.right + 8, y: r.top }); }}
                        style={{ width: 84, height: 47, flexShrink: 0, padding: 0, borderRadius: 4, overflow: "hidden", background: "#000", border: `1px ${has ? "solid" : "dashed"} ${has ? C.line2 : C.accent}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11.5, color: C.accent, cursor: "pointer" }}>
                        {th ? <img src={th} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : has ? "" : "+ 넣기"}
                      </button>
                      <span style={{ fontSize: 11.5, fontWeight: 800, color: badgeColor, border: `1px solid ${badgeColor}`, borderRadius: 4, padding: "1px 6px", flexShrink: 0, whiteSpace: "nowrap" }}>{badge}</span>
                      <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: c.card ? C.sub : C.text }}>{c.card ? `${CARD_LABEL[c.card]} · ${(c.hold || 0).toFixed(1)}초` : clipText(c) || <span style={{ color: C.dim }}>(글 없음)</span>}</span>
                      {<button type="button" onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); setMenu({ id: c.id, x: r.left - 200, y: r.bottom + 4 }); }} style={{ ...chip(false), height: 30, padding: "0 10px", fontSize: 12.5, flexShrink: 0 }}>{has ? "바꾸기" : "넣기"} ▾</button>}
                      {!c.card && has && <button type="button" title={c.visual ? "화면 빼기 — 빈칸으로 (글·목소리는 그대로)" : "촬영 화면 가리기 — 검은 화면으로 (소리는 그대로) · 빈칸으로 둬요"} onClick={() => clearScreen(c.id)} style={iconBtn}><Icon name="trash" size={15} /></button>}
                      {c.card && <button type="button" title="이 칸 빼기" onClick={() => removeCard(c.id)} style={iconBtn}><Icon name="trash" size={15} /></button>}
                    </div>
                    {!c.card && clipText(c).trim() && picRow(c)}
                    {/* [+ 중간 쉼]은 뺐다 (2026-10-21 사장님) — 이미 넣은 쉼 칸은 목록에 남아 🗑 로 뺀다 */}
                  </React.Fragment>
                );
              })}
            </div>
            {!allItems.some((x) => x.clip.card === "end") && (<>
              <div style={{ ...addRow, marginTop: 6, cursor: "default", color: pf.endCard ? C.sub : C.dim }}>
                <Icon name="file" size={14} /><span style={{ flex: 1 }}>표시·광고 정보 끝 화면 <span style={{ color: C.dim, fontWeight: 600 }}>· 중개사무소 정보 — {pf.endCard ? "[AI 편집 시작] 때 맨 끝에 넣어요" : "안 넣음"}</span></span>
                <button type="button" onClick={() => set("endCard", !pf.endCard)} style={{ ...chip(pf.endCard), height: 28, padding: "0 10px", fontSize: 12.5 }}>{pf.endCard ? "✓ 넣기" : "안 넣음"}</button>
              </div>
              {kind === "vacancy" && !pf.endCard && <div style={{ fontSize: 12.5, color: "#facc15", margin: "4px 0 0 10px" }}>매물 광고 영상에는 중개사무소 정보(상호·대표·등록번호·연락처)를 밝혀야 해요.</div>}
            </>)}
            {/* 아래 단추의 확인 칸 — 키 없음 · 동영상 여러 개 (2026-10-21) */}
            <div style={{ marginTop: 10 }}>
            {noKeyFor === "__all" && gemKey === false && (
              <div style={{ margin: "0 8px 10px", padding: 10, borderRadius: 6, border: "1px solid #facc15", background: "rgba(250,204,21,0.08)", fontSize: 12.5, lineHeight: 1.6 }}>
                <b style={{ color: "#facc15" }}>⚠ Gemini API 키가 없어요</b><br />
                AI 동영상은 회원 본인의 <b>Gemini API 키(유료 등급)</b>로만 만들 수 있어요. 키가 없으면 [동영상 프롬프트 TXT]로 내보내 Flow에서 만든 뒤 [한 번에 올리기]로 넣어도 돼요.
                <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                  <Btn small primary onClick={() => { setNoKeyFor(""); openAiSettings(); }}>AI 설정 열기</Btn>
                  <Btn small onClick={() => setNoKeyFor("")}>닫기</Btn>
                </div>
              </div>
            )}
            {batchAsk && (() => {
              const n = videoTargets().length;
              const skip = scopeIds.length - n;
              return (
                <div style={{ margin: "0 8px 10px", padding: 10, borderRadius: 6, border: `1px solid ${C.accent}`, background: C.bg, fontSize: 12.5, lineHeight: 1.6 }}>
                  <b>AI 동영상 {n}편 만들기</b> — Gemini Omni Flash · 회원 Gemini API 키 (유료 등급만)<br />
                  요금: 720p 초당 약 $0.10 × 영상 길이 × {n}편 (만들어진 영상만, Google 가격표 2026-10-21) · 한 편에 1~3분 · 만드는 동안 [중지] 가능<br />
                  클립마다 그 사진을 첫 장면으로, 동영상 프롬프트대로 움직여요.{skip > 0 ? ` 사진이 없는 ${skip}개는 건너뛰어요.` : ""}
                  <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                    <Btn small primary disabled={!n} onClick={() => void makeVideos()}>{n}편 만들기</Btn>
                    <Btn small onClick={() => setBatchAsk(false)}>취소</Btn>
                  </div>
                </div>
              );
            })()}
            </div>
          </div>
        </div>
      </div>

      {/* 창 제목 옆 — 영상 종류·화면 비율 고르기 */}
      {topMenu && (
        <QuickMenu z={6000} title={topMenu.what === "kind" ? "영상 종류" : "화면 비율"} what={topMenu.what === "kind" ? "영상 종류" : "화면 비율"} x={topMenu.x} y={topMenu.y} onClose={() => setTopMenu(null)}
          items={topMenu.what === "kind"
            ? (Object.keys(KIND_LABEL) as Kind[]).map((k) => ({ icon: KIND_ICON[k], label: KIND_LABEL[k], desc: KIND_DESC[k], on: kind === k, run: () => pickKind(k) }))
            : (Object.keys(RATIO_LABEL) as Ratio[]).map((r) => ({ icon: "ratio", iconEl: <RatioBox ratio={r} />, label: `${RATIO_LABEL[r]} (${r})`, desc: r === "9:16" ? "세로 영상 — 쇼츠·릴스·틱톡" : r === "16:9" ? "가로 영상 — 유튜브" : r === "1:1" ? "정사각형 — 피드" : r === "4:5" ? "인스타그램 피드 세로" : "예전 TV 화면 비율", on: project.ratio === r, run: () => pickRatio(r) }))} />
      )}
      {/* 화면 편집판 — 클립 화면 바꾸기 메뉴 (클립 메뉴와 같은 모양) */}
      {menu && (() => {
        const c = allItems.find((x) => x.clip.id === menu.id)?.clip;
        if (!c) return null;
        const close = () => setMenu(null);
        return <QuickMenu z={6000} key={"fm" + c.id} title={clipText(c).slice(0, 30) || "화면"} what="화면" x={menu.x} y={menu.y} onClose={close} items={[
          ...(mats.length ? [{ icon: "image", label: "넣은 사진·영상에서", desc: "왼쪽 ①에 넣어 둔 내 사진·영상 중에서", page: () => (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 5, maxHeight: 260, overflowY: "auto" }}>
              {mats.map((f) => (
                <button key={f.id} type="button" title={f.name} onClick={() => { close(); void setScreen(c.id, f, f.source === "vacancy" ? "vacancy" : "mine"); }}
                  style={{ height: 44, padding: 0, borderRadius: 4, overflow: "hidden", border: `1px solid ${C.line2}`, background: "#000", cursor: "pointer" }}>
                  {(f.thumb || f.kind === "image") && <img src={f.thumb || f.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
                </button>
              ))}
            </div>
          ) }] : []),
          { icon: "folder", label: "내 자료에서", desc: "내 자료(사진·영상·녹화) 중에서 한 장", run: () => void openPickOne({ mode: "clip", id: c.id }) },
          { icon: "plus", label: "PC에서", desc: "PC의 사진·영상 파일", run: async () => { const it = (await b.lib.pick().catch(() => [])).find((x) => x.kind === "image" || x.kind === "video"); if (it) await setScreen(c.id, it, "mine"); } },
          { icon: "search", label: "무료에서 찾기", desc: "무료 영상·사진을 검색해서", run: () => { const q = clipText(c).replace(/\s+/g, " ").slice(0, 24); setStockFor({ id: c.id, q, items: null }); void (async () => { const orient = orientOf(); const [v, i] = await Promise.all([pf.stockKind === "photo" ? Promise.resolve({ items: [] as StockItem[] }) : b.stock.search(q, "video", orient).catch(() => ({ items: [] as StockItem[] })), pf.stockKind === "video" ? Promise.resolve({ items: [] as StockItem[] }) : b.stock.search(q, "photo", orient).catch(() => ({ items: [] as StockItem[] }))]); setStockFor((s) => (s && s.id === c.id ? { ...s, items: [...(v.items || []).slice(0, 12), ...(i.items || []).slice(0, 12)] } : s)); })(); } },
          ...(c.visual && project.assets[c.visual.asset]?.kind === "video" ? [{ icon: "cut", label: "앞뒤 자르기", desc: "이 영상에서 쓸 부분만 — 시작·끝을 잘라요 (문장보다 짧으면 끝 장면에서 멈춤)", run: () => setTrimFor(c.id) }] : []),
          { icon: "ai", label: "AI 그림 1장", desc: `이 문장으로 그려요 (${styleOf(undefined).label}) — 30초~1분`, run: () => void aiOne(c.id) },
          { icon: "close", label: c.blank ? "빈칸 두기 풀기" : "빈칸으로 두기", desc: c.blank ? "다시 채울 수 있게 (촬영 화면이면 다시 보여요)" : "화면 없이 둬요 — AI 채우기·자동 편집이 넣지 않아요 (촬영 화면이면 검게, 소리는 그대로)", run: () => toggleBlank(c.id) },
          ...(c.visual || (c.src && !c.blank) ? [{ icon: "trash", label: c.visual ? "화면 빼기" : "촬영 화면 가리기", desc: c.visual ? "빈칸으로 (글·목소리는 그대로)" : "검은 화면으로 (소리는 그대로)", danger: true, run: () => clearScreen(c.id) }] : []),
        ]} />;
      })()}
      {/* 앞뒤 자르기 — 편집 화면과 같은 창 */}
      {trimFor && (() => {
        const it = allItems.find((x) => x.clip.id === trimFor);
        const v = it?.clip.visual;
        const a = v ? project.assets[v.asset] : null;
        if (!it || !v || !a || a.kind !== "video") return null;
        return <VideoStart key={trimFor} trim need={it.dur} asset={a} dur={it.dur} start={v.s || 0} end={v.e ?? Math.min(a.duration || it.dur, (v.s || 0) + it.dur)} onClose={() => setTrimFor("")}
          onApply={(s0, e0) => apply((p) => { const c = p.scenes.flatMap((sc) => sc.clips).find((x) => x.id === trimFor); if (!c?.visual) return; c.visual = { ...c.visual, s: s0, e: e0 }; c.visualHold = true; })} />;
      })()}
      {/* 중간 쉼 넣기 */}
      {pauseMenu && (
        <QuickMenu z={6000} title="이 클립 뒤에 중간 쉼 (1초)" what="중간 쉼" x={pauseMenu.x} y={pauseMenu.y} onClose={() => setPauseMenu(null)} items={[
          { icon: "screen", label: "앞 화면 이어서", desc: "앞 클립 화면을 1초 더 (목소리 없이)", run: () => void insertCard("pause", null, pauseMenu.after, true) },
          { icon: "folder", label: "내 자료에서 고르기", desc: "보관해 둔 쉼 화면 (브랜드 화면 등)", run: () => void openPickOne({ mode: "insert", card: "pause", after: pauseMenu.after }) },
          { icon: "close", label: "검은 화면", desc: "검은 화면 1초", run: () => void insertCard("pause", null, pauseMenu.after) },
        ]} />
      )}
      {/* 무료에서 찾기 */}
      {stockFor && (
        <Modal title="무료 영상·사진 찾기" onClose={() => setStockFor(null)} width={760}>
          <div style={{ padding: 16 }}>
            <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
              <input defaultValue={stockFor.q} onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Enter") void stockSearch((e.target as HTMLInputElement).value); }} placeholder="찾을 말 (예: 햇살 드는 거실)" style={{ ...input, height: 36, fontSize: 14, flex: 1 }} id="gs-stock-q" />
              <Btn small onClick={() => void stockSearch((document.getElementById("gs-stock-q") as HTMLInputElement)?.value || stockFor.q)}><Icon name="search" size={15} />찾기</Btn>
            </div>
            {stockFor.items === null ? <div style={{ color: C.sub, fontSize: 14 }}>찾는 중…</div> : !stockFor.items.length ? <div style={{ color: C.sub, fontSize: 14 }}>찾는 자료가 없어요. 다른 말로 찾아 주세요.</div> : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 8, maxHeight: "56vh", overflowY: "auto" }}>
                {stockFor.items.map((x) => (
                  <button key={x.id} type="button" onClick={() => void takeStock(x)} title={x.credit}
                    style={{ position: "relative", height: 96, padding: 0, borderRadius: 6, overflow: "hidden", border: `1px solid ${C.line2}`, background: "#000", cursor: "pointer" }}>
                    <img src={x.thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    <span style={{ position: "absolute", left: 4, top: 4, fontSize: 10.5, color: "#fff", background: "rgba(0,0,0,0.6)", padding: "0 5px", borderRadius: 3 }}>{x.kind === "video" ? `영상${x.duration ? ` ${Math.round(x.duration)}초` : ""}` : "사진"}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* 한 번에 올리기 — 넣기 전에 짝 목록 (2026-10-21 사장님) */}
      {upPlan && (
        <Modal title={`한 번에 올리기 — ${upPlan.length}개`} onClose={() => setUpPlan(null)} width={640}
          footer={<><Btn onClick={() => setUpPlan(null)}>취소</Btn><Btn primary disabled={!upPlan.length} onClick={() => void bulkPut()}><Icon name="check" size={16} />{upPlan.length}개 넣기</Btn></>}>
          <div style={{ padding: 16 }}>
            <div style={{ fontSize: 13, color: C.sub, marginBottom: 10, lineHeight: 1.6 }}>파일 이름 속 번호(clip 1 · clip01 · 1.png)로 맞췄어요. 번호가 없는 파일은 남은 클립에 이름순으로 넣어요. 넣은 뒤 화면 편집판에서 끌어서 바꿀 수 있어요.</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: "56vh", overflowY: "auto" }}>
              {upPlan.map((p) => (
                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 6px", borderRadius: 6, background: C.card }}>
                  <span style={{ width: 52, fontSize: 13, fontWeight: 800 }}>{clipName(p.n)}</span>
                  <span style={{ fontSize: 12, color: C.dim }}>←</span>
                  <div style={{ width: 64, height: 40, borderRadius: 4, overflow: "hidden", background: "#000", flexShrink: 0 }}>
                    {(p.item.thumb || p.item.kind === "image") && <img src={p.item.thumb || p.item.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
                  </div>
                  <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.item.name}</span>
                  <span style={{ fontSize: 11.5, color: p.item.kind === "video" ? "#f472b6" : C.sub }}>{p.item.kind === "video" ? "동영상" : "사진"}</span>
                  <span style={{ flex: "0 0 38%", minWidth: 0, fontSize: 12, color: C.dim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{flat[p.n] ? clipText(flat[p.n].clip) : ""}</span>
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}
      {/* 공실 불러오기 — 내 공실 사진을 내 사진·영상에 (자동 편집) */}
      {vacOpen && (
        <Modal title="공실 불러오기" onClose={() => setVacOpen(false)} width={640}>
          <div style={{ padding: 16 }}>
            <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
              <input value={vacNo} onChange={(e) => setVacNo(e.target.value)} onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Enter" && vacNo.trim()) void findVac(); }} placeholder="공실 광고 번호로 찾기" style={{ ...input, height: 34, flex: 1, fontSize: 13.5 }} />
              <Btn small disabled={!vacNo.trim()} onClick={() => void findVac()}><Icon name="search" size={14} />찾기</Btn>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: "50vh", overflowY: "auto" }}>
              {vacs === null ? <div style={{ color: C.sub, fontSize: 13.5 }}>불러오는 중…</div> : !vacs.length ? <div style={{ color: C.sub, fontSize: 13.5 }}>등록한 공실이 없어요.</div> : vacs.map((v) => (
                <button key={v.id} type="button" onClick={() => void loadVac(v.id)} style={{ textAlign: "left", padding: "8px 10px", borderRadius: 6, border: `1px solid ${C.line2}`, background: C.card, color: C.text, fontSize: 13, fontFamily: FONT, cursor: "pointer" }}>{v.label}</button>
              ))}
            </div>
          </div>
        </Modal>
      )}
      {/* 내 자료에서 고르기 */}
      {picker && (
        <Modal title={pickFor ? (pickFor.mode === "char" ? "캐릭터 시트 — 사진 하나 고르기" : pickFor.mode === "clip" ? "이 클립 화면 — 하나 고르기" : `${pickFor.card === "intro" ? "인트로" : pickFor.card === "outro" ? "아웃트로" : "중간 쉼"} — 하나 고르기`) : "내 자료에서 고르기"} onClose={() => { setPicker(null); setPickFor(null); }} width={760}
          footer={pickFor ? <Btn onClick={() => { setPicker(null); setPickFor(null); }}>취소</Btn> : <><Btn onClick={() => setPicker(null)}>취소</Btn><Btn primary onClick={() => { addMats(picker.filter((x) => pickSel.includes(x.id))); setPicker(null); }}><Icon name="check" size={16} />{pickSel.length}개 넣기</Btn></>}>
          <div style={{ padding: 16, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8, maxHeight: "60vh", overflowY: "auto" }}>
            {picker.filter((x) => x.kind === "video" || x.kind === "image").map((x) => {
              const on = pickSel.includes(x.id);
              return (
                <button key={x.id} type="button" onClick={() => (pickFor ? void onPickOne(x) : setPickSel((v) => (on ? v.filter((y) => y !== x.id) : [...v, x.id])))} title={x.name}
                  style={{ position: "relative", height: 90, borderRadius: 6, overflow: "hidden", border: `2px solid ${on ? C.accent : C.line2}`, background: "#000", cursor: "pointer", padding: 0 }}>
                  {x.thumb && <img src={x.thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                  {on && <span style={{ position: "absolute", right: 4, top: 4, width: 22, height: 22, borderRadius: 11, background: C.accent, color: "#fff", fontSize: 13, lineHeight: "22px" }}>✓</span>}
                </button>
              );
            })}
            {!picker.length && <div style={{ color: C.sub, fontSize: 14 }}>[내 자료]가 비어 있어요. [PC에서 추가]로 넣어 주세요.</div>}
          </div>
        </Modal>
      )}
    </Modal>,
    document.body,
  );
}

const addRow: React.CSSProperties = { width: "100%", display: "flex", alignItems: "center", gap: 6, padding: "8px 10px", borderRadius: 6, border: `1px dashed ${C.line2}`, background: "transparent", color: C.sub, fontSize: 13, fontWeight: 700, fontFamily: FONT, cursor: "pointer", marginBottom: 6 };
const iconBtn: React.CSSProperties = { width: 30, height: 30, flexShrink: 0, border: 0, borderRadius: 5, background: "transparent", color: C.sub, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" };
const mini: React.CSSProperties = { width: 18, height: 18, borderRadius: 9, border: 0, background: "rgba(0,0,0,0.65)", color: "#fff", cursor: "pointer", fontSize: 11, lineHeight: "18px", padding: 0 };
