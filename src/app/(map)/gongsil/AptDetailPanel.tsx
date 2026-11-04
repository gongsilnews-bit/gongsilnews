"use client";
/**
 * 공실열람 지도 [아파트 시세] — 단지 상세 창 (2026-11-02 사장님: 호갱노노 구성처럼 크게, 로드뷰·지도도)
 *  위: 매매/전월세 · 평형 고르기
 *  3개월 평균 · 3년 그래프(월 평균 선 + 거래 점 + 거래량 막대) · 거래 목록
 *  거래비용(법정 중개보수 상한) · 로드뷰 · 지도 · 단지 정보
 * 숫자는 국토부 실거래·건축물대장·공동주택 기본정보 그대로. 없는 값은 "-" (지어내지 않는다).
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { mountKakaoRoadview } from "@/utils/kakaoRoadview";
import { aptViewerInfo, submitAptInfoCapture, submitAptInfoRequest } from "@/app/actions/aptReports";
import { LAWD_NAMES, areaLabel, brokerFee, fullPrice, isNewDeal, supplyFor, type Rent, type Trade } from "@/utils/aptMapShared";

export type AptDetail = {
  id: string; kind?: "apt" | "offi" | "villa"; house_type?: string; name: string; dong: string; jibun: string; lawd_cd: string; build_year: number | null; lat: number; lng: number;
  trades: Trade[]; rents: Rent[]; new_at?: string | null; supply_map: Record<string, number> | null; unit_map: Record<string, number> | null;
  info: {
    households: number | null; dongs: number | null; useAprDay: string; vlRat: number | null; bcRat: number | null;
    topFloor: number | null; heating: string; hall: string; parking: number | null; builder: string;
    baseFloor?: number | null; manage?: string; saleType?: string; parkingGround?: number | null; elevators?: number | null;
    cctv?: number | null; evChargers?: number | null; subway?: string; subwayTime?: string; busTime?: string;
    school?: string; convenience?: string; welfare?: string;
  } | null;
  agent_fields?: string[];      // 부동산이 보완한 칸 (화면에 "공인중개사 제공")
  agent_supply_keys?: string[]; // 부동산이 보완한 공급면적의 전용㎡
  vacancy_ids?: string[];       // 이 단지 공실 (DB, 탭과 상관없이)
  auction_ids?: string[];       // 이 단지 경매·공매 (2026-11-02)
};

export const BRAND = "#1a56db";
/** NEW — 지도 배지와 같은 빨간 작은 표 */
const NewTag = () => <span style={{ marginLeft: 6, verticalAlign: 2, fontSize: 9.5, fontWeight: 900, color: "#fff", background: "#ef4444", borderRadius: 8, padding: "0 4px", lineHeight: "15px", display: "inline-block" }}>NEW</span>;
const TOP_RED = "#d9363e"; // "최고" — 오른 값은 빨강 (2026-11-02 사장님: 주황이 튄다)
/** 단지 정보 줄 이름 → 부동산 보완 칸 이름 */
const AGENT_KEY: Record<string, string> = { "전기차 충전": "evChargers", "세대수": "households", "호수": "households", "동수": "dongs", "층수": "topFloor", "주차": "parking", "구조": "hall", "난방": "heating", "시공사": "builder" };
/** 단지 종류 색 — 카드 바깥 상자가 --apt-accent 를 정한다 (아파트 파랑 · 오피스텔 초록, 지도 표시와 같게) */
const ACC = "var(--apt-accent, #1a56db)";
const ACC_SOFT = "var(--apt-soft, #eef3ff)";
const OFFI_GREEN = "#0f766e";
export const VILLA_ROSE = "#be185d"; // 빌라(연립·다세대) — 견본 (2026-11-03 사장님: 개발 PC에서만 먼저)
const LINE = "#e8eaed";
const SUB = "#6b7280";
const DAY = 86400000;

type Mode = "sale" | "lease";
type Group = { label: string; s: number | null; lo: number; hi: number; units: number; sales: Trade[]; rents: Rent[] };

const dot = (d: string) => `${d.slice(2, 4)}.${d.slice(5, 7)}.${d.slice(8, 10)}`;
const ym = (d: string) => d.slice(0, 7);
const leasePrice = (r: Rent) => (r.m ? `${fullPrice(r.dep)} / ${r.m.toLocaleString("ko-KR")}` : fullPrice(r.dep));

/** 평형 묶기 — 매매·전월세·세대수를 같은 이름("33평")으로 */
function groupsOf(c: AptDetail): Group[] {
  const map = new Map<string, Group>();
  const get = (a: number) => {
    const s = supplyFor(c.supply_map, a);
    const label = areaLabel(a, s);
    const g = map.get(label) || { label, s, lo: a, hi: a, units: 0, sales: [], rents: [] };
    g.lo = Math.min(g.lo, a);
    g.hi = Math.max(g.hi, a);
    map.set(label, g);
    return g;
  };
  for (const t of c.trades || []) get(t.a).sales.push(t);
  for (const r of c.rents || []) get(r.a).rents.push(r);
  for (const [ex, n] of Object.entries(c.unit_map || {})) {
    const label = areaLabel(Number(ex), supplyFor(c.supply_map, Number(ex)));
    const g = map.get(label);
    if (g) g.units += n; // 거래가 한 번도 없는 평형은 목록에 넣지 않는다
  }
  return [...map.values()].sort((x, y) => x.lo - y.lo);
}

/** 최근 실거래 기준 N개월 평균 — 가장 최근 거래일부터 N개월 안 (3·6·12개월 고르기, 2026-11-03 사장님) */
function monthAvg(list: { d: string; v: number }[], months = 3) {
  if (!list.length) return null;
  const last = list.reduce((m, x) => (x.d > m ? x.d : m), list[0].d);
  const from = new Date(new Date(last).getTime() - Math.round(months * 30.4) * DAY).toISOString().slice(0, 10);
  const recent = list.filter((x) => x.d >= from);
  return { avg: Math.round(recent.reduce((t, x) => t + x.v, 0) / recent.length), count: recent.length, last };
}

/* ── 3년 그래프 ── */
function PriceChart({ points }: { points: { d: string; v: number }[] }) {
  const W = 540, H = 190, VOL = 34, PADL = 34, PADR = 8, TOP = 16;
  const months: string[] = [];
  const now = new Date();
  for (let i = 35; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    months.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  const inRange = points.filter((p) => ym(p.d) >= months[0]);
  if (!inRange.length) return <div style={{ padding: "30px 0", textAlign: "center", color: SUB }}>최근 3년 거래가 없습니다</div>;
  const vals = inRange.map((p) => p.v);
  let lo = Math.min(...vals), hi = Math.max(...vals);
  const pad = Math.max((hi - lo) * 0.15, hi * 0.05);
  lo = Math.max(0, lo - pad); hi += pad;
  const x = (d: string) => {
    const i = months.indexOf(ym(d));
    const day = Number(d.slice(8, 10)) || 15;
    return PADL + ((i + (day - 1) / 31) / 36) * (W - PADL - PADR);
  };
  const y = (v: number) => TOP + (1 - (v - lo) / (hi - lo || 1)) * (H - TOP - 10);
  const byMonth = new Map<string, number[]>();
  for (const p of inRange) byMonth.set(ym(p.d), [...(byMonth.get(ym(p.d)) || []), p.v]);
  const line = months.filter((m) => byMonth.has(m)).map((m) => {
    const list = byMonth.get(m)!;
    return [x(`${m}-15`), y(list.reduce((t, v) => t + v, 0) / list.length)] as const;
  });
  const maxP = inRange.reduce((m, p) => (p.v > m.v ? p : m)), minP = inRange.reduce((m, p) => (p.v < m.v ? p : m));
  const maxVol = Math.max(...months.map((m) => byMonth.get(m)?.length || 0));
  const ticks = [0, 1, 2, 3].map((i) => lo + ((hi - lo) * i) / 3);
  const tickLabel = (v: number) => (v >= 10000 ? `${Math.round(v / 1000) / 10}억` : `${Math.round(v / 100) * 100}만`);
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H + VOL + 22}`} style={{ display: "block", maxWidth: W }}>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={PADL} x2={W - PADR} y1={y(t)} y2={y(t)} stroke="#f1f3f4" />
          <text x={PADL - 4} y={y(t) + 4} fontSize="10" fill="#9aa0a6" textAnchor="end">{tickLabel(t)}</text>
        </g>
      ))}
      {inRange.map((p, i) => <circle key={i} cx={x(p.d)} cy={y(p.v)} r="2.2" style={{ fill: ACC }} opacity="0.22" />)}
      <polyline points={line.map(([a, b]) => `${a},${b}`).join(" ")} fill="none" style={{ stroke: ACC }} strokeWidth="2.2" strokeLinejoin="round" />
      {line.length > 0 && <circle cx={line[line.length - 1][0]} cy={line[line.length - 1][1]} r="4.5" style={{ fill: ACC }} stroke="#fff" strokeWidth="2" />}
      <circle cx={x(maxP.d)} cy={y(maxP.v)} r="4" fill={TOP_RED} stroke="#fff" strokeWidth="1.5" />
      <text x={x(maxP.d)} y={y(maxP.v) - 8} fontSize="10" fill={TOP_RED} textAnchor="middle" fontWeight="700">최고</text>
      {minP !== maxP && <>
        <circle cx={x(minP.d)} cy={y(minP.v)} r="4" fill="#3b82f6" stroke="#fff" strokeWidth="1.5" />
        <text x={x(minP.d)} y={y(minP.v) + 16} fontSize="10" fill="#3b82f6" textAnchor="middle" fontWeight="700">최저</text>
      </>}
      {months.map((m) => {
        const n = byMonth.get(m)?.length || 0;
        if (!n) return null;
        const h = Math.max(3, (n / maxVol) * (VOL - 4));
        return <rect key={m} x={x(`${m}-01`)} y={H + VOL - h} width={(W - PADL - PADR) / 36 - 2} height={h} style={{ fill: ACC }} opacity="0.3" rx="1" />;
      })}
      <text x={4} y={H + VOL - 2} fontSize="10" fill="#9aa0a6">거래량</text>
      {months.filter((m) => m.endsWith("-01")).map((m) => (
        <text key={m} x={x(`${m}-01`)} y={H + VOL + 16} fontSize="10" fill="#9aa0a6">{m.replace("-", ".")}</text>
      ))}
    </svg>
  );
}

/* ── 로드뷰 ── */
export function Roadview({ lat, lng }: { lat: number; lng: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const kakao = (window as any).kakao;
    const box = ref.current;
    if (!kakao?.maps || !box) return;
    // 회색만 남으면 주변으로 살짝 옮겨 다른 로드뷰를 다시 잡는다 — 공실 상세와 같은 방식 (2026-11-03 사장님)
    const NONE = "이 단지 근처에 로드뷰가 없습니다";
    let stop = mountKakaoRoadview({ kakao, container: box, lat, lng, maxAttempts: 4, background: "#e8eaed", loadingMessage: "로드뷰를 불러오는 중…", failureMessage: NONE });
    // 그래도 없으면 큰 단지 — 단지 대표 위치가 도로에서 멀다. 300m · 600m 까지 넓혀 찾는다 (2026-11-02 한남더힐)
    let done = false;
    const wide = () => {
      if (done || box.dataset.roadviewStatus !== "failed") return;
      done = true;
      const client = new kakao.maps.RoadviewClient();
      const pos = new kakao.maps.LatLng(lat, lng);
      const find = (radius: number) =>
        client.getNearestPanoId(pos, radius, (panoId: number | null) => {
          if (stop === noop) return;
          if (panoId) { stop(); stop = noop; box.replaceChildren(); new kakao.maps.Roadview(box).setPanoId(panoId, pos); }
          else if (radius < 600) find(radius * 2);
        });
      find(300);
    };
    const watch = new MutationObserver(wide);
    watch.observe(box, { attributes: true, attributeFilter: ["data-roadview-status"] });
    return () => { watch.disconnect(); stop(); stop = noop; };
  }, [lat, lng]);
  return <div ref={ref} style={{ position: "relative", height: 240, background: "#e8eaed" }} />;
}
const noop = () => {};

/* ── 주변 인프라 픽토그램 — 단색 SVG (2026-11-02 사장님) ── */
const INFRA_ICON: Record<string, React.ReactNode> = {
  지하철역: <><rect x="5" y="3" width="14" height="14" rx="3" /><path d="M5 11h14M9 17l-2 4M15 17l2 4" /><circle cx="9" cy="14" r=".6" /><circle cx="15" cy="14" r=".6" /></>,
  버스정류장: <><rect x="4" y="3" width="16" height="15" rx="3" /><path d="M4 10h16M8 18v3M16 18v3" /><circle cx="8" cy="14" r=".6" /><circle cx="16" cy="14" r=".6" /></>,
  쇼핑센터: <><path d="M5 8h14l-1 12H6L5 8z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></>,
  병원: <><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M12 8v8M8 12h8" /></>,
  학교: <><path d="M3 9l9-5 9 5-9 5-9-5z" /><path d="M7 11v5c0 1.5 2.2 3 5 3s5-1.5 5-3v-5" /></>,
  기타: <><path d="M12 21s-6-5.3-6-11a6 6 0 0 1 12 0c0 5.7-6 11-6 11z" /><circle cx="12" cy="10" r="2.2" /></>,
};
function InfraIcon({ name }: { name: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ stroke: ACC }} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {INFRA_ICON[name] || INFRA_ICON["기타"]}
    </svg>
  );
}

/* ── 주변 인프라 (반경 바꾸기 500m · 1km · 2km) ── */
function NearbyInfra({ lat, lng, sectionStyle, h3 }: { lat: number; lng: number; sectionStyle: React.CSSProperties; h3: React.CSSProperties }) {
  const [radius, setRadius] = useState(2000); // 공실등록 화면과 같게 기본 2km
  const [infra, setInfra] = useState<Record<string, string[]> | null>(null);
  useEffect(() => {
    let alive = true;
    setInfra(null);
    import("@/app/actions/geocode")
      .then(({ searchNearbyInfrastructure }) => searchNearbyInfrastructure(lat, lng, radius))
      .then((r) => { if (alive) setInfra(r || {}); })
      .catch(() => { if (alive) setInfra({}); });
    return () => { alive = false; };
  }, [lat, lng, radius]);
  const rows = Object.entries(infra || {}).filter(([, v]) => v.length);
  return (
    <div style={sectionStyle}>
      <div style={{ display: "flex", alignItems: "center", paddingRight: 20 }}>
        <h3 style={{ ...h3, flex: 1 }}>주변 인프라</h3>
        <select value={radius} onChange={(e) => setRadius(Number(e.target.value))} style={{ border: `1px solid ${LINE}`, borderRadius: 6, padding: "4px 8px", fontSize: 13, background: "#fff" }}>
          {/* 공실등록 화면과 같은 단계 (2026-11-02 사장님) */}
          <option value={500}>반경 500m</option>
          <option value={1000}>반경 1km</option>
          <option value={2000}>반경 2km</option>
          <option value={3000}>반경 3km</option>
          <option value={5000}>반경 5km</option>
        </select>
      </div>
      <div style={{ padding: "0 20px 16px" }}>
        {infra === null && <div style={{ color: SUB }}>찾는 중…</div>}
        {infra !== null && !rows.length && <div style={{ color: SUB }}>주변 시설을 찾지 못했습니다.</div>}
        {rows.map(([k, list]) => (
          <div key={k} style={{ display: "grid", gridTemplateColumns: "104px 1fr", gap: 8, padding: "9px 0", borderBottom: "1px solid #f3f4f6", alignItems: "start" }}>
            <span style={{ color: SUB, paddingTop: 3, display: "inline-flex", alignItems: "center", gap: 6 }}><InfraIcon name={k} />{k}</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {list.map((name) => (
                <span key={name} style={{ fontSize: 12.5, padding: "3px 9px", borderRadius: 14, border: `1px solid ${LINE}`, background: "#fff", color: "#374151" }}>{name}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── 지도 ── */
export function MiniMap({ lat, lng, name }: { lat: number; lng: number; name: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const kakao = (window as any).kakao;
    if (!kakao?.maps || !ref.current) return;
    const pos = new kakao.maps.LatLng(lat, lng);
    const map = new kakao.maps.Map(ref.current, { center: pos, level: 3 });
    new kakao.maps.Marker({ position: pos, map, title: name });
  }, [lat, lng, name]);
  return <div ref={ref} style={{ height: 240 }} />;
}

/* ── [정보 수정 요청] (2026-11-02 사장님: 전용·공급은 부동산이 가장 잘 안다) — 승인된 부동산 회원만, 최고관리자가 승인하면 반영 ── */
const REQ_FIELDS: [string, string][] = [
  ["supply", "공급면적"], ["contract", "계약면적"], ["rooms", "방/욕실"], ["useAprDay", "사용승인일"], ["vlRat", "용적률"], ["bcRat", "건폐율"], ["households", "세대수(호수)"], ["dongs", "동수"], ["topFloor", "최고층"],
  ["parking", "주차대수"], ["hall", "구조(계단식·복도식)"], ["heating", "난방"], ["builder", "시공사"],
];
/** 부동산이 붙여 넣은 단지정보 글 → 항목 (2026-11-02 사장님: 부동산이 넣는 것, 우리는 받아서 나눌 뿐)
 *  "사용승인일 2006. 6. 30." "세대수 50세대" "계약면적 154.31㎡ 전용면적 87.89㎡" 처럼 이름 뒤 값을 찾는다. 못 찾은 항목은 넣지 않는다 */
type Parsed = { field: string; label: string; value: string; exArea?: number };
function parsePasted(text: string): Parsed[] {
  const t = text.replace(/\r/g, "").replace(/[ \t]+/g, " ");
  const after = (label: string, re: RegExp) => {
    const m = t.match(new RegExp(`${label}\s*\n?\s*${re.source}`));
    return m ? m.slice(1) : null;
  };
  const out: Parsed[] = [];
  const d = after("사용승인일", /(\d{4})\s*\.\s*(\d{1,2})\s*\.\s*(\d{1,2})/);
  if (d) out.push({ field: "useAprDay", label: "사용승인일", value: `${d[0]}${d[1].padStart(2, "0")}${d[2].padStart(2, "0")}` });
  const hh = after("세대수", /([\d,]+)\s*(?:세대|호)/);
  if (hh) out.push({ field: "households", label: "세대수", value: hh[0].replace(/,/g, "") });
  const dong = after("동수", /(\d+)\s*개/);
  if (dong) out.push({ field: "dongs", label: "동수", value: dong[0] });
  const top = after("최고층", /(\d+)\s*층/);
  if (top) out.push({ field: "topFloor", label: "최고층", value: top[0] });
  const heat = after("난방", /([^\n]+)/);
  if (heat && heat[0].trim()) out.push({ field: "heating", label: "난방", value: heat[0].trim() });
  const park = after("주차", /([\d,]+)\s*대/);
  if (park) out.push({ field: "parking", label: "주차", value: park[0].replace(/,/g, "") });
  const ratio = after("용적률\/건폐율", /([\d.]+)\s*%\s*\/\s*([\d.]+)\s*%/) || (() => { const a = after("용적률", /([\d.]+)\s*%/), b = after("건폐율", /([\d.]+)\s*%/); return a && b ? [a[0], b[0]] : null; })();
  if (ratio) { out.push({ field: "vlRat", label: "용적률", value: ratio[0] }); out.push({ field: "bcRat", label: "건폐율", value: ratio[1] }); }
  const builder = after("(?:건설사|시공사)", /([^\n]+)/);
  if (builder && builder[0].trim()) out.push({ field: "builder", label: "건설사", value: builder[0].trim() });
  const hall = after("현관구조", /(계단식|복도식|혼합식|타워형)/);
  if (hall) out.push({ field: "hall", label: "현관구조", value: hall[0] });
  // 면적별 — 전용면적이 있어야 어느 면적인지 안다
  const ex = after("전용면적", /([\d.]+)\s*㎡/);
  if (ex) {
    const exArea = Number(ex[0]);
    const sup = after("공급면적", /([\d.]+)\s*㎡/);
    if (sup) out.push({ field: "supply", label: `공급면적 (전용 ${exArea}㎡)`, value: sup[0], exArea });
    const con = after("계약면적", /([\d.]+)\s*㎡/);
    if (con) out.push({ field: "contract", label: `계약면적 (전용 ${exArea}㎡)`, value: con[0], exArea });
    const rooms = after("방\/욕실", /(\d+)\s*\/\s*(\d+)/);
    if (rooms) out.push({ field: "rooms", label: `방/욕실 (전용 ${exArea}㎡)`, value: `${rooms[0]}/${rooms[1]}`, exArea });
  }
  return out;
}

function PasteRequest({ detail, onDone }: { detail: AptDetail; onDone: (msg: string) => void }) {
  const [text, setText] = useState("");
  const [items, setItems] = useState<(Parsed & { on: boolean })[]>([]);
  const [busy, setBusy] = useState(false);
  const read = () => setItems(parsePasted(text).map((x) => ({ ...x, on: true })));
  const send = async () => {
    setBusy(true);
    let ok = 0, applied = 0, held = 0, err = "";
    const rejected: string[] = [];
    for (const x of items.filter((i) => i.on)) {
      const r = await submitAptInfoRequest({ complexId: detail.id, field: x.field, exArea: x.exArea ?? null, value: x.value, note: "부동산 붙여넣기" });
      if (!r.success) { err = r.error || "보내지 못했습니다."; break; }
      ok++;
      if (r.decision === "approve") applied++; else if (r.decision === "pending") held++; else rejected.push(`${x.label}: ${r.reason}`);
    }
    setBusy(false);
    if (ok) { setText(""); setItems([]); }
    const summary = [applied && `${applied}개 바로 반영했습니다`, held && `${held}개는 확인 후 반영됩니다`, rejected.length && `${rejected.length}개는 반영하지 않았습니다 (${rejected.join(" / ")})`].filter(Boolean).join(" · ");
    onDone(err ? (ok ? `${summary} · 나머지는 못 보냈습니다: ${err}` : err) : `보냈습니다. ${summary}. 감사합니다.`);
  };
  const box: React.CSSProperties = { width: "100%", boxSizing: "border-box", border: `1px solid ${LINE}`, borderRadius: 8, padding: 10, fontSize: 13, fontFamily: "inherit", background: "#fff" };
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <textarea value={text} onChange={(e) => { setText(e.target.value); setItems([]); }} rows={6} placeholder={"단지정보 글을 통째로 붙여 넣으세요.\n(사용승인일·세대수·동수·최고층·난방·주차·용적률/건폐율·건설사·면적·현관구조·방/욕실을 찾아 나눕니다)"} style={{ ...box, resize: "vertical" }} />
      {!items.length ? (
        <button onClick={read} disabled={!text.trim()} style={{ height: 38, border: `1.5px solid ${ACC}`, borderRadius: 8, background: "#fff", color: ACC, fontWeight: 800, cursor: "pointer" }}>항목 나누기</button>
      ) : (
        <>
          <div style={{ background: "#fff", borderRadius: 8, border: `1px solid ${LINE}` }}>
            {items.map((x, i) => (
              <label key={x.field + i} style={{ display: "flex", gap: 8, alignItems: "center", padding: "7px 10px", borderTop: i ? `1px solid ${LINE}` : "none", fontSize: 13, cursor: "pointer" }}>
                <input type="checkbox" checked={x.on} onChange={() => setItems(items.map((y, j) => (j === i ? { ...y, on: !y.on } : y)))} />
                <span style={{ color: SUB, width: 128, flexShrink: 0 }}>{x.label}</span>
                <b>{x.field === "useAprDay" ? `${x.value.slice(0, 4)}.${x.value.slice(4, 6)}.${x.value.slice(6)}` : x.value}</b>
              </label>
            ))}
          </div>
          <button onClick={send} disabled={busy || !items.some((x) => x.on)} style={{ height: 40, border: "none", borderRadius: 8, background: ACC, color: "#fff", fontWeight: 800, cursor: "pointer" }}>{busy ? "보내는 중…" : `고른 ${items.filter((x) => x.on).length}개 보내기`}</button>
        </>
      )}
      {text.trim() && !items.length && <div style={{ color: SUB, fontSize: 11 }}>[항목 나누기]를 누르면 보낼 항목을 확인할 수 있습니다.</div>}
    </div>
  );
}

const MAX_SHOTS = 10; // 여러 장 (2026-11-02 사장님) — 한 번에 서버로 보내는 양(10MB) 안에 들게 WebP 로 압축
/** 캡처 → WebP 압축 (긴 변 1600px, 화질 0.8) — 2026-11-02 사장님: 이미지는 WebP 로 압축해서 받는다 */
async function toWebp(file: Blob): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = url; });
    const scale = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas");
    c.width = Math.round(img.naturalWidth * scale);
    c.height = Math.round(img.naturalHeight * scale);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/webp", 0.8);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** 캡처 첨부 + 요청 글 (기본) — 부동산이 단지정보 화면을 캡처해 붙이면 관리자가 보고 반영 */
function CaptureRequest({ detail, onDone }: { detail: AptDetail; onDone: (msg: string) => void }) {
  const [shots, setShots] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const add = async (files: Blob[]) => {
    const imgs = files.filter((f) => f.type.startsWith("image/")).slice(0, MAX_SHOTS - shots.length);
    if (!imgs.length) return;
    const out = await Promise.all(imgs.map(toWebp));
    setShots((v) => [...v, ...out].slice(0, MAX_SHOTS));
  };
  const empty = !shots.length && !text.trim();
  const send = async () => {
    setBusy(true);
    const r = await submitAptInfoCapture({ complexId: detail.id, text, images: shots });
    setBusy(false);
    if (r.success) { setShots([]); setText(""); onDone("보냈습니다. 확인 후 반영됩니다. 감사합니다."); }
    else onDone(r.error || "보내지 못했습니다.");
  };
  return (
    <div style={{ display: "grid", gap: 8 }} onPaste={(e) => { const f = [...e.clipboardData.files]; if (f.length) { e.preventDefault(); add(f); } }}>
      <div
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); add([...e.dataTransfer.files]); }}
        style={{ border: `1.5px dashed ${ACC}`, borderRadius: 8, background: "#fff", padding: shots.length ? 8 : "18px 10px", textAlign: "center", cursor: "pointer", color: ACC, fontSize: 13, fontWeight: 700 }}
      >
        {shots.length ? (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {shots.map((src, i) => (
              <div key={i} style={{ position: "relative" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" style={{ width: 92, height: 92, objectFit: "cover", borderRadius: 6, border: `1px solid ${LINE}` }} />
                <button onClick={(e) => { e.stopPropagation(); setShots(shots.filter((_, j) => j !== i)); }} style={{ position: "absolute", top: 2, right: 2, width: 20, height: 20, borderRadius: 10, border: "none", background: "rgba(0,0,0,.6)", color: "#fff", cursor: "pointer", fontSize: 11 }}>✕</button>
              </div>
            ))}
            {shots.length < MAX_SHOTS && <div style={{ width: 92, height: 92, display: "flex", alignItems: "center", justifyContent: "center", border: `1px dashed ${LINE}`, borderRadius: 6 }}>+ 추가</div>}
          </div>
        ) : (
          <>
            📎 단지정보 캡처 첨부
            <div style={{ fontWeight: 500, color: SUB, fontSize: 11.5, marginTop: 4 }}>눌러서 고르거나, 끌어다 놓거나, 캡처 후 Ctrl+V (여러 장, {MAX_SHOTS}장까지)</div>
          </>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => { add([...(e.target.files || [])]); e.target.value = ""; }} />
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder="요청사항 (예: 세대수가 50세대입니다, 전용 87.89㎡ 계약면적 154.31㎡)" style={{ width: "100%", boxSizing: "border-box", border: `1px solid ${LINE}`, borderRadius: 8, padding: 10, fontSize: 13, fontFamily: "inherit", resize: "vertical" }} />
      <button onClick={send} disabled={busy || empty} style={{ height: 40, border: "none", borderRadius: 8, background: ACC, color: "#fff", fontWeight: 800, cursor: "pointer", opacity: busy || empty ? 0.5 : 1 }}>{busy ? "보내는 중…" : "보내기"}</button>
    </div>
  );
}

function InfoRequest({ detail, groups }: { detail: AptDetail; groups: { label: string; lo: number; hi: number }[] }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"capture" | "paste" | "one">("capture"); // 캡처 첨부가 기본 (2026-11-02 사장님)
  const [field, setField] = useState("supply");
  const [ex, setEx] = useState("");
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { setOpen(false); setMsg(""); setValue(""); setNote(""); setEx(""); }, [detail.id]);
  const exOptions = groups.map((g) => ({ label: g.label, value: String(g.lo) }));
  const input: React.CSSProperties = { width: "100%", boxSizing: "border-box", height: 38, border: `1px solid ${LINE}`, borderRadius: 8, padding: "0 10px", fontSize: 14, fontFamily: "inherit", background: "#fff" };
  const perArea = ["supply", "contract", "rooms"].includes(field);
  const send = async () => {
    setBusy(true); setMsg("");
    const r = await submitAptInfoRequest({ complexId: detail.id, field, exArea: perArea ? Number(ex) : null, value, note });
    setBusy(false);
    if (r.success) {
      // 자동 심사 결과 그대로 알려 준다 (2026-11-02)
      setMsg(r.decision === "approve" ? "보냈습니다. 확인을 거쳐 바로 반영했습니다. 감사합니다." : r.decision === "reject" ? `반영하지 못했습니다: ${r.reason}` : `보냈습니다. ${r.reason?.replace(/ — 확인 필요$/, "")} — 확인 후 반영됩니다.`);
      setValue(""); setNote("");
    }
    else setMsg(r.error || "보내지 못했습니다.");
  };
  if (!open) {
    return (
      <div style={{ padding: "0 20px 16px" }}>
        <button onClick={() => setOpen(true)} style={{ border: "none", background: "none", color: ACC, fontWeight: 700, cursor: "pointer", padding: 0, fontSize: 13 }}>
          정보가 다른가요? 정보 수정 요청 ›
        </button>
        <div style={{ color: "#9ca3af", fontSize: 11, marginTop: 3 }}>부동산 회원이 캡처·글로 보내면 확인 후 반영합니다.</div>
      </div>
    );
  }
  const tabs: ["capture" | "paste" | "one", string][] = [["capture", "캡처 첨부"], ["paste", "글 붙여넣기"], ["one", "항목 하나씩"]];
  return (
    <div style={{ margin: "0 20px 16px", padding: 14, background: ACC_SOFT, borderRadius: 10, display: "grid", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center" }}>
        <b style={{ flex: 1 }}>정보 수정 요청</b>
        <button onClick={() => setOpen(false)} aria-label="닫기" style={{ border: "none", background: "none", cursor: "pointer", fontSize: 16, color: SUB }}>✕</button>
      </div>
      <div style={{ display: "flex", background: "#fff", borderRadius: 8, padding: 3 }}>
        {tabs.map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} style={{ flex: 1, border: "none", borderRadius: 6, padding: "6px 0", fontWeight: 700, fontSize: 12.5, cursor: "pointer", background: tab === k ? ACC : "transparent", color: tab === k ? "#fff" : SUB }}>{l}</button>
        ))}
      </div>
      {tab === "capture" && <CaptureRequest detail={detail} onDone={setMsg} />}
      {tab === "paste" && <PasteRequest detail={detail} onDone={setMsg} />}
      {tab === "one" && (
        <>
          <select value={field} onChange={(e) => setField(e.target.value)} style={input}>
            {REQ_FIELDS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
          {perArea && (
            <select value={ex} onChange={(e) => setEx(e.target.value)} style={input}>
              <option value="">전용면적 고르기</option>
              {exOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          )}
          <input value={value} onChange={(e) => setValue(e.target.value)} placeholder={field === "supply" ? "맞는 공급면적 (㎡, 예: 112.4)" : "맞는 값"} style={input} />
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="근거 (선택, 예: 분양 안내문·관리사무소 확인)" style={input} />
          <button onClick={send} disabled={busy} style={{ height: 40, border: "none", borderRadius: 8, background: ACC, color: "#fff", fontWeight: 800, cursor: "pointer" }}>{busy ? "보내는 중…" : "보내기"}</button>
        </>
      )}
      {msg && <div style={{ fontSize: 13, color: /보냈/.test(msg) && !/못/.test(msg) ? "#15803d" : "#d93025" }}>{msg}</div>}
      <div style={{ color: SUB, fontSize: 11 }}>실거래 가격은 국토부 신고 자료라 고칠 수 없습니다.</div>
    </div>
  );
}

/* ── 맨 아래 단추 — 공실 보기 · 무료 공실등록 ──
 *  로그인 안 함: [무료 공실등록] → 로그인 뒤 등록 화면 · 부동산 회원·관리자: 단지가 미리 채워진 등록 화면 · 일반 회원: 등록 단추 숨김
 *  조회수는 실제로 센 것만, 5번 이상일 때만 보인다 (지어내지 않는다) */
const VIEW_SHOW_MIN = 5;
function BottomActions({ detail, vacancyCount, onShowVacancies, onShowAuctions, mobile = false, stack = false }: { detail: AptDetail; vacancyCount: number; onShowVacancies?: () => void; onShowAuctions?: () => void; mobile?: boolean; stack?: boolean }) {
  const auctionCount = (detail.auction_ids || []).length;
  const [viewer, setViewer] = useState<{ loggedIn: boolean; realtor: boolean; admin: boolean; weekViews: number } | null>(null);
  useEffect(() => {
    const key = `apt-view:${detail.id}:${new Date().toISOString().slice(0, 10)}`;
    let count = true;
    try { count = !localStorage.getItem(key); localStorage.setItem(key, "1"); } catch { /* 사생활 보호 모드 */ }
    aptViewerInfo(detail.id, count).then(setViewer).catch(() => setViewer(null));
  }, [detail.id]);

  const canRegister = !viewer || !viewer.loggedIn || viewer.realtor; // 불러오기 전엔 보인다
  const base = viewer?.admin ? "/admin" : "/realty_admin";
  const target = mobile ? `/m/admin/vacancy/write?complex=${encodeURIComponent(detail.id)}` : `${base}?menu=gongsil&action=write&complex=${encodeURIComponent(detail.id)}`;
  const register = () => {
    window.location.href = viewer?.loggedIn ? target : `${mobile ? "/m/login" : "/login"}?returnTo=${encodeURIComponent(target)}`;
  };
  const hasVacancy = vacancyCount > 0 && !!onShowVacancies;
  if (!hasVacancy && !canRegister) return null;

  const views = viewer && viewer.weekViews >= VIEW_SHOW_MIN ? viewer.weekViews : 0;
  const pitch = canRegister && (hasVacancy
    ? `이 단지 실거래가를 보는 손님에게 대표님 공실도 함께 보입니다.`
    : `지금 올리면 이 단지를 보는 손님에게 대표님 공실이 먼저 보입니다.`);
  return (
    <div style={{ flexShrink: 0, padding: "12px 16px 14px", background: "#fff", borderTop: `1px solid ${LINE}` }}>
      {(views > 0 || pitch) && (
        <div style={{ fontSize: 13, color: "#4b5563", marginBottom: 9, lineHeight: 1.5 }}>
          {views > 0 && <b style={{ color: ACC }}>이번 주 이 단지 실거래가 조회 {views.toLocaleString("ko-KR")}번 · </b>}
          {pitch}
        </div>
      )}
      {stack && <style>{".apt-stack > button { flex: none !important; }"}</style>}
      <div className={stack ? "apt-stack" : undefined} style={{ display: "flex", flexDirection: stack ? "column-reverse" : "row", gap: 8 }}>{/* 왼쪽 창은 좁아서 위아래로 — 등록 단추가 위 */}
        {hasVacancy && (
          <button onClick={onShowVacancies} style={{ flex: canRegister ? 1.3 : 1, height: 50, borderRadius: 12, border: `1.5px solid ${ACC}`, background: "#fff", color: ACC, fontSize: 15.5, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" }}>
            이 단지 공실 {vacancyCount}개 보기
          </button>
        )}
        {auctionCount > 0 && onShowAuctions && (
          <button onClick={onShowAuctions} style={{ flex: 1, height: 50, borderRadius: 12, border: "1.5px solid #7048e8", background: "#fff", color: "#7048e8", fontSize: 15.5, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" }}>
            경매 {auctionCount}건 보기
          </button>
        )}
        {canRegister && (
          <button onClick={register} style={{ flex: 1, height: 50, borderRadius: 12, border: "none", background: ACC, color: "#fff", fontSize: 15.5, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap", boxShadow: "0 3px 10px rgba(0,0,0,.15)" }}>
            {/* 2026-11-02 사장님 */}
            공실무료등록하고 SNS자동홍보하기
          </button>
        )}
      </div>
    </div>
  );
}

/* ── 상세 창 ── */
/** 대본 작성에서 연 공실열람 창(?aptPick=1)이면 단지 창 맨 위에 [✍ 이 단지로 대본 쓰기] — 앱의 대본 작성 화면으로 단지를 보내고 창을 닫는다 */
function ScriptPickBar({ detail }: { detail: AptDetail }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    try {
      if (new URLSearchParams(window.location.search).get("aptPick") === "1") sessionStorage.setItem("gs-apt-pick", "1");
      setOn(sessionStorage.getItem("gs-apt-pick") === "1" && Boolean(window.opener));
    } catch {}
  }, []);
  if (!on) return null;
  const send = () => {
    try { window.opener?.postMessage({ type: "gs-apt-pick", id: detail.id, name: detail.name, dong: detail.dong, kind: detail.kind || "apt" }, window.location.origin); } catch {}
    window.close();
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: "#eef3ff", borderBottom: "1px solid #c7d7fe" }}>
      <span style={{ flex: 1, fontSize: 13, color: "#1e3a8a", lineHeight: 1.45 }}>이 단지의 실거래 시세로 대본을 써요</span>
      <button onClick={send} style={{ border: 0, borderRadius: 8, background: "#2563eb", color: "#fff", fontSize: 14, fontWeight: 800, padding: "9px 14px", cursor: "pointer", whiteSpace: "nowrap" }}>✍ 이 단지로 대본 쓰기</button>
    </div>
  );
}

export default function AptDetailPanel({ detail, onClose, vacancyCount = 0, onShowVacancies, onShowAuctions, mobile = false, side, flat = false, part }: {
  /** 캡처 한 장 — chart: 시세·그래프만 · trades: 실거래 내역만 (flat 일 때) */
  part?: "chart" | "trades";
  /** 캡처용 — 창 없이 페이지에 펼쳐 그린다 (대본 작성 › 단지/시세 화면 캡처, /apt-capture). 로드뷰·지도·거래비용·아래 단추는 뺀다 */
  flat?: boolean;
  detail: AptDetail; onClose: () => void; vacancyCount?: number; onShowVacancies?: () => void; onShowAuctions?: () => void;
  /** PC: 왼쪽 목록 자리에 붙인다 (2026-11-02 사장님: 호갱노노처럼 왼쪽에) — 목록의 화면 위치·크기, 숨김 */
  side?: { left: number; top: number; height: number; hidden?: boolean };
  mobile?: boolean; // 모바일: 아래에서 올라오는 시트 (2026-11-02 사장님: 옆에 붙는 모양은 모바일에 좋다)
}) {
  const groups = useMemo(() => groupsOf(detail), [detail]);
  const defaultGroup = useMemo(() => {
    const yearAgo = new Date(Date.now() - 365 * DAY).toISOString().slice(0, 10);
    return [...groups].sort((a, b) =>
      b.sales.filter((t) => t.d >= yearAgo).length - a.sales.filter((t) => t.d >= yearAgo).length || b.sales.length - a.sales.length || b.rents.length - a.rents.length,
    )[0]?.label || "";
  }, [groups]);
  const [mode, setMode] = useState<Mode>("sale");
  const [label, setLabel] = useState(defaultGroup);
  const [sheet, setSheet] = useState(false);
  // 모바일 뒤로가기 = 단지 창만 닫기 (2026-11-03 사장님: 뉴스 메인으로 넘어가지 않게) — 열 때 기록 한 칸, 닫을 때 그 칸을 되돌린다
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!mobile) return;
    if (!window.history.state?.aptDetail) window.history.pushState({ ...(window.history.state || {}), aptDetail: 1 }, "");
    // 지도 화면의 뒤로가기 처리(목록·공실 닫기)보다 먼저 받아서 단지 창만 닫는다
    // 단, 위에 덮은 공실 목록·상세에서 돌아와 이 창의 자리에 닿은 것이면 그냥 둔다 — 목록만 닫히고 단지 정보가 남게 (2026-11-03 사장님)
    const onPop = (e: PopStateEvent) => { if ((e.state as { aptDetail?: number } | null)?.aptDetail) return; e.stopImmediatePropagation(); closeRef.current(); };
    window.addEventListener("popstate", onPop, true);
    return () => window.removeEventListener("popstate", onPop, true);
  }, [mobile]);
  const close = mobile ? () => { if (window.history.state?.aptDetail) window.history.back(); else onClose(); } : onClose;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]); // eslint-disable-line react-hooks/exhaustive-deps
  const headRef = useRef<HTMLDivElement>(null);
  const [headH, setHeadH] = useState(112);
  useEffect(() => { if (headRef.current) setHeadH(headRef.current.offsetHeight); }, [sheet]);
  const [more, setMore] = useState(false);
  useEffect(() => {
    setLabel(defaultGroup);
    setMode(detail.kind === "villa" && !groups.find((x) => x.label === defaultGroup)?.sales.length ? "lease" : "sale");
    setMore(false); setSheet(false);
  }, [detail.id, defaultGroup]); // eslint-disable-line react-hooks/exhaustive-deps
  const villa = detail.kind === "villa";

  const g = groups.find((x) => x.label === label) || groups[0];
  const salePoints = (g?.sales || []).map((t) => ({ d: t.d, v: t.p }));
  const jeonsePoints = (g?.rents || []).filter((r) => !r.m).map((r) => ({ d: r.d, v: r.dep }));
  const points = mode === "sale" ? salePoints : jeonsePoints;
  // 평균 기간 — 3·6·12개월, 고른 것은 기억한다 (다른 단지를 열어도 같게)
  const [avgMonths, setAvgMonthsState] = useState(3);
  useEffect(() => { try { const v = Number(localStorage.getItem("gs-apt-avg-months")); if ([3, 6, 12].includes(v)) setAvgMonthsState(v); } catch { /* */ } }, []);
  const setAvgMonths = (v: number) => { setAvgMonthsState(v); try { localStorage.setItem("gs-apt-avg-months", String(v)); } catch { /* */ } };
  const avg = monthAvg(points, avgMonths);
  const latestMonthly = mode === "lease" ? (g?.rents || []).find((r) => r.m) : undefined;
  // 최고가 거래 한 건에 [최고] 표시 (2026-11-02 사장님) — 매매는 거래가, 전월세는 전세 보증금 기준
  const topSale = Math.max(0, ...(g?.sales || []).map((t) => t.p));
  const topJeonse = Math.max(0, ...(g?.rents || []).filter((r) => !r.m).map((r) => r.dep));
  let topMarked = false;
  const markTop = (isTop: boolean) => (isTop && !topMarked ? (topMarked = true) : false);
  // NEW — 1주일 안에 새로 들어온 거래만 (들어온 날 s 가 적힌 거래, aptMapShared.isNewDeal)
  const isNew = (x: { d: string; s?: string }) => isNewDeal(x);
  const rows = mode === "sale"
    ? (g?.sales || []).map((t) => ({ d: t.d, f: t.f, price: fullPrice(t.p), kind: "", top: markTop(t.p === topSale), fresh: isNew(t) }))
    : (g?.rents || []).map((r) => ({ d: r.d, f: r.f, price: leasePrice(r), kind: r.m ? "월세" : "전세", top: markTop(!r.m && r.dep === topJeonse), fresh: isNew(r) }));

  // 빌라 전세가율 — 같은 평형, 최근 1년 (둘 다 있을 때만. 없으면 보이지 않는다)
  const jeonseRate = useMemo(() => {
    if (!villa || !g) return null;
    const yearAgo = new Date(Date.now() - 365 * DAY).toISOString().slice(0, 10);
    const s1 = g.sales.filter((t) => t.d >= yearAgo).map((t) => t.p), l1 = g.rents.filter((x) => !x.m && x.d >= yearAgo).map((x) => x.dep);
    if (!s1.length || !l1.length) return null;
    const sale = Math.round(s1.reduce((a, b) => a + b, 0) / s1.length), lease = Math.round(l1.reduce((a, b) => a + b, 0) / l1.length);
    return { sale, lease, rate: Math.round((lease / sale) * 100) };
  }, [villa, g]);
  const [guess, setGuess] = useState<number | null>(null);
  useEffect(() => { setGuess(null); }, [detail.id, label, mode]);
  const expected = guess ?? avg?.avg ?? 0;
  const fee = expected ? brokerFee(mode === "sale" ? "sale" : "lease", expected) : null;

  const info = detail.info;
  const built = info?.useAprDay && /^\d{6}/.test(info.useAprDay) ? info.useAprDay : detail.build_year ? String(detail.build_year) : "";
  const builtYear = Number(built.slice(0, 4)) || 0;
  const builtText = built ? `${built.slice(0, 4)}년${built.length >= 6 ? ` ${Number(built.slice(4, 6))}월` : ""}${builtYear ? ` (${new Date().getFullYear() - builtYear + 1}년차)` : ""}` : "-";
  const address = `${LAWD_NAMES[detail.lawd_cd] || ""} ${detail.dong} ${detail.jibun}`.trim();
  const perHome = info?.parking && info?.households ? Math.round((info.parking / info.households) * 100) / 100 : null;

  const chip: React.CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "space-between", gap: 6, height: 40, padding: "0 12px", borderRadius: 8, background: "rgba(255,255,255,.16)", color: "#fff", border: "none", fontSize: 15, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", overflow: "hidden" };
  const sectionStyle: React.CSSProperties = { background: "#fff", marginBottom: 10 };
  const h3: React.CSSProperties = { fontSize: 16, fontWeight: 800, margin: 0, padding: "18px 20px 10px" };

  return (
    // PC — 왼쪽 목록 자리에 (지도는 어둡게 하지 않는다, 2026-11-02 사장님: 호갱노노처럼) · 모바일 — 아래 시트 + 뒤를 어둡게. Esc 로 닫는다
    <div onClick={side || flat ? undefined : close} style={flat ? { display: "flex", justifyContent: "center" } : side ? { position: "fixed", left: side.left, top: side.top, height: side.height, width: 420, zIndex: 1002, display: side.hidden ? "none" : "flex" } : { position: mobile ? "fixed" : "absolute", inset: 0, zIndex: mobile ? 9000 : 1002, background: "rgba(17,24,39,.45)", display: "flex", alignItems: mobile ? "flex-end" : "center", justifyContent: "center", padding: mobile ? 0 : 24 }}>
    <div data-gs-apt-panel="" onClick={(e) => e.stopPropagation()} style={{ ["--apt-accent" as string]: villa ? VILLA_ROSE : detail.kind === "offi" ? OFFI_GREEN : BRAND, ["--apt-soft" as string]: villa ? "#fdf2f8" : detail.kind === "offi" ? "#ecfdf5" : "#eef3ff", position: "relative", width: mobile || side ? "100%" : flat ? 1000 : 600, maxWidth: "100%", height: flat ? "auto" : "100%", maxHeight: mobile || side || flat ? undefined : 860, borderRadius: mobile || side ? 0 : 16, overflow: flat ? "visible" : "hidden", background: "#f3f4f6", boxShadow: side ? "4px 0 16px rgba(0,0,0,.14)" : "0 18px 50px rgba(0,0,0,.35)", display: "flex", flexDirection: "column", fontSize: 14, color: "#1f2937" }}>
      {/* 머리 */}
      <div ref={headRef} style={{ background: ACC, padding: "14px 16px 14px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#fff" }}>
          {side && <button onClick={onClose} aria-label="목록으로" title="공실 목록으로" style={{ border: "none", background: "none", color: "#fff", fontSize: 26, cursor: "pointer", lineHeight: 1, padding: "0 4px 0 0" }}>‹</button>}
          <div style={{ flex: 1, fontSize: 19, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {(detail.kind === "offi" || villa) && <span style={{ fontSize: 12, fontWeight: 700, background: "rgba(255,255,255,.22)", borderRadius: 6, padding: "2px 7px", marginRight: 8, verticalAlign: "middle" }}>{villa ? detail.house_type || "빌라" : "오피스텔"}</span>}
            {detail.dong} {detail.name}
          </div>
{!flat && <button onClick={close} aria-label="닫기" style={{ border: "none", background: "none", color: "#fff", fontSize: 24, cursor: "pointer", lineHeight: 1 }}>✕</button>}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "0.9fr 1.5fr 0.6fr", gap: 8, marginTop: 12 }}>
          <button style={chip} onClick={() => setMode(mode === "sale" ? "lease" : "sale")}>{mode === "sale" ? "매매" : "전월세"} <span style={{ fontSize: 11 }}>⇄</span></button>
          <button style={chip} onClick={() => setSheet(!sheet)}>{g?.label || "-"} <span style={{ fontSize: 11 }}>{sheet ? "▲" : "▼"}</span></button>
          <div style={{ ...chip, cursor: "default", justifyContent: "center", fontSize: 13 }}>{mode === "sale" ? g?.sales.length || 0 : g?.rents.length || 0}건</div>
        </div>
      </div>

      <div style={flat ? {} : { flex: 1, overflowY: "auto" }}>
        {/* 대본 작성 › 단지/시세 [공실열람에서 고르기]로 연 창이면 — 이 단지를 골라 보낸다 (2026-11-03 사장님) */}
        <ScriptPickBar detail={detail} />
        {/* 단지 한 줄 */}
        <div style={{ ...sectionStyle, padding: "16px 20px" }}>
          <div style={{ fontSize: 16, fontWeight: 800 }}>{address}</div>
          {villa ? (
            <div style={{ color: "#4b5563", marginTop: 6 }}>{detail.house_type || "연립·다세대"} <span style={{ color: "#d1d5db" }}>|</span> {builtText}</div>
          ) : (<>
          <div style={{ color: "#4b5563", marginTop: 6 }}>
            {info?.households ? `${info.households.toLocaleString("ko-KR")}${detail.kind === "offi" ? "호" : "세대"}` : detail.kind === "offi" ? "호수 -" : "세대수 -"} <span style={{ color: "#d1d5db" }}>|</span> {builtText}
          </div>
          <div style={{ color: "#4b5563", marginTop: 2 }}>
            용적률 {info?.vlRat ? `${Math.round(info.vlRat)}%` : "-"} <span style={{ color: "#d1d5db" }}>|</span> 건폐율 {info?.bcRat ? `${Math.round(info.bcRat)}%` : "-"}
          </div>
          </>)}
        </div>

        {/* 시세 */}
        {part !== "trades" && <div style={sectionStyle}>
          <div style={{ display: "flex", alignItems: "center", padding: "16px 20px 0" }}>
            <div style={{ display: "flex", background: "#f3f4f6", borderRadius: 8, padding: 3 }}>
              {(["sale", "lease"] as Mode[]).map((m) => (
                <button key={m} onClick={() => setMode(m)} style={{ border: "none", borderRadius: 6, padding: "6px 16px", fontSize: 14, fontWeight: 700, cursor: "pointer", background: mode === m ? ACC : "transparent", color: mode === m ? "#fff" : SUB }}>
                  {m === "sale" ? "매매" : "전월세"}
                </button>
              ))}
            </div>
            <div style={{ flex: 1 }} />
            <button onClick={() => setSheet(true)} style={{ border: `1.5px solid ${ACC}`, background: "#fff", color: ACC, borderRadius: 6, padding: "6px 12px", fontSize: 14, fontWeight: 800, cursor: "pointer" }}>{g?.label} ▾</button>
          </div>
          <div style={{ padding: "16px 20px 4px", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ flex: 1, color: ACC, fontWeight: 600 }}>최근 실거래 기준 {avgMonths === 12 ? "1년" : `${avgMonths}개월`} 평균{mode === "lease" ? " (전세)" : ""}</span>
            <span style={{ display: "inline-flex", border: `1px solid ${ACC}`, borderRadius: 6, overflow: "hidden" }}>
              {[3, 6, 12].map((m) => (
                <button key={m} type="button" onClick={() => setAvgMonths(m)} aria-pressed={avgMonths === m}
                  style={{ border: 0, padding: "3px 9px", fontSize: 12, fontWeight: 800, cursor: "pointer", background: avgMonths === m ? ACC : "#fff", color: avgMonths === m ? "#fff" : ACC }}>
                  {m === 12 ? "1년" : `${m}개월`}
                </button>
              ))}
            </span>
          </div>
          <div style={{ padding: "0 20px", fontSize: 30, fontWeight: 900, color: ACC, letterSpacing: "-0.5px" }}>
            {avg ? fullPrice(avg.avg) : "거래 없음"}
          </div>
          {avg && <div style={{ padding: "4px 20px 0", color: SUB, fontSize: 12 }}>{dot(avg.last)} 기준 · {avg.count}건 평균</div>}
          {villa && jeonseRate && (
            <div style={{ margin: "10px 20px 0", padding: "10px 12px", borderRadius: 8, background: ACC_SOFT, display: "flex", alignItems: "center", gap: 8 }}>
              <b style={{ color: ACC }}>전세가율 {jeonseRate.rate}%</b>
              <span style={{ color: SUB, fontSize: 12 }}>최근 1년 이 평형 매매 평균 {fullPrice(jeonseRate.sale)} · 전세 평균 {fullPrice(jeonseRate.lease)}</span>
            </div>
          )}
          {latestMonthly && <div style={{ padding: "4px 20px 0", color: SUB, fontSize: 12 }}>최근 월세 {dot(latestMonthly.d)} · 보증금/월세 {leasePrice(latestMonthly)}</div>}
          <div style={{ padding: "14px 20px 4px", fontWeight: 700 }}>최근 3년</div>
          <div style={{ padding: "0 20px 16px" }}><PriceChart points={points} /></div>
        </div>}

        {/* 거래 목록 */}
        {part !== "chart" && <div style={sectionStyle}>
          <h3 style={h3}>실거래 내역</h3>
          <div style={{ display: "grid", gridTemplateColumns: "80px 1fr auto", gap: 10, padding: "8px 20px", color: SUB, fontSize: 12, borderBottom: `1px solid ${LINE}` }}>
            <span>계약일</span><span>전용면적</span><span style={{ textAlign: "right" }}>가격</span>
          </div>
          {rows.slice(0, more ? 60 : 12).map((r, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "80px 1fr auto", gap: 10, padding: "13px 20px", borderBottom: `1px solid #f3f4f6`, alignItems: "center" }}>
              <span style={{ color: "#4b5563" }}>{dot(r.d)}{r.fresh && <NewTag />}</span>
              <span>{g?.label}{r.kind ? <span style={{ marginLeft: 6, fontSize: 11, color: r.kind === "전세" ? ACC : "#b45309" }}>{r.kind}</span> : null}</span>
              <span style={{ textAlign: "right", position: "relative" }}>
                {r.top && <span style={{ position: "absolute", top: -9, right: -7, fontSize: 8.5, fontWeight: 700, color: "#fff", background: TOP_RED, borderRadius: 3, padding: "0 3px", lineHeight: "13px" }}>최고</span>}
                <b>{r.price}</b><div style={{ color: SUB, fontSize: 11 }}>{r.f}층</div>
              </span>
            </div>
          ))}
          {!rows.length && <div style={{ padding: "18px 20px", color: SUB }}>최근 3년 거래가 없습니다</div>}
          {rows.length > 12 && (
            <button onClick={() => setMore(!more)} style={{ width: "100%", border: "none", background: "#fff", color: ACC, fontWeight: 700, padding: 14, cursor: "pointer" }}>
              {more ? "접기" : `더보기 (${Math.min(rows.length, 60) - 12}건)`}
            </button>
          )}
        </div>}

        {/* 로드뷰 */}
        {!flat && <div style={sectionStyle}>
          <h3 style={h3}>로드뷰</h3>
          {Number.isFinite(detail.lat) && <Roadview lat={detail.lat} lng={detail.lng} />}
        </div>}

        {/* 주변 인프라 — 공실등록 화면과 같은 카카오 검색 (2026-11-02 사장님) */}
        {!flat && Number.isFinite(detail.lat) && <NearbyInfra lat={detail.lat} lng={detail.lng} sectionStyle={sectionStyle} h3={h3} />}

        {/* 단지 정보 (공동주택 기본·상세정보는 의무관리 단지만 있다 — 없는 칸은 줄을 뺀다) */}
        {!villa && !part && <div style={sectionStyle}>
          <h3 style={h3}>단지 정보</h3>
          <div style={{ padding: "0 20px 6px" }}>
            {([
              [detail.kind === "offi" ? "호수" : "세대수", info?.households ? `${info.households.toLocaleString("ko-KR")}${detail.kind === "offi" ? "호" : "세대"}` : ""],
              ["동수", info?.dongs ? `${info.dongs}개동` : ""],
              ["준공", builtText !== "-" ? builtText : ""],
              ["층수", info?.topFloor ? `최고 ${info.topFloor}층${info.baseFloor ? ` · 지하 ${info.baseFloor}층` : ""}` : ""],
              ["용적률", info?.vlRat ? `${Math.round(info.vlRat)}%` : ""],
              ["건폐율", info?.bcRat ? `${Math.round(info.bcRat)}%` : ""],
              ["구조", info?.hall || ""],
              ["난방", info?.heating || ""],
              ["주차", info?.parking ? `${info.parking.toLocaleString("ko-KR")}대${perHome ? ` (세대당 ${perHome}대)` : ""}${info.parkingGround !== null && info.parkingGround !== undefined ? ` · 지상 ${info.parkingGround}대` : ""}` : ""],
              ["승강기", info?.elevators ? `${info.elevators}대` : ""],
              ["CCTV", info?.cctv ? `${info.cctv}대` : ""],
              ["전기차 충전", info?.evChargers ? `${info.evChargers}대` : ""],
              ["관리방식", info?.manage || ""],
              ["분양형태", info?.saleType || ""],
              ["시공사", info?.builder || ""],
            ] as [string, string][]).filter(([, v]) => v).map(([k, v]) => (
              <div key={k} style={{ display: "grid", gridTemplateColumns: "92px 1fr", padding: "9px 0", borderBottom: "1px solid #f3f4f6" }}>
                <span style={{ color: SUB }}>{k}</span>
                <span style={{ fontWeight: 600 }}>
                  {v}
                  {(detail.agent_fields || []).includes(AGENT_KEY[k] || "") && <span style={{ marginLeft: 6, fontSize: 10.5, fontWeight: 600, color: "#15803d", background: "#ecfdf5", borderRadius: 4, padding: "1px 5px" }}>공인중개사 제공</span>}
                </span>
              </div>
            ))}
          </div>
          {(info?.subway || info?.busTime || info?.school || info?.convenience || info?.welfare) && (
            <>
              <div style={{ padding: "14px 20px 6px", fontWeight: 800 }}>교통 · 생활</div>
              <div style={{ padding: "0 20px 16px" }}>
                {([
                  ["지하철", [info?.subway, info?.subwayTime ? `도보 ${info.subwayTime}` : ""].filter(Boolean).join(" · ")],
                  ["버스정류장", info?.busTime ? `도보 ${info.busTime}` : ""],
                  ["교육시설", info?.school || ""],
                  ["편의시설", info?.convenience || ""],
                  ["복지시설", info?.welfare || ""],
                ] as [string, string][]).filter(([, v]) => v).map(([k, v]) => (
                  <div key={k} style={{ display: "grid", gridTemplateColumns: "92px 1fr", padding: "9px 0", borderBottom: "1px solid #f3f4f6", lineHeight: 1.5 }}>
                    <span style={{ color: SUB }}>{k}</span><span>{v}</span>
                  </div>
                ))}
              </div>
            </>
          )}
          {!info && <div style={{ padding: "0 20px 16px", color: SUB }}>단지 정보를 모으는 중입니다.</div>}
          <InfoRequest detail={detail} groups={groups} />
          <div style={{ height: 10 }} />
        </div>}

        {/* 지도 (2026-11-02 사장님: 로드뷰와 나눠 맨 아래에) */}
        {!flat && <div style={sectionStyle}>
          <h3 style={h3}>지도</h3>
          {Number.isFinite(detail.lat) && <MiniMap lat={detail.lat} lng={detail.lng} name={detail.name} />}
        </div>}

        {/* 거래비용 — 맨 아래 (2026-11-02 사장님) */}
        {!flat && <div style={sectionStyle}>
          <h3 style={h3}>거래비용</h3>
          <div style={{ padding: "0 20px 18px" }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <span style={{ flex: 1, color: "#4b5563" }}>예상 거래가{mode === "lease" ? " (전세)" : ""}</span>
              <b style={{ fontSize: 16 }}>{expected ? fullPrice(expected) : "-"}</b>
            </div>
            {avg && (
              <input type="range" min={Math.round(avg.avg * 0.5)} max={Math.round(avg.avg * 1.5)} step={100} value={expected}
                onChange={(e) => setGuess(Number(e.target.value))} style={{ width: "100%", marginTop: 10, accentColor: ACC }} />
            )}
            <div style={{ display: "flex", alignItems: "center", marginTop: 10 }}>
              <span style={{ flex: 1, color: "#4b5563" }}>중개보수 상한 {fee ? `${Math.round(fee.rate * 1000) / 10}%` : ""}</span>
              <b style={{ fontSize: 16 }}>{fee ? `${fee.fee.toLocaleString("ko-KR")}만 원` : "-"}</b>
            </div>
            <div style={{ color: "#9ca3af", fontSize: 11, marginTop: 6 }}>주택 법정 상한 요율 기준 · 부가세 별도{fee?.cap ? ` · 한도 ${fee.cap}만 원` : ""}</div>
          </div>
        </div>}

        {!part && <div style={{ padding: "4px 20px 24px", color: "#9ca3af", fontSize: 11, lineHeight: 1.6 }}>
          {villa ? "국토교통부 연립다세대" : "국토교통부 아파트·오피스텔"} 매매·전월세 실거래가(최근 3년, 해제 거래 제외) · 건축물대장 · 공동주택 기본정보 기준. "공인중개사 제공"은 부동산 회원이 알려 주고 공실뉴스가 확인한 값입니다.
          면적은 국토부 신고 전용면적 그대로입니다. 공급면적은 건축물대장(전유+주거공용)으로 확인된 것만 참고로 적습니다. 실거래는 계약 후 30일 안에 신고되어 최근 거래가 늦게 잡힐 수 있습니다.
        </div>}
      </div>

      {/* 맨 아래 고정 — [이 단지 공실 n개 보기] [무료 공실등록] (2026-11-02 사장님: 단지가 보이면 부동산에게 공실등록 유도) */}
      {!villa && !flat && <BottomActions detail={detail} vacancyCount={vacancyCount} onShowVacancies={onShowVacancies} onShowAuctions={onShowAuctions} mobile={mobile} stack={Boolean(side)} />}

      {/* 평형 고르기 — 머리 바로 아래로 펼친다 (2026-11-02 사장님: 아래에서 올라오는 창 말고) */}
      {sheet && (
        <div onClick={() => setSheet(false)} style={{ position: "absolute", left: 0, right: 0, bottom: 0, top: headH, background: "rgba(0,0,0,.25)", zIndex: 2 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", width: "100%", maxHeight: "70%", overflowY: "auto", boxShadow: "0 8px 20px rgba(0,0,0,.18)", borderRadius: "0 0 14px 14px" }}>
            {groups.map((x) => {
              const lastSale = x.sales[0], lastJeonse = x.rents.find((r) => !r.m), lastAny = x.rents[0];
              const on = x.label === g?.label;
              return (
                <button key={x.label} onClick={() => { setLabel(x.label); setSheet(false); }}
                  style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 20, width: "100%", textAlign: "left", border: "none", borderTop: `1px solid ${LINE}`, background: on ? ACC_SOFT : "#fff", padding: "18px 24px", cursor: "pointer", alignItems: "center" }}>
                  <span>
                    <b style={{ fontSize: 16, color: on ? ACC : "#111827", whiteSpace: "nowrap" }}>{x.label}</b>
                    {(mode === "sale" ? x.sales : x.rents).some(isNew) && <NewTag />}
                    <div style={{ fontSize: 11, color: SUB }}>{x.units ? `${x.units}${detail.kind === "offi" ? "호" : "세대"}` : ""}</div>
                  </span>
                  <span style={{ fontSize: 12, color: on ? ACC : "#4b5563", lineHeight: 1.6 }}>
                    {/* 공급면적은 확인된 것만 참고로 (건축물대장 계산 · 중개사 제공) */}
                    {x.s ? <>공급 {Math.round(x.s)}㎡ <span style={{ color: "#9ca3af", fontSize: 10.5 }}>{(detail.agent_supply_keys || []).some((k) => Math.abs(Number(k) - x.lo) <= 0.6) ? "중개사 제공" : "건축물대장"}</span></> : null}
                    {/* 부동산이 알려 준 계약면적 · 방/욕실 (2026-11-02) */}
                    {(() => {
                      const pick = (m: unknown) => {
                        if (!m || typeof m !== "object") return null;
                        const k = Object.keys(m as Record<string, unknown>).find((e) => Number(e) >= x.lo - 0.6 && Number(e) <= x.hi + 0.6);
                        return k ? String((m as Record<string, unknown>)[k]) : null;
                      };
                      const info = detail.info as Record<string, unknown> | null;
                      const contract = pick(info?.contract), rooms = pick(info?.rooms);
                      if (!contract && !rooms) return null;
                      return (
                        <div style={{ marginTop: 2 }}>
                          {[contract ? `계약 ${Math.round(Number(contract))}㎡` : "", rooms ? `방 ${rooms.split("/")[0]} · 욕실 ${rooms.split("/")[1] || "-"}` : ""].filter(Boolean).join(" · ")}
                          <span style={{ color: "#15803d", fontSize: 10.5 }}> 중개사 제공</span>
                        </div>
                      );
                    })()}
                  </span>
                  <span style={{ textAlign: "right", fontSize: 13, color: on ? ACC : "#111827" }}>
                    {mode === "sale"
                      ? lastSale ? <><span style={{ color: SUB, fontSize: 11 }}>매매 </span><b>{fullPrice(lastSale.p)}</b></> : <span style={{ color: SUB }}>매매 없음</span>
                      : lastJeonse ? <><span style={{ color: SUB, fontSize: 11 }}>전세 </span><b>{fullPrice(lastJeonse.dep)}</b></> : lastAny ? <><span style={{ color: SUB, fontSize: 11 }}>월세 </span><b>{leasePrice(lastAny)}</b></> : <span style={{ color: SUB }}>전월세 없음</span>}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
