"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { getBannersByPlacement, trackBannerClick, trackBannerView } from "@/app/actions/banner";

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

function setCookie(name: string, value: string, hours: number) {
  const d = new Date();
  d.setTime(d.getTime() + hours * 60 * 60 * 1000);
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${d.toUTCString()};path=/`;
}

export default function PopupBanner() {
  const [popups, setPopups] = useState<any[]>([]);
  const [closedIds, setClosedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function load() {
      const res = await getBannersByPlacement("POPUP");
      if (res.success && res.data.length > 0) {
        // 쿠키로 "오늘 하루 보지 않기" 체크된 배너 필터링
        const hidden = getCookie("popup_hidden_ids");
        const hiddenSet = new Set(hidden ? hidden.split(",") : []);
        const visible = res.data.filter((b: any) => !hiddenSet.has(b.id));
        setPopups(visible);

        // 노출 추적
        visible.forEach((b: any) => trackBannerView(b.id));
      }
    }
    load();
  }, []);

  const handleClose = useCallback((id: string) => {
    setClosedIds(prev => new Set(prev).add(id));
  }, []);

  const handleCloseToday = useCallback((id: string) => {
    // 기존 쿠키에 추가
    const existing = getCookie("popup_hidden_ids");
    const ids = existing ? existing.split(",") : [];
    if (!ids.includes(id)) ids.push(id);
    setCookie("popup_hidden_ids", ids.join(","), 24);
    setClosedIds(prev => new Set(prev).add(id));
  }, []);

  const handleClick = useCallback(async (banner: any) => {
    await trackBannerClick(banner.id, window.location.href, navigator.userAgent);
    if (banner.link_url) {
      const url = banner.link_url.startsWith("http") ? banner.link_url : `https://${banner.link_url}`;
      window.open(url, banner.link_target || "_blank");
    }
  }, []);

  const visiblePopups = popups.filter(p => !closedIds.has(p.id));
  if (visiblePopups.length === 0) return null;

  return (
    <>
      {/* 오버레이 백드롭 */}
      <div
        style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.5)", zIndex: 9999998,
          animation: "fadeIn 0.3s ease",
        }}
        onClick={() => visiblePopups.forEach(p => handleClose(p.id))}
      />

      {/* 팝업들 */}
      {visiblePopups.map((popup, idx) => (
        <div
          key={popup.id}
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: `translate(-50%, -50%) translateY(${idx * 20}px)`,
            zIndex: 9999999 + idx,
            background: "#fff",
            borderRadius: 12,
            boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
            overflow: "hidden",
            maxWidth: 520,
            width: "90vw",
            animation: "popupSlideIn 0.3s ease",
          }}
        >
          {/* 팝업 이미지 */}
          <div
            style={{ cursor: popup.link_url ? "pointer" : "default" }}
            onClick={() => handleClick(popup)}
          >
            <Image
              src={popup.image_url}
              alt={popup.title}
              width={520}
              height={600}
              sizes="(max-width: 520px) 90vw, 520px"
              style={{ width: "100%", height: "auto", display: "block" }}
              unoptimized={popup.image_url?.includes("supabase")}
            />
          </div>

          {/* 하단 버튼 영역 */}
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "12px 16px", background: "#f9fafb", borderTop: "1px solid #eee",
          }}>
            <button
              onClick={() => handleCloseToday(popup.id)}
              style={{
                background: "none", border: "none", fontSize: 13, color: "#888",
                cursor: "pointer", padding: "4px 8px", fontFamily: "inherit",
              }}
            >
              오늘 하루 보지 않기
            </button>
            <button
              onClick={() => handleClose(popup.id)}
              style={{
                background: "#111", color: "#fff", border: "none", borderRadius: 6,
                padding: "8px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              닫기
            </button>
          </div>
        </div>
      ))}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes popupSlideIn { from { opacity: 0; transform: translate(-50%, -45%); } to { opacity: 1; transform: translate(-50%, -50%); } }
      `}</style>
    </>
  );
}
