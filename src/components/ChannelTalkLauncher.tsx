"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { CHANNEL_TALK_BADGE_EVENT, CHANNEL_TALK_VISIBILITY_EVENT } from "./ChannelTalk";
import { openChannelTalk } from "@/utils/channelTalk";

/**
 * 채널톡 상담 플로팅 버튼.
 *
 * 채널톡 기본 런처는 hideChannelButtonOnBoot 으로 숨겨두고 이 버튼이 대신 뜬다.
 * SDK 가 위치를 정하게 두면 공실톡(회원 간 채팅) 버튼과 우하단에서 겹치기 때문에,
 * 위치를 우리가 직접 잡기 위한 구조다.
 *
 * ── 우하단 플로팅 슬롯 배분 ──
 *   PC    : 상담 24~80                        / 공실톡 136 이상
 *   모바일 : 하단 탭바 0~60
 *           공실등록 FAB 80~128 (MobileHomeClient)
 *           상담 136~192                      / 공실톡 200 이상
 * 모바일 홈의 공실등록 FAB 는 주요 CTA 라 상담 버튼이 그 위를 덮으면 안 된다.
 * 공실톡 버튼은 GongsilTalkOverlay 에서 현재 주석 처리되어 있다.
 * 다시 켤 때는 위 슬롯을 지켜야 겹치지 않는다.
 */

const NAVY = "#1a2e50";
const MOBILE_MAX_WIDTH = 448;
/** 모바일 홈의 공실등록 FAB(bottom 80, 높이 48) 바로 위 */
const MOBILE_BOTTOM = 136;

function subscribeToResize(onChange: () => void) {
  window.addEventListener("resize", onChange);
  return () => window.removeEventListener("resize", onChange);
}

export default function ChannelTalkLauncher() {
  const pathname = usePathname();
  const isMobilePath = pathname?.startsWith("/m") ?? false;

  const [unread, setUnread] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [messengerOpen, setMessengerOpen] = useState(false);

  // 모바일 레이아웃은 448px 로 가운데 정렬된다. 화면이 그보다 넓으면
  // 화면 끝이 아니라 콘텐츠 우측 끝에 버튼을 붙인다(공실톡 버튼과 같은 규칙).
  const isNarrow = useSyncExternalStore(
    subscribeToResize,
    useCallback(() => window.innerWidth <= MOBILE_MAX_WIDTH, []),
    useCallback(() => true, [])
  );

  useEffect(() => {
    const onBadge = (e: Event) => setUnread((e as CustomEvent<number>).detail || 0);
    const onVisibility = (e: Event) =>
      setMessengerOpen(Boolean((e as CustomEvent<boolean>).detail));

    window.addEventListener(CHANNEL_TALK_BADGE_EVENT, onBadge);
    window.addEventListener(CHANNEL_TALK_VISIBILITY_EVENT, onVisibility);
    return () => {
      window.removeEventListener(CHANNEL_TALK_BADGE_EVENT, onBadge);
      window.removeEventListener(CHANNEL_TALK_VISIBILITY_EVENT, onVisibility);
    };
  }, []);

  // 메신저가 열려 있는 동안에는 버튼이 그 위에 겹치므로 숨긴다.
  if (messengerOpen) return null;

  const horizontal =
    isMobilePath && !isNarrow
      ? { left: "50%", marginLeft: MOBILE_MAX_WIDTH / 2 - 84 }
      : { right: 24 };

  return (
    <button
      type="button"
      aria-label="실시간 상담 열기"
      onClick={() => openChannelTalk()}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "fixed",
        bottom: isMobilePath ? MOBILE_BOTTOM : 24,
        ...horizontal,
        zIndex: 20000000,
        width: 56,
        height: 56,
        borderRadius: "50%",
        background: NAVY,
        border: "none",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: hovered
          ? "0 6px 24px rgba(0,0,0,0.35)"
          : "0 4px 16px rgba(0,0,0,0.25)",
        transform: hovered ? "scale(1.08)" : "scale(1)",
        transition: "transform 0.2s, box-shadow 0.2s",
      }}
    >
      {/* 상담원 헤드셋 아이콘 */}
      <svg
        width="26"
        height="26"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#fff"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
        <path d="M4 14h2a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" />
        <path d="M20 14h-2a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1z" />
        <path d="M19 19v1a2 2 0 0 1-2 2h-3" />
      </svg>

      {unread > 0 && (
        <span
          style={{
            position: "absolute",
            top: -2,
            right: -2,
            minWidth: 20,
            height: 20,
            background: "#ef4444",
            color: "#fff",
            fontSize: 11,
            fontWeight: 700,
            borderRadius: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 6px",
            border: "2px solid #fff",
          }}
        >
          {unread > 99 ? "99+" : unread}
        </span>
      )}

      <span
        style={{
          position: "absolute",
          top: -18,
          left: "50%",
          transform: "translateX(-50%)",
          fontSize: 10,
          fontWeight: 700,
          color: NAVY,
          whiteSpace: "nowrap",
          pointerEvents: "none",
        }}
      >
        상담
      </span>
    </button>
  );
}
