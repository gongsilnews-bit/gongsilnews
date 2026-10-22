"use client";

// 이미지 편집 처음 화면 — 종류(유튜브·블로그·SNS·부동산마케팅)를 고르면 크기 카드 아래에 레이아웃 샘플
// [그대로 열기] = AI 없이 레이어로 바로 (글은 칸 이름, 중개사무소 정보는 내 정보) · [AI로 채우기] = AI 자동 디자인 창을 이 틀로
import React, { useEffect, useState } from "react";
import { Btn, C, FONT } from "@/components/admin/studio-video/ui";
import { loadFont } from "@/components/admin/studio-video/Pickers";
import { getStudioAgency } from "@/app/actions/studio";
import { CAT_NAME, LAYOUTS, layoutFonts, layoutsForCat, loadSampleBg, placeholderContent, previewOf, sampleSizeOf, type Cat, type CatSize, type Layout } from "./layouts";

/** picks 를 주면 여러 종류에서 골라 보여 준다 (처음 화면 [AI 템플릿] 한 줄) · oneRow = 한 줄만 */
export function SampleGrid({ cat, onSample, compact = false, picks, oneRow = false, title, onAi, size: only }: {
  compact?: boolean; cat: Cat; onSample: (l: Layout, size: CatSize, ai: boolean, cat: Cat) => void;
  picks?: { id: string; cat: Cat }[]; oneRow?: boolean; title?: string;
  /** 고른 크기 — 주면 그 크기에 맞는 틀만, 그 크기로 (새로운 문서에서 크기를 누르면) */
  size?: CatSize;
  /** 제목 바로 옆 [+ AI 자동제작] (AI 자동 디자인 창) */
  onAi?: () => void;
}) {
  type Item = { l: Layout; size: CatSize; cat: Cat };
  const list: Item[] = (picks
    ? picks.map((p) => { const l = LAYOUTS.find((x) => x.id === p.id); return l ? { l, size: sampleSizeOf(l, p.cat), cat: p.cat } : null; })
    : only ? layoutsForCat(cat, only).map((l) => ({ l, size: only, cat }))
    : LAYOUTS.filter((l) => l.cats.includes(cat)).map((l) => ({ l, size: sampleSizeOf(l, cat), cat }))
  ).filter((x): x is Item => Boolean(x && x.size));
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  useEffect(() => {
    let live = true;
    (async () => {
      const ag = await getStudioAgency().catch(() => null);
      const content = placeholderContent(ag?.success && ag.data.name ? ag.data : undefined);
      await Promise.all([...new Set(list.flatMap((x) => layoutFonts(x.l)))].map((f) => loadFont(f).catch(() => {})));
      // 샘플 사진 — 유튜브(썸네일)는 건물 사진, 나머지는 거실 (없으면 사진 자리)
      const bgL = await loadSampleBg(), bgB = await loadSampleBg("building");
      const out: Record<string, string> = {};
      for (const { l, size, cat: c } of list) {
        await new Promise((r) => setTimeout(r, 0));
        if (!live) return;
        try { out[`${l.id}-${c}`] = previewOf(l, size, content, c === "youtube" ? bgB || bgL : bgL, 420); } catch { out[`${l.id}-${c}`] = ""; }
        setThumbs({ ...out });
      }
    })();
    return () => { live = false; };
  }, [cat, only?.name, only?.w, only?.h]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!list.length) return null;
  return (
    <div style={{ marginTop: compact ? 8 : 34 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ fontSize: compact ? 14 : 18, fontWeight: 800 }}>{title || (only ? `${only.name} 레이아웃 샘플` : "레이아웃 샘플")}</div>
        {/* 제목 바로 옆 (2026-10-22 사장님) */}
        {onAi && <Btn primary onClick={onAi}>+ AI 자동제작</Btn>}
      </div>
      <div style={{ fontSize: compact ? 12.5 : 14, color: C.sub, marginTop: compact ? 4 : 6 }}>틀을 골라 바로 시작해요 — 글자·사진·도형이 레이어로 나뉘어 있어 하나씩 고칠 수 있어요.</div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${compact ? 170 : 220}px, 1fr))`, gap: compact ? 10 : 14, marginTop: compact ? 10 : 16,
        ...(oneRow ? { gridTemplateRows: "auto", gridAutoRows: 0, rowGap: 0, overflow: "hidden" } : {}) }}>
        {list.map(({ l, size, cat: c }) => (
          <div key={`${l.id}-${c}`} style={{ borderRadius: 10, border: `1px solid ${C.line}`, background: C.panel, padding: 8, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ height: compact ? 120 : 170, borderRadius: 6, background: "#1a1d24", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
              {thumbs[`${l.id}-${c}`] ? <img src={thumbs[`${l.id}-${c}`]} alt="" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", boxShadow: "0 4px 14px rgba(0,0,0,0.4)" }} /> : <span style={{ color: C.dim, fontSize: 12 }}>미리보기 만드는 중…</span>}
            </div>
            <div style={{ padding: "0 2px" }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={l.name}>{l.name}</div>
              <div style={{ fontSize: 12, color: C.dim, marginTop: 2 }}>{picks ? `${CAT_NAME[c]} · ` : ""}{size.name} · {size.w}×{size.h}</div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button type="button" onClick={() => onSample(l, size, false, c)}
                style={{ flex: 1, height: 32, borderRadius: 6, border: `1px solid ${C.line2}`, background: "transparent", color: C.text, fontSize: 12.5, fontWeight: 700, fontFamily: FONT, cursor: "pointer" }}>그대로 열기</button>
              {!(l.kind.length === 1 && l.kind[0] === "agency") && (
                <button type="button" onClick={() => onSample(l, size, true, c)}
                  style={{ flex: 1, height: 32, borderRadius: 6, border: 0, background: C.accent, color: "#fff", fontSize: 12.5, fontWeight: 700, fontFamily: FONT, cursor: "pointer" }}>AI로 채우기</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
