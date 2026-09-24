/* ══════════════════════════════════════════════════════════════
   공실뉴스 AI 기사작성기 — 백그라운드

   하는 일은 둘뿐이다.
   1) 아이콘을 누르면 작업창을 연다 (페이지를 옮기지 않는다)
   2) 작업창이 기사쓰기 폼으로 넘길 때 데이터를 맡아 두고 탭을 연다

   판단은 전부 작업창(panel.js)이 한다. 여기는 문을 여닫기만 한다.
   ══════════════════════════════════════════════════════════════ */

importScripts("shared/config.js");

/* ── 작업창을 아이콘 클릭으로 연다 ──
   tabId 를 주지 않고 전역으로 설정한다.
   탭별로 설정하면 탭을 옮길 때 작업창이 닫힌다. */
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((e) => console.error("[공실뉴스] 작업창 설정 실패:", e));
});

/* 서비스워커가 잠들었다 깨어난 경우에도 한 번 더 걸어 둔다 */
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch(() => {});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  /* ── 기사쓰기 폼으로 넘기기 ── */
  if (msg.type === "GW_SEND_TO_GONGSIL") {
    const origin = msg.origin || "https://gongsilnews.com";
    const writeUrl = GW.writeUrl(origin, msg.vacancyId);

    chrome.storage.local
      .set({
        [GW.KEY.DRAFT]: {
          article: msg.article,
          media: msg.media || [],
          vacancyId: msg.vacancyId || null,
          origin,
          createdAt: Date.now(),
        },
      })
      .then(() => chrome.tabs.query({}))
      .then((tabs) => {
        /* 이미 열려 있는 기사작성 탭이 있으면 그리로 — 탭이 늘어나지 않게 */
        const open = tabs.find(
          (t) =>
            t.url &&
            t.url.startsWith(origin) &&
            t.url.includes("menu=article") &&
            t.url.includes("action=write")
        );
        if (open && open.id) {
          return chrome.tabs.update(open.id, { active: true, url: writeUrl });
        }
        return chrome.tabs.create({ url: writeUrl, active: true });
      })
      .then((tab) => sendResponse({ ok: true, tabId: tab.id }))
      .catch((e) => sendResponse({ ok: false, error: e.message }));

    return true;
  }

  return false;
});
