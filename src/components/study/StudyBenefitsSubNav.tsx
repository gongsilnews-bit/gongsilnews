"use client";

import React from "react";
import Link from "next/link";

/** 멤버십혜택 3개 페이지를 오갈 수 있는 서브 내비 (공실뉴스부동산 BenefitsSubNav 와 같은 역할) */
export const STUDY_BENEFITS = [
  { slug: "ai-youtube", label: "AI유튜브강의무료", href: "/study/benefits/ai-youtube" },
  { slug: "vacancy-register", label: "공실등록20건", href: "/study/benefits/vacancy-register" },
  { slug: "community", label: "커뮤니티/자료실", href: "/study/benefits/community" },
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
