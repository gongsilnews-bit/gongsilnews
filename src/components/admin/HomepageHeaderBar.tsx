"use client";

import React, { useEffect, useState } from "react";
import { getHomepageSettings, saveHomepageSettings } from "@/app/actions/homepage";
import { HOMEPAGE_ACTIVE_EVENT, shareHomepageUrl } from "@/hooks/useHomepageEditor";

/**
 * 관리자 상단의 물건접수웹페이지 바로가기.
 *
 * 편집기 왼쪽 위와 같은 [사용 중] 스위치 · 주소 · 공유하기를 어느 메뉴에서든 쓰게 한다.
 * 편집기와 달리 저장 버튼이 없으므로 스위치는 누르는 즉시 저장하고, 편집기와 서로
 * 값을 맞춘다. 주소를 한 번도 저장하지 않은 회원에게는 보이지 않는다.
 */
export default function HomepageHeaderBar({ memberId, darkMode }: { memberId: string; darkMode: boolean }) {
  const [subdomain, setSubdomain] = useState("");
  const [siteTitle, setSiteTitle] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let alive = true;
    getHomepageSettings(memberId).then((res) => {
      if (!alive || !res.success || !res.data) return;
      const d: any = res.data;
      setSubdomain(d.subdomain || "");
      setSiteTitle(d.site_title || "");
      setIsActive(d.is_active !== false);
    });
    const onActive = (e: Event) => setIsActive((e as CustomEvent<boolean>).detail);
    window.addEventListener(HOMEPAGE_ACTIVE_EVENT, onActive);
    return () => {
      alive = false;
      window.removeEventListener(HOMEPAGE_ACTIVE_EVENT, onActive);
    };
  }, [memberId]);

  if (!subdomain) return null;

  const liveUrl = `https://${subdomain}.gongsilnews.com`;
  const border = darkMode ? "#374151" : "#e5e7eb";
  const text = darkMode ? "#f3f4f6" : "#111827";
  const sub = darkMode ? "#9ca3af" : "#6b7280";
  const bg = darkMode ? "#1f2937" : "#ffffff";

  const flash = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2000);
  };

  const toggleActive = async () => {
    const next = !isActive;
    setSaving(true);
    const res = await saveHomepageSettings(memberId, { subdomain, theme_name: "intake", is_active: next });
    setSaving(false);
    if (!res.success) return flash("저장 실패");
    setIsActive(next);
    window.dispatchEvent(new CustomEvent(HOMEPAGE_ACTIVE_EVENT, { detail: next }));
  };

  const share = async () => {
    try {
      const result = await shareHomepageUrl(liveUrl, siteTitle || "물건접수웹페이지");
      if (result !== "aborted") flash(result === "shared" ? "공유 완료" : "주소 복사됨");
    } catch {
      flash("공유 실패");
    }
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
      <span style={{ fontSize: 15, fontWeight: 800, color: text, whiteSpace: "nowrap" }}>물건접수웹페이지</span>
      <button
        type="button"
        role="switch"
        aria-checked={isActive}
        onClick={toggleActive}
        disabled={saving}
        style={{ display: "inline-flex", alignItems: "center", gap: 7, flexShrink: 0, padding: "6px 10px", border: `1px solid ${isActive ? "#86efac" : border}`, borderRadius: 999, background: isActive ? (darkMode ? "#052e24" : "#f0fdf4") : (darkMode ? "#111827" : "#f8fafc"), color: isActive ? "#059669" : sub, fontSize: 12.5, fontWeight: 800, cursor: saving ? "wait" : "pointer" }}
      >
        <span aria-hidden style={{ width: 8, height: 8, borderRadius: "50%", background: isActive ? "#10b981" : "#9ca3af" }} />
        {isActive ? "사용 중" : "사용 안 함"}
      </button>
      <a href={liveUrl} target="_blank" rel="noreferrer" title={liveUrl} style={{ minWidth: 0, maxWidth: 280, display: "flex", alignItems: "center", gap: 6, padding: "8px 11px", border: `1px solid ${border}`, borderRadius: 8, background: bg, color: text, fontSize: 12.5, fontWeight: 700, textDecoration: "none" }}>
        <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{liveUrl}</span>
        <span aria-hidden style={{ flexShrink: 0 }}>↗</span>
      </a>
      <button type="button" onClick={share} style={{ flexShrink: 0, padding: "8px 12px", border: `1px solid ${border}`, borderRadius: 8, background: bg, color: text, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
        {notice || "공유하기"}
      </button>
    </div>
  );
}
