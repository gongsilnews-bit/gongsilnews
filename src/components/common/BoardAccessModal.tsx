"use client";

import React, { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { getLevelName } from "@/utils/permissionCheck";

/**
 * 게시판 열람·글쓰기 권한이 없을 때 띄우는 안내 팝업.
 *
 * 전에는 화면 아래 작은 토스트로 2.5초 보여주고 끝나서 잘 안 보였고,
 * 무엇을 하면 되는지도 알려주지 않았다. 필요한 등급에 따라 다음 행동을 안내한다.
 * - 일반회원(1레벨)이면 충분한 글: 로그인 안내
 * - 부동산회원(2~4레벨) 글: 공실스터디 안내(/study) + 비로그인이면 로그인
 * - 최고관리자 전용: 안내만
 */
export type BoardAccessNotice = { level: number; action?: "read" | "write" };

export function BoardAccessCard({
  level,
  action = "read",
  isLoggedIn,
  onClose,
}: BoardAccessNotice & { isLoggedIn: boolean; onClose?: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const qs = searchParams.toString();
  const returnTo = encodeURIComponent(pathname + (qs ? `?${qs}` : ""));
  const loginHref = `/login?returnTo=${returnTo}`;

  const levelName = getLevelName(level);
  const verb = action === "write" ? "글을 등록하실" : "열람하실";
  const needsLoginOnly = level <= 1;
  const adminOnly = level >= 5;

  const title = needsLoginOnly
    ? "로그인이 필요합니다"
    : adminOnly
      ? "관리자 전용입니다"
      : `${levelName} 전용입니다`;

  const btnBase: React.CSSProperties = {
    display: "block",
    width: "100%",
    boxSizing: "border-box",
    padding: "13px 0",
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 700,
    textAlign: "center",
    textDecoration: "none",
    cursor: "pointer",
  };
  const primary: React.CSSProperties = { ...btnBase, background: "#0f9d6b", color: "#fff", border: "none" };
  const secondary: React.CSSProperties = { ...btnBase, background: "#fff", color: "#374151", border: "1px solid #d1d5db" };

  return (
    <div style={{ background: "#fff", borderRadius: 14, padding: "32px 28px 24px", width: "100%", maxWidth: 380, boxSizing: "border-box", textAlign: "center", boxShadow: "0 20px 50px rgba(0,0,0,0.25)" }}>
      <div style={{ width: 56, height: 56, margin: "0 auto 16px", borderRadius: "50%", background: "#e8f7f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>🔒</div>
      <div style={{ fontSize: 19, fontWeight: 800, color: "#111827", marginBottom: 10, wordBreak: "keep-all" }}>{title}</div>
      <div style={{ fontSize: 14.5, color: "#4b5563", lineHeight: 1.6, marginBottom: 24, wordBreak: "keep-all" }}>
        <strong style={{ color: "#0f9d6b" }}>{levelName}</strong>부터 {verb} 수 있습니다.
        {!needsLoginOnly && !adminOnly && (
          <><br />공실스터디에 가입하시면 바로 이용하실 수 있습니다.</>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {needsLoginOnly ? (
          !isLoggedIn && <a href={loginHref} style={primary}>로그인</a>
        ) : !adminOnly && (
          <>
            <a href="/study" style={primary}>공실스터디 알아보기</a>
            {!isLoggedIn && <a href={loginHref} style={secondary}>로그인</a>}
          </>
        )}
        {onClose && (
          <button onClick={onClose} style={{ ...btnBase, background: "none", border: "none", color: "#6b7280", fontWeight: 600, padding: "10px 0" }}>닫기</button>
        )}
      </div>
    </div>
  );
}

export default function BoardAccessModal({
  notice,
  isLoggedIn,
  onClose,
}: {
  notice: BoardAccessNotice | null;
  isLoggedIn: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!notice) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [notice, onClose]);

  if (!notice) return null;

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 999999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
    >
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 380 }}>
        <BoardAccessCard {...notice} isLoggedIn={isLoggedIn} onClose={onClose} />
      </div>
    </div>
  );
}
