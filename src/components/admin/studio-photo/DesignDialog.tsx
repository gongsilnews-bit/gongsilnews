"use client";

// 이미지 편집 — AI 자동 디자인: 공실·기사 가져오기 → 틀 고르기 → 배경(실제 사진 / AI 다듬기 / AI 새로) → 레이어로 만들기
// AI 는 문구(제목·부제·딱지)와 배경 장면만. 가격·면적·주소·중개사는 자료 그대로, 없으면 빈칸 (가짜 데이터 금지)
import React, { useEffect, useMemo, useState } from "react";
import { loadFont } from "@/components/admin/studio-video/Pickers";
import { Btn, C, FONT, Modal, input } from "@/components/admin/studio-video/ui";
import { videoBridge, type LibItem } from "@/components/admin/studio-video/types";
import { getStudioAgency, getStudioArticle, listMyStudioVacancies, listStudioArticles } from "@/app/actions/studio";
import { IMAGE_STYLES, imagePrompt } from "@/lib/studio-video/imageStyles";
import { bytesToCanvas } from "./model";
import { CAT_NAME, CAT_SIZES, aspectOf, contentFor, layoutFonts, layoutsForCat, loadSampleBg, placeholderBg, placeholderContent, previewOf, type Cat, type CatSize, type Content, type Layout } from "./layouts";
import type { MyTpl } from "./DesignSide";

type Vac = { id: string; vacancy_no: number; building_name: string | null; trade_type: string | null; property_type: string | null; address: string; photo: string | null; photoCount: number };
type Art = { id: string; no: number | null; title: string; author: string; date: string };
type FileRes = { path: string; name: string; bytes?: Uint8Array; error?: string };
type Bridge = { readFile?: (f: string) => Promise<FileRes>; aiDesign?: (o: { kind: string; facts: string; size: string; request?: string }) => Promise<{ title: string; sub: string; badge: string; scene: string; retouch: string }> };
export type DesignResult = {
  w: number; h: number; ppi?: number; content: Content; bg: HTMLCanvasElement | null; aiMark: boolean;
  layout?: Layout; mine?: MyTpl; refill?: boolean;
  meta: { src: { kind: "vacancy" | "article"; id: string; no?: string; title?: string }; ai?: { prompt: string; style?: string; ratio?: string } };
};
export const ratioOf = (w: number, h: number) => (w / h > 1.2 ? "16:9" : w / h < 0.85 ? "9:16" : "1:1");
const compo = (w: number, h: number) => (w / h > 1.2 ? "Horizontal 16:9 composition." : w / h < 0.85 ? "Vertical 9:16 composition." : "Square composition.");

export function DesignDialog({ init, canRefill, mine, onDone, onClose }: {
  /** 처음 화면 샘플에서 [AI로 채우기] — 종류 · 크기 · 틀을 골라 둔 채로 */
  init?: { cat: Cat; size: CatSize; layout?: string } | null;
  canRefill: boolean;
  mine: MyTpl[];
  onDone: (r: DesignResult) => void;
  onClose: () => void;
}) {
  const b = (typeof window !== "undefined" ? (window as unknown as { gongsilStudio?: { photo?: Bridge } }).gongsilStudio?.photo : null) || null;
  const vb = videoBridge();
  const [kind, setKind] = useState<"vacancy" | "article">("vacancy");
  const [vacs, setVacs] = useState<Vac[] | null>(null);
  const [arts, setArts] = useState<Art[] | null>(null);
  const [q, setQ] = useState("");
  const [pick, setPick] = useState<string>("");
  const [photos, setPhotos] = useState<LibItem[]>([]);
  const [vinfo, setVinfo] = useState<{ title?: string; priceText?: string; location?: string; fields?: { label: string; value: string }[] } | null>(null);
  const [photo, setPhoto] = useState<string>("");
  const [cat, setCat] = useState<Cat>(init?.cat || "youtube");
  const [size, setSize] = useState<CatSize>(init?.size || CAT_SIZES[init?.cat || "youtube"][0]);
  const [lay, setLay] = useState<string>(init?.layout || "");
  const [bgMode, setBgMode] = useState<"real" | "retouch" | "new">("real");
  const [style, setStyle] = useState("realistic");
  const [req, setReq] = useState("");
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    if (kind === "vacancy" && vacs === null) listMyStudioVacancies().then((r) => setVacs(r.success ? (r.data as Vac[]) : [])).catch(() => setVacs([]));
    if (kind === "article" && arts === null) listStudioArticles("").then((r) => setArts(r.success ? r.data : [])).catch(() => setArts([]));
  }, [kind]); // eslint-disable-line react-hooks/exhaustive-deps
  // 공실이 하나뿐이면 바로 골라 둔다 (목록에 보이는데 안 고른 줄 몰라 [이대로 만들기]가 막히지 않게)
  useEffect(() => {
    if (kind === "vacancy" && vacs?.length === 1 && !pick && !busy) void chooseVac(vacs[0]);
  }, [vacs, kind]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!vb) return;
    return vb.onProgress?.((t: string) => setBusy((o) => (o ? t : o)));
  }, [vb]);
  // 이 종류·크기의 틀 (명함처럼 중개사무소 정보로만 만드는 틀도)
  const layouts = layoutsForCat(cat, size).filter((l) => l.kind.includes(kind) || l.kind.includes("agency"));
  const layId = lay || (canRefill ? "@refill" : layouts[0]?.id || "");

  const [agencyData, setAgencyData] = useState<{ name: string; ceo: string; regNum: string; phone: string; address: string } | null>(null);
  useEffect(() => { getStudioAgency().then((a) => { if (a.success && a.data.name) setAgencyData(a.data); }).catch(() => {}); }, []);
  const agencyLine = agencyData ? [agencyData.name, agencyData.phone].filter(Boolean).join(" · ") : "";
  /** 중개사무소 정보 칸 (명함 등) — 회원 정보 그대로, 없으면 비운다 */
  const agencyContent = (): Content => (agencyData ? { office: agencyData.name, ceo: agencyData.ceo ? `대표 공인중개사 ${agencyData.ceo}` : "", phone: agencyData.phone, officeAddr: agencyData.address, regNum: agencyData.regNum ? `등록번호 ${agencyData.regNum}` : "" } : {});
  /* ── 미리보기: 고른 사진 위에 틀을 그대로 조립 (칸에는 자료 값, 없으면 칸 이름) ── */
  const [bgPrev, setBgPrev] = useState<HTMLCanvasElement | null>(null);
  useEffect(() => {
    let live = true;
    if (!photo || !b?.readFile) { setBgPrev(null); return; }
    b.readFile(photo).then((r) => (r.bytes ? bytesToCanvas(r.bytes) : null)).then((c) => { if (live) setBgPrev(c); }).catch(() => {});
    return () => { live = false; };
  }, [photo]); // eslint-disable-line react-hooks/exhaustive-deps
  /* 내 이미지 — 스튜디오 [내 자료] 에 등록한 사진 (PC 에 남는다 · 동영상 편집기와 같은 보관함) */
  const [mineImgs, setMineImgs] = useState<LibItem[] | null>(null);
  const loadMineImgs = () => { if (vb) vb.lib.list({ kind: "image", source: "local" }).then(setMineImgs).catch(() => setMineImgs([])); else setMineImgs([]); };
  useEffect(() => { loadMineImgs(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const registerImgs = async () => {
    if (!vb) return setErr("스튜디오 앱에서만 등록할 수 있어요");
    try {
      const got = (await vb.lib.pick({ kinds: "media" })).filter((x) => x.kind === "image" && x.path);
      if (!got.length) return;
      loadMineImgs();
      setPhoto(got[0].path!);
      if (bgMode === "new") setBgMode("real");
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  };
  const sample: Content = useMemo(() => {
    const f = (re: RegExp) => vinfo?.fields?.find((x) => re.test(x.label))?.value || "";
    const v = vacs?.find((x) => x.id === pick);
    const base = placeholderContent(agencyData || undefined);
    return kind === "vacancy"
      ? { ...base, title: "제목은 AI 가 써요", sub: "부제도 AI 가 써요", badge: "딱지", price: vinfo?.priceText || f(/가격|보증금|매매|월세|전세|임대료/) || "가격", area: f(/면적|평/) || "면적", address: vinfo?.location || v?.address || "주소", agency: agencyLine || "중개사무소" }
      : { ...base, title: "제목은 AI 가 써요 (기사 내용으로)", sub: "부제", label: "공실뉴스", source: "출처 · 날짜" };
  }, [kind, vinfo, vacs, pick, agencyLine, agencyData]);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const aspect = aspectOf(size.w, size.h);
  const layKey = layouts.map((l) => l.id).join(",");
  useEffect(() => {
    let live = true;
    (async () => {
      await Promise.all([...new Set(layouts.flatMap(layoutFonts))].map((f) => loadFont(f).catch(() => {})));
      // 고른 사진(공실 사진 · 내 이미지)이 있으면 그것, 없으면 샘플 사진으로 미리보기
      const bg = bgMode !== "new" && bgPrev ? bgPrev : await loadSampleBg(cat === "youtube" ? "building" : "living");
      const out: Record<string, string> = {};
      for (const L of layouts) {
        await new Promise((r) => setTimeout(r, 0)); // 하나씩 (화면이 멈추지 않게)
        if (!live) return;
        out[L.id] = previewOf(L, size, sample, bg, 520, bgMode === "retouch", kind);
        setThumbs({ ...out });
      }
    })();
    return () => { live = false; };
  }, [size.w, size.h, layKey, bgPrev, bgMode, sample]); // eslint-disable-line react-hooks/exhaustive-deps

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

  /* 공실·기사 없이 — 칸 이름 그대로(고칠 자리)로 틀을 만든다. 가격·면적·주소는 지어내지 않음.
     배경: 고른 내 이미지 → 그대로(또는 AI 다듬기) · [AI로 새로 그리기] + 요청을 썼으면 AI 그림 · 아니면 사진 자리 */
  const makeBlank = async (chosen?: Layout) => {
    try {
      const ag = agencyData ? { name: agencyData.name, ceo: agencyData.ceo, phone: agencyData.phone, address: agencyData.address, regNum: agencyData.regNum } : undefined;
      let content: Content = placeholderContent(ag);
      if (chosen) content = contentFor(chosen, content, kind);
      let bg: HTMLCanvasElement | null = null;
      let aiMark = false;
      let ai: DesignResult["meta"]["ai"];
      const ratio = ratioOf(size.w, size.h);
      if (photo && (bgMode === "real" || !vb)) {
        setBusy("사진을 넣는 중…");
        bg = await readCanvas(photo);
      } else if (photo && bgMode === "retouch" && vb) {
        setBusy("AI 가 사진을 다듬는 중… (30초~1분)");
        const prompt = `Gently improve sky, lighting and color. Keep the exact same scene — do not add or remove anything. Photorealistic. NO TEXT, NO LETTERS. ${compo(size.w, size.h)}`;
        const it = await vb.ai.image("", prompt, { ratio, files: [photo] });
        bg = await readCanvas(it.path!);
        aiMark = true;
        ai = { prompt, ratio };
      } else if (bgMode === "new" && req.trim() && vb) {
        setBusy("AI 가 배경을 그리는 중… (30초~1분)");
        const st = IMAGE_STYLES.find((x) => x.id === style) || IMAGE_STYLES[0];
        const prompt = `${imagePrompt(req.trim(), st)} ${compo(size.w, size.h)}`;
        const it = await vb.ai.image("", prompt, { ratio });
        bg = await readCanvas(it.path!);
        ai = { prompt, style: st.id, ratio };
      }
      if (!bg) bg = (await loadSampleBg(cat === "youtube" ? "building" : "living")) || placeholderBg(size.w, size.h, "사진을 넣어 주세요"); // 샘플 사진 — [사진 바꾸기] 로 내 사진으로
      const my = layId.startsWith("@mine:") ? mine.find((t) => t.file === layId.slice(6)) : undefined;
      onDone({
        w: size.w, h: size.h, ppi: size.ppi, content, bg, aiMark,
        layout: chosen, mine: my, refill: layId === "@refill",
        meta: { src: { kind, id: "", title: "" }, ai },
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy("");
    }
  };

  const make = async () => {
    setErr("");
    const chosen = layouts.find((l) => l.id === layId);
    if (chosen && !chosen.kind.includes(kind) && chosen.kind.includes("agency")) {
      // 명함 — 공실·기사 없이 내 중개사무소 정보로 (AI 안 씀)
      if (!agencyData) return setErr("중개사무소 정보가 없어요 — 회원 정보에서 중개사무소를 먼저 등록해 주세요");
      onDone({ w: size.w, h: size.h, ppi: size.ppi, content: agencyContent(), bg: null, aiMark: false, layout: chosen, meta: { src: { kind: "vacancy", id: "", title: agencyData.name } } });
      return;
    }
    if (!pick) return void makeBlank(chosen); // 공실·기사를 안 골라도 틀대로 만든다 (2026-10-22 사장님)
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
        content.label = "공실뉴스";
        content.source = [a.data.publisher, a.data.publishedAt].filter(Boolean).join(" · ");
        facts = `제목: ${a.data.title}\n${a.data.body.slice(0, 5000)}`;
      }
      // 2) AI 문구 · 배경 장면
      setBusy("AI 가 문구와 배경 장면을 정하는 중…");
      const d = await b.aiDesign({ kind, facts, size: `${size.w}x${size.h}`, request: req });
      content.title = d.title || (kind === "article" ? srcTitle : "");
      content.sub = d.sub;
      content.badge = kind === "vacancy" ? d.badge : "";
      // 3) 배경
      let bg: HTMLCanvasElement | null = null;
      let aiMark = false;
      let ai: DesignResult["meta"]["ai"];
      const ratio = ratioOf(size.w, size.h);
      if (bgMode === "real" && photo) {
        setBusy("공실 사진을 넣는 중…");
        bg = await readCanvas(photo);
      } else if (bgMode === "retouch" && photo) {
        setBusy("AI 가 실제 사진을 다듬는 중… (30초~1분)");
        const prompt = `${d.retouch || "Gently improve sky, lighting and color."} Keep the exact same building, rooms, layout, windows and furniture — do not add or remove anything. Photorealistic. NO TEXT, NO LETTERS. ${compo(size.w, size.h)}`;
        const it = await vb.ai.image("", prompt, { ratio, files: [photo] });
        bg = await readCanvas(it.path!);
        aiMark = true;
        ai = { prompt, ratio };
      } else {
        setBusy("AI 가 배경을 그리는 중… (30초~1분)");
        const st = IMAGE_STYLES.find((x) => x.id === style) || IMAGE_STYLES[0];
        const prompt = `${imagePrompt(d.scene || srcTitle, st)} ${compo(size.w, size.h)}`;
        const it = await vb.ai.image("", prompt, { ratio });
        bg = await readCanvas(it.path!);
        ai = { prompt, style: st.id, ratio };
      }
      const my = layId.startsWith("@mine:") ? mine.find((t) => t.file === layId.slice(6)) : undefined;
      onDone({
        w: size.w, h: size.h, ppi: size.ppi, content, bg, aiMark,
        layout: layouts.find((l) => l.id === layId), mine: my, refill: layId === "@refill",
        meta: { src: { kind, id: pick, no: srcNo, title: srcTitle }, ai },
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy("");
    }
  };

  const seg = (on: boolean, text: string, go: () => void, off = false) => (
    <button type="button" onClick={go} disabled={off}
      style={{ height: 34, padding: "0 14px", borderRadius: 6, border: `1px solid ${on ? C.sel : C.line2}`, background: on ? C.sel : "transparent", color: on ? C.bg : off ? C.dim : C.sub, fontSize: 13.5, fontWeight: 700, fontFamily: FONT, cursor: off ? "default" : "pointer" }}>{text}</button>
  );
  const h = (t: string, sub?: string) => <div style={{ fontWeight: 800, fontSize: 15, margin: "2px 0 10px" }}>{t}{sub && <span style={{ fontWeight: 500, fontSize: 12.5, color: C.dim, marginLeft: 8 }}>{sub}</span>}</div>;
  const row = (on: boolean): React.CSSProperties => ({ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${on ? C.accent : C.line}`, background: on ? "rgba(59,130,246,0.14)" : "transparent", color: C.text, cursor: "pointer", textAlign: "left", fontFamily: FONT, fontSize: 13.5 });
  const fit = layouts;
  const myFit = mine.filter((t) => !t.w || Math.abs(t.w / t.h - size.w / size.h) < 0.05);
  const card = (id: string, name: string, img: string | undefined, note?: string) => {
    const on = layId === id;
    return (
      <button key={id} type="button" onClick={() => setLay(id)}
        style={{ padding: 4, borderRadius: 8, border: `2px solid ${on ? C.accent : "transparent"}`, background: on ? "rgba(59,130,246,0.12)" : C.card, cursor: "pointer", display: "flex", flexDirection: "column", gap: 4, fontFamily: FONT, textAlign: "left" }}>
        <div style={{ width: "100%", aspectRatio: `${size.w} / ${size.h}`, maxHeight: 180, borderRadius: 4, overflow: "hidden", background: "#1a1d24", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {img ? <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : <span style={{ color: C.dim, fontSize: 11 }}>…</span>}
        </div>
        <div title={name} style={{ fontSize: 12.5, fontWeight: 700, color: C.text, padding: "0 2px", lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}{note && <span style={{ fontWeight: 500, fontSize: 11, color: C.dim, marginLeft: 4 }}>{note}</span>}</div>
      </button>
    );
  };
  const bgEff = photo ? bgMode : "new"; // 사진을 안 골랐으면 AI 가 그린다
  const bigImg = layId.startsWith("@mine:") ? mine.find((t) => t.file === layId.slice(6))?.thumb : thumbs[layId];
  const bigName = layId === "@refill" ? "지금 문서의 칸에 채우기" : layId.startsWith("@mine:") ? `내 템플릿 · ${mine.find((t) => t.file === layId.slice(6))?.name || ""}` : layouts.find((l) => l.id === layId)?.name || "";
  const W = typeof window !== "undefined" ? Math.min(1400, window.innerWidth - 40) : 1200;
  return (
    <Modal title="AI 자동 디자인 — 공실·기사로 레이어 디자인 만들기" onClose={() => !busy && onClose()} width={W}
      footer={<><span style={{ flex: 1, fontSize: 13.5, color: err ? "#f87171" : C.sub }}>{err || busy || "가격·면적·주소·중개사무소는 자료 그대로 넣어요 (없으면 그 칸은 만들지 않아요). AI 는 제목·부제·딱지 문구와 배경만 정해요."}</span><Btn onClick={onClose}>닫기</Btn><Btn primary onClick={() => void make()}>{busy ? "만드는 중…" : "이대로 만들기"}</Btn></>}>
      <div style={{ display: "grid", gridTemplateColumns: "300px minmax(0, 1fr) 400px", gap: 20, padding: 18, height: "min(76vh, 860px)" }}>
        {/* 1. 재료 */}
        <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
          {h("1. 재료")}
          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            {seg(kind === "vacancy", "내 공실", () => { setKind("vacancy"); setPick(""); setBgMode("real"); setLay(""); })}
            {seg(kind === "article", "공실뉴스 기사", () => { setKind("article"); setPick(""); if (!photo) setBgMode("new"); setLay(""); })}
          </div>
          {kind === "article" && (
            <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
              <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Enter") listStudioArticles(q).then((r) => setArts(r.success ? r.data : [])); }} placeholder="기사 제목 찾기" style={{ ...input, flex: 1 }} />
              <Btn small onClick={() => listStudioArticles(q).then((r) => setArts(r.success ? r.data : []))}>찾기</Btn>
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
            ))) : (arts === null ? <span style={{ color: C.sub, fontSize: 13 }}>불러오는 중…</span> : !arts.length ? <span style={{ color: C.sub, fontSize: 13 }}>기사가 없어요.</span> : arts.map((a) => (
              <button key={a.id} type="button" style={row(pick === a.id)} onClick={() => setPick(a.id)}>
                <span style={{ minWidth: 0 }}><b style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.title}</b><span style={{ fontSize: 12, color: C.sub }}>{a.date} · {a.author}</span></span>
              </button>
            )))}
          </div>
          {kind === "vacancy" && photos.length > 0 && (
            <>
              <div style={{ fontSize: 13, color: C.sub, margin: "12px 0 6px", fontWeight: 700 }}>배경으로 쓸 사진</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, maxHeight: 170, overflowY: "auto" }}>
                {photos.map((p) => (
                  <button key={p.id} type="button" onClick={() => setPhoto(p.path || "")} style={{ padding: 0, border: `2px solid ${photo === p.path ? C.accent : "transparent"}`, borderRadius: 6, background: "transparent", cursor: "pointer" }}>
                    <img src={p.thumb || p.url} alt="" style={{ width: "100%", aspectRatio: "4 / 3", objectFit: "cover", borderRadius: 4, display: "block" }} />
                  </button>
                ))}
              </div>
            </>
          )}
          <div style={{ display: "flex", alignItems: "center", margin: "12px 0 6px" }}>
            <span style={{ flex: 1, fontSize: 13, color: C.sub, fontWeight: 700 }}>내 이미지{mineImgs && mineImgs.length ? ` (${mineImgs.length})` : ""}</span>
            <Btn small onClick={() => void registerImgs()}>+ 이미지 등록</Btn>
          </div>
          {mineImgs && mineImgs.length > 0 ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, maxHeight: 150, overflowY: "auto" }}>
              {mineImgs.map((p) => (
                <button key={p.id} type="button" title={p.name} onClick={() => { setPhoto(p.path || ""); if (bgMode === "new") setBgMode("real"); }}
                  style={{ padding: 0, border: `2px solid ${photo === p.path ? C.accent : "transparent"}`, borderRadius: 6, background: "transparent", cursor: "pointer" }}>
                  <img src={p.thumb || p.url} alt="" style={{ width: "100%", aspectRatio: "4 / 3", objectFit: "cover", borderRadius: 4, display: "block" }} />
                </button>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 12.5, color: C.dim, lineHeight: 1.5 }}>내 PC 의 사진을 등록하면 여기에 남아요. 배경으로 쓸 수 있어요 (동영상 편집기 [내 자료] 와 같은 곳).</div>
          )}
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 13, color: C.sub, marginBottom: 6, fontWeight: 700 }}>AI 에게 요청 (선택)</div>
            <textarea value={req} onChange={(e) => setReq(e.target.value)} onKeyDown={(e) => e.stopPropagation()} rows={2} placeholder="예: 역세권을 강조해 줘, 차분한 느낌으로" style={{ ...input, width: "100%", height: 58, resize: "none", padding: 8 }} />
          </div>
        </div>
        {/* 2. 크기 · 3. 레이아웃 */}
        <div style={{ display: "flex", flexDirection: "column", minHeight: 0, minWidth: 0 }}>
          {h("2. 종류")}
          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            {(Object.keys(CAT_NAME) as Cat[]).map((c) => seg(cat === c, CAT_NAME[c], () => { setCat(c); setSize(CAT_SIZES[c][0]); setLay(""); }))}
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            {CAT_SIZES[cat].map((sz) => {
              const on = size.name === sz.name;
              const k = 40 / Math.max(sz.w, sz.h);
              return (
                <button key={sz.name} type="button" onClick={() => { setSize(sz); setLay(""); }}
                  style={{ width: 112, padding: "8px 6px 6px", borderRadius: 10, border: `2px solid ${on ? C.accent : C.line}`, background: on ? "rgba(59,130,246,0.12)" : "transparent", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, fontFamily: FONT }}>
                  <span style={{ height: 42, display: "flex", alignItems: "center" }}><span style={{ width: Math.max(6, sz.w * k), height: Math.max(6, sz.h * k), borderRadius: 3, border: `2px solid ${on ? C.accent : C.sub}`, background: on ? "rgba(59,130,246,0.25)" : "transparent" }} /></span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: C.text, textAlign: "center", lineHeight: 1.25 }}>{sz.name}</span>
                  <span style={{ fontSize: 11, color: C.dim }}>{sz.w}×{sz.h}</span>
                </button>
              );
            })}
          </div>
          {h("3. 레이아웃", "누르면 오른쪽에 크게 보여요")}
          <div style={{ flex: 1, minHeight: 0, overflowY: "auto", paddingRight: 4 }}>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${aspect === "tall" ? 96 : 150}px, 1fr))`, gap: 10 }}>
              {canRefill && card("@refill", "지금 문서의 칸에 채우기", undefined)}
              {fit.map((l) => card(l.id, l.name, thumbs[l.id]))}
              {myFit.map((t) => card(`@mine:${t.file}`, `내 템플릿 · ${t.name}`, t.thumb))}
              {!layouts.length && <span style={{ color: C.dim, fontSize: 13 }}>이 크기에 맞는 틀이 아직 없어요.</span>}
            </div>
          </div>
        </div>
        {/* 미리보기 · 4. 배경 */}
        <div style={{ display: "flex", flexDirection: "column", minHeight: 0, gap: 14 }}>
          <div>
            {h("미리보기", bigName)}
            <div style={{ width: "100%", aspectRatio: `${size.w} / ${size.h}`, maxHeight: 420, borderRadius: 10, overflow: "hidden", background: "#1a1d24", border: `1px solid ${C.line}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto" }}>
              {bigImg ? <img src={bigImg} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : <span style={{ color: C.dim, fontSize: 13 }}>{layId === "@refill" ? "지금 문서의 칸 이름표가 있는 레이어만 바뀌어요" : "미리보기 만드는 중…"}</span>}
            </div>
            <div style={{ fontSize: 12, color: C.dim, marginTop: 6, lineHeight: 1.5 }}>제목·부제는 만들 때 AI 가 써요. 미리보기의 칸 이름 자리에 들어가요.</div>
          </div>
          <div>
            {h("4. 배경")}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {seg(bgEff === "real", "사진 그대로", () => setBgMode("real"), !photo)}
              {seg(bgEff === "retouch", "사진 + AI 다듬기", () => setBgMode("retouch"), !photo)}
              {seg(bgEff === "new", "AI 로 새로 그리기", () => setBgMode("new"))}
            </div>
            <div style={{ fontSize: 12.5, color: C.dim, marginTop: 8, lineHeight: 1.6 }}>
              {!photo && bgMode !== "new" ? "사진을 고르지 않아 AI 가 배경을 그려요 — 매물 사진이나 내 이미지를 누르면 그 사진을 써요." : bgEff === "real" ? "고른 사진(매물 사진 · 내 이미지)을 그대로 써요 (가장 믿음직해요)." : bgMode === "retouch" ? "하늘·조명·색만 다듬어요. 건물·방은 바꾸지 않고, 사진 구석에 \"AI 보정\" 을 작게 표시해요." : "AI 가 내용을 읽고 글자 없는 배경을 그려요."}
            </div>
            {bgEff === "new" && (
              <select value={style} onChange={(e) => setStyle(e.target.value)} style={{ ...input, marginTop: 8, width: "100%" }}>
                {IMAGE_STYLES.map((st) => <option key={st.id} value={st.id}>{st.label} — {st.desc}</option>)}
              </select>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
