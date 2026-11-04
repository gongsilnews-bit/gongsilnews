"use client";
/**
 * 공실 표시를 누르면 — 뉴스 말풍선과 같은 모양으로 공실 개요 (2026-11-04 사장님: 공실도 이렇게)
 *  썸네일 | 주소(목록과 같은 가림 규칙)·가격·종류·면적 · 아래 줄 공실번호·날짜 / [공실상세보기 >] (누르면 상세, [상세닫기 ✕]로 닫힘)
 *  물건이 많으면 20개까지만 — 나머지는 "외 N개는 왼쪽 목록에서" (11-04: 많을 때 문제). 지도는 움직이지 않는다.
 *  같은 표시를 또 누르기 · ✕ · 지도 빈 곳 · 지도 끌기 · 뉴스·부동산 누르기 → 닫힘.
 *  알림: KakaoMapView 가 "gs-vacancy-marker" { ids, lat, lng } 를 보낸다.
 */
import { useCallback, useEffect, useRef } from "react";
import { formatAmount, formatAreaWithPy, getAuctionInfo, getCleanAddrText, getPriceText } from "./gongsilHelpers";

const BLUE = "#1a73e8";
const MAX = 20;
const esc = (v: unknown) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

export default function VacancyBalloon({ kakaoMapRef, vacancies, userLevel, currentUser, activeProperty, showDetail, onToggle, onDismiss }: {
  kakaoMapRef: React.MutableRefObject<any>;
  vacancies: any[];
  userLevel: number;
  currentUser: any;
  activeProperty: string | number | null;
  showDetail: boolean;
  onToggle: (prop: any, open: boolean) => void;
  /** 손님이 닫았을 때 (또 누르기 · ✕ · 지도 빈 곳) — 고른 공실을 풀어 왼쪽 목록이 지도 화면 공실로 (11-04 사장님) */
  onDismiss: () => void;
}) {
  const popup = useRef<any>(null);
  const popupKey = useRef("");
  const vacRef = useRef(vacancies); vacRef.current = vacancies;
  const openRef = useRef<string | null>(null);
  openRef.current = showDetail && activeProperty != null ? String(activeProperty) : null;
  const toggleRef = useRef(onToggle); toggleRef.current = onToggle;
  const dismissRef = useRef(onDismiss); dismissRef.current = onDismiss;
  const dismiss = () => { if (!popup.current) return; close(); dismissRef.current(); };

  const paintOpen = () => {
    document.querySelectorAll<HTMLAnchorElement>("[data-vac-open]").forEach((l) => {
      const mine = openRef.current === l.dataset.vacOpen;
      l.innerHTML = mine ? "상세닫기 ✕" : "공실상세보기 &gt;";
      l.style.color = mine ? "#d32f2f" : BLUE;
    });
  };
  useEffect(paintOpen, [activeProperty, showDetail]); // eslint-disable-line react-hooks/exhaustive-deps

  const close = () => { popup.current?.setMap(null); popup.current = null; popupKey.current = ""; };

  const row = useCallback((p: any, i: number) => {
    const auction = p.trade_type === "경매" || p.trade_type === "공매";
    const mine = currentUser && p.owner_id === currentUser.id;
    const masked = p.exposure_type === "부동산노출" && (auction ? userLevel < 1 : userLevel < 2) && !mine; // 목록과 같은 가림 규칙
    const addr = getCleanAddrText(p) || "주소 없음";
    const meta = p.metadata || {};
    const appraisal = meta.appraisal_price || parseInt(meta.apslEvlAmt || "0", 10) || (p.deposit || 0) * 10000;
    const price = auction ? `감정가 ${formatAmount(appraisal)}` : getPriceText(p);
    const kind = auction
      ? (() => { const x = getAuctionInfo(p); return [x.category, x.area].filter(Boolean).join(" | "); })()
      : [p.property_type, p.exclusive_m2 ? formatAreaWithPy(p.exclusive_m2) : ""].filter(Boolean).join(" | ");
    const img = p.images?.[0];
    return `<div style="${i ? "padding-top:14px;margin-top:14px;border-top:1px solid #f0f0f0;" : ""}">` +
      `<div style="display:flex;gap:10px;align-items:center">` +
      (img ? `<img src="${esc(img)}" alt="" style="width:64px;height:52px;object-fit:cover;border-radius:6px;flex-shrink:0;background:#f3f4f6"/>` : "") +
      `<div style="min-width:0;flex:1;margin-right:${i ? 0 : 18}px">` +
      `<div style="font-size:14px;font-weight:800;color:${masked ? "#bbb" : "#111"};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;letter-spacing:${masked ? 1 : -0.3}px">${esc(masked ? addr.replace(/[^\s]/g, "X") : addr)}</div>` +
      `<div style="font-size:15px;font-weight:800;color:${auction ? "#1a4282" : BLUE};margin-top:2px">${esc(price)}</div>` +
      (kind ? `<div style="font-size:12px;color:#666;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(kind)}</div>` : "") +
      `</div></div>` +
      `<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:10px;padding-top:10px;border-top:1px solid #f0f0f0">` +
      `<span style="font-size:12px;color:#a1a1aa;white-space:nowrap"><b style="color:#d9363e">${esc(p.vacancy_no || "")}</b>${p.created_at ? ` · ${esc(String(p.created_at).slice(0, 10).replace(/-/g, "."))}` : ""}</span>` +
      `<a href="#" data-vac-open="${esc(p.id)}" style="font-size:13px;font-weight:700;color:${BLUE};text-decoration:none;white-space:nowrap">공실상세보기 &gt;</a>` +
      `</div></div>`;
  }, [currentUser, userLevel]);

  useEffect(() => {
    const on = (e: Event) => {
      const kakao = (window as any).kakao, map = kakaoMapRef.current;
      const d = (e as CustomEvent).detail as { ids: string[]; lat: number; lng: number } | null;
      if (!d || !map || !kakao?.maps) { close(); return; }
      const key = [...d.ids].sort().join(",");
      if (popup.current && popupKey.current === key) { dismiss(); return; } // 또 누르면 닫기
      const all = d.ids.map((id) => vacRef.current.find((v) => String(v.id) === id)).filter(Boolean);
      close();
      if (!all.length) return;
      const list = all.slice(0, MAX);
      const pos = new kakao.maps.LatLng(d.lat, d.lng);
      const below = map.getProjection().containerPointFromCoords(pos).y < 330; // 위쪽이면 아래로 — 검색 줄에 가리지 않게
      const wrap = document.createElement("div");
      wrap.style.cssText = (below ? "margin-top:24px;" : "margin-bottom:24px;") + "position:relative;font-family:'Pretendard',inherit;line-height:1.4;cursor:default;white-space:normal";
      const tail = (side: "top" | "bottom", color: string, off: number) =>
        `<div style="position:absolute;${side}:-${off}px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:11px solid transparent;border-right:11px solid transparent;border-${side === "top" ? "bottom" : "top"}:11px solid ${color}"></div>`;
      wrap.innerHTML =
        `<div style="position:relative;background:#fff;padding:14px 16px;width:300px;max-height:340px;overflow-y:auto;border-radius:8px;box-shadow:0 6px 20px rgba(0,0,0,.15);border:1px solid #ddd">` +
        `<div data-x title="닫기" style="position:absolute;top:10px;right:12px;font-size:18px;color:#999;cursor:pointer;line-height:1;padding:4px;z-index:1">✕</div>` +
        list.map(row).join("") +
        (all.length > MAX ? `<div style="margin-top:12px;padding-top:10px;border-top:1px solid #f0f0f0;font-size:12.5px;color:#6b7280;text-align:center">외 ${all.length - MAX}개는 왼쪽 목록에서 볼 수 있어요</div>` : "") +
        `</div>` +
        (below ? tail("top", "#ddd", 11) + tail("top", "#fff", 10) : tail("bottom", "#ddd", 11) + tail("bottom", "#fff", 10));
      wrap.querySelector("[data-x]")?.addEventListener("click", (ev) => { ev.stopPropagation(); dismiss(); });
      wrap.querySelectorAll<HTMLAnchorElement>("[data-vac-open]").forEach((l) => l.addEventListener("click", (ev) => {
        ev.preventDefault(); ev.stopPropagation();
        const p = vacRef.current.find((v) => String(v.id) === l.dataset.vacOpen);
        if (p) toggleRef.current(p, openRef.current !== String(p.id));
      }));
      ["mousedown", "touchstart", "wheel", "dblclick"].forEach((t) => wrap.addEventListener(t, (ev) => ev.stopPropagation()));
      popup.current = new kakao.maps.CustomOverlay({ position: pos, content: wrap, xAnchor: 0.5, yAnchor: below ? 0 : 1, zIndex: 20, clickable: true });
      popup.current.setMap(map);
      popupKey.current = key;
      paintOpen();
    };
    // 지도 끌기 · 뉴스 동그라미 · 부동산을 누르면 닫는다
    const shut = (e: Event) => { if (e.type === "gs-map-moved" || (e as CustomEvent).detail) close(); };
    window.addEventListener("gs-vacancy-marker", on);
    ["gs-map-moved", "gs-news-select", "gs-agency-open"].forEach((t) => window.addEventListener(t, shut));
    return () => {
      window.removeEventListener("gs-vacancy-marker", on);
      ["gs-map-moved", "gs-news-select", "gs-agency-open"].forEach((t) => window.removeEventListener(t, shut));
    };
  }, [kakaoMapRef, row]); // eslint-disable-line react-hooks/exhaustive-deps

  // 지도 빈 곳을 누르면 닫기
  useEffect(() => {
    let map: any = null, timer: ReturnType<typeof setTimeout> | undefined;
    const shut = () => dismiss();
    const attach = () => {
      const kakao = (window as any).kakao;
      if (!kakaoMapRef.current || !kakao?.maps) { timer = setTimeout(attach, 400); return; }
      map = kakaoMapRef.current;
      kakao.maps.event.addListener(map, "click", shut);
    };
    attach();
    return () => { if (timer) clearTimeout(timer); const kakao = (window as any).kakao; if (map && kakao?.maps) kakao.maps.event.removeListener(map, "click", shut); close(); };
  }, [kakaoMapRef]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
