"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import AuthModal from "./AuthModal";
import SignupCompleteModal from "./SignupCompleteModal";
import BannerSlot from "./BannerSlot";
import HeaderTextBanner from "./HeaderTextBanner";
import { createClient } from "@/utils/supabase/client";
import { createPortal } from "react-dom";


export default function Header({ topFullBanners, headerTextBanners }: { topFullBanners?: any[], headerTextBanners?: any[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const headerRef = useRef<HTMLElement>(null);
  const txtDropdownRef = useRef<HTMLDivElement>(null);
  const txtContainerRef = useRef<HTMLDivElement>(null);
  const placeholderRef = useRef<HTMLDivElement>(null);
  const searchWrapRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authTab, setAuthTab] = useState<'signup' | 'login'>('signup');
  const [isSignupCompleteOpen, setIsSignupCompleteOpen] = useState(false);
  const [signupEmail, setSignupEmail] = useState('');
  const [signupName, setSignupName] = useState('');
  const [showDocWarning, setShowDocWarning] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>('');
  const [agencyStatus, setAgencyStatus] = useState<string>('');

  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [isMegaMenuOpen, setIsMegaMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [articleTitle, setArticleTitle] = useState<string | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleSetTitle = (e: any) => {
      setArticleTitle(e.detail);
    };
    window.addEventListener('setGlobalArticleTitle', handleSetTitle);
    return () => window.removeEventListener('setGlobalArticleTitle', handleSetTitle);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("gongsil_recent_searches");
    if (saved) {
      try { 
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // 모바일 등에서 {term, date} 객체 형태로 저장했을 수 있으므로 문자열로 정규화
          const normalized = parsed.map(item => typeof item === 'string' ? item : item.term).filter(Boolean);
          setRecentSearches(normalized);
        }
      } catch(e) {}
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target as Node)) {
        setIsSearchActive(false);
        searchWrapRef.current.classList.remove('active');
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = (query: string) => {
    if (!query.trim()) return;
    const term = query.trim();
    const newSearches = [term, ...recentSearches.filter(t => t !== term)].slice(0, 10);
    setRecentSearches(newSearches);
    localStorage.setItem("gongsil_recent_searches", JSON.stringify(newSearches));
    
    router.push(`/news_all?q=${encodeURIComponent(term)}`);
    searchWrapRef.current?.classList.remove('active');
    setIsSearchActive(false);
    if (searchInputRef.current) searchInputRef.current.value = '';
  };
  
  const removeSearch = (term: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSearches = recentSearches.filter(t => t !== term);
    setRecentSearches(newSearches);
    localStorage.setItem("gongsil_recent_searches", JSON.stringify(newSearches));
  };
  
  const clearSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem("gongsil_recent_searches");
  };
  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY > 40;
      setIsScrolled(scrolled);
      if (headerRef.current) {
        if (scrolled) {
          if (!headerRef.current.classList.contains("is-sticky") && placeholderRef.current) {
            placeholderRef.current.style.height = `${headerRef.current.offsetHeight}px`;
          }
          headerRef.current.classList.add("is-sticky");
        } else {
          headerRef.current.classList.remove("is-sticky");
          if (placeholderRef.current && window.scrollY <= 40) {
            placeholderRef.current.style.height = "0px";
          }
        }
      }
      // Add scroll progress calculation
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      if (scrollHeight > 0) {
        const progress = (scrollTop / scrollHeight) * 100;
        setScrollProgress(progress > 100 ? 100 : progress);
      } else {
        setScrollProgress(0);
      }
    };
    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // 로그인 상태 확인 후 미가입자면 모달 띄우기
  useEffect(() => {
    const checkUserStatus = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // members 테이블에서 현재 회원의 상태 파악
        const { data, error } = await supabase
          .from('members')
          .select('signup_completed, email, name, role')
          .eq('id', user.id)
          .single();
        if (data) {
          setCurrentUser(user);
          setUserRole(data.role);

          const { data: agencyData } = await supabase
            .from('agencies')
            .select('biz_cert_url, reg_cert_url, status')
            .eq('owner_id', user.id)
            .single();

          if (agencyData) {
            setAgencyStatus(agencyData.status || '');
          }

          if (data.signup_completed === false) {
            setSignupEmail(data.email || user.email || '');
            setSignupName(data.name || user.user_metadata?.full_name || '');
            setIsSignupCompleteOpen(true);
          } else if (data.role === 'REALTOR' && agencyData) {
            // 부동산 회원인데 서류를 제출 안했는지 체크
            if (!agencyData.biz_cert_url) {
              setShowDocWarning(true);
            }
          }
        }
      }
    };
    checkUserStatus();
  }, []);

  const isHomePage = pathname === '/';
  const isSmallHeader = !isHomePage || isScrolled;

  return (
    <>
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialTab={authTab}
        onGoogleClick={() => {
          setIsAuthModalOpen(false);
          setIsSignupCompleteOpen(true);
        }}
      />
      <SignupCompleteModal
        isOpen={isSignupCompleteOpen}
        onClose={() => setIsSignupCompleteOpen(false)}
        email={signupEmail}
        name={signupName}
      />

      {/* ⚠️ 서류 미제출 부동산 소장님용 경고 배너 */}
      {showDocWarning && (
        <div style={{ background: '#fff5f5', borderBottom: '1px solid #fed7d7', padding: '12px 20px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', zIndex: 100, position: 'relative' }}>
          <span style={{ fontSize: '18px' }}>🥺</span>
          <span style={{ fontSize: '14px', color: '#c53030', fontWeight: 700 }}>
            소장님! 아직 필수 서류(사업자등록증)를 내시지 않았어요! 서류 제출하셔야 공동중계를 무료로 쓰실 수 있어요 👉 
          </span>
          <Link href="/realty_admin?menu=settings" style={{ textDecoration: 'underline', color: '#e53e3e', fontSize: '14px', fontWeight: 800 }}>정보설정으로 가기</Link>
          <button onClick={() => setShowDocWarning(false)} style={{ background: 'none', border: 'none', marginLeft: '10px', cursor: 'pointer', color: '#c53030' }}>✕</button>
        </div>
      )}

      {/* 0. Top Full Banner (메인 홈에서만 표시) */}
      {isHomePage && (
        <div style={{ width: "100%", background: "#f8f9fa", display: "flex", justifyContent: "center" }}>
          <div style={{ maxWidth: 1920, width: "100%" }}>
            <BannerSlot placement="TOP_FULL" style={{ borderRadius: 0 }} initialBanners={topFullBanners} />
          </div>
        </div>
      )}

      {/* 1. Top Nav Bar (메인 홈에서만 표시) */}
      {isHomePage && (
        <div className="top-bar">
        <div className="top-bar-left">
          <div className="top-logo" onClick={() => window.location.href = "/"} style={{ cursor: "pointer" }}>공실뉴스</div>
          <div className="top-desc" style={{ marginRight: '16px' }}>11만 부동산을 위한 무료 정보 채널</div>

        </div>
        <div className="top-bar-right">

          
          <div onClick={() => router.push('/signup')} style={{ cursor: "pointer", fontSize: "13px", fontWeight: "700", color: "#fcd34d", marginRight: "12px", whiteSpace: "nowrap" }}>
            중개업소무료가입
          </div>

          {currentUser ? (
            <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "12px" }}>
              <div style={{
                background: userRole === 'ADMIN' ? '#111827' : '#ef4444',
                color: '#fff',
                padding: '4px 10px',
                borderRadius: '4px',
                fontWeight: '700',
                cursor: 'pointer',
                fontSize: '11px',
              }} onClick={() => { 
                if (agencyStatus === 'REJECTED') window.open('/realty_admin?menu=settings&tab=agency', '_blank');
                else if (userRole === 'ADMIN') router.push('/admin'); 
                else if (userRole === 'REALTOR') router.push('/realty_admin');
                else router.push('/user_admin');
              }}>
                {userRole === 'ADMIN' ? '최고관리자 >>' : agencyStatus === 'REJECTED' ? '서류보완 >>' : userRole === 'REALTOR' ? '부동산회원 >>' : '일반회원 >>'}
              </div>
              <div style={{ color: "rgba(255,255,255,0.7)", cursor: "pointer", fontWeight: "600", fontSize: "13px", whiteSpace: "nowrap" }} onClick={async () => {
                const supabase = createClient();
                await supabase.auth.signOut();
                window.location.reload();
              }}>로그아웃</div>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "12px", paddingRight: "4px" }}>
              <div
                onClick={() => { setAuthTab('login'); setIsAuthModalOpen(true); }}
                style={{
                  background: "#ef4444", color: "#fff",
                  padding: "4px 10px", borderRadius: "4px",
                  fontSize: "11px", fontWeight: "700", cursor: "pointer",
                  whiteSpace: "nowrap"
                }}
              >
                공실등록 &gt;&gt;
              </div>
              <div style={{ color: "rgba(255,255,255,0.7)", cursor: "pointer", fontWeight: "600", fontSize: "13px", whiteSpace: "nowrap" }} onClick={() => { setAuthTab('login'); setIsAuthModalOpen(true); }}>
                로그인
              </div>
            </div>
          )}
        </div>
      </div>
      )}      {/* 2. Main Header Placeholder & Header */}
      <div ref={placeholderRef} style={{ width: "100%", height: 0 }} />
      <header className="header" ref={headerRef}>
        <div className="container">
          {/* Scroll state (1-line sticky) vs Top state (1-line large) */}
          <div className="header-main" style={{ 
            display: "flex", 
            flexDirection: "row", 
            justifyContent: isSmallHeader ? "space-between" : "center", 
            alignItems: isSmallHeader ? "center" : "flex-end", 
            padding: isSmallHeader ? "15px 0" : "30px 0 15px 0",
            transition: "all 0.3s ease"
          }}>
            
            {/* --- 좌측 그룹: 로고 + 메뉴 (Top State에서는 전체 중앙 정렬됨) --- */}
            <div style={{ display: "flex", alignItems: isSmallHeader ? "center" : "flex-end", gap: isSmallHeader ? "16px" : "20px", flex: 1, minWidth: 0 }}>
              {/* 1. 로고 (isSmallHeader에 따라 크기만 변경) */}
              <div style={{ display: "flex", alignItems: "flex-end", cursor: "pointer", flexShrink: 0 }} onClick={() => window.location.href = "/"}>
                <img src="/logo.png" style={{ height: isSmallHeader ? "45px" : "70px", transition: "height 0.3s ease" }} alt="부동산 정보채널 공실뉴스" />
              </div>

              {/* 2. 메인 메뉴 또는 기사 제목 (Indication Bar) */}
              {isScrolled && articleTitle ? (
                <div style={{ flex: 1, paddingLeft: "20px", fontSize: "18px", fontWeight: "700", color: "#333", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {articleTitle}
                </div>
              ) : (
                <nav className="gnb-new" style={{ 
                  display: "flex", alignItems: "center", gap: "14px", 
                  justifyContent: "flex-start",
                  transition: "all 0.3s ease",
                  whiteSpace: "nowrap",
                  paddingBottom: isSmallHeader ? "0" : "5px",
                  flex: 1
                }}>
                  <Link href="/news_map" className={pathname === "/news_map" ? "active" : ""}>우리동네뉴스</Link>
                  <Link href="/news_gongsil" className={pathname === "/news_gongsil" ? "active" : ""}>공실뉴스</Link>
                  <Link href="/news_politics" className={pathname === "/news_politics" ? "active" : ""}>부동산·경제</Link>
                  <Link href="/news_marketing" className={pathname === "/news_marketing" ? "active" : ""}>AI마케팅</Link>
                  <Link href="/news_etc" className={pathname === "/news_etc" ? "active" : ""}>라이프·오피니언</Link>

                  {isSmallHeader && <span className="divider" style={{ width: 1, height: 16, backgroundColor: "#ddd", margin: "0 4px" }}></span>}
                  
                  <div style={{ position: "relative", marginLeft: !isSmallHeader ? "auto" : "0", display: "flex", alignItems: "center" }}>
                    <Link href="/gongsil" style={{ color: "#102c57", fontWeight: 800, display: "block" }}>공실열람</Link>
                  </div>
                  <Link href="/#special-lecture">부동산특강</Link>
                  <div className="gnb-dropdown-parent" style={{ position: "relative", display: "inline-block" }}>
                    <Link href="/board">자료실</Link>
                    <div className="gnb-dropdown">
                      <ul>
                        <li><a href="/board?id=drone">드론영상</a></li>
                        <li><a href="/board?id=app">APP(앱)</a></li>
                        <li><a href="/board?id=prompt">AI 프롬프트</a></li>
                        <li><a href="/board?id=sound">음원</a></li>
                        <li><a href="/board?id=doc">계약서/양식</a></li>
                      </ul>
                    </div>
                  </div>
                  <div className="gnb-dropdown-parent" style={{ position: "relative", display: "inline-block" }}>
                    <Link href="/board?id=free">커뮤니티</Link>
                    <div className="gnb-dropdown">
                      <ul>
                        <li><a href="/board?id=free">자유게시판</a></li>
                        <li><a href="/board?id=qna">Q&A게시판</a></li>
                        <li><a href="/board?id=notice">공지사항</a></li>
                        <li><a href="/board?id=inquiry">1:1 문의</a></li>
                      </ul>
                    </div>
                  </div>

                  {/* Top State 일 때만 메뉴 끝에 붙는 검색/햄버거 */}
                  {!isSmallHeader && (
                    <>
                      <button onClick={() => setIsSearchActive(true)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", padding: 0, marginLeft: "10px" }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 24, height: 24 }}><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                      </button>
                      <button onClick={() => setIsMegaMenuOpen(!isMegaMenuOpen)} style={{ background: "none", border: "none", fontSize: 24, cursor: "pointer", display: "flex", alignItems: "center", color: "#333", padding: 0, marginLeft: "4px" }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 28, height: 28 }}><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
                      </button>
                    </>
                  )}
                </nav>
              )}
            </div>

            {/* === [Sticky State] 스크롤 시 나타나는 우측 액션 버튼들 === */}
            {isSmallHeader && (
              <div style={{ display: "flex", alignItems: "center", gap: "16px", flexShrink: 0 }}>
                {currentUser ? (
                  <div style={{ color: "#333", cursor: "pointer", fontSize: "14px", fontWeight: "700" }} onClick={() => router.push(userRole === 'ADMIN' ? '/admin' : userRole === 'REALTOR' ? '/realty_admin' : '/user_admin')}>
                    내정보
                  </div>
                ) : (
                  <div style={{ color: "#333", cursor: "pointer", fontSize: "14px", fontWeight: "700" }} onClick={() => { setAuthTab('login'); setIsAuthModalOpen(true); }}>
                    로그인
                  </div>
                )}

                <button onClick={() => setIsSearchActive(true)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", padding: 0 }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 24, height: 24 }}><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                </button>

                <button onClick={() => setIsMegaMenuOpen(!isMegaMenuOpen)} style={{ background: "none", border: "none", fontSize: 24, cursor: "pointer", display: "flex", alignItems: "center", color: "#333", padding: 0 }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 28, height: 28 }}><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
                </button>

                <button onClick={() => {
                  if (!currentUser) {
                    setAuthTab('login');
                    setIsAuthModalOpen(true);
                  } else {
                    if (userRole === 'ADMIN') router.push('/admin?menu=gongsil&action=write');
                    else if (userRole === 'REALTOR') router.push('/realty_admin?menu=gongsil&action=write');
                    else router.push('/user_admin?menu=gongsil&action=write');
                  }
                }}
                  style={{
                    background: "#ef4444", color: "#fff", border: "none", borderRadius: "4px",
                    padding: "6px 14px", fontSize: "12px", fontWeight: "700", cursor: "pointer",
                    boxShadow: "0 2px 4px rgba(239, 68, 68, 0.2)", transition: "background 0.2s",
                    whiteSpace: "nowrap", flexShrink: 0
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "#dc2626"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "#ef4444"}>
                  공실등록 &gt;&gt;
                </button>
              </div>
            )}
            
          </div>
        </div>

        {/* === [Reading Progress Bar] 기사 읽기 모드일 때 하단에 진행바 표시 === */}
        {isScrolled && articleTitle && (
          <div style={{ position: "absolute", bottom: "-3px", left: 0, width: "100%", height: "3px", backgroundColor: "transparent" }}>
            <div style={{ height: "100%", backgroundColor: "#f59e0b", width: `${scrollProgress}%`, transition: "width 0.1s ease-out" }} />
          </div>
        )}
      </header>

      {/* 중앙일보 스타일 풀스크린 검색 모달 (Portal 사용) */}
      {isSearchActive && typeof document !== 'undefined' && createPortal(
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", 
          background: "rgba(255, 255, 255, 0.98)", zIndex: 9999999, 
          display: "flex", flexDirection: "column", alignItems: "center", paddingTop: "15vh"
        }}>
          {/* 닫기 버튼 */}
          <button 
            onClick={() => setIsSearchActive(false)}
            style={{ position: "absolute", top: "40px", right: "60px", background: "none", border: "none", cursor: "pointer", padding: 0 }}
          >
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="1.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>

          <div style={{ width: "100%", maxWidth: "800px", display: "flex", flexDirection: "column", marginTop: "40px" }}>
            {/* 타이틀 */}
            <h2 style={{ fontSize: "32px", fontWeight: "700", color: "#111", marginBottom: "40px", textAlign: "center" }}>
              찾고 싶은 뉴스를 검색해 보세요.
            </h2>

            {/* 거대한 검색 입력창 */}
            <div style={{ position: "relative", width: "100%", borderBottom: "3px solid #102c57", paddingBottom: "15px", display: "flex", alignItems: "center" }}>
              <input
                type="text"
                autoFocus
                placeholder="검색어를 입력하세요"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const query = e.currentTarget.value.trim();
                    if (query) {
                      window.location.href = `/search?q=${encodeURIComponent(query)}`;
                    }
                  }
                }}
                style={{
                  width: "100%", border: "none", background: "transparent", fontSize: "28px", 
                  outline: "none", color: "#111", paddingLeft: "10px"
                }}
              />
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#102c57" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ cursor: "pointer", flexShrink: 0, marginLeft: "15px" }}>
                <circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </div>

            {/* 추천/최근 검색어 */}
            <div style={{ marginTop: "40px", textAlign: "center" }}>
              <div style={{ color: "#2563eb", fontWeight: "700", fontSize: "16px", marginBottom: "20px" }}>
                ✨ 추천/최근 검색어
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "12px" }}>
                {recentSearches.length > 0 ? (
                  recentSearches.map((term, idx) => (
                    <div key={idx} style={{ display: "flex", alignItems: "center", border: "1px solid #e5e7eb", borderRadius: "30px", padding: "12px 24px" }}>
                      <span onClick={() => { window.location.href = `/search?q=${encodeURIComponent(term)}`; }} style={{ fontSize: "15px", color: "#333", cursor: "pointer", fontWeight: "500" }}>{term}</span>
                      <button onClick={(e) => removeSearch(term, e)} style={{ background: "none", border: "none", padding: 0, marginLeft: "10px", color: "#9ca3af", cursor: "pointer", display: "flex", alignItems: "center" }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                      </button>
                    </div>
                  ))
                ) : (
                  <div style={{ color: "#888", fontSize: "15px", padding: "10px 0" }}>최근 검색어가 없습니다.</div>
                )}
              </div>
              {recentSearches.length > 0 && (
                <div style={{ marginTop: "20px" }}>
                  <button onClick={clearSearches} style={{ background: "none", border: "none", fontSize: "13px", color: "#888", cursor: "pointer", textDecoration: "underline" }}>전체 기록 삭제</button>
                </div>
              )}
            </div>
          </div>
        </div>
      , document.body)}

      {/* 햄버거 메가 메뉴 (Portal 사용) */}
      {isMegaMenuOpen && typeof document !== 'undefined' && createPortal(
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", 
          background: "rgba(255, 255, 255, 0.98)", zIndex: 9999999, 
          overflowY: "auto", padding: "60px 20px"
        }}>

          
          <div style={{ maxWidth: 1200, margin: "0 auto", marginTop: 40, position: "relative" }}>
            {/* 닫기 버튼 */}
            <button 
              onClick={() => setIsMegaMenuOpen(false)}
              style={{ position: "absolute", top: "-5px", right: "0px", background: "none", border: "none", cursor: "pointer", padding: 0 }}
            >
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="1.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>

            <h2 style={{ fontSize: 32, fontWeight: 900, marginBottom: 40, borderBottom: "4px solid #111", paddingBottom: 20, color: "#111", paddingRight: 50 }}>전체 서비스</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 40 }}>
              {/* 1. 공실뉴스 */}
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#111", marginBottom: 20 }}>공실뉴스</div>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 14 }}>
                  <li><a href="#" onClick={(e) => { e.preventDefault(); setIsMegaMenuOpen(false); router.push("/news_gongsil"); }} style={{ fontSize: 16, color: "#555", textDecoration: "none", fontWeight: 500 }}>아파트/오피스텔</a></li>
                  <li><a href="#" onClick={(e) => { e.preventDefault(); setIsMegaMenuOpen(false); router.push("/news_gongsil"); }} style={{ fontSize: 16, color: "#555", textDecoration: "none", fontWeight: 500 }}>빌라/주택</a></li>
                  <li><a href="#" onClick={(e) => { e.preventDefault(); setIsMegaMenuOpen(false); router.push("/news_gongsil"); }} style={{ fontSize: 16, color: "#555", textDecoration: "none", fontWeight: 500 }}>원룸/투룸(풀옵션)</a></li>
                  <li><a href="#" onClick={(e) => { e.preventDefault(); setIsMegaMenuOpen(false); router.push("/news_gongsil"); }} style={{ fontSize: 16, color: "#555", textDecoration: "none", fontWeight: 500 }}>상가/사무실/공장/토지</a></li>
                  <li><a href="#" onClick={(e) => { e.preventDefault(); setIsMegaMenuOpen(false); router.push("/news_gongsil"); }} style={{ fontSize: 16, color: "#555", textDecoration: "none", fontWeight: 500 }}>신축/분양/경매</a></li>
                </ul>
              </div>

              {/* 2. 부동산 경제 */}
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#111", marginBottom: 20 }}>부동산 경제</div>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 14 }}>
                  <li><a href="#" onClick={(e) => { e.preventDefault(); setIsMegaMenuOpen(false); router.push("/news_politics"); }} style={{ fontSize: 16, color: "#555", textDecoration: "none", fontWeight: 500 }}>부동산 정책/동향</a></li>
                  <li><a href="#" onClick={(e) => { e.preventDefault(); setIsMegaMenuOpen(false); router.push("/news_politics"); }} style={{ fontSize: 16, color: "#555", textDecoration: "none", fontWeight: 500 }}>경제/재테크/주식</a></li>
                  <li><a href="#" onClick={(e) => { e.preventDefault(); setIsMegaMenuOpen(false); router.push("/news_politics"); }} style={{ fontSize: 16, color: "#555", textDecoration: "none", fontWeight: 500 }}>법률/세무 지식</a></li>
                </ul>
              </div>

              {/* 3. AI마케팅 */}
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#111", marginBottom: 20 }}>AI마케팅</div>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 14 }}>
                  <li><a href="#" onClick={(e) => { e.preventDefault(); setIsMegaMenuOpen(false); router.push("/news_marketing"); }} style={{ fontSize: 16, color: "#555", textDecoration: "none", fontWeight: 500 }}>AI/NEWS</a></li>
                  <li><a href="#" onClick={(e) => { e.preventDefault(); setIsMegaMenuOpen(false); router.push("/news_marketing"); }} style={{ fontSize: 16, color: "#555", textDecoration: "none", fontWeight: 500 }}>부동산유튜브/블로그</a></li>
                  <li><a href="#" onClick={(e) => { e.preventDefault(); setIsMegaMenuOpen(false); router.push("/news_marketing"); }} style={{ fontSize: 16, color: "#555", textDecoration: "none", fontWeight: 500 }}>공실/임대관리</a></li>
                </ul>
              </div>

              {/* 4. 라이프.오피니언 */}
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#111", marginBottom: 20 }}>라이프·오피니언</div>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 14 }}>
                  <li><a href="#" onClick={(e) => { e.preventDefault(); setIsMegaMenuOpen(false); router.push("/news_etc"); }} style={{ fontSize: 16, color: "#555", textDecoration: "none", fontWeight: 500 }}>인물/인터뷰</a></li>
                  <li><a href="#" onClick={(e) => { e.preventDefault(); setIsMegaMenuOpen(false); router.push("/news_etc"); }} style={{ fontSize: 16, color: "#555", textDecoration: "none", fontWeight: 500 }}>부동산/인테리어 꿀팁</a></li>
                  <li><a href="#" onClick={(e) => { e.preventDefault(); setIsMegaMenuOpen(false); router.push("/news_etc"); }} style={{ fontSize: 16, color: "#555", textDecoration: "none", fontWeight: 500 }}>맛집/여행/건강</a></li>
                  <li><a href="#" onClick={(e) => { e.preventDefault(); setIsMegaMenuOpen(false); router.push("/news_etc"); }} style={{ fontSize: 16, color: "#555", textDecoration: "none", fontWeight: 500 }}>자유 에세이</a></li>
                </ul>
              </div>
              
              {/* 공실마케팅 */}
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#111", marginBottom: 20 }}>공실마케팅</div>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 14 }}>
                  <li><a href="#" onClick={(e) => { e.preventDefault(); setIsMegaMenuOpen(false); router.push("/gongsil"); }} style={{ fontSize: 16, color: "#555", textDecoration: "none", fontWeight: 500 }}>공실열람</a></li>
                  <li><a href="#" onClick={(e) => { e.preventDefault(); setIsMegaMenuOpen(false); router.push("/news_map"); }} style={{ fontSize: 16, color: "#555", textDecoration: "none", fontWeight: 500 }}>우리동네뉴스</a></li>
                  <li><a href="#" onClick={(e) => { e.preventDefault(); setIsMegaMenuOpen(false); router.push("/#special-lecture"); }} style={{ fontSize: 16, color: "#555", textDecoration: "none", fontWeight: 500 }}>부동산특강</a></li>
                  <li><a href="#" onClick={(e) => { e.preventDefault(); setIsMegaMenuOpen(false); router.push("/board"); }} style={{ fontSize: 16, color: "#555", textDecoration: "none", fontWeight: 500 }}>자료실</a></li>
                  <li><a href="#" onClick={(e) => { e.preventDefault(); setIsMegaMenuOpen(false); router.push("/board?id=free"); }} style={{ fontSize: 16, color: "#555", textDecoration: "none", fontWeight: 500 }}>커뮤니티</a></li>
                </ul>
              </div>
            </div>
            
            <div style={{ marginTop: 60, padding: "20px 0", borderTop: "1px solid #e5e7eb", textAlign: "center", color: "#888", fontSize: 14 }}>
              부동산 정보채널 공실뉴스
            </div>
          </div>
        </div>
      , document.body)}
    </>
  );
}
