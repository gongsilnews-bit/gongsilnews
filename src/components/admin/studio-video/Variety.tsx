"use client";

// 메인자막 [텍스트 › 예능 자막] — 예능 자막 160종 (2026-10-19 사장님). 누르면 글꼴·색·테두리·그라데이션·빛이 한 번에, 크기·자리는 그대로
//  칸마다 견본 그림(public/studio-video/variety/<id>.png)을 보여 주고, 그림이 없으면 그 자리에서 그린다(FancyText)
import React, { useState } from "react";
import { VARIETY_PRESETS } from "@/lib/studio-video/varietyPresets";
import { fontCss } from "@/lib/studio-video/fonts";
import { gradCss, subLookCss, withAlpha, type TextLook } from "./SubPresets";
import { C, FONT } from "./ui";

const GROUP_KEY = "gsv:varietyGroup";

/** 예능 자막 모양 그대로 글자 그리기 — 미리보기 Player.tsx 와 같은 층 쌓기 (빛·바깥 테두리 → 안쪽 테두리 → 글자) */
export function FancyText({ look, px, text, k = 1 }: { look: TextLook; px: number; text: string; k?: number }) {
  const l = { color: "#FFFFFF", outline: "#000000", outlineWidth: 3, ...look };
  const ow = Number(l.outlineWidth ?? 3);
  const o2 = !l.bg && Number(l.outline2Width) > 0 ? Number(l.outline2Width) : 0;
  const grad = !l.bg && l.gradTo ? l.gradTo : "";
  const lc = subLookCss(l, px, k);
  const base: React.CSSProperties = {
    fontFamily: fontCss(l.font), fontWeight: 400, fontSize: px, lineHeight: 1.2, whiteSpace: "pre", paintOrder: "stroke fill",
    letterSpacing: l.spacing ? `${l.spacing * px}px` : undefined,
    background: l.bg ? withAlpha(l.bgColor || "#000000", 1 - (l.bgOpacity ?? 0.62)) : undefined, padding: l.bg ? `${px * 0.12}px ${px * 0.3}px` : undefined,
  };
  const oc = withAlpha(l.outline || "#000000", l.outlineAlpha ?? 0);
  const unders: React.CSSProperties[] = l.bg ? [] : [
    ...(o2 ? [{ color: "transparent", WebkitTextStroke: `${Math.max(1, (ow + o2) * k * 2)}px ${l.outline2 || "#FFFFFF"}`, textShadow: lc.textShadow }] : []),
    { color: "transparent", WebkitTextStroke: ow > 0 ? `${Math.max(1, ow * k * 2)}px ${oc}` : undefined, textShadow: o2 ? undefined : lc.textShadow },
  ];
  const main: React.CSSProperties = grad
    ? { color: "transparent", backgroundImage: gradCss({ ...l, gradTo: grad }), WebkitBackgroundClip: "text", backgroundClip: "text" }
    : { color: withAlpha(l.color || "#FFFFFF", l.textAlpha ?? 0) };
  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      {unders.map((u, i) => <span key={i} aria-hidden style={{ ...base, ...u, position: "absolute", left: 0, top: 0 }}>{text}</span>)}
      <span style={{ ...base, ...main, position: "relative", ...(l.bg ? { color: withAlpha(l.color || "#FFFFFF", l.textAlpha ?? 0) } : {}) }}>{text}</span>
    </span>
  );
}

/** 예능 자막 고르기 — 분류(13가지) · 칸마다 견본 */
export function VarietyGrid({ value, onPick }: { value: Partial<TextLook>; onPick: (look: TextLook, meta: { group: string; index: number }) => void }) {
  const [group, setGroup] = useState<string>(() => {
    try { return localStorage.getItem(GROUP_KEY) || VARIETY_PRESETS[1].group; } catch { return VARIETY_PRESETS[1].group; }
  });
  const [noImg, setNoImg] = useState<Record<string, boolean>>({});
  const g = VARIETY_PRESETS.find((x) => x.group === group) || VARIETY_PRESETS[0];
  const same = (lk: Partial<TextLook>) => lk.font === value.font && lk.color === value.color && (lk.gradTo || "") === (value.gradTo || "") && (lk.glow || "") === (value.glow || "");
  return (
    <div style={{ padding: "12px 16px" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 10 }}>
        {VARIETY_PRESETS.map((x) => (
          <button key={x.group} type="button" onClick={() => { setGroup(x.group); try { localStorage.setItem(GROUP_KEY, x.group); } catch {} }}
            style={{ height: 28, padding: "0 10px", borderRadius: 14, border: `1px solid ${x.group === g.group ? C.accent : C.line2}`, background: x.group === g.group ? C.accentDim : "transparent", color: x.group === g.group ? C.text : C.sub, fontSize: 12.5, fontWeight: 700, fontFamily: FONT, cursor: "pointer" }}>
            {x.group} {x.items.length}
          </button>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        {g.items.map((it) => {
          const on = same(it.look);
          return (
            <button key={it.id} type="button" title={it.label} onClick={() => onPick(it.look, { group: g.group, index: g.items.indexOf(it) })}
              style={{ height: 58, borderRadius: 7, border: `2px solid ${on ? C.accent : "transparent"}`, background: "#3a3f4b", cursor: "pointer", padding: 0, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {!noImg[it.id] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/studio-video/variety/${it.id}.png?v=2`} alt={it.label} onError={() => setNoImg((v) => ({ ...v, [it.id]: true }))} style={{ maxWidth: "94%", maxHeight: "86%", objectFit: "contain" }} />
              ) : (
                <FancyText look={it.look} px={20} text="예능자막" k={0.4} />
              )}
            </button>
          );
        })}
      </div>
      <div style={{ fontSize: 12, color: C.dim, marginTop: 8, lineHeight: 1.6 }}>누르면 글꼴·색·테두리·빛이 한 번에 바뀌어요. 크기·자리는 그대로. 처음 쓰는 글꼴은 받는 데 잠깐 걸려요.</div>
    </div>
  );
}
