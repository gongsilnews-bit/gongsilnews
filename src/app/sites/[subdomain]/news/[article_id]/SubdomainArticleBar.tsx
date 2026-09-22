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
        justifyContent: "space-between",
        gap: 12,
        background: theme.dark,
        fontFamily: "'Pretendard Variable', -apple-system, sans-serif",
      }}
    >
      <a href={home || "/"} style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, textDecoration: "none" }}>
        {settings?.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={settings.logo_url} alt={officeName} style={{ height: 24, objectFit: "contain" }} />
        ) : null}
        <span style={{ fontSize: 15.5, fontWeight: 900, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", letterSpacing: "-0.4px" }}>
          {officeName}
        </span>
      </a>

      <a
        href={`${home}/#intake`}
        style={{ flexShrink: 0, padding: "8px 15px", background: theme.primary, color: "#fff", borderRadius: 999, fontSize: 13.5, fontWeight: 800, textDecoration: "none", whiteSpace: "nowrap" }}
      >
        물건 접수
      </a>
    </div>
  );
}
