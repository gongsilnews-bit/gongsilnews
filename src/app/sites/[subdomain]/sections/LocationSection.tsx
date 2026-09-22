"use client";

import React from "react";
import SectionTitle from "./SectionTitle";
import type { Theme } from "../theme";

interface Props {
  officeName: string;
  theme: Theme;
  address?: string;
  phone?: string;
  businessHours?: string;
  regNum?: string;
  onCta: () => void;
}

/**
 * 오시는 길.
 *
 * 지도를 페이지에 심는 대신 카카오맵을 새 창으로 연다. 폰에서는 지도 앱이 바로
 * 떠서 길찾기까지 이어지고, 이 탭에는 접수 폼이 그대로 남는다. 지도를 심으면
 * 스크롤이 지도에 먹혀서 그 자리에서 더 못 내려가는 일이 잦다.
 */
export default function LocationSection({ officeName, theme, address, phone, businessHours, regNum, onCta }: Props) {
  const rows = [
    { k: "상호", v: officeName },
    { k: "주소", v: address },
    { k: "전화", v: phone, tel: true },
    { k: "영업시간", v: businessHours },
    { k: "등록번호", v: regNum },
  ].filter((r) => r.v);

  return (
    <section id="location" style={{ background: "#f1f3f5", padding: "56px 0 60px", scrollMarginTop: 104 }}>
      <SectionTitle theme={theme} label="LOCATION" title="오시는 길" />

      <div style={{ padding: "0 16px" }}>
        <div
          style={{
            maxWidth: 620,
            margin: "0 auto",
            background: "#fff",
            borderRadius: 4,
            boxShadow: "0 1px 3px rgba(16,24,40,.1)",
            overflow: "hidden",
          }}
        >
          <dl style={{ margin: 0, padding: "8px 20px" }}>
            {rows.map((r, i) => (
              <div
                key={r.k}
                style={{
                  display: "grid",
                  gridTemplateColumns: "74px 1fr",
                  gap: 12,
                  padding: "15px 0",
                  borderBottom: i < rows.length - 1 ? "1px solid #f1f3f5" : "none",
                  alignItems: "baseline",
                }}
              >
                <dt style={{ fontSize: 13.5, fontWeight: 800, color: "#8b95a1" }}>{r.k}</dt>
                <dd style={{ margin: 0, fontSize: 15, color: "#16202b", fontWeight: 600, wordBreak: "keep-all", lineHeight: 1.6 }}>
                  {r.tel ? (
                    <a href={`tel:${r.v}`} style={{ color: theme.primary, fontWeight: 900, textDecoration: "none" }}>
                      {r.v}
                    </a>
                  ) : (
                    r.v
                  )}
                </dd>
              </div>
            ))}
          </dl>

          {address && (
            <a
              href={`https://map.kakao.com/link/search/${encodeURIComponent(address)}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: "16px 12px",
                background: "#16202b",
                color: "#fff",
                fontSize: 15,
                fontWeight: 800,
                textDecoration: "none",
              }}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              지도에서 길찾기
            </a>
          )}
        </div>

        <div style={{ textAlign: "center", marginTop: 26 }}>
          <button
            type="button"
            onClick={onCta}
            style={{
              padding: "16px 38px",
              background: theme.primary,
              color: "#fff",
              border: "none",
              borderRadius: 999,
              fontSize: 16,
              fontWeight: 900,
              cursor: "pointer",
              boxShadow: `0 10px 24px ${theme.primary}44`,
            }}
          >
            물건 접수하기
          </button>
        </div>
      </div>
    </section>
  );
}
