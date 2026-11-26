"use client";
/**
 * 공실열람 지도 [분양] (2026-11-26 사장님: 신축/분양/재건축 칸에 청약홈 분양 정보 — 아파트 단지처럼, 색은 보라)
 *  - 단지 시세 표시(AptPriceLayer)와 같은 모양의 작은 흰 말풍선: 위 "[분양] 전용 84㎡" · 가운데 분양가 · 아래 청약 D-day
 *  - 청약 전·진행 중은 진한 보라, 마감은 연한 보라
 *  - 누르면 왼쪽에 분양 상세 창 (PresaleDetailPanel) — 단지 상세 창과 같은 틀
 *  - 자료는 /api/presale (매일 /api/cron/presale 이 청약홈으로 채운다)
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { areaLabel, shortPrice } from "@/utils/aptMapShared";
import PresaleDetailPanel, { PRESALE, PRESALE_DIM, presaleStage, type PresaleItem } from "./PresaleDetailPanel";

type Marker = { id: string; kind: string; name: string; lat: number; lng: number; house_type: string | null; total_units: number | null;
  notice_date: string | null; receipt_start: string | null; receipt_end: string | null; winner_date: string | null;
  rep: { type: string; area: number | null; units: number | null; price: number | null } | null };

const esc = (t: string) => t.replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch] as string);

export default function PresaleLayer({ kakaoMapRef, mapLoaded, enabled, mobile = false }: { kakaoMapRef: React.MutableRefObject<any>; mapLoaded: boolean; enabled: boolean; mobile?: boolean }) {
  const overlays = useRef<any[]>([]);
  const els = useRef<Map<string, HTMLElement>>(new Map());
  const abort = useRef<AbortController | null>(null);
  const pickedRef = useRef<string | null>(null);
  const peek = useRef<any>(null);
  const [detail, setDetail] = useState<PresaleItem | null>(null);
  const [error, setError] = useState("");
  const [side, setSide] = useState<{ left: number; top: number; height: number } | null>(null);

  const hidePeek = () => { peek.current?.setMap(null); peek.current = null; };
  const clear = () => { hidePeek(); overlays.current.forEach((o) => o.setMap(null)); overlays.current = []; els.current.clear(); };

  // 고른 단지는 보라로 칠한다 (단지 시세 표시와 같게)
  const paint = (el: HTMLElement, on: boolean) => {
    const c = el.dataset.color || PRESALE;
    const box = el.children[0] as HTMLElement | undefined, tip = el.children[1] as HTMLElement | undefined;
    if (box) { box.style.background = on ? c : "#fff"; box.querySelectorAll<HTMLElement>("[data-t]").forEach((t) => { t.style.color = on ? "#fff" : t.dataset.t!; }); }
    if (tip) tip.style.borderTopColor = on ? c : "#fff";
    if (el.parentElement) el.parentElement.style.zIndex = on ? "5" : "2";
  };
  const pick = (id: string | null) => {
    const b = pickedRef.current && els.current.get(pickedRef.current);
    if (b) paint(b, false);
    pickedRef.current = id;
    const n = id && els.current.get(id);
    if (n) paint(n, true);
  };

  const close = useCallback(() => { setDetail(null); setError(""); pick(null); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const open = useCallback(async (id: string) => {
    if (pickedRef.current === id) { close(); return; } // 한 번 더 누르면 닫는다
    pick(id);
    setError("");
    const r = await fetch(`/api/presale?id=${encodeURIComponent(id)}`).then((x) => x.json()).catch(() => null);
    if (pickedRef.current !== id) return;
    if (r?.success) setDetail(r.item);
    else { setDetail(null); setError(r?.error || "분양 정보를 불러오지 못했습니다."); }
  }, [close]); // eslint-disable-line react-hooks/exhaustive-deps

  const draw = useCallback(async () => {
    const map = kakaoMapRef.current, kakao = (window as any).kakao;
    if (!map || !kakao?.maps) return;
    const b = map.getBounds(), sw = b.getSouthWest(), ne = b.getNorthEast();
    abort.current?.abort();
    const ac = new AbortController();
    abort.current = ac;
    const r = await fetch(`/api/presale?sw=${sw.getLat()},${sw.getLng()}&ne=${ne.getLat()},${ne.getLng()}`, { signal: ac.signal }).then((x) => x.json()).catch(() => null);
    if (ac.signal.aborted) return;
    clear();
    if (!r?.success) { setError("분양 정보를 불러오지 못했습니다. 잠시 뒤 지도를 다시 움직여 보세요."); return; }
    setError("");
    const proj = map.getProjection();
    const taken: { x: number; y: number }[] = [];
    const level = map.getLevel();
    // 겹치면 — 청약이 가까운(진행 중·곧 시작) 것부터 자리를 잡는다
    const order = (m: Marker) => { const s = presaleStage(m); return s.live ? 0 : s.done ? 2 : 1; };
    const list = ((r.items || []) as Marker[]).sort((a, b) => order(a) - order(b)).filter((m) => {
      if (level <= 2) return true;
      const pt = proj.containerPointFromCoords(new kakao.maps.LatLng(m.lat, m.lng));
      if (taken.some((t) => Math.abs(t.x - pt.x) < 46 && Math.abs(t.y - pt.y) < 34)) return false;
      taken.push({ x: pt.x, y: pt.y });
      return true;
    });
    for (const m of list) {
      const st = presaleStage(m);
      const color = st.done ? PRESALE_DIM : PRESALE;
      const el = document.createElement("div");
      el.dataset.color = color;
      el.style.cssText = "position:relative;cursor:pointer;user-select:none;text-align:center;font-family:inherit;filter:drop-shadow(0 1px 2px rgba(0,0,0,.22))";
      const fa = mobile ? 9.5 : 10.5, fp = mobile ? 12 : 13.5;
      const top = m.rep?.area ? areaLabel(m.rep.area) : m.house_type || "분양";
      const price = m.rep?.price ? shortPrice(m.rep.price) : "분양";
      el.innerHTML =
        `<div style="background:#fff;border:1px solid ${color};border-radius:6px;padding:${mobile ? "2px 6px 3px" : "3px 7px 4px"};line-height:1.15;white-space:nowrap">` +
        `<div style="font-size:${fa}px;font-weight:600;color:#6b7280" data-t="#6b7280"><span style="display:inline-block;background:${color};color:#fff;border-radius:3px;padding:0 3px;margin-right:3px;font-size:${fa - 1}px;font-weight:800">분양</span>${esc(top)}</div>` +
        `<div style="font-size:${fp}px;font-weight:800;letter-spacing:-.3px;color:${color}" data-t="${color}">${esc(price)}</div>` +
        `<div style="font-size:${fa}px;font-weight:800;color:${st.done ? "#9ca3af" : color}" data-t="${st.done ? "#9ca3af" : color}">${esc(st.short)}</div></div>` +
        `<div style="width:0;height:0;margin:-1px auto 0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:6px solid #fff"></div>`;
      const pos = new kakao.maps.LatLng(m.lat, m.lng);
      const ov = new kakao.maps.CustomOverlay({ position: pos, content: el, yAnchor: 1, zIndex: 2, clickable: true });
      if (!mobile) {
        // 올리면 카드 — 이름 · 공급 · 청약 일정 (단지 시세 카드와 같은 모양, 그래프 자리에 일정)
        el.addEventListener("mouseenter", () => {
          ov.setZIndex(6);
          hidePeek();
          const box = document.createElement("div");
          box.style.cssText = "transform:translateY(-70px);pointer-events:none";
          const when = [m.receipt_start && `청약 ${m.receipt_start.slice(5).replace("-", ".")}${m.receipt_end && m.receipt_end !== m.receipt_start ? `~${m.receipt_end.slice(5).replace("-", ".")}` : ""}`, m.winner_date && `발표 ${m.winner_date.slice(5).replace("-", ".")}`].filter(Boolean).join(" · ");
          box.innerHTML = `<div style="background:#fff;border:1px solid #d6d9de;border-radius:6px;box-shadow:0 4px 14px rgba(0,0,0,.18);padding:10px 14px 11px;white-space:nowrap">` +
            `<div style="display:flex;align-items:center;gap:8px"><span style="font-size:15.5px;font-weight:800;color:#111">${esc(m.name)}</span><span style="font-size:11.5px;font-weight:800;color:#fff;background:${color};border-radius:4px;padding:1px 6px">${esc(st.short)}</span></div>` +
            (when ? `<div style="font-size:13px;color:${PRESALE};font-weight:700;margin-top:4px">${esc(when)}</div>` : "") +
            `<div style="font-size:12.5px;color:#444;margin-top:2px">${esc([m.house_type, m.total_units ? `${m.total_units.toLocaleString("ko-KR")}세대` : ""].filter(Boolean).join(" · "))}</div></div>`;
          const p = new kakao.maps.CustomOverlay({ position: pos, content: box, yAnchor: 1, zIndex: 50, clickable: false });
          p.setMap(map);
          peek.current = p;
          if (box.parentElement) box.parentElement.style.pointerEvents = "none";
        });
        el.addEventListener("mouseleave", () => { ov.setZIndex(m.id === pickedRef.current ? 5 : 2); hidePeek(); });
      }
      el.addEventListener("click", (e) => { e.stopPropagation(); hidePeek(); open(m.id); });
      ov.setMap(map);
      overlays.current.push(ov);
      els.current.set(m.id, el);
      if (m.id === pickedRef.current) requestAnimationFrame(() => paint(el, true));
    }
  }, [kakaoMapRef, mobile, open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!enabled || !mapLoaded) return;
    let map: any = null, stopped = false, timer: ReturnType<typeof setTimeout> | undefined;
    const listener = () => draw();
    const attach = () => {
      const kakao = (window as any).kakao;
      if (stopped) return;
      if (!kakaoMapRef.current || !kakao?.maps) { timer = setTimeout(attach, 200); return; }
      map = kakaoMapRef.current;
      kakao.maps.event.addListener(map, "idle", listener);
      draw();
    };
    attach();
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      const kakao = (window as any).kakao;
      if (map && kakao?.maps) kakao.maps.event.removeListener(map, "idle", listener);
      abort.current?.abort();
      clear();
      close();
    };
  }, [enabled, mapLoaded, kakaoMapRef, draw]); // eslint-disable-line react-hooks/exhaustive-deps

  // PC — 왼쪽 목록 자리에 (단지 창과 같은 자리)
  useEffect(() => {
    if (mobile || !detail) return;
    const measure = () => {
      const el = document.querySelector("aside[data-gongsil-side]") as HTMLElement | null;
      if (!el) return setSide(null);
      const r = el.getBoundingClientRect();
      setSide((v) => (v && v.left === r.left && v.top === r.top && v.height === r.height ? v : { left: r.left, top: r.top, height: r.height }));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [mobile, detail]);

  if (!enabled) return null;
  return (
    <>
      {error && (
        <div style={{ position: "absolute", left: "50%", bottom: 28, transform: "translateX(-50%)", zIndex: 1000, background: "rgba(17,24,39,.88)", color: "#fff", fontSize: 14, fontWeight: 600, padding: "10px 18px", borderRadius: 20, pointerEvents: "none" }}>{error}</div>
      )}
      {detail && <PresaleDetailPanel item={detail} onClose={close} mobile={mobile} side={!mobile && side ? side : undefined} />}
    </>
  );
}
