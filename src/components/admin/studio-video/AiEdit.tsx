"use client";

// [AI 편집] — 스튜디오의 핵심 (2026-10-20 사장님: 오른쪽 좁은 칸 말고 대본 쓸 때처럼 화면 가운데 큰 창)
//  ① 영상 종류 → ② 화면 채우기 → ③ 자막 스타일·효과 → ④ 그래픽·효과음 → ⑤ 화면 전환 → ⑥ 제목·채널명·구독 → ⑦ 끝 화면 → ⑧ AI에게 요청 → ⑨ 쓸 AI
//  ③~⑦ 은 처음엔 [자동]으로 접어 둔다. 빈 클립만 채우고, 회원이 넣은 화면은 건드리지 않는다. 한 번에 넣고 한 번에 되돌리기.
//  회의 자료: docs/2026-10-20_studio_ai_edit_meeting.md
import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { AiEditCatalog, Asset, Clip, Layer, LayerAnim, LibItem, Project, StockItem } from "./types";
import { errText, uid, videoBridge } from "./types";
import { flatten, clipText, regroupScenes, SFX_LIST } from "./timeline";
import { SUB_PRESETS } from "./SubPresets";
import { PLAIN_LOOK } from "./SubFormatBar";
import { EMPH_LIST, IN_LIST, WHL_LIST } from "./Anim";
import { CATS, STYLE_LABEL, stickerAnim, stickerFileName, stickerGlyphs, stickerPng, type Sticker, type StickerStyle } from "./Stickers";
import { TRANSITIONS, type TransType } from "./transitions";
import { AD_LAW_LABELS, TEMPLATES, TPL_PREFIX, drawTemplate, tplFonts, tplTextOf } from "./Templates";
import { STYLE_PACKS, defaultPack, packOf, type StylePack } from "./stylePacks";
import { MUSIC_LIBRARY, MUSIC_MOODS } from "@/lib/reels/music-catalog";
import { IMAGE_STYLES, imagePrompt } from "@/lib/studio-video/imageStyles";
import { useStudioImager, useStudioWriter } from "@/components/admin/sections/useStudioWriter";
import { findStudioVacancyByNo, getStudioAgency, listMyStudioVacancies } from "@/app/actions/studio";
import { AiPick, aiChoiceName, effectiveAi, useAiPick } from "./AiPick";
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
  titleOn: boolean; channelOn: boolean; channel: string; subscribe: boolean; subAt: "mid" | "start" | "end"; endCard: boolean; request: string;
  pack: string; // 스타일 팩 — "auto" = AI 가 대본을 읽고 고름 (2026-10-20 사장님)
  keyText: boolean; // 핵심 글자 (가격·면적을 화면 가운데 크게) — 처음엔 끔 (2026-10-20 사장님: 촌스럽다)
  endDesign: string; // 끝 화면 디자인 — [그래픽 › 부동산 › 부동산 표시광고] 10가지 중 하나
};
const PREF_KEY = "gsv:aiEditPrefs";
const DEF: Prefs = {
  order: "ai", stock: true, aiOn: false, aiMax: 4, aiStyle: "auto",
  sub: "", emph: true, appear: true, graphics: "some", sfx: "some", trans: "auto",
  titleOn: true, channelOn: true, channel: "", subscribe: true, subAt: "mid", endCard: true, request: "", pack: "auto", keyText: true, endDesign: "",
};
const loadPrefs = (): Prefs => {
  try {
    return { ...DEF, ...JSON.parse(localStorage.getItem(PREF_KEY) || "{}") };
  } catch {
    return DEF;
  }
};

const KINDS: { id: Kind; label: string }[] = [{ id: "vacancy", label: "매물 소개" }, { id: "news", label: "뉴스·보도자료" }, { id: "topic", label: "자유 주제" }];
const REQ_CHIPS = ["가격 크게 강조", "사람 얼굴 나오는 화면은 빼 줘", "밝고 경쾌하게", "고급스럽게", "차분하게"];
const SUB_AT: ["mid" | "start" | "end", string][] = [["mid", "중간쯤"], ["start", "처음 5초 뒤"], ["end", "끝 화면 바로 앞"]];
// 끝 화면 매물 정보 — 공인중개사법 중개대상물 표시·광고 기준 항목 (공실 등록 값 그대로, 없는 값은 비움)
const LISTING_LABEL = /소재지|거래|금액|가격|보증금|월세|면적|층|사용승인|준공|방향|방\s*수|방\/|욕실|입주|주차|관리비|종류|용도/;

export function AiEditPanel({ project, selected, ensureAsset, apply, onUndo, onClose, autoStart }: {
  project: Project;
  selected: string[];
  ensureAsset: (item: LibItem) => Promise<Asset>;
  apply: (fn: (p: Project) => void) => void; // 한 번에 (되돌리기 한 번)
  onUndo: () => void;
  onClose: () => void;
  /** 열자마자 [AI 편집 시작] — 예전 [AI가 다 꾸미기] */
  autoStart?: boolean;
}) {
  const b = videoBridge()!;
  const writer = useStudioWriter();
  const imager = useStudioImager();
  const [pf, setPf] = useState<Prefs>(loadPrefs);
  const set = <K extends keyof Prefs>(k: K, v: Prefs[K]) => setPf((x) => {
    const n = { ...x, [k]: v };
    try { localStorage.setItem(PREF_KEY, JSON.stringify(n)); } catch {}
    return n;
  });
  const [kind, setKind] = useState<Kind>(project.kind || (project.vacancyId ? "vacancy" : "topic"));
  const [mats, setMats] = useState<LibItem[]>(() => (project.materials || []).slice(0, 30));
  const [onlySel, setOnlySel] = useState(false);
  const [open, setOpen] = useState<Record<string, boolean>>({}); // ③~⑦ 펼침
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [aiSel, setAiSel, aiList] = useAiPick();
  const aiUse = effectiveAi(aiSel, aiList);
  const aiName = aiChoiceName(aiUse, aiList, writer);
  const [agency, setAgency] = useState<Agency | null>(null);
  const [title, setTitle] = useState(() => project.name.replace(/^\d{6}\s+/, "").replace(/^무제$/, ""));
  useEffect(() => {
    getStudioAgency().then((r) => setAgency(r.success ? r.data : null)).catch(() => setAgency(null));
  }, []);
  const channel = pf.channel || agency?.name || "";

  // 클립 — 오른쪽 목록 · 빈 클립
  const flat = useMemo(() => flatten(project).items.filter((x) => x.clip.type !== "silence" && x.clip.card !== "end"), [project]);
  const screenOf = (c: Clip) => c.visual?.asset || (c.type !== "voice" ? c.src?.asset : "") || "";
  const emptyN = flat.filter((x) => !screenOf(x.clip)).length;
  const thumbOf = (c: Clip) => {
    const a = project.assets[screenOf(c)];
    return a ? a.thumb || (a.kind === "image" ? a.url : "") : "";
  };

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
  const endMust = kind === "vacancy";
  const endOn = endMust || pf.endCard;
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
    if (!b.ai.group) return setErr("공실뉴스 스튜디오를 껐다 켜 주세요 (씬 정리 기능을 새로 연결해요)");
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
  useEffect(() => {
    if (autoStart && !started.current) {
      started.current = true;
      void start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  /* ── AI 편집 시작 ── */
  const start = async () => {
    if (!b.ai.edit) return setErr("공실뉴스 스튜디오를 껐다 켜 주세요 (AI 편집 기능을 새로 연결해요)");
    setErr("");
    setRows(null);
    const off = b.onProgress((t) => setBusy(t));
    try {
      const all = flat;
      const targets = (onlySel && selected.length ? all.filter((x) => selected.includes(x.clip.id)) : all).filter((x) => clipText(x.clip).trim());
      if (!targets.length) throw new Error("편집할 클립이 없어요 (자막·글이 있는 클립이 필요해요). 먼저 [자동 자막 만들기]를 해 주세요.");
      const locked = targets.map((x, i) => (screenOf(x.clip) ? i + 1 : 0)).filter(Boolean);
      const ok = mats.filter((f) => f.path);
      const seq = pf.order === "seq";
      const aiMax = pf.aiOn ? pf.aiMax : 0;
      // 1) 글 AI — 편집 계획
      setBusy(`${aiName}가 편집 계획을 세우는 중… (1~2분)`);
      // 스타일 팩 — 고른 팩, [자동]이면 AI 가 대본을 읽고 고른다. 모양(자막·정보 바·제목·전환·소리)은 팩이 정하고 AI 는 어디에 넣을지만
      const chosen = pf.pack !== "auto" ? packOf(pf.pack) : null;
      const cat = aiEditCatalog();
      cat.presets = []; // 자막 모양은 팩이
      if (chosen && chosen.graphics === "none") cat.stickers = [];
      if (chosen && chosen.sfx === "none") cat.sfx = [];
      const plan = await b.ai.edit(targets.map((x) => clipText(x.clip)), seq ? [] : ok.map((f) => ({ path: f.path!, kind: f.kind, duration: f.duration })),
        { aiMax: seq ? 0 : aiMax, moods: [...MUSIC_MOODS], screen: !seq, ratio: project.ratio, catalog: cat, kind, request: pf.request, locked, stock: pf.stock, graphics: chosen?.graphics || "some", sfx: chosen?.sfx || "some", ai: aiUse,
          ...(chosen ? {} : { packs: STYLE_PACKS.map((x) => ({ id: x.id, label: x.label, desc: x.desc })) }) });
      const P: StylePack = chosen || packOf(plan.pack || "") || defaultPack(kind, project.ratio);
      const doStk = P.graphics !== "none";
      const SX = P.sfx;
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
      // 2) 화면 — 빈 클립만: 내 자료(넣은 순서 또는 AI) · AI 그림 · 무료 자료 · 그래도 비면 넣은 자료 다시
      const vis: Record<string, { asset: string; s: number }> = {};
      const done: Row[] = [];
      const orient = project.ratio === "9:16" || project.ratio === "4:5" ? "portrait" : project.ratio === "1:1" ? "square" : "landscape";
      const usedStock = new Set<string>();
      const sty = IMAGE_STYLES.find((x) => x.id === P.img) || IMAGE_STYLES.find((x) => x.id === "realistic")!; // 그림 스타일도 팩이
      let aiNo = 0;
      const aiTotal = plan.clips.filter((x) => x.act === "ai").length;
      let seqK = 0;
      for (let i = 0; i < targets.length; i++) {
        const c = targets[i].clip;
        const pl = plan.clips[i] || { act: "keep" };
        let what = screenOf(c) ? "그대로 (넣어 둔 화면)" : "빈칸";
        if (!screenOf(c)) {
          try {
            if (seq && ok.length && seqK < ok.length) {
              const a = await ensureAsset(ok[seqK]);
              vis[c.id] = { asset: a.id, s: 0 };
              what = `넣은 순서 ${seqK + 1}번`;
              seqK++;
            } else if (pl.act === "same" && i > 0 && vis[targets[i - 1].clip.id]) {
              const pv = vis[targets[i - 1].clip.id];
              vis[c.id] = { asset: pv.asset, s: pv.s + targets[i - 1].dur };
              what = "앞 화면 이어서";
            } else if (pl.act === "foot" && typeof pl.v === "number" && ok[pl.v]) {
              const a = await ensureAsset(ok[pl.v]);
              vis[c.id] = { asset: a.id, s: pl.t || 0 };
              what = `내 자료 ${pl.v + 1}${ok[pl.v].kind === "video" ? ` · ${Math.round(pl.t || 0)}초부터` : ""}`;
            } else if (pl.act === "ai" && pl.desc && aiMax > 0) {
              aiNo++;
              setBusy(`${imager}가 그림을 그리는 중… (${aiNo}/${aiTotal}) — 한 장에 30초~1분`);
              const it = await b.ai.image(project.dir, `${imagePrompt(pl.desc, sty)} ${orient === "portrait" ? "Vertical 9:16 composition." : orient === "square" ? "Square composition." : "Horizontal 16:9 composition."}`, { ratio: project.ratio });
              const a = await ensureAsset(it);
              vis[c.id] = { asset: a.id, s: 0 };
              what = `AI 그림 (${sty.label}) · ${pl.desc}`;
            } else if (pl.act === "stock" && pl.keywords && pf.stock) {
              setBusy(`무료 자료를 찾는 중… "${pl.keywords}"`);
              const r = await b.stock.search(pl.keywords, "video", orient);
              const pick: StockItem | undefined = (r.items || []).find((x) => !usedStock.has(x.id));
              if (pick) {
                usedStock.add(pick.id);
                const it = await b.stock.get(project.dir, pick);
                const a = await ensureAsset(it);
                vis[c.id] = { asset: a.id, s: 0 };
                what = `무료 영상 · ${pl.keywords}`;
              }
            }
            // 그래도 비면 — 넣은 자료를 다시 (바로 앞과 같은 화면은 피해서)
            if (!vis[c.id] && ok.length) {
              const prev = i > 0 ? vis[targets[i - 1].clip.id]?.asset || screenOf(targets[i - 1].clip) : "";
              for (let k = 0; k < ok.length; k++) {
                const a = await ensureAsset(ok[(i + k) % ok.length]);
                if (a.id !== prev) {
                  vis[c.id] = { asset: a.id, s: 0 };
                  what = `내 자료 다시 · ${ok[(i + k) % ok.length].name}`;
                  break;
                }
              }
            }
          } catch (e) {
            what = `빈칸 (못 넣음: ${errText(e)})`;
          }
        }
        const extra = [pf.keyText && pl.title && `정보 바 "${pl.title}"`, pl.emph && "자막 강조", pl.trans && "화면전환", stk[c.id] && `그래픽 "${stk[c.id].spec.text}"`, SX !== "none" && pl.sfx && `효과음 ${SFX_LIST.find((x) => x.id === pl.sfx)?.label || pl.sfx}`].filter(Boolean).join(" · ");
        done.push({ n: i + 1, text: clipText(c), what: extra ? `${what} · ${extra}` : what });
      }
      // 3) 배경음악 — 없을 때만
      let music: { file: string; url: string; name: string } | null = null;
      if (!(project.layers || []).some((l) => l.type === "music")) {
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
      apply((p) => {
        delete p.settings.aiAuto;
        p.kind = kind;
        p.materials = mats;
        const find = (id: string): Clip | undefined => p.scenes.flatMap((s) => s.clips).find((x) => x.id === id);
        p.layers = (p.layers || []).filter((l) => !/^AI (제목|채널명|구독|핵심 글자|정보 바)$/.test(l.name || "") && !(l.type === "text" && !l.name && l.box && l.boxColor === "#1A3A6B" && l.size === 120)); // 다시 AI 편집하면 고쳐 쓴다 (예전 남색 상자 핵심 글자도 지움)
        targets.forEach((x, i) => {
          const c = find(x.clip.id);
          const pl = plan.clips[i];
          if (!c || !pl) return;
          if (vis[c.id] && !screenOf(c)) c.visual = vis[c.id];
          if (pl.trans) { const ty = transType(i); const sx = transSfx(ty); c.trans = { type: ty, a: 0.3, b: 0.3, ...(sx ? { sfx: sx } : {}) }; }
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
          const pre = SUB_PRESETS.flatMap((g) => g.items).find((x) => x.id === P.sub);
          const anim: LayerAnim = { ...(sub.anim || {}), in: P.subIn as LayerAnim["in"], out: "fade", emph: undefined };
          // 쇼츠(세로) — 한 단어씩 + 말하는 단어 색+커지기 로 고정 (2026-10-20 사장님). 쇼츠 팩도 같다
          const shortsV = P.word || p.ratio === "9:16" || p.ratio === "4:5";
          if (shortsV) { anim.wshow = "word"; anim.whl = "both"; anim.wcolor = (lk && /^#[0-9a-f]{6}$/i.test(lk.wcolor || "") && lk.wcolor) || "#FFE000"; }
          else { anim.wshow = undefined; anim.whl = undefined; }
          p.settings.subtitle = { ...sub, ...(pre ? { ...(PLAIN_LOOK as Partial<typeof sub>), ...pre.look } : {}), anim };
        }
        softCuts(p, transType); // 화면이 바뀌는 곳마다 팩의 전환
        for (const it of flatten(p).items) { const tr = it.clip.trans; if (tr && !tr.sfx) { const sx = transSfx(tr.type); if (sx) tr.sfx = sx; } }
        const items = flatten(p).items.filter((x) => x.clip.card !== "end");
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
      done.unshift({ n: 0, text: "", what: `스타일 팩 · ${P.label}${pf.pack === "auto" ? " (AI가 골랐어요)" : ""} — ${P.desc}` });
      setRows(done);
    } catch (e) {
      if (autoStart) apply((p) => { delete p.settings.aiAuto; });
      setErr(errText(e));
    } finally {
      off();
      setBusy("");
    }
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

  const footer = rows ? (
    <>
      <Btn onClick={() => { onUndo(); setRows(null); }}><Icon name="undo" size={15} />한 번에 되돌리기</Btn>
      <Btn primary onClick={onClose} style={{ height: 46, padding: "0 26px", fontSize: 16 }}><Icon name="check" size={17} />확인</Btn>
    </>
  ) : (
    <>
      <Btn onClick={onClose}>닫기</Btn>
      <Btn primary disabled={Boolean(busy)} onClick={() => void start()} style={{ height: 46, padding: "0 26px", fontSize: 16 }}><Icon name="ai" size={18} />{busy ? "편집하는 중…" : "AI 편집 시작"}</Btn>
    </>
  );

  // 편집 화면 바깥(문서 맨 위)에 띄운다 — 타임라인 편집의 작은 칸 안에서 불러도 늘 화면 가운데 큰 창으로
  return createPortal(
    <Modal title="AI 편집" onClose={busy ? undefined : onClose} width={1440} footer={footer}>
      <div style={{ display: "flex", minHeight: "calc(92vh - 140px)", fontFamily: FONT, color: C.text }}>
        {/* 왼쪽 — 설정 */}
        <div style={{ width: 560, flexShrink: 0, padding: "6px 26px 20px", borderRight: `1px solid ${C.line}`, overflowY: "auto" }}>
          {/* ① 영상 종류 */}
          <div style={sec}>
            {head("영상 종류")}
            <div style={{ display: "flex", gap: 6 }}>{KINDS.map((k) => <button key={k.id} type="button" onClick={() => setKind(k.id)} style={chip(kind === k.id)}>{k.label}</button>)}</div>
            <div style={{ fontSize: 12.5, color: C.dim, marginTop: 6 }}>{kind === "vacancy" ? "방·주방·건물 사진 위주 · 가격·면적 강조 · 끝에 중개사무소 정보" : kind === "news" ? "자료·캡쳐 화면 위주 · 뉴스 자막바 · 출처 표시" : "내용에 맞는 화면 · 깔끔한 기본 자막"}</div>
          </div>

          {/* ② 스타일 팩 — 영상 전체 디자인 한 벌 (2026-10-20 사장님: 촌스럽지 않게, 설정은 적게) */}
          <div style={sec}>
            {head(<>스타일 팩 <span style={{ fontSize: 13, color: C.sub, fontWeight: 600 }}>· 자막·정보 바·제목·전환·소리·음악·끝 화면을 한 벌로</span></>)}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 6 }}>
              {[{ id: "auto", label: "✦ AI가 골라요", desc: "대본을 읽고 어울리는 팩으로", swatch: ["#1e3a8a", "#60A5FA"] as [string, string], title: { fg: "#FFFFFF", box: "#000000", op: 0.4 } }, ...STYLE_PACKS].map((x) => {
                const on = pf.pack === x.id;
                return (
                  <button key={x.id} type="button" title={x.desc} onClick={() => set("pack", x.id)}
                    style={{ minWidth: 0, padding: 5, borderRadius: 8, border: `2px solid ${on ? C.accent : C.line2}`, background: on ? C.accentDim : "transparent", cursor: "pointer", textAlign: "left", fontFamily: FONT }}>
                    <span style={{ position: "relative", display: "block", height: 54, borderRadius: 5, overflow: "hidden", background: `linear-gradient(135deg, ${x.swatch[0]}, ${x.swatch[0]}cc)` }}>
                      <span style={{ position: "absolute", left: 6, top: 6, height: 9, width: "46%", borderRadius: 2, background: x.title.box, opacity: Math.max(0.5, x.title.op), border: `1px solid ${x.swatch[1]}55` }} />
                      <span style={{ position: "absolute", left: 6, bottom: 16, height: 8, width: "38%", borderRadius: 2, background: x.swatch[1] }} />
                      <span style={{ position: "absolute", left: "18%", right: "18%", bottom: 5, height: 5, borderRadius: 2, background: x.swatch[0] === "#F3F4F6" || x.swatch[0] === "#FFFBEB" || x.swatch[0] === "#ECFDF5" ? "#111827" : "#FFFFFF", opacity: 0.85 }} />
                    </span>
                    <span style={{ display: "block", fontSize: 12.5, fontWeight: 800, color: C.text, marginTop: 5 }}>{on ? "✓ " : ""}{x.label}</span>
                    <span style={{ display: "block", fontSize: 11, color: C.dim, marginTop: 1, lineHeight: 1.35, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{x.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ② 화면 채우기 */}
          <div style={sec}>
            {head(<>화면 채우기 <span style={{ fontSize: 13, color: C.sub, fontWeight: 600 }}>· 빈 클립 {emptyN}개를 채워요</span></>)}
            <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 6 }}>내가 넣을 화면·영상 <span style={{ color: C.dim, fontWeight: 600 }}>(먼저 써요 · {mats.length}/30)</span></div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <Btn small onClick={async () => addMats(await b.lib.pick().catch(() => []))}><Icon name="plus" size={14} />PC에서 추가</Btn>
              <Btn small onClick={async () => { setPickSel([]); setPicker(await b.lib.list({ kind: "all" }).catch(() => [])); }}><Icon name="folder" size={14} />내 자료에서 고르기</Btn>
              {kind === "vacancy" && <Btn small onClick={openVac}><Icon name="home" size={14} />공실 불러오기</Btn>}
            </div>
            {vacOpen && (
              <div style={{ marginTop: 8, padding: 10, borderRadius: 6, border: `1px solid ${C.line2}`, background: C.card }}>
                <select defaultValue="" onChange={(e) => e.target.value && void loadVac(e.target.value)} style={{ ...input, fontSize: 13.5, height: 36, width: "100%" }}>
                  <option value="">{vacs === null ? "내 공실 불러오는 중…" : `내 공실에서 고르기 (${vacs.length}개)`}</option>
                  {(vacs || []).map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
                </select>
                <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                  <input value={vacNo} onChange={(e) => setVacNo(e.target.value)} onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Enter" && vacNo.trim()) void findVac(); }} placeholder="번호로 찾기 — 공실번호 · 경매 관리번호" style={{ ...input, height: 34, fontSize: 13, flex: 1 }} />
                  <Btn small onClick={() => void findVac()} disabled={!vacNo.trim()}>찾기</Btn>
                  <Btn small onClick={() => setVacOpen(false)}>닫기</Btn>
                </div>
              </div>
            )}
            {mats.length > 0 ? (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                {mats.map((f, i) => (
                  <span key={f.id} title={f.name} style={{ position: "relative", width: 88, height: 54, borderRadius: 4, overflow: "hidden", background: "#000", border: `1px solid ${C.line2}` }}>
                    {(f.thumb || f.kind === "image") && <img src={f.thumb || f.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
                    <span style={{ position: "absolute", left: 3, top: 2, fontSize: 10.5, color: "#fff", background: "rgba(0,0,0,0.6)", padding: "0 4px", borderRadius: 2 }}>{i + 1}{f.kind === "video" ? ` · ${Math.round(f.duration)}초` : ""}</span>
                    {pf.order === "seq" && (
                      <span style={{ position: "absolute", left: 2, bottom: 2, display: "flex", gap: 2 }}>
                        <button type="button" title="앞으로" onClick={() => moveMat(i, -1)} style={mini}>‹</button>
                        <button type="button" title="뒤로" onClick={() => moveMat(i, 1)} style={mini}>›</button>
                      </span>
                    )}
                    <button type="button" title="빼기" onClick={() => setMats((v) => v.filter((x) => x.id !== f.id))} style={{ ...mini, position: "absolute", right: 2, top: 2 }}>✕</button>
                  </span>
                ))}
              </div>
            ) : <div style={{ fontSize: 12.5, color: C.dim, marginTop: 8 }}>넣은 화면이 없어요. 매물 사진·현장 사진·영상을 넣으면 AI가 문장에 맞춰 골라 넣어요.</div>}
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10 }}>
              <span style={{ fontSize: 13, color: C.sub, width: 64 }}>넣는 방식</span>
              <button type="button" onClick={() => set("order", "ai")} style={chip(pf.order === "ai")}>AI가 문장에 맞춰</button>
              <button type="button" onClick={() => set("order", "seq")} style={chip(pf.order === "seq")}>넣은 순서대로</button>
            </div>
            <div style={{ fontSize: 13.5, fontWeight: 700, margin: "14px 0 6px" }}>모자라면</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button type="button" onClick={() => set("stock", !pf.stock)} style={chip(pf.stock)}>{pf.stock ? "✓ " : ""}무료 영상·사진</button>
              <button type="button" onClick={() => set("aiOn", !pf.aiOn)} style={chip(pf.aiOn)}>{pf.aiOn ? "✓ " : ""}AI 그림 ({imager})</button>
            </div>
            {pf.aiOn && (
              <div style={{ marginTop: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: C.sub, width: 64 }}>최대</span>
                  {[2, 4, 8, 12].map((n) => <button key={n} type="button" onClick={() => set("aiMax", n)} style={{ ...chip(pf.aiMax === n), height: 30, padding: "0 10px" }}>{n}장</button>)}
                  <span style={{ fontSize: 12, color: C.dim }}>한 장에 30초~1분</span>
                </div>
                <div style={{ fontSize: 12, color: C.dim }}>그림 스타일은 스타일 팩에 맞춰요.</div>
              </div>
            )}
            <div style={{ fontSize: 12, color: C.dim, marginTop: 8 }}>순서: 내가 넣은 화면 → 무료 영상·사진 → AI 그림 → 그래도 비면 넣은 화면을 다시 (연달아 같은 화면은 안 씀). 이미 화면이 있는 클립은 그대로 둬요.</div>
          </div>

          {/* ⑧ AI에게 요청 */}
          <div style={sec}>
            {head(<>AI에게 요청 <span style={{ fontSize: 13, color: C.dim, fontWeight: 600 }}>(선택)</span></>)}
            <textarea value={pf.request} onChange={(e) => set("request", e.target.value)} onKeyDown={(e) => e.stopPropagation()} rows={2} placeholder="예: 가격은 빨간색으로 크게, 사람 얼굴 나오는 영상은 빼 줘"
              style={{ ...input, height: "auto", width: "100%", boxSizing: "border-box", padding: 10, lineHeight: 1.5, resize: "vertical", fontSize: 13.5 }} />
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 6 }}>
              {REQ_CHIPS.map((t) => <button key={t} type="button" onClick={() => set("request", pf.request.includes(t) ? pf.request : `${pf.request.trim() ? `${pf.request.trim()}, ` : ""}${t}`)} style={{ ...chip(false), height: 28, padding: "0 9px", fontSize: 12.5 }}>+ {t}</button>)}
            </div>
          </div>

          {/* ⑨ 쓸 AI */}
          <div style={{ ...sec, borderBottom: 0 }}>
            {head("쓸 AI")}
            <AiPick value={aiSel} onChange={setAiSel} list={aiList} noTitle />
          </div>

          {/* 더 바꾸기 — 처음엔 접어 둠 (팩이 다 정해 주니 회원은 몰라도 된다) */}
          <div style={{ paddingTop: 14, borderTop: `1px solid ${C.line}` }}>
            <button type="button" onClick={() => setOpen((o) => ({ ...o, more: !o.more }))} style={{ ...chip(Boolean(open.more)), width: "100%", height: 38 }}>{open.more ? "▲ 접기" : "▼ 더 바꾸기 — 제목·채널명·구독 · 끝 화면 디자인 · 정보 바 · 편집할 클립"}</button>
          </div>
          {open.more && (
            <div style={{ paddingTop: 4 }}>
          {/* ⑥ 제목·채널명·구독 */}
          {fold2("brand", "제목·채널명·구독", [pf.titleOn && "제목", pf.channelOn && "채널명", pf.subscribe && "구독·좋아요"].filter(Boolean).join(" · ") || "안 넣음", (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <button type="button" onClick={() => set("titleOn", !pf.titleOn)} style={{ ...chip(pf.titleOn), width: 110 }}>{pf.titleOn ? "✓ " : ""}제목 (왼쪽 위)</button>
                <input value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.stopPropagation()} placeholder="예: 논현동 빌라 전세 5억" maxLength={30} disabled={!pf.titleOn} style={{ ...input, height: 34, fontSize: 13.5, flex: 1 }} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <button type="button" onClick={() => set("channelOn", !pf.channelOn)} style={{ ...chip(pf.channelOn), width: 110 }}>{pf.channelOn ? "✓ " : ""}채널명 (오른쪽 위)</button>
                <input value={channel} onChange={(e) => set("channel", e.target.value)} onKeyDown={(e) => e.stopPropagation()} placeholder="예: ○○부동산 (처음엔 중개사무소 상호)" maxLength={24} disabled={!pf.channelOn} style={{ ...input, height: 34, fontSize: 13.5, flex: 1 }} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <button type="button" onClick={() => set("subscribe", !pf.subscribe)} style={{ ...chip(pf.subscribe), width: 110 }}>{pf.subscribe ? "✓ " : ""}구독·좋아요</button>
                {pf.subscribe && SUB_AT.map(([k, l]) => <button key={k} type="button" onClick={() => set("subAt", k)} style={{ ...chip(pf.subAt === k), height: 30 }}>{l}</button>)}
                <span style={{ fontSize: 12, color: C.dim }}>[그래픽 › 구독·좋아요]의 움직이는 버튼 한 번 · 딸깍</span>
              </div>
            </div>
          ))}

          {/* ⑦ 끝 화면 */}
          {fold2("end", "끝 화면 (부동산 표시광고)", `${endMust ? "매물 광고는 꼭 넣어요" : pf.endCard ? "넣음" : "안 넣음"}${endOn ? ` · ${pf.endDesign || "팩에 맞춰"}` : ""}`, (
            <div>
              {!endMust && <button type="button" onClick={() => set("endCard", !pf.endCard)} style={chip(pf.endCard)}>{pf.endCard ? "✓ " : ""}끝 화면 넣기</button>}
              {endOn && (
                <>
                  <div style={{ fontSize: 13, fontWeight: 700, margin: "8px 0 6px" }}>디자인 — 부동산 표시광고 (움직여요)</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6 }}>
                    {AD_LAW_LABELS.map((lb) => (
                      <button key={lb} type="button" onClick={() => set("endDesign", lb)} title={lb}
                        style={{ padding: 6, borderRadius: 7, border: `2px solid ${pf.endDesign === lb ? C.accent : C.line2}`, background: "#2b303b", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                        {endThumbs[lb] ? <img src={endThumbs[lb]} alt="" style={{ width: "100%", height: 96, objectFit: "contain" }} /> : <span style={{ height: 96, display: "flex", alignItems: "center", color: C.dim, fontSize: 12 }}>{agency ? "그리는 중…" : "정보를 불러오는 중…"}</span>}
                        <span style={{ fontSize: 12.5, fontWeight: 700, color: pf.endDesign === lb ? C.text : C.sub, fontFamily: FONT }}>{pf.endDesign === lb ? "✓ " : ""}{lb}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
              <div style={{ fontSize: 12, color: C.dim, marginTop: 6, lineHeight: 1.5 }}>상호부터 — 상호 · 대표 공인중개사 · 등록번호 · 소재지·연락처{kind === "vacancy" ? " + 매물 정보(소재지·면적·가격·거래 형태·층·방향 등, 공실 등록 값 그대로)" : ""}. 5초.</div>
            </div>
          ))}
          {missing.length > 0 && <div style={{ marginTop: 8, padding: "8px 10px", borderRadius: 6, border: `1px solid ${C.danger}`, color: C.danger, fontSize: 12.5, lineHeight: 1.5 }}>끝 화면에 {missing.join(" · ")}이(가) 비어 있어요. 회원 정보(중개사무소)에서 채워 주세요. 매물 광고에 꼭 들어가야 하는 값이에요.</div>}

              <div style={sec}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 800, flex: 1 }}>정보 바 <span style={{ fontSize: 12.5, color: C.dim, fontWeight: 600 }}>· 가격·면적을 아래 왼쪽 띠로 (영상 하나에 3번까지)</span></span>
                  <button type="button" onClick={() => set("keyText", !pf.keyText)} style={chip(pf.keyText)}>{pf.keyText ? "✓ 넣기" : "안 넣음"}</button>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", paddingTop: 6 }}>
            <span style={{ fontSize: 13, color: C.sub, marginRight: 4 }}>편집할 클립</span>
            <button type="button" onClick={() => setOnlySel(false)} style={chip(!onlySel)}>모든 클립</button>
            <button type="button" onClick={() => setOnlySel(true)} disabled={!selected.length} style={{ ...chip(onlySel), opacity: selected.length ? 1 : 0.5 }}>고른 클립 ({selected.length}개)</button>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.line}` }}>
            <span style={{ fontSize: 13, color: C.sub, marginRight: 4 }}>바로 쓰는 도구</span>
            <Btn small onClick={() => { let n = 0; apply((p) => { n = softCuts(p); }); setErr(""); setRows([{ n: 0, text: "", what: n ? `화면이 바뀌는 ${n}곳에 부드러운 전환을 넣었어요` : "넣을 곳이 없어요 (이미 전환이 있거나 같은 화면)" }]); }}>
              <Icon name="transition" size={14} />화면 바뀌는 곳 부드럽게
            </Btn>
            <Btn small onClick={() => void group()} disabled={Boolean(busy)}><Icon name="ai" size={14} />씬 정리</Btn>
          </div>
            </div>
          )}
        </div>

        {/* 오른쪽 — 클립 한눈에 · 진행 · 결과 */}
        <div style={{ flex: 1, minWidth: 0, padding: "18px 24px", overflowY: "auto" }}>
          {busy && <div style={{ marginBottom: 12, padding: 14, borderRadius: 8, background: C.card, border: `1px solid ${C.accent}`, fontSize: 14.5, lineHeight: 1.6 }}>{busy}<div style={{ fontSize: 12.5, color: C.sub, marginTop: 4 }}>이 창을 닫지 마세요. 끝나면 결과를 여기에 보여 줘요.</div></div>}
          {err && <div style={{ marginBottom: 12, fontSize: 14, color: C.danger, lineHeight: 1.6 }}>{err}</div>}
          {rows ? (
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 8 }}>{rows.some((r) => r.n > 0) ? "편집했어요 — 마음에 안 드는 클립은 편집 화면에서 바꾸거나 한 번에 되돌리기" : "다 했어요"}</div>
              {rows.map((r, i) => (
                <div key={i} style={{ padding: "8px 0", borderBottom: `1px solid ${C.line}`, fontSize: 13.5 }}>
                  {r.n > 0 && <div style={{ color: C.sub, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.n}. {r.text}</div>}
                  <div style={{ color: /^(그대로|빈칸)/.test(r.what) ? C.dim : C.text, fontWeight: 700, marginTop: 2 }}>→ {r.what}</div>
                </div>
              ))}
            </div>
          ) : (
            <div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: 15, fontWeight: 800 }}>클립 {flat.length}개</span>
                <span style={{ fontSize: 13, color: C.sub }}>빈 클립 {emptyN}개를 AI가 채워요 · 화면이 있는 {flat.length - emptyN}개는 그대로</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {flat.map((x, i) => {
                  const th = thumbOf(x.clip);
                  const has = Boolean(screenOf(x.clip));
                  return (
                    <div key={x.clip.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 8px", borderRadius: 6, background: has ? "transparent" : "rgba(59,130,246,0.07)" }}>
                      <span style={{ width: 24, fontSize: 12.5, color: C.dim, textAlign: "right" }}>{i + 1}</span>
                      <span style={{ width: 84, height: 47, flexShrink: 0, borderRadius: 4, overflow: "hidden", background: "#000", border: `1px ${has ? "solid" : "dashed"} ${has ? C.line2 : C.accent}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11.5, color: C.accent }}>
                        {th ? <img src={th} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : has ? "" : "빈칸"}
                      </span>
                      <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{clipText(x.clip) || <span style={{ color: C.dim }}>(글 없음)</span>}</span>
                      {!has && <span style={{ fontSize: 12, color: C.accent, flexShrink: 0 }}>AI가 채움</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 내 자료에서 고르기 */}
      {picker && (
        <Modal title="내 자료에서 고르기" onClose={() => setPicker(null)} width={760}
          footer={<><Btn onClick={() => setPicker(null)}>취소</Btn><Btn primary onClick={() => { addMats(picker.filter((x) => pickSel.includes(x.id))); setPicker(null); }}><Icon name="check" size={16} />{pickSel.length}개 넣기</Btn></>}>
          <div style={{ padding: 16, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8, maxHeight: "60vh", overflowY: "auto" }}>
            {picker.filter((x) => x.kind === "video" || x.kind === "image").map((x) => {
              const on = pickSel.includes(x.id);
              return (
                <button key={x.id} type="button" onClick={() => setPickSel((v) => (on ? v.filter((y) => y !== x.id) : [...v, x.id]))} title={x.name}
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

const mini: React.CSSProperties = { width: 18, height: 18, borderRadius: 9, border: 0, background: "rgba(0,0,0,0.65)", color: "#fff", cursor: "pointer", fontSize: 11, lineHeight: "18px", padding: 0 };
