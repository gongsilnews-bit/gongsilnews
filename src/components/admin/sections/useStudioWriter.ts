"use client";

import { useEffect, useState } from "react";

/* 지금 새 글을 쓸 AI 이름 ("ChatGPT" · "Gemini") — [내 AI 연결]에서 고른 기본 글쓰기 AI.
   쓰기 단추에 "Gemini로 기사 쓰기"처럼 보인다. 앱 밖(웹)에서는 ChatGPT. */
type AiBridge = { writer?: () => Promise<{ id: string; name: string }>; imager?: () => Promise<{ id: string; name: string }>; onWriterChanged?: (fn: () => void) => () => void };
const bridge = () => (typeof window === "undefined" ? undefined : (window as unknown as { gongsilStudio?: { ai?: AiBridge } }).gongsilStudio?.ai);

export function useStudioWriter(kind: "writer" | "imager" = "writer") {
  const [name, setName] = useState("ChatGPT");
  useEffect(() => {
    const ai = bridge();
    const get = ai?.[kind];
    if (!ai || !get) return;
    const load = () => get().then((w) => w?.name && setName(w.name)).catch(() => {});
    load();
    const off = ai.onWriterChanged?.(load);
    window.addEventListener("focus", load); // 연결 창에서 로그인·연결이 바뀌었을 수 있다
    return () => {
      off?.();
      window.removeEventListener("focus", load);
    };
  }, [kind]);
  return name;
}

/** 지금 그림을 그릴 AI 이름 ("ChatGPT" · "Gemini") — [내 AI 연결]의 기본 이미지 생성 AI */
export const useStudioImager = () => useStudioWriter("imager");
