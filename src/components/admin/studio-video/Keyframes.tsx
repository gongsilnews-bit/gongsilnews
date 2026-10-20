"use client";

// 키프레임·색 보정 칸 (2026-10-20 사장님: 캡컷처럼 키프레임 — 가장 중요한 기능) — 오른쪽 속성 칸 위에 들어간다
//  키프레임 = "그 시각의 모습" 점. 점과 점 사이는 저절로 움직인다. 60세 원칙: 끌기만이 아니라 늘 보이는 단추·막대로도
//  미리보기에서 끌어 옮기거나 크기·회전을 바꾸면 그 시각에 점이 저절로 생긴다 (점이 하나라도 있으면)
import React from "react";
import type { Adjust, Ease, Keyframe } from "./types";
import { EASES, FILTERS, adjMatrix, adjSvgValues, kfAt, kfIndexAt, kfSort, kfUpsert } from "./timeline";
import { Btn, C, FONT, Icon, label } from "./ui";

const row: React.CSSProperties = { padding: "14px 16px", borderBottom: `1px solid ${C.line}` };
const chip = (on: boolean): React.CSSProperties => ({ height: 32, padding: "0 10px", borderRadius: 5, border: `1px solid ${on ? C.accent : C.line2}`, background: on ? C.accentDim : "transparent", color: on ? C.text : C.sub, fontSize: 13, fontWeight: 700, fontFamily: FONT, cursor: "pointer", whiteSpace: "nowrap" });
const sec = (t: number) => `${t.toFixed(1)}초`;

/** 막대 하나 — 이름 · 값 · 막대 (끄는 동안은 되돌리기 한 번) */
export function Bar({ title, value, min, max, step, show, onChange, onReset }: { title: string; value: number; min: number; max: number; step: number; show: string; onChange: (v: number, first: boolean) => void; onReset?: () => void }) {
  const first = React.useRef(true);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", alignItems: "center", fontSize: 13.5 }}>
        <span style={{ flex: 1, fontWeight: 700, color: C.text }}>{title}</span>
        <span onDoubleClick={onReset} title={onReset ? "두 번 누르면 처음 값" : undefined} style={{ color: C.sub, fontVariantNumeric: "tabular-nums", cursor: onReset ? "pointer" : undefined }}>{show}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onPointerDown={() => { first.current = true; }}
        onChange={(e) => { onChange(Number(e.target.value), first.current); first.current = false; }}
        onDoubleClick={onReset}
        style={{ width: "100%", accentColor: C.accent }} />
    </div>
  );
}

/* ── 빠른 움직임 — 점 두 개를 한 번에 (어르신용: 고르기만 하면 됨) ── */
export const KF_PRESETS: { id: string; label: string; desc: string }[] = [
  { id: "zoomIn", label: "점점 커지기", desc: "처음부터 끝까지 천천히 커져요 (줌인)" },
  { id: "zoomOut", label: "점점 작아지기", desc: "크게 시작해서 원래 크기로 (줌아웃)" },
  { id: "fromLeft", label: "왼쪽에서 들어오기", desc: "화면 왼쪽 밖에서 미끄러져 들어와요" },
  { id: "fromRight", label: "오른쪽에서 들어오기", desc: "화면 오른쪽 밖에서 들어와요" },
  { id: "fromTop", label: "위에서 내려오기", desc: "위에서 아래로 들어와요" },
  { id: "fromBottom", label: "아래에서 올라오기", desc: "아래에서 위로 들어와요" },
  { id: "toLeft", label: "왼쪽으로 나가기", desc: "끝날 때 왼쪽으로 빠져나가요" },
  { id: "toRight", label: "오른쪽으로 나가기", desc: "끝날 때 오른쪽으로 빠져나가요" },
  { id: "spin", label: "돌며 나타나기", desc: "작게 한 바퀴 돌며 나타나요" },
  { id: "fadeIn", label: "서서히 나타나기", desc: "투명했다가 진해져요" },
  { id: "fadeOut", label: "서서히 사라지기", desc: "끝날 때 점점 투명해져요" },
  { id: "panLR", label: "왼→오 흐르기", desc: "처음부터 끝까지 오른쪽으로 천천히 (사진 훑기)" },
];
/** 빠른 움직임 → 점들 (base = 지금 모습, dur = 나오는 길이 초) */
export function kfPreset(id: string, base: Keyframe, dur: number): Keyframe[] {
  const b: Keyframe = { ...base, e: undefined };
  const end = Math.max(0.3, +dur.toFixed(3));
  const inT = Math.min(0.8, end * 0.5), outT = Math.max(0, end - Math.min(0.8, end * 0.5));
  switch (id) {
    case "zoomIn": return [{ ...b, t: 0, e: "linear" }, { ...b, t: end, s: b.s * 1.3 }];
    case "zoomOut": return [{ ...b, t: 0, s: b.s * 1.3, e: "linear" }, { ...b, t: end }];
    case "fromLeft": return [{ ...b, t: 0, x: b.x - 0.75, e: "out" }, { ...b, t: inT }];
    case "fromRight": return [{ ...b, t: 0, x: b.x + 0.75, e: "out" }, { ...b, t: inT }];
    case "fromTop": return [{ ...b, t: 0, y: b.y - 0.75, e: "out" }, { ...b, t: inT }];
    case "fromBottom": return [{ ...b, t: 0, y: b.y + 0.75, e: "out" }, { ...b, t: inT }];
    case "toLeft": return [{ ...b, t: outT, e: "in" }, { ...b, t: end, x: b.x - 0.75 }];
    case "toRight": return [{ ...b, t: outT, e: "in" }, { ...b, t: end, x: b.x + 0.75 }];
    case "spin": return [{ ...b, t: 0, r: b.r - 360, s: b.s * 0.2, o: 0, e: "out" }, { ...b, t: Math.min(1, end * 0.6) }];
    case "fadeIn": return [{ ...b, t: 0, o: 0, e: "linear" }, { ...b, t: inT }];
    case "fadeOut": return [{ ...b, t: outT, e: "linear" }, { ...b, t: end, o: 0 }];
    case "panLR": return [{ ...b, t: 0, x: b.x - 0.06, s: b.s * 1.15, e: "linear" }, { ...b, t: end, x: b.x + 0.06, s: b.s * 1.15 }];
    default: return [{ ...b, t: 0 }];
  }
}

/**
 * 키프레임 칸 — what: "글자"·"사진"·"스티커"·"화면" · keys: 지금 점들 · tau: 재생 막대 시각(나타난 때부터 초, 밖이면 null)
 *  dur: 나오는 길이 · base: 점이 없을 때 지금 모습 · onKeys: 점들 바꾸기(빈 배열 = 모두 지우기) · onSeek: 그 점으로 재생 막대 옮기기
 */
export function KeyframeBox({ what, keys, tau, dur, base, onKeys, onSeek, sizeName = "크기" }: {
  what: string;
  keys?: Keyframe[];
  tau: number | null;
  dur: number;
  base: Keyframe;
  onKeys: (k: Keyframe[] | undefined, first?: boolean) => void;
  onSeek: (tau: number) => void;
  sizeName?: string;
}) {
  const ks = keys?.length ? kfSort(keys) : [];
  const has = ks.length > 0;
  const at = tau === null ? -1 : kfIndexAt(ks, tau);
  const cur = (tau !== null && kfAt(ks, tau)) || base;
  const [preset, setPreset] = React.useState(false);
  const set = (patch: Partial<Keyframe>, first = true) => {
    if (tau === null) return;
    onKeys(kfUpsert(ks, tau, patch, base), first);
  };
  // 점 사이 움직이는 방식 — 재생 막대 앞(또는 그 자리) 점에서 다음 점까지
  const segI = tau === null ? -1 : (() => { let i = -1; ks.forEach((k, j) => { if (k.t <= tau + 0.5 / 30) i = j; }); return i < ks.length - 1 ? i : -1; })();
  const prev = tau === null ? null : [...ks].reverse().find((k) => k.t < tau - 0.5 / 30);
  const next = tau === null ? null : ks.find((k) => k.t > tau + 0.5 / 30);
  const off = tau === null;
  return (
    <div style={{ ...row, background: "rgba(59,130,246,0.06)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ color: C.accent, display: "flex" }}><Icon name={has ? "diamondFill" : "diamond"} size={18} /></span>
        <span style={{ ...label, flex: 1 }}>키프레임 <span style={{ color: C.sub, fontWeight: 600, fontSize: 13 }}>· 시간에 따라 움직이기</span></span>
        {has && <span style={{ fontSize: 12.5, color: C.sub }}>점 {ks.length}개</span>}
      </div>
      {off ? (
        <div style={{ fontSize: 13.5, color: C.sub, lineHeight: 1.6 }}>재생 막대를 이 {what}이(가) 나오는 곳에 두면 키프레임을 넣을 수 있어요.</div>
      ) : (
        <>
          <div style={{ display: "flex", gap: 6 }}>
            {at >= 0 ? (
              <Btn small onClick={() => onKeys(ks.filter((_, i) => i !== at).length ? ks.filter((_, i) => i !== at) : undefined)} style={{ flex: 1 }}>
                <Icon name="diamond" size={15} />이 시각 점 빼기
              </Btn>
            ) : (
              <Btn small primary onClick={() => set({})} style={{ flex: 1 }} title="지금 모습을 이 시각에 기억해요 — 다른 시각으로 가서 옮기거나 크기를 바꾸면 그 사이를 저절로 움직여요">
                <Icon name="diamondFill" size={15} />이 시각에 점 찍기
              </Btn>
            )}
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
            <Btn small onClick={() => prev && onSeek(prev.t + 0.001)} disabled={!prev} style={{ flex: 1 }} title="앞 점으로">◀ 앞 점</Btn>
            <Btn small onClick={() => next && onSeek(next.t + 0.001)} disabled={!next} style={{ flex: 1 }} title="다음 점으로">다음 점 ▶</Btn>
          </div>
          <div style={{ fontSize: 12.5, color: C.dim, marginTop: 8, lineHeight: 1.55 }}>
            {has ? `점이 있으면 미리보기에서 옮기거나 크기·회전을 바꿀 때 지금 시각(${sec(tau!)})에 점이 저절로 생겨요.` : `점을 찍은 뒤 재생 막대를 옮겨 ${what}을(를) 끌어 옮기면, 그 사이를 저절로 움직여요.`}
          </div>
        </>
      )}
      {has && (
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 10 }}>
          {ks.map((k, i) => {
            const on = i === at;
            return (
              <span key={i} style={{ display: "inline-flex", alignItems: "center", borderRadius: 5, border: `1px solid ${on ? C.accent : C.line2}`, background: on ? C.accentDim : "transparent" }}>
                <button type="button" onClick={() => onSeek(k.t + 0.001)} title="이 점으로 가기"
                  style={{ height: 28, padding: "0 6px 0 8px", border: 0, background: "transparent", color: C.text, fontSize: 12.5, fontWeight: 700, fontFamily: FONT, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <span style={{ color: C.accent, display: "flex" }}><Icon name="diamondFill" size={11} /></span>{sec(k.t)}
                </button>
                <button type="button" onClick={() => { const r = ks.filter((_, j) => j !== i); onKeys(r.length ? r : undefined); }} title="이 점 빼기"
                  style={{ width: 22, height: 28, border: 0, background: "transparent", color: C.dim, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon name="close" size={12} />
                </button>
              </span>
            );
          })}
        </div>
      )}
      {has && !off && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
          <Bar title={sizeName} value={Math.round(cur.s * 100)} min={10} max={400} step={1} show={`${Math.round(cur.s * 100)}%`} onChange={(v, f) => set({ s: v / 100 }, f)} onReset={() => set({ s: 1 })} />
          <Bar title="회전" value={Math.round(cur.r)} min={-360} max={360} step={1} show={`${Math.round(cur.r)}°`} onChange={(v, f) => set({ r: v }, f)} onReset={() => set({ r: 0 })} />
          <Bar title="진하기" value={Math.round(cur.o * 100)} min={0} max={100} step={1} show={`${Math.round(cur.o * 100)}%`} onChange={(v, f) => set({ o: v / 100 }, f)} onReset={() => set({ o: 1 })} />
          <Bar title="가로 자리" value={Math.round(cur.x * 100)} min={-60} max={160} step={1} show={`${Math.round(cur.x * 100)}%`} onChange={(v, f) => set({ x: v / 100 }, f)} onReset={() => set({ x: base.x })} />
          <Bar title="세로 자리" value={Math.round(cur.y * 100)} min={-60} max={160} step={1} show={`${Math.round(cur.y * 100)}%`} onChange={(v, f) => set({ y: v / 100 }, f)} onReset={() => set({ y: base.y })} />
        </div>
      )}
      {segI >= 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 6 }}>움직이는 방식 <span style={{ color: C.sub, fontWeight: 600 }}>· {sec(ks[segI].t)} → {sec(ks[segI + 1].t)}</span></div>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {EASES.map((e) => (
              <button key={e.id} type="button" title={e.desc} onClick={() => onKeys(ks.map((k, i) => (i === segI ? { ...k, e: e.id as Ease } : k)))} style={chip((ks[segI].e || "linear") === e.id)}>{e.label}</button>
            ))}
          </div>
        </div>
      )}
      <div style={{ marginTop: 12 }}>
        <button type="button" onClick={() => setPreset(!preset)}
          style={{ height: 32, padding: "0 4px", border: 0, background: "transparent", color: C.text, fontSize: 13.5, fontWeight: 800, fontFamily: FONT, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ display: "flex", transform: preset ? "rotate(90deg)" : undefined }}><Icon name="chevron" size={14} /></span>빠른 움직임 <span style={{ color: C.sub, fontWeight: 600 }}>· 누르면 점을 알아서 찍어요</span>
        </button>
        {preset && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5, marginTop: 4 }}>
            {KF_PRESETS.map((p) => (
              <button key={p.id} type="button" title={p.desc} onClick={() => onKeys(kfPreset(p.id, { ...base, ...(ks[0] ? { x: ks[0].x, y: ks[0].y, s: ks[0].s, r: ks[0].r % 360, o: 1 } : {}) }, dur))}
                style={{ ...chip(false), height: 34, color: C.text }}>{p.label}</button>
            ))}
          </div>
        )}
      </div>
      {has && (
        <div style={{ marginTop: 10 }}>
          <Btn small onClick={() => onKeys(undefined)} style={{ color: C.danger }}><Icon name="trash" size={14} />키프레임 모두 지우기</Btn>
        </div>
      )}
    </div>
  );
}

/**
 * 색 보정·필터 칸 (캡컷 [필터]·[조정]) — thumb: 이 클립 그림 (필터 견본에 쓴다)
 *  onAll: 모든 클립에 똑같이
 */
export function AdjustBox({ adj, thumb, onChange, onAll }: { adj?: Adjust; thumb?: string; onChange: (a: Adjust | undefined, first: boolean) => void; onAll?: () => void }) {
  const a = adj || {};
  const put = (patch: Partial<Adjust>, first = true) => {
    const n: Adjust = { ...a, ...patch };
    for (const k of Object.keys(n) as (keyof Adjust)[]) if (n[k] === undefined || n[k] === 0 || n[k] === "") delete n[k];
    if (!n.f) delete n.fi;
    onChange(Object.keys(n).length ? n : undefined, first);
  };
  const [open, setOpen] = React.useState(Boolean(adj));
  const pct = (v?: number) => Math.round((v || 0) * 100);
  return (
    <div style={row}>
      <button type="button" onClick={() => setOpen(!open)}
        style={{ width: "100%", height: 28, padding: 0, border: 0, background: "transparent", color: C.text, fontFamily: FONT, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
        <Icon name="adjust" size={17} />
        <span style={{ ...label, flex: 1, textAlign: "left" }}>필터 · 색 보정 <span style={{ color: C.sub, fontWeight: 600, fontSize: 13 }}>{adjMatrix(adj) ? "· 바꿈" : "· 밝기·색감"}</span></span>
        <span style={{ display: "flex", transform: open ? "rotate(90deg)" : undefined, color: C.sub }}><Icon name="chevron" size={14} /></span>
      </button>
      {open && (
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 12 }}>
          {/* 필터 견본 — 이 클립 그림에 필터를 씌워서 */}
          <svg width="0" height="0" aria-hidden style={{ position: "absolute" }}>
            <defs>
              {FILTERS.map((f) => (
                <filter key={f.id} id={`gsflt-${f.id}`} colorInterpolationFilters="sRGB"><feColorMatrix type="matrix" values={adjSvgValues(f.m)} /></filter>
              ))}
            </defs>
          </svg>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
            {[{ id: "", label: "원본", desc: "필터 없음" }, ...FILTERS].map((f) => {
              const on = (a.f || "") === f.id;
              return (
                <button key={f.id || "none"} type="button" title={f.desc} onClick={() => put({ f: f.id || undefined, fi: f.id ? a.fi ?? 1 : undefined })}
                  style={{ padding: 0, border: `2px solid ${on ? C.accent : "transparent"}`, borderRadius: 6, background: "transparent", cursor: "pointer", fontFamily: FONT, color: on ? C.text : C.sub }}>
                  <div style={{ width: "100%", aspectRatio: "4 / 3", borderRadius: 4, overflow: "hidden", background: "#333" }}>
                    {thumb && <img src={thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", filter: f.id ? `url(#gsflt-${f.id})` : undefined }} />}
                  </div>
                  <div style={{ fontSize: 11.5, fontWeight: 700, padding: "3px 0 2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.label}</div>
                </button>
              );
            })}
          </div>
          {a.f && <Bar title="필터 세기" value={pct(a.fi ?? 1)} min={0} max={100} step={1} show={`${pct(a.fi ?? 1)}%`} onChange={(v, f) => put({ fi: v / 100 }, f)} onReset={() => put({ fi: 1 })} />}
          <Bar title="밝기" value={pct(a.b)} min={-100} max={100} step={1} show={`${pct(a.b) > 0 ? "+" : ""}${pct(a.b)}`} onChange={(v, f) => put({ b: v / 100 }, f)} onReset={() => put({ b: 0 })} />
          <Bar title="대비" value={pct(a.c)} min={-100} max={100} step={1} show={`${pct(a.c) > 0 ? "+" : ""}${pct(a.c)}`} onChange={(v, f) => put({ c: v / 100 }, f)} onReset={() => put({ c: 0 })} />
          <Bar title="채도 (색 진하기)" value={pct(a.s)} min={-100} max={100} step={1} show={`${pct(a.s) > 0 ? "+" : ""}${pct(a.s)}`} onChange={(v, f) => put({ s: v / 100 }, f)} onReset={() => put({ s: 0 })} />
          <Bar title="색온도 (차갑게 ↔ 따뜻하게)" value={pct(a.t)} min={-100} max={100} step={1} show={`${pct(a.t) > 0 ? "+" : ""}${pct(a.t)}`} onChange={(v, f) => put({ t: v / 100 }, f)} onReset={() => put({ t: 0 })} />
          <Bar title="색조 (초록 ↔ 분홍)" value={pct(a.g)} min={-100} max={100} step={1} show={`${pct(a.g) > 0 ? "+" : ""}${pct(a.g)}`} onChange={(v, f) => put({ g: v / 100 }, f)} onReset={() => put({ g: 0 })} />
          <div style={{ display: "flex", gap: 6 }}>
            <Btn small onClick={() => onChange(undefined, true)} disabled={!adj}>처음대로</Btn>
            {onAll && <Btn small onClick={onAll} disabled={!adj} title="이 필터·색 보정을 모든 클립 화면에 똑같이 넣어요">모든 클립에 똑같이</Btn>}
          </div>
          <div style={{ fontSize: 12.5, color: C.dim }}>막대 숫자를 두 번 누르면 처음 값으로 돌아가요.</div>
        </div>
      )}
    </div>
  );
}
