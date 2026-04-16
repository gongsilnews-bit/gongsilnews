"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { getBannersByPlacement, trackBannerClick, trackBannerView } from "@/app/actions/banner";

interface BannerSlotProps {
  placement: string;
  className?: string;
  style?: React.CSSProperties;
}

export default function BannerSlot({ placement, className, style }: BannerSlotProps) {
  const [banners, setBanners] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const viewedRef = useRef<Set<string>>(new Set());

  /* ── 배너 데이터 로드 ── */
  useEffect(() => {
    async function load() {
      const res = await getBannersByPlacement(placement);
      if (res.success && res.data.length > 0) {
        setBanners(res.data);
      }
    }
    load();
  }, [placement]);

  /* ── 자동 롤링 ── */
  useEffect(() => {
    if (banners.length <= 1) return;

    const rotatingBanners = banners.filter(b => b.auto_rotate);
    if (rotatingBanners.length === 0 && banners.length <= 1) return;

    const interval = banners[currentIndex]?.rotate_interval || 5;
    timerRef.current = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentIndex(prev => (prev + 1) % banners.length);
        setIsTransitioning(false);
      }, 300);
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
  const handleClick = useCallback(async (banner: any) => {
    await trackBannerClick(banner.id, window.location.href, navigator.userAgent);
    if (banner.link_url) {
      const url = banner.link_url.startsWith("http") ? banner.link_url : `https://${banner.link_url}`;
      window.open(url, banner.link_target || "_blank");
    }
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
          transition: "opacity 0.3s ease",
          opacity: isTransitioning ? 0 : 1,
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
