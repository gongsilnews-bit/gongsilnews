"use client";

import React from "react";
import type { Theme } from "../theme";
import SectionTitle from "./SectionTitle";

interface Props {
  theme: Theme;
  /** 전화 단추가 걸 번호 (중개사가 고른 쪽) */
  phone: string;
}

/**
 * 무료 홈페이지의 물건 접수 자리 (2026-10-30 사장님).
 *
 * 집주인 접수 폼은 공실마케팅 Pro 부터다. 그렇다고 칸을 비우면 맡기러 온 손님이
 * 막다른 길에 서므로, 같은 자리(#intake)에 전화·문자 단추를 크게 둔다.
 * 헤더 칩·폰 아래 [접수] 단추가 그대로 여기로 온다.
 */
export default function IntakeCallSection({ theme, phone }: Props) {
  const num = String(phone || "").replace(/[^0-9+]/g, "");
  const btn: React.CSSProperties = {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 56,
    borderRadius: 4,
    fontSize: 17,
    fontWeight: 800,
    textDecoration: "none",
  };
  return (
    <section id="intake" style={{ background: "#fff", padding: "56px 0 64px", scrollMarginTop: 54 }}>
      <SectionTitle theme={theme} label="SUBMIT" title="물건 접수" desc="맡기실 물건이 있으면 전화나 문자로 알려 주세요" />
      <div style={{ padding: "0 16px" }}>
        <div style={{ maxWidth: 560, margin: "0 auto", background: "#fff", borderRadius: 4, padding: "30px 22px 34px", border: "1px solid #e8ecf0", boxShadow: "0 1px 3px rgba(16,24,40,.08)", textAlign: "center" }}>
          {num ? (
            <>
              <div style={{ fontSize: 24, fontWeight: 900, color: theme.dark, letterSpacing: "0.5px", marginBottom: 20 }}>{phone}</div>
              <div style={{ display: "flex", gap: 10 }}>
                <a href={`tel:${num}`} style={{ ...btn, background: theme.primary, color: "#fff" }}>전화하기</a>
                <a href={`sms:${num}`} style={{ ...btn, background: "#fff", color: theme.primary, border: `2px solid ${theme.primary}` }}>문자 보내기</a>
              </div>
              <p style={{ margin: "16px 0 0", fontSize: 14, color: "#64748b", lineHeight: 1.7, wordBreak: "keep-all" }}>
                주소와 금액(보증금·월세)을 함께 알려 주시면 더 빠르게 안내해 드립니다.
              </p>
            </>
          ) : (
            <p style={{ margin: 0, fontSize: 15, color: "#64748b" }}>아래 문의하기의 연락처로 알려 주세요.</p>
          )}
        </div>
      </div>
    </section>
  );
}
