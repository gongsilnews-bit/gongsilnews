"use client";

// 화면전환 속성 — 클립 사이 칩을 누르면 오른쪽에. 효과 고르기(움직이는 작은 미리보기) · 길이 · 앞뒤 나누기 · 모든 클립 사이에
import React from "react";
import { Side } from "./Panels";
import { Btn, C, FONT, Hint, Icon, label } from "./ui";
import { TRANSITIONS, TRANS_MAX, TRANS_MIN, transStyle, type TransType } from "./transitions";

type T = { type: string; a: number; b: number };

/** 효과 미리보기 그림 — 1(앞 화면) → 2(뒤 화면) */
function Mini({ type, p }: { type: TransType; p: number }) {
  const s = transStyle(type, p);
  const face = (txt: string, bg: string, st: React.CSSProperties, z: number) => (
    <div style={{ position: "absolute", inset: 0, background: bg, color: "#fff", fontSize: 15, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", zIndex: z, ...st }}>{txt}</div>
  );
  return (
    <div style={{ position: "relative", width: "100%", aspectRatio: "16 / 9", borderRadius: 4, overflow: "hidden", background: "#000" }}>
      {face("1", "#475569", s.from, 1)}
      {face("2", "#2563eb", s.to, 2)}
      {s.veil && <div style={{ position: "absolute", inset: 0, zIndex: 3, ...s.veil }} />}
    </div>
  );
}

export function TransPanel({ trans, from, to, maxA, maxB, onChange, onRemove, onAll, onPreview, onClose }: {
  trans: T;
  from: number; // 앞 클립 번호
  to: number; // 뒤 클립 번호
  maxA: number; // 앞 클립 길이의 45% (그보다 길게는 안 들어간다)
  maxB: number;
  onChange: (patch: Partial<T>, first: boolean) => void;
  onRemove: () => void;
  onAll: () => void;
  onPreview: () => void;
  onClose: () => void;
}) {
  // 작은 미리보기 — 1.6초 동안 0→1, 잠깐 쉬고 다시
  const [p, setP] = React.useState(0);
  React.useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const x = ((now - t0) / 1000) % 2.4;
      setP(x < 0.4 ? 0 : x > 2 ? 1 : (x - 0.4) / 1.6);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  const total = +(Number(trans.a) + Number(trans.b)).toFixed(2);
  const ratio = total > 0 ? Number(trans.a) / total : 0.5; // 앞 클립 쪽 비율
  const first = React.useRef(true);
  const setTotal = (v: number) => onChange({ a: +(v * ratio).toFixed(2), b: +(v * (1 - ratio)).toFixed(2) }, first.current);
  const setRatio = (r: number) => onChange({ a: +(total * r).toFixed(2), b: +(total * (1 - r)).toFixed(2) }, first.current);
  const realA = Math.min(Number(trans.a), maxA), realB = Math.min(Number(trans.b), maxB);
  const clipped = realA < Number(trans.a) - 0.01 || realB < Number(trans.b) - 0.01;
  const groups = [...new Set(TRANSITIONS.map((x) => x.group))];
  const row: React.CSSProperties = { padding: "14px 16px", borderBottom: `1px solid ${C.line}` };
  return (
    <Side title={`화면전환 · 클립 ${from} → ${to}`} onClose={onClose}
      footer={<><Btn small onClick={onPreview}><Icon name="play" size={15} />이 부분 보기</Btn><Btn small onClick={onAll}><Icon name="copy" size={15} />모든 클립 사이에 똑같이</Btn><span style={{ flex: 1 }} /><Btn small onClick={onRemove} style={{ color: C.danger }}><Icon name="trash" size={15} />빼기</Btn></>}>
      <div style={row}>
        <div style={{ ...label, marginBottom: 8 }}>효과</div>
        {groups.map((g) => (
          <div key={g} style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 12.5, color: C.dim, marginBottom: 6 }}>{g}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
              {TRANSITIONS.filter((x) => x.group === g).map((x) => {
                const on = trans.type === x.id;
                return (
                  <button key={x.id} type="button" onClick={() => onChange({ type: x.id }, true)}
                    style={{ padding: 5, borderRadius: 6, border: `1.5px solid ${on ? C.accent : C.line2}`, background: on ? C.accentDim : "transparent", color: on ? C.text : C.sub, fontSize: 12.5, fontWeight: 700, fontFamily: FONT, cursor: "pointer", display: "flex", flexDirection: "column", gap: 5 }}>
                    <Mini type={x.id} p={p} />
                    {x.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div style={row}>
        <div style={{ ...label, display: "flex", marginBottom: 6 }}>
          <span style={{ flex: 1 }}>길이</span>
          <span style={{ color: C.sub }}>{total.toFixed(1)}초</span>
        </div>
        <input type="range" min={TRANS_MIN} max={TRANS_MAX} step={0.1} value={Math.max(TRANS_MIN, total)} onPointerDown={() => (first.current = true)}
          onChange={(e) => { setTotal(Number(e.target.value)); first.current = false; }} style={{ width: "100%", accentColor: C.accent }} />
        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
          {[0.3, 0.6, 1, 1.5].map((v) => (
            <button key={v} type="button" onClick={() => onChange({ a: +(v * ratio).toFixed(2), b: +(v * (1 - ratio)).toFixed(2) }, true)}
              style={{ flex: 1, height: 28, borderRadius: 5, border: `1px solid ${Math.abs(total - v) < 0.01 ? C.accent : C.line2}`, background: Math.abs(total - v) < 0.01 ? C.accentDim : "transparent", color: C.text, fontSize: 12.5, fontWeight: 700, fontFamily: FONT, cursor: "pointer" }}>{v}초</button>
          ))}
        </div>
      </div>
      <div style={row}>
        <div style={{ ...label, marginBottom: 6 }}>앞뒤 나누기</div>
        <input type="range" min={0} max={1} step={0.05} value={ratio} onPointerDown={() => (first.current = true)}
          onChange={(e) => { setRatio(Number(e.target.value)); first.current = false; }} style={{ width: "100%", accentColor: C.accent }} />
        <div style={{ display: "flex", fontSize: 13, color: C.sub, marginTop: 4 }}>
          <span style={{ flex: 1 }}>앞 클립 끝 <b style={{ color: C.text }}>{Number(trans.a).toFixed(1)}초</b></span>
          <button type="button" onClick={() => setRatio(0.5)} style={{ border: 0, background: "transparent", color: C.dim, fontSize: 12, fontFamily: FONT, cursor: "pointer", textDecoration: "underline" }}>반반</button>
          <span style={{ flex: 1, textAlign: "right" }}>뒤 클립 시작 <b style={{ color: C.text }}>{Number(trans.b).toFixed(1)}초</b></span>
        </div>
        {clipped && <div style={{ fontSize: 12.5, color: "#facc15", marginTop: 8 }}>클립이 짧아서 실제로는 앞 {realA.toFixed(1)}초 · 뒤 {realB.toFixed(1)}초만 들어가요 (클립 길이의 절반 안쪽).</div>}
      </div>
      <div style={{ padding: "12px 16px" }}>
        <Hint>영상 길이·소리·자막은 그대로예요. 전환하는 동안 상대 클립은 첫 장면(마지막 장면)이 멈춘 채로 섞여요.</Hint>
      </div>
    </Side>
  );
}
