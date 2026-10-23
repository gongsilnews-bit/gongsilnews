"use client";

// 이미지 편집 처음 화면 — 종류(유튜브·블로그·SNS·부동산마케팅)를 고르면 크기 카드 아래에 레이아웃 샘플
// [템플릿 열기] = AI 없이 레이어로 바로 (글은 칸 이름, 중개사무소 정보는 내 정보) · [AI로 채우기] = AI 자동 디자인 창을 이 틀로
// 내 템플릿 = [내 템플릿으로 저장]한 디자인 — 맨 앞에. 카드 오른쪽 클릭 → [목록에서 제외] (2026-10-23 사장님 — 즐겨찾기(별)는 복잡해서 뺐다)
import React, { useEffect, useState } from "react";
import { Btn, C, FONT } from "@/components/admin/studio-video/ui";
import { loadFont } from "@/components/admin/studio-video/Pickers";
import { getStudioAgency } from "@/app/actions/studio";
import { CAT_NAME, CAT_SIZES, LAYOUTS, layoutFonts, layoutsForCat, loadSampleBg, placeholderContent, previewOf, sampleSizeOf, type Cat, type CatSize, type Layout } from "./layouts";
import type { MyTpl } from "./DesignSide";

/* 목록에서 제외한 틀 — 이 PC 에 기억 ("틀 id|종류"). [숨긴 템플릿 다시 보기]로 되살린다. 여러 목록이 같이 바뀌게 알림 */
const HIDE_KEY = "gsp-hidden-layouts";
const HIDE_EVENT = "gsp-hidden-change";
const readHidden = (): string[] => {
  try { const v = JSON.parse(localStorage.getItem(HIDE_KEY) || "[]"); return Array.isArray(v) ? v.filter((x) => typeof x === "string") : []; } catch { return []; }
};
const writeHidden = (v: string[]) => {
  try { localStorage.setItem(HIDE_KEY, JSON.stringify(v)); } catch {}
  window.dispatchEvent(new Event(HIDE_EVENT));
};
const ratioOk = (w: number, h: number, s: { w: number; h: number }) => Boolean(w && h) && Math.abs(w / h - s.w / s.h) < 0.05;
type MenuItem = { label: string; go: () => void; danger?: boolean };

/** picks 를 주면 여러 종류에서 골라 보여 준다 (처음 화면 [AI 템플릿] 한 줄) · oneRow = 한 줄만 */
export function SampleGrid({ cat, onSample, compact = false, picks, oneRow = false, title, onAi, size: only, mine, onMine, onMineRemove }: {
  compact?: boolean; cat: Cat; onSample: (l: Layout, size: CatSize, ai: boolean, cat: Cat) => void;
  picks?: { id: string; cat: Cat }[]; oneRow?: boolean; title?: string;
  /** 고른 크기 — 주면 그 크기에 맞는 틀만, 그 크기로 (새로운 문서에서 크기를 누르면) */
  size?: CatSize;
  /** 제목 바로 옆 [+ AI 자동제작] (AI 자동 디자인 창) */
  onAi?: () => void;
  /** [내 템플릿으로 저장]한 디자인 — 맨 앞에 (템플릿 열기 / AI로 채우기 / 오른쪽 클릭 → 목록에서 제외) */
  mine?: MyTpl[] | null; onMine?: (t: MyTpl, ai: boolean) => void; onMineRemove?: (t: MyTpl) => void;
}) {
  type Item = { l: Layout; size: CatSize; cat: Cat };
  const keyOf = (l: Layout, c: Cat) => `${l.id}|${c}`;
  const [hidden, setHidden] = useState<string[]>([]);
  useEffect(() => {
    const load = () => setHidden(readHidden());
    load();
    window.addEventListener(HIDE_EVENT, load);
    return () => window.removeEventListener(HIDE_EVENT, load);
  }, []);

  const base: Item[] = (picks
    ? picks.map((p) => { const l = LAYOUTS.find((x) => x.id === p.id); return l ? { l, size: sampleSizeOf(l, p.cat), cat: p.cat } : null; })
    : only ? layoutsForCat(cat, only).map((l) => ({ l, size: only, cat }))
    : LAYOUTS.filter((l) => l.cats.includes(cat)).map((l) => ({ l, size: sampleSizeOf(l, cat), cat }))
  ).filter((x): x is Item => Boolean(x && x.size));
  const hiddenHere = base.filter((x) => hidden.includes(keyOf(x.l, x.cat))).length;
  const list: Item[] = base.filter((x) => !hidden.includes(keyOf(x.l, x.cat)));
  // 내가 저장한 디자인 — 처음 화면은 모두, 종류별 목록은 비율이 맞는 것만
  const myList = (mine || []).filter((t) => picks || (only ? ratioOk(t.w, t.h, only) : CAT_SIZES[cat].some((s) => ratioOk(t.w, t.h, s))));

  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  // 카드 오른쪽 클릭 메뉴 — 목록에서 제외
  const [menu, setMenu] = useState<null | { x: number; y: number; items: MenuItem[] }>(null);
  useEffect(() => {
    if (!menu) return;
    const off = () => setMenu(null);
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setMenu(null); };
    window.addEventListener("pointerdown", off);
    window.addEventListener("scroll", off, true);
    window.addEventListener("keydown", key);
    return () => { window.removeEventListener("pointerdown", off); window.removeEventListener("scroll", off, true); window.removeEventListener("keydown", key); };
  }, [menu]);
  const listKey = list.map((x) => `${x.l.id}-${x.cat}`).join(",");
  useEffect(() => {
    let live = true;
    (async () => {
      const ag = await getStudioAgency().catch(() => null);
      const content = placeholderContent(ag?.success && ag.data.name ? ag.data : undefined);
      await Promise.all([...new Set(list.flatMap((x) => layoutFonts(x.l)))].map((f) => loadFont(f).catch(() => {})));
      // 샘플 사진 — 유튜브(썸네일)는 건물 사진, 나머지는 거실 (없으면 사진 자리)
      const bgL = await loadSampleBg(), bgB = await loadSampleBg("building");
      const out: Record<string, string> = { ...thumbs };
      for (const { l, size, cat: c } of list) {
        if (out[`${l.id}-${c}`]) continue;
        await new Promise((r) => setTimeout(r, 0));
        if (!live) return;
        try { out[`${l.id}-${c}`] = previewOf(l, size, content, c === "youtube" ? bgB || bgL : bgL, 420); } catch { out[`${l.id}-${c}`] = ""; }
        setThumbs({ ...out });
      }
    })();
    return () => { live = false; };
  }, [cat, only?.name, only?.w, only?.h, listKey]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!list.length && !myList.length && !hiddenHere) return null;

  const removeMineAsk = (t: MyTpl) => {
    if (window.confirm(`"${t.name}" 을(를) 내 템플릿 목록에서 뺄까요?\n(목록에서만 빠지고 PSD 파일은 그대로 남아요)`)) onMineRemove?.(t);
  };
  const card = (key: string, img: string, name: string, sub: string, onOpen: () => void, onFill: (() => void) | null, mineCard: boolean, menuItems: MenuItem[]) => (
    <div key={key} onContextMenu={(e) => { if (!menuItems.length) return; e.preventDefault(); setMenu({ x: e.clientX, y: e.clientY, items: menuItems }); }}
      style={{ borderRadius: 10, border: `1px solid ${mineCard ? "rgba(250,204,21,0.55)" : C.line}`, background: C.panel, padding: 8, display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ position: "relative", height: compact ? 120 : 170, borderRadius: 6, background: "#1a1d24", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {img ? <img src={img} alt="" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", boxShadow: "0 4px 14px rgba(0,0,0,0.4)" }} /> : <span style={{ color: C.dim, fontSize: 12 }}>미리보기 만드는 중…</span>}
        {mineCard && <span style={{ position: "absolute", top: 6, left: 6, padding: "2px 8px", borderRadius: 10, background: "rgba(0,0,0,0.6)", color: "#facc15", fontSize: 11.5, fontWeight: 800, fontFamily: FONT }}>내 템플릿</span>}
      </div>
      <div style={{ padding: "0 2px" }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={name}>{name}</div>
        <div style={{ fontSize: 12, color: C.dim, marginTop: 2 }}>{sub}</div>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <button type="button" onClick={onOpen}
          style={{ flex: 1, height: 32, borderRadius: 6, border: `1px solid ${C.line2}`, background: "transparent", color: C.text, fontSize: 12.5, fontWeight: 700, fontFamily: FONT, cursor: "pointer" }}>템플릿 열기</button>
        {onFill && (
          <button type="button" onClick={onFill}
            style={{ flex: 1, height: 32, borderRadius: 6, border: 0, background: C.accent, color: "#fff", fontSize: 12.5, fontWeight: 700, fontFamily: FONT, cursor: "pointer" }}>AI로 채우기</button>
        )}
      </div>
    </div>
  );

  return (
    <div style={{ marginTop: compact ? 8 : 34 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ fontSize: compact ? 14 : 18, fontWeight: 800 }}>{title || (only ? `${only.name} 레이아웃 샘플` : "레이아웃 샘플")}</div>
        {/* 제목 바로 옆 (2026-10-22 사장님) */}
        {onAi && <Btn primary onClick={onAi}>+ AI 자동제작</Btn>}
        {hiddenHere > 0 && (
          <button type="button" onClick={() => writeHidden(hidden.filter((k) => !base.some((x) => keyOf(x.l, x.cat) === k)))}
            style={{ marginLeft: "auto", border: 0, background: "transparent", color: C.sub, fontSize: 12.5, fontFamily: FONT, cursor: "pointer", textDecoration: "underline" }}>
            숨긴 템플릿 다시 보기 ({hiddenHere})
          </button>
        )}
      </div>
      <div style={{ fontSize: compact ? 12.5 : 14, color: C.sub, marginTop: compact ? 4 : 6 }}>틀을 골라 바로 시작해요 — 글자·사진·도형이 레이어로 나뉘어 있어 하나씩 고칠 수 있어요. 오른쪽 클릭: 목록에서 제외</div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${compact ? 170 : 220}px, 1fr))`, gap: compact ? 10 : 14, marginTop: compact ? 10 : 16,
        ...(oneRow ? { gridTemplateRows: "auto", gridAutoRows: 0, rowGap: 0, overflow: "hidden" } : {}) }}>
        {myList.map((t) => card(`mine-${t.file}`, t.thumb, t.name, `내가 저장한 디자인 · ${t.w}×${t.h}`,
          () => onMine?.(t, false), onMine ? () => onMine(t, true) : null, true,
          onMineRemove ? [{ label: "목록에서 제외 (파일은 남아요)", go: () => removeMineAsk(t), danger: true }] : []))}
        {list.map(({ l, size, cat: c }) => card(`${l.id}-${c}`, thumbs[`${l.id}-${c}`] || "", l.name, `${picks ? `${CAT_NAME[c]} · ` : ""}${size.name} · ${size.w}×${size.h}`,
          () => onSample(l, size, false, c), l.kind.length === 1 && l.kind[0] === "agency" ? null : () => onSample(l, size, true, c), false,
          [{ label: "목록에서 제외", go: () => writeHidden([...hidden, keyOf(l, c)]), danger: true }]))}
      </div>
      {menu && (
        <div onPointerDown={(e) => e.stopPropagation()}
          style={{ position: "fixed", left: Math.min(menu.x, window.innerWidth - 220), top: Math.min(menu.y, window.innerHeight - 20 - menu.items.length * 34), zIndex: 1000, minWidth: 200, padding: "4px 0", borderRadius: 8, background: C.panel2, border: `1px solid ${C.line2}`, boxShadow: "0 8px 24px rgba(0,0,0,0.45)" }}>
          {menu.items.map((it) => (
            <button key={it.label} type="button" onClick={() => { setMenu(null); it.go(); }}
              style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 14px", border: 0, background: "transparent", color: it.danger ? C.danger : C.text, fontSize: 13, fontFamily: FONT, cursor: "pointer" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = C.cardHover; }} onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
