"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { getBannersByPlacement, trackBannerClick, trackBannerView } from "@/app/actions/banner";

interface BannerSlotProps {
  placement: string;
  category?: string;
  className?: string;
  style?: React.CSSProperties;
  initialBanners?: any[];
}

export default function BannerSlot({ placement, category, className, style, initialBanners }: BannerSlotProps) {
  const [banners, setBanners] = useState<any[]>(() => {
    if (!initialBanners) return [];
    let fetched = initialBanners;
    if ((placement === "LIST_INLINE" || placement === "LIST_SIDEBAR") && category) {
      fetched = fetched.filter(b => {
        const parts = (b.link_target || "_blank").split("|");
        if (parts.length > 1) {
          const targets = parts[1].split(",");
          return targets.includes(category) || targets.includes("all");
        }
        return true;
      });
    }
    return fetched.map(b => ({ ...b, parsed_target: (b.link_target || "_blank").split("|")[0] }));
  });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const viewedRef = useRef<Set<string>>(new Set());

  /* ── 배너 데이터 로드 ── */
  useEffect(() => {
    if (initialBanners !== undefined) return;
    
    async function load() {
      const res = await getBannersByPlacement(placement);
      if (res.success && res.data.length > 0) {
        let fetched = res.data;
        if ((placement === "LIST_INLINE" || placement === "LIST_SIDEBAR") && category) {
          fetched = fetched.filter(b => {
            const parts = (b.link_target || "_blank").split("|");
            if (parts.length > 1) {
              const targets = parts[1].split(",");
              return targets.includes(category) || targets.includes("all");
            }
            return true;
          });
        }
        fetched = fetched.map(b => ({ ...b, parsed_target: (b.link_target || "_blank").split("|")[0] }));
        setBanners(fetched);
      }
    }
    load();
  }, [placement, category, initialBanners]);

  /* ── 자동 롤링 ── */
  useEffect(() => {
    if (banners.length <= 1) return;

    const rotatingBanners = banners.filter(b => b.auto_rotate);
    if (rotatingBanners.length === 0 && banners.length <= 1) return;

    const interval = banners[currentIndex]?.rotate_interval || 3;
    timerRef.current = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % banners.length);
    }, interval * 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [banners, currentIndex]);

  /* ── Intersection Observer: 노출 추적 ── */
  useEffect(() => {
    if (!containerRef.current || banners.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const banner = banners[currentIndex];
            if (banner && !viewedRef.current.has(banner.id)) {
              viewedRef.current.add(banner.id);
              trackBannerView(banner.id);
            }
          }
        });
      },
      { threshold: 0.5 }
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [banners, currentIndex]);

  /* ── 클릭 핸들러 ── */
  const handleClick = useCallback((banner: any) => {
    // 먼저 링크 열기 (동기 — 팝업 차단 방지)
    if (banner.link_url) {
      const url = banner.link_url.startsWith("http") ? banner.link_url : `https://${banner.link_url}`;
      window.open(url, banner.parsed_target || "_blank");
    }
    // 클릭 추적은 백그라운드로
    trackBannerClick(banner.id, window.location.href, navigator.userAgent);
  }, []);

  if (banners.length === 0) return null;

  const banner = banners[currentIndex];
  if (!banner) return null;

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: "relative",
        overflow: "hidden",
        marginTop: banner.margin_top || 0,
        marginBottom: banner.margin_bottom || 0,
        borderRadius: 8,
        cursor: banner.link_url ? "pointer" : "default",
        ...style,
      }}
      onClick={() => handleClick(banner)}
    >
      {/* 배너 이미지 (Next.js Image → 자동 WebP 압축 + Lazy Loading) */}
      <Image
        src={banner.image_url}
        alt={banner.title}
        width={1200}
        height={400}
        sizes="100vw"
        style={{
          width: "100%",
          height: "auto",
          display: "block",
        }}
        priority={currentIndex === 0}
        unoptimized={banner.image_url?.includes('supabase')}
      />

      {/* 인디케이터 (2개 이상일 때) */}
      {banners.length > 1 && (
        <div style={{
          position: "absolute", bottom: 10, left: "50%", transform: "translateX(-50%)",
          display: "flex", gap: 6, padding: "4px 8px", background: "rgba(0,0,0,0.4)",
          borderRadius: 20,
        }}>
          {banners.map((_, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); setCurrentIndex(i); }}
              style={{
                width: i === currentIndex ? 16 : 6,
                height: 6,
                borderRadius: 3,
                border: "none",
                background: i === currentIndex ? "#fff" : "rgba(255,255,255,0.5)",
                cursor: "pointer",
                padding: 0,
                transition: "all 0.3s ease",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
