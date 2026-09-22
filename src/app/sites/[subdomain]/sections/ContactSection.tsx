"use client";

import React from "react";
import SnsLinks from "./SnsLinks";
import type { Theme } from "../theme";

interface Props {
  officeName: string;
  theme: Theme;
  phone?: string;
  agentMobile?: string;
  representative?: string;
  address?: string;
  regNum?: string;
  /** members.sns_links — [정보설정]에 넣어둔 블로그·카페·유튜브 주소 */
  snsLinks?: any;
}

/**
 * 연락처 — 온라인 전단지의 CONTACT AGENT 와 같은 블록.
 *
 * 폼을 끝까지 안 채우고 내려온 사람을 위한 마지막 출구다. 여기서는 접수보다
 * 전화가 낫다. 이미 폼을 지나쳐 온 사람이다.
 */
export default function ContactSection({ officeName, theme, phone, agentMobile, representative, address, regNum, snsLinks }: Props) {
  return (
    <section id="contact" style={{ background: "#16202b", padding: "60px 16px", scrollMarginTop: 54 }}>
      <div style={{ maxWidth: 620, margin: "0 auto", background: "#fff", borderRadius: 4, padding: "44px 26px", textAlign: "center" }}>
        <span style={{ display: "block", fontSize: 12, fontWeight: 800, letterSpacing: "3px", color: theme.primary, marginBottom: 20 }}>
          CONTACT AGENT
        </span>

        <p style={{ margin: "0 0 8px 0", fontSize: 26, fontWeight: 900, color: "#111827", letterSpacing: "-0.6px", wordBreak: "keep-all" }}>
          {officeName}
        </p>

        {representative && (
          <p style={{ margin: "0 0 20px 0", fontSize: 14.5, fontWeight: 600, color: "#6b7280" }}>{representative}</p>
        )}

        <div aria-hidden style={{ width: 40, height: 2, background: "#d1d5db", margin: "0 auto 24px" }} />

        {(phone || agentMobile) && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, flexWrap: "wrap", marginBottom: 22 }}>
            <span
              aria-hidden
              style={{ width: 42, height: 42, borderRadius: "50%", background: theme.primary, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
            >
              <svg width="21" height="21" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
              {phone && (
                <a href={`tel:${phone}`} style={{ fontSize: 24, fontWeight: 900, color: "#111827", textDecoration: "none", letterSpacing: "-0.5px" }}>
                  {phone}
                </a>
              )}
              {phone && agentMobile && <span style={{ color: "#d1d5db", fontSize: 22, fontWeight: 300 }}>|</span>}
              {agentMobile && (
                <a href={`tel:${agentMobile}`} style={{ fontSize: 24, fontWeight: 900, color: "#111827", textDecoration: "none", letterSpacing: "-0.5px" }}>
                  {agentMobile}
                </a>
              )}
            </span>
          </div>
        )}

        <SnsLinks theme={theme} snsLinks={snsLinks} />

        {regNum && <p style={{ margin: "0 0 4px 0", fontSize: 13.5, color: "#6b7280" }}>등록번호: {regNum}</p>}
        {address && <p style={{ margin: "0 0 26px 0", fontSize: 13.5, color: "#6b7280", wordBreak: "keep-all" }}>소재지: {address}</p>}

        {address && (
          <a
            href={`https://map.kakao.com/link/search/${encodeURIComponent(address)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", padding: "16px 12px", background: theme.dark, color: "#fff", borderRadius: 4, fontSize: 15.5, fontWeight: 800, textDecoration: "none", letterSpacing: "0.3px" }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            지도에서 길찾기
          </a>
        )}
      </div>
    </section>
  );
}
