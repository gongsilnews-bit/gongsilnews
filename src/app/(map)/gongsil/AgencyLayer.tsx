"use client";
/**
 * 공실열람 지도 [부동산] 켜기·끄기 (2026-11-04 사장님) — 가입한 회원 부동산을 곤색 집 모양으로.
 *  평소엔 작은 핀 · 마우스를 올리면 이름표 · 누르면 왼쪽 목록이 그 사무소(카드 + 공실 전부 + 기사 전부)로 바뀐다 (11-23).
 *  지도는 움직이지 않는다. 들어올 때마다 켜진 채로 시작 (11-04).
 *  알림: "gs-agency-open"(고른 사무소) → GongsilClient(공실 목록) · GongsilSidebar(카드·기사) / "gs-agency-close" ← 목록에서 닫기
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { listMapAgencies, type MapAgency } from "@/app/actions/mapAgencies";
import { starHtml, useStars } from "./stars";
import { mapLayerBox, mapLayerRow, mapSquareButton, mapSquareSub } from "./mapSquareButton";

const NAVY = "#1e3a6e", NAVY_DARK = "#0f2347";
const KEY = "gs-agency-layer";
const esc = (v: unknown) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const house = (fill: string, size: number) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 2 11.5h3V21h5.5v-5.5h3V21H19v-9.5h3z" fill="${fill}"/></svg>`;
const short = (name: string) => (name.length > 8 ? `${name.slice(0, 8)}…` : name);
/** 이름표형 (2026-11-04 사장님: 집 그림이 마음에 안 든다 → 권고안) — 곤색 이름표 + 흰 동그라미 집 + 아래 꼬리 */
const PRO_TAG = `<span style="display:inline-block;background:#ea8a0c;color:#fff;font-size:9.5px;font-weight:800;letter-spacing:.3px;line-height:1;padding:2px 4px 3px;border-radius:3px;margin-left:4px;vertical-align:middle" title="공실뉴스부동산">NEWS</span>`;
/**
 * 2026-11-23 사장님: 이름표가 지도를 너무 가린다 → 평소엔 이름 없는 작은 핀, 마우스를 올리거나 고르면 이름표
 */
const badge = (name: string, mode: "normal" | "hover" | "picked", count = 1, pro = false, addr = "") => {
  const bg = mode === "normal" ? NAVY : NAVY_DARK;
  // 작은 핀 — 한 자리에 여러 사무소면 오른쪽 위에 작은 개수
  const cnt = count > 1 ? `<span style="position:absolute;top:-7px;right:-8px;min-width:16px;height:16px;padding:0 4px;box-sizing:border-box;border-radius:8px;background:#fff;border:1.5px solid ${bg};color:${bg};font-size:10px;font-weight:900;line-height:13px;text-align:center">${count}</span>` : "";
  const pinTail = `<div style="position:absolute;left:50%;bottom:-5px;transform:translateX(-50%);width:0;height:0;border-left:4px solid transparent;border-right:4px solid transparent;border-top:5px solid ${bg}"></div>`;
  const pin = `<div style="position:relative;width:22px;height:22px;box-sizing:border-box;border-radius:50%;background:${bg};border:2px solid #fff;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 5px rgba(15,35,71,.35)">${house("#fff", 12)}${cnt}${pinTail}</div>`;
  if (mode === "normal") return pin;
  // 마우스를 올리거나 고르면 — 핀은 그 자리에 두고 위로 흰 상자 (11-23 사장님: 옆이 아니라 위로, 단지 정보 상자처럼)
  const border = mode === "picked" ? `2px solid ${NAVY_DARK}` : "1px solid #d6d9de";
  // 지도 표시는 처음 크기로 자리를 잡으니 — 핀 크기는 그대로 두고 상자만 핀 위에 떠 있게 (커지면 옆으로 밀리던 것 11-23)
  const label = `<div style="position:absolute;left:50%;bottom:100%;transform:translateX(-50%);margin-bottom:10px;z-index:1;background:#fff;border:${border};border-radius:6px;box-shadow:0 4px 14px rgba(0,0,0,.18);padding:10px 14px 11px;white-space:nowrap;text-align:left;cursor:pointer">` +
    `<div style="display:flex;align-items:center;font-size:15.5px;font-weight:800;color:#111;letter-spacing:-.2px">${esc(count > 1 ? `${short(name)} 외 ${count - 1}` : name)}${pro && count === 1 ? PRO_TAG : ""}</div>` +
    (addr ? `<div style="font-size:13px;color:#444;margin-top:3px;font-weight:400">${esc(addr)}</div>` : "") + `</div>`;
  return `<div style="position:relative">${label}${pin}</div>`;
};

/**
 * mobile — 모바일 공실열람 지도에도 (2026-11-11 사장님: "부동산도 나타나게, 모바일에서")
 *  이름표·정보 상자는 PC 그대로. 다른 점: 이름표를 누르면 정보 상자만(왼쪽 목록이 없으니) → [상세보기]를 누르면
 *  모바일 공실 목록 화면에 그 사무소 공실 전부 (m/gongsil 페이지가 gs-agency-open 을 받는다) · 단추 모양만 둥글게
 */
export default function AgencyLayer({ kakaoMapRef, mapLoaded, buttonSlot, mobile = false }: { kakaoMapRef: React.MutableRefObject<any>; mapLoaded: boolean; buttonSlot: HTMLElement | null; mobile?: boolean }) {
  const [on, setOn] = useState(true); // 들어올 때마다 켜진 채로 시작 (11-04 사장님: 부동산은 일단 켜 두자)
  useStars(); // ★ 찜 목록 불러오기
  const [list, setList] = useState<MapAgency[] | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const overlays = useRef<{ o: any; el: HTMLElement; id: string }[]>([]);
  const tip = useRef<any>(null);

  useEffect(() => { try { localStorage.removeItem(KEY); } catch { /* */ } }, []);
  const toggle = () => setOn((v) => !v);

  // 지금 보이는 지도 범위의 사무소만 서버에서 (11-04: 회원 10만 명이어도 가볍게) — 지도를 멈추면 0.3초 뒤, 같은 범위는 다시 안 받는다
  const boxKey = useRef("");
  useEffect(() => {
    if (!on || !mapLoaded) { boxKey.current = ""; return; }
    let t: ReturnType<typeof setTimeout> | undefined, map: any = null, stopped = false;
    // 처음 켜진 채로 들어오면 지도가 아직 안 만들어졌을 수 있다 — 생길 때까지 기다렸다 붙는다
    const attach = () => {
      const kakao = (window as any).kakao;
      if (stopped) return;
      if (!kakaoMapRef.current || !kakao?.maps) { t = setTimeout(attach, 200); return; }
      map = kakaoMapRef.current;
      kakao.maps.event.addListener(map, "idle", idle);
      load();
    };
    const load = () => {
      const b = map.getBounds(), sw = b.getSouthWest(), ne = b.getNorthEast();
      const pad = (ne.getLat() - sw.getLat()) * 0.15;
      const box: [[number, number], [number, number]] = [[sw.getLat() - pad, sw.getLng() - pad], [ne.getLat() + pad, ne.getLng() + pad]];
      const key = box.flat().map((v) => v.toFixed(3)).join(",");
      if (key === boxKey.current) return;
      boxKey.current = key;
      listMapAgencies(box).then((l) => { if (boxKey.current === key) setList(l); }).catch(() => {});
    };
    const idle = () => { if (t) clearTimeout(t); t = setTimeout(load, 300); };
    attach();
    return () => { stopped = true; if (t) clearTimeout(t); const kakao = (window as any).kakao; if (map && kakao?.maps) kakao.maps.event.removeListener(map, "idle", idle); };
  }, [on, mapLoaded, kakaoMapRef]);

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
      setPicked(a.id); // 묶음 안의 사무소면 묶음 이름표는 진하게 칠하지 않는다
      window.dispatchEvent(new CustomEvent("gs-agency-open", { detail: a }));
    };
    window.addEventListener("gs-agency-pick", pick);
    return () => window.removeEventListener("gs-agency-pick", pick);
  }, [list]);
  useEffect(() => { if (!on && picked) { setPicked(null); window.dispatchEvent(new CustomEvent("gs-agency-open", { detail: null })); } }, [on]); // eslint-disable-line react-hooks/exhaustive-deps

  const paint = (el: HTMLElement, mode: "normal" | "hover" | "picked") => {
    // 모바일은 누르면 아래 정보 상자가 뜨니 핀 위 상자는 띄우지 않는다
    el.innerHTML = badge(el.dataset.name || "", mobile ? "normal" : mode, Number(el.dataset.count || 1), el.dataset.pro === "1", el.dataset.addr || "");
    el.style.padding = "0 0 5px"; // 핀 꼬리 끝이 늘 같은 자리 (이름표가 떠도 핀은 안 움직인다)
    if (el.parentElement) el.parentElement.style.zIndex = mode === "normal" ? "8" : "100";
  };
  useEffect(() => { overlays.current.forEach((x) => paint(x.el, x.id === picked ? "picked" : "normal")); }, [picked]);

  // 이름표 — 마우스를 이름표로 옮겨 [상세보기]를 누를 수 있게 조금 늦게 닫는다 (11-04 사장님)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTip = () => { if (hideTimer.current) clearTimeout(hideTimer.current); hideTimer.current = null; tip.current?.setMap(null); tip.current = null; };

  const openAgency = useRef<(a: MapAgency) => void>(() => {});
  const closeAll = useRef<() => void>(() => {});
  const showTip = useCallback((g: MapAgency[]) => {
    const kakao = (window as any).kakao;
    hideTip();
    const a = g[0];
    // 0 이어도 "공실 0 · 기사 0" 으로 늘 보인다 (11-04 사장님)
    const counts = `<b style="color:#2563eb">공실 ${a.vacancies}</b><span style="color:#d1d5db;margin:0 6px">·</span><b style="color:#ff8e15">기사 ${a.articles}</b>`;
    const box = document.createElement("div");
    // 이름·주소가 길면 — 줄을 바꾸지 않고 가로 260px 에서 "…" 로 줄인다 (11-04 사장님). 전체는 마우스를 올리면 작은 글로
    box.style.cssText = "margin-bottom:38px;width:max-content;max-width:260px;background:#fff;border:1px solid #d1d5db;border-radius:6px;box-shadow:0 4px 14px rgba(0,0,0,.16);padding:10px 14px;font-family:inherit;line-height:1.45;white-space:nowrap;cursor:default";
    const one = "white-space:nowrap;overflow:hidden;text-overflow:ellipsis";
    const cnt = (x: MapAgency) => `<b style="color:#2563eb">공실 ${x.vacancies}</b><span style="color:#d1d5db;margin:0 6px">·</span><b style="color:#ff8e15">기사 ${x.articles}</b>`;
    box.innerHTML = g.length === 1
      ? `<div title="${esc(a.name)}" style="font-size:15px;font-weight:800;color:#111;${one}">${esc(a.name)}${a.pro ? PRO_TAG : ""}</div><div title="${esc(a.address)}" style="font-size:13px;color:#374151;margin-top:1px;${one}">${esc(a.address)}</div>` +
        `<div style="display:flex;align-items:center;gap:14px;font-size:13px;margin-top:4px;white-space:nowrap"><span>${counts}</span>` +
        `<span style="margin-left:auto;display:inline-flex;align-items:center;gap:8px">${starHtml("ag", a.id, 18)}<a href="#" data-ag-open="${esc(a.id)}" style="color:${NAVY};font-weight:800;text-decoration:none">상세보기 &gt;</a></span></div>`
      // 한 자리 여러 사무소 — 줄마다 (공실·뉴스 목록처럼)
      : `<div style="font-size:12.5px;color:#6b7280;margin-bottom:4px;${one}">${esc(a.address)} · 부동산 ${g.length}곳</div>` +
        g.map((x, i) => `<div style="${i ? "border-top:1px solid #f0f0f0;" : ""}padding:7px 0 6px"><div title="${esc(x.name)}" style="font-size:14.5px;font-weight:800;color:#111;${one}">${esc(x.name)}${x.pro ? PRO_TAG : ""}</div>` +
          `<div style="display:flex;align-items:center;gap:14px;font-size:12.5px;margin-top:2px;white-space:nowrap"><span>${cnt(x)}</span><span style="margin-left:auto;display:inline-flex;align-items:center;gap:8px">${starHtml("ag", x.id, 18)}<a href="#" data-ag-open="${esc(x.id)}" style="color:${NAVY};font-weight:800;text-decoration:none">상세보기 &gt;</a></span></div></div>`).join("");
    const x = document.createElement("span");
    x.textContent = "✕"; x.title = "닫기";
    x.style.cssText = "position:absolute;top:6px;right:8px;font-size:15px;color:#999;cursor:pointer;line-height:1;padding:3px";
    x.addEventListener("click", (ev) => { ev.stopPropagation(); closeAll.current(); });
    box.style.position = "relative"; box.style.paddingRight = "30px";
    box.appendChild(x);
    ["mousedown", "mouseup", "touchstart", "wheel"].forEach((t) => box.addEventListener(t, (ev) => ev.stopPropagation()));
    box.querySelectorAll<HTMLAnchorElement>("[data-ag-open]").forEach((l) => l.addEventListener("click", (ev) => {
      ev.preventDefault(); ev.stopPropagation(); hideTip();
      const x = g.find((y) => y.id === l.dataset.agOpen); if (x) openAgency.current(x);
    }));
    // 모바일 — 지도 위 상자는 가장자리에서 잘리고 단추 줄에 가린다 → 화면 아래 카드로 (뉴스 목록과 같은 자리, 2026-11-11)
    if (mobile) {
      box.style.cssText += ";position:fixed;left:12px;right:12px;bottom:72px;z-index:60;margin:0;width:auto;max-width:none;max-height:46vh;overflow-y:auto;border-radius:14px;padding:14px 40px 14px 16px;box-shadow:0 -4px 24px rgba(0,0,0,.18)";
      box.querySelectorAll<HTMLElement>("div").forEach((d) => { if (d.style.whiteSpace === "nowrap") d.style.whiteSpace = "normal"; });
      document.body.appendChild(box);
      tip.current = { setMap: (m: unknown) => { if (m === null) box.remove(); } };
      return;
    }
    tip.current = new kakao.maps.CustomOverlay({ position: new kakao.maps.LatLng(a.lat, a.lng), content: box, yAnchor: 1, zIndex: 30, clickable: true });
    tip.current.setMap(kakaoMapRef.current);
  }, [kakaoMapRef, mobile]);

  useEffect(() => {
    const kakao = (window as any).kakao, map = kakaoMapRef.current;
    const clear = () => { overlays.current.forEach((x) => x.o.setMap(null)); overlays.current = []; hideTip(); };
    if (!on || !mapLoaded || !list || !map || !kakao?.maps) { clear(); return; }
    // 한 자리(약 25m 안)에 사무소가 여러 개면 이름표 하나로 묶는다 — 공실 많은 사무소가 앞
    const groups: MapAgency[][] = [];
    for (const a of [...list].sort((p, q) => q.vacancies - p.vacancies || q.articles - p.articles)) {
      const g = groups.find((x) => Math.hypot((x[0].lat - a.lat) * 111_000, (x[0].lng - a.lng) * 88_000) < 25);
      if (g) g.push(a); else groups.push([a]);
    }
    for (const g of groups) {
      const a = g[0];
      const key = g.length > 1 ? `g:${g.map((x) => x.id).sort().join(",")}` : a.id;
      const el = document.createElement("div");
      el.style.cssText = "cursor:pointer;line-height:1.2;font-family:'Pretendard',inherit";
      el.dataset.name = a.name;
      el.dataset.count = String(g.length);
      el.dataset.pro = a.pro ? "1" : "";
      el.dataset.addr = a.address || "";
      paint(el, key === picked ? "picked" : "normal");
      // 마우스를 올리면 작은 핀 → 이름표 (11-23 사장님)
      el.addEventListener("mouseenter", () => { if (key !== pickedRef.current) paint(el, "hover"); });
      el.addEventListener("mouseleave", () => { paint(el, key === pickedRef.current ? "picked" : "normal"); });
      ["mousedown", "mouseup", "touchstart"].forEach((t) => el.addEventListener(t, (ev) => ev.stopPropagation())); // 겹친 공실 표시로 눌림이 새지 않게
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        hideTip();
        const next = pickedRef.current === key ? null : key; // 또 누르면 닫기
        setPicked(next);
        // 모바일은 왼쪽 목록이 없으니 정보 상자 → [상세보기]로 목록을 연다. PC 는 상자 없이 왼쪽 목록만 (11-23 사장님)
        if (mobile) { if (next) showTip(g); return; }
        if (g.length > 1) {
          // 여러 사무소 — 왼쪽 목록에 그 사무소들 (줄로). 사무소 화면이 열려 있으면 닫는다
          window.dispatchEvent(new CustomEvent("gs-agency-open", { detail: null }));
          window.dispatchEvent(new CustomEvent("gs-agency-group", { detail: next ? g : null }));
        } else window.dispatchEvent(new CustomEvent("gs-agency-open", { detail: next ? a : null }));
      });
      const o = new kakao.maps.CustomOverlay({ position: new kakao.maps.LatLng(a.lat, a.lng), content: el, yAnchor: 1, zIndex: 8, clickable: true });
      o.setMap(map);
      overlays.current.push({ o, el, id: key });
    }
    return () => { clear(); };
  }, [on, mapLoaded, list, kakaoMapRef, showTip]); // eslint-disable-line react-hooks/exhaustive-deps

  const pickedRef = useRef<string | null>(null);
  useEffect(() => { pickedRef.current = picked; }, [picked]);
  // 이름표 닫기 — 고른 것도 풀고 왼쪽은 지도 화면 부동산 목록으로
  closeAll.current = () => {
    hideTip(); setPicked(null);
    window.dispatchEvent(new CustomEvent("gs-agency-open", { detail: null }));
    window.dispatchEvent(new CustomEvent("gs-agency-group", { detail: null }));
  };
  // 지도 빈 곳 · 지도 끌기 · 공실·뉴스 누르기 → 이름표 닫기 (고른 사무소 화면은 각자 규칙대로)
  useEffect(() => {
    const kakao = (window as any).kakao, map = kakaoMapRef.current;
    const shut = () => hideTip();
    ["gs-map-moved", "gs-vacancy-pick", "gs-news-select"].forEach((t) => window.addEventListener(t, shut));
    if (map && kakao?.maps) kakao.maps.event.addListener(map, "click", shut);
    return () => {
      ["gs-map-moved", "gs-vacancy-pick", "gs-news-select"].forEach((t) => window.removeEventListener(t, shut));
      if (map && kakao?.maps) kakao.maps.event.removeListener(map, "click", shut);
    };
  }, [mapLoaded, kakaoMapRef]); // eslint-disable-line react-hooks/exhaustive-deps
  // 이름표 [상세보기] — 집을 누른 것과 같이 왼쪽에 사무소 화면 (이미 열려 있으면 그대로)
  openAgency.current = (a: MapAgency) => { setPicked(a.id); window.dispatchEvent(new CustomEvent("gs-agency-open", { detail: a })); };

  // PC 는 지도 오른쪽 네모 [부동산 회원] (2026-11-21 사장님: 직방처럼 심플하게)
  const button = !mobile ? (
    <button type="button" onClick={toggle} title="공실뉴스 회원 부동산을 지도 위에 보기" style={mapSquareButton(on, NAVY)}>
      <span style={{ fontSize: 14 }}>부동산</span><span style={mapSquareSub(on, NAVY)}>{on && !list ? "…" : "회원"}</span>
    </button>
  ) : (
    // 모바일: [지도 표시] 창 안 체크 줄 — 앱과 같게 (2026-11-22 사장님)
    <button type="button" onClick={toggle} title="공실뉴스 회원 부동산을 지도 위에 보기" style={mapLayerRow(on, NAVY)}>
      <span style={mapLayerBox(on, NAVY)}>{on ? "✓" : ""}</span>
      부동산{on && !list ? "…" : ""}
    </button>
  );
  return buttonSlot ? createPortal(button, buttonSlot) : null;
}
