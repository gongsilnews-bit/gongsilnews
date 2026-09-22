"use client";

import React from "react";
import { pickTheme } from "../../theme";

interface Props {
  subdomain: string;
  settings: any;
  member: any;
  companyProfile: any;
}

/**
 * 기사 팝업 위에 얹는 중개사 띠.
 *
 * 기사 본문은 포털 화면(NewsReadContent)을 그대로 쓴다. 다만 창만 따로 뜨면
 * 여기가 어느 부동산인지 사라지므로, 맨 위에 상호와 접수 버튼 한 줄만 붙인다.
 * 접수 버튼은 이 창이 아니라 원래 홈페이지의 접수 폼으로 보낸다.
 */
export default function SubdomainArticleBar({ subdomain, settings, member, companyProfile }: Props) {
  const theme = pickTheme(settings?.intake?.theme_color);
  const brandMode = settings?.intake?.brand_mode || "both";
  const logoSize = settings?.intake?.logo_size || "medium";
  const logoHeight = logoSize === "small" ? 20 : logoSize === "large" ? 30 : 24;
  const showLogo = Boolean(settings?.logo_url) && brandMode !== "text";
  const showText = brandMode !== "logo" || !settings?.logo_url;

  // 서브도메인 없이 /sites/{주소} 로 들어온 경우(로컬·미리보기)에는 홈 링크에도 같은 접두어를 붙인다
  const home =
    typeof window !== "undefined" && window.location.pathname.startsWith(`/sites/${subdomain}`)
      ? `/sites/${subdomain}`
      : "";

  const officeName =
    settings?.site_title ||
    companyProfile?.name ||
    companyProfile?.company_name ||
    member?.name ||
    "부동산";

  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 60,
        height: 54,
        padding: "0 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-start",
        gap: 12,
        background: theme.dark,
        fontFamily: "'Pretendard Variable', -apple-system, sans-serif",
      }}
    >
      <a href={home || "/"} style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, textDecoration: "none" }}>
        {showLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={settings.logo_url} alt={officeName} style={{ height: logoHeight, width: "auto", maxWidth: brandMode === "logo" ? 150 : 100, objectFit: "contain" }} />
        ) : null}
        {showText && <span style={{ fontSize: 15.5, fontWeight: 900, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", letterSpacing: "-0.4px" }}>
          {officeName}
        </span>}
      </a>
    </div>
  );
}
