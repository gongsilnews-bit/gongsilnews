"use client";

// 화면전환 속성 — 클립 사이 칩을 누르면 오른쪽에.
//  2026-10-20 사장님: 탭 [내 설정 · 기본 · 고급] (고급 = 유료로 할 자리, 권한은 아직) · 고르면 맨 위에 속성(길이·효과음·★·저장), × 로 닫으면 보던 목록 그대로
//  목록 그림은 멈춰 있고 마우스를 올리면 움직인다 (Premiere Composer 처럼). 위 큰 미리보기는 앞·뒤 클립 그림으로 계속
import React from "react";
import { Side } from "./Panels";
import { Btn, C, FONT, Hint, Icon, label } from "./ui";
import { TRANSITIONS, TRANS_MAX, TRANS_MIN, transStyle, type TransType } from "./transitions";
import { TransFx } from "./TransFx";

type T = { type: string; a: number; b: number; sfx?: string };
type Tab = "my" | "basic" | "adv";
type MyTrans = { id: string; type: string; total: number; sfx?: string };
const FAV_KEY = "studio.transFav.v1", MY_KEY = "studio.transMy.v1", TAB_KEY = "studio.transTab.v1";
const load = <X,>(k: string, d: X): X => { try { const v = JSON.parse(localStorage.getItem(k) || "null"); return v ?? d; } catch { return d; } };
const save = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const ADV_GROUPS = ["움직임", "흐림", "빛·필름", "디지털", "모양"];
const infoOf = (t: string) => TRANSITIONS.find((x) => x.id === t);
/** 효과음을 켰을 때 쓸 소리 — 고급은 효과에 맞게, 기본은 쉭 */
const sfxFor = (t: string) => infoOf(t)?.sfx || "whoosh-short";

/** 효과 미리보기 — 1(앞 화면) → 2(뒤 화면). 크기를 재서 고급 효과(가리개·빛)도 같은 모양으로 */
function Mini({ type, p, a, b }: { type: TransType; p: number; a?: string; b?: string }) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [sz, setSz] = React.useState({ w: 160, h: 90 });
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSz({ w: el.clientWidth || 160, h: el.clientHeight || 90 }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const fid = "gstm" + React.useId().replace(/[^a-zA-Z0-9]/g, "");
  const s = transStyle(type, p, { w: sz.w, h: sz.h, fid });
  const face = (txt: string, bg: string, img: string | undefined, st: React.CSSProperties, z: number) => (
    <div style={{ position: "absolute", inset: 0, background: bg, color: "#fff", fontSize: 15, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", zIndex: z, ...st }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {img ? <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : txt}
    </div>
  );
  return (
    <div ref={ref} style={{ position: "relative", width: "100%", aspectRatio: "16 / 9", borderRadius: 4, overflow: "hidden", background: "#000", isolation: "isolate" }}>
      {face("1", "#475569", a, s.from, s.toOnTop ? 1 : 2)}
      {face("2", "#2563eb", b, s.to, s.toOnTop ? 2 : 1)}
      {(s.veils || (s.veil ? [s.veil] : [])).map((v, i) => <div key={i} style={{ position: "absolute", inset: 0, zIndex: 3, ...v }} />)}
      <TransFx fid={fid} fx={s.fx} />
    </div>
  );
}

/** 0→1 반복 (1.6초 동안 넘어가고 잠깐 쉼) */
function useLoop(on: boolean) {
  const [p, setP] = React.useState(0.45);
  React.useEffect(() => {
    if (!on) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const x = ((now - t0) / 1000) % 2.4;
      setP(x < 0.4 ? 0 : x > 2 ? 1 : (x - 0.4) / 1.6);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [on]);
  return on ? p : 0.45;
}

export function TransPanel({ trans, from, to, maxA, maxB, onChange, onRemove, onAll, onPreview, onClose, fromThumb, toThumb }: {
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
  /** 앞·뒤 클립 그림 (미리보기를 실제 화면으로) */
  fromThumb?: string;
  toThumb?: string;
}) {
  const cur = infoOf(trans.type);
  const [tab, setTabRaw] = React.useState<Tab>(() => load<Tab>(TAB_KEY, cur?.tier === "adv" ? "adv" : "basic"));
  const setTab = (t: Tab) => { setTabRaw(t); save(TAB_KEY, t); };
  const [grp, setGrp] = React.useState("");
  const [fav, setFav] = React.useState<string[]>(() => load<string[]>(FAV_KEY, []));
  const [my, setMy] = React.useState<MyTrans[]>(() => load<MyTrans[]>(MY_KEY, []));
  const [open, setOpen] = React.useState(true); // 위 속성 칸
  const [more, setMore] = React.useState(false); // 앞뒤 나누기
  const [hover, setHover] = React.useState("");
  const [note, setNote] = React.useState("");
  const big = useLoop(open);
  const hp = useLoop(Boolean(hover));

  const total = +(Number(trans.a) + Number(trans.b)).toFixed(2);
  const ratio = total > 0 ? Number(trans.a) / total : 0.5; // 앞 클립 쪽 비율
  const first = React.useRef(true);
  const setTotal = (v: number) => onChange({ a: +(v * ratio).toFixed(2), b: +(v * (1 - ratio)).toFixed(2) }, first.current);
  const setRatio = (r: number) => onChange({ a: +(total * r).toFixed(2), b: +(total * (1 - r)).toFixed(2) }, first.current);
  const realA = Math.min(Number(trans.a), maxA), realB = Math.min(Number(trans.b), maxB);
  const clipped = realA < Number(trans.a) - 0.01 || realB < Number(trans.b) - 0.01;

  const pick = (id: string) => {
    onChange({ type: id, ...(trans.sfx ? { sfx: sfxFor(id) } : {}) }, true);
    setOpen(true);
  };
  const toggleFav = (id: string) => { const n = fav.includes(id) ? fav.filter((x) => x !== id) : [id, ...fav]; setFav(n); save(FAV_KEY, n); };
  const saveMy = () => {
    const n = [{ id: String(Date.now()), type: trans.type, total, sfx: trans.sfx }, ...my].slice(0, 60);
    setMy(n); save(MY_KEY, n);
    setNote("내 설정에 저장했어요"); setTimeout(() => setNote(""), 1600);
  };
  const delMy = (id: string) => { const n = my.filter((x) => x.id !== id); setMy(n); save(MY_KEY, n); };
  const applyMy = (m: MyTrans) => { onChange({ type: m.type, a: +(m.total * ratio).toFixed(2), b: +(m.total * (1 - ratio)).toFixed(2), sfx: m.sfx }, true); setOpen(true); };

  const chip = (on: boolean): React.CSSProperties => ({ height: 28, padding: "0 11px", borderRadius: 14, border: `1px solid ${on ? C.accent : C.line2}`, background: on ? C.accentDim : "transparent", color: on ? C.text : C.sub, fontSize: 12.5, fontWeight: 700, fontFamily: FONT, cursor: "pointer", whiteSpace: "nowrap" });
  const card = (id: string, name: string, onClick: () => void, extra?: React.ReactNode, key = id) => {
    const on = trans.type === id;
    return (
      <div key={key} style={{ position: "relative" }} onMouseEnter={() => setHover(key)} onMouseLeave={() => setHover((h) => (h === key ? "" : h))}>
        <button type="button" onClick={onClick}
          style={{ width: "100%", padding: 5, borderRadius: 6, border: `1.5px solid ${on ? C.accent : C.line2}`, background: on ? C.accentDim : "transparent", color: on ? C.text : C.sub, fontSize: 12, fontWeight: 700, fontFamily: FONT, cursor: "pointer", display: "flex", flexDirection: "column", gap: 5, textAlign: "left" }}>
          <Mini type={id as TransType} p={hover === key ? hp : 0.45} a={fromThumb} b={toThumb} />
          <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</span>
        </button>
        <button type="button" title={fav.includes(id) ? "즐겨찾기 빼기" : "즐겨찾기 (내 설정에 모여요)"} onClick={() => toggleFav(id)}
          style={{ position: "absolute", top: 8, right: 8, width: 22, height: 22, borderRadius: 11, border: 0, background: "rgba(0,0,0,0.55)", color: fav.includes(id) ? "#FACC15" : "#fff", fontSize: 13, lineHeight: "22px", padding: 0, cursor: "pointer", opacity: fav.includes(id) || hover === key ? 1 : 0 }}>★</button>
        {extra}
      </div>
    );
  };
  const grid = (els: React.ReactNode[]) => <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>{els}</div>;
  const list = TRANSITIONS.filter((x) => (tab === "basic" ? x.tier === "basic" : x.tier === "adv" && (!grp || x.group === grp)));

  return (
    <Side title={`화면전환 · 클립 ${from} → ${to}`} onClose={onClose}
      footer={<><Btn small onClick={onPreview}><Icon name="play" size={15} />이 부분 보기</Btn><Btn small onClick={onAll}><Icon name="copy" size={15} />모든 클립 사이에 똑같이</Btn><span style={{ flex: 1 }} /><Btn small onClick={onRemove} style={{ color: C.danger }}><Icon name="trash" size={15} />빼기</Btn></>}>
      {/* 큰 탭 — 텍스트·그래픽 칸과 같은 모양 */}
      <div style={{ display: "flex", borderBottom: `1px solid ${C.line}` }}>
        {([["my", "내 설정"], ["basic", "기본"], ["adv", "고급"]] as const).map(([k, l]) => (
          <button key={k} type="button" onClick={() => setTab(k)}
            style={{ flex: 1, height: 42, border: 0, borderBottom: `2px solid ${tab === k ? C.accent : "transparent"}`, background: "transparent", color: tab === k ? C.text : C.sub, fontSize: 14, fontWeight: 800, fontFamily: FONT, cursor: "pointer" }}>
            {l}{k === "my" && fav.length + my.length ? ` ${fav.length + my.length}` : ""}
          </button>
        ))}
      </div>
      <div style={{ padding: "0 16px 16px" }}>
        {/* 고른 전환 — 맨 위에 붙어서 (스크롤해도), × 로 닫으면 목록 그대로 */}
        {open ? (
          <div style={{ position: "sticky", top: 0, zIndex: 3, background: C.panel, margin: "0 -16px 12px", padding: "12px 16px 14px", borderBottom: `1px solid ${C.line}`, boxShadow: "0 8px 16px rgba(0,0,0,0.35)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 800 }}>{cur?.label || "화면전환"}</span>
              {cur?.tier === "adv" && <span style={{ fontSize: 11, fontWeight: 800, color: "#FACC15", border: "1px solid #FACC15", borderRadius: 4, padding: "1px 5px" }}>고급</span>}
              <button type="button" onClick={() => toggleFav(trans.type)} title="즐겨찾기" style={{ border: 0, background: "transparent", color: fav.includes(trans.type) ? "#FACC15" : C.dim, fontSize: 16, cursor: "pointer", padding: 0 }}>★</button>
              <button type="button" title="닫기 — 보던 목록 그대로" onClick={() => setOpen(false)} style={{ marginLeft: "auto", width: 26, height: 26, border: 0, borderRadius: 4, background: "transparent", color: C.sub, fontSize: 18, lineHeight: "26px", padding: 0, cursor: "pointer" }}>×</button>
            </div>
            <Mini type={trans.type as TransType} p={big} a={fromThumb} b={toThumb} />
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10 }}>
              <span style={{ fontSize: 12.5, color: C.sub, width: 40 }}>길이</span>
              {[0.3, 0.6, 1, 1.5].map((v) => (
                <button key={v} type="button" onClick={() => onChange({ a: +(v * ratio).toFixed(2), b: +(v * (1 - ratio)).toFixed(2) }, true)}
                  style={{ flex: 1, height: 28, borderRadius: 5, border: `1px solid ${Math.abs(total - v) < 0.01 ? C.accent : C.line2}`, background: Math.abs(total - v) < 0.01 ? C.accentDim : "transparent", color: C.text, fontSize: 12.5, fontWeight: 700, fontFamily: FONT, cursor: "pointer" }}>{v}초</button>
              ))}
            </div>
            <input type="range" min={TRANS_MIN} max={TRANS_MAX} step={0.1} value={Math.max(TRANS_MIN, total)} onPointerDown={() => (first.current = true)}
              onChange={(e) => { setTotal(Number(e.target.value)); first.current = false; }} style={{ width: "100%", accentColor: C.accent, marginTop: 6 }} />
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
              <button type="button" onClick={() => onChange({ sfx: trans.sfx ? undefined : sfxFor(trans.type) }, true)} style={chip(Boolean(trans.sfx))}>{trans.sfx ? "✓ " : ""}효과음 같이</button>
              <button type="button" onClick={() => setMore(!more)} style={chip(more)}>앞뒤 나누기 {total.toFixed(1)}초</button>
              <span style={{ flex: 1 }} />
              <button type="button" onClick={saveMy} style={chip(false)}>내 설정에 저장</button>
            </div>
            {more && (
              <div style={{ marginTop: 10 }}>
                <input type="range" min={0} max={1} step={0.05} value={ratio} onPointerDown={() => (first.current = true)}
                  onChange={(e) => { setRatio(Number(e.target.value)); first.current = false; }} style={{ width: "100%", accentColor: C.accent }} />
                <div style={{ display: "flex", fontSize: 12.5, color: C.sub, marginTop: 2 }}>
                  <span style={{ flex: 1 }}>앞 클립 끝 <b style={{ color: C.text }}>{Number(trans.a).toFixed(1)}초</b></span>
                  <button type="button" onClick={() => setRatio(0.5)} style={{ border: 0, background: "transparent", color: C.dim, fontSize: 12, fontFamily: FONT, cursor: "pointer", textDecoration: "underline" }}>반반</button>
                  <span style={{ flex: 1, textAlign: "right" }}>뒤 클립 시작 <b style={{ color: C.text }}>{Number(trans.b).toFixed(1)}초</b></span>
                </div>
              </div>
            )}
            {clipped && <div style={{ fontSize: 12, color: "#facc15", marginTop: 6 }}>클립이 짧아서 실제로는 앞 {realA.toFixed(1)}초 · 뒤 {realB.toFixed(1)}초만 들어가요.</div>}
            {note && <div style={{ fontSize: 12.5, color: C.accent, marginTop: 6 }}>{note}</div>}
          </div>
        ) : <div style={{ height: 12 }} />}

        {tab === "my" ? (
          fav.length + my.length ? (
            <>
              {my.length > 0 && (
                <>
                  <div style={{ ...label, margin: "4px 0 8px" }}>저장한 전환 <span style={{ fontSize: 12, color: C.dim, fontWeight: 600 }}>· 길이·효과음까지</span></div>
                  {grid(my.map((m) => card(m.type, `${infoOf(m.type)?.label || m.type} · ${m.total}초${m.sfx ? " ♪" : ""}`, () => applyMy(m),
                    <button type="button" title="지우기" onClick={() => delMy(m.id)} style={{ position: "absolute", top: 8, left: 8, width: 22, height: 22, borderRadius: 11, border: 0, background: "rgba(0,0,0,0.55)", color: "#fff", fontSize: 13, lineHeight: "22px", padding: 0, cursor: "pointer" }}>×</button>, "my" + m.id)))}
                </>
              )}
              {fav.length > 0 && (
                <>
                  <div style={{ ...label, margin: "14px 0 8px" }}>즐겨찾기 ★</div>
                  {grid(fav.filter((id) => infoOf(id)).map((id) => card(id, infoOf(id)!.label, () => pick(id), undefined, "fav" + id)))}
                </>
              )}
            </>
          ) : (
            <div style={{ fontSize: 13.5, color: C.sub, lineHeight: 1.7, padding: "8px 0" }}>아직 없어요. 전환 그림의 ★ 를 누르거나, 길이·효과음을 맞춘 뒤 [내 설정에 저장]을 누르면 여기에 모여요.</div>
          )
        ) : (
          <>
            {tab === "adv" && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                {["", ...ADV_GROUPS].map((g) => <button key={g || "all"} type="button" onClick={() => setGrp(g)} style={chip(grp === g)}>{g || "전체"}</button>)}
              </div>
            )}
            {grid(list.map((x) => card(x.id, x.label, () => pick(x.id))))}
            <div style={{ marginTop: 12 }}>
              <Hint>{tab === "adv" ? "마우스를 올리면 움직여요. 고급 전환은 내보낼 때 칸마다 그려서 조금 더 걸려요." : "영상 길이·소리·자막은 그대로예요. 전환하는 동안 상대 클립은 첫 장면(마지막 장면)이 멈춘 채로 섞여요."}</Hint>
            </div>
          </>
        )}
      </div>
    </Side>
  );
}
