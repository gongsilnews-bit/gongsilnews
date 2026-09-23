/**
 * 설치 조건을 채우기 위한 최소 서비스워커.
 *
 * 안드로이드 크롬은 manifest 와 함께 서비스워커가 있어야 [홈 화면에 추가]를
 * 내준다. 그런데 서비스워커가 화면을 가로채 캐시를 돌려주기 시작하면, 중개사가
 * 홈페이지를 고쳐도 손님 폰에는 옛 화면이 남는다. 그건 고치기 어려운 사고다.
 *
 * 그래서 이 워커는 아무것도 가로채지 않는다. fetch 를 듣기만 하고 응답에는
 * 손대지 않으므로, 설치 조건만 채우고 평소 동작은 그대로다.
 */
const SW = `
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
// 듣기만 한다. respondWith 를 부르지 않으면 브라우저가 평소대로 가져온다.
self.addEventListener("fetch", () => {});
`;

export async function GET() {
  return new Response(SW, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      // 워커가 캐시에 눌러앉으면 나중에 고칠 수가 없다
      "Cache-Control": "no-cache",
      "Service-Worker-Allowed": "/",
    },
  });
}
