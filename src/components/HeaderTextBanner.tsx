"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { getBannersByPlacement, trackBannerClick, trackBannerView } from "@/app/actions/banner";

export default function HeaderTextBanner({ initialBanners }: { initialBanners?: any[] }) {
  const [banners, setBanners] = useState<any[]>(initialBanners || []);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const viewedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (initialBanners !== undefined) return;
    
    async function load() {
      const res = await getBannersByPlacement("HEADER_TEXT");
      if (res.success && res.data.length > 0) {
        setBanners(res.data);
      }
    }
    load();
  }, [initialBanners]);

  // 노출 추적 (간단하게 컴포넌트 마운트 시 보이는 배너들 추적)
  useEffect(() => {
    banners.forEach((b) => {
      if (!viewedRef.current.has(b.id)) {
        viewedRef.current.add(b.id);
        trackBannerView(b.id);
      }
    });
  }, [banners]);

  useEffect(() => {
    if (banners.length <= 1 || !listRef.current || !containerRef.current || !dropdownRef.current) return;

    let idx = 0;
    const itemHeight = 24;
    const items = listRef.current.querySelectorAll("li.ticker-item-el");
    const totalItems = items.length;
    
    // Cleanup previous clones in case of strict mode double execution
    const oldClones = listRef.current.querySelectorAll(".clone-item");
    oldClones.forEach(el => el.remove());

    const firstClone = items[0].cloneNode(true) as HTMLElement;
    firstClone.classList.add("clone-item");
    listRef.current.appendChild(firstClone);
    
    const count = totalItems + 1;

    function startTicker() {
      timerRef.current = setInterval(() => {
        idx++;
        if (listRef.current) {
          listRef.current.style.transition = "transform 0.5s ease-in-out";
          listRef.current.style.transform = `translateY(-${idx * itemHeight}px)`;
          if (idx === count - 1) {
            setTimeout(() => {
              if (listRef.current) {
                listRef.current.style.transition = "none";
                listRef.current.style.transform = `translateY(0)`;
                idx = 0;
              }
            }, 500);
          }
        }
      }, 3000);
    }

    startTicker();

    const c = containerRef.current;
    const d = dropdownRef.current;

    const onEnter = () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (d) d.style.display = "block";
    };
    const onLeave = () => {
      startTicker();
      if (d) d.style.display = "none";
    };

    c.addEventListener("mouseenter", onEnter);
    c.addEventListener("mouseleave", onLeave);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      c.removeEventListener("mouseenter", onEnter);
      c.removeEventListener("mouseleave", onLeave);
    };
  }, [banners]);

  const handleClick = useCallback((banner: any, e: React.MouseEvent) => {
    e.preventDefault();
    if (banner.link_url) {
      const url = banner.link_url.startsWith("http") ? banner.link_url : `https://${banner.link_url}`;
      window.open(url, (banner.link_target || "_blank").split("|")[0]);
    }
    trackBannerClick(banner.id, window.location.href, navigator.userAgent);
  }, []);

  if (banners.length === 0) {
    // 배너가 없을 때는 빈 공간 유지를 위해 최소한의 기본 영역 렌더링
    return <div className="txt-banner-container" style={{ height: 24 }}></div>;
  }

  return (
    <div className="txt-banner-container" ref={containerRef}>
      <div className="txt-banner-wrap">
        <ul ref={listRef} style={{ listStyle: "none", margin: 0, padding: 0, textAlign: "right", width: "100%" }}>
          {banners.map((b) => (
            <li key={b.id} className="ticker-item-el" style={{ height: 24, display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
              <a href={b.link_url || "#"} className="free-banner" onClick={(e) => handleClick(b, e)}>
                {b.title}
              </a>
            </li>
          ))}
        </ul>
      </div>
      <div className="txt-dropdown" ref={dropdownRef} style={{ display: "none" }}>
        <ul style={{ listStyle: "none", margin: 0, padding: 0, textAlign: "left" }}>
          {banners.map((b, i) => (
            <li key={b.id} style={{ borderBottom: i < banners.length - 1 ? "1px solid #eee" : "none" }}>
              <a href={b.link_url || "#"} onClick={(e) => handleClick(b, e)}>
                {b.title}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
