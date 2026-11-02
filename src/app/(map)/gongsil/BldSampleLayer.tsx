"use client";
// 건물 실거래 디자인 견본 (2026-11-02 사장님: "딱 1개씩만 먼저 지도 위에") — 내 PC(localhost)에서만 보인다.
//  값은 국토부 상업업무용 매매 · 건축물대장 실제 자료 (bldSample.json). 디자인이 정해지면 실제 기능으로 바꾸고 이 파일은 지운다.
import { useEffect, useRef, useState } from "react";
import sample from "./bldSample.json";
import { MiniMap, Roadview } from "./AptDetailPanel";

const C = "#334155"; // 건물 — 진한 회청색 (아파트 파랑·오피스텔 녹색과 구분)
const PY = 3.3058;
const eok = (man: number) => { const e = Math.floor(man / 10000), r = man % 10000; return e ? `${e}억${r ? ` ${r.toLocaleString()}` : ""}` : `${man.toLocaleString()}만`; };
const short = (man: number) => (man >= 10000 ? `${+(man / 10000).toFixed(man >= 1000000 ? 0 : 1)}억` : `${man.toLocaleString()}만`);
const py = (m2: number) => (m2 / PY).toFixed(1);
const perPy = (man: number, m2: number) => `${(man / (m2 / PY) / 10000).toFixed(2)}억`;

/** 공시지가 연도별 선 그래프 */
function PriceLine({ pts }: { pts: { y: number; p: number }[] }) {
  if (pts.length < 2) return null;
  const W = 370, H = 120, pad = 6;
  const lo = Math.min(...pts.map((x) => x.p)), hi = Math.max(...pts.map((x) => x.p));
  const x = (y: number) => pad + ((y - pts[0].y) / (pts[pts.length - 1].y - pts[0].y || 1)) * (W - pad * 2);
  const yy = (p: number) => H - 18 - ((p - lo) / (hi - lo || 1)) * (H - 30);
  const line = pts.map((q) => `${x(q.y).toFixed(1)},${yy(q.p).toFixed(1)}`).join(" ");
  const ticks = pts.filter((q, i) => i === 0 || i === pts.length - 1 || q.y % 10 === 0);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", display: "block" }}>
      <polygon points={`${x(pts[0].y)},${H - 18} ${line} ${x(pts[pts.length - 1].y)},${H - 18}`} fill={C} opacity=".08" />
      <polyline points={line} fill="none" stroke={C} strokeWidth="2" strokeLinejoin="round" />
      {ticks.map((q) => <text key={q.y} x={x(q.y)} y={H - 4} fontSize="10" fill="#94a3b8" textAnchor="middle">{`'${String(q.y).slice(2)}`}</text>)}
      <circle cx={x(pts[pts.length - 1].y)} cy={yy(pts[pts.length - 1].p)} r="3.5" fill={C} />
    </svg>
  );
}

export default function BldSampleLayer({ kakaoMapRef, mapLoaded }: { kakaoMapRef: React.MutableRefObject<any>; mapLoaded: boolean }) {
  const [local, setLocal] = useState(false);
  const [open, setOpen] = useState<"" | "building" | "dong">("");
  const [tab, setTab] = useState<"deal" | "land" | "bld" | "store">("deal");
  const overlays = useRef<any[]>([]);
  useEffect(() => { setLocal(window.location.hostname === "localhost"); }, []);

  useEffect(() => {
    if (!local || !mapLoaded) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const attach = () => {
      const map = kakaoMapRef.current, kakao = (window as any).kakao;
      if (!map || !kakao?.maps) { timer = setTimeout(attach, 300); return; }
      const b = sample.building, d = sample.dong;
      const el = document.createElement("div");
      el.style.cssText = "cursor:pointer;text-align:center;filter:drop-shadow(0 2px 3px rgba(0,0,0,.25))";
      el.innerHTML = `<div style="background:${C};color:#fff;border-radius:9px;padding:4px 9px 5px;line-height:1.15;white-space:nowrap"><div style="font-size:11px;opacity:.85">대지 ${Math.round(b.plat / PY)}평</div><div style="font-size:15px;font-weight:800">${short(b.price)}</div></div><div style="width:0;height:0;margin:-1px auto 0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:7px solid ${C}"></div>`;
      el.addEventListener("click", (e) => { e.stopPropagation(); setTab("deal"); setOpen("building"); });
      const dl = document.createElement("div");
      dl.style.cssText = `cursor:pointer;width:118px;height:118px;border-radius:50%;background:rgba(51,65,85,.88);color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;box-shadow:0 3px 10px rgba(0,0,0,.2);font-family:inherit`;
      dl.innerHTML = `<b style="font-size:15px">${d.name}</b><span style="font-size:12px;opacity:.9;margin-top:2px">건물 거래 ${d.count}건</span><span style="font-size:12px;opacity:.9">대지 평당 ${(d.landPerPy / 10000).toFixed(2)}억</span>`;
      dl.addEventListener("click", (e) => { e.stopPropagation(); setOpen("dong"); });
      overlays.current = [
        new kakao.maps.CustomOverlay({ position: new kakao.maps.LatLng(b.lat, b.lng), content: el, yAnchor: 1, zIndex: 6, clickable: true }),
        new kakao.maps.CustomOverlay({ position: new kakao.maps.LatLng(d.lat, d.lng), content: dl, yAnchor: 0.5, zIndex: 0, clickable: true }),
      ];
      overlays.current.forEach((o) => o.setMap(map));
    };
    attach();
    return () => { if (timer) clearTimeout(timer); overlays.current.forEach((o) => o.setMap(null)); overlays.current = []; };
  }, [local, mapLoaded, kakaoMapRef]);

  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && setOpen("");
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open]);

  // 단지 창처럼 왼쪽 목록 자리에 (2026-11-02 사장님) — 지도는 어둡게 하지 않는다
  const aside = typeof document !== "undefined" ? (document.querySelector("aside[data-gongsil-side]") as HTMLElement | null) : null;
  const r = aside?.getBoundingClientRect();
  if (!local || !open) return null;
  const b = sample.building, L = b.ledger, d = sample.dong;
  const row = (k: string, v: React.ReactNode) => (<><div style={{ color: "#777" }}>{k}</div><div>{v}</div></>);
  const grid: React.CSSProperties = { display: "grid", gridTemplateColumns: "100px 1fr", rowGap: 8, fontSize: 14 };
  const sec: React.CSSProperties = { padding: "15px 20px", borderTop: "1px solid #eef0f3" };
  const h4: React.CSSProperties = { fontSize: 15, fontWeight: 800, marginBottom: 10 };
  const note: React.CSSProperties = { fontSize: 12, color: "#999", padding: "10px 20px 14px" };
  const Ld = b.land;
  const uses = [...new Map(Ld.uses.map((u) => [u.name, u])).values()];
  const prices = [...new Map(Ld.prices.map((x) => [x.y, x])).values()]; // 같은 해 두 번(1월·7월)이면 뒤의 것
  const lastPrice = prices[prices.length - 1];
  const head = (title: React.ReactNode, sub: string) => (
    <div style={{ background: C, color: "#fff", padding: "16px 20px", display: "flex", alignItems: "flex-start", gap: 10 }}>
      <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 20, fontWeight: 800, display: "flex", alignItems: "center", gap: 8 }}>{title}</div><div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>{sub}</div></div>
      <button onClick={() => setOpen("")} style={{ border: 0, background: "transparent", color: "#fff", fontSize: 26, lineHeight: 1, cursor: "pointer" }}>×</button>
    </div>
  );
  return (
    <div style={r ? { position: "fixed", left: r.left, top: r.top, height: r.height, width: 420, zIndex: 1003 } : { position: "fixed", left: 0, top: 120, bottom: 0, width: 420, zIndex: 1003 }}>
      <div style={{ width: "100%", height: "100%", overflowY: "auto", background: "#fff", boxShadow: "4px 0 16px rgba(0,0,0,.14)", color: "#111" }}>
        {open === "building" ? (
          <>
            {head(<>{b.name || "건물"} <span style={{ fontSize: 11, fontWeight: 700, border: "1px solid rgba(255,255,255,.6)", borderRadius: 4, padding: "1px 6px" }}>추정</span></>, `${b.addr} · ${b.road}`)}
            {/* 로드뷰부터 (2026-11-02 사장님) — 단지 창과 같은 로드뷰 */}
            <Roadview lat={b.lat} lng={b.lng} />
            {/* 탭 — 디스코처럼 (2026-11-02 사장님) */}
            <div style={{ display: "flex", position: "sticky", top: 0, zIndex: 2, background: "#fff", borderBottom: "1px solid #e5e7eb" }}>
              {([["deal", "실거래가"], ["land", "토지"], ["bld", "건물"], ["store", `입점 상가 ${b.stores.length}`]] as const).map(([k, l]) => (
                <button key={k} onClick={() => setTab(k)} style={{ flex: 1, height: 44, border: 0, borderBottom: `2.5px solid ${tab === k ? C : "transparent"}`, background: "#fff", color: tab === k ? C : "#6b7280", fontSize: 14.5, fontWeight: tab === k ? 800 : 600, cursor: "pointer" }}>{l}</button>
              ))}
            </div>
            {tab === "deal" && (
              <>
                <div style={{ padding: "16px 20px" }}>
                  <div style={{ fontSize: 32, fontWeight: 900, color: C }}>{eok(b.price)}</div>
                  <div style={{ fontSize: 13, color: "#666", marginTop: 3 }}>{b.date} · {b.gbn} · {b.seller}→{b.buyer}{b.lines > 1 ? ` · 같은 날 같은 금액 신고 ${b.lines}줄` : ""}</div>
                </div>
                <div style={sec}><div style={grid}>
                  {row("대지", <>{b.plat.toLocaleString()}㎡ ({py(b.plat)}평) · 평당 <b>{perPy(b.price, b.plat)}</b></>)}
                  {row("연면적", <>{b.tot.toLocaleString()}㎡ ({py(b.tot)}평) · 평당 <b>{perPy(b.price, b.tot)}</b></>)}
                  {row("용도지역", b.landUse)}
                </div></div>
                <div style={note}>국토부 실거래가는 번지를 가려서 줍니다. 같은 동 · 번지 첫 자리 · 연면적이 건축물대장과 딱 하나 맞을 때만 이 건물로 보여 줍니다.</div>
              </>
            )}
            {tab === "land" && (
              <>
                <div style={sec}>
                  <div style={h4}>토지 정보 <span style={{ fontSize: 12, color: "#999", fontWeight: 500 }}>{Ld.year}년 기준</span></div>
                  <div style={grid}>
                    {row("지목", Ld.jimok)}
                    {row("면적", Ld.area ? `${Ld.area.toLocaleString()}㎡ (${py(Ld.area)}평)` : "")}
                    {row("용도지역", [Ld.zone1, Ld.zone2].filter(Boolean).join(", "))}
                    {row("이용상황", Ld.use)}
                    {row("지형", [Ld.height, Ld.shape].filter(Boolean).join(" · "))}
                    {row("도로접면", Ld.road)}
                  </div>
                </div>
                <div style={sec}>
                  <div style={h4}>개별공시지가</div>
                  {lastPrice && <div style={{ background: "#f1f5f9", borderRadius: 8, padding: "10px 14px", marginBottom: 10 }}>
                    <div style={{ fontSize: 12.5, color: "#64748b" }}>{lastPrice.y}년 공시지가 (㎡당)</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: C }}>{lastPrice.p.toLocaleString()}원</div>
                    <div style={{ fontSize: 12.5, color: "#64748b", marginTop: 2 }}>평당 {Math.round(lastPrice.p * PY / 10000).toLocaleString()}만 원 · 이 땅 전체 약 {eok(Math.round(lastPrice.p * (Ld.area || 0) / 10000))}</div>
                  </div>}
                  <PriceLine pts={prices} />
                </div>
                <div style={sec}>
                  <div style={h4}>토지이용계획</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {uses.map((u) => <span key={u.name} style={{ fontSize: 13, background: "#f1f5f9", color: "#334155", borderRadius: 4, padding: "3px 8px" }}>{u.name}{u.kind && u.kind !== "포함" ? ` (${u.kind})` : ""}</span>)}
                  </div>
                </div>
                {Ld.moves.length > 0 && <div style={sec}>
                  <div style={h4}>토지 이동 사유</div>
                  {Ld.moves.map((m, i) => <div key={i} style={{ fontSize: 14, display: "flex", gap: 16, padding: "4px 0" }}><span style={{ color: "#777", width: 90 }}>{m.d}</span><span>{m.why}</span></div>)}
                </div>}
                <div style={note}>브이월드(국토교통부) 토지특성 · 토지이용계획 · 개별공시지가 자료</div>
              </>
            )}
            {tab === "bld" && (
              <>
                <div style={sec}>
                  <div style={h4}>표제부</div>
                  <div style={grid}>
                    {row("건물 이름", b.name)}
                    {row("주용도", `${L.purpose}${L.etc && L.etc !== L.purpose ? ` (${L.etc})` : ""}`)}
                    {row("구조", L.struct)}
                    {row("층수", `지하 ${L.ug}층 / 지상 ${L.gr}층${L.height ? ` · 높이 ${L.height}m` : ""}`)}
                    {row("사용승인", `${L.useApr} (${L.age}년차)`)}
                    {row("대지면적", `${b.plat.toLocaleString()}㎡`)}
                    {row("건축면적", `${L.arch.toLocaleString()}㎡ (건폐율 ${L.bc}%)`)}
                    {row("연면적", `${b.tot.toLocaleString()}㎡ (용적률 ${L.vl}%)`)}
                    {row("승강기", `${L.elev}대`)}
                    {row("주차", `${L.park}대${L.mech ? ` (기계식 ${L.mech})` : ""}`)}
                  </div>
                </div>
                <div style={sec}>
                  <div style={h4}>층별 현황</div>
                  {b.floors.map((f, i) => (
                    <div key={i} style={{ display: "flex", gap: 10, alignItems: "baseline", padding: "6px 0", borderBottom: "1px solid #f3f4f6", fontSize: 14 }}>
                      <span style={{ width: 62, flexShrink: 0, fontWeight: 800, color: f.gb === "지하" ? "#64748b" : C }}>{f.nm}</span>
                      <span style={{ flex: 1, minWidth: 0 }}>{f.use}</span>
                      <span style={{ color: "#777", fontSize: 13, whiteSpace: "nowrap" }}>{Number(f.area).toLocaleString()}㎡</span>
                    </div>
                  ))}
                </div>
                <div style={note}>국토교통부 건축물대장 (표제부 · 층별개요)</div>
              </>
            )}
            {tab === "store" && (
              <>
                <div style={sec}>
                  <div style={h4}>이 건물에 있는 가게</div>
                  {b.stores.length ? b.stores.map((st, i) => (
                    <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", padding: "9px 0", borderBottom: "1px solid #f3f4f6" }}>
                      <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 15, fontWeight: 700 }}>{st.name}</div><div style={{ fontSize: 13, color: "#777", marginTop: 2 }}>{st.cat}</div></div>
                      {st.floor && <span style={{ fontSize: 13, color: C, fontWeight: 700 }}>{st.floor}층</span>}
                    </div>
                  )) : <div style={{ fontSize: 14, color: "#888" }}>등록된 가게가 없어요.</div>}
                </div>
                <div style={note}>소상공인시장진흥공단 상가(상권)정보 — 분기마다 바뀌어서 실제와 조금 다를 수 있어요.</div>
              </>
            )}
            <div style={sec}>
              <div style={h4}>위치</div>
              <MiniMap lat={b.lat} lng={b.lng} name={b.name} />
            </div>
            <div style={{ padding: "4px 20px 18px" }}>
              <a href="https://www.iros.go.kr" target="_blank" rel="noreferrer" style={{ display: "block", textAlign: "center", padding: "11px 0", borderRadius: 8, border: `1.5px solid ${C}`, color: C, fontWeight: 800, fontSize: 14.5, textDecoration: "none" }}>인터넷등기소에서 등기부 열람</a>
              <div style={{ fontSize: 11.5, color: "#aaa", marginTop: 8 }}>디자인 견본 — 내 PC에서만 보임</div>
            </div>
          </>
        ) : (
          <>
            {head(`${d.name} 건물 거래`, `최근 12개월 ${d.count}건 · 상업업무용 매매 · 대지 평당 가운데 값 ${(d.landPerPy / 10000).toFixed(2)}억`)}
            <div style={{ padding: "8px 12px 4px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead><tr>{["계약일", "번지", "금액", "대지", "연면적", "준공", ""].map((h) => <th key={h} style={{ textAlign: "left", color: "#888", fontWeight: 600, fontSize: 12.5, padding: "8px 4px", borderBottom: "1px solid #eef0f3" }}>{h}</th>)}</tr></thead>
                <tbody>{d.rows.map((r, i) => (
                  <tr key={i}>{[r.date, r.jibun, <b key="p">{short(r.price)}</b>, `${Math.round(r.plat / PY)}평`, `${Math.round(r.tot / PY)}평`, r.year,
                    <span key="s" style={{ fontSize: 11.5, whiteSpace: "nowrap", borderRadius: 3, padding: "0 5px", border: `1px solid ${r.hit ? C : "#ccc"}`, color: r.hit ? C : "#999" }}>{r.hit ? "건물 확인" : "번지 모름"}</span>].map((v, k) => <td key={k} style={{ padding: "8px 4px", borderBottom: "1px solid #f3f4f6" }}>{v}</td>)}</tr>
                ))}</tbody>
              </table>
            </div>
            <div style={{ fontSize: 12, color: "#999", padding: "10px 20px 16px" }}>최근 8건만 · &quot;건물 확인&quot;은 누르면 건축물대장까지 열리게 할 예정입니다. (디자인 견본 — 내 PC에서만 보임)</div>
          </>
        )}
      </div>
    </div>
  );
}
