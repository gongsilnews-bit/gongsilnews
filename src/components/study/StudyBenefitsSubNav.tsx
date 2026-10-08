"use client";

import React from "react";
import Link from "next/link";

/** 멤버십혜택 3개 페이지를 오갈 수 있는 서브 내비 (공실뉴스부동산 BenefitsSubNav 와 같은 역할) */
export const STUDY_BENEFITS = [
  { slug: "vacancy-register", label: "공실등록20건", href: "/study/benefits/vacancy-register" },
  { slug: "blog-automation", label: "블로그포스팅자동화", href: "/study/benefits/blog-automation" },
  { slug: "ai-youtube", label: "유튜브강의+드론저작권", href: "/study/benefits/ai-youtube" },
] as const;

const POINT = "#e2552b";

export default function StudyBenefitsSubNav({ active }: { active: string }) {
  return (
    <div style={{ borderBottom: "1px solid #eaedf0", background: "#ffffff" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "0 20px", display: "flex", gap: 28 }}>
        {STUDY_BENEFITS.map((item) => {
          const isActive = item.slug === active;
          return (
            <Link
              key={item.slug}
              href={item.href}
              style={{
                position: "relative",
                padding: "16px 0",
                fontSize: 14.5,
                fontWeight: isActive ? 800 : 600,
                color: isActive ? POINT : "#475569",
                textDecoration: "none",
                whiteSpace: "nowrap",
              }}
            >
              {item.label}
              {isActive && (
                <span style={{ position: "absolute", left: 0, right: 0, bottom: -1, height: 2, background: POINT, borderRadius: 2 }} />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/**
 * 멤버십혜택 히어로 카드 안에 들어가는 3개 탭.
 * 히어로 카드(position: relative) 왼쪽 아래에 고정 위치로 띄워서, 페이지마다 제목·설명 길이가
 * 달라도 탭 자리가 같다. 탭을 눌러 다른 혜택 페이지로 가도 위치가 흔들리지 않는다.
 */
export function StudyBenefitsHeroTabs({ active }: { active: string }) {
  return (
    <nav
      aria-label="멤버십혜택"
      style={{
        position: "absolute", left: 48, bottom: 32, zIndex: 3,
        display: "flex", gap: 6, padding: 5, borderRadius: 12,
        // 밝은 히어로(미색 바탕) 위에 흰 카드로 띄운다
        background: "#ffffff", border: "1px solid #e7dfd4",
        boxShadow: "0 4px 14px rgba(70, 50, 30, 0.08)",
      }}
    >
      {STUDY_BENEFITS.map((item) => {
        const isActive = item.slug === active;
        return (
          <Link
            key={item.slug}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            style={{
              padding: "10px 18px", borderRadius: 8, fontSize: 14.5, whiteSpace: "nowrap", textDecoration: "none",
              fontWeight: isActive ? 800 : 600,
              color: isActive ? "#ffffff" : "#44403c",
              background: isActive ? POINT : "transparent",
              boxShadow: isActive ? "0 3px 12px rgba(180, 63, 24, 0.4)" : "none",
              transition: "all 0.15s",
            }}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
