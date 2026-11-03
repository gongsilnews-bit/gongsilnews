"use client";
// 빌라(연립·다세대) 실거래 견본 (2026-11-03 사장님: "샘플로 보고 싶어서", 우리 개발 PC에서만) — 내 PC(localhost)·[빌라·주택] 탭에서만 보인다.
//  값은 국토부 연립다세대 매매(RHTrade2)·전월세(RHRent) 강남구 논현동 36개월 실제 자료 (villaSample.json, 위치는 카카오 지번 검색).
//  모양이 정해지면 실제 기능(apt_complexes kind "villa" + 매일 밤 갱신)으로 바꾸고 이 파일은 지운다.
//  가격표는 많이 확대했을 때만 (빌라는 건물이 많아 멀리서 다 붙이면 지도가 덮인다)
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import AptDetailPanel, { VILLA_ROSE, type AptDetail } from "./AptDetailPanel";
import { areaLabel, shortPrice, type Rent, type Trade } from "@/utils/aptMapShared";

type Bld = { id: string; kind: "villa"; house_type: string; name: string; dong: string; jibun: string; lawd_cd: string; build_year: number | null; lat: number; lng: number; trades: Trade[]; rents: Rent[] };
const MAX_LEVEL = 3; // 이 축척(약 100m)보다 가까울 때만

// [전체] · [빌라·주택] 탭에서 [빌라 실거래가] 단추로 켜고 끈다 — 아파트·오피스텔 단추 옆 (2026-11-03 사장님)
export default function VillaSampleLayer({ kakaoMapRef, mapLoaded, tab, buttonSlot }: { kakaoMapRef: React.MutableRefObject<any>; mapLoaded: boolean; tab: boolean; buttonSlot?: HTMLElement | null }) {
  const [toggled, setToggled] = useState(true);
  const [local0, setLocal0] = useState(false);
  useEffect(() => { setLocal0(window.location.hostname === "localhost"); }, []);
  const show = tab && toggled;
  const [local, setLocal] = useState(false);
  const [picked, setPicked] = useState<Bld | null>(null);
  const [side, setSide] = useState<{ left: number; top: number; height: number } | null>(null);
  const [far, setFar] = useState(false);
  const overlays = useRef<{ o: any; el: HTMLDivElement; id: string }[]>([]);
  const pickedRef = useRef<string | null>(null);
  useEffect(() => { setLocal(window.location.hostname === "localhost"); }, []);
  // 견본 자료(약 400KB)는 내 PC에서만 따로 불러온다 — 실제 사이트 손님은 받지 않는다
  const [list, setList] = useState<Bld[] | null>(null);
  useEffect(() => { if (local && show && !list) import("./villaSample.json").then((m) => setList(m.default.buildings as Bld[])); }, [local, show, list]);
  const on = local && show;

  useEffect(() => {
    if (!on || !mapLoaded || !list) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let map: any = null;
    // 모두 흰 바탕 + 자주 테두리 — 매매는 자주 굵은 가격, 전월세는 회색 "전세·월세". 누른 건물만 꽉 찬 자주 (2026-11-03 사장님: 테두리가 더 좋다)
    const paint = (el: HTMLDivElement, sel: boolean) => {
      const box = el.firstChild as HTMLElement, price = box.lastChild as HTMLElement;
      el.style.zIndex = sel ? "10" : "";
      box.style.background = sel ? VILLA_ROSE : "#fff";
      box.style.color = sel ? "#fff" : VILLA_ROSE;
      price.style.color = sel ? "#fff" : el.dataset.sale ? VILLA_ROSE : "#4b5563";
    };
    const draw = () => {
      const kakao = (window as any).kakao;
      overlays.current.forEach((x) => x.o.setMap(null));
      overlays.current = [];
      const tooFar = map.getLevel() > MAX_LEVEL;
      setFar(tooFar);
      if (tooFar) return;
      const b = map.getBounds();
      for (const v of list) {
        if (!b.contain(new kakao.maps.LatLng(v.lat, v.lng))) continue;
        const t = v.trades[0], j = v.rents.find((r) => !r.m), m = v.rents[0];
        if (!t && map.getLevel() > MAX_LEVEL - 1) continue; // 전월세만 있는 건물은 한 단계 더 가까이서만 (빽빽해서)
        const top = t ? areaLabel(t.a) : areaLabel((j || m).a);
        const price = t ? shortPrice(t.p) : j ? `전세 ${shortPrice(j.dep)}` : `월세 ${m.m.toLocaleString("ko-KR")}`;
        // 매매가 있는 건물은 진하게, 전월세만 있는 건물은 흰 바탕
        const solid = Boolean(t);
        const el = document.createElement("div");
        el.style.cssText = "position:relative;cursor:pointer;user-select:none;text-align:center;font-family:inherit;filter:drop-shadow(0 2px 3px rgba(0,0,0,.22))";
        el.title = `${v.name} (${v.house_type}) · 매매 ${v.trades.length}건 · 전월세 ${v.rents.length}건`;
        el.innerHTML =
          `<div style="background:#fff;color:${VILLA_ROSE};border:1.5px solid ${VILLA_ROSE};border-radius:9px;padding:3px 8px 4px;min-width:48px;line-height:1.15;white-space:nowrap">` +
          `<div style="font-size:10.5px;opacity:.85">${top}</div>` +
          `<div style="font-size:${solid ? 14 : 12.5}px;font-weight:800;letter-spacing:-.3px;color:${solid ? VILLA_ROSE : "#4b5563"}">${price}</div></div>` +
          `<div style="width:0;height:0;margin:-1px auto 0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:6px solid ${VILLA_ROSE}"></div>`;
        if (solid) el.dataset.sale = "1";
        el.addEventListener("click", (e) => { e.stopPropagation(); pickedRef.current = v.id; setPicked(v); overlays.current.forEach((x) => paint(x.el, x.id === v.id)); });
        const o = new kakao.maps.CustomOverlay({ position: new kakao.maps.LatLng(v.lat, v.lng), content: el, yAnchor: 1, zIndex: solid ? 5 : 4, clickable: true });
        o.setMap(map);
        overlays.current.push({ o, el, id: v.id });
        if (pickedRef.current === v.id) paint(el, true);
      }
    };
    const attach = () => {
      const kakao = (window as any).kakao;
      if (!kakaoMapRef.current || !kakao?.maps) { timer = setTimeout(attach, 300); return; }
      map = kakaoMapRef.current;
      kakao.maps.event.addListener(map, "idle", draw);
      draw();
    };
    attach();
    return () => {
      if (timer) clearTimeout(timer);
      const kakao = (window as any).kakao;
      if (map && kakao?.maps) kakao.maps.event.removeListener(map, "idle", draw);
      overlays.current.forEach((x) => x.o.setMap(null));
      overlays.current = [];
    };
  }, [on, mapLoaded, kakaoMapRef, list]);

  // 탭을 떠나면 창도 닫는다
  useEffect(() => { if (!on) { setPicked(null); pickedRef.current = null; } }, [on]);

  // 창은 왼쪽 목록 자리에 (아파트 단지 창과 같게)
  useEffect(() => {
    if (!picked) return;
    const measure = () => {
      const el = document.querySelector("aside[data-gongsil-side]") as HTMLElement | null;
      if (!el) return setSide(null);
      const r = el.getBoundingClientRect();
      setSide((v) => (v && v.left === r.left && v.top === r.top && v.height === r.height ? v : { left: r.left, top: r.top, height: r.height }));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [picked]);

  const button = local0 && tab && buttonSlot ? createPortal(
    <button type="button" onClick={() => setToggled((v) => !v)} title="[견본] 빌라(연립·다세대) 실거래 시세 보기 — 강남구 논현동만, 내 PC에서만"
      style={{ border: `1.5px solid ${VILLA_ROSE}`, borderRadius: 6, cursor: "pointer", padding: "6px 10px", fontSize: 14, fontWeight: 800, whiteSpace: "nowrap", background: toggled ? VILLA_ROSE : "#fff", color: toggled ? "#fff" : VILLA_ROSE }}>
      빌라 실거래가
    </button>, buttonSlot) : null;
  if (!on) return button;
  const close = () => {
    setPicked(null); pickedRef.current = null;
    overlays.current.forEach(({ el }) => {
      const box = el.firstChild as HTMLElement;
      el.style.zIndex = ""; box.style.background = "#fff"; box.style.color = VILLA_ROSE;
      (box.lastChild as HTMLElement).style.color = el.dataset.sale ? VILLA_ROSE : "#4b5563";
    });
  };
  const detail: AptDetail | null = picked ? { ...picked, supply_map: null, unit_map: null, info: null } : null;
  return (
    <>
      {button}
      {/* 견본 자리로 바로 가기 — 논현동 가운데, 가격표가 보이는 축척 */}
      <button
        onClick={() => { const kakao = (window as any).kakao, map = kakaoMapRef.current; if (!map || !kakao?.maps) return; map.setLevel(MAX_LEVEL); map.setCenter(new kakao.maps.LatLng(37.5115, 127.0305)); }}
        style={{ position: "absolute", left: "50%", bottom: 76, transform: "translateX(-50%)", zIndex: 1000, border: "none", background: VILLA_ROSE, color: "#fff", fontSize: 14, fontWeight: 700, padding: "10px 18px", borderRadius: 20, cursor: "pointer", boxShadow: "0 3px 10px rgba(0,0,0,.25)" }}>
        {list ? (far ? "[견본] 논현동 빌라 실거래가 보기 — 눌러서 이동" : "[견본] 빌라 실거래가 · 강남구 논현동만 · 내 PC에서만") : "[견본] 빌라 자료 불러오는 중…"}
      </button>
      {detail && <AptDetailPanel detail={detail} onClose={close} side={side || undefined} />}
    </>
  );
}
