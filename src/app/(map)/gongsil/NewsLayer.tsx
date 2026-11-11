"use client";
/**
 * 공실열람 지도 [우리동네뉴스] 켜기·끄기 (2026-11-04 사장님: 우리동네뉴스를 공실열람에 — 합치지 말고 실거래가처럼 단추로)
 *  켜면 위치가 있는 공실뉴스 기사를 지도 위 자리 그대로 주황 숫자 동그라미로 — 위쪽 칸에 맞춰 거른다 (11-04 사장님):
 *  [전체] 공실뉴스 기사 전부 · [아파트·오피스텔] 아파트/오피스텔 · … · [신축/분양] · [경매/공매] · [MY관심공실] 기사 없음.
 *  부동산·경제 · 라이프·오피니언 · AI마케팅 기사는 공실열람에 띄우지 않는다 (우리동네뉴스 메뉴에서는 그대로).
 *  가까운 기사는 하나로 묶고, 누르면 그 자리 기사 카드가 작은 창으로 · 카드를 누르면 기사로.
 *  왼쪽 공실 목록 · 위쪽 칸 · 우리동네뉴스 메뉴(/news_map)는 그대로 둔다. 들어올 때마다 꺼진 채로 시작 (11-04).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { mapNewsInBox } from "@/app/actions/mapNews";
import NewsArticlePanel from "./NewsArticlePanel";
import { starHtml, useStars } from "./stars";

const ORANGE = "#ff8e15";
const KEY = "gs-news-layer";
const GRID = 46; // 화면에서 이만큼(px) 가까우면 하나로 묶는다

type Art = { id: string; article_no?: number | string | null; title: string; subtitle?: string | null; lat: number; lng: number; published_at?: string | null; created_at?: string | null; author_name?: string | null; section1?: string | null; section2?: string | null; thumbnail_url?: string | null; location_name?: string | null };

const esc = (v: unknown) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const day = (d?: string | null) => (d ? d.slice(0, 10).replace(/-/g, ".") : "");
const href = (a: Art) => `/news/${a.article_no || a.id}`;
/** 공실열람 칸(activeCategory) → 이 기사를 띄우나 */
const fits = (a: Art, cat: string) => {
  if (a.section1 !== "공실뉴스" || cat === "wish") return false;
  const s2 = String(a.section2 || "");
  if (cat === "apart") return /아파트|오피스텔/.test(s2);
  if (cat === "villa") return /빌라|주택|다가구|다세대/.test(s2);
  if (cat === "one") return /원룸|투룸/.test(s2);
  if (cat === "biz") return /상가|사무실|빌딩|공장|토지/.test(s2);
  if (cat === "sale") return s2 === "신축/분양";
  if (cat === "auction") return s2 === "경매/공매";
  return true; // 전체
};

/**
 * mobile — 모바일 공실열람 지도에도 (2026-11-11 사장님: "기사만 동그라미로 보이고 클릭하면 기사 리스트, 지금 PC와 같이")
 *  동그라미·말풍선 목록은 PC 그대로. 다른 점: [기사 보러가기]는 옆 창 대신 모바일 기사 화면(/m/news/…)으로 · 단추 이름 [뉴스] ·
 *  말풍선 폭은 화면에 맞춤 · 왼쪽 목록이 없으니 기사 창(NewsArticlePanel)은 띄우지 않는다
 */
export default function NewsLayer({ kakaoMapRef, mapLoaded, buttonSlot, category, mobile = false }: { kakaoMapRef: React.MutableRefObject<any>; mapLoaded: boolean; buttonSlot: HTMLElement | null; category: string; mobile?: boolean }) {
  const [on, setOn] = useState(false);
  useStars(); // ★ 찜 목록 불러오기
  const [arts, setArts] = useState<Art[] | null>(null);
  const [busy, setBusy] = useState(false);
  const overlays = useRef<any[]>([]);
  const popup = useRef<any>(null);
  const popupKey = useRef(""); // 지금 열린 말풍선이 어느 동그라미 것인지 — 같은 동그라미를 다시 누르면 닫는다 (11-04)
  const [reading, setReading] = useState<string | null>(null); // 기사 보기 창 — 우리동네뉴스처럼 왼쪽 목록 옆에 (11-04)
  const readingRef = useRef<string | null>(null);
  // 열린 기사는 단추가 빨간 [기사닫기 ✕] — 한 번 더 누르면 창이 들어간다 (우리동네뉴스와 같은 방식, 11-04 사장님)
  const paintOpen = (id: string | null) => {
    document.querySelectorAll<HTMLAnchorElement>("[data-open]").forEach((l) => {
      const mine = Boolean(id) && l.dataset.open === id;
      l.innerHTML = mine ? "기사닫기 ✕" : "기사 보러가기 &gt;";
      l.style.color = mine ? "#d32f2f" : ORANGE;
    });
  };
  useEffect(() => {
    readingRef.current = reading;
    paintOpen(reading);
    // 지도는 고정 — 다만 기사 자리가 기사 창(왼쪽 750px)에 가려질 때만, 창 바로 오른쪽까지 가로로 조금 옮긴다
    // (11-04 사장님: 늘 움직이면 정신없고, 늘 고정하면 너무 가린다)
    const kakao = (window as any).kakao, map = kakaoMapRef.current;
    const art = reading ? arts?.find((x) => x.id === reading) : null;
    if (art && map && kakao?.maps) {
      const w = (map.getNode?.() as HTMLElement | undefined)?.clientWidth || 0;
      const x = map.getProjection().containerPointFromCoords(new kakao.maps.LatLng(art.lat, art.lng)).x;
      const edge = 750 + 170; // 창 오른쪽 + 말풍선 반 폭
      if (w > edge + 100 && x < edge) map.panBy(x - edge, 0);
    }
    window.dispatchEvent(new CustomEvent("gs-news-reading", { detail: reading })); // 왼쪽 뉴스 목록도 같은 표시
  }, [reading]); // eslint-disable-line react-hooks/exhaustive-deps

  // 들어올 때마다 꺼진 채로 시작 — 켠 것을 기억하지 않는다 (11-04 사장님: 지도가 복잡하지 않게)
  useEffect(() => { try { localStorage.removeItem(KEY); } catch { /* */ } }, []);
  const toggle = () => setOn((v) => !v);

  // 지금 보이는 지도 범위만 서버에서 (회원이 많아도 가볍게, 11-04) — 지도를 멈출 때마다 0.3초 기다렸다가, 같은 범위는 다시 안 받는다
  const boxKey = useRef("");
  const fetchBox = useCallback(() => {
    const kakao = (window as any).kakao, map = kakaoMapRef.current;
    if (!on || !map || !kakao?.maps) return;
    const b = map.getBounds(), sw = b.getSouthWest(), ne = b.getNorthEast();
    // 범위를 조금 넓혀(가장자리 동그라미가 끊기지 않게) 소수 셋째 자리로 맞춘 키
    const pad = (ne.getLat() - sw.getLat()) * 0.15;
    const box: [[number, number], [number, number]] = [[sw.getLat() - pad, sw.getLng() - pad], [ne.getLat() + pad, ne.getLng() + pad]];
    const key = box.flat().map((v) => v.toFixed(3)).join(",");
    if (key === boxKey.current) return;
    boxKey.current = key;
    setBusy(true);
    mapNewsInBox(box[0], box[1]).then((l) => { if (boxKey.current === key) setArts(l as Art[]); }).catch(() => {}).finally(() => setBusy(false));
  }, [on, kakaoMapRef]);
  useEffect(() => {
    const kakao = (window as any).kakao, map = kakaoMapRef.current;
    if (!on || !mapLoaded || !map || !kakao?.maps) { boxKey.current = ""; return; }
    let t: ReturnType<typeof setTimeout> | undefined;
    const idle = () => { if (t) clearTimeout(t); t = setTimeout(fetchBox, 300); };
    fetchBox();
    kakao.maps.event.addListener(map, "idle", idle);
    return () => { if (t) clearTimeout(t); kakao.maps.event.removeListener(map, "idle", idle); };
  }, [on, mapLoaded, fetchBox, kakaoMapRef]);

  const closePopup = (quiet = false) => {
    if (popup.current && !quiet) window.dispatchEvent(new CustomEvent("gs-news-select", { detail: null })); // 왼쪽 목록도 지도 화면 뉴스로
    popup.current?.setMap(null); popup.current = null; popupKey.current = "";
  };
  const clear = () => { overlays.current.forEach((o) => o.setMap(null)); overlays.current = []; closePopup(); };

  /** 우리동네뉴스 말풍선과 같은 모양 (2026-11-04 사장님: 그 디자인 그대로 + 앞에 썸네일만) — 흰 상자 · 제목 굵게 2줄 · 부제목 1줄 ·
   *  아래 줄에 날짜·글쓴이 / 주황 [기사 보러가기 >] · ✕ · 아래 꼬리. 여러 개면 같은 줄을 이어 붙이고 넘치면 스크롤 */
  const openPopup = useCallback((group: Art[], pos: any) => {
    const kakao = (window as any).kakao;
    closePopup(true); // 다른 말풍선으로 바꿀 때는 왼쪽 목록을 그대로 둔다
    // 동그라미가 화면 위쪽(검색 줄 근처)이면 말풍선을 아래로 — 지도는 옮기지 않는다
    const map = kakaoMapRef.current;
    const below = map.getProjection().containerPointFromCoords(pos).y < (mobile ? 260 : 330);
    const link = (a: Art) => (mobile ? `/m/news/${a.article_no || a.id}` : href(a));
    const boxW = (w: number) => (mobile ? `min(${w}px, calc(100vw - 32px))` : `${w}px`);
    const wrap = document.createElement("div");
    wrap.style.cssText = (below ? "margin-top:22px;" : "margin-bottom:22px;") + "position:relative;font-family:'Pretendard',inherit;line-height:1.4;cursor:default;white-space:normal"; // 지도 겹창은 줄바꿈을 막아 둔다 — 제목 2줄이 되게
    // 위: 썸네일 | 제목(부제목은 넣지 않는다, 11-04 사장님) · 아래: 날짜·글쓴이 / 기사 보러가기 — 아래 줄은 썸네일 밑까지 가로 전체
    const row = (a: Art, i: number) =>
      `<div style="${i ? "padding-top:14px;margin-top:14px;border-top:1px solid #f0f0f0;" : ""}">` +
      `<div style="display:flex;gap:10px;align-items:center">` +
      (a.thumbnail_url ? `<img src="${esc(a.thumbnail_url)}" alt="" style="width:64px;height:52px;object-fit:cover;border-radius:6px;flex-shrink:0;background:#f3f4f6"/>` : "") +
      `<div style="min-width:0;flex:1">` +
      `<h4 style="margin:0 ${i ? 0 : 18}px 0 0;font-size:14.5px;font-weight:800;color:#111;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;word-break:keep-all;letter-spacing:-.5px">${esc(a.title)}</h4>` +
      `</div></div>` +
      `<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:10px;padding-top:10px;border-top:1px solid #f0f0f0">` +
      `<span style="font-size:12px;color:#a1a1aa;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(day(a.published_at || a.created_at))} · ${esc(a.author_name || "공실뉴스")}</span>` +
      `<span style="margin-left:auto;display:inline-flex;align-items:center;gap:8px">${starHtml("art", a.id, 18)}<a href="${esc(link(a))}" data-open="${esc(a.id)}" style="font-size:13px;font-weight:700;color:${ORANGE};text-decoration:none;white-space:nowrap">기사 보러가기 &gt;</a></span>` +
      `</div></div>`;
    wrap.innerHTML =
      `<div data-box style="position:relative;background:#fff;padding:14px 16px;width:${boxW(group.some((a) => a.thumbnail_url) ? 300 : 250)};max-height:${mobile ? 300 : 340}px;overflow-y:auto;border-radius:8px;box-shadow:0 6px 20px rgba(0,0,0,.15);border:1px solid #ddd">` +
      `<div data-x title="닫기" style="position:absolute;top:10px;right:12px;font-size:18px;color:#999;cursor:pointer;line-height:1;padding:4px;z-index:1">✕</div>` +
      group.map(row).join("") +
      `</div>` +
      // 꼬리 (테두리 + 흰 삼각형) — 말풍선이 아래로 뜨면 꼬리는 위로
      (below
        ? `<div style="position:absolute;top:-11px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:11px solid transparent;border-right:11px solid transparent;border-bottom:11px solid #ddd"></div>` +
          `<div style="position:absolute;top:-10px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:11px solid transparent;border-right:11px solid transparent;border-bottom:11px solid #fff"></div>`
        : `<div style="position:absolute;bottom:-11px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:11px solid transparent;border-right:11px solid transparent;border-top:11px solid #ddd"></div>` +
          `<div style="position:absolute;bottom:-10px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:11px solid transparent;border-right:11px solid transparent;border-top:11px solid #fff"></div>`);
    wrap.querySelector("[data-x]")?.addEventListener("click", (e) => { e.stopPropagation(); closePopup(); });
    // [기사 보러가기] — 페이지를 떠나지 않고 왼쪽 목록 옆에 기사 창 (새 탭으로 열기는 그대로 된다: Ctrl·가운데 단추)
    wrap.querySelectorAll<HTMLAnchorElement>("[data-open]").forEach((l) => l.addEventListener("click", (e) => {
      if (mobile) { e.stopPropagation(); return; } // 모바일은 링크 그대로 — 모바일 기사 화면으로 넘어간다
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1) return;
      e.preventDefault(); e.stopPropagation();
      const id = l.dataset.open || null;
      setReading(readingRef.current === id ? null : id);
    }));
    ["mousedown", "touchstart", "wheel", "dblclick"].forEach((t) => wrap.addEventListener(t, (e) => e.stopPropagation())); // 창 안에서 지도가 움직이지 않게
    // 모바일 — 지도 위 말풍선은 가장자리 동그라미에서 화면 밖으로 잘린다 → 화면 아래에서 올라오는 카드로 (같은 목록, 꼬리 없이)
    if (mobile) {
      wrap.style.cssText = "position:fixed;left:12px;right:12px;bottom:72px;z-index:60;font-family:'Pretendard',inherit;line-height:1.4;white-space:normal";
      const box = wrap.querySelector<HTMLElement>("[data-box]");
      if (box) { box.style.width = "auto"; box.style.maxHeight = "46vh"; box.style.borderRadius = "14px"; box.style.boxShadow = "0 -4px 24px rgba(0,0,0,.18)"; }
      wrap.querySelectorAll<HTMLElement>("div").forEach((d) => { if (/border-(top|bottom):11px solid/.test(d.getAttribute("style") || "")) d.remove(); });
      document.body.appendChild(wrap);
      popup.current = { setMap: (m: unknown) => { if (m === null) wrap.remove(); } };
      paintOpen(readingRef.current);
      return;
    }
    const o = new kakao.maps.CustomOverlay({ position: pos, content: wrap, xAnchor: 0.5, yAnchor: below ? 0 : 1, zIndex: 20, clickable: true });
    o.setMap(map);
    popup.current = o;
    paintOpen(readingRef.current);
  }, [kakaoMapRef, mobile]);

  const draw = useCallback(() => {
    const kakao = (window as any).kakao, map = kakaoMapRef.current;
    if (!map || !kakao?.maps || !arts) return;
    overlays.current.forEach((o) => o.setMap(null)); overlays.current = [];
    const b = map.getBounds(), sw = b.getSouthWest(), ne = b.getNorthEast();
    const proj = map.getProjection();
    const inView = arts.filter((a) => fits(a, category) && a.lat >= sw.getLat() && a.lat <= ne.getLat() && a.lng >= sw.getLng() && a.lng <= ne.getLng());
    // 왼쪽 목록에 "뉴스 N개" (GongsilSidebar) — 새 기사부터
    window.dispatchEvent(new CustomEvent("gs-news-visible", { detail: [...inView].sort((p, q) => String(q.published_at || q.created_at || "").localeCompare(String(p.published_at || p.created_at || ""))) }));
    // 화면 칸(GRID px)마다 묶기
    const cells = new Map<string, { list: Art[]; x: number; y: number }>();
    for (const a of inView) {
      const pt = proj.containerPointFromCoords(new kakao.maps.LatLng(a.lat, a.lng));
      const k = `${Math.floor(pt.x / GRID)}:${Math.floor(pt.y / GRID)}`;
      const c = cells.get(k) || { list: [], x: 0, y: 0 };
      c.list.push(a); c.x += a.lat; c.y += a.lng;
      cells.set(k, c);
    }
    for (const c of cells.values()) {
      const n = c.list.length, size = n >= 30 ? 46 : n >= 10 ? 40 : n >= 2 ? 36 : 32;
      const pos = new kakao.maps.LatLng(c.x / n, c.y / n);
      const el = document.createElement("div");
      el.textContent = String(n);
      el.title = n === 1 ? c.list[0].title : `우리동네뉴스 ${n}개`;
      el.style.cssText = `width:${size}px;height:${size}px;border-radius:50%;background:${ORANGE};color:#fff;border:2.5px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center;font-size:${n >= 10 ? 14 : 13}px;font-weight:800;cursor:pointer;user-select:none;box-sizing:border-box;transition:transform .12s ease,border-width .12s ease,background .12s ease`;
      // 마우스를 올리면 공실 동그라미처럼 조금 커지고 테두리가 굵어진다 (11-04 사장님)
      el.addEventListener("mouseenter", () => {
        el.style.transform = "scale(1.18)"; el.style.borderWidth = "3.5px"; el.style.background = "#e67300";
        if (el.parentElement) el.parentElement.style.zIndex = "100";
      });
      el.addEventListener("mouseleave", () => {
        el.style.transform = ""; el.style.borderWidth = "2.5px"; el.style.background = ORANGE;
        if (el.parentElement) el.parentElement.style.zIndex = "3";
      });
      const key = c.list.map((a) => a.id).sort().join(",");
      ["mousedown", "mouseup", "touchstart"].forEach((t) => el.addEventListener(t, (ev) => ev.stopPropagation())); // 겹친 공실 표시로 눌림이 새지 않게
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        const list = [...c.list].sort((p, q) => String(q.published_at || q.created_at || "").localeCompare(String(p.published_at || p.created_at || "")));
        // 모바일 — 공실 동그라미를 누르면 "공실광고 N개" 화면이 뜨듯이 "뉴스 N개" 목록 화면 (2026-11-11 사장님)
        if (mobile) { openMobileList(list); return; }
        if (popup.current && popupKey.current === key) { closePopup(); return; } // 또 누르면 닫기
        openPopup(list, pos);
        popupKey.current = key;
        // 왼쪽 목록에 이 동그라미 기사들 (11-04 사장님: 동그라미를 누르면 좌측 기사 목록에)
        window.dispatchEvent(new CustomEvent("gs-news-select", { detail: list }));
      });
      const o = new kakao.maps.CustomOverlay({ position: pos, content: el, yAnchor: 0.5, zIndex: 3, clickable: true });
      o.setMap(map);
      overlays.current.push(o);
    }
  }, [arts, kakaoMapRef, openPopup, category, mobile]); // eslint-disable-line react-hooks/exhaustive-deps

  // 모바일 "뉴스 N개" 목록 화면 — 공실 목록(list-panel)과 같은 자리·모양. 휴대폰 [뒤로]로도 닫힌다
  const [mList, setMList] = useState<Art[] | null>(null);
  const [mounted, setMounted] = useState(false); // 목록 화면은 브라우저에서만 그린다 (서버 화면과 어긋나지 않게)
  useEffect(() => setMounted(true), []);
  const openMobileList = (list: Art[]) => { window.history.pushState({ panel: "news" }, ""); setMList(list); };
  useEffect(() => {
    if (!mList) return;
    const back = () => setMList(null);
    window.addEventListener("popstate", back);
    return () => window.removeEventListener("popstate", back);
  }, [mList]);
  const closeMobileList = () => { if (window.history.state?.panel === "news") window.history.back(); else setMList(null); };
  // 모바일 — 단지 딱지의 주황 동그라미·단지 창 [뉴스]를 누르면 그 단지 기사 목록 (2026-11-11 사장님: "단지를 클릭하면 나와야지")
  //  PC 는 같은 신호(gs-news-select)를 왼쪽 목록이 받는다. [뉴스] 단추가 꺼져 있어도 열린다
  useEffect(() => {
    if (!mobile) return;
    const pick = (e: Event) => {
      const list = (e as CustomEvent).detail;
      if (Array.isArray(list) && list.length) openMobileList(list as Art[]);
    };
    window.addEventListener("gs-news-select", pick);
    return () => window.removeEventListener("gs-news-select", pick);
  }, [mobile]); // eslint-disable-line react-hooks/exhaustive-deps

  // 공실 표시나 부동산을 누르면 뉴스 말풍선은 닫는다 — 다음에 뉴스를 누르면 다시 열리게 (11-04 사장님: 왼쪽 목록은 누른 것에 따라)
  useEffect(() => {
    const shut = (e: Event) => { if (e.type === "gs-vacancy-pick" || (e as CustomEvent).detail) closePopup(true); };
    window.addEventListener("gs-vacancy-pick", shut);
    const moved = () => closePopup(true); // 지도를 움직이면 말풍선도 닫는다 (목록은 새 화면 뉴스로)
    window.addEventListener("gs-map-moved", moved);
    window.addEventListener("gs-agency-open", shut);
    return () => { window.removeEventListener("gs-vacancy-pick", shut); window.removeEventListener("gs-agency-open", shut); window.removeEventListener("gs-map-moved", moved); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!on) { setReading(null); window.dispatchEvent(new CustomEvent("gs-news-visible", { detail: null })); } }, [on]);
  // 왼쪽 뉴스 목록에서 고른 기사 — 지도에 말풍선 + 옆에 기사 창
  useEffect(() => {
    const pick = (e: Event) => {
      const id = String((e as CustomEvent).detail || "");
      const a = arts?.find((x) => x.id === id);
      const kakao = (window as any).kakao;
      if (a && kakao?.maps) openPopup([a], new kakao.maps.LatLng(a.lat, a.lng));
      setReading(readingRef.current === id ? null : id || null);
    };
    window.addEventListener("gs-news-open", pick);
    return () => window.removeEventListener("gs-news-open", pick);
  }, [arts, openPopup]);
  useEffect(() => {
    if (!on || !mapLoaded || !arts) { clear(); return; }
    const kakao = (window as any).kakao, map = kakaoMapRef.current;
    if (!map || !kakao?.maps) return;
    draw();
    kakao.maps.event.addListener(map, "idle", draw);
    const shut = () => closePopup();
    kakao.maps.event.addListener(map, "click", shut);
    return () => {
      kakao.maps.event.removeListener(map, "idle", draw);
      kakao.maps.event.removeListener(map, "click", shut);
      clear();
    };
  }, [on, mapLoaded, arts, draw, kakaoMapRef]); // eslint-disable-line react-hooks/exhaustive-deps

  const button = (
    <button type="button" onClick={toggle} title="우리동네뉴스 기사를 지도 위에 보기"
      style={mobile
        ? { border: `1.5px solid ${ORANGE}`, borderRadius: 999, cursor: "pointer", padding: "6px 12px", fontSize: 13, fontWeight: 800, whiteSpace: "nowrap", background: on ? ORANGE : "#fff", color: on ? "#fff" : ORANGE, boxShadow: "0 2px 8px rgba(0,0,0,.12)" }
        : { border: `1.5px solid ${ORANGE}`, borderRadius: 6, cursor: "pointer", padding: "6px 10px", fontSize: 14, fontWeight: 800, whiteSpace: "nowrap", background: on ? ORANGE : "#fff", color: on ? "#fff" : ORANGE }}>
      {mobile ? "뉴스" : "우리동네뉴스"}{on && busy ? "…" : ""}
    </button>
  );
  return (
    <>
      {buttonSlot ? createPortal(button, buttonSlot) : null}
      {!mobile && <NewsArticlePanel id={reading} onClose={() => setReading(null)} />}
      {mobile && mounted && createPortal(
        <div className={`list-panel ${mList ? "open" : ""}`} style={{ zIndex: 10001 }} onClick={(e) => e.stopPropagation()}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", gap: 10, backgroundColor: "#fff" }}>
            <button type="button" onClick={closeMobileList} aria-label="뒤로" style={{ background: "none", border: "none", cursor: "pointer", display: "flex", padding: 4, marginLeft: -4 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: "#111827", margin: 0 }}>뉴스 <span style={{ color: ORANGE }}>{mList?.length || 0}</span>개</h3>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 90px" }}>
            {(mList || []).map((a) => (
              <a key={a.id} href={`/m/news/${a.article_no || a.id}`} style={{ display: "flex", gap: 14, padding: "20px 0", borderBottom: "1px solid #f3f4f6", textDecoration: "none", color: "inherit" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    {a.section2 && <span style={{ fontSize: 12, fontWeight: 700, color: ORANGE, border: `1px solid ${ORANGE}`, borderRadius: 4, padding: "2px 6px" }}>{a.section2}</span>}
                    <span style={{ fontSize: 13, color: "#9ca3af" }}>{day(a.published_at || a.created_at)}</span>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#111827", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", wordBreak: "keep-all" }}>{a.title}</div>
                  {a.subtitle && <div style={{ fontSize: 14, color: "#6b7280", marginTop: 6, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{String(a.subtitle).split("\n")[0]}</div>}
                  <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 8 }}>{a.author_name || "공실뉴스"}{a.location_name ? ` · ${a.location_name}` : ""}</div>
                </div>
                {a.thumbnail_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.thumbnail_url} alt="" style={{ width: 130, height: 96, objectFit: "cover", borderRadius: 10, flexShrink: 0, background: "#f3f4f6" }} />
                )}
              </a>
            ))}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
