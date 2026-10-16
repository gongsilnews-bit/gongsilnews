"use client";

// 사진·영상 메뉴 — 브루처럼 클립 화면 썸네일이나 사진 올리기 아이콘을 누르면 바로 옆에 뜬다.
// 채우기·반전·교체·적용 범위·순서·삭제. 항목에 마우스를 올리면 옆에 설명이 뜬다
import React from "react";
import { C, FONT, Icon, input } from "./ui";

export type MediaFit = "free" | "contain" | "cover" | "blur";
export type MediaOrder = "top" | "up" | "down" | "bottom";

const FIT_INFO: Record<MediaFit, { icon: string; label: string; desc: string }> = {
  free: { icon: "fitFree", label: "직접 크기", desc: "미리보기에서 끌어 자리와 크기를 마음대로 정해요" },
  contain: { icon: "fitContain", label: "비율 유지하며 채우기", desc: "사진이 잘리지 않게 화면 안에 다 보여요. 비율이 다르면 위아래나 양옆이 비어요" },
  cover: { icon: "fitCover", label: "잘라서 채우기", desc: "빈 곳 없이 화면을 꽉 채워요. 비율이 다르면 사진 가장자리가 잘려요" },
  blur: { icon: "fill", label: "흐린 배경으로 채우기", desc: "사진은 다 보이게 두고, 빈 곳은 같은 사진을 흐리게 깔아 채워요" },
};

type Props = {
  title: string;
  x: number;
  y: number;
  kind: "clip" | "layer";
  fit: MediaFit;
  fits: MediaFit[];
  flipX?: boolean;
  flipY?: boolean;
  /** 적용 범위 — 지금 범위(클립 번호 1부터), 지금 클립 번호, 전체 클립 수 */
  range: { a: number; b: number; cur: number; total: number };
  /** 순서 (사진 올리기만) — 앞으로/뒤로 갈 수 있는지 */
  order?: { up: boolean; down: boolean };
  canRemove: boolean;
  onFit: (f: MediaFit) => void;
  onFlip: (axis: "x" | "y") => void;
  onReplace: () => void;
  onStart?: () => void; // 비디오 시작점 변경 (영상일 때만)
  onRange: (a: number, b: number) => void;
  onOrder?: (o: MediaOrder) => void;
  onRemove: () => void;
  onClose: () => void;
};

type Item = { icon: string; label: string; desc: string; on?: boolean; off?: boolean; sub?: boolean; danger?: boolean; run: () => void };

export default function MediaMenu(p: Props) {
  const [page, setPage] = React.useState<"" | "fit" | "flip" | "range" | "order">("");
  const [hover, setHover] = React.useState<{ desc: string; top: number } | null>(null);
  const [na, setNa] = React.useState(String(p.range.a));
  const [nb, setNb] = React.useState(String(p.range.b));
  React.useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && p.onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [p]);
  React.useEffect(() => setHover(null), [page]);

  const what = p.kind === "clip" ? "화면" : "사진";
  const { a, b, cur, total } = p.range;
  const go = (pg: typeof page) => () => setPage(pg);
  const done = (f: () => void) => () => {
    f();
    p.onClose();
  };
  const applyNum = () => {
    let x = Math.max(1, Math.min(total, parseInt(na, 10) || 1));
    let z = Math.max(1, Math.min(total, parseInt(nb, 10) || x));
    if (x > z) [x, z] = [z, x];
    p.onRange(x, z);
    p.onClose();
  };

  let head = "";
  let items: Item[] = [];
  if (page === "") {
    items = [
      { icon: FIT_INFO[p.fit].icon, label: "채우기", desc: "화면에 어떻게 채울지 골라요", sub: true, run: go("fit") },
      { icon: "flipH", label: "반전", desc: "거울처럼 좌우나 위아래를 뒤집어요", sub: true, run: go("flip") },
      ...(p.onStart ? [{ icon: "video", label: "비디오 시작점 변경", desc: "영상의 어느 부분부터 쓸지 골라요. 고르지 않으면 처음부터 나가요", run: done(p.onStart) }] : []),
      { icon: "swap", label: "교체", desc: `다른 사진·영상으로 바꿔요. 채우기·반전·범위는 그대로예요`, run: done(p.onReplace) },
      { icon: "range", label: "적용 범위 변경", desc: p.kind === "clip" ? "이 화면을 다른 클립에도 똑같이 써요" : "이 사진이 몇 번 클립부터 몇 번 클립까지 나올지 정해요", sub: true, run: go("range") },
      ...(p.kind === "layer" ? [{ icon: "layers", label: "순서", desc: "사진이 여러 장 겹칠 때 어느 사진을 위에 둘지 정해요", sub: true, off: !p.order?.up && !p.order?.down, run: go("order") }] : []),
      { icon: "trash", label: "삭제", desc: p.kind === "clip" ? "이 클립의 화면만 지워요. 글·목소리·자막은 그대로예요" : "이 사진 올리기를 지워요", danger: true, off: !p.canRemove, run: done(p.onRemove) },
    ];
  } else if (page === "fit") {
    head = "채우기";
    items = p.fits.map((f) => ({ icon: FIT_INFO[f].icon, label: FIT_INFO[f].label, desc: FIT_INFO[f].desc, on: p.fit === f, run: done(() => p.onFit(f)) }));
  } else if (page === "flip") {
    head = "반전";
    items = [
      { icon: "flipH", label: "좌우 반전", desc: "왼쪽과 오른쪽을 거울처럼 뒤집어요. 한 번 더 누르면 원래대로", on: p.flipX, run: done(() => p.onFlip("x")) },
      { icon: "flipV", label: "상하 반전", desc: "위와 아래를 뒤집어요. 한 번 더 누르면 원래대로", on: p.flipY, run: done(() => p.onFlip("y")) },
    ];
  } else if (page === "range") {
    head = "적용 범위 변경";
    items = [
      { icon: "range", label: "전체 클립으로", desc: `클립 1번부터 ${total}번까지 모두`, on: a === 1 && b === total, run: done(() => p.onRange(1, total)) },
      { icon: "range", label: "처음부터 현재 클립까지", desc: `클립 1번부터 ${cur}번까지`, run: done(() => p.onRange(1, cur)) },
      { icon: "range", label: "현재 클립부터 끝까지", desc: `클립 ${cur}번부터 ${total}번까지`, run: done(() => p.onRange(cur, total)) },
    ];
  } else if (page === "order") {
    head = "순서";
    const o = p.order || { up: false, down: false };
    items = [
      { icon: "front", label: "맨 앞으로 가져오기", desc: "겹친 사진 중 가장 위에 보이게", off: !o.up, run: done(() => p.onOrder?.("top")) },
      { icon: "front", label: "앞으로 가져오기", desc: "한 칸 위로", off: !o.up, run: done(() => p.onOrder?.("up")) },
      { icon: "down", label: "뒤로 보내기", desc: "한 칸 아래로", off: !o.down, run: done(() => p.onOrder?.("down")) },
      { icon: "down", label: "맨 뒤로 보내기", desc: "겹친 사진 중 가장 아래로 (클립 화면보다는 늘 위)", off: !o.down, run: done(() => p.onOrder?.("bottom")) },
    ];
  }

  const W = 250;
  const left = Math.max(8, Math.min(p.x, (typeof window !== "undefined" ? window.innerWidth : 1600) - W - 260));
  const top = Math.max(8, Math.min(p.y, (typeof window !== "undefined" ? window.innerHeight : 900) - 360));
  return (
    <>
      <div onClick={p.onClose} onContextMenu={(e) => { e.preventDefault(); p.onClose(); }} style={{ position: "fixed", inset: 0, zIndex: 69 }} />
      <div onClick={(e) => e.stopPropagation()} onMouseLeave={() => setHover(null)}
        style={{ position: "fixed", left, top, zIndex: 70, width: W, padding: 6, background: C.panel, border: `1px solid ${C.line2}`, borderRadius: 8, boxShadow: "0 12px 36px rgba(0,0,0,0.45)", fontFamily: FONT, color: C.text }}>
        {head ? (
          <button type="button" onClick={go("")} style={{ ...rowStyle, fontWeight: 800, color: C.text }}>
            <Icon name="back" size={16} color={C.sub} />
            {head}
          </button>
        ) : (
          <div style={{ padding: "6px 10px 8px", fontSize: 12.5, color: C.dim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.title}</div>
        )}
        {items.map((it, i) => (
          <React.Fragment key={it.label}>
            {it.danger && <div style={{ height: 1, background: C.line, margin: "4px 6px" }} />}
            <button type="button" disabled={it.off} onClick={it.run}
              onMouseEnter={(e) => setHover({ desc: it.desc, top: (e.currentTarget as HTMLElement).offsetTop })}
              style={{ ...rowStyle, color: it.off ? C.dim : it.danger ? C.danger : C.text, cursor: it.off ? "default" : "pointer", background: it.on ? C.accentDim : "transparent" }}
              onMouseOver={(e) => { if (!it.off && !it.on) (e.currentTarget as HTMLElement).style.background = C.cardHover; }}
              onMouseOut={(e) => { if (!it.on) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              data-i={i}>
              <Icon name={it.icon} size={17} />
              <span style={{ flex: 1, textAlign: "left" }}>{it.label}</span>
              {it.on && <Icon name="check" size={15} color={C.accent} />}
              {it.sub && <Icon name="chevron" size={14} color={C.sub} />}
            </button>
          </React.Fragment>
        ))}
        {page === "range" && (
          <div style={{ padding: "8px 10px 6px", borderTop: `1px solid ${C.line}`, marginTop: 4 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>직접 입력 <span style={{ color: C.dim, fontWeight: 600 }}>· 지금 {a}~{b}번</span></div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13.5 }}>
              클립
              <input value={na} onChange={(e) => setNa(e.target.value.replace(/[^0-9]/g, ""))} onKeyDown={(e) => e.key === "Enter" && applyNum()} inputMode="numeric" style={numStyle} />
              ~
              <input value={nb} onChange={(e) => setNb(e.target.value.replace(/[^0-9]/g, ""))} onKeyDown={(e) => e.key === "Enter" && applyNum()} inputMode="numeric" style={numStyle} />
              <button type="button" onClick={applyNum} style={{ height: 32, padding: "0 10px", borderRadius: 5, border: 0, background: C.accent, color: "#fff", fontSize: 13, fontWeight: 800, fontFamily: FONT, cursor: "pointer" }}>적용</button>
            </div>
          </div>
        )}
        {page === "" && <div style={{ padding: "6px 10px 2px", fontSize: 11.5, color: C.dim }}>{what} 메뉴 · Esc 로 닫기</div>}
        {/* 마우스를 올린 항목 설명 — 메뉴 바로 옆에 */}
        {hover && (
          <div style={{ position: "absolute", left: W + 6, top: hover.top, width: 230, padding: "8px 10px", borderRadius: 6, background: "#111", border: `1px solid ${C.line2}`, color: "#eee", fontSize: 12.5, lineHeight: 1.5, pointerEvents: "none", boxShadow: "0 6px 18px rgba(0,0,0,0.4)" }}>
            {hover.desc}
          </div>
        )}
      </div>
    </>
  );
}

const rowStyle: React.CSSProperties = { width: "100%", display: "flex", alignItems: "center", gap: 9, height: 36, padding: "0 10px", border: 0, borderRadius: 5, background: "transparent", fontSize: 14, fontWeight: 700, fontFamily: FONT, cursor: "pointer" };
const numStyle: React.CSSProperties = { ...input, width: 52, height: 32, padding: "0 6px", textAlign: "center", fontSize: 14, fontWeight: 700 };
