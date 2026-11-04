"use client";
/**
 * 공실열람 지도 [부동산] 켜기·끄기 (2026-11-04 사장님) — 가입한 회원 부동산을 곤색 집 모양으로.
 *  마우스를 올리면 이름·주소·"공실 5 · 기사 3"(0도 그대로) · 누르면 왼쪽 목록이 그 사무소(카드 + 공실 전부 + 기사 전부)로 바뀐다.
 *  지도는 움직이지 않는다. 처음엔 꺼 두고, 켠 것은 기억한다.
 *  알림: "gs-agency-open"(고른 사무소) → GongsilClient(공실 목록) · GongsilSidebar(카드·기사) / "gs-agency-close" ← 목록에서 닫기
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { listMapAgencies, type MapAgency } from "@/app/actions/mapAgencies";

const NAVY = "#1e3a6e", NAVY_DARK = "#0f2347";
const KEY = "gs-agency-layer";
const esc = (v: unknown) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const house = (fill: string, size: number) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 2 11.5h3V21h5.5v-5.5h3V21H19v-9.5h3z" fill="${fill}"/></svg>`;
const FAR_LEVEL = 7; // 이만큼 축소하면 이름 없이 동그라미만 (빽빽하지 않게)
const short = (name: string) => (name.length > 8 ? `${name.slice(0, 8)}…` : name);
/** 이름표형 (2026-11-04 사장님: 집 그림이 마음에 안 든다 → 권고안) — 곤색 이름표 + 흰 동그라미 집 + 아래 꼬리 */
const badge = (name: string, mode: "normal" | "hover" | "picked", far: boolean) => {
  const bg = mode === "normal" ? NAVY : NAVY_DARK;
  const ring = mode === "picked" ? "box-shadow:0 0 0 2px #fff,0 0 0 4px #0f2347,0 4px 10px rgba(15,35,71,.45);" : "box-shadow:0 3px 8px rgba(15,35,71,.35);";
  const tail = `<div style="position:absolute;left:50%;bottom:-6px;transform:translateX(-50%);width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:7px solid ${bg}"></div>`;
  if (far) return `<div style="position:relative;width:26px;height:26px;border-radius:50%;background:${bg};border:2px solid #fff;display:flex;align-items:center;justify-content:center;${ring}">${house("#fff", 14)}${tail}</div>`;
  return `<div style="position:relative;display:flex;align-items:center;gap:6px;background:${bg};color:#fff;border-radius:18px;padding:4px 11px 4px 4px;font-size:13px;font-weight:800;letter-spacing:-.2px;white-space:nowrap;${ring}">` +
    `<span style="width:22px;height:22px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0">${house(bg, 14)}</span>${esc(short(name))}${tail}</div>`;
};

export default function AgencyLayer({ kakaoMapRef, mapLoaded, buttonSlot }: { kakaoMapRef: React.MutableRefObject<any>; mapLoaded: boolean; buttonSlot: HTMLElement | null }) {
  const [on, setOn] = useState(false);
  const [list, setList] = useState<MapAgency[] | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const overlays = useRef<{ o: any; el: HTMLElement; id: string }[]>([]);
  const tip = useRef<any>(null);

  useEffect(() => { try { if (localStorage.getItem(KEY) === "1") setOn(true); } catch { /* */ } }, []);
  const toggle = () => setOn((v) => { try { localStorage.setItem(KEY, v ? "0" : "1"); } catch { /* */ } return !v; });

  useEffect(() => {
    if (!on || list) return;
    listMapAgencies().then(setList).catch(() => setList([]));
  }, [on, list]);

  // 목록에서 [‹]·[✕]로 닫으면 진하게 칠한 것도 푼다
  useEffect(() => {
    const close = () => setPicked(null);
    window.addEventListener("gs-agency-close", close);
    return () => window.removeEventListener("gs-agency-close", close);
  }, []);
  // 왼쪽 목록 "부동산 N개" (GongsilSidebar) — 지도 화면 안 사무소, 공실 많은 순
  const announce = useCallback(() => {
    const map = kakaoMapRef.current, kakao = (window as any).kakao;
    if (!on || !list || !map || !kakao?.maps) { window.dispatchEvent(new CustomEvent("gs-agency-visible", { detail: null })); return; }
    const b = map.getBounds();
    const inView = list.filter((a) => b.contain(new kakao.maps.LatLng(a.lat, a.lng))).sort((p, q) => q.vacancies - p.vacancies || q.articles - p.articles);
    window.dispatchEvent(new CustomEvent("gs-agency-visible", { detail: inView }));
  }, [on, list, kakaoMapRef]);
  useEffect(() => {
    const map = kakaoMapRef.current, kakao = (window as any).kakao;
    announce();
    if (!on || !map || !kakao?.maps) return;
    kakao.maps.event.addListener(map, "idle", announce);
    return () => kakao.maps.event.removeListener(map, "idle", announce);
  }, [announce, on, mapLoaded, kakaoMapRef]);
  // 목록에서 사무소를 고르면 — 지도 집 표시를 진하게 + 사무소 화면
  useEffect(() => {
    const pick = (e: Event) => {
      const a = list?.find((x) => x.id === String((e as CustomEvent).detail));
      if (!a) return;
      setPicked(a.id);
      window.dispatchEvent(new CustomEvent("gs-agency-open", { detail: a }));
    };
    window.addEventListener("gs-agency-pick", pick);
    return () => window.removeEventListener("gs-agency-pick", pick);
  }, [list]);
  useEffect(() => { if (!on && picked) { setPicked(null); window.dispatchEvent(new CustomEvent("gs-agency-open", { detail: null })); } }, [on]); // eslint-disable-line react-hooks/exhaustive-deps

  const farRef = useRef(false);
  const paint = (el: HTMLElement, mode: "normal" | "hover" | "picked") => {
    el.innerHTML = badge(el.dataset.name || "", mode, farRef.current);
    el.style.transform = mode === "hover" ? "scale(1.08)" : "";
    el.style.transformOrigin = "50% 100%";
    if (el.parentElement) el.parentElement.style.zIndex = mode === "normal" ? "8" : "100";
  };
  useEffect(() => { overlays.current.forEach((x) => paint(x.el, x.id === picked ? "picked" : "normal")); }, [picked]);

  // 이름표 — 마우스를 이름표로 옮겨 [상세보기]를 누를 수 있게 조금 늦게 닫는다 (11-04 사장님)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTip = () => { if (hideTimer.current) clearTimeout(hideTimer.current); hideTimer.current = null; tip.current?.setMap(null); tip.current = null; };
  const hideTipSoon = () => { if (hideTimer.current) clearTimeout(hideTimer.current); hideTimer.current = setTimeout(hideTip, 250); };
  const openAgency = useRef<(a: MapAgency) => void>(() => {});
  const showTip = useCallback((a: MapAgency) => {
    const kakao = (window as any).kakao;
    hideTip();
    // 0 이어도 "공실 0 · 기사 0" 으로 늘 보인다 (11-04 사장님)
    const counts = `<b style="color:#2563eb">공실 ${a.vacancies}</b><span style="color:#d1d5db;margin:0 6px">·</span><b style="color:#ff8e15">기사 ${a.articles}</b>`;
    const box = document.createElement("div");
    // 이름·주소가 길면 — 줄을 바꾸지 않고 가로 260px 에서 "…" 로 줄인다 (11-04 사장님). 전체는 마우스를 올리면 작은 글로
    box.style.cssText = "margin-bottom:38px;width:max-content;max-width:260px;background:#fff;border:1px solid #d1d5db;border-radius:6px;box-shadow:0 4px 14px rgba(0,0,0,.16);padding:10px 14px;font-family:inherit;line-height:1.45;white-space:nowrap;cursor:default";
    const one = "white-space:nowrap;overflow:hidden;text-overflow:ellipsis";
    box.innerHTML = `<div title="${esc(a.name)}" style="font-size:15px;font-weight:800;color:#111;${one}">${esc(a.name)}</div><div title="${esc(a.address)}" style="font-size:13px;color:#374151;margin-top:1px;${one}">${esc(a.address)}</div>` +
      `<div style="display:flex;align-items:center;gap:14px;font-size:13px;margin-top:4px;white-space:nowrap"><span>${counts}</span>` +
      `<a href="#" data-ag-open style="margin-left:auto;color:${NAVY};font-weight:800;text-decoration:none">상세보기 &gt;</a></div>`;
    box.addEventListener("mouseenter", () => { if (hideTimer.current) clearTimeout(hideTimer.current); });
    box.addEventListener("mouseleave", hideTipSoon);
    ["mousedown", "mouseup", "touchstart", "wheel"].forEach((t) => box.addEventListener(t, (ev) => ev.stopPropagation()));
    box.querySelector("[data-ag-open]")?.addEventListener("click", (ev) => { ev.preventDefault(); ev.stopPropagation(); hideTip(); openAgency.current(a); });
    tip.current = new kakao.maps.CustomOverlay({ position: new kakao.maps.LatLng(a.lat, a.lng), content: box, yAnchor: 1, zIndex: 30, clickable: true });
    tip.current.setMap(kakaoMapRef.current);
  }, [kakaoMapRef]);

  useEffect(() => {
    const kakao = (window as any).kakao, map = kakaoMapRef.current;
    const clear = () => { overlays.current.forEach((x) => x.o.setMap(null)); overlays.current = []; hideTip(); };
    if (!on || !mapLoaded || !list || !map || !kakao?.maps) { clear(); return; }
    farRef.current = map.getLevel() >= FAR_LEVEL;
    // 축소·확대하면 이름표 ↔ 동그라미
    const onZoom = () => {
      const far = map.getLevel() >= FAR_LEVEL;
      if (far === farRef.current) return;
      farRef.current = far;
      overlays.current.forEach((x) => paint(x.el, x.id === pickedRef.current ? "picked" : "normal"));
    };
    kakao.maps.event.addListener(map, "zoom_changed", onZoom);
    for (const a of list) {
      const el = document.createElement("div");
      el.style.cssText = "cursor:pointer;line-height:1.2;padding-bottom:6px;transition:transform .12s ease;font-family:'Pretendard',inherit";
      el.dataset.name = a.name;
      paint(el, a.id === picked ? "picked" : "normal");
      el.addEventListener("mouseenter", () => { if (a.id !== picked) paint(el, "hover"); showTip(a); });
      el.addEventListener("mouseleave", () => { paint(el, a.id === pickedRef.current ? "picked" : "normal"); hideTipSoon(); });
      ["mousedown", "mouseup", "touchstart"].forEach((t) => el.addEventListener(t, (ev) => ev.stopPropagation())); // 겹친 공실 표시로 눌림이 새지 않게
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        hideTip();
        const next = pickedRef.current === a.id ? null : a.id; // 또 누르면 닫기
        setPicked(next);
        window.dispatchEvent(new CustomEvent("gs-agency-open", { detail: next ? a : null }));
      });
      const o = new kakao.maps.CustomOverlay({ position: new kakao.maps.LatLng(a.lat, a.lng), content: el, yAnchor: 1, zIndex: 8, clickable: true });
      o.setMap(map);
      overlays.current.push({ o, el, id: a.id });
    }
    return () => { kakao.maps.event.removeListener(map, "zoom_changed", onZoom); clear(); };
  }, [on, mapLoaded, list, kakaoMapRef, showTip]); // eslint-disable-line react-hooks/exhaustive-deps

  const pickedRef = useRef<string | null>(null);
  useEffect(() => { pickedRef.current = picked; }, [picked]);
  // 이름표 [상세보기] — 집을 누른 것과 같이 왼쪽에 사무소 화면 (이미 열려 있으면 그대로)
  openAgency.current = (a: MapAgency) => { setPicked(a.id); window.dispatchEvent(new CustomEvent("gs-agency-open", { detail: a })); };

  const button = (
    <button type="button" onClick={toggle} title="공실뉴스 회원 부동산을 지도 위에 보기"
      style={{ border: `1.5px solid ${NAVY}`, borderRadius: 6, cursor: "pointer", padding: "6px 10px", fontSize: 14, fontWeight: 800, whiteSpace: "nowrap", background: on ? NAVY : "#fff", color: on ? "#fff" : NAVY }}>
      부동산{on && !list ? "…" : ""}
    </button>
  );
  return buttonSlot ? createPortal(button, buttonSlot) : null;
}
