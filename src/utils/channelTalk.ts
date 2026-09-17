/**
 * 채널톡(Channel Talk) 런처 제어 유틸.
 *
 * 채널톡 기본 런처 버튼은 hideChannelButtonOnBoot 으로 숨기고,
 * 사이트가 직접 렌더링하는 상담 버튼/메뉴에서만 openChannelTalk() 으로 메신저를 띄운다.
 * 우하단 플로팅 영역을 공실톡(회원 간 채팅) 버튼과 나눠 쓰기 위해 위치 제어권을
 * 채널톡 SDK가 아니라 우리 코드가 갖는 구조다.
 */

/**
 * 채널톡 SDK 핸들. 스크립트 로드 전에는 호출을 q 에 쌓아두는 스텁이 들어있고,
 * 로드가 끝나면 SDK 가 같은 자리를 실제 구현으로 교체한다.
 */
export type ChannelIOInstance = ((...args: unknown[]) => void) & {
  q?: IArguments[];
  c?: (args: IArguments) => void;
};

declare global {
  interface Window {
    ChannelIO?: ChannelIOInstance;
    ChannelIOInitialized?: boolean;
    __gongsilChannelTalkBooted?: boolean;
  }
}

/** 채널톡 SDK 로드 + boot 이 성공적으로 끝났는지 여부 */
export function isChannelTalkReady(): boolean {
  return typeof window !== "undefined" && window.__gongsilChannelTalkBooted === true;
}

/** boot 결과를 기록한다. ChannelTalk 컴포넌트에서만 호출. */
export function markChannelTalkBooted(booted: boolean): void {
  if (typeof window === "undefined") return;
  window.__gongsilChannelTalkBooted = booted;
}

/** 채널톡 로드 실패 시 대체 상담 경로 (카카오톡 채널) */
export const KAKAO_CHAT_FALLBACK_URL = "https://pf.kakao.com/_ckHkG/chat";

/**
 * 채널톡 상담 메신저를 연다.
 *
 * 광고 차단기 등으로 cdn.channel.io 가 막히면 ChannelIO 큐에 명령만 쌓인 채
 * 아무 일도 일어나지 않는다. 그래서 boot 완료 전에는 큐에 넣지 않고,
 * 클릭이라는 사용자 제스처가 살아있는 이 시점에 바로 대체 경로로 보낸다.
 * (제스처가 끝난 뒤 window.open 을 호출하면 팝업 차단에 걸린다.)
 */
export function openChannelTalk(fallbackUrl: string | null = KAKAO_CHAT_FALLBACK_URL): void {
  if (typeof window === "undefined") return;

  if (!isChannelTalkReady()) {
    if (fallbackUrl) window.open(fallbackUrl, "_blank", "noopener,noreferrer");
    return;
  }

  window.ChannelIO?.("showMessenger");
}

/** 채널톡 상담 메신저를 닫는다. */
export function closeChannelTalk(): void {
  if (typeof window === "undefined") return;
  window.ChannelIO?.("hideMessenger");
}
