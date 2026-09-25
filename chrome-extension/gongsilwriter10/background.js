/* ══════════════════════════════════════════════════════════════
   공실뉴스 AI 기사작성기 — 백그라운드

   하는 일은 둘뿐이다.
   1) 아이콘을 누르면 작업창을 연다 (페이지를 옮기지 않는다)
   2) 이미 열어 둔 새 기사쓰기 탭에 작업창의 초안을 넘긴다

   판단은 전부 작업창(panel.js)이 한다. 여기는 문을 여닫기만 한다.
   ══════════════════════════════════════════════════════════════ */

importScripts("shared/config.js", "shared/write-page.js");

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
    let writeTab;

    chrome.tabs
      .query({ currentWindow: true })
      .then((tabs) => {
        writeTab = GWWritePage.selectWriteTab(tabs);
        if (!writeTab) {
          throw new Error("먼저 공실뉴스에 로그인하고 새 기사쓰기 화면을 열어 주세요.");
        }

        return chrome.tabs.update(writeTab.id, { active: true });
      })
      /* 확장을 다시 로드한 뒤 탭을 새로고침하지 않은 경우를 먼저 잡는다. */
      .then(() => chrome.tabs.sendMessage(writeTab.id, { type: "GW_PING_WRITE_PAGE" }))
      .then((reply) => {
        if (!reply?.ok) {
          throw new Error("선택한 화면이 새 기사쓰기 화면이 아닙니다.");
        }

        return chrome.storage.local.set({
          [GW.KEY.DRAFT]: {
            article: msg.article,
            media: msg.media || [],
            vacancyId: msg.vacancyId || null,
            createdAt: Date.now(),
          },
        });
      })
      .then(() => chrome.tabs.sendMessage(writeTab.id, { type: "GW_APPLY_PENDING_DRAFT" }))
      .then((reply) => {
        if (!reply?.ok) {
          throw new Error(reply?.error || "기사쓰기 폼에 초안을 넣지 못했습니다.");
        }
        sendResponse({ ok: true, tabId: writeTab.id, stage: "applied" });
      })
      .catch((e) => {
        const disconnected = /Receiving end does not exist|Could not establish connection/i.test(e.message || "");
        sendResponse({
          ok: false,
          error: disconnected
            ? "기사쓰기 탭을 새로고침(F5)한 뒤 다시 눌러 주세요."
            : e.message,
        });
      });

    return true;
  }

  return false;
});
