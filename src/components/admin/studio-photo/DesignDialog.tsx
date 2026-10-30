"use client";

// 이미지 편집 — 새로 만들기 (2026-10-30 사장님: 새로운 문서 + AI 자동 디자인을 한 창으로)
//  1. 재료: 없음(빈 문서·템플릿) · 내 공실 · 공실뉴스 기사  →  2. 종류 · 크기  →  3. 레이아웃(맨 앞 [빈 문서])  →  미리보기 · 빈 문서 세부 설정
//  재료가 없으면 칸 이름 그대로(템플릿 열기), 재료가 있으면 AI가 제목·부제·키워드 문구만 쓴다. 가격·면적·주소·중개사는 자료 그대로 (가짜 데이터 금지)
//  배경은 고른 사진 그대로 (AI로 그리거나 다듬지 않음) — 기사는 뉴스칼럼 배경 사진
import React, { useEffect, useMemo, useState } from "react";
import { loadFont } from "@/components/admin/studio-video/Pickers";
import { Btn, C, FONT, Modal, input } from "@/components/admin/studio-video/ui";
import { videoBridge, type LibItem } from "@/components/admin/studio-video/types";
import { getStudioAgency, getMyStudioArticlePhotos, getStudioArticle, listMyStudioArticles, listMyStudioVacancies } from "@/app/actions/studio";
import { IMAGE_STYLES, imagePrompt } from "@/lib/studio-video/imageStyles";
import { bytesToCanvas, composite, kids, mk, openPsdBytes, walk, type PsdGuide } from "./model";
import { newsLabelOf, aspectOf, contentFor, isOwnSize, layoutFonts, layoutsForCat, loadSampleBg, sampleBgFor, placeholderBg, placeholderContent, previewOf, refill, type Cat, type CatSize, type Content, type Layout } from "./layouts";
import { PRESETS, readRecentSizes, saveRecentSize, type NewInit, type Preset } from "./presets";
import type { MyTpl } from "./DesignSide";

type Vac = { id: string; vacancy_no: number; building_name: string | null; trade_type: string | null; property_type: string | null; address: string; photo: string | null; photoCount: number };
type Art = { id: string; no: number | null; title: string; author: string; date: string; thumb?: string | null };
type FileRes = { path: string; name: string; bytes?: Uint8Array; error?: string };
type Bridge = { readFile?: (f: string) => Promise<FileRes>; tplRead?: (file: string) => Promise<FileRes>; aiDesign?: (o: { kind: string; facts: string; size: string; request?: string }) => Promise<{ title: string; sub: string; badge: string; scene: string; retouch: string }> };
export type DesignResult = {
  w: number; h: number; ppi?: number; content: Content; bg: HTMLCanvasElement | null; aiMark: boolean;
  layout?: Layout; mine?: MyTpl; refill?: boolean;
  meta: { src: { kind: "vacancy" | "article"; id: string; no?: string; title?: string }; ai?: { prompt: string; style?: string; ratio?: string } };
};
export type NewDocOpts = { name: string; width: number; height: number; bg: string; ppi: number; guides?: PsdGuide[]; mode: "rgb" | "cmyk" };
export const ratioOf = (w: number, h: number) => (w / h > 1.2 ? "16:9" : w / h < 0.85 ? "9:16" : "1:1");
const compo = (w: number, h: number) => (w / h > 1.2 ? "Horizontal 16:9 composition." : w / h < 0.85 ? "Vertical 9:16 composition." : "Square composition.");

/** 탭 차례 — 기본 → 유튜브 · 블로그 · SNS · 부동산마케팅 → 최근 사용 */
const TABS = [...PRESETS.filter((p) => p.id === "basic"), ...PRESETS.filter((p) => p.id !== "basic")].map((p) => ({ id: p.id, label: p.label })).concat({ id: "recent", label: "최근 사용" });
const presetKey = (p: Preset) => `${p.name}${p.w}x${p.h}`;

export function DesignDialog({ init, start = "vacancy", newInit, canRefill, mine, onDone, onCreate, onOpenMine, onMineRemove, onClose }: {
  /** 샘플에서 [AI로 채우기] — 종류 · 크기 · 틀을 골라 둔 채로 */
  init?: { cat: Cat; size: CatSize; layout?: string } | null;
  /** none = [새 파일] (재료 없음 · 빈 문서부터) · vacancy = [AI 자동제작] (내 공실부터) */
  start?: "none" | "vacancy";
  /** 처음 화면에서 고른 종류 · 크기 */
  newInit?: NewInit | null;
  canRefill: boolean;
  mine: MyTpl[];
  onDone: (r: DesignResult) => void;
  /** 빈 문서 만들기 */
  onCreate: (o: NewDocOpts) => void;
  /** 재료 없이 내 템플릿 열기 */
  onOpenMine: (t: MyTpl) => void;
  onMineRemove?: (t: MyTpl) => void;
  onClose: () => void;
}) {
  const b = (typeof window !== "undefined" ? (window as unknown as { gongsilStudio?: { photo?: Bridge } }).gongsilStudio?.photo : null) || null;
  const vb = videoBridge();
  const [kind, setKind] = useState<"none" | "vacancy" | "article">(start);
  const [vacs, setVacs] = useState<Vac[] | null>(null);
  const [arts, setArts] = useState<Art[] | null>(null);
  const [q, setQ] = useState("");
  const [pick, setPick] = useState<string>("");
  const [photos, setPhotos] = useState<LibItem[]>([]);
  const [vinfo, setVinfo] = useState<{ title?: string; priceText?: string; location?: string; fields?: { label: string; value: string }[] } | null>(null);
  const [photo, setPhoto] = useState<string>("");
  /** 기사 사진 (주소) — 고른 내 기사에 쓴 사진 중 배경 (2026-10-30 사장님: 내 공실처럼) */
  const [artPhotos, setArtPhotos] = useState<string[]>([]);
  const [photoUrl, setPhotoUrl] = useState("");
  /** 배경 사진 탭 — src = 기사·매물 사진 · mine = 내 이미지 */
  const [bgTab, setBgTab] = useState<"src" | "mine">("src");
  const [req, setReq] = useState("");
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");

  /* ── 2. 종류 · 크기 ── */
  const recent = useMemo(() => readRecentSizes(), []);
  const listOf = (t: string): Preset[] => (t === "recent" ? recent : PRESETS.find((p) => p.id === t)?.items || []);
  const tab0 = newInit?.tab || init?.cat || (start === "none" ? "basic" : "youtube");
  const p0 = newInit?.preset || (init ? listOf(tab0).find((p) => p.name === init.size.name) || listOf(tab0).find((p) => p.w === init.size.w && p.h === init.size.h) : undefined) || listOf(tab0)[0];
  const [tab, setTab] = useState(tab0);
  const [preset, setPreset] = useState<Preset | undefined>(p0);
  const cat: Cat = tab === "recent" ? "basic" : (tab as Cat);
  const size: CatSize = preset ? { name: preset.name, w: preset.w, h: preset.h, ppi: preset.ppi } : { name: "", w: 1080, h: 1080 };
  /* 빈 문서 세부 설정 (포토샵 [새로운 문서] 오른쪽) */
  const [name, setName] = useState(p0?.name || "제목 없음-1");
  const [w, setW] = useState(p0?.w || 1080), [h, setH] = useState(p0?.h || 1080), [ppi, setPpi] = useState(p0?.ppi || 72);
  const [bgc, setBgc] = useState("white");
  const [mode, setMode] = useState<"rgb" | "cmyk">((p0?.ppi || 72) >= 100 ? "cmyk" : "rgb"); // 인쇄물은 CMYK 가 기본
  const [guides, setGuides] = useState<PsdGuide[] | undefined>(p0?.guides);
  const [unit, setUnit] = useState<Unit>("px");
  const choosePreset = (p: Preset) => {
    setPreset(p);
    setW(p.w); setH(p.h); setPpi(p.ppi || 72); setGuides(p.guides); setMode((p.ppi || 72) >= 100 ? "cmyk" : "rgb");
    if (/^제목 없음/.test(name) || PRESETS.some((c) => c.items.some((x) => x.name === name))) setName(p.name);
    setLay("");
  };
  const chooseTab = (t: string) => { setTab(t); const first = listOf(t)[0]; if (first) choosePreset(first); else setPreset(undefined); setLay(""); };

  useEffect(() => {
    if (kind === "vacancy" && vacs === null) listMyStudioVacancies().then((r) => setVacs(r.success ? (r.data as Vac[]) : [])).catch(() => setVacs([]));
    if (kind === "article" && arts === null) listMyStudioArticles("").then((r) => setArts(r.success ? r.data : [])).catch(() => setArts([]));
  }, [kind]); // eslint-disable-line react-hooks/exhaustive-deps
  // 공실이 하나뿐이면 바로 골라 둔다 (목록에 보이는데 안 고른 줄 몰라 [AI로 채우기]가 막히지 않게)
  useEffect(() => {
    if (kind === "vacancy" && vacs?.length === 1 && !pick && !busy) void chooseVac(vacs[0]);
  }, [vacs, kind]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!vb) return;
    return vb.onProgress?.((t: string) => setBusy((o) => (o ? t : o)));
  }, [vb]);

  /* ── 3. 레이아웃 — 이 종류·크기의 틀 (재료가 있으면 그 재료로 만들 수 있는 것 + 중개사무소 정보로 만드는 틀) ── */
  const [lay, setLay] = useState<string>(init?.layout || "");
  const layouts = preset ? layoutsForCat(cat, size).filter((l) => kind === "none" || l.kind.includes(kind) || l.kind.includes("agency")) : [];
  const layId = lay || (kind === "none" ? "@blank" : canRefill ? "@refill" : layouts[0]?.id || "");

  const [agencyData, setAgencyData] = useState<{ name: string; ceo: string; regNum: string; phone: string; address: string; homepage?: string; sns?: string } | null>(null);
  useEffect(() => { getStudioAgency().then((a) => { if (a.success && a.data.name) setAgencyData(a.data); }).catch(() => {}); }, []);
  const agencyLine = agencyData ? [agencyData.name, agencyData.phone].filter(Boolean).join(" · ") : "";
  /** 중개사무소 정보 칸 (명함 등) — 회원 정보 그대로, 없으면 비운다 */
  const agencyContent = (): Content => (agencyData ? { office: agencyData.name, ceo: agencyData.ceo ? `대표 공인중개사 ${agencyData.ceo}` : "", phone: agencyData.phone, officeAddr: agencyData.address, regNum: agencyData.regNum ? `등록번호 ${agencyData.regNum}` : "", homepage: agencyData.homepage || "", sns: agencyData.sns || "" } : {});
  /* ── 미리보기: 고른 사진 위에 틀을 그대로 조립 (칸에는 자료 값, 없으면 칸 이름) ── */
  const [bgPrev, setBgPrev] = useState<HTMLCanvasElement | null>(null);
  useEffect(() => {
    let live = true;
    if (!photo && photoUrl) { urlCanvas(photoUrl).then((c) => { if (live) setBgPrev(c); }); return () => { live = false; }; }
    if (!photo || !b?.readFile) { setBgPrev(null); return; }
    b.readFile(photo).then((r) => (r.bytes ? bytesToCanvas(r.bytes) : null)).then((c) => { if (live) setBgPrev(c); }).catch(() => {});
    return () => { live = false; };
  }, [photo, photoUrl]); // eslint-disable-line react-hooks/exhaustive-deps
  /** 내 기사를 고르면 그 기사 사진들을 받아 첫 장을 배경으로 (내 공실과 같게) */
  const chooseArt = async (a: Art) => {
    setPick(a.id);
    setErr("");
    setArtPhotos([]);
    setPhoto("");
    setPhotoUrl("");
    const r = await getMyStudioArticlePhotos(a.id).catch(() => null);
    if (r?.success) { setArtPhotos(r.data); setPhotoUrl(r.data[0] || ""); if (r.data.length) setBgTab("src"); }
  };
  /* 내 이미지 — 스튜디오 [내 자료] 에 등록한 사진 (PC 에 남는다 · 동영상 편집기와 같은 보관함) */
  const [mineImgs, setMineImgs] = useState<LibItem[] | null>(null);
  const loadMineImgs = () => {
    if (!vb) return setMineImgs([]);
    // 내가 올린 사진 + AI로 만든 그림 (앱이 AI 그림을 내 자료에 "ai" 로 담는다) — AI 그림이 앞에
    Promise.all([vb.lib.list({ kind: "image", source: "ai" }).catch(() => [] as LibItem[]), vb.lib.list({ kind: "image", source: "local" })])
      // 같은 파일이 두 목록에 다 있으면 한 번만 (두 칸이 같이 골라지지 않게)
      .then(([ai, local]) => { const seen = new Set<string>(); setMineImgs([...ai, ...local].filter((x) => { const k = x.path || x.id; if (seen.has(k)) return false; seen.add(k); return true; })); })
      .catch(() => setMineImgs([]));
  };
  /** 내 이미지에서 빼기 — 목록에서만 (PC 의 사진 파일은 그대로) */
  const removeMineImg = async (p: LibItem) => {
    if (!vb) return;
    if (!window.confirm("내 이미지 목록에서 뺄까요?\nPC 에 있는 사진 파일은 그대로 남아요.")) return;
    await vb.lib.remove(p.id).catch(() => {});
    if (photo && photo === p.path) setPhoto("");
    loadMineImgs();
  };
  /* ── AI로 이미지 만들기 (2026-10-30 사장님) — 스타일 하나 + 무엇을 그릴지 → 한 장씩, 내 이미지에 담고 배경으로 ── */
  const [aiOpen, setAiOpen] = useState(false);
  const [aiStyle, setAiStyle] = useState("realistic");
  const [aiScene, setAiScene] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const makeAiImage = async () => {
    const scene = aiScene.trim();
    if (!scene) return;
    if (!vb) return setErr("스튜디오 앱에서만 돼요");
    const st = IMAGE_STYLES.find((x) => x.id === aiStyle) || IMAGE_STYLES[0];
    setAiOpen(false);
    setAiBusy(true);
    setErr("");
    try {
      const it = await vb.ai.image("", `${imagePrompt(scene, st)} ${compo(size.w, size.h)}`, { ratio: ratioOf(size.w, size.h) });
      loadMineImgs();
      if (it?.path) { setPhoto(it.path); setPhotoUrl(""); setBgTab("mine"); }
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setAiBusy(false);
    }
  };
  useEffect(() => { loadMineImgs(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const registerImgs = async () => {
    if (!vb) return setErr("스튜디오 앱에서만 등록할 수 있어요");
    try {
      const got = (await vb.lib.pick({ kinds: "media" })).filter((x) => x.kind === "image" && x.path);
      if (!got.length) return;
      loadMineImgs();
      setPhoto(got[0].path!);
      setPhotoUrl("");
      setBgTab("mine");
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  };
  const sample: Content = useMemo(() => {
    const f = (re: RegExp) => vinfo?.fields?.find((x) => re.test(x.label))?.value || "";
    const v = vacs?.find((x) => x.id === pick);
    const base = placeholderContent(agencyData || undefined);
    if (kind === "none") return base;
    return kind === "vacancy"
      ? { ...base, title: "제목은 AI가 써요", sub: "부제도 AI가 써요", badge: "#키워드", price: vinfo?.priceText || f(/가격|보증금|매매|월세|전세|임대료/) || "가격", area: f(/면적|평/) || "면적", address: vinfo?.location || v?.address || "주소", agency: agencyLine || "중개사무소" }
      : { ...base, title: "제목은 AI가 써요 (기사 내용으로)", sub: "부제", label: newsLabelOf(agencyData?.name), source: "출처 · 날짜" };
  }, [kind, vinfo, vacs, pick, agencyLine, agencyData]);
  const aiIdeas = useMemo(() => {
    if (kind === "vacancy") {
      const v = vacs?.find((x) => x.id === pick);
      const where = (vinfo?.location || v?.address || "").trim();
      const what = v?.property_type || "건물";
      return [`${where} ${what} 외관, 맑은 낮`.trim(), `${what} 밝은 거실 실내, 오후 햇살`, `${where} 동네 거리 풍경, 나무와 작은 가게`.trim()];
    }
    if (kind === "article") {
      const a = arts?.find((x) => x.id === pick);
      const ttl = (a?.title || "").replace(/^\[[^\]]*\]\s*/, "").slice(0, 40);
      return [ttl ? `${ttl} — 이 내용을 보여 주는 장면` : "", "부동산 사무실에서 고객과 상담하는 장면", "서울 도심 빌딩 숲 전경, 맑은 하늘"].filter(Boolean);
    }
    return ["한강이 보이는 밝은 거실, 오후 햇살", "서울 아파트 단지 전경, 노을", "깔끔한 부동산 사무실에서 상담하는 장면", "골목의 3층 빌라 외관, 맑은 낮"];
  }, [kind, vacs, pick, vinfo, arts]);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const aspect = aspectOf(size.w, size.h);
  const layKey = layouts.map((l) => l.id).join(",");
  /** 기사 미리보기 더미 배경 — 틀 차례대로 돌려 가며 (실제 배경은 내 이미지에서 고른 사진, 2026-10-30 사장님) */
  const colBgOf = (layoutId: string) => COLUMN_BGS[Math.max(0, layouts.findIndex((l) => l.id === layoutId)) % COLUMN_BGS.length];
  useEffect(() => {
    let live = true;
    (async () => {
      await Promise.all([...new Set(layouts.flatMap(layoutFonts))].map((f) => loadFont(f).catch(() => {})));
      // 고른 사진(공실 사진 · 내 이미지)이 있으면 그것, 없으면 샘플 사진으로 미리보기
      const bg = bgPrev || (await loadSampleBg(cat === "youtube" ? "building" : "living"));
      // 고른 사진이 없으면 틀마다 어울리는 샘플 실사 (픽사베이, 2026-10-30)
      const bgOf = async (L: Layout) => bgPrev || (await loadSampleBg(sampleBgFor(L, cat))) || bg;
      const colOn = kind === "article" && !bgPrev; // 기사 — 뉴스칼럼 배경 (틀마다 다르게)
      const out: Record<string, string> = {};
      for (const L of layouts) {
        await new Promise((r) => setTimeout(r, 0)); // 하나씩 (화면이 멈추지 않게)
        if (!live) return;
        const lbg = colOn ? (await urlCanvas(colBgOf(L.id))) || bg : await bgOf(L);
        out[L.id] = previewOf(L, size, sample, lbg, 520, false, kind === "none" ? undefined : kind);
        setThumbs({ ...out });
      }
      // 내 템플릿도 고른 사진·내용을 넣어 미리보기 (예전엔 저장할 때 그림 그대로라 사진이 안 바뀌어 보였다, 2026-10-30 사장님)
      if (bgPrev && b?.tplRead) {
        const fit = preset ? mine.filter((t) => (isOwnSize(size.name) ? t.w === size.w && t.h === size.h : !t.w || Math.abs(t.w / t.h - size.w / size.h) < 0.05)) : [];
        for (const t of fit) {
          if (!live) return;
          try {
            const r = await b.tplRead(t.file);
            if (!r.bytes) continue;
            const d = openPsdBytes(`${t.name}.psd`, r.bytes);
            const fams: string[] = [];
            walk(kids(d.psd), (l) => { if (l._slot && l._look?.font) fams.push(l._look.font); });
            await Promise.all([...new Set(fams)].map((x) => loadFont(x).catch(() => {})));
            refill(d, sample, bgPrev);
            const c = composite(d), k = Math.min(1, 520 / c.width, 520 / c.height);
            const s = mk(Math.max(1, Math.round(c.width * k)), Math.max(1, Math.round(c.height * k)));
            s.getContext("2d")!.drawImage(c, 0, 0, s.width, s.height);
            out[`@mine:${t.file}`] = s.toDataURL("image/jpeg", 0.85);
            setThumbs({ ...out });
          } catch { /* 못 읽으면 저장할 때 그림 그대로 */ }
        }
      }
    })();
    return () => { live = false; };
  }, [size.w, size.h, size.name, layKey, bgPrev, sample, kind, mine.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // 공실을 고르면 사진·정보를 받아 둔다 (처음이면 공실 분석 — 사진 내려받기)
  const chooseVac = async (v: Vac) => {
    setPick(v.id);
    setErr("");
    setPhotos([]);
    setVinfo(null);
    setPhoto("");
    if (!vb) return;
    setBusy("공실 사진·정보를 받는 중…");
    try {
      const r = await vb.vacancy(v.id);
      setPhotos(r.photos || []);
      setPhoto(r.photos?.[0]?.path || "");
      setPhotoUrl("");
      if (r.photos?.length) setBgTab("src");
      setVinfo(r.vacancy as never);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy("");
    }
  };
  const readCanvas = async (file: string) => {
    if (!b?.readFile) throw new Error("앱을 새로 받아 주세요 (사진 읽기)");
    const r = await b.readFile(file);
    if (!r.bytes) throw new Error(r.error || "사진을 읽지 못했어요");
    return bytesToCanvas(r.bytes);
  };

  /** 빈 문서 — 세부 설정 그대로 (포토샵 [새로운 문서]) */
  const makeEmpty = (o?: Preset) => {
    const ww = Math.max(1, Math.min(30000, Math.round(o?.w ?? w))), hh = Math.max(1, Math.min(30000, Math.round(o?.h ?? h)));
    const pp = o ? o.ppi || 72 : ppi;
    const nm = (o ? o.name : name).trim() || "제목 없음-1";
    saveRecentSize({ name: nm, w: ww, h: hh, ppi: pp });
    onCreate({ name: nm, width: ww, height: hh, bg: bgc, ppi: pp, guides: o ? o.guides : ww === preset?.w && hh === preset?.h ? guides : undefined, mode: o ? ((o.ppi || 72) >= 100 ? "cmyk" : "rgb") : mode });
  };

  /* 공실·기사 없이 — 칸 이름 그대로(고칠 자리)로 틀을 만든다. 가격·면적·주소는 지어내지 않음.
     배경: 고른 사진(내 이미지 · 매물 사진) 그대로 · 기사면 뉴스칼럼 배경 · 아니면 샘플 사진 */
  const makeBlank = async (chosen?: Layout, id = layId) => {
    try {
      const ag = agencyData ? { name: agencyData.name, ceo: agencyData.ceo, phone: agencyData.phone, address: agencyData.address, regNum: agencyData.regNum, homepage: agencyData.homepage, sns: agencyData.sns } : undefined;
      let content: Content = placeholderContent(ag);
      if (chosen) content = contentFor(chosen, content, kind === "none" ? undefined : kind);
      let bg: HTMLCanvasElement | null = null;
      if (photo) {
        setBusy("사진을 넣는 중…");
        bg = await readCanvas(photo);
      } else if (photoUrl) bg = await urlCanvas(photoUrl);
      else if (kind === "article") bg = await urlCanvas(colBgOf(chosen?.id || id));
      if (!bg) bg = (await loadSampleBg(sampleBgFor(chosen, cat))) || (await loadSampleBg()) || placeholderBg(size.w, size.h, "사진을 넣어 주세요"); // 샘플 사진 — [사진 바꾸기] 로 내 사진으로
      const my = id.startsWith("@mine:") ? mine.find((t) => t.file === id.slice(6)) : undefined;
      onDone({
        w: size.w, h: size.h, ppi: size.ppi, content, bg, aiMark: false,
        layout: chosen, mine: my, refill: id === "@refill",
        meta: { src: { kind: kind === "article" ? "article" : "vacancy", id: "", title: "" } },
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy("");
    }
  };

  const make = async (id = layId) => {
    setErr("");
    if (id === "@blank") return makeEmpty();
    const chosen = layouts.find((l) => l.id === id);
    if (kind === "none") {
      // 재료 없음 — 내 템플릿은 그대로 열고, 틀은 칸 이름 그대로
      const my = id.startsWith("@mine:") ? mine.find((t) => t.file === id.slice(6)) : undefined;
      if (my) return onOpenMine(my);
      return void makeBlank(chosen, id);
    }
    if (chosen && !chosen.kind.includes(kind) && chosen.kind.includes("agency")) {
      // 명함 — 공실·기사 없이 내 중개사무소 정보로 (AI 안 씀)
      if (!agencyData) return setErr("중개사무소 정보가 없어요 — 회원 정보에서 중개사무소를 먼저 등록해 주세요");
      onDone({ w: size.w, h: size.h, ppi: size.ppi, content: agencyContent(), bg: null, aiMark: false, layout: chosen, meta: { src: { kind: "vacancy", id: "", title: agencyData.name } } });
      return;
    }
    if (!pick) return void makeBlank(chosen, id); // 공실·기사를 안 골라도 틀대로 만든다 (2026-10-22 사장님)
    if (!b?.aiDesign || !vb) return setErr("스튜디오 앱에서만 돼요 (앱을 새로 받아 주세요)");
    try {
      // 1) 자료
      const content: Content = agencyContent();
      let facts = "";
      let srcTitle = "";
      let srcNo = "";
      if (kind === "vacancy") {
        const v = vacs?.find((x) => x.id === pick);
        const info = vinfo || {};
        const fields = info.fields || [];
        const f = (re: RegExp) => fields.find((x) => re.test(x.label))?.value || "";
        content.price = info.priceText || f(/가격|보증금|매매|월세|전세|임대료/);
        content.area = f(/면적|평/);
        content.address = info.location || v?.address || "";
        // QR 은 그 공실 상세 화면 — 물건접수홈페이지를 켜 두었으면 내 홈페이지 주소로 (홍보지 생성기와 같게, 2026-10-30)
        if (pick) content.homepage = `${/^https:\/\/[\w-]+\.gongsilnews\.com$/.test(agencyData?.homepage || "") ? agencyData!.homepage : "https://www.gongsilnews.com"}/gongsil/detail/${pick}`;
        srcTitle = info.title || v?.building_name || "";
        srcNo = v ? String(v.vacancy_no) : "";
        facts = [`제목: ${srcTitle}`, v?.trade_type ? `거래: ${v.trade_type}` : "", v?.property_type ? `종류: ${v.property_type}` : "", content.address ? `위치: ${content.address}` : "",
          ...fields.map((x) => `${x.label}: ${x.value}`)].filter(Boolean).join("\n");
        setBusy("중개사무소 정보를 받는 중…");
        const ag = await getStudioAgency().catch(() => null);
        if (ag?.success && ag.data.name) content.agency = [ag.data.name, ag.data.phone].filter(Boolean).join(" · ");
      } else {
        setBusy("기사를 받는 중…");
        const a = await getStudioArticle(pick);
        if (!a.success) throw new Error(a.error);
        srcTitle = a.data.title;
        srcNo = arts?.find((x) => x.id === pick)?.no ? String(arts!.find((x) => x.id === pick)!.no) : "";
        // 머리표·출처는 내 부동산 뉴스로 (공실뉴스 이름을 드러내지 않음, 2026-10-30 사장님)
        content.label = newsLabelOf(agencyData?.name);
        content.source = [content.label, a.data.publishedAt].filter(Boolean).join(" · ");
        facts = `제목: ${a.data.title}\n${a.data.body.slice(0, 5000)}`;
      }
      // 2) AI 문구
      setBusy("AI가 제목·부제·키워드를 쓰는 중…");
      const d = await b.aiDesign({ kind, facts, size: `${size.w}x${size.h}`, request: req });
      content.title = d.title || (kind === "article" ? srcTitle : "");
      content.sub = d.sub;
      content.badge = kind === "vacancy" ? d.badge : "";
      // 3) 배경 — 고른 사진만 (AI로 다듬거나 그리지 않음, 2026-10-30 사장님). 기사는 뉴스칼럼 배경, 아니면 사진 자리 → 만든 뒤 [사진 바꾸기]
      let bg: HTMLCanvasElement | null = null;
      if (photo) {
        setBusy("사진을 넣는 중…");
        bg = await readCanvas(photo);
      } else if (photoUrl) bg = await urlCanvas(photoUrl);
      if (!bg) bg = placeholderBg(size.w, size.h, "사진을 넣어 주세요");
      const my = id.startsWith("@mine:") ? mine.find((t) => t.file === id.slice(6)) : undefined;
      onDone({
        w: size.w, h: size.h, ppi: size.ppi, content, bg, aiMark: false,
        layout: chosen, mine: my, refill: id === "@refill",
        meta: { src: { kind, id: pick, no: srcNo, title: srcTitle } },
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy("");
    }
  };

  const seg = (on: boolean, text: string, go: () => void, off = false) => (
    <button type="button" onClick={go} disabled={off}
      style={{ height: 34, padding: "0 12px", borderRadius: 6, border: `1px solid ${on ? C.sel : C.line2}`, background: on ? C.sel : "transparent", color: on ? C.bg : off ? C.dim : C.sub, fontSize: 13.5, fontWeight: 700, fontFamily: FONT, cursor: off ? "default" : "pointer" }}>{text}</button>
  );
  const hd = (t: string, sub?: string) => <div style={{ fontWeight: 800, fontSize: 15, margin: "2px 0 10px" }}>{t}{sub && <span style={{ fontWeight: 500, fontSize: 12.5, color: C.dim, marginLeft: 8 }}>{sub}</span>}</div>;
  const row = (on: boolean): React.CSSProperties => ({ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${on ? C.accent : C.line}`, background: on ? "rgba(59,130,246,0.14)" : "transparent", color: C.text, cursor: "pointer", textAlign: "left", fontFamily: FONT, fontSize: 13.5 });
  // 내 템플릿 — 전용 크기(채널 배너·쇼츠 등)는 같은 크기로 저장한 것만, 나머지는 비율이 맞으면
  const myFit = preset ? mine.filter((t) => (isOwnSize(size.name) ? t.w === size.w && t.h === size.h : !t.w || Math.abs(t.w / t.h - size.w / size.h) < 0.05)) : [];
  const card = (id: string, nm: string, img: string | undefined, opts?: { blank?: boolean; mineT?: MyTpl }) => {
    const on = layId === id;
    return (
      <button key={id} type="button" onClick={() => setLay(id)} onDoubleClick={() => { setLay(id); void make(id); }}
        onContextMenu={(e) => { if (!opts?.mineT || !onMineRemove) return; e.preventDefault(); if (window.confirm(`내 템플릿 "${opts.mineT.name}" 을(를) 목록에서 지울까요?`)) onMineRemove(opts.mineT); }}
        title={opts?.mineT ? "오른쪽 클릭: 목록에서 지우기" : undefined}
        style={{ padding: 4, borderRadius: 8, border: `2px solid ${on ? C.accent : "transparent"}`, background: on ? "rgba(59,130,246,0.12)" : C.card, cursor: "pointer", display: "flex", flexDirection: "column", gap: 4, fontFamily: FONT, textAlign: "left" }}>
        <div style={{ width: "100%", aspectRatio: `${size.w} / ${size.h}`, maxHeight: 180, borderRadius: 4, overflow: "hidden", background: opts?.blank ? (bgc === "white" ? "#fff" : bgc === "transparent" ? "repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 0 0 / 10px 10px" : bgc) : "#1a1d24", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {opts?.blank ? <span style={{ color: "#9ca3af", fontSize: 28, fontWeight: 300 }}>＋</span> : img ? <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : <span style={{ color: C.dim, fontSize: 11 }}>…</span>}
        </div>
        <div title={nm} style={{ fontSize: 12.5, fontWeight: 700, color: C.text, padding: "0 2px", lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nm}</div>
      </button>
    );
  };
  const bigImg = layId.startsWith("@mine:") ? thumbs[layId] || mine.find((t) => t.file === layId.slice(6))?.thumb : thumbs[layId];
  const bigName = layId === "@refill" ? "지금 문서의 칸에 채우기" : layId === "@blank" ? "빈 문서" : layId.startsWith("@mine:") ? `내 템플릿 · ${mine.find((t) => t.file === layId.slice(6))?.name || ""}` : layouts.find((l) => l.id === layId)?.name || "";
  const list = listOf(tab);
  const portrait = h > w;
  /* 폭·높이 단위 (2026-10-30 사장님) — 속은 늘 픽셀, 보일 때만 인치·센티미터·밀리미터로 (해상도 ppi 로 바꾼다, 포토샵처럼) */
  const toUnit = (px: number) => (unit === "px" ? px : +((px / (ppi || 72)) * UNIT_PER_INCH[unit]).toFixed(unit === "mm" ? 1 : 2));
  const fromUnit = (v: number) => (unit === "px" ? Math.round(v) : Math.max(1, Math.round((v / UNIT_PER_INCH[unit]) * (ppi || 72))));
  const sizeIn = (px: number, set: (n: number) => void) => (
    <input type="number" value={toUnit(px)} step={unit === "px" ? 1 : unit === "mm" ? 1 : 0.1} min={0}
      onChange={(e) => { const n = Number(e.target.value); if (Number.isFinite(n)) set(fromUnit(n)); }} onKeyDown={(e) => e.stopPropagation()} style={{ ...input, height: 36, fontSize: 14 }} />
  );
  // 해상도를 바꾸면 — 픽셀이면 픽셀 그대로, 인치·cm·mm 면 실제 크기를 지키고 픽셀을 다시 계산 (포토샵과 같다)
  const changePpi = (n: number) => {
    const np = Math.max(1, Math.round(n || 0));
    if (unit !== "px" && ppi > 0) { setW((x) => Math.max(1, Math.round((x / ppi) * np))); setH((x) => Math.max(1, Math.round((x / ppi) * np))); }
    setPpi(np);
  };
  const numIn = (v: number, set: (n: number) => void) => (
    <input type="number" value={v} onChange={(e) => set(Number(e.target.value))} onKeyDown={(e) => e.stopPropagation()} style={{ ...input, height: 36, fontSize: 14 }} />
  );
  const goLabel = busy ? "만드는 중…" : layId === "@blank" ? "만들기" : kind === "none" ? "템플릿 열기" : "AI로 채우기";
  const note = layId === "@blank" ? "빈 문서를 만들어요. 오른쪽에서 크기·해상도·배경을 정해요."
    : kind === "none" ? "칸 이름 그대로 열려요 — 글자를 두 번 눌러 고치고, [배경 사진]에서 사진을 바꿔요. 재료를 고르면 AI가 채워요."
    : "가격·면적·주소·중개사무소는 자료 그대로 넣어요 (없으면 그 칸은 만들지 않아요). AI 는 제목·부제·키워드 문구만 써요. 배경은 고른 사진 그대로예요.";
  const W = typeof window !== "undefined" ? Math.round(window.innerWidth * 0.86) : 1400; // 화면의 86% (2026-10-30 사장님: 넓게 했다가 조금 줄임)
  return (
    <>
    <Modal title="새로 만들기" onClose={() => !busy && onClose()} width={W}
      footer={<><span style={{ flex: 1, fontSize: 13.5, color: err ? "#f87171" : C.sub }}>{err || busy || note}</span><Btn onClick={onClose}>닫기</Btn><Btn primary onClick={() => void make()}>{goLabel}</Btn></>}>
      <div style={{ display: "grid", gridTemplateColumns: "300px minmax(0, 1fr) minmax(400px, 0.7fr)" /* 세 칸 폭은 늘 같게 — 빈 문서·샘플을 오가도 흔들리지 않게 (2026-10-30 사장님) */, gap: 20, padding: 18, height: "calc(84vh - 140px)" }}>
        {/* 1. 재료 */}
        <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
          {hd("1. 가져올 내용")}
          <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
            {seg(kind === "none", "직접 쓰기", () => { setKind("none"); setPick(""); setPhoto(""); setPhotos([]); setPhotoUrl(""); setArtPhotos([]); setLay(""); })}
            {seg(kind === "vacancy", "내 공실", () => { setKind("vacancy"); setPick(""); setPhotoUrl(""); setArtPhotos([]); setLay((l) => (l === "@blank" ? "" : l)); })}
            {seg(kind === "article", "내 기사·칼럼", () => { setKind("article"); setPick(""); setPhoto(""); setPhotos([]); setPhotoUrl(""); setArtPhotos([]); setLay((l) => (l === "@blank" ? "" : l)); })}
          </div>
          {kind === "none" ? (
            <div style={{ fontSize: 13, color: C.sub, lineHeight: 1.7, padding: "4px 2px 8px" }}>
              빈 문서나 템플릿으로 시작해요.<br />
              <b style={{ color: C.text }}>내 공실</b>이나 <b style={{ color: C.text }}>내 기사·칼럼</b>을 고르면 AI가 그 내용으로 제목·부제·키워드를 채워요.
            </div>
          ) : (
            <>
              {kind === "article" && (
                <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                  <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Enter") listMyStudioArticles(q).then((r) => setArts(r.success ? r.data : [])); }} placeholder="내 기사·칼럼 제목 찾기" style={{ ...input, flex: 1 }} />
                  <Btn small onClick={() => listMyStudioArticles(q).then((r) => setArts(r.success ? r.data : []))}>찾기</Btn>
                </div>
              )}
              <div style={{ flex: 1, minHeight: 120, display: "flex", flexDirection: "column", gap: 6, overflowY: "auto", paddingRight: 2 }}>
                {kind === "vacancy" ? (vacs === null ? <span style={{ color: C.sub, fontSize: 13 }}>불러오는 중…</span> : !vacs.length ? <span style={{ color: C.sub, fontSize: 13 }}>공개 중인 내 공실이 없어요.</span> : vacs.map((v) => (
                  <button key={v.id} type="button" style={row(pick === v.id)} onClick={() => void chooseVac(v)} disabled={Boolean(busy)}>
                    {v.photo ? <img src={v.photo} alt="" style={{ width: 56, height: 42, objectFit: "cover", borderRadius: 4, flexShrink: 0 }} /> : <span style={{ width: 56, height: 42, background: C.card, borderRadius: 4, flexShrink: 0 }} />}
                    <span style={{ minWidth: 0 }}>
                      <b style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.building_name || v.property_type || "공실"} <span style={{ color: C.dim, fontWeight: 500 }}>#{v.vacancy_no}</span></b>
                      <span style={{ fontSize: 12, color: C.sub }}>{[v.trade_type, v.address].filter(Boolean).join(" · ")}</span>
                    </span>
                  </button>
                ))) : (arts === null ? <span style={{ color: C.sub, fontSize: 13 }}>불러오는 중…</span> : !arts.length ? <span style={{ color: C.sub, fontSize: 13, lineHeight: 1.6 }}>발행된 내 기사·칼럼이 없어요.<br />[기사관리]나 [뉴스·SNS자동화]에서 쓴 글이 발행되면 여기에 나와요.</span> : arts.map((a) => (
                  <button key={a.id} type="button" style={row(pick === a.id)} onClick={() => void chooseArt(a)}>
                    {a.thumb ? <img src={a.thumb} alt="" style={{ width: 56, height: 42, objectFit: "cover", borderRadius: 4, flexShrink: 0 }} /> : <span style={{ width: 56, height: 42, background: C.card, borderRadius: 4, flexShrink: 0 }} />}
                    <span style={{ minWidth: 0 }}><b style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.title}</b><span style={{ fontSize: 12, color: C.sub }}>{a.date} · {a.author}</span></span>
                  </button>
                )))}
              </div>
            </>
          )}
          {/* 배경으로 쓸 사진 — [기사 사진]·[매물 사진] / [내 이미지] 탭 (2026-10-30 사장님) */}
          {(() => {
            const srcList = kind === "article" ? artPhotos.map((u) => ({ key: u, img: u, on: photoUrl === u && !photo, pick: () => { setPhotoUrl(u); setPhoto(""); } }))
              : kind === "vacancy" ? photos.map((p) => ({ key: p.id, img: p.thumb || p.url || "", on: photo === p.path, pick: () => { setPhoto(p.path || ""); setPhotoUrl(""); } }))
              : [];
            const srcName = kind === "article" ? "기사 사진" : "매물 사진";
            const showSrc = kind !== "none" && srcList.length > 0;
            const tabNow = showSrc ? bgTab : "mine";
            const tabBtn = (id: "src" | "mine", label: string) => (
              <button key={id} type="button" onClick={() => setBgTab(id)}
                style={{ height: 28, padding: "0 10px", border: 0, borderBottom: `2px solid ${tabNow === id ? C.accent : "transparent"}`, background: "transparent", color: tabNow === id ? C.text : C.sub, fontSize: 13, fontWeight: 800, fontFamily: FONT, cursor: "pointer" }}>{label}</button>
            );
            const thumbBox: React.CSSProperties = { width: "100%", aspectRatio: "4 / 3", objectFit: "cover", borderRadius: 4, display: "block" };
            return (
              <>
                <div style={{ fontSize: 13, color: C.sub, margin: "12px 0 4px", fontWeight: 700 }}>배경으로 쓸 사진</div>
                <div style={{ display: "flex", alignItems: "center", borderBottom: `1px solid ${C.line}`, marginBottom: 6 }}>
                  {showSrc && tabBtn("src", `${srcName} (${srcList.length})`)}
                  {tabBtn("mine", `내 이미지${mineImgs && mineImgs.length ? ` (${mineImgs.length})` : ""}`)}
                  <span style={{ flex: 1 }} />
                  {tabNow === "mine" && <Btn small onClick={() => void registerImgs()}>+ 이미지 등록</Btn>}
                </div>
                {tabNow === "src" ? (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, maxHeight: 170, overflowY: "auto" }}>
                    {srcList.map((s) => (
                      <button key={s.key} type="button" onClick={s.pick} style={{ padding: 0, border: `2px solid ${s.on ? C.accent : "transparent"}`, borderRadius: 6, background: "transparent", cursor: "pointer" }}>
                        <img src={s.img} alt="" style={thumbBox} />
                      </button>
                    ))}
                  </div>
                ) : mineImgs && mineImgs.length > 0 ? (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, maxHeight: 170, overflowY: "auto" }}>
                    {mineImgs.map((p) => (
                      <div key={p.id} style={{ position: "relative" }} onContextMenu={(e) => { e.preventDefault(); void removeMineImg(p); }}>
                        <button type="button" title={`${p.name || ""} · 오른쪽 클릭: 목록에서 빼기`} onClick={() => { setPhoto(photo === p.path ? "" : p.path || ""); setPhotoUrl(""); }}
                          style={{ width: "100%", padding: 0, border: `2px solid ${photo === p.path ? C.accent : "transparent"}`, borderRadius: 6, background: "transparent", cursor: "pointer" }}>
                          <img src={p.thumb || p.url} alt="" style={thumbBox} />
                        </button>
                        {/* 목록에서 빼기 — 최근 파일 카드의 × 와 같은 모양 (2026-10-30 사장님) */}
                        <button type="button" title="내 이미지에서 빼기" onClick={() => void removeMineImg(p)}
                          style={{ position: "absolute", top: 3, right: 3, width: 20, height: 20, padding: 0, border: 0, borderRadius: 10, background: "rgba(0,0,0,0.65)", color: "#fff", fontSize: 13, lineHeight: "20px", cursor: "pointer" }}>×</button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: 12.5, color: C.dim, lineHeight: 1.5 }}>내 PC 의 사진을 등록하면 여기에 남아요. 배경으로 쓸 수 있어요 (동영상 편집기 [내 자료] 와 같은 곳).</div>
                )}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
                  {aiBusy && <span style={{ flex: 1, fontSize: 12.5, color: C.accent, fontWeight: 700 }}>AI가 그리는 중… (30초~1분)</span>}
                  <Btn small onClick={() => { if (!aiScene) setAiScene(aiIdeas[0] || ""); setAiOpen(true); }}>{aiBusy ? "그리는 중…" : "✨ AI로 만들기"}</Btn>
                </div>
              </>
            );
          })()}
          {kind !== "none" && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 13, color: C.sub, marginBottom: 6, fontWeight: 700 }}>AI에게 요청 (선택)</div>
              <textarea value={req} onChange={(e) => setReq(e.target.value)} onKeyDown={(e) => e.stopPropagation()} rows={2} placeholder="예: 역세권을 강조해 줘, 차분한 느낌으로" style={{ ...input, width: "100%", height: 58, resize: "none", padding: 8 }} />
            </div>
          )}
        </div>
        {/* 2. 종류 · 크기 · 3. 레이아웃 */}
        <div style={{ display: "flex", flexDirection: "column", minHeight: 0, minWidth: 0 }}>
          {hd("2. 종류 · 크기")}
          <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
            {TABS.map((t) => seg(tab === t.id, t.label, () => chooseTab(t.id)))}
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            {list.map((p) => {
              const on = preset ? presetKey(preset) === presetKey(p) : false;
              const k = 40 / Math.max(p.w, p.h);
              return (
                <button key={presetKey(p)} type="button" onClick={() => choosePreset(p)} onDoubleClick={() => { choosePreset(p); makeEmpty(p); }}
                  title={`${p.note ? `${p.note} · ` : ""}두 번 누르면 이 크기로 빈 문서`}
                  style={{ width: 112, padding: "8px 6px 6px", borderRadius: 10, border: `2px solid ${on ? C.accent : C.line}`, background: on ? "rgba(59,130,246,0.12)" : "transparent", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, fontFamily: FONT }}>
                  <span style={{ height: 42, display: "flex", alignItems: "center" }}><span style={{ width: Math.max(6, p.w * k), height: Math.max(6, p.h * k), borderRadius: 3, border: `2px solid ${on ? C.accent : C.sub}`, background: on ? "rgba(59,130,246,0.25)" : "transparent" }} /></span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: C.text, textAlign: "center", lineHeight: 1.25 }}>{p.name}</span>
                  <span style={{ fontSize: 11, color: C.dim }}>{p.w}×{p.h}{p.ppi ? ` · ${p.ppi}ppi` : ""}</span>
                </button>
              );
            })}
            {!list.length && <div style={{ color: C.sub, fontSize: 13.5, padding: "6px 2px" }}>아직 만든 빈 문서가 없어요. 다른 탭에서 크기를 골라 보세요.</div>}
          </div>
          {hd("3. 레이아웃", "누르면 오른쪽에 크게 보여요 · 두 번 누르면 바로 만들기")}
          <div style={{ flex: 1, minHeight: 0, overflowY: "auto", paddingRight: 4 }}>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${aspect === "tall" ? 96 : 150}px, 1fr))`, gap: 10 }}>
              {kind === "none" && preset && card("@blank", "빈 문서", undefined, { blank: true })}
              {kind !== "none" && canRefill && card("@refill", "지금 문서의 칸에 채우기", undefined)}
              {layouts.map((l) => card(l.id, l.name, thumbs[l.id]))}
              {myFit.map((t) => card(`@mine:${t.file}`, `내 템플릿 · ${t.name}`, thumbs[`@mine:${t.file}`] || t.thumb, { mineT: t }))}
              {preset && !layouts.length && <span style={{ color: C.dim, fontSize: 13, gridColumn: "1 / -1" }}>이 크기에 맞는 틀이 아직 없어요.</span>}
            </div>
          </div>
        </div>
        {/* 미리보기 · 빈 문서 세부 설정 */}
        <div style={{ display: "flex", flexDirection: "column", minHeight: 0, gap: 14, overflowY: "auto" }}>
          {layId === "@blank" ? (
            <>
              {hd("빈 문서 세부 설정")}
              <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.stopPropagation()} style={{ ...input, fontSize: 16, fontWeight: 700 }} />
              <div style={{ display: "grid", gridTemplateColumns: "48px 1fr 92px", gap: 8, alignItems: "center", fontSize: 13.5, color: C.sub }}>
                <span>폭</span>{sizeIn(w, setW)}
                <select value={unit} onChange={(e) => setUnit(e.target.value as Unit)} title="폭·높이 단위" style={{ ...input, height: 36, fontSize: 13, padding: "0 6px" }}>
                  {UNITS.map(([u, nm]) => <option key={u} value={u}>{nm}</option>)}
                </select>
                <span>높이</span>{sizeIn(h, setH)}<span style={{ paddingLeft: 4 }}>{UNITS.find(([u]) => u === unit)?.[1]}</span>
                <span>해상도</span>{numIn(ppi, changePpi)}<span style={{ paddingLeft: 4 }}>ppi</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, color: C.sub }}>
                <span style={{ width: 48 }}>방향</span>
                {[false, true].map((pt) => (
                  <button key={String(pt)} type="button" title={pt ? "세로" : "가로"} onClick={() => { if (pt !== portrait) { setW(h); setH(w); } }}
                    style={{ width: 40, height: 34, borderRadius: 5, border: `1px solid ${portrait === pt ? C.sel : C.line2}`, background: portrait === pt ? C.sel : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ width: pt ? 12 : 20, height: pt ? 20 : 12, border: `2px solid ${portrait === pt ? C.bg : C.sub}`, borderRadius: 2 }} />
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13.5, color: C.sub }}>
                <span>색상 모드</span>
                <div style={{ display: "flex", gap: 6 }}>
                  {([["rgb", "RGB", "화면용 (SNS·유튜브·블로그)"], ["cmyk", "CMYK", "인쇄용 (명함·전단·배너)"]] as const).map(([v2, t, d2]) => (
                    <button key={v2} type="button" onClick={() => setMode(v2)} title={d2}
                      style={{ flex: 1, height: 44, borderRadius: 5, border: `2px solid ${mode === v2 ? C.sel : C.line2}`, background: "transparent", color: C.text, fontFamily: FONT, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                      <b style={{ fontSize: 13.5 }}>{t}</b><span style={{ fontSize: 11, color: C.dim }}>{v2 === "rgb" ? "화면용" : "인쇄용"}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13.5, color: C.sub }}>
                <span>배경</span>
                <div style={{ display: "flex", gap: 6 }}>
                  {([["white", "흰색", "#fff"], ["#000000", "검정", "#000"], ["transparent", "투명", "repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 0 0 / 8px 8px"]] as const).map(([v2, t, sw]) => (
                    <button key={v2} type="button" onClick={() => setBgc(v2)}
                      style={{ flex: 1, height: 36, borderRadius: 5, border: `2px solid ${bgc === v2 ? C.sel : C.line2}`, background: "transparent", color: C.text, fontSize: 13, fontFamily: FONT, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                      <span style={{ width: 14, height: 14, borderRadius: 3, background: sw, border: `1px solid ${C.line2}` }} />{t}
                    </button>
                  ))}
                </div>
              </div>
              {preset?.note && <div style={{ fontSize: 12.5, color: C.dim, lineHeight: 1.5 }}>{preset.name} — {preset.note}</div>}
            </>
          ) : (
            <div>
              {hd("미리보기", bigName)}
              <div style={{ width: "100%", aspectRatio: `${size.w} / ${size.h}`, maxHeight: "calc(84vh - 260px)", borderRadius: 10, overflow: "hidden", background: "#1a1d24", border: `1px solid ${C.line}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto" }}>
                {bigImg ? <img src={bigImg} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : <span style={{ color: C.dim, fontSize: 13 }}>{layId === "@refill" ? "지금 문서의 칸 이름표가 있는 레이어만 바뀌어요" : "미리보기 만드는 중…"}</span>}
              </div>
              <div style={{ fontSize: 12, color: C.dim, marginTop: 6, lineHeight: 1.5 }}>{kind === "none" ? "칸 이름 그대로 열려요. 글자를 두 번 눌러 고쳐요." : "제목·부제는 만들 때 AI가 써요. 미리보기의 칸 이름 자리에 들어가요."}</div>
            </div>
          )}
        </div>
      </div>
    </Modal>
    {aiOpen && (
      <Modal title="AI로 이미지 만들기" onClose={() => setAiOpen(false)} width={760}
        footer={<><span style={{ flex: 1, fontSize: 13, color: C.sub }}>한 장씩 만들어요 (30초~1분) · 내 AI 키로 · 다 되면 내 이미지에 담기고 배경으로 골라져요</span><Btn onClick={() => setAiOpen(false)}>닫기</Btn><Btn primary onClick={() => void makeAiImage()}>만들기</Btn></>}>
        <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 16, maxHeight: "70vh", overflowY: "auto" }}>
          <div>
            {hd("① 그림 스타일", "하나 고르기")}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 8 }}>
              {IMAGE_STYLES.map((st) => {
                const on = aiStyle === st.id;
                return (
                  <button key={st.id} type="button" title={st.desc} onClick={() => setAiStyle(st.id)}
                    style={{ padding: 4, borderRadius: 8, border: `2px solid ${on ? C.accent : "transparent"}`, background: on ? "rgba(59,130,246,0.12)" : C.card, cursor: "pointer", fontFamily: FONT, textAlign: "left" }}>
                    <div style={{ width: "100%", aspectRatio: "4 / 3", borderRadius: 4, overflow: "hidden", background: st.bg }}>
                      {st.thumb && <img src={st.thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
                    </div>
                    <div style={{ fontSize: 12.5, fontWeight: 800, color: C.text, padding: "4px 2px 0" }}>{st.label}</div>
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            {hd("② 무엇을 그릴까요")}
            <textarea value={aiScene} onChange={(e) => setAiScene(e.target.value)} onKeyDown={(e) => e.stopPropagation()} rows={2} placeholder="예: 한강이 보이는 밝은 거실, 오후 햇살"
              style={{ ...input, width: "100%", height: 64, resize: "none", padding: 8, fontSize: 14 }} />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
              <span style={{ fontSize: 12.5, color: C.dim, alignSelf: "center" }}>추천</span>
              {aiIdeas.map((s) => (
                <button key={s} type="button" onClick={() => setAiScene(s)}
                  style={{ padding: "5px 10px", borderRadius: 999, border: `1px solid ${aiScene === s ? C.accent : C.line2}`, background: "transparent", color: aiScene === s ? C.text : C.sub, fontSize: 12.5, fontFamily: FONT, cursor: "pointer" }}>{s}</button>
              ))}
            </div>
            <div style={{ fontSize: 12, color: C.dim, marginTop: 8 }}>그림에는 글자를 넣지 않아요 (글자는 레이아웃이 얹어요). 크기는 지금 고른 {size.name || "크기"} 비율로 만들어요.</div>
          </div>
        </div>
      </Modal>
    )}
    </>
  );
}

/** 폭·높이 단위 — 1인치에 몇 단위 */
type Unit = "px" | "in" | "cm" | "mm";
const UNIT_PER_INCH: Record<Exclude<Unit, "px">, number> = { in: 1, cm: 2.54, mm: 25.4 };
const UNITS: [Unit, string][] = [["px", "픽셀"], ["in", "인치"], ["cm", "센티미터"], ["mm", "밀리미터"]];

/** 뉴스칼럼(기사) 미리보기 더미 배경 — 사무실·상담·촬영 장면 (2026-10-30 사장님이 준 사진). 템플릿 열기에도 견본으로 */
const COLUMN_BGS = ["/studio-samples/column/column1.webp", "/studio-samples/column/column2.webp", "/studio-samples/column/column3.webp"];
const urlCanvases = new Map<string, Promise<HTMLCanvasElement | null>>();
function urlCanvas(url: string): Promise<HTMLCanvasElement | null> {
  let p = urlCanvases.get(url);
  if (!p) {
    p = new Promise((res) => {
      const im = new Image();
      im.crossOrigin = "anonymous"; // 공실뉴스 저장소 사진 — 미리보기 그림을 만들 수 있게
      im.onload = () => {
        const c = document.createElement("canvas");
        c.width = im.naturalWidth;
        c.height = im.naturalHeight;
        c.getContext("2d")!.drawImage(im, 0, 0);
        res(c);
      };
      im.onerror = () => { urlCanvases.delete(url); res(null); };
      im.src = url;
    });
    urlCanvases.set(url, p);
  }
  return p;
}
