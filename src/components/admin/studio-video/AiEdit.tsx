"use client";

// 오른쪽 칸 [AI 편집] — [AI 설정]에서 고른 글 AI 가 편집 계획을 세우고, 이미지 AI 가 그림을 그려 클립을 채운다 (회의 3-21, 사장님 2026-10-18)
//  화면(그대로·내 영상·AI 그림·무료 자료) · 화면 글자 · 자막 강조 · 화면전환 · 배경음악 — 한 번에 넣고, 한 번에 되돌리기
import React, { useState } from "react";
import type { AiEditCatalog, Asset, Clip, Layer, LayerAnim, LibItem, Project, StockItem } from "./types";
import { errText, uid, videoBridge } from "./types";
import { flatten, clipText, regroupScenes, SFX_LIST } from "./timeline";
import { SUB_PRESETS } from "./SubPresets";
import { PLAIN_LOOK } from "./SubFormatBar";
import { EMPH_LIST, IN_LIST, WHL_LIST } from "./Anim";
import { CATS, STYLE_LABEL, stickerAnim, stickerFileName, stickerGlyphs, stickerPng, type Sticker, type StickerStyle } from "./Stickers";
import { MUSIC_LIBRARY, MUSIC_MOODS } from "@/lib/reels/music-catalog";
import { useStudioImager, useStudioWriter } from "@/components/admin/sections/useStudioWriter";
import { Btn, C, FONT, Icon } from "./ui";
import { Side } from "./Panels";

const STYLES = [
  { id: "photo", label: "실사 사진", prompt: "실제 사진처럼 사실적인 고화질 사진" },
  { id: "3d", label: "3D 일러스트", prompt: "깔끔하고 밝은 3D 일러스트" },
  { id: "hand", label: "손그림", prompt: "따뜻한 느낌의 손그림 일러스트" },
] as const;

type Row = { n: number; text: string; what: string };

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
 * 화면 바뀌는 곳 부드럽게 — 앞 클립과 화면(자료)이 다른 곳에 0.3초 겹치기 전환 (이미 전환이 있으면 그대로)
 *  2026-10-18 사장님: 클립마다 화면이 툭툭 바뀌어 부자연스럽다
 */
export function softCuts(p: Project) {
  const items = flatten(p).items;
  const scr = (c: Clip) => c.visual?.asset || (c.type !== "voice" ? c.src?.asset : "") || "";
  let n = 0;
  for (let i = 1; i < items.length; i++) {
    const a = items[i - 1].clip, c = items[i].clip;
    if (c.trans || !scr(a) || !scr(c) || scr(a) === scr(c)) continue;
    c.trans = { type: "fade", a: 0.15, b: 0.15 };
    n++;
  }
  return n;
}

export function AiEditPanel({ project, selected, ensureAsset, apply, onUndo, onClose, autoStart }: {
  project: Project;
  selected: string[];
  ensureAsset: (item: LibItem) => Promise<Asset>;
  apply: (fn: (p: Project) => void) => void; // 한 번에 (되돌리기 한 번)
  onUndo: () => void;
  onClose: () => void;
  /** 열자마자 [AI 편집 시작] — 텍스트로 만들기 [AI가 다 꾸미기] */
  autoStart?: boolean;
}) {
  const b = videoBridge()!;
  const writer = useStudioWriter();
  const imager = useStudioImager();
  const [style, setStyle] = useState<(typeof STYLES)[number]["id"]>("photo");
  const [onlySel, setOnlySel] = useState(false);
  const [aiMax, setAiMax] = useState(8);
  const [foot, setFoot] = useState<LibItem[]>([]);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  // AI 에게 맡길 것 (2026-10-19 사장님: 자막 효과·스타일·스티커까지 다)
  const [doScreen, setDoScreen] = useState(!autoStart); // 다 꾸미기 — 화면은 만들 때 이미 골랐으니 그대로
  const [doLook, setDoLook] = useState(true);
  const [doSticker, setDoSticker] = useState(true);
  const started = React.useRef(false);
  React.useEffect(() => {
    if (autoStart && !started.current) {
      started.current = true;
      void start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  const attach = async () => {
    const added = await b.lib.pick().catch(() => []);
    const ok = added.filter((x) => x.kind === "video" || x.kind === "image");
    if (ok.length) setFoot((v) => [...v, ...ok.filter((x) => !v.some((y) => y.id === x.id))]);
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

  const start = async () => {
    if (!b.ai.edit) return setErr("공실뉴스 스튜디오를 껐다 켜 주세요 (AI 편집 기능을 새로 연결해요)");
    setErr("");
    setRows(null);
    const off = b.onProgress((t) => setBusy(t));
    try {
      const all = flatten(project).items.filter((x) => x.clip.type !== "silence");
      const targets = (onlySel && selected.length ? all.filter((x) => selected.includes(x.clip.id)) : all).filter((x) => clipText(x.clip).trim());
      if (!targets.length) throw new Error("편집할 클립이 없어요 (자막·글이 있는 클립이 필요해요). 먼저 [자동 자막 만들기]를 해 주세요.");
      // 1) 글 AI — 편집 계획
      setBusy(`${writer}가 편집 계획을 세우는 중… (1~2분)`);
      const ok = foot.filter((f) => f.path);
      const full = doLook || doSticker;
      const cat = full ? aiEditCatalog() : undefined;
      if (cat && !doSticker) { cat.stickers = []; cat.sfx = []; }
      if (cat && !doLook) { cat.presets = []; }
      const plan = await b.ai.edit(targets.map((x) => clipText(x.clip)), doScreen ? ok.map((f) => ({ path: f.path!, kind: f.kind, duration: f.duration })) : [], { aiMax: doScreen ? aiMax : 0, moods: [...MUSIC_MOODS], screen: doScreen, ratio: project.ratio, catalog: cat });
      // 스티커 그림 — 편집기에서 그려 프로젝트에 저장 (스티커 칸과 같은 방법)
      const stk: Record<string, { item: LibItem; spec: Sticker }> = {};
      const wantStk = doSticker ? plan.clips.map((x, i) => ({ i, s: x.sticker })).filter((x) => x.s) : [];
      if (wantStk.length && b.lib.saveImage) {
        setBusy(`스티커를 그리는 중… (${wantStk.length}개)`);
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
      // 2) 자료 준비 — 내 영상 · 이미지 AI 그림 · 무료 자료
      const vis: Record<string, { asset: string; s: number }> = {};
      const done: Row[] = [];
      const orient = project.ratio === "9:16" || project.ratio === "4:5" ? "portrait" : project.ratio === "1:1" ? "square" : "landscape";
      const usedStock = new Set<string>();
      const sty = STYLES.find((x) => x.id === style)!;
      let aiNo = 0;
      const aiTotal = plan.clips.filter((x) => x.act === "ai").length;
      for (let i = 0; i < targets.length; i++) {
        const c = targets[i].clip;
        const pl = plan.clips[i] || { act: "keep" };
        let what = "그대로";
        if (pl.act === "same") {
          // 앞 클립 화면을 그대로 이어서 (같은 이야기)
          const prevId = i > 0 ? targets[i - 1].clip.id : "";
          if (vis[prevId]) {
            const pv = vis[prevId];
            const prevLen = targets[i - 1].dur;
            vis[c.id] = { asset: pv.asset, s: pv.s + prevLen }; // 영상이면 이어지는 장면부터
            what = "앞 화면 이어서";
          }
        }
        try {
          if (pl.act === "foot" && typeof pl.v === "number" && ok[pl.v]) {
            const a = await ensureAsset(ok[pl.v]);
            vis[c.id] = { asset: a.id, s: pl.t || 0 };
            what = `내 영상 ${pl.v + 1}${ok[pl.v].kind === "video" ? ` · ${Math.round(pl.t || 0)}초부터` : ""}`;
          } else if (pl.act === "ai" && pl.desc) {
            aiNo++;
            setBusy(`${imager}가 그림을 그리는 중… (${aiNo}/${aiTotal}) — 한 장에 30초~1분`);
            const it = await b.ai.image(project.dir, `${pl.desc} — 부동산 영상에 쓸 ${sty.prompt}, 글자·사람 얼굴 없이, ${orient === "portrait" ? "세로" : orient === "square" ? "정사각" : "가로"} 화면`);
            const a = await ensureAsset(it);
            vis[c.id] = { asset: a.id, s: 0 };
            what = `AI 그림 · ${pl.desc}`;
          } else if (pl.act === "stock" && pl.keywords) {
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
        } catch (e) {
          what = `그대로 (못 넣음: ${errText(e)})`;
        }
        const extra = [pl.title && `화면 글자 "${pl.title}"`, pl.emph && "자막 강조", pl.trans && "화면전환", stk[c.id] && `스티커 "${stk[c.id].spec.text}"`, doSticker && pl.sfx && `효과음 ${SFX_LIST.find((x) => x.id === pl.sfx)?.label || pl.sfx}`].filter(Boolean).join(" · ");
        done.push({ n: i + 1, text: clipText(c), what: extra ? `${what} · ${extra}` : what });
      }
      // 3) 배경음악
      let music: { file: string; url: string; name: string } | null = null;
      if (!(project.layers || []).some((l) => l.type === "music")) {
        const track = MUSIC_LIBRARY.find((t) => t.mood === plan.music) || MUSIC_LIBRARY.find((t) => t.mood === "잔잔한");
        if (track) {
          setBusy(`배경음악을 넣는 중… (${track.mood})`);
          const r = await b.musicGet(project.dir, `bgm/lib/${track.id.slice(4)}.mp3`).catch(() => null);
          if (r) music = { file: r.file, url: r.url, name: track.label };
        }
      }
      // 4) 한 번에 넣기 (되돌리기 한 번)
      apply((p) => {
        delete p.settings.aiAuto;
        const find = (id: string): Clip | undefined => p.scenes.flatMap((s) => s.clips).find((x) => x.id === id);
        p.layers = p.layers || [];
        targets.forEach((x, i) => {
          const c = find(x.clip.id);
          const pl = plan.clips[i];
          if (!c || !pl) return;
          if (vis[c.id]) c.visual = c.src && c.src.asset === vis[c.id].asset ? null : vis[c.id];
          if (pl.emph) c.subStyle = { ...(c.subStyle || {}), color: "#FFE14D", bold: true };
          if (pl.trans) c.trans = { type: "fade", a: 0.3, b: 0.3 };
          if (pl.title) {
            p.layers!.push({ id: uid(), type: "text", from: c.id, to: c.id, text: pl.title, pos: "top", size: 130, color: "#FFFFFF", box: true, boxColor: "#1A3A6B", boxOpacity: 0.85, anim: { in: "pop", out: "fade" } } as Layer);
          }
          // 스티커 — 자막·화면 글자를 가리지 않게 위쪽 옆으로, 번갈아 오른쪽·왼쪽 (움직임·효과음은 모양에 맞게 저절로)
          const sa = stkAsset[c.id], sv = stk[c.id];
          if (sa && sv) {
            const tall = p.ratio === "9:16" || p.ratio === "4:5";
            const k = Object.keys(stkAsset).indexOf(c.id);
            p.layers!.push({ id: uid(), type: "image", from: c.id, to: c.id, asset: sa.id, name: sv.item.name.replace(/_\d+(\.\w+)?$/, ""), x: k % 2 ? 0.25 : 0.75, y: pl.title ? 0.45 : 0.3, w: tall ? 0.5 : 0.3, opacity: 1, anim: stickerAnim(sv.spec.style), sticker: true, stk: sv.spec } as Layer);
          } else if (doSticker && pl.sfx) {
            p.layers!.push({ id: uid(), type: "sfx", sfx: pl.sfx, name: SFX_LIST.find((x) => x.id === pl.sfx)?.label || pl.sfx, volume: 0.6, from: c.id, to: c.id } as Layer);
          }
        });
        // 영상 전체 자막 모양 — 스타일 · 나타나기·사라지기 · 단어 효과 · 최대 줄 수
        const lk = doLook ? plan.look : null;
        if (lk) {
          const pre = SUB_PRESETS.flatMap((g) => g.items).find((x) => x.id === lk.preset);
          const sub = p.settings.subtitle;
          const anim: LayerAnim = { ...(sub.anim || {}) };
          if (lk.in) anim.in = lk.in as LayerAnim["in"];
          if (lk.out) anim.out = lk.out as LayerAnim["out"];
          anim.emph = (lk.emph || undefined) as LayerAnim["emph"];
          anim.wshow = (lk.wshow || undefined) as LayerAnim["wshow"];
          anim.whl = lk.wshow ? ((lk.whl || undefined) as LayerAnim["whl"]) : undefined;
          if (lk.wcolor) anim.wcolor = lk.wcolor;
          p.settings.subtitle = {
            ...sub,
            ...(pre ? { ...(PLAIN_LOOK as Partial<typeof sub>), ...pre.look } : {}),
            anim,
            ...(lk.lines ? { maxLines: lk.lines as 1 | 2 | 3, length: lk.lines === 1 ? "short" : "long" } : {}),
          };
        }
        softCuts(p); // 화면이 다른 장면으로 바뀌는 곳마다 0.3초 겹치기 (툭툭 바뀌지 않게)
        if (music) {
          const items = flatten(p).items;
          if (items.length) p.layers!.push({ id: uid(), type: "music", from: items[0].clip.id, to: items[items.length - 1].clip.id, ...music, volume: 0.15, fadeIn: 0, fadeOut: 2, offset: 0, loop: true } as Layer);
        }
      });
      if (music) done.push({ n: 0, text: "", what: `배경음악 · ${music.name}` });
      if (doLook && plan.look) {
        const lk = plan.look;
        const pre = SUB_PRESETS.flatMap((g) => g.items).find((x) => x.id === lk.preset);
        const parts = [pre && `자막 스타일 "${pre.label}"`, lk.in && `나타나기 ${IN_LIST.find((x) => x.id === lk.in)?.label || lk.in}`, lk.wshow && (lk.wshow === "word" ? "한 단어씩" : "한 줄씩"), lk.whl && `단어 강조 ${WHL_LIST.find((x) => x.id === lk.whl)?.label || lk.whl}`, lk.lines && `최대 ${lk.lines}줄`].filter(Boolean);
        if (parts.length) done.unshift({ n: 0, text: "", what: `자막 · ${parts.join(" · ")}` });
      }
      setRows(done);
    } catch (e) {
      if (autoStart) apply((p) => { delete p.settings.aiAuto; }); // 다시 열 때 또 시작하지 않게
      setErr(errText(e));
    } finally {
      off();
      setBusy("");
    }
  };

  const chip = (on: boolean): React.CSSProperties => ({ height: 32, padding: "0 12px", borderRadius: 16, border: `1px solid ${on ? C.accent : C.line2}`, background: on ? C.accentDim : "transparent", color: on ? C.text : C.sub, fontSize: 13.5, fontWeight: 700, fontFamily: FONT, cursor: "pointer" });
  const head: React.CSSProperties = { fontSize: 14, fontWeight: 800, margin: "16px 0 8px" };
  const aiOpen = () => (window as unknown as { gongsilStudio?: { openAiConnect?: () => void } }).gongsilStudio?.openAiConnect?.();
  return (
    <Side title="AI 편집" onClose={onClose}
      footer={rows ? (
        <div style={{ display: "flex", gap: 8, width: "100%" }}>
          <Btn onClick={() => { onUndo(); setRows(null); }}><Icon name="undo" size={15} />한 번에 되돌리기</Btn>
          <span style={{ flex: 1 }} />
          <Btn primary onClick={() => setRows(null)}>확인</Btn>
        </div>
      ) : (
        <Btn primary disabled={Boolean(busy)} onClick={start} style={{ width: "100%", justifyContent: "center" }}><Icon name="ai" size={17} />{busy ? "편집하는 중…" : "AI 편집 시작"}</Btn>
      )}>
      <div style={{ padding: "14px 16px", fontFamily: FONT, color: C.text, overflowY: "auto" }}>
        {/* 쓰는 AI — [AI 설정]에서 고른 것 */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 8, background: C.card, border: `1px solid ${C.line2}`, fontSize: 13.5 }}>
          <span style={{ flex: 1, lineHeight: 1.6 }}>글 AI <b>{writer}</b> · 이미지 AI <b>{imager}</b></span>
          <Btn small onClick={aiOpen}>AI 설정</Btn>
        </div>
        <div style={{ fontSize: 13, color: C.sub, lineHeight: 1.6, marginTop: 8 }}>
          {writer}가 자막을 읽고 클립마다 화면·화면 글자·자막 강조·화면전환·배경음악을 정하고, {imager}가 필요한 그림을 그려 넣어요.
        </div>

        {/* AI 에게 맡길 것 — 다 켜면 처음부터 끝까지 AI 가 꾸민다 */}
        <div style={head}>AI에게 맡길 것</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button type="button" onClick={() => setDoScreen((v) => !v)} style={chip(doScreen)}>{doScreen ? "✓ " : ""}화면 (사진·영상·AI 그림)</button>
          <button type="button" onClick={() => setDoLook((v) => !v)} style={chip(doLook)}>{doLook ? "✓ " : ""}자막 스타일·효과</button>
          <button type="button" onClick={() => setDoSticker((v) => !v)} style={chip(doSticker)}>{doSticker ? "✓ " : ""}스티커·효과음</button>
        </div>
        <div style={{ fontSize: 12.5, color: C.dim, marginTop: 6, lineHeight: 1.6 }}>자막 스타일은 50가지 중 영상 분위기에 맞게 하나, 나타나기·단어 효과·최대 줄 수까지. 스티커는 강조할 곳에만 (움직임·효과음은 모양에 맞게 저절로).</div>

        <div style={head}>내 영상·사진 <span style={{ fontSize: 12.5, color: C.sub, fontWeight: 600 }}>(있으면 먼저 써요)</span></div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <Btn small onClick={attach}><Icon name="plus" size={15} />영상·사진 첨부</Btn>
        </div>
        {foot.length > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
            {foot.map((f) => (
              <span key={f.id} title={f.name} style={{ position: "relative", width: 72, height: 44, borderRadius: 4, overflow: "hidden", background: "#000", border: `1px solid ${C.line2}` }}>
                {f.thumb && <img src={f.thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
                <button type="button" title="빼기" onClick={() => setFoot((v) => v.filter((x) => x.id !== f.id))} style={{ position: "absolute", right: 2, top: 2, width: 18, height: 18, borderRadius: 9, border: 0, background: "rgba(0,0,0,0.65)", color: "#fff", cursor: "pointer", fontSize: 11, lineHeight: "18px", padding: 0 }}>✕</button>
              </span>
            ))}
          </div>
        )}
        <div style={{ fontSize: 12.5, color: C.dim, marginTop: 6 }}>첨부한 것은 [내 자료]에도 담겨요. 없으면 AI 그림·무료 자료로 채워요.</div>

        <div style={head}>그림 스타일 <span style={{ fontSize: 12.5, color: C.sub, fontWeight: 600 }}>({imager})</span></div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {STYLES.map((x) => <button key={x.id} type="button" onClick={() => setStyle(x.id)} style={chip(style === x.id)}>{x.label}</button>)}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, fontSize: 13.5 }}>
          AI 그림 최대
          {[0, 4, 8, 12].map((n) => <button key={n} type="button" onClick={() => setAiMax(n)} style={{ ...chip(aiMax === n), height: 28, padding: "0 10px" }}>{n ? `${n}장` : "안 그림"}</button>)}
        </div>
        <div style={{ fontSize: 12.5, color: C.dim, marginTop: 6 }}>한 장에 30초~1분 걸려요. 나머지는 무료 자료로 채워요.</div>

        <div style={head}>지금 영상 다듬기</div>
        <Btn small onClick={() => { let n = 0; apply((p) => { n = softCuts(p); }); setErr(""); setBusy(""); setRows([{ n: 0, text: "", what: n ? `화면이 바뀌는 ${n}곳에 부드러운 전환(0.3초)을 넣었어요` : "넣을 곳이 없어요 (이미 전환이 있거나 같은 화면)" }]); }}>
          <Icon name="transition" size={15} />화면 바뀌는 곳 부드럽게
        </Btn>
        <div style={{ fontSize: 12.5, color: C.dim, marginTop: 6 }}>앞 클립과 화면이 다른 곳마다 0.3초 겹치기 전환을 넣어요 (AI 편집 때는 저절로).</div>
        <div style={{ marginTop: 10 }}>
          <Btn small onClick={group} disabled={Boolean(busy)}>
            <Icon name="ai" size={15} />씬 정리
          </Btn>
        </div>
        <div style={{ fontSize: 12.5, color: C.dim, marginTop: 6 }}>{writer}가 클립 글을 읽고 이야기 묶음(씬)으로 다시 나누고 이름을 붙여요 (도입·위치·가격 …). 클립 순서는 그대로, 되돌리기 돼요.</div>

        <div style={head}>편집할 클립</div>
        <div style={{ display: "flex", gap: 6 }}>
          <button type="button" onClick={() => setOnlySel(false)} style={chip(!onlySel)}>모든 클립</button>
          <button type="button" onClick={() => setOnlySel(true)} disabled={!selected.length} style={{ ...chip(onlySel), opacity: selected.length ? 1 : 0.5 }}>고른 클립 ({selected.length}개)</button>
        </div>

        {busy && <div style={{ marginTop: 16, padding: 12, borderRadius: 8, background: C.card, border: `1px solid ${C.accent}`, fontSize: 14, lineHeight: 1.6 }}>{busy}<div style={{ fontSize: 12.5, color: C.sub, marginTop: 4 }}>이 칸을 닫지 마세요. 다른 편집은 끝난 뒤에 해 주세요.</div></div>}
        {err && <div style={{ marginTop: 12, fontSize: 14, color: C.danger, lineHeight: 1.6 }}>{err}</div>}
        {rows && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 14.5, fontWeight: 800, marginBottom: 8 }}>{rows.some((r) => r.n > 0) ? "편집했어요 — 마음에 안 드는 클립은 끌어서 바꾸세요" : "다 했어요 — 마음에 안 들면 되돌리기"}</div>
            {rows.map((r, i) => (
              <div key={i} style={{ padding: "8px 0", borderBottom: `1px solid ${C.line}`, fontSize: 13 }}>
                {r.n > 0 && <div style={{ color: C.sub, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.n}. {r.text}</div>}
                <div style={{ color: r.what.startsWith("그대로") ? C.dim : C.text, fontWeight: 700, marginTop: 2 }}>→ {r.what}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Side>
  );
}
