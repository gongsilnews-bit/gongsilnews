"use client";
/**
 * 공실열람 지도 [아파트 시세] (2026-11-02 사장님: 호갱노노처럼 지도 위에 단지 시세)
 *  - 오른쪽 [아파트 시세] 단추로 켜고 끈다. 처음엔 꺼 둔다 (공실열람의 주인공은 공실).
 *  - 지도를 충분히 확대했을 때(레벨 5 이하)만 단지마다 "34평 / 30.9억" — 대표 평형의 최근 실거래가.
 *  - 단지를 누르면 왼쪽에 상세 창 (AptDetailPanel).
 *  - 오피스텔도 같은 모양, 색만 초록 (2026-11-02). 그 단지 공실 수를 시세 표시 오른쪽 위에 동그라미로 붙인다 — 누르면 왼쪽 목록이 그 공실만.
 *    붙은 공실은 지도에 따로 그리지 않는다 (2026-11-02 사장님: 겹치면 복잡). 주소 공개 설정과 관계없이 넣는다 (사장님).
 *  - 자료는 /api/apt-prices (매일 밤 /api/cron/apt-prices 가 국토부 실거래가로 채운다)
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LAWD_NAMES, areaLabel, isNewDeal, shortPrice } from "@/utils/aptMapShared";
import { addRecent } from "./stars";
import { mapLayerBox, mapLayerRow, mapSquareButton, mapSquareSub } from "./mapSquareButton";
import AptDetailPanel, { BRAND, type AptDetail, VILLA_ROSE } from "./AptDetailPanel";
import RegionPanel, { type AggLevel, type RegionAgg } from "./RegionPanel";

type Complex = { news?: number; t0?: { d: string } | null; rent0?: { a: number; dep: number; m: number; d: string } | null; id: string; kind?: "apt" | "offi" | "villa"; name: string; lat: number; lng: number; rep_area: number | null; rep_supply: number | null; rep_price: number | null; rep_date: string | null; trade_count: number };

// 축척 제한은 없앴다 (2026-11-02 사장님: 모든 화면에서) — 복잡함은 겹치는 표시 거르기로 푼다 (draw)
const VAC = "#4b89ff"; // 공실 묶음 동그라미와 같은 색
const NEWS_ORANGE = "#ff8e15"; // 우리동네뉴스(NewsLayer) 주황
const OFFI = "#0f766e"; // 오피스텔 — 아파트(파랑)와 구분

/** 단지 상자 — 앱(공실뉴스 앱 kakaoMapHtml)과 같은 모양 (2026-11-20 사장님: 촌스럽다, 앱처럼 깔끔하게 라인 형식으로)
 *  평소 = 흰 바탕 + 종류 색 얇은 선 + 흰 꼬리 · 고른 단지 = 종류 색으로 칠하고 글자 흰색 */
const paint = (el: HTMLElement, picked: boolean) => {
  const line = el.dataset.color || BRAND;
  const box = el.children[0] as HTMLElement | undefined;
  const tip = el.children[1] as HTMLElement | undefined;
  const area = box?.firstElementChild as HTMLElement | undefined, price = box?.lastElementChild as HTMLElement | undefined;
  if (box) { box.style.background = picked ? line : "#fff"; box.style.borderColor = line; }
  if (area) area.style.color = picked ? "rgba(255,255,255,.85)" : "#6b7280";
  if (price) price.style.color = picked ? "#fff" : el.dataset.sale ? line : "#4b5563";
  if (tip) tip.style.borderTopColor = picked ? line : "#fff";
  if (el.parentElement) el.parentElement.style.zIndex = picked ? "5" : "1";
};

/** 공실 상세주소 맨 앞 지번 — "276-1 101동 1203호" → "276-1" */
const jibunOf = (addr: string) => {
  const m = String(addr || "").trim().match(/^(산\s*)?(\d+)(?:\s*-\s*(\d+))?/);
  return m ? `${m[1] ? "산" : ""}${m[2]}${m[3] && m[3] !== "0" ? `-${m[3]}` : ""}` : "";
};
const meters = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const dy = (a.lat - b.lat) * 111000, dx = (a.lng - b.lng) * 88000; // 서울 위도에서 경도 1도 ≈ 88km
  return Math.sqrt(dx * dx + dy * dy);
};
/** 공실 종류 — "아파트·오피스텔" 묶음이라 세부 종류로 가른다. 아파트 공실은 아파트 단지에, 오피스텔 공실은 오피스텔에 (2026-11-02).
 *  분양권은 넣지 않는다. 세부 종류가 비어 있는 예전 공실은 이름이 맞을 때만 (종류 상관없이) */
const vacancyKind = (v: any): "apt" | "offi" | "unknown" | null => {
  if (v.trade_type === "경매" || !/아파트|오피스텔/.test(String(v.property_type || ""))) return null;
  const sub = String(v.sub_category || "").trim();
  if (!sub) return "unknown";
  return sub === "아파트" ? "apt" : sub === "오피스텔" ? "offi" : null;
};

/** 이름 비교 — 띄어쓰기·괄호·"아파트"·"오피스텔"·동 이름을 떼고, 한쪽이 다른 쪽을 품거나 한글 3자 이상이 겹치면 같은 단지로 본다 */
const normName = (name: string, dong: string) =>
  String(name || "").replace(/\(.*?\)/g, "").replace(/아파트|오피스텔|apt/gi, "").replace(dong.replace(/동$/, ""), "").replace(/[\s·.,\-]/g, "").toLowerCase();
/** 2 = 이름이 같다(한쪽이 다른 쪽을 품음) · 1 = 한글 3자 이상 겹침 · 0 = 다름 */
/* 마우스를 올리면 뜨는 카드 — 이름 · 주소 · 시세 흐름 (PC만, 2026-11-02 사장님: 호갱노노처럼) */
type Peek = { name: string; kind: string; addr: string; series: { m: string; p: number }[] };
/** 지역(시·도·구·동) 평균 — 앱과 같은 서버 자료 /api/apt-prices?agg= (전국 한 번에, 종류·단계마다 한 번만 받는다) */
const aggCache = new Map<string, Promise<RegionAgg[] | null>>();
function regionAgg(level: AggLevel, kind: "apt" | "offi" | "villa"): Promise<RegionAgg[] | null> {
  const k = `${level}:${kind}`;
  if (!aggCache.has(k)) {
    aggCache.set(k, fetch(`/api/apt-prices?agg=${level}&kind=${kind}`).then((r) => r.json())
      .then((r) => (r?.success && Array.isArray(r.regions) ? (r.regions as RegionAgg[]) : null))
      .catch(() => null)
      .then((v) => { if (!v) aggCache.delete(k); return v; })); // 실패는 기억하지 않는다 — 다음에 다시
  }
  return aggCache.get(k)!;
}
const esc = (t: string) => t.replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch] as string);
function sparkSvg(series: Peek["series"], color: string) {
  if (series.length < 3) return ""; // 거래가 적으면 흐름은 빼고 이름·주소만
  const W = 76, H = 26, ps = series.map((x) => x.p);
  const lo = Math.min(...ps), hi = Math.max(...ps), span = hi - lo || 1;
  const t0 = Date.parse(series[0].m + "-01"), t1 = Date.parse(series[series.length - 1].m + "-01"), ts = t1 - t0 || 1;
  const pts = series.map((x) => [((Date.parse(x.m + "-01") - t0) / ts) * W, H - 2 - ((x.p - lo) / span) * (H - 4)]);
  const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  // 선이 왼쪽부터 그려지고 아래 면은 뒤따라 차오른다 (2026-11-02 사장님: 애니메이션 되면서)
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="flex-shrink:0;display:block">` +
    `<polygon points="0,${H} ${line} ${W},${H}" fill="${color}" opacity="0"><animate attributeName="opacity" from="0" to=".18" begin=".25s" dur=".45s" fill="freeze"/></polygon>` +
    `<polyline points="${line}" fill="none" stroke="${color}" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"><animate attributeName="stroke-dashoffset" from="1" to="0" dur=".7s" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines=".3 .7 .4 1"/></polyline></svg>`;
}
function peekHtml(pk: Peek, color: string) {
  return `<div style="background:#fff;border:1px solid #d6d9de;border-radius:6px;box-shadow:0 4px 14px rgba(0,0,0,.18);padding:10px 14px 11px;font-family:inherit;white-space:nowrap;pointer-events:none;animation:aptPeekIn .18s ease-out">` +
    `<style>@keyframes aptPeekIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}</style>` +
    `<div style="display:flex;align-items:center;gap:14px"><span style="font-size:15.5px;font-weight:800;color:#111">${esc(pk.name)}</span>${sparkSvg(pk.series, color)}</div>` +
    `<div style="font-size:13px;color:#444;margin-top:3px">${esc(pk.addr)}</div></div>`;
}

function nameScore(a: string, b: string, dong: string) {
  const x = normName(a, dong), y = normName(b, dong);
  if (x.length < 2 || y.length < 2) return 0;
  if (x.includes(y) || y.includes(x)) return 2;
  for (let i = 0; i + 3 <= x.length; i++) if (/^[가-힣]{3}$/.test(x.slice(i, i + 3)) && y.includes(x.slice(i, i + 3))) return 1;
  return 0;
}
const sameName = (a: string, b: string, dong: string) => nameScore(a, b, dong) > 0;
/** 거리 한도 — 큰 단지는 공실 핀(동 건물)과 단지 대표 지번이 수백 m 떨어진다 (2026-11-02 래미안 리더스원).
 *  이름이 같으면 같은 동 안 400m, 비슷하면 150m, 영문 이름이라 비교가 안 되면 50m */
const RADIUS = { same: 400, near: 150, latin: 50 };

/** 공실 → 단지 (같은 종류끼리): ① 같은 법정동 + 같은 지번 ② 같은 동 + 본번 ③ 50m 안 가장 가까운 단지 중 이름이 맞는 곳
 *  (영문 이름 "ACROHILLS논현"처럼 비교가 안 되는 공실은 종류가 정해져 있으면 50m 안 가장 가까운 단지) */
function matchVacancies(complexes: Complex[], vacancies: any[]) {
  const out = new Map<string, string[]>();
  const parsed = complexes.map((c) => {
    const [, dong = "", jibun = ""] = c.id.replace(/^o:/, "").split(":");
    return { c, kind: c.kind || "apt", dong, jibun, bun: jibun.split("-")[0] };
  });
  for (const v of vacancies) {
    const kind = vacancyKind(v);
    if (!kind) continue;
    const pool = kind === "unknown" ? parsed : parsed.filter((x) => x.kind === kind);
    const vj = jibunOf(v.detail_addr), vdong = String(v.dong || "").trim(), vname = String(v.building_name || "");
    // ⓪ 공실등록 때 저장한 단지 번호가 있으면 그대로 (2026-11-02) — 없거나 지도에 없는 번호면 아래 순서로
    let hit = v.complex_id ? pool.find((x) => x.c.id === v.complex_id) : undefined;
    if (!hit && vj) hit = pool.find((x) => x.dong === vdong && x.jibun === vj);
    if (!hit && vj) hit = pool.find((x) => x.dong === vdong && x.bun === vj.split("-")[0]);
    if (hit && kind === "unknown" && !sameName(vname, hit.c.name, vdong)) hit = undefined;
    if (!hit && Number.isFinite(Number(v.lat)) && Number.isFinite(Number(v.lng))) {
      const latin = /[A-Za-z]{3,}/.test(vname);
      let best = Infinity;
      for (const x of pool) {
        const d = meters({ lat: Number(v.lat), lng: Number(v.lng) }, x.c);
        const score = nameScore(vname, x.c.name, vdong);
        const limit = score === 2 && x.dong === vdong ? RADIUS.same : score >= 1 ? RADIUS.near : kind !== "unknown" && latin ? RADIUS.latin : 0;
        if (d < limit && d < best) { best = d; hit = x; }
      }
    }
    if (hit) out.set(hit.c.id, [...(out.get(hit.c.id) || []), String(v.id)]);
  }
  return out;
}

export default function AptPriceLayer({ onlyKind, villaTab = false, mobile = false, autoShow = false, buttonSlot, kakaoMapRef, mapLoaded, vacancies, kinds = { apt: true, offi: true }, onShowVacancies, onShowAuctions, onHideVacancies, mapPick }: {
  /** 지도에서 공실 표시를 누름 (PC) — 그 단지 공실이면 창을 접고 [‹ 단지 정보], 다른 공실이면 창을 닫는다 */
  mapPick?: { ids: string[]; n: number } | null;
  /** [아파트]·[오피스텔]·[빌라/주택] 칸 — 그 종류 시세만 ([시세]는 고르기 없이 바로 켜고 끔, 2026-11-21 사장님) */
  onlyKind?: "apt" | "offi" | "villa";
  kakaoMapRef: React.MutableRefObject<any>;
  kinds?: { apt: boolean; offi: boolean };
  /** [빌라·주택] 탭 — 빌라(연립·다세대) 실거래가를 처음부터 켠다 (2026-11-03 사장님: 같은 지도에) */
  villaTab?: boolean;
  mobile?: boolean; // 모바일 공실열람 — 상세 창을 아래 시트로
  autoShow?: boolean; // 처음부터 켜 둘 탭인지 ([전체] · [아파트·오피스텔])
  buttonSlot?: HTMLElement | null; // 검색 줄 [내 위치] 옆 자리 (2026-11-02 사장님) — 없으면 지도 오른쪽
  mapLoaded: boolean;
  vacancies: any[];
  onShowVacancies: (ids: string[]) => void;
  onShowAuctions?: (ids: string[]) => void;
  onHideVacancies: (ids: Set<string>) => void;
}) {
  // [아파트 시세] · [오피스텔 시세] 단추를 따로 (2026-11-02 사장님). 처음엔 둘 다 꺼 둔다.
  // 2차 카테고리를 바꾸면 그에 맞게 단추가 켜진다 — 그 뒤 단추로 따로 끄고 켤 수 있다
  const [show, setShow] = useState({ apt: false, offi: false, villa: false });
  const kindsRef = useRef(show);
  kindsRef.current = show;
  const on = show.apt || show.offi || show.villa;
  // [전체] · [아파트·오피스텔] 탭은 처음부터 실거래가를 켠다 (2026-11-02 사장님: 꼭 같이 떠 있어야 함).
  // 다른 탭(빌라·상가 등)으로 가면 끈다 — 그 탭에서도 단추로 켤 수 있다. 2차 카테고리를 바꾸면 그에 맞게
  useEffect(() => {
    // 단지 창을 연 채로 탭을 바꾼 경우(경매 보기 등)는 끄지 않는다
    if (!autoShow && pickedRef.current) return;
    setShow(autoShow ? { apt: kinds.apt, offi: kinds.offi, villa: false } : { apt: false, offi: false, villa: villaTab });
  }, [autoShow, kinds.apt, kinds.offi, villaTab]);
  const vacanciesRef = useRef(vacancies);
  vacanciesRef.current = vacancies;
  const showRef = useRef(onShowVacancies);
  showRef.current = onShowVacancies;
  const hideRef = useRef(onHideVacancies);
  hideRef.current = onHideVacancies;
  const [vacancyMap, setVacancyMap] = useState<Map<string, string[]>>(new Map());
  const [tooFar, setTooFar] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [detail, setDetail] = useState<AptDetail | null>(null);
  const [detailError, setDetailError] = useState("");
  const [pickedId, setPickedId] = useState<string | null>(null);
  const overlaysRef = useRef<any[]>([]);
  const elsRef = useRef<Map<string, HTMLElement>>(new Map());
  const pickedRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const peekCache = useRef<Map<string, Peek | null>>(new Map());
  const peekOverlay = useRef<any>(null);
  const hoverRef = useRef<string | null>(null);
  const hidePeek = () => { hoverRef.current = null; peekOverlay.current?.setMap(null); peekOverlay.current = null; };
  const showPeek = (c: Complex, color: string) => {
    const pk = peekCache.current.get(c.id);
    const map = kakaoMapRef.current, kakao = (window as any).kakao;
    if (!pk || hoverRef.current !== c.id || !map || !kakao?.maps) return;
    if (peekOverlay.current && peekOverlay.current.__id === c.id) return; // 이미 떠 있으면 다시 만들지 않는다
    peekOverlay.current?.setMap(null);
    const box = document.createElement("div");
    // 카드가 마우스를 가로채면 가격 표시에서 마우스가 "떠난" 것으로 되어 깜빡인다 (2026-11-02 사장님: 파르르 떤다) — 카드는 마우스를 받지 않게
    box.style.cssText = "transform:translateY(-58px);pointer-events:none";
    box.innerHTML = peekHtml(pk, color);
    const ov = new kakao.maps.CustomOverlay({ position: new kakao.maps.LatLng(c.lat, c.lng), content: box, yAnchor: 1, zIndex: 50, clickable: false });
    ov.__id = c.id;
    peekOverlay.current = ov;
    ov.setMap(map);
    if (box.parentElement) box.parentElement.style.pointerEvents = "none";
  };

  const clear = () => {
    hidePeek();
    overlaysRef.current.forEach((o) => o.setMap(null));
    overlaysRef.current = [];
    elsRef.current.clear();
  };

  const pick = useCallback((id: string | null) => {
    const before = pickedRef.current && elsRef.current.get(pickedRef.current);
    if (before) paint(before, false);
    pickedRef.current = id;
    setPickedId(id);
    const now = id && elsRef.current.get(id);
    if (now) paint(now, true);
  }, []);

  const openDetail = useCallback(async (id: string) => {
    // 그 단지 공실 목록을 보는 중이면 — 단지를 누르면 단지 정보를 다시 (닫지 않는다, 11-04 사장님)
    if (listOpenRef.current) {
      setListOpen(false);
      if (pickedRef.current === id) return;
    }
    if (pickedRef.current === id) { // 한 번 더 누르면 닫는다 (2026-11-02 사장님)
      setDetail(null); setDetailError(""); pick(null);
      return;
    }
    pick(id);
    setDetailError("");
    const res = await fetch(`/api/apt-prices?id=${encodeURIComponent(id)}`).then((r) => r.json()).catch(() => null);
    if (pickedRef.current !== id) return;
    if (res?.success) setDetail(res.complex);
    else { setDetail(null); setDetailError(res?.error || "실거래가를 불러오지 못했습니다."); }
  }, [pick]);

  const close = useCallback(() => { setDetail(null); setDetailError(""); setListOpen(false); pick(null); }, [pick]);
  const closeRef = useRef(close);
  closeRef.current = close;
  // 단지 창이 열리면 — MY관심 [최근 본 단지]에 (이 기기, stars.addRecent)
  useEffect(() => {
    if (!detail) return;
    const t = [...(detail.trades || [])].sort((p, q) => q.d.localeCompare(p.d))[0];
    addRecent("apt", { id: detail.id, kind: detail.kind || "apt", name: detail.name, place: `${(LAWD_NAMES[detail.lawd_cd] || "").replace(/^\S+\s/, "")} ${detail.dong || ""}`.trim(),
      repArea: t?.a ?? null, repPrice: t?.p ?? null, repDate: t?.d ?? null, tradeCount: (detail.trades || []).length, newTrades: 0, newVacancies: 0, newArticles: 0 });
  }, [detail]);
  // 부동산(사무소·묶음)을 누르면 — 왼쪽을 덮고 있는 단지 창을 닫아 부동산 목록이 보이게 (11-04 사장님)
  //  단지 창 [입점부동산]에서 연 사무소(fromApt)는 닫지 않고 [공실 n]처럼 잠깐 숨긴다 — 뒤로가기(‹) = 보던 단지 창 (2026-11-19 사장님)
  const agencyFromApt = useRef(false);
  useEffect(() => {
    const shut = (e: Event) => {
      const d = (e as CustomEvent).detail as { fromApt?: boolean } | null;
      if (!d) return;
      if (d.fromApt && pickedRef.current) {
        // 모바일은 [공실 n]처럼 단지 창 위에 목록 화면이 덮인다 — 닫지만 않으면 뒤로가기 = 단지 창 (2026-11-19 사장님)
        if (mobile) return;
        agencyFromApt.current = true; setListOpen(true); return;
      }
      close();
    };
    // 사무소 보기를 ✕ 로 닫으면 숨겨 둔 단지 창도 닫는다
    const end = () => { if (agencyFromApt.current) { agencyFromApt.current = false; close(); } };
    window.addEventListener("gs-agency-open", shut);
    window.addEventListener("gs-agency-group", shut);
    window.addEventListener("gs-agency-close", end);
    return () => { window.removeEventListener("gs-agency-open", shut); window.removeEventListener("gs-agency-group", shut); window.removeEventListener("gs-agency-close", end); };
  }, [close, mobile]);

  // 주소 ?apt=<단지 id> — 그 단지로 지도를 옮기고 단지 창을 연다 (대본·기사 글쓰기의 "공실열람 단지 시세" 캡처, 2026-11-03 사장님)
  const aptParamDone = useRef(false);
  // 이미 이 화면에 있을 때 알림 [새 실거래] 등을 누르면 — "gs-apt-open" 으로 받는다 (2026-11-05 사장님: 알림 누르면 그 단지로)
  const [aptReq, setAptReq] = useState<string | null>(null);
  useEffect(() => {
    const on = (e: Event) => { const id = (e as CustomEvent).detail?.id; if (id) setAptReq(String(id)); };
    window.addEventListener("gs-apt-open", on);
    return () => window.removeEventListener("gs-apt-open", on);
  }, []);
  useEffect(() => {
    if (!mapLoaded || mobile) return;
    const id = aptReq || (aptParamDone.current ? null : new URLSearchParams(window.location.search).get("apt"));
    if (!id) return;
    if (!on) { setShow({ apt: true, offi: true, villa: true }); return; } // 어느 탭이든 실거래가를 켜고 다시
    aptParamDone.current = true;
    setAptReq(null);
    (async () => {
      const res = await fetch(`/api/apt-prices?id=${encodeURIComponent(id)}`).then((r) => r.json()).catch(() => null);
      const c = res?.success ? res.complex : null;
      const kakao = (window as any).kakao;
      // MY관심 탭에서 지도 탭으로 막 바뀐 경우 — 지도가 다시 보인 뒤 크기를 다시 잡고 옮긴다
      await new Promise((r) => setTimeout(r, 250));
      const map = kakaoMapRef.current;
      if (c && Number.isFinite(c.lat) && map && kakao?.maps) {
        map.relayout?.();
        map.setLevel(3);
        map.setCenter(new kakao.maps.LatLng(c.lat, c.lng));
      }
      if (pickedRef.current !== id) void openDetail(id);
    })();
  }, [mapLoaded, on, mobile, openDetail, kakaoMapRef, aptReq]); // eslint-disable-line react-hooks/exhaustive-deps

  // 검색 핀 — 다른 단지 창을 열면 핀도 없앤다 (검색한 그 단지 창이면 그대로)
  const pinCx = useRef<string | null>(null);
  const pinRemove = useRef<() => void>(() => {});
  useEffect(() => { if (detail?.id && pinCx.current && detail.id !== pinCx.current) pinRemove.current(); }, [detail?.id]);
  // 지도 주소 검색으로 고른 자리 — 남색 주소 말풍선 + 퍼지는 점, 그 번지 단지가 있으면 단지 창 (2026-11-05 사장님)
  // 다른 곳을 검색하거나 지도를 누르면 핀은 없어진다
  useEffect(() => {
    if (!mapLoaded) return;
    const kakao = (window as any).kakao;
    let pin: any = null;
    const removePin = () => { if (pin) { pin.setMap(null); pin = null; } pinCx.current = null; };
    pinRemove.current = removePin;
    // 지도를 끌거나 다른 공실·뉴스·부동산을 고르면 검색 핀도 없앤다 (2026-11-23 사장님)
    const PIN_OFF = ["gs-map-moved", "gs-vacancy-pick", "gs-news-select", "gs-agency-open", "gs-agency-group"];
    PIN_OFF.forEach((t) => window.addEventListener(t, removePin));
    if (!document.getElementById("gs-map-pin-style")) {
      const st = document.createElement("style");
      st.id = "gs-map-pin-style";
      st.textContent = "@keyframes gsPinPulse{0%{transform:translate(-50%,-50%) scale(.4);opacity:.75}100%{transform:translate(-50%,-50%) scale(2.6);opacity:0}}";
      document.head.appendChild(st);
    }
    const onPin = async (e: Event) => {
      const map = kakaoMapRef.current;
      if (!map || !kakao?.maps) return;
      const { lat, lng, label, dong, jibun } = (e as CustomEvent).detail || {};
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      removePin();
      const el = document.createElement("div");
      el.style.cssText = "position:relative;display:flex;flex-direction:column;align-items:center;pointer-events:none;font-family:inherit;transform:translateY(8px)"; // 점 가운데가 정확한 자리에
      const esc = String(label || "").replace(/[<>&]/g, "");
      el.innerHTML =
        `<div style="background:#1a2e5a;color:#fff;border-radius:10px;padding:7px 12px;font-size:14px;font-weight:800;white-space:nowrap;box-shadow:0 4px 12px rgba(26,46,90,.35)">📍 ${esc}</div>` +
        `<div style="width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:8px solid #1a2e5a;margin-top:-1px"></div>` +
        `<div style="position:relative;width:16px;height:16px;margin-top:3px">` +
        [0, 0.6, 1.2].map((d) => `<span style="position:absolute;left:50%;top:50%;width:16px;height:16px;border-radius:50%;background:#2563eb;animation:gsPinPulse 1.6s ease-out ${d}s 2 both"></span>`).join("") +
        `<span style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:12px;height:12px;border-radius:50%;background:#2563eb;border:2.5px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35)"></span></div>`;
      pin = new kakao.maps.CustomOverlay({ position: new kakao.maps.LatLng(lat, lng), content: el, yAnchor: 1, xAnchor: 0.5, zIndex: 20 });
      pin.setMap(map);
      // 그 번지 단지
      const q = new URLSearchParams({ at: `${lat},${lng}`, ...(dong ? { dong } : {}), ...(jibun ? { jibun } : {}) });
      const r = await fetch(`/api/apt-prices?${q}`).then((x) => x.json()).catch(() => null);
      const c = r?.success ? r.complex : null;
      if (!c?.id) return;
      pinCx.current = c.id;
      const k = c.kind === "offi" ? "offi" : c.kind === "villa" ? "villa" : "apt";
      setShow((s) => (s[k] ? s : { ...s, [k]: true }));
      if (pickedRef.current !== c.id) void openDetail(c.id);
    };
    window.addEventListener("gs-map-pin", onPin);
    let map: any = null;
    const attachClick = () => { map = kakaoMapRef.current; if (map && kakao?.maps) kakao.maps.event.addListener(map, "click", removePin); };
    attachClick();
    return () => {
      window.removeEventListener("gs-map-pin", onPin);
      PIN_OFF.forEach((t) => window.removeEventListener(t, removePin));
      if (map && kakao?.maps) kakao.maps.event.removeListener(map, "click", removePin);
      removePin();
    };
  }, [mapLoaded, kakaoMapRef, openDetail]); // eslint-disable-line react-hooks/exhaustive-deps

  // PC — 단지 창은 왼쪽 목록 자리에 (2026-11-02 사장님: 호갱노노처럼). 목록(aside[data-gongsil-side])의 화면 위치를 따라간다
  const [side, setSide] = useState<{ left: number; top: number; height: number } | null>(null);
  const [listOpen, setListOpen] = useState(false); // [이 단지 공실 보기] — 창을 잠깐 숨기고 목록 위에 [‹ 단지 정보] 줄
  // PC — 그 단지 공실을 보는 동안은 뒤로가기 한 칸을 만든다. 뒤로가기 = 보던 단지 정보 (2026-11-03 사장님: 위 [‹ 단지 정보] 줄은 없앰)
  //  목록 제목 앞 [‹](GongsilSidebar)도 뒤로가기와 같다 — "gongsil-apt-list" 알림으로 켜고 끈다
  const listPushed = useRef(false);
  const ignorePop = useRef(0);
  const listOpenRef = useRef(listOpen);
  listOpenRef.current = listOpen;
  useEffect(() => {
    if (mobile) return;
    if (listOpen && !listPushed.current) {
      // gongsilView "list" — 그 목록에서 공실을 열면 GongsilClient 가 뒤로가기 칸을 하나 더 만든다 → 뒤로가기 = 공실 닫기 → 한 번 더 = 단지 창 (2026-11-19)
      window.history.pushState({ ...(window.history.state || {}), gongsilView: "list", aptList: 1 }, "");
      listPushed.current = true;
    } else if (!listOpen && listPushed.current) {
      listPushed.current = false; // 지도를 움직였거나 다른 공실을 눌러 끝남 — 만든 한 칸을 조용히 되돌린다
      if (window.history.state?.aptList) { ignorePop.current++; window.history.back(); }
    }
    window.dispatchEvent(new CustomEvent("gongsil-apt-list", { detail: listOpen }));
    // 입점부동산에서 연 사무소 보기 — 단지 창으로 돌아오면 왼쪽 사무소 보기를 닫는다
    if (!listOpen && agencyFromApt.current) {
      agencyFromApt.current = false;
      window.dispatchEvent(new CustomEvent("gs-agency-open", { detail: null }));
    }
  }, [listOpen, mobile]);
  useEffect(() => {
    if (mobile) return;
    const onPop = (e: PopStateEvent) => {
      if (ignorePop.current) { ignorePop.current--; e.stopImmediatePropagation(); return; }
      if (listPushed.current && !(e.state as { aptList?: number } | null)?.aptList) {
        e.stopImmediatePropagation();
        listPushed.current = false;
        setListOpen(false);
      }
    };
    window.addEventListener("popstate", onPop, true);
    return () => window.removeEventListener("popstate", onPop, true);
  }, [mobile]);
  // 그 단지 공실을 보다가 지도를 끌거나 확대·축소하면 단지 보기를 끝낸다 — 목록은 그 지역 공실로 (KakaoMapView)
  useEffect(() => {
    if (mobile || !listOpen) return;
    let map: any = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const end = () => { if (listOpenRef.current) close(); };
    const attach = () => {
      const kakao = (window as any).kakao;
      if (!kakaoMapRef.current || !kakao?.maps) { timer = setTimeout(attach, 200); return; }
      map = kakaoMapRef.current;
      kakao.maps.event.addListener(map, "dragstart", end);
      kakao.maps.event.addListener(map, "zoom_start", end);
    };
    attach();
    return () => {
      if (timer) clearTimeout(timer);
      const kakao = (window as any).kakao;
      if (map && kakao?.maps) { kakao.maps.event.removeListener(map, "dragstart", end); kakao.maps.event.removeListener(map, "zoom_start", end); }
    };
  }, [mobile, listOpen, kakaoMapRef, close]);
  // 지도에서 공실을 누르면 단지 창이 비켜 준다 (2026-11-03 사장님: 물건이 안 보임)
  useEffect(() => {
    if (!mapPick || mobile || !detail) return;
    const mine = new Set([...(vacancyMap.get(detail.id) || []), ...(detail.vacancy_ids || [])].map(String));
    if (mapPick.ids.some((id) => mine.has(String(id)))) setListOpen(true);
    else close();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapPick?.n]);
  // 지역 분석 창 (2026-11-23 사장님: 동·구·시도 말풍선을 누르면 앱처럼 그 지역 분석) — 아래 단계 평균도 같이 받아 둔다
  const [region, setRegion] = useState<{ level: AggLevel; r: RegionAgg; kind: "apt" | "offi" | "villa" } | null>(null);
  const [subRegions, setSubRegions] = useState<RegionAgg[] | null>(null);
  const backRegion = useRef<{ level: AggLevel; r: RegionAgg; kind: "apt" | "offi" | "villa" } | null>(null); // 지역 분석에서 연 단지 — 닫으면 그 지역 분석으로
  useEffect(() => {
    if (!region || region.level === "dong") { setSubRegions(null); return; }
    let alive = true;
    setSubRegions(null);
    regionAgg(region.level === "sido" ? "gu" : "dong", region.kind).then((l) => { if (alive) setSubRegions(l || []); });
    return () => { alive = false; };
  }, [region?.level, region?.r.key, region?.kind]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (detail) setRegion(null); }, [detail]); // 단지 창이 열리면 지역 창은 닫는다
  useEffect(() => { if (!on) setRegion(null); }, [on]);
  useEffect(() => {
    if (mobile || (!detail && !region)) return;
    const measure = () => {
      const el = document.querySelector("aside[data-gongsil-side]") as HTMLElement | null;
      if (!el) return setSide(null);
      const r = el.getBoundingClientRect();
      setSide((v) => (v && v.left === r.left && v.top === r.top && v.height === r.height ? v : { left: r.left, top: r.top, height: r.height }));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [mobile, detail, Boolean(region)]); // eslint-disable-line react-hooks/exhaustive-deps
  // 창이 지도 왼쪽을 조금(40px) 덮는다 — 고른 단지가 가리면 지도를 옮긴다
  useEffect(() => {
    if (mobile || !detail || !side) return;
    const map = kakaoMapRef.current, kakao = (window as any).kakao;
    if (!map || !kakao?.maps || detail.lat == null) return;
    const pt = map.getProjection().containerPointFromCoords(new kakao.maps.LatLng(detail.lat, detail.lng));
    if (pt.x < 110) map.panBy(pt.x - 160, 0);
  }, [detail?.id, side]); // eslint-disable-line react-hooks/exhaustive-deps

  const draw = useCallback(async () => {
    const map = kakaoMapRef.current;
    const kakao = (window as any).kakao;
    if (!map || !kakao?.maps) return;
    // 모든 축척에서 보인다 (2026-11-02 사장님) — 겹치는 표시는 아래에서 거래 많은 단지만 남긴다
    if (!kindsRef.current.apt && !kindsRef.current.offi && !kindsRef.current.villa) {
      clear();
      setTooFar(true);
      setVacancyMap(new Map());
      hideRef.current(new Set());
      return;
    }
    setTooFar(false);
    const b = map.getBounds();
    const sw = b.getSouthWest(), ne = b.getNorthEast();
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    // 넓게 보면 단지 대신 지역 평균 — 앱과 같게 (2026-11-23 사장님: "어플과 같이 동별 구별 정보")
    //  축척 1~2km(7·8) 동 · 4~8km(9·10) 구 · 16km 이상(11~) 시·도. 500m 이하(6 이하)는 지금처럼 단지
    const zone: AggLevel | null = map.getLevel() >= 11 ? "sido" : map.getLevel() >= 9 ? "gu" : map.getLevel() >= 7 ? "dong" : null;
    if (zone) {
      const kind = (["apt", "offi", "villa"] as const).find((k) => kindsRef.current[k])!;
      setLoading(true);
      const list = await regionAgg(zone, kind);
      if (ac.signal.aborted) return;
      setLoading(false);
      setLoadError(list ? "" : "지역 시세를 불러오지 못했습니다. 잠시 뒤 지도를 다시 움직여 보세요.");
      clear();
      setVacancyMap(new Map());
      hideRef.current(new Set()); // 공실은 원래 표시대로
      const color = kind === "offi" ? OFFI : kind === "villa" ? VILLA_ROSE : BRAND;
      const padLat = (ne.getLat() - sw.getLat()) * 0.1, padLng = (ne.getLng() - sw.getLng()) * 0.1;
      for (const x of list || []) {
        if (x.lat < sw.getLat() - padLat || x.lat > ne.getLat() + padLat || x.lng < sw.getLng() - padLng || x.lng > ne.getLng() + padLng) continue;
        const el = document.createElement("div");
        el.style.cssText = "cursor:pointer;user-select:none;text-align:center;font-family:inherit;filter:drop-shadow(0 1px 2px rgba(0,0,0,.22))";
        el.title = `${x.name} 평균 ${shortPrice(x.price)} · 단지 ${x.n}곳 — 누르면 ${zone === "dong" ? "동네" : "지역"} 분석`;
        el.innerHTML =
          `<div style="background:#fff;border:1.5px solid ${color};border-radius:7px;padding:${mobile ? "3px 7px 4px" : "4px 9px 5px"};line-height:1.2;white-space:nowrap">` +
          `<div style="font-size:${mobile ? 10 : 11.5}px;font-weight:700;color:#374151">${esc(x.name)}</div>` +
          `<div style="font-size:${mobile ? 12.5 : 14}px;font-weight:800;letter-spacing:-.3px;color:${color}">${shortPrice(x.price)}</div></div>` +
          `<div style="width:0;height:0;margin:-1px auto 0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:6px solid #fff"></div>`;
        const pos = new kakao.maps.LatLng(x.lat, x.lng);
        // 누르면 지역 분석 창 — 지도는 그대로 (11-23 사장님: "누르면 가까이가 아니라" 앱처럼 분석)
        el.addEventListener("click", (e) => { e.stopPropagation(); hidePeek(); closeRef.current(); setRegion({ level: zone, r: x, kind }); });
        const overlay = new kakao.maps.CustomOverlay({ position: pos, content: el, yAnchor: 1, zIndex: 1, clickable: true });
        el.addEventListener("mouseenter", () => overlay.setZIndex(6));
        el.addEventListener("mouseleave", () => overlay.setZIndex(1));
        overlay.setMap(map);
        overlaysRef.current.push(overlay);
      }
      return;
    }
    setLoading(true);
    const want = (["apt", "offi", "villa"] as const).filter((k) => kindsRef.current[k]).join(",");
    const res = await fetch(`/api/apt-prices?sw=${sw.getLat()},${sw.getLng()}&ne=${ne.getLat()},${ne.getLng()}&kinds=${want}`, { signal: ac.signal })
      .then((r) => r.json()).catch(() => null);
    if (ac.signal.aborted) return;
    setLoading(false);
    setLoadError(res?.success ? "" : "실거래가를 불러오지 못했습니다. 잠시 뒤 지도를 다시 움직여 보세요."); // 조용히 비우지 않는다 (11-02)
    clear();
    const level = map.getLevel();
    // 오피스텔을 감춘 축척에서는 오피스텔 공실도 단지에 붙이지 않고 원래 공실 표시로 둔다
    // 겹치지 않게 — 거래 많은 단지부터 화면 자리를 잡고, 이미 잡힌 자리와 겹치면 뺀다 (축소하면 큰 단지만 남는다)
    const proj = map.getProjection();
    const taken: { x: number; y: number }[] = [];
    // 앱처럼 살짝 겹치는 것은 두고, 절반 넘게 덮일 때만 뺀다 (상자 크기의 55%·60%, 2026-11-20)
    const BOX_W = mobile ? 34 : 38, BOX_H = mobile ? 20 : 22;
    // 매매가 없으면 최근 전월세로 (전세 "전세 2.3억" · 월세 "월세 100") — 빌라, 그리고 분양권으로만 팔린 새 아파트 (11-04, 모양은 매매와 똑같이)
    const priceOf = (c: Complex) => (c.rep_price && c.rep_area ? { a: c.rep_area, label: shortPrice(c.rep_price) }
      : c.rent0 && c.rent0.a ? { a: c.rent0.a, label: c.rent0.m ? `월세 ${c.rent0.m.toLocaleString("ko-KR")}` : `전세 ${shortPrice(c.rent0.dep)}` } : null);
    const shown = ((res?.complexes || []) as Complex[])
      .filter((c) => priceOf(c) && kindsRef.current[c.kind === "offi" ? "offi" : c.kind === "villa" ? "villa" : "apt"])
      .sort((a, b) => b.trade_count - a.trade_count)
      .filter((c) => {
        // 많이 확대하면(축척 30m 이하, level 1·2) 숨기지 않고 다 — 붙은 건물은 끝까지 겹쳐 안 보이던 것 (2026-11-05 사장님)
        if (level <= 2) return true;
        const pt = proj.containerPointFromCoords(new kakao.maps.LatLng(c.lat, c.lng));
        if (taken.some((t) => Math.abs(t.x - pt.x) < BOX_W && Math.abs(t.y - pt.y) < BOX_H)) return false;
        taken.push({ x: pt.x, y: pt.y });
        return true;
      });
    const matched = matchVacancies(shown, vacanciesRef.current || []);
    setVacancyMap(matched);
    hideRef.current(new Set([...matched.values()].flat()));
    for (const c of shown) {
      const pr = priceOf(c);
      if (!pr) continue;
      const ids = matched.get(c.id) || [];
      const el = document.createElement("div");
      const color = c.kind === "offi" ? OFFI : c.kind === "villa" ? VILLA_ROSE : BRAND;
      el.dataset.color = color;
      if (mobile) el.title = `${c.name}${c.kind === "offi" ? " (오피스텔)" : c.kind === "villa" ? " (빌라)" : ""} · 최근 실거래 ${c.rep_date ? c.rep_date.replace(/-/g, ".") : ""}`;
      else {
        // 0.15초 넘게 올려 두면 그 단지만 받아 온다 (한 번 받은 것은 기억)
        el.addEventListener("mouseenter", () => {
          hoverRef.current = c.id;
          if (peekCache.current.has(c.id)) { showPeek(c, color); return; }
          setTimeout(async () => {
            if (hoverRef.current !== c.id || peekCache.current.has(c.id)) return showPeek(c, color);
            const r = await fetch(`/api/apt-prices?peek=${encodeURIComponent(c.id)}`).then((x) => x.json()).catch(() => null);
            peekCache.current.set(c.id, r?.success ? { name: r.name, kind: r.kind, addr: r.addr, series: r.series || [] } : null);
            showPeek(c, color);
          }, 150);
        });
        el.addEventListener("mouseleave", (e) => { if (el.contains(e.relatedTarget as Node | null)) return; hidePeek(); });
      }
      el.style.cssText = "position:relative;cursor:pointer;user-select:none;text-align:center;font-family:inherit;filter:drop-shadow(0 1px 2px rgba(0,0,0,.22))";
      // 앱과 같은 작은 흰 말풍선 — 얇은 종류 색 선 · 면적은 작은 회색 · 가격은 종류 색 굵게(전월세만 있으면 회색) · 흰 꼬리 (2026-11-20 사장님)
      //  아파트(파랑)·오피스텔(초록)·빌라(자주) 모두 같은 모양, 색만 다르다. PC는 글자를 한 치수 크게
      const sale = Boolean(c.rep_price && c.rep_area);
      if (sale) el.dataset.sale = "1";
      const fa = mobile ? 9.5 : 10.5, fp = (mobile ? 12 : 13.5) - (pr.label.length > 7 ? 1 : 0);
      el.innerHTML =
        `<div style="background:#fff;border:1px solid ${color};border-radius:6px;padding:${mobile ? "2px 6px 3px" : "3px 7px 4px"};line-height:1.15;white-space:nowrap">` +
        `<div style="font-size:${fa}px;font-weight:600;color:#6b7280">${areaLabel(pr.a)}</div>` +
        `<div style="font-size:${fp}px;font-weight:800;letter-spacing:-.3px;color:${sale ? color : "#4b5563"}">${pr.label}</div></div>` +
        `<div style="width:0;height:0;margin:-1px auto 0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:6px solid #fff"></div>`;
      // 새로 신고된 거래가 들어온 단지 — 1주일 동안 오른쪽 위에 NEW (2026-11-04 사장님). 공실 수 동그라미가 있으면 그 왼쪽
      // 배지에 보이는 거래(매매, 없으면 전월세)가 지난 7일 안에 계약됐으면 NEW
      const shownDeal = c.rep_price && c.rep_area ? c.t0 : c.rent0;
      if (isNewDeal(shownDeal)) {
        const nb = document.createElement("div");
        nb.textContent = "NEW";
        nb.title = `최근 계약 ${String(shownDeal!.d).replace(/-/g, ".")}`;
        // 앱처럼 왼쪽 위 작은 빨간 NEW (공실 수와 부딪치지 않는다)
        nb.style.cssText = `position:absolute;top:-7px;left:-7px;padding:0 3px;height:12px;border-radius:6px;background:#ef4444;color:#fff;font-size:8px;font-weight:900;line-height:12px;pointer-events:none`;
        el.appendChild(nb);
      }
      if (ids.length) {
        const badge = document.createElement("div");
        badge.textContent = String(ids.length);
        badge.title = `이 단지 공실 ${ids.length}개 보기`;
        // 앱처럼 작은 파란 숫자 (2026-11-20)
        badge.style.cssText = `position:absolute;top:-8px;right:-9px;min-width:${mobile ? 17 : 19}px;height:${mobile ? 17 : 19}px;padding:0 4px;box-sizing:border-box;border-radius:10px;background:${VAC};border:1.5px solid #fff;color:#fff;font-size:${mobile ? 10 : 11}px;font-weight:900;line-height:${mobile ? 14 : 16}px;text-align:center`;
        badge.addEventListener("click", (e) => {
          // 공실 수를 누르면 — 단지 창을 닫고 이 단지 공실만 (11-04 사장님)
          e.stopPropagation(); hidePeek(); closeRef.current();
          window.dispatchEvent(new CustomEvent("gs-vacancy-list"));
          showRef.current(ids);
        });
        el.appendChild(badge);
      }
      // 이 단지 뉴스 수 — 오른쪽 아래 주황 동그라미 (11-04 사장님). 누르면 왼쪽 목록에 그 뉴스 (단지 창 [뉴스]와 같다)
      if (c.news) {
        const nb2 = document.createElement("div");
        nb2.textContent = String(c.news);
        nb2.title = `이 단지 뉴스 ${c.news}개 보기`;
        nb2.style.cssText = `position:absolute;bottom:-1px;right:-9px;min-width:${mobile ? 17 : 19}px;height:${mobile ? 17 : 19}px;padding:0 4px;box-sizing:border-box;border-radius:10px;background:#fff;border:1.5px solid ${NEWS_ORANGE};color:${NEWS_ORANGE};font-size:${mobile ? 10 : 11}px;font-weight:900;line-height:${mobile ? 14 : 16}px;text-align:center`;
        nb2.addEventListener("click", async (e) => {
          // 바로 왼쪽 목록에 이 단지 뉴스 (단지 창을 거치지 않는다, 11-04 사장님 — 파란 공실 수와 같이)
          e.stopPropagation(); hidePeek(); closeRef.current();
          const r = await fetch(`/api/apt-prices?id=${encodeURIComponent(c.id)}`).then((x) => x.json()).catch(() => null);
          const list = r?.success ? r.complex?.news || [] : [];
          if (list.length) window.dispatchEvent(new CustomEvent("gs-news-select", { detail: list }));
          else openDetail(c.id);
        });
        el.appendChild(nb2);
      }
      el.addEventListener("click", (e) => { e.stopPropagation(); hidePeek(); openDetail(c.id); });
      const overlay = new kakao.maps.CustomOverlay({ position: new kakao.maps.LatLng(c.lat, c.lng), content: el, yAnchor: 1, zIndex: 1, clickable: true });
      // 겹쳐 있으면 마우스를 올린 것이 맨 앞으로
      el.addEventListener("mouseenter", () => overlay.setZIndex(6));
      el.addEventListener("mouseleave", () => overlay.setZIndex(c.id === pickedRef.current ? 5 : 1)); // 고른 단지는 앞에 둔 채로
      overlay.setMap(map);
      overlaysRef.current.push(overlay);
      elsRef.current.set(c.id, el);
      if (c.id === pickedRef.current) requestAnimationFrame(() => paint(el, true));
    }
  }, [kakaoMapRef, openDetail, mobile]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!on || !mapLoaded) return;
    // 처음 들어올 때는 이 효과가 부모(KakaoMapView)가 지도를 만들기 전에 돈다 — 지도가 생길 때까지 기다렸다 붙는다
    // (2026-11-02 사장님: [전체]로 들어와도 처음엔 실거래가가 안 뜨던 것)
    let map: any = null;
    let stopped = false;
    const listener = () => draw();
    const attach = () => {
      const kakao = (window as any).kakao;
      if (stopped) return;
      if (!kakaoMapRef.current || !kakao?.maps) { timer = setTimeout(attach, 200); return; }
      map = kakaoMapRef.current;
      kakao.maps.event.addListener(map, "idle", listener);
      draw();
    };
    let timer: ReturnType<typeof setTimeout> | undefined;
    attach();
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      const kakao = (window as any).kakao;
      if (map && kakao?.maps) kakao.maps.event.removeListener(map, "idle", listener);
      abortRef.current?.abort();
      clear();
      setTooFar(false);
      setLoading(false);
      setLoadError("");
      setVacancyMap(new Map());
      hideRef.current(new Set());
    };
  }, [on, mapLoaded, kakaoMapRef, draw]);

  // 단추·2차 카테고리를 바꾸면 바로 다시 그린다 — 지도를 움직이기 전까지 그대로이던 것 (11-02)
  useEffect(() => {
    if (on && mapLoaded) draw();
  }, [show.apt, show.offi, show.villa]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (k: "apt" | "offi" | "villa") => {
    setShow((v) => ({ ...v, [k]: !v[k] }));
    close();
  };
  // PC 는 지도 오른쪽 [시세 최근] 네모 하나 — 누르면 왼쪽으로 [아파트][오피스텔][빌라/주택] 고르기가 펼쳐진다
  //  (2026-11-21 사장님: 직방처럼 심플하게 → 시세를 누르면 종류를 고를 수 있게)
  const [menu, setMenu] = useState(false);
  const KIND_LABEL: Record<"apt" | "offi" | "villa", string> = { apt: "아파트", offi: "오피스텔", villa: "빌라/주택" };
  // 모바일은 "실거래가" 글자를 앞에 두고 [아파트][오피스텔] (2026-11-02 사장님)
  const buttons = !mobile ? (
    <div style={{ position: "relative" }}>
      <button type="button" title={onlyKind ? `${KIND_LABEL[onlyKind]} 최근 실거래 시세 켜기·끄기` : "단지별 최근 실거래 시세 — 종류 고르기"}
        onClick={() => { if (onlyKind) { setShow({ apt: false, offi: false, villa: false, [onlyKind]: !on }); close(); } else setMenu((m) => !m); }}
        style={mapSquareButton(on || (menu && !onlyKind), BRAND)}>
        {/* 아파트·오피스텔·빌라/주택 칸에선 그 종류 이름 + "실거래" (11-23 사장님), [전체] 칸만 시세·최근 */}
        {onlyKind
          ? <><span style={{ fontSize: KIND_LABEL[onlyKind].length >= 5 ? 11.5 : 13, letterSpacing: "-.4px" }}>{KIND_LABEL[onlyKind]}</span><span style={mapSquareSub(on, NEWS_ORANGE)}>실거래</span></>
          : <>시세<span style={mapSquareSub(on || menu, NEWS_ORANGE)}>최근</span></>}
      </button>
      {/* 고르기는 [전체] 등 여러 종류가 섞인 칸에서만 */}
      {menu && !onlyKind && (
        <div style={{ position: "absolute", right: 62, top: 0, height: 54, display: "flex", alignItems: "center", gap: 6, padding: "0 10px", background: "#fff", borderRadius: 10, boxShadow: "0 2px 10px rgba(0,0,0,.18)", whiteSpace: "nowrap" }}>
          {(["apt", "offi", "villa"] as const).map((k) => {
            const color = k === "offi" ? OFFI : k === "villa" ? VILLA_ROSE : BRAND;
            return (
              <button key={k} type="button" onClick={() => toggle(k)}
                style={{ height: 34, padding: "0 13px", borderRadius: 17, cursor: "pointer", fontSize: 14, fontWeight: 800, fontFamily: "inherit",
                  border: `1.5px solid ${show[k] ? color : "#e5e7eb"}`, background: show[k] ? color : "#fff", color: show[k] ? "#fff" : "#374151" }}>
                {show[k] ? "✓ " : ""}{KIND_LABEL[k]}
              </button>
            );
          })}
        </div>
      )}
    </div>
  ) : (
    // 모바일: [지도 표시] 창 안 체크 줄 — 앱과 같게 (2026-11-22 사장님: 줄 단추 대신 겹쳐 보기 아이콘을 누르면)
    <>
      {(["apt", "offi", "villa"] as const).map((k) => {
        const color = k === "offi" ? OFFI : k === "villa" ? VILLA_ROSE : BRAND;
        return (
          <button key={k} type="button" onClick={() => toggle(k)} style={mapLayerRow(show[k], color)}>
            <span style={mapLayerBox(show[k], color)}>{show[k] ? "✓" : ""}</span>
            {k === "offi" ? "오피스텔" : k === "villa" ? "빌라" : "아파트"} 실거래
          </button>
        );
      })}
    </>
  );

  return (
    <>
      {buttonSlot ? createPortal(buttons, buttonSlot) : <div style={{ position: "absolute", right: 14, top: "calc(30% + 48px)", zIndex: 1000, display: "grid", gap: 6 }}>{buttons}</div>}

      {on && (tooFar || loading || loadError) && (
        <div style={{ position: "absolute", left: "50%", bottom: 28, transform: "translateX(-50%)", zIndex: 1000, background: "rgba(17,24,39,.88)", color: "#fff", fontSize: 14, fontWeight: 600, padding: "10px 18px", borderRadius: 20, pointerEvents: "none" }}>
          {tooFar ? `지도를 더 확대하면 ${show.apt ? "아파트" : show.offi ? "오피스텔" : "빌라"} 실거래가가 보여요` : loading ? "실거래가 불러오는 중…" : loadError}
        </div>
      )}

      {on && detail && pickedId && (
        <AptDetailPanel
          mobile={mobile}
          side={!mobile && side ? { ...side, hidden: listOpen } : undefined}
          detail={detail}
          onClose={() => { close(); if (backRegion.current) { setRegion(backRegion.current); backRegion.current = null; } }}
          vacancyCount={[...new Set([...(vacancyMap.get(detail.id) || []), ...(detail.vacancy_ids || [])])].length}
          // 창은 그대로 두고 왼쪽 목록만 그 단지 공실로 (2026-11-02 사장님)
          onShowVacancies={() => { window.dispatchEvent(new CustomEvent("gs-vacancy-list")); onShowVacancies([...new Set([...(vacancyMap.get(detail.id) || []), ...(detail.vacancy_ids || [])])]); if (!mobile && side) setListOpen(true); }}
          onShowAuctions={onShowAuctions ? () => { onShowAuctions(detail.auction_ids || []); if (!mobile && side) setListOpen(true); } : undefined}
          // [뉴스 N] — 왼쪽 목록에 이 단지 기사 (GongsilSidebar 가 받는다)
          onShowNews={() => { window.dispatchEvent(new CustomEvent("gs-news-select", { detail: detail.news || [] })); if (!mobile && side) setListOpen(true); }}
        />
      )}
      {on && region && !detail && (
        <RegionPanel
          level={region.level}
          region={region.r}
          kind={region.kind}
          color={region.kind === "offi" ? OFFI : region.kind === "villa" ? VILLA_ROSE : BRAND}
          side={!mobile && side ? side : undefined}
          mobile={mobile}
          subRegions={subRegions}
          onClose={() => setRegion(null)}
          // 동별·구별 줄 — 그 지역 분석으로, 지도도 그 지역 말풍선이 보이는 크기로
          onRegion={(lv, r) => {
            setRegion({ level: lv, r, kind: region.kind });
            const map = kakaoMapRef.current, kakao = (window as any).kakao;
            if (map && kakao?.maps) { const p = new kakao.maps.LatLng(r.lat, r.lng); map.setCenter(p); map.setLevel(lv === "gu" ? 9 : 7, { anchor: p }); }
          }}
          // 단지를 누르면 — 지도를 그 단지로(단지 말풍선이 보이는 크기) + 단지 창. 단지 창을 닫으면 보던 지역 분석으로 (11-23 사장님)
          onComplex={(id, lat, lng) => {
            backRegion.current = region;
            setRegion(null);
            const map = kakaoMapRef.current, kakao = (window as any).kakao;
            // 가운데를 먼저 옮기고 그 점을 기준으로 확대 — 확대 먼저 하면 멀리서 확대되는 동안 가운데가 엉뚱한 곳(하남시)으로 갔다
            if (map && kakao?.maps && Number.isFinite(lat) && Number.isFinite(lng)) { const p = new kakao.maps.LatLng(lat, lng); map.setCenter(p); map.setLevel(4, { anchor: p }); }
            openDetail(id);
          }}
        />
      )}
      {on && detailError && (
        <div style={{ position: "absolute", left: 16, top: 16, zIndex: 1002, background: "#fff", borderRadius: 10, boxShadow: "0 4px 16px rgba(0,0,0,.2)", padding: "14px 18px", color: "#d93025", display: "flex", gap: 12 }}>
          {detailError}
          <button onClick={close} style={{ border: "none", background: "none", cursor: "pointer", fontSize: 16 }} aria-label="닫기">✕</button>
        </div>
      )}
    </>
  );
}
