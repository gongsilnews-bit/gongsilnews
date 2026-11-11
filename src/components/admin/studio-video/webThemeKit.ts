/**
 * 내 테마에 담는 것 · 새 쇼츠에 그대로 (2026-11-05 사장님: "내가 영상 편집을 하고 테마로 저장하면 테마로 저장되는 거야")
 *  1 자막(글꼴·크기·색·테두리·굵기·자리·움직임)  2 위쪽 제목·사무소 상자(글꼴·크기·색·상자·움직임)
 *  3 그래픽(모양·위치·크기·효과 — 공실마다 다른 글자(숫자 든 것)는 빼고)  4 화면 전환(순서·길이)
 *  5 끝 장면 부동산 표시광고(모양만 — 내용은 회원 실제 사무소·공실 정보, 빈 값은 빈칸)  6 음악·성우  7 드론 영상 자리(그 동네 공실뉴스 드론)
 */
import type { Clip, Layer, Project, VideoBridge } from "./types";
import { uid } from "./types";
import { TEMPLATES, TPL_PREFIX, drawTemplate, tplFieldsOf, tplFonts, tplOf, tplTextOf } from "./Templates";
import { aptBrandOf, stickerPng, stickerSpecOf } from "./Stickers";
import type { VideoVacancy } from "@/app/actions/videoWeb";

type Rec = Record<string, unknown>;
/** 테마 그래픽 하나 — tpl(템플릿 이름으로) 또는 stk(그래픽 모양) */
export type KitGraphic = { at: number; n: number; tpl?: { cat: string; label: string; text: string; color?: string }; stk?: { style: string; text: string; icon?: string; color?: string; mo?: number }; layer: Rec };
export type ThemeKit = {
  titleStyle?: Rec;
  officeStyle?: Rec;
  officeInfoStyle?: Rec;
  /** 첫 1초 훅 · 자막 아래 상호·연락처 띠 · 가격 장면 연락처 — 모양만 (글자는 새 공실 것으로, 2026-11-05 사장님: "다 저장하게 해줘") */
  hookStyle?: Rec;
  contactStyle?: Rec;
  priceStyle?: Rec;
  graphics?: KitGraphic[];
  /** 그 밖의 화면 글 (제목·사무소 말고) — 숫자 든 것은 빼고 */
  texts?: { at: number; n: number; text: string; layer: Rec }[];
  /** 클립 2번째부터 차례대로 (null = 전환 없음) — 장면이 더 많으면 처음부터 다시 */
  trans?: (Clip["trans"] | null)[];
  /** 드론 영상을 넣을 클립 자리 (0부터) */
  drone?: number[];
  /** 끝 장면 부동산 표시광고 — 디자인 이름 · 색 · 자리 */
  legal?: { label: string; color?: string; layer: Rec } | null;
  /** 단지소개 — 아파트 그래픽 배경 (2026-11-06 사장님: "단지소개 그래픽 배경을 사용해도 좋을 것 같은데")
   *  단지 이름으로 브랜드를 알아내 그 브랜드 색·로고 배경 · 모르는 브랜드면 쇼츠배경(fb) 디자인
   *  span all = 끝 장면 앞까지 내내 / first = 첫 장면만 · tag = 배경 위쪽 머리표 */
  apt?: { mode: "dark" | "light"; fb: string; span: "all" | "first"; tag: string; /** 단지소개 — 이 브랜드 배경으로 고정 (2026-11-07 사장님: 1 래미안 · 2 자이 · 3 푸르지오 · 4 힐스테이트 · 5 롯데캐슬) */ brand?: string; /** 뉴스칼럼 — 브랜드 없이 늘 쇼츠배경, 큰 글은 대본 제목 */ news?: boolean };
};

const DROP = new Set(["id", "from", "to", "text", "asset", "w0", "w1", "te", "bake", "roll", "lead", "pair", "track", "stk", "name", "sticker", "off", "lock"]);
const styleOf = (l: Layer): Rec => Object.fromEntries(Object.entries(l).filter(([k, v]) => !DROP.has(k) && v !== undefined));
const AD_CAT = "부동산 표시광고";

/** 편집한 프로젝트 → 테마 꾸러미 (+ 빠진 그래픽 수) */
export function captureKit(p: Project): { kit: ThemeKit; skipped: number } {
  const clips = p.scenes.flatMap((s) => s.clips);
  const n = clips.length;
  const idx = (id: string) => clips.findIndex((c) => c.id === id);
  const layers = (p.layers || []).filter((l) => !l.off);
  const texts = layers.filter((l) => l.type === "text");
  const title = texts.find((l) => l.name === "동네·종류") || texts.find((l) => l.pos === "top" && idx(l.from) === 0);
  const office = texts.find((l) => l.name === "사무소");
  const officeInfo = texts.find((l) => l.name === "사무소 정보");
  const hook = texts.find((l) => l.name === "훅");
  const contact = texts.find((l) => l.name === "상호·연락처");
  const price = texts.find((l) => l.name === "가격 장면 연락처");
  const kit: ThemeKit = {};
  if (title) kit.titleStyle = styleOf(title);
  if (hook) kit.hookStyle = styleOf(hook);
  if (contact) kit.contactStyle = styleOf(contact);
  if (price) kit.priceStyle = styleOf(price);
  if (office) kit.officeStyle = styleOf(office);
  if (officeInfo) kit.officeInfoStyle = styleOf(officeInfo);

  let skipped = 0;
  const graphics: KitGraphic[] = [];
  for (const l of layers) {
    if (l.type !== "image" || !l.sticker || !l.stk) continue;
    const at = idx(l.from);
    if (at < 0) continue;
    // 첫 장면부터 깔린 아파트 배경 — 단지 이름은 공실마다 다르니 모양(밝기·머리표·길이)만 (2026-11-06)
    if (l.stk.style === "apt" && at === 0) { // 쇼츠배경은 테마로 담지 않음 (2026-11-07)
      const k = String(l.stk.icon || "").split(":")[0];
      kit.apt = { mode: "dark", fb: "navy", ...(k ? { brand: k } : {}), span: idx(l.to) > 0 ? "all" : "first", tag: String(l.stk.text || "").split(/[|｜]/)[0].trim() || "NEWS" };
      continue;
    }
    const def = tplOf(l.stk.style);
    if (def && def.cat === AD_CAT) {
      kit.legal = { label: def.label, color: l.stk.color, layer: styleOf(l) };
      continue;
    }
    // 공실마다 다른 글자(가격·면적 등 숫자)는 테마로 옮기지 않는다 — 예전 공실 값이 새 영상에 들어가면 안 된다
    if (/\d/.test(tplFieldsOf(l.stk.text).join(" "))) { skipped++; continue; }
    if (def) graphics.push({ at, n, tpl: { cat: def.cat, label: def.label, text: l.stk.text, color: l.stk.color }, layer: styleOf(l) });
    else graphics.push({ at, n, stk: { ...l.stk }, layer: styleOf(l) });
  }
  if (graphics.length) kit.graphics = graphics;
  const extra = texts.filter((l) => l !== title && l !== office && l !== officeInfo && l !== hook && l !== contact && l !== price && l.text && idx(l.from) >= 0);
  const keepTexts = extra.filter((l) => !/\d/.test(String(l.text)));
  skipped += extra.length - keepTexts.length;
  if (keepTexts.length) kit.texts = keepTexts.map((l) => ({ at: idx(l.from), n, text: String(l.text), layer: styleOf(l) }));

  const trans = clips.slice(1).map((c) => (c.trans ? { ...c.trans } : null));
  if (trans.some(Boolean)) kit.trans = trans;

  const drone: number[] = [];
  clips.forEach((c, i) => {
    const a = c.visual?.asset ? p.assets[c.visual.asset] : undefined;
    if (a && a.kind === "video" && /^공실뉴스/.test(String(a.name || "")) && /드론/.test(String(a.name || "") + String(a.credit || ""))) drone.push(i);
  });
  if (drone.length) kit.drone = drone;
  return { kit, skipped };
}

/** 긴 제목은 가운데 가까운 띄어쓰기에서 두 줄로 */
function halves(t: string): [string, string] {
  if (t.length <= 12) return [t, ""];
  const mid = t.length / 2;
  let at = -1;
  for (let i = 0; i < t.length; i++) if (t[i] === " " && (at < 0 || Math.abs(i - mid) < Math.abs(at - mid))) at = i;
  return at > 0 ? [t.slice(0, at), t.slice(at + 1)] : [t, ""];
}

/** 저장할 때 클립 자리 → 새 쇼츠 자리 (처음·끝은 그대로, 가운데는 비율로) */
function placeAt(at: number, n: number, N: number) {
  if (N <= 1) return 0;
  if (at <= 0) return 0;
  if (at >= n - 1) return N - 1;
  return Math.max(1, Math.min(N - 2, Math.round((at / Math.max(1, n - 1)) * (N - 1))));
}

/** 테마 꾸러미를 새 쇼츠에 — 레이어·전환·드론·표시광고. 반환: 알릴 말 */
export async function applyKit(p: Project, kit: ThemeKit, o: { b: VideoBridge; info: VideoVacancy | null; clips: Clip[]; officeClip: Clip | null; say: (t: string) => void; title?: string }): Promise<string[]> {
  const notes: string[] = [];
  const { b, info, clips } = o;
  const N = clips.length;
  const addImg = async (dataUrl: string, name: string) => {
    if (!b.lib.saveImage) throw new Error("그래픽을 넣지 못했어요.");
    const item = await b.lib.saveImage(p.dir, dataUrl, name);
    const a = await b.project.addAsset(item.id);
    p.assets[a.id] = a;
    return a.id;
  };

  // 4 화면 전환 — 차례대로 돌려 가며
  if (kit.trans?.length) {
    for (let i = 1; i < N; i++) {
      const t = kit.trans[(i - 1) % kit.trans.length];
      if (t) clips[i].trans = { ...t };
    }
  }

  // 단지소개 아파트 배경 — 맨 아래 깔기 (제목·자막·그래픽이 그 위로)
  if (kit.apt && N) {
    try {
      const a = kit.apt;
      const name = a.news ? "" : info?.building || "";
      const brand = a.news ? "" : a.brand || aptBrandOf(`${name} ${info?.title || ""}`); // 테마에 정한 브랜드가 먼저 (2026-11-07)
      const place = info?.intro.place || "";
      // 글 = 머리표|단지 이름|동네 · 종류 — 자료에 있는 것만 (없으면 빈칸, 지어내지 않음)
      //  뉴스칼럼은 대본 제목을 두 줄로 (2026-11-06)
      const [t1, t2] = halves(String(o.title || "").replace(/\s+/g, " ").trim());
      const l1 = a.news && t1 ? t1 : name || place || "단지 소개";
      const l2 = a.news && t1 ? t2 : name ? place : info?.intro.kind || "";
      const text = [a.tag, l1, l2].join("|");
      // 브랜드를 못 찾거나 뉴스칼럼이면 배경 없이 — 쇼츠배경은 없앰 (2026-11-07 사장님: "너무 촌스러워 · 그냥 삭제해줘")
      const stk = { style: "apt", text, icon: `${brand}:dark` }; // 흰 바탕은 뺌 — 예전에 저장한 내 테마도 (2026-11-07)
      const spec = brand ? stickerSpecOf({ stk }) : null;
      if (spec) {
        const asset = await addImg(await stickerPng(spec), "스티커_아파트배경");
        const endAt = a.span === "all" ? Math.max(0, N - (o.officeClip ? 2 : 1)) : 0;
        (p.layers ||= []).unshift({ x: 0.5, y: 0.5, w: 1, opacity: 1, anim: { sfx: "none" }, id: uid(), type: "image", from: clips[0].id, to: clips[endAt].id, asset, sticker: true, stk, name: "아파트 배경" } as Layer);
      }
    } catch { notes.push("단지 배경 그래픽을 넣지 못했어요 — 편집에서 [그래픽 › 부동산 › 아파트 배경]로 넣어 주세요."); }
  }

  // 3 그래픽
  if (kit.graphics?.length) {
    await tplFonts().catch(() => {});
    for (const g of kit.graphics) {
      try {
        const at = placeAt(g.at, g.n, N);
        let url = "", stk: Layer["stk"], name = "그래픽";
        if (g.tpl) {
          const def = TEMPLATES.find((x) => x.cat === g.tpl!.cat && x.label === g.tpl!.label);
          if (!def) continue;
          const style = TPL_PREFIX + def.id;
          url = drawTemplate(style, g.tpl.text, g.tpl.color).toDataURL("image/png");
          stk = { style, text: g.tpl.text, color: g.tpl.color };
          name = `템플릿_${def.label}`;
        } else if (g.stk) {
          const spec = stickerSpecOf({ stk: g.stk });
          if (!spec) continue;
          url = await stickerPng(spec);
          stk = { ...g.stk };
          name = `스티커_${g.stk.text}`;
        } else continue;
        const asset = await addImg(url, name);
        (p.layers ||= []).push({ ...(g.layer as Partial<Layer>), id: uid(), type: "image", from: clips[at].id, to: clips[at].id, asset, sticker: true, stk, name } as Layer);
      } catch { /* 그래픽 하나 못 그리면 건너뛴다 */ }
    }
  }

  // 그 밖의 화면 글
  for (const t of kit.texts || []) {
    const at = placeAt(t.at, t.n, N);
    (p.layers ||= []).push({ ...(t.layer as Partial<Layer>), id: uid(), type: "text", from: clips[at].id, to: clips[at].id, text: t.text } as Layer);
  }

  // 5 끝 장면 부동산 표시광고 — 모양만 테마, 내용은 실제 사무소·공실 정보 (빈 값은 빈칸)
  if (kit.legal && o.officeClip) {
    const def = TEMPLATES.find((x) => x.cat === AD_CAT && x.label === kit.legal!.label) || TEMPLATES.find((x) => x.cat === AD_CAT);
    const ag = info?.agency;
    if (!ag) notes.push("사무소 정보가 없어 끝 장면 표시광고를 넣지 못했어요. [정보설정]에서 사무소 정보를 넣어 주세요.");
    else if (def) {
      await tplFonts().catch(() => {});
      const style = TPL_PREFIX + def.id;
      const text = tplTextOf([ag.name, ag.ceo, ag.regNum, ag.address, ag.phone, info?.listing || ""]);
      const asset = await addImg(drawTemplate(style, text, kit.legal.color || def.color).toDataURL("image/png"), `템플릿_${def.label}`);
      (p.layers ||= []).push({ ...(kit.legal.layer as Partial<Layer>), id: uid(), type: "image", from: o.officeClip.id, to: o.officeClip.id, asset, sticker: true, stk: { style, text, color: kit.legal.color || def.color }, name: `템플릿_${def.label}` } as Layer);
      const miss = ([["상호", ag.name], ["대표 공인중개사", ag.ceo], ["등록번호", ag.regNum], ["소재지", ag.address], ["연락처", ag.phone]] as const).filter(([, v]) => !v).map(([k]) => k);
      if (miss.length) notes.push(`표시광고에 빈칸이 있어요: ${miss.join("·")} — [정보설정]에서 채워 주세요.`);
    }
  }

  // 7 드론 — 그 동네 공실뉴스 드론 영상
  if (kit.drone?.length && info?.dong && b.stock) {
    try {
      const r = await b.stock.search(info.dong, "drone", p.ratio === "9:16" || p.ratio === "4:5" ? "portrait" : "landscape", 1); // 가로 영상이면 가로 드론 (2026-11-11)
      const list = (r && r.success ? r.items : []) as { id: string; kind: "image" | "video"; thumb: string; url: string; width: number; height: number; duration?: number; credit: string; source: string }[];
      if (!list.length) notes.push(`${info.dong} 드론 영상이 아직 없어요 — 그 자리는 공실 사진으로 두었어요.`);
      let k = 0;
      for (const at0 of kit.drone) {
        const at = Math.min(at0, N - 1);
        if (!list.length || (o.officeClip && clips[at].id === o.officeClip.id)) continue;
        const s = list[k++ % list.length];
        const item = await b.stock.get(p.dir, s);
        const a = await b.project.addAsset(item.id);
        p.assets[a.id] = a;
        clips[at].visual = { asset: a.id, s: 0 };
      }
    } catch { notes.push("드론 영상을 불러오지 못했어요 — 그 자리는 공실 사진으로 두었어요."); }
  }
  return notes;
}
