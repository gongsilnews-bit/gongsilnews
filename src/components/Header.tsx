"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import AuthModal from "./AuthModal";
import SignupCompleteModal from "./SignupCompleteModal";
import { createClient } from "@/utils/supabase/client";


export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const headerRef = useRef<HTMLElement>(null);
  const searchWrapRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const txtBannerListRef = useRef<HTMLUListElement>(null);
  const txtDropdownRef = useRef<HTMLDivElement>(null);
  const txtContainerRef = useRef<HTMLDivElement>(null);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authTab, setAuthTab] = useState<'signup' | 'login'>('signup');
  const [isSignupCompleteOpen, setIsSignupCompleteOpen] = useState(false);
  const [signupEmail, setSignupEmail] = useState('');
  const [signupName, setSignupName] = useState('');
  const [showDocWarning, setShowDocWarning] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>('');


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
          if (data.signup_completed === false) {
            setSignupEmail(data.email || user.email || '');
            setSignupName(data.name || user.user_metadata?.full_name || '');
            setIsSignupCompleteOpen(true);
          } else if (data.role === 'REALTOR') {
            // 부동산 회원인데 서류를 제출 안했는지 체크
            const { data: agencyData } = await supabase
              .from('agencies')
              .select('biz_cert_url, reg_cert_url')
              .eq('owner_id', user.id)
              .single();

            if (agencyData && (!agencyData.biz_cert_url || !agencyData.reg_cert_url)) {
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
            소장님! 아직 필수 서류(사업자/개설등록증)를 다 내시지 않았어요! 서류 제출하셔야 공동중계를 무료로 쓰실 수 있어요 👉 
          </span>
          <Link href="/mypage" style={{ textDecoration: 'underline', color: '#e53e3e', fontSize: '14px', fontWeight: 800 }}>마이페이지로 가기</Link>
          <button onClick={() => setShowDocWarning(false)} style={{ background: 'none', border: 'none', marginLeft: '10px', cursor: 'pointer', color: '#c53030' }}>✕</button>
        </div>
      )}


      {/* 1. Top Nav Bar */}
      <div className="top-bar">
        <div className="top-bar-left">
          <div className="top-logo" onClick={() => window.location.href = "/"} style={{ cursor: "pointer" }}>공실뉴스</div>
          <div className="top-desc" style={{ marginRight: '16px' }}>11만 부동산을 위한 무료 정보 채널</div>
          {currentUser && userRole === 'ADMIN' && (
            <button 
              onClick={() => router.push('/admin')}
              style={{
                background: '#e53e3e',
                color: '#fff',
                border: 'none',
                padding: '4px 12px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 'bold',
                cursor: 'pointer',
                marginLeft: '10px'
              }}
            >
              관리자페이지 이동 🚀
            </button>
          )}
        </div>
        <div className="top-bar-right">
          <div className="top-search-wrap" ref={searchWrapRef}>
            <input type="text" className="top-search-input" ref={searchInputRef} placeholder="검색어를 입력하세요" />
            <div className="icon-tooltip-wrap" data-tooltip="검색">
              <svg onClick={() => { searchWrapRef.current?.classList.toggle("active"); searchInputRef.current?.focus(); }} viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            </div>
          </div>
          {currentUser ? (
            <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "12px" }}>
              <div style={{
                background: userRole === 'ADMIN' ? '#111827' : userRole === 'REALTOR' ? '#2563eb' : 'rgba(255, 255, 255, 0.3)',
                color: '#fff',
                padding: '4px 10px',
                borderRadius: '4px',
                fontWeight: '700',
                cursor: 'pointer',
                fontSize: '11px',
              }} onClick={() => { 
                if (userRole === 'ADMIN') router.push('/admin'); 
                else if (userRole === 'REALTOR') router.push('/realty_admin');
                else router.push('/user_admin');
              }}>
                {userRole === 'ADMIN' ? '최고관리자 >>' : userRole === 'REALTOR' ? '부동산회원 >>' : '일반회원 >>'}
              </div>
              <div style={{ color: "rgba(255,255,255,0.7)", cursor: "pointer", fontWeight: "600", fontSize: "13px" }} onClick={async () => {
                const supabase = createClient();
                await supabase.auth.signOut();
                window.location.reload();
              }}>로그아웃</div>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
              <div className="icon-tooltip-wrap" data-tooltip="회원가입/로그인">
                <svg onClick={() => { setAuthTab('signup'); setIsAuthModalOpen(true); }} style={{ cursor: "pointer" }} viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              </div>
            </div>
          )}
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
