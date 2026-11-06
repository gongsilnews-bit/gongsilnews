"use client";
/**
 * 웹 뉴스·SNS자동화 입구 (2026-11-04) — 화면(StudioSnsSection 등)은 여기 이름만 쓴다.
 *  앱(window.gongsilStudio)이면 앱, 웹이면 웹 대역(gongsil.ts). 웹 전용 일은 이 폴더 밖으로 나가지 않는다.
 */
export { studioBridge, isWebStudio, prepareWebArticleDraft } from "./gongsil";
export { setStudioWebMember, ensureStudioWebMember, watchPublished } from "./core";
export { webAi, webAiId, setWebAiId, chooseWebAi } from "./ai-ask";
