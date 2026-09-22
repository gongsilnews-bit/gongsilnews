"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import SiteHeader, { type NavItem } from "./sections/SiteHeader";
import HeroSection from "./sections/HeroSection";
import VacancySection from "./sections/VacancySection";
import ArticleSection from "./sections/ArticleSection";
import IntakeFormSection from "./sections/IntakeFormSection";
import ContactSection from "./sections/ContactSection";
import MobileBottomBar from "./sections/MobileBottomBar";
import { pickTheme } from "./theme";

interface Props {
  subdomain: string;
  settings: any;
  member: any;
  companyProfile: any;
  /** 공실등록에 올려둔 매물 (ACTIVE) */
  vacancies?: any[];
  /** 승인된 기사 */
  articles?: any[];
  /** 편집기 미리보기에서 렌더할 때. 화면에 붙는 요소를 틀 안에 가둔다 */
  preview?: "pc" | "mobile" | null;
}

/**
 * 중개사 원페이지 홈페이지.
 *
 * 순서는 고정이다 — 히어로 → 매물 → 기사 → 접수 폼 → 연락처.
 * 믿을 재료를 먼저 보여주고 마지막에 접수를 받는다. 중개사가 순서를 고르게 두면
 * 보기 좋은 쪽을 고르지 접수가 잘 되는 쪽을 고르지 않는다.
 *
 * 대신 어느 위치에 있든 접수로 한 번에 갈 수 있게 세 군데(헤더·칩바·하단 고정바)에서
 * 같은 폼으로 보낸다. 매물·기사 상세는 새 창으로 띄워서, 이 탭에 폼이 그대로 남는다.
 */
export default function SiteClient({
  subdomain,
  settings,
  member,
  companyProfile,
  vacancies = [],
  articles = [],
  preview = null,
}: Props) {
  // 편집기가 저장하는 값은 settings.intake 에 모여 있다
  const cfg = settings?.intake || {};
  const theme = pickTheme(cfg.theme_color);

  const officeName =
    settings?.site_title ||
    companyProfile?.name ||
    companyProfile?.company_name ||
    member?.name ||
    "부동산";

  const address = [companyProfile?.address, companyProfile?.address_detail].filter(Boolean).join(" ");
  const phone = settings?.contact_phone || companyProfile?.phone || member?.phone || "";
  const agentMobile = companyProfile?.cell || member?.phone || "";
  const representative = companyProfile?.ceo_name ? `대표 공인중개사 ${companyProfile.ceo_name}` : "";

  // 중개사가 끈 섹션과 내용이 없는 섹션은 아예 빼고 칩도 만들지 않는다.
  // 눌렀더니 빈 칸이 나오는 것보다 없는 편이 낫다.
  const showVacancy = cfg.show_vacancy !== false && vacancies.length > 0;
  const showArticle = cfg.show_article !== false && articles.length > 0;

  const navItems = useMemo<NavItem[]>(() => {
    const items: NavItem[] = [{ id: "top", label: "홈" }];
    if (showVacancy) items.push({ id: "vacancy", label: "우리 매물" });
    if (showArticle) items.push({ id: "article", label: "기사·칼럼" });
    items.push({ id: "intake", label: "물건 접수" });
    items.push({ id: "contact", label: "연락처" });
    return items;
  }, [showVacancy, showArticle]);

  const [activeId, setActiveId] = useState("top");
  const rootRef = useRef<HTMLDivElement>(null);

  /**
   * 새 창으로 열 주소를 만든다.
   *
   * 실제 서비스에서는 hong.gongsilnews.com/news/937 처럼 짧은 주소로 나가고
   * 미들웨어가 알아서 /sites/hong/... 으로 넘긴다.
   *
   * 그런데 서브도메인이 없는 자리 — 로컬(localhost:3000/sites/hong)과 관리자
   * 편집기 미리보기 — 에서는 미들웨어가 걸리지 않아 그 짧은 주소가 포털 화면으로
   * 떨어진다. 그 두 곳에서는 /sites/{주소} 를 앞에 붙여 같은 화면을 보게 한다.
   */
  const hrefFor = useCallback(
    (path: string) => {
      const underSitesPath =
        typeof window !== "undefined" && window.location.pathname.startsWith(`/sites/${subdomain}`);
      return preview || underSitesPath ? `/sites/${subdomain}${path}` : path;
    },
    [subdomain, preview]
  );

  const jump = useCallback((id: string) => {
    if (id === "top") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      setActiveId("top");
      return;
    }
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveId(id);
  }, []);

  // 보고 있는 섹션을 칩에 표시한다.
  // 미리보기는 스크롤 주체가 화면이 아니라 편집기 안쪽 상자라 관찰자를 걸지 않는다.
  useEffect(() => {
    if (preview) return;
    const targets = navItems
      .map((n) => document.getElementById(n.id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (!targets.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (hit?.target?.id) setActiveId(hit.target.id);
      },
      // 헤더 두 줄(104px) 아래로 들어온 섹션부터 '보고 있는 것'으로 친다
      { rootMargin: "-58px 0px -62% 0px", threshold: 0 }
    );
    targets.forEach((t) => io.observe(t));
    return () => io.disconnect();
  }, [navItems, preview]);

  return (
    <div
      ref={rootRef}
      className={preview ? undefined : "gs-page"}
      style={{ fontFamily: "'Pretendard Variable', -apple-system, sans-serif", color: "#16202b", background: "#fff" }}
    >
      {/* 이 페이지에서만 쓰는 몇 줄. 가로 스크롤 막대를 감추고, 하단 고정바를 폰에서만 띄운다 */}
      <style>{`
        .gs-scroll-x { overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
        .gs-scroll-x::-webkit-scrollbar { display: none; }
        .gs-page { padding-bottom: 74px; }
        .gs-bottombar { display: flex; }
        @media (min-width: 821px) {
          .gs-page { padding-bottom: 0; }
          .gs-bottombar { display: none; }
        }
      `}</style>

      <SiteHeader
        officeName={officeName}
        logoUrl={settings?.logo_url}
        brandMode={cfg.brand_mode || "both"}
        logoSize={cfg.logo_size || "medium"}
        theme={theme}
        items={navItems}
        activeId={activeId}
        onJump={jump}
        preview={Boolean(preview)}
      />

      <HeroSection officeName={officeName} theme={theme} cfg={cfg} onCta={() => jump("intake")} />

      {showVacancy && <VacancySection officeName={officeName} theme={theme} vacancies={vacancies} hrefFor={hrefFor} />}

      {showArticle && <ArticleSection officeName={officeName} theme={theme} articles={articles} hrefFor={hrefFor} />}

      <IntakeFormSection subdomain={subdomain} theme={theme} cfg={cfg} phone={phone} />

      <ContactSection
        officeName={officeName}
        theme={theme}
        phone={phone}
        agentMobile={agentMobile}
        representative={representative}
        address={address}
        regNum={companyProfile?.reg_num}
        snsLinks={member?.sns_links}
      />

      <footer style={{ background: theme.dark, color: "rgba(255,255,255,0.55)", padding: "28px 20px", textAlign: "center", fontSize: 13, lineHeight: 1.8 }}>
        <div>{officeName}</div>
        <div>
          powered by{" "}
          <a href="https://gongsilnews.com" style={{ color: theme.secondary, textDecoration: "none" }}>공실뉴스</a>
        </div>
      </footer>

      {preview !== "pc" && (
        <MobileBottomBar
          theme={theme}
          phone={agentMobile || phone}
          onIntake={() => jump("intake")}
          preview={Boolean(preview)}
        />
      )}
    </div>
  );
}
