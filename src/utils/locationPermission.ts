/**
 * 위치 권한 거부 시 설정 화면 이동을 시도하는 유틸리티
 * 
 * - 네이티브 앱(WebView): JavaScript Bridge를 통해 설정 화면 직접 이동
 * - 모바일 브라우저: 설정 방법 안내 다이얼로그 표시
 */

declare global {
  interface Window {
    /** Android WebView JavaScript Interface */
    Android?: {
      openLocationSettings?: () => void;
      openAppSettings?: () => void;
    };
    /** iOS WKWebView Message Handler */
    webkit?: {
      messageHandlers?: {
        openSettings?: {
          postMessage: (msg: string) => void;
        };
        openLocationSettings?: {
          postMessage: (msg: string) => void;
        };
      };
    };
  }
}

/**
 * 네이티브 앱 환경인지 감지
 */
function isNativeApp(): boolean {
  return !!(window.Android || window.webkit?.messageHandlers?.openSettings || window.webkit?.messageHandlers?.openLocationSettings);
}

/**
 * 네이티브 브릿지를 통해 설정 화면 열기 시도
 * @returns 성공 여부
 */
function tryOpenNativeSettings(): boolean {
  // Android Bridge
  if (window.Android?.openLocationSettings) {
    window.Android.openLocationSettings();
    return true;
  }
  if (window.Android?.openAppSettings) {
    window.Android.openAppSettings();
    return true;
  }

  // iOS Bridge
  if (window.webkit?.messageHandlers?.openLocationSettings) {
    window.webkit.messageHandlers.openLocationSettings.postMessage("location");
    return true;
  }
  if (window.webkit?.messageHandlers?.openSettings) {
    window.webkit.messageHandlers.openSettings.postMessage("location");
    return true;
  }

  // Fallback: Android intent 스킴으로 위치 설정 열기 시도
  const os = detectOS();
  if (os === "android") {
    try {
      window.location.href = "intent://settings/location#Intent;scheme=android-app;end;";
      return true;
    } catch (e) {
      // intent 실패 시 앱 설정으로 시도
      try {
        window.location.href = "intent://#Intent;action=android.settings.LOCATION_SOURCE_SETTINGS;end;";
        return true;
      } catch (_) {}
    }
  }

  // Fallback: iOS 설정 앱 열기 시도
  if (os === "ios") {
    try {
      window.location.href = "App-Prefs:Privacy&path=LOCATION";
      return true;
    } catch (e) {
      try {
        window.location.href = "app-settings://";
        return true;
      } catch (_) {}
    }
  }

  return false;
}

/**
 * 사용자의 OS 감지
 */
function detectOS(): "android" | "ios" | "unknown" {
  const ua = navigator.userAgent.toLowerCase();
  if (/android/i.test(ua)) return "android";
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  return "unknown";
}

/**
 * 위치 권한 거부 시 호출 — 설정 이동 유도
 * confirm()으로 물어본 후, 네이티브면 설정 이동 / 브라우저면 안내 표시
 */
export function handleLocationPermissionDenied(): void {
  // 모든 환경에서 confirm → 설정 이동 시도
  const os = detectOS();

  let message = "📍 위치 권한이 필요합니다.\n\n";

  if (isNativeApp()) {
    message += "'확인'을 누르면 앱 설정으로 이동합니다.\n위치 권한을 허용해 주세요.";
  } else if (os === "android") {
    message +=
      "'확인'을 누르면 위치 설정으로 이동합니다.\n\n" +
      "이동이 안 될 경우:\n" +
      "① 브라우저 주소창 왼쪽 🔒 아이콘 터치\n" +
      "② '권한' → '위치'를 '허용'으로 변경\n" +
      "③ 페이지 새로고침";
  } else if (os === "ios") {
    message +=
      "'확인'을 누르면 설정으로 이동합니다.\n\n" +
      "이동이 안 될 경우:\n" +
      "① 아이폰 '설정' 앱 열기\n" +
      "② '개인정보 보호 및 보안' → '위치 서비스'\n" +
      "③ 사용 중인 앱/브라우저에서 위치 허용";
  } else {
    message += "브라우저 설정에서 위치 권한을 허용해 주세요.\n설정 완료 후 새로고침 해주세요.";
  }

  const goSettings = confirm(message);
  if (goSettings) {
    const opened = tryOpenNativeSettings();
    if (!opened) {
      // 설정 이동 실패 시 추가 안내
      if (os === "android") {
        alert(
          "자동 이동이 지원되지 않습니다.\n\n" +
          "휴대폰 설정 > 앱 > 브라우저 > 권한 > 위치 허용\n" +
          "설정 후 새로고침 해주세요."
        );
      } else if (os === "ios") {
        alert(
          "자동 이동이 지원되지 않습니다.\n\n" +
          "설정 > 개인정보 보호 및 보안 > 위치 서비스\n" +
          "에서 위치 허용 후 새로고침 해주세요."
        );
      }
    }
  }
}

/**
 * 위치 지원 불가 기기 안내
 */
export function handleLocationUnavailable(): void {
  alert("이 기기 또는 브라우저에서는 위치 서비스를 지원하지 않습니다.");
}
