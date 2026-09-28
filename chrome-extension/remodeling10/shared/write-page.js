/* 공실뉴스에서 이미 열어 둔 '새 기사쓰기' 화면만 고른다. */
(function initWritePage(global) {
  "use strict";

  const WRITE_PATHS = new Set(["/admin", "/realty_admin", "/user_admin"]);

  function isGongsilHost(hostname) {
    return (
      hostname === "gongsilnews.com" ||
      hostname.endsWith(".gongsilnews.com") ||
      hostname === "localhost"
    );
  }

  function isNewArticleWriteUrl(rawUrl) {
    try {
      const url = new URL(rawUrl);
      const pathname = url.pathname.length > 1 ? url.pathname.replace(/\/$/, "") : url.pathname;

      return (
        isGongsilHost(url.hostname) &&
        WRITE_PATHS.has(pathname) &&
        url.searchParams.get("menu") === "article" &&
        url.searchParams.get("action") === "write" &&
        !url.searchParams.has("id")
      );
    } catch (_) {
      return false;
    }
  }

  function selectWriteTab(tabs) {
    return (Array.isArray(tabs) ? tabs : [])
      .filter((tab) => tab && tab.id && isNewArticleWriteUrl(tab.url))
      .sort((a, b) => {
        if (Boolean(a.active) !== Boolean(b.active)) return a.active ? -1 : 1;
        return (b.lastAccessed || 0) - (a.lastAccessed || 0);
      })[0] || null;
  }

  const api = { isNewArticleWriteUrl, selectWriteTab };
  global.GWWritePage = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : self);
