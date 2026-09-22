"use client";

import React from "react";
import type { Theme } from "../theme";

interface Props {
  theme: Theme;
  /** members.sns_links. 종류별로 { url } 이 들어있다 */
  snsLinks: any;
  /** 사무소 주소. 넣으면 줄 끝에 길찾기 핀이 하나 붙는다 */
  mapAddress?: string;
}

/** 주소 칸이 비어 있는 종류는 아예 만들지 않는다. api_* 는 SNS 가 아니라 연동 설정이다 */
function usableKeys(snsLinks: any): string[] {
  if (!snsLinks || typeof snsLinks !== "object") return [];
  return Object.keys(snsLinks).filter(
    (k) => k !== "api_info" && k !== "api_list" && snsLinks[k]?.url
  );
}

const NAMES: Record<string, string> = {
  homepage: "홈페이지",
  contact: "문의하기",
  shopping_mall: "쇼핑몰",
  blog: "블로그",
  cafe: "카페",
  youtube: "유튜브",
  facebook: "페이스북",
  twitter: "트위터",
  instagram: "인스타그램",
  kakao: "카카오",
  threads: "쓰레드",
};

/** 아이콘은 포털 기자 프로필과 같은 것을 쓴다. 같은 사람을 두 곳에서 다르게 그릴 이유가 없다 */
function icon(key: string) {
  const stroke = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (key) {
    case "blog":
      return <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: "-0.3px" }}>BLOG</span>;
    case "cafe":
      return <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: "-0.3px" }}>CAFE</span>;
    case "contact":
      return (
        <svg {...stroke}>
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      );
    case "youtube":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.99C18.88 4 12 4 12 4s-6.88 0-8.59.43A2.78 2.78 0 0 0 1.46 6.42C1 8.16 1 12 1 12s0 3.84.46 5.58a2.78 2.78 0 0 0 1.95 1.99C5.12 20 12 20 12 20s6.88 0 8.59-.43a2.78 2.78 0 0 0 1.95-1.99C23 15.84 23 12 23 12s0-3.84-.46-5.58zM9.54 15.55V8.45L15.82 12l-6.28 3.55z" />
        </svg>
      );
    case "instagram":
      return (
        <svg {...stroke}>
          <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
        </svg>
      );
    case "facebook":
      return (
        <svg {...stroke}>
          <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
        </svg>
      );
    case "twitter":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z" />
        </svg>
      );
    case "kakao":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 3c-5.5 0-10 3.5-10 7.8 0 2.8 1.8 5.2 4.4 6.5l-1 3.7c-.1.3.3.6.5.4l4.3-2.9c.6.1 1.2.1 1.8.1 5.5 0 10-3.5 10-7.8S17.5 3 12 3z" />
        </svg>
      );
    case "homepage":
      return (
        <svg {...stroke}>
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      );
    case "shopping_mall":
      return (
        <svg {...stroke}>
          <circle cx="9" cy="21" r="1" />
          <circle cx="20" cy="21" r="1" />
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
        </svg>
      );
    default:
      return (
        <svg {...stroke}>
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
      );
  }
}

/**
 * 중개사의 블로그·카페·유튜브 줄.
 *
 * [정보설정]에 넣어둔 주소를 그대로 읽는다. 홈페이지에서 따로 입력받지 않는다 —
 * 같은 주소를 두 군데 적게 하면 한쪽은 반드시 낡는다.
 */
export default function SnsLinks({ theme, snsLinks, mapAddress }: Props) {
  const keys = usableKeys(snsLinks);
  if (!keys.length && !mapAddress) return null;

  const circle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 42,
    height: 42,
    borderRadius: "50%",
    background: "#f4f6f8",
    border: "1px solid #e6eaee",
    color: theme.dark,
    textDecoration: "none",
    flexShrink: 0,
  };

  return (
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 9, marginBottom: 24 }}>
      {keys.map((key) => {
        const raw = String(snsLinks[key].url);
        const href = raw.startsWith("http") ? raw : `https://${raw}`;
        return (
          <a
            key={key}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            title={NAMES[key] || key}
            aria-label={NAMES[key] || key}
            style={circle}
          >
            <span style={{ width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {icon(key)}
            </span>
          </a>
        );
      })}

      {/* 오시는 길 — 누르면 지도 앱이 열려 길찾기까지 이어진다 */}
      {mapAddress && (
        <a
          href={`https://map.kakao.com/link/search/${encodeURIComponent(mapAddress)}`}
          target="_blank"
          rel="noopener noreferrer"
          title="오시는 길"
          aria-label="오시는 길"
          style={circle}
        >
          <span style={{ width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </span>
        </a>
      )}
    </div>
  );
}
