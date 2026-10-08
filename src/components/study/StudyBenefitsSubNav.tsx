"use client";

import React from "react";
import Link from "next/link";

/** 멤버십혜택 4개 페이지를 오갈 수 있는 서브 내비 */
export const STUDY_BENEFITS = [
  { slug: "vacancy-register", label: "공실등록20건", href: "/study/benefits/vacancy-register" },
  { slug: "blog-automation", label: "블로그포스팅자동화", href: "/study/benefits/blog-automation" },
  { slug: "ai-youtube", label: "유튜브강의+드론저작권", href: "/study/benefits/ai-youtube" },
  { slug: "lecture-upload", label: "강의영상업로딩", href: "/study/benefits/lecture-upload" },
] as const;

const POINT = "#059669";

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
        position: "absolute", left: 36, bottom: 24, zIndex: 3,
        display: "flex", gap: 5, padding: 4, borderRadius: 12,
        background: "#ffffff", border: "1px solid #dce9e5",
        boxShadow: "0 4px 14px rgba(0, 0, 0, 0.06)",
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
              padding: "9px 15px", borderRadius: 8, fontSize: 13.5, whiteSpace: "nowrap", textDecoration: "none",
              fontWeight: isActive ? 800 : 600,
              color: isActive ? "#ffffff" : "#44403c",
              background: isActive ? POINT : "transparent",
              boxShadow: isActive ? "0 3px 12px rgba(5, 150, 105, 0.4)" : "none",
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
