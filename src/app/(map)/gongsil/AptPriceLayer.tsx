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
import { areaLabel, shortPrice } from "@/utils/aptMapShared";
import AptDetailPanel, { BRAND, type AptDetail } from "./AptDetailPanel";

type Complex = { id: string; kind?: "apt" | "offi"; name: string; lat: number; lng: number; rep_area: number | null; rep_supply: number | null; rep_price: number | null; rep_date: string | null; trade_count: number };

// 축척 제한은 없앴다 (2026-11-02 사장님: 모든 화면에서) — 복잡함은 겹치는 표시 거르기로 푼다 (draw)
const VAC = "#4b89ff"; // 공실 묶음 동그라미와 같은 색
const PICKED = "#f97316";
const OFFI = "#0f766e"; // 오피스텔 — 아파트(파랑)와 구분

/** 누른 단지는 주황 — 상자(0번)와 꼬리(1번)만 칠한다 (2번은 공실 동그라미) */
const paint = (el: HTMLElement, picked: boolean) => {
  const color = picked ? PICKED : el.dataset.color || BRAND;
  const box = el.children[0] as HTMLElement | undefined;
  const tip = el.children[1] as HTMLElement | undefined;
  if (box) box.style.background = color;
  if (tip) tip.style.borderTopColor = color;
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

export default function AptPriceLayer({ autoShow = false, buttonSlot, kakaoMapRef, mapLoaded, vacancies, kinds = { apt: true, offi: true }, onShowVacancies, onShowAuctions, onHideVacancies }: {
  kakaoMapRef: React.MutableRefObject<any>;
  kinds?: { apt: boolean; offi: boolean };
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
  const [show, setShow] = useState({ apt: false, offi: false });
  const kindsRef = useRef(show);
  kindsRef.current = show;
  const on = show.apt || show.offi;
  // [전체] · [아파트·오피스텔] 탭은 처음부터 실거래가를 켠다 (2026-11-02 사장님: 꼭 같이 떠 있어야 함).
  // 다른 탭(빌라·상가 등)으로 가면 끈다 — 그 탭에서도 단추로 켤 수 있다. 2차 카테고리를 바꾸면 그에 맞게
  useEffect(() => {
    // 단지 창을 연 채로 탭을 바꾼 경우(경매 보기 등)는 끄지 않는다
    if (!autoShow && pickedRef.current) return;
    setShow(autoShow ? { apt: kinds.apt, offi: kinds.offi } : { apt: false, offi: false });
  }, [autoShow, kinds.apt, kinds.offi]);
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

  const clear = () => {
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

  const close = useCallback(() => { setDetail(null); setDetailError(""); pick(null); }, [pick]);

  const draw = useCallback(async () => {
    const map = kakaoMapRef.current;
    const kakao = (window as any).kakao;
    if (!map || !kakao?.maps) return;
    // 모든 축척에서 보인다 (2026-11-02 사장님) — 겹치는 표시는 아래에서 거래 많은 단지만 남긴다
    if (!kindsRef.current.apt && !kindsRef.current.offi) {
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
    setLoading(true);
    const res = await fetch(`/api/apt-prices?sw=${sw.getLat()},${sw.getLng()}&ne=${ne.getLat()},${ne.getLng()}`, { signal: ac.signal })
      .then((r) => r.json()).catch(() => null);
    if (ac.signal.aborted) return;
    setLoading(false);
    setLoadError(res?.success ? "" : "실거래가를 불러오지 못했습니다. 잠시 뒤 지도를 다시 움직여 보세요."); // 조용히 비우지 않는다 (11-02)
    clear();
    const level = map.getLevel();
    // 오피스텔을 감춘 축척에서는 오피스텔 공실도 단지에 붙이지 않고 원래 공실 표시로 둔다
    // 겹치지 않게 — 거래 많은 단지부터 화면 자리를 잡고, 이미 잡힌 자리와 겹치면 뺀다 (축소하면 큰 단지만 남는다)
    void level;
    const proj = map.getProjection();
    const taken: { x: number; y: number }[] = [];
    const BOX_W = 74, BOX_H = 44;
    const shown = ((res?.complexes || []) as Complex[])
      .filter((c) => c.rep_price && c.rep_area && kindsRef.current[c.kind === "offi" ? "offi" : "apt"])
      .sort((a, b) => b.trade_count - a.trade_count)
      .filter((c) => {
        const pt = proj.containerPointFromCoords(new kakao.maps.LatLng(c.lat, c.lng));
        if (taken.some((t) => Math.abs(t.x - pt.x) < BOX_W && Math.abs(t.y - pt.y) < BOX_H)) return false;
        taken.push({ x: pt.x, y: pt.y });
        return true;
      });
    const matched = matchVacancies(shown, vacanciesRef.current || []);
    setVacancyMap(matched);
    hideRef.current(new Set([...matched.values()].flat()));
    for (const c of shown) {
      if (!c.rep_price || !c.rep_area) continue;
      const ids = matched.get(c.id) || [];
      const el = document.createElement("div");
      const color = c.kind === "offi" ? OFFI : BRAND;
      el.dataset.color = color;
      el.title = `${c.name}${c.kind === "offi" ? " (오피스텔)" : ""} · 최근 실거래 ${c.rep_date ? c.rep_date.replace(/-/g, ".") : ""}`;
      el.style.cssText = "position:relative;cursor:pointer;user-select:none;text-align:center;font-family:inherit;filter:drop-shadow(0 2px 3px rgba(0,0,0,.25))";
      el.innerHTML =
        `<div style="background:${color};color:#fff;border-radius:9px;padding:4px 9px 5px;min-width:52px;line-height:1.15;white-space:nowrap">` +
        `<div style="font-size:11px;opacity:.85">${areaLabel(c.rep_area)}</div>` +
        `<div style="font-size:15px;font-weight:800;letter-spacing:-.3px">${shortPrice(c.rep_price)}</div></div>` +
        `<div style="width:0;height:0;margin:-1px auto 0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:7px solid ${color}"></div>`;
      if (ids.length) {
        const badge = document.createElement("div");
        badge.textContent = String(ids.length);
        badge.title = `이 단지 공실 ${ids.length}개 보기`;
        badge.style.cssText = `position:absolute;top:-11px;right:-13px;min-width:26px;height:26px;padding:0 5px;box-sizing:border-box;border-radius:13px;background:#fff;border:2px solid ${VAC};color:${VAC};font-size:13px;font-weight:900;line-height:22px;text-align:center`;
        badge.addEventListener("click", (e) => { e.stopPropagation(); showRef.current(ids); });
        el.appendChild(badge);
      }
      el.addEventListener("click", (e) => { e.stopPropagation(); openDetail(c.id); });
      const overlay = new kakao.maps.CustomOverlay({ position: new kakao.maps.LatLng(c.lat, c.lng), content: el, yAnchor: 1, zIndex: 1, clickable: true });
      overlay.setMap(map);
      overlaysRef.current.push(overlay);
      elsRef.current.set(c.id, el);
      if (c.id === pickedRef.current) requestAnimationFrame(() => paint(el, true));
    }
  }, [kakaoMapRef, openDetail]);

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
  }, [show.apt, show.offi]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (k: "apt" | "offi") => {
    setShow((v) => ({ ...v, [k]: !v[k] }));
    close();
  };
  const btn = (k: "apt" | "offi") => {
    const color = k === "offi" ? OFFI : BRAND;
    return (
      <button
        type="button"
        onClick={() => toggle(k)}
        title={k === "offi" ? "오피스텔 실거래 시세 보기" : "아파트 실거래 시세 보기"}
        style={{
          border: `1.5px solid ${color}`, borderRadius: 6, cursor: "pointer", padding: "6px 10px", fontSize: 14, fontWeight: 800, whiteSpace: "nowrap",
          background: show[k] ? color : "#fff", color: show[k] ? "#fff" : color,
        }}
      >
        {k === "offi" ? "오피스텔 실거래가" : "아파트 실거래가"}
      </button>
    );
  };
  const buttons = <>{btn("apt")}{btn("offi")}</>;

  return (
    <>
      {buttonSlot ? createPortal(buttons, buttonSlot) : <div style={{ position: "absolute", right: 14, top: "calc(30% + 48px)", zIndex: 1000, display: "grid", gap: 6 }}>{buttons}</div>}

      {on && (tooFar || loading || loadError) && (
        <div style={{ position: "absolute", left: "50%", bottom: 28, transform: "translateX(-50%)", zIndex: 1000, background: "rgba(17,24,39,.88)", color: "#fff", fontSize: 14, fontWeight: 600, padding: "10px 18px", borderRadius: 20, pointerEvents: "none" }}>
          {tooFar ? `지도를 더 확대하면 ${show.apt ? "아파트" : "오피스텔"} 실거래가가 보여요` : loading ? "실거래가 불러오는 중…" : loadError}
        </div>
      )}

      {on && detail && pickedId && (
        <AptDetailPanel
          detail={detail}
          onClose={close}
          vacancyCount={[...new Set([...(vacancyMap.get(detail.id) || []), ...(detail.vacancy_ids || [])])].length}
          // 창은 그대로 두고 왼쪽 목록만 그 단지 공실로 (2026-11-02 사장님)
          onShowVacancies={() => onShowVacancies([...new Set([...(vacancyMap.get(detail.id) || []), ...(detail.vacancy_ids || [])])])}
          onShowAuctions={onShowAuctions ? () => onShowAuctions(detail.auction_ids || []) : undefined}
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
