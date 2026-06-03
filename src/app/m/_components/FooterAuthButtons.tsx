"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import AuthModal from "@/components/AuthModal";

export default function FooterAuthButtons() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsLoggedIn(!!user);
    });
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setIsLoggedIn(false);
    window.location.reload();
  };

  return (
    <>
      <div style={{ display: "flex", gap: 10, justifyContent: "center", padding: "18px 16px" }}>
        {isLoggedIn ? (
          <button
            onClick={handleLogout}
            style={{ flex: 1, maxWidth: 160, height: 42, border: "1px solid #ddd", borderRadius: 4, background: "#fff", color: "#555", fontSize: 14, fontWeight: 700, cursor: "pointer", letterSpacing: "-0.3px" }}
          >
            로그아웃
          </button>
        ) : (
          <>
            <button
              onClick={() => setShowAuth(true)}
              style={{ flex: 1, maxWidth: 160, height: 42, border: "1px solid #ddd", borderRadius: 4, background: "#fff", color: "#333", fontSize: 14, fontWeight: 700, cursor: "pointer", letterSpacing: "-0.3px" }}
            >
              로그인
            </button>
            <button
              onClick={() => { window.location.href = '/m/signup'; }}
              style={{ flex: 1, maxWidth: 160, height: 42, border: "none", borderRadius: 4, background: "#1e56a0", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", letterSpacing: "-0.3px" }}
            >
              무료회원가입
            </button>
          </>
        )}
      </div>
      {showAuth && <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />}
    </>
  );
}
