"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function AnimatedLectureLink({ href, children }: { href: string; children: React.ReactNode }) {
  const router = useRouter();
  const [isAnimating, setIsAnimating] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsAnimating(true);
    
    // 0.15초 동안 사각형이 커지는 애니메이션을 보여준 뒤 페이지 이동
    setTimeout(() => {
      router.push(href);
      // 뒤로가기로 돌아왔을 때를 대비해 상태 초기화 (페이지 전환 완료 후)
      setTimeout(() => setIsAnimating(false), 500);
    }, 150);
  };

  return (
    <>
      <div onClick={handleClick} style={{ textDecoration: "none", display: "block", cursor: "pointer" }}>
        {children}
      </div>

      {isAnimating && (
        <div style={{
          position: "fixed",
          top: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: "100%",
          maxWidth: "448px",
          height: "100vh",
          zIndex: 99999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none"
        }}>
          <div style={{
            background: "#e5e7eb", // 회색 사각형
            animation: "expand-square 0.15s ease-out forwards",
            borderRadius: "16px"
          }} />
          <style>{`
            @keyframes expand-square {
              0% { width: 60px; height: 60px; opacity: 0.8; }
              100% { width: 100%; height: 100vh; opacity: 1; border-radius: 0; }
            }
          `}</style>
        </div>
      )}
    </>
  );
}
