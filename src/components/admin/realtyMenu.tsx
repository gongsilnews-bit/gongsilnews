"use client";

import React, { useState } from "react";
import { MenuItem } from "@/components/admin/sections/types";
import { IconDashboard, IconBuilding, IconArticle, IconAd, IconStudy, IconCustomer, IconManual, IconPoint, IconHomepage, IconSend, IconFilm } from "@/components/admin/sections/AdminIcons";

/**
 * 중개사 관리자(/realty_admin) 메뉴 구성 — 2026-10-15 회의 (다)안
 *  - 최고관리자가 모든 회원의 기본 메뉴(업무·더보기와 순서)를 정한다: agent_settings 'realty_menu_default'
 *  - 회원은 그 기본을 각자 바꿀 수 있다: members.admin_menu (비어 있으면 기본을 따른다)
 *  - 정보설정은 늘 맨 아래에 고정이라 여기서 다루지 않는다.
 */

export type MenuLayout = { main: string[]; more: string[] };

export const REALTY_MENU_CATALOG: MenuItem[] = [
  { key: "dashboard", label: "대시보드", icon: <IconDashboard /> },
  { key: "gongsil", label: "공실등록", icon: <IconBuilding /> },
  { key: "article", label: "기사등록", icon: <IconArticle /> },
  { key: "sns", label: "뉴스·SNS발행", icon: <IconSend /> },
  { key: "video", label: "동영상제작", icon: <IconFilm /> },
  { key: "customer", label: "고객관리", icon: <IconCustomer /> },
  { key: "article_ad", label: "광고관리", icon: <IconAd /> },
  { key: "study", label: "특강관리", icon: <IconStudy /> },
  { key: "inquiry_board", label: "1:1문의", icon: <IconCustomer /> },
  { key: "point", label: "포인트", icon: <IconPoint /> },
  { key: "homepage", label: "물건접수웹페이지", icon: <IconHomepage /> },
  { key: "manual", label: "매뉴얼", icon: <IconManual /> },
];

/** 공실뉴스가 처음 정한 기본 (최고관리자가 바꾸기 전) */
export const FACTORY_LAYOUT: MenuLayout = {
  main: ["dashboard", "gongsil", "article", "sns", "video", "customer"],
  more: ["article_ad", "study", "inquiry_board", "point", "homepage", "manual"],
};

const KEYS = new Set(REALTY_MENU_CATALOG.map((m) => m.key));
export const menuItem = (key: string) => REALTY_MENU_CATALOG.find((m) => m.key === key)!;

/**
 * 저장된 구성을 지금 메뉴 목록에 맞춘다.
 * 없어진 메뉴는 빼고, 새로 생긴 메뉴는 기준(fallback)에서 놓인 쪽 끝에 붙인다. 대시보드는 늘 업무에 둔다.
 */
export function normalizeLayout(layout: Partial<MenuLayout> | null | undefined, fallback: MenuLayout = FACTORY_LAYOUT): MenuLayout {
  if (!layout || !Array.isArray(layout.main) || !Array.isArray(layout.more)) return { main: [...fallback.main], more: [...fallback.more] };
  const seen = new Set<string>();
  const pick = (list: string[]) => list.filter((k) => KEYS.has(k) && !seen.has(k) && seen.add(k));
  const main = pick(layout.main);
  const more = pick(layout.more);
  for (const k of fallback.main) if (!seen.has(k)) { main.push(k); seen.add(k); }
  for (const k of fallback.more) if (!seen.has(k)) { more.push(k); seen.add(k); }
  for (const k of KEYS) if (!seen.has(k)) more.push(k);
  if (!main.includes("dashboard")) {
    const i = more.indexOf("dashboard");
    if (i >= 0) more.splice(i, 1);
    main.unshift("dashboard");
  }
  return { main, more };
}

type Theme = { cardBg: string; textPrimary: string; textSecondary: string; border: string; bg?: string };

/** 업무·더보기 두 줄을 오가며 순서를 바꾸는 편집기 (회원 메뉴 편집·최고관리자 기본값 공용) */
export function MenuLayoutEditor({ theme, value, onChange }: { theme: Theme; value: MenuLayout; onChange: (v: MenuLayout) => void }) {
  const [drag, setDrag] = useState<{ key: string } | null>(null);

  const move = (key: string, to: "main" | "more", index?: number) => {
    if (key === "dashboard" && to === "more") return; // 대시보드는 업무에 고정
    const main = value.main.filter((k) => k !== key);
    const more = value.more.filter((k) => k !== key);
    const list = to === "main" ? main : more;
    list.splice(index === undefined ? list.length : Math.max(0, Math.min(index, list.length)), 0, key);
    onChange({ main, more });
  };
  const step = (key: string, dir: -1 | 1) => {
    const where = value.main.includes(key) ? "main" : "more";
    const list = value[where];
    const i = list.indexOf(key);
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    const next = list.slice();
    [next[i], next[j]] = [next[j], next[i]];
    onChange({ ...value, [where]: next });
  };

  const btn: React.CSSProperties = { width: 28, height: 28, border: `1px solid ${theme.border}`, borderRadius: 6, background: theme.cardBg, color: theme.textPrimary, cursor: "pointer", fontSize: 12, fontWeight: 800 };

  const column = (where: "main" | "more", title: string, hint: string) => (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={() => drag && move(drag.key, where)}
      style={{ flex: 1, minWidth: 240, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 12, background: theme.bg || "#f6f8fa" }}
    >
      <div style={{ fontSize: 14, fontWeight: 800, color: theme.textPrimary }}>{title}</div>
      <div style={{ fontSize: 12, color: theme.textSecondary, margin: "2px 0 10px" }}>{hint}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {value[where].map((key, i) => {
          const m = menuItem(key);
          return (
            <div key={key} draggable={key !== "dashboard" || where === "main"}
              onDragStart={() => setDrag({ key })} onDragEnd={() => setDrag(null)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.stopPropagation(); if (drag) move(drag.key, where, i); }}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 8, background: theme.cardBg, border: `1px solid ${drag?.key === key ? "#1a3a6b" : theme.border}`, cursor: "grab" }}>
              <span style={{ color: theme.textSecondary, fontSize: 14 }}>⠿</span>
              <span style={{ width: 18, height: 18, display: "block", flexShrink: 0 }}>
                {React.cloneElement(m.icon as React.ReactElement<React.SVGProps<SVGSVGElement>>, { style: { width: 18, height: 18, stroke: theme.textPrimary } })}
              </span>
              <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: theme.textPrimary }}>{m.label}</span>
              <button style={btn} onClick={() => step(key, -1)} title="위로">▲</button>
              <button style={btn} onClick={() => step(key, 1)} title="아래로">▼</button>
              {key !== "dashboard" && (
                <button style={{ ...btn, width: "auto", padding: "0 8px" }} onClick={() => move(key, where === "main" ? "more" : "main")}>
                  {where === "main" ? "더보기로" : "업무로"}
                </button>
              )}
            </div>
          );
        })}
        {value[where].length === 0 && <div style={{ fontSize: 13, color: theme.textSecondary, padding: 8 }}>여기로 끌어다 놓으세요.</div>}
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
      {column("main", "업무", "왼쪽 메뉴 위쪽에 늘 보이는 메뉴")}
      {column("more", "더보기", "[더보기]를 눌러야 보이는 메뉴")}
    </div>
  );
}
