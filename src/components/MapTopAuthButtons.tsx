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
  const [agencyStatus, setAgencyStatus] = useState<string>('');

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
          
          const { data: agencyData } = await supabase
            .from('agencies')
            .select('status')
            .eq('owner_id', user.id)
            .single();

          if (agencyData) {
            setAgencyStatus(agencyData.status || '');
          }

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
        
        {/* 로그인 / 회원 버튼 */}
        {currentUser ? (
          <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "12px" }}>
            <div style={{
              background: userRole === 'ADMIN' ? '#111827' : agencyStatus === 'REJECTED' ? '#ef4444' : userRole === 'REALTOR' ? '#2563eb' : '#6b7280',
              color: '#fff',
              padding: '5px 12px',
              borderRadius: '20px',
              fontWeight: '700',
              cursor: 'pointer',
              fontSize: '12px',
            }} onClick={() => { 
              if (agencyStatus === 'REJECTED') window.open('/realty_admin?menu=settings&tab=agency', '_blank');
              else if (userRole === 'ADMIN') router.push('/admin'); 
              else if (userRole === 'REALTOR') router.push('/realty_admin');
              else router.push('/user_admin');
            }}>
              {userRole === 'ADMIN' ? '최고관리자 >>' : agencyStatus === 'REJECTED' ? '서류보완 >>' : userRole === 'REALTOR' ? '부동산회원 >>' : '일반회원 >>'}
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
