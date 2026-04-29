"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function MobileBottomNav() {
  const pathname = usePathname();

  const navItems = [
    { 
      name: "홈", path: "/m", 
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
    },
    { 
      name: "우리동네", path: "/m/news?tab=local", 
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
    },
    { 
      name: "공실", path: "/m/gongsil", 
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
    },
    { 
      name: "특강", path: "/m/study", 
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c3 3 9 3 12 0v-5"></path></svg>
    },
    { 
      name: "마이", path: "/m/mypage", 
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
    },
  ];

  return (
    <nav 
      className="fixed bottom-0 left-0 w-full z-50 bg-white border-t border-gray-200 pb-safe"
      style={{ position: 'fixed', bottom: 0, left: 0, width: '100%', zIndex: 50, backgroundColor: '#ffffff', borderTop: '1px solid #e5e7eb' }}
    >
      <div 
        className="max-w-md mx-auto flex justify-between items-center h-[60px] px-2"
        style={{ maxWidth: '448px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '60px', padding: '0 8px' }}
      >
        {navItems.map((item) => {
          const isActive = pathname === item.path || 
            (item.path !== "/m" && pathname.startsWith(item.path.split('?')[0]));

          return (
            <Link
              key={item.name}
              href={item.path}
              className="flex flex-col items-center justify-center w-full h-full"
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}
            >
              <span className={`text-xl mb-1 ${isActive ? "opacity-100 scale-110" : "opacity-50 grayscale"} transition-all duration-200`}>
                {item.icon}
              </span>
              <span className={`text-[10px] font-bold ${isActive ? "text-[#1a2e50]" : "text-gray-400"}`}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
