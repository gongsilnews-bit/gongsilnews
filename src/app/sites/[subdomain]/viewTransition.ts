/*
 * [지금은 쓰지 않는다]
 *
 * 문서 간 View Transition 을 붙여 보았다. 누른 카드의 사진이 다음 화면의
 * 사진으로 자라나는 움직임인데, 실제 폰에서 두 가지가 걸렸다.
 *
 *  1. 전환은 새 화면이 다 준비된 뒤에야 시작한다. 느릴 때는 여전히 눌러도
 *     아무 일이 일어나지 않는다 — 고치려던 문제가 그대로 남는다.
 *  2. 출발과 도착 사진의 모양이 다르다. 카드는 4:3, 상세는 가로 띠나 16:9 라
 *     억지로 이으면 찌그러지며 늘어난다.
 *
 * 그래서 늦게 뜨는 것은 OpenVeil(회색 스켈레톤 막)로 가리고, 전환은 껐다.
 * 도착 화면의 사진 모양을 출발 카드와 맞출 수 있게 되면 다시 켜볼 만하다.
 * 켜려면 VIEW_TRANSITION_CSS 를 떠나는 화면과 도착 화면 양쪽 <style> 에 넣고,
 * 누를 때 카드 사진에 view-transition-name 을 달면 된다.
 *
 * 아래 ::view-transition-old/new 에 animation: none 을 주면 사라지는 동작까지
 * 꺼져 옛 사진이 끝까지 남는다. 잔상의 원인이었다. 다시 켤 때는 지울 것.
 */

/**
 * 문서 간 화면 전환.
 *
 * 폰에서 기사·매물은 같은 탭에서 연다(뒤로가기로 홈페이지에 돌아와야 하므로).
 * 그건 전체 새로고침이라 Next 의 <ViewTransition> 이 걸리지 않는다. 대신
 * 브라우저가 문서와 문서 사이를 직접 이어주는 View Transition 을 쓴다 —
 * 이동 방식을 바꾸지 않아도 되고, 지원하지 않는 브라우저는 그냥 예전처럼 넘어간다.
 *
 * 누른 카드의 사진과 다음 화면의 첫 사진에 같은 이름(gs-open)을 달아두면,
 * 브라우저가 한쪽에서 다른 쪽으로 자라나는 움직임을 알아서 그린다.
 *
 * 떠나는 쪽과 도착하는 쪽 문서 양쪽에 다 들어가야 동작한다.
 */
export const VIEW_TRANSITION_CSS = `
  @view-transition { navigation: auto; }

  /* 사진이 자라는 동안 나머지 화면은 살짝 겹쳐 지나간다 */
  ::view-transition-old(root) { animation: gs-vt-out .26s cubic-bezier(.2,0,.2,1) both; }
  ::view-transition-new(root) { animation: gs-vt-in .26s cubic-bezier(.2,0,.2,1) both; }
  @keyframes gs-vt-out { from { opacity: 1; } to { opacity: 0; } }
  @keyframes gs-vt-in { from { opacity: 0; transform: scale(1.015); } to { opacity: 1; transform: none; } }

  /* 사진은 따로 논다 — 자리를 옮기며 크기만 맞춰간다 */
  ::view-transition-group(gs-open) { animation-duration: .34s; }
  ::view-transition-old(gs-open),
  ::view-transition-new(gs-open) { animation: none; mix-blend-mode: normal; }

  /* 움직임을 불편해하는 사람에게는 걸지 않는다 */
  @media (prefers-reduced-motion: reduce) {
    ::view-transition-group(*),
    ::view-transition-old(*),
    ::view-transition-new(*) { animation: none !important; }
  }
`;

/** 도착 화면에서 첫 사진에 이름을 달아주는 규칙 */
export const HERO_SHOT_CSS = `
  .gs-hero-shot, .subdomain-article-view .article-img-wrap { view-transition-name: gs-open; }
`;

/** 이 브라우저가 문서 간 전환을 아는가 */
export function supportsViewTransition() {
  return typeof document !== "undefined" && "startViewTransition" in document;
}
