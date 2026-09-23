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
  /** 등록된 중개사무소 명칭. 홈페이지 제목을 바꿔도 이 줄은 늘 나온다 */
  legalName?: string;
  /** [정보설정]의 부동산 소개. 홈페이지에서 따로 입력받지 않는다 */
  intro?: string;
  address?: string;
  regNum?: string;
  /** members.sns_links — [정보설정]에 넣어둔 블로그·카페·유튜브 주소 */
  snsLinks?: any;
  /** SNS 링크를 붙일 수 있는가 */
  allowSns?: boolean;
}

/**
 * 연락처 — 온라인 전단지의 CONTACT AGENT 와 같은 블록.
 *
 * 폼을 끝까지 안 채우고 내려온 사람을 위한 마지막 출구다. 여기서는 접수보다
 * 전화가 낫다. 이미 폼을 지나쳐 온 사람이다.
 */
export default function ContactSection({ officeName, theme, phone, agentMobile, representative, intro, address, regNum, legalName, snsLinks, allowSns = true }: Props) {
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
          <p style={{ margin: "0 0 14px 0", fontSize: 14.5, fontWeight: 600, color: "#6b7280" }}>{representative}</p>
        )}

        {intro && (
          <p style={{ margin: "0 auto 20px", maxWidth: 420, fontSize: 14.5, lineHeight: 1.75, color: "#6b7684", wordBreak: "keep-all" }}>
            {intro}
          </p>
        )}

        <div aria-hidden style={{ width: 40, height: 2, background: "#d1d5db", margin: "0 auto 24px" }} />

        {(phone || agentMobile) && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, marginBottom: 22 }}>
            {/*
              번호 자체가 버튼이다. 폰에서 누르면 바로 전화가 걸린다.
              앞에 있던 동그란 전화 아이콘은 뺐다 — 누를 수 있는 것처럼 보이는데
              아무 일도 안 하는 그림이라, 번호를 가리기만 했다.
            */}
            {[
              { label: "사무실", value: phone },
              { label: "휴대폰", value: agentMobile },
            ]
              .filter((t) => t.value)
              // 대표 전화에 휴대폰 번호를 그대로 적어둔 중개사가 흔하다. 그대로 두면
              // 같은 번호가 사무실·휴대폰 두 줄로 나온다. 하이픈을 떼고 비교해 하나만 남긴다.
              .filter((t, i, list) => {
                const digits = (v: any) => String(v).replace(/[^0-9]/g, "");
                return list.findIndex((x) => digits(x.value) === digits(t.value)) === i;
              })
              .map((t) => (
                <a
                  key={t.label}
                  href={`tel:${String(t.value).replace(/[^0-9+]/g, "")}`}
                  style={{
                    display: "inline-flex",
                    alignItems: "baseline",
                    gap: 10,
                    padding: "4px 2px",
                    color: "#111827",
                    textDecoration: "none",
                  }}
                >
                  <span style={{ fontSize: 12.5, fontWeight: 800, color: "#98a2ad", letterSpacing: "0.3px" }}>{t.label}</span>
                  <span style={{ fontSize: 25, fontWeight: 900, letterSpacing: "-0.5px" }}>{t.value}</span>
                </a>
              ))}
          </div>
        )}

        {allowSns && <SnsLinks theme={theme} snsLinks={snsLinks} />}

        {legalName && <p style={{ margin: "0 0 4px 0", fontSize: 13.5, color: "#6b7280" }}>상호: {legalName}</p>}
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
