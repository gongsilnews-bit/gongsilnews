import React from 'react';
import Link from 'next/link';

interface HamburgerMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HamburgerMenu({ isOpen, onClose }: HamburgerMenuProps) {
  if (!isOpen) return null;

  return (
    <div className="animate-slide-in-left" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100dvh', backgroundColor: '#f9fafb', zIndex: 99999, display: 'flex', flexDirection: 'column', overflowX: 'hidden' }}>
      <style>{`
        @keyframes slideInLeft {
          from { transform: translateX(-100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in-left {
          animation: slideInLeft 0.3s cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }
      `}</style>
      
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'space-between', padding: '16px', backgroundColor: '#fff', borderBottom: '1px solid #f3f4f6' }}>
        <img src="/logo.png" alt="공실뉴스" style={{ height: '24px', objectFit: 'contain' }} />
        <button onClick={onClose} style={{ padding: '4px' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* 프로필 영역 */}
        <div className="bg-white p-5 border-b border-gray-100" style={{ backgroundColor: '#ffffff', padding: '20px', borderBottom: '1px solid #f3f4f6' }}>
          <div className="flex items-center" style={{ display: 'flex', alignItems: 'center' }}>
            <div className="w-12 h-12 bg-gray-200 rounded-full overflow-hidden mr-3" style={{ width: '48px', height: '48px', backgroundColor: '#e5e7eb', borderRadius: '50%', overflow: 'hidden', marginRight: '12px' }}>
              <img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80" alt="Profile" className="w-full h-full object-cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div>
              <h2 className="text-[18px] font-bold text-gray-900" style={{ fontSize: '18px', fontWeight: 700, color: '#111827' }}>홍길동 대표님</h2>
              <p className="text-[12px] text-gray-500 mt-1" style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>hong@gongsil.com</p>
            </div>
          </div>
        </div>

        {/* 뉴스 메뉴 */}
        <div className="mt-2 bg-white" style={{ marginTop: '8px', backgroundColor: '#ffffff' }}>
          <h3 className="px-5 pt-5 pb-2 text-[14px] font-bold text-gray-500" style={{ padding: '20px 20px 8px 20px', fontSize: '14px', fontWeight: 700, color: '#6b7280' }}>공실뉴스</h3>
          <ul>
            {["전체뉴스", "우리동네뉴스", "부동산·주식·재테크", "정치·경제·사회", "세무·법률", "여행·건강·생활", "기타"].map(menu => (
              <li key={menu}>
                <Link href="/m/news" onClick={onClose} className="w-full flex items-center justify-between px-5 py-3 border-b border-gray-50 active:bg-gray-50 text-gray-800" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid #f9fafb', color: '#1f2937', textDecoration: 'none' }}>
                  <span className="text-[15px] font-medium" style={{ fontSize: '15px', fontWeight: 500 }}>{menu}</span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* 서비스 메뉴 */}
        <div className="mt-2 bg-white" style={{ marginTop: '8px', backgroundColor: '#ffffff' }}>
          <h3 className="px-5 pt-5 pb-2 text-[14px] font-bold text-gray-500" style={{ padding: '20px 20px 8px 20px', fontSize: '14px', fontWeight: 700, color: '#6b7280' }}>서비스</h3>
          <ul>
            {[
              { name: "공실열람", path: "/m/gongsil" },
              { name: "자료실", path: "/m/study" },
              { name: "부동산특강", path: "/m/study" },
              { name: "중개업소무료가입", path: "/m" }
            ].map(menu => (
              <li key={menu.name}>
                <Link href={menu.path} onClick={onClose} className="w-full flex items-center justify-between px-5 py-3 border-b border-gray-50 active:bg-gray-50 text-gray-800" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid #f9fafb', color: '#1f2937', textDecoration: 'none' }}>
                  <span className="text-[15px] font-medium" style={{ fontSize: '15px', fontWeight: 500 }}>{menu.name}</span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* 풋터 영역 */}
        <div className="bg-gray-100 p-5 mt-4" style={{ backgroundColor: '#f3f4f6', padding: '24px 20px', marginTop: '16px' }}>
          <div style={{ marginBottom: '16px', display: 'flex', gap: '16px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#4b5563' }}>이용약관</span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#4b5563' }}>개인정보처리방침</span>
          </div>
          <div style={{ fontSize: '12px', color: '#9ca3af', lineHeight: 1.6 }}>
            (주)공실뉴스<br/>
            대표자: 홍길동 | 사업자등록번호: 123-45-67890<br/>
            통신판매업신고: 2026-서울강남-0000<br/>
            주소: 서울특별시 강남구 테헤란로 123, 4층<br/>
            고객센터: 1588-0000 (평일 10:00~18:00)
          </div>
          <div style={{ fontSize: '11px', color: '#d1d5db', marginTop: '16px' }}>
            © 2026 GongsilNews. All rights reserved.
          </div>
        </div>
      </div>
    </div>
  );
}
