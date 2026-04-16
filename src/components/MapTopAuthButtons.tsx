"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import AuthModal from "./AuthModal";
import SignupCompleteModal from "./SignupCompleteModal";
import { createClient } from "@/utils/supabase/client";

export default function MapTopAuthButtons({ themeColor = "#1a73e8" }: { themeColor?: string }) {
  const router = useRouter();
  
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authTab, setAuthTab] = useState<'signup' | 'login'>('signup');
  const [isSignupCompleteOpen, setIsSignupCompleteOpen] = useState(false);
  const [signupEmail, setSignupEmail] = useState('');
  const [signupName, setSignupName] = useState('');
  
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>('');

  const searchWrapRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkUserStatus = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('members')
          .select('signup_completed, email, name, role')
          .eq('id', user.id)
          .single();
          
        if (data) {
          setCurrentUser(user);
          setUserRole(data.role || 'USER');
          
          if (data.signup_completed === false) {
            setSignupEmail(data.email || user.email || '');
            setSignupName(data.name || user.user_metadata?.full_name || '');
            setIsSignupCompleteOpen(true);
          }
        }
      }
    };
    checkUserStatus();
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.reload();
  };

  const executeSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchInputRef.current?.value) {
      router.push(`/news_all?q=${encodeURIComponent(searchInputRef.current.value)}`);
    }
  };

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

      <div style={{ display: "flex", alignItems: "center", gap: "16px", marginLeft: "auto" }}>
        
        {/* 검색 UI */}
        <div className="top-search-wrap map-auth-search" ref={searchWrapRef} style={{ display: "flex", alignItems: "center", background: "#f8f9fa", borderRadius: "20px", padding: "4px 12px", border: "1px solid #eee", width: "32px", overflow: "hidden", transition: "width 0.3s ease" }}>
          <input 
            type="text" 
            ref={searchInputRef} 
            placeholder="검색어를 입력하세요" 
            onKeyDown={executeSearch}
            style={{ border: "none", background: "none", outline: "none", fontSize: "13px", color: "#333", width: "100%", opacity: 0, transition: "opacity 0.3s ease" }} 
          />
          <svg 
            onClick={() => { 
              if (searchWrapRef.current) {
                const isActive = searchWrapRef.current.style.width === "200px";
                searchWrapRef.current.style.width = isActive ? "32px" : "200px";
                if (searchInputRef.current) searchInputRef.current.style.opacity = isActive ? "0" : "1";
                if (!isActive && searchInputRef.current) searchInputRef.current.focus();
              }
            }} 
            style={{ cursor: "pointer", flexShrink: 0, color: "#111" }} 
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </div>

        {/* 로그인 / 회원 버튼 */}
        {currentUser ? (
          <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "12px" }}>
            <div style={{
              background: userRole === 'ADMIN' ? '#111827' : userRole === 'REALTOR' ? '#2563eb' : '#6b7280',
              color: '#fff',
              padding: '5px 12px',
              borderRadius: '20px',
              fontWeight: '700',
              cursor: 'pointer',
              fontSize: '12px',
            }} onClick={() => { 
              if (userRole === 'ADMIN') router.push('/admin'); 
              else if (userRole === 'REALTOR') router.push('/realty_admin');
              else router.push('/user_admin');
            }}>
              {userRole === 'ADMIN' ? '최고관리자 >>' : userRole === 'REALTOR' ? '부동산회원 >>' : '일반회원 >>'}
            </div>
            <div style={{ color: "#555", cursor: "pointer", fontWeight: "600", fontSize: "13px" }} onClick={handleLogout}>
              로그아웃
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div className="icon-tooltip-wrap tooltip-right" data-tooltip="회원가입/로그인" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg onClick={() => setIsAuthModalOpen(true)} style={{ cursor: "pointer", color: themeColor, flexShrink: 0 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle>
              </svg>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
