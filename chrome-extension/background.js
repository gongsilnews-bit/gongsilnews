// 공실뉴스 AI 마케팅 스크립터 - 백그라운드 서비스 워커
chrome.runtime.onInstalled.addListener(() => {
  // 1. 확장프로그램 아이콘 클릭 시 사이드패널 열기 설정
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error("Side panel behavior error:", error));

  // 2. 마우스 우클릭 메뉴 등록
  chrome.contextMenus.create({
    id: "gongsil_ai_rewrite_selection",
    title: "공실뉴스 AI로 이 내용 재가공 (쇼츠/블로그/기사)",
    contexts: ["selection"]
  });

  chrome.contextMenus.create({
    id: "gongsil_ai_open_panel",
    title: "공실뉴스 AI 마케팅 사이드패널 열기",
    contexts: ["page"]
  });
});

// 우클릭 컨텍스트 메뉴 클릭 리스너
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab || !tab.id) return;

  if (info.menuItemId === "gongsil_ai_rewrite_selection" && info.selectionText) {
    // 선택한 텍스트 임시 저장
    chrome.storage.local.set({
      selectedText: info.selectionText,
      sourceUrl: tab.url,
      pageTitle: tab.title || "선택한 텍스트"
    }, () => {
      // 사이드패널 오픈
      chrome.sidePanel.open({ tabId: tab.id });
    });
  } else if (info.menuItemId === "gongsil_ai_open_panel") {
    chrome.sidePanel.open({ tabId: tab.id });
  }
});
