"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function AnimatedLectureLink({ href, children, className, style }: { href: string; children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  const router = useRouter();
  const [isAnimating, setIsAnimating] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsAnimating(true);
    setTimeout(() => {
      window.scrollTo(0, 0);
      router.push(href);
      setTimeout(() => setIsAnimating(false), 500);
    }, 150);
  };

  return (
    <>
      <div onClick={handleClick} className={className} style={{ textDecoration: "none", cursor: "pointer", ...style }}>
        {children}
      </div>

      {isAnimating && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100vh",
          zIndex: 99999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none"
        }}>
          <div style={{
            background: "#e5e7eb",
            animation: "expand-square-pc 0.15s ease-out forwards",
            borderRadius: "16px"
          }} />
          <style>{`
            @keyframes expand-square-pc {
              0% { width: 80px; height: 80px; opacity: 0.8; }
              100% { width: 100vw; height: 100vh; opacity: 1; border-radius: 0; }
            }
          `}</style>
        </div>
      )}
    </>
  );
}
