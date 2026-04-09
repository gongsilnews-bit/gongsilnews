"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Header() {
  const pathname = usePathname();
  const headerRef = useRef<HTMLElement>(null);
  const searchWrapRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const txtBannerListRef = useRef<HTMLUListElement>(null);
  const txtDropdownRef = useRef<HTMLDivElement>(null);
  const txtContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (headerRef.current) {
        if (window.scrollY > 40) {
          headerRef.current.classList.add("is-sticky");
        } else {
          headerRef.current.classList.remove("is-sticky");
        }
      }
    };
    window.addEventListener("scroll", handleScroll);

    const bannerList = txtBannerListRef.current;
    const container = txtContainerRef.current;
    const dropdown = txtDropdownRef.current;
    let tickerInterval: NodeJS.Timeout;

    if (bannerList && container && dropdown) {
      const items = bannerList.querySelectorAll("li");
      if (items.length > 1) {
        let idx = 0;
        const itemHeight = 24;
        const firstClone = items[0].cloneNode(true) as HTMLElement;
        bannerList.appendChild(firstClone);
        const totalItems = items.length + 1;

        function startTicker() {
          tickerInterval = setInterval(() => {
            idx++;
            bannerList!.style.transition = "transform 0.5s ease-in-out";
            bannerList!.style.transform = `translateY(-${idx * itemHeight}px)`;
            if (idx === totalItems - 1) {
              setTimeout(() => {
                bannerList!.style.transition = "none";
                bannerList!.style.transform = `translateY(0)`;
                idx = 0;
              }, 500);
            }
          }, 3000);
        }

        startTicker();

        container.addEventListener("mouseenter", () => {
          clearInterval(tickerInterval);
          dropdown.style.display = "block";
        });
        container.addEventListener("mouseleave", () => {
          startTicker();
          dropdown.style.display = "none";
        });
      }
    }

    return () => {
      window.removeEventListener("scroll", handleScroll);
      clearInterval(tickerInterval);
    };
  }, []);

  return (
    <>
      {/* 1. Top Nav Bar */}
      <div className="top-bar">
        <div className="top-bar-left">
          <div className="top-logo" onClick={() => window.location.href = "/"} style={{ cursor: "pointer" }}>공실뉴스</div>
          <div className="top-desc">11만 부동산을 위한 무료 정보 채널</div>
        </div>
        <div className="top-bar-right">
          <div className="top-search-wrap" ref={searchWrapRef}>
            <input type="text" className="top-search-input" ref={searchInputRef} placeholder="검색어를 입력하세요" />
            <div className="icon-tooltip-wrap" data-tooltip="검색">
              <svg onClick={() => { searchWrapRef.current?.classList.toggle("active"); searchInputRef.current?.focus(); }} viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
            <div className="icon-tooltip-wrap" data-tooltip="회원가입">
              <svg style={{ cursor: "pointer" }} viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            </div>
            <div className="icon-tooltip-wrap" data-tooltip="로그인">
              <svg style={{ cursor: "pointer" }} viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Header */}
      <header className="header" ref={headerRef}>
        <div className="container px-20">
          <div className="header-top">
            <div className="ht-left"></div>
            <div className="ht-center">
              <img src="/logo.png" className="ht-logo" alt="부동산 정보채널 공실뉴스" onClick={() => window.location.href = "/"} />
            </div>
            <div className="ht-right">
              <div className="txt-banner-container" ref={txtContainerRef}>
                <div className="txt-banner-wrap">
                  <ul ref={txtBannerListRef} style={{ listStyle: "none", margin: 0, padding: 0, textAlign: "right", width: "100%" }}>
                    <li style={{ height: 24, display: "flex", alignItems: "center", justifyContent: "flex-end" }}><a href="#" className="free-banner">AI 전계부터, 한경ALICE</a></li>
                    <li style={{ height: 24, display: "flex", alignItems: "center", justifyContent: "flex-end" }}><a href="#" className="free-banner">국내 최대 투자 축제, KIW</a></li>
                    <li style={{ height: 24, display: "flex", alignItems: "center", justifyContent: "flex-end" }}><a href="#" className="free-banner">한경지수, KEDI 오픈</a></li>
                    <li style={{ height: 24, display: "flex", alignItems: "center", justifyContent: "flex-end" }}><a href="#" className="free-banner">두뇌를 깨울 시간, ALICE Q</a></li>
                  </ul>
                </div>
                <div className="txt-dropdown" ref={txtDropdownRef} style={{ display: "none" }}>
                  <ul style={{ listStyle: "none", margin: 0, padding: 0, textAlign: "left" }}>
                    <li style={{ borderBottom: "1px solid #eee" }}><a href="#">AI 전계부터, 한경ALICE</a></li>
                    <li style={{ borderBottom: "1px solid #eee" }}><a href="#">국내 최대 투자 축제, KIW</a></li>
                    <li style={{ borderBottom: "1px solid #eee" }}><a href="#">한경지수, KEDI 오픈</a></li>
                    <li><a href="#">두뇌를 깨울 시간, ALICE Q</a></li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          <div className="header-bottom">
            <nav className="gnb-new">
              <Link href="/news_all" className={pathname === "/news_all" ? "active" : ""}>전체뉴스</Link>
              <Link href="/news_map" className={pathname === "/news_map" ? "active" : ""}>우리동네뉴스</Link>
              <Link href="/news_finance" className={pathname === "/news_finance" ? "active" : ""}>부동산·주식·재테크</Link>
              <Link href="/news_politics" className={pathname === "/news_politics" ? "active" : ""}>정치·경제·사회</Link>
              <Link href="/news_law" className={pathname === "/news_law" ? "active" : ""}>세무·법률</Link>
              <Link href="/news_life" className={pathname === "/news_life" ? "active" : ""}>여행·건강·생활</Link>
              <div className="gnb-dropdown-parent" style={{ position: "relative", display: "inline-block" }}>
                <Link href="/news_etc" className={pathname === "/news_etc" ? "active" : ""} style={{ padding: "10px 0", transition: "color 0.2s" }}>기타</Link>
                <div className="gnb-dropdown">
                  <ul>
                    <li><Link href="/news_etc?cat=it">IT·가전·가구</Link></li>
                    <li><Link href="/news_etc?cat=sports">스포츠·연예·Car</Link></li>
                    <li><Link href="/news_etc?cat=mission">인물·미션·기타</Link></li>
                  </ul>
                </div>
              </div>
              <span className="divider"></span>
              <Link href="/gongsil">공실열람</Link>
              <div className="gnb-dropdown-parent" style={{ position: "relative", display: "inline-block" }}>
                <Link href="/board" style={{ padding: "10px 0", transition: "color 0.2s" }}>자료실</Link>
                <div className="gnb-dropdown">
                  <ul>
                    <li><a href="/board?id=drone">드론영상</a></li>
                    <li><a href="/board?id=app">APP(앱)</a></li>
                    <li><a href="/board?id=design">디자인</a></li>
                    <li><a href="/board?id=sound">음원</a></li>
                    <li><a href="/board?id=doc">계약서/양식</a></li>
                  </ul>
                </div>
              </div>
              <Link href="/#special-lecture">부동산특강</Link>
              <Link href="#">중개업소무료가입</Link>
            </nav>
          </div>
        </div>
      </header>
    </>
  );
}
