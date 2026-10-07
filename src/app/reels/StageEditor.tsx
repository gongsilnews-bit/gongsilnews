"use client";

// 미리보기 화면 위에서 스티커·자막을 직접 끌어 옮기고 모서리로 크기를 바꾼다 (브루식).
// 미리보기는 같은 출처 iframe 이라 실제 요소 위치를 재고, 끄는 동안은 그 요소를 바로 움직여 보여 준다.
// 놓으면 위치·크기를 영상 좌표(1080×1920)로 저장 → 템플릿이 그대로 그려서 완성 영상도 같다.
import { useCallback, useEffect, useRef, useState } from "react";
import { SAFE_COVER, type SceneFx } from "@/lib/reels/types";
import st from "./reels.module.css";

type Box = { x: number; y: number; w: number; h: number }; // 영상 px
type Geo = { ox: number; oy: number; k: number; stk: Box | null; cap: Box | null };
type What = "stk" | "cap";
type Drag = { what: What; mode: "move" | "size"; px: number; py: number; dx: number; dy: number; ratio: number; dist: number };

const SNAP = 18; // 가운데에서 이만큼(영상 px) 안이면 가운데에 붙인다
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const hits = (b: Box) => SAFE_COVER.some((z) => b.x < z.x + z.w && b.x + b.w > z.x && b.y < z.y + z.h && b.y + b.h > z.y);

export default function StageEditor({ getPlayer, sceneId, show, tick, fx, onCommit, onCaptionToAll, onReset }: {
  onCaptionToAll: () => void;
  onReset: (what: What) => void;
  getPlayer: () => HTMLElement | null;
  sceneId: string | null;
  show: boolean;
  tick: unknown;
  fx: SceneFx | undefined;
  onCommit: (patch: Partial<SceneFx>) => void;
}) {
  const layer = useRef<HTMLDivElement>(null);
  const [geo, setGeo] = useState<Geo | null>(null);
  const [sel, setSel] = useState<What | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);

  const frame = useCallback(() => {
    const iframe = getPlayer()?.shadowRoot?.querySelector("iframe");
    const doc = iframe?.contentDocument;
    return iframe && doc ? { iframe, doc } : null;
  }, [getPlayer]);

  const target = useCallback(
    (what: What) => frame()?.doc.getElementById(`${sceneId}-${what === "stk" ? "stkbox" : "caps"}`) as HTMLElement | null,
    [frame, sceneId],
  );

  const measure = useCallback((): Geo | null => {
    const f = frame();
    const lay = layer.current;
    const root = f?.doc.getElementById("main");
    if (!f || !lay || !root || !sceneId) return null;
    const ir = f.iframe.getBoundingClientRect();
    const lr = lay.getBoundingClientRect();
    const rr = root.getBoundingClientRect();
    if (!rr.width) return null;
    const kIn = ir.width / (f.iframe.contentWindow?.innerWidth || ir.width); // 화면 px / iframe px
    const unit = rr.width / 1080; // iframe px / 영상 px
    const box = (el: HTMLElement | null): Box | null => {
      const r = el?.getBoundingClientRect();
      if (!r || !r.width) return null;
      return { x: (r.left - rr.left) / unit, y: (r.top - rr.top) / unit, w: r.width / unit, h: r.height / unit };
    };
    return { ox: ir.left - lr.left + rr.left * kIn, oy: ir.top - lr.top + rr.top * kIn, k: kIn * unit, stk: box(target("stk")), cap: box(target("cap")) };
  }, [frame, target, sceneId]);

  // 멈춰 있을 때마다(시간·클립·미리보기가 바뀔 때) 다시 잰다
  useEffect(() => {
    if (drag) return;
    const id = requestAnimationFrame(() => setGeo(show ? measure() : null));
    return () => cancelAnimationFrame(id);
  }, [show, tick, sceneId, measure, drag]);

  // 클립이 바뀌면 선택 해제
  const [lastScene, setLastScene] = useState(sceneId);
  if (lastScene !== sceneId) {
    setLastScene(sceneId);
    setSel(null);
  }

  // 끄는 중: 실제 요소를 바로 움직여 보여 준다
  const live = useCallback((d: Drag) => {
    const el = target(d.what);
    if (!el) return;
    if (d.mode === "move") {
      el.style.translate = d.what === "stk" ? `${d.dx}px ${d.dy}px` : `0 ${d.dy}px`;
    } else if (d.what === "stk") {
      // 가운데를 기준으로 키우고 줄인다 (끌어 놓은 스티커는 translate(-50%,-50%) 로 가운데 정렬돼 있음)
      const sc = (fx?.stickerScale ?? 1) * d.ratio;
      el.style.transformOrigin = "50% 50%";
      el.style.transform = fx?.stickerXY ? `translate(-50%, -50%) scale(${sc})` : `scale(${sc})`;
    } else {
      el.style.transformOrigin = "50% 0";
      el.style.scale = String(d.ratio);
    }
  }, [target, fx]);

  const start = (what: What, mode: "move" | "size") => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSel(what);
    const b = geo?.[what];
    if (!geo || !b) return;
    const cx = geo.ox + (b.x + b.w / 2) * geo.k;
    const cy = geo.oy + (what === "cap" ? b.y : b.y + b.h / 2) * geo.k;
    const lr = layer.current!.getBoundingClientRect();
    const dist = Math.max(8, Math.hypot(e.clientX - lr.left - cx, e.clientY - lr.top - cy));
    setDrag({ what, mode, px: e.clientX, py: e.clientY, dx: 0, dy: 0, ratio: 1, dist });
  };

  useEffect(() => {
    if (!drag || !geo) return;
    const b = geo[drag.what]!;
    const lr = layer.current!.getBoundingClientRect();
    const move = (e: PointerEvent) => {
      const d = { ...drag };
      if (drag.mode === "move") {
        d.dx = (e.clientX - drag.px) / geo.k;
        d.dy = (e.clientY - drag.py) / geo.k;
        if (drag.what === "stk") {
          const cx = b.x + b.w / 2 + d.dx;
          if (Math.abs(cx - 540) < SNAP) d.dx = 540 - (b.x + b.w / 2);
          d.dx = clamp(d.dx, -(b.x + b.w / 2), 1080 - (b.x + b.w / 2));
          d.dy = clamp(d.dy, -(b.y + b.h / 2), 1920 - (b.y + b.h / 2));
        } else {
          d.dy = clamp(d.dy, -b.y, 1800 - b.y);
        }
      } else {
        const cx = geo.ox + (b.x + b.w / 2) * geo.k;
        const cy = geo.oy + (drag.what === "cap" ? b.y : b.y + b.h / 2) * geo.k;
        const now = Math.hypot(e.clientX - lr.left - cx, e.clientY - lr.top - cy);
        const base = drag.what === "stk" ? fx?.stickerScale ?? 1 : fx?.captionScale ?? 1;
        const [lo, hi] = drag.what === "stk" ? [0.4, 3] : [0.6, 1.8];
        d.ratio = clamp(now / drag.dist, lo / base, hi / base);
      }
      live(d);
      setDrag(d);
    };
    const up = () => {
      const d = drag;
      setDrag(null);
      const el = target(d.what);
      if (d.dx === 0 && d.dy === 0 && d.ratio === 1) {
        if (el) el.style.translate = el.style.scale = "";
        return;
      }
      if (d.what === "stk") {
        const center: [number, number] = [Math.round(b.x + b.w / 2 + d.dx), Math.round(b.y + b.h / 2 + d.dy)];
        onCommit({ stickerXY: center, stickerScale: Math.round((fx?.stickerScale ?? 1) * d.ratio * 100) / 100, stickerPos: undefined, stickerSide: undefined });
      } else {
        onCommit({ captionY: Math.round(b.y + d.dy), captionScale: Math.round((fx?.captionScale ?? 1) * d.ratio * 100) / 100, captionPos: undefined });
      }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up, { once: true });
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [drag, geo, fx, live, target, onCommit]);

  // Esc 로 선택 해제
  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === "Escape" && setSel(null);
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);

  if (!show || !geo) return <div ref={layer} className={st.stage} />;

  // 화면에 그릴 상자 (끄는 중이면 움직인 만큼 반영)
  const shown = (what: What): Box | null => {
    const b = geo[what];
    if (!b) return null;
    if (!drag || drag.what !== what) return b;
    if (drag.mode === "move") return { ...b, x: b.x + (what === "stk" ? drag.dx : 0), y: b.y + drag.dy };
    const w = b.w * drag.ratio, h = b.h * drag.ratio;
    return what === "stk" ? { x: b.x + b.w / 2 - w / 2, y: b.y + b.h / 2 - h / 2, w, h } : { x: b.x + b.w / 2 - w / 2, y: b.y, w, h };
  };
  const px = (b: Box) => ({ left: geo.ox + b.x * geo.k, top: geo.oy + b.y * geo.k, width: b.w * geo.k, height: b.h * geo.k });
  const focus = drag?.what ?? sel;
  const focusBox = focus ? shown(focus) : null;
  const warn = focusBox && hits(focusBox);
  const snapped = drag?.what === "stk" && drag.mode === "move" && geo.stk && Math.abs(geo.stk.x + geo.stk.w / 2 + drag.dx - 540) < 0.5;

  const item = (what: What, label: string) => {
    const b = shown(what);
    if (!b) return null;
    const on = focus === what;
    return (
      <div className={`${st.stageBox} ${on ? st.stageOn : ""}`} style={px(b)} onPointerDown={start(what, "move")} title={`${label}: 끌어서 옮기기 · 모서리로 크기`}>
        <span className={st.stageTag}>{label}</span>
        {on && (["nw", "ne", "sw", "se"] as const).map((c) => <i key={c} className={`${st.handle} ${st[c]}`} onPointerDown={start(what, "size")} />)}
      </div>
    );
  };

  return (
    <div ref={layer} className={st.stage}>
      {(drag || sel) && SAFE_COVER.map((z, n) => <div key={n} className={st.cover} style={px(z)} />)}
      {snapped && <div className={st.guide} style={{ left: geo.ox + 540 * geo.k, top: geo.oy, height: 1920 * geo.k }} />}
      {item("cap", "자막")}
      {item("stk", "스티커")}
      {sel && !drag && (
        <div className={st.stageBar} onPointerDown={(e) => e.stopPropagation()}>
          <b>{sel === "cap" ? "자막" : "스티커"}</b>
          <button onClick={() => onReset(sel)}>↺ 처음 자리로</button>
          {sel === "cap" && <button onClick={onCaptionToAll}>⇆ 모든 클립에 이 위치</button>}
          <button onClick={() => setSel(null)}>✕</button>
        </div>
      )}
      {warn && <div className={st.stageWarn}>⚠ 인스타·틱톡 화면에서 버튼이나 글에 가려질 수 있어요</div>}
    </div>
  );
}
