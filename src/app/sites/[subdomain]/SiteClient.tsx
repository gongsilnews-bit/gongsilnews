"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import SiteHeader, { type NavItem } from "./sections/SiteHeader";
import HeroSection from "./sections/HeroSection";
import VacancySection from "./sections/VacancySection";
import ArticleSection from "./sections/ArticleSection";
import IntakeFormSection from "./sections/IntakeFormSection";
import ContactSection from "./sections/ContactSection";
import MobileQuickActions from "./sections/MobileQuickActions";
import { clampIntro, pickTheme, scrollToSection } from "./theme";
import { isPermissionAlive } from "@/utils/planCheck";

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

  /*
   * 요금제가 여는 기능. 판정은 회원 칸을 보고, 요금제가 끝나면 같이 닫힌다.
   * 미리보기(편집기)에서는 회원 정보가 그대로 넘어오므로 같은 값이 쓰인다 —
   * 중개사가 자기 화면에서 유료 기능을 미리 보고 착각하는 일이 없다.
   */
  const maxSlides = isPermissionAlive(member, true) ? (member?.max_hero_slides ?? 1) : 1;
  const hideFooterBadge = isPermissionAlive(member, member?.can_hide_footer_badge);
  const allowIntakePhoto = isPermissionAlive(member, member?.can_intake_photo);
  const allowLogo = isPermissionAlive(member, member?.can_site_logo);
  const allowHeroVideo = isPermissionAlive(member, member?.can_hero_video);
  const allowSns = isPermissionAlive(member, member?.can_sns_links);
  const theme = pickTheme(cfg.theme_color);

  const officeName =
    settings?.site_title ||
    companyProfile?.name ||
    companyProfile?.company_name ||
    member?.name ||
    "부동산";

  const address = [companyProfile?.address, companyProfile?.address_detail].filter(Boolean).join(" ");
  /*
   * 등록된 중개사무소 명칭.
   *
   * 홈페이지 제목(officeName)은 브랜드 이름으로 얼마든지 바꿀 수 있지만,
   * 표시·광고법상 밝혀야 하는 건 등록된 상호다. 그래서 부동산 정보(연락처의
   * 등록번호·소재지 줄)와 맨 아래 푸터에는 제목과 상관없이 늘 이 이름을 쓴다.
   */
  const legalName = companyProfile?.name || companyProfile?.company_name || officeName;
  /*
   * 두 번호는 성격이 다르다.
   *
   * 사무실 번호는 표시·광고법상 중개대상물 광고에 밝혀야 하는 중개사무소 연락처다.
   * 그래서 홈페이지에서 지울 수 없다 — 비워두면 [정보설정]에 등록된 번호가 나온다.
   *
   * 휴대폰은 중개사 개인 번호라 선택이다. 한 번이라도 정한 적 있으면 적힌 그대로 쓰고,
   * 지웠으면(빈 문자열) 안 나온다. 아직 정한 적 없을 때만(null) [정보설정]에서 채운다.
   */
  const phone = settings?.contact_phone || companyProfile?.phone || member?.phone || "";
  const agentMobile =
    cfg.contact_mobile != null
      ? cfg.contact_mobile
      : companyProfile?.cell || member?.phone || "";
  // 폰 하단 [전화] 버튼이 걸 번호. 중개사가 고른 쪽을 따르고, 그 번호가 없으면 남은 쪽으로.
  const callNumber =
    cfg.call_target === "office" ? phone || agentMobile : agentMobile || phone;
  const representative = companyProfile?.ceo_name ? `대표 공인중개사 ${companyProfile.ceo_name}` : "";
  // 편집기의 [사무소 소개]가 먼저다. 눈앞에서 고치는 칸이 화면을 이겨야 한다.
  // 비워두면 정보설정의 부동산 소개로 채운다 — 빈 자리를 남기지 않는다.
  const introText = clampIntro(settings?.company_intro || companyProfile?.intro);

  // 중개사가 끈 섹션과 내용이 없는 섹션은 아예 빼고 칩도 만들지 않는다.
  // 눌렀더니 빈 칸이 나오는 것보다 없는 편이 낫다.
  const showVacancy = cfg.show_vacancy !== false && vacancies.length > 0;
  const showArticle = cfg.show_article !== false && articles.length > 0;

  const navItems = useMemo<NavItem[]>(() => {
    const items: NavItem[] = [{ id: "top", label: "홈" }];
    if (showVacancy) items.push({ id: "vacancy", label: "추천공실" });
    if (showArticle) items.push({ id: "article", label: "기사·칼럼" });
    items.push({ id: "intake", label: "물건 접수" });
    items.push({ id: "contact", label: "문의하기" });
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

  /**
   * 관리자 화면으로.
   *
   * 폰이면 모바일 관리자, PC면 PC 관리자로 간다. 둘은 화면이 아예 달라서 섞이면
   * 폰에서 1,000px 짜리 표를 보게 된다.
   *
   * 로그인 여부는 여기서 알 수 없다 — 서브도메인에는 포털 로그인 쿠키가 없다.
   * 그래서 판단은 도착한 관리자 화면에 맡긴다. 안 돼 있으면 로그인으로 보냈다가
   * 로그인 후 이 화면으로 되돌린다.
   */
  const goAdmin = useCallback((ev: React.MouseEvent) => {
    ev.preventDefault();
    const ua = typeof navigator === "undefined" ? "" : navigator.userAgent;
    const isPhone = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) || window.innerWidth <= 768;
    const path = isPhone ? "/m/admin/homepage" : "/realty_admin?menu=homepage";
    // 로컬에서 볼 때는 같은 서버의 관리자를 연다. 운영 주소로 튀면 확인이 안 된다.
    const origin = window.location.hostname === "localhost" ? window.location.origin : "https://gongsilnews.com";
    window.open(`${origin}${path}`, "_blank", "noopener,noreferrer");
  }, []);

  /**
   * 섹션으로 보내는 링크.
   *
   * 예전에는 버튼 onClick 으로만 움직였다. 그러면 스크롤 명령이 막히는 곳에서
   * 아무 일도 일어나지 않는다 — 네이버 앱 인앱 브라우저가 그랬다. 자바스크립트는
   * 살아 있는데(사진은 넘어갔다) 스크롤만 안 먹었다.
   *
   * 그래서 진짜 링크(href="#vacancy")를 깔아두고, 부드러운 스크롤을 지원하는
   * 브라우저에서만 기본 동작을 가로챈다. 지원하지 않으면 손을 떼고 브라우저가
   * 직접 이동하게 둔다 — 덜컥 움직여도 움직이는 편이 낫다.
   *
   * 가로챌 때는 replaceState 로 주소만 바꾼다. pushState 면 메뉴를 누를 때마다
   * 방문 기록이 쌓여, 뒤로가기가 페이지를 벗어나지 못하고 섹션을 거슬러 오른다.
   */
  const anchor = useCallback((id: string) => ({
    href: `#${id}`,
    onClick: (ev: React.MouseEvent) => {
      if (typeof document === "undefined" || !document.getElementById(id)) return;
      ev.preventDefault();
      scrollToSection(id);
      window.history.replaceState(null, "", `#${id}`);
      setActiveId(id);
    },
  }), []);

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
      style={{ fontFamily: "'Pretendard Variable', -apple-system, sans-serif", color: "#16202b", background: "#fff" }}
    >
      {/* 이 페이지에서만 쓰는 몇 줄. 가로 스크롤 막대를 감추고, 따라다니는 버튼을 폰에서만 띄운다 */}
      <style>{`
        /*
          전역 CSS 의 body { overflow-x: hidden } 은 세로 축까지 auto 로 바꿔 body 를
          스크롤 상자로 만든다. 그러면 브라우저에 따라 스크롤 주체가 문서가 아니라
          body 가 되고, 앵커 이동과 부드러운 스크롤이 통째로 먹히지 않는다.
          (데스크톱 크롬은 멀쩡한데 안드로이드 웹뷰에서만 안 움직이던 이유)
          clip 은 가로 넘침만 잘라내고 스크롤 주체는 건드리지 않는다.
        */
        html, body { overflow-x: clip; }
        /*
          scroll-behavior: smooth 는 여기 두면 안 된다. 메뉴 이동뿐 아니라
          브라우저의 "뒤로 가면 보던 자리로" 복원까지 애니메이션으로 만든다.
          폰에서 기사는 같은 창에서 열리므로, 닫고 돌아올 때마다 맨 위에서
          읽던 자리까지 굴러 내려가는 게 그대로 보인다.
          메뉴를 눌렀을 때의 부드러운 이동은 scrollToSection() 이 JS 로 한다.
          scroll-padding-top 은 남긴다 — 스크립트가 막힌 곳에서 #앵커 로 갈 때
          헤더에 글자가 가리는 걸 막는 줄이다.
        */
        html { scroll-padding-top: 104px; }
        /*
          목록에 마우스를 올리면 바탕이 살짝 밝아진다. 포털 기사 목록과 같은 톤이다.
          누를 수 있는 줄인지 손이 먼저 안다.
          손가락으로 쓰는 화면에서는 hover 가 눌린 뒤에도 남으므로, 마우스가
          있는 기기에서만 건다.
        */
        @media (hover: hover) {
          .gs-article-row { transition: background-color .18s ease; }
          .gs-article-row:hover { background-color: #f9f9f9; }
          .gs-vacancy-card { transition: box-shadow .18s ease, transform .18s ease; }
          .gs-vacancy-card:hover { box-shadow: 0 6px 18px rgba(16,24,40,.14); transform: translateY(-2px); }
        }
        .gs-scroll-x { overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
        .gs-scroll-x::-webkit-scrollbar { display: none; }
        .gs-quickstack { display: flex; }
        .gs-hero-nav { display: none; }
        /* 폰·PC 같은 크기로 둔다. PC 에서 19px 까지 키워 보았으나 컸다. */
        .gs-nav-link { font-size: 17px; }
        @media (min-width: 821px) {
          .gs-quickstack { display: none; }
          .gs-hero-nav { display: flex; }
          .gs-carousel-center-desktop { width: fit-content; max-width: 100%; margin-left: auto; margin-right: auto; }
        }
      `}</style>

      <SiteHeader
        officeName={officeName}
        logoUrl={allowLogo ? settings?.logo_url : null}
        brandMode={cfg.brand_mode || "both"}
        logoSize={cfg.logo_size || "medium"}
        theme={theme}
        items={navItems}
        activeId={activeId}
        anchor={anchor}
        preview={Boolean(preview)}
      />

      <HeroSection officeName={officeName} theme={theme} cfg={cfg} anchor={anchor} hrefFor={hrefFor} maxSlides={maxSlides} allowVideo={allowHeroVideo} />

      {showVacancy && <VacancySection officeName={officeName} theme={theme} vacancies={vacancies} hrefFor={hrefFor} phone={callNumber} anchor={anchor} />}

      {showArticle && <ArticleSection officeName={officeName} theme={theme} articles={articles} hrefFor={hrefFor} />}

      <IntakeFormSection subdomain={subdomain} theme={theme} cfg={cfg} phone={phone} allowPhoto={allowIntakePhoto} />

      <ContactSection
        officeName={officeName}
        theme={theme}
        phone={phone}
        agentMobile={agentMobile}
        representative={representative}
        intro={introText}
        address={address}
        regNum={companyProfile?.reg_num}
        legalName={legalName}
        snsLinks={member?.sns_links}
        allowSns={allowSns}
      />

      <footer style={{ background: theme.dark, color: "rgba(255,255,255,0.55)", padding: "28px 20px", textAlign: "center", fontSize: 13, lineHeight: 1.8 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
          <span>{legalName}</span>
          {/*
            관리자로 가는 문. 서브도메인에는 관리자 화면이 없으므로 포털 주소로 보낸다.
            폰에서 PC 관리자를 열면 표가 화면 밖으로 나가므로 기기에 맞는 쪽으로 보낸다.
            로그인이 안 돼 있으면 각 관리자 화면이 로그인으로 보냈다가 여기로 되돌린다.
          */}
          <a
            href="#"
            onClick={goAdmin}
            style={{
              padding: "2px 9px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.25)",
              color: "rgba(255,255,255,0.7)",
              fontSize: 11.5,
              fontWeight: 700,
              letterSpacing: "0.5px",
              textDecoration: "none",
            }}
          >
            admin
          </a>
        </div>
        {/* 무료 회원 페이지에는 남는다. 없애고 싶은 마음이 곧 결제 이유가 된다. */}
        {!hideFooterBadge && (
          <div>
            powered by{" "}
            <a href="https://gongsilnews.com" style={{ color: theme.secondary, textDecoration: "none" }}>공실뉴스</a>
          </div>
        )}
      </footer>

      {preview !== "pc" && (
        <MobileQuickActions
          theme={theme}
          phone={callNumber}
          anchor={anchor}
          preview={Boolean(preview)}
        />
      )}
    </div>
  );
}
