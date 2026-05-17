"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import AuthModal from "./AuthModal";
import SignupCompleteModal from "./SignupCompleteModal";
import BannerSlot from "./BannerSlot";
import HeaderTextBanner from "./HeaderTextBanner";
import { createClient } from "@/utils/supabase/client";


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
      if (headerRef.current) {
        if (window.scrollY > 40) {
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

      {/* 0. Top Full Banner */}
      <div style={{ width: "100%", background: "#f8f9fa", display: "flex", justifyContent: "center" }}>
        <div style={{ maxWidth: 1920, width: "100%" }}>
          <BannerSlot placement="TOP_FULL" style={{ borderRadius: 0 }} initialBanners={topFullBanners} />
        </div>
      </div>

      {/* 1. Top Nav Bar */}
      <div className="top-bar">
        <div className="top-bar-left">
          <div className="top-logo" onClick={() => window.location.href = "/"} style={{ cursor: "pointer" }}>공실뉴스</div>
          <div className="top-desc" style={{ marginRight: '16px' }}>11만 부동산을 위한 무료 정보 채널</div>

        </div>
        <div className="top-bar-right">
          <div className={`top-search-wrap ${isSearchActive ? 'active' : ''}`} ref={searchWrapRef}>
            <input
              type="text"
              className="top-search-input"
              ref={searchInputRef}
              placeholder="검색어를 입력하세요"
              onFocus={() => setIsSearchActive(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const query = searchInputRef.current?.value.trim();
                  if (query) {
                    handleSearch(query);
                  }
                }
              }}
            />
            <div className="icon-tooltip-wrap" data-tooltip="검색">
              <svg onClick={() => {
                if (isSearchActive) {
                  const query = searchInputRef.current?.value.trim();
                  if (query) {
                    handleSearch(query);
                  } else {
                    setIsSearchActive(false);
                    searchWrapRef.current?.classList.remove('active');
                  }
                } else {
                  setIsSearchActive(true);
                  searchWrapRef.current?.classList.add('active');
                  setTimeout(() => searchInputRef.current?.focus(), 100);
                }
              }} viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            </div>

            {/* 최근 검색어 레이어 */}
            {isSearchActive && (
              <div style={{ position: "absolute", top: "100%", right: 0, marginTop: "8px", width: "320px", background: "#fff", borderRadius: "12px", boxShadow: "0 10px 30px rgba(0,0,0,0.15)", border: "1px solid #e5e7eb", zIndex: 1000, overflow: "hidden", color: "#111" }}>
                <div style={{ padding: "16px", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "14px", fontWeight: "bold" }}>최근 검색어</span>
                  {recentSearches.length > 0 && (
                    <button onClick={clearSearches} style={{ background: "none", border: "none", fontSize: "12px", color: "#6b7280", cursor: "pointer" }}>전체 삭제</button>
                  )}
                </div>
                <div style={{ maxHeight: "280px", overflowY: "auto", padding: "8px 0" }}>
                  {recentSearches.length > 0 ? (
                    recentSearches.map((term, idx) => (
                      <div key={idx} onClick={() => handleSearch(term)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", cursor: "pointer", transition: "background 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.background = "#f9fafb"} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                          <span style={{ fontSize: "14px", color: "#374151" }}>{term}</span>
                        </div>
                        <button onClick={(e) => removeSearch(term, e)} style={{ background: "none", border: "none", padding: "4px", color: "#9ca3af", cursor: "pointer", display: "flex", alignItems: "center" }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: "30px 16px", textAlign: "center", fontSize: "13px", color: "#9ca3af" }}>최근 검색어가 없습니다.</div>
                  )}
                </div>
                <div style={{ background: "#f9fafb", padding: "10px 16px", textAlign: "right", borderTop: "1px solid #f3f4f6" }}>
                  <button onClick={() => { setIsSearchActive(false); searchWrapRef.current?.classList.remove('active'); }} style={{ background: "none", border: "none", fontSize: "12px", color: "#6b7280", cursor: "pointer", fontWeight: "bold" }}>닫기</button>
                </div>
              </div>
            )}
          </div>
          
          <div onClick={() => router.push('/signup')} style={{ cursor: "pointer", fontSize: "13px", fontWeight: "700", color: "#fcd34d", marginRight: "12px", whiteSpace: "nowrap" }}>
            중개업소무료가입
          </div>

          {currentUser ? (
            <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "12px" }}>
              <div style={{
                background: userRole === 'ADMIN' ? '#111827' : agencyStatus === 'REJECTED' ? '#ef4444' : userRole === 'REALTOR' ? '#2563eb' : 'rgba(255, 255, 255, 0.3)',
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
            <div style={{ display: "flex", alignItems: "center", gap: "10px", paddingRight: "4px" }}>
              <div className="icon-tooltip-wrap tooltip-right" data-tooltip="회원가입/로그인" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg onClick={() => { setAuthTab('signup'); setIsAuthModalOpen(true); }} style={{ cursor: "pointer", flexShrink: 0 }} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. Main Header Placeholder & Header */}
      <div ref={placeholderRef} style={{ width: "100%", height: 0 }} />
      <header className="header" ref={headerRef}>
        <div className="container px-20">
          <div className="header-top">
            <div className="ht-left"></div>
            <div className="ht-center">
              <img src="/logo.png" className="ht-logo" alt="부동산 정보채널 공실뉴스" onClick={() => window.location.href = "/"} />
            </div>
            <div className="ht-right">
              <HeaderTextBanner initialBanners={headerTextBanners} />
            </div>
          </div>
          <div className="header-bottom">
            <nav className="gnb-new">
              <Link href="/news_all" className={pathname === "/news_all" ? "active" : ""}>전체뉴스</Link>
              <Link href="/news_map" className={pathname === "/news_map" ? "active" : ""}>우리동네부동산</Link>
              <Link href="/news_marketing" className={pathname === "/news_marketing" ? "active" : ""}>부동산마케팅</Link>
              <Link href="/news_finance" className={pathname === "/news_finance" ? "active" : ""}>부동산·주식·재테크</Link>
              <Link href="/news_politics" className={pathname === "/news_politics" ? "active" : ""}>정치·경제·사회</Link>
              <Link href="/news_law" className={pathname === "/news_law" ? "active" : ""}>세무·법률</Link>
              <div className="gnb-dropdown-parent" style={{ position: "relative", display: "inline-block" }}>
                <Link href="/news_etc" className={pathname === "/news_etc" || pathname === "/news_life" ? "active" : ""} style={{ padding: "10px 0", transition: "color 0.2s" }}>기타</Link>
                <div className="gnb-dropdown">
                  <ul>
                    <li><Link href="/news_life">여행·건강·생활</Link></li>
                    <li><Link href="/news_etc?cat=it">IT·가전·가구</Link></li>
                    <li><Link href="/news_etc?cat=sports">스포츠·연예·Car</Link></li>
                    <li><Link href="/news_etc?cat=mission">인물·미션·기타</Link></li>
                  </ul>
                </div>
              </div>
              <span className="divider"></span>
              <Link href="/gongsil">공실열람</Link>
              <Link href="/#special-lecture">부동산특강</Link>
              <div className="gnb-dropdown-parent" style={{ position: "relative", display: "inline-block" }}>
                <Link href="/board" style={{ padding: "10px 0", transition: "color 0.2s" }}>자료실</Link>
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
                <Link href="/board?id=free" style={{ padding: "10px 0", transition: "color 0.2s" }}>커뮤니티</Link>
                <div className="gnb-dropdown">
                  <ul>
                    <li><a href="/board?id=notice">공지사항</a></li>
                    <li><a href="/board?id=free">자유게시판</a></li>
                    <li><a href="/board?id=qna">Q&A</a></li>
                  </ul>
                </div>
              </div>
            </nav>
          </div>
        </div>
      </header>
    </>
  );
}
